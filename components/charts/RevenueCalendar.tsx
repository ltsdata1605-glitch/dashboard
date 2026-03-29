import React, { useMemo } from 'react';
import { Solar, Lunar } from 'lunar-javascript';

interface DailyData {
    rawDate?: Date;
    value: number;
}

interface RevenueCalendarProps {
    data: DailyData[];
    monthDate: Date; // A date representing the month to display (e.g. 2026-03-01)
    metricName: string;
    title: string;
}

const formatCurrency = (val: number) => {
    if (val >= 1000000000) return (val / 1000000000).toFixed(1).replace(/\.0$/, '') + ' Tỷ';
    if (val >= 1000000) return (val / 1000000).toFixed(0) + ' Tr';
    if (val >= 1000) return (val / 1000).toFixed(0) + ' K';
    return val.toString();
};

const RevenueCalendar: React.FC<RevenueCalendarProps> = ({ data, monthDate, metricName, title }) => {
    // Determine the year and month
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth(); // 0-11

    // Build a map of daily values for quick lookup
    const dataMap = useMemo(() => {
        const map = new Map<string, number>();
        data.forEach(d => {
            if (d.rawDate) {
                // Formatting as YYYY-MM-DD local time
                const dateStr = `${d.rawDate.getFullYear()}-${String(d.rawDate.getMonth() + 1).padStart(2, '0')}-${String(d.rawDate.getDate()).padStart(2, '0')}`;
                map.set(dateStr, d.value);
            }
        });
        return map;
    }, [data]);

    // Build the calendar grid
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        // getDay() gives 0 for Sunday, 1 for Monday... We want Monday = 0, Sunday = 6
        let startDayOfWeek = firstDayOfMonth.getDay();
        startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

        const totalDays = lastDayOfMonth.getDate();
        const days = [];

        // Padding before the 1st of the month
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        // The actual days of the month
        for (let i = 1; i <= totalDays; i++) {
            const currentDate = new Date(year, month, i);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const value = dataMap.get(dateStr);

            // Compute lunar date
            const solar = Solar.fromYmd(year, month + 1, i);
            const lunar = solar.getLunar();
            
            // Format lunar date: e.g. 13/1
            let lunarStr = `${lunar.getDay()}/${lunar.getMonth()}`;
            // If it's the 1st of lunar month, we might want to emphasize it, but plain is fine.

            days.push({
                day: i,
                dateStr,
                lunarStr,
                value: value !== undefined ? value : null,
                isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6
            });
        }

        // Padding after the last day of the month
        while (days.length % 7 !== 0) {
            days.push(null);
        }

        return days;
    }, [year, month, dataMap]);

    return (
        <div className="w-full flex-col font-sans overflow-x-auto relative">
            <div className="min-w-[700px] border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                {/* Header Title Section */}
                <div className="bg-[#a5cbf0] dark:bg-blue-900/80 p-4 border-b border-slate-400 dark:border-slate-600 text-slate-900 dark:text-white">
                    <h2 className="text-2xl font-black uppercase tracking-wide">{title} THÁNG {String(month + 1).padStart(2, '0')}.{year}</h2>
                    <div className="text-[13px] font-bold mt-2 tracking-wider uppercase opacity-90">
                        TRẠNG THÁI : <span className="text-slate-900 dark:text-white">MỚI</span>
                    </div>
                </div>

                {/* Days of week header */}
                <div className="grid grid-cols-7 bg-[#a5cbf0] dark:bg-blue-900/60 border-b border-slate-400 dark:border-slate-600">
                    {['THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY', 'CHỦ NHẬT'].map((day, idx) => (
                        <div key={day} className={`p-3 text-center text-[15px] font-black text-slate-900 dark:text-blue-50 ${idx < 6 ? 'border-r border-slate-400 dark:border-slate-600' : ''}`}>
                            <span className="block">{day.split(' ')[0]}</span>
                            <span className="block">{day.split(' ')[1]}</span>
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7">
                    {calendarDays.map((dayData, idx) => {
                        const isLastInRow = (idx + 1) % 7 === 0;
                        const isBottomRow = idx >= calendarDays.length - 7;
                        
                        // Padding element rendering
                        if (!dayData) {
                            return (
                                <div 
                                    key={`empty-${idx}`} 
                                    className={`bg-[#d4d4d4] dark:bg-slate-800 h-[100px] ${!isLastInRow ? 'border-r border-slate-300 dark:border-slate-700' : ''} ${!isBottomRow ? 'border-b border-slate-300 dark:border-slate-700' : ''}`}
                                />
                            );
                        }

                        // Day cell styling based on screenshot: weekends have a light red/orange background
                        const isWeekend = dayData.isWeekend;
                        const bgClass = isWeekend ? 'bg-[#ffebd6] dark:bg-orange-900/30' : 'bg-white dark:bg-slate-900';
                        const textClass = isWeekend ? 'text-[#c62828] dark:text-red-400' : 'text-slate-900 dark:text-white';
                        
                        // Highlight current date (e.g. today or visually selected)
                        const isToday = new Date().getDate() === dayData.day && new Date().getMonth() === month && new Date().getFullYear() === year;
                        const borderHighlight = isToday ? 'border-2 border-red-500 z-10 shadow-lg' : `${!isLastInRow ? 'border-r border-slate-300 dark:border-slate-700' : ''} ${!isBottomRow ? 'border-b border-slate-300 dark:border-slate-700' : ''}`;
                        
                        return (
                            <div 
                                key={dayData.dateStr} 
                                className={`${bgClass} p-2 h-[100px] flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative ${borderHighlight}`}
                            >
                                <div className="flex flex-col items-start leading-tight">
                                    <span className="text-[14px] text-slate-800 dark:text-slate-200">
                                        {dayData.day}
                                    </span>
                                    <span className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                        {dayData.lunarStr}
                                    </span>
                                </div>
                                <div className={`text-left font-black text-[17px] ${textClass} tracking-tight pl-1`}>
                                    {dayData.value !== null ? formatCurrency(dayData.value) : '-'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default RevenueCalendar;
