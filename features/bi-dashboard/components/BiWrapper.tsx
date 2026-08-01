import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useActiveTab } from '../../../contexts/LayoutContext';
import { Icon } from '../../../components/common/Icon';
import FontSelector from '../../../components/layout/FontSelector';
import { migrateClusterDataToMain, migrateOldAvatars } from '../utils/dbMigration';
import { Button } from '../../../components/shared/ui/Button';

// Lazy load heavy sub-views so the initial BiWrapper mount is near-instant
const Dashboard = lazy(() => import('./Dashboard'));
const NhanVien = lazy(() => import('./NhanVien'));
const DataUpdater = lazy(() => import('./DataUpdater'));
const Settings = lazy(() => import('./Settings'));

const getTabColorClasses = (color: string, isActive: boolean) => {
    if (!isActive) return 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800';
    switch (color) {
        case 'emerald': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
        case 'amber': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
        case 'rose': return 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
        case 'sky': return 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400';
        case 'slate': return 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300';
        default: return 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400';
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
    const [activeView, setActiveView] = useState<'dashboard' | 'employee' | 'updater' | 'settings'>('dashboard');
    // Track which views have been visited to enable lazy mounting (mount on first visit, keep alive after)
    const [mountedViews, setMountedViews] = useState<Set<string>>(() => new Set(['dashboard']));
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);


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
    }, []);

    const handleTabChange = useCallback((id: string) => {
        setActiveView(id as 'dashboard' | 'employee' | 'updater' | 'settings');
        setMountedViews(prev => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);

    const handleNavigateToUpdater = useCallback(() => handleTabChange('updater'), [handleTabChange]);
    const handleNavigateToDashboard = useCallback(() => handleTabChange('dashboard'), [handleTabChange]);

    const navigationLinks = [
        { id: 'dashboard', icon: 'pie-chart', label: 'Tổng quan', color: 'sky' },
        { id: 'employee', icon: 'users', label: 'Nhân viên', color: 'emerald' },
        { id: 'updater', icon: 'upload-cloud', label: 'Cập nhật', color: 'amber' },
        { id: 'settings', icon: 'settings', label: '', color: 'rose' },
    ];

    return (
        <div className="flex flex-col w-full min-h-screen bi-report-module">
            <style>{`
                @media (max-width: 768px) {
                    /* High-Density Typography cho toàn bộ Report BI trên mobile */
                    .bi-report-module .text-3xl { font-size: 20px !important; }
                    .bi-report-module .text-2xl { font-size: 16px !important; }
                    .bi-report-module .text-xl { font-size: 14px !important; }
                    .bi-report-module .text-lg { font-size: 12px !important; }
                    .bi-report-module .text-base { font-size: 11px !important; }
                    .bi-report-module .text-sm { font-size: 10px !important; }
                    .bi-report-module .text-xs { font-size: 9px !important; }
                    .bi-report-module .text-\\[14px\\] { font-size: 11px !important; }
                    .bi-report-module .text-\\[13px\\] { font-size: 10px !important; }
                    .bi-report-module .text-\\[12px\\] { font-size: 9px !important; }
                    .bi-report-module .text-\\[11px\\] { font-size: 9px !important; }
                    .bi-report-module .text-\\[10px\\] { font-size: 8px !important; }
                    .bi-report-module .text-\\[9px\\] { font-size: 8px !important; }
                    
                    /* Inline styles font size */
                    .bi-report-module span[style*="font-size:13px"] { font-size: 10px !important; }
                    .bi-report-module span[style*="font-size:12px"] { font-size: 9px !important; }
                    .bi-report-module span[style*="font-size:11px"] { font-size: 9px !important; }
                    
                    /* Triệt tiêu khoảng trắng thừa */
                    .bi-report-module .p-4 { padding: 10px !important; }
                    .bi-report-module .p-3 { padding: 8px !important; }
                    .bi-report-module .p-6 { padding: 12px !important; }
                    .bi-report-module .py-6 { padding-top: 12px !important; padding-bottom: 12px !important; }
                    .bi-report-module .px-6 { padding-left: 12px !important; padding-right: 12px !important; }
                    
                    .bi-report-module .gap-6 { gap: 12px !important; }
                    .bi-report-module .gap-4 { gap: 8px !important; }
                    .bi-report-module .gap-3 { gap: 6px !important; }
                    .bi-report-module .gap-2 { gap: 4px !important; }
                    
                    .bi-report-module .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 12px !important; }
                    .bi-report-module .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 8px !important; }
                    
                    .bi-report-module .mb-6 { margin-bottom: 12px !important; }
                    .bi-report-module .mb-4 { margin-bottom: 8px !important; }
                    
                    .bi-report-module .rounded-2xl { border-radius: 12px !important; }
                    .bi-report-module .rounded-xl { border-radius: 8px !important; }
                    
                    /* Icon sizes */
                    .bi-report-module .w-12 { width: 32px !important; }
                    .bi-report-module .h-12 { height: 32px !important; }
                    
                    /* Ẩn scrollbar trên bảng dữ liệu/mobile */
                    .bi-report-module ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
                    .bi-report-module * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
                }
            `}</style>
            {mounted && activeTab === 'employees' && document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions') && createPortal(
                isMobile ? (
                    <div className="flex items-center gap-0.5 animate-in fade-in zoom-in duration-300">
                        {navigationLinks.map(tab => {
                            const isActive = activeView === tab.id;
                            return (
                                <Button
                                    variant="ghost"
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center justify-center gap-1 py-1 px-1.5 rounded-full font-semibold text-[10px] transition-all whitespace-nowrap shrink-0 focus:outline-none ${
                                        isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                                    }`}
                                    title={tab.label || tab.id}
                                >
                                    <Icon name={tab.icon} size={4.5} />
                                </Button>
                            );
                        })}
                        <div className="flex shrink-0 items-center pl-0.5 ml-0.5">
                            <div className="rounded-xl overflow-hidden scale-90 origin-right">
                                <FontSelector />
                            </div>
                        </div>
                    </div>
                ) : (
                    // Nhóm thành các "pill" trắng viền riêng biệt (đúng chuẩn components/layout/Header.tsx):
                    // nhóm điều hướng (Tổng quan/Nhân viên/Cập nhật) trong 1 pill, nhóm tiện ích (Cài đặt/Font) trong pill khác.
                    <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                            {navigationLinks.filter(tab => tab.id !== 'settings').map((tab, idx) => {
                                const isActive = activeView === tab.id;
                                return (
                                    <Button
                                        variant="unstyled" size="none"
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 focus:outline-none ${idx > 0 ? 'border-l border-slate-100 dark:border-slate-700' : ''} ${getTabColorClasses(tab.color, isActive)}`}
                                        title={tab.label}
                                    >
                                        <Icon name={tab.icon} size={4} />
                                        <span>{tab.label}</span>
                                    </Button>
                                );
                            })}
                        </div>

                        <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <Button
                                variant="unstyled" size="none"
                                onClick={() => handleTabChange('settings')}
                                className={`flex items-center justify-center p-2 transition-colors focus:outline-none ${activeView === 'settings' ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30' : 'text-slate-500 hover:text-rose-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                                title="Cài đặt"
                            >
                                <Icon name="settings" size={4} />
                            </Button>
                            <div className="border-l border-slate-100 dark:border-slate-700">
                                <FontSelector />
                            </div>
                        </div>
                    </div>
                ),
                document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions')!
            )}



            {/* Nội dung Module — HIDDEN/BLOCK pattern: mount once, toggle visibility */}
            <main className="p-0 sm:p-4 lg:p-8 space-y-6 mx-auto w-full flex-grow max-w-[960px]">
                <Suspense fallback={<TabSpinner />}>
                    {/* Dashboard view */}
                    {mountedViews.has('dashboard') && (
                        <div className={activeView === 'dashboard' ? 'block relative' : 'absolute left-[-9999px] top-0 opacity-0 pointer-events-none w-full h-full overflow-hidden'}>
                            <Dashboard onNavigateToUpdater={handleNavigateToUpdater} isActive={isActive && activeView === 'dashboard'} />
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

                    {/* Settings view - lightweight, can use conditional */}
                    {activeView === 'settings' && <Settings />}
                </Suspense>
            </main>

        </div>
    );
});

export default BiWrapper;
