import React from 'react';
import { Icon } from '../../common/Icon';

interface KpiColorStyle {
    iconText: string;
    progressBg: string;
    progressFill: string;
    border: string;
    borderTop: string;
    borderHover: string;
    borderHex: string;
    topHex: string;
}

/* Chuẩn "Bảng điều khiển ca trực" (2026-09-11) đã gỡ 3 khoá khỏi kiểu này:
   `gradient` (dải chuyển màu trên đỉnh thẻ), `iconBg` (nền bo góc quanh biểu tượng) và
   `glowColor` (bóng phát sáng). Cả ba chỉ để trang trí, và ở màn hình dày số thì chúng
   tranh chỗ với chính con số. `progressFill` cũng đổi từ gradient sang MÀU ĐẶC. */

// Bảng màu TĨNH (literal, không dựng qua template string) — Tailwind chỉ sinh CSS cho class
// xuất hiện y hệt dạng chuỗi tĩnh trong source. Trước đây makeStyle(c) dựng class kiểu
// `from-${c}-500 via-${c}-400 to-${c}-300` khiến Tailwind không quét được nếu chuỗi ghép đó
// không tồn tại y hệt ở nơi khác trong code — gây mất hẳn dải gradient/màu cho 1 số thẻ (vd.
// slate — thẻ HQQĐ) dù code logic không có lỗi. Định nghĩa tĩnh từng màu để đảm bảo luôn được
// sinh CSS, bất kể nơi khác trong code có dùng chuỗi đó hay không.
const COLOR_STYLES: Record<string, KpiColorStyle> = {
    sky: {
        iconText: 'text-sky-700 dark:text-sky-400',
        progressBg: 'bg-sky-100 dark:bg-sky-500/10',
        progressFill: 'bg-sky-600',
        border: 'border-sky-300 dark:border-sky-800/80',
        borderTop: 'border-t-sky-600 dark:border-t-sky-500',
        borderHover: 'hover:border-sky-400 hover:border-t-sky-600 dark:hover:border-sky-600 dark:hover:border-t-sky-500',
        borderHex: '#7dd3fc',
        topHex: '#0284c7',
    },
    slate: {
        iconText: 'text-slate-600 dark:text-slate-400',
        progressBg: 'bg-slate-100 dark:bg-slate-500/10',
        progressFill: 'bg-slate-600',
        border: 'border-slate-300 dark:border-slate-700',
        borderTop: 'border-t-slate-600 dark:border-t-slate-400',
        borderHover: 'hover:border-slate-400 hover:border-t-slate-600 dark:hover:border-slate-500 dark:hover:border-t-slate-400',
        borderHex: '#cbd5e1',
        topHex: '#475569',
    },
    emerald: {
        iconText: 'text-emerald-700 dark:text-emerald-400',
        progressBg: 'bg-emerald-100 dark:bg-emerald-500/10',
        progressFill: 'bg-emerald-600',
        border: 'border-emerald-300 dark:border-emerald-800/80',
        borderTop: 'border-t-emerald-600 dark:border-t-emerald-500',
        borderHover: 'hover:border-emerald-400 hover:border-t-emerald-600 dark:hover:border-emerald-600 dark:hover:border-t-emerald-500',
        borderHex: '#86efac',
        topHex: '#059669',
    },
    amber: {
        iconText: 'text-amber-700 dark:text-amber-400',
        progressBg: 'bg-amber-100 dark:bg-amber-500/10',
        progressFill: 'bg-amber-600',
        border: 'border-amber-300 dark:border-amber-800/80',
        borderTop: 'border-t-amber-600 dark:border-t-amber-500',
        borderHover: 'hover:border-amber-400 hover:border-t-amber-600 dark:hover:border-amber-600 dark:hover:border-t-amber-500',
        borderHex: '#fcd34d',
        topHex: '#d97706',
    },
    rose: {
        iconText: 'text-rose-700 dark:text-rose-400',
        progressBg: 'bg-rose-100 dark:bg-rose-500/10',
        progressFill: 'bg-rose-600',
        border: 'border-rose-300 dark:border-rose-800/80',
        borderTop: 'border-t-rose-600 dark:border-t-rose-500',
        borderHover: 'hover:border-rose-400 hover:border-t-rose-600 dark:hover:border-rose-600 dark:hover:border-t-rose-500',
        borderHex: '#fda4af',
        topHex: '#e11d48',
    },
    indigo: {
        iconText: 'text-indigo-700 dark:text-indigo-400',
        progressBg: 'bg-indigo-100 dark:bg-indigo-500/10',
        progressFill: 'bg-indigo-600',
        border: 'border-indigo-300 dark:border-indigo-800/80',
        borderTop: 'border-t-indigo-600 dark:border-t-indigo-500',
        borderHover: 'hover:border-indigo-400 hover:border-t-indigo-600 dark:hover:border-indigo-600 dark:hover:border-t-indigo-500',
        borderHex: '#a5b4fc',
        topHex: '#4f46e5',
    },
};

// Alias tên màu cũ (dùng ở nhiều nơi gọi KpiCard) trỏ về đúng màu semantic tĩnh ở trên.
COLOR_STYLES.blue = COLOR_STYLES.sky;
COLOR_STYLES.teal = COLOR_STYLES.emerald;
COLOR_STYLES.pink = COLOR_STYLES.rose;
COLOR_STYLES.red = COLOR_STYLES.rose;
COLOR_STYLES.purple = COLOR_STYLES.slate;
COLOR_STYLES.orange = COLOR_STYLES.amber;

