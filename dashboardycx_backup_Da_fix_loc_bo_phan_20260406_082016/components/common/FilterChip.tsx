
import React from 'react';
import { Icon } from './Icon';

interface FilterChipProps {
    label: string;
    value: string | string[];
    onRemove: () => void;
    color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet';
}

const FilterChip: React.FC<FilterChipProps> = ({ 
    label, 
    value, 
    onRemove,
    color = 'indigo'
}) => {
    const getColorClasses = () => {
        switch (color) {
            case 'emerald': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30';
            case 'amber': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/30';
            case 'rose': return 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800/40 hover:bg-rose-100 dark:hover:bg-rose-900/30';
            case 'violet': return 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800/40 hover:bg-violet-100 dark:hover:bg-violet-900/30';
            default: return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/30';
        }
    };

    const displayValue = Array.isArray(value) 
        ? (value.length > 2 ? `${value.length} mục` : value.join(', '))
        : value;

    if (!value || (Array.isArray(value) && value.length === 0)) return null;

    return (
        <div className={`group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all shadow-sm animate-in fade-in zoom-in duration-200 ${getColorClasses()}`}>
            <span className="opacity-60">{label}:</span>
            <span className="max-w-[120px] truncate">{displayValue}</span>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="ml-0.5 p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title={`Xóa lọc ${label}`}
            >
                <Icon name="x" size={3} />
            </button>
        </div>
    );
};

export default FilterChip;
