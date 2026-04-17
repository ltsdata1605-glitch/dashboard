
import React, { useMemo } from 'react';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { Icon } from '../common/Icon';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import FilterChip from '../common/FilterChip';
import { toLocalISOString } from '../../utils/dataUtils';

interface FilterBarProps {
    onToggleAdvanced: () => void;
    onNewFile?: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ onToggleAdvanced, onNewFile }) => {
    const { 
        filterState, 
        handleFilterChange, 
        uniqueFilterOptions,
        originalData
    } = useDashboardContext();

    const { availableWeeks, availableMonths } = useMemo(() => {
        const weeksMap = new Map<string, string>();
        const months = new Set<string>();
        
        if (originalData && originalData.length > 0) {
            originalData.forEach((row: any) => {
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
        const chips: { id: keyof typeof filterState; label: string; value: string | string[]; color: any }[] = [];
        
        // Kho is already displayed in its multi-select dropdown, no need for a redundant chip
        // if (filterState.kho.length > 0 && !filterState.kho.includes('all')) {
        //     chips.push({ id: 'kho', label: 'Kho', value: filterState.kho, color: 'indigo' });
        // }

        if (filterState.trangThai.length > 0 && filterState.trangThai.length < uniqueFilterOptions.trangThai.length) {
            chips.push({ id: 'trangThai', label: 'Trạng thái', value: filterState.trangThai, color: 'violet' });
        }

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
        <div className="w-full mb-4 z-[90] lg:z-[100] sticky top-[44px] lg:top-0 hide-on-export">
            <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-xl lg:rounded-2xl shadow-lg shadow-indigo-500/5 p-1.5 lg:p-2 transition-all border-t-2 lg:border-t-[3px] border-t-indigo-500">

                {/* === MOBILE LAYOUT (<lg): 2 compact rows === */}
                <div className="lg:hidden space-y-1.5">
                    {/* Row 1: Dropdowns */}
                    <div className="flex gap-1.5 items-center">
                        <div className="flex-1 min-w-0">
                            <MultiSelectDropdown
                                label="Kho"
                                options={uniqueFilterOptions.kho}
                                selected={filterState.kho}
                                onChange={(sel) => handleFilterChange({ kho: sel })}
                                variant="compact"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
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
                        <div className="flex-1 min-w-0">
                            <MultiSelectDropdown
                                label="Bộ phận"
                                options={uniqueFilterOptions.department}
                                selected={filterState.department}
                                onChange={(sel) => handleFilterChange({ department: sel })}
                                variant="compact"
                            />
                        </div>
                        {onNewFile && (
                            <button
                                onClick={onNewFile}
                                title="Tải YCX lên"
                                className="flex items-center justify-center p-2.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl transition-all active:scale-95 shrink-0"
                            >
                                <Icon name="file-up" size={3.5} />
                            </button>
                        )}
                        <a
                            href="https://report.mwgroup.vn/home/dashboard/77"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Tải dữ liệu báo cáo (BCNB)"
                            className="flex items-center justify-center p-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 rounded-xl transition-all active:scale-95 shrink-0"
                        >
                            <Icon name="external-link" size={3.5} />
                        </a>
                        <button
                            onClick={onToggleAdvanced}
                            title="Bộ lọc nâng cao"
                            className="flex items-center justify-center p-2.5 bg-gradient-to-br from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-xl shadow-md shadow-indigo-300/30 dark:shadow-none transition-all active:scale-95 shrink-0"
                        >
                            <Icon name="settings" size={3.5} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    {/* Row 2: Segments — horizontal scroll */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
                        {/* Date Range Segments */}
                        <div className="flex items-center gap-0.5 bg-slate-100/70 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/50 shrink-0 shadow-sm">
                            {[
                                { range: 'week', label: 'Tuần' },
                                { range: 'today', label: 'H.nay' },
                                { range: 'all', label: 'All' }
                            ].map(({ range, label }) => (
                                <div key={range} className="relative">
                                    {range === 'week' && (
                                        <select 
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            value=""
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (!val) return;
                                                const [yStr, wStr] = val.split('-W');
                                                const year = parseInt(yStr, 10);
                                                const week = parseInt(wStr, 10);
                                                const start = new Date(year, 0, 1 + (week - 1) * 7);
                                                const day = start.getDay();
                                                start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
                                                const end = new Date(start);
                                                end.setDate(start.getDate() + 6);
                                                handleFilterChange({ startDate: toLocalISOString(start), endDate: toLocalISOString(end), dateRange: 'week', selectedMonths: [] });
                                            }}
                                        >
                                            <option value="" disabled>Chọn Tuần</option>
                                            {availableWeeks.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                        </select>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (range === 'today' || range === 'all') {
                                                handleDateRangeClick(range);
                                            }
                                        }}
                                        className={`px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all duration-200 relative z-0 ${
                                            filterState.dateRange === range
                                            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-300/30'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 shrink-0"></div>

                        {/* Export Status Segments */}
                        <div className="flex items-center gap-0.5 bg-slate-100/70 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/50 shrink-0 shadow-sm">
                            {[
                                { val: 'all', label: 'All' },
                                { val: 'Đã', label: 'Đã' },
                                { val: 'Chưa', label: 'Chưa' }
                            ].map(({ val, label }) => (
                                <button
                                    key={val}
                                    onClick={() => handleFilterChange({ xuat: val })}
                                    className={`px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all duration-200 ${
                                        filterState.xuat === val
                                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-300/30'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Active Filter Chips */}
                        {activeChips.length > 0 && activeChips.map(chip => (
                            <FilterChip
                                key={chip.id}
                                label={chip.label}
                                value={chip.value}
                                onRemove={() => handleRemoveChip(chip.id)}
                                color={chip.color}
                            />
                        ))}
                    </div>
                </div>

                {/* === DESKTOP LAYOUT (lg+): Original horizontal row === */}
                <div className="hidden lg:flex flex-row gap-3 items-center">
                    
                    {/* 1. Primary: Warehouse Multi-select (Compact) */}
                    <div className="w-auto shrink-0">
                        <MultiSelectDropdown
                            label="Kho"
                            options={uniqueFilterOptions.kho}
                            selected={filterState.kho}
                            onChange={(sel) => handleFilterChange({ kho: sel })}
                            variant="compact"
                        />
                    </div>

                    {/* Month Filter */}
                    <div className="w-auto shrink-0 transform transition-transform hover:scale-105">
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

                    {/* Quick Date Ranges */}
                    <div className="relative flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shrink-0">
                        {[
                            { range: 'week', label: 'Tuần' },
                            { range: 'today', label: 'Hôm nay' },
                            { range: 'all', label: 'All' }
                        ].map(({ range, label }) => (
                            <div key={range} className="relative">
                                {range === 'week' && (
                                    <select 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        value=""
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) return;
                                            const [yStr, wStr] = val.split('-W');
                                            const year = parseInt(yStr, 10);
                                            const week = parseInt(wStr, 10);
                                            const start = new Date(year, 0, 1 + (week - 1) * 7);
                                            const day = start.getDay();
                                            start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
                                            const end = new Date(start);
                                            end.setDate(start.getDate() + 6);
                                            handleFilterChange({ startDate: toLocalISOString(start), endDate: toLocalISOString(end), dateRange: 'week', selectedMonths: [] });
                                        }}
                                    >
                                        <option value="" disabled>Chọn Tuần</option>
                                        {availableWeeks.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                    </select>
                                )}
                                <button
                                    onClick={() => {
                                        if (range === 'today' || range === 'all') {
                                            handleDateRangeClick(range);
                                        }
                                    }}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all relative z-0 ${
                                        filterState.dateRange === range
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {label}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Export Status (Segmented) */}
                    <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shrink-0">
                        {[
                            { val: 'all', label: 'All' },
                            { val: 'Đã', label: 'Đã xuất' },
                            { val: 'Chưa', label: 'Chưa xuất' }
                        ].map(({ val, label }) => (
                            <button
                                key={val}
                                onClick={() => handleFilterChange({ xuat: val })}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                    filterState.xuat === val
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Department Filter */}
                    <div className="w-auto shrink-0">
                        <MultiSelectDropdown
                            label="Bộ phận"
                            options={uniqueFilterOptions.department}
                            selected={filterState.department}
                            onChange={(sel) => handleFilterChange({ department: sel })}
                            variant="compact"
                        />
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
                            <button
                                onClick={onNewFile}
                                title="Tải YCX lên"
                                className="flex items-center justify-center p-2.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl transition-all active:scale-95 group"
                            >
                                <Icon name="file-up" size={4.5} />
                            </button>
                        )}
                        <a
                            href="https://report.mwgroup.vn/home/dashboard/77"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Tải dữ liệu báo cáo (BCNB)"
                            className="flex items-center justify-center p-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 rounded-xl transition-all active:scale-95 group"
                        >
                            <Icon name="external-link" size={4.5} />
                        </a>
                        <button
                            onClick={onToggleAdvanced}
                            title="Bộ lọc nâng cao"
                            className="flex items-center justify-center p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95 group"
                        >
                            <Icon name="settings" size={4.5} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterBar;
