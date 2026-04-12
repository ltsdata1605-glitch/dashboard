import React from 'react';
import { Icon } from '../../common/Icon';
import { FilterPopover } from './FilterPopover';
import { PILL_COLORS, PILL_ICONS, ORDER_LABELS } from './SummaryTableUtils';

interface SummaryTableFilterBarProps {
    isCrossSellingMode: boolean;
    isPending: boolean;
    sortableListRef: React.RefObject<HTMLDivElement>;
    localDrilldownOrder: string[];
    getFilterProps: (key: string) => any;
    activeFilterKey: string | null;
    setActiveFilterKey: React.Dispatch<React.SetStateAction<string | null>>;
    hasActiveFilters: boolean;
    handleExpandAll: () => void;
    handleCollapseAll: () => void;
    handleResetAllFilters: () => void;
    expandLevel: number;
    handleExport: () => void;
    isExporting: boolean;
}

export const SummaryTableFilterBar: React.FC<SummaryTableFilterBarProps> = ({
    isCrossSellingMode, isPending, sortableListRef, localDrilldownOrder, getFilterProps,
    activeFilterKey, setActiveFilterKey, hasActiveFilters, handleExpandAll, handleCollapseAll,
    handleResetAllFilters, expandLevel, handleExport, isExporting
}) => {
    if (isCrossSellingMode) return null;

    return (
        <div className="relative z-[50] flex flex-wrap items-center justify-between gap-2 sm:gap-3 hide-on-export pt-2 border-t border-slate-100 dark:border-slate-700/50 px-3 sm:px-5 pb-3">
            <div className="flex flex-col gap-1 w-full lg:w-auto">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cấu trúc hiển thị & Lọc (Kéo thả để sắp xếp):</span>
                <div className={`flex flex-wrap items-center gap-2 ${isPending ? 'opacity-50 pointer-events-none' : ''}`} ref={sortableListRef}>
                    {localDrilldownOrder.map((key, index) => {
                        const colorClass = PILL_COLORS[key] || 'bg-slate-100 text-slate-700 border-slate-200';
                        const iconName = PILL_ICONS[key] || 'box';
                        const { options, selected, onChange } = getFilterProps(key);
                        
                        const alignment = index < 2 ? 'left' : 'right';

                        return (
                            <div key={key} className={`flex items-center ${colorClass} border rounded-full pl-3 pr-2 py-1 cursor-move transition-transform hover:scale-105 shadow-sm select-none group relative`}>
                                <Icon name={iconName} size={3} className="mr-1.5 opacity-70" />
                                <span className="text-xs font-bold mr-1">{ORDER_LABELS[key]}</span>
                                <FilterPopover 
                                    label={ORDER_LABELS[key]}
                                    options={options}
                                    selected={selected}
                                    onChange={onChange}
                                    isOpen={activeFilterKey === key}
                                    onToggle={() => setActiveFilterKey(prev => prev === key ? null : key)}
                                    onClose={() => setActiveFilterKey(null)}
                                    alignment={alignment}
                                />
                            </div>
                        );
                    })}
                    
                    {hasActiveFilters && (
                        <div className="hidden sm:flex items-center gap-1.5 hide-on-export ml-2">
                            <button
                                onClick={handleExpandAll}
                                className="h-7 w-7 rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 flex items-center justify-center transition-colors dark:bg-teal-900/40 dark:text-teal-400 dark:hover:bg-teal-800/60"
                                title="Mở rộng 1 cấp độ"
                            >
                                <Icon name="maximize-2" size={4} />
                            </button>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            <button
                                onClick={handleCollapseAll}
                                className="h-7 w-7 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center justify-center transition-colors dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-800/60"
                                title="Thu gọn 1 cấp độ"
                            >
                                <Icon name="minimize-2" size={4} />
                            </button>
                            <button
                                onClick={handleResetAllFilters}
                                className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-1"
                                title="Làm mới tất cả bộ lọc"
                            >
                                <Icon name="rotate-ccw" size={4} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 ml-auto mt-1 sm:mt-2 lg:mt-0">
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 items-center">
                    <button
                        onClick={handleExpandAll}
                        className="p-1.5 px-2 text-teal-600 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors relative"
                        title="Mở rộng 1 cấp"
                    >
                        <Icon name="maximize-2" size={4} />
                        {expandLevel > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center w-3.5 h-3.5 bg-teal-500 text-white text-[8px] font-bold rounded-full">{expandLevel}</span>}
                    </button>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <button
                        onClick={handleCollapseAll}
                        className="p-1.5 px-2 text-amber-600 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"
                        title="Thu gọn 1 cấp"
                    >
                        <Icon name="minimize-2" size={4} />
                    </button>
                </div>
                
                <button onClick={handleExport} disabled={isExporting} title="Xuất Ảnh" className="p-2 text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    {isExporting ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="camera" />}
                </button>
            </div>
        </div>
    );
};
