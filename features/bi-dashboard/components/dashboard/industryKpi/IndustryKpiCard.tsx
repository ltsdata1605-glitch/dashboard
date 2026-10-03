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

// Dải xoay vòng "5 họ semantic × 2 tầng sắc độ" (CLAUDE.md mục 2 — màu ramp). Bản cũ 12 màu dùng cả
// violet/teal/orange/cyan/lime/fuchsia/blue/indigo ngoài bảng đã duyệt → lint:ratchet đỏ (2026-09-28).
// Giữ 3 màu đầu (sky, amber, emerald) như cũ để các thẻ quen thuộc không đổi. Không thêm `dark:` (đã tắt).
export const PASTEL_THEMES: PastelTheme[] = [
    {
        cardBg: 'bg-sky-50/70',
        cardBorder: 'border-sky-200/90 hover:border-sky-400',
        titleColor: 'text-sky-950',
        primaryColor: 'text-sky-700',
        secondaryColor: 'text-sky-700/80',
        labelColor: 'text-sky-600/70',
    },
    {
        cardBg: 'bg-amber-50/70',
        cardBorder: 'border-amber-200/90 hover:border-amber-400',
        titleColor: 'text-amber-950',
        primaryColor: 'text-amber-700',
        secondaryColor: 'text-amber-700/80',
        labelColor: 'text-amber-600/70',
    },
    {
        cardBg: 'bg-emerald-50/70',
        cardBorder: 'border-emerald-200/90 hover:border-emerald-400',
        titleColor: 'text-emerald-950',
        primaryColor: 'text-emerald-700',
        secondaryColor: 'text-emerald-700/80',
        labelColor: 'text-emerald-600/70',
    },
    {
        cardBg: 'bg-rose-50/70',
        cardBorder: 'border-rose-200/90 hover:border-rose-400',
        titleColor: 'text-rose-950',
        primaryColor: 'text-rose-700',
        secondaryColor: 'text-rose-700/80',
        labelColor: 'text-rose-600/70',
    },
    {
        cardBg: 'bg-slate-50/70',
        cardBorder: 'border-slate-200/90 hover:border-slate-400',
        titleColor: 'text-slate-950',
        primaryColor: 'text-slate-700',
        secondaryColor: 'text-slate-700/80',
        labelColor: 'text-slate-600/70',
    },
    {
        cardBg: 'bg-sky-100/80',
        cardBorder: 'border-sky-300 hover:border-sky-500',
        titleColor: 'text-sky-950',
        primaryColor: 'text-sky-800',
        secondaryColor: 'text-sky-800/80',
        labelColor: 'text-sky-700/70',
    },
    {
        cardBg: 'bg-amber-100/80',
        cardBorder: 'border-amber-300 hover:border-amber-500',
        titleColor: 'text-amber-950',
        primaryColor: 'text-amber-800',
        secondaryColor: 'text-amber-800/80',
        labelColor: 'text-amber-700/70',
    },
    {
        cardBg: 'bg-emerald-100/80',
        cardBorder: 'border-emerald-300 hover:border-emerald-500',
        titleColor: 'text-emerald-950',
        primaryColor: 'text-emerald-800',
        secondaryColor: 'text-emerald-800/80',
        labelColor: 'text-emerald-700/70',
    },
    {
        cardBg: 'bg-rose-100/80',
        cardBorder: 'border-rose-300 hover:border-rose-500',
        titleColor: 'text-rose-950',
        primaryColor: 'text-rose-800',
        secondaryColor: 'text-rose-800/80',
        labelColor: 'text-rose-700/70',
    },
    {
        cardBg: 'bg-slate-100/80',
        cardBorder: 'border-slate-300 hover:border-slate-500',
        titleColor: 'text-slate-950',
        primaryColor: 'text-slate-800',
        secondaryColor: 'text-slate-800/80',
        labelColor: 'text-slate-700/70',
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
            className={`industry-kpi-card min-w-0 group relative ${theme.cardBg} border ${
                isDragOver
                    ? 'ring-2 ring-sky-500 border-sky-400 scale-[1.02] shadow-md z-10'
                    : theme.cardBorder
            } ${
                isDragging ? 'opacity-40 scale-95 shadow-none' : 'shadow-2xs hover:shadow-xs'
            } rounded-lg transition-all duration-150 flex flex-col justify-between p-2 sm:p-2.5 overflow-hidden cursor-grab active:cursor-grabbing select-none`}
            title={metric.parentName ? `${metric.displayTitle} (${metric.parentName}) — Kéo thả để sắp xếp` : `${metric.displayTitle} — Kéo thả để sắp xếp`}
        >
            {/* Hàng trên: Chỉ hiển thị TÊN (metric.displayTitle) không in đậm và nút X khi hover */}
            <div className="flex items-center justify-between gap-1 mb-0.5">
                <span
                    className={`industry-kpi-title text-[10px] sm:text-[11px] font-semibold uppercase truncate tracking-tight leading-tight flex-1 min-w-0 ${theme.titleColor}`}
                >
                    {metric.displayTitle}
                </span>

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
                        className="lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 p-0.5 relative after:absolute after:-inset-3 after:content-[''] lg:after:hidden text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity shrink-0 cursor-pointer hide-on-export no-print"
                        title="Xóa thẻ này"
                    >
                        <X className="w-2.5 h-2.5" />
                    </Button>
                )}
            </div>

            {/* Hàng dưới: Hiển thị DTQĐ và Số lượng — tiêu chí nào được chọn thì số đó LỚN HƠN, màu chữ tương ứng với màu pastel nhưng đậm hơn */}
            <div className="flex items-baseline justify-between gap-0.5 mt-0.5">
                {isRevenueFocus ? (
                    <>
                        {/* Doanh thu LỚN HƠN */}
                        <div className="flex items-baseline gap-0.5 min-w-0">
                            <span className={`industry-kpi-num text-[14px] sm:text-[15px] lg:text-[16px] font-bold tracking-tight tabular-nums leading-none ${theme.primaryColor}`}>
                                {roundUp(metric.dtQd).toLocaleString('vi-VN')}
                            </span>
                            <span className={`industry-kpi-label text-[9px] sm:text-[9.5px] font-medium uppercase leading-none ${theme.labelColor}`}>
                                {isRealtime ? 'DTQĐ' : 'QĐ'}
                            </span>
                        </div>

                        {/* Số lượng NHỎ HƠN */}
                        <div className="flex items-baseline gap-0.5 shrink-0 text-right">
                            <span className={`industry-kpi-sublabel text-[9px] sm:text-[9.5px] font-medium ${theme.labelColor}`}>SL:</span>
                            <span className={`industry-kpi-subnum text-[9.5px] sm:text-[10px] font-medium tabular-nums ${theme.secondaryColor}`}>
                                {roundUp(metric.sl).toLocaleString('vi-VN')}
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Số lượng LỚN HƠN */}
                        <div className="flex items-baseline gap-0.5 min-w-0">
                            <span className={`industry-kpi-num text-[14px] sm:text-[15px] lg:text-[16px] font-bold tracking-tight tabular-nums leading-none ${theme.primaryColor}`}>
                                {roundUp(metric.sl).toLocaleString('vi-VN')}
                            </span>
                            <span className={`industry-kpi-label text-[9px] sm:text-[9.5px] font-medium uppercase leading-none ${theme.labelColor}`}>
                                SL
                            </span>
                        </div>

                        {/* Doanh thu NHỎ HƠN */}
                        <div className="flex items-baseline gap-0.5 shrink-0 text-right">
                            <span className={`industry-kpi-sublabel text-[9px] sm:text-[9.5px] font-medium ${theme.labelColor}`}>
                                {isRealtime ? 'DTQĐ:' : 'QĐ:'}
                            </span>
                            <span className={`industry-kpi-subnum text-[9.5px] sm:text-[10px] font-medium tabular-nums ${theme.secondaryColor}`}>
                                {roundUp(metric.dtQd).toLocaleString('vi-VN')}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
