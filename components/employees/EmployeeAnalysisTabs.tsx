
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
        case 'indigo': return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm';
        case 'emerald': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 shadow-sm';
        case 'amber': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 shadow-sm';
        case 'rose': return 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 shadow-sm';
        case 'purple': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 shadow-sm';
        case 'sky': return 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 shadow-sm';
        case 'cyan': return 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 shadow-sm';
        default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 shadow-sm';
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
        <div className="flex justify-between items-end gap-y-2 border-b-2 border-slate-200 dark:border-slate-700 px-4 z-50 relative">
            <div className="flex items-end gap-1 overflow-x-auto flex-1 min-w-0 pb-1 pt-1 hide-scrollbar">
                {renderedDefaultTabs.map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id)} 
                        className={`flex items-center gap-2 py-1.5 px-3 rounded-xl font-bold text-[13px] transition-all whitespace-nowrap ${getTabColorClasses((tab as any).color || 'indigo', activeTab === tab.id)}`}
                    >
                        <div className={`p-1 rounded-lg ${activeTab === tab.id ? 'bg-white/60 dark:bg-black/20 text-current' : 'text-slate-400'}`}>
                            <Icon name={tab.icon} size={3.5}/> 
                        </div>
                        {tab.label}
                    </button>
                ))}
                {renderedCustomTabs.map(tab => {
                    // Assign a consistent color based on string length to custom tabs
                    const colors = ['cyan', 'purple', 'rose', 'amber', 'emerald'];
                    const customColor = colors[tab.id.length % colors.length];
                    return (
                    <div key={tab.id} className="group relative">
                        <button 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`flex items-center gap-2 py-1.5 px-3 rounded-xl font-bold text-[13px] transition-all whitespace-nowrap ${getTabColorClasses(customColor, activeTab === tab.id)}`}
                        >
                            <div className={`p-1 rounded-lg ${activeTab === tab.id ? 'bg-white/60 dark:bg-black/20 text-current' : 'text-slate-400'}`}>
                                <Icon name={tab.icon} size={3.5}/> 
                            </div>
                            {tab.name}
                        </button>
                        <div className="absolute top-0 right-0 flex items-center transition-opacity hide-on-export">
                            <button 
                                onClick={() => setModalState({ type: 'EDIT_TAB', data: { tabId: tab.id, initialName: tab.name, initialIcon: tab.icon }})} 
                                className="p-1 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"
                            >
                                <Icon name="edit-3" size={3.5}/>
                            </button>
                            <button 
                                onClick={() => setModalState({ type: 'CONFIRM_DELETE_TAB', data: { tabId: tab.id, tabName: tab.name }})} 
                                className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                                <Icon name="trash-2" size={3.5}/>
                            </button>
                        </div>
                    </div>
                    )
                })}
                <button 
                    onClick={() => setModalState({type: 'CREATE_TAB'})} 
                    title="Tạo tab thi đua mới" 
                    className="ml-2 mb-1 p-2 text-slate-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <Icon name="plus-circle" size={4.5} />
                </button>
            </div>
        </div>
    );
};

export default EmployeeAnalysisTabs;
