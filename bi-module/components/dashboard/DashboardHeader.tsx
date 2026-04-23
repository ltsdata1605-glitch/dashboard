
import React from 'react';
import { MainTab } from '../../utils/dashboardHelpers';

interface DashboardHeaderProps {
    title: string;
    activeMainTab: MainTab;
    setActiveMainTab: (tab: MainTab) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, activeMainTab, setActiveMainTab }) => {
    return (
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 w-full">
            {/* Title — clean, no icon box */}
            <div className="min-w-0 flex flex-col justify-center">
                <h1 id="dashboard-title" className="text-2xl sm:text-[1.7rem] font-black text-slate-800 dark:text-white tracking-tight leading-tight truncate">
                    {title}
                </h1>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-[0.15em] leading-none">
                    Realtime & Luỹ kế tháng
                </p>
            </div>

            {/* Main Tab Switcher — modern pill style */}
            <div
                id="main-tabs-container"
                className="inline-flex rounded-full p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 mr-2 flex-shrink-0"
            >
                {([
                    { tab: 'realtime' as MainTab, label: 'Realtime' },
                    { tab: 'cumulative' as MainTab, label: 'Luỹ Kế' },
                ] as const).map(({ tab, label }) => {
                    const isActive = activeMainTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveMainTab(tab)}
                            className={`py-1.5 px-5 sm:px-6 text-[11px] font-bold rounded-full transition-all uppercase tracking-widest ${
                                isActive
                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </header>
    );
};

export default DashboardHeader;
