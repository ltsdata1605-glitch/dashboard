import React, { useMemo } from 'react';
import { Solar } from 'lunar-javascript';

interface DailyData {
    rawDate?: Date;
    value: number;
}

interface RevenueCalendarProps {
    data: DailyData[];
    monthDate: Date;
    metricName: string;
    title: string;
    subtitle?: string;
    isDraft?: boolean;
    /** compact mode: smaller cells, tighter layout for saved-calendar grid */
    compact?: boolean;
}

const formatValue = (val: number, metricName: string) => {
    if (metricName.includes('Tỉ trọng') || metricName.includes('%')) {
        // Làm tròn số nguyên, không dùng số lẻ
        return Math.round(val) + '%';
    }
    if (val >= 1000000000) return (val / 1000000000).toFixed(1).replace(/\.0$/, '') + ' Tỷ';
    if (val >= 1000000) return (val / 1000000).toFixed(0) + ' Tr';
    if (val >= 1000) return (val / 1000).toFixed(0) + ' K';
    return val.toLocaleString('vi-VN');
};

const RevenueCalendar: React.FC<RevenueCalendarProps> = ({ data, monthDate, metricName, title, subtitle, isDraft, compact }) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const dataMap = useMemo(() => {
        const map = new Map<string, number>();
        data.forEach(d => {
            if (d.rawDate) {
                const dateStr = `${d.rawDate.getFullYear()}-${String(d.rawDate.getMonth() + 1).padStart(2, '0')}-${String(d.rawDate.getDate()).padStart(2, '0')}`;
                map.set(dateStr, d.value);
            }
        });
        return map;
    }, [data]);

    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        let startDayOfWeek = firstDayOfMonth.getDay();
        startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

        const totalDays = lastDayOfMonth.getDate();
        const days = [];

        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        for (let i = 1; i <= totalDays; i++) {
            const currentDate = new Date(year, month, i);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const value = dataMap.get(dateStr);

            const solar = Solar.fromYmd(year, month + 1, i);
            const lunar = solar.getLunar();
            let lunarStr = `${lunar.getDay()}/${lunar.getMonth()}`;

            let holidayName = null;
            
            // Solar Holidays
            if (i === 14 && month + 1 === 2) holidayName = 'Valentine 🌹';
            else if (i === 8 && month + 1 === 3) holidayName = 'Q.Tế Phụ Nữ 🌹';
            else if (i === 30 && month + 1 === 4) holidayName = 'Giải Phóng 🇻🇳';
            else if (i === 1 && month + 1 === 5) holidayName = 'Quốc Tế LĐ 🇻🇳';
            else if (i === 2 && month + 1 === 9) holidayName = 'Quốc Khánh 🇻🇳';
            else if (i === 20 && month + 1 === 11) holidayName = 'Nhà Giáo VN 🌻';
            else if (i === 24 && month + 1 === 12) holidayName = 'Noel 🎄';
            else if (i === 1 && month + 1 === 1) holidayName = 'Tết Dương 🎆';

            // Lunar Holidays
            const lDay = lunar.getDay();
            const lMonth = lunar.getMonth();
            if (lDay === 1 && lMonth === 1) holidayName = 'Mùng 1 Tết 🧧';
            else if (lDay === 2 && lMonth === 1) holidayName = 'Mùng 2 Tết 🧧';
            else if (lDay === 3 && lMonth === 1) holidayName = 'Mùng 3 Tết 🧧';
            else if (lDay === 10 && lMonth === 3) holidayName = 'Giỗ Tổ HV 🏮';
            else if (lDay === 15 && lMonth === 8) holidayName = 'Trung Thu 🥮';

            days.push({
                day: i,
                dateStr,
                lunarStr,
                value: value !== undefined ? value : null,
                isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
                holidayName
            });
        }

        while (days.length % 7 !== 0) {
            days.push(null);
        }

        return days;
    }, [year, month, dataMap]);

    // Responsive sizing based on mode
    // compact takes priority (used in 2-column grid for both draft + saved)
    // isDraft only enlarges when compact is false (full-width mode)
    const dayNumSize  = compact  ? 'text-[9px] md:text-[10px]'
                      : isDraft  ? 'text-[16px] md:text-[20px] lg:text-[24px]'
                      :            'text-[12px] md:text-[14px]';

    const lunarSize   = compact  ? 'text-[7px] md:text-[8px]'
                      : isDraft  ? 'text-[12px] md:text-[14px]'
                      :            'text-[9px] md:text-[10px]';

    // Revenue / % value size MUST be larger than day number size and completely symmetrical
    const valueSize   = compact  ? 'text-[10px] md:text-[11px] lg:text-[12px] xl:text-[14px]'
                      : isDraft  ? 'text-[18px] md:text-[22px] lg:text-[26px] xl:text-[32px]'
                      :            'text-[13px] md:text-[14px] lg:text-[15px] xl:text-[17px]';

    const cellMinH    = compact ? 'min-h-[40px] md:min-h-[48px]' : 'min-h-[55px] md:min-h-[65px] lg:min-h-[75px]';
    const cellPad     = compact ? 'p-1' : 'p-1.5 md:p-2';
    const gridGap     = compact ? 'gap-0.5 md:gap-1' : 'gap-1 md:gap-2 lg:gap-3';
    const titleSize   = compact ? 'text-base md:text-lg' : isDraft ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl';

    const monthStr = String(month + 1).padStart(2, '0');
    
    // Đề bài: "Dòng tiêu đề bổ sung thêm tổng số lượng/doanh thu/doanh thu QĐ của tháng được chọn"
    const isPercentage = metricName.includes('Tỉ trọng') || metricName.includes('%');
    const displayTotal = useMemo(() => {
        if (isPercentage) return null;
        const sum = data.reduce((acc, current) => acc + (current.value || 0), 0);
        return formatValue(sum, metricName);
    }, [data, metricName, isPercentage]);

    return (
        <div className="w-full flex-col relative p-1 md:p-2 bg-transparent">
            <div className={`w-full flex flex-col ${compact ? 'gap-1 md:gap-2' : 'gap-2 md:gap-4'}`}>
                {/* Header Title Section */}
                <div className="flex items-center justify-between mb-1">
                    <div className="flex flex-col">
                        <h2 className={`font-black uppercase tracking-tight text-slate-800 dark:text-slate-100 ${titleSize}`}>
                            {title}
                        </h2>
                        <div className={`font-bold mt-0.5 text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap ${compact ? 'text-[9px]' : 'text-[11px] md:text-[12px]'}`}>
                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md whitespace-nowrap">THÁNG {monthStr}.{year}</span>
                            {subtitle && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0"></span>
                                    <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-extrabold whitespace-nowrap">{subtitle}</span>
                                </>
                            )}
                            {displayTotal !== null && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0"></span>
                                    <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-black whitespace-nowrap whitespace-pre">TỔNG: {displayTotal}</span>
                                </>
                            )}
                            {!compact && (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                        CẬP NHẬT MỚI
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Days of week header */}
                <div className={`grid grid-cols-7 ${gridGap}`}>
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => {
                        const isWeekend = idx >= 5;
                        return (
                            <div key={day} className={`${compact ? 'py-0.5 text-[8px] md:text-[9px]' : 'py-2 px-1 text-[11px] md:text-[12px]'} text-center font-extrabold rounded-lg tracking-wide uppercase ${isWeekend ? 'text-orange-600 bg-orange-100/50 dark:bg-orange-900/20 dark:text-orange-400' : 'text-slate-500 bg-slate-100 dark:bg-slate-800/80 dark:text-slate-400'}`}>
                                {compact ? day : (idx === 0 ? 'THỨ HAI' : idx === 1 ? 'THỨ BA' : idx === 2 ? 'THỨ TƯ' : idx === 3 ? 'THỨ NĂM' : idx === 4 ? 'THỨ SÁU' : idx === 5 ? 'THỨ BẢY' : 'CHỦ NHẬT')}
                            </div>
                        );
                    })}
                </div>

                {/* Calendar Grid */}
                <div className={`grid grid-cols-7 ${gridGap}`}>
                    {calendarDays.map((dayData, idx) => {
                        if (!dayData) {
                            return (
                                <div 
                                    key={`empty-${idx}`} 
                                    className={`aspect-square w-full h-auto ${cellMinH} rounded-lg bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-200/60 dark:border-white/5`}
                                />
                            );
                        }

                        const isWeekend = dayData.isWeekend;
                        const hasData = dayData.value !== null && dayData.value > 0;
                        const isToday = new Date().getDate() === dayData.day && new Date().getMonth() === month && new Date().getFullYear() === year;
                        
                        let bgClass = 'bg-white dark:bg-[#1c1c1e]';
                        let borderClass = 'border-slate-200/80 dark:border-white/10';
                        let textClass = 'text-slate-800 dark:text-slate-100';
                        let dayNumClass = 'text-slate-700 dark:text-slate-200';
                        let barColor = 'bg-indigo-500';
                        
                        if (isWeekend) {
                            bgClass = 'bg-orange-50/40 dark:bg-[#2c1d11]';
                            borderClass = 'border-orange-100 dark:border-orange-900/40';
                            textClass = 'text-orange-700 dark:text-orange-400';
                            dayNumClass = 'text-orange-600 dark:text-orange-500';
                            barColor = 'bg-orange-500';
                        }
                        
                        if (isToday) {
                            borderClass = 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/20 dark:ring-indigo-500/30';
                            bgClass = isWeekend ? 'bg-orange-100/60 dark:bg-[#3d2411]' : 'bg-indigo-50/40 dark:bg-indigo-900/10';
                        }
                        
                        // Holiday override
                        if (dayData.holidayName) {
                            bgClass = 'bg-rose-50/80 dark:bg-rose-900/20';
                            borderClass = 'border-rose-300 dark:border-rose-800/50';
                            textClass = 'text-rose-700 dark:text-rose-400';
                            dayNumClass = 'text-rose-600 dark:text-rose-500';
                            barColor = 'bg-rose-500';
                            if (isToday) borderClass = 'border-rose-500 ring-2 ring-rose-500/30';
                        }

                        return (
                            <div 
                                key={dayData.dateStr} 
                                className={`${bgClass} border ${borderClass} rounded-xl aspect-square w-full h-auto ${cellMinH} flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative group cursor-default overflow-hidden p-1 md:p-1.5`}
                            >
                                {/* Top Row: Solar & Lunar Date */}
                                <div className="flex justify-between items-start w-full">
                                    <span className={`font-black ${isToday ? 'text-indigo-600 dark:text-indigo-400' : dayNumClass} ${dayNumSize} leading-none`}>
                                        {dayData.day}
                                    </span>
                                    <span className={`font-bold ${lunarSize} text-slate-400 dark:text-slate-500 leading-none`}>
                                        {dayData.lunarStr}
                                    </span>
                                </div>

                                {/* Center Data (Symmetrical & Prevent wrapping on export) */}
                                <div className={`flex-1 flex items-center justify-center font-medium tracking-tight ${textClass} ${hasData ? '' : 'opacity-25'} ${valueSize} w-full text-center whitespace-nowrap overflow-visible`}>
                                    {hasData ? formatValue(dayData.value, metricName) : '-'}
                                </div>

                                {/* Bottom Row: Bar & Holiday */}
                                <div className="flex flex-col items-center justify-end w-full mt-auto">
                                    {dayData.holidayName && (
                                        <span className={`font-bold text-rose-500 dark:text-rose-400 whitespace-nowrap overflow-hidden text-ellipsis mb-0.5 ${compact ? 'text-[8px] max-w-[40px]' : 'text-[10px] md:text-[11px] max-w-[80px]'}`} title={dayData.holidayName}>
                                            {dayData.holidayName}
                                        </span>
                                    )}
                                    {hasData && !compact && (
                                        <div className="w-full h-1 bg-slate-200/50 dark:bg-slate-700/50 rounded-full overflow-hidden shrink-0 mt-0.5">
                                            <div className={`h-full ${barColor} rounded-full w-full opacity-60 group-hover:opacity-100 transition-opacity`}></div>
                                        </div>
                                    )}
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
