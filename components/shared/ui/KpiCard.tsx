import React from 'react';
import { Icon } from '../../common/Icon';

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

    /** Generate Tailwind class map from a single color name */
    const makeStyle = (c: string) => ({
        gradient: `from-${c}-500 via-${c}-400 to-${c}-300`,
        iconBg: `bg-gradient-to-br from-${c}-50 to-${c}-100 dark:from-${c}-500/15 dark:to-${c}-500/10`,
        iconText: `text-${c}-600 dark:text-${c}-400`,
        progressBg: `bg-${c}-100 dark:bg-${c}-500/10`,
        progressFill: `bg-gradient-to-r from-${c}-500 to-${c}-300`,
        glowColor: `shadow-${c}-200/50 dark:shadow-${c}-500/20`,
        borderHover: `hover:border-${c}-300 dark:hover:border-${c}-600`,
    });

    const colorMap: Record<string, ReturnType<typeof makeStyle>> = {
        blue: makeStyle('sky'),
        teal: makeStyle('emerald'),
        emerald: makeStyle('emerald'),
        pink: makeStyle('rose'),
        red: makeStyle('rose'),
        rose: makeStyle('rose'),
        purple: makeStyle('slate'),
        orange: makeStyle('amber'),
        amber: makeStyle('amber'),
        sky: makeStyle('sky'),
        slate: makeStyle('slate'),
        indigo: makeStyle('indigo'),
    };

    const style = colorMap[iconColor] || colorMap['blue'];
    const clampedProgress = progressPercent !== undefined ? Math.min(Math.max(progressPercent, 0), 100) : undefined;

    return (
        <div
            onClick={onClick}
            className={`relative flex flex-col justify-between h-full bg-white dark:bg-slate-900 rounded-xl lg:rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.06] transition-all duration-300 group touch-feedback ${style.borderHover} ${isClickable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]' : 'hover:shadow-lg'} premium-card-shadow`}
        >
            {/* Gradient accent strip */}
            <div className={`h-[3px] lg:h-[3px] w-full bg-gradient-to-r rounded-t-xl lg:rounded-t-2xl ${style.gradient}`} />

            <div className="px-2.5 py-1.5 lg:px-4 lg:py-3.5 flex flex-col flex-1">
                {/* Mobile: Icon + Title + Value in one row */}
                <div className="flex items-center gap-1.5 lg:gap-2 mb-1 lg:mb-3">
                    <div className={`w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center ${style.iconBg} ${style.iconText} shadow-sm ${style.glowColor} shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${isGood && clampedProgress !== undefined && clampedProgress >= 100 ? 'animate-pulse-glow-green' : ''}`}>
                        <Icon name={icon} size={4} className="lg:hidden" />
                        <Icon name={icon} size={4.5} className="hidden lg:block" />
                    </div>
                    <h3 className="text-[9px] lg:text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 leading-tight line-clamp-1 lg:line-clamp-2 flex-1 min-w-0">{title}</h3>
                    {/* Mobile inline value */}
                    <div className="lg:hidden shrink-0">
                        {children}
                    </div>
                </div>

                {/* Desktop: Value on separate line */}
                <div className="mt-auto">
                    <div className="hidden lg:flex flex-col">
                        {children}
                    </div>

                    {/* Progress bar — always uses the card's own gradient color */}
                    {clampedProgress !== undefined && (
                        <div className="mt-1.5 lg:mt-2">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[8px] lg:text-[10px] font-semibold text-slate-400 dark:text-slate-500">Tiến độ</span>
                                <span className={`text-[9px] lg:text-[11px] font-bold ${style.iconText}`}>
                                    {Math.round(clampedProgress)}%
                                </span>
                            </div>
                            <div className={`w-full h-1.5 lg:h-2 rounded-full ${style.progressBg} overflow-hidden`}>
                                <div
                                    className={`h-full rounded-full ${style.progressFill} transition-all duration-700 ease-out progress-shimmer`}
                                    style={{ width: `${clampedProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Trend / Target footer */}
                    {(trendLabel || trendValue) && (
                        <div className="flex items-center justify-between gap-1 lg:gap-1.5 mt-1.5 lg:mt-2 pt-1.5 lg:pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                            <span className="text-[8px] lg:text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider truncate">{trendLabel}</span>
                            <div className="text-[9px] lg:text-[11px] font-bold text-slate-600 dark:text-slate-400 text-right shrink-0">
                                {trendValue}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KpiCard;
