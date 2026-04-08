import React from 'react';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import Dashboard from './Dashboard';
import NhanVien from './NhanVien';
import DataUpdater from './DataUpdater';
import Settings from './Settings';
import { Icon } from '../../components/common/Icon';

export default function BiWrapper() {
    const [activeView, setActiveView] = useIndexedDBState<'dashboard' | 'employee' | 'updater' | 'settings'>('main-active-view', 'dashboard');

    const navigationLinks = [
        { id: 'dashboard', icon: 'pie-chart', label: 'Tổng quan BI', color: 'sky' },
        { id: 'employee', icon: 'users', label: 'Nhân viên BI', color: 'emerald' },
        { id: 'updater', icon: 'upload-cloud', label: 'Cập nhật Dữ liệu', color: 'amber' },
        { id: 'settings', icon: 'settings', label: 'Cấu hình BI', color: 'rose' },
    ];


    return (
        <div className="flex flex-col w-full min-h-screen">
            {/* Thanh Tab Ngang Nội Bộ giống chức năng Phân tích */}
            <div className="flex justify-between items-end gap-y-2 border-b-2 border-slate-100 dark:border-slate-800 px-4 lg:px-8 z-40 sticky top-0 bg-[#f8fafc]/90 dark:bg-slate-950/90 backdrop-blur-md pb-0 shadow-sm relative pt-4">
                <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 pb-3 pt-1 hide-scrollbar">
                    {navigationLinks.map(tab => {
                        const isActive = activeView === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveView(tab.id as any)}
                                className={`flex items-center gap-1 px-4 py-2 text-[13px] font-bold rounded-full transition-colors duration-200 whitespace-nowrap shrink-0 focus:outline-none ${
                                    isActive 
                                        ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm' 
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                <div className={`${isActive ? 'text-current' : 'text-slate-400'} shrink-0`}>
                                    <Icon name={tab.icon as any} size={4}/>
                                </div>
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Nội dung Module Cụ thể */}
            <main className={`p-4 lg:p-8 space-y-6 mx-auto w-full flex-grow ${activeView === 'employee' ? 'max-w-[960px]' : 'max-w-[1600px] xl:max-w-7xl'}`}>
                {activeView === 'dashboard' && <Dashboard onNavigateToUpdater={() => setActiveView('updater')} />}
                {activeView === 'employee' && <NhanVien />}
                {activeView === 'updater' && <DataUpdater />}
                {activeView === 'settings' && <Settings />}
            </main>
        </div>
    );
}
