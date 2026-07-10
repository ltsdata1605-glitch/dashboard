export const getTraGopPercentClass = (percentage: number, target: number = 45) => {
    if (isNaN(percentage)) return 'text-slate-600 dark:text-slate-300';
    if (percentage >= target) return 'text-emerald-600 dark:text-emerald-500 font-bold';
    if (percentage >= target - 5) return 'text-amber-600 dark:text-amber-500';
    return 'text-rose-600 dark:text-rose-500 font-bold';
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

export interface WeekInfo {
    id: number;
    label: string;
    start: Date;
    end: Date;
    shortLabel: string;
}

export const getWeeksInMonth = (year: number, month: number) => {
    const weeks: WeekInfo[] = [];
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
    group: string;
    key: string;
    showInComparison: boolean;
    singleColumnInCompare?: boolean;
    colorClass: string;
    borderColor: string;
    compareLabel?: string;
    icon?: string;
}

export const HEADER_CONFIG: HeaderConfig[] = [
    { label: 'SL', group: 'SỐ LƯỢNG', key: 'totalQuantity', showInComparison: true, colorClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', borderColor: 'border-emerald-200 dark:border-emerald-500/20', icon: 'package' },
    { label: '%SL', group: 'SỐ LƯỢNG', key: 'slPercent', showInComparison: true, singleColumnInCompare: true, compareLabel: '+/-%', colorClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', borderColor: 'border-emerald-200 dark:border-emerald-500/20', icon: 'trending-up' },
    { label: 'DT', group: 'DOANH THU', key: 'totalRevenue', showInComparison: true, colorClass: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400', borderColor: 'border-sky-200 dark:border-sky-500/20', icon: 'banknote' },
    { label: '%DT', group: 'DOANH THU', key: 'dtThucPercent', showInComparison: true, singleColumnInCompare: true, compareLabel: '+/-%DT', colorClass: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400', borderColor: 'border-sky-200 dark:border-sky-500/20', icon: 'trending-up' },
    
    // Thêm nhóm TRUNG BÌNH NGÀY
    { label: 'TrB SL', group: 'TB SỐ LƯỢNG', key: 'avgQuantity', showInComparison: true, colorClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400', borderColor: 'border-indigo-200 dark:border-indigo-500/20', icon: 'calculator' },
    { label: 'TrB DT', group: 'TB DOANH THU', key: 'avgRevenue', showInComparison: true, colorClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400', borderColor: 'border-indigo-200 dark:border-indigo-500/20', icon: 'calculator' },
    
    { label: 'DTQĐ', group: '', key: 'totalRevenueQD', showInComparison: true, colorClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', borderColor: 'border-amber-200 dark:border-amber-500/20', icon: 'award' },
    { label: 'GIÁ TRỊ ĐH', group: '', key: 'aov', showInComparison: true, colorClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400', borderColor: 'border-indigo-200 dark:border-indigo-500/20', icon: 'shopping-bag' },
    { label: 'TRẢ CHẬM', group: '', key: 'traGopPercent', showInComparison: true, colorClass: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400', borderColor: 'border-rose-200 dark:border-rose-500/20', icon: 'clock' },
];

export const ORDER_LABELS: Record<string, string> = {
    'kho': 'Kho',
    'parent': 'Ngành',
    'child': 'Nhóm',
    'manufacturer': 'Hãng SX',
    'creator': 'Người tạo',
    'product': 'Sản phẩm'
};

export const SHORT_ORDER_LABELS: Record<string, string> = {
    'kho': 'Kho',
    'parent': 'Ngành',
    'child': 'Nhóm',
    'manufacturer': 'Hãng',
    'creator': 'Người tạo',
    'product': 'Sản phẩm'
};

export const PILL_ICONS: Record<string, string> = {
    'kho': 'warehouse',
    'parent': 'layers',
    'child': 'layout-grid',
    'manufacturer': 'factory',
    'creator': 'user',
    'product': 'package'
};

export const PILL_COLORS: Record<string, string> = {
    'kho': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700',
    'parent': 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700',
    'child': 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-700',
    'manufacturer': 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700',
    'creator': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700',
    'product': 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700'
};
