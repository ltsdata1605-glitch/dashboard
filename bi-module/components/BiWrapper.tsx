import React, { useState, useCallback, Suspense, lazy } from 'react';
import { Icon } from '../../components/common/Icon';

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
    // Use plain useState — no IDB write needed for navigation state
    const [activeView, setActiveView] = useState<'dashboard' | 'employee' | 'updater' | 'settings'>('dashboard');
    // Track which views have been visited to enable lazy mounting (mount on first visit, keep alive after)
    const [mountedViews, setMountedViews] = useState<Set<string>>(() => new Set(['dashboard']));

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
            {/* Thanh Tab Ngang Nội Bộ */}
            <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 lg:px-8 z-40 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-end gap-0 overflow-x-auto flex-1 min-w-0 hide-scrollbar">
                    {navigationLinks.map(tab => {
                        const isActive = activeView === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center justify-center gap-2 py-3 ${tab.label ? 'px-4' : 'px-2.5 w-[36px]'} font-semibold text-[13px] transition-all whitespace-nowrap shrink-0 focus:outline-none border-b-2 ${
                                    isActive
                                        ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-500 dark:hover:text-slate-300'
                                }`}
                            >
                                <div className={`shrink-0 flex items-center justify-center ${isActive ? 'text-current' : ''}`}>
                                    <Icon name={tab.icon as any} size={4} />
                                </div>
                                {tab.label && <span>{tab.label}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

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
