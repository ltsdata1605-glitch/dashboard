
import React from 'react';
import { Icon } from '../common/Icon';
import EmployeeAnalysisFilters from './EmployeeAnalysisFilters';
import { Button } from '../shared/ui/Button';
import type { CustomContestTab } from '../../types';

export interface Tab {
    id: string;
    label: string;
    icon: string;
    name?: string;
    color?: string;
}

interface EmployeeAnalysisTabsProps {
    renderedDefaultTabs: Tab[];
    renderedCustomTabs: CustomContestTab[];
    activeTab: string;
    setActiveTab: (id: string) => void;
    setModalState: (state: any) => void;
    visibleTabs: Set<string>;
    handleToggleTabVisibility: (id: string) => void;
    allAvailableTabs: Tab[];
}

const getTabColorClasses = (color: string, isActive: boolean) => {
    if (!isActive) return 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800';
    switch (color) {
        case 'emerald': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
        case 'amber': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
        case 'rose': return 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
        case 'slate': return 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300';
        case 'sky': return 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400';
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
        <div className="flex justify-between items-end gap-y-2 border-b-2 border-slate-100 dark:border-slate-800 px-2 sm:px-6 z-50 relative pb-0">
            <div className="relative flex-1 min-w-0">
                <div className="flex items-end gap-0.5 sm:gap-1 overflow-x-auto flex-1 min-w-0 pb-1.5 sm:pb-2 pt-1.5 sm:pt-2 hide-scrollbar">
                    {renderedDefaultTabs.map(tab => (
                        <Button
                            variant="ghost"
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 sm:gap-1.5 py-1 sm:py-1.5 px-1.5 sm:px-3.5 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-[13px] transition-all whitespace-nowrap ${getTabColorClasses(tab.color || 'sky', activeTab === tab.id)}`}
                        >
                            <div className={`${activeTab === tab.id ? 'text-current' : 'text-slate-400'}`}>
                                <Icon name={tab.icon} size={3.5} className="sm:hidden"/>
                                <Icon name={tab.icon} size={4} className="hidden sm:block"/>
                            </div>
                            {tab.label}
                        </Button>
                    ))}
                    
                    {renderedCustomTabs.length > 0 && (
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                    )}
                    
                    {renderedCustomTabs.map(tab => {
                        const colors = ['sky', 'slate', 'rose', 'amber', 'emerald'];
                        const customColor = colors[tab.id.length % colors.length];
                        return (
                            <Button
                                variant="ghost"
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 sm:gap-1.5 py-1 sm:py-1.5 px-1.5 sm:px-3.5 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-[13px] transition-all whitespace-nowrap ${getTabColorClasses(customColor, activeTab === tab.id)}`}
                            >
                                <div className={`${activeTab === tab.id ? 'text-current' : 'text-slate-400'}`}>
                                    <Icon name={tab.icon} size={3.5} className="sm:hidden"/>
                                    <Icon name={tab.icon} size={4} className="hidden sm:block"/>
                                </div>
                                {tab.name}
                            </Button>
                        )
                    })}
                    <Button
                        variant="ghost"
                        onClick={() => setModalState({type: 'CREATE_TAB'})}
                        title="Tạo tab thi đua mới"
                        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit ml-2 p-1.5 text-slate-400 hover:text-sky-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center shrink-0"
                    >
                        <Icon name="plus-circle" size={4} className="sm:hidden" />
                        <Icon name="plus-circle" size={5} className="hidden sm:block" />
                    </Button>
                </div>
                {/* Scroll fade indicator */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none lg:hidden" />
            </div>
        </div>
    );
};

export default EmployeeAnalysisTabs;
