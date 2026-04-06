
import type { DataRow, ProductConfig, FilterState, ProcessedData, EmployeeData, IndustryData } from '../types';
import { COL, HINH_THUC_XUAT_THU_HO, HINH_THUC_XUAT_TIEN_MAT, HINH_THUC_XUAT_TRA_GOP } from '../constants';
import { getRowValue } from '../utils/dataUtils';
import { DepartmentMap } from './dataService';
import { processKpis } from './kpiService';
import { processTrendData } from './trendService';
import { processEmployeeData } from './employeeService';
import { processSummaryTable, calculateWarehouseSummary } from './summaryService';
import { processIndustryData } from './industryService';

/**
 * PREDICATES (Centralized Filtering Logic)
 */

export const isXuatMatch = (row: DataRow, xuatFilter: string) => {
    if (xuatFilter === 'all') return true;
    const xuatValue = getRowValue(row, COL.XUAT) || '';
    const xuatStatus = xuatValue.toLowerCase().includes('đã') ? 'Đã' : 'Chưa';
    return xuatStatus === xuatFilter;
};

export const isTrangThaiMatch = (row: DataRow, trangThaiFilter: string[]) => {
    if (!trangThaiFilter || trangThaiFilter.length === 0) return true;
    return trangThaiFilter.includes(getRowValue(row, COL.TRANG_THAI));
};

export const isNguoiTaoMatch = (row: DataRow, nguoiTaoFilter: string[]) => {
    if (!nguoiTaoFilter || nguoiTaoFilter.length === 0) return true;
    return nguoiTaoFilter.includes(getRowValue(row, COL.NGUOI_TAO));
};

export const isKhoMatch = (row: DataRow, khoFilter: string[]) => {
    if (!khoFilter || khoFilter.length === 0 || khoFilter.includes('all')) return true;
    return khoFilter.includes(getRowValue(row, COL.KHO).toString());
};

export const isDepartmentMatch = (row: DataRow, departmentFilter: string[], departmentMap: DepartmentMap | null) => {
    if (!departmentMap || !departmentFilter || departmentFilter.length === 0) return true;
    
    const creator = getRowValue(row, COL.NGUOI_TAO);
    if (!creator) return false;
    
    const creatorId = creator.split(' - ')[0].trim();
    const rawDept = departmentMap[creatorId];
    const department = rawDept ? rawDept.split(';;')[0] : "Chưa xác định";
    
    return !!department && departmentFilter.includes(department);
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

    const kpis = processKpis(filteredValidSalesData, unshippedOrders, periodData, productConfig);
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
    departmentMap: DepartmentMap | null
): { processedData: ProcessedData, baseFilteredData: DataRow[], warehouseFilteredData: DataRow[], calendarSourceData: DataRow[] } {
    const mainStartDate = filters.startDate ? new Date(filters.startDate) : null;
    if (mainStartDate) mainStartDate.setHours(0, 0, 0, 0);
    const mainEndDate = filters.endDate ? new Date(filters.endDate) : null;
    if (mainEndDate) mainEndDate.setHours(23, 59, 59, 999);
    
    // Base data for Calendar (respects all non-kho and non-date filters)
    const calendarSourceData = allData.filter(row => {
        return isXuatMatch(row, filters.xuat) &&
               isTrangThaiMatch(row, filters.trangThai) &&
               isNguoiTaoMatch(row, filters.nguoiTao) &&
               isDepartmentMatch(row, filters.department, departmentMap);
    });

    // Base data for the main dashboard (respects all filters including kho)
    const baseFilteredData = calendarSourceData.filter(row => isKhoMatch(row, filters.kho));

    const mainPeriodData = baseFilteredData.filter(row => isDateMatch(row, mainStartDate, mainEndDate, filters.selectedMonths));
    
    const warehousePeriodData = calendarSourceData.filter(row => isDateMatch(row, mainStartDate, mainEndDate, filters.selectedMonths));
    const warehouseSummary = calculateWarehouseSummary(warehousePeriodData, productConfig) || [];
    
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
        reportSubTitle: filterParts.length > 0 ? `Lọc theo: ${filterParts.join(' | ')}` : "Dữ liệu được cập nhật dựa trên các bộ lọc đã chọn."
    };

    return { processedData, baseFilteredData, warehouseFilteredData: warehousePeriodData, calendarSourceData };
}
