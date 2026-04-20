import { useState, useMemo, useEffect, useCallback } from 'react';
import { useIndexedDBState } from './useIndexedDBState';
import { parseNumber, IndustryTreeNode } from '../utils/dashboardHelpers';

export interface FlatDisplayRow {
    values: string[];
    level: number; // -1=total, 0=NNH, 1=NhomHang, 2=Hang
    name: string;
    rowKey: string;
    hasChildren: boolean;
    isExpanded: boolean;
}

export const flattenTree = (
    nodes: IndustryTreeNode[],
    expanded: Set<string>,
    parentPath: string = ''
): FlatDisplayRow[] => {
    const result: FlatDisplayRow[] = [];
    nodes.forEach((node) => {
        const key = parentPath ? `${parentPath}/${node.name}` : node.name;
        const isExp = expanded.has(key);
        result.push({
            values: node.values,
            level: node.level,
            name: node.name,
            rowKey: key,
            hasChildren: node.children.length > 0,
            isExpanded: isExp
        });
        if (isExp && node.children.length > 0) {
            result.push(...flattenTree(node.children, expanded, key));
        }
    });
    return result;
};

export function useIndustryViewLogic(realtimeData: any, luykeData: any, isRealtime: boolean) {
    const [userHiddenColumns, setUserHiddenColumns] = useIndexedDBState<string[]>(`hidden-cols-industry-${isRealtime ? 'realtime' : 'luyke'}`, []);
    const [hiddenIndustries, setHiddenIndustries] = useIndexedDBState<string[]>(`hidden-industries-${isRealtime ? 'realtime' : 'luyke'}`, []);
    const [columnOrder, setColumnOrder] = useIndexedDBState<string[]>(`industry-col-order-${isRealtime ? 'realtime' : 'luyke'}`, []);
    
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const data = isRealtime ? realtimeData : luykeData.table;
    const { headers, rows } = data;

    const allIndustries = useMemo(() => {
        const sourceRows = isRealtime ? realtimeData.rows : luykeData.table.rows;
        return (sourceRows || [])
            .map((row: any) => row[0])
            .filter((name: string) => name && name !== 'Tổng');
    }, [realtimeData.rows, luykeData.table.rows, isRealtime]);

    const processedTable = useMemo(() => {
        if (!headers || headers.length === 0 || !rows || rows.length === 0) {
            return { headers: [], rows: [] };
        }
        
        let totalRow = rows.find((r: any) => r[0] === 'Tổng');
        let otherRows = rows.filter((r: any) => r[0] !== 'Tổng');

        const hiddenIndustriesSet = new Set(hiddenIndustries);
        otherRows = otherRows.filter((row: any) => 
            row[0] && !hiddenIndustriesSet.has(row[0])
        );

        const htTargetIndex = headers.indexOf(isRealtime ? '% HT Target Ngày (QĐ)' : '% HT Target (QĐ)');
        if (htTargetIndex !== -1) {
            otherRows.sort((a: any, b: any) => parseNumber(b[htTargetIndex]) - parseNumber(a[htTargetIndex]));
        }
        
        const finalRows = totalRow ? [...otherRows, totalRow] : otherRows;

        return { headers, rows: finalRows };
    }, [rows, headers, isRealtime, hiddenIndustries]);

    const treeDisplayRows = useMemo((): FlatDisplayRow[] | null => {
        if (isRealtime || !luykeData.tree || luykeData.tree.length === 0) {
            return null;
        }

        const hiddenSet = new Set(hiddenIndustries);
        let filteredTree = luykeData.tree.filter((node: any) => !hiddenSet.has(node.name));

        const htTargetIdx = luykeData.table.headers.indexOf('% HT Target (QĐ)');
        if (htTargetIdx >= 0) {
            filteredTree = [...filteredTree].sort(
                (a, b) => parseNumber(b.values[htTargetIdx]) - parseNumber(a.values[htTargetIdx])
            );
        }

        const flat = flattenTree(filteredTree, expandedRows);

        if (luykeData.totalRow) {
            flat.push({
                values: luykeData.totalRow,
                level: -1,
                name: 'Tổng',
                rowKey: '__total__',
                hasChildren: false,
                isExpanded: false
            });
        }

        return flat;
    }, [isRealtime, luykeData, hiddenIndustries, expandedRows]);

    const toggleRow = useCallback((key: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => {
        if (!luykeData.tree) return;
        const allKeys = new Set<string>();
        const collectKeys = (nodes: IndustryTreeNode[], parentPath: string = '') => {
            nodes.forEach(n => {
                const key = parentPath ? `${parentPath}/${n.name}` : n.name;
                if (n.children.length > 0) {
                    allKeys.add(key);
                    collectKeys(n.children, key);
                }
            });
        };
        collectKeys(luykeData.tree);
        setExpandedRows(allKeys);
    }, [luykeData.tree]);

    const collapseAll = useCallback(() => setExpandedRows(new Set()), []);

    const hasTreeData = !isRealtime && luykeData.tree && luykeData.tree.length > 0;
    const hasAnyExpanded = expandedRows.size > 0;
    
    useEffect(() => {
        if (processedTable.headers.length > 0) {
            const currentHeaders = processedTable.headers;
            const newOrder = [...columnOrder];
            const filteredOrder = newOrder.filter(h => currentHeaders.includes(h));
            const missingHeaders = currentHeaders.filter(h => !filteredOrder.includes(h));
            
            if (missingHeaders.length > 0 || filteredOrder.length !== newOrder.length) {
                setColumnOrder([...filteredOrder, ...missingHeaders]);
            }
        }
    }, [processedTable.headers, columnOrder, setColumnOrder]);

    const orderedHeaders = useMemo(() => {
        if (columnOrder.length === 0) return processedTable.headers;
        return columnOrder.filter(h => processedTable.headers.includes(h));
    }, [columnOrder, processedTable.headers]);

    const visibleColumns = useMemo(() => {
        const hiddenSet = new Set(userHiddenColumns);
        return new Set(orderedHeaders.filter(h => !hiddenSet.has(h)));
    }, [orderedHeaders, userHiddenColumns]);

    const toggleColumn = (header: string) => {
        setUserHiddenColumns(prev => {
            const newHidden = new Set(prev);
            if (newHidden.has(header)) newHidden.delete(header);
            else newHidden.add(header);
            return Array.from(newHidden);
        });
    };

    const handleDragStart = (e: React.DragEvent, header: string) => {
        setDraggedColumn(header);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, header: string) => {
        e.preventDefault();
        if (draggedColumn === null || draggedColumn === header) return;

        const newOrder = [...columnOrder];
        const oldIdx = newOrder.indexOf(draggedColumn);
        const newIdx = newOrder.indexOf(header);

        if (oldIdx !== -1 && newIdx !== -1) {
            newOrder.splice(oldIdx, 1);
            newOrder.splice(newIdx, 0, draggedColumn);
            setColumnOrder(newOrder);
        }
    };

    const handleDrop = (_e: React.DragEvent) => {
        setDraggedColumn(null);
    };

    return {
        allIndustries,
        processedTable,
        treeDisplayRows,
        hasTreeData,
        hasAnyExpanded,
        orderedHeaders,
        visibleColumns,
        draggedColumn,
        hiddenIndustries,
        userHiddenColumns,
        setHiddenIndustries,
        toggleRow,
        expandAll,
        collapseAll,
        toggleColumn,
        handleDragStart,
        handleDragOver,
        handleDrop,
        setDraggedColumn,
    };
}
