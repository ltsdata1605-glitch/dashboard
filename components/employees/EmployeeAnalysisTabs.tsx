
import React from 'react';
import { Icon } from '../common/Icon';
import EmployeeAnalysisFilters from './EmployeeAnalysisFilters';

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

const getTabColorClasses = (color: string, isActive: boolean) => {
    if (!isActive) return 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800';
    switch (color) {
        case 'emerald': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
        case 'amber': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
        case 'rose': return 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
        case 'purple': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
        case 'sky': return 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400';
        case 'cyan': return 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400';
        default: return 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400';
    }
};

const EmployeeAnalysisTabs: React.FC<EmployeeAnalysisTabsProps> = ({
    renderedDefaultTabs,
    renderedCustomTabs,
    activeTab,
    setActiveTab,
    setModalState,
    visibleTabs,
    handleToggleTabVisibility,
    allAvailableTabs
}) => {
    return (
        <div className="flex justify-between items-end gap-y-2 border-b-2 border-slate-100 dark:border-slate-800 px-4 md:px-6 z-50 relative pb-0">
            <div className="relative flex-1 min-w-0">
                <div className="flex items-end gap-1 overflow-x-auto flex-1 min-w-0 pb-2 pt-2 hide-scrollbar">
                    {renderedDefaultTabs.map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`flex items-center gap-1.5 py-1.5 px-2.5 md:px-3.5 rounded-xl font-bold text-[12px] md:text-[13px] transition-all whitespace-nowrap ${getTabColorClasses((tab as any).color || 'sky', activeTab === tab.id)}`}
                        >
                            <div className={`${activeTab === tab.id ? 'text-current' : 'text-slate-400'}`}>
                                <Icon name={tab.icon} size={4}/> 
                            </div>
                            {tab.label}
                        </button>
                    ))}
                    
                    {renderedCustomTabs.length > 0 && (
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                    )}
                    
                    {renderedCustomTabs.map(tab => {
                        const colors = ['cyan', 'purple', 'rose', 'amber', 'emerald'];
                        const customColor = colors[tab.id.length % colors.length];
                        return (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)} 
                                className={`flex items-center gap-1.5 py-1.5 px-2.5 md:px-3.5 rounded-xl font-bold text-[12px] md:text-[13px] transition-all whitespace-nowrap ${getTabColorClasses(customColor, activeTab === tab.id)}`}
                            >
                                <div className={`${activeTab === tab.id ? 'text-current' : 'text-slate-400'}`}>
                                    <Icon name={tab.icon} size={4}/> 
                                </div>
                                {tab.name}
                            </button>
                        )
                    })}
                    <button 
                        onClick={() => setModalState({type: 'CREATE_TAB'})} 
                        title="Tạo tab thi đua mới" 
                        className="ml-2 p-1.5 text-slate-400 hover:text-sky-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center shrink-0"
                    >
                        <Icon name="plus-circle" size={5} />
                    </button>
                </div>
                {/* Scroll fade indicator */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none lg:hidden" />
            </div>
        </div>
    );
};

export default EmployeeAnalysisTabs;
