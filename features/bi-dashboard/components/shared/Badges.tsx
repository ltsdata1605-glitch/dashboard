import React from 'react';

// Top 3: huy hiệu tròn vàng/bạc/đồng (chỉ dùng amber/slate theo bảng màu semantic đã duyệt —
// phân biệt bằng nền + viền thay vì chỉ đổi màu chữ, để trông như huy hiệu thật thay vì số thường).
const MEDAL_STYLES: Record<number, string> = {
    1: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-700',
    2: 'bg-slate-100 text-slate-600 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600',
    3: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-500 dark:ring-amber-800',
};

export const MedalBadge: React.FC<{ rank?: number }> = ({ rank }) => {
    if (!rank) return <div className="w-7" />;
    if (rank <= 3) {
        return (
            <span
                className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-[12px] font-black tabular-nums ${MEDAL_STYLES[rank]}`}
                title={`TOP ${rank}`}
            >
                {rank}
            </span>
        );
    }
    return <span className="w-7 text-center text-[13px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">#{rank}</span>;
};

export const DeltaBadge: React.FC<{ current: number, previous?: number, isPercent?: boolean, isCurrency?: boolean }> = ({ current, previous, isPercent = false, isCurrency = false }) => {
    if (previous === undefined || previous === 0 || isNaN(previous) || isNaN(current)) return null;
    const diff = current - previous;
    if (isNaN(diff) || Math.abs(diff) < 0.01) return null;

    const isPositive = diff > 0;
    const colorClass = isPositive ? 'text-emerald-500' : 'text-rose-500';
    const icon = isPositive ? '▲' : '▼';
    
    let displayDiff = '';
    if (isPercent) {
        displayDiff = `${Math.abs(diff).toFixed(1)}%`;
    } else if (isCurrency) {
        displayDiff = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Math.abs(diff));
    } else {
        displayDiff = Math.abs(Math.ceil(diff)).toString();
    }

    return (
        <div className={`text-[9px] font-black leading-none mt-0.5 flex items-center justify-center gap-0.5 ${colorClass}`}>
            <span>{icon}</span>
            <span>{displayDiff}</span>
        </div>
    );
};
