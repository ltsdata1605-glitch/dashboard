
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { WarehouseColumnConfig, WarehouseMetricType } from '../../types';
import { Icon } from '../common/Icon';
import { SectionHeader } from '../common/SectionHeader';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { getWarehouseColumnConfig, saveWarehouseColumnConfig } from '../../services/dbService';
import { COL, WAREHOUSE_HEADER_COLORS, DEFAULT_WAREHOUSE_COLUMNS } from '../../constants';
import { getRowValue, formatCurrency, formatQuantity } from '../../utils/dataUtils';
import LoadingOverlay from '../common/LoadingOverlay';
import WarehouseSettingsModal from './WarehouseSettingsModal';
import { useWarehouseLogic } from '../../hooks/useWarehouseLogic';
import ModalWrapper from '../modals/ModalWrapper';

interface WarehouseSummaryProps {
    onBatchExport: () => Promise<void>;
}

const WarehouseSummary: React.FC<WarehouseSummaryProps> = ({ onBatchExport }) => {
    const { processedData, productConfig, originalData, handleExport, isExporting, isProcessing, uniqueFilterOptions, warehouseTargets, updateWarehouseTarget, filterState, handleFilterChange } = useDashboardContext();
    const data = processedData?.warehouseSummary ?? [];
    
    const summaryRef = useRef<HTMLDivElement>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'doanhThuQD', direction: 'desc' });
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    
    const [columns, setColumns] = useState<WarehouseColumnConfig[]>([]);
    
    // State for editing target
    const [editingTargetKho, setEditingTargetKho] = useState<{ id: string, name: string, value: string } | null>(null);
    const targetInputRef = useRef<HTMLInputElement>(null);

    const { sortedData, totals, customTotals, customProductColumnValues, getColumnValue } = useWarehouseLogic({
        data,
        columns,
        originalData,
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
            await handleExport(summaryRef.current, 'bao-cao-kho.png', {
                elementsToHide: ['.hide-on-export'],
                isCompactTable: true, // Fixes columns to content width
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
        const currentTarget = warehouseTargets[kho] || 0;
        // Format initial value with commas
        const formattedValue = currentTarget > 0 ? currentTarget.toLocaleString('en-US') : '';
        setEditingTargetKho({ id: kho, name: kho, value: formattedValue });
    };

    const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove non-digit characters
        const rawValue = e.target.value.replace(/\D/g, '');
        // Format with commas
        const formattedValue = rawValue ? parseInt(rawValue, 10).toLocaleString('en-US') : '';
        
        setEditingTargetKho(prev => prev ? { ...prev, value: formattedValue } : null);
    };

    const handleTargetSave = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (editingTargetKho) {
            // Remove commas before parsing to float
            const val = parseFloat(editingTargetKho.value.replace(/,/g, ''));
            if (!isNaN(val)) {
                updateWarehouseTarget(editingTargetKho.id, val);
            }
            setEditingTargetKho(null);
        }
    };

    useEffect(() => {
        if (editingTargetKho && targetInputRef.current) {
            targetInputRef.current.focus();
            // Optional: Move cursor to end if needed, but select() is often good for overwriting
            // targetInputRef.current.select(); 
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

    const groupedHeaders = useMemo(() => {
        const groups: { name: string; colSpan: number; }[] = [];
        if (visibleColumns.length === 0) return groups;
        
        let currentGroup = { name: visibleColumns[0].mainHeader, colSpan: 1 };
        for (let i = 1; i < visibleColumns.length; i++) {
            if (visibleColumns[i].mainHeader === currentGroup.name) {
                currentGroup.colSpan++;
            } else {
                groups.push(currentGroup);
                currentGroup = { name: visibleColumns[i].mainHeader, colSpan: 1 };
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
    
    // Calculate total target for footer based on currently displayed data
    const totalTarget = useMemo(() => {
        return data.reduce((sum, row) => sum + (warehouseTargets[row.khoName] || 0), 0);
    }, [data, warehouseTargets]);

    return (
        <>
            <div id="warehouse-summary-view" className="bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 overflow-hidden rounded-none mb-8 transition-all duration-300" ref={summaryRef}>
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
                        {/* Apple-style Toolbar for Trạng Thái Xuất */}
                        <div className="hidden sm:inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mr-2">
                            {['all', 'Đã', 'Chưa'].map(val => (
                                <button 
                                    key={val}
                                    onClick={() => handleFilterChange({ xuat: val })}
                                    className={`py-1 px-3 text-xs font-bold rounded-lg transition-all ${filterState.xuat === val ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'text-slate-500 hover:text-indigo-600'}`}
                                >
                                    {val === 'all' ? 'Tất cả trạng thái' : val === 'Đã' ? 'Đã Xuất' : 'Chưa Xuất'}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Cài đặt">
                            <Icon name="settings-2" size={5} />
                        </button>
                        {uniqueFilterOptions.kho.length > 1 && (
                            <button onClick={onBatchExport} disabled={isExporting} className="p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Xuất hàng loạt">
                                <Icon name="images" size={5} />
                            </button>
                        )}
                        <button onClick={handleSingleExport} disabled={isExporting} className="p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Chụp ảnh">
                            {isExporting ? <Icon name="loader-2" className="animate-spin" size={5} /> : <Icon name="camera" size={5} />}
                        </button>
                    </div>
                </SectionHeader>

                {/* END: Header Section */}

                {/* BEGIN: Data Table Section */}
                <section className="overflow-x-auto custom-scrollbar p-6">
                    <table className="min-w-full text-sm text-center border-collapse border border-slate-200 dark:border-slate-700">
                        <thead>
                            {/* Top Level Group Headers */}
                            <tr className="text-[11px] font-bold uppercase tracking-wider">
                                <th className="px-2 py-3 text-[#e11d48] bg-[#ffe4e6] border-b border-gray-200 sticky left-0 z-20 h-px">Kho</th>
                                {groupedHeaders.map((group, i) => {
                                    const styles = WAREHOUSE_HEADER_COLORS[group.name] || WAREHOUSE_HEADER_COLORS.DEFAULT;
                                    return (
                                        <th key={i} colSpan={group.colSpan} className={`px-2 py-3 ${styles.text} ${styles.sub} border-b border-gray-200 border-l first:border-l-0 h-px`}>
                                            {group.name}
                                        </th>
                                    );
                                })}
                            </tr>
                            {/* Sub-Headers */}
                            <tr className="bg-white text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                                <th onClick={() => handleSort('khoName')} className="px-2 py-3 border-b border-gray-200 sticky left-0 z-20 bg-white cursor-pointer hover:bg-gray-50 h-px">Mã Kho</th>
                                {visibleColumns.map((col, index) => {
                                    const isStart = isGroupStart(index);
                                    return (
                                        <th key={col.id} onClick={() => handleSort(col.id)} className={`px-2 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${isStart ? 'border-l' : ''} h-px`}>
                                            {col.subHeader}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedData.map((row) => (
                                <tr key={row.khoName} className="hover:bg-gray-50 transition-colors">
                                    <td 
                                        className="px-2 py-3 font-bold text-gray-900 underline decoration-dotted decoration-gray-400 underline-offset-4 sticky left-0 z-10 bg-white group-hover:bg-gray-50 cursor-pointer leading-tight h-px"
                                        onClick={() => handleTargetClick(row.khoName)}
                                    >
                                        {row.khoName}
                                    </td>
                                    {visibleColumns.map((col, index) => {
                                        const isHqqd = col.metric === 'hieuQuaQD';
                                        const isDTQD = col.metric === 'doanhThuQD';
                                        const isPercentHT = col.metric === 'percentHT';
                                        const isStart = isGroupStart(index);

                                        let value = (col.isCustom && col.productCodes) ? customProductColumnValues.get(col.id)?.get(row.khoName) : getColumnValue(row, col);
                                        
                                        if (col.metric === 'target') {
                                            value = warehouseTargets[row.khoName] || 0;
                                        } else if (col.metric === 'percentHT') {
                                            const target = warehouseTargets[row.khoName] || 0;
                                            const dtqd = row.doanhThuQD || 0;
                                            value = target > 0 ? (dtqd / target) * 100 : 0;
                                        }

                                        let content;
                                        if (isHqqd) {
                                            content = <span className={getHqqdClass(value)}>{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '—'}</span>;
                                        } else if (isDTQD) {
                                            content = <span className="font-semibold text-indigo-700">{formatRevenueForKho(value)}</span>;
                                        } else if (isPercentHT) {
                                            content = <span className="font-bold text-orange-500">{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '0%'}</span>;
                                        } else if (col.metric === 'traChamPercent') {
                                            content = <span className="font-medium text-gray-500">{value !== undefined && value !== 0 ? `${Math.round(value)}%` : '0%'}</span>;
                                        } else if (col.metricType === 'revenue' || col.metricType === 'revenueQD' || col.metric === 'doanhThuThuc' || col.metric === 'target') {
                                            content = <span>{formatRevenueForKho(value)}</span>;
                                        } else {
                                            content = <span>{formatQuantityForKho(value)}</span>;
                                        }

                                        return (
                                            <td key={`${row.khoName}-${col.id}`} className={`px-2 py-3 ${isStart ? 'border-l' : ''} leading-tight h-px`}>
                                                {content}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        {/* Table Footer / Total Row */}
                        <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600">
                            <tr className="font-bold text-slate-900 dark:text-slate-100">
                                <td className="px-2 py-3 uppercase tracking-tight text-[11px] sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 h-px">Tổng</td>
                                {visibleColumns.map((col, index) => {
                                    let value;
                                    if (col.isCustom && col.productCodes) {
                                        value = customTotals.get(col.id) || 0;
                                    } else if (col.metric && (totals as any)[col.metric] !== undefined) {
                                        value = (totals as any)[col.metric];
                                    } else if (col.metric === 'target') {
                                        value = totalTarget;
                                    } else if (col.metric === 'percentHT') {
                                        const totalDTQD = (totals as any).doanhThuQD || 0;
                                        value = totalTarget > 0 ? (totalDTQD / totalTarget) * 100 : 0;
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
                                    } else if (col.metricType === 'revenue' || col.metricType === 'revenueQD' || col.metric === 'doanhThuThuc' || col.metric === 'target') {
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
                title="Nhập Target"
                subTitle={`Đặt chỉ tiêu doanh thu cho kho ${editingTargetKho?.name}`}
                titleColorClass="text-indigo-600 dark:text-indigo-400"
                maxWidthClass="max-w-md"
            >
                <form onSubmit={handleTargetSave} className="p-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Doanh thu mục tiêu (VNĐ)
                    </label>
                    <input
                        ref={targetInputRef}
                        type="text"
                        value={editingTargetKho?.value || ''}
                        onChange={handleTargetChange}
                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 mb-6 text-lg font-semibold"
                        placeholder="Nhập số tiền..."
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setEditingTargetKho(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Hủy</button>
                        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold">Lưu</button>
                    </div>
                </form>
            </ModalWrapper>
        </>
    );
};

export default WarehouseSummary;
