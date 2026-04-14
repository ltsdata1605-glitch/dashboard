
import React from 'react';
import { SubTab } from '../../utils/dashboardHelpers';
import { ChartBarIcon, UsersIcon } from '../Icons';

interface DashboardToolbarProps {
    id: string;
    activeSubTab: SubTab;
    setActiveSubTab: (tab: SubTab) => void;
}

const TABS: { tab: SubTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'revenue', label: 'Doanh thu', icon: <ChartBarIcon className="h-4 w-4" /> },
    { tab: 'competition', label: 'Thi đua', icon: <UsersIcon className="h-4 w-4" /> },
];

const DashboardToolbar: React.FC<DashboardToolbarProps> = ({ id, activeSubTab, setActiveSubTab }) => {
    return (
        <div id={id} className="mb-5 flex justify-center sm:justify-start">
            <nav
                className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mr-2 flex-shrink-0"
                aria-label="Dashboard Tabs"
            >
                {TABS.map(({ tab, label }) => {
                    const isActive = activeSubTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveSubTab(tab)}
                            className={`py-1.5 px-4 sm:px-6 text-[10px] md:text-sm font-bold rounded-lg transition-all uppercase tracking-wider ${isActive ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm relative' : 'text-slate-500 hover:text-sky-600 dark:hover:text-sky-400'}`}
                        >
                            {label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default DashboardToolbar;
