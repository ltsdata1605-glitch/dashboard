import { useState, useEffect } from 'react';
import type { SummaryTableNode, GrandTotal } from '../../../../types';
import { getWeeksInMonth, getSafeDateInPrevMonth, toInputDate, toInputMonth, formatCompactDateRange } from '../SummaryTableUtils';
import { processSummaryTable } from '../../../../services/summaryService';
import { parseExcelDate, getRowValue } from '../../../../utils/dataUtils';
import { COL } from '../../../../constants';

export type ComparisonMode = 'day_adjacent' | 'day_same_period' | 'week_adjacent' | 'week_same_period' | 'month_adjacent' | 'month_same_period_year' | 'quarter_adjacent' | 'quarter_same_period_year' | 'ytd_same_period_year' | 'custom_range' | 'monthly_trend';

export const useSummaryComparison = (
    isComparisonMode: boolean,
    baseFilteredData: any[],
    productConfig: any,
    filters: any,
    localParentFilters: string[],
    localChildFilters: string[],
    localManufacturerFilters: string[],
    localCreatorFilters: string[],
    localProductFilters: string[],
    deferredDrilldownOrder: string[]
) => {
    const [compMode, setCompMode] = useState<ComparisonMode>('day_adjacent');
    const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
    const [selectedMonth, setSelectedMonth] = useState(toInputMonth(new Date()));
    const [selectedWeeks, setSelectedWeeks] = useState<number[]>([1]);
    const [compareUpToCurrentDay, setCompareUpToCurrentDay] = useState(false);
    
    const [customRangeA, setCustomRangeA] = useState({ start: toInputDate(new Date()), end: toInputDate(new Date()) });
    const [customRangeB, setCustomRangeB] = useState({ start: toInputDate(new Date()), end: toInputDate(new Date()) });

    const [compSortConfig, setCompSortConfig] = useState<{ column: string, type: 'current' | 'delta', direction: 'asc' | 'desc' }>({
        column: 'totalRevenue',
        type: 'current',
        direction: 'desc'
    });

    const [compTree, setCompTree] = useState<{
        current: { data: { [key: string]: SummaryTableNode }, grandTotal: GrandTotal };
        prev: { data: { [key: string]: SummaryTableNode }, grandTotal: GrandTotal };
        title: string;
        description?: string;
    } | null>(null);

    const [trendData, setTrendData] = useState<{
        months: { id: string, label: string, daysCount: number }[];
        trees: { [month: string]: { data: { [key: string]: SummaryTableNode }, grandTotal: GrandTotal } };
    } | null>(null);

    const [trendSelectedMonths, setTrendSelectedMonths] = useState<string[]>([]);
    const [dateDisplay, setDateDisplay] = useState({ current: '', prev: '' });
    const [daysCountData, setDaysCountData] = useState<{ current: number, prev: number }>({ current: 1, prev: 1 });

    const weeksInSelectedMonth = getWeeksInMonth(
        Number(selectedMonth.split('-')[0]) || new Date().getFullYear(),
        (Number(selectedMonth.split('-')[1]) || new Date().getMonth() + 1) - 1
    );

    useEffect(() => {
        if (compMode === 'week_adjacent' || compMode === 'week_same_period') {
            const hasValidSelection = selectedWeeks.length > 0 && weeksInSelectedMonth.some(w => w.id === selectedWeeks[0]);
            if (!hasValidSelection) {
                if (weeksInSelectedMonth.length > 0) {
                    setSelectedWeeks([weeksInSelectedMonth[weeksInSelectedMonth.length - 1].id]);
                } else {
                    setSelectedWeeks([]);
                }
            }
        }
    }, [compMode, weeksInSelectedMonth, selectedMonth]);

    useEffect(() => {
        if (!isComparisonMode || !baseFilteredData.length || !productConfig) {
            setCompTree(null);
            setTrendData(null);
            return;
        }

        if (compMode === 'monthly_trend') {
            const getValidDate = (r: any) => parseExcelDate(getRowValue(r, COL.DATE_CREATED));
            
            const monthsList = Array.from(new Set(baseFilteredData.map(r => {
                const d = getValidDate(r);
                return d ? toInputMonth(d) : null;
            }).filter(Boolean) as string[])).sort();

            const trees: any = {};
            const monthsMeta: any[] = [];
            
            monthsList.forEach(m => {
                const monthData = baseFilteredData.filter(r => {
                    const d = getValidDate(r);
                    return d && toInputMonth(d) === m;
                });
                if (monthData.length === 0) return;
                
                let dCount = 1;
                const times = monthData.map(r => {
                    const d = getValidDate(r);
                    if (d) {
                        d.setHours(0,0,0,0);
                        return d.getTime();
                    }
                    return 0;
                }).filter(t => t > 0);
                
                if (times.length > 0) {
                    const maxT = times.reduce((max, t) => t > max ? t : max, times[0]);
                    const minT = times.reduce((min, t) => t < min ? t : min, times[0]);
                    dCount = Math.max(1, Math.round((maxT - minT) / 86400000) + 1);
                }

                monthsMeta.push({ id: m, label: `${parseInt(m.split('-')[1], 10)}.${m.split('-')[0]}`, daysCount: dCount });
                trees[m] = processSummaryTable(monthData, productConfig, filters);
            });
            
            setTrendData({ months: monthsMeta, trees });
            setTrendSelectedMonths(prev => {
                const validIds = monthsMeta.map(m => m.id);
                const validPrev = prev.filter(p => validIds.includes(p));
                return validPrev.length > 0 ? validPrev : validIds;
            });
            setCompTree(null);
            setDateDisplay({ current: 'Giai đoạn Pivot', prev: '' });
            return;
        }

        setTrendData(null); // Clear trend if going back to standard comp
        let currentStart: Date, currentEnd: Date, prevStart: Date, prevEnd: Date;
        let titleSuffix = '';
        let description = '';

        if (compMode === 'day_adjacent') {
            const current = new Date(selectedDate);
            currentStart = new Date(current); currentStart.setHours(0,0,0,0);
            currentEnd = new Date(current); currentEnd.setHours(23,59,59,999);
            
            const prev = new Date(current);
            prev.setDate(current.getDate() - 1);
            prevStart = new Date(prev); prevStart.setHours(0,0,0,0);
            prevEnd = new Date(prev); prevEnd.setHours(23,59,59,999);
            titleSuffix = `NGÀY (LIỀN KỀ)`;
            description = `So sánh ngày ${currentStart.toLocaleDateString('vi-VN')} với ngày hôm trước (${prevStart.toLocaleDateString('vi-VN')}).`;

        } else if (compMode === 'day_same_period') {
            const current = new Date(selectedDate);
            currentStart = new Date(current); currentStart.setHours(0,0,0,0);
            currentEnd = new Date(current); currentEnd.setHours(23,59,59,999);

            const prev = getSafeDateInPrevMonth(current);
            prevStart = new Date(prev); prevStart.setHours(0,0,0,0);
            prevEnd = new Date(prev); prevEnd.setHours(23,59,59,999);
            titleSuffix = `NGÀY (CÙNG KỲ)`;
            description = `So sánh ngày ${currentStart.toLocaleDateString('vi-VN')} với ngày cùng số của tháng trước (${prevStart.toLocaleDateString('vi-VN')}).`;

        } else if (compMode === 'week_adjacent') {
            const wCurrId = selectedWeeks[0];
            const wPrevId = wCurrId - 1;
            
            const wCurr = weeksInSelectedMonth.find((w: any) => w.id === wCurrId);
            const wPrev = weeksInSelectedMonth.find((w: any) => w.id === wPrevId);
            
            if (!wCurr) return;

            currentStart = wCurr.start;
            currentEnd = wCurr.end;
            
            if (wPrev) {
                prevStart = wPrev.start;
                prevEnd = wPrev.end;
                titleSuffix = `TUẦN ${wCurrId} vs TUẦN ${wPrevId}`;
                description = `So sánh ${wCurr.label} với ${wPrev.label}.`;
            } else {
                prevStart = currentStart;
                prevEnd = currentEnd;
                titleSuffix = `TUẦN ${wCurrId}`;
                description = `Dữ liệu tuần ${wCurr.id}. (Không có tuần trước liền kề trong tháng).`;
            }

        } else if (compMode === 'week_same_period') {
            const selectedWeekId = selectedWeeks[0];
            const wCurrent = weeksInSelectedMonth.find((w: any) => w.id === selectedWeekId);
            if (!wCurrent) return;

            currentStart = wCurrent.start;
            currentEnd = wCurrent.end;

            const [y, m] = selectedMonth.split('-').map(Number);
            const prevDate = new Date(y, m - 2, 1);
            const prevWeeks = getWeeksInMonth(prevDate.getFullYear(), prevDate.getMonth());
            
            const prevWeekIndex = Math.min(selectedWeekId, prevWeeks.length);
            const prevWeek = prevWeeks.find(w => w.id === prevWeekIndex);
            
            if (!prevWeek) return;

            prevStart = prevWeek.start;
            prevEnd = prevWeek.end;
            titleSuffix = `TUẦN (CÙNG KỲ THÁNG TRƯỚC)`;
            description = `So sánh ${wCurrent.shortLabel} tháng này với ${prevWeek.shortLabel} tháng trước.`;

        } else if (compMode === 'month_adjacent') {
            const [y, m] = selectedMonth.split('-').map(Number);
            currentStart = new Date(y, m - 1, 1);
            currentEnd = new Date(y, m, 0, 23, 59, 59, 999);

            prevStart = new Date(y, m - 2, 1);
            prevEnd = new Date(y, m - 1, 0, 23, 59, 59, 999);
            titleSuffix = `THÁNG (LIỀN KỀ)`;
            description = `So sánh tháng ${m}/${y} với tháng trước đó.`;
        } else if (compMode === 'month_same_period_year') {
            const [y, m] = selectedMonth.split('-').map(Number);
            currentStart = new Date(y, m - 1, 1);
            currentEnd = new Date(y, m, 0, 23, 59, 59, 999);

            prevStart = new Date(y - 1, m - 1, 1);
            prevEnd = new Date(y - 1, m, 0, 23, 59, 59, 999);
            titleSuffix = `THÁNG (CÙNG KỲ NĂM TRƯỚC)`;
            description = `So sánh tháng ${m}/${y} với cùng kỳ năm trước.`;
        } else if (compMode.startsWith('quarter')) {
            const [y, m] = selectedMonth.split('-').map(Number);
            const quarter = Math.floor((m - 1) / 3);
            currentStart = new Date(y, quarter * 3, 1);
            currentEnd = new Date(y, quarter * 3 + 3, 0, 23, 59, 59, 999);
            
            if (compMode === 'quarter_adjacent') {
                if (quarter === 0) {
                    prevStart = new Date(y - 1, 9, 1);
                    prevEnd = new Date(y - 1, 12, 0, 23, 59, 59, 999);
                } else {
                    prevStart = new Date(y, (quarter - 1) * 3, 1);
                    prevEnd = new Date(y, (quarter - 1) * 3 + 3, 0, 23, 59, 59, 999);
                }
                titleSuffix = `QUÝ (LIỀN KỀ)`;
                description = `So sánh Quý ${quarter + 1}/${y} với quý liền kề trước đó.`;
            } else {
                prevStart = new Date(y - 1, quarter * 3, 1);
                prevEnd = new Date(y - 1, quarter * 3 + 3, 0, 23, 59, 59, 999);
                titleSuffix = `QUÝ (CÙNG KỲ NĂM TRƯỚC)`;
                description = `So sánh Quý ${quarter + 1}/${y} với cùng kỳ năm trước.`;
            }
        } else if (compMode === 'ytd_same_period_year') {
            const current = new Date(selectedDate);
            currentStart = new Date(current.getFullYear(), 0, 1);
            currentEnd = new Date(current); currentEnd.setHours(23, 59, 59, 999);

            prevStart = new Date(current.getFullYear() - 1, 0, 1);
            const prev = new Date(current);
            prev.setFullYear(current.getFullYear() - 1);
            prevEnd = new Date(prev); prevEnd.setHours(23, 59, 59, 999);
            
            titleSuffix = `LŨY KẾ YTD (ĐẾN HIỆN TẠI)`;
            description = `So sánh lũy kế từ đầu năm đến ${current.toLocaleDateString('vi-VN')} với cùng kỳ năm ngoái.`;
        } else if (compMode === 'custom_range') {
            currentStart = new Date(customRangeA.start); currentStart.setHours(0,0,0,0);
            currentEnd = new Date(customRangeA.end); currentEnd.setHours(23,59,59,999);
            
            prevStart = new Date(customRangeB.start); prevStart.setHours(0,0,0,0);
            prevEnd = new Date(customRangeB.end); prevEnd.setHours(23,59,59,999);
            
            titleSuffix = `KHOẢNG THỜI GIAN`;
            description = `So sánh tùy chỉnh giữa 2 khoảng thời gian.`;
        } else {
            return;
        }

        if (
            compareUpToCurrentDay && 
            ['week_same_period', 'month_adjacent', 'month_same_period_year', 'quarter_same_period_year', 'ytd_same_period_year'].includes(compMode)
        ) {
            let maxTime = -Infinity;
            for (let i = 0; i < baseFilteredData.length; i++) {
                const date = baseFilteredData[i].parsedDate;
                if (date && date.getTime() > maxTime) {
                    maxTime = date.getTime();
                }
            }
            if (maxTime !== -Infinity) {
                const dataMaxDate = new Date(maxTime);
                if (dataMaxDate >= currentStart && dataMaxDate <= currentEnd) {
                    const originalPrevEnd = prevEnd;
                    currentEnd = new Date(dataMaxDate);
                    currentEnd.setHours(23, 59, 59, 999);
                    
                    const offset = currentEnd.getTime() - currentStart.getTime();
                    prevEnd = new Date(prevStart.getTime() + offset);
                    if (prevEnd > originalPrevEnd) {
                        prevEnd = originalPrevEnd;
                    }
                    description += ` (Đã giới hạn so sánh cùng kỳ từ đầu giai đoạn đến ngày ${dataMaxDate.toLocaleDateString('vi-VN')})`;
                }
            }
        }

        const currDays = Math.max(1, Math.round((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const prevDays = Math.max(1, Math.round((prevEnd.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        setDaysCountData({ current: currDays, prev: prevDays });

        setDateDisplay({
            current: formatCompactDateRange(currentStart, currentEnd),
            prev: formatCompactDateRange(prevStart, prevEnd)
        });

        const currentDataRows = baseFilteredData.filter(row => {
            const date = row.parsedDate;
            return date && date >= currentStart && date <= currentEnd;
        });

        const prevDataRows = baseFilteredData.filter(row => {
            const date = row.parsedDate;
            return date && date >= prevStart && date <= prevEnd;
        });

        const mockFilters = { 
            ...filters,
            parent: localParentFilters,
            summaryTable: {
                ...filters.summaryTable,
                drilldownOrder: deferredDrilldownOrder,
                child: localChildFilters,
                manufacturer: localManufacturerFilters,
                creator: localCreatorFilters,
                product: localProductFilters
            }
        }; 
        const currentTree = processSummaryTable(currentDataRows, productConfig, mockFilters);
        const prevTree = processSummaryTable(prevDataRows, productConfig, mockFilters);

        setCompTree({
            current: currentTree,
            prev: prevTree,
            title: `SO SÁNH NGÀNH HÀNG: ${titleSuffix}`,
            description
        });

    }, [isComparisonMode, compMode, selectedDate, selectedMonth, selectedWeeks, baseFilteredData, productConfig, filters.summaryTable, weeksInSelectedMonth, deferredDrilldownOrder, localParentFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters, customRangeA, customRangeB]);

    const handleWeekPillClick = (weekId: number) => {
        setSelectedWeeks([weekId]);
    };

    return {
        compMode, setCompMode,
        selectedDate, setSelectedDate,
        selectedMonth, setSelectedMonth,
        selectedWeeks, handleWeekPillClick,
        customRangeA, setCustomRangeA,
        customRangeB, setCustomRangeB,
        compSortConfig, setCompSortConfig,
        compTree, trendData,
        trendSelectedMonths, setTrendSelectedMonths,
        dateDisplay, daysCountData, setDaysCountData,
        weeksInSelectedMonth,
        compareUpToCurrentDay, setCompareUpToCurrentDay
    };
};
