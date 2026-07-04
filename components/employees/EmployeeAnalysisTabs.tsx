import React from 'react';
import { Icon } from '../common/Icon';

interface Tab {
    id: string;
    label: string;
    icon: string;
    name?: string;
}

interface EmployeeAnalysisTabsProps {
    renderedDefaultTabs: Tab[];
    renderedCustomTabs: any[];
    activeTab: string;
    setActiveTab: (id: string) => void;
    setModalState: (state: any) => void;
    visibleTabs: Set<string>;
    handleToggleTabVisibility: (id: string) => void;
    allAvailableTabs: any[];
}

const EmployeeAnalysisTabs: React.FC<EmployeeAnalysisTabsProps> = ({
    renderedDefaultTabs,
    renderedCustomTabs,
    activeTab,
    setActiveTab,
    setModalState
}) => {
    return (
        <div className="flex justify-between items-end gap-y-2 border-b border-slate-200 dark:border-slate-800 px-2 sm:px-6 z-50 relative">
            <div className="relative flex-1 min-w-0">
                <nav className="-mb-px flex items-center gap-2 sm:space-x-4 overflow-x-auto no-scrollbar pb-0 pt-2">
                    {renderedDefaultTabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id)} 
                                className={`whitespace-nowrap pb-3 px-1 border-b-2 font-semibold text-[11px] sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer ${
                                    isActive 
                                    ? 'border-sky-500 text-sky-600 dark:text-sky-400' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                <div className={isActive ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400'}>
                                    <Icon name={tab.icon} size={3.5} className="sm:hidden"/>
                                    <Icon name={tab.icon} size={4} className="hidden sm:block"/>
                                </div>
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                    
                    {renderedCustomTabs.length > 0 && (
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2 self-center"></div>
                    )}
                    
                    {renderedCustomTabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)} 
                                className={`whitespace-nowrap pb-3 px-1 border-b-2 font-semibold text-[11px] sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer ${
                                    isActive 
                                    ? 'border-sky-500 text-sky-600 dark:text-sky-400' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                <div className={isActive ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400'}>
                                    <Icon name={tab.icon} size={3.5} className="sm:hidden"/>
                                    <Icon name={tab.icon} size={4} className="hidden sm:block"/>
                                </div>
                                <span>{tab.name}</span>
                            </button>
                        );
                    })}
                    <button 
                        onClick={() => setModalState({type: 'CREATE_TAB'})} 
                        title="Tạo tab thi đua mới" 
                        className="ml-2 pb-3 px-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                    >
                        <Icon name="plus-circle" size={4} className="sm:hidden" />
                        <Icon name="plus-circle" size={5} className="hidden sm:block" />
                    </button>
                </nav>
                {/* Scroll fade indicator */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none lg:hidden" />
            </div>
        </div>
    );
};

export default EmployeeAnalysisTabs;
