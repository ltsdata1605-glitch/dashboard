
import type { DataRow, ProductConfig, FilterState, ProcessedData, EmployeeData, IndustryData } from '../types';
import { COL, HINH_THUC_XUAT_THU_HO, HINH_THUC_XUAT_TIEN_MAT, HINH_THUC_XUAT_TRA_GOP } from '../constants';
import { getRowValue } from '../utils/dataUtils';
import { DepartmentMap } from './dataService';
import { processKpis } from './kpiService';
import { processTrendData } from './trendService';
import { processEmployeeData } from './employeeService';
import { processSummaryTable, calculateWarehouseSummary } from './summaryService';
import { processIndustryData } from './industryService';

/** WeakMap cache for deduplication — keyed by allData array reference, auto-GC'd when data changes */
const _dedupCache = new WeakMap<DataRow[], DataRow[]>();

// Cache variables for warehouse global data and warehouse summary to prevent recalculations on filter changes
let _lastAllData: DataRow[] | null = null;
let _lastProductConfig: ProductConfig | null = null;
let _lastXuat: string = '';
let _lastStartDate: string = '';
let _lastEndDate: string = '';
let _lastSelectedMonthsStr: string = '';
let _lastWarehouseSummary: any[] | null = null;
let _lastWarehouseGlobalData: DataRow[] | null = null;

/**
 * PREDICATES (Centralized Filtering Logic)
 */

export const isXuatMatch = (row: DataRow, xuatFilter: string) => {
    if (xuatFilter === 'all') return true;
    const xuatValue = getRowValue(row, COL.XUAT);
    if (!xuatValue) return xuatFilter === 'Chưa';
    const isDa = xuatValue.indexOf('Đã') !== -1 || xuatValue.indexOf('đã') !== -1 || xuatValue.indexOf('ĐÃ') !== -1;
    return (isDa ? 'Đã' : 'Chưa') === xuatFilter;
};

let _lastDeptMap: DepartmentMap | null = null;
const creatorDeptCache = new Map<string, string>();

export const getCreatorDepartment = (creator: string, departmentMap: DepartmentMap | null): string => {
    if (departmentMap !== _lastDeptMap) {
        creatorDeptCache.clear();
        _lastDeptMap = departmentMap;
    }
    let dept = creatorDeptCache.get(creator);
    if (dept !== undefined) return dept;

    const dashIdx = creator.indexOf(' - ');
    const creatorId = dashIdx !== -1 ? creator.substring(0, dashIdx).trim() : creator.trim();

    const rawDept = departmentMap ? departmentMap[creatorId] : null;
    dept = "Chưa xác định";
    if (rawDept) {
        const sepIdx = rawDept.indexOf(';;');
        dept = sepIdx !== -1 ? rawDept.substring(0, sepIdx) : rawDept;
    }
    creatorDeptCache.set(creator, dept);
    return dept;
};

export const isTrangThaiMatch = (row: DataRow, trangThaiFilter: string[] | Set<string> | null) => {
    if (!trangThaiFilter) return true;
    if (trangThaiFilter instanceof Set) {
        return trangThaiFilter.has(getRowValue(row, COL.TRANG_THAI));
    }
    if (trangThaiFilter.length === 0) return true;
    return trangThaiFilter.includes(getRowValue(row, COL.TRANG_THAI));
};

export const isNguoiTaoMatch = (row: DataRow, nguoiTaoFilter: string[] | Set<string> | null) => {
    if (!nguoiTaoFilter) return true;
    if (nguoiTaoFilter instanceof Set) {
        return nguoiTaoFilter.has(getRowValue(row, COL.NGUOI_TAO));
    }
    if (nguoiTaoFilter.length === 0) return true;
    return nguoiTaoFilter.includes(getRowValue(row, COL.NGUOI_TAO));
};

export const isKhoMatch = (row: DataRow, khoFilter: string[] | Set<string> | null) => {
    if (!khoFilter) return true;
    if (khoFilter instanceof Set) {
        return khoFilter.has(getRowValue(row, COL.KHO).toString());
    }
    if (khoFilter.length === 0 || khoFilter.includes('all')) return true;
    return khoFilter.includes(getRowValue(row, COL.KHO).toString());
};

export const isDepartmentMatch = (row: DataRow, departmentFilter: string[] | Set<string> | null, departmentMap: DepartmentMap | null) => {
    if (!departmentFilter) return true;
    const isSet = departmentFilter instanceof Set;
    if (!isSet && (!departmentFilter || (departmentFilter as string[]).length === 0)) return true;

    const creator = getRowValue(row, COL.NGUOI_TAO);
    if (!creator) return false;

    const department = getCreatorDepartment(creator, departmentMap);
    return isSet ? (departmentFilter as Set<string>).has(department) : (departmentFilter as string[]).includes(department);
};

