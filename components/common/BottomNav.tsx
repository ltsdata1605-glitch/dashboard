
import React from 'react';
import { Icon } from './Icon';

interface BottomNavProps {
    activeTab: 'dashboard' | 'filters' | 'settings' | 'chat';
    onTabChange: (tab: 'dashboard' | 'filters' | 'settings' | 'chat') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
        { id: 'filters', label: 'Bộ lọc', icon: 'filter' },
        { id: 'chat', label: 'AI Chat', icon: 'message-square' },
        { id: 'settings', label: 'Cài đặt', icon: 'settings' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-2 flex justify-between items-center z-50 md:hidden pb-safe">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id as any)}
                    className={`flex flex-col items-center gap-1 transition-all ${
                        activeTab === tab.id 
                            ? 'text-indigo-600 dark:text-indigo-400' 
                            : 'text-slate-400 dark:text-slate-500'
                    }`}
                >
                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === tab.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                        <Icon name={tab.icon} size={5} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
                </button>
            ))}
        </div>
    );
};
