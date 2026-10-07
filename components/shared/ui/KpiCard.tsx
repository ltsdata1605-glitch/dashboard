import React from 'react';
import { AppIcon } from './icon/AppIcon';
import type { IconName } from './icon/iconRegistry';
import { resolveIconName } from './icon/legacyIconNames';

interface KpiColorStyle {
    iconText: string;
    iconBg: string;
    progressBg: string;
    progressFill: string;
    progressGradient: string;
    borderHover: string;
    borderHex: string;
    topHex: string;
    topAccent: string;
}

// Bảng màu tĩnh với dải gradient hiện đại, nền squircle và viền tương tác
const COLOR_STYLES: Record<string, KpiColorStyle> = {
    sky: {
        iconText: 'text-sky-600 dark:text-sky-400',
        iconBg: 'bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/40',
        progressBg: 'bg-sky-100 dark:bg-sky-950/60',
        progressFill: 'bg-sky-500',
        progressGradient: 'bg-gradient-to-r from-sky-400 to-blue-600',
        borderHover: 'hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-sky-500/10',
        borderHex: '#7dd3fc',
        topHex: '#0284c7',
        topAccent: 'bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600',
    },
    emerald: {
        iconText: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/40',
        progressBg: 'bg-emerald-100 dark:bg-emerald-950/60',
        progressFill: 'bg-emerald-500',
        progressGradient: 'bg-gradient-to-r from-emerald-400 to-teal-600',
        borderHover: 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-emerald-500/10',
        borderHex: '#86efac',
        topHex: '#059669',
        topAccent: 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600',
    },
    amber: {
        iconText: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/40',
        progressBg: 'bg-amber-100 dark:bg-amber-950/60',
        progressFill: 'bg-amber-500',
        progressGradient: 'bg-gradient-to-r from-amber-400 to-orange-600',
        borderHover: 'hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-amber-500/10',
        borderHex: '#fcd34d',
        topHex: '#d97706',
        topAccent: 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-600',
    },
    rose: {
        iconText: 'text-rose-600 dark:text-rose-400',
        iconBg: 'bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/40',
        progressBg: 'bg-rose-100 dark:bg-rose-950/60',
        progressFill: 'bg-rose-500',
        progressGradient: 'bg-gradient-to-r from-rose-400 to-pink-600',
        borderHover: 'hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-rose-500/10',
        borderHex: '#fda4af',
        topHex: '#e11d48',
        topAccent: 'bg-gradient-to-r from-rose-400 via-rose-500 to-pink-600',
    },
    indigo: {
        iconText: 'text-indigo-600 dark:text-indigo-400',
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40',
        progressBg: 'bg-indigo-100 dark:bg-indigo-950/60',
        progressFill: 'bg-indigo-500',
        progressGradient: 'bg-gradient-to-r from-indigo-400 to-violet-600',
        borderHover: 'hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-indigo-500/10',
        borderHex: '#a5b4fc',
        topHex: '#4f46e5',
        topAccent: 'bg-gradient-to-r from-indigo-400 via-indigo-500 to-violet-600',
    },
    slate: {
        iconText: 'text-slate-600 dark:text-slate-400',
        iconBg: 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
        progressBg: 'bg-slate-100 dark:bg-slate-800',
        progressFill: 'bg-slate-500',
        progressGradient: 'bg-gradient-to-r from-slate-400 to-slate-600',
        borderHover: 'hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-slate-500/10',
        borderHex: '#cbd5e1',
        topHex: '#475569',
        topAccent: 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600',
    },
};

// Aliases cho tên màu cũ
COLOR_STYLES.blue = COLOR_STYLES.sky;
COLOR_STYLES.teal = COLOR_STYLES.emerald;
COLOR_STYLES.pink = COLOR_STYLES.rose;
COLOR_STYLES.red = COLOR_STYLES.rose;
COLOR_STYLES.purple = COLOR_STYLES.indigo;
COLOR_STYLES.orange = COLOR_STYLES.amber;
COLOR_STYLES.cyan = COLOR_STYLES.sky;

export interface KpiCardProps {
    /** Tên chức năng (iconRegistry); tên kiểu cũ (vd constants.ts) vẫn nhận qua lớp chuyển tiếp. */
    icon: IconName | string;
    iconColor: string;
    title: string;
    onClick?: (e: React.MouseEvent) => void;
    children: React.ReactNode;
    trendLabel?: string;
    trendValue?: string | React.ReactNode;
    /** 0-100, hiển thị thanh tiến độ khi có giá trị */
    progressPercent?: number;
    isGood?: boolean;
    badge?: React.ReactNode;
}

