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

export async function exportProductCodeConfigToExcel(productCodeItems: import('../types').ProductCodeTableItem[]): Promise<void> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    const productRows: Array<[string | number, string, number | string, string, string]> = [
        ['MÃ SẢN PHẨM', 'TÊN SẢN PHẨM', 'HỆ SỐ', 'LOẠI', 'NHÓM']
    ];
    productCodeItems.forEach(item => {
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

    XLSX.writeFile(workbook, `Cau_Hinh_Ma_San_Pham_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export async function parseExcelProductCodeConfigFile(file: File): Promise<import('../types').ProductCodeTableItem[]> {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(data, { type: 'array' });

    let targetSheetName = workbook.SheetNames.find((name: string) => {
        const ln = name.toLowerCase().normalize('NFC');
        return ln.includes('bảo hiểm') || ln.includes('bao hiem') || ln.includes('mã sản phẩm') || ln.includes('ma san pham') || ln.includes('vas') || ln.includes('hệ số');
    }) || workbook.SheetNames[0];

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) {
        throw new Error('File Excel không có sheet nào hợp lệ.');
    }

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length < 2) {
        throw new Error(`Sheet '${targetSheetName}' không có đủ dữ liệu.`);
    }

    const headers = rows[0].map((h: any) => String(h || '').trim().toLowerCase().normalize('NFC'));
    const codeIdx = headers.findIndex((h: string) => h.includes('mã sản phẩm') || h === 'mã' || h.includes('mã sp') || h.includes('code') || h.includes('khai'));
    const nameIdx = headers.findIndex((h: string) => h.includes('tên sản phẩm') || h === 'tên' || h.includes('name'));
    const multiplierIdx = headers.findIndex((h: string) => h.includes('hệ số') || h.includes('sl quy đổi') || h.includes('hệ số quy đổi') || h.includes('multiplier'));
    const loaiIdx = headers.findIndex((h: string) => h.includes('loại') || h.includes('thi đua') || h.includes('type'));
    const nhomIdx = headers.findIndex((h: string) => h.includes('nhóm') || h.includes('group'));

    if (codeIdx === -1 || multiplierIdx === -1) {
        throw new Error(`Sheet '${targetSheetName}' thiếu các cột bắt buộc: 'Mã sản phẩm' và 'Hệ số'. Vui lòng kiểm tra tiêu đề các cột.`);
    }

    const items: import('../types').ProductCodeTableItem[] = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length > Math.max(codeIdx, multiplierIdx)) {
            const code = String(row[codeIdx] || '').trim();
            if (!code) continue;
            const nameVal = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
            const loaiVal = loaiIdx !== -1 ? String(row[loaiIdx] || '').trim() : '';
            const nhomVal = nhomIdx !== -1 ? String(row[nhomIdx] || '').trim() : '';
            const rawVal = String(row[multiplierIdx] || '').replace(',', '.');
            const multiplier = parseFloat(rawVal);
            if (!isNaN(multiplier)) {
                items.push({
                    maSanPham: code,
                    tenSanPham: nameVal,
                    heSo: multiplier,
                    loai: loaiVal || undefined,
                    nhom: nhomVal || undefined,
                    sheetSource: targetSheetName,
                });
            }
        }
    }

    if (items.length === 0) {
        throw new Error(`Không tìm thấy dòng mã sản phẩm hợp lệ nào trong sheet '${targetSheetName}'.`);
    }

    return items;
}

