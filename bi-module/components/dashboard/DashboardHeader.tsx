
import React from 'react';
import { MainTab } from '../../utils/dashboardHelpers';
import { LineChartIcon, ArchiveBoxIcon, SparklesIcon } from '../Icons';

interface DashboardHeaderProps {
    title: string;
    activeMainTab: MainTab;
    setActiveMainTab: (tab: MainTab) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, activeMainTab, setActiveMainTab }) => {
    return (
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 w-full">
            {/* Title + Icon */}
            <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-2xl flex-shrink-0 border border-sky-100 dark:border-sky-800">
                    <SparklesIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                    <h1 id="dashboard-title" className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none truncate">
                        {title}
                    </h1>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-wider leading-none">
                        Realtime & Luỹ kế tháng
                    </p>
                </div>
            </div>

            {/* Main Tab Switcher */}
            <div
                id="main-tabs-container"
                className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mr-2 flex-shrink-0"
            >
                {([
                    { tab: 'realtime' as MainTab, label: 'Realtime' },
                    { tab: 'cumulative' as MainTab, label: 'Luỹ kế' },
                ] as const).map(({ tab, label }) => {
                    const isActive = activeMainTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveMainTab(tab)}
                            className={`py-1.5 px-4 sm:px-6 text-[10px] md:text-sm font-bold rounded-lg transition-all uppercase tracking-wider ${isActive ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm relative' : 'text-slate-500 hover:text-sky-600 dark:hover:text-sky-400'}`}
                        >
                            {label}
                            {isActive && (
                                <span className="absolute -top-1 -right-1.5 w-1.5 h-1.5 rounded-full bg-sky-500" />
                            )}
                        </button>
                    );
                })}
            </div>
        </header>
    );
};

export default DashboardHeader;
