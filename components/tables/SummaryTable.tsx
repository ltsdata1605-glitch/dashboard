
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
        toggleAllLevels, expandedIds, setExpandedIds,
        handleExport, isExporting,
        tableContainerRef, sortableListRef,
        standardSummaryData, compTree,
        activeSortConfig, displayKeys,
        grandTotal, deltaQuantity, deltaRevenue, deltaRevenueQD, deltaAOV, deltaTraGopPercent, traGopDisplayTotal,
        handleSort, toggleExpand,
        weeksInSelectedMonth, compSortConfig
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
            <div className="bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-sky-100 dark:border-sky-900/30 overflow-hidden rounded-none mb-8 transition-all duration-300" ref={tableContainerRef}> 
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
                        
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 rounded-2xl p-1.5 border border-slate-200 dark:border-white/5 shadow-inner hide-on-export">
                            <button 
                                onClick={() => setIsComparisonMode(false)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    !isComparisonMode 
                                    ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-primary-400 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                Tiêu chuẩn
                            </button>
                            <button 
                                onClick={() => setIsComparisonMode(true)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    isComparisonMode 
                                    ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-primary-400 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                So sánh
                            </button>
                        </div>
                    </div>

                    {/* COMPARISON TOOLBAR */}
                    {isComparisonMode && (
                        <div className="animate-fade-in-down p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-100 dark:border-primary-800 flex flex-col gap-3">
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="flex items-center gap-3 flex-wrap hide-on-export w-full md:w-auto">
                                    {/* Mode Selector */}
                                    <select 
                                        value={compMode} 
                                        onChange={(e) => setCompMode(e.target.value as ComparisonMode)} 
                                        className="text-xs font-bold text-primary-800 bg-white border-primary-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:text-primary-300 dark:border-slate-600 py-1.5 pl-2 pr-8"
                                    >
                                        <option value="day_adjacent">Ngày (Liền kề)</option>
                                        <option value="day_same_period">Ngày (CK tháng trước)</option>
                                        <option value="week_adjacent">Tuần (Liền kề trong tháng)</option>
                                        <option value="week_same_period">Tuần (CK tháng trước)</option>
                                        <option value="month_adjacent">Tháng (Liền kề)</option>
                                        <option value="custom_range">Khoảng thời gian (Tùy chỉnh)</option>
                                    </select>
                                    
                                    {/* Compact Inputs based on Mode */}
                                    {compMode.startsWith('day') && (
                                        <input 
                                            type="date" 
                                            value={selectedDate} 
                                            onChange={e => setSelectedDate(e.target.value)} 
                                            className="text-xs border-slate-300 rounded shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:border-slate-600 py-1 px-2" 
                                        />
                                    )}

                                    {(compMode.startsWith('week') || compMode === 'month_adjacent') && (
                                        <input 
                                            type="month" 
                                            value={selectedMonth} 
                                            onChange={e => setSelectedMonth(e.target.value)} 
                                            className="text-xs border-slate-300 rounded shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:border-slate-600 py-1 px-2" 
                                        />
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
                                                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm' 
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
                                                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400">Kỳ A:</span>
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
                                </div>

                                <div className="flex items-center gap-4 flex-grow justify-center md:justify-end">
                                    <div className="text-center">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Kỳ hiện tại</p>
                                        <p className="text-sm font-extrabold text-primary-600 dark:text-primary-400 whitespace-nowrap">{dateDisplay.current}</p>
                                    </div>
                                    <div className="text-lg text-slate-300 font-light">vs</div>
                                    <div className="text-center">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Kỳ so sánh</p>
                                        <p className="text-sm font-extrabold text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateDisplay.prev}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Description Logic */}
                            {displayDescription && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic border-t border-primary-200 dark:border-primary-800/50 pt-1.5">
                                    <Icon name="info" size={3} className="inline mr-1" />
                                    {displayDescription}
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
                                    <button
                                        onClick={handleResetAllFilters}
                                        className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-1"
                                        title="Làm mới tất cả bộ lọc"
                                    >
                                        <Icon name="rotate-ccw" size={4} />
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 ml-auto mt-2 lg:mt-0">
                            {/* Removed standalone dropdowns, now integrated into pills */}
                            <button onClick={toggleAllLevels} title={expandedIds.size > 0 ? 'Thu gọn' : 'Mở rộng'} className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <Icon name="chevrons-down-up" size={4} />
                            </button>
                            <button onClick={handleExport} disabled={isExporting} title="Xuất Ảnh" className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                               {isExporting ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="camera" />}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

           <div className={`p-6 bg-white dark:bg-slate-800 transition-opacity duration-200 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
              {/* Thicker fresh outer border */}
              <div className="overflow-hidden border-2 border-primary-400 dark:border-slate-600">
                  <table className="min-w-full compact-export-table border-collapse" id="summary-table">
                      {/* HEADER */}
                      <thead>
                        {isComparisonMode ? (
                            <>
                                <tr>
                                    <th 
                                        rowSpan={2} 
                                        scope="col" 
                                        className={`px-4 py-2 text-center uppercase text-sm font-bold tracking-wider text-primary-800 dark:text-primary-200 shadow-md border-b bg-primary-50 sticky left-0 z-40 border-r border-slate-300 dark:bg-slate-900`}
                                    >
                                        DANH MỤC
                                    </th>
                                    {HEADER_CONFIG.filter(h => h.showInComparison).map(h => (
                                        <th 
                                            key={h.key} 
                                            colSpan={2} 
                                            scope="col" 
                                            className={`px-2 py-2 text-center text-sm font-bold uppercase tracking-wider border-b ${h.colorClass} ${separatorClass}`}
                                        >
                                            {h.label}
                                        </th>
                                    ))}
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 border-b-4 border-primary-100 dark:border-slate-600">
                                    {HEADER_CONFIG.filter(h => h.showInComparison).map(h => (
                                        <React.Fragment key={`${h.key}-sub`}>
                                            <th 
                                                className={`px-2 py-1 text-center text-[10px] font-bold uppercase ${h.colorClass} border-b border-r border-slate-200/50 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/40`}
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
                                                className={`px-2 py-1 text-center text-[10px] font-bold uppercase ${h.colorClass} border-b ${separatorClass} cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/40`}
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
                                    ))}
                                </tr>
                            </>
                        ) : (
                            <tr>
                                <th scope="col" className={`px-4 py-2 text-left uppercase text-sm font-bold tracking-wider text-teal-800 dark:text-teal-200 border-b-4 border-teal-200 bg-teal-50 sticky left-0 z-40 dark:bg-slate-900 ${separatorClass}`}>DANH MỤC</th>
                                {HEADER_CONFIG.map((h, index) => {
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
                                    />
                                ))
                            ) : (
                                 <tr><td colSpan={HEADER_CONFIG.length * 2 + 1} className="text-center p-8 text-slate-500">Không có dữ liệu để hiển thị.</td></tr>
                            )}
                        </tbody>
                        {/* FOOTER */}
                        <tfoot className="bg-teal-100 dark:bg-teal-900/40 font-bold text-sm border-t-2 border-teal-200 dark:border-teal-800">
                           <tr>
                                <td className={`px-4 py-2 text-center sticky left-0 z-40 bg-teal-100 dark:bg-teal-900/60 font-extrabold text-[12px] uppercase tracking-widest text-teal-700 dark:text-teal-300 ${separatorClass}`}>ỔNG CỘNG</td>
                                {/* Quantity */}
                                <td className={`${footerCellClass} font-bold text-slate-700 dark:text-slate-300 ${!isComparisonMode ? separatorClass : ''}`}>{formatQuantity(grandTotal.totalQuantity)}</td>
                                {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaQuantity, 'number')}</td>}
                                
                                {/* Revenue */}
                                <td className={`${footerCellClass} font-extrabold text-slate-800 dark:text-slate-200 ${!isComparisonMode ? separatorClass : ''}`}>{formatCurrency(grandTotal.totalRevenue)}</td>
                                {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaRevenue, 'currency')}</td>}

                                {/* RevenueQD */}
                                <td className={`${footerCellClass} font-extrabold text-teal-700 dark:text-teal-300 ${!isComparisonMode ? separatorClass : ''}`}>{formatCurrency(grandTotal.totalRevenueQD)}</td>
                                {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaRevenueQD, 'currency')}</td>}

                                {/* AOV */}
                                <td className={`${footerCellClass} font-bold text-slate-700 dark:text-slate-300 ${!isComparisonMode ? separatorClass : ''}`}>{formatCurrency(grandTotal.aov, 1)}</td>
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
