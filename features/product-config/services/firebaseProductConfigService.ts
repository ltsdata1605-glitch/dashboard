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

    // Sheet 2: Cấu hình theo mã sản phẩm (Hỗ trợ cột Hệ số SL và Hệ số DT)
    if (config.productCodeItems && config.productCodeItems.length > 0) {
        const productRows: Array<[string | number, string, number | string, number | string, string, string]> = [
            ['MÃ SẢN PHẨM', 'TÊN SẢN PHẨM', 'HỆ SỐ SL', 'HỆ SỐ DT', 'LOẠI', 'NHÓM']
        ];
        config.productCodeItems.forEach(item => {
            const slVal = item.heSoSoLuong !== undefined ? item.heSoSoLuong : (item.loaiHeSo === 'doanh_thu' ? '' : item.heSo);
            const dtVal = item.heSoDoanhThu !== undefined ? item.heSoDoanhThu : (item.loaiHeSo === 'doanh_thu' ? item.heSo : '');
            productRows.push([
                item.maSanPham,
                item.tenSanPham,
                slVal,
                dtVal,
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

export const DEFAULT_CATEGORY_SAMPLE_ROWS: Array<[string, string, string, string, number]> = [
    ['Điện máy', '13 - Tivi Sony', 'Tivi', 'Tivi Sony', 1],
    ['IT', '10 - Chuột máy tính', 'Phụ kiện', 'Chuột', 1.5],
    ['Dịch vụ', '4479 - Dịch Vụ Bảo Hiểm', 'Bảo hiểm', 'Bảo hiểm ĐMX', 4.18],
    ['Viễn thông', '7139 - Sim Số', 'Sim & Thẻ', 'Sim Số Đẹp', 2],
    ['Gia dụng', '25 - Nồi cơm điện', 'Gia dụng', 'Nồi cơm', 1.2],
];

export async function exportCategoryConfigTemplateToExcel(): Promise<void> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    const categoryRows: Array<[string, string, string, string, number | string]> = [
        ['NganhHang', 'NhomHang', 'NhomCha', 'NhomCon', 'HeSoQuyDoi'],
        ...DEFAULT_CATEGORY_SAMPLE_ROWS
    ];

    const categorySheet = XLSX.utils.aoa_to_sheet(categoryRows);
    categorySheet['!cols'] = [
        { wch: 18 }, // NganhHang
        { wch: 32 }, // NhomHang
        { wch: 20 }, // NhomCha
        { wch: 22 }, // NhomCon
        { wch: 14 }, // HeSoQuyDoi
    ];

    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Ngành hàng');
    XLSX.writeFile(workbook, `Mau_Khai_Bao_Nganh_Hang_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export const DEFAULT_PRODUCT_CODE_SAMPLE_ROWS: Array<[string, string, number | string, number | string, string, string]> = [
    [
        'SP_MAU_SL',
        'VieON VIP 1 Tháng (Ví dụ chỉ tính hệ số SL)',
        1.5,
        '',
        'Số lượng (SL)',
        'Dịch Vụ Số'
    ],
    [
        'SP_MAU_DT',
        'Bảo hiểm Rơi vỡ 12T (Ví dụ chỉ nhân hệ số DT)',
        '',
        1.2,
        'Doanh thu (DT)',
        'Bảo Hiểm'
    ],
    [
        'SP_MAU_SL_DT',
        'Sim Data Siêu Tốc (Ví dụ áp dụng cả SL & DT)',
        2,
        1.1,
        'Cả hai (SL & DT)',
        'Sim & Thẻ'
    ]
];

export interface ExportProductCodeOptions {
    asTemplate?: boolean;
}

export async function exportProductCodeConfigToExcel(
    productCodeItems: import('../types').ProductCodeTableItem[],
    options: ExportProductCodeOptions = {}
): Promise<void> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    const productRows: Array<[string | number, string, number | string, number | string, string, string]> = [
        ['MÃ SẢN PHẨM', 'TÊN SẢN PHẨM', 'HỆ SỐ SL', 'HỆ SỐ DT', 'LOẠI', 'NHÓM']
    ];

    const isTemplate = options.asTemplate || !productCodeItems || productCodeItems.length === 0;

    if (isTemplate) {
        // Xuất 3 dòng mẫu cho 3 loại hệ số: Số lượng (SL), Doanh thu (DT), Cả hai (SL & DT)
        DEFAULT_PRODUCT_CODE_SAMPLE_ROWS.forEach(row => {
            productRows.push(row);
        });
    } else {
        productCodeItems.forEach(item => {
            const slVal = item.heSoSoLuong !== undefined ? item.heSoSoLuong : (item.loaiHeSo === 'doanh_thu' ? '' : item.heSo);
            const dtVal = item.heSoDoanhThu !== undefined ? item.heSoDoanhThu : (item.loaiHeSo === 'doanh_thu' ? item.heSo : '');
            productRows.push([
                item.maSanPham,
                item.tenSanPham,
                slVal,
                dtVal,
                item.loai || '',
                item.nhom || ''
            ]);
        });
    }

    const productSheet = XLSX.utils.aoa_to_sheet(productRows);

    // Canh chỉnh độ rộng cột chuẩn đẹp khi mở bằng Excel hoặc Google Sheets
    productSheet['!cols'] = [
        { wch: 18 }, // MÃ SẢN PHẨM
        { wch: 45 }, // TÊN SẢN PHẨM
        { wch: 14 }, // HỆ SỐ SL
        { wch: 14 }, // HỆ SỐ DT
        { wch: 18 }, // LOẠI
        { wch: 20 }, // NHÓM
    ];

    XLSX.utils.book_append_sheet(workbook, productSheet, 'Bảo Hiểm ĐMX');

    const fileName = isTemplate
        ? `Mau_Cau_Hinh_Ma_San_Pham_${new Date().toISOString().split('T')[0]}.xlsx`
        : `Cau_Hinh_Ma_San_Pham_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(workbook, fileName);
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
    const heSoSLIdx = headers.findIndex((h: string) => 
        (h.includes('hệ số') || h.includes('he so') || h.includes('multiplier')) && 
        (h.includes('sl') || h.includes('số lượng') || h.includes('so luong') || h.includes('quy đổi sl'))
    );
    const heSoDTIdx = headers.findIndex((h: string) => 
        (h.includes('hệ số') || h.includes('he so') || h.includes('multiplier')) && 
        (h.includes('dt') || h.includes('doanh thu') || h.includes('doanh so') || h.includes('quy đổi dt'))
    );
    const multiplierIdx = headers.findIndex((h: string) => h === 'hệ số' || h === 'he so' || h.includes('sl quy đổi') || h.includes('hệ số quy đổi') || h.includes('multiplier'));
    const loaiIdx = headers.findIndex((h: string) => h === 'loại' || (h.includes('loại') && !h.includes('hệ số')) || h.includes('thi đua') || h.includes('type'));
    const nhomIdx = headers.findIndex((h: string) => h.includes('nhóm') || h.includes('group'));

    const hasMultiplier = heSoSLIdx !== -1 || heSoDTIdx !== -1 || multiplierIdx !== -1;
    if (codeIdx === -1 || !hasMultiplier) {
        throw new Error(`Sheet '${targetSheetName}' thiếu các cột bắt buộc: 'Mã sản phẩm' và 'Hệ số' (hoặc 'Hệ số SL' / 'Hệ số DT'). Vui lòng kiểm tra tiêu đề các cột.`);
    }

    const items: import('../types').ProductCodeTableItem[] = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const maxCol = Math.max(codeIdx, heSoSLIdx, heSoDTIdx, multiplierIdx);
        if (row.length > maxCol || maxCol >= 0) {
            const code = String(row[codeIdx] || '').trim();
            if (!code) continue;
            const nameVal = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
            const loaiVal = loaiIdx !== -1 ? String(row[loaiIdx] || '').trim() : '';
            const nhomVal = nhomIdx !== -1 ? String(row[nhomIdx] || '').trim() : '';

            let multSL: number | undefined;
            let multDT: number | undefined;

            if (heSoSLIdx !== -1 && row[heSoSLIdx] !== undefined && String(row[heSoSLIdx]).trim() !== '') {
                const parsed = parseFloat(String(row[heSoSLIdx]).replace(',', '.'));
                if (!isNaN(parsed)) multSL = parsed;
            }
            if (heSoDTIdx !== -1 && row[heSoDTIdx] !== undefined && String(row[heSoDTIdx]).trim() !== '') {
                const parsed = parseFloat(String(row[heSoDTIdx]).replace(',', '.'));
                if (!isNaN(parsed)) multDT = parsed;
            }
            if (multSL === undefined && multDT === undefined && multiplierIdx !== -1) {
                const rawVal = String(row[multiplierIdx] || '').replace(',', '.');
                const parsed = parseFloat(rawVal);
                if (!isNaN(parsed)) multSL = parsed;
            }

            if (multSL !== undefined || multDT !== undefined) {
                const primaryHeSo = multSL ?? multDT ?? 1;
                const loaiHeSo: 'so_luong' | 'doanh_thu' | 'ca_hai' = 
                    multSL !== undefined && multDT !== undefined ? 'ca_hai' :
                    multDT !== undefined ? 'doanh_thu' : 'so_luong';

                items.push({
                    maSanPham: code,
                    tenSanPham: nameVal,
                    heSo: primaryHeSo,
                    heSoSoLuong: multSL,
                    heSoDoanhThu: multDT,
                    loaiHeSo,
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

