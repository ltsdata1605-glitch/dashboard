import React from 'react';
import { IndustryKpiMetricData } from '../../../services/industryKpiCalc';
import { roundUp } from '../../../utils/dashboardHelpers';
import { X } from 'lucide-react';
import { Button } from '../../../../../components/shared/ui/Button';

export type IndustryKpiFocusMetric = 'revenue' | 'quantity';

export interface PastelTheme {
    cardBg: string;
    cardBorder: string;
    titleColor: string;
    primaryColor: string;
    secondaryColor: string;
    labelColor: string;
}

export const PASTEL_THEMES: PastelTheme[] = [
    {
        // 1. Sky
        cardBg: 'bg-sky-50/70 dark:bg-sky-950/40',
        cardBorder: 'border-sky-200/90 dark:border-sky-800/70 hover:border-sky-400',
        titleColor: 'text-sky-950 dark:text-sky-200',
        primaryColor: 'text-sky-700 dark:text-sky-300',
        secondaryColor: 'text-sky-700/80 dark:text-sky-400',
        labelColor: 'text-sky-600/70 dark:text-sky-400/70',
    },
    {
        // 2. Amber
        cardBg: 'bg-amber-50/70 dark:bg-amber-950/40',
        cardBorder: 'border-amber-200/90 dark:border-amber-800/70 hover:border-amber-400',
        titleColor: 'text-amber-950 dark:text-amber-200',
        primaryColor: 'text-amber-700 dark:text-amber-300',
        secondaryColor: 'text-amber-700/80 dark:text-amber-400',
        labelColor: 'text-amber-600/70 dark:text-amber-400/70',
    },
    {
        // 3. Emerald
        cardBg: 'bg-emerald-50/70 dark:bg-emerald-950/40',
        cardBorder: 'border-emerald-200/90 dark:border-emerald-800/70 hover:border-emerald-400',
        titleColor: 'text-emerald-950 dark:text-emerald-200',
        primaryColor: 'text-emerald-700 dark:text-emerald-300',
        secondaryColor: 'text-emerald-700/80 dark:text-emerald-400',
        labelColor: 'text-emerald-600/70 dark:text-emerald-400/70',
    },
    {
        // 4. Violet
        cardBg: 'bg-violet-50/70 dark:bg-violet-950/40',
        cardBorder: 'border-violet-200/90 dark:border-violet-800/70 hover:border-violet-400',
        titleColor: 'text-violet-950 dark:text-violet-200',
        primaryColor: 'text-violet-700 dark:text-violet-300',
        secondaryColor: 'text-violet-700/80 dark:text-violet-400',
        labelColor: 'text-violet-600/70 dark:text-violet-400/70',
    },
    {
        // 5. Rose
        cardBg: 'bg-rose-50/70 dark:bg-rose-950/40',
        cardBorder: 'border-rose-200/90 dark:border-rose-800/70 hover:border-rose-400',
        titleColor: 'text-rose-950 dark:text-rose-200',
        primaryColor: 'text-rose-700 dark:text-rose-300',
        secondaryColor: 'text-rose-700/80 dark:text-rose-400',
        labelColor: 'text-rose-600/70 dark:text-rose-400/70',
    },
    {
        // 6. Teal
        cardBg: 'bg-teal-50/70 dark:bg-teal-950/40',
        cardBorder: 'border-teal-200/90 dark:border-teal-800/70 hover:border-teal-400',
        titleColor: 'text-teal-950 dark:text-teal-200',
        primaryColor: 'text-teal-700 dark:text-teal-300',
        secondaryColor: 'text-teal-700/80 dark:text-teal-400',
        labelColor: 'text-teal-600/70 dark:text-teal-400/70',
    },
    {
        // 7. Orange
        cardBg: 'bg-orange-50/70 dark:bg-orange-950/40',
        cardBorder: 'border-orange-200/90 dark:border-orange-800/70 hover:border-orange-400',
        titleColor: 'text-orange-950 dark:text-orange-200',
        primaryColor: 'text-orange-700 dark:text-orange-300',
        secondaryColor: 'text-orange-700/80 dark:text-orange-400',
        labelColor: 'text-orange-600/70 dark:text-orange-400/70',
    },
    {
        // 8. Cyan
        cardBg: 'bg-cyan-50/70 dark:bg-cyan-950/40',
        cardBorder: 'border-cyan-200/90 dark:border-cyan-800/70 hover:border-cyan-400',
        titleColor: 'text-cyan-950 dark:text-cyan-200',
        primaryColor: 'text-cyan-700 dark:text-cyan-300',
        secondaryColor: 'text-cyan-700/80 dark:text-cyan-400',
        labelColor: 'text-cyan-600/70 dark:text-cyan-400/70',
    },
    {
        // 9. Indigo
        cardBg: 'bg-indigo-50/70 dark:bg-indigo-950/40',
        cardBorder: 'border-indigo-200/90 dark:border-indigo-800/70 hover:border-indigo-400',
        titleColor: 'text-indigo-950 dark:text-indigo-200',
        primaryColor: 'text-indigo-700 dark:text-indigo-300',
        secondaryColor: 'text-indigo-700/80 dark:text-indigo-400',
        labelColor: 'text-indigo-600/70 dark:text-indigo-400/70',
    },
    {
        // 10. Lime
        cardBg: 'bg-lime-50/70 dark:bg-lime-950/40',
        cardBorder: 'border-lime-200/90 dark:border-lime-800/70 hover:border-lime-400',
        titleColor: 'text-lime-950 dark:text-lime-200',
        primaryColor: 'text-lime-700 dark:text-lime-300',
        secondaryColor: 'text-lime-700/80 dark:text-lime-400',
        labelColor: 'text-lime-600/70 dark:text-lime-400/70',
    },
    {
        // 11. Fuchsia
        cardBg: 'bg-fuchsia-50/70 dark:bg-fuchsia-950/40',
        cardBorder: 'border-fuchsia-200/90 dark:border-fuchsia-800/70 hover:border-fuchsia-400',
        titleColor: 'text-fuchsia-950 dark:text-fuchsia-200',
        primaryColor: 'text-fuchsia-700 dark:text-fuchsia-300',
        secondaryColor: 'text-fuchsia-700/80 dark:text-fuchsia-400',
        labelColor: 'text-fuchsia-600/70 dark:text-fuchsia-400/70',
    },
    {
        // 12. Blue
        cardBg: 'bg-blue-50/70 dark:bg-blue-950/40',
        cardBorder: 'border-blue-200/90 dark:border-blue-800/70 hover:border-blue-400',
        titleColor: 'text-blue-950 dark:text-blue-200',
        primaryColor: 'text-blue-700 dark:text-blue-300',
        secondaryColor: 'text-blue-700/80 dark:text-blue-400',
        labelColor: 'text-blue-600/70 dark:text-blue-400/70',
    },
];

