import { useState, useMemo, useRef, useEffect, useCallback, useTransition, useDeferredValue } from 'react';
import type { SummaryTableNode, GrandTotal } from '../../../types';
import { HEADER_CONFIG } from './SummaryTableUtils';
import { useDashboardContext } from '../../../contexts/DashboardContext';
import { processSummaryTable } from '../../../services/summaryService';
import { saveSummaryTableConfig } from '../../../services/dbService';
import { exportElementAsImage } from '../../../services/uiService';
import { getWeeksInMonth, getSafeDateInPrevMonth, toInputDate, toInputMonth, formatCompactDateRange } from './SummaryTableUtils';

export type ComparisonMode = 'day_adjacent' | 'day_same_period' | 'week_adjacent' | 'week_same_period' | 'month_adjacent' | 'month_same_period_year' | 'quarter_adjacent' | 'quarter_same_period_year' | 'ytd_same_period_year' | 'custom_range';

export const useSummaryTableLogic = () => {
    const { filterState: filters, handleFilterChange: onFilterChange, baseFilteredData, processedData, productConfig } = useDashboardContext();
    const { summaryTable: summaryTableFilters, parent: globalParentFilters } = filters;
    
    // Comparison State (Hoisted up)
    const [tableMode, setTableMode] = useState<'standard' | 'comparison' | 'cross_selling'>('standard');
    const isComparisonMode = tableMode === 'comparison';
    const isCrossSellingMode = tableMode === 'cross_selling';

    // --- Local State for Performance Optimization ---
    const [localDrilldownOrder, setLocalDrilldownOrder] = useState<string[]>(
        (summaryTableFilters.drilldownOrder && summaryTableFilters.drilldownOrder.length > 0)
            ? summaryTableFilters.drilldownOrder
            : ['parent', 'child', 'creator', 'manufacturer', 'product']
    );
    const [crossSellingDrilldownOrder, setCrossSellingDrilldownOrder] = useState<string[]>(['parent', 'child']);
    
    const activeDrilldownOrder = isCrossSellingMode ? crossSellingDrilldownOrder : localDrilldownOrder;
    const deferredDrilldownOrder = useDeferredValue(activeDrilldownOrder);

    const [localParentFilters, setLocalParentFilters] = useState<string[]>(globalParentFilters || []);
    const [localChildFilters, setLocalChildFilters] = useState<string[]>(summaryTableFilters.child || []);
    const [localManufacturerFilters, setLocalManufacturerFilters] = useState<string[]>(summaryTableFilters.manufacturer || []);
    const [localCreatorFilters, setLocalCreatorFilters] = useState<string[]>(summaryTableFilters.creator || []);
    const [localProductFilters, setLocalProductFilters] = useState<string[]>(summaryTableFilters.product || []);

    const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);

    useEffect(() => {
        if (JSON.stringify(globalParentFilters) !== JSON.stringify(localParentFilters)) setLocalParentFilters(globalParentFilters);
        if (JSON.stringify(summaryTableFilters.child) !== JSON.stringify(localChildFilters)) setLocalChildFilters(summaryTableFilters.child);
        if (JSON.stringify(summaryTableFilters.manufacturer) !== JSON.stringify(localManufacturerFilters)) setLocalManufacturerFilters(summaryTableFilters.manufacturer);
        if (JSON.stringify(summaryTableFilters.creator) !== JSON.stringify(localCreatorFilters)) setLocalCreatorFilters(summaryTableFilters.creator);
        if (JSON.stringify(summaryTableFilters.product) !== JSON.stringify(localProductFilters)) setLocalProductFilters(summaryTableFilters.product);
        
        if (summaryTableFilters.drilldownOrder && summaryTableFilters.drilldownOrder.length > 0 && 
            JSON.stringify(summaryTableFilters.drilldownOrder) !== JSON.stringify(localDrilldownOrder)) {
            setLocalDrilldownOrder(summaryTableFilters.drilldownOrder);
        }
    }, [summaryTableFilters]);

    useEffect(() => {
        const currentConfig = {
            parent: localParentFilters,
            child: localChildFilters,
            manufacturer: localManufacturerFilters,
            creator: localCreatorFilters,
            product: localProductFilters,
            drilldownOrder: localDrilldownOrder,
            sort: filters.summaryTable.sort
        };
        const timer = setTimeout(() => {
            saveSummaryTableConfig(currentConfig).catch(err => console.error("Failed to save config:", err));
            if (JSON.stringify(globalParentFilters) !== JSON.stringify(localParentFilters)) {
                onFilterChange({ parent: localParentFilters });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localParentFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters, localDrilldownOrder, filters.summaryTable.sort]);


    // Comparison State
    const [compMode, setCompMode] = useState<ComparisonMode>('day_adjacent');
    const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
    const [selectedMonth, setSelectedMonth] = useState(toInputMonth(new Date()));
    const [selectedWeeks, setSelectedWeeks] = useState<number[]>([1]);
    
    const [customRangeA, setCustomRangeA] = useState({ start: toInputDate(new Date()), end: toInputDate(new Date()) });
    const [customRangeB, setCustomRangeB] = useState({ start: toInputDate(new Date()), end: toInputDate(new Date()) });

    const [compSortConfig, setCompSortConfig] = useState<{ column: string, type: 'current' | 'delta', direction: 'asc' | 'desc' }>({
        column: 'totalRevenue',
        type: 'current',
        direction: 'desc'
    });

    const [compTree, setCompTree] = useState<{
        current: { data: { [key: string]: SummaryTableNode }, grandTotal: GrandTotal };
        prev: { data: { [key: string]: SummaryTableNode }, grandTotal: GrandTotal };
        title: string;
        description?: string;
    } | null>(null);

    const [dateDisplay, setDateDisplay] = useState({ current: '', prev: '' });
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [expandLevel, setExpandLevel] = useState<number>(0); // 0: None, 1: Level 1, 2: Level 2, 3: Full
    const [visibleColumns, setVisibleColumns] = useState<string[]>(
        (summaryTableFilters.visibleColumns && summaryTableFilters.visibleColumns.length > 0) 
            ? summaryTableFilters.visibleColumns 
            : HEADER_CONFIG.map(h => h.key)
    );
    const [isExporting, setIsExporting] = useState(false);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const sortableListRef = useRef<HTMLDivElement>(null);
    
    const [isPending, startTransition] = useTransition();
    const [isExpanding, setIsExpanding] = useState(false);

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
        try {
            const saved = localStorage.getItem('summaryTableExpandedIds');
            if (saved) setExpandedIds(new Set(JSON.parse(saved)));
        } catch (e) {}
    }, []);

    useEffect(() => {
        try { localStorage.setItem('summaryTableExpandedIds', JSON.stringify(Array.from(expandedIds))); } catch (e) {}
    }, [expandedIds]);

    const weeksInSelectedMonth = useMemo(() => {
        const [y, m] = selectedMonth.split('-').map(Number);
        if (isNaN(y) || isNaN(m)) return [];
        return getWeeksInMonth(y, m - 1);
    }, [selectedMonth]);

    useEffect(() => {
        if (compMode === 'week_adjacent' || compMode === 'week_same_period') {
            const hasValidSelection = selectedWeeks.length > 0 && weeksInSelectedMonth.some(w => w.id === selectedWeeks[0]);
            if (!hasValidSelection) {
                if (weeksInSelectedMonth.length > 0) {
                    setSelectedWeeks([weeksInSelectedMonth[weeksInSelectedMonth.length - 1].id]);
                } else {
                    setSelectedWeeks([]);
                }
            }
        }
    }, [compMode, weeksInSelectedMonth, selectedMonth]);

    useEffect(() => {
        if (!isComparisonMode || !baseFilteredData.length || !productConfig) {
            setCompTree(null);
            return;
        }

        let currentStart: Date, currentEnd: Date, prevStart: Date, prevEnd: Date;
        let titleSuffix = '';
        let description = '';

        if (compMode === 'day_adjacent') {
            const current = new Date(selectedDate);
            currentStart = new Date(current); currentStart.setHours(0,0,0,0);
            currentEnd = new Date(current); currentEnd.setHours(23,59,59,999);
            
            const prev = new Date(current);
            prev.setDate(current.getDate() - 1);
            prevStart = new Date(prev); prevStart.setHours(0,0,0,0);
            prevEnd = new Date(prev); prevEnd.setHours(23,59,59,999);
            titleSuffix = `NGÀY (LIỀN KỀ)`;
            description = `So sánh ngày ${currentStart.toLocaleDateString('vi-VN')} với ngày hôm trước (${prevStart.toLocaleDateString('vi-VN')}).`;

        } else if (compMode === 'day_same_period') {
            const current = new Date(selectedDate);
            currentStart = new Date(current); currentStart.setHours(0,0,0,0);
            currentEnd = new Date(current); currentEnd.setHours(23,59,59,999);

            const prev = getSafeDateInPrevMonth(current);
            prevStart = new Date(prev); prevStart.setHours(0,0,0,0);
            prevEnd = new Date(prev); prevEnd.setHours(23,59,59,999);
            titleSuffix = `NGÀY (CÙNG KỲ)`;
            description = `So sánh ngày ${currentStart.toLocaleDateString('vi-VN')} với ngày cùng số của tháng trước (${prevStart.toLocaleDateString('vi-VN')}).`;

        } else if (compMode === 'week_adjacent') {
            const wCurrId = selectedWeeks[0];
            const wPrevId = wCurrId - 1;
            
            const wCurr = weeksInSelectedMonth.find(w => w.id === wCurrId);
            const wPrev = weeksInSelectedMonth.find(w => w.id === wPrevId);
            
            if (!wCurr) return;

            currentStart = wCurr.start;
            currentEnd = wCurr.end;
            
            if (wPrev) {
                prevStart = wPrev.start;
                prevEnd = wPrev.end;
                titleSuffix = `TUẦN ${wCurrId} vs TUẦN ${wPrevId}`;
                description = `So sánh ${wCurr.label} với ${wPrev.label}.`;
            } else {
                prevStart = currentStart;
                prevEnd = currentEnd;
                titleSuffix = `TUẦN ${wCurrId}`;
                description = `Dữ liệu tuần ${wCurr.id}. (Không có tuần trước liền kề trong tháng).`;
            }

        } else if (compMode === 'week_same_period') {
            const selectedWeekId = selectedWeeks[0];
            const wCurrent = weeksInSelectedMonth.find(w => w.id === selectedWeekId);
            if (!wCurrent) return;

            currentStart = wCurrent.start;
            currentEnd = wCurrent.end;

            const [y, m] = selectedMonth.split('-').map(Number);
            const prevDate = new Date(y, m - 2, 1);
            const prevWeeks = getWeeksInMonth(prevDate.getFullYear(), prevDate.getMonth());
            
            const prevWeekIndex = Math.min(selectedWeekId, prevWeeks.length);
            const prevWeek = prevWeeks.find(w => w.id === prevWeekIndex);
            
            if (!prevWeek) return;

            prevStart = prevWeek.start;
            prevEnd = prevWeek.end;
            titleSuffix = `TUẦN (CÙNG KỲ THÁNG TRƯỚC)`;
            description = `So sánh ${wCurrent.shortLabel} tháng này với ${prevWeek.shortLabel} tháng trước.`;

        } else if (compMode === 'month_adjacent') {
            const [y, m] = selectedMonth.split('-').map(Number);
            currentStart = new Date(y, m - 1, 1);
            currentEnd = new Date(y, m, 0, 23, 59, 59, 999);

            prevStart = new Date(y, m - 2, 1);
            prevEnd = new Date(y, m - 1, 0, 23, 59, 59, 999);
            titleSuffix = `THÁNG (LIỀN KỀ)`;
            description = `So sánh tháng ${m}/${y} với tháng trước đó.`;
        } else if (compMode === 'month_same_period_year') {
            const [y, m] = selectedMonth.split('-').map(Number);
            currentStart = new Date(y, m - 1, 1);
            currentEnd = new Date(y, m, 0, 23, 59, 59, 999);

            prevStart = new Date(y - 1, m - 1, 1);
            prevEnd = new Date(y - 1, m, 0, 23, 59, 59, 999);
            titleSuffix = `THÁNG (CÙNG KỲ NĂM TRƯỚC)`;
            description = `So sánh tháng ${m}/${y} với cùng kỳ năm trước.`;
        } else if (compMode.startsWith('quarter')) {
            const [y, m] = selectedMonth.split('-').map(Number);
            const quarter = Math.floor((m - 1) / 3);
            currentStart = new Date(y, quarter * 3, 1);
            currentEnd = new Date(y, quarter * 3 + 3, 0, 23, 59, 59, 999);
            
            if (compMode === 'quarter_adjacent') {
                if (quarter === 0) {
                    prevStart = new Date(y - 1, 9, 1);
                    prevEnd = new Date(y - 1, 12, 0, 23, 59, 59, 999);
                } else {
                    prevStart = new Date(y, (quarter - 1) * 3, 1);
                    prevEnd = new Date(y, (quarter - 1) * 3 + 3, 0, 23, 59, 59, 999);
                }
                titleSuffix = `QUÝ (LIỀN KỀ)`;
                description = `So sánh Quý ${quarter + 1}/${y} với quý liền kề trước đó.`;
            } else {
                prevStart = new Date(y - 1, quarter * 3, 1);
                prevEnd = new Date(y - 1, quarter * 3 + 3, 0, 23, 59, 59, 999);
                titleSuffix = `QUÝ (CÙNG KỲ NĂM TRƯỚC)`;
                description = `So sánh Quý ${quarter + 1}/${y} với cùng kỳ năm trước.`;
            }
        } else if (compMode === 'ytd_same_period_year') {
            const current = new Date(selectedDate);
            currentStart = new Date(current.getFullYear(), 0, 1);
            currentEnd = new Date(current); currentEnd.setHours(23, 59, 59, 999);

            prevStart = new Date(current.getFullYear() - 1, 0, 1);
            const prev = new Date(current);
            prev.setFullYear(current.getFullYear() - 1);
            prevEnd = new Date(prev); prevEnd.setHours(23, 59, 59, 999);
            
            titleSuffix = `LŨY KẾ YTD (ĐẾN HIỆN TẠI)`;
            description = `So sánh lũy kế từ đầu năm đến ${current.toLocaleDateString('vi-VN')} với cùng kỳ năm ngoái.`;
        } else if (compMode === 'custom_range') {
            currentStart = new Date(customRangeA.start); currentStart.setHours(0,0,0,0);
            currentEnd = new Date(customRangeA.end); currentEnd.setHours(23,59,59,999);
            
            prevStart = new Date(customRangeB.start); prevStart.setHours(0,0,0,0);
            prevEnd = new Date(customRangeB.end); prevEnd.setHours(23,59,59,999);
            
            titleSuffix = `KHOẢNG THỜI GIAN`;
            description = `So sánh tùy chỉnh giữa 2 khoảng thời gian.`;
        } else {
            return;
        }

        setDateDisplay({
            current: formatCompactDateRange(currentStart, currentEnd),
            prev: formatCompactDateRange(prevStart, prevEnd)
        });

        const currentDataRows = baseFilteredData.filter(row => {
            const date = row.parsedDate;
            return date && date >= currentStart && date <= currentEnd;
        });

        const prevDataRows = baseFilteredData.filter(row => {
            const date = row.parsedDate;
            return date && date >= prevStart && date <= prevEnd;
        });

        const mockFilters = { 
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
        const currentTree = processSummaryTable(currentDataRows, productConfig, mockFilters);
        const prevTree = processSummaryTable(prevDataRows, productConfig, mockFilters);

        setCompTree({
            current: currentTree,
            prev: prevTree,
            title: `SO SÁNH NGÀNH HÀNG: ${titleSuffix}`,
            description
        });

    }, [isComparisonMode, compMode, selectedDate, selectedMonth, selectedWeeks, baseFilteredData, productConfig, filters.summaryTable, weeksInSelectedMonth, deferredDrilldownOrder, localParentFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters, customRangeA, customRangeB]);

    const handleWeekPillClick = (weekId: number) => {
        setSelectedWeeks([weekId]);
    };

    const handleLocalFilterChange = useCallback((type: string, selected: string[]) => {
        startTransition(() => {
            if (type === 'parent') setLocalParentFilters(selected);
            else if (type === 'child') setLocalChildFilters(selected);
            else if (type === 'manufacturer') setLocalManufacturerFilters(selected);
            else if (type === 'creator') setLocalCreatorFilters(selected);
            else if (type === 'product') setLocalProductFilters(selected);
            
            if (type === 'parent') {
                setLocalChildFilters([]);
            }
            setExpandedIds(new Set());
        });
    }, []);

    const handleResetAllFilters = () => {
        startTransition(() => {
            setLocalParentFilters([]);
            setLocalChildFilters([]);
            setLocalManufacturerFilters([]);
            setLocalCreatorFilters([]);
            setLocalProductFilters([]);
            setExpandedIds(new Set());
        });
    };

    const hasActiveFilters = localParentFilters.length > 0 || 
                             localChildFilters.length > 0 || 
                             localManufacturerFilters.length > 0 || 
                             localCreatorFilters.length > 0 || 
                             localProductFilters.length > 0;

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
    
    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
                const idPrefix = `${id}-`;
                prev.forEach(expandedId => { if (expandedId.startsWith(idPrefix)) newSet.delete(expandedId); });
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);
    
    const setLevelAndExpand = (level: number) => {
        setIsExpanding(true);
        // Force React to render the loading spinner before crunching the tree map
        setTimeout(() => {
            startTransition(() => {
                setExpandLevel(level);
                if (level === 0) {
                    setExpandedIds(new Set());
                } else {
                    const newExpanded = new Set<string>();
                    const activeData = isComparisonMode && compTree ? compTree.current.data : standardSummaryData?.data;
                    if (activeData) {
                        const targetDepth = level === 3 ? 5 : level;
                        const expandNode = (node: { [key: string]: SummaryTableNode }, parentId: string, currentDepth: number) => {
                            if (currentDepth > targetDepth) return;
                            Object.keys(node).forEach(key => {
                                const currentId = `${parentId}-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
                                newExpanded.add(currentId);
                                expandNode(node[key].children, currentId, currentDepth + 1);
                            });
                        };
                        expandNode(activeData, 'root', 1);
                    }
                    setExpandedIds(newExpanded);
                }
            });
            setIsExpanding(false);
        }, 10);
    };

    const handleExpandAll = () => setLevelAndExpand(Math.min(expandLevel + 1, 3));
    const handleCollapseAll = () => setLevelAndExpand(Math.max(expandLevel - 1, 0));
    
    const handleExport = async () => {
        if(tableContainerRef.current) {
            setIsExporting(true);
            await exportElementAsImage(tableContainerRef.current, 'chi-tiet-nganh-hang.png', { elementsToHide: ['.hide-on-export'], fitContent: true });
            setIsExporting(false);
        }
    };
    
    const activeSortConfig = isComparisonMode 
        ? compSortConfig 
        : { ...summaryTableFilters.sort, type: 'current' as const };
    
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
            case 'parent': return { options: standardSummaryData?.uniqueParentGroups || [], selected: localParentFilters, onChange: (s: string[]) => handleLocalFilterChange('parent', s) };
            case 'child': return { options: standardSummaryData?.uniqueChildGroups || [], selected: localChildFilters, onChange: (s: string[]) => handleLocalFilterChange('child', s) };
            case 'manufacturer': return { options: standardSummaryData?.uniqueManufacturers || [], selected: localManufacturerFilters, onChange: (s: string[]) => handleLocalFilterChange('manufacturer', s) };
            case 'creator': return { options: standardSummaryData?.uniqueCreators || [], selected: localCreatorFilters, onChange: (s: string[]) => handleLocalFilterChange('creator', s) };
            case 'product': return { options: standardSummaryData?.uniqueProducts || [], selected: localProductFilters, onChange: (s: string[]) => handleLocalFilterChange('product', s) };
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
    };
};
