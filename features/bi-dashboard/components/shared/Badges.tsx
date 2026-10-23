export const MedalBadge: React.FC<{ rank?: number; className?: string }> = ({ rank, className }) => {
    if (!rank) return <div className={className || "w-6"} />;
    if (rank === 1) {
        return (
            <span
                className={`inline-flex items-center justify-center min-w-[20px] px-1.5 h-[18px] rounded-full bg-amber-400 text-amber-950 font-black text-[10px] shadow-2xs ring-1 ring-amber-300/80 leading-none shrink-0 ${className || ''}`}
                title="TOP 1"
            >
                #1
            </span>
        );
    }
    if (rank === 2) {
        return (
            <span
                className={`inline-flex items-center justify-center min-w-[20px] px-1.5 h-[18px] rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-bold text-[10px] shadow-2xs ring-1 ring-slate-300/80 dark:ring-slate-600 leading-none shrink-0 ${className || ''}`}
                title="TOP 2"
            >
                #2
            </span>
        );
    }
    if (rank === 3) {
        return (
            <span
                className={`inline-flex items-center justify-center min-w-[20px] px-1.5 h-[18px] rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-bold text-[10px] shadow-2xs ring-1 ring-amber-300/80 dark:ring-amber-800 leading-none shrink-0 ${className || ''}`}
                title="TOP 3"
            >
                #3
            </span>
        );
    }
    return (
        <span className={`inline-flex items-center justify-center min-w-[20px] px-1 text-slate-400 dark:text-slate-500 font-medium text-[11px] tabular-nums leading-none shrink-0 ${className || ''}`}>
            #{rank}
        </span>
    );
};

export const DeltaBadge: React.FC<{ current: number | undefined, previous?: number, isPercent?: boolean, isCurrency?: boolean }> = ({ current, previous, isPercent = false, isCurrency = false }) => {
    if (previous === undefined || previous === 0 || isNaN(previous) || current === undefined || isNaN(current)) return null;
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
        <div className={`text-[11px] font-black leading-none mt-0.5 flex items-center justify-center gap-0.5 ${colorClass}`}>
            <span>{icon}</span>
            <span>{displayDiff}</span>
        </div>
    );
};
