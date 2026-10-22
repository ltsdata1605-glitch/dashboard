import React, { useState, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import { resolveIconName } from '../../../components/shared/ui/icon/legacyIconNames';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { readPendingAutoSync } from '../services/biAutoSyncService';
import '../biDensity.css';
import { createPortal } from 'react-dom';
import { useActiveTab } from '../../../contexts/LayoutContext';
import FontSelector, { FontPickerSheet } from '../../../components/layout/FontSelector';
import { usePageActions } from '../../../components/shared/ui/PageActions';
import { Tabs } from '../../../components/shared/ui/Tabs';
import { migrateClusterDataToMain, migrateOldAvatars } from '../utils/dbMigration';
import { pruneOldBonusMonthlyKeys } from '../utils/bonusHistory';
import { Button } from '../../../components/shared/ui/Button';
import { CapsuleBar } from '../../../components/shared/ui/CapsuleBar';
import { cn } from '../../../components/shared/ui/utils';
import ErrorBoundary from '../../../components/shared/ui/ErrorBoundary';
import * as db from '../utils/db';
import { configStore } from '../store/configStore';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import type { ConfigTab } from './SupermarketConfig';
import { lazyWithRetry } from '../../../utils/lazyWithRetry';
import { useReportBiAuth } from '../hooks/useReportBiAuth';
import { pullBiDataFromCloud } from '../services/biCloudSyncService';
import Dashboard from './Dashboard';
// Các sub-view phụ tải lười an toàn với lazyWithRetry
const NhanVien = lazyWithRetry(() => import('./NhanVien'), 'BiNhanVien');
const DataUpdater = lazyWithRetry(() => import('./DataUpdater'), 'BiDataUpdater');

const getTabColorClasses = (color: string, isActive: boolean) => {
    if (!isActive) return 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50';
    switch (color) {
        case 'emerald': return 'bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400';
        case 'amber': return 'bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400';
        case 'rose': return 'bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400';
        case 'sky': return 'bg-sky-50/80 hover:bg-sky-100 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-400';
        case 'slate': return 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300';
        default: return 'bg-sky-50/80 hover:bg-sky-100 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-400';
    }
};

const TabSpinner = () => (
    <div className="flex items-center justify-center min-h-[30vh]">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium text-slate-400 animate-pulse">Đang tải module...</p>
        </div>
    </div>
);

/**
 * BiWrapper — Container for the BI module.
 * 
 * PERFORMANCE FIX: Uses hidden/block CSS pattern instead of conditional rendering (&&).
 * This keeps already-mounted views alive in the DOM so switching back is instant —
 * no destroy/recreate cycle, no re-fetching data from IndexedDB, no re-parsing.
 * 
 * Also uses plain useState instead of useIndexedDBState for tab navigation
 * to avoid the IDB write → event dispatch → re-render chain on every click.
 * 
 * Each sub-view is also lazy-loaded so initial mount only loads the active view's chunk.
 */
const BI_VIEW_KEY = 'bi_active_view';
function readSavedBiView(): 'dashboard' | 'employee' | 'updater' {
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlView = urlParams.get('view');
        if (urlView === 'dashboard' || urlView === 'employee' || urlView === 'updater') {
            return urlView;
        }
    }
    try {
        const saved = localStorage.getItem(BI_VIEW_KEY);
        if (saved === 'employee' || saved === 'updater' || saved === 'dashboard') return saved;
    } catch { return 'dashboard'; }
    return 'dashboard';
}

