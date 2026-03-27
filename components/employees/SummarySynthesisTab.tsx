
import React, { useState, useMemo, forwardRef, useEffect } from 'react';
import { Icon } from '../common/Icon';
import { formatCurrency, abbreviateName, formatQuantity, getHeSoQuyDoi, getRowValue } from '../../utils/dataUtils';
import type { DataRow, ProductConfig, Employee } from '../../types';
import { COL, HINH_THUC_XUAT_THU_HO } from '../../constants';
import MultiSelectDropdown from '../common/MultiSelectDropdown';

interface CustomTabConfig {
    label: string;
    metricType: 'quantity' | 'revenue' | 'revenueQD';
    selectedIndustries: string[];
    selectedSubgroups: string[];
    selectedManufacturers: string[];
    productCodes: string[];
}

interface SummarySynthesisTabProps {
    baseFilteredData: DataRow[];
    productConfig: ProductConfig;
    employeeData: Employee[];
    isCustomTab?: boolean;
    customConfig?: CustomTabConfig;
    onExport?: () => void;
    isExporting?: boolean;
}

const SummarySynthesisTab = React.memo(forwardRef<HTMLDivElement, SummarySynthesisTabProps>(({ baseFilteredData, productConfig, employeeData, isCustomTab, customConfig, onExport, isExporting }, ref) => {
    const [internalMetricType, setInternalMetricType] = useState<'revenue' | 'quantity'>('quantity');
    const [internalGroupMode, setInternalGroupMode] = useState<'parent' | 'subgroup'>('subgroup'); 
    const [internalSelectedGroups, setInternalSelectedGroups] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: isCustomTab ? 'value' : 'name', direction: isCustomTab ? 'desc' : 'asc' });

    const metricType = customConfig ? customConfig.metricType : internalMetricType;
    const selectedGroups = customConfig ? customConfig.selectedSubgroups : internalSelectedGroups;
    
    const productSubgroups = useMemo(() => {
        const subgroups = new Set<string>();
        Object.values(productConfig.subgroups).forEach(parent => {
            Object.keys(parent).forEach(subgroup => subgroups.add(subgroup));
        });
        return Array.from(subgroups).sort();
    }, [productConfig]);

    const productParentGroups = useMemo(() => {
        return Array.from(new Set(Object.values(productConfig.childToParentMap))).sort();
    }, [productConfig]);

    const availableOptions = internalGroupMode === 'parent' ? productParentGroups : productSubgroups;

    useEffect(() => {
        if (!isCustomTab && availableOptions.length > 0) {
            if (internalGroupMode === 'subgroup') {
                 const defaultGroups = availableOptions.filter(g => ['Sim Online', 'Bảo hiểm', 'Đồng hồ Nam', 'Camera'].includes(g));
                 setInternalSelectedGroups(defaultGroups.length > 0 ? defaultGroups : availableOptions.slice(0, 4));
            } else {
                 const defaultParents = availableOptions.filter(g => ['Sim', 'Bảo hiểm', 'Wearable', 'Phụ kiện'].includes(g));
                 setInternalSelectedGroups(defaultParents.length > 0 ? defaultParents : availableOptions.slice(0, 4));
            }
        }
    }, [availableOptions, internalGroupMode, isCustomTab]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const { rows, subgroupTotals, groupedRows, sortedDepartments, departmentTotals } = useMemo(() => {
        if (!baseFilteredData.length || !employeeData.length) {
            return { rows: [], subgroupTotals: new Map(), groupedRows: {}, sortedDepartments: [], departmentTotals: new Map() };
        }
    
        const validData = baseFilteredData.filter(row => !HINH_THUC_XUAT_THU_HO.has(getRowValue(row, COL.HINH_THUC_XUAT)));
    
        let tableRows;
    
        if (isCustomTab && customConfig) {
             const filteredSalesData = validData.filter(row => {
                const industry = productConfig.childToParentMap[getRowValue(row, COL.MA_NHOM_HANG)] || '';
                const subgroup = productConfig.childToSubgroupMap[getRowValue(row, COL.MA_NHOM_HANG)] || '';
                const manufacturer = getRowValue(row, COL.MANUFACTURER) || '';
                const productCode = getRowValue(row, COL.MA_NHOM_HANG) || '';
                const filters = customConfig;
    
                if (!filters) return true;
    
                const industryMatch = filters.selectedIndustries.length === 0 || filters.selectedIndustries.includes(industry);
                const subgroupMatch = filters.selectedSubgroups.length === 0 || filters.selectedSubgroups.includes(subgroup);
                const manufacturerMatch = filters.selectedManufacturers.length === 0 || filters.selectedManufacturers.includes(manufacturer);
                const productCodeMatch = filters.productCodes.length === 0 || filters.productCodes.includes(productCode);
    
                return industryMatch && subgroupMatch && manufacturerMatch && productCodeMatch;
            });
    
            const salesByEmployee: { [emp: string]: number } = {};
            filteredSalesData.forEach(row => {
                const employee = getRowValue(row, COL.NGUOI_TAO);
                if (!employee) return;
                if (!salesByEmployee[employee]) salesByEmployee[employee] = 0;
    
                const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
                const price = Number(getRowValue(row, COL.PRICE)) || 0;
                const revenue = price;
    
                if (metricType === 'quantity') {
                    salesByEmployee[employee] += quantity;
                } else if (metricType === 'revenue') {
                    salesByEmployee[employee] += revenue;
                } else {
                    const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
                    const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                    const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig);
                    salesByEmployee[employee] += revenue * heso;
                }
            });
    
            tableRows = employeeData.map(emp => ({
                name: emp.name,
                department: emp.department,
                value: salesByEmployee[emp.name] || 0,
                subgroupMetrics: new Map([['value', salesByEmployee[emp.name] || 0]])
            }));

        } else {
            if (selectedGroups.length === 0) return { rows: [], subgroupTotals: new Map(), groupedRows: {}, sortedDepartments: [], departmentTotals: new Map() };
    
            const salesByEmployeeByGroup: { [emp: string]: { [group: string]: { revenue: number, quantity: number } } } = {};
            
            validData.forEach(row => {
                const employee = getRowValue(row, COL.NGUOI_TAO);
                if (!employee) return;
                
                const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                let groupKey = '';
                
                if (internalGroupMode === 'parent') {
                    groupKey = productConfig.childToParentMap[maNhomHang];
                } else {
                    groupKey = productConfig.childToSubgroupMap[maNhomHang];
                }

                if (groupKey && selectedGroups.includes(groupKey)) {
                    if (!salesByEmployeeByGroup[employee]) salesByEmployeeByGroup[employee] = {};
                    if (!salesByEmployeeByGroup[employee][groupKey]) salesByEmployeeByGroup[employee][groupKey] = { revenue: 0, quantity: 0 };
                    
                    const price = Number(getRowValue(row, COL.PRICE)) || 0;
                    const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
                    salesByEmployeeByGroup[employee][groupKey].revenue += price;
                    salesByEmployeeByGroup[employee][groupKey].quantity += quantity;
                }
            });
    
            tableRows = employeeData.map(emp => {
                const empSales = salesByEmployeeByGroup[emp.name] || {};
                const subgroupMetrics = new Map<string, number>();
                let totalValue = 0;
                
                selectedGroups.forEach(group => {
                    const metric = empSales[group] || { revenue: 0, quantity: 0 };
                    const value = metricType === 'revenue' ? metric.revenue : metric.quantity;
                    subgroupMetrics.set(group, value);
                    totalValue += value;
                });
    
                return {
                    name: emp.name,
                    department: emp.department,
                    value: totalValue,
                    subgroupMetrics
                };
            });
        }

        const subgroupTotals = new Map<string, number>();
        if (isCustomTab) {
             const total = tableRows.reduce((sum, r) => sum + r.value, 0);
             subgroupTotals.set('value', total);
        } else {
            selectedGroups.forEach(group => {
                const total = tableRows.reduce((sum, r) => sum + (r.subgroupMetrics.get(group) || 0), 0);
                subgroupTotals.set(group, total);
            });
        }

        // Group rows by department
        const groupedRows: { [key: string]: typeof tableRows } = tableRows.reduce((acc, row) => {
            if (!acc[row.department]) acc[row.department] = [];
            acc[row.department].push(row);
            return acc;
        }, {} as { [key: string]: typeof tableRows });

        // Calculate department totals
        const departmentTotals = new Map<string, Map<string, number>>();
        Object.entries(groupedRows).forEach(([dept, rows]) => {
            const deptTotal = new Map<string, number>();
            if (isCustomTab) {
                const total = rows.reduce((sum, r) => sum + r.value, 0);
                deptTotal.set('value', total);
            } else {
                selectedGroups.forEach(group => {
                    const total = rows.reduce((sum, r) => sum + (r.subgroupMetrics.get(group) || 0), 0);
                    deptTotal.set(group, total);
                });
            }
            departmentTotals.set(dept, deptTotal);
        });

        // Sort departments
        const sortedDepartments = Object.keys(groupedRows).sort();

        // Sort rows within departments
        Object.keys(groupedRows).forEach(dept => {
            groupedRows[dept].sort((a, b) => {
               if (sortConfig.key === 'name') {
                   return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
               } else {
                   const valA = sortConfig.key === 'value' ? a.value : (a.subgroupMetrics.get(sortConfig.key) || 0);
                   const valB = sortConfig.key === 'value' ? b.value : (b.subgroupMetrics.get(sortConfig.key) || 0);
                   return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
               }
            });
        });

        return { rows: tableRows, subgroupTotals, groupedRows, sortedDepartments, departmentTotals };
    }, [baseFilteredData, productConfig, employeeData, isCustomTab, customConfig, metricType, internalGroupMode, selectedGroups, sortConfig]);

    return (
        <div ref={ref} className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm`}>
                        <Icon name="bar-chart-3" size={6} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Tổng Hợp</h3>
                        <p className="text-xs font-medium text-slate-400">Phân tích tổng hợp dữ liệu</p>
                    </div>
                </div>
                {!isCustomTab && (
                    <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 hide-on-export overflow-x-auto rounded-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Metric Type Switcher */}
                            <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                <button onClick={() => setInternalMetricType('quantity')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${internalMetricType === 'quantity' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Số lượng</button>
                                <button onClick={() => setInternalMetricType('revenue')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${internalMetricType === 'revenue' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Doanh thu</button>
                            </div>
                            
                            {/* Group Mode Switcher */}
                            <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                <button onClick={() => setInternalGroupMode('subgroup')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${internalGroupMode === 'subgroup' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Nhóm con</button>
                                <button onClick={() => setInternalGroupMode('parent')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${internalGroupMode === 'parent' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Ngành hàng</button>
                            </div>

                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                            
                            <div className="flex-grow max-w-xs">
                                <MultiSelectDropdown 
                                    label={internalGroupMode === 'parent' ? 'Ngành hàng' : 'Nhóm hàng'} 
                                    options={availableOptions} 
                                    selected={internalSelectedGroups} 
                                    onChange={setInternalSelectedGroups} 
                                />
                            </div>

                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                            
                            {onExport && (
                                <button onClick={(e) => { e.stopPropagation(); onExport?.(); }} disabled={isExporting} title="Xuất Ảnh Tab" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                    {isExporting ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name="camera" size={5} />}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="overflow-hidden border-2 border-primary-400 dark:border-slate-600">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-20 backdrop-blur-sm">
                            <tr>
                                <th onClick={() => handleSort('name')} className="px-4 py-2 text-left text-sm font-bold text-teal-800 dark:text-teal-200 uppercase tracking-wider cursor-pointer select-none min-w-[140px] sticky left-0 z-40 bg-teal-50 dark:bg-slate-900 border-b-4 border-teal-200 border-r border-slate-300">
                                    <div className="flex items-center gap-1">
                                        DANH MỤC
                                        {sortConfig.key === 'name' && (
                                            <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />
                                        )}
                                    </div>
                                </th>
                                {isCustomTab ? (
                                    <th onClick={() => handleSort('value')} className={`px-4 py-2 text-center text-sm font-bold uppercase tracking-wider cursor-pointer select-none border-b-4 border-slate-200 border-r border-slate-300 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400`}>
                                        <div className="flex items-center justify-center gap-1">
                                            {customConfig?.label || 'Giá trị'}
                                            {sortConfig.key === 'value' && (
                                                <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />
                                            )}
                                        </div>
                                    </th>
                                ) : (
                                    selectedGroups.map((group, gIdx) => {
                                        const colorConfigs = [
                                            { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-slate-200' },
                                            { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-slate-200' },
                                            { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-slate-200' },
                                        ];
                                        const config = colorConfigs[gIdx % colorConfigs.length];
                                        return (
                                            <th key={group} onClick={() => handleSort(group)} className={`px-4 py-2 text-center text-sm font-bold uppercase tracking-wider cursor-pointer select-none border-b-4 ${config.border} border-r border-slate-300 ${config.bg} ${config.text} dark:bg-slate-800 dark:text-slate-200`}>
                                                <div className="flex items-center justify-center gap-1">
                                                    {group}
                                                    {sortConfig.key === group && (
                                                        <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    })
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {sortedDepartments.map((dept, deptIdx) => {
                                const pastelColors = [
                                    'bg-blue-50/50 dark:bg-blue-900/20',
                                    'bg-emerald-50/50 dark:bg-emerald-900/20',
                                    'bg-purple-50/50 dark:bg-purple-900/20',
                                    'bg-amber-50/50 dark:bg-amber-900/20',
                                    'bg-rose-50/50 dark:bg-rose-900/20',
                                    'bg-sky-50/50 dark:bg-sky-900/20',
                                    'bg-indigo-50/50 dark:bg-indigo-900/20',
                                    'bg-teal-50/50 dark:bg-teal-900/20'
                                ];
                                const deptColor = pastelColors[deptIdx % pastelColors.length];
                                
                                return (
                                <React.Fragment key={dept}>
                                    <tr>
                                        <td className="px-3 py-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest sticky left-0 z-10 border-y border-slate-100 dark:border-slate-800 bg-slate-50/80" colSpan={isCustomTab ? 2 : selectedGroups.length + 1}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-3.5 rounded-full flex-shrink-0 ${
                                                    ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-amber-500','bg-rose-500','bg-sky-500','bg-teal-500','bg-fuchsia-500'][deptIdx % 8]
                                                }`} />
                                                <span>{dept} — {groupedRows[dept].length} người</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {groupedRows[dept].map((row, idx) => (
                                        <tr key={row.name} className={`group border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-teal-50/50 dark:hover:bg-slate-800/80 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'}`}>
                                            <td className="px-3 py-2 text-left sticky left-0 bg-inherit border-r border-slate-300 dark:border-slate-700 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 w-6 flex-shrink-0">#{idx + 1}</span>
                                                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{abbreviateName(row.name)}</span>
                                                </div>
                                            </td>
                                            {isCustomTab ? (
                                                <td className="px-3 py-2 text-center text-[13px] font-extrabold text-sky-700 dark:text-sky-400 border-r border-slate-100 dark:border-slate-800">
                                                    {metricType === 'quantity' ? formatQuantity(row.value) : formatCurrency(row.value)}
                                                </td>
                                            ) : (
                                                selectedGroups.map(group => {
                                                    const val = row.subgroupMetrics.get(group) || 0;
                                                    return (
                                                        <td key={group} className="px-3 py-2 text-center text-[13px] font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                                                            {metricType === 'quantity' ? (val > 0 ? formatQuantity(val) : <span className="text-slate-200 dark:text-slate-700">—</span>) : (val > 0 ? formatCurrency(val) : <span className="text-slate-200 dark:text-slate-700">—</span>)}
                                                        </td>
                                                    );
                                                })
                                            )}
                                        </tr>
                                    ))}
                                    {/* Department Total */}
                                    {sortedDepartments.length > 1 && (
                                        <tr className="bg-teal-50/30 dark:bg-teal-900/10 font-bold text-slate-700 dark:text-slate-200">
                                            <td className="px-3 py-2 text-center text-[11px] uppercase tracking-wider font-extrabold text-teal-700 dark:text-teal-300 sticky left-0 z-10 bg-inherit border-b border-slate-200 dark:border-slate-800 border-r border-slate-300">
                                                ∑ Tổng {dept}
                                            </td>
                                            {isCustomTab ? (
                                                <td className="px-3 py-2 text-center text-[13px] font-black text-sky-700 dark:text-sky-300 border-b border-slate-200 dark:border-slate-800">
                                                    {metricType === 'quantity' ? formatQuantity(departmentTotals.get(dept)?.get('value')) : formatCurrency(departmentTotals.get(dept)?.get('value') || 0)}
                                                </td>
                                            ) : (
                                                selectedGroups.map(group => (
                                                    <td key={group} className="px-3 py-2 text-center text-[13px] font-bold border-b border-slate-200 dark:border-slate-800 border-r border-slate-100">
                                                        {metricType === 'quantity' ? formatQuantity(departmentTotals.get(dept)?.get(group)) : formatCurrency(departmentTotals.get(dept)?.get(group) || 0)}
                                                    </td>
                                                ))
                                            )}
                                        </tr>
                                    )}
                                </React.Fragment>
                            );})}
                        </tbody>
                        <tfoot className="bg-teal-100 dark:bg-teal-900/40 border-t-2 border-teal-200 dark:border-teal-800">
                            <tr>
                                <td className="px-4 py-2 text-center text-[12px] font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-widest sticky left-0 z-10 bg-inherit border-r border-slate-300">∑ Tổng cộng</td>
                                {isCustomTab ? (
                                    <td className="px-3 py-2 text-center text-[13px] font-extrabold text-sky-700 dark:text-sky-300">
                                        {metricType === 'quantity' ? formatQuantity(subgroupTotals.get('value')) : formatCurrency(subgroupTotals.get('value') || 0)}
                                    </td>
                                ) : (
                                    selectedGroups.map(group => (
                                        <td key={group} className="px-3 py-2 text-center text-[13px] font-extrabold text-slate-700 dark:text-slate-200 border-r border-slate-200/50">
                                            {metricType === 'quantity' ? formatQuantity(subgroupTotals.get(group)) : formatCurrency(subgroupTotals.get(group) || 0)}
                                        </td>
                                    ))
                                )}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}));

export default SummarySynthesisTab;
