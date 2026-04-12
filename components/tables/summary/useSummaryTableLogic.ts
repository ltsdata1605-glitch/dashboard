import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { SummaryTableNode } from '../../../types';
import { HEADER_CONFIG } from './SummaryTableUtils';
import { useDashboardContext } from '../../../contexts/DashboardContext';
import { processSummaryTable } from '../../../services/summaryService';
import { getExportFilenamePrefix, getRowValue, abbreviateName } from '../../../utils/dataUtils';
import { COL } from '../../../constants';
import { exportElementAsImage } from '../../../services/uiService';

import { useSummaryFilters } from './hooks/useSummaryFilters';
import { useSummaryExpand } from './hooks/useSummaryExpand';
import { useSummaryComparison } from './hooks/useSummaryComparison';

export const useSummaryTableLogic = () => {
    const { filterState: filters, handleFilterChange: onFilterChange, baseFilteredData, processedData, productConfig } = useDashboardContext();
    const { summaryTable: summaryTableFilters } = filters;

    const [tableModeState, _setTableMode] = useState<'standard' | 'comparison' | 'cross_selling'>('standard');
    const isComparisonMode = tableModeState === 'comparison';
    const isCrossSellingMode = tableModeState === 'cross_selling';

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

    const setTableMode = useCallback((mode: 'standard' | 'comparison' | 'cross_selling') => {
        _setTableMode(mode);
    }, []);

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
        dateDisplay, daysCountData, setDaysCountData, weeksInSelectedMonth,
        compareUpToCurrentDay, setCompareUpToCurrentDay
    } = useSummaryComparison(
        isComparisonMode, baseFilteredData, productConfig, filters,
        localParentFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters,
        deferredDrilldownOrder
    );

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        if (summaryTableFilters.visibleColumns && summaryTableFilters.visibleColumns.length > 0) {
            return summaryTableFilters.visibleColumns;
        }
        const allCols = HEADER_CONFIG.map(h => h.key);
        // On mobile, hide TrB SL and TrB DT by default to reduce horizontal scroll
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            return allCols.filter(k => k !== 'avgQuantity' && k !== 'avgRevenue');
        }
        return allCols;
    });
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

    // Calculate global filter options independent of standardSummaryData so they are available in comparison mode
    const filterOptions = useMemo(() => {
        if (standardSummaryData) {
            return {
                parent: standardSummaryData.uniqueParentGroups,
                child: standardSummaryData.uniqueChildGroups,
                manufacturer: standardSummaryData.uniqueManufacturers,
                creator: standardSummaryData.uniqueCreators,
                product: standardSummaryData.uniqueProducts
            };
        }

        // Fallback for comparison mode where standardSummaryData might be null
        const parentSet = new Set<string>();
        const childSet = new Set<string>();
        const manufacturerSet = new Set<string>();
        const creatorSet = new Set<string>();
        const productSet = new Set<string>();

        if (productConfig && processedData?.filteredValidSalesData) {
            processedData.filteredValidSalesData.forEach(row => {
                const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                parentSet.add(productConfig.childToParentMap[maNhomHang] || 'Không xác định');
                childSet.add(productConfig.childToSubgroupMap[maNhomHang] || 'Không xác định');
                manufacturerSet.add(getRowValue(row, COL.MANUFACTURER) || 'Không rõ');
                creatorSet.add(abbreviateName(getRowValue(row, COL.NGUOI_TAO) || 'Không xác định'));
                productSet.add(getRowValue(row, COL.PRODUCT) || 'N/A');
            });
        }

        return {
            parent: Array.from(parentSet).sort(),
            child: Array.from(childSet).sort(),
            manufacturer: Array.from(manufacturerSet).sort(),
            creator: Array.from(creatorSet).sort(),
            product: Array.from(productSet).sort()
        };
    }, [standardSummaryData, productConfig, processedData?.filteredValidSalesData]);

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
        if (tableContainerRef.current) {
            setIsExporting(true);
            const prefix = getExportFilenamePrefix(filters.kho);
            await exportElementAsImage(tableContainerRef.current, `${prefix}-Chi-tiet-nganh-hang.png`, {
                captureAsDisplayed: !isComparisonMode,
                fitCategoryColumn: true
            });
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
        switch (key) {
            case 'parent': return { options: filterOptions.parent, selected: localParentFilters, onChange: (s: string[]) => filterChangeWrapper('parent', s) };
            case 'child': return { options: filterOptions.child, selected: localChildFilters, onChange: (s: string[]) => filterChangeWrapper('child', s) };
            case 'manufacturer': return { options: filterOptions.manufacturer, selected: localManufacturerFilters, onChange: (s: string[]) => filterChangeWrapper('manufacturer', s) };
            case 'creator': return { options: filterOptions.creator, selected: localCreatorFilters, onChange: (s: string[]) => filterChangeWrapper('creator', s) };
            case 'product': return { options: filterOptions.product, selected: localProductFilters, onChange: (s: string[]) => filterChangeWrapper('product', s) };
            default: return { options: [], selected: [], onChange: () => { } };
        }
    };

    return {
        tableMode: tableModeState, setTableMode,
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
        trendSelectedMonths, setTrendSelectedMonths,
        compareUpToCurrentDay, setCompareUpToCurrentDay
    };
};
