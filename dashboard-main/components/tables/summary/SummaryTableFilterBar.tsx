import React from 'react';
import { Icon } from '../../common/Icon';
import { FilterPopover } from './FilterPopover';
import { PILL_COLORS, PILL_ICONS, ORDER_LABELS, SHORT_ORDER_LABELS } from './SummaryTableUtils';

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
    isFullScreen?: boolean;
    setIsFullScreen?: (val: boolean) => void;
}

export const SummaryTableFilterBar: React.FC<SummaryTableFilterBarProps> = ({
    isCrossSellingMode, isPending, sortableListRef, localDrilldownOrder, getFilterProps,
    activeFilterKey, setActiveFilterKey, hasActiveFilters, handleExpandAll, handleCollapseAll,
    handleResetAllFilters, expandLevel, handleExport, isExporting, isFullScreen, setIsFullScreen
}) => {
    if (isCrossSellingMode) return null;

    return (
        <div className="relative z-[50] flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 hide-on-export pt-2 border-t border-slate-100 dark:border-slate-700/50 px-3 sm:px-5 pb-2 lg:pb-3">
            <div className="flex flex-col gap-1 w-full lg:w-auto">
                <span className="text-[10px] lg:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cấu trúc hiển thị & Lọc (Kéo thả để sắp xếp):</span>
                <div className={`flex flex-wrap items-center gap-1.5 lg:gap-2 ${isPending ? 'opacity-50 pointer-events-none' : ''}`} ref={sortableListRef}>
                    {localDrilldownOrder.map((key, index) => {
                        const colorClass = PILL_COLORS[key] || 'bg-slate-100 text-slate-700 border-slate-200';
                        const iconName = PILL_ICONS[key] || 'box';
                        const { options, selected, onChange } = getFilterProps(key);
                        
                        const alignment = index < 2 ? 'left' : 'right';

                        return (
                            <div key={key} className={`flex items-center ${colorClass} border rounded-full pl-2 pr-1.5 py-0.5 lg:pl-3 lg:pr-2 lg:py-1 cursor-move transition-transform hover:scale-105 shadow-sm select-none group relative`}>
                                <Icon name={iconName} size={2.5} className="mr-1 opacity-70 lg:hidden" />
                                <Icon name={iconName} size={3} className="mr-1.5 opacity-70 hidden lg:block" />
                                <span className="text-[10px] lg:text-xs font-bold mr-1">
                                    <span className="hidden sm:inline">{ORDER_LABELS[key]}</span>
                                    <span className="sm:hidden">{SHORT_ORDER_LABELS[key] || ORDER_LABELS[key]}</span>
                                </span>
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
                    
                    {/* Expand/Collapse Buttons — visible on all sizes */}
                    <div className="flex items-center gap-1 lg:gap-1.5 hide-on-export ml-1 lg:ml-2">
                            <button
                                onClick={handleExpandAll}
                                className="relative h-6 w-6 lg:h-7 lg:w-7 rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 flex items-center justify-center transition-colors dark:bg-teal-900/40 dark:text-teal-400 dark:hover:bg-teal-800/60"
                                title="Mở rộng 1 cấp độ"
                            >
                                <Icon name="maximize-2" size={3} className="lg:hidden" />
                                <Icon name="maximize-2" size={4} className="hidden lg:block" />
                                {expandLevel > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center w-3 h-3 lg:w-3.5 lg:h-3.5 bg-teal-500 text-white text-[7px] lg:text-[8px] font-bold rounded-full">{expandLevel}</span>}
                            </button>
                            <div className="hidden lg:block w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            <button
                                onClick={handleCollapseAll}
                                className="h-6 w-6 lg:h-7 lg:w-7 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center justify-center transition-colors dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-800/60"
                                title="Thu gọn 1 cấp độ"
                            >
                                <Icon name="minimize-2" size={3} className="lg:hidden" />
                                <Icon name="minimize-2" size={4} className="hidden lg:block" />
                            </button>
                            {setIsFullScreen && (
                                <>
                                    <div className="hidden lg:block w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                    <button
                                        onClick={() => setIsFullScreen(!isFullScreen)}
                                        className={`h-6 w-6 lg:h-7 lg:w-7 rounded-lg flex items-center justify-center transition-colors ${isFullScreen ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-800/60' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                                        title={isFullScreen ? "Thu nhỏ bảng" : "Phóng to toàn màn hình"}
                                    >
                                        <Icon name={isFullScreen ? "minimize" : "maximize"} size={3} className="lg:hidden" />
                                        <Icon name={isFullScreen ? "minimize" : "maximize"} size={4} className="hidden lg:block" />
                                    </button>
                                </>
                            )}
                            {hasActiveFilters && (
                                <button
                                    onClick={handleResetAllFilters}
                                    className="p-1 lg:p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-0.5 lg:ml-1"
                                    title="Làm mới tất cả bộ lọc"
                                >
                                    <Icon name="rotate-ccw" size={3} className="lg:hidden" />
                                    <Icon name="rotate-ccw" size={4} className="hidden lg:block" />
                                </button>
                            )}
                        </div>
                </div>
            </div>
        </div>
    );
};
