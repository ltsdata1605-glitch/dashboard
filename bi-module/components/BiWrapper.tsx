import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useActiveTab } from '../../contexts/LayoutContext';
import { Icon } from '../../components/common/Icon';
import FontSelector from '../../components/layout/FontSelector';
import { migrateClusterDataToMain } from '../utils/dbMigration';

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
        case 'purple': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
        default: return 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400';
    }
};

const TabSpinner = () => (
    <div className="flex items-center justify-center min-h-[30vh]">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
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
const BiWrapper = React.memo(function BiWrapper() {
    const { activeTab } = useActiveTab();
    const [activeView, setActiveView] = useState<'dashboard' | 'employee' | 'updater' | 'settings'>('dashboard');
    // Track which views have been visited to enable lazy mounting (mount on first visit, keep alive after)
    const [mountedViews, setMountedViews] = useState<Set<string>>(() => new Set(['dashboard']));
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Migrate dữ liệu cũ từ ClusterDataDB sang BI_HUB_DATABASE_V2 (chỉ chạy 1 lần)
    useEffect(() => {
        migrateClusterDataToMain().catch(err => console.warn('[BI Migration] Error:', err));
    }, []);

    const handleTabChange = useCallback((id: string) => {
        setActiveView(id as any);
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
        <div className="flex flex-col w-full min-h-screen">
            {mounted && activeTab === 'employees' && document.getElementById('global-header-actions') && createPortal(
                <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300">
                    {navigationLinks.map(tab => {
                        const isActive = activeView === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center justify-center gap-2 py-1.5 ${tab.label ? 'px-4' : 'px-2 w-[32px]'} rounded-full font-semibold text-[13px] transition-all whitespace-nowrap shrink-0 focus:outline-none ${
                                    isActive
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-700/60'
                                        : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                                }`}
                                title={tab.label || tab.id}
                            >
                                <Icon name={tab.icon as any} size={4} />
                                {tab.label && <span>{tab.label}</span>}
                            </button>
                        );
                    })}
                    
                    <div className="flex shrink-0 items-center pl-1 border-l border-slate-200 dark:border-slate-700 ml-1">
                        <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <FontSelector />
                        </div>
                    </div>
                </div>,
                document.getElementById('global-header-actions')!
            )}

            {/* Nội dung Module — HIDDEN/BLOCK pattern: mount once, toggle visibility */}
            <main className="p-0 sm:p-4 lg:p-8 space-y-6 mx-auto w-full flex-grow max-w-[960px]">
                <Suspense fallback={<TabSpinner />}>
                    {/* Dashboard view */}
                    {mountedViews.has('dashboard') && (
                        <div className={activeView === 'dashboard' ? 'block relative' : 'absolute left-[-9999px] top-0 opacity-0 pointer-events-none w-full h-full overflow-hidden'}>
                            <Dashboard onNavigateToUpdater={handleNavigateToUpdater} />
                        </div>
                    )}

                    {/* Employee view */}
                    {mountedViews.has('employee') && (
                        <div className={activeView === 'employee' ? 'block relative' : 'absolute left-[-9999px] top-0 opacity-0 pointer-events-none w-full h-full overflow-hidden'}>
                            <NhanVien />
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
