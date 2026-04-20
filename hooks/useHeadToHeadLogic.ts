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
        
        const isValidSale = (row: DataRow): boolean => {
            const getStr = (col: string) => String(getRowValue(row, col) || '').trim();
            const huy = getStr(COL.TRANG_THAI_HUY);
            if (huy !== 'Chưa hủy' && huy.toLowerCase() !== 'chưa hủy') return false;
            
            const tra = getStr(COL.TINH_TRANG_NHAP_TRA);
            if (tra !== 'Chưa trả' && tra.toLowerCase() !== 'chưa trả') return false;
            
            const thu = getStr(COL.TRANG_THAI_THU_TIEN);
            if (thu !== 'Đã thu' && thu.toLowerCase() !== 'đã thu') return false;
            
            return true;
        };

        const dataForTab = baseFilteredData.filter(row => !HINH_THUC_XUAT_THU_HO.has(getRowValue(row, COL.HINH_THUC_XUAT)) && isValidSale(row));
        
        const computedCache = new Map<string, any[]>();
        
        const evaluateConfig = (cfg: HeadToHeadTableConfig): any[] => {
            if (computedCache.has(cfg.id)) return computedCache.get(cfg.id)!;
            
            let resultRows: any[] = [];
            
            if (cfg.type === 'target') {
                const targetVal = cfg.targetValue || 0;
                resultRows = employeeData.map(emp => {
                    const dailyValues: { [dateKey: string]: number } = {};
                    dateHeaders.forEach(d => dailyValues[toLocalISOString(d)] = targetVal);
                    return {
                        name: emp.name,
                        department: employeeDepartments.get(emp.name) || 'Không Phân Ca',
                        dailyValues,
                        total: cfg.totalCalculationMethod === 'average' ? targetVal : targetVal * 7,
                        daysWithNoSales: 0,
                        rowAverage: targetVal
                    };
                });
            } else if (cfg.type === 'calculated') {
                const t1 = allConfigs?.find(c => c.id === cfg.operand1_tableId);
                const t2 = allConfigs?.find(c => c.id === cfg.operand2_tableId);
                
                const r1 = t1 ? evaluateConfig(t1) : null;
                const r2 = t2 ? evaluateConfig(t2) : null;
                
                resultRows = employeeData.map(emp => {
                    const dailyValues: { [dateKey: string]: number } = {};
                    const row1 = r1?.find(r => r.name === emp.name);
                    const row2 = r2?.find(r => r.name === emp.name);
                    let total = 0;
                    let daysWithSales = 0;
                    
                    dateHeaders.forEach(date => {
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
                    });
                    
                    if (cfg.totalCalculationMethod === 'average') total /= 7;
                    const rowValues = Object.values(dailyValues);
                    const rowAverage = rowValues.reduce((a, b) => a + b, 0) / (rowValues.filter(v => v > 0).length || 1);
                    
                    return {
                        name: emp.name,
                        department: employeeDepartments.get(emp.name) || 'Không Phân Ca',
                        dailyValues,
                        total,
                        daysWithNoSales: 7 - daysWithSales,
                        rowAverage
                    };
                });
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
                
                groupFilteredData.forEach(row => {
                    const date = row.parsedDate;
                    if (!date || date < startDate || date > endDate) return;

                    const emp = getRowValue(row, COL.NGUOI_TAO);
                    if (!emp) return;
                    const dateKey = toLocalISOString(date);

                    if (!salesByEmpDate[emp]) salesByEmpDate[emp] = {};
                    if (!salesByEmpDate[emp][dateKey]) salesByEmpDate[emp][dateKey] = { rev: 0, revQD: 0, qty: 0 };
                    
                    const price = Number(getRowValue(row, COL.PRICE)) || 0;
                    const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
                    const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
                    const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                    const productName = getRowValue(row, COL.PRODUCT);
                    
                    const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName);
                    const isVieon = productConfig.childToSubgroupMap[maNhomHang] === 'Vieon' || productConfig.childToParentMap[maNhomHang] === 'Vieon' || String(productName || '').includes('VieON');
                    const wQty = isVieon ? quantity * heso : quantity;
                    
                    salesByEmpDate[emp][dateKey].rev += price;
                    salesByEmpDate[emp][dateKey].revQD += price * heso;
                    salesByEmpDate[emp][dateKey].qty += wQty;
                });
                
                resultRows = employeeData.map(emp => {
                    const eSales = salesByEmpDate[emp.name] || {};
                    const dailyValues: { [dateKey: string]: number } = {};
                    let total = 0;
                    let daysWithSales = 0;
                    let tRev = 0;
                    let tRevQD = 0;
                    
                    dateHeaders.forEach(d => {
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
                    });
                    
                    if (cfg.metricType === 'hieuQuaQD') {
                        total = tRev > 0 ? ((tRevQD / tRev) - 1) * 100 : 0;
                    } else if (cfg.totalCalculationMethod === 'average') {
                        total /= 7;
                    }
                    
                    const rowVals = Object.values(dailyValues);
                    const rowAvg = rowVals.reduce((a,b)=>a+b, 0) / (rowVals.filter(v=>v>0).length||1);
                    
                    return {
                        name: emp.name,
                        department: employeeDepartments.get(emp.name) || 'Không Phân Ca',
                        dailyValues,
                        total,
                        daysWithNoSales: 7 - daysWithSales,
                        rowAverage: rowAvg
                    };
                });
            }
            
            computedCache.set(cfg.id, resultRows);
            return resultRows;
        };
        
        let tableRows = evaluateConfig(config);

        // Calculate bottom 30%
        const rowsByDept: { [key: string]: typeof tableRows } = {};
        tableRows.forEach(row => {
            if (!rowsByDept[row.department]) rowsByDept[row.department] = [];
            rowsByDept[row.department].push(row);
        });

        const bottom30PercentNames = new Set<string>();
        Object.values(rowsByDept).forEach(deptRows => {
            if (deptRows.length > 3) {
                const sorted = [...deptRows].sort((a,b) => a.total - b.total);
                const tIndex = Math.floor(deptRows.length * 0.3);
                const tVal = sorted[tIndex].total;
                sorted.forEach(r => { if(r.total <= tVal && r.total > 0) bottom30PercentNames.add(r.name); });
            }
        });

        tableRows.forEach(r => r.isBottom30 = bottom30PercentNames.has(r.name));

        const top30PercentNoSalesNames = new Set<string>();
        const rowsWithAct = tableRows.filter(r => r.daysWithNoSales < 7);
        if (rowsWithAct.length > 3) {
            const sorted = [...rowsWithAct].sort((a,b)=>b.daysWithNoSales - a.daysWithNoSales);
            const tIndex = Math.floor(sorted.length * 0.3);
            if (tIndex < sorted.length) {
                const tVal = sorted[tIndex].daysWithNoSales;
                sorted.forEach(r => { if(r.daysWithNoSales >= tVal && r.daysWithNoSales > 0) top30PercentNoSalesNames.add(r.name); });
            }
        }

        const deptAvgByDate = new Map<string, Map<string, number>>();
        dateHeaders.forEach(date => {
            const dateKey = toLocalISOString(date);
            const dStats = new Map<string, {sum:number, count:number}>();
            tableRows.forEach(r => {
                const val = r.dailyValues[dateKey] || 0;
                if (!dStats.has(r.department)) dStats.set(r.department, {sum:0, count:0});
                dStats.get(r.department)!.sum += val;
                dStats.get(r.department)!.count++;
            });
            const avgMap = new Map<string, number>();
            dStats.forEach((s, d) => avgMap.set(d, s.count > 0 ? s.sum / s.count : 0));
            deptAvgByDate.set(dateKey, avgMap);
        });

        tableRows.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (typeof valA === 'number' && typeof valB === 'number') {
                if (valA !== valB) return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            return b.total - a.total;
        });

        const groupedRows = tableRows.reduce((a, r) => {
            if (!a[r.department]) a[r.department] = [];
            a[r.department].push(r);
            return a;
        }, {} as Record<string, typeof tableRows>);

        const sortedDepartments = Object.keys(groupedRows).sort((a,b)=>a.localeCompare(b));

        const departmentTotals = new Map<string, any>();
        sortedDepartments.forEach(dept => {
            const rdept = groupedRows[dept];
            const dt = { daily: new Map<string, number>(), total: 0, daysWithNoSales: 0 };
            if (rdept.length > 0) {
                dateHeaders.forEach(d => {
                    const dk = toLocalISOString(d);
                    const sum = rdept.reduce((s, r)=>s + (r.dailyValues[dk]||0), 0);
                    // For HieuQuaQD we can't just sum, but doing full daily recalculation per dept is complex.
                    // For simplicity, we just average the values or sum them depending on calculation method. 
                    // To keep it 100% accurate we'd need to re-evaluate the config on group level, but average is acceptable
                    dt.daily.set(dk, config.metricType === 'hieuQuaQD' || config.type === 'calculated' ? sum / rdept.length : sum);
                });
                dt.total = rdept.reduce((s, r) => s + r.total, 0);
                if (config.metricType === 'hieuQuaQD' || config.type === 'calculated' || config.totalCalculationMethod === 'average') dt.total /= rdept.length;
                dt.daysWithNoSales = rdept.reduce((s, r)=>s+r.daysWithNoSales, 0)/rdept.length;
            }
            departmentTotals.set(dept, dt);
        });

        const totals = { daily: new Map<string, number>(), total: 0, daysWithNoSales: 0 };
        if (tableRows.length > 0) {
            tableRows.forEach(r => {
                dateHeaders.forEach(d => {
                    const dk = toLocalISOString(d);
                    totals.daily.set(dk, (totals.daily.get(dk)||0) + (r.dailyValues[dk]||0));
                });
                totals.total += r.total;
                totals.daysWithNoSales += r.daysWithNoSales;
            });
            dateHeaders.forEach(d => {
                const dk = toLocalISOString(d);
                if (config.metricType === 'hieuQuaQD' || config.type === 'calculated') {
                    totals.daily.set(dk, totals.daily.get(dk)! / tableRows.length);
                }
            });
            if (config.metricType === 'hieuQuaQD' || config.type === 'calculated' || config.totalCalculationMethod === 'average') totals.total /= tableRows.length;
            totals.daysWithNoSales /= tableRows.length;
        }

        return {
            processedData: { tableRows, dateHeaders, dateRangeString, totals, top30PercentNoSalesNames, groupedRows, sortedDepartments },
            conditionalFormatData: { deptAvgByDate },
            departmentTotals
        };
    }, [config, allConfigs, baseFilteredData, productConfig, employeeData, includeToday, sortConfig]);
};
