
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { WarehouseColumnConfig, WarehouseMetricType } from '../../types';
import { Icon } from '../common/Icon';
import { SectionHeader } from '../common/SectionHeader';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { getWarehouseColumnConfig, saveWarehouseColumnConfig } from '../../services/dbService';
import { COL, WAREHOUSE_HEADER_COLORS, DEFAULT_WAREHOUSE_COLUMNS } from '../../constants';
import { getRowValue, formatCurrency, formatQuantity, getExportFilenamePrefix } from '../../utils/dataUtils';
import LoadingOverlay from '../common/LoadingOverlay';
import WarehouseSettingsModal from './WarehouseSettingsModal';
import { useWarehouseLogic } from '../../hooks/useWarehouseLogic';
import ModalWrapper from '../modals/ModalWrapper';
import { useAuth } from '../../contexts/AuthContext';

interface WarehouseSummaryProps {
    onBatchExport: () => Promise<void>;
}

const WarehouseSummary: React.FC<WarehouseSummaryProps> = ({ onBatchExport }) => {
    const { userRole } = useAuth();
    const { processedData, productConfig, originalData, warehouseFilteredData, handleExport, isExporting, isProcessing, uniqueFilterOptions, warehouseTargets, updateWarehouseTarget, warehouseDTThucTargets, updateWarehouseDTThucTarget, filterState, handleFilterChange, isLuyKe } = useDashboardContext();
    const data = processedData?.warehouseSummary ?? [];
    
    const summaryRef = useRef<HTMLDivElement>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'doanhThuQD', direction: 'desc' });
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    
    const toggleFullScreen = () => setIsFullScreen(!isFullScreen);
    const rowsPerPage = 50;
    
    const [columns, setColumns] = useState<WarehouseColumnConfig[]>([]);
    
    // State for editing target — now holds both DTQD and DTThuc values
    const [editingTargetKho, setEditingTargetKho] = useState<{ id: string, name: string, valueDTQD: string, valueDTThuc: string } | null>(null);
    const targetInputRef = useRef<HTMLInputElement>(null);

    // Auto-format number with commas while preserving cursor position
    const formatWithCommas = (value: string): string => {
        // Strip non-numeric except dots
        const cleaned = value.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        // Add commas to integer part
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.length > 1 ? parts[0] + '.' + parts[1] : parts[0];
    };

    const parseFormattedNumber = (value: string): number => {
        return parseFloat(value.replace(/,/g, '')) || 0;
    };

    const { sortedData, totals, customTotals, customProductColumnValues, getColumnValue } = useWarehouseLogic({
        data,
        columns,
        originalData: warehouseFilteredData,
        productConfig,
        sortConfig
    });

    const getHqqdClass = (hqqdValue: number | undefined): string => {
        if (hqqdValue === undefined || isNaN(hqqdValue)) return 'text-gray-300';
        return 'text-orange-400 font-bold';
    };

    const formatRevenueForKho = (value: number | undefined): string => {
        if (value === undefined || isNaN(value) || value === 0) return '—';
        return Math.round(value / 1000000).toLocaleString('vi-VN');
    };
    
    const formatQuantityForKho = (value: number | undefined): string => {
        if (value === undefined || isNaN(value) || value === 0) return '—';
        return Math.round(value).toLocaleString('vi-VN');
    };
    
    const handleSingleExport = async () => {
        if (summaryRef.current) {
            const prefix = getExportFilenamePrefix(filterState.kho);
            await handleExport(summaryRef.current, `${prefix}-Chi-tiet-theo-kho.png`, {
                elementsToHide: ['.hide-on-export'],
                isCompactTable: true,
                scale: 2
            });
        }
    };

    const { allIndustries, allGroups, allManufacturers } = useMemo(() => {
        if (!productConfig || !originalData) return { allIndustries: [], allGroups: [], allManufacturers: [] };
        const industries = new Set<string>();
        const groups = new Set<string>();
        Object.keys(productConfig.childToParentMap).forEach(childKey => industries.add(productConfig.childToParentMap[childKey]));
        Object.values(productConfig.subgroups).forEach(parent => Object.keys(parent).forEach(subgroup => groups.add(subgroup)));
        const dataRows = originalData;
        const manufacturers = new Set<string>(dataRows.map(row => getRowValue(row, COL.MANUFACTURER)).filter(Boolean));
        return { 
            allIndustries: Array.from(industries).sort(), 
            allGroups: Array.from(groups).sort(),
            allManufacturers: Array.from(manufacturers).sort(),
        };
    }, [productConfig, originalData]);

    useEffect(() => {
        const loadConfig = async () => {
            let config = await getWarehouseColumnConfig();
            if (!config || config.length === 0) {
                config = [...DEFAULT_WAREHOUSE_COLUMNS];
                await saveWarehouseColumnConfig(config);
            }
            setColumns(config);
        };
        loadConfig();
    }, [allIndustries, allGroups]);

    const handleSaveColumns = (newColumns: WarehouseColumnConfig[]) => {
        setColumns(newColumns);
        saveWarehouseColumnConfig(newColumns).catch(err => console.error("Failed to save column config:", err));
    };
    
    const handleTargetClick = (kho: string) => {
        if (userRole === 'employee') return;
        const currentDTQD = warehouseTargets[kho] || 0;
        const currentDTThuc = warehouseDTThucTargets[kho] || 0;
        const dtqdDivided = currentDTQD > 0 ? (currentDTQD / 1000000) : 0;
        const dtThucDivided = currentDTThuc > 0 ? (currentDTThuc / 1000000) : 0;
        setEditingTargetKho({ 
            id: kho, 
            name: kho, 
            valueDTQD: dtqdDivided > 0 ? formatWithCommas(dtqdDivided.toString()) : '',
            valueDTThuc: dtThucDivided > 0 ? formatWithCommas(dtThucDivided.toString()) : '',
        });
    };

    const handleTargetInputChange = (field: 'valueDTQD' | 'valueDTThuc', rawValue: string) => {
        const formatted = formatWithCommas(rawValue);
        setEditingTargetKho(prev => prev ? { ...prev, [field]: formatted } : null);
    };

    const handleTargetSave = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (editingTargetKho) {
            const valDTQD = parseFormattedNumber(editingTargetKho.valueDTQD);
            const valDTThuc = parseFormattedNumber(editingTargetKho.valueDTThuc);
            if (valDTQD > 0) updateWarehouseTarget(editingTargetKho.id, valDTQD * 1000000);
            if (valDTThuc > 0) updateWarehouseDTThucTarget(editingTargetKho.id, valDTThuc * 1000000);
            setEditingTargetKho(null);
        }
    };

    useEffect(() => {
        if (editingTargetKho && targetInputRef.current) {
            targetInputRef.current.focus();
        }
    }, [editingTargetKho]);
    
    if (!data || data.length === 0) return null;

    const handleSort = (columnId: string) => {
        setSortConfig(prev => ({ key: columnId, direction: (prev?.key === columnId && prev.direction === 'desc') ? 'asc' : 'desc' }));
    };
    
    const visibleColumns = useMemo(() => {
        return columns
            .filter(c => c.isVisible)
            .sort((a, b) => a.order - b.order);
    }, [columns]);

    // Pagination Logic
    useEffect(() => {
        setCurrentPage(1); // Reset page when filter or root data changes
    }, [data, filterState, sortConfig]);

    const totalPages = Math.ceil(sortedData.length / rowsPerPage);
    const currentData = useMemo(() => {
        return sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    }, [sortedData, currentPage]);

    const groupedHeaders = useMemo(() => {
        const groups: { name: string; colSpan: number; startIndex: number }[] = [];
        if (visibleColumns.length === 0) return groups;
        
        let currentGroup = { name: visibleColumns[0].mainHeader, colSpan: 1, startIndex: 0 };
        for (let i = 1; i < visibleColumns.length; i++) {
            if (visibleColumns[i].mainHeader === currentGroup.name) {
                currentGroup.colSpan++;
            } else {
                groups.push(currentGroup);
                currentGroup = { name: visibleColumns[i].mainHeader, colSpan: 1, startIndex: i };
            }
        }
        groups.push(currentGroup);
        return groups;
    }, [visibleColumns]);

    // Helper to check if a column is the start of a new group to apply the vertical separator
    const isGroupStart = (index: number) => {
        if (index === 0) return true;
        return visibleColumns[index].mainHeader !== visibleColumns[index - 1].mainHeader;
    };
    
    const daysInMonth = useMemo(() => {
        if (filterState.selectedMonths && filterState.selectedMonths.length === 1) {
            const match = filterState.selectedMonths[0].match(/Tháng (\d{2})\/(\d{4})/);
            if (match) return new Date(parseInt(match[2]), parseInt(match[1]), 0).getDate();
        }
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }, [filterState.selectedMonths]);

    const daysPassed = useMemo(() => {
        const now = new Date();
        if (filterState.selectedMonths && filterState.selectedMonths.length === 1) {
            const match = filterState.selectedMonths[0].match(/Tháng (\d{2})\/(\d{4})/);
            if (match) {
                const m = parseInt(match[1], 10) - 1;
                const y = parseInt(match[2], 10);
                if (m === now.getMonth() && y === now.getFullYear()) {
                    return now.getDate() || 1;
                }
                return new Date(y, m + 1, 0).getDate();
            }
        }
        return now.getDate() || 1;
    }, [filterState.selectedMonths]);

    // Calculate total target for footer based on currently displayed data
    const totalTarget = useMemo(() => {
        const monthlyTotal = data.reduce((sum, row) => sum + (warehouseTargets[row.khoName] || 0), 0);
        return isLuyKe ? monthlyTotal : (monthlyTotal > 0 ? monthlyTotal / daysInMonth : 0);
    }, [data, warehouseTargets, isLuyKe, daysInMonth]);

    return (
        <>
            <div id="warehouse-summary-view" className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden mb-2 lg:mb-8 transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-[100] m-0 w-full h-full overflow-y-auto rounded-none shadow-2xl' : 'rounded-xl lg:rounded-none'}`} ref={summaryRef}>
                {(isProcessing || isExporting) && (
                    <div className="hide-on-export">
                        <LoadingOverlay />
                    </div>
                )}

                {/* BEGIN: Header Section */}
                <SectionHeader 
                    title="Chi Tiết Theo Kho" 
                    icon="layout-grid" 
                    subtitle="Phân tích hiệu suất từng siêu thị"
                >
                    <div className="flex items-center space-x-2 hide-on-export">
                        {userRole !== 'employee' && (
                            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Cài đặt">
                                <Icon name="settings-2" size={5} />
                            </button>
                        )}
                        {/* Divider */}
                        {userRole !== 'employee' && <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>}
                        <button onClick={handleSingleExport} disabled={isExporting} className="p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Chụp ảnh">
                            {isExporting ? <Icon name="loader-2" className="animate-spin" size={5} /> : <Icon name="camera" size={5} />}
                        </button>
                        <button onClick={toggleFullScreen} className="p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title={isFullScreen ? "Thu nhỏ" : "Phóng to toàn màn hình"}>
                            <Icon name={isFullScreen ? "minimize-2" : "maximize-2"} size={5} />
                        </button>
                        {uniqueFilterOptions.kho.length > 1 && (
                            <button onClick={onBatchExport} disabled={isExporting} className="p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Xuất hàng loạt">
                                <Icon name="images" size={5} />
                            </button>
                        )}
                    </div>
                </SectionHeader>

                {/* END: Header Section */}


                {/* === TABLE VIEW (all screen sizes) === */}
                <section className="overflow-x-auto custom-scrollbar p-2 lg:p-6 touch-auto -webkit-overflow-scrolling-touch relative">
                    <table className="w-full min-w-max text-sm text-center border-collapse border border-slate-200 dark:border-slate-700">
                        <thead>
                            {/* Top Level Group Headers */}
                            <tr className="text-[11px] font-bold uppercase tracking-wider">
                                <th rowSpan={2} onClick={() => handleSort('khoName')} className="px-4 py-3 text-center text-[12px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none align-middle sticky left-0 z-20 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-1">
                                        MÃ KHO
                                        {sortConfig.key === 'khoName' && (
                                            <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />
                                        )}
                                    </div>
                                </th>
                                {groupedHeaders.map((group, i) => {
                                    if (!group.name || group.name.trim() === '' || group.name === '-') {
                                        const colsInGroup = visibleColumns.slice(group.startIndex, group.startIndex + group.colSpan);
                                        return colsInGroup.map((col, idx) => {
                                            const styles = WAREHOUSE_HEADER_COLORS[col.mainHeader] || WAREHOUSE_HEADER_COLORS.DEFAULT;
                                            return (
                                                <th key={`${i}-${idx}`} rowSpan={2} onClick={() => handleSort(col.id)} className={`px-2 py-3 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity uppercase tracking-wider text-[11px] font-bold text-center align-middle ${styles.sub} ${styles.text}`}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        {col.metric === 'percentHT' && isLuyKe ? '%DKHT' : col.subHeader}
                                                        {sortConfig.key === col.id && (
                                                            <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={2.5} />
                                                        )}
                                                    </div>
                                                </th>
                                            );
                                        });
                                    }

                                    const styles = WAREHOUSE_HEADER_COLORS[group.name] || WAREHOUSE_HEADER_COLORS.DEFAULT;
                                    return (
                                        <th key={i} colSpan={group.colSpan} className={`px-2 py-3 ${styles.text} ${styles.sub} border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[11px] font-bold border-r text-center align-middle`}>
                                            {group.name}
                                        </th>
                                    );
                                })}
                            </tr>
                            {/* Sub-Headers */}
                            <tr>
                                {visibleColumns.map((col, index) => {
                                    if (!col.mainHeader || col.mainHeader.trim() === '' || col.mainHeader === '-') {
                                        return null;
                                    }
                                    const styles = WAREHOUSE_HEADER_COLORS[col.mainHeader] || WAREHOUSE_HEADER_COLORS.DEFAULT;
                                    return (
                                        <th key={col.id} onClick={() => handleSort(col.id)} className={`px-2 py-3 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity uppercase tracking-wider text-[11px] font-bold text-center align-middle ${styles.sub} ${styles.text}`}>
                                            <div className="flex items-center justify-center gap-1">
                                                {col.metric === 'percentHT' && isLuyKe ? '%DKHT' : col.subHeader}
                                                {sortConfig.key === col.id && (
                                                    <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={2.5} />
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {currentData.map((row) => (
                                <tr key={row.khoName} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <td 
                                        className={`px-2 py-3 font-bold text-slate-900 dark:text-slate-100 underline decoration-dotted decoration-slate-400 dark:decoration-slate-500 underline-offset-4 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 leading-tight border-r border-slate-200 dark:border-slate-700 text-center ${userRole !== 'employee' ? 'cursor-pointer' : ''}`}
                                        onClick={() => handleTargetClick(row.khoName)}
                                    >
                                        {row.khoName}
                                    </td>
                                    {visibleColumns.map((col, index) => {
                                        const isHqqd = col.metric === 'hieuQuaQD';
                                        const isDTQD = col.metric === 'doanhThuQD';
                                        const isPercentHT = col.metric === 'percentHT';
                                        const isStart = isGroupStart(index);

                                        let value = getColumnValue(row, col);
                                        
                                        if (col.metric === 'target') {
                                            const monthly = warehouseTargets[row.khoName] || 0;
                                            value = isLuyKe ? monthly : (monthly > 0 ? monthly / daysInMonth : 0);
                                        } else if (col.metric === 'percentHT') {
                                            const monthly = warehouseTargets[row.khoName] || 0;
                                            const dtqd = row.doanhThuQD || 0;
                                            if (isLuyKe) {
                                                const target = monthly;
                                                const projected = (dtqd / daysPassed) * daysInMonth;
                                                value = target > 0 ? (projected / target) * 100 : 0;
                                            } else {
                                                const target = monthly > 0 ? monthly / daysInMonth : 0;
                                                value = target > 0 ? (dtqd / target) * 100 : 0;
                                            }
                                        }

                                        let avg: number | undefined;
                                        if (col.conditionalFormatting?.some(r => r.condition === '>avg' || r.condition === '<avg')) {
                                            const totalRows = currentData.length || 1;
                                            if (col.metric && totals[col.metric as keyof typeof totals] !== undefined) {
                                                avg = (totals[col.metric as keyof typeof totals] as number) / totalRows;
                                            } else if (col.metricType === 'revenueQD' && totals.doanhThuQD !== undefined) {
                                                avg = totals.doanhThuQD / totalRows;
                                            } else if (customTotals[col.id] !== undefined) {
                                                avg = customTotals[col.id] / totalRows;
                                            }
                                        }

                                        let customColor: string | null = null;
                                        if (col.conditionalFormatting && value !== undefined) {
                                            for (const rule of col.conditionalFormatting) {
                                                let isMatch = false;
                                                switch (rule.condition) {
                                                    case '>': isMatch = value > rule.value1; break;
                                                    case '<': isMatch = value < rule.value1; break;
                                                    case '=': isMatch = value === rule.value1; break;
                                                    case 'between': isMatch = rule.value2 !== undefined && value >= rule.value1 && value <= rule.value2; break;
                                                    case '>avg': isMatch = avg !== undefined && value > avg; break;
                                                    case '<avg': isMatch = avg !== undefined && value < avg; break;
                                                }
                                                if (isMatch) {
                                                    customColor = rule.color;
                                                    break;
                                                }
                                            }
                                        }

                                        let content;
                                        const textColorStyle = customColor ? { color: customColor } : {};
                                        
                                        if (isHqqd) {
                                            content = <span className={customColor ? "font-bold" : getHqqdClass(value)} style={textColorStyle}>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '—'}</span>;
                                        } else if (isDTQD) {
                                            content = <span className={customColor ? "font-semibold" : "font-semibold text-indigo-700"} style={textColorStyle}>{formatRevenueForKho(value)}</span>;
                                        } else if (isPercentHT) {
                                            let extraIcon = null;
                                            let classNameStr = customColor ? "font-bold" : "font-bold text-orange-500";
                                            if (value !== undefined && value >= 120) {
                                                extraIcon = <span title="Tuyệt đỉnh" className="ml-1 text-[13px]">🔥</span>;
                                                if (!customColor) classNameStr = "font-black text-rose-600 drop-shadow-sm";
                                            } else if (value !== undefined && value >= 100) {
                                                extraIcon = <span title="Đạt Mục Tiêu" className="ml-1 text-[13px]">🏆</span>;
                                                if (!customColor) classNameStr = "font-extrabold text-yellow-600";
                                            }
                                            content = (
                                                <div className="flex items-center justify-center">
                                                    <span className={classNameStr} style={textColorStyle}>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '0%'}</span>
                                                    {extraIcon}
                                                </div>
                                            );
                                        } else if (col.metric === 'traChamPercent') {
                                            content = <span className={customColor ? "font-medium" : "font-medium text-gray-500"} style={textColorStyle}>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '0%'}</span>;
                                        } else if (col.type === 'calculated' && col.displayAs === 'percentage') {
                                            content = <span className={customColor ? "font-bold" : "font-bold text-slate-700 dark:text-slate-300"} style={textColorStyle}>{value !== undefined && value !== 0 ? `${Math.round(value * 100)}%` : '0%'}</span>;
                                        } else if (col.metricType === 'revenue' || col.metricType === 'revenueQD' || col.metric === 'doanhThuThuc' || col.metric === 'target' || col.type === 'target') {
                                            content = <span style={textColorStyle}>{formatRevenueForKho(value)}</span>;
                                        } else {
                                            content = <span style={textColorStyle}>{formatQuantityForKho(value)}</span>;
                                        }

                                        return (
                                            <td key={`${row.khoName}-${col.id}`} className={`px-2 py-3 ${isStart ? 'border-l border-slate-200 dark:border-slate-700' : ''} leading-tight h-px`}>
                                                {content}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        {/* Table Footer / Total Row */}
                        <tfoot className="bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                            <tr className="font-bold text-slate-900 dark:text-slate-100">
                                <td className="px-2 py-3 uppercase tracking-tight text-[11px] sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-center">Tổng</td>
                                {visibleColumns.map((col, index) => {
                                    let value;
                                    if (col.isCustom) {
                                        value = customTotals.get(col.id) || 0;
                                    } else if (col.metric && (totals as any)[col.metric] !== undefined) {
                                        value = (totals as any)[col.metric];
                                    } else if (col.metric === 'target') {
                                        value = totalTarget;
                                    } else if (col.metric === 'percentHT') {
                                        const totalDTQD = (totals as any).doanhThuQD || 0;
                                        if (isLuyKe) {
                                            const projected = (totalDTQD / daysPassed) * daysInMonth;
                                            value = totalTarget > 0 ? (projected / totalTarget) * 100 : 0;
                                        } else {
                                            value = totalTarget > 0 ? (totalDTQD / totalTarget) * 100 : 0;
                                        }
                                    } else {
                                        value = customTotals.get(col.id) || 0;
                                    }

                                    const isHqqd = col.metric === 'hieuQuaQD';
                                    const isDTQD = col.metric === 'doanhThuQD';
                                    const isPercentHT = col.metric === 'percentHT';
                                    const isStart = isGroupStart(index);

                                    let content;
                                    if (isHqqd) {
                                        content = <span className={getHqqdClass(value)}>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '—'}</span>;
                                    } else if (isDTQD) {
                                        content = <span className="text-indigo-700">{formatRevenueForKho(value)}</span>;
                                    } else if (isPercentHT) {
                                        content = <span className="text-orange-500">{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '0%'}</span>;
                                    } else if (col.metric === 'traChamPercent') {
                                        content = <span>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '0%'}</span>;
                                    } else if (col.type === 'calculated' && col.displayAs === 'percentage') {
                                        content = <span className="font-bold text-slate-700 dark:text-slate-300">{value !== undefined && value !== 0 ? `${Math.round(value * 100)}%` : '0%'}</span>;
                                    } else if (col.metricType === 'revenue' || col.metricType === 'revenueQD' || col.metric === 'doanhThuThuc' || col.metric === 'target' || col.type === 'target') {
                                        content = <span>{formatRevenueForKho(value)}</span>;
                                    } else {
                                        content = <span>{formatQuantityForKho(value)}</span>;
                                    }

                                    return (
                                        <td key={`total-${col.id}`} className={`px-2 py-3 ${isStart ? 'border-l border-slate-200 dark:border-slate-700' : ''} leading-tight h-px bg-slate-100 dark:bg-slate-800`}>
                                            {content}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </section>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hide-on-export">
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Hiển thị {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, sortedData.length)} trên <span className="font-bold">{sortedData.length}</span> kết quả
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-slate-700 dark:text-slate-200"
                            >
                                Trước
                            </button>
                            <div className="px-3 py-1 text-sm font-semibold bg-slate-200/50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-center min-w-[3rem]">
                                {currentPage} / {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-slate-700 dark:text-slate-200"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
                {/* END: Data Table Section */}
            </div>

             <WarehouseSettingsModal 
                isOpen={isSettingsModalOpen} 
                onClose={() => setIsSettingsModalOpen(false)}
                onSave={handleSaveColumns}
                columns={columns}
                allIndustries={allIndustries}
                allGroups={allGroups}
                allManufacturers={allManufacturers}
            />

            {/* Target Edit Modal */}
            <ModalWrapper
                isOpen={!!editingTargetKho}
                onClose={() => setEditingTargetKho(null)}
                title="Nhập Target Tháng"
                subTitle={`Đặt chỉ tiêu doanh thu tháng cho kho ${editingTargetKho?.name}`}
                titleColorClass="text-indigo-600 dark:text-indigo-400"
                maxWidthClass="max-w-lg"
            >
                <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* DT Thực */}
                        <div>
                            <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 uppercase tracking-wider">
                                Doanh Thu Thực (Tr)
                            </label>
                            <input
                                ref={targetInputRef}
                                type="text"
                                inputMode="decimal"
                                value={editingTargetKho?.valueDTThuc || ''}
                                onChange={(e) => handleTargetInputChange('valueDTThuc', e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                                className="w-full p-2.5 sm:p-3 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300 transition-all"
                                placeholder="VD: 1,500"
                            />
                        </div>
                        {/* DT QĐ */}
                        <div>
                            <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-1.5 uppercase tracking-wider">
                                Doanh Thu Q.Đổi (Tr)
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={editingTargetKho?.valueDTQD || ''}
                                onChange={(e) => handleTargetInputChange('valueDTQD', e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                                className="w-full p-2.5 sm:p-3 border-2 border-blue-200 dark:border-blue-800 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300 transition-all"
                                placeholder="VD: 2,000"
                            />
                        </div>
                    </div>

                    {/* Daily target preview */}
                    {(() => {
                        const valDTThuc = parseFormattedNumber(editingTargetKho?.valueDTThuc || '0');
                        const valDTQD = parseFormattedNumber(editingTargetKho?.valueDTQD || '0');
                        if (valDTThuc > 0 || valDTQD > 0) {
                            let days = 30;
                            if (filterState.selectedMonths && filterState.selectedMonths.length === 1) {
                                const match = filterState.selectedMonths[0].match(/Tháng (\d{2})\/(\d{4})/);
                                if (match) days = new Date(parseInt(match[2]), parseInt(match[1]), 0).getDate();
                            } else {
                                const now = new Date();
                                days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                            }
                            return (
                                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Quy đổi Target ngày ({days} ngày)</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {valDTThuc > 0 && (
                                            <div className="flex items-center justify-between text-sm bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">DT Thực/ngày</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{(valDTThuc / days).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Tr</span>
                                            </div>
                                        )}
                                        {valDTQD > 0 && (
                                            <div className="flex items-center justify-between text-sm bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">DT QĐ/ngày</span>
                                                <span className="font-bold text-blue-600 dark:text-blue-400">{(valDTQD / days).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Tr</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        return <div className="mb-4" />;
                    })()}
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setEditingTargetKho(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Hủy</button>
                        <button type="button" onClick={() => handleTargetSave()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold">Lưu</button>
                    </div>
                </div>
            </ModalWrapper>
        </>
    );
};

export default WarehouseSummary;
