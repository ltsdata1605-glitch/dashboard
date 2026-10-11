import React from 'react';
import { AppIcon } from '../../../../../components/shared/ui/icon/AppIcon';
import { IndustryKpiMetricData } from '../../../services/industryKpiCalc';
import { roundUp } from '../../../utils/dashboardHelpers';
import { Button } from '../../../../../components/shared/ui/Button';

export type IndustryKpiFocusMetric = 'revenue' | 'quantity';

export interface PastelTheme {
    topAccent: string;
    dotColor: string;
    valueColor: string;
    subBadgeBg: string;
    subBadgeText: string;
}

// Bảng 12 theme xoay vòng tinh tế tuân thủ nghiêm ngặt 5 họ semantic (sky, amber, emerald, rose, slate)
// Tuyệt đối không dùng màu ngoài bảng (nonSemanticColor = 0, indigoAlias = 0)
export const PASTEL_THEMES: PastelTheme[] = [
    {
        topAccent: 'bg-gradient-to-r from-sky-400 via-sky-500 to-sky-600',
        dotColor: 'bg-sky-500',
        valueColor: 'text-sky-700',
        subBadgeBg: 'bg-sky-50',
        subBadgeText: 'text-sky-700',
    },
    {
        topAccent: 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600',
        dotColor: 'bg-amber-500',
        valueColor: 'text-amber-700',
        subBadgeBg: 'bg-amber-50',
        subBadgeText: 'text-amber-700',
    },
    {
        topAccent: 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600',
        dotColor: 'bg-emerald-500',
        valueColor: 'text-emerald-700',
        subBadgeBg: 'bg-emerald-50',
        subBadgeText: 'text-emerald-700',
    },
    {
        topAccent: 'bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600',
        dotColor: 'bg-rose-500',
        valueColor: 'text-rose-700',
        subBadgeBg: 'bg-rose-50',
        subBadgeText: 'text-rose-700',
    },
    {
        topAccent: 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600',
        dotColor: 'bg-slate-500',
        valueColor: 'text-slate-700',
        subBadgeBg: 'bg-slate-100',
        subBadgeText: 'text-slate-700',
    },
    {
        topAccent: 'bg-gradient-to-r from-sky-500 via-sky-600 to-sky-700',
        dotColor: 'bg-sky-600',
        valueColor: 'text-sky-800',
        subBadgeBg: 'bg-sky-50',
        subBadgeText: 'text-sky-800',
    },
    {
        topAccent: 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700',
        dotColor: 'bg-amber-600',
        valueColor: 'text-amber-800',
        subBadgeBg: 'bg-amber-50',
        subBadgeText: 'text-amber-800',
    },
    {
        topAccent: 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700',
        dotColor: 'bg-emerald-600',
        valueColor: 'text-emerald-800',
        subBadgeBg: 'bg-emerald-50',
        subBadgeText: 'text-emerald-800',
    },
    {
        topAccent: 'bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700',
        dotColor: 'bg-rose-600',
        valueColor: 'text-rose-800',
        subBadgeBg: 'bg-rose-50',
        subBadgeText: 'text-rose-800',
    },
    {
        topAccent: 'bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700',
        dotColor: 'bg-slate-600',
        valueColor: 'text-slate-800',
        subBadgeBg: 'bg-slate-100',
        subBadgeText: 'text-slate-800',
    },
    {
        topAccent: 'bg-gradient-to-r from-sky-400 via-sky-500 to-sky-600',
        dotColor: 'bg-sky-500',
        valueColor: 'text-sky-700',
        subBadgeBg: 'bg-sky-50',
        subBadgeText: 'text-sky-700',
    },
    {
        topAccent: 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600',
        dotColor: 'bg-emerald-500',
        valueColor: 'text-emerald-700',
        subBadgeBg: 'bg-emerald-50',
        subBadgeText: 'text-emerald-700',
    },
];

