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
        <div className="px-2 py-1 sm:px-4 sm:py-2.5 flex flex-row justify-between items-center gap-1.5 sm:gap-2 border-b border-slate-100 dark:border-slate-800 sm:border-b-slate-100 sm:dark:border-b-slate-800" style={{ borderImage: 'linear-gradient(to right, rgba(99,102,241,0.15), rgba(14,165,233,0.1), transparent) 1' }}>
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-md sm:rounded-xl bg-[#0584c7]/10 text-[#0584c7] flex items-center justify-center shrink-0">
                    <Icon name={icon} size={3.5} className="sm:hidden" />
                    <Icon name={icon} size={5} className="hidden sm:block" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-[11px] sm:text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight truncate leading-tight">{title}</h2>
                    {subtitle && <div className="text-[8px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate leading-none">{subtitle}</div>}
                </div>
            </div>
            {children && <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">{children}</div>}
        </div>
    );
};


