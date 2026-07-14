
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { Icon } from '../common/Icon';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import SingleSelectDropdown from '../common/SingleSelectDropdown';
import FilterChip from '../common/FilterChip';
import { Button } from '../shared/ui/Button';
import { toLocalISOString } from '../../utils/dataUtils';

interface FilterBarProps {
    onToggleAdvanced: () => void;
    onNewFile?: () => void;
    onOpenHistory?: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ onToggleAdvanced, onNewFile, onOpenHistory }) => {
    const { 
        filterState, 
        handleFilterChange, 
        uniqueFilterOptions,
        originalData
    } = useDashboardContext();

    const [selectedWeek, setSelectedWeek] = useState<string>('');
    const [mounted, setMounted] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const { availableWeeks, availableMonths } = useMemo(() => {
        const weeksMap = new Map<string, string>();
        const months = new Set<string>();
        
        if (originalData && originalData.length > 0) {
            originalData.forEach((row) => {
                const date = row.parsedDate;
                if (!date || isNaN(date.getTime())) return;
                
                const monthNum = date.getMonth() + 1;
                const yearNum = date.getFullYear();
                
                const mStr = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
                months.add(mStr);
                
                const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                const dayNum = d.getUTCDay() || 7;
                d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
                const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
                const wStr = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
                
                const firstDayOfMonth = new Date(yearNum, monthNum - 1, 1);
                const firstDayWeekday = firstDayOfMonth.getDay() || 7;
                const offsetDate = date.getDate() + firstDayWeekday - 1;
                const weekOfMonth = Math.ceil(offsetDate / 7);
                
                const label = `Tuần ${weekOfMonth} - Tháng ${String(monthNum).padStart(2, '0')}/${yearNum}`;
                weeksMap.set(wStr, label);
            });
        }
        
        return {
            availableWeeks: Array.from(weeksMap.entries())
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([value, label]) => ({ value, label })),
            availableMonths: Array.from(months)
                .sort((a, b) => b.localeCompare(a))
                .map(mStr => {
                    const [year, month] = mStr.split('-');
                    return `Tháng ${month}/${year}`;
                })
        };
    }, [originalData]);

    // Dong bo selectedWeek khi dateRange thay doi tu ben ngoai
    useEffect(() => {
        if (filterState.dateRange !== 'week') {
            setSelectedWeek('');
        } else if (filterState.startDate && filterState.endDate) {
            if (!selectedWeek) {
                const startStr = filterState.startDate.split('T')[0];
                const found = availableWeeks.find(w => {
                    const [yStr, wStr] = w.value.split('-W');
                    const year = parseInt(yStr, 10);
                    const week = parseInt(wStr, 10);
                    const start = new Date(year, 0, 1 + (week - 1) * 7);
                    const day = start.getDay();
                    start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
                    return toLocalISOString(start).split('T')[0] === startStr;
                });
                if (found) {
                    setSelectedWeek(found.value);
                }
            }
        }
    }, [filterState.dateRange, filterState.startDate, filterState.endDate, availableWeeks, selectedWeek]);

    const handleWeekSelect = (val: string) => {
        setSelectedWeek(val);
        const [yStr, wStr] = val.split('-W');
        const year = parseInt(yStr, 10);
        const week = parseInt(wStr, 10);
        const start = new Date(year, 0, 1 + (week - 1) * 7);
        const day = start.getDay();
        start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        handleFilterChange({ 
            startDate: toLocalISOString(start), 
            endDate: toLocalISOString(end), 
            dateRange: 'week', 
            selectedMonths: [] 
        });
    };

    const handleDateRangeClick = (range: string) => {
        let start: Date | null = null, end: Date | null = null;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (range) {
            case 'today': start = today; end = today; break;
            case 'yesterday': start = new Date(today); start.setDate(today.getDate() - 1); end = start; break;
            case 'week': {
                start = new Date(today);
                const day = start.getDay();
                start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;
            }
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'all': start = null; end = null; break;
        }
        handleFilterChange({
            startDate: start ? toLocalISOString(start) : '',
            endDate: end ? toLocalISOString(end) : '',
            dateRange: range,
            selectedMonths: [] // Clear selected months when selecting a quick range
        });
    };

    // Calculate active chips
    const activeChips = useMemo(() => {
        const chips: { id: keyof typeof filterState; label: string; value: string | string[]; color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' }[] = [];
        
        // Kho is already displayed in its multi-select dropdown, no need for a redundant chip
        // if (filterState.kho.length > 0 && !filterState.kho.includes('all')) {
        //     chips.push({ id: 'kho', label: 'Kho', value: filterState.kho, color: 'indigo' });
        // }

        // We don't show Trạng thái chip because it's now in the main bar.
        // if (filterState.trangThai.length > 0 && filterState.trangThai.length < uniqueFilterOptions.trangThai.length) {
        //     chips.push({ id: 'trangThai', label: 'Trạng thái', value: filterState.trangThai, color: 'violet' });
        // }

        if (filterState.nguoiTao.length > 0 && filterState.nguoiTao.length < uniqueFilterOptions.nguoiTao.length) {
            chips.push({ id: 'nguoiTao', label: 'Người tạo', value: filterState.nguoiTao, color: 'rose' });
        }

        // We don't show Xuất and Department chips because they're now in the main bar.

        // We don't show Xuất chip because it's now in the main bar, but keeping for logic consistency
        // if (filterState.xuat !== 'all') {
        //     chips.push({ id: 'xuat', label: 'Xuất', value: filterState.xuat, color: 'amber' });
        // }

        return chips;
    }, [filterState, uniqueFilterOptions]);

    const handleRemoveChip = (id: string) => {
        switch (id) {
            case 'kho': handleFilterChange({ kho: [] }); break;
            case 'trangThai': handleFilterChange({ trangThai: uniqueFilterOptions.trangThai }); break;
            case 'nguoiTao': handleFilterChange({ nguoiTao: uniqueFilterOptions.nguoiTao }); break;
            case 'department': handleFilterChange({ department: uniqueFilterOptions.department }); break;
            case 'xuat': handleFilterChange({ xuat: 'all' }); break;
        }
    };

    return (
        <>
            {/* Mobile Actions Portal */}
            {mounted && document.getElementById('mobile-topbar-actions') && createPortal(
                <div className="flex items-center gap-0.5">
                    {onNewFile && (
                        <Button
                            variant="unstyled" size="none"
                            onClick={onNewFile}
                            title="Tải YCX lên"
                            className="flex items-center justify-center w-8 h-8 text-emerald-600 dark:text-emerald-400 rounded-lg transition-all active:scale-95 shrink-0"
                        >
                            <Icon name="upload" size={5} />
                        </Button>
                    )}
                    {onOpenHistory && (
                        <Button
                            variant="unstyled" size="none"
                            onClick={onOpenHistory}
                            id="btn-mobile-history"
                            title="Quản lý tệp đã lưu"
                            className="flex items-center justify-center w-8 h-8 text-rose-600 dark:text-rose-400 rounded-lg transition-all active:scale-95 shrink-0"
                        >
                            <Icon name="database" size={5} />
                        </Button>
                    )}
                    <a
                        href="https://report.mwgroup.vn/home/dashboard/77"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Tải dữ liệu báo cáo (BCNB)"
                        className="flex items-center justify-center w-8 h-8 text-slate-400 dark:text-slate-500 rounded-lg transition-all active:scale-95 shrink-0"
                    >
                        <Icon name="link" size={5} />
                    </a>
                    <Button
                        variant="unstyled" size="none"
                        onClick={onToggleAdvanced}
                        title="Bộ lọc nâng cao"
                        className="flex items-center justify-center w-8 h-8 text-sky-600 dark:text-sky-400 rounded-lg transition-all active:scale-95 shrink-0"
                    >
                        <Icon name="settings" size={5} />
                    </Button>
                </div>,
                document.getElementById('mobile-topbar-actions')!
            )}

            <div className="w-full mb-4 z-[90] lg:z-[100] sticky top-[44px] lg:top-1.5 hide-on-export hidden lg:block">
                
                <style>{`
                    .grouped-filters {
                        height: 28px !important;
                    }
                    .grouped-filters button {
                        border: 0 !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        height: 26px !important;
                        padding-top: 0 !important;
                        padding-bottom: 0 !important;
                    }
                    .grouped-filters button:not(.bg-indigo-50):not(.dark\\:bg-indigo-900\\/40) {
                        background: transparent !important;
                    }
                    .grouped-filters button:focus,
                    .grouped-filters button:active {
                        outline: none !important;
                        box-shadow: none !important;
                    }
                    .grouped-filters button span {
                        font-size: 10px !important;
                        font-weight: 900 !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.05em !important;
                    }
                    .grouped-filters button:not(.text-indigo-600):not(.dark\\:text-indigo-400) span {
                        color: #64748b !important;
                    }
                    .grouped-filters button.text-indigo-600 span {
                        color: #4f46e5 !important;
                    }
                    .grouped-filters button.dark\\:text-indigo-400 span {
                        color: #818cf8 !important;
                    }
                    /* active background for dropdown button */
                    .grouped-filters button.border-indigo-500 {
                        background-color: #f5f3ff !important;
                    }
                    .dark .grouped-filters button.border-indigo-500 {
                        background-color: rgba(79, 70, 229, 0.2) !important;
                    }
                    .grouped-filters button span.text-sky-600,
                    .grouped-filters button span.text-sky-400 {
                        color: #0284c7 !important;
                    }
                    .grouped-filters svg {
                        width: 10px !important;
                        height: 10px !important;
                    }
                    .grouped-filters > div:first-of-type button {
                        border-top-left-radius: 0.5rem !important;
                        border-bottom-left-radius: 0.5rem !important;
                    }
                    .grouped-filters > div:last-of-type button {
                        border-top-right-radius: 0.5rem !important;
                        border-bottom-right-radius: 0.5rem !important;
                    }
                `}</style>

                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-y sm:border border-slate-200/80 dark:border-slate-700/60 rounded-none sm:rounded-xl lg:rounded-full p-1.5 lg:px-3 lg:py-2 transition-all">

                    {/* === DESKTOP LAYOUT (lg+): Original horizontal row === */}
                    <div className="hidden lg:flex flex-row gap-3 items-center">
                    
                    {/* 1. Primary: Warehouse Multi-select & Month (Grouped) */}
                    <div className="grouped-filters relative flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                        <div className="w-[110px] shrink-0">
                            <MultiSelectDropdown
                                label="Kho"
                                options={uniqueFilterOptions.kho}
                                selected={filterState.kho}
                                onChange={(sel) => handleFilterChange({ kho: sel })}
                                variant="compact"
                            />
                        </div>
                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-600" />
                        <div className="w-[110px] shrink-0">
                            <MultiSelectDropdown
                                label="Tháng"
                                options={availableMonths}
                                selected={filterState.selectedMonths || []}
                                onChange={(sel) => {
                                    handleFilterChange({ 
                                        selectedMonths: sel, 
                                        dateRange: sel.length > 0 ? '' : 'all',
                                        startDate: '',
                                        endDate: '',
                                    });
                                }}
                                variant="compact"
                            />
                        </div>
                    </div>

                    {/* Quick Date Ranges */}
                    <div className="grouped-filters relative flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                        {/* Dropdown chon Tuan */}
                        <div className="w-[75px] shrink-0">
                            <SingleSelectDropdown
                                label="Tuần"
                                options={availableWeeks.map(w => ({
                                    value: w.value,
                                    label: w.label.replace('Tuần ', 'T').replace(' - Tháng ', '/').replace(/\/202(\d)/, '/$1')
                                }))}
                                selected={selectedWeek}
                                onChange={handleWeekSelect}
                                variant="compact"
                            />
                        </div>
                        
                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-600" />
                        
                        {/* Các nút H.Nay, H.Qua, All */}
                        {[
                            { range: 'today', label: 'H.Nay' },
                            { range: 'yesterday', label: 'H.Qua' },
                            { range: 'all', label: 'All' }
                        ].map(({ range, label }) => (
                            <Button
                                key={range}
                                variant="unstyled" size="none"
                                onClick={() => handleDateRangeClick(range)}
                                className={`px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all relative z-0 ${
                                    filterState.dateRange === range
                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                                    : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {label}
                            </Button>
                        ))}
                    </div>

                    {/* Export Status (Segmented) */}
                    <div className="grouped-filters relative flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                        <div className="w-[100px] shrink-0">
                            <SingleSelectDropdown
                                label="T.Thái Xuất"
                                options={[
                                    { value: 'all', label: 'Tất cả' },
                                    { value: 'Đã', label: 'Đã xuất' },
                                    { value: 'Chưa', label: 'Chưa xuất' }
                                ]}
                                selected={filterState.xuat}
                                onChange={(val) => handleFilterChange({ xuat: val })}
                                variant="compact"
                            />
                        </div>
                    </div>
                    


                    {/* Active Chips */}
                    <div className="flex-grow flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                        {activeChips.length > 0 ? (
                            activeChips.map(chip => (
                                <FilterChip
                                    key={chip.id}
                                    label={chip.label}
                                    value={chip.value}
                                    onRemove={() => handleRemoveChip(chip.id)}
                                    color={chip.color}
                                />
                            ))
                        ) : null}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {onNewFile && (
                            <Button
                                variant="unstyled" size="none"
                                onClick={onNewFile}
                                title="Tải YCX lên"
                                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto flex items-center justify-center p-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 rounded-full transition-all active:scale-95 group"
                            >
                                <Icon name="upload" size={4.5} />
                            </Button>
                        )}
                        {onOpenHistory && (
                            <Button
                                variant="unstyled" size="none"
                                onClick={onOpenHistory}
                                id="btn-desktop-history"
                                title="Quản lý tệp đã lưu"
                                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto flex items-center justify-center p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-500 rounded-full transition-all active:scale-95 group"
                            >
                                <Icon name="database" size={4.5} />
                            </Button>
                        )}
                        <a
                            href="https://report.mwgroup.vn/home/dashboard/77"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Tải dữ liệu báo cáo (BCNB)"
                            className="flex items-center justify-center p-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 rounded-full transition-all active:scale-95 group"
                        >
                            <Icon name="link" size={4.5} />
                        </a>
                        <Button
                            variant="unstyled" size="none"
                            onClick={onToggleAdvanced}
                            title="Bộ lọc nâng cao"
                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto flex items-center justify-center p-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-sm transition-all active:scale-95 group"
                        >
                            <Icon name="settings" size={4.5} className="group-hover:rotate-90 transition-transform duration-300" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      </>
    );
};

export default FilterBar;