interface IndustryKpiCardProps {
    metric: IndustryKpiMetricData;
    index?: number;
    isRealtime: boolean;
    focusMetric?: IndustryKpiFocusMetric;
    isDragging?: boolean;
    isDragOver?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragEnter?: (e: React.DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    onRemove?: (id: string) => void;
}

export const IndustryKpiCard: React.FC<IndustryKpiCardProps> = ({
    metric,
    index = 0,
    isRealtime,
    focusMetric = 'revenue',
    isDragging = false,
    isDragOver = false,
    onDragStart,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop,
    onDragEnd,
    onRemove,
}) => {
    const isRevenueFocus = focusMetric === 'revenue';
    const theme = PASTEL_THEMES[Math.abs(index) % PASTEL_THEMES.length];

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={`industry-kpi-card min-w-0 group relative bg-white dark:bg-slate-800/90 border ${
                isDragOver
                    ? 'ring-2 ring-sky-500 border-sky-400 scale-[1.02] shadow-md z-10'
                    : 'border-slate-200/90 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
            } ${
                isDragging ? 'opacity-40 scale-95 shadow-none' : 'shadow-2xs hover:shadow-md'
            } rounded-xl sm:rounded-2xl transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing select-none hover:-translate-y-0.5`}
            title={metric.parentName ? `${metric.displayTitle} (${metric.parentName}) — Kéo thả để sắp xếp` : `${metric.displayTitle} — Kéo thả để sắp xếp`}
        >
            {/* Top accent gradient bar */}
            <div className={`h-[2.5px] sm:h-[3.5px] w-full shrink-0 ${theme.topAccent}`} />

            <div className="p-1 sm:p-2.5 flex flex-col justify-between flex-1 min-h-[58px] sm:min-h-[76px]">
                {/* Header: Micro indicator dot + Tên ngành hàng + Nút X */}
                <div className="flex items-center justify-between gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 ${theme.dotColor} shadow-2xs`} />
                        <span
                            className="industry-kpi-title text-[8.5px] sm:text-[10.5px] font-extrabold uppercase tracking-tight text-slate-700 dark:text-slate-300 truncate leading-tight"
                            title={metric.displayTitle}
                        >
                            {metric.displayTitle}
                        </span>
                    </div>

                    {onRemove && (
                        <Button
                            type="button"
                            variant="unstyled"
                            size="none"
                            draggable={false}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(metric.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-600 transition-opacity shrink-0 cursor-pointer hide-on-export no-print"
                            title="Xóa thẻ này"
                        >
                            <AppIcon name="close" size="xs" />
                        </Button>
                    )}
                </div>

                {/* Hero Primary Metric - Canh giữa hoàn hảo, SỐ LỚN RÕ RÀNG */}
                <div className="w-full flex items-baseline justify-center py-0.5 sm:py-1 my-auto">
                    {isRevenueFocus ? (
                        <div className="flex items-baseline justify-center gap-0.5 sm:gap-1 min-w-0">
                            <span className="industry-kpi-num text-[17px] sm:text-[21px] font-black tracking-tight tabular-nums text-slate-800 dark:text-slate-100 leading-none">
                                {roundUp(metric.dtQd).toLocaleString('vi-VN')}
                            </span>
                            <span className="industry-kpi-label text-[8px] sm:text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 leading-none">
                                {isRealtime ? 'DTQĐ' : 'QĐ'}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-baseline justify-center gap-0.5 sm:gap-1 min-w-0">
                            <span className="industry-kpi-num text-[18px] sm:text-[23px] font-black tracking-tight tabular-nums text-slate-800 dark:text-slate-100 leading-none">
                                {roundUp(metric.sl).toLocaleString('vi-VN')}
                            </span>
                            <span className="industry-kpi-label text-[8.5px] sm:text-[10.5px] font-black uppercase tracking-tight text-slate-400 dark:text-slate-500 leading-none">
                                SL
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer Sub-Metric - 1 dòng ngang thu nhỏ gọn gàng */}
                <div className="flex items-center justify-between gap-0.5 pt-0.5 sm:pt-1 mt-auto border-t border-slate-100 dark:border-slate-800 leading-none">
                    <span className="industry-kpi-sublabel text-slate-400 dark:text-slate-500 font-medium truncate text-[8px] sm:text-[9.5px]">
                        {isRevenueFocus ? 'Số lượng' : (isRealtime ? 'DTQĐ' : 'QĐ')}
                    </span>
                    <span className={`industry-kpi-subnum inline-flex items-center px-1 py-0.5 rounded font-bold tabular-nums shrink-0 text-[8px] sm:text-[9.5px] ${theme.subBadgeBg} ${theme.subBadgeText}`}>
                        {isRevenueFocus
                            ? `${roundUp(metric.sl).toLocaleString('vi-VN')} SL`
                            : `${roundUp(metric.dtQd).toLocaleString('vi-VN')} Tr`}
                    </span>
                </div>
            </div>
        </div>
    );
};
