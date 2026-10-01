import { useState, useMemo, useCallback } from 'react';
import { useIndexedDBState } from './useIndexedDBState';
import { parseNumber, IndustryTreeNode, parseIndustryRealtimeData, parseIndustryLuyKeData } from '../utils/dashboardHelpers';

export interface FlatDisplayRow {
    values: string[];
    level: number; // -1=total, 0=NNH, 1=NhomHang, 2=Hang
    name: string;
    rowKey: string;
    hasChildren: boolean;
    childrenCount: number;
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
            childrenCount: node.children.length,
            isExpanded: isExp
        });
        if (isExp && node.children.length > 0) {
            result.push(...flattenTree(node.children, expanded, key));
        }
    });
    return result;
};

const DEFAULT_HIDDEN_COLUMNS = ['% Tỉ trọng', 'Target (QĐ)', '% HT Target (QĐ)'];

export function useIndustryViewLogic(realtimeData: ReturnType<typeof parseIndustryRealtimeData> | null, luykeData: ReturnType<typeof parseIndustryLuyKeData> | null, isRealtime: boolean) {
    const [userHiddenColumns, setUserHiddenColumns] = useIndexedDBState<string[]>('global-hidden-cols-industry-v2', DEFAULT_HIDDEN_COLUMNS);
    const [hiddenIndustries, setHiddenIndustries] = useIndexedDBState<string[]>('global-hidden-industries', []);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const data = isRealtime ? realtimeData! : luykeData!.table; // IndustryView chỉ render khi bộ đang xem khác null
    const { headers, rows } = data;

    const allIndustries = useMemo(() => {
        // ?.: bộ KHÔNG đang xem có thể null (vd chỉ mới dán Realtime) — trước đây mảng phụ thuộc bên dưới
        // đọc luykeData.table.rows vô điều kiện nên sập (strict 2026-09-30)
        const sourceRows = isRealtime ? realtimeData?.rows : luykeData?.table.rows;
        return (sourceRows || [])
            .map((row) => row[0])
            .filter((name: string) => name && name !== 'Tổng' && name !== 'Không tính doanh thu');
    }, [realtimeData?.rows, luykeData?.table.rows, isRealtime]);

    const processedTable = useMemo(() => {
        if (!headers || headers.length === 0 || !rows || rows.length === 0) {
            return { headers: [], rows: [] };
        }
        
        let totalRow = rows.find((r) => r[0] === 'Tổng');
        let otherRows = rows.filter((r) => r[0] !== 'Tổng');

        const hiddenIndustriesSet = new Set(hiddenIndustries);
        otherRows = otherRows.filter((row) => 
            row[0] && !hiddenIndustriesSet.has(row[0])
        );

        // Luôn sắp xếp theo cột DTQĐ giảm dần theo yêu cầu nghiệp vụ
        const dtqdIndex = headers.findIndex(h => h === 'DTQĐ' || h === 'DT Realtime (QĐ)' || h.includes('DTQĐ'));
        if (dtqdIndex !== -1) {
            otherRows.sort((a, b) => {
                const valA = parseNumber(a[dtqdIndex]);
                const valB = parseNumber(b[dtqdIndex]);
                return valB - valA;
            });
        }
        
        const finalRows = totalRow ? [...otherRows, totalRow] : otherRows;

        return { headers, rows: finalRows };
    }, [rows, headers, isRealtime, hiddenIndustries]);

    const [hiddenSubIndustries, setHiddenSubIndustries] = useIndexedDBState<string[]>('global-hidden-sub-industries', []);

    const allSubIndustries = useMemo(() => {
        const activeTree = isRealtime ? realtimeData?.tree : luykeData?.tree;
        if (!activeTree) return [];
        const subs = new Set<string>();
        activeTree.forEach((node) => {
            if (node.name !== 'Không tính doanh thu') {
                node.children.forEach((c) => {
                    if (c.name !== 'Không tính doanh thu') {
                        subs.add(c.name);
                    }
                });
            }
        });
        return Array.from(subs);
    }, [isRealtime, realtimeData, luykeData]);

    const treeDisplayRows = useMemo((): FlatDisplayRow[] | null => {
        const activeTree = isRealtime ? realtimeData?.tree : luykeData?.tree;
        if (!activeTree || activeTree.length === 0) {
            return null;
        }

        const hiddenSet = new Set(hiddenIndustries);
        const hiddenSubSet = new Set(hiddenSubIndustries);
        
        let filteredTree = activeTree
            .filter((node) => !hiddenSet.has(node.name))
            .map((node) => ({
                ...node,
                children: node.children.filter((child) => !hiddenSubSet.has(child.name))
            }));

        // Luôn sắp xếp các ngành hàng và nhóm hàng con theo cột DTQĐ giảm dần
        const dtqdIdx = headers.findIndex(h => h === 'DTQĐ' || h === 'DT Realtime (QĐ)' || h.includes('DTQĐ'));
        if (dtqdIdx >= 0) {
            filteredTree = [...filteredTree].sort((a, b) => {
                const valA = parseNumber(a.values[dtqdIdx]);
                const valB = parseNumber(b.values[dtqdIdx]);
                return valB - valA;
            });

            // Sắp xếp các nhóm hàng con bên trong mỗi ngành theo DTQĐ giảm dần
            filteredTree.forEach(node => {
                if (node.children && node.children.length > 0) {
                    node.children.sort((a, b) => {
                        const valA = parseNumber(a.values[dtqdIdx]);
                        const valB = parseNumber(b.values[dtqdIdx]);
                        return valB - valA;
                    });
                }
            });
        }


        const flat = flattenTree(filteredTree, expandedRows);

        const sourceTotalRow = isRealtime ? (realtimeData?.totalRow || realtimeData?.rows?.find((r) => r[0] === 'Tổng')) : (luykeData?.totalRow || luykeData?.table?.rows?.find((r) => r[0] === 'Tổng'));

        if (sourceTotalRow) {
            flat.push({
                values: sourceTotalRow,
                level: -1,
                name: 'Tổng',
                rowKey: '__total__',
                hasChildren: false,
                childrenCount: 0,
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
        const activeTree = isRealtime ? realtimeData?.tree : luykeData?.tree;
        if (!activeTree) return;
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
        collectKeys(activeTree);
        setExpandedRows(allKeys);
    }, [isRealtime, realtimeData, luykeData]);

    const collapseAll = useCallback(() => setExpandedRows(new Set()), []);

    const activeTreeForHasData = isRealtime ? realtimeData?.tree : luykeData?.tree;
    const hasTreeData = !!activeTreeForHasData && activeTreeForHasData.length > 0;
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
