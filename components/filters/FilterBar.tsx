
import React, { useMemo } from 'react';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { Icon } from '../common/Icon';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import FilterChip from '../common/FilterChip';
import { toLocalISOString } from '../../utils/dataUtils';

interface FilterBarProps {
    onToggleAdvanced: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ onToggleAdvanced }) => {
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
            availableMonths: Array.from(months).sort((a, b) => b.localeCompare(a))
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
            dateRange: range
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
        <div className="w-full mb-4 z-[100] sticky top-0 hide-on-export">
            <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-lg shadow-indigo-500/5 p-2 transition-all border-t-[3px] border-t-indigo-500">
                <div className="flex flex-col lg:flex-row gap-3 items-center">
                    
                    {/* 1. Primary: Warehouse Multi-select (Compact) */}
                    <div className="w-full lg:w-[150px] shrink-0">
                        <MultiSelectDropdown
                            label="Kho"
                            options={uniqueFilterOptions.kho}
                            selected={filterState.kho}
                            onChange={(sel) => handleFilterChange({ kho: sel })}
                            variant="compact"
                        />
                    </div>

                    {/* 2. Quick Date Ranges */}
                    <div className="relative flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shrink-0">
                        {[
                            { range: 'today', label: 'Hôm nay' },
                            { range: 'week', label: 'Tuần' },
                            { range: 'month', label: 'Tháng' },
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
                                            handleFilterChange({ startDate: toLocalISOString(start), endDate: toLocalISOString(end), dateRange: 'week' });
                                        }}
                                    >
                                        <option value="" disabled>Chọn Tuần</option>
                                        {availableWeeks.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                    </select>
                                )}
                                {range === 'month' && (
                                    <select 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        value=""
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) return;
                                            const [yStr, mStr] = val.split('-');
                                            const start = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
                                            const end = new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0);
                                            handleFilterChange({ startDate: toLocalISOString(start), endDate: toLocalISOString(end), dateRange: 'month' });
                                        }}
                                    >
                                        <option value="" disabled>Chọn Tháng</option>
                                        {availableMonths.map(m => <option key={m} value={m}>Tháng {m.split('-')[1]}/{m.split('-')[0]}</option>)}
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

                    {/* 3. Export Status (Segmented) */}
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

                    {/* 4. Department Filter */}
                    <div className="w-full lg:w-[160px] shrink-0">
                        <MultiSelectDropdown
                            label="Bộ phận"
                            options={uniqueFilterOptions.department}
                            selected={filterState.department}
                            onChange={(sel) => handleFilterChange({ department: sel })}
                            variant="compact"
                        />
                    </div>

                    {/* Middle: Active Chips Scrollable Area */}
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
                        ) : (
                            <div className="flex items-center gap-2 text-slate-400 px-2 animate-in fade-in duration-500 overflow-hidden">
                                <Icon name="info" size={3} className="shrink-0" />
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 whitespace-nowrap">Đang hiển thị toàn bộ</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={onToggleAdvanced}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95 group"
                        >
                            <Icon name="sliders-horizontal" size={3.5} className="group-hover:rotate-12 transition-transform" />
                            <span className="text-[11px] font-black uppercase tracking-wider">Nâng cao</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterBar;
