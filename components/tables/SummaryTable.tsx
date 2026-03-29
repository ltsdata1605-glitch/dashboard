
import React, { useState, useMemo, useRef, useEffect, useCallback, useTransition, useDeferredValue } from 'react';
import Sortable from 'sortablejs';
import type { SummaryTableNode, GrandTotal } from '../../types';
import { abbreviateName, formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { exportElementAsImage } from '../../services/uiService';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { processSummaryTable } from '../../services/summaryService';
import { saveSummaryTableConfig } from '../../services/dbService';
import RecursiveRow from './SummaryTableRow';

import { FilterPopover } from './summary/FilterPopover';
import { 
    getTraGopPercentClass, formatCompactDateRange, toInputDate, toInputMonth,
    getWeeksInMonth, getSafeDateInPrevMonth, HEADER_CONFIG, ORDER_LABELS,
    PILL_ICONS, PILL_COLORS
} from './summary/SummaryTableUtils';
import { useSummaryTableLogic } from './summary/useSummaryTableLogic';

interface SummaryTableProps {}

type ComparisonMode = 'day_adjacent' | 'day_same_period' | 'week_adjacent' | 'week_same_period' | 'month_adjacent' | 'custom_range';

const SummaryTable: React.FC<SummaryTableProps> = React.memo(() => {
    const state = useSummaryTableLogic();

    const {
        isComparisonMode, setIsComparisonMode,
        compMode, setCompMode,
        selectedDate, setSelectedDate,
        selectedMonth, setSelectedMonth,
        selectedWeeks, handleWeekPillClick,
        customRangeA, setCustomRangeA,
        customRangeB, setCustomRangeB,
        dateDisplay, displayDescription, displayTitle,
        localDrilldownOrder, setLocalDrilldownOrder,
        isPending, getFilterProps,
        activeFilterKey, setActiveFilterKey,
        hasActiveFilters, handleResetAllFilters,
        handleExpandAll, handleCollapseAll, isExpanding, expandedIds, setExpandedIds,
        handleExport, isExporting,
        tableContainerRef, sortableListRef,
        standardSummaryData, compTree,
        activeSortConfig, displayKeys,
        grandTotal, deltaQuantity, deltaRevenue, deltaRevenueQD, deltaAOV, deltaTraGopPercent, traGopDisplayTotal,
        handleSort, toggleExpand,
        weeksInSelectedMonth, compSortConfig,
        expandLevel, visibleColumns, setVisibleColumns
    } = state;

    useEffect(() => {
        if (sortableListRef.current) {
            const sortable = new Sortable(sortableListRef.current, {
                animation: 150,
                ghostClass: 'opacity-0',
                chosenClass: 'scale-105',
                dragClass: 'opacity-100',
                onEnd: (evt: any) => {
                    const newOrder = [...localDrilldownOrder];
                    const [movedItem] = newOrder.splice(evt.oldIndex, 1);
                    newOrder.splice(evt.newIndex, 0, movedItem);
                    setLocalDrilldownOrder(newOrder);
                    setExpandedIds(new Set());
                },
            });
            return () => sortable.destroy();
        }
    }, [localDrilldownOrder, setLocalDrilldownOrder, setExpandedIds, sortableListRef]);

    if (!standardSummaryData && !compTree) return null;

    const renderDelta = (val: number, type: 'currency' | 'number' | 'percent') => {
        if (val === 0) return <span className="text-slate-300">-</span>;
        const isPositive = val > 0;
        const colorClass = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        let formattedVal = '';
        if (type === 'currency') formattedVal = formatCurrency(Math.abs(val));
        else if (type === 'percent') formattedVal = `${Math.abs(val).toFixed(0)}%`; 
        else formattedVal = formatQuantity(Math.abs(val));
        return <span className={`text-[11px] font-bold ${colorClass}`}>{isPositive ? '+' : '-'}{formattedVal}</span>;
    };

    const footerCellClass = "px-2 py-2 text-center text-[13px]";
    const footerDeltaCellClass = "px-2 py-2 text-center text-[13px]"; 
    const separatorClass = "border-r border-slate-300 dark:border-slate-600";

    // --- Helper to get options and selected state dynamically ---
    // Moved to useSummaryTableLogic.ts

    return (
        <>
            <div className={`bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border ${displayTitle === 'CHI TIẾT NGÀNH HÀNG' ? 'border-teal-100 dark:border-teal-800/60' : 'border-sky-100 dark:border-sky-800/50'} rounded-none overflow-hidden mb-8 transition-all duration-300`} ref={tableContainerRef}> 
                <header className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-6">
                    {/* TOP ROW: Title and Toggle */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#0584c7]/10 text-[#0584c7] flex items-center justify-center shadow-sm">
                                <Icon name="table" size={6} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white uppercase">
                                    {displayTitle}
                                </h1>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                                    {displayDescription}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                            <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hide-on-export">
                                <button 
                                    onClick={() => React.startTransition(() => setIsComparisonMode(false))}
                                    className={`py-1.5 px-3 sm:px-4 text-xs font-bold rounded-lg transition-all ${
                                        !isComparisonMode 
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                                    }`}
                                >
                                    Tiêu chuẩn
                                </button>
                                <button 
                                    onClick={() => React.startTransition(() => setIsComparisonMode(true))}
                                    className={`py-1.5 px-3 sm:px-4 text-xs font-bold rounded-lg transition-all ${
                                        isComparisonMode 
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                                        : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                                    }`}
                                >
                                    So sánh
                                </button>
                            </div>
                            
                            {/* Cột hiển thị */}
                            <div className="relative z-[80] hide-on-export">
                                <button
                                    onClick={() => setActiveFilterKey(prev => prev === 'columns' ? null : 'columns')}
                                    className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    title="Tùy chọn hiển thị cột"
                                >
                                    <Icon name="settings-2" size={5}/>
                                </button>
                                {activeFilterKey === 'columns' && (
                                    <div className="absolute right-0 sm:left-0 sm:right-auto md:right-0 md:left-auto mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-3 border border-slate-100 dark:border-slate-700 z-[200]">
                                        <div className="flex justify-between items-center mb-3 px-2 pt-1 border-b border-slate-50 pb-2 dark:border-slate-700/50">
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Tùy chọn hiển thị cột</h4>
                                            <button onClick={() => setActiveFilterKey(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md transition-colors"><Icon name="x" size={4}/></button>
                                        </div>
                                        <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                                            {HEADER_CONFIG.map(col => (
                                                <div key={col.key} onClick={() => setVisibleColumns((prev: string[]) => prev.includes(col.key) ? prev.filter(k => k !== col.key) : [...prev, col.key])} className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 select-none">
                                                        <div className={`p-1.5 rounded-lg ${col.colorClass}`}>
                                                            <Icon name={col.icon || 'columns'} size={3.5} />
                                                        </div>
                                                        {col.label}
                                                    </span>
                                                    <div className="relative inline-flex items-center pointer-events-none">
                                                        <input 
                                                            type="checkbox" 
                                                            className="sr-only peer" 
                                                            checked={visibleColumns.includes(col.key)} 
                                                            readOnly
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-500"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COMPARISON TOOLBAR */}
                    {isComparisonMode && (
                        <div className="animate-fade-in-down px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            
                            <div className="flex flex-wrap items-center gap-3 hide-on-export w-full lg:w-auto">
                                    {/* Mode Selector */}
                                    <select 
                                        value={compMode} 
                                        onChange={(e) => setCompMode(e.target.value as ComparisonMode)} 
                                        className="text-xs font-bold text-indigo-700 bg-slate-50 border border-slate-200 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-indigo-400 dark:border-slate-700 py-1.5 pl-3 pr-8 cursor-pointer hover:bg-white transition-colors"
                                        title={
                                            compMode === 'day_adjacent' ? "So sánh trực tiếp kết quả của ngày được chọn so với ngày hôm trước (VD: Thứ Ba so với Thứ Hai). Giúp theo dõi tốc độ biến động hàng ngày." :
                                            compMode === 'day_same_period' ? "So sánh ngày được chọn với ngày cùng số của tháng trước (VD: 15/03 vs 15/02). Dùng để loại bỏ biến động nhất thời khi đầu/cuối tháng." :
                                            compMode === 'week_adjacent' ? "So sánh một tuần với tuần liền kề trước đó trong cùng 1 tháng. Theo dõi nhịp chạy số giữa các tuần trong kỳ lương." :
                                            compMode === 'week_same_period' ? "So sánh tuần thứ N của tháng này với tuần thứ N tương ứng của tháng trước. Cho cái nhìn đối chiếu cùng giai đoạn tuần." :
                                            compMode === 'month_adjacent' ? "Đối chiếu toàn bộ doanh số của 1 tháng so với tháng liền kề ngay trước nó." :
                                            compMode === 'month_same_period_year' ? "So sánh tháng này năm nay với CHÍNH THÁNG NÀY CỦA NĂM NGOÁI. Đây là tiêu chí vàng (YoY) để loại bỏ tính chu kỳ mùa vụ." :
                                            compMode === 'quarter_adjacent' ? "Gom dữ liệu 3 tháng của Quý được chọn đo với Quý liền kề. Thích hợp đánh giá chiến dịch trung hạn." :
                                            compMode === 'quarter_same_period_year' ? "So sánh số liệu cả Quý năm nay với năng lực của chính Quý đó năm ngoái." :
                                            compMode === 'ytd_same_period_year' ? "Lũy kế từ ngày 01/01 đến thời điểm được chọn, so sánh với cùng khoảng thời gian năm trước. Xem xét tiến độ KPI năm." :
                                            "So sánh tùy chọn tự do giữa 2 khoảng thời gian bất kỳ mà bạn muốn."
                                        }
                                    >
                                        <option value="day_adjacent">Ngày (Liền kề)</option>
                                        <option value="day_same_period">Ngày (CK tháng trước)</option>
                                        <option value="week_adjacent">Tuần (Liền kề trong tháng)</option>
                                        <option value="week_same_period">Tuần (CK tháng trước)</option>
                                        <option value="month_adjacent">Tháng (Liền kề)</option>
                                        <option value="month_same_period_year">Tháng (Cùng kỳ năm trước)</option>
                                        <option value="quarter_adjacent">Quý (Liền kề)</option>
                                        <option value="quarter_same_period_year">Quý (Cùng kỳ năm trước)</option>
                                        <option value="ytd_same_period_year">Lũy kế (YTD) - Cùng kỳ</option>
                                        <option value="custom_range">Khoảng thời gian (Tùy chỉnh)</option>
                                    </select>
                                    
                                    {/* Compact Inputs based on Mode */}
                                    {(compMode.startsWith('day') || compMode === 'ytd_same_period_year') && (
                                        <div className="flex items-center gap-1">
                                            {compMode === 'ytd_same_period_year' && <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">Đến ngày:</span>}
                                            <input 
                                                type="date" 
                                                value={selectedDate} 
                                                onChange={e => setSelectedDate(e.target.value)} 
                                                className="text-xs border-slate-300 rounded shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:border-slate-600 py-1 px-2" 
                                            />
                                        </div>
                                    )}

                                    {(compMode.startsWith('week') || compMode.startsWith('month')) && (
                                        <input 
                                            type="month" 
                                            value={selectedMonth} 
                                            onChange={e => setSelectedMonth(e.target.value)} 
                                            className="text-xs border-slate-300 rounded shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:border-slate-600 py-1 px-2" 
                                        />
                                    )}

                                    {compMode.startsWith('quarter') && (
                                        <div className="flex items-center gap-1.5">
                                            <select 
                                                value={Math.floor((Number(selectedMonth.split('-')[1]) - 1) / 3) + 1}
                                                onChange={e => {
                                                    const q = Number(e.target.value);
                                                    const m = (q - 1) * 3 + 1;
                                                    const y = selectedMonth.split('-')[0];
                                                    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
                                                }}
                                                className="text-xs font-semibold text-slate-700 border-slate-300 rounded shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 py-1 px-1.5"
                                            >
                                                <option value={1}>Quý 1</option>
                                                <option value={2}>Quý 2</option>
                                                <option value={3}>Quý 3</option>
                                                <option value={4}>Quý 4</option>
                                            </select>
                                            <input 
                                                type="number" 
                                                value={selectedMonth.split('-')[0]} 
                                                onChange={e => {
                                                    const m = selectedMonth.split('-')[1] || '01';
                                                    setSelectedMonth(`${e.target.value}-${m}`);
                                                }} 
                                                className="text-xs font-semibold border-slate-300 w-16 rounded shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:border-slate-600 py-1 px-1.5" 
                                            />
                                        </div>
                                    )}

                                    {/* Pill Selector for Weeks */}
                                    {compMode.startsWith('week') && weeksInSelectedMonth.length > 0 && (
                                        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                                            {weeksInSelectedMonth.map(w => {
                                                const isSelected = selectedWeeks.includes(w.id);
                                                return (
                                                    <button
                                                        key={w.id}
                                                        onClick={() => handleWeekPillClick(w.id)}
                                                        className={`whitespace-nowrap px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-full border transition-colors ${
                                                            isSelected 
                                                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm' 
                                                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                                                        }`}
                                                        title={w.label}
                                                    >
                                                        {w.shortLabel}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Custom Range Inputs */}
                                    {compMode === 'custom_range' && (
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">Kỳ A:</span>
                                                <input type="date" value={customRangeA.start} onChange={e => setCustomRangeA(p => ({ ...p, start: e.target.value }))} className="text-xs border-none bg-transparent focus:ring-0 p-0 w-24" />
                                                <span className="text-slate-400 text-xs">-</span>
                                                <input type="date" value={customRangeA.end} onChange={e => setCustomRangeA(p => ({ ...p, end: e.target.value }))} className="text-xs border-none bg-transparent focus:ring-0 p-0 w-24" />
                                            </div>
                                            <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Kỳ B:</span>
                                                <input type="date" value={customRangeB.start} onChange={e => setCustomRangeB(p => ({ ...p, start: e.target.value }))} className="text-xs border-none bg-transparent focus:ring-0 p-0 w-24" />
                                                <span className="text-slate-400 text-xs">-</span>
                                                <input type="date" value={customRangeB.end} onChange={e => setCustomRangeB(p => ({ ...p, end: e.target.value }))} className="text-xs border-none bg-transparent focus:ring-0 p-0 w-24" />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Tooltip removed as now embedded in select title */}
                                </div>

                                {/* Mini Analysis Charts & Target Badges */}
                                {compTree && (
                                    <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 w-full xl:w-auto mt-4 xl:mt-0 pt-4 xl:pt-0 border-t xl:border-t-0 border-teal-200/50 dark:border-teal-700/50">
                                        
                                        {/* CSS Mini Bar Charts for Totals */}
                                        <div className="flex gap-6 w-full md:w-auto">
                                            {/* Quantity Chart */}
                                            {(() => {
                                                const currentQty = grandTotal.totalQuantity;
                                                const prevQty = compTree.prev?.grandTotal?.totalQuantity || 0;
                                                const maxQty = Math.max(currentQty, prevQty);
                                                const curPct = maxQty ? (currentQty / maxQty) * 100 : 0;
                                                const prevPct = maxQty ? (prevQty / maxQty) * 100 : 0;
                                                const deltaQty = currentQty - prevQty;
                                                const isUpQty = deltaQty >= 0;
                                                
                                                return (
                                                    <div className="flex flex-col justify-end gap-1 w-[120px]">
                                                        <div className="flex justify-between items-end mb-1">
                                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">SỐ LƯỢNG</span>
                                                            <span className={`text-[10px] font-bold ${isUpQty ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                {isUpQty ? '+' : ''}{formatQuantity(deltaQty)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 tooltip-trigger" title={`Hiện tại: ${formatQuantity(currentQty)}`}>
                                                            <div className="flex-1 h-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-r-full overflow-hidden">
                                                                <div className="h-full bg-teal-500 rounded-r-full transition-all duration-700" style={{ width: `${curPct}%` }}></div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 tooltip-trigger" title={`So sánh: ${formatQuantity(prevQty)}`}>
                                                            <div className="flex-1 h-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-r-full overflow-hidden">
                                                                <div className="h-full bg-slate-400 dark:bg-slate-500 rounded-r-full transition-all duration-700" style={{ width: `${prevPct}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            
                                            {/* Revenue Chart */}
                                            {(() => {
                                                const currentRev = grandTotal.totalRevenue;
                                                const prevRev = compTree.prev?.grandTotal?.totalRevenue || 0;
                                                const maxRev = Math.max(currentRev, prevRev);
                                                const curPct = maxRev ? (currentRev / maxRev) * 100 : 0;
                                                const prevPct = maxRev ? (prevRev / maxRev) * 100 : 0;
                                                const deltaRev = currentRev - prevRev;
                                                const isUpRev = deltaRev >= 0;
                                                
                                                return (
                                                    <div className="flex flex-col justify-end gap-1 w-[120px]">
                                                        <div className="flex justify-between items-end mb-1">
                                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">DOANH THU</span>
                                                            <span className={`text-[10px] font-bold ${isUpRev ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                {isUpRev ? '+' : ''}{formatCurrency(deltaRev, 0)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 tooltip-trigger" title={`Hiện tại: ${formatCurrency(currentRev)}`}>
                                                            <div className="flex-1 h-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-r-full overflow-hidden">
                                                                <div className="h-full bg-teal-500 rounded-r-full transition-all duration-700" style={{ width: `${curPct}%` }}></div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 tooltip-trigger" title={`So sánh: ${formatCurrency(prevRev)}`}>
                                                            <div className="flex-1 h-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-r-full overflow-hidden">
                                                                <div className="h-full bg-slate-400 dark:bg-slate-500 rounded-r-full transition-all duration-700" style={{ width: `${prevPct}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Divider */}
                                        <div className="hidden md:block w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                                        {/* Compact Comparison Badge */}
                                        <div className="flex flex-wrap items-center justify-center gap-2.5">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded border border-teal-200/50 dark:border-teal-700/50 shadow-sm">
                                                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                                                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-200 whitespace-nowrap">HT: {dateDisplay.current}</span>
                                            </div>
                                            <Icon name="arrow-right" size={3.5} className="text-slate-400" />
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded border border-slate-200/70 dark:border-slate-700/50 shadow-sm">
                                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">SS: {dateDisplay.prev}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}

                    {/* CONTROL BAR */}
                    <div className="relative z-[70] flex flex-wrap items-center justify-between gap-3 hide-on-export pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        {/* New Configurable Level Order UI (Drag & Drop Enabled) */}
                        <div className="flex flex-col gap-1 w-full lg:w-auto">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cấu trúc hiển thị & Lọc (Kéo thả để sắp xếp):</span>
                            <div className={`flex flex-wrap items-center gap-2 ${isPending ? 'opacity-50 pointer-events-none' : ''}`} ref={sortableListRef}>
                                {localDrilldownOrder.map((key, index) => {
                                    const colorClass = PILL_COLORS[key] || 'bg-slate-100 text-slate-700 border-slate-200';
                                    const iconName = PILL_ICONS[key] || 'box';
                                    const { options, selected, onChange } = getFilterProps(key);
                                    
                                    // Determine alignment based on index to prevent overflow
                                    // First 2 items align left, others default to right (via prop default)
                                    const alignment = index < 2 ? 'left' : 'right';

                                    return (
                                        <div key={key} className={`flex items-center ${colorClass} border rounded-full pl-3 pr-2 py-1 cursor-move transition-transform hover:scale-105 shadow-sm select-none group relative`}>
                                            <Icon name={iconName} size={3} className="mr-1.5 opacity-70" />
                                            <span className="text-xs font-bold mr-1">{ORDER_LABELS[key]}</span>
                                            {/* Integrated Filter Popover */}
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
                                
                                {/* Reset Button - Only show if any filters are active */}
                                {hasActiveFilters && (
                                    <div className="flex items-center gap-1.5 hide-on-export">
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
                        
                        <div className="flex items-center gap-3 ml-auto mt-2 lg:mt-0">
                            {/* Nút Expand/Collapse */}
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
                </div>
            </header>

           <div className={`relative p-6 bg-white dark:bg-slate-800 transition-opacity duration-200 ${isPending || isExpanding ? 'opacity-60' : 'opacity-100'}`}>
              {isExpanding && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px]">
                      <div className="flex flex-col items-center p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
                          <Icon name="loader-2" size={8} className="animate-spin text-teal-600 dark:text-teal-400 mb-3" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Đang chuẩn bị khung dữ liệu bảng...</span>
                      </div>
                  </div>
              )}
              {/* Thicker fresh outer border */}
              <div className="overflow-hidden border border-slate-100 dark:border-slate-700 rounded-none">
                  <table className="w-full min-w-full table-auto compact-export-table border-collapse" id="summary-table">
                      {/* HEADER */}
                      <thead>
                        {isComparisonMode ? (
                            <>
                                <tr>
                                    <th 
                                        rowSpan={2} 
                                        scope="col" 
                                        className={`px-4 py-2 text-center uppercase text-sm font-bold tracking-wider text-slate-700 dark:text-slate-300 shadow-sm border-b-4 border-slate-200 dark:border-slate-700 bg-slate-50 sticky left-0 z-40 dark:bg-[#1c1c1e]`}
                                    >
                                        DANH MỤC
                                    </th>
                                    {HEADER_CONFIG.filter(h => h.showInComparison && visibleColumns.includes(h.key)).map(h => (
                                        <th 
                                            key={h.key} 
                                            colSpan={h.singleColumnInCompare ? 1 : 2} 
                                            scope="col" 
                                            className={`px-2 py-2 text-center text-sm font-bold uppercase tracking-wider border-b ${h.colorClass} ${separatorClass}`}
                                        >
                                            {h.label}
                                        </th>
                                    ))}
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 border-b-4 border-slate-200 dark:border-slate-700">
                                    {HEADER_CONFIG.filter(h => h.showInComparison && visibleColumns.includes(h.key)).map(h => {
                                        if (h.singleColumnInCompare) {
                                            return (
                                                <th 
                                                    key={`${h.key}-delta`}
                                                    className={`px-2 py-1 text-center text-[10px] font-bold uppercase ${h.colorClass} border-b border-r border-slate-200/50 cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/40`}
                                                    onClick={() => handleSort(h.key, 'delta')}
                                                >
                                                    <div className="flex items-center justify-center gap-1">
                                                        {h.compareLabel || '+/-'}
                                                    </div>
                                                </th>
                                            );
                                        }
                                        return (
                                            <React.Fragment key={`${h.key}-sub`}>
                                            <th 
                                                className={`px-2 py-1 text-center text-[10px] font-bold uppercase ${h.colorClass} border-b border-r border-slate-200/50 cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/40`}
                                                onClick={() => handleSort(h.key, 'current')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    H.TẠI
                                                    {compSortConfig.column === h.key && compSortConfig.type === 'current' && (
                                                        <Icon name={compSortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />
                                                    )}
                                                </div>
                                            </th>
                                            <th 
                                                className={`px-2 py-1 text-center text-[10px] font-bold uppercase ${h.colorClass} border-b ${separatorClass} cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/40`}
                                                onClick={() => handleSort(h.key, 'delta')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    +/-
                                                    {compSortConfig.column === h.key && compSortConfig.type === 'delta' && (
                                                        <Icon name={compSortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />
                                                    )}
                                                </div>
                                            </th>
                                        </React.Fragment>
                                        );
                                    })}
                                </tr>
                            </>
                        ) : (
                            <tr>
                                <th scope="col" className={`px-4 py-2 text-left uppercase text-sm font-bold tracking-wider text-slate-700 dark:text-slate-300 border-b-4 border-slate-200 dark:border-slate-700 bg-slate-50 sticky left-0 z-40 dark:bg-[#1c1c1e] ${separatorClass}`}>DANH MỤC</th>
                                {HEADER_CONFIG.filter(h => visibleColumns.includes(h.key)).map((h, index) => {
                                    return (
                                        <th key={h.key} scope="col" onClick={() => handleSort(h.key)} className={`px-4 py-2 text-center uppercase text-sm font-bold tracking-wider border-b-4 border-slate-200 cursor-pointer hover:opacity-80 transition-opacity ${separatorClass} ${h.colorClass}`}>
                                            <div className="flex items-center justify-center gap-1">
                                                {h.label}
                                                {activeSortConfig.column === h.key && <Icon name={activeSortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        )}
                      </thead>
                       <tbody>
                           {displayKeys.length > 0 ? (
                                displayKeys.map((key, index) => (
                                   <RecursiveRow 
                                        key={key} 
                                        nodeKey={key} 
                                        currentNode={isComparisonMode && compTree ? compTree.current.data[key] : standardSummaryData?.data[key]}
                                        prevNode={isComparisonMode && compTree ? compTree.prev.data[key] : undefined}
                                        level={1} 
                                        parentId="root" 
                                        expandedIds={expandedIds} 
                                        toggleExpand={toggleExpand} 
                                        rootIndex={index} 
                                        isComparisonMode={isComparisonMode}
                                        sortConfig={activeSortConfig}
                                        drilldownOrder={localDrilldownOrder}
                                        parentRevenue={grandTotal.totalRevenue}
                                        parentQuantity={grandTotal.totalQuantity}
                                        visibleColumns={visibleColumns}
                                    />
                                ))
                            ) : (
                                 <tr><td colSpan={visibleColumns.length * (isComparisonMode ? 2 : 1) + 1} className="text-center p-8 text-slate-500">Không có dữ liệu để hiển thị.</td></tr>
                            )}
                        </tbody>
                        <tfoot className="bg-teal-100 dark:bg-teal-900/40 font-bold text-sm border-t-2 border-teal-200 dark:border-teal-800">
                           <tr>
                                <td className={`px-4 py-2 text-center sticky left-0 z-40 bg-teal-100 dark:bg-teal-900/60 font-extrabold text-[12px] uppercase tracking-widest text-teal-700 dark:text-teal-300 ${separatorClass}`}>TỔNG CỘNG</td>
                                {/* Quantity */}
                                <td className={`${footerCellClass} font-bold text-slate-700 dark:text-slate-300 ${!isComparisonMode ? separatorClass : ''}`}>{formatQuantity(grandTotal.totalQuantity)}</td>
                                {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaQuantity, 'number')}</td>}
                                
                                {/* %SL */}
                                {(() => {
                                    const h = HEADER_CONFIG.find(c => c.key === 'slPercent');
                                    if (!h || !visibleColumns.includes(h.key)) return null;

                                    if (!isComparisonMode) {
                                        return <td className={`${footerCellClass} font-bold text-emerald-600 dark:text-emerald-400 ${separatorClass}`}>
                                            {grandTotal.totalQuantity > 0 ? '100.0%' : '-'}
                                        </td>;
                                    } else {
                                        const prevQty = compTree?.prev?.grandTotal?.totalQuantity || 0;
                                        const currentQty = grandTotal.totalQuantity;
                                        const deltaPct = prevQty > 0 ? ((currentQty - prevQty) / prevQty) * 100 : (currentQty > 0 ? 100 : 0);
                                        return <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaPct, 'percent')}</td>;
                                    }
                                })()}
                                
                                {/* Revenue */}
                                {visibleColumns.includes('totalRevenue') && (
                                    <>
                                        <td className={`${footerCellClass} font-extrabold text-slate-800 dark:text-slate-200 ${!isComparisonMode ? separatorClass : ''}`}>{formatCurrency(grandTotal.totalRevenue)}</td>
                                        {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaRevenue, 'currency')}</td>}
                                    </>
                                )}

                                {/* %DT THỰC */}
                                {(() => {
                                    const h = HEADER_CONFIG.find(c => c.key === 'dtThucPercent');
                                    if (!h || !visibleColumns.includes(h.key)) return null;

                                    if (!isComparisonMode) {
                                        return <td className={`${footerCellClass} font-bold text-orange-600 dark:text-orange-400 ${separatorClass}`}>
                                            {grandTotal.totalRevenue > 0 ? '100.0%' : '-'}
                                        </td>;
                                    } else {
                                        const prevRev = compTree?.prev?.grandTotal?.totalRevenue || 0;
                                        const currentRev = grandTotal.totalRevenue;
                                        const deltaPct = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : (currentRev > 0 ? 100 : 0);
                                        return <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaPct, 'percent')}</td>;
                                    }
                                })()}

                                {/* RevenueQD */}
                                {visibleColumns.includes('totalRevenueQD') && (
                                    <>
                                        <td className={`${footerCellClass} font-extrabold text-teal-700 dark:text-teal-300 ${!isComparisonMode ? separatorClass : ''}`}>{formatCurrency(grandTotal.totalRevenueQD)}</td>
                                        {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaRevenueQD, 'currency')}</td>}
                                    </>
                                )}

                                {/* AOV */}
                                <td className={`${footerCellClass} font-bold text-slate-700 dark:text-slate-300 ${!isComparisonMode ? separatorClass : ''}`}>
                                    {grandTotal.aov === 0 ? '-' : (grandTotal.aov / 1000000).toFixed(1)}
                                </td>
                                {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaAOV, 'currency')}</td>}

                                {/* Tra Gop */}
                                <td className={`${footerCellClass} ${getTraGopPercentClass(grandTotal.traGopPercent)} ${!isComparisonMode ? separatorClass : ''}`}>{traGopDisplayTotal}</td>
                                {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaTraGopPercent, 'percent')}</td>}
                           </tr>
                        </tfoot>
                  </table>
              </div>
           </div>
        </div>
        </>
    );
});

SummaryTable.displayName = 'SummaryTable';

export default SummaryTable;