export const isDateMatch = (row: DataRow, startDate: Date | null, endDate: Date | null, selectedMonths?: string[]) => {
    const rowDate = row.parsedDate;
    if (!rowDate || isNaN(rowDate.getTime())) return false;

    if (selectedMonths && selectedMonths.length > 0) {
        const monthNum = rowDate.getMonth() + 1;
        const yearNum = rowDate.getFullYear();
        const mStr = `Tháng ${String(monthNum).padStart(2, '0')}/${yearNum}`;
        return selectedMonths.includes(mStr);
    }

    return (!startDate || rowDate >= startDate) && (!endDate || rowDate <= endDate);
};

/**
 * Processes a filtered subset of data for a specific period to generate all dashboard metrics.
 */
function processDataForPeriod(
    periodData: DataRow[],
    productConfig: ProductConfig,
    filters: FilterState,
    departmentMap: DepartmentMap | null
): Omit<ProcessedData, 'lastUpdated' | 'reportSubTitle' | 'warehouseSummary'> {

    const isRevenueEligible = (row: DataRow) => {
        const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
        return HINH_THUC_XUAT_TIEN_MAT.has(hinhThucXuat) || HINH_THUC_XUAT_TRA_GOP.has(hinhThucXuat);
    };

    const filteredValidSalesData = periodData.filter(row => {
        const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
        return !HINH_THUC_XUAT_THU_HO.has(hinhThucXuat);
    });

    const unshippedOrders = periodData.filter(row => {
        return getRowValue(row, COL.XUAT) === 'Chưa xuất' && isRevenueEligible(row);
    });

    const kpis = processKpis(filteredValidSalesData, unshippedOrders, periodData, productConfig, filters);
    const trendData = processTrendData(filteredValidSalesData, productConfig);
    const employeeData = processEmployeeData(filteredValidSalesData, periodData, productConfig, departmentMap, filters);
    const industryData = processIndustryData(filteredValidSalesData, productConfig, filters);
    const summaryTable = processSummaryTable(filteredValidSalesData, productConfig, filters);

    return {
        kpis,
        trendData,
        industryData,
        employeeData,
        summaryTable,
        unshippedOrders,
        filteredValidSalesData,
    };
}

/**
 * Applies all filters to the dataset and orchestrates the processing of different data slices.
 */
