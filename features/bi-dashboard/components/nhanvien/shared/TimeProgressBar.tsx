import React, { useMemo } from 'react';
import { ProgressBar } from '../../../../../components/shared/ui/ProgressBar';

interface TimeProgressBarProps {
    className?: string;
}

const TimeProgressBar: React.FC<TimeProgressBarProps> = ({ className = '' }) => {
    const { dayPassed, daysInMonth, percentage } = useMemo(() => {
        const now = new Date();
        const dp = now.getDate() - 1;
        const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return { dayPassed: dp, daysInMonth: dim, percentage: (dp / dim) * 100 };
    }, []);

    return (
        <div className={`w-full ${className}`}>
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quỹ thời gian</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                        {dayPassed} / {daysInMonth} ngày
                    </span>
                </div>
                <span className="text-[11px] font-black text-sky-600 dark:text-sky-400 tabular-nums">
                    {Math.round(percentage)}%
                </span>
            </div>
            <ProgressBar value={percentage} variant="brand" size="xs" />
        </div>
    );
};

export default TimeProgressBar;
