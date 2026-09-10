import React, { useMemo, useState, useEffect } from 'react';
import { ProgressBar } from '../../../../../components/shared/ui/ProgressBar';

interface TimeProgressBarProps {
    className?: string;
    isRealtime?: boolean;
    startTime?: string; // Mặc định '08:00' (8h00)
    endTime?: string;   // Mặc định '21:30' (9h30 tối)
}

const TimeProgressBar: React.FC<TimeProgressBarProps> = ({
    className = '',
    isRealtime = false,
    startTime = '08:00',
    endTime = '21:30'
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

    const { label, percentage } = useMemo(() => {
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
                label: '8h00 - 21h30',
                percentage: Math.min(100, Math.max(0, pct))
            };
        } else {
            // Chế độ Luỹ kế: đo lường theo ngày trong tháng
            const dp = now.getDate() - 1;
            const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            return {
                label: `${dp} / ${dim} ngày`,
                percentage: (dp / dim) * 100
            };
        }
    }, [isRealtime, startTime, endTime, now]);

    return (
        <div className={`w-full ${className}`}>
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quỹ thời gian</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                        {label}
                    </span>
                </div>
                <span className="text-[11px] font-black text-sky-700 dark:text-sky-400 tabular-nums">
                    {Math.round(percentage)}%
                </span>
            </div>
            <ProgressBar value={percentage} variant="brand" size="xs" />
        </div>
    );
};

export default TimeProgressBar;

