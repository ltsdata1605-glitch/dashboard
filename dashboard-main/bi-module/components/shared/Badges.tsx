import React from 'react';

export const MedalBadge: React.FC<{ rank?: number }> = ({ rank }) => {
    if (!rank) return <div className="w-7" />;
    const base = "w-7 text-center text-[13px] font-black tabular-nums";
    if (rank === 1) return <span className={`${base} text-amber-500`} title="TOP 1">#1</span>;
    if (rank === 2) return <span className={`${base} text-slate-400`} title="TOP 2">#2</span>;
    if (rank === 3) return <span className={`${base} text-amber-700`} title="TOP 3">#3</span>;
    return <span className={`${base} text-slate-400`}>#{rank}</span>;
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