/**
 * KPI Card chuẩn "Executive Modern" — squircle icon, gradient top accent,
 * thanh tiến độ dạng viên nang (pill) bo tròn, thẻ bo góc mềm mại rounded-2xl,
 * micro status indicator thông minh và hiệu ứng hover mượt mà.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
    icon,
    iconColor,
    title,
    onClick,
    children,
    trendLabel,
    trendValue,
    progressPercent,
    isGood = true,
    badge,
}) => {
    const isClickable = !!onClick;
    const style = COLOR_STYLES[iconColor] || COLOR_STYLES['sky'];
    const clampedProgress = progressPercent !== undefined ? Math.min(Math.max(progressPercent, 0), 100) : undefined;

    return (
        <div
            onClick={onClick}
            title={isClickable ? 'Bấm để chuyển tới Cập nhật > Target Doanh thu' : undefined}
            data-kpi-border={style.borderHex}
            data-kpi-top-border={style.topHex}
            data-kpi-top-color={iconColor}
            className={`kpi-overview-card preserve-rounded relative flex flex-col justify-between h-full rounded-card border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xs transition-all duration-300 group overflow-hidden shadow-xs hover:shadow-lg ${style.borderHover} ${
                isClickable ? 'cursor-pointer hover:-translate-y-1 active:scale-[0.98]' : 'hover:-translate-y-0.5'
            } premium-card-shadow`}
        >
            {/* Vạch nhận diện đỉnh thẻ — dải gradient mềm mại bo theo góc bo thẻ */}
            <div className={`kpi-top-accent h-[3.5px] w-full shrink-0 ${style.topAccent}`} />

            {/* Layout cho desktop (lg trở lên) — Thiết kế gọn gàng, tinh tế, số to rõ */}
            <div className="hidden lg:flex flex-col justify-between flex-1 px-3.5 py-2.5">
                {/* Hàng 1: Icon squircle + Title + Micro Status Dot */}
                <div className="@container flex items-center justify-between gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 shadow-2xs ${style.iconBg} ${style.iconText}`}>
                            <AppIcon name={resolveIconName(icon) ?? 'help'} size="sm" />
                        </div>
                        <h3 className="kpi-overview-title text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate min-w-0" title={title}>
                            {title}
                        </h3>
                    </div>
                    {badge ? badge : (
                        <div className="flex items-center shrink-0">
                            {!isGood ? (
                                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-2xs" title="Chưa đạt mục tiêu" />
                            ) : (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs" title="Đạt mục tiêu" />
                            )}
                        </div>
                    )}
                </div>

                {/* Hàng 2: Giá trị chính (Value) — To rõ, nổi bật, sắc nét, canh giữa */}
                <div className="kpi-overview-value my-1.5 min-w-0 w-full flex items-center justify-center">
                    {children}
                </div>

                {/* Hàng 3: Mục tiêu / Tăng trưởng (Không còn thanh bar, cực kỳ gọn gàng) */}
                {(trendLabel || trendValue) && (
                    <div className="kpi-overview-footer mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-1 text-[11px] leading-none">
                        <span className="text-slate-400 dark:text-slate-500 font-semibold tracking-wide truncate">{trendLabel}</span>
                        <div className="font-bold text-right shrink-0">
                            {trendValue}
                        </div>
                    </div>
                )}
            </div>

            {/* Layout đứng (vertical) cực gọn cho mobile (dưới lg) */}
            <div className="lg:hidden flex flex-col items-center justify-between flex-1 px-2 py-2 text-center h-full gap-1">
                {/* Hàng 1: Icon squircle + Status dot */}
                <div className="flex items-center justify-between w-full">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${style.iconBg} ${style.iconText}`}>
                        <AppIcon name={resolveIconName(icon) ?? 'help'} size="sm" />
                    </div>
                    {!isGood ? (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Chưa đạt" />
                    ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Đạt" />
                    )}
                </div>
                
                {/* Hàng 2: Title */}
                <div className="flex items-center justify-center w-full min-w-0">
                    <h3 className="text-[11px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 leading-tight truncate" title={title}>
                        {title}
                    </h3>
                </div>
                
                {/* Hàng 3: Value */}
                <div className="my-0.5 min-w-0 w-full overflow-hidden shrink-0 flex justify-center">
                    {children}
                </div>
                
                {/* Hàng 4: Label / Giá trị phụ */}
                {trendValue ? (
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight mt-0.5 w-full flex flex-col items-center justify-center">
                        {trendValue}
                    </div>
                ) : trendLabel ? (
                    <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-tight mt-0.5 w-full flex items-center justify-center">
                        {trendLabel}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default KpiCard;
