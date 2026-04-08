
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
import { MonthlyTrendTableRow } from './MonthlyTrendTableRow';
import { MonthlyTrendTable } from './MonthlyTrendTable';

import { FilterPopover } from './summary/FilterPopover';
import { 
    getTraGopPercentClass, formatCompactDateRange, toInputDate, toInputMonth,
    getWeeksInMonth, getSafeDateInPrevMonth, HEADER_CONFIG, ORDER_LABELS,
    PILL_ICONS, PILL_COLORS
} from './summary/SummaryTableUtils';
import { useSummaryTableLogic } from './summary/useSummaryTableLogic';
import { CrossSellingTable } from './summary/CrossSellingTable';
import CrossSellingBuilderModal from '../modals/CrossSellingBuilderModal';
import { useAuth } from '../../contexts/AuthContext';
import { SummaryTableHeader } from './summary/SummaryTableHeader';
import { SummaryTableComparisonBar } from './summary/SummaryTableComparisonBar';
import { SummaryTableFilterBar } from './summary/SummaryTableFilterBar';

interface SummaryTableProps {}

type ComparisonMode = 'day_adjacent' | 'day_same_period' | 'week_adjacent' | 'week_same_period' | 'month_adjacent' | 'custom_range';

const SummaryTable: React.FC<SummaryTableProps> = React.memo(() => {
    const { userRole } = useAuth();
    const { filterState, kpiTargets } = useDashboardContext();
    const state = useSummaryTableLogic();
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const {
        tableMode, setTableMode,
        isComparisonMode, isCrossSellingMode,
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
        expandLevel, visibleColumns, setVisibleColumns, daysCountData, trendData,
        trendSelectedMonths, setTrendSelectedMonths
    } = state;

    const columnsPopupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeFilterKey === 'columns' && columnsPopupRef.current && !columnsPopupRef.current.contains(event.target as Node)) {
                setActiveFilterKey(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [activeFilterKey, setActiveFilterKey]);

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
    const separatorClass = "border-r border-slate-200 dark:border-slate-700";

    // --- Helper to get options and selected state dynamically ---
    // Moved to useSummaryTableLogic.ts

    const fullScreenClasses = isFullScreen 
        ? "fixed inset-0 z-[1000] bg-white dark:bg-slate-900 overflow-y-auto w-full h-full p-4 custom-scrollbar" 
        : `bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border ${displayTitle === 'CHI TIẾT NGÀNH HÀNG' ? 'border-teal-100 dark:border-teal-800/60' : 'border-sky-100 dark:border-sky-800/50'} rounded-none overflow-hidden mb-8 transition-all duration-300`;

    return (
        <>
            <div className={fullScreenClasses} ref={tableContainerRef}> 
                <SummaryTableHeader
                    displayTitle={displayTitle}
                    displayDescription={displayDescription}
                    filterState={filterState}
                    tableMode={tableMode}
                    setTableMode={setTableMode}
                    isCrossSellingMode={isCrossSellingMode}
                    userRole={userRole}
                    setIsBuilderOpen={setIsBuilderOpen}
                    isComparisonMode={isComparisonMode}
                    compMode={compMode}
                    handleExport={handleExport}
                    isExporting={isExporting}
                    activeFilterKey={activeFilterKey}
                    setActiveFilterKey={setActiveFilterKey}
                    visibleColumns={visibleColumns}
                    setVisibleColumns={setVisibleColumns}
                    columnsPopupRef={columnsPopupRef}
                    isFullScreen={isFullScreen}
                    setIsFullScreen={setIsFullScreen}
                />

                {isComparisonMode && (
                    <SummaryTableComparisonBar
                        compMode={compMode}
                        setCompMode={setCompMode}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        selectedMonth={selectedMonth}
                        setSelectedMonth={setSelectedMonth}
                        weeksInSelectedMonth={weeksInSelectedMonth}
                        selectedWeeks={selectedWeeks as any}
                        handleWeekPillClick={handleWeekPillClick as any}
                        trendData={trendData}
                        trendSelectedMonths={trendSelectedMonths}
                        setTrendSelectedMonths={setTrendSelectedMonths}
                        customRangeA={customRangeA}
                        setCustomRangeA={setCustomRangeA}
                        customRangeB={customRangeB}
                        setCustomRangeB={setCustomRangeB}
                        compTree={compTree}
                        grandTotal={grandTotal}
                        dateDisplay={dateDisplay}
                    />
                )}

                <SummaryTableFilterBar
                    isCrossSellingMode={isCrossSellingMode}
                    isPending={isPending}
                    sortableListRef={sortableListRef}
                    localDrilldownOrder={localDrilldownOrder}
                    getFilterProps={getFilterProps}
                    activeFilterKey={activeFilterKey}
                    setActiveFilterKey={setActiveFilterKey}
                    hasActiveFilters={hasActiveFilters}
                    handleExpandAll={handleExpandAll}
                    handleCollapseAll={handleCollapseAll}
                    handleResetAllFilters={handleResetAllFilters}
                    expandLevel={expandLevel}
                    handleExport={handleExport}
                    isExporting={isExporting}
                />


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
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-none hide-scrollbar touch-pan-x">
                  {isCrossSellingMode ? (
                      <CrossSellingTable tableContainerRef={tableContainerRef} />
                  ) : compMode === 'monthly_trend' && trendData ? (
                      <MonthlyTrendTable 
                          trendData={{
                              ...trendData,
                              months: trendData.months.filter((m: any) => trendSelectedMonths.includes(m.id))
                          }}
                          displayKeys={displayKeys}
                          visibleColumns={visibleColumns}
                          expandedIds={expandedIds}
                          toggleExpand={toggleExpand}
                          localDrilldownOrder={localDrilldownOrder}
                          activeSortConfig={activeSortConfig}
                      />
                  ) : (
                  <table className="w-full table-fixed compact-export-table border-collapse" id="summary-table">
                      {/* HEADER */}
                      <thead>
                        {isComparisonMode ? (
                            <>
                                <tr>
                                    <th 
                                        rowSpan={2} 
                                        scope="col" 
                                        className={`w-[40%] md:w-[30%] lg:w-[350px] px-4 py-2 text-center uppercase text-sm font-bold tracking-wider text-slate-700 dark:text-slate-300 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 bg-slate-50 sticky left-0 z-40 dark:bg-[#1c1c1e]`}
                                    >
                                        DANH MỤC
                                    </th>
                                    {(() => {
                                        const visibleHeaders = HEADER_CONFIG.filter(h => h.showInComparison && visibleColumns.includes(h.key));
                                        const elements: React.ReactNode[] = [];
                                        let currentGroup: string | null = null;
                                        let groupChildren: any[] = [];
                                        
                                        const flushGroup = () => {
                                            if (currentGroup && groupChildren.length > 0) {
                                                const colorClass = groupChildren[0].colorClass;
                                                const totalColSpan = groupChildren.reduce((acc, h) => acc + (h.singleColumnInCompare ? 1 : 2), 0);
                                                elements.push(
                                                    <th 
                                                        key={`group-${currentGroup}`} 
                                                        colSpan={totalColSpan} 
                                                        scope="col" 
                                                        className={`px-2 py-2 text-center text-sm font-bold uppercase tracking-wider border-b ${colorClass} ${separatorClass}`}
                                                    >
                                                        {currentGroup}
                                                    </th>
                                                );
                                            } else if (!currentGroup && groupChildren.length > 0) {
                                                groupChildren.forEach(h => {
                                                    const colSpan = h.singleColumnInCompare ? 1 : 2;
                                                    elements.push(
                                                        <th 
                                                            key={`ungrouped-${h.key}`} 
                                                            colSpan={colSpan} 
                                                            scope="col" 
                                                            className={`px-2 py-2 text-center text-sm font-bold uppercase tracking-wider border-b ${h.colorClass} ${separatorClass}`}
                                                        >
                                                            {h.label}
                                                        </th>
                                                    );
                                                });
                                            }
                                        };

                                        visibleHeaders.forEach(h => {
                                            if (h.group !== currentGroup) {
                                                flushGroup();
                                                currentGroup = h.group || null;
                                                groupChildren = [h];
                                            } else {
                                                groupChildren.push(h);
                                            }
                                        });
                                        flushGroup();
                                        return elements;
                                    })()}
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                    {HEADER_CONFIG.filter(h => h.showInComparison && visibleColumns.includes(h.key)).map(h => {
                                        if (h.singleColumnInCompare) {
                                            return (
                                                <th 
                                                    key={`${h.key}-delta`}
                                                    className={`px-2 py-1 text-center text-[10px] font-bold uppercase ${h.colorClass} border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/40`}
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
                                                className={`px-2 py-1 text-center text-[10px] font-bold uppercase ${h.colorClass} border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/40`}
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
                                                className={`px-2 py-1 text-center text-[10px] font-bold uppercase ${h.colorClass} border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 ${separatorClass} cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/40`}
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
                            <>
                                <tr>
                                    <th 
                                        rowSpan={2} 
                                        scope="col" 
                                        className={`w-[40%] md:w-[30%] lg:w-[350px] px-4 py-2 text-center uppercase text-sm font-bold tracking-wider text-slate-700 dark:text-slate-300 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 bg-slate-50 sticky left-0 z-40 dark:bg-[#1c1c1e]`}
                                    >
                                        DANH MỤC
                                    </th>
                                    {(() => {
                                        const visibleHeaders = HEADER_CONFIG.filter(h => visibleColumns.includes(h.key));
                                        const elements: React.ReactNode[] = [];
                                        let currentGroup: string | null = null;
                                        let groupChildren: any[] = [];
                                        
                                        const flushGroup = () => {
                                            if (currentGroup && groupChildren.length > 0) {
                                                const colorClass = groupChildren[0].colorClass;
                                                elements.push(
                                                    <th 
                                                        key={`group-${currentGroup}`} 
                                                        colSpan={groupChildren.length} 
                                                        scope="col" 
                                                        className={`px-2 py-2 text-center text-sm font-bold uppercase tracking-wider border-b ${colorClass} ${separatorClass}`}
                                                    >
                                                        {currentGroup}
                                                    </th>
                                                );
                                            } else if (!currentGroup && groupChildren.length > 0) {
                                                groupChildren.forEach(h => {
                                                    elements.push(
                                                        <th 
                                                            key={`ungrouped-${h.key}`} 
                                                            rowSpan={2} 
                                                            scope="col" 
                                                            onClick={() => handleSort(h.key)} 
                                                            className={`px-2 py-1 text-center text-xs font-bold uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/40 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 ${h.colorClass}`}
                                                        >
                                                            <div className="flex items-center justify-center gap-1">
                                                                {h.label}
                                                                {activeSortConfig.column === h.key && <Icon name={activeSortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />}
                                                            </div>
                                                        </th>
                                                    );
                                                });
                                            }
                                        };

                                        visibleHeaders.forEach(h => {
                                            if (h.group !== currentGroup) {
                                                flushGroup();
                                                currentGroup = h.group || null;
                                                groupChildren = [h];
                                            } else {
                                                groupChildren.push(h);
                                            }
                                        });
                                        flushGroup();
                                        return elements;
                                    })()}
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                    {HEADER_CONFIG.filter(h => visibleColumns.includes(h.key) && h.group).map(h => (
                                        <th 
                                            key={h.key} 
                                            scope="col" 
                                            onClick={() => handleSort(h.key)} 
                                            className={`px-2 py-1 text-center text-xs font-bold uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/40 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 ${h.colorClass}`}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                {h.label}
                                                {activeSortConfig.column === h.key && <Icon name={activeSortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </>
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
                                        sortConfig={isComparisonMode ? compSortConfig : activeSortConfig}
                                        drilldownOrder={localDrilldownOrder}
                                        parentRevenue={grandTotal.totalRevenue}
                                        parentQuantity={grandTotal.totalQuantity}
                                        visibleColumns={visibleColumns}
                                        daysCountData={daysCountData}
                                    />
                                ))
                            ) : (
                                 <tr><td colSpan={isComparisonMode ? 1 + visibleColumns.reduce((acc: number, key: string) => acc + (HEADER_CONFIG.find(h => h.key === key)?.singleColumnInCompare ? 1 : 2), 0) : visibleColumns.length + 1} className="text-center p-8 text-slate-500">Không có dữ liệu để hiển thị.</td></tr>
                            )}
                        </tbody>
                        <tfoot className="bg-teal-100 dark:bg-teal-900/40 font-bold text-sm border-t-2 border-teal-200 dark:border-teal-800">
                           <tr>
                                <td className={`px-4 py-2 text-center sticky left-0 z-40 bg-teal-100 dark:bg-teal-900/60 font-extrabold text-[12px] uppercase tracking-widest text-teal-700 dark:text-teal-300 ${separatorClass}`}>TỔNG CỘNG</td>
                                {/* Quantity */}
                                {visibleColumns.includes('totalQuantity') && (
                                    <>
                                        <td className={`${footerCellClass} font-bold text-slate-700 dark:text-slate-300 ${!isComparisonMode ? separatorClass : ''}`}>{formatQuantity(grandTotal.totalQuantity)}</td>
                                        {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaQuantity, 'number')}</td>}
                                    </>
                                )}
                                
                                {/* %SL */}
                                {(() => {
                                    const h = HEADER_CONFIG.find(c => c.key === 'slPercent');
                                    if (!h || !visibleColumns.includes(h.key)) return null;

                                    if (!isComparisonMode) {
                                        return <td className={`${footerCellClass} font-bold text-emerald-600 dark:text-emerald-400 ${separatorClass}`}>
                                            {grandTotal.totalQuantity > 0 ? '100%' : '-'}
                                        </td>;
                                    } else {
                                        const prevQty = compTree?.prev?.grandTotal?.totalQuantity || 0;
                                        const currentQty = grandTotal.totalQuantity;
                                        const deltaPct = prevQty > 0 ? ((currentQty - prevQty) / prevQty) * 100 : (currentQty > 0 ? 100 : 0);
                                        return <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaPct, 'percent')}</td>;
                                    }
                                })()}

                                {/* TrB SL */}
                                {visibleColumns.includes('avgQuantity') && (() => {
                                    const avgQty = grandTotal.totalQuantity / daysCountData.current;
                                    return (
                                        <>
                                            <td className={`${footerCellClass} font-bold text-indigo-600 dark:text-indigo-400 ${!isComparisonMode ? separatorClass : ''}`}>
                                                {avgQty > 0 ? avgQty.toFixed(1) : '-'}
                                            </td>
                                            {isComparisonMode && (() => {
                                                const prevAvgQty = (compTree?.prev?.grandTotal?.totalQuantity || 0) / daysCountData.prev;
                                                const deltaAvgQty = avgQty - prevAvgQty;
                                                return <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaAvgQty, 'number')}</td>;
                                            })()}
                                        </>
                                    );
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
                                            {grandTotal.totalRevenue > 0 ? '100%' : '-'}
                                        </td>;
                                    } else {
                                        const prevRev = compTree?.prev?.grandTotal?.totalRevenue || 0;
                                        const currentRev = grandTotal.totalRevenue;
                                        const deltaPct = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : (currentRev > 0 ? 100 : 0);
                                        return <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaPct, 'percent')}</td>;
                                    }
                                })()}

                                {/* TrB DT */}
                                {visibleColumns.includes('avgRevenue') && (() => {
                                    const avgRev = grandTotal.totalRevenue / daysCountData.current;
                                    return (
                                        <>
                                            <td className={`${footerCellClass} font-bold text-indigo-700 dark:text-indigo-300 tracking-tight ${!isComparisonMode ? separatorClass : ''}`}>
                                                {formatCurrency(avgRev)}
                                            </td>
                                            {isComparisonMode && (() => {
                                                const prevAvgRev = (compTree?.prev?.grandTotal?.totalRevenue || 0) / daysCountData.prev;
                                                const deltaAvgRev = avgRev - prevAvgRev;
                                                return <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaAvgRev, 'currency')}</td>;
                                            })()}
                                        </>
                                    );
                                })()}

                                {/* RevenueQD */}
                                {visibleColumns.includes('totalRevenueQD') && (
                                    <>
                                        <td className={`${footerCellClass} font-extrabold text-teal-700 dark:text-teal-300 ${!isComparisonMode ? separatorClass : ''}`}>{formatCurrency(grandTotal.totalRevenueQD)}</td>
                                        {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaRevenueQD, 'currency')}</td>}
                                    </>
                                )}

                                {/* AOV */}
                                {visibleColumns.includes('aov') && (
                                    <>
                                        <td className={`${footerCellClass} font-bold text-slate-700 dark:text-slate-300 ${!isComparisonMode ? separatorClass : ''}`}>
                                            {grandTotal.aov === 0 ? '-' : (grandTotal.aov / 1000000).toFixed(1)}
                                        </td>
                                        {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaAOV, 'currency')}</td>}
                                    </>
                                )}

                                {/* Tra Gop */}
                                {visibleColumns.includes('traGopPercent') && (
                                    <>
                                        <td className={`${footerCellClass} ${getTraGopPercentClass(grandTotal.traGopPercent, kpiTargets?.traGop || 45)} ${!isComparisonMode ? separatorClass : ''}`}>{traGopDisplayTotal}</td>
                                        {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaTraGopPercent, 'percent')}</td>}
                                    </>
                                )}
                           </tr>
                        </tfoot>
                  </table>
                  )}
              </div>
           </div>
        </div>
        <CrossSellingBuilderModal isOpen={isBuilderOpen} onClose={() => setIsBuilderOpen(false)} />
        </>
    );
});

SummaryTable.displayName = 'SummaryTable';

export default SummaryTable;
