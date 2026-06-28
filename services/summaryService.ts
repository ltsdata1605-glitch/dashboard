
import type { DataRow, ProductConfig, FilterState, SummaryTableNode, GrandTotal, WarehouseSummaryRow, MetricValues } from '../types';
import { COL, HINH_THUC_XUAT_THU_HO, HINH_THUC_XUAT_TRA_GOP } from '../constants';
import { getRowValue, getHeSoQuyDoi, sortSummaryData, getHinhThucThanhToan, getDisplayParentGroup, abbreviateName, getParentGroup, getSubgroup } from '../utils/dataUtils';
import { calculateHieuQuaQDPercent, calculatePercentage, calculateAOV } from './metricService';

export function processSummaryTable(
    filteredValidSalesData: DataRow[],
    productConfig: ProductConfig,
    filters: FilterState
): {
    data: { [key: string]: SummaryTableNode };
    grandTotal: GrandTotal;
    uniqueKhos: string[];
    uniqueParentGroups: string[];
    uniqueChildGroups: string[];
    uniqueManufacturers: string[];
    uniqueCreators: string[];
    uniqueProducts: string[];
} {
    const summaryTableData: { [key: string]: SummaryTableNode } = {};

    // Sets to collect unique values for dropdowns
    const khoGroupsForFilter = new Set<string>();
    const parentGroupsForFilter = new Set<string>();
    const childGroupsForFilter = new Set<string>();
    const manufacturersForFilter = new Set<string>();
    const creatorsForFilter = new Set<string>();
    const productsForFilter = new Set<string>();

    const valueExtractors: { [key: string]: (row: DataRow) => string } = {
        'kho': (row) => String(getRowValue(row, COL.KHO) || 'Không xác định'),
        'parent': (row) => getParentGroup(getRowValue(row, COL.MA_NHOM_HANG), productConfig) || 'Không xác định',
        'child': (row) => getSubgroup(getRowValue(row, COL.MA_NHOM_HANG), productConfig) || 'Không xác định',
        'manufacturer': (row) => getRowValue(row, COL.MANUFACTURER) || 'Không rõ',
        'creator': (row) => abbreviateName(getRowValue(row, COL.NGUOI_TAO) || 'Không xác định'),
        'product': (row) => getRowValue(row, COL.PRODUCT) || 'N/A'
    };

    // Default hierarchy updated to 5 levels as requested
    const drilldownOrder = (filters.summaryTable.drilldownOrder && filters.summaryTable.drilldownOrder.length > 0)
        ? filters.summaryTable.drilldownOrder
        : ['parent', 'child', 'manufacturer', 'creator', 'product'];

    for (let i = 0, len = filteredValidSalesData.length; i < len; i++) {
        const row = filteredValidSalesData[i];
        // Filter out non-revenue rows to ensure revenue eligibility
        const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT);
        const isRevenue = productConfig && productConfig.revenueEligibleHTX && productConfig.revenueEligibleHTX.size > 0
            ? productConfig.revenueEligibleHTX.has(String(hinhThucXuat || '').trim().toLowerCase().normalize('NFC'))
            : !HINH_THUC_XUAT_THU_HO.has(hinhThucXuat);
        if (!isRevenue) continue;

        // Bỏ qua sản phẩm không xác định nhóm hàng (không có trong cấu hình)
        const maNhomHangCheck = getRowValue(row, COL.MA_NHOM_HANG);
        if (!getParentGroup(maNhomHangCheck, productConfig)) continue;

        // Compute all values ONCE per row (eliminating double computation)
        const allValues: Record<string, string> = {};
        for (const key in valueExtractors) {
            allValues[key] = valueExtractors[key](row);
        }

        const khoVal = allValues['kho'];
        const parentVal = allValues['parent'];
        const childVal = allValues['child'];
        const manufacturerVal = allValues['manufacturer'];
        const creatorVal = allValues['creator'];
        const productVal = allValues['product'];

        khoGroupsForFilter.add(khoVal);
        parentGroupsForFilter.add(parentVal);
        childGroupsForFilter.add(childVal);
        manufacturersForFilter.add(manufacturerVal);
        creatorsForFilter.add(creatorVal);
        productsForFilter.add(productVal);

        if (filters.summaryTable.kho?.length > 0 && !filters.summaryTable.kho.includes(khoVal)) continue;
        if (filters.parent?.length > 0 && !filters.parent.includes(parentVal)) continue;
        if (filters.summaryTable.child?.length > 0 && !filters.summaryTable.child.includes(childVal)) continue;
        if (filters.summaryTable.manufacturer?.length > 0 && !filters.summaryTable.manufacturer.includes(manufacturerVal)) continue;
        if (filters.summaryTable.creator?.length > 0 && !filters.summaryTable.creator.includes(creatorVal)) continue;
        if (filters.summaryTable.product?.length > 0 && !filters.summaryTable.product.includes(productVal)) continue;

        const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
        const price = Number(getRowValue(row, COL.PRICE)) || 0;
        const revenue = price;
        const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
        const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
        const productName = getRowValue(row, COL.PRODUCT);

        const productCode = String(getRowValue(row, COL.PRODUCT_CODE) || '').trim();
        const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
        const revenueQD = revenue * heso;

        // Logic trọng số số lượng dựa trên mã sản phẩm (cột AF) và bảng hệ số từ file cấu hình
        const qtyMultiplier = productConfig.quantityMultiplierMap?.[productCode];
        const weightedQuantity = qtyMultiplier !== undefined ? (quantity * qtyMultiplier) : quantity;

        // Reuse already-computed allValues for keys
        const keys: string[] = [];
        for (const levelKey of drilldownOrder) {
            if (allValues[levelKey] !== undefined) {
                keys.push(allValues[levelKey]);
            }
        }

        let currentNode: { [key: string]: SummaryTableNode } | undefined = summaryTableData;
        keys.forEach(key => {
            if (!currentNode) return;
            if (!currentNode[key]) {
                currentNode[key] = {
                    totalQuantity: 0,
                    totalRevenue: 0,
                    totalTraGop: 0,
                    totalRevenueQD: 0,
                    children: {}
                };
            }
            currentNode[key].totalQuantity += weightedQuantity;
            currentNode[key].totalRevenue += revenue;
            currentNode[key].totalRevenueQD += revenueQD;
            if (getHinhThucThanhToan(row) === 'tra_gop') {
                currentNode[key].totalTraGop += revenue;
            }
            currentNode = currentNode[key].children;
        });
    }

    const grandTotal: GrandTotal = Object.values(summaryTableData).reduce((acc, node) => {
        acc.totalQuantity += node.totalQuantity;
        acc.totalRevenue += node.totalRevenue;
        acc.totalRevenueQD += node.totalRevenueQD;
        acc.totalTraGop += node.totalTraGop;
        return acc;
    }, { totalQuantity: 0, totalRevenue: 0, totalRevenueQD: 0, totalTraGop: 0, aov: 0, traGopPercent: 0 });

    grandTotal.aov = calculateAOV(grandTotal.totalRevenue, grandTotal.totalQuantity);
    grandTotal.traGopPercent = calculatePercentage(grandTotal.totalTraGop, grandTotal.totalRevenue);

    const sortedSummaryTableData = sortSummaryData(summaryTableData, filters.summaryTable.sort.column, filters.summaryTable.sort.direction);

    return {
        data: sortedSummaryTableData,
        grandTotal,
        uniqueKhos: [...khoGroupsForFilter].sort(),
        uniqueParentGroups: [...parentGroupsForFilter].sort(),
        uniqueChildGroups: [...childGroupsForFilter].sort(),
        uniqueManufacturers: [...manufacturersForFilter].sort(),
        uniqueCreators: [...creatorsForFilter].sort(),
        uniqueProducts: [...productsForFilter].sort()
    };
}


