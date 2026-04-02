import React, { useState, useMemo, useEffect, forwardRef } from 'react';
import type { Employee, DataRow, ProductConfig, WarehouseColumnConfig, ExploitationData } from '../../types';
import { Icon } from '../common/Icon';
import { useEmployeeColumnLogic } from '../../hooks/useEmployeeColumnLogic';
import EmployeeAnalysisSettingsModal from './EmployeeAnalysisSettingsModal';
import { getEmployeeColumnConfig, saveEmployeeColumnConfig } from '../../services/dbService';
import { WAREHOUSE_HEADER_COLORS } from '../../constants';

const DEFAULT_EMPLOYEE_COLUMNS: WarehouseColumnConfig[] = [
    {
        id: 'doanhThuThuc', order: 0, isVisible: true, isCustom: false, metric: 'doanhThuThuc',
        mainHeader: 'KPI CHÍNH', subHeader: 'DT THỰC'
    },
    {
        id: 'doanhThuQD', order: 1, isVisible: true, isCustom: false, metric: 'doanhThuQD',
        mainHeader: 'KPI CHÍNH', subHeader: 'DT Q.ĐỔI'
    }
];

interface IndustryAnalysisTabProps {
    employees: Employee[];
    baseFilteredData: DataRow[];
    productConfig: ProductConfig;
    onExport?: () => void;
    isExporting?: boolean;
    onBatchExport: (data: ExploitationData[]) => void;
}

