
import React, { useState } from 'react';
import type { DataRow, ProductConfig, Employee, HeadToHeadTableConfig } from '../../../types';
import { abbreviateName, formatQuantity, formatRevenueForHeadToHead, toLocalISOString, getExportFilenamePrefix } from '../../../utils/dataUtils';
import { Icon } from '../../common/Icon';
import { useHeadToHeadLogic } from '../../../hooks/useHeadToHeadLogic';
import { exportElementAsImage } from '../../../services/uiService';
import { useDashboardContext } from '../../../contexts/DashboardContext';
import { DEPT_COLORS, RankBadge } from '../performance/PerformanceTableUtils';

interface HeadToHeadTableProps {
    config: HeadToHeadTableConfig;
    baseFilteredData: DataRow[];
    productConfig: ProductConfig;
    employeeData: Employee[];
    allConfigs: HeadToHeadTableConfig[];
    onAdd: () => void;
    onEdit: () => void;
    onDelete: () => void;
    getExportRef?: () => HTMLDivElement | null;
    tableColorTheme: { header: string; row: string; border: string; };
    includeToday: boolean;
}

const HeadToHeadTable: React.FC<HeadToHeadTableProps> = ({ 
    config, 
    allConfigs,
    baseFilteredData, 
    productConfig, 
    employeeData, 
    onAdd, 
    onEdit, 
    onDelete, 
    tableColorTheme,
    includeToday
}) => {
    const [sortConfig, setSortConfig] = useState<{ key: string | number; direction: 'asc' | 'desc' }>({ key: 'daysWithNoSales', direction: 'asc' });
    const [isExporting, setIsExporting] = useState(false);
    const { filterState } = useDashboardContext();
    const tableRef = React.useRef<HTMLDivElement>(null);

    // Use the new hook for data processing
    const { processedData, conditionalFormatData, departmentTotals } = useHeadToHeadLogic({
        config,
        allConfigs,
        baseFilteredData,
        productConfig,
        employeeData,
        sortConfig,
        includeToday
    });

    const handleSort = (key: string | number) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };
    
    const handleExport = async () => {
        if (tableRef.current) {
            setIsExporting(true);
            const prefix = getExportFilenamePrefix(filterState.kho);
            const safeTabName = config.tableName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');
            await exportElementAsImage(tableRef.current, `${prefix}-7-ngay-${safeTabName}.png`, {
                elementsToHide: ['.hide-on-export'],
                isCompactTable: true,
                fitAllColumns: true
            });
            setIsExporting(false);
        }
    };
    
    const formatValue = (value: number | undefined) => {
        if (value === undefined || value === null || !isFinite(value)) { return '-'; }
        if (config.totalCalculationMethod === 'average' && (config.metricType === 'revenue' || config.metricType === 'revenueQD')) {
            const roundedValue = Math.ceil(value / 1000000);
            return roundedValue.toLocaleString('vi-VN');
        }
        if (config.totalCalculationMethod === 'average' && config.metricType !== 'hieuQuaQD') {
            const roundedValue = Math.ceil(value);
            return formatQuantity(roundedValue);
        }
        if (config.metricType === 'revenue' || config.metricType === 'revenueQD') {
            return formatRevenueForHeadToHead(value);
        }
        if (config.metricType === 'hieuQuaQD') {
            if (value === 0) return '-';
            return `${value.toFixed(0)}%`;
        }
        return formatQuantity(value);
    };

    const getCellStyle = (value: number, row: any, dateKey: string | 'total'): React.CSSProperties => {
        if (!config.conditionalFormats) return {};
        let finalStyle: React.CSSProperties = {};

        for(const rule of config.conditionalFormats) {
            let targetValue: number;
            switch(rule.criteria) {
                case 'specific_value': targetValue = rule.value; break;
                case 'row_avg': targetValue = row.rowAverage; break;
                case 'column_dept_avg': 
                    targetValue = dateKey === 'total' 
                        ? (conditionalFormatData.deptAvgTotal?.get(row.department) ?? 0)
                        : (conditionalFormatData.deptAvgByDate.get(dateKey)?.get(row.department) ?? 0); 
                    break;
                case 'top_3':
                    targetValue = 0; // Handled separately
                    break;
                default: continue;
            }

            let conditionMet = false;
            if (rule.criteria === 'top_3') {
                const top3Array = dateKey === 'total'
                    ? (conditionalFormatData.deptTop3Total?.get(row.department) ?? [])
                    : (conditionalFormatData.deptTop3ByDate?.get(dateKey)?.get(row.department) ?? []);
                if (top3Array.includes(value)) conditionMet = true;
            } else {
                if (rule.operator === '>' && value > targetValue) conditionMet = true;
                if (rule.operator === '<' && value < targetValue) conditionMet = true;
                if (rule.operator === '=' && value === targetValue) conditionMet = true;
            }

            if (conditionMet) {
                finalStyle.backgroundColor = rule.backgroundColor;
                finalStyle.color = rule.textColor;
                finalStyle.borderRadius = '6px';
                finalStyle.fontWeight = 'bold';
            }
        }
        return finalStyle;
    };

    const getMetricColor = () => {
        if (config.metricType === 'revenue' || config.metricType === 'revenueQD') return { bg: 'bg-sky-50/50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-100 dark:border-sky-800' };
        if (config.metricType === 'hieuQuaQD') return { bg: 'bg-amber-50/50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-800' };
        return { bg: 'bg-emerald-50/50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-800' };
    };

    const metricColor = getMetricColor();

    return (
        <div ref={tableRef} className="bg-white dark:bg-slate-900 overflow-hidden flex flex-col h-full">

            <div className="overflow-x-auto custom-scrollbar flex-grow border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600">
                        <tr>
                            <th colSpan={2} onClick={() => handleSort('name')} className="px-2 py-1 text-left text-[9px] sm:text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 uppercase tracking-wider cursor-pointer select-none min-w-[110px] sm:min-w-[150px] sticky left-0 z-20 border-r border-slate-200 dark:border-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                <div className="flex items-center gap-1">
                                    NHÂN VIÊN
                                    <span className="hide-on-export"><Icon name="chevrons-up-down" size={3} className="text-slate-400 opacity-80"/></span>
                                </div>
                            </th>
                            {processedData.dateHeaders.map(date => {
                                const dateKey = toLocalISOString(date);
                                const isSorted = sortConfig.key === dateKey;
                                return (
                                    <th key={date.toISOString()} onClick={() => handleSort(dateKey)} className={`px-2 py-1 text-center text-[9px] sm:text-[11px] font-bold ${tableColorTheme.header} uppercase tracking-wider cursor-pointer select-none border-r border-slate-200 dark:border-slate-700 ${isSorted ? '!brightness-90 dark:!brightness-125' : ''} hover:brightness-95 transition-all`}>
                                        <div className="flex flex-col items-center justify-center gap-0">
                                            <span>{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                                            <span className="text-[8px] sm:text-[10px] font-bold opacity-70 tracking-normal">{date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                                        </div>
                                    </th>
                                )
                            })}
                            <th onClick={() => handleSort('total')} className="px-2 py-1 text-center text-[9px] sm:text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider cursor-pointer select-none bg-indigo-50/50 dark:bg-indigo-900/20 border-r border-slate-200 dark:border-slate-700 hover:bg-indigo-100 transition-colors">
                                {config.totalCalculationMethod === 'average' ? 'T.BÌNH' : 'TỔNG'}
                                {sortConfig.key === 'total' && <span className="hide-on-export"><Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} className="inline ml-1 text-indigo-500" /></span>}
                            </th>
                            <th onClick={() => handleSort('daysWithNoSales')} className="px-2 py-1 text-center text-[9px] sm:text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider cursor-pointer select-none bg-rose-50/50 dark:bg-rose-900/20 hover:bg-rose-100 transition-colors">
                                NS
                                {sortConfig.key === 'daysWithNoSales' && <span className="hide-on-export"><Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} className="inline ml-1 text-rose-500" /></span>}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {processedData.sortedDepartments.map((department, deptIndex) => {
                            const rows = processedData.groupedRows[department];
                            const deptTotalData = departmentTotals.get(department);
                            return(
                                <React.Fragment key={department}>
                                     <tr>
                                        <td colSpan={100} className={`px-2 py-1 ${DEPT_COLORS[deptIndex % DEPT_COLORS.length].strip} border-y border-slate-200 dark:border-slate-700 sticky left-0 z-10`}>
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <span className={`w-1 sm:w-2 h-3 sm:h-4 rounded-full ${DEPT_COLORS[deptIndex % DEPT_COLORS.length].badge} flex-shrink-0`} />
                                                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${DEPT_COLORS[deptIndex % DEPT_COLORS.length].text}`}>{department} — {rows.length} người</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {rows.map((row, rowIndex) => {
                                        return (
                                            <tr key={row.name} className={`group border-b border-slate-200 dark:border-slate-700 transition-colors duration-100 hover:bg-slate-100 dark:hover:bg-slate-800 ${rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                                <td className="px-1 py-1 text-center border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-inherit z-10 w-8">
                                                    <RankBadge rank={rowIndex} />
                                                </td>
                                                <td className="px-2 py-1 text-left sticky left-8 bg-inherit z-10 border-r border-slate-200 dark:border-slate-700">
                                                    <span className="text-[11px] sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate max-w-[80px] sm:max-w-[120px] block">{abbreviateName(row.name)}</span>
                                                </td>
                                                {processedData.dateHeaders.map(date => {
                                                    const dateKey = toLocalISOString(date);
                                                    const value = row.dailyValues[dateKey] || 0;
                                                    const cellStyle = getCellStyle(value, row, dateKey);
                                                    return (
                                                        <td key={dateKey} className={`px-2 py-1 text-center text-[11px] sm:text-[13px] font-bold text-slate-600 dark:text-slate-300 tabular-nums border-r border-slate-200 dark:border-slate-700`}>
                                                            <div className="inline-block px-1 sm:px-1.5 py-0.5" style={cellStyle}>
                                                                {formatValue(value)}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className={`px-2 py-1 text-center font-black text-indigo-600 dark:text-indigo-400 text-[11px] sm:text-[13px] border-r border-slate-200 dark:border-slate-700 bg-indigo-50/20`}>
                                                    <div className="inline-block px-1 sm:px-1.5 py-0.5" style={getCellStyle(row.total, row, 'total')}>
                                                        {formatValue(row.total)}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1 text-center border-r border-slate-200 dark:border-slate-700 bg-rose-50/20">
                                                    {row.daysWithNoSales > 0 ? (
                                                        <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-[13px] font-black shadow-sm border ${row.daysWithNoSales >= 4 ? 'bg-red-100/80 text-red-600 border-red-200' : 'bg-white text-slate-500 border-slate-200'}`}>
                                                            {row.daysWithNoSales}
                                                        </span>
                                                    ) : <span className="text-slate-300">-</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {deptTotalData && processedData.sortedDepartments.length > 1 && (
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 font-bold">
                                            <td colSpan={2} className="px-2 py-1 text-left text-[9px] sm:text-[11px] uppercase font-black text-slate-500 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700 tracking-widest">Tổng {department}</td>
                                            {processedData.dateHeaders.map(date => {
                                                const dateKey = toLocalISOString(date);
                                                return (
                                                    <td key={dateKey} className={`px-2 py-1 text-center text-[11px] sm:text-[13px] font-black tracking-wide border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300`}>
                                                        {formatValue(deptTotalData.daily.get(dateKey) || 0)}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-2 py-1 text-center text-[11px] sm:text-[13px] font-black text-indigo-700 dark:text-indigo-400 border-r border-slate-200 dark:border-slate-700 bg-indigo-50/40 dark:bg-indigo-900/40">{formatValue(deptTotalData.total)}</td>
                                            <td className="px-2 py-1 text-center text-[11px] sm:text-[13px] font-black text-rose-500 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-900/40">
                                                {deptTotalData.daysWithNoSales > 0 ? deptTotalData.daysWithNoSales.toFixed(1) : '-'}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold text-[11px] sm:text-[13px] border-t border-slate-200 dark:border-slate-700">
                        <tr>
                            <td colSpan={2} className="px-2 py-1 text-center text-[10px] sm:text-[12px] font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-widest sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700">∑ Tổng</td>
                            {processedData.dateHeaders.map(date => (
                                <td key={date.toISOString()} className="px-2 py-1 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatValue(processedData.totals.daily.get(toLocalISOString(date)) || 0)}</td>
                            ))}
                            <td className="px-2 py-1 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatValue(processedData.totals.total)}</td>
                            <td className="px-2 py-1 text-center text-[11px] sm:text-[13px] font-extrabold text-slate-800 dark:text-slate-200">{processedData.totals.daysWithNoSales.toFixed(1)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default HeadToHeadTable;