export function calculateWarehouseSummary(
    dataForWarehouseSummary: DataRow[],
    productConfig: ProductConfig
): WarehouseSummaryRow[] | null {
    if (!dataForWarehouseSummary || dataForWarehouseSummary.length === 0) return [];

    const summaryByKho: { [key: string]: any } = {};
    const initMetricValues = (): MetricValues => ({ quantity: 0, revenue: 0, revenueQD: 0 });

    for (let i = 0, len = dataForWarehouseSummary.length; i < len; i++) {
        const row = dataForWarehouseSummary[i];
        const khoName = getRowValue(row, COL.KHO);
        if (!khoName) continue;

        if (!summaryByKho[khoName]) {
            summaryByKho[khoName] = {
                customers: new Set<string>(),
                doanhThuTraCham: 0,
                slThuHo: 0,
                metrics: {
                    byIndustry: {},
                    byGroup: {},
                    byManufacturer: {},
                    byIndustryAndManufacturer: {},
                    byGroupAndManufacturer: {},
                },
            };
        }

        const summary = summaryByKho[khoName];

        const htx = getRowValue(row, COL.HINH_THUC_XUAT);
        const isThuHo = productConfig && productConfig.htxClassification
            ? productConfig.htxClassification[String(htx || '').trim().toLowerCase().normalize('NFC')] === 'thu_ho'
            : HINH_THUC_XUAT_THU_HO.has(htx);

        if (isThuHo) {
            summary.slThuHo++;
        }

        const isRevenue = productConfig && productConfig.revenueEligibleHTX && productConfig.revenueEligibleHTX.size > 0
            ? productConfig.revenueEligibleHTX.has(String(htx || '').trim().toLowerCase().normalize('NFC'))
            : !HINH_THUC_XUAT_THU_HO.has(htx);

        if (isRevenue) {
            const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
            const parentGroup = getParentGroup(maNhomHang, productConfig);
            // Bỏ qua sản phẩm không xác định nhóm hàng hoặc không tính doanh thu
            if (!parentGroup || parentGroup === 'Không tính doanh thu') continue;

            const price = Number(getRowValue(row, COL.PRICE)) || 0;
            const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
            const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
            const productName = getRowValue(row, COL.PRODUCT);
            const customer = getRowValue(row, COL.CUSTOMER_NAME);

            const productCode = String(getRowValue(row, COL.PRODUCT_CODE) || '').trim();
            const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName, productCode);
            const rowRevenue = price;
            const rowRevenueQD = rowRevenue * heso;

            // Trọng số số lượng dựa trên mã sản phẩm (cột AF) và bảng hệ số từ file cấu hình
            const industry = getParentGroup(maNhomHang, productConfig) || 'Khác';
            const group = getSubgroup(maNhomHang, productConfig) || 'Khác';
            const qtyMultiplier = productConfig.quantityMultiplierMap?.[productCode];
            const weightedQuantity = qtyMultiplier !== undefined ? (quantity * qtyMultiplier) : quantity;

            if (customer) summary.customers.add(customer);
            if (getHinhThucThanhToan(row, productConfig) === 'tra_gop') {
                summary.doanhThuTraCham += rowRevenue;
            }

            const manufacturer = getRowValue(row, COL.MANUFACTURER) || 'Không rõ';

            // Aggregate by industry
            if (!summary.metrics.byIndustry[industry]) summary.metrics.byIndustry[industry] = initMetricValues();
            summary.metrics.byIndustry[industry].quantity += weightedQuantity;
            summary.metrics.byIndustry[industry].revenue += rowRevenue;
            summary.metrics.byIndustry[industry].revenueQD += rowRevenueQD;

            // Aggregate by group
            if (!summary.metrics.byGroup[group]) summary.metrics.byGroup[group] = initMetricValues();
            summary.metrics.byGroup[group].quantity += weightedQuantity;
            summary.metrics.byGroup[group].revenue += rowRevenue;
            summary.metrics.byGroup[group].revenueQD += rowRevenueQD;

            // Aggregate by manufacturer
            if (!summary.metrics.byManufacturer[manufacturer]) summary.metrics.byManufacturer[manufacturer] = initMetricValues();
            summary.metrics.byManufacturer[manufacturer].quantity += weightedQuantity;
            summary.metrics.byManufacturer[manufacturer].revenue += rowRevenue;
            summary.metrics.byManufacturer[manufacturer].revenueQD += rowRevenueQD;

            // Aggregate by industry and manufacturer
            if (!summary.metrics.byIndustryAndManufacturer[industry]) summary.metrics.byIndustryAndManufacturer[industry] = {};
            if (!summary.metrics.byIndustryAndManufacturer[industry][manufacturer]) summary.metrics.byIndustryAndManufacturer[industry][manufacturer] = initMetricValues();
            summary.metrics.byIndustryAndManufacturer[industry][manufacturer].quantity += weightedQuantity;
            summary.metrics.byIndustryAndManufacturer[industry][manufacturer].revenue += rowRevenue;
            summary.metrics.byIndustryAndManufacturer[industry][manufacturer].revenueQD += rowRevenueQD;

            // Aggregate by group and manufacturer
            if (!summary.metrics.byGroupAndManufacturer[group]) summary.metrics.byGroupAndManufacturer[group] = {};
            if (!summary.metrics.byGroupAndManufacturer[group][manufacturer]) summary.metrics.byGroupAndManufacturer[group][manufacturer] = initMetricValues();
            summary.metrics.byGroupAndManufacturer[group][manufacturer].quantity += weightedQuantity;
            summary.metrics.byGroupAndManufacturer[group][manufacturer].revenue += rowRevenue;
            summary.metrics.byGroupAndManufacturer[group][manufacturer].revenueQD += rowRevenueQD;
        }
    }

    return Object.keys(summaryByKho)
        .map(khoName => {
            const summary = summaryByKho[khoName];

            const totalMetrics = Object.values(summary.metrics.byIndustry as Record<string, MetricValues>)
                .reduce((acc, metric) => {
                    acc.revenue += metric.revenue;
                    acc.revenueQD += metric.revenueQD;
                    return acc;
                }, { revenue: 0, revenueQD: 0 });

            const doanhThuThuc = totalMetrics.revenue;
            const doanhThuQD = totalMetrics.revenueQD;
            const hieuQuaQD = calculateHieuQuaQDPercent(doanhThuQD, doanhThuThuc);
            const traChamPercent = calculatePercentage(summary.doanhThuTraCham, doanhThuThuc);

            return {
                khoName,
                doanhThuThuc,
                doanhThuQD,
                target: 0, // Initialized to 0, handled in UI
                percentHT: 0, // Initialized to 0, handled in UI
                hieuQuaQD,
                slTiepCan: summary.customers.size,
                slThuHo: summary.slThuHo,
                traChamPercent: traChamPercent,
                doanhThuTraCham: summary.doanhThuTraCham,
                metrics: summary.metrics,
            };
        })
        .sort((a, b) => b.doanhThuQD - a.doanhThuQD);
}
