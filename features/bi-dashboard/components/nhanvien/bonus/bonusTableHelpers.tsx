import React from 'react';

export const MedalBadge: React.FC<{ rank: number }> = ({ rank }) => {
    const base = "w-7 text-center text-[13px] font-black tabular-nums";
    if (rank === 1) return <span className={`${base} text-amber-500`} title="TOP 1">#1</span>;
    if (rank === 2) return <span className={`${base} text-slate-400`} title="TOP 2">#2</span>;
    if (rank === 3) return <span className={`${base} text-amber-700`} title="TOP 3">#3</span>;
    return <span className={`${base} text-slate-400`}>#{rank}</span>;
};

export const getCellColor = (val: number, type: 'dtqd' | 'hqqd' | 'erp' | 'tnong' | 'tong' | 'pnong') => {
    if (val === 0 || isNaN(val)) return 'text-slate-700 dark:text-slate-300';
    switch (type) {
        case 'dtqd': return val >= 50 ? 'text-emerald-600' : (val <= 20 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300');
        case 'hqqd': return val > 50 ? 'text-emerald-600' : (val < 40 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300');
        case 'pnong': return val > 60 ? 'text-emerald-600' : (val < 40 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300');
        case 'tong': return val >= 2000000 ? 'text-emerald-600' : (val <= 500000 ? 'text-rose-500' : 'text-slate-900 dark:text-white');
    }
    return 'text-slate-700 dark:text-slate-300';
};

export function getWeekdayAbbr(dateStr: string): string {
    const [d, m, y] = dateStr.split('/').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const day = dateObj.getDay();
    if (day === 0) return 'CN';
    return `T${day + 1}`;
}

export const isUpdatedToday = (updatedAt?: string) => {
    if (!updatedAt) return false;
    const today = new Date().toLocaleDateString('vi-VN');
    return updatedAt.includes(today);
};
