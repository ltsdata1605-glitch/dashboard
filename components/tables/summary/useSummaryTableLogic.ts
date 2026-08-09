import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { SummaryTableNode } from '../../../types';
import { HEADER_CONFIG } from './SummaryTableUtils';
import { useDashboardContext } from '../../../contexts/DashboardContext';
import { processSummaryTable } from '../../../services/summaryService';
import { getExportFilenamePrefix, getRowValue, abbreviateName, getParentGroup, getSubgroup } from '../../../utils/dataUtils';
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
        activeDrilldownOrder,
        localKhoFilters, localParentFilters, localChildFilters,
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
        if (mode === 'comparison') {
            // Chế độ "So sánh" luôn cần dữ liệu đơn hàng đã xuất + hồ sơ mới để số liệu
            // đối chiếu chính xác — set cứng 2 bộ lọc toàn cục này theo yêu cầu người dùng.
            // Đây là filterState CHUNG cho cả trang (KPI, biểu đồ, các bảng khác cũng đổi
            // theo), không phải filter cục bộ riêng cho bảng này — có chủ đích.
            onFilterChange({ xuat: 'Đã', trangThai: ['1 - Mới'] });
        }
    }, [onFilterChange]);

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
        activeDrilldownOrder, localKhoFilters
    );

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        if (summaryTableFilters.visibleColumns && summaryTableFilters.visibleColumns.length > 0) {
            return summaryTableFilters.visibleColumns;
        }
        const allCols = HEADER_CONFIG.map(h => h.key);
        // Hide TrB SL and TrB DT by default as requested
        return allCols.filter(k => k !== 'avgQuantity' && k !== 'avgRevenue');
    });
    const [isExporting, setIsExporting] = useState(false);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const sortableListRef = useRef<HTMLDivElement>(null);

    // Mục 65c (nhóm 2): Worker đã tính processSummaryTable() 1 lần rồi (services/filterService.ts,
    // kết quả có sẵn ở processedData.summaryTable, CÙNG shape — xem types.ts ProcessedData). Bảng
    // này có bộ lọc drilldown RIÊNG (chỉ áp dụng trong bảng, không ảnh hưởng KPI/biểu đồ khác) nên
    // vẫn CẦN tính lại trên main thread MỘT KHI user thực sự bấm lọc cục bộ — nhưng ngay lúc vừa
    // tải xong, chưa ai lọc gì, việc tính lại là dư thừa 100% (cùng input, cùng công thức, cùng kết
    // quả). Chỉ dùng thẳng processedData.summaryTable khi CẢ filter cục bộ (hasActiveFilters) LẪN
    // filter global liên quan (filters.parent/summaryTable.kho|child|manufacturer|creator|product —
    // đây là những field Worker đã dùng để tính processedData.summaryTable) đều rỗng, và thứ tự
    // drilldown khớp mặc định — tránh trường hợp filters.parent vừa đổi (vd từ IndustryGrid) nhưng
    // localParentFilters (đồng bộ qua effect riêng) chưa kịp cập nhật theo, dùng nhầm cache cũ.
    const isSummaryFilterDefault =
        (!filters.parent || filters.parent.length === 0) &&
        (!filters.summaryTable.kho || filters.summaryTable.kho.length === 0) &&
        (!filters.summaryTable.child || filters.summaryTable.child.length === 0) &&
        (!filters.summaryTable.manufacturer || filters.summaryTable.manufacturer.length === 0) &&
        (!filters.summaryTable.creator || filters.summaryTable.creator.length === 0) &&
        (!filters.summaryTable.product || filters.summaryTable.product.length === 0);

    const effectiveGlobalDrilldownOrder = (filters.summaryTable.drilldownOrder && filters.summaryTable.drilldownOrder.length > 0)
        ? filters.summaryTable.drilldownOrder
        : ['parent', 'child', 'manufacturer', 'creator', 'product'];
    const isDrilldownOrderDefault = JSON.stringify(activeDrilldownOrder) === JSON.stringify(effectiveGlobalDrilldownOrder);

    const standardSummaryData = useMemo(() => {
        const dataToUse = processedData?.filteredValidSalesData || [];
        if (!dataToUse.length || !productConfig) return null;

        if (!isCrossSellingMode && !hasActiveFilters && isSummaryFilterDefault && isDrilldownOrderDefault && processedData?.summaryTable) {
            return processedData.summaryTable;
        }

        const localFilterState = {
            ...filters,
            parent: localParentFilters,
            summaryTable: {
                ...filters.summaryTable,
                drilldownOrder: activeDrilldownOrder,
                kho: localKhoFilters,
                child: localChildFilters,
                manufacturer: localManufacturerFilters,
                creator: localCreatorFilters,
                product: localProductFilters
            }
        };

        return processSummaryTable(dataToUse, productConfig, localFilterState);
    }, [processedData?.filteredValidSalesData, processedData?.summaryTable, filters, productConfig, activeDrilldownOrder, localKhoFilters, localParentFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters, filters.summaryTable.sort, hasActiveFilters, isCrossSellingMode, isSummaryFilterDefault, isDrilldownOrderDefault]);

    // Calculate global filter options independent of standardSummaryData so they are available in comparison mode
    const filterOptions = useMemo(() => {
        if (standardSummaryData) {
            return {
                kho: standardSummaryData.uniqueKhos,
                parent: standardSummaryData.uniqueParentGroups,
                child: standardSummaryData.uniqueChildGroups,
                manufacturer: standardSummaryData.uniqueManufacturers,
                creator: standardSummaryData.uniqueCreators,
                product: standardSummaryData.uniqueProducts
            };
        }

        // Fallback for comparison mode where standardSummaryData might be null
        const khoSet = new Set<string>();
        const parentSet = new Set<string>();
        const childSet = new Set<string>();
        const manufacturerSet = new Set<string>();
        const creatorSet = new Set<string>();
        const productSet = new Set<string>();

        if (productConfig && processedData?.filteredValidSalesData) {
            processedData.filteredValidSalesData.forEach(row => {
                const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                khoSet.add(String(getRowValue(row, COL.KHO) || 'Không xác định'));
                parentSet.add(getParentGroup(maNhomHang, productConfig) || 'Không xác định');
                childSet.add(getSubgroup(maNhomHang, productConfig) || 'Không xác định');
                manufacturerSet.add(getRowValue(row, COL.MANUFACTURER) || 'Không rõ');
                creatorSet.add(abbreviateName(getRowValue(row, COL.NGUOI_TAO) || 'Không xác định'));
                productSet.add(getRowValue(row, COL.PRODUCT) || 'N/A');
            });
        }

        return {
            kho: Array.from(khoSet).sort(),
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
                fitCategoryColumn: true,
                fitAllColumns: true
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
                return (node as unknown as Record<string, unknown>)[key] as number || 0;
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
    // Chỉ hiện dòng mô tả khi ở chế độ so sánh (có compTree.description thật sự khác biệt
    // theo mốc thời gian đang chọn) — bỏ hẳn dòng mô tả tĩnh mặc định theo yêu cầu.
    const displayDescription = isComparisonMode && compTree ? compTree.description : '';
    const traGopDisplayTotal = grandTotal.traGopPercent === 0 ? '-' : `${grandTotal.traGopPercent.toFixed(0)}%`;

    const getFilterProps = (key: string) => {
        switch (key) {
            case 'kho': return { options: filterOptions.kho || [], selected: localKhoFilters, onChange: (s: string[]) => filterChangeWrapper('kho', s) };
            case 'parent': return { options: filterOptions.parent || [], selected: localParentFilters, onChange: (s: string[]) => filterChangeWrapper('parent', s) };
            case 'child': return { options: filterOptions.child || [], selected: localChildFilters, onChange: (s: string[]) => filterChangeWrapper('child', s) };
            case 'manufacturer': return { options: filterOptions.manufacturer || [], selected: localManufacturerFilters, onChange: (s: string[]) => filterChangeWrapper('manufacturer', s) };
            case 'creator': return { options: filterOptions.creator || [], selected: localCreatorFilters, onChange: (s: string[]) => filterChangeWrapper('creator', s) };
            case 'product': return { options: filterOptions.product || [], selected: localProductFilters, onChange: (s: string[]) => filterChangeWrapper('product', s) };
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
