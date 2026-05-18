
import React, { useState } from 'react';
import type { DataRow, ProductConfig, Employee, HeadToHeadTableConfig } from '../../../types';
import { abbreviateName, formatQuantity, formatRevenueForHeadToHead, toLocalISOString } from '../../../utils/dataUtils';
import { Icon } from '../../common/Icon';
import { useHeadToHeadLogic } from '../../../hooks/useHeadToHeadLogic';
import { exportElementAsImage } from '../../../services/uiService';

interface HeadToHeadTableProps {
    config: HeadToHeadTableConfig;
    baseFilteredData: DataRow[];
    productConfig: ProductConfig;
    employeeData: Employee[];
    onAdd: () => void;
    onEdit: () => void;
    onDelete: () => void;
    getExportRef?: () => HTMLDivElement | null;
    tableColorTheme: { header: string; row: string; border: string; };
}

const HeadToHeadTable: React.FC<HeadToHeadTableProps> = ({ 
    config, 
    baseFilteredData, 
    productConfig, 
    employeeData, 
    onAdd, 
    onEdit, 
    onDelete, 
    tableColorTheme 
}) => {
    const [sortConfig, setSortConfig] = useState<{ key: string | number; direction: 'asc' | 'desc' }>({ key: 'daysWithNoSales', direction: 'asc' });
    const [includeToday, setIncludeToday] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const tableRef = React.useRef<HTMLDivElement>(null);

    // Use the new hook for data processing
    const { processedData, conditionalFormatData, departmentTotals } = useHeadToHeadLogic({
        config,
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
            await exportElementAsImage(tableRef.current, `7-ngay-${config.tableName}.png`, {
                elementsToHide: ['.hide-on-export'],
                isCompactTable: true
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

    const getCellStyle = (value: number, row: any, dateKey: string): React.CSSProperties => {
        if (!config.conditionalFormats || value === 0) return {};
        let finalStyle: React.CSSProperties = {};

        for(const rule of config.conditionalFormats) {
            let targetValue: number;
            switch(rule.criteria) {
                case 'specific_value': targetValue = rule.value; break;
                case 'row_avg': targetValue = row.rowAverage; break;
                case 'column_dept_avg': targetValue = conditionalFormatData.deptAvgByDate.get(dateKey)?.get(row.department) ?? 0; break;
                default: continue;
            }

            let conditionMet = false;
            if (rule.operator === '>' && value > targetValue) conditionMet = true;
            if (rule.operator === '<' && value < targetValue) conditionMet = true;
            if (rule.operator === '=' && value === targetValue) conditionMet = true;

            if (conditionMet) {
                finalStyle.backgroundColor = rule.backgroundColor;
                finalStyle.color = rule.textColor;
                finalStyle.borderRadius = '6px';
                finalStyle.fontWeight = 'bold';
            }
        }
        return finalStyle;
    };

    const getPastelColor = (index: number) => {
        const colors = [
            'bg-blue-50/80 dark:bg-blue-900/20',
            'bg-emerald-50/80 dark:bg-emerald-900/20',
            'bg-amber-50/80 dark:bg-amber-900/20',
            'bg-rose-50/80 dark:bg-rose-900/20',
            'bg-indigo-50/80 dark:bg-indigo-900/20',
            'bg-teal-50/80 dark:bg-teal-900/20',
            'bg-orange-50/80 dark:bg-orange-900/20',
            'bg-purple-50/80 dark:bg-purple-900/20',
        ];
        return colors[index % colors.length];
    };

    const getMetricColor = () => {
        if (config.metricType === 'revenue' || config.metricType === 'revenueQD') return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100' };
        if (config.metricType === 'hieuQuaQD') return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' };
        return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' }; // quantity
    };

    const metricColor = getMetricColor();

    return (
        <div ref={tableRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full rounded-none">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary-50 text-primary-600 shadow-sm">
                        <Icon name="swords" size={5} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight uppercase tracking-wide">{config.tableName}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{processedData.dateRangeString}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 hide-on-export">
                    <button onClick={(e) => { e.stopPropagation(); onAdd(); }} title="Thêm Bảng Mới" className="p-2 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"><Icon name="plus-circle" size={4}/></button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Sửa Bảng" className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Icon name="pencil" size={4}/></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Xóa Bảng" className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Icon name="trash-2" size={4}/></button>
                    <button onClick={(e) => { e.stopPropagation(); handleExport(); }} disabled={isExporting} title="Xuất Ảnh" className="p-2 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                        {isExporting ? <Icon name="loader-2" size={4} className="animate-spin" /> : <Icon name="camera" size={4} />}
                    </button>
                </div>
            </div>

            <div className="px-4 py-2 text-[10px] font-bold text-slate-500 bg-slate-50/50 dark:bg-slate-900/30 flex justify-end items-center hide-on-export border-b border-slate-100 dark:border-slate-800">
                 <label className="flex items-center gap-2 cursor-pointer select-none hover:text-indigo-600 transition-colors">
                    <input type="checkbox" checked={includeToday} onChange={() => setIncludeToday(p => !p)} className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span>Bao gồm hôm nay</span>
                </label>
            </div>

            <div className="overflow-x-auto custom-scrollbar flex-grow p-2">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20">
                        <tr className="border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600">
                            <th onClick={() => handleSort('name')} className="px-3 py-2 text-left text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 uppercase tracking-widest cursor-pointer select-none min-w-[140px] sticky left-0 z-20 border-r border-slate-200 dark:border-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                <div className="flex items-center gap-1">NHÂN VIÊN <Icon name="chevrons-up-down" size={3} className="text-indigo-400 opacity-60"/></div>
                            </th>
                            {processedData.dateHeaders.map(date => {
                                const dateKey = toLocalISOString(date);
                                const isSorted = sortConfig.key === dateKey;
                                return (
                                    <th key={date.toISOString()} onClick={() => handleSort(dateKey)} className={`px-2 py-2 text-center text-[12px] font-black ${metricColor.text} uppercase tracking-widest cursor-pointer select-none ${metricColor.bg} border-r border-slate-200 dark:border-slate-700 ${isSorted ? 'ring-2 ring-primary-400 ring-inset' : ''} hover:opacity-80 transition-opacity`}>
                                        <div className="flex flex-col items-center">
                                            <span>{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                                            <span className="text-[10px] font-bold opacity-60">{date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                                        </div>
                                    </th>
                                )
                            })}
                            <th onClick={() => handleSort('total')} className="px-3 py-2 text-center text-[12px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest cursor-pointer select-none bg-indigo-50 dark:bg-indigo-900/30 border-r border-slate-200 dark:border-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                {config.totalCalculationMethod === 'average' ? 'TB' : 'TỔNG'}
                                {sortConfig.key === 'total' && <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} className="inline ml-1 text-indigo-400" />}
                            </th>
                            <th onClick={() => handleSort('daysWithNoSales')} className="px-3 py-2 text-center text-[12px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-widest cursor-pointer select-none bg-rose-50 dark:bg-rose-900/20 border-r border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity">
                                NO SALE
                                {sortConfig.key === 'daysWithNoSales' && <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} className="inline ml-1 text-rose-400" />}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {processedData.sortedDepartments.map((department, deptIndex) => {
                            const rows = processedData.groupedRows[department];
                            const deptTotalData = departmentTotals.get(department);
                            const pastelBg = getPastelColor(deptIndex);
                            return(
                                <React.Fragment key={department}>
                                     <tr>
                                        <td colSpan={100} className="px-3 py-1.5 border-y border-slate-200 dark:border-slate-700 sticky left-0 z-10">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-3.5 rounded-full flex-shrink-0" style={{background: ['#14b8a6','#3b82f6','#a855f7','#f59e0b','#f43f5e','#0ea5e9','#10b981','#f97316'][deptIndex % 8]}} />
                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{department} — {rows.length} người</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {rows.map((row, rowIndex) => {
                                        const rankIndex = rowIndex; 

                                        return (
                                            <tr key={row.name} className={`group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'}`}>
                                                <td className="px-3 py-2 text-left sticky left-0 bg-inherit z-10 group-hover:brightness-95 transition-all border-b border-r border-slate-200 dark:border-slate-700">
                                                     <div className="flex items-center gap-3">
                                                        <div className="flex flex-col items-center justify-center min-w-[32px]">
                                                            {rankIndex < 3 
                                                                ? <span className="text-lg w-6 text-center inline-block">{['🥇', '🥈', '🥉'][rankIndex]}</span> 
                                                                : <span className="text-[13px] w-6 text-center inline-block text-slate-500 font-bold">#{rankIndex + 1}</span>}
                                                        </div>
                                                        <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary-600 transition-colors truncate">{abbreviateName(row.name)}</span>
                                                    </div>
                                                </td>
                                                {processedData.dateHeaders.map(date => {
                                                    const dateKey = toLocalISOString(date);
                                                    const value = row.dailyValues[dateKey] || 0;
                                                    const cellStyle = getCellStyle(value, row, dateKey);
                                                    return (
                                                        <td key={dateKey} className={`px-2 py-2 text-center text-[13px] font-medium text-slate-500 tabular-nums border-b border-r border-slate-200 dark:border-slate-700 ${metricColor.bg}`}>
                                                            <div className="inline-block px-2 py-1" style={cellStyle}>
                                                                {formatValue(value)}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className={`px-3 py-2 text-center font-bold text-indigo-600 dark:text-indigo-400 text-[13px] border-b border-r border-slate-200 dark:border-slate-700 bg-indigo-50/30`}>{formatValue(row.total)}</td>
                                                <td className="px-3 py-2 text-center border-b border-r border-slate-200 dark:border-slate-700 bg-rose-50/30">
                                                    {row.daysWithNoSales > 0 ? (
                                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[13px] font-black ${row.daysWithNoSales >= 4 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                            {row.daysWithNoSales}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {deptTotalData && processedData.sortedDepartments.length > 1 && (
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-700 dark:text-slate-200">
                                            <td className="px-3 py-2 text-left text-xs uppercase font-bold text-slate-500 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 border-b border-r border-slate-200 dark:border-slate-700">Tổng Nhóm</td>
                                            {processedData.dateHeaders.map(date => {
                                                const dateKey = toLocalISOString(date);
                                                return (
                                                    <td key={dateKey} className={`px-2 py-2 text-center text-[13px] font-bold border-b border-r border-slate-200 dark:border-slate-700 ${metricColor.bg}`}>
                                                        {formatValue(deptTotalData.daily.get(dateKey) || 0)}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-2 text-center text-[13px] font-black text-indigo-700 dark:text-indigo-300 border-b border-r border-slate-200 dark:border-slate-700 bg-indigo-50/30">{formatValue(deptTotalData.total)}</td>
                                            <td className="px-3 py-2 text-center text-[13px] font-bold text-slate-500 border-b border-r border-slate-200 dark:border-slate-700 bg-rose-50/30">
                                                {deptTotalData.daysWithNoSales > 0 ? deptTotalData.daysWithNoSales.toFixed(1) : '-'}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-teal-100 dark:bg-teal-900/40 border-t border-slate-200 dark:border-slate-700">
                        <tr>
                            <td className="px-3 py-2.5 text-left text-[12px] font-black text-teal-700 dark:text-teal-300 uppercase tracking-widest sticky left-0 bg-teal-100 z-10 border-r border-slate-200 dark:border-slate-700">∑ Tổng cộng</td>
                            {processedData.dateHeaders.map(date => (
                                <td key={date.toISOString()} className="px-2 py-2.5 text-center text-[13px] font-extrabold text-teal-800 dark:text-teal-100 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatValue(processedData.totals.daily.get(toLocalISOString(date)) || 0)}</td>
                            ))}
                            <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-teal-800 dark:text-teal-100 tabular-nums border-r border-slate-200 dark:border-slate-700">{formatValue(processedData.totals.total)}</td>
                            <td className="px-3 py-2.5 text-center text-[13px] font-extrabold text-teal-700/70">{processedData.totals.daysWithNoSales.toFixed(1)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default HeadToHeadTable;
