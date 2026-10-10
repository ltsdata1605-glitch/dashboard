import React, { useMemo, useState, useEffect } from 'react';
import { AppIcon } from '../../../../../components/shared/ui/icon/AppIcon';
import { ProgressBar } from '../../../../../components/shared/ui/ProgressBar';
import { getMonthProgress } from '../../../services/metricService';

interface TimeProgressBarProps {
    className?: string;
    isRealtime?: boolean;
    startTime?: string; // Mặc định '08:00' (8h00)
    endTime?: string;   // Mặc định '21:30' (9h30 tối)
    customDaysPassed?: number;
    customTotalDays?: number;
    customLabel?: string;
}

const TimeProgressBar: React.FC<TimeProgressBarProps> = ({
    className = '',
    isRealtime = false,
    startTime = '08:00',
    endTime = '21:30',
    customDaysPassed,
    customTotalDays,
    customLabel
}) => {
    // Tự động cập nhật thời gian thực mỗi phút khi ở chế độ Realtime
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        if (!isRealtime) return;
        const interval = setInterval(() => {
            setNow(new Date());
        }, 60000);
        return () => clearInterval(interval);
    }, [isRealtime]);

    const progressData = useMemo(() => {
        if (isRealtime) {
            // Đo lường quỹ thời gian trong 1 ngày: từ 8h00 đến 21h30 (9h30 tối)
            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);
            const startMinutes = (startH || 8) * 60 + (startM || 0);
            const endMinutes = (endH || 21) * 60 + (endM || 30);
            const totalMinutes = Math.max(1, endMinutes - startMinutes);

            const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
            let pct = 0;
            if (nowMinutes <= startMinutes) {
                pct = 0;
            } else if (nowMinutes >= endMinutes) {
                pct = 100;
            } else {
                pct = ((nowMinutes - startMinutes) / totalMinutes) * 100;
            }

            return {
                isRealtime: true,
                label: '8h00 - 21h30',
                percentage: Math.min(100, Math.max(0, pct))
            };
        } else {
            // Chế độ Luỹ kế: đo lường theo ngày trong tháng (hỗ trợ tháng đã qua và ngày mùng 1 đầu tháng)
            let dp: number;
            let dim: number;
            if (customDaysPassed !== undefined && customTotalDays !== undefined && customTotalDays > 0) {
                dp = customDaysPassed;
                dim = customTotalDays;
            } else {
                const mp = getMonthProgress(now);
                dp = mp.daysPassed;
                dim = mp.daysInMonth;
            }
            const pct = Math.min(100, Math.max(0, (dp / dim) * 100));
            return {
                isRealtime: false,
                customLabel,
                dp,
                dim,
                percentage: pct
            };
        }
    }, [isRealtime, startTime, endTime, now, customDaysPassed, customTotalDays, customLabel]);

    return (
        <div className={`w-full ${className}`}>
            <div className="flex items-center justify-between mb-1 sm:mb-1.5 gap-1 sm:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 rounded-md shrink-0 whitespace-nowrap">
                        <AppIcon name="clock" size="sm" className="text-sky-600" />
                        <span className="text-[11px] font-bold text-sky-900 dark:text-sky-200 uppercase tracking-wider whitespace-nowrap">
                            <span className="hidden sm:inline">Quỹ </span>thời gian
                        </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap shrink-0">
                        {progressData.isRealtime ? (
                            progressData.label
                        ) : progressData.customLabel ? (
                            progressData.customLabel
                        ) : (
                            <>
                                {progressData.dp}/{progressData.dim}
                                <span className="hidden sm:inline"> ngày</span>
                            </>
                        )}
                    </span>
                </div>
                <div className="flex items-baseline gap-0.5 shrink-0 whitespace-nowrap">
                    <span className="text-[11px] sm:text-[12px] font-black text-sky-700 dark:text-sky-400 tabular-nums">
                        {Math.round(progressData.percentage)}
                    </span>
                    <span className="text-[11px] font-bold text-sky-600 dark:text-sky-500">%</span>
                </div>
            </div>
            <ProgressBar value={progressData.percentage} variant="brand" size="xs" />
        </div>
    );
};

export default TimeProgressBar;

