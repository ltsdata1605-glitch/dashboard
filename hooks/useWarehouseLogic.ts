
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

        const industrySets = new Map<string, Set<string>>();
        const subgroupSets = new Map<string, Set<string>>();
        const manufacturerSets = new Map<string, Set<string>>();
        const productSets = new Map<string, Set<string>>();

        customColumns.forEach(col => {
            if (col.type === 'data' || (!col.type && col.productCodes)) {
                if (col.filters?.selectedIndustries?.length) industrySets.set(col.id, new Set(col.filters.selectedIndustries));
                if (col.filters?.selectedSubgroups?.length) subgroupSets.set(col.id, new Set(col.filters.selectedSubgroups));
                if (col.filters?.selectedManufacturers?.length) manufacturerSets.set(col.id, new Set(col.filters.selectedManufacturers));
                
                const productCodes = col.filters?.productCodes || col.productCodes;
                if (productCodes?.length) productSets.set(col.id, new Set(productCodes));
            }
        });

        // 1. Process "data" type columns
        dataRows.forEach(row => {
            const rawKhoName = getRowValue(row, COL.KHO);
            if (!rawKhoName) return;
            const khoName = String(rawKhoName);

            customColumns.forEach(col => {
                if (col.type !== 'data' && (col.type !== undefined || !col.productCodes)) return;

                const industrySet = industrySets.get(col.id);
                const subgroupSet = subgroupSets.get(col.id);
                const manufacturerSet = manufacturerSets.get(col.id);
                const productSet = productSets.get(col.id);

                let isMatch = true;
                
                // If it has ANY filter, evaluate it
                if (industrySet || subgroupSet || manufacturerSet || productSet || col.filters?.priceCondition) {
                    const nganhHang = getRowValue(row, COL.MA_NGANH_HANG);
                    const nhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                    const rootIndustry = productConfig.childToParentMap[nhomHang] || 'Khác';

                    if (industrySet && !industrySet.has(rootIndustry)) isMatch = false;
                    if (isMatch && subgroupSet && !subgroupSet.has(nhomHang)) isMatch = false;
                    if (isMatch && manufacturerSet && !manufacturerSet.has(getRowValue(row, COL.MANUFACTURER))) isMatch = false;
                    
                    if (isMatch && productSet && !productSet.has(nhomHang)) isMatch = false;

                    if (isMatch && col.filters?.priceCondition) {
                        const price = Number(getRowValue(row, col.filters.priceType === 'original' ? COL.ORIGINAL_PRICE : COL.PRICE)) || 0;
                        const v1 = col.filters.priceValue1 || 0;
                        const v2 = col.filters.priceValue2 || 0;
                        switch (col.filters.priceCondition) {
                            case 'greater': if (price <= v1) isMatch = false; break;
                            case 'less': if (price >= v1) isMatch = false; break;
                            case 'equal': if (price !== v1) isMatch = false; break;
                            case 'between': if (price < v1 || price > v2) isMatch = false; break;
                        }
                    }
                }

                if (isMatch) {
                    const price = Number(getRowValue(row, COL.PRICE)) || 0;
                    const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
                    
                    const nganhHang = getRowValue(row, COL.MA_NGANH_HANG);
                    const nhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                    const productName = getRowValue(row, COL.PRODUCT);
                    const heso = getHeSoQuyDoi(nganhHang, nhomHang, productConfig, productName);

                    const rootIndustry = productConfig.childToParentMap[nhomHang] || 'Khác';
                    const group = productConfig.childToSubgroupMap[nhomHang] || 'Khác';
                    const isVieon = group === 'Vieon' || rootIndustry === 'Vieon' || (productName || '').toString().includes('VieON');
                    const weightedQuantity = isVieon ? (quantity * heso) : quantity;

                    const rowRevenue = price;
                    const metricType = col.metricType || 'quantity';

                    let value = 0;
                    if (metricType === 'quantity') {
                        value = weightedQuantity;
                    } else if (metricType === 'revenue') {
                        value = rowRevenue;
                    } else if (metricType === 'revenueQD') {
                        value = rowRevenue * heso;
                    }

                    const khoMap = results.get(col.id)!;
                    khoMap.set(khoName, (khoMap.get(khoName) || 0) + value);
                }
            });
        });

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
                return metrics[primaryKey]?.[column.categoryName!]?.[column.manufacturerName]?.[column.metricType];
            } else {
                const primaryKey = column.categoryType === 'industry' ? 'byIndustry' : column.categoryType === 'group' ? 'byGroup' : 'byManufacturer';
                return metrics[primaryKey]?.[column.categoryName!]?.[column.metricType];
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
