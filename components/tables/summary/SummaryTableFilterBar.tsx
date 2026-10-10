import React from 'react';
import { resolveIconName } from '../../shared/ui/icon/legacyIconNames';
import { AppIcon } from '../../shared/ui/icon/AppIcon';
import { FilterPopover } from './FilterPopover';
import { PILL_COLORS, PILL_ICONS, ORDER_LABELS, SHORT_ORDER_LABELS } from './SummaryTableUtils';
import { Button } from '../../shared/ui/Button';

interface SummaryTableFilterBarProps {
    isCrossSellingMode: boolean;
    isPending: boolean;
    sortableListRef: React.RefObject<HTMLDivElement | null>;
    localDrilldownOrder: string[];
    getFilterProps: (key: string) => { options: string[]; selected: string[]; onChange: (s: string[]) => void };
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
                <span className="text-[11px] lg:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cấu trúc hiển thị & Lọc (Kéo thả để sắp xếp):</span>
                <div className={`flex flex-wrap items-center gap-1 sm:gap-1.5 ${isPending ? 'opacity-50 pointer-events-none' : ''}`} ref={sortableListRef}>
                    {localDrilldownOrder.map((key, index) => {
                        const colorClass = PILL_COLORS[key] || 'bg-slate-50 text-slate-700 border-slate-200';
                        const iconName = PILL_ICONS[key] || 'box';
                        const { options, selected, onChange } = getFilterProps(key);
                        
                        const alignment = index < 2 ? 'left' : 'right';

                        return (
                            <div key={key} className={`inline-flex items-center ${colorClass} border rounded-md px-1.5 py-0.5 sm:px-2 cursor-move transition-all hover:brightness-95 shadow-2xs select-none group relative leading-none`}>
                                <AppIcon name={resolveIconName(iconName) ?? 'help'} size="xs" className="mr-1 opacity-80 shrink-0" />
                                <span className="text-[11px] sm:text-xs font-semibold mr-0.5 leading-none">
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
                    <div className="flex items-center gap-1 hide-on-export ml-1 lg:ml-1.5">
                            <Button
                                variant="unstyled" size="none"
                                onClick={handleExpandAll}
                                className="relative h-5 w-5 lg:h-6 lg:w-6 rounded-md bg-sky-100 text-sky-700 hover:bg-sky-200 flex items-center justify-center transition-colors dark:bg-sky-900/40 dark:text-sky-400 dark:hover:bg-sky-800/60"
                                title="Mở rộng 1 cấp độ"
                            >
                                <AppIcon name="expandAll" size="sm" />
                                {expandLevel > 0 && <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-4 h-4 px-0.5 bg-sky-500 text-white text-[11px] leading-none font-bold rounded-full">{expandLevel}</span>}
                            </Button>
                            <div className="hidden lg:block w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
                            <Button
                                variant="unstyled" size="none"
                                onClick={handleCollapseAll}
                                className="h-5 w-5 lg:h-6 lg:w-6 rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center justify-center transition-colors dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-800/60"
                                title="Thu gọn 1 cấp độ"
                            >
                                <AppIcon name="collapseAll" size="sm" />
                            </Button>
                            {setIsFullScreen && (
                                <>
                                    <div className="hidden lg:block w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
                                    <Button
                                        variant="unstyled" size="none"
                                        onClick={() => setIsFullScreen(!isFullScreen)}
                                        className={`h-5 w-5 lg:h-6 lg:w-6 rounded-md flex items-center justify-center transition-colors ${isFullScreen ? 'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-400 dark:hover:bg-sky-800/60' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                                        title={isFullScreen ? "Thu nhỏ bảng" : "Phóng to toàn màn hình"}
                                    >
                                        <AppIcon name={isFullScreen ? 'collapse' : 'expand'} size="sm" />
                                    </Button>
                                </>
                            )}
                            {hasActiveFilters && (
                                <Button
                                    variant="unstyled" size="none"
                                    onClick={handleResetAllFilters}
                                    className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-0.5"
                                    title="Làm mới tất cả bộ lọc"
                                >
                                    <AppIcon name="reset" size="sm" />
                                </Button>
                            )}
                        </div>
                </div>
            </div>
        </div>
    );
};
