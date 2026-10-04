import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { readPendingAutoSync } from '../services/biAutoSyncService';
import '../biDensity.css';
import { createPortal } from 'react-dom';
import { useActiveTab } from '../../../contexts/LayoutContext';
import { Icon } from '../../../components/common/Icon';
import { TOUCH_TARGET } from '../utils/mobileUi';
import FontSelector from '../../../components/layout/FontSelector';
import { migrateClusterDataToMain, migrateOldAvatars } from '../utils/dbMigration';
import { pruneOldBonusMonthlyKeys } from '../utils/bonusHistory';
import { Button } from '../../../components/shared/ui/Button';
import ErrorBoundary from '../../../components/common/ErrorBoundary';
import * as db from '../utils/db';
import { configStore } from '../store/configStore';
import type { ConfigTab } from './SupermarketConfig';
import { lazyWithRetry } from '../../../utils/lazyWithRetry';

// Dashboard là view mặc định của BiWrapper, import trực tiếp để tránh double-lazy loading waterfall
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
    // Còn lượt "Tự động" dở (vừa tải lại sau khi cập nhật userscript) → mở thẳng mục Cập nhật để DataUpdater chạy tiếp
    // Không có lượt dở → `?view=` trên URL (deep link) nếu có, không thì mục lần trước (localStorage): app cài trên
    // iPhone bị iOS giải phóng khỏi RAM khi ở nền, mở lại luôn chạy từ "/" (Đợt A, kế hoạch iPhone).
    const [activeView, setActiveView] = useState<'dashboard' | 'employee' | 'updater'>(() => (readPendingAutoSync() ? 'updater' : readSavedBiView()));
    // Track which views have been visited to enable lazy mounting (mount on first visit, keep alive after)
    const [mountedViews, setMountedViews] = useState<Set<string>>(() => new Set(readPendingAutoSync() ? ['dashboard', 'updater'] : ['dashboard', readSavedBiView()]));
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    // Kích hoạt tự động đồng bộ qua GlobalAutoSyncDock toàn cục
    const handleStartAutoSync = useCallback((mode: 'realtime' | 'luyke') => {
        window.dispatchEvent(new CustomEvent('ycx-trigger-bi-auto-sync', { detail: { mode } }));
    }, []);

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

    return (
        <div data-density="compact" className="flex flex-col w-full min-h-dvh bi-report-module">
            <style>{`
                /* Chế độ mật độ gọn trên điện thoại: xem features/bi-dashboard/biDensity.css (A20).
                   Lịch sử thang chữ: bản cũ ép chữ xuống 8–9px ("High-Density Typography"), phá quy tắc
                   sàn 11px của CLAUDE.md đúng trên điện thoại (đo iPhone 15 2026-09-26: 71 chỗ < 11px). */

                /* KHÔNG BO GÓC cho tất cả bảng, viền trong toàn bộ phân hệ Report BI (ngoại trừ thẻ KPI .kpi-overview-card, avatar tròn & floating dock) */
                .bi-report-module table,
                .bi-report-module thead,
                .bi-report-module tbody,
                .bi-report-module tfoot,
                .bi-report-module tr,
                .bi-report-module th,
                .bi-report-module td,
                .bi-report-module .card:not(.kpi-overview-card),
                .bi-report-module .rounded:not(.kpi-overview-card),
                .bi-report-module [class*="rounded-"]:not([class*="rounded-full"]):not([class*="rounded-pill"]):not([class*="avatar"]):not(.kpi-overview-card):not(.kpi-overview-card *):not(.preserve-rounded):not(.preserve-rounded *) {
                    border-radius: 0px !important;
                }
            `}</style>
            {mounted && activeTab === 'employees' && document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions') && createPortal(
                isMobile ? (
                    <div className="flex items-center gap-0.5 animate-in fade-in zoom-in duration-300">
                        {navigationLinks.map(tab => {
                            const isActive = activeView === tab.id;
                            return (
                                <Button
                                    variant="unstyled" size="none"
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    // Đây là ĐIỀU HƯỚNG CHÍNH của Report BI trên điện thoại (Siêu thị /
                                    // Nhân viên / Cập nhật). Đo trước khi sửa: chỉ 28x24px — dưới xa mức
                                    // 44x44 tối thiểu của Apple, bấm rất dễ trượt.
                                    className={`flex items-center justify-center gap-1 ${TOUCH_TARGET} rounded font-medium text-[11px] transition-all whitespace-nowrap shrink-0 focus:outline-none ${
                                        isActive ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                                    }`}
                                    title={tab.label || tab.id}
                                >
                                    <Icon name={tab.icon} size={4} />
                                </Button>
                            );
                        })}
                        <div className="flex shrink-0 items-center pl-0.5 ml-0.5">
                            {/* Bỏ `scale-90`: trên điện thoại nút chọn phông vốn đã 33x32px, thu nhỏ
                                thêm 10% nữa thì càng khó bấm. */}
                            <div className="rounded-xl overflow-hidden origin-right">
                                <FontSelector />
                            </div>
                        </div>
                    </div>
                ) : (
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
                                    <Icon name={tab.icon} size={4} />
                                    <span>{tab.label}</span>
                                </Button>
                            );
                        })}

                        <div className="border-l border-slate-100 dark:border-slate-700">
                            <FontSelector />
                        </div>
                    </div>
                ),
                document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions')!
            )}






            {/* Nội dung Module — HIDDEN/BLOCK pattern: mount once, toggle visibility */}
            {/* KHUNG CHUNG 960px — Report BI / Check thưởng / Báo cáo khai thác dùng cùng khung: rộng tối đa
                960px căn giữa, đệm ngang 32px ở desktop, KHÔNG đệm trên (bản cũ `lg:p-8` để 32px trống
                giữa thanh tiêu đề app và tiêu đề "SIÊU THỊ" — chủ dự án yêu cầu bỏ 2026-09-21). Từng view
                con đã có `pt-2` ở hàng tiêu đề riêng. Đổi khung này thì đổi cả 2 nơi kia cho khớp. */}
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
