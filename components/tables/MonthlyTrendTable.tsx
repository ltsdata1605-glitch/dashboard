import React from 'react';
import type { SummaryTableNode, GrandTotal } from '../../types';
import { HEADER_CONFIG } from './summary/SummaryTableUtils';
import { MonthlyTrendTableRow } from './MonthlyTrendTableRow';
import { formatCurrency, formatQuantity } from '../../utils/dataUtils';

interface MonthlyTrendTableProps {
    trendData: {
        months: { id: string, label: string, daysCount: number }[];
        trees: { [month: string]: { data: { [key: string]: SummaryTableNode }, grandTotal: GrandTotal } };
    };
    displayKeys: string[];
    visibleColumns: string[];
    expandedIds: Set<string>;
    toggleExpand: (id: string) => void;
    localDrilldownOrder: string[];
    activeSortConfig: { column: string, direction: 'asc' | 'desc' };
}

export const MonthlyTrendTable: React.FC<MonthlyTrendTableProps> = ({
    trendData, displayKeys, visibleColumns, expandedIds, toggleExpand, localDrilldownOrder, activeSortConfig
}) => {
    const PIVOT_EXCLUDED_COLS = ['slPercent', 'dtThucPercent', 'avgQuantity', 'avgRevenue'];
    const pivotColumns = visibleColumns.filter(c => !PIVOT_EXCLUDED_COLS.includes(c));

    const rootMonthlyQuantities: { [monthId: string]: number } = {};
    const rootMonthlyRevenues: { [monthId: string]: number } = {};
    
    trendData.months.forEach(m => {
        rootMonthlyQuantities[m.id] = trendData.trees[m.id]?.grandTotal?.totalQuantity || 0;
        rootMonthlyRevenues[m.id] = trendData.trees[m.id]?.grandTotal?.totalRevenue || 0;
    });

    return (
        <table className="w-full table-fixed compact-export-table border-collapse bg-white dark:bg-slate-800" id="summary-trend-table">
            <thead className="sticky top-0 z-30">
                <tr>
                    <th 
                        rowSpan={2} 
                        scope="col" 
                        className="w-[40%] md:w-[30%] lg:w-[350px] px-4 py-2 text-center uppercase text-sm font-bold tracking-wider text-slate-700 dark:text-slate-300 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 bg-slate-50 sticky left-0 z-40 dark:bg-[#1c1c1e]"
                    >
                        DANH MỤC
                    </th>
                    {HEADER_CONFIG.filter(h => pivotColumns.includes(h.key)).map(h => (
                        <th 
                            key={h.key} 
                            colSpan={trendData.months.length} 
                            scope="col" 
                            className={`px-2 py-2 text-center text-sm font-bold uppercase tracking-wider border-b ${h.colorClass} border-r border-slate-200 dark:border-slate-700`}
                        >
                            {h.label}
                        </th>
                    ))}
                </tr>
                <tr className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    {HEADER_CONFIG.filter(h => pivotColumns.includes(h.key)).map(h => (
                        trendData.months.map(m => (
                            <th 
                                key={`${h.key}-${m.id}`} 
                                scope="col" 
                                className={`px-2 py-1 text-center text-[10px] font-bold uppercase border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 ${h.colorClass}`}
                            >
                                {`${parseInt(m.id.split('-')[1], 10)}.${m.id.split('-')[0]}`}
                            </th>
                        ))
                    ))}
                </tr>
            </thead>
            <tbody>
                {displayKeys.length > 0 ? (
                    displayKeys.map((key, index) => {
                        const nodesByMonth: { [monthId: string]: SummaryTableNode | undefined } = {};
                        trendData.months.forEach(m => nodesByMonth[m.id] = trendData.trees[m.id]?.data[key]);
                        return (
                            <MonthlyTrendTableRow 
                                key={key} 
                                nodeKey={key} 
                                trendNodes={nodesByMonth}
                                months={trendData.months}
                                level={1} 
                                parentId="root" 
                                expandedIds={expandedIds} 
                                toggleExpand={toggleExpand} 
                                drilldownOrder={localDrilldownOrder}
                                visibleColumns={pivotColumns}
                                sortConfig={activeSortConfig}
                                parentMonthlyQuantities={rootMonthlyQuantities}
                                parentMonthlyRevenues={rootMonthlyRevenues}
                            />
                        );
                    })
                ) : (
                    <tr>
                        <td colSpan={1 + pivotColumns.length * trendData.months.length} className="text-center p-8 text-slate-500">
                            Không có dữ liệu để hiển thị.
                        </td>
                    </tr>
                )}
            </tbody>
            <tfoot className="bg-teal-100 dark:bg-teal-900/40 font-bold text-sm border-t-2 border-teal-200 dark:border-teal-800">
                <tr>
                    <td className="px-4 py-2 text-center sticky left-0 z-40 bg-teal-100 dark:bg-teal-900/60 font-extrabold text-[12px] uppercase tracking-widest text-teal-700 dark:text-teal-300 border-r border-teal-200 dark:border-teal-800">TỔNG CỘNG</td>
                    {HEADER_CONFIG.filter(h => pivotColumns.includes(h.key)).map(h => (
                        trendData.months.map(m => {
                            const totalForMonth = trendData.trees[m.id]?.grandTotal || { totalQuantity: 0, totalRevenue: 0, totalRevenueQD: 0, totalTraGop: 0, aov: 0, traGopPercent: 0 };
                            let valueToDisplay: string | number = '-';
                            if (h.key === 'totalQuantity') valueToDisplay = formatQuantity(totalForMonth.totalQuantity);
                            else if (h.key === 'slPercent') valueToDisplay = totalForMonth.totalQuantity > 0 ? '100.0%' : '-';
                            else if (h.key === 'dtThucPercent') valueToDisplay = totalForMonth.totalRevenue > 0 ? '100.0%' : '-';
                            else if (h.key === 'totalRevenue') valueToDisplay = formatCurrency(totalForMonth.totalRevenue, 0);
                            else if (h.key === 'avgQuantity') valueToDisplay = formatQuantity(Math.ceil(totalForMonth.totalQuantity / m.daysCount));
                            else if (h.key === 'avgRevenue') valueToDisplay = formatCurrency(totalForMonth.totalRevenue / m.daysCount, 0);
                            else if (h.key === 'totalRevenueQD') valueToDisplay = formatCurrency(totalForMonth.totalRevenueQD, 0);
                            else if (h.key === 'aov') valueToDisplay = totalForMonth.totalQuantity > 0 ? (totalForMonth.totalRevenue / totalForMonth.totalQuantity / 1000000).toFixed(1) : '-';
                            else if (h.key === 'traGopPercent') {
                                const val = totalForMonth.totalRevenue > 0 ? (totalForMonth.totalTraGop / totalForMonth.totalRevenue) * 100 : 0;
                                valueToDisplay = val > 0 ? `${Math.ceil(val)}%` : '-';
                            }
                            return (
                                <td key={`tf-${h.key}-${m.id}`} className="px-2 py-2 text-right border-r border-teal-200 dark:border-teal-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                                    {valueToDisplay}
                                </td>
                            );
                        })
                    ))}
                </tr>
            </tfoot>
        </table>
    );
};
