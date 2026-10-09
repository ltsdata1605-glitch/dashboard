import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import type { ProductConfig } from '../../../types';
import { toCloudProductConfig, fromCloudProductConfig, isProductConfigComplete } from '../../../services/productConfigSerialization';
import type { GlobalProductConfigDoc, ProductConfigSummary } from '../types';
import { DEFAULT_QUANTITY_MULTIPLIER_MAP } from '../../../constants';

export const GLOBAL_PRODUCT_CONFIG_DOC_ID = 'global_product_config';
export const SHARED_CONFIGS_COLLECTION = 'shared_configs';

export const computeConfigSummary = (config: ProductConfig): ProductConfigSummary => {
    const parentGroups = Object.keys(config.groups || {});
    let subgroupTotal = 0;
    Object.values(config.subgroups || {}).forEach(subMap => {
        subgroupTotal += Object.keys(subMap || {}).length;
    });

    const categoryCodes = Object.keys(config.childToParentMap || {});
    const multiplierCount = Object.keys(config.quantityMultiplierMap || {}).length;
    const vasMultiplierCount = Object.keys(config.vasMultiplierMap || {}).length;
    const revenueHtxCount = config.revenueEligibleHTX instanceof Set ? config.revenueEligibleHTX.size : 0;
    const nonRevenueHtxCount = config.nonRevenueEligibleHTX instanceof Set ? config.nonRevenueEligibleHTX.size : 0;
    const productCodeCount = config.productCodeItems?.length || 0;

    return {
        parentGroupCount: parentGroups.length,
        subgroupCount: subgroupTotal,
        categoryCodeCount: categoryCodes.length,
        multiplierCount,
        vasMultiplierCount,
        revenueHtxCount,
        nonRevenueHtxCount,
        productCodeCount,
    };
};

export async function getGlobalProductConfig(): Promise<GlobalProductConfigDoc | null> {
    try {
        const docRef = doc(db, SHARED_CONFIGS_COLLECTION, GLOBAL_PRODUCT_CONFIG_DOC_ID);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;

        const data = snapshot.data();
        if (!data || !data.config) return null;

        const config = fromCloudProductConfig(data.config);
        if (!isProductConfigComplete(config)) return null;

        return {
            config,
            updatedAt: data.updatedAt || new Date().toISOString(),
            updatedBy: data.updatedBy || 'Hệ thống',
            version: data.version || 1,
            summary: data.summary || computeConfigSummary(config),
        };
    } catch (err) {
        console.error('[firebaseProductConfigService] Lỗi đọc cấu hình toàn cục từ Firestore:', err);
        return null;
    }
}

export async function saveGlobalProductConfig(
    config: ProductConfig,
    user: { email?: string | null; displayName?: string | null } | null
): Promise<void> {
    if (!isProductConfigComplete(config)) {
        throw new Error('Cấu hình sản phẩm chưa hoàn chỉnh (thiếu nhóm hàng hoặc hình thức xuất). Không thể lưu.');
    }

    const docRef = doc(db, SHARED_CONFIGS_COLLECTION, GLOBAL_PRODUCT_CONFIG_DOC_ID);
    const cloudPayload = toCloudProductConfig(config);
    const summary = computeConfigSummary(config);

    const docData = {
        config: cloudPayload,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.displayName || user?.email || 'Quản lý',
        version: Date.now(),
        summary,
    };

    await setDoc(docRef, docData);
}

export async function parseExcelProductConfigFile(file: File): Promise<ProductConfig> {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(data, { type: 'array' });
    const { parseProductConfigFromWorkbook } = await import('../../../services/dataService');
    const config = parseProductConfigFromWorkbook(workbook, XLSX);

    if (Object.keys(config.groups || {}).length === 0) {
        throw new Error('Không tìm thấy dữ liệu nhóm hàng trong file Excel. Vui lòng kiểm tra định dạng cột.');
    }

    if (!config.revenueEligibleHTX || config.revenueEligibleHTX.size === 0) {
        config.revenueEligibleHTX = new Set(['Bán lẻ', 'Xuất bán lẻ', 'Bán hàng', 'Bán sỉ', 'Bán trả góp']);
    }
    if (!config.nonRevenueEligibleHTX) {
        config.nonRevenueEligibleHTX = new Set();
    }

    return config;
}

export async function exportProductConfigToExcel(config: ProductConfig): Promise<void> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Ngành hàng (5 cột chuẩn khớp 100% với Google Sheets)
    const categoryRows: Array<[string, string, string, string, number | string]> = [
        ['NganhHang', 'NhomHang', 'NhomCha', 'NhomCon', 'HeSoQuyDoi']
    ];

    if (config.originalCategoryItems && config.originalCategoryItems.length > 0) {
        config.originalCategoryItems.forEach(item => {
            categoryRows.push([
                item.industry || '',
                item.nhomHang,
                item.nhomCha,
                item.nhomCon,
                item.heSoQuyDoi ?? 1
            ]);
        });
    } else {
        const processed = new Set<string>();
        Object.entries(config.childToParentMap || {}).forEach(([code, parent]) => {
            if (/^\d+$/.test(code) && Object.keys(config.childToParentMap).some(k => k !== code && k.startsWith(`${code} -`))) {
                return; // Bỏ alias số ngắn
            }
            if (code === code.toLowerCase() && Object.keys(config.childToParentMap).some(k => k !== code && k.toLowerCase() === code)) {
                return; // Bỏ bản duplicate lowercase
            }
            if (processed.has(code)) return;
            processed.add(code);

            const industry = config.childToIndustryMap?.[code] || '';
            const sub = config.childToSubgroupMap?.[code] || '';
            const mult = config.quantityMultiplierMap?.[code] ?? 1;
            categoryRows.push([industry, code, parent, sub, mult]);
        });
    }

    const categorySheet = XLSX.utils.aoa_to_sheet(categoryRows);
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Ngành hàng');

    // Sheet 2: Cấu hình theo mã sản phẩm (Khớp 100% Hình 1)
    if (config.productCodeItems && config.productCodeItems.length > 0) {
        const productRows: Array<[string | number, string, number | string, string, string]> = [
            ['MÃ SẢN PHẨM', 'TÊN SẢN PHẨM', 'HỆ SỐ', 'LOẠI', 'NHÓM']
        ];
        config.productCodeItems.forEach(item => {
            productRows.push([
                item.maSanPham,
                item.tenSanPham,
                item.heSo,
                item.loai || '',
                item.nhom || ''
            ]);
        });
        const productSheet = XLSX.utils.aoa_to_sheet(productRows);
        XLSX.utils.book_append_sheet(workbook, productSheet, 'Bảo Hiểm ĐMX');
    }

    // Sheet 3: Hình thức xuất
    const htxRows: Array<[string, string]> = [['Tên Hình Thức Xuất', 'Loại']];
    (config.revenueEligibleHTX || new Set()).forEach(h => htxRows.push([h, 'Doanh thu']));
    (config.nonRevenueEligibleHTX || new Set()).forEach(h => htxRows.push([h, 'Không tính DT']));
    const htxSheet = XLSX.utils.aoa_to_sheet(htxRows);
    XLSX.utils.book_append_sheet(workbook, htxSheet, 'Hình thức xuất');

    XLSX.writeFile(workbook, `Cau_Hinh_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
}

