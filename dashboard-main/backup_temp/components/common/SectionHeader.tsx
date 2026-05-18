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
        <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0584c7]/10 text-[#0584c7] flex items-center justify-center">
                    <Icon name={icon} size={5} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">{title}</h2>
                    {subtitle && <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{subtitle}</div>}
                </div>
            </div>
            {children}
        </div>
    );
};
