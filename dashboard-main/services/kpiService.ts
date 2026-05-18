
import type { DataRow, KpiData, ProductConfig, FilterState } from '../types';
import { COL, HINH_THUC_XUAT_THU_HO } from '../constants';
import { getRowValue, getHeSoQuyDoi, getHinhThucThanhToan } from '../utils/dataUtils';

/**
 * Calculates key performance indicators from various data sources.
 */
export function processKpis(
    validSalesData: DataRow[],
    unshippedOrders: DataRow[],
    allPeriodData: DataRow[],
    productConfig: ProductConfig | null,
    filters?: FilterState
): KpiData {
    let doanhThuQD = 0;
    let totalRevenue = 0;
    let traGopValue = 0;
    let traGopCount = 0;
    
    let slPhuKien = 0;
    let slMain = 0;
    let minTime = Infinity;
    let maxTime = -Infinity;

    validSalesData.forEach(row => {
        const price = Number(getRowValue(row, COL.PRICE)) || 0;
        const rowRevenue = price; // Doanh thu là giá trị của cột Giá bán_1
        const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
        const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
        const productName = getRowValue(row, COL.PRODUCT);
        
        const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName);

        totalRevenue += rowRevenue;
        doanhThuQD += rowRevenue * heso;

        if (getHinhThucThanhToan(row) === 'tra_gop') {
            traGopValue += rowRevenue;
            traGopCount++;
        }
        
        const category = productConfig?.childToParentMap?.[maNhomHang];
        if (category === 'Phụ kiện') slPhuKien++;
        if (category === 'ICT' || category === 'Laptop' || category === 'Tablet' || category === 'Điện thoại') slMain++;
        
        const t = row.parsedDate?.getTime();
        if (t) {
            if (t < minTime) minTime = t;
            if (t > maxTime) maxTime = t;
        }
    });

    const crossSellRate = slMain > 0 ? slPhuKien / slMain : 0;
    
    const daysPassed = minTime !== Infinity ? Math.max(1, Math.round((maxTime - minTime) / (1000 * 60 * 60 * 24)) + 1) : 1;
    let totalDaysExpected = 30;
    if (filters?.selectedMonths && filters.selectedMonths.length === 1) {
        const match = filters.selectedMonths[0].match(/Tháng (\d{2})\/(\d{4})/);
        if (match) {
            const m = parseInt(match[1]);
            const y = parseInt(match[2]);
            totalDaysExpected = new Date(y, m, 0).getDate();
        }
    } else if (filters?.startDate && filters?.endDate) {
         totalDaysExpected = Math.max(1, Math.round((new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    } else if (maxTime !== -Infinity) {
         totalDaysExpected = new Date(new Date(maxTime).getFullYear(), new Date(maxTime).getMonth() + 1, 0).getDate();
    }
    
    const runRateRevenue = (totalRevenue / daysPassed) * totalDaysExpected;

    const { doanhThuThucChoXuat, doanhThuQDChoXuat } = unshippedOrders.reduce((acc, row) => {
        const price = Number(getRowValue(row, COL.PRICE)) || 0;
        const rowRevenue = price; // Doanh thu là giá trị của cột Giá bán_1
        const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
        const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
        const productName = getRowValue(row, COL.PRODUCT);
        
        const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName);
        acc.doanhThuThucChoXuat += rowRevenue;
        acc.doanhThuQDChoXuat += rowRevenue * heso;
        return acc;
    }, { doanhThuThucChoXuat: 0, doanhThuQDChoXuat: 0 });

    let soLuongThuHo = 0;
    for (let i = 0, len = allPeriodData.length; i < len; i++) {
        const hinhThucXuat = getRowValue(allPeriodData[i], COL.HINH_THUC_XUAT);
        if (hinhThucXuat && HINH_THUC_XUAT_THU_HO.has(hinhThucXuat)) {
            soLuongThuHo++;
        }
    }

    return {
        doanhThuQD,
        totalRevenue,
        soLuongThuHo,
        hieuQuaQD: totalRevenue > 0 ? (doanhThuQD - totalRevenue) / totalRevenue : 0,
        traGopPercent: totalRevenue > 0 ? (traGopValue / totalRevenue) * 100 : 0,
        traGopValue,
        traGopCount,
        doanhThuThucChoXuat,
        doanhThuQDChoXuat,
        runRateRevenue,
        crossSellRate,
    };
}
