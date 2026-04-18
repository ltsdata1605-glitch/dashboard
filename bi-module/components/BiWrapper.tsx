import React from 'react';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import Dashboard from './Dashboard';
import NhanVien from './NhanVien';
import DataUpdater from './DataUpdater';
import Settings from './Settings';
import { Icon } from '../../components/common/Icon';

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

export default function BiWrapper() {
    const [activeView, setActiveView] = useIndexedDBState<'dashboard' | 'employee' | 'updater' | 'settings'>('main-active-view', 'dashboard');

    const navigationLinks = [
        { id: 'dashboard', icon: 'pie-chart', label: 'Tổng quan', color: 'sky' },
        { id: 'employee', icon: 'users', label: 'Nhân viên', color: 'emerald' },
        { id: 'updater', icon: 'upload-cloud', label: 'Cập nhật', color: 'amber' },
        { id: 'settings', icon: 'settings', label: '', color: 'rose' },
    ];

    return (
        <div className="flex flex-col w-full min-h-screen">
            {/* Thanh Tab Ngang Nội Bộ giống chức năng Phân tích */}
            <div className="flex justify-between items-end gap-y-2 border-b-2 border-slate-100 dark:border-slate-800 px-4 md:px-6 lg:px-8 z-40 sticky top-0 bg-[#f8fafc]/90 dark:bg-slate-950/90 backdrop-blur-md pb-0 shadow-sm relative pt-4">
                <div className="flex items-end gap-1 overflow-x-auto flex-1 min-w-0 pb-2 pt-2 hide-scrollbar">
                    {navigationLinks.map(tab => {
                        const isActive = activeView === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveView(tab.id as any)}
                                className={`flex items-center justify-center gap-2 py-1.5 ${tab.label ? 'px-3.5' : 'px-2 w-[34px]'} rounded-xl font-bold text-[13px] transition-all whitespace-nowrap shrink-0 focus:outline-none ${getTabColorClasses(tab.color, isActive)}`}
                            >
                                <div className={`${isActive ? 'text-current' : 'text-slate-400'} shrink-0 flex items-center justify-center`}>
                                    <Icon name={tab.icon as any} size={4}/>
                                </div>
                                {tab.label && <span>{tab.label}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Nội dung Module Cụ thể */}
            <main className="p-4 lg:p-8 space-y-6 mx-auto w-full flex-grow max-w-[960px]">
                {activeView === 'dashboard' && <Dashboard onNavigateToUpdater={() => setActiveView('updater')} />}
                {activeView === 'employee' && <NhanVien />}
                {activeView === 'updater' && <DataUpdater onNavigateToDashboard={() => setActiveView('dashboard')} />}
                {activeView === 'settings' && <Settings />}
            </main>
        </div>
    );
}
