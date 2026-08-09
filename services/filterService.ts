import type { DataRow, ProductConfig, FilterState, ProcessedData, EmployeeData, IndustryData, WarehouseSummaryRow } from '../types';
import { COL, HINH_THUC_XUAT_TIEN_MAT, HINH_THUC_XUAT_TRA_GOP } from '../constants';
import { getRowValue, getParentGroup } from '../utils/dataUtils';
import { DepartmentMap } from './dataService';
import { processKpis } from './kpiService';
import { processTrendData } from './trendService';
import { processEmployeeData } from './employeeService';
import { processSummaryTable, calculateWarehouseSummary } from './summaryService';
import { processIndustryData } from './industryService';
import { cleanAndNormalize, calculateRowMetrics, parseNumber, isValidSalesRow } from '../utils/dataUtils';

// Cache variables for warehouse global data and warehouse summary to prevent recalculations on filter changes
let _lastAllData: DataRow[] | null = null;
let _lastProductConfig: ProductConfig | null = null;
let _lastXuat: string = '';
let _lastStartDate: string = '';
let _lastEndDate: string = '';
let _lastSelectedMonthsStr: string = '';
let _lastWarehouseSummary: WarehouseSummaryRow[] | null = null;
let _lastWarehouseGlobalData: DataRow[] | null = null;
let _lastTrangThaiStr: string = '';
let _lastNguoiTaoStr: string = '';
let _lastDepartmentStr: string = '';
let _lastKhoStr: string = '';

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


// Mục 65d: tách vòng lặp predicate (trước đây viết inline trong applyFiltersAndProcess) thành
// 1 hàm export riêng — để main thread (hooks/useDataManagement.ts) gọi lại ĐÚNG cùng 1 hàm này
// thay vì tự viết lại điều kiện lọc lần 2 (nguy cơ 2 bản lệch nhau theo thời gian). Hành vi giữ
// nguyên 100% so với vòng lặp cũ — chỉ đổi CHỖ đặt code, không đổi logic. calendarSourceData (dòng
// cũ từng có ở đây) đã bị xoá hẳn — grep toàn repo xác nhận không có nơi nào thực sự dùng tới.
export function computeBaseAndPeriodData(
    sourceData: DataRow[],
    filters: FilterState,
    departmentMap: DepartmentMap | null
): { baseFilteredData: DataRow[]; mainPeriodData: DataRow[] } {
    const mainStartDate = filters.startDate ? new Date(filters.startDate) : null;
    if (mainStartDate) mainStartDate.setHours(0, 0, 0, 0);
    const mainEndDate = filters.endDate ? new Date(filters.endDate) : null;
    if (mainEndDate) mainEndDate.setHours(23, 59, 59, 999);

    const trangThaiFilterSet = (filters.trangThai && filters.trangThai.length > 0) ? new Set(filters.trangThai) : null;
    const nguoiTaoFilterSet = (filters.nguoiTao && filters.nguoiTao.length > 0) ? new Set(filters.nguoiTao) : null;
    const khoFilterSet = (filters.kho && filters.kho.length > 0 && !filters.kho.includes('all')) ? new Set(filters.kho) : null;
    const departmentFilterSet = (filters.department && filters.department.length > 0) ? new Set(filters.department) : null;

    const baseFilteredData: DataRow[] = [];
    const mainPeriodData: DataRow[] = [];

    for (let i = 0, len = sourceData.length; i < len; i++) {
        const row = sourceData[i];

        if (!isXuatMatch(row, filters.xuat)) continue;

        const mDate = isDateMatch(row, mainStartDate, mainEndDate, filters.selectedMonths);

        if (!isTrangThaiMatch(row, trangThaiFilterSet)) continue;
        if (!isNguoiTaoMatch(row, nguoiTaoFilterSet)) continue;
        if (!isDepartmentMatch(row, departmentFilterSet, departmentMap)) continue;

        if (!isKhoMatch(row, khoFilterSet)) continue;

        // Bỏ qua những đơn đã hủy hoặc đã trả (đồng nhất với warehouseGlobalData)
        const trangThaiHuy = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_HUY));
        const nhapTra = cleanAndNormalize(getRowValue(row, COL.TINH_TRANG_NHAP_TRA));
        const isValidOrder = (trangThaiHuy === 'chưa hủy' || trangThaiHuy === 'chưa huỷ') && nhapTra === 'chưa trả';
        if (!isValidOrder) continue;

        baseFilteredData.push(row);

        if (mDate) {
            mainPeriodData.push(row);
        }
    }

    return { baseFilteredData, mainPeriodData };
}

