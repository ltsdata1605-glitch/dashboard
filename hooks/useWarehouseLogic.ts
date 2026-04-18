
import { useMemo } from 'react';
import type { WarehouseColumnConfig, WarehouseSummaryRow, DataRow, ProductConfig, MetricValues } from '../types';
import { COL, HINH_THUC_XUAT_THU_HO, HINH_THUC_XUAT_TRA_GOP } from '../constants';
import { getRowValue, getHeSoQuyDoi } from '../utils/dataUtils';

interface UseWarehouseLogicProps {
    data: WarehouseSummaryRow[];
    columns: WarehouseColumnConfig[];
    originalData: DataRow[];
    productConfig: ProductConfig | null;
    sortConfig: { key: string; direction: 'asc' | 'desc' };
}

export const useWarehouseLogic = ({
    data,
    columns,
    originalData,
    productConfig,
    sortConfig
}: UseWarehouseLogicProps) => {

    const customProductColumnValues = useMemo(() => {
        const results = new Map<string, Map<string, number>>();
        const dataRows = originalData as DataRow[];
        if (!dataRows || !productConfig) return results;

        // Custom columns include the legacy ProductCode columns AND the new flexible ones
        const customColumns = columns.filter(c => c.isCustom && (c.type || c.productCodes));
        if (customColumns.length === 0) return results;

        customColumns.forEach(c => results.set(c.id, new Map<string, number>()));

        // Separate data columns from non-data columns upfront
        const dataColumns = customColumns.filter(col => col.type === 'data' || (!col.type && col.productCodes));

        // Pre-compute filter sets once
        const colFilterCache = dataColumns.map(col => {
            const industrySet = col.filters?.selectedIndustries?.length ? new Set(col.filters.selectedIndustries) : null;
            const subgroupSet = col.filters?.selectedSubgroups?.length ? new Set(col.filters.selectedSubgroups) : null;
            const manufacturerSet = col.filters?.selectedManufacturers?.length ? new Set(col.filters.selectedManufacturers) : null;
            const productCodes = col.filters?.productCodes || col.productCodes;
            const productSet = productCodes?.length ? new Set(productCodes) : null;
            const hasAnyFilter = !!(industrySet || subgroupSet || manufacturerSet || productSet || col.filters?.priceCondition);
            return { col, industrySet, subgroupSet, manufacturerSet, productSet, hasAnyFilter };
        });

        if (dataColumns.length === 0) {
            // Skip the data row loop entirely if there are no data columns
        } else {
            // 1. Process "data" type columns — single pass over all rows
            const colCount = colFilterCache.length;
            for (let ri = 0, rLen = dataRows.length; ri < rLen; ri++) {
                const row = dataRows[ri];
                const rawKhoName = getRowValue(row, COL.KHO);
                if (!rawKhoName) continue;
                const khoName = String(rawKhoName);

                // Extract row-level fields once (shared across all column evaluations)
                const nganhHang = getRowValue(row, COL.MA_NGANH_HANG);
                const nhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                const productName = getRowValue(row, COL.PRODUCT);
                const group = productConfig.childToSubgroupMap[nhomHang] || 'Khác';
                const rootIndustry = productConfig.childToParentMap[nhomHang] || 'Khác';
                const manufacturer = getRowValue(row, COL.MANUFACTURER);
                const productNameStr = String(productName || '');

                // Lazy-computed values (only computed once per-row if needed by any column)
                let heso: number | null = null;
                let price: number | null = null;
                let quantity: number | null = null;

                for (let ci = 0; ci < colCount; ci++) {
                    const { col, industrySet, subgroupSet, manufacturerSet, productSet, hasAnyFilter } = colFilterCache[ci];

                    let isMatch = true;

                    if (hasAnyFilter) {
                        if (industrySet && !industrySet.has(rootIndustry)) continue;
                        if (subgroupSet && !subgroupSet.has(group)) continue;
                        if (manufacturerSet && !manufacturerSet.has(manufacturer)) continue;

                        if (productSet) {
                            let pMatch = false;
                            for (const code of productSet) {
                                if (productNameStr.includes(code)) {
                                    pMatch = true;
                                    break;
                                }
                            }
                            if (!pMatch) continue;
                        }

                        if (col.filters?.priceCondition) {
                            const priceVal = Number(getRowValue(row, col.filters.priceType === 'original' ? COL.ORIGINAL_PRICE : COL.PRICE)) || 0;
                            const v1 = col.filters.priceValue1 || 0;
                            const v2 = col.filters.priceValue2 || 0;
                            switch (col.filters.priceCondition) {
                                case 'greater': if (priceVal <= v1) isMatch = false; break;
                                case 'less': if (priceVal >= v1) isMatch = false; break;
                                case 'equal': if (priceVal !== v1) isMatch = false; break;
                                case 'between': if (priceVal < v1 || priceVal > v2) isMatch = false; break;
                            }
                            if (!isMatch) continue;
                        }
                    }

                    // Lazy-compute expensive row values only when first column matches
                    if (heso === null) {
                        heso = getHeSoQuyDoi(nganhHang, nhomHang, productConfig, productName);
                        price = Number(getRowValue(row, COL.PRICE)) || 0;
                        quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
                    }

                    const isVieon = group === 'Vieon' || rootIndustry === 'Vieon' || productNameStr.includes('VieON');
                    const weightedQuantity = isVieon ? (quantity! * heso) : quantity!;
                    const rowRevenue = price!;
                    const metricType = col.metricType || 'quantity';

                    let value = 0;
                    if (metricType === 'quantity') {
                        value = weightedQuantity;
                    } else if (metricType === 'revenue') {
                        value = rowRevenue / 1000000;
                    } else if (metricType === 'revenueQD') {
                        value = (rowRevenue * heso) / 1000000;
                    }

                    const khoMap = results.get(col.id)!;
                    khoMap.set(khoName, (khoMap.get(khoName) || 0) + value);
                }
            }
        }

        // Get all visible Khos from aggregated data
        const allKhoNames = data.map(d => String(d.khoName));

        // 2. Process "target" columns
        customColumns.forEach(col => {
            if (col.type !== 'target') return;
            const validCount = allKhoNames.length;
            const valuePerKho = validCount > 0 ? (col.targetValue || 0) / validCount : 0;
            allKhoNames.forEach(khoName => {
                const khoMap = results.get(col.id)!;
                khoMap.set(khoName, valuePerKho);
            });
        });

        // Helper func to resolve old metrics for calculated columns
        const getFallbackMetric = (khoName: string, colId: string) => {
             const row = data.find(d => String(d.khoName) === khoName);
             if (!row) return 0;
             const targetCol = columns.find(c => c.id === colId);
             if (!targetCol) return 0;
             if (targetCol.metric) return (row as any)[targetCol.metric] || 0;
             
             // Legacy category parsing
             if (targetCol.categoryType && targetCol.categoryName && targetCol.metricType) {
                const metrics = (row as any).metrics;
                if (!metrics) return 0;
                if (targetCol.manufacturerName) {
                    const primaryKey = targetCol.categoryType === 'industry' ? 'byIndustryAndManufacturer' : 'byGroupAndManufacturer';
                    return metrics[primaryKey]?.[targetCol.categoryName]?.[targetCol.manufacturerName]?.[targetCol.metricType] || 0;
                } else {
                    const primaryKey = targetCol.categoryType === 'industry' ? 'byIndustry' : targetCol.categoryType === 'group' ? 'byGroup' : 'byManufacturer';
                    return metrics[primaryKey]?.[targetCol.categoryName]?.[targetCol.metricType] || 0;
                }
             }
             return 0;
        };

        // 3. Process "calculated" columns
        allKhoNames.forEach(khoName => {
            customColumns.forEach(col => {
                if (col.type === 'calculated' && col.operand1_columnId && col.operand2_columnId) {
                    let op1 = results.get(col.operand1_columnId)?.get(khoName);
                    if (op1 === undefined) op1 = getFallbackMetric(khoName, col.operand1_columnId);
                    
                    let op2 = results.get(col.operand2_columnId)?.get(khoName);
                    if (op2 === undefined) op2 = getFallbackMetric(khoName, col.operand2_columnId);

                    let result = 0;
                    switch (col.operation) {
                        case '+': result = op1 + op2; break;
                        case '-': result = op1 - op2; break;
                        case '*': result = op1 * op2; break;
                        case '/': result = op2 !== 0 ? op1 / op2 : 0; break;
                    }
                    const khoMap = results.get(col.id)!;
                    khoMap.set(khoName, result);
                }
            });
        });

        return results;
    }, [data, columns, originalData, productConfig]);

    const getColumnValue = (row: WarehouseSummaryRow | Partial<WarehouseSummaryRow>, column: WarehouseColumnConfig): number | undefined => {
        if (column.metric) return (row as any)[column.metric];
        
        if (column.isCustom && row.khoName) {
            const mappedVal = customProductColumnValues.get(column.id)?.get(String(row.khoName));
            if (mappedVal !== undefined) return mappedVal;
        }

        if (column.categoryType && (column.categoryName || column.productCodes) && column.metricType) {
            if(column.productCodes) return undefined;
            
            const metrics = (row as any).metrics;
            if (!metrics) return 0;

            if (column.manufacturerName) {
                const primaryKey = column.categoryType === 'industry' ? 'byIndustryAndManufacturer' : 'byGroupAndManufacturer';
                let val = metrics[primaryKey]?.[column.categoryName!]?.[column.manufacturerName]?.[column.metricType];
                if (val !== undefined && (column.metricType === 'revenue' || column.metricType === 'revenueQD')) {
                    val = val / 1000000;
                }
                return val;
            } else {
                const primaryKey = column.categoryType === 'industry' ? 'byIndustry' : column.categoryType === 'group' ? 'byGroup' : 'byManufacturer';
                let val = metrics[primaryKey]?.[column.categoryName!]?.[column.metricType];
                if (val !== undefined && (column.metricType === 'revenue' || column.metricType === 'revenueQD')) {
                    val = val / 1000000;
                }
                return val;
            }
        }
        return 0;
    };

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            let valA: string | number = 0;
            let valB: string | number = 0;
            
            if (sortConfig.key === 'khoName') {
                valA = a.khoName;
                valB = b.khoName;
            } else {
                const column = columns.find(c => c.id === sortConfig.key);
                if (column) {
                    if (column.isCustom && customProductColumnValues.has(column.id)) {
                        valA = customProductColumnValues.get(column.id)?.get(a.khoName) || 0;
                        valB = customProductColumnValues.get(column.id)?.get(b.khoName) || 0;
                    } else {
                        valA = getColumnValue(a, column) || 0;
                        valB = getColumnValue(b, column) || 0;
                    }
                }
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            } else {
                return sortConfig.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
            }
            return 0;
        });
    }, [data, sortConfig, columns, customProductColumnValues]);

    const { totals, customTotals } = useMemo(() => {
        const initialTotals: Partial<WarehouseSummaryRow> & { metrics: any; doanhThuTraCham: number; } = {
            metrics: {
                byIndustry: {},
                byGroup: {},
                byManufacturer: {},
                byIndustryAndManufacturer: {},
                byGroupAndManufacturer: {},
            },
            doanhThuTraCham: 0
        };
        const customTotalsMap = new Map<string, number>();

        const visibleColumns = columns.filter(c => c.isVisible);

        visibleColumns.forEach(col => {
            if (col.isCustom && customProductColumnValues.has(col.id)) {
                const colId = col.id;
                const columnMap = customProductColumnValues.get(colId);
                let total = 0;
                if (columnMap) {
                    for (const val of columnMap.values()) {
                        total += val;
                    }
                }
                // For target columns, the "total" shouldn't be sum of targets if it's "targetValue"
                // Actually, if it's Target, total = targetValue! Which is exactly targetValue/kho * kho = targetValue
                if (col.type === 'target') {
                    customTotalsMap.set(colId, col.targetValue || 0);
                } else if (col.type !== 'calculated') {
                    customTotalsMap.set(colId, total);
                }
            }
        });
        const coreTotals = data.reduce((acc, row) => {
            acc.doanhThuThuc = (acc.doanhThuThuc || 0) + row.doanhThuThuc;
            acc.doanhThuQD = (acc.doanhThuQD || 0) + row.doanhThuQD;
            acc.slTiepCan = (acc.slTiepCan || 0) + row.slTiepCan;
            acc.slThuHo = (acc.slThuHo || 0) + row.slThuHo;
            acc.doanhThuTraCham = (acc.doanhThuTraCham || 0) + row.doanhThuTraCham;
            visibleColumns.forEach(col => {
                if (!col.isCustom && col.metric !== 'traChamPercent') {
                    const val = getColumnValue(row, col) || 0;
                    customTotalsMap.set(col.id, (customTotalsMap.get(col.id) || 0) + val);
                }
            });
            return acc;
        }, initialTotals);

        if (coreTotals.doanhThuThuc) {
            (coreTotals as any).hieuQuaQD = (coreTotals.doanhThuThuc || 0) > 0 ? (((coreTotals.doanhThuQD || 0) - (coreTotals.doanhThuThuc || 0)) / (coreTotals.doanhThuThuc || 1)) * 100 : 0;
            (coreTotals as any).traChamPercent = (coreTotals.doanhThuThuc || 0) > 0 ? (((coreTotals.doanhThuTraCham || 0)) / (coreTotals.doanhThuThuc || 1)) * 100 : 0;
        }

        // Second pass: Calculate dynamically for 'calculated' columns
        const getDynamicTotal = (colId: string): number => {
            if (customTotalsMap.has(colId)) return customTotalsMap.get(colId)!;
            const targetCol = columns.find(c => c.id === colId);
            if (targetCol && targetCol.metric) return (coreTotals as any)[targetCol.metric] || 0;
            return 0;
        };

        visibleColumns.forEach(col => {
            if (col.isCustom && col.type === 'calculated' && col.operand1_columnId && col.operand2_columnId) {
                const totalOp1 = getDynamicTotal(col.operand1_columnId);
                const totalOp2 = getDynamicTotal(col.operand2_columnId);

                let result = 0;
                switch (col.operation) {
                    case '+': result = totalOp1 + totalOp2; break;
                    case '-': result = totalOp1 - totalOp2; break;
                    case '*': result = totalOp1 * totalOp2; break;
                    case '/': result = totalOp2 !== 0 ? totalOp1 / totalOp2 : 0; break;
                }
                customTotalsMap.set(col.id, result);
            }
        });

        return { totals: coreTotals, customTotals: customTotalsMap };
    }, [data, columns, customProductColumnValues]);

    return {
        sortedData,
        totals,
        customTotals,
        customProductColumnValues,
        getColumnValue
    };
};
