import React from 'react';
import { Icon } from './Icon';

interface SectionHeaderProps {
    title: string;
    icon: string;
    subtitle?: React.ReactNode;
    children?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon, subtitle, children }) => {
    return (
        <div className="px-3 py-2.5 lg:px-6 lg:py-5 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1.5 lg:gap-0 border-b border-slate-100 dark:border-slate-800 lg:border-b-slate-100 lg:dark:border-b-slate-800" style={{ borderImage: 'linear-gradient(to right, rgba(99,102,241,0.15), rgba(14,165,233,0.1), transparent) 1' }}>
            <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-[#0584c7]/10 text-[#0584c7] flex items-center justify-center shrink-0">
                    <Icon name={icon} size={4} className="lg:hidden" />
                    <Icon name={icon} size={5} className="hidden lg:block" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-sm lg:text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight truncate">{title}</h2>
                    {subtitle && <div className="text-[9px] lg:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0 lg:mt-1 truncate">{subtitle}</div>}
                </div>
            </div>
            {children && <div className="flex items-center gap-0.5 lg:gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 lg:mx-0 lg:px-0">{children}</div>}
        </div>
    );
};