interface IndustryKpiCardProps {
    metric: IndustryKpiMetricData;
    index?: number;
    isRealtime: boolean;
    focusMetric?: IndustryKpiFocusMetric;
    onRemove?: (id: string) => void;
}

export const IndustryKpiCard: React.FC<IndustryKpiCardProps> = ({
    metric,
    index = 0,
    isRealtime,
    focusMetric = 'revenue',
    onRemove,
}) => {
    const isRevenueFocus = focusMetric === 'revenue';
    const theme = PASTEL_THEMES[Math.abs(index) % PASTEL_THEMES.length];

    return (
        <div className={`group relative ${theme.cardBg} border ${theme.cardBorder} transition-all duration-200 shadow-2xs hover:shadow-xs flex flex-col justify-between p-2 sm:p-2.5 overflow-hidden`}>
            {/* Hàng trên: Chỉ hiển thị TÊN (metric.displayTitle) không in đậm và nút X khi hover */}
            <div className="flex items-center justify-between gap-1 mb-1">
                <span
                    className={`text-[11.5px] sm:text-[12px] font-medium uppercase truncate tracking-tight leading-none flex-1 min-w-0 ${theme.titleColor}`}
                    title={metric.parentName ? `${metric.displayTitle} (${metric.parentName})` : metric.displayTitle}
                >
                    {metric.displayTitle}
                </span>

                {onRemove && (
                    <Button
                        type="button"
                        variant="unstyled"
                        size="none"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(metric.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity shrink-0 cursor-pointer"
                        title="Xóa thẻ này"
                    >
                        <X className="w-3 h-3" />
                    </Button>
                )}
            </div>

            {/* Hàng dưới: Hiển thị DTQĐ và Số lượng — tiêu chí nào được chọn thì số đó LỚN HƠN, màu chữ tương ứng với màu pastel nhưng đậm hơn */}
            <div className="flex items-baseline justify-between gap-1 mt-0.5">
                {isRevenueFocus ? (
                    <>
                        {/* Doanh thu LỚN HƠN */}
                        <div className="flex items-baseline gap-1 min-w-0">
                            <span className={`text-[17px] sm:text-[19px] lg:text-[20px] font-semibold tracking-tight tabular-nums leading-none ${theme.primaryColor}`}>
                                {roundUp(metric.dtQd).toLocaleString('vi-VN')}
                            </span>
                            <span className={`text-[10px] font-medium uppercase leading-none ${theme.labelColor}`}>
                                {isRealtime ? 'DTQĐ' : 'QĐ'}
                            </span>
                        </div>

                        {/* Số lượng NHỎ HƠN */}
                        <div className="flex items-baseline gap-0.5 shrink-0 text-right">
                            <span className={`text-[10px] font-medium ${theme.labelColor}`}>SL:</span>
                            <span className={`text-[11px] sm:text-[11.5px] font-medium tabular-nums ${theme.secondaryColor}`}>
                                {roundUp(metric.sl).toLocaleString('vi-VN')}
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Số lượng LỚN HƠN */}
                        <div className="flex items-baseline gap-1 min-w-0">
                            <span className={`text-[17px] sm:text-[19px] lg:text-[20px] font-semibold tracking-tight tabular-nums leading-none ${theme.primaryColor}`}>
                                {roundUp(metric.sl).toLocaleString('vi-VN')}
                            </span>
                            <span className={`text-[10px] font-medium uppercase leading-none ${theme.labelColor}`}>
                                SL
                            </span>
                        </div>

                        {/* Doanh thu NHỎ HƠN */}
                        <div className="flex items-baseline gap-0.5 shrink-0 text-right">
                            <span className={`text-[10px] font-medium ${theme.labelColor}`}>
                                {isRealtime ? 'DTQĐ:' : 'QĐ:'}
                            </span>
                            <span className={`text-[11px] sm:text-[11.5px] font-medium tabular-nums ${theme.secondaryColor}`}>
                                {roundUp(metric.dtQd).toLocaleString('vi-VN')}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
