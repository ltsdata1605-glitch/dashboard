import React from 'react';
import { Icon } from '../../common/Icon';

interface SectionHeaderProps {
    title: React.ReactNode;
    icon: string;
    subtitle?: React.ReactNode;
    children?: React.ReactNode;
}

/**
 * Header chuẩn cho mọi "Card section" (KPI/Chart/Table...) — icon chip trái + tiêu đề,
 * vùng actions phải (children, nên dùng kỹ thuật "double-icon" cho responsive, xem
 * DESIGN_SYSTEM_MODERN.md §2). Breakpoint chính lg=1024px (mobile < lg, laptop >= lg).
 *
 * Khác với `CardHeader` (đơn giản, không icon chip, dùng cho Card tĩnh): `SectionHeader`
 * có icon-chip + double-icon toolbar, dùng cho khung section cấp trang.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon, subtitle, children }) => {
    return (
        <div className="px-2 py-1.5 lg:px-4 lg:py-2.5 flex flex-row justify-between items-center gap-1.5 lg:gap-2 border-b border-slate-100 dark:border-slate-800" style={{ borderImage: 'linear-gradient(to right, rgba(99,102,241,0.15), rgba(14,165,233,0.1), transparent) 1' }}>
            <div className="flex items-center gap-1.5 lg:gap-3 min-w-0">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-sky-600/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Icon name={icon} size={4.5} className="lg:hidden" />
                    <Icon name={icon} size={5} className="hidden lg:block" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-sm lg:text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight truncate leading-tight">{title}</h2>
                    {subtitle && <div className="text-[10px] lg:text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate leading-none mt-0.5">{subtitle}</div>}
                </div>
            </div>
            {children && <div className="flex items-center gap-0.5 lg:gap-2 shrink-0">{children}</div>}
        </div>
    );
};