// Mục 65d: cùng lý do computeBaseAndPeriodData ở trên — 1 chỗ export duy nhất để main thread và
// Worker luôn dùng chung logic, không lệch nhau.
export function deriveWarehouseFilteredData(mainPeriodData: DataRow[]): DataRow[] {
    return mainPeriodData.filter(row => {
        const thuTien = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_THU_TIEN));
        const trangThaiHuy = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_HUY));
        const nhapTra = cleanAndNormalize(getRowValue(row, COL.TINH_TRANG_NHAP_TRA));
        const isValid = (trangThaiHuy === 'chưa hủy' || trangThaiHuy === 'chưa huỷ') && nhapTra === 'chưa trả';
        return thuTien === 'đã thu' && isValid;
    });
}

/**
 * Processes a filtered subset of data for a specific period to generate all dashboard metrics.
 */
function processDataForPeriod(
    periodData: DataRow[],
    productConfig: ProductConfig,
    filters: FilterState,
    departmentMap: DepartmentMap | null
): Omit<ProcessedData, 'lastUpdated' | 'reportSubTitle' | 'warehouseSummary'> {

    // === Single-pass classification (was 4 separate .filter() calls) ===
    // This is the hot path: with "ALL" filter, periodData can be 50k+ rows.
    // Doing one loop instead of 4 avoids ~150k redundant getRowValue+cleanAndNormalize calls.
    const filteredValidSalesData: DataRow[] = [];
    const unshippedOrders: DataRow[] = [];
    const uncollectedOrders: DataRow[] = [];
    const debtOrders: DataRow[] = [];
    const standardPeriodData: DataRow[] = [];

    const hasHTXConfig = productConfig && productConfig.revenueEligibleHTX && productConfig.revenueEligibleHTX.size > 0;

    
    for (let i = 0, len = periodData.length; i < len; i++) {
        const row = periodData[i];
        
        // --- PRE-CALCULATE METRICS (phòng thủ — applyFiltersAndProcess() đã tính trước cho toàn
        // bộ mainPeriodData ở trên, xem comment "Mục 65c (nhóm 3)"; điều kiện này chỉ còn tác dụng
        // nếu processDataForPeriod() được gọi qua đường khác trong tương lai mà bỏ qua bước đó) ---
        if (row._metrics === undefined) {
            row._metrics = calculateRowMetrics(row, productConfig);
            row._parentGroup = getParentGroup(getRowValue(row, COL.MA_NHOM_HANG), productConfig);
        }
        // -----------------------------

        const thuTien = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_THU_TIEN));

        if (thuTien === 'đã thu') {
            standardPeriodData.push(row);

            // Mục 65d: dùng chung isValidSalesRow() (utils/dataUtils.ts) — hàm này tự đọc lại
            // TRẠNG_THÁI_THU_TIỀN nội bộ (rẻ, đã cache qua cleanAndNormalize) nên vẫn cho kết quả
            // đúng dù outer thuTien đã tính rồi; mục đích là CHỈ 1 nơi định nghĩa "row hợp lệ tính
            // doanh thu" để main thread (hooks/useDataManagement.ts) gọi lại được y hệt.
            if (isValidSalesRow(row, productConfig)) {
                filteredValidSalesData.push(row);

                // Check unshipped
                if (getRowValue(row, COL.XUAT) === 'Chưa xuất') {
                    unshippedOrders.push(row);
                }

                // Check unfinished debt (Còn nợ > 0) — chỉ tính đơn ĐÃ XUẤT: đơn chưa xuất
                // thì chưa thể coi là "chưa hoàn tất công nợ" (chưa giao hàng thì chưa phát sinh
                // nghĩa vụ thu nợ).
                if (isXuatMatch(row, 'Đã') && parseNumber(getRowValue(row, COL.CON_NO)) > 0) {
                    debtOrders.push(row);
                }
            }
        } else if (thuTien === 'chưa thu') {
            // Check uncollected orders
            const trangThaiXuat = cleanAndNormalize(getRowValue(row, COL.XUAT));
            const trangThaiGiao = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_GIAO_HANG));
            const trangThaiHuy = cleanAndNormalize(getRowValue(row, COL.TRANG_THAI_HUY));
            if (
                trangThaiXuat === 'chưa xuất' &&
                trangThaiGiao === 'chưa giao' &&
                (trangThaiHuy === 'chưa hủy' || trangThaiHuy === 'chưa huỷ')
            ) {
                // Check base revenue eligibility (no thuTien check)
                const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                const parentGroup = row._parentGroup;
                if (parentGroup !== 'Không tính doanh thu') {
                    const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
                    const isRevenueBase = hasHTXConfig
                        ? productConfig.revenueEligibleHTX!.has(cleanAndNormalize(hinhThucXuat))
                        : (HINH_THUC_XUAT_TIEN_MAT.has(hinhThucXuat) || HINH_THUC_XUAT_TRA_GOP.has(hinhThucXuat));
                    if (isRevenueBase) {
                        uncollectedOrders.push(row);
                    }
                }
            }
        }
    }

    const kpis = processKpis(filteredValidSalesData, unshippedOrders, standardPeriodData, productConfig, filters);
    const trendData = processTrendData(filteredValidSalesData, productConfig);
    const employeeData = processEmployeeData(filteredValidSalesData, standardPeriodData, productConfig, departmentMap, filters);
    const industryData = processIndustryData(filteredValidSalesData, productConfig, filters);
    const summaryTable = processSummaryTable(filteredValidSalesData, productConfig, filters);

    return {
        kpis,
        trendData,
        industryData,
        employeeData,
        summaryTable,
        unshippedOrders,
        uncollectedOrders,
        debtOrders,
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
): { processedData: ProcessedData, baseFilteredData: DataRow[], warehouseFilteredData: DataRow[] } {

    const sourceData = allData;

    // Check cache validity for warehouse summary
    const selectedMonthsStr = JSON.stringify(filters.selectedMonths || []);
    const trangThaiStr = JSON.stringify(filters.trangThai || []);
    const nguoiTaoStr = JSON.stringify(filters.nguoiTao || []);
    const departmentStr = JSON.stringify(filters.department || []);
    const khoStr = JSON.stringify(filters.kho || []);

    const isWarehouseCacheValid =
        sourceData === _lastAllData &&
        productConfig === _lastProductConfig &&
        filters.xuat === _lastXuat &&
        String(filters.startDate) === _lastStartDate &&
        String(filters.endDate) === _lastEndDate &&
        selectedMonthsStr === _lastSelectedMonthsStr &&
        trangThaiStr === _lastTrangThaiStr &&
        nguoiTaoStr === _lastNguoiTaoStr &&
        departmentStr === _lastDepartmentStr &&
        khoStr === _lastKhoStr &&
        _lastWarehouseGlobalData !== null &&
        _lastWarehouseSummary !== null;

    const { baseFilteredData, mainPeriodData } = computeBaseAndPeriodData(sourceData, filters, departmentMap);
    let warehouseGlobalData: DataRow[] = isWarehouseCacheValid ? _lastWarehouseGlobalData! : [];

    // Mục 65c (nhóm 3): trước đây row._metrics/row._parentGroup chỉ được gán bên trong
    // processDataForPeriod() (dòng ~140 dưới), nhưng calculateWarehouseSummary() (khi cache miss)
    // lại chạy TRƯỚC processDataForPeriod() trong luồng thực thi — nên calculateWarehouseSummary
    // không bao giờ đọc được cache, luôn tự tính lại calculateRowMetrics()/getParentGroup() từ đầu
    // dù warehouseGlobalData ⊆ mainPeriodData (dữ liệu processDataForPeriod SẼ tính lại sau đó).
    // Dời việc tính 1 lần duy nhất ra đây — chạy NGAY sau khi mainPeriodData hoàn tất, TRƯỚC cả
    // nhánh cache/calculateWarehouseSummary — để cả 2 nơi đều đọc được cùng 1 kết quả đã tính sẵn,
    // không tăng thêm việc so với trước (processDataForPeriod trước đây đã làm việc này rồi, chỉ
    // là dời sớm hơn — xem điều kiện phòng thủ `row._metrics === undefined` bên dưới).
    for (let i = 0, len = mainPeriodData.length; i < len; i++) {
        const row = mainPeriodData[i];
        row._metrics = calculateRowMetrics(row, productConfig);
        row._parentGroup = getParentGroup(getRowValue(row, COL.MA_NHOM_HANG), productConfig);
    }

    let warehouseSummary;
    if (isWarehouseCacheValid) {
        warehouseSummary = _lastWarehouseSummary!;
    } else {
        warehouseGlobalData = deriveWarehouseFilteredData(mainPeriodData);
        warehouseSummary = calculateWarehouseSummary(warehouseGlobalData, productConfig) || [];
        _lastAllData = sourceData;
        _lastProductConfig = productConfig;
        _lastXuat = filters.xuat;
        _lastStartDate = String(filters.startDate);
        _lastEndDate = String(filters.endDate);
        _lastSelectedMonthsStr = selectedMonthsStr;
        _lastTrangThaiStr = trangThaiStr;
        _lastNguoiTaoStr = nguoiTaoStr;
        _lastDepartmentStr = departmentStr;
        _lastKhoStr = khoStr;
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

    return { processedData, baseFilteredData, warehouseFilteredData: warehouseGlobalData };
}
