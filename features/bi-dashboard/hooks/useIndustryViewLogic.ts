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
    const [userHiddenColumns, setUserHiddenColumns] = useIndexedDBState<string[]>('global-hidden-cols-industry', []);
    const [hiddenIndustries, setHiddenIndustries] = useIndexedDBState<string[]>('global-hidden-industries', []);
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

    const [hiddenSubIndustries, setHiddenSubIndustries] = useIndexedDBState<string[]>('global-hidden-sub-industries', []);

    const allSubIndustries = useMemo(() => {
        if (!luykeData || !luykeData.tree) return [];
        const subs = new Set<string>();
        luykeData.tree.forEach((node: any) => {
            node.children.forEach((c: any) => subs.add(c.name));
        });
        return Array.from(subs);
    }, [luykeData]);

    const treeDisplayRows = useMemo((): FlatDisplayRow[] | null => {
        if (!luykeData || !luykeData.tree || luykeData.tree.length === 0) {
            return null;
        }

        const hiddenSet = new Set(hiddenIndustries);
        const hiddenSubSet = new Set(hiddenSubIndustries);
        
        let filteredTree = luykeData.tree
            .filter((node: any) => !hiddenSet.has(node.name))
            .map((node: any) => ({
                ...node,
                children: node.children.filter((child: any) => !hiddenSubSet.has(child.name))
            }));

        if (isRealtime) {
            const realtimeRowsMap = new Map<string, any>();
            if (realtimeData && realtimeData.rows) {
                realtimeData.rows.forEach((r: any) => {
                    if (r[0]) realtimeRowsMap.set(r[0].trim(), r);
                });
            }

            const mapNode = (node: IndustryTreeNode): IndustryTreeNode => {
                const nodeName = node.name.trim();
                let rtRow = realtimeRowsMap.get(nodeName);
                if (!rtRow && nodeName.startsWith('NNH ')) {
                     rtRow = realtimeRowsMap.get(nodeName.replace('NNH ', ''));
                }
                
                return {
                    ...node,
                    values: rtRow || node.values.map((_, i) => i === 0 ? node.name : '0'),
                    children: node.children.map(mapNode)
                };
            };
            filteredTree = filteredTree.map(mapNode);
        }

        const htTargetIdx = headers.indexOf(isRealtime ? '% HT Target Ngày (QĐ)' : '% HT Target (QĐ)');
        if (htTargetIdx >= 0) {
            filteredTree = [...filteredTree].sort(
                (a, b) => parseNumber(b.values[htTargetIdx]) - parseNumber(a.values[htTargetIdx])
            );
        }

        const flat = flattenTree(filteredTree, expandedRows);

        const sourceTotalRow = isRealtime ? (realtimeData?.totalRow || realtimeData?.rows?.find((r: any) => r[0] === 'Tổng')) : luykeData.totalRow;

        if (sourceTotalRow) {
            flat.push({
                values: sourceTotalRow,
                level: -1,
                name: 'Tổng',
                rowKey: '__total__',
                hasChildren: false,
                isExpanded: false
            });
        }

        return flat;
    }, [isRealtime, luykeData, realtimeData, hiddenIndustries, expandedRows, headers, hiddenSubIndustries]);

    const toggleRow = useCallback((key: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => {
        if (!luykeData || !luykeData.tree) return;
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
    }, [luykeData]);

    const collapseAll = useCallback(() => setExpandedRows(new Set()), []);

    const hasTreeData = luykeData && luykeData.tree && luykeData.tree.length > 0;
    const hasAnyExpanded = expandedRows.size > 0;
    
    const orderedHeaders = useMemo(() => {
        return processedTable.headers;
    }, [processedTable.headers]);

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

    return {
        allIndustries,
        processedTable,
        treeDisplayRows,
        hasTreeData,
        hasAnyExpanded,
        orderedHeaders,
        visibleColumns,
        hiddenIndustries,
        userHiddenColumns,
        setHiddenIndustries,
        toggleRow,
        expandAll,
        collapseAll,
        toggleColumn,
        setUserHiddenColumns,
        hiddenSubIndustries,
        setHiddenSubIndustries,
        allSubIndustries
    };
}
