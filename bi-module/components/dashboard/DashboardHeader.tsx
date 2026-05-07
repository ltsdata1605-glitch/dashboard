
import React from 'react';
import { MainTab } from '../../utils/dashboardHelpers';

interface DashboardHeaderProps {
    title: string;
    activeMainTab: MainTab;
    setActiveMainTab: (tab: MainTab) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, activeMainTab, setActiveMainTab }) => {
    return (
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-3 pb-1 border-b border-slate-200 dark:border-slate-800 w-full">
            {/* Title */}
            <div>
                <h1 id="dashboard-title" className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white uppercase">
                    {title}
                </h1>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 pb-2">
                    Realtime & Luỹ kế tháng
                </p>
            </div>

            {/* Main Tab Switcher — modern pill style */}
            <div
                id="main-tabs-container"
                className="inline-flex rounded-full p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex-shrink-0"
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
