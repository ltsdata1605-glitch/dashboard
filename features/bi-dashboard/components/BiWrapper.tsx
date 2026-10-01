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
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import { useBiAutoSync } from '../hooks/useBiAutoSync';
import { Zap, TrendingUp } from 'lucide-react';

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
const BiWrapper = React.memo(function BiWrapper({ isActive }: { isActive?: boolean }) {
    const { activeTab } = useActiveTab();
    // Còn lượt "Tự động" dở (vừa tải lại sau khi cập nhật userscript) → mở thẳng mục Cập nhật để DataUpdater chạy tiếp
    const [activeView, setActiveView] = useState<'dashboard' | 'employee' | 'updater'>(() => (readPendingAutoSync() ? 'updater' : 'dashboard'));
    // Track which views have been visited to enable lazy mounting (mount on first visit, keep alive after)
    const [mountedViews, setMountedViews] = useState<Set<string>>(() => new Set(readPendingAutoSync() ? ['dashboard', 'updater'] : ['dashboard']));
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    // Quản lý tự động đồng bộ tập trung tại BiWrapper để modal và nút nổi hoạt động xuyên suốt cả 3 tab
    const [activeSupermarket] = useIndexedDBState<string>('dashboard-active-supermarket', 'Tổng');
    const { handleStartAutoSync, renderAutoSyncModal } = useBiAutoSync(activeSupermarket);


    useEffect(() => {
        setMounted(true);
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
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
        setActiveView(id as 'dashboard' | 'employee' | 'updater');
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
        <div data-density="compact" className="flex flex-col w-full min-h-screen bi-report-module">
            <style>{`
                /* Chế độ mật độ gọn trên điện thoại: xem features/bi-dashboard/biDensity.css (A20).
                   Lịch sử thang chữ: bản cũ ép chữ xuống 8–9px ("High-Density Typography"), phá quy tắc
                   sàn 11px của CLAUDE.md đúng trên điện thoại (đo iPhone 15 2026-09-26: 71 chỗ < 11px). */

                /* KHÔNG BO GÓC cho tất cả bảng, viền, thẻ card trong toàn bộ phân hệ Report BI (giữ nguyên avatar tròn) */
                .bi-report-module table,
                .bi-report-module thead,
                .bi-report-module tbody,
                .bi-report-module tfoot,
                .bi-report-module tr,
                .bi-report-module th,
                .bi-report-module td,
                .bi-report-module .card,
                .bi-report-module .rounded,
                .bi-report-module [class*="rounded-"]:not([class*="rounded-full"]):not([class*="rounded-pill"]):not([class*="avatar"]) {
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



            {/* Floating Action Dock: 2 nút Tự động Realtime và Luỹ kế luôn nổi trên Laptop/Desktop với hiệu ứng 3D Tactile sống động */}
            {activeTab === 'employees' && (
                <aside
                    aria-label="Thao tác tự động Report BI"
                    className="hidden lg:flex flex-col gap-2.5 fixed right-4 xl:right-7 top-32 z-40 p-2.5 rounded-2xl bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] no-print hide-on-export select-none animate-in fade-in slide-in-from-right-6 duration-300"
                >
                    {/* Header trạng thái 3D nhỏ tinh tế */}
                    <div className="flex items-center justify-between px-1.5 pt-0.5 pb-1 border-b border-slate-200/60 dark:border-slate-800">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Auto Sync
                        </span>
                        <span className="relative flex h-2 w-2" title="Sẵn sàng đồng bộ tự động">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                    </div>

                    {/* Nút 1: Tự động Realtime - 3D Tactile Push Button */}
                    <button
                        type="button"
                        onClick={() => handleStartAutoSync('realtime')}
                        title="Tự động thu thập dữ liệu Realtime từ MWG qua Tampermonkey"
                        className="group relative overflow-hidden flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-extrabold text-xs text-white bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 border-t border-amber-200/70 shadow-[0_4px_0_#b45309,0_8px_16px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.6)] hover:shadow-[0_6px_0_#b45309,0_12px_22px_rgba(245,158,11,0.45)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_0_0_#b45309,0_2px_4px_rgba(245,158,11,0.3)] transition-all duration-150 cursor-pointer whitespace-nowrap"
                    >
                        {/* Dải ánh kim phản chiếu lướt qua khi hover */}
                        <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/35 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />

                        {/* Icon Box 3D với hiệu ứng phát sáng */}
                        <div className="relative p-1.5 rounded-lg bg-black/15 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25),0_1px_0_rgba(255,255,255,0.3)] group-hover:scale-110 group-active:scale-95 transition-transform duration-200">
                            <Zap className="h-4 w-4 text-amber-100 fill-amber-200 drop-shadow-[0_0_6px_rgba(254,240,138,0.9)] animate-pulse" />
                        </div>

                        {/* Nhãn 3D sắc nét */}
                        <div className="flex flex-col text-left">
                            <span className="tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] leading-tight">
                                Tự động Realtime
                            </span>
                            <span className="text-[9.5px] font-semibold text-amber-100/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] leading-none mt-0.5">
                                ⚡ Tức thì hôm nay
                            </span>
                        </div>
                    </button>

                    {/* Nút 2: Tự động Luỹ kế - 3D Tactile Push Button */}
                    <button
                        type="button"
                        onClick={() => handleStartAutoSync('luyke')}
                        title="Tự động thu thập dữ liệu Luỹ kế từ MWG qua Tampermonkey"
                        className="group relative overflow-hidden flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-extrabold text-xs text-white bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-700 border-t border-emerald-200/70 shadow-[0_4px_0_#065f46,0_8px_16px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.6)] hover:shadow-[0_6px_0_#065f46,0_12px_22px_rgba(16,185,129,0.45)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_0_0_#065f46,0_2px_4px_rgba(16,185,129,0.3)] transition-all duration-150 cursor-pointer whitespace-nowrap"
                    >
                        {/* Dải ánh kim phản chiếu lướt qua khi hover */}
                        <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/35 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />

                        {/* Icon Box 3D với hiệu ứng phát sáng */}
                        <div className="relative p-1.5 rounded-lg bg-black/15 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25),0_1px_0_rgba(255,255,255,0.3)] group-hover:scale-110 group-active:scale-95 transition-transform duration-200">
                            <TrendingUp className="h-4 w-4 text-emerald-100 drop-shadow-[0_0_6px_rgba(167,243,208,0.9)]" />
                        </div>

                        {/* Nhãn 3D sắc nét */}
                        <div className="flex flex-col text-left">
                            <span className="tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] leading-tight">
                                Tự động Luỹ kế
                            </span>
                            <span className="text-[9.5px] font-semibold text-emerald-100/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] leading-none mt-0.5">
                                📈 Cả tháng đến nay
                            </span>
                        </div>
                    </button>
                </aside>
            )}

            {/* Nội dung Module — HIDDEN/BLOCK pattern: mount once, toggle visibility */}
            {/* KHUNG CHUNG 960px — Report BI / Check thưởng / Báo cáo khai thác dùng cùng khung: rộng tối đa
                960px căn giữa, đệm ngang 32px ở desktop, KHÔNG đệm trên (bản cũ `lg:p-8` để 32px trống
                giữa thanh tiêu đề app và tiêu đề "SIÊU THỊ" — chủ dự án yêu cầu bỏ 2026-09-21). Từng view
                con đã có `pt-2` ở hàng tiêu đề riêng. Đổi khung này thì đổi cả 2 nơi kia cho khớp. */}
            <main className="p-0 sm:px-4 sm:pb-4 lg:px-8 lg:pb-8 space-y-6 mx-auto w-full flex-grow max-w-[960px]">
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

            {/* Modal tiến trình tự động đồng bộ Tampermonkey */}
            {renderAutoSyncModal()}

        </div>
    );
});

export default BiWrapper;
