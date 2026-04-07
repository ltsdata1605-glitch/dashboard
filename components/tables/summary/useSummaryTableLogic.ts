import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { SummaryTableNode } from '../../../types';
import { HEADER_CONFIG } from './SummaryTableUtils';
import { useDashboardContext } from '../../../contexts/DashboardContext';
import { processSummaryTable } from '../../../services/summaryService';
import { getExportFilenamePrefix } from '../../../utils/dataUtils';
import { exportElementAsImage } from '../../../services/uiService';

import { useSummaryFilters } from './hooks/useSummaryFilters';
import { useSummaryExpand } from './hooks/useSummaryExpand';
import { useSummaryComparison } from './hooks/useSummaryComparison';

export const useSummaryTableLogic = () => {
    const { filterState: filters, handleFilterChange: onFilterChange, baseFilteredData, processedData, productConfig } = useDashboardContext();
    const { summaryTable: summaryTableFilters } = filters;
    
    const [tableMode, setTableMode] = useState<'standard' | 'comparison' | 'cross_selling'>('standard');
    const isComparisonMode = tableMode === 'comparison';
    const isCrossSellingMode = tableMode === 'cross_selling';

    const {
        localDrilldownOrder, setLocalDrilldownOrder,
        crossSellingDrilldownOrder, setCrossSellingDrilldownOrder,
        activeDrilldownOrder, deferredDrilldownOrder,
        localParentFilters, localChildFilters,
        localManufacturerFilters, localCreatorFilters, localProductFilters,
        activeFilterKey, setActiveFilterKey,
        isPending, startTransition,
        handleLocalFilterChange, handleResetAllFilters, hasActiveFilters
    } = useSummaryFilters(filters, onFilterChange, isCrossSellingMode);

    const {
        expandedIds, setExpandedIds, expandLevel, isExpanding,
        toggleExpand, handleExpandAll: _handleExpandAll, handleCollapseAll: _handleCollapseAll, clearExpanded
    } = useSummaryExpand(startTransition);

    const {
        compMode, setCompMode,
        selectedDate, setSelectedDate,
        selectedMonth, setSelectedMonth,
        selectedWeeks, handleWeekPillClick,
        customRangeA, setCustomRangeA,
        customRangeB, setCustomRangeB,
        compSortConfig, setCompSortConfig,
        compTree, trendData,
        trendSelectedMonths, setTrendSelectedMonths,
        dateDisplay, daysCountData, setDaysCountData, weeksInSelectedMonth
    } = useSummaryComparison(
        isComparisonMode, baseFilteredData, productConfig, filters,
        localParentFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters,
        deferredDrilldownOrder
    );

    const [visibleColumns, setVisibleColumns] = useState<string[]>(
        (summaryTableFilters.visibleColumns && summaryTableFilters.visibleColumns.length > 0) 
            ? summaryTableFilters.visibleColumns 
            : HEADER_CONFIG.map(h => h.key)
    );
    const [isExporting, setIsExporting] = useState(false);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const sortableListRef = useRef<HTMLDivElement>(null);

    const standardSummaryData = useMemo(() => {
        const dataToUse = processedData?.filteredValidSalesData || [];
        if (!dataToUse.length || !productConfig) return null;
        const localFilterState = {
            ...filters,
            parent: localParentFilters,
            summaryTable: {
                ...filters.summaryTable,
                drilldownOrder: deferredDrilldownOrder,
                child: localChildFilters,
                manufacturer: localManufacturerFilters,
                creator: localCreatorFilters,
                product: localProductFilters
            }
        };

        return processSummaryTable(dataToUse, productConfig, localFilterState);
    }, [processedData?.filteredValidSalesData, filters, productConfig, deferredDrilldownOrder, localParentFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters, filters.summaryTable.sort]);

    useEffect(() => {
        const dataToUse = processedData?.filteredValidSalesData || [];
        let minTime = Infinity;
        let maxTime = -Infinity;
        dataToUse.forEach(row => {
            const t = row.parsedDate?.getTime();
            if (t) {
                if (t < minTime) minTime = t;
                if (t > maxTime) maxTime = t;
            }
        });
        const dCount = minTime === Infinity ? 1 : Math.max(1, Math.round((maxTime - minTime) / (1000 * 60 * 60 * 24)) + 1);
        setDaysCountData(prev => prev.current !== dCount ? { ...prev, current: dCount } : prev);
    }, [processedData?.filteredValidSalesData]);

    const handleSort = useCallback((column: string, type: 'current' | 'delta' = 'current') => {
        if (isComparisonMode) {
            setCompSortConfig(prev => ({
                column,
                type,
                direction: prev.column === column && prev.type === type && prev.direction === 'desc' ? 'asc' : 'desc'
            }));
        } else {
            const direction = summaryTableFilters.sort.column === column && summaryTableFilters.sort.direction === 'desc' ? 'asc' : 'desc';
            startTransition(() => {
                onFilterChange({ summaryTable: { ...summaryTableFilters, sort: { column, direction } } });
            });
        }
    }, [summaryTableFilters, onFilterChange, isComparisonMode]);

    const handleExpandAll = () => _handleExpandAll(isComparisonMode, compMode, trendData, compTree, standardSummaryData);
    const handleCollapseAll = () => _handleCollapseAll(isComparisonMode, compMode, trendData, compTree, standardSummaryData);

    const filterChangeWrapper = (type: string, selected: string[]) => handleLocalFilterChange(type, selected, clearExpanded);
    const resetAllFiltersWrapper = () => handleResetAllFilters(clearExpanded);

    const handleExport = async () => {
        if(tableContainerRef.current) {
            setIsExporting(true);
            const prefix = getExportFilenamePrefix(filters.kho);
            await exportElementAsImage(tableContainerRef.current, `${prefix}-Chi-tiet-nganh-hang.png`, { elementsToHide: ['.hide-on-export'], fitContent: true });
            setIsExporting(false);
        }
    };

    const activeSortConfig = isComparisonMode ? compSortConfig : { ...summaryTableFilters.sort, type: 'current' as const };
    
    let displayKeys: string[] = [];
    if (isComparisonMode && compTree) {
        displayKeys = Array.from(new Set([...Object.keys(compTree.current.data), ...Object.keys(compTree.prev.data)]));
        displayKeys.sort((a, b) => {
            const nodeA = compTree.current.data[a];
            const nodeB = compTree.current.data[b];
            const prevNodeA = compTree.prev.data[a];
            const prevNodeB = compTree.prev.data[b];
            
            const getVal = (node: SummaryTableNode | undefined, key: string) => {
                if (!node) return 0;
                if (key === 'aov') return node.totalQuantity > 0 ? node.totalRevenue / node.totalQuantity : 0;
                if (key === 'traGopPercent') return node.totalRevenue > 0 ? (node.totalTraGop / node.totalRevenue) * 100 : 0;
                return (node as any)[key] || 0;
            };

            const currValA = getVal(nodeA, activeSortConfig.column);
            const currValB = getVal(nodeB, activeSortConfig.column);
            
            let finalValA = currValA;
            let finalValB = currValB;

            if (activeSortConfig.type === 'delta') {
                const prevValA = getVal(prevNodeA, activeSortConfig.column);
                const prevValB = getVal(prevNodeB, activeSortConfig.column);
                finalValA = currValA - prevValA;
                finalValB = currValB - prevValB;
            }
            
            if (finalValA === finalValB) return a.localeCompare(b);
            return activeSortConfig.direction === 'asc' ? finalValA - finalValB : finalValB - finalValA;
        });
    } else if (standardSummaryData) {
        displayKeys = Object.keys(standardSummaryData.data);
    }

    displayKeys = displayKeys.filter(key => key !== 'Không xác định');

    const calculateDisplayedTotal = (sourceData: { [key: string]: SummaryTableNode } | undefined) => {
        if (!sourceData) return { totalQuantity: 0, totalRevenue: 0, totalRevenueQD: 0, totalTraGop: 0, aov: 0, traGopPercent: 0 };
        return displayKeys.reduce((acc, key) => {
            const node = sourceData[key];
            if (node) {
                acc.totalQuantity += node.totalQuantity;
                acc.totalRevenue += node.totalRevenue;
                acc.totalRevenueQD += node.totalRevenueQD;
                acc.totalTraGop += node.totalTraGop;
            }
            return acc;
        }, { totalQuantity: 0, totalRevenue: 0, totalRevenueQD: 0, totalTraGop: 0, aov: 0, traGopPercent: 0 });
    };

    const currentDisplayedTotal = useMemo(() => {
        const source = isComparisonMode && compTree ? compTree.current.data : standardSummaryData?.data;
        const total = calculateDisplayedTotal(source);
        total.aov = total.totalQuantity > 0 ? total.totalRevenue / total.totalQuantity : 0;
        total.traGopPercent = total.totalRevenue > 0 ? (total.totalTraGop / total.totalRevenue) * 100 : 0;
        return total;
    }, [displayKeys, isComparisonMode, compTree, standardSummaryData]);

    const prevDisplayedTotal = useMemo(() => {
        if (!isComparisonMode || !compTree) return null;
        const total = calculateDisplayedTotal(compTree.prev.data);
        total.aov = total.totalQuantity > 0 ? total.totalRevenue / total.totalQuantity : 0;
        total.traGopPercent = total.totalRevenue > 0 ? (total.totalTraGop / total.totalRevenue) * 100 : 0;
        return total;
    }, [displayKeys, isComparisonMode, compTree]);

    const grandTotal = currentDisplayedTotal;
    
    let deltaQuantity = 0, deltaRevenue = 0, deltaRevenueQD = 0, deltaAOV = 0, deltaTraGopPercent = 0;
    if (isComparisonMode && prevDisplayedTotal) {
        deltaQuantity = grandTotal.totalQuantity - prevDisplayedTotal.totalQuantity;
        deltaRevenue = grandTotal.totalRevenue - prevDisplayedTotal.totalRevenue;
        deltaRevenueQD = grandTotal.totalRevenueQD - prevDisplayedTotal.totalRevenueQD;
        deltaAOV = grandTotal.aov - prevDisplayedTotal.aov;
        deltaTraGopPercent = grandTotal.traGopPercent - prevDisplayedTotal.traGopPercent;
    }

    const displayTitle = isComparisonMode && compTree ? compTree.title : "CHI TIẾT NGÀNH HÀNG";
    const displayDescription = isComparisonMode && compTree ? compTree.description : "Thống kê chi tiết theo ngành hàng và nhóm hàng.";
    const traGopDisplayTotal = grandTotal.traGopPercent === 0 ? '-' : `${grandTotal.traGopPercent.toFixed(0)}%`;

    const getFilterProps = (key: string) => {
        switch(key) {
            case 'parent': return { options: standardSummaryData?.uniqueParentGroups || [], selected: localParentFilters, onChange: (s: string[]) => filterChangeWrapper('parent', s) };
            case 'child': return { options: standardSummaryData?.uniqueChildGroups || [], selected: localChildFilters, onChange: (s: string[]) => filterChangeWrapper('child', s) };
            case 'manufacturer': return { options: standardSummaryData?.uniqueManufacturers || [], selected: localManufacturerFilters, onChange: (s: string[]) => filterChangeWrapper('manufacturer', s) };
            case 'creator': return { options: standardSummaryData?.uniqueCreators || [], selected: localCreatorFilters, onChange: (s: string[]) => filterChangeWrapper('creator', s) };
            case 'product': return { options: standardSummaryData?.uniqueProducts || [], selected: localProductFilters, onChange: (s: string[]) => filterChangeWrapper('product', s) };
            default: return { options: [], selected: [], onChange: () => {} };
        }
    };

    return {
        tableMode, setTableMode,
        isComparisonMode, isCrossSellingMode,
        compMode, setCompMode,
        selectedDate, setSelectedDate,
        selectedMonth, setSelectedMonth,
        selectedWeeks, handleWeekPillClick,
        customRangeA, setCustomRangeA,
        customRangeB, setCustomRangeB,
        dateDisplay, displayDescription, displayTitle,
        localDrilldownOrder: activeDrilldownOrder, 
        setLocalDrilldownOrder: isCrossSellingMode ? setCrossSellingDrilldownOrder : setLocalDrilldownOrder,
        isPending, getFilterProps,
        activeFilterKey, setActiveFilterKey,
        hasActiveFilters, handleResetAllFilters: resetAllFiltersWrapper,
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
    };
};
