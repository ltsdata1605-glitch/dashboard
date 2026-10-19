import React from 'react';
import { useSystemTraffic } from '../../hooks/useSystemTraffic';
import { AppIcon } from '../shared/ui/icon';

interface AppFooterProps {
    className?: string;
}

/**
 * Chân trang Apple HIG cho toàn app:
 * - Chứa thông tin số người đang online (chấm xanh pulse) và tổng lượt truy cập.
 * - Thiết kế dạng con nhộng (Capsule pill) mờ, bo tròn, tinh tế và hiện đại.
 * - Được chuyển từ thanh subtitle trên cùng xuống cuối trang theo chuẩn UX của Apple.
 */
export const AppFooter: React.FC<AppFooterProps> = React.memo(({ className }) => {
    const { totalVisits, onlineUsers } = useSystemTraffic();

    return (
        <footer className={`w-full mt-auto pt-3 sm:pt-4 pb-2 sm:pb-3 px-4 flex flex-col items-center justify-center gap-1.5 select-none hide-on-export ${className || ''}`}>
            {/* Apple-style Capsule Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 backdrop-blur-md shadow-2xs text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
                {/* Online status */}
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span>{onlineUsers} người đang online</span>
                </span>

                {/* Hairline Separator */}
                <span className="h-3 w-px bg-slate-300 dark:bg-slate-600 shrink-0" />

                {/* Total Visits */}
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 shrink-0">
                    <AppIcon name="users" size="xs" className="text-sky-500" />
                    <span>
                        <strong className="font-semibold text-slate-700 dark:text-slate-300">
                            {totalVisits >= 1000 ? `${(totalVisits / 1000).toFixed(1)}k` : (totalVisits > 0 ? totalVisits.toLocaleString() : '0')}
                        </strong> lượt truy cập
                    </span>
                </span>
            </div>

            {/* Subtle Brand Tagline */}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 tracking-tight leading-none">
                Dashboard YCX - Được phát triển dựa trên nhu cầu công việc
            </p>
        </footer>
    );
});

AppFooter.displayName = 'AppFooter';
export default AppFooter;
