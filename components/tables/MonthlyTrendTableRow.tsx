import React from 'react';
import type { SummaryTableNode } from '../../types';
import { abbreviateName, formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { useDashboardContext } from '../../contexts/DashboardContext';

interface MonthlyTrendTableRowProps {
    nodeKey: string;
    trendNodes: { [monthId: string]: SummaryTableNode | undefined }; 
    months: { id: string, label: string, daysCount: number }[];
    level: number;
    parentId: string;
    expandedIds: Set<string>;
    toggleExpand: (id: string) => void;
    drilldownOrder: string[];
    visibleColumns: string[];
    sortConfig: { column: string, direction: 'asc' | 'desc' };
    parentMonthlyQuantities: { [monthId: string]: number };
    parentMonthlyRevenues: { [monthId: string]: number };
}

const getTraGopPercentClass = (percentage: number, target: number) => {
    if (isNaN(percentage)) return 'text-slate-600 dark:text-slate-300';
    if (percentage >= target) return 'text-green-600 dark:text-green-500 font-bold';
    if (percentage >= target - 5) return 'text-amber-600 dark:text-amber-500';
    return 'text-red-600 dark:text-red-500 font-bold';
};

const ROW_TEXT_COLORS: Record<string, string> = {
    'parent': 'text-rose-700 dark:text-rose-300',         
    'child': 'text-sky-700 dark:text-sky-300',           
    'manufacturer': 'text-primary-700 dark:text-primary-300', 
    'creator': 'text-amber-700 dark:text-amber-300',      
    'product': 'text-violet-700 dark:text-violet-300'     
};

export const MonthlyTrendTableRow: React.FC<MonthlyTrendTableRowProps> = React.memo(({
    nodeKey, trendNodes, months, level, parentId, expandedIds, toggleExpand, drilldownOrder, visibleColumns, sortConfig, parentMonthlyQuantities, parentMonthlyRevenues
}) => {
    const { kpiTargets } = useDashboardContext() || {};
    
    const currentId = `${parentId}-${nodeKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const isExpanded = expandedIds.has(currentId);
    
    // Sort Children logic
    let allChildrenKeys = new Set<string>();
    months.forEach(m => {
        const node = trendNodes[m.id];
        if (node && node.children) {
            Object.keys(node.children).forEach(k => allChildrenKeys.add(k));
        }
    });
    const childrenKeysArray = Array.from(allChildrenKeys);

    // Apply sorting to children (sort by SUM across all months for simplicity)
    childrenKeysArray.sort((a, b) => {
        let sumA = 0; let sumB = 0;
        months.forEach(m => {
            const nodeA = trendNodes[m.id]?.children[a];
            const nodeB = trendNodes[m.id]?.children[b];
            
            const getVal = (node: SummaryTableNode | undefined, key: string, daysDivisor: number = 1) => {
                if (!node) return 0;
                if (key === 'aov') return node.totalQuantity > 0 ? node.totalRevenue / node.totalQuantity : 0;
                if (key === 'traGopPercent') return node.totalRevenue > 0 ? (node.totalTraGop / node.totalRevenue) * 100 : 0;
                if (key === 'avgQuantity') return Math.ceil(node.totalQuantity / daysDivisor);
                if (key === 'avgRevenue') return node.totalRevenue / daysDivisor;
                return (node as Record<string, any>)[key] || 0;
            };

            sumA += getVal(nodeA, sortConfig.column, m.daysCount);
            sumB += getVal(nodeB, sortConfig.column, m.daysCount);
        });

        if (sumA === sumB) return a.localeCompare(b); 
        return sortConfig.direction === 'asc' ? sumA - sumB : sumB - sumA;
    });
    
    const hasChildren = childrenKeysArray.length > 0;
    const isExpandable = hasChildren && level < 5; 
    const bgColorClass = level === 1 ? 'bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50' : 
                         level === 2 ? 'bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800' : 
                         level === 3 ? 'bg-slate-100/50 dark:bg-slate-700/30 border-b border-white dark:border-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-700/50' : 
                         'bg-slate-200/30 dark:bg-slate-700/10 hover:bg-slate-200/60 dark:hover:bg-slate-700/40 border-b border-white dark:border-slate-800';

    const paddingLeft = level === 1 ? '16px' : `${16 + (level - 1) * 24}px`;
    const indentGuides = [];
    for (let i = 1; i < level; i++) {
        indentGuides.push(
            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-300 dark:border-slate-600 border-dashed" style={{ left: `${16 + i * 24 - 12}px` }}></div>
        );
    }

    const currentLevelName = drilldownOrder[level - 1] || 'Unknown';
    const textColorClass = ROW_TEXT_COLORS[currentLevelName] || 'text-slate-700 dark:text-slate-300';
    const levelLabelStyles = {
        1: `font-black uppercase tracking-tight text-sm drop-shadow-sm ${textColorClass}`,
        2: `font-bold text-[13px] ${textColorClass}`,
        3: `font-medium text-[12px] italic ${textColorClass}`,
        4: `text-xs ${textColorClass}`,
        5: `text-xs ${textColorClass}`
    }[level] || `text-xs ${textColorClass}`;

    let displayText = nodeKey;
    if (level === 4) displayText = abbreviateName(nodeKey); // Format Creator name
    else if (displayText === 'Không xác định' || !displayText) displayText = 'Chưa phân loại';

    // To compute percentages correctly, we pre-calculate the quantity & revenue of THIS node per month
    const myMonthlyQuantities: { [monthId: string]: number } = {};
    const myMonthlyRevenues: { [monthId: string]: number } = {};
    months.forEach(m => {
        myMonthlyQuantities[m.id] = trendNodes[m.id]?.totalQuantity || 0;
        myMonthlyRevenues[m.id] = trendNodes[m.id]?.totalRevenue || 0;
    });

    return (
        <React.Fragment>
            <tr 
                onClick={() => isExpandable && toggleExpand(currentId)}
                className={`transition-colors duration-150 group ${isExpandable ? 'cursor-pointer' : ''} ${bgColorClass}`}
            >
                {/* Node Name Column */}
                <td className="p-3 sticky left-0 z-20 whitespace-nowrap bg-inherit min-w-[260px] max-w-[320px]" style={{ paddingLeft }}>
                    <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform relative pr-4">
                        {indentGuides}
                        {isExpandable ? (
                            <button className={`w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-700 border ${isExpanded ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500' : 'border-slate-300 dark:border-slate-600'} rounded shadow-sm shrink-0 z-10 transition-colors`}>
                                <Icon name={isExpanded ? "chevron-down" : "chevron-right"} size={3.5} className={isExpanded ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-300'} />
                            </button>
                        ) : (
                            <span className="w-5 h-5 shrink-0 z-10"></span>
                        )}
                        <span className={`${levelLabelStyles} truncate`} title={nodeKey}>{displayText}</span>
                    </div>
                    {/* Shadow Effect for Sticky Column */}
                    <div className="absolute top-0 bottom-0 -right-2 w-2 bg-gradient-to-r from-slate-200/40 dark:from-slate-800/40 to-transparent pointer-events-none"></div>
                </td>

                {/* Metric Columns For Each Month */}
                {visibleColumns.includes('totalQuantity') && months.map(m => (
                    <td key={`qty-${m.id}`} className="px-3 py-3 text-right">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {formatQuantity(trendNodes[m.id]?.totalQuantity || 0)}
                        </span>
                    </td>
                ))}

                {visibleColumns.includes('slPercent') && months.map(m => {
                    const pQty = parentMonthlyQuantities[m.id];
                    const myQty = myMonthlyQuantities[m.id];
                    const qtyPercent = (pQty && pQty > 0) ? (myQty / pQty * 100) : 0;
                    return (
                        <td key={`slpct-${m.id}`} className="px-3 py-3 text-right">
                            <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs">
                                {qtyPercent > 0 ? `${qtyPercent.toFixed(1)}%` : '-'}
                            </span>
                        </td>
                    );
                })}

                {visibleColumns.includes('totalRevenue') && months.map(m => (
                    <td key={`rev-${m.id}`} className="px-3 py-3 text-right group-hover:bg-sky-50 dark:group-hover:bg-sky-900/10 transition-colors">
                        <span className="font-bold text-sky-700 dark:text-sky-300 text-[13px] drop-shadow-sm">
                            {formatCurrency(trendNodes[m.id]?.totalRevenue || 0, 0)}
                        </span>
                    </td>
                ))}

                {visibleColumns.includes('dtThucPercent') && months.map(m => {
                    const pRev = parentMonthlyRevenues[m.id];
                    const myRev = myMonthlyRevenues[m.id];
                    const revPct = (pRev && pRev > 0) ? (myRev / pRev * 100) : 0;
                    return (
                        <td key={`revpct-${m.id}`} className="px-3 py-3 text-right">
                            <span className="font-semibold text-sky-600/70 dark:text-sky-400/70 text-xs">
                                {revPct > 0 ? `${revPct.toFixed(1)}%` : '-'}
                            </span>
                        </td>
                    );
                })}

                {visibleColumns.includes('avgQuantity') && months.map(m => (
                    <td key={`avgqty-${m.id}`} className="px-3 py-3 text-right bg-slate-50/30 dark:bg-slate-800/30">
                        <span className="font-medium text-slate-600 dark:text-slate-300 text-xs">
                            {formatQuantity(Math.ceil((trendNodes[m.id]?.totalQuantity || 0) / m.daysCount))}
                        </span>
                    </td>
                ))}

                {visibleColumns.includes('avgRevenue') && months.map(m => (
                    <td key={`avgrev-${m.id}`} className="px-3 py-3 text-right bg-slate-50/30 dark:bg-slate-800/30">
                        <span className="font-medium text-slate-600 dark:text-slate-300 text-xs">
                            {formatCurrency((trendNodes[m.id]?.totalRevenue || 0) / m.daysCount, 0)}
                        </span>
                    </td>
                ))}

                {visibleColumns.includes('totalRevenueQD') && months.map(m => (
                    <td key={`qd-${m.id}`} className="px-3 py-3 text-right">
                        <span className="font-semibold text-amber-600 dark:text-amber-400 text-xs">
                            {formatCurrency(trendNodes[m.id]?.totalRevenueQD || 0, 0)}
                        </span>
                    </td>
                ))}

                {visibleColumns.includes('aov') && months.map(m => {
                    const node = trendNodes[m.id];
                    const aov = (node && node.totalQuantity > 0) ? node.totalRevenue / node.totalQuantity : 0;
                    return (
                        <td key={`aov-${m.id}`} className="px-3 py-3 text-right">
                            <span className="text-violet-600 dark:text-violet-400 font-medium text-[11px]">
                                {aov > 0 ? formatCurrency(aov, 0) : '-'}
                            </span>
                        </td>
                    );
                })}

                {visibleColumns.includes('traGopPercent') && months.map(m => {
                    const node = trendNodes[m.id];
                    const traGopPct = (node && node.totalRevenue > 0) ? (node.totalTraGop / node.totalRevenue) * 100 : 0;
                    const tgTarget = kpiTargets?.traGop || 45;
                    return (
                        <td key={`tg-${m.id}`} className="px-3 py-3 text-right group-hover:bg-rose-50 dark:group-hover:bg-rose-900/10 transition-colors">
                            <span className={`text-[13px] ${getTraGopPercentClass(traGopPct, tgTarget)}`}>
                                {traGopPct > 0 ? `${Math.ceil(traGopPct)}%` : '-'}
                            </span>
                        </td>
                    );
                })}

            </tr>

            {/* Recursively render children if expanded */}
            {isExpanded && hasChildren && childrenKeysArray.map(childKey => {
                const childTrendNodes: { [monthId: string]: SummaryTableNode | undefined } = {};
                months.forEach(m => {
                    childTrendNodes[m.id] = trendNodes[m.id]?.children[childKey];
                });

                return (
                    <MonthlyTrendTableRow
                        key={`${currentId}-${childKey}`}
                        nodeKey={childKey}
                        trendNodes={childTrendNodes}
                        months={months}
                        level={level + 1}
                        parentId={currentId}
                        expandedIds={expandedIds}
                        toggleExpand={toggleExpand}
                        drilldownOrder={drilldownOrder}
                        visibleColumns={visibleColumns}
                        sortConfig={sortConfig}
                        parentMonthlyQuantities={myMonthlyQuantities}
                        parentMonthlyRevenues={myMonthlyRevenues}
                    />
                );
            })}
        </React.Fragment>
    );
});