export interface KpiCardProps {
    icon: string;
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
 * KPI Card "premium" — icon chip glow, dải gradient accent, progress bar, trend/target footer.
 * Component trình bày thuần (chỉ nhận props, không phụ thuộc hook/context) nên dùng được ở
 * cả 4 khu vực (Root + features/*). Khác với `StatCard` (đơn giản hơn, không progress/gradient):
 * dùng KpiCard khi cần thể hiện tiến độ so với mục tiêu.
 */
export const KpiCard: React.FC<KpiCardProps> = ({ icon, iconColor, title, onClick, children, trendLabel, trendValue, progressPercent, isGood = true, badge }) => {
    const isClickable = !!onClick;
    const normalStyle = COLOR_STYLES[iconColor] || COLOR_STYLES['sky'];
    // Khi không đạt (isGood === false): chuyển style sang cảnh báo rose/đỏ
    const style = !isGood ? COLOR_STYLES['rose'] : normalStyle;
    const clampedProgress = progressPercent !== undefined ? Math.min(Math.max(progressPercent, 0), 100) : undefined;

    return (
        <div
            onClick={onClick}
            title={isClickable ? 'Bấm để chuyển tới Cập nhật > Target Doanh thu' : undefined}
            data-kpi-border={style.borderHex}
            data-kpi-top-border={style.topHex}
            data-kpi-top-color={!isGood ? 'rose' : iconColor}
            className={`relative flex flex-col justify-between h-full border border-t-0 transition-all duration-300 group touch-feedback ${
                !isGood
                    ? 'bg-rose-50/20 dark:bg-rose-950/15 border-rose-300 dark:border-rose-800/80 shadow-xs shadow-rose-500/5 hover:border-rose-400'
                    : `bg-white dark:bg-slate-900 ${style.border} border-t-0 ${style.borderHover}`
            } ${isClickable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]' : 'hover:shadow-lg'} premium-card-shadow`}
        >
            {/* Vạch nhận diện đỉnh thẻ — màu ĐẶC, tràn mép 100% qua cả viền trái & phải, không bị khuyết góc */}
            <div className={`kpi-top-accent h-[3.5px] -mx-[1px] w-[calc(100%+2px)] shrink-0 ${style.progressFill}`} />

            {/* Layout cho desktop (lg trở lên) */}
            <div className="hidden lg:flex flex-col justify-between flex-1 px-3.5 py-2">
                {/* Hàng 1: Icon + Title + Badge cảnh báo nếu chưa đạt */}
                <div className="flex items-center justify-between gap-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={`${style.iconText} shrink-0 transition-all duration-300 group-hover:scale-110 ${isGood && clampedProgress !== undefined && clampedProgress >= 100 ? 'animate-pulse-glow-green' : ''}`}>
                            <Icon name={icon} size={3} />
                        </div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate min-w-0" title={title}>{title}</h3>
                    </div>
                    {badge ? badge : (!isGood && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0 shadow-2xs">
                            Chưa đạt
                        </span>
                    ))}
                </div>

                {/* Hàng 2: Giá trị chính (Value) */}
                <div className="my-1.5 min-w-0">
                    {children}
                </div>

                {/* Hàng 3: Thanh tiến độ + Mục tiêu / Tăng trưởng nếu có */}
                {(clampedProgress !== undefined || trendLabel || trendValue) && (
                    <div className="mt-auto pt-1.5 border-t border-slate-100 dark:border-white/[0.04] space-y-1">
                        {clampedProgress !== undefined && (
                            <div className="flex items-center gap-1.5">
                                <div className={`flex-1 h-[3px] ${style.progressBg} overflow-hidden`}>
                                    <div
                                        className={`h-full ${style.progressFill}`}
                                        style={{ width: `${clampedProgress}%` }}
                                    />
                                </div>
                                <span className={`text-[11px] font-bold ${style.iconText} shrink-0 tabular-nums`}>
                                    {progressPercent !== undefined && !isNaN(progressPercent)
                                        ? Math.round(progressPercent)
                                        : Math.round(clampedProgress)}%
                                </span>
                            </div>
                        )}
                        {(trendLabel || trendValue) && (
                            <div className="flex items-center justify-between gap-1 text-[11px] leading-none">
                                <span className="text-slate-400 dark:text-slate-500 font-semibold tracking-wide truncate">{trendLabel}</span>
                                <div className="font-bold text-slate-600 dark:text-slate-400 text-right shrink-0">
                                    {trendValue}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Layout đứng (vertical) cực gọn cho mobile (dưới lg) */}
            <div className="lg:hidden flex flex-col items-center justify-between flex-1 px-1.5 py-1.5 text-center h-full">
                {/* Hàng 1: Icon */}
                <div className={`flex items-center justify-center ${style.iconText} shrink-0 mb-0.5`}>
                    <Icon name={icon} size={3} />
                </div>
                
                {/* Hàng 2: Title */}
                <div className="flex items-center justify-center gap-1 w-full mb-0.5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 leading-tight truncate">{title}</h3>
                    {!isGood && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">Chưa đạt</span>
                    )}
                </div>
                
                {/* Hàng 3: Value */}
                <div className="my-0.5 min-w-0 w-full overflow-hidden shrink-0">
                    {children}
                </div>
                
                {/* Hàng 4: Label phụ */}
                {trendValue ? (
                    <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-tight mt-0.5 w-full flex flex-col items-center justify-center">
                        {trendValue}
                    </div>
                ) : trendLabel ? (
                    <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-tight mt-0.5 w-full flex items-center justify-center">
                        {trendLabel}
                    </div>
                ) : (
                    <div className="h-2 shrink-0"></div>
                )}
            </div>
        </div>
    );
};

export default KpiCard;
