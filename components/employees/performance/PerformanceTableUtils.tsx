import React from 'react';

export type SortDirection = 'asc' | 'desc';
export type GroupType = 'doanhThu' | 'khaiThac' | 'vuotTroi';

export const getProgressBarColor = (pct: number) => {
    if (pct >= 100) return 'from-emerald-400 to-teal-500';
    if (pct >= 80)  return 'from-blue-400 to-indigo-500';
    if (pct >= 50)  return 'from-amber-400 to-orange-400';
    return 'from-rose-400 to-red-500';
};

export const getPercentBadge = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
    if (pct >= 80)  return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
    if (pct >= 50)  return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300';
};

export const getTraChamBadge = (pct: number, target: number = 45) => {
    if (isNaN(pct)) return 'text-slate-400';
    if (pct >= target) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 rounded-lg font-bold';
    if (pct >= target - 10) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-2 py-0.5 rounded-lg font-bold';
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 px-2 py-0.5 rounded-lg font-bold';
};

export const getHieuQuaBadge = (pct: number, target: number = 35) => {
    if (pct >= target) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300';
};

export const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    if (rank === 0) return <span className="text-xl leading-none">🥇</span>;
    if (rank === 1) return <span className="text-xl leading-none">🥈</span>;
    if (rank === 2) return <span className="text-xl leading-none">🥉</span>;
    return (
        <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">
            #{rank + 1}
        </span>
    );
};

export const safeSort = (a: any, b: any, key: string, dir: SortDirection) => {
    try {
        const vA = a?.[key], vB = b?.[key];
        if (vA === vB) return 0;
        if (vA == null) return 1;
        if (vB == null) return -1;
        if (key !== 'name' && key !== 'department') {
            const nA = Number(vA), nB = Number(vB);
            if (!isNaN(nA) && !isNaN(nB)) {
                if (!isFinite(nA) && !isFinite(nB)) return 0;
                if (!isFinite(nA)) return nA === Infinity ? 1 : -1;
                if (!isFinite(nB)) return nB === Infinity ? -1 : 1;
                return dir === 'asc' ? nA - nB : nB - nA;
            }
        }
        const sA = String(vA).toLowerCase(), sB = String(vB).toLowerCase();
        return sA < sB ? (dir === 'asc' ? -1 : 1) : sA > sB ? (dir === 'asc' ? 1 : -1) : 0;
    } catch { return 0; }
};

export const TAB_THEMES = {
    doanhThu: {
        gradient: 'from-emerald-500 to-teal-600',
        headerBg: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
        iconBlockBg: 'bg-emerald-100 dark:bg-emerald-900/30',
        iconBlockText: 'text-emerald-600 dark:text-emerald-400',
        icon: 'wallet',
        title: 'Hiệu Quả Doanh Thu',
        subtitle: 'Phân tích doanh thu & hiệu quả quy đổi',
        accent: 'emerald',
    },
    khaiThac: {
        gradient: 'from-blue-500 to-indigo-600',
        headerBg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
        iconBlockBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconBlockText: 'text-blue-600 dark:text-blue-400',
        icon: 'layers',
        title: 'Hiệu Quả Trả Chậm',
        subtitle: 'Tiếp cận khách hàng & Bán kèm',
        accent: 'blue',
    },
    vuotTroi: {
        gradient: 'from-violet-500 to-purple-600',
        headerBg: 'bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
        iconBlockBg: 'bg-violet-100 dark:bg-violet-900/30',
        iconBlockText: 'text-violet-600 dark:text-violet-400',
        icon: 'trophy',
        title: 'Mục Tiêu Vượt Trội',
        subtitle: `Cập nhật ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`,
        accent: 'violet',
    },
} as const;

export const DEPT_COLORS = [
    { row: 'bg-blue-50 dark:bg-blue-900', badge: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', strip: 'bg-blue-100 dark:bg-blue-800' },
    { row: 'bg-emerald-50 dark:bg-emerald-900', badge: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', strip: 'bg-emerald-100 dark:bg-emerald-800' },
    { row: 'bg-violet-50 dark:bg-violet-900', badge: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-400', strip: 'bg-violet-100 dark:bg-violet-800' },
    { row: 'bg-amber-50 dark:bg-amber-900', badge: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', strip: 'bg-amber-100 dark:bg-amber-800' },
    { row: 'bg-rose-50 dark:bg-rose-900', badge: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', strip: 'bg-rose-100 dark:bg-rose-800' },
    { row: 'bg-sky-50 dark:bg-sky-900', badge: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-400', strip: 'bg-sky-100 dark:bg-sky-800' },
    { row: 'bg-teal-50 dark:bg-teal-900', badge: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-400', strip: 'bg-teal-100 dark:bg-teal-800' },
    { row: 'bg-fuchsia-50 dark:bg-fuchsia-900', badge: 'bg-fuchsia-500', text: 'text-fuchsia-700 dark:text-fuchsia-400', strip: 'bg-fuchsia-100 dark:bg-fuchsia-800' },
];