const IndustryAnalysisTab = forwardRef<HTMLDivElement, IndustryAnalysisTabProps>(({
    employees,
    baseFilteredData,
    productConfig,
    onExport,
    isExporting,
    onBatchExport
}, ref) => {
    const [columns, setColumns] = useState<WarehouseColumnConfig[]>([]);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'doanhThuQD', direction: 'desc' });
    
    // Derived config
    const { allIndustries, allGroups, allManufacturers } = useMemo(() => {
        if (!productConfig || !baseFilteredData) return { allIndustries: [], allGroups: [], allManufacturers: [] };
        const industries = new Set<string>();
        const groups = new Set<string>();
        Object.keys(productConfig.childToParentMap).forEach(childKey => industries.add(productConfig.childToParentMap[childKey]));
        Object.values(productConfig.subgroups).forEach(parent => Object.keys(parent).forEach(subgroup => groups.add(subgroup)));
        const manufacturers = new Set<string>(baseFilteredData.map(row => row.Manufacturer).filter(Boolean));
        return { 
            allIndustries: Array.from(industries).sort(), 
            allGroups: Array.from(groups).sort(),
            allManufacturers: Array.from(manufacturers).sort(),
        };
    }, [productConfig, baseFilteredData]);

    useEffect(() => {
        const loadConfig = async () => {
            let config = await getEmployeeColumnConfig();
            if (!config || config.length === 0) {
                config = [...DEFAULT_EMPLOYEE_COLUMNS];
                // Don't auto-save an empty config initially, just to preview, but we can save it:
                await saveEmployeeColumnConfig(config);
            }
            setColumns(config);
        };
        loadConfig();
    }, []);

    const handleSaveColumns = (newColumns: WarehouseColumnConfig[]) => {
        setColumns(newColumns);
        saveEmployeeColumnConfig(newColumns).catch(err => console.error(err));
        setIsSettingsModalOpen(false);
    };

    const { sortedData, totals, customTotals, getColumnValue } = useEmployeeColumnLogic({
        data: employees,
        columns,
        originalData: baseFilteredData,
        productConfig,
        sortConfig
    });

    const visibleColumns = useMemo(() => columns.filter(c => c.isVisible).sort((a, b) => a.order - b.order), [columns]);

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

    const isGroupStart = (index: number) => index === 0 || visibleColumns[index].mainHeader !== visibleColumns[index - 1].mainHeader;

    const handleSort = (columnId: string) => setSortConfig(prev => ({ key: columnId, direction: prev.key === columnId && prev.direction === 'desc' ? 'asc' : 'desc' }));

    const formatValue = (value: number | undefined, isPercentage: boolean, isRevenue: boolean) => {
        if (value === undefined || isNaN(value)) return '—';
        if (isPercentage) return `${Math.round(value * (isRevenue ? 1 : 100))}%`; // If it's a manual division we do *100, if it comes ready (hieuQuaQD) we don't.
        if (isRevenue) return Math.round(value / 1000000).toLocaleString('vi-VN');
        return Math.round(value).toLocaleString('vi-VN');
    };

    return (
        <div ref={ref} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden rounded-xl">
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hide-on-export">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    <Icon name="layout-grid" size={4.5} className="text-indigo-500"/>
                    MA TRẬN CHỈ SỐ NHÂN VIÊN
                </h3>
                <div className="flex gap-2">
                    <button onClick={() => setIsSettingsModalOpen(true)} className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1.5">
                        <Icon name="settings-2" size={3.5} />
                        Tùy chỉnh cột
                    </button>
                    {onExport && (
                         <button onClick={onExport} disabled={isExporting} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                            {isExporting ? <Icon name="loader-2" size={4} className="animate-spin" /> : <Icon name="camera" size={4} />}
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full text-sm text-center border-collapse">
                    <thead>
                        <tr className="text-[11px] font-bold uppercase tracking-wider">
                            <th rowSpan={2} onClick={() => handleSort('name')} className="px-3 py-2 text-left bg-slate-50 dark:bg-slate-800/80 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-20 hover:bg-slate-100 cursor-pointer text-slate-700 dark:text-slate-300 h-px">
                                <div className="flex items-center gap-1 min-w-[120px]">
                                    NHÂN VIÊN 
                                    {sortConfig.key === 'name' && <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3}/>}
                                </div>
                            </th>
                            {groupedHeaders.map((g, i) => {
                                const styles = WAREHOUSE_HEADER_COLORS[g.name] || WAREHOUSE_HEADER_COLORS.DEFAULT;
                                return <th key={i} colSpan={g.colSpan} className={`px-2 py-2 ${styles.text} ${styles.sub} border-b border-slate-200 dark:border-slate-700 border-r h-px`}>{g.name}</th>;
                            })}
                        </tr>
                        <tr>
                            {visibleColumns.map(col => {
                                const styles = WAREHOUSE_HEADER_COLORS[col.mainHeader] || WAREHOUSE_HEADER_COLORS.DEFAULT;
                                return (
                                    <th key={col.id} onClick={() => handleSort(col.id)} className={`px-2 py-2 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity ${styles.sub} ${styles.text} text-[10px] font-bold h-px`}>
                                        <div className="flex justify-center items-center gap-1">
                                            {col.subHeader}
                                            {sortConfig.key === col.id && <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={2.5}/>}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {sortedData.map(row => (
                            <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-3 py-2 text-left font-semibold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap leading-tight h-px">
                                    <div className="flex flex-col">
                                        <span>{row.name}</span>
                                        <span className="text-[10px] text-slate-400 font-normal">{row.department}</span>
                                    </div>
                                </td>
                                {visibleColumns.map((col, idx) => {
                                    const val = getColumnValue(row, col);
                                    let isRev = col.metricType === 'revenue' || col.metricType === 'revenueQD' || col.metric === 'doanhThuThuc' || col.metric === 'doanhThuQD';
                                    let isPct = col.displayAs === 'percentage' || col.metric === 'hieuQuaQD';

                                    let customColor: string | null = null;
                                    if (col.conditionalFormatting && val !== undefined) {
                                         for (const rule of col.conditionalFormatting) {
                                              if (rule.condition === '>' && val > rule.value1) { customColor = rule.color; break; }
                                              if (rule.condition === '<' && val < rule.value1) { customColor = rule.color; break; }
                                         }
                                    }
                                    
                                    // Highlight if text is red/blue for standard metrics
                                    if(!customColor && col.metric === 'doanhThuQD') customColor = '#4338ca'; // indigo-700 loosely

                                    return (
                                        <td key={col.id} className={`px-2 py-2 ${isGroupStart(idx) ? 'border-l' : ''} border-slate-200 dark:border-slate-700 h-px`}>
                                            <span className="font-medium" style={customColor ? { color: customColor } : {}}>
                                                {formatValue(val, isPct, isRev)}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600">
                        <tr>
                            <td className="px-3 py-2 font-bold text-left sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 h-px">TỔNG CHUNG</td>
                            {visibleColumns.map((col, idx) => {
                                let totalVal = col.isCustom ? customTotals.get(col.id) : (totals as any)[col.metric || ''];
                                let isRev = col.metricType === 'revenue' || col.metricType === 'revenueQD' || col.metric === 'doanhThuThuc' || col.metric === 'doanhThuQD';
                                let isPct = col.displayAs === 'percentage' || col.metric === 'hieuQuaQD';
                                
                                return (
                                    <td key={col.id} className={`px-2 py-2 font-bold text-slate-800 dark:text-slate-200 ${isGroupStart(idx) ? 'border-l' : ''} border-slate-200 dark:border-slate-700 h-px`}>
                                        {formatValue(totalVal, isPct, isRev)}
                                    </td>
                                );
                            })}
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            {isSettingsModalOpen && (
                <EmployeeAnalysisSettingsModal 
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    onSave={handleSaveColumns}
                    columns={columns}
                    allIndustries={allIndustries}
                    allGroups={allGroups}
                    allManufacturers={allManufacturers}
                />
            )}
        </div>
    );
});

export default IndustryAnalysisTab;
