import { useMemo } from 'react';
import type { DataRow, ProductConfig, Employee, HeadToHeadTableConfig } from '../types';
import { getRowValue, toLocalISOString, getHeSoQuyDoi } from '../utils/dataUtils';
import { COL, HINH_THUC_XUAT_THU_HO } from '../constants';

interface UseHeadToHeadLogicProps {
    config: HeadToHeadTableConfig;
    allConfigs?: HeadToHeadTableConfig[];
    baseFilteredData: DataRow[];
    productConfig: ProductConfig;
    employeeData: Employee[];
    sortConfig: { key: string | number; direction: 'asc' | 'desc' };
    includeToday: boolean;
}

export const useHeadToHeadLogic = ({
    config,
    allConfigs,
    baseFilteredData,
    productConfig,
    employeeData,
    sortConfig,
    includeToday
}: UseHeadToHeadLogicProps) => {
    return useMemo(() => {
        const employeeDepartments = new Map(employeeData.map(e => [e.name, e.department]));
        const baseDate = new Date();
        baseDate.setHours(0, 0, 0, 0);
        if (!includeToday) baseDate.setDate(baseDate.getDate() - 1);
        
        const dateHeaders = Array.from({ length: 7 }).map((_, i) => { const d = new Date(baseDate); d.setDate(d.getDate() - i); return d; }).reverse();
        const startDate = dateHeaders[0];
        const endDate = new Date(baseDate);
        endDate.setHours(23, 59, 59, 999);
        const dateRangeString = `${startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
        
        const cleanAndNormalize = (val: any): string => {
            if (val === undefined || val === null) return '';
            return val.toString().trim().toLowerCase().normalize('NFC');
        };

        const isValidSale = (row: DataRow): boolean => {
            const huy = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_HUY));
            if (huy !== 'chưa hủy') return false;
            
            const tra = cleanAndNormalize(getRowValue(row, COL.TINH_TRANG_NHAP_TRA));
            if (tra !== 'chưa trả') return false;
            
            const thu = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_THU_TIEN));
            if (thu !== 'đã thu') return false;
            
            return true;
        };

        const dataForTab: DataRow[] = [];
        const baseLen = baseFilteredData.length;
        for (let i = 0; i < baseLen; i++) {
            const row = baseFilteredData[i];
            if (!HINH_THUC_XUAT_THU_HO.has(getRowValue(row, COL.HINH_THUC_XUAT)) && isValidSale(row)) {
                dataForTab.push(row);
            }
        }
        
        const computedCache = new Map<string, any[]>();
        
        const evaluateConfig = (cfg: HeadToHeadTableConfig): any[] => {
            if (computedCache.has(cfg.id)) return computedCache.get(cfg.id)!;
            
            let resultRows: any[] = [];
            
            if (cfg.type === 'target') {
                const targetVal = cfg.targetValue || 0;
                const empLen = employeeData.length;
                resultRows = new Array(empLen);
                for (let i = 0; i < empLen; i++) {
                    const emp = employeeData[i];
                    const dailyValues: { [dateKey: string]: number } = {};
                    for (let j = 0, dhLen = dateHeaders.length; j < dhLen; j++) {
                        dailyValues[toLocalISOString(dateHeaders[j])] = targetVal;
                    }
                    resultRows[i] = {
                        name: emp.name,
                        department: employeeDepartments.get(emp.name) || 'Không Phân Ca',
                        dailyValues,
                        total: cfg.totalCalculationMethod === 'average' ? targetVal : targetVal * 7,
                        daysWithNoSales: 0,
                        rowAverage: targetVal
                    };
                }
            } else if (cfg.type === 'calculated') {
                const t1 = allConfigs?.find(c => c.id === cfg.operand1_tableId);
                const t2 = allConfigs?.find(c => c.id === cfg.operand2_tableId);
                
                const r1 = t1 ? evaluateConfig(t1) : null;
                const r2 = t2 ? evaluateConfig(t2) : null;
                
                const row1Map = new Map<string, any>();
                const row2Map = new Map<string, any>();
                if (r1) {
                    for (let i = 0, len = r1.length; i < len; i++) {
                        row1Map.set(r1[i].name, r1[i]);
                    }
                }
                if (r2) {
                    for (let i = 0, len = r2.length; i < len; i++) {
                        row2Map.set(r2[i].name, r2[i]);
                    }
                }
                
                const empLen = employeeData.length;
                resultRows = new Array(empLen);
                for (let i = 0; i < empLen; i++) {
                    const emp = employeeData[i];
                    const dailyValues: { [dateKey: string]: number } = {};
                    const row1 = row1Map.get(emp.name);
                    const row2 = row2Map.get(emp.name);
                    let total = 0;
                    let daysWithSales = 0;
                    
                    for (let j = 0, dhLen = dateHeaders.length; j < dhLen; j++) {
                        const date = dateHeaders[j];
                        const dateKey = toLocalISOString(date);
                        const v1 = row1?.dailyValues[dateKey] || 0;
                        const v2 = row2?.dailyValues[dateKey] || 0;
                        let finalV = 0;
                        if (cfg.operation === '+') finalV = v1 + v2;
                        else if (cfg.operation === '-') finalV = v1 - v2;
                        else if (cfg.operation === '*') finalV = v1 * v2;
                        else if (cfg.operation === '/') finalV = v2 !== 0 ? v1 / v2 : 0;
                        
                        if (cfg.displayAs === 'percentage' && cfg.operation === '/') finalV *= 100;
                        
                        dailyValues[dateKey] = finalV;
                        if (finalV > 0) daysWithSales++;
                        total += finalV;
                    }
                    
                    if (cfg.totalCalculationMethod === 'average') total /= 7;
                    
                    let rowSum = 0;
                    let nonZeroCount = 0;
                    for (let j = 0, dhLen = dateHeaders.length; j < dhLen; j++) {
                        const dateKey = toLocalISOString(dateHeaders[j]);
                        const val = dailyValues[dateKey] || 0;
                        rowSum += val;
                        if (val > 0) nonZeroCount++;
                    }
                    const rowAverage = rowSum / (nonZeroCount || 1);
                    
                    resultRows[i] = {
                        name: emp.name,
                        department: employeeDepartments.get(emp.name) || 'Không Phân Ca',
                        dailyValues,
                        total,
                        daysWithNoSales: 7 - daysWithSales,
                        rowAverage
                    };
                }
            } else {
                // Data type (default)
                const groupFilteredData = dataForTab.filter(row => {
                    const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                    const parentGroup = productConfig.childToParentMap[maNhomHang] || '';
                    const subgroup = productConfig.childToSubgroupMap[maNhomHang] || '';
                    const manufacturer = getRowValue(row, COL.MANUFACTURER) || '';
                    const productCode = getRowValue(row, COL.PRODUCT) || '';
                    
                    const hasOldFilters = (cfg.selectedParentGroups?.length || 0) > 0 || (cfg.selectedSubgroups?.length || 0) > 0;
                    if (hasOldFilters) {
                        const mParent = cfg.selectedParentGroups?.includes(parentGroup);
                        const mSubgroup = cfg.selectedSubgroups?.includes(subgroup);
                        return mParent || mSubgroup;
                    }
                    
                    if (!cfg.filters) return true; // No filters, include all
                    
                    const mInds = cfg.filters.selectedIndustries.length === 0 || cfg.filters.selectedIndustries.includes(parentGroup);
                    const mSubs = cfg.filters.selectedSubgroups.length === 0 || cfg.filters.selectedSubgroups.includes(subgroup);
                    const mMans = cfg.filters.selectedManufacturers.length === 0 || cfg.filters.selectedManufacturers.includes(manufacturer);
                    const mProds = cfg.filters.productCodes.length === 0 || cfg.filters.productCodes.some(c => productCode.includes(c));
                    
                    let mPrice = true;
                    if (cfg.filters.priceCondition) {
                        const priceToUse = Number(getRowValue(row, cfg.filters.priceType === 'original' ? COL.ORIGINAL_PRICE : COL.PRICE)) || 0;
                        const v1 = cfg.filters.priceValue1 || 0;
                        const v2 = cfg.filters.priceValue2 || 0;
                        if (cfg.filters.priceCondition === 'greater') mPrice = priceToUse > v1;
                        else if (cfg.filters.priceCondition === 'less') mPrice = priceToUse < v1;
                        else if (cfg.filters.priceCondition === 'equal') mPrice = priceToUse === v1;
                        else if (cfg.filters.priceCondition === 'between') mPrice = priceToUse >= v1 && priceToUse <= v2;
                    }
                    
                    return mInds && mSubs && mMans && mProds && mPrice;
                });
                
                const salesByEmpDate: Record<string, Record<string, {rev:number, revQD:number, qty:number}>> = {};
                const gfLen = groupFilteredData.length;
                for (let i = 0; i < gfLen; i++) {
                    const row = groupFilteredData[i];
                    const date = row.parsedDate;
                    if (!date || date < startDate || date > endDate) continue;

                    const emp = getRowValue(row, COL.NGUOI_TAO);
                    if (!emp) continue;
                    const dateKey = toLocalISOString(date);

                    if (!salesByEmpDate[emp]) salesByEmpDate[emp] = {};
                    let eDate = salesByEmpDate[emp][dateKey];
                    if (!eDate) {
                        eDate = { rev: 0, revQD: 0, qty: 0 };
                        salesByEmpDate[emp][dateKey] = eDate;
                    }
                    
                    const price = Number(getRowValue(row, COL.PRICE)) || 0;
                    const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
                    const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
                    const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                    const productName = getRowValue(row, COL.PRODUCT);
                    
                    const productCodeVal = String(getRowValue(row, COL.PRODUCT_CODE) || '').trim();
                    const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCodeVal);
                    const isVieon = productConfig.childToSubgroupMap[maNhomHang] === 'Vieon' || productConfig.childToParentMap[maNhomHang] === 'Vieon' || String(productName || '').includes('VieON');
                    const wQty = isVieon ? quantity * heso : quantity;
                    
                    eDate.rev += price;
                    eDate.revQD += price * heso;
                    eDate.qty += wQty;
                }
                
                const empLen = employeeData.length;
                resultRows = new Array(empLen);
                for (let i = 0; i < empLen; i++) {
                    const emp = employeeData[i];
                    const eSales = salesByEmpDate[emp.name] || {};
                    const dailyValues: { [dateKey: string]: number } = {};
                    let total = 0;
                    let daysWithSales = 0;
                    let tRev = 0;
                    let tRevQD = 0;
                    
                    for (let j = 0, dhLen = dateHeaders.length; j < dhLen; j++) {
                        const d = dateHeaders[j];
                        const dk = toLocalISOString(d);
                        const m = eSales[dk] || {rev:0, revQD:0, qty:0};
                        tRev += m.rev;
                        tRevQD += m.revQD;
                        
                        let val = 0;
                        if (cfg.metricType === 'quantity') val = m.qty;
                        else if (cfg.metricType === 'revenue') val = m.rev;
                        else if (cfg.metricType === 'revenueQD') val = m.revQD;
                        else if (cfg.metricType === 'hieuQuaQD') val = m.rev > 0 ? ((m.revQD / m.rev) - 1) * 100 : 0;
                        
                        dailyValues[dk] = val;
                        if (val > 0) daysWithSales++;
                        if (cfg.metricType !== 'hieuQuaQD') total += val;
                    }
                    
                    if (cfg.metricType === 'hieuQuaQD') {
                        total = tRev > 0 ? ((tRevQD / tRev) - 1) * 100 : 0;
                    } else if (cfg.totalCalculationMethod === 'average') {
                        total /= 7;
                    }
                    
                    let rowSum = 0;
                    let nonZeroCount = 0;
                    for (let j = 0, dhLen = dateHeaders.length; j < dhLen; j++) {
                        const dk = toLocalISOString(dateHeaders[j]);
                        const val = dailyValues[dk] || 0;
                        rowSum += val;
                        if (val > 0) nonZeroCount++;
                    }
                    const rowAvg = rowSum / (nonZeroCount || 1);
                    
                    resultRows[i] = {
                        name: emp.name,
                        department: employeeDepartments.get(emp.name) || 'Không Phân Ca',
                        dailyValues,
                        total,
                        daysWithNoSales: 7 - daysWithSales,
                        rowAverage: rowAvg
                    };
                }
            }
            
            computedCache.set(cfg.id, resultRows);
            return resultRows;
        };
        
        let tableRows = evaluateConfig(config);

        // Calculate bottom 30%
        const rowsByDept: { [key: string]: typeof tableRows } = {};
        for (let i = 0, len = tableRows.length; i < len; i++) {
            const row = tableRows[i];
            if (!rowsByDept[row.department]) rowsByDept[row.department] = [];
            rowsByDept[row.department].push(row);
        }

        const bottom30PercentNames = new Set<string>();
        const deptKeys = Object.keys(rowsByDept);
        for (let i = 0, kLen = deptKeys.length; i < kLen; i++) {
            const deptRows = rowsByDept[deptKeys[i]];
            if (deptRows.length > 3) {
                const sorted = [...deptRows].sort((a,b) => a.total - b.total);
                const tIndex = Math.floor(deptRows.length * 0.3);
                const tVal = sorted[tIndex].total;
                for (let j = 0, drLen = sorted.length; j < drLen; j++) {
                    const r = sorted[j];
                    if (r.total <= tVal && r.total > 0) {
                        bottom30PercentNames.add(r.name);
                    }
                }
            }
        }

        for (let i = 0, len = tableRows.length; i < len; i++) {
            tableRows[i].isBottom30 = bottom30PercentNames.has(tableRows[i].name);
        }

        const top30PercentNoSalesNames = new Set<string>();
        const rowsWithAct: any[] = [];
        for (let i = 0, len = tableRows.length; i < len; i++) {
            if (tableRows[i].daysWithNoSales < 7) {
                rowsWithAct.push(tableRows[i]);
            }
        }
        if (rowsWithAct.length > 3) {
            const sorted = [...rowsWithAct].sort((a,b)=>b.daysWithNoSales - a.daysWithNoSales);
            const tIndex = Math.floor(sorted.length * 0.3);
            if (tIndex < sorted.length) {
                const tVal = sorted[tIndex].daysWithNoSales;
                for (let j = 0, sLen = sorted.length; j < sLen; j++) {
                    const r = sorted[j];
                    if (r.daysWithNoSales >= tVal && r.daysWithNoSales > 0) {
                        top30PercentNoSalesNames.add(r.name);
                    }
                }
            }
        }

        const deptAvgByDate = new Map<string, Map<string, number>>();
        const deptAvgTotal = new Map<string, number>();
        const deptTotalStats = new Map<string, {sum:number, count:number}>();
        
        const deptTop3ByDate = new Map<string, Map<string, number[]>>();
        const deptTop3Total = new Map<string, number[]>();

        for (let d = 0, dhLen = dateHeaders.length; d < dhLen; d++) {
            const date = dateHeaders[d];
            const dateKey = toLocalISOString(date);
            const dStats = new Map<string, {sum:number, count:number}>();
            const dValues = new Map<string, Set<number>>();
            
            for (let i = 0, rLen = tableRows.length; i < rLen; i++) {
                const r = tableRows[i];
                const val = r.dailyValues[dateKey] || 0;
                if (!dStats.has(r.department)) dStats.set(r.department, {sum:0, count:0});
                if (!dValues.has(r.department)) dValues.set(r.department, new Set());
                
                if (val > 0) {
                    const stats = dStats.get(r.department)!;
                    stats.sum += val;
                    stats.count++;
                    dValues.get(r.department)!.add(val);
                }
                
                // Track total column stats only once per row
                if (d === 0) {
                    if (!deptTotalStats.has(r.department)) deptTotalStats.set(r.department, {sum:0, count:0});
                    if (r.total > 0) {
                        const stats = deptTotalStats.get(r.department)!;
                        stats.sum += r.total;
                        stats.count++;
                    }
                }
            }
            const avgMap = new Map<string, number>();
            const top3Map = new Map<string, number[]>();
            
            dStats.forEach((s, dName) => avgMap.set(dName, s.count > 0 ? s.sum / s.count : 0));
            dValues.forEach((set, dName) => {
                top3Map.set(dName, Array.from(set).sort((a,b)=>b-a).slice(0, 3));
            });
            
            deptAvgByDate.set(dateKey, avgMap);
            deptTop3ByDate.set(dateKey, top3Map);
        }

        deptTotalStats.forEach((s, dName) => deptAvgTotal.set(dName, s.count > 0 ? s.sum / s.count : 0));
        
        // Calculate Top 3 Total for each dept
        const dTotalValues = new Map<string, Set<number>>();
        for (let i = 0, len = tableRows.length; i < len; i++) {
            const r = tableRows[i];
            if (!dTotalValues.has(r.department)) dTotalValues.set(r.department, new Set());
            if (r.total > 0) dTotalValues.get(r.department)!.add(r.total);
        }
        dTotalValues.forEach((set, dName) => {
            deptTop3Total.set(dName, Array.from(set).sort((a,b)=>b-a).slice(0, 3));
        });

        tableRows.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (typeof valA === 'number' && typeof valB === 'number') {
                if (valA !== valB) return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            return b.total - a.total;
        });

        const groupedRows: Record<string, typeof tableRows> = {};
        for (let i = 0, len = tableRows.length; i < len; i++) {
            const r = tableRows[i];
            if (!groupedRows[r.department]) groupedRows[r.department] = [];
            groupedRows[r.department].push(r);
        }

        const sortedDepartments = Object.keys(groupedRows).sort((a,b)=>a.localeCompare(b));

        const departmentTotals = new Map<string, any>();
        for (let i = 0, sdLen = sortedDepartments.length; i < sdLen; i++) {
            const dept = sortedDepartments[i];
            const rdept = groupedRows[dept];
            const dt = { daily: new Map<string, number>(), total: 0, daysWithNoSales: 0 };
            const rdeptLen = rdept.length;
            if (rdeptLen > 0) {
                for (let j = 0, dhLen = dateHeaders.length; j < dhLen; j++) {
                    const d = dateHeaders[j];
                    const dk = toLocalISOString(d);
                    let sum = 0;
                    for (let k = 0; k < rdeptLen; k++) {
                        sum += rdept[k].dailyValues[dk] || 0;
                    }
                    dt.daily.set(dk, config.metricType === 'hieuQuaQD' || config.type === 'calculated' ? sum / rdeptLen : sum);
                }
                
                let sumTotal = 0;
                let sumNoSales = 0;
                for (let k = 0; k < rdeptLen; k++) {
                    sumTotal += rdept[k].total;
                    sumNoSales += rdept[k].daysWithNoSales;
                }
                dt.total = sumTotal;
                if (config.metricType === 'hieuQuaQD' || config.type === 'calculated' || config.totalCalculationMethod === 'average') dt.total /= rdeptLen;
                dt.daysWithNoSales = sumNoSales / rdeptLen;
            }
            departmentTotals.set(dept, dt);
        }

        const totals = { daily: new Map<string, number>(), total: 0, daysWithNoSales: 0 };
        const trLen = tableRows.length;
        if (trLen > 0) {
            for (let i = 0; i < trLen; i++) {
                const r = tableRows[i];
                for (let j = 0, dhLen = dateHeaders.length; j < dhLen; j++) {
                    const dk = toLocalISOString(dateHeaders[j]);
                    totals.daily.set(dk, (totals.daily.get(dk) || 0) + (r.dailyValues[dk] || 0));
                }
                totals.total += r.total;
                totals.daysWithNoSales += r.daysWithNoSales;
            }
            for (let j = 0, dhLen = dateHeaders.length; j < dhLen; j++) {
                const dk = toLocalISOString(dateHeaders[j]);
                if (config.metricType === 'hieuQuaQD' || config.type === 'calculated') {
                    totals.daily.set(dk, totals.daily.get(dk)! / trLen);
                }
            }
            if (config.metricType === 'hieuQuaQD' || config.type === 'calculated' || config.totalCalculationMethod === 'average') totals.total /= trLen;
            totals.daysWithNoSales /= trLen;
        }

        return {
            processedData: { tableRows, dateHeaders, dateRangeString, totals, top30PercentNoSalesNames, groupedRows, sortedDepartments },
            conditionalFormatData: { deptAvgByDate, deptAvgTotal, deptTop3ByDate, deptTop3Total },
            departmentTotals
        };
    }, [config, allConfigs, baseFilteredData, productConfig, employeeData, includeToday, sortConfig]);
};