const BiWrapper = React.memo(function BiWrapper({ isActive }: { isActive?: boolean }) {
    const { activeTab } = useActiveTab();
    const isTabActive = isActive !== undefined ? isActive : activeTab === 'employees';
    // Còn lượt "Tự động" dở (vừa tải lại sau khi cập nhật userscript) → mở thẳng mục Cập nhật để DataUpdater chạy tiếp
    // Không có lượt dở → `?view=` trên URL (deep link) nếu có, không thì mục lần trước (localStorage): app cài trên
    // iPhone bị iOS giải phóng khỏi RAM khi ở nền, mở lại luôn chạy từ "/" (Đợt A, kế hoạch iPhone).
    const [activeView, setActiveView] = useState<'dashboard' | 'employee' | 'updater'>(() => (readPendingAutoSync() ? 'updater' : readSavedBiView()));
    // Track which views have been visited to enable lazy mounting (mount on first visit, keep alive after)
    const [mountedViews, setMountedViews] = useState<Set<string>>(() => new Set(readPendingAutoSync() ? ['dashboard', 'updater'] : ['dashboard', readSavedBiView()]));
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    const [summaryRealtimeTs] = useIndexedDBState<string | null>('summary-realtime-ts', null);
    const [summaryLuyKeTs] = useIndexedDBState<string | null>('summary-luy-ke-ts', null);
    const [competitionRealtimeTs] = useIndexedDBState<string | null>('competition-realtime-ts', null);
    const [competitionLuyKeTs] = useIndexedDBState<string | null>('competition-luy-ke-ts', null);
    const [dashboardMainTab] = useIndexedDBState<string>('dashboard-main-tab', 'realtime');
    const [hasSummaryRealtime] = useIndexedDBState<string>('summary-realtime', '');
    const [hasSummaryLuyKe] = useIndexedDBState<string>('summary-luy-ke', '');
    const [hasCompetitionRealtime] = useIndexedDBState<string>('competition-realtime', '');
    const [isBiSyncing, setIsBiSyncing] = useState(false);
    const [isSyncingCloud, setIsSyncingCloud] = useState(false);
    const { user, allowedKhos } = useReportBiAuth();

    useEffect(() => {
        const onStart = () => setIsBiSyncing(true);
        const onEnd = () => setIsBiSyncing(false);
        window.addEventListener('ycx-bi-automation:start-job', onStart);
        window.addEventListener('ycx-bi-automation:progress', onStart);
        window.addEventListener('ycx-bi-automation:done', onEnd);
        window.addEventListener('ycx-bi-automation:error', onEnd);
        return () => {
            window.removeEventListener('ycx-bi-automation:start-job', onStart);
            window.removeEventListener('ycx-bi-automation:progress', onStart);
            window.removeEventListener('ycx-bi-automation:done', onEnd);
            window.removeEventListener('ycx-bi-automation:error', onEnd);
        };
    }, []);

    const currentTimestamp = React.useMemo(() => {
        let ts: string | null = null;
        if (dashboardMainTab === 'realtime') {
            ts = summaryRealtimeTs || competitionRealtimeTs || summaryLuyKeTs || competitionLuyKeTs;
        } else {
            ts = summaryLuyKeTs || competitionLuyKeTs || summaryRealtimeTs || competitionRealtimeTs;
        }
        if (!ts && (hasSummaryRealtime || hasSummaryLuyKe || hasCompetitionRealtime)) {
            const now = new Date();
            return now.toLocaleDateString('vi-VN');
        }
        return ts;
    }, [dashboardMainTab, summaryRealtimeTs, competitionRealtimeTs, summaryLuyKeTs, competitionLuyKeTs, hasSummaryRealtime, hasSummaryLuyKe, hasCompetitionRealtime]);

    const [cloudFeedback, setCloudFeedback] = useState<{
        message: string;
        mobileMessage: string;
        status: 'success' | 'error';
    } | null>(null);
    const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Kích hoạt tự động đồng bộ qua GlobalAutoSyncDock toàn cục
    const handleStartAutoSync = useCallback((mode: 'realtime' | 'luyke') => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            return;
        }
        window.dispatchEvent(new CustomEvent('ycx-trigger-bi-auto-sync', { detail: { mode } }));
    }, []);

    // Nạp chủ động dữ liệu từ Firebase Cloud khi bấm vào dòng thời gian cập nhật
    const handleManualCloudSync = useCallback(async () => {
        if (isSyncingCloud) return;
        if (feedbackTimerRef.current) {
            clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = null;
        }
        setCloudFeedback(null);

        if (!user || user.isAnonymous) {
            setCloudFeedback({
                message: 'Vui lòng đăng nhập Google!',
                mobileMessage: 'Cần đăng nhập Google',
                status: 'error'
            });
            feedbackTimerRef.current = setTimeout(() => {
                setCloudFeedback(null);
                feedbackTimerRef.current = null;
            }, 3500);
            return;
        }

        setIsSyncingCloud(true);

        try {
            const result = await pullBiDataFromCloud(user, allowedKhos);
            if (result.count > 0) {
                setCloudFeedback({
                    message: 'Đã nạp thành công dữ liệu Report BI!',
                    mobileMessage: 'Đã nạp dữ liệu BI!',
                    status: 'success'
                });
            } else {
                setCloudFeedback({
                    message: 'Dữ liệu trên máy bạn đã là mới nhất!',
                    mobileMessage: 'Đã là mới nhất!',
                    status: 'success'
                });
            }
        } catch (err: unknown) {
            console.error('[BiWrapper] Lỗi nạp dữ liệu từ Cloud:', err);
            setCloudFeedback({
                message: 'Không thể tải dữ liệu từ Cloud',
                mobileMessage: 'Lỗi tải Cloud',
                status: 'error'
            });
        } finally {
            setIsSyncingCloud(false);
            feedbackTimerRef.current = setTimeout(() => {
                setCloudFeedback(null);
                feedbackTimerRef.current = null;
            }, 3500);
        }
    }, [isSyncingCloud, user, allowedKhos]);

    useEffect(() => {
        setMounted(true);
        const handleResize = () => { setIsMobile(window.innerWidth < 1024); };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Migrate dữ liệu cũ từ ClusterDataDB sang BI_HUB_DATABASE_V2 (chỉ chạy 1 lần)
    useEffect(() => {
        migrateClusterDataToMain()
            .then(() => migrateOldAvatars())
            .catch(err => console.warn('[BI Migration] Error:', err));
        pruneOldBonusMonthlyKeys().catch(err => console.warn('[BI Migration] Prune bonus-monthly error:', err));
        // Mặc định luôn đưa tab cấu hình siêu thị về 'data' (Dữ liệu) khi khởi động
        db.set('supermarket-config-active-tab', 'data');
        configStore.setCache('supermarket-config-active-tab', 'data');
        configStore.setLoaded('supermarket-config-active-tab', true);
    }, []);

    const handleTabChange = useCallback((id: string, options?: { configTab?: ConfigTab; supermarketName?: string; scrollToConfig?: boolean }) => {
        const nextView = id as 'dashboard' | 'employee' | 'updater';
        setActiveView(nextView);
        if (id === 'dashboard' || id === 'employee' || id === 'updater') {
            try { localStorage.setItem(BI_VIEW_KEY, id); } catch { /* chế độ riêng tư */ }
        }
        // Đồng bộ lên URL query param ?view=... khi đang ở tab employees
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (url.searchParams.get('tab') === 'employees') {
                url.searchParams.set('view', id);
                if (id === 'updater') {
                    url.searchParams.delete('mode');
                    url.searchParams.delete('sub');
                }
                window.history.replaceState(null, '', url.toString());
            }
        }
        if (id === 'updater') {
            const targetTab = options?.configTab ?? 'data';
            db.set('supermarket-config-active-tab', targetTab);
            configStore.setCache('supermarket-config-active-tab', targetTab);
            configStore.setLoaded('supermarket-config-active-tab', true);

            if (options?.supermarketName) {
                db.set('updater-active-supermarket', options.supermarketName);
                configStore.setCache('updater-active-supermarket', options.supermarketName);
                configStore.setLoaded('updater-active-supermarket', true);
            }

            if (options?.scrollToConfig) {
                setTimeout(() => {
                    const el = document.getElementById('supermarket-config-section');
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            }
        }
        setMountedViews(prev => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);

    // Đảm bảo URL có ?view=... khi xem phân hệ Report BI
    useEffect(() => {
        if (!isActive || typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        if (url.searchParams.get('tab') === 'employees' && !url.searchParams.get('view')) {
            url.searchParams.set('view', activeView);
            window.history.replaceState(null, '', url.toString());
        }
    }, [isActive, activeView]);

    // Lượt hẹn giờ cần tự xuất ảnh mục Siêu thị (khung Auto Sync Pro gửi yêu cầu) → mở mục Siêu thị để Dashboard chụp được
    useEffect(() => {
        const onReq = () => handleTabChange('dashboard');
        window.addEventListener('ycx-bi-auto-export:request', onReq);
        return () => window.removeEventListener('ycx-bi-auto-export:request', onReq);
    }, [handleTabChange]);

    // Lắng nghe chuyển phân hệ (Siêu thị / Nhân viên / Cập nhật) từ bên ngoài hoặc sau khi chạy xong Auto Sync
    useEffect(() => {
        const onSwitchView = (e: Event) => {
            const view = (e as CustomEvent).detail?.view;
            if (view === 'dashboard' || view === 'employee' || view === 'updater') {
                handleTabChange(view);
            }
        };
        window.addEventListener('bi-switch-view', onSwitchView);
        return () => window.removeEventListener('bi-switch-view', onSwitchView);
    }, [handleTabChange]);

    const handleNavigateToUpdater = useCallback((options?: { configTab?: ConfigTab; supermarketName?: string; scrollToConfig?: boolean }) => {
        handleTabChange('updater', options);
    }, [handleTabChange]);
    const handleNavigateToDashboard = useCallback(() => handleTabChange('dashboard'), [handleTabChange]);

    const navigationLinks = [
        { id: 'dashboard', icon: 'pie-chart', label: 'Siêu thị', color: 'sky' },
        { id: 'employee', icon: 'users', label: 'Nhân viên', color: 'emerald' },
        { id: 'updater', icon: 'upload-cloud', label: 'Cập nhật', color: 'amber' },
    ];

    // iPhone (GĐ6, lỗi #12 — video v2:066–098): thanh trên từng có 4 icon không chữ (biểu đồ tròn / người / đám mây / "T") —
    // không ai đoán được. Nay 3 phân hệ là segmented control CÓ CHỮ ở đầu nội dung; phông chữ vào "⋯" (sheet danh sách).
    // Laptop giữ cụm nút viên của chủ dự án ở #global-header-actions.
    const [moPhongChu, setMoPhongChu] = useState(false);
    usePageActions(isTabActive && isMobile ? {
        scope: 'mobile',
        items: [{ id: 'phong-chu', label: 'Phông chữ', icon: 'font', onSelect: () => setMoPhongChu(true) }],
    } : null);

    return (
        <div data-density="compact" className="flex flex-col w-full min-h-dvh bi-report-module">
            {/* Luật "không bo góc" của phân hệ: features/bi-dashboard/biDensity.css (trước là thẻ <style> chèn lúc gắn — GĐ9 2026-10-14). */}
            {mounted && isTabActive && !isMobile && document.getElementById('global-header-actions') && createPortal(
                // Chuẩn pill bo tròn rounded-full thống nhất với Header.tsx (hình 2)
                <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in zoom-in duration-300">
                    {navigationLinks.map((tab, idx) => {
                        const isActive = activeView === tab.id;
                        return (
                            <Button
                                variant="unstyled" size="none"
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center justify-center gap-2 px-4 py-2 text-base font-medium transition-colors whitespace-nowrap shrink-0 focus:outline-none ${idx > 0 ? 'border-l border-slate-100 dark:border-slate-700' : ''} ${getTabColorClasses(tab.color, isActive)}`}
                                title={tab.label}
                            >
                                <AppIcon name={resolveIconName(tab.icon) ?? 'help'} size="md" />
                                <span>{tab.label}</span>
                            </Button>
                        );
                    })}

                    <div className="border-l border-slate-100 dark:border-slate-700">
                        <FontSelector />
                    </div>
                </div>,
                document.getElementById('global-header-actions')!
            )}

            {/* Portal timestamp into mobile top bar subtitle (Đồng bộ chuẩn như Phân tích & Check Thưởng) */}
            {mounted && isTabActive && document.getElementById('mobile-topbar-subtitle') && createPortal(
                <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-full">
                    <Button
                        variant="unstyled" size="none"
                        onClick={handleManualCloudSync}
                        title="Chạm để nạp dữ liệu Report BI mới nhất từ Firebase Cloud"
                        aria-label="Cập nhật dữ liệu"
                        className={`inline-flex items-center gap-1 text-left shrink-0 cursor-pointer transition-all duration-200 active:scale-95 ${
                            cloudFeedback
                                ? (cloudFeedback.status === 'error'
                                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                    : 'text-emerald-600 dark:text-emerald-400 font-semibold')
                                : (isBiSyncing || isSyncingCloud)
                                    ? 'text-sky-600 dark:text-sky-400 font-semibold'
                                    : 'hover:text-sky-600 dark:hover:text-sky-400 text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        {cloudFeedback ? (
                            <AppIcon
                                name={cloudFeedback.status === 'error' ? 'error' : 'success'}
                                size="xs"
                                className={cloudFeedback.status === 'error' ? 'text-rose-500' : 'text-emerald-500'}
                            />
                        ) : (
                            <AppIcon
                                name="refresh"
                                size="xs"
                                spin={isBiSyncing || isSyncingCloud}
                                className="text-sky-500 group-hover:rotate-180 transition-transform duration-300"
                            />
                        )}
                        <span className={(isBiSyncing || isSyncingCloud) ? 'animate-pulse' : ''}>
                            {cloudFeedback
                                ? cloudFeedback.mobileMessage
                                : isSyncingCloud
                                    ? 'Đang tải từ Cloud...'
                                    : isBiSyncing
                                        ? 'Đang đồng bộ...'
                                        : (currentTimestamp ? (currentTimestamp.length > 8 ? currentTimestamp.slice(0, 8) : currentTimestamp) : 'Cập nhật dữ liệu')}
                        </span>
                    </Button>
                </div>,
                document.getElementById('mobile-topbar-subtitle')!
            )}

            {/* Portal timestamp into desktop header subtitle (Đồng bộ chuẩn như Phân tích & Check Thưởng) */}
            {mounted && isTabActive && document.getElementById('desktop-header-subtitle') && createPortal(
                <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <Button
                        variant="unstyled" size="none"
                        onClick={handleManualCloudSync}
                        title="Bấm để nạp dữ liệu Report BI mới nhất từ Firebase Cloud"
                        aria-label="Cập nhật dữ liệu"
                        className={`inline-flex items-center gap-1.5 text-left group cursor-pointer transition-all duration-200 active:scale-95 ${
                            cloudFeedback
                                ? (cloudFeedback.status === 'error'
                                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                    : 'text-emerald-600 dark:text-emerald-400 font-semibold')
                                : (isBiSyncing || isSyncingCloud)
                                    ? 'text-sky-600 dark:text-sky-400 font-semibold'
                                    : 'hover:text-sky-600 dark:hover:text-sky-400 text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        {cloudFeedback ? (
                            <AppIcon
                                name={cloudFeedback.status === 'error' ? 'error' : 'success'}
                                size="xs"
                                className={cloudFeedback.status === 'error' ? 'text-rose-500' : 'text-emerald-500'}
                            />
                        ) : (
                            <AppIcon
                                name="refresh"
                                size="xs"
                                spin={isBiSyncing || isSyncingCloud}
                                className="text-sky-500 group-hover:rotate-180 transition-transform duration-300"
                            />
                        )}
                        <span className={(isBiSyncing || isSyncingCloud) ? 'animate-pulse' : ''}>
                            {cloudFeedback
                                ? cloudFeedback.message
                                : isSyncingCloud
                                    ? 'Đang tải từ Cloud...'
                                    : isBiSyncing
                                        ? 'Đang đồng bộ...'
                                        : (currentTimestamp ? `Cập nhật: ${currentTimestamp}` : 'Cập nhật dữ liệu')}
                        </span>
                    </Button>
                </div>,
                document.getElementById('desktop-header-subtitle')!
            )}






            {/* Nội dung Module — HIDDEN/BLOCK pattern: mount once, toggle visibility */}
            {/* KHUNG CHUNG 960px — Report BI / Check thưởng / Báo cáo khai thác dùng cùng khung: rộng tối đa
                960px căn giữa, đệm ngang 32px ở desktop, KHÔNG đệm trên (bản cũ `lg:p-8` để 32px trống
                giữa thanh tiêu đề app và tiêu đề "SIÊU THỊ" — chủ dự án yêu cầu bỏ 2026-09-21). Từng view
                con đã có `pt-2` ở hàng tiêu đề riêng. Đổi khung này thì đổi cả 2 nơi kia cho khớp. */}
            {/* Mobile Topbar Capsule Navigation: đưa 3 chức năng lên thanh trên như hình 2 */}
            <CapsuleBar
                portalTargetId="mobile-topbar-actions"
                enabled={mounted && isTabActive && isMobile}
                ariaLabel="Phân hệ Report BI"
                className="mr-0"
                items={navigationLinks.map((tab) => ({
                    id: tab.id,
                    label: tab.label,
                    icon: resolveIconName(tab.icon) ?? 'help',
                    active: activeView === tab.id,
                    onClick: () => handleTabChange(tab.id),
                    iconClassName: activeView === tab.id
                        ? (tab.id === 'employee' ? 'text-emerald-600 dark:text-emerald-400' : tab.id === 'updater' ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400')
                        : 'text-slate-500 dark:text-slate-400',
                }))}
            />
            <FontPickerSheet isOpen={moPhongChu} onClose={() => setMoPhongChu(false)} />

            <main data-bi-view={activeView} className="p-0 sm:px-4 sm:pb-4 lg:px-8 lg:pb-8 space-y-6 mx-auto w-full flex-grow max-w-[960px]">
                <ErrorBoundary name="Báo cáo BI">
                    <Suspense fallback={<TabSpinner />}>
                        {/* Dashboard view */}
                        {mountedViews.has('dashboard') && (
                            <div className={activeView === 'dashboard' ? 'block relative' : 'absolute left-[-9999px] top-0 opacity-0 pointer-events-none w-full h-full overflow-hidden'}>
                                <Dashboard onNavigateToUpdater={handleNavigateToUpdater} isActive={isActive && activeView === 'dashboard'} onStartAutoSync={handleStartAutoSync} />
                            </div>
                        )}

                        {/* Employee view */}
                        {mountedViews.has('employee') && (
                            <div className={activeView === 'employee' ? 'block relative' : 'absolute left-[-9999px] top-0 opacity-0 pointer-events-none w-full h-full overflow-hidden'}>
                                <NhanVien isActive={isActive && activeView === 'employee'} />
                            </div>
                        )}

                        {/* Data Updater view */}
                        {mountedViews.has('updater') && (
                            <div className={activeView === 'updater' ? 'block relative' : 'absolute left-[-9999px] top-0 opacity-0 pointer-events-none w-full h-full overflow-hidden'}>
                                <DataUpdater onNavigateToDashboard={handleNavigateToDashboard} />
                            </div>
                        )}

                    </Suspense>
                </ErrorBoundary>
            </main>



        </div>
    );
});

export default BiWrapper;
