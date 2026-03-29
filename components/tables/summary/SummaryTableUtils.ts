export const getTraGopPercentClass = (percentage: number) => {
    if (isNaN(percentage)) return 'text-slate-600 dark:text-slate-300';
    if (percentage >= 45) return 'text-green-600 dark:text-green-500 font-bold';
    if (percentage >= 40) return 'text-amber-600 dark:text-amber-500';
    return 'text-red-600 dark:text-red-500 font-bold';
};

export const formatCompactDateRange = (start: Date, end: Date) => {
    const d1 = start.getDate();
    const m1 = start.getMonth() + 1;
    const d2 = end.getDate();
    const m2 = end.getMonth() + 1;
    const y2 = end.getFullYear();
    
    if (start.getTime() === end.getTime()) {
        return `${d1}/${m1}/${y2}`;
    }
    return `${d1}/${m1} - ${d2}/${m2}/${y2}`;
};

export const toInputDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const toInputMonth = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

export const getWeeksInMonth = (year: number, month: number) => { 
    const weeks: { id: number, label: string, start: Date, end: Date, shortLabel: string }[] = [];
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    
    let currentDay = 1;
    let weekNum = 1;

    while (currentDay <= lastDayOfMonth) {
        const start = new Date(year, month, currentDay);
        let endDayVal = currentDay + 6;
        if (endDayVal > lastDayOfMonth) endDayVal = lastDayOfMonth;
        
        const end = new Date(year, month, endDayVal);
        end.setHours(23, 59, 59, 999);

        weeks.push({
            id: weekNum,
            shortLabel: `Tuần ${weekNum}`,
            label: `Tuần ${weekNum} (${start.getDate()}/${month + 1}-${end.getDate()}/${month + 1})`,
            start: start,
            end: end
        });
        
        currentDay += 7;
        weekNum++;
    }
    return weeks;
};

export const getSafeDateInPrevMonth = (date: Date) => {
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();
    const prevMonthDate = new Date(y, m - 1, 1);
    const prevMonthMaxDays = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
    const safeDay = Math.min(d, prevMonthMaxDays);
    return new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), safeDay);
};

export interface HeaderConfig {
    label: string;
    key: string;
    showInComparison: boolean;
    singleColumnInCompare?: boolean;
    colorClass: string;
    borderColor: string;
    compareLabel?: string;
    icon?: string;
}

export const HEADER_CONFIG: HeaderConfig[] = [
    { label: 'S.LƯỢNG', key: 'totalQuantity', showInComparison: true, colorClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', borderColor: 'border-emerald-200 dark:border-emerald-500/20', icon: 'package' },
    { label: '%SL', key: 'slPercent', showInComparison: true, singleColumnInCompare: true, compareLabel: '+/-%SL', colorClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', borderColor: 'border-emerald-200 dark:border-emerald-500/20', icon: 'trending-up' },
    { label: 'DT', key: 'totalRevenue', showInComparison: true, colorClass: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400', borderColor: 'border-sky-200 dark:border-sky-500/20', icon: 'banknote' },
    { label: '%DT', key: 'dtThucPercent', showInComparison: true, singleColumnInCompare: true, compareLabel: '+/-%DT', colorClass: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400', borderColor: 'border-orange-200 dark:border-orange-500/20', icon: 'trending-up' },
    { label: 'DTQĐ', key: 'totalRevenueQD', showInComparison: true, colorClass: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400', borderColor: 'border-teal-200 dark:border-teal-500/20', icon: 'award' },
    { label: 'GTĐH', key: 'aov', showInComparison: true, colorClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400', borderColor: 'border-indigo-200 dark:border-indigo-500/20', icon: 'shopping-bag' },
    { label: '% T.Chậm', key: 'traGopPercent', showInComparison: true, colorClass: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400', borderColor: 'border-cyan-200 dark:border-cyan-500/20', icon: 'clock' },
];

export const ORDER_LABELS: Record<string, string> = {
    'parent': 'Ngành hàng',
    'child': 'Nhóm hàng',
    'manufacturer': 'Hãng SX',
    'creator': 'Nhân viên',
    'product': 'Tên sản phẩm'
};

export const PILL_ICONS: Record<string, string> = {
    'parent': 'layers',
    'child': 'layout-grid',
    'manufacturer': 'factory',
    'creator': 'user',
    'product': 'package'
};

export const PILL_COLORS: Record<string, string> = {
    'parent': 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700',
    'child': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700',
    'manufacturer': 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-700',
    'creator': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700',
    'product': 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-700'
};