export function applyFiltersAndProcess(
    allData: DataRow[],
    productConfig: ProductConfig,
    filters: FilterState,
    departmentMap: DepartmentMap | null,
    enableDeduplication: boolean = true
): { processedData: ProcessedData, baseFilteredData: DataRow[], warehouseFilteredData: DataRow[], calendarSourceData: DataRow[] } {

    // Runtime deduplication — cached per allData reference to avoid recalculating on filter changes
    let sourceData = allData;
    if (enableDeduplication) {
        const cached = _dedupCache.get(allData);
        if (cached) {
            sourceData = cached;
        } else {
            const deduplicated: DataRow[] = [];
            
            // 1. Order-item-level deduplication:
            // Group by Order ID (COL.ID) and Product Code/Name, keeping only the one from the newest file
            const orderGroups = new Map<string, DataRow[]>();
            for (let i = 0; i < allData.length; i++) {
                const row = allData[i];
                const orderId = String(getRowValue(row, COL.ID) || '').trim();
                const prodCode = String(getRowValue(row, COL.PRODUCT_CODE) || getRowValue(row, COL.PRODUCT) || '').trim();
                
                if (!orderId || !prodCode) {
                    deduplicated.push(row);
                    continue;
                }
                
                const itemKey = `${orderId}§${prodCode}`;
                if (!orderGroups.has(itemKey)) {
                    orderGroups.set(itemKey, []);
                }
                orderGroups.get(itemKey)!.push(row);
            }
            
            for (const [_, rowsList] of orderGroups.entries()) {
                if (rowsList.length === 1) {
                    deduplicated.push(rowsList[0]);
                } else {
                    // Sort descending: largest _fileLastModified first, then largest _fileSavedAt first
                    rowsList.sort((a, b) => {
                        const timeA = a._fileLastModified || 0;
                        const timeB = b._fileLastModified || 0;
                        if (timeB !== timeA) return timeB - timeA;
                        
                        const savedA = a._fileSavedAt || 0;
                        const savedB = b._fileSavedAt || 0;
                        return savedB - savedA;
                    });
                    deduplicated.push(rowsList[0]);
                }
            }
            
            // 2. Strict exact row signature deduplication (checks for identical rows)
            const finalDeduplicated: DataRow[] = [];
            const uniqueSet = new Set<string>();
            const sampleRow = deduplicated[0];
            
            // Limit keys to only essential identifying fields to avoid string concatenation overhead
            // of 30+ columns for every single row.
            const essentialFields = [COL.ID, COL.DATE_CREATED, COL.PRICE, COL.QUANTITY, COL.NGUOI_TAO, COL.KHO, COL.PRODUCT_CODE];
            const keysToCheck: string[] = [];
            if (sampleRow) {
                for (const fieldArr of essentialFields) {
                    for (const key of fieldArr) {
                        if (sampleRow[key] !== undefined) {
                            keysToCheck.push(key);
                            break;
                        }
                    }
                }
                // Fallback to checking basic keys if none found
                if (keysToCheck.length === 0) {
                    keysToCheck.push(...Object.keys(sampleRow).filter(k => k !== 'STT_1' && k !== 'parsedDate' && !k.startsWith('_')));
                }
            }

            for (let i = 0; i < deduplicated.length; i++) {
                const row = deduplicated[i];
                let sig = '';
                for (let j = 0; j < keysToCheck.length; j++) {
                    sig += row[keysToCheck[j]] + '§';
                }
                if (!uniqueSet.has(sig)) {
                    uniqueSet.add(sig);
                    finalDeduplicated.push(row);
                }
            }
            sourceData = finalDeduplicated;
            _dedupCache.set(allData, finalDeduplicated);
        }
    }

    const mainStartDate = filters.startDate ? new Date(filters.startDate) : null;
    if (mainStartDate) mainStartDate.setHours(0, 0, 0, 0);
    const mainEndDate = filters.endDate ? new Date(filters.endDate) : null;
    if (mainEndDate) mainEndDate.setHours(23, 59, 59, 999);

    const trangThaiFilterSet = (filters.trangThai && filters.trangThai.length > 0) ? new Set(filters.trangThai) : null;
    const nguoiTaoFilterSet = (filters.nguoiTao && filters.nguoiTao.length > 0) ? new Set(filters.nguoiTao) : null;
    const khoFilterSet = (filters.kho && filters.kho.length > 0 && !filters.kho.includes('all')) ? new Set(filters.kho) : null;
    const departmentFilterSet = (filters.department && filters.department.length > 0) ? new Set(filters.department) : null;

    // Check cache validity for warehouse summary
    const selectedMonthsStr = JSON.stringify(filters.selectedMonths || []);
    const isWarehouseCacheValid = 
        sourceData === _lastAllData &&
        productConfig === _lastProductConfig &&
        filters.xuat === _lastXuat &&
        String(filters.startDate) === _lastStartDate &&
        String(filters.endDate) === _lastEndDate &&
        selectedMonthsStr === _lastSelectedMonthsStr &&
        _lastWarehouseGlobalData !== null &&
        _lastWarehouseSummary !== null;

    const calendarSourceData: DataRow[] = [];
    const baseFilteredData: DataRow[] = [];
    const mainPeriodData: DataRow[] = [];
    const warehouseGlobalData: DataRow[] = isWarehouseCacheValid ? _lastWarehouseGlobalData! : [];

    for (let i = 0, len = sourceData.length; i < len; i++) {
        const row = sourceData[i];

        if (!isXuatMatch(row, filters.xuat)) continue;

        const mDate = isDateMatch(row, mainStartDate, mainEndDate, filters.selectedMonths);

        if (!isWarehouseCacheValid && mDate) {
            warehouseGlobalData.push(row);
        }

        if (!isTrangThaiMatch(row, trangThaiFilterSet)) continue;
        if (!isNguoiTaoMatch(row, nguoiTaoFilterSet)) continue;
        if (!isDepartmentMatch(row, departmentFilterSet, departmentMap)) continue;

        calendarSourceData.push(row);

        if (!isKhoMatch(row, khoFilterSet)) continue;

        baseFilteredData.push(row);

        if (mDate) {
            mainPeriodData.push(row);
        }
    }

    let warehouseSummary;
    if (isWarehouseCacheValid) {
        warehouseSummary = _lastWarehouseSummary!;
    } else {
        warehouseSummary = calculateWarehouseSummary(warehouseGlobalData, productConfig) || [];
        _lastAllData = sourceData;
        _lastProductConfig = productConfig;
        _lastXuat = filters.xuat;
        _lastStartDate = String(filters.startDate);
        _lastEndDate = String(filters.endDate);
        _lastSelectedMonthsStr = selectedMonthsStr;
        _lastWarehouseGlobalData = warehouseGlobalData;
        _lastWarehouseSummary = warehouseSummary;
    }

    const mainResult = processDataForPeriod(mainPeriodData, productConfig, filters, departmentMap);

    const filterParts = [];
    if (filters.kho && filters.kho.length > 0 && !filters.kho.includes('all')) {
        const khoArr = Array.isArray(filters.kho) ? filters.kho : [filters.kho];
        filterParts.push(`Kho: ${khoArr.join(', ')}`);
    }
    if (filters.xuat !== 'all') filterParts.push(`Xuất: ${filters.xuat}`);

    const processedData: ProcessedData = {
        ...mainResult,
        warehouseSummary,
        lastUpdated: new Date().toLocaleString('vi-VN'),
        reportSubTitle: filterParts.length > 0 ? `Lọc theo: ${filterParts.join(' | ')}` : "Lọc theo kho: Tất cả"
    };

    return { processedData, baseFilteredData, warehouseFilteredData: warehouseGlobalData, calendarSourceData };
}
