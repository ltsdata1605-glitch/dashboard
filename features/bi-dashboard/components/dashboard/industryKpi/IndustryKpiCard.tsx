import React from 'react';
import { IndustryKpiMetricData } from '../../../services/industryKpiCalc';
import { roundUp } from '../../../utils/dashboardHelpers';
import { X, TrendingUp, TrendingDown, Layers, Package } from 'lucide-react';
import { Button } from '../../../../../components/shared/ui/Button';

interface IndustryKpiCardProps {
    metric: IndustryKpiMetricData;
    isRealtime: boolean;
    onRemove?: (id: string) => void;
}

export const IndustryKpiCard: React.FC<IndustryKpiCardProps> = ({
    metric,
    isRealtime,
    onRemove,
}) => {
    const isGrowthPositive = metric.growth >= 0;
    const isTgGood = metric.ptTraGop >= 40;

    return (
        <div className="group relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/70 hover:border-sky-500/60 dark:hover:border-sky-500/60 transition-all duration-200 shadow-2xs hover:shadow-sm flex flex-col justify-between p-2 sm:p-2.5 overflow-hidden">
            {/* Top row: Name & Tag & Remove button */}
            <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                    {metric.type === 'industry' ? (
                        <span title="Ngành hàng" className="inline-flex shrink-0">
                            <Layers className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                        </span>
                    ) : (
                        <span title="Nhóm hàng" className="inline-flex shrink-0">
                            <Package className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </span>
                    )}
                    <span
                        className="text-[11.5px] sm:text-[12px] font-black uppercase text-slate-800 dark:text-slate-100 truncate tracking-tight leading-none"
                        title={metric.parentName ? `${metric.displayTitle} (${metric.parentName})` : metric.displayTitle}
                    >
                        {metric.displayTitle}
                    </span>
                </div>

                <div className="flex items-center shrink-0">
                    <span className={`text-[11px] font-bold px-1 py-0.2 rounded-xs leading-none uppercase ${
                        metric.type === 'industry'
                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                    }`}>
                        {metric.type === 'industry' ? 'Ngành' : 'Nhóm'}
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
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 ml-1 p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity"
                            title="Xóa thẻ này"
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Metric: Doanh thu */}
            <div className="flex items-baseline justify-between gap-1 mb-1">
                <div className="flex items-baseline gap-1 min-w-0">
                    <span className="text-[17px] sm:text-[19px] lg:text-[20px] font-black text-sky-700 dark:text-sky-400 tracking-tight tabular-nums leading-none">
                        {roundUp(metric.dtQd).toLocaleString('vi-VN')}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none">
                        {isRealtime ? 'DTQĐ' : 'QĐ'}
                    </span>
                </div>

                {/* Số lượng bán (SL) */}
                <div className="flex items-baseline gap-0.5 shrink-0 text-right">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">SL:</span>
                    <span className="text-[11px] sm:text-[11.5px] font-black text-slate-800 dark:text-slate-200 tabular-nums">
                        {roundUp(metric.sl).toLocaleString('vi-VN')}
                    </span>
                </div>
            </div>

            {/* Sub Metrics: Tăng trưởng / %HT & Trả góp */}
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] sm:text-[10.5px] gap-1">
                {/* Growth or %HT */}
                <div className="flex items-center gap-0.5 min-w-0 shrink-0">
                    {metric.growth !== 0 ? (
                        <span className={`inline-flex items-center gap-0.5 font-bold tabular-nums ${
                            isGrowthPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                        }`}>
                            {isGrowthPositive ? (
                                <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                            ) : (
                                <TrendingDown className="w-2.5 h-2.5 shrink-0" />
                            )}
                            {isGrowthPositive ? `+${metric.growth}%` : `${metric.growth}%`}
                        </span>
                    ) : metric.ptHt > 0 ? (
                        <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                            {metric.ptHt}% HT
                        </span>
                    ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-medium">-</span>
                    )}
                </div>

                {/* Trả góp */}
                <div className="flex items-baseline gap-0.5 shrink-0 text-right" title={`Trả góp: ${roundUp(metric.dtTraGop).toLocaleString('vi-VN')} tr (${metric.ptTraGop}%)`}>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">TG:</span>
                    <span className={`font-bold tabular-nums ${
                        metric.ptTraGop > 0
                            ? (isTgGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')
                            : 'text-slate-500 dark:text-slate-400'
                    }`}>
                        {metric.ptTraGop > 0 ? `${metric.ptTraGop}%` : '-'}
                    </span>
                </div>
            </div>
        </div>
    );
};
