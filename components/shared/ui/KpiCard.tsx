import React from 'react';
import { Icon } from '../../common/Icon';

interface KpiColorStyle {
    gradient: string;
    iconBg: string;
    iconText: string;
    progressBg: string;
    progressFill: string;
    glowColor: string;
    borderHover: string;
}

// Bảng màu TĨNH (literal, không dựng qua template string) — Tailwind chỉ sinh CSS cho class
// xuất hiện y hệt dạng chuỗi tĩnh trong source. Trước đây makeStyle(c) dựng class kiểu
// `from-${c}-500 via-${c}-400 to-${c}-300` khiến Tailwind không quét được nếu chuỗi ghép đó
// không tồn tại y hệt ở nơi khác trong code — gây mất hẳn dải gradient/màu cho 1 số thẻ (vd.
// slate — thẻ HQQĐ) dù code logic không có lỗi. Định nghĩa tĩnh từng màu để đảm bảo luôn được
// sinh CSS, bất kể nơi khác trong code có dùng chuỗi đó hay không.
const COLOR_STYLES: Record<string, KpiColorStyle> = {
    sky: {
        gradient: 'from-sky-500 via-sky-400 to-sky-300',
        iconBg: 'bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-500/15 dark:to-sky-500/10',
        iconText: 'text-sky-600 dark:text-sky-400',
        progressBg: 'bg-sky-100 dark:bg-sky-500/10',
        progressFill: 'bg-gradient-to-r from-sky-500 to-sky-300',
        glowColor: 'shadow-sky-200/50 dark:shadow-sky-500/20',
        borderHover: 'hover:border-sky-300 dark:hover:border-sky-600',
    },
    slate: {
        gradient: 'from-slate-500 via-slate-400 to-slate-300',
        iconBg: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-500/15 dark:to-slate-500/10',
        iconText: 'text-slate-600 dark:text-slate-400',
        progressBg: 'bg-slate-100 dark:bg-slate-500/10',
        progressFill: 'bg-gradient-to-r from-slate-500 to-slate-300',
        glowColor: 'shadow-slate-200/50 dark:shadow-slate-500/20',
        borderHover: 'hover:border-slate-300 dark:hover:border-slate-600',
    },
    emerald: {
        gradient: 'from-emerald-500 via-emerald-400 to-emerald-300',
        iconBg: 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/15 dark:to-emerald-500/10',
        iconText: 'text-emerald-600 dark:text-emerald-400',
        progressBg: 'bg-emerald-100 dark:bg-emerald-500/10',
        progressFill: 'bg-gradient-to-r from-emerald-500 to-emerald-300',
        glowColor: 'shadow-emerald-200/50 dark:shadow-emerald-500/20',
        borderHover: 'hover:border-emerald-300 dark:hover:border-emerald-600',
    },
    amber: {
        gradient: 'from-amber-500 via-amber-400 to-amber-300',
        iconBg: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-500/15 dark:to-amber-500/10',
        iconText: 'text-amber-600 dark:text-amber-400',
        progressBg: 'bg-amber-100 dark:bg-amber-500/10',
        progressFill: 'bg-gradient-to-r from-amber-500 to-amber-300',
        glowColor: 'shadow-amber-200/50 dark:shadow-amber-500/20',
        borderHover: 'hover:border-amber-300 dark:hover:border-amber-600',
    },
    rose: {
        gradient: 'from-rose-500 via-rose-400 to-rose-300',
        iconBg: 'bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-500/15 dark:to-rose-500/10',
        iconText: 'text-rose-600 dark:text-rose-400',
        progressBg: 'bg-rose-100 dark:bg-rose-500/10',
        progressFill: 'bg-gradient-to-r from-rose-500 to-rose-300',
        glowColor: 'shadow-rose-200/50 dark:shadow-rose-500/20',
        borderHover: 'hover:border-rose-300 dark:hover:border-rose-600',
    },
    // Màu thứ 6 được CLAUDE.md xác nhận hợp lệ ngoài 5 màu semantic chính (dùng cho
    // ramp/phân biệt) — dùng cho thẻ HQQĐ vì cả 5 màu chính đã bị 4 thẻ KPI khác dùng hết,
    // cần 1 màu tươi/nổi bật hơn "slate" (trước đây HQQĐ dùng alias purple→slate, nhìn xám xịt).
    // Cố ý đậm hơn 1 bậc so với 5 màu chuẩn (700/600/500 thay vì 500/400/300) — bản đầu
    // dùng cùng tông với các thẻ khác (500/400/300) khiến indigo đọc gần giống sky (đều
    // là "màu xanh" khi nhìn nhanh). Tông đậm này ngả tím rõ, tách biệt hẳn khỏi sky.
    indigo: {
        gradient: 'from-indigo-700 via-indigo-600 to-indigo-500',
        iconBg: 'bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-500/20 dark:to-indigo-500/15',
        iconText: 'text-indigo-700 dark:text-indigo-400',
        progressBg: 'bg-indigo-100 dark:bg-indigo-500/10',
        progressFill: 'bg-gradient-to-r from-indigo-700 to-indigo-500',
        glowColor: 'shadow-indigo-300/50 dark:shadow-indigo-500/20',
        borderHover: 'hover:border-indigo-400 dark:hover:border-indigo-600',
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
}

/**
 * KPI Card "premium" — icon chip glow, dải gradient accent, progress bar, trend/target footer.
 * Component trình bày thuần (chỉ nhận props, không phụ thuộc hook/context) nên dùng được ở
 * cả 4 khu vực (Root + features/*). Khác với `StatCard` (đơn giản hơn, không progress/gradient):
 * dùng KpiCard khi cần thể hiện tiến độ so với mục tiêu.
 */
export const KpiCard: React.FC<KpiCardProps> = ({ icon, iconColor, title, onClick, children, trendLabel, trendValue, progressPercent, isGood = true }) => {
    const isClickable = !!onClick;
    const style = COLOR_STYLES[iconColor] || COLOR_STYLES['sky'];
    const clampedProgress = progressPercent !== undefined ? Math.min(Math.max(progressPercent, 0), 100) : undefined;

    return (
        <div
            onClick={onClick}
            className={`relative flex flex-col justify-between h-full bg-white dark:bg-slate-900 rounded-xl lg:rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.06] transition-all duration-300 group touch-feedback ${style.borderHover} ${isClickable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]' : 'hover:shadow-lg'} premium-card-shadow`}
        >
            {/* Gradient accent strip */}
            <div className={`h-[3px] lg:h-[3px] w-full bg-gradient-to-r rounded-t-xl lg:rounded-t-2xl ${style.gradient}`} />

            {/* Layout cho desktop (lg trở lên) */}
            <div className="hidden lg:flex flex-col justify-between flex-1 px-3 py-2">
                {/* Hàng 1: Icon + Title bên trái, Giá trị (Value) bên phải */}
                <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${style.iconBg} ${style.iconText} shadow-sm ${style.glowColor} shrink-0 transition-all duration-300 group-hover:scale-110 ${isGood && clampedProgress !== undefined && clampedProgress >= 100 ? 'animate-pulse-glow-green' : ''}`}>
                            <Icon name={icon} size={3} />
                        </div>
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{title}</h3>
                    </div>
                    <div className="text-right shrink-0">
                        {children}
                    </div>
                </div>

                {/* Hàng 2: Thanh tiến độ + Mục tiêu / Tăng trưởng nếu có */}
                {(clampedProgress !== undefined || trendLabel || trendValue) && (
                    <div className="mt-1.5 pt-1 border-t border-slate-100 dark:border-white/[0.04] space-y-0.5">
                        {clampedProgress !== undefined && (
                            <div className="flex items-center gap-1.5">
                                <div className={`flex-1 h-1.5 rounded-full ${style.progressBg} overflow-hidden`}>
                                    <div
                                        className={`h-full rounded-full ${style.progressFill} transition-all duration-700 ease-out progress-shimmer`}
                                        style={{ width: `${clampedProgress}%` }}
                                    />
                                </div>
                                <span className={`text-[9.5px] font-bold ${style.iconText} shrink-0 tabular-nums`}>
                                    {Math.round(clampedProgress)}%
                                </span>
                            </div>
                        )}
                        {(trendLabel || trendValue) && (
                            <div className="flex items-center justify-between gap-1 text-[9px] leading-none">
                                <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider truncate">{trendLabel}</span>
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
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${style.iconBg} ${style.iconText} shadow-sm ${style.glowColor} shrink-0 mb-0.5`}>
                    <Icon name={icon} size={3} />
                </div>
                
                {/* Hàng 2: Title */}
                <h3 className="text-[8.5px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 leading-tight line-clamp-1 mb-0.5 w-full truncate">{title}</h3>
                
                {/* Hàng 3: Value */}
                <div className="my-0.5 min-w-0 w-full overflow-hidden shrink-0">
                    {children}
                </div>
                
                {/* Hàng 4: Label phụ */}
                {trendValue ? (
                    <div className="text-[8.5px] font-medium text-slate-400 dark:text-slate-500 leading-tight mt-0.5 w-full flex flex-col items-center justify-center">
                        {trendValue}
                    </div>
                ) : trendLabel ? (
                    <div className="text-[8.5px] font-medium text-slate-400 dark:text-slate-500 leading-tight mt-0.5 w-full flex items-center justify-center">
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
