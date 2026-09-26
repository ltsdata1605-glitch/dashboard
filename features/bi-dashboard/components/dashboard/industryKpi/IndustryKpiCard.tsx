import React from 'react';
import { IndustryKpiMetricData } from '../../../services/industryKpiCalc';
import { roundUp } from '../../../utils/dashboardHelpers';
import { X } from 'lucide-react';
import { Button } from '../../../../../components/shared/ui/Button';

export type IndustryKpiFocusMetric = 'revenue' | 'quantity';

interface IndustryKpiCardProps {
    metric: IndustryKpiMetricData;
    isRealtime: boolean;
    focusMetric?: IndustryKpiFocusMetric;
    onRemove?: (id: string) => void;
}

export const IndustryKpiCard: React.FC<IndustryKpiCardProps> = ({
    metric,
    isRealtime,
    focusMetric = 'revenue',
    onRemove,
}) => {
    const isRevenueFocus = focusMetric === 'revenue';

    return (
        <div className="group relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/70 hover:border-sky-500/60 dark:hover:border-sky-500/60 transition-all duration-200 shadow-2xs hover:shadow-xs flex flex-col justify-between p-2 sm:p-2.5 overflow-hidden">
            {/* Hàng trên: Chỉ hiển thị TÊN (metric.displayTitle) và nút X khi hover */}
            <div className="flex items-center justify-between gap-1 mb-1">
                <span
                    className="text-[11.5px] sm:text-[12px] font-black uppercase text-slate-800 dark:text-slate-100 truncate tracking-tight leading-none flex-1 min-w-0"
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

            {/* Hàng dưới: Hiển thị DTQĐ và Số lượng — tiêu chí nào được chọn thì số đó LỚN HƠN */}
            <div className="flex items-baseline justify-between gap-1 mt-0.5">
                {isRevenueFocus ? (
                    <>
                        {/* Doanh thu LỚN HƠN */}
                        <div className="flex items-baseline gap-1 min-w-0">
                            <span className="text-[17px] sm:text-[19px] lg:text-[20px] font-black text-sky-700 dark:text-sky-400 tracking-tight tabular-nums leading-none">
                                {roundUp(metric.dtQd).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none">
                                {isRealtime ? 'DTQĐ' : 'QĐ'}
                            </span>
                        </div>

                        {/* Số lượng NHỎ HƠN */}
                        <div className="flex items-baseline gap-0.5 shrink-0 text-right">
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">SL:</span>
                            <span className="text-[11px] sm:text-[11.5px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                {roundUp(metric.sl).toLocaleString('vi-VN')}
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Số lượng LỚN HƠN */}
                        <div className="flex items-baseline gap-1 min-w-0">
                            <span className="text-[17px] sm:text-[19px] lg:text-[20px] font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums leading-none">
                                {roundUp(metric.sl).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase leading-none">
                                SL
                            </span>
                        </div>

                        {/* Doanh thu NHỎ HƠN */}
                        <div className="flex items-baseline gap-0.5 shrink-0 text-right">
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                {isRealtime ? 'DTQĐ:' : 'QĐ:'}
                            </span>
                            <span className="text-[11px] sm:text-[11.5px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                {roundUp(metric.dtQd).toLocaleString('vi-VN')}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
