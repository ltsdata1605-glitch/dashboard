import { describe, it, expect } from 'vitest';
import { computeConfigSummary } from './firebaseProductConfigService';
import { toCloudProductConfig, fromCloudProductConfig, isProductConfigComplete } from '../../../services/productConfigSerialization';
import type { ProductConfig } from '../../../types';

describe('firebaseProductConfigService & serialization', () => {
    const mockConfig: ProductConfig = {
        groups: {
            'Điện thoại': new Set(['IPHONE', 'SAMSUNG']),
            'Laptop': new Set(['MACBOOK', 'DELL']),
        },
        subgroups: {
            'Điện thoại': {
                'Apple': ['IPHONE'],
                'Android': ['SAMSUNG'],
            },
        },
        childToParentMap: {
            'IPHONE': 'Điện thoại',
            'SAMSUNG': 'Điện thoại',
            'MACBOOK': 'Laptop',
            'DELL': 'Laptop',
        },
        childToSubgroupMap: {
            'IPHONE': 'Apple',
            'SAMSUNG': 'Android',
        },
        quantityMultiplierMap: {
            'IPHONE': 1.2,
            'MACBOOK': 1.5,
        },
        vasMultiplierMap: {
            'VAS01': 2.0,
        },
        revenueEligibleHTX: new Set(['Bán lẻ', 'Bán góp']),
        nonRevenueEligibleHTX: new Set(['Xuất hủy', 'Điều chuyển']),
        htxClassification: {
            'Bán lẻ': 'tien_mat',
            'Bán góp': 'tra_gop',
        },
    };

    it('computes correct config summary', () => {
        const summary = computeConfigSummary(mockConfig);
        expect(summary.parentGroupCount).toBe(2);
        expect(summary.subgroupCount).toBe(2);
        expect(summary.categoryCodeCount).toBe(4);
        expect(summary.multiplierCount).toBe(2);
        expect(summary.vasMultiplierCount).toBe(1);
        expect(summary.revenueHtxCount).toBe(2);
        expect(summary.nonRevenueHtxCount).toBe(2);
    });

    it('serializes ProductConfig safely for Firestore and restores Sets properly', () => {
        const cloudData = toCloudProductConfig(mockConfig);
        expect(Array.isArray(cloudData.groups['Điện thoại'])).toBe(true);
        expect(Array.isArray(cloudData.revenueEligibleHTX)).toBe(true);
        expect(Array.isArray(cloudData.nonRevenueEligibleHTX)).toBe(true);

        const restored = fromCloudProductConfig(cloudData);
        expect(restored.groups['Điện thoại']).toBeInstanceOf(Set);
        expect(restored.groups['Điện thoại'].has('IPHONE')).toBe(true);
        expect(restored.revenueEligibleHTX).toBeInstanceOf(Set);
        expect(restored.revenueEligibleHTX?.has('Bán lẻ')).toBe(true);
        expect(restored.nonRevenueEligibleHTX).toBeInstanceOf(Set);
        expect(restored.nonRevenueEligibleHTX?.has('Xuất hủy')).toBe(true);
    });

    it('validates product config completeness', () => {
        expect(isProductConfigComplete(mockConfig)).toBe(true);

        const incompleteConfig: ProductConfig = {
            ...mockConfig,
            groups: {},
        };
        expect(isProductConfigComplete(incompleteConfig)).toBe(false);
    });

    it('parseProductConfigFromWorkbook accurately parses NganhHang, NhomHang, and HeSoQuyDoi', async () => {
        const { parseProductConfigFromWorkbook } = await import('../../../services/dataService');
        
        const mockRows = [
            ['NganhHang', 'NhomHang', 'NhomCha', 'NhomCon', 'HeSoQuyDoi'],
            ['IT', '10 - Chuột máy tính', 'Phụ kiện', 'Chuột', '4.18'],
            ['IT', '12 - Bàn phím', 'Phụ kiện', 'Bàn phím', 6],
            ['Điện máy', '13 - Tivi Sony', 'Tivi', 'Tivi Sony', '1.92'],
            ['Dịch vụ', '4479 - Bảo hiểm', 'Dịch vụ', 'Bảo hiểm', '1,85'],
        ];

        const mockWorkbook = {
            SheetNames: ['Ngành hàng'],
            Sheets: {
                'Ngành hàng': {},
            },
        };

        const mockXlsx = {
            utils: {
                sheet_to_json: () => mockRows,
            },
        };

        const config = parseProductConfigFromWorkbook(mockWorkbook, mockXlsx);

        // Verify multipliers
        expect(config.quantityMultiplierMap['10 - Chuột máy tính']).toBe(4.18);
        expect(config.quantityMultiplierMap['10']).toBe(4.18);
        expect(config.quantityMultiplierMap['12 - Bàn phím']).toBe(6);
        expect(config.quantityMultiplierMap['12']).toBe(6);
        expect(config.quantityMultiplierMap['13 - Tivi Sony']).toBe(1.92);
        expect(config.quantityMultiplierMap['4479 - Bảo hiểm']).toBe(1.85); // parsed Vietnamese comma decimal

        // Verify industries
        expect(config.childToIndustryMap?.['10 - Chuột máy tính']).toBe('IT');
        expect(config.childToIndustryMap?.['10']).toBe('IT');
        expect(config.childToIndustryMap?.['13 - Tivi Sony']).toBe('Điện máy');

        // Verify originalCategoryItems preservation
        expect(config.originalCategoryItems).toBeDefined();
        expect(config.originalCategoryItems?.length).toBe(4);
        expect(config.originalCategoryItems?.[0]).toEqual({
            industry: 'IT',
            nhomHang: '10 - Chuột máy tính',
            nhomCha: 'Phụ kiện',
            nhomCon: 'Chuột',
            heSoQuyDoi: 4.18,
        });
        expect(config.originalCategoryItems?.[3]).toEqual({
            industry: 'Dịch vụ',
            nhomHang: '4479 - Bảo hiểm',
            nhomCha: 'Dịch vụ',
            nhomCon: 'Bảo hiểm',
            heSoQuyDoi: 1.85,
        });
    });

    it('parseProductConfigFromWorkbook parses product code sheets (Bảo Hiểm ĐMX) with full attributes', async () => {
        const { parseProductConfigFromWorkbook } = await import('../../../services/dataService');

        const mockCategoryRows = [
            ['NganhHang', 'NhomHang', 'NhomCha', 'NhomCon', 'HeSoQuyDoi'],
            ['IT', '10 - Chuột', 'Phụ kiện', 'Chuột', 1],
        ];

        const mockProductCodeRows = [
            ['MÃ SẢN PHẨM', 'TÊN SẢN PHẨM', 'HỆ SỐ', 'LOẠI', 'NHÓM'],
            ['1997139000289', 'BHMR 1 năm Apple Watch', 3, 'Apple Watch', 'ICT'],
            ['1997160000128', 'BHRV 12 tháng Apple Watch', '2', 'Apple Watch', 'ICT'],
        ];

        const mockWorkbook = {
            SheetNames: ['Ngành hàng', 'Bảo Hiểm ĐMX'],
            Sheets: {
                'Ngành hàng': {},
                'Bảo Hiểm ĐMX': {},
            },
        };

        const mockXlsx = {
            utils: {
                sheet_to_json: (sheet: any) => {
                    if (sheet === mockWorkbook.Sheets['Ngành hàng']) return mockCategoryRows;
                    return mockProductCodeRows;
                },
            },
        };

        const config = parseProductConfigFromWorkbook(mockWorkbook, mockXlsx);

        expect(config.productCodeItems).toBeDefined();
        expect(config.productCodeItems?.length).toBe(2);
        expect(config.productCodeItems?.[0]).toEqual({
            maSanPham: '1997139000289',
            tenSanPham: 'BHMR 1 năm Apple Watch',
            heSo: 3,
            loai: 'Apple Watch',
            nhom: 'ICT',
            sheetSource: 'Bảo Hiểm ĐMX',
        });
        expect(config.productCodeItems?.[1]).toEqual({
            maSanPham: '1997160000128',
            tenSanPham: 'BHRV 12 tháng Apple Watch',
            heSo: 2,
            loai: 'Apple Watch',
            nhom: 'ICT',
            sheetSource: 'Bảo Hiểm ĐMX',
        });

        // Verify multipliers mapped to quantityMultiplierMap
        expect(config.quantityMultiplierMap['1997139000289']).toBe(3);
        expect(config.quantityMultiplierMap['1997160000128']).toBe(2);

        // Verify summary
        const summary = computeConfigSummary(config);
        expect(summary.productCodeCount).toBe(2);
    });

    it('parseExcelProductCodeConfigFile parses file buffer accurately', async () => {
        const { parseExcelProductCodeConfigFile } = await import('./firebaseProductConfigService');
        const XLSX = await import('xlsx');

        const mockProductRows = [
            ['Mã sản phẩm', 'Tên sản phẩm', 'Hệ số', 'Loại', 'Nhóm'],
            ['1997139000289', 'BHMR 1 năm Apple Watch', 3, 'Apple Watch', 'ICT'],
            ['1997160000128', 'BHRV 12 tháng Apple Watch', 2, 'Apple Watch', 'ICT'],
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(mockProductRows);
        XLSX.utils.book_append_sheet(wb, ws, 'Bảo Hiểm ĐMX');
        const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const mockFile = new File([u8], 'test-product-code.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const parsed = await parseExcelProductCodeConfigFile(mockFile);
        expect(parsed.length).toBe(2);
        expect(parsed[0].maSanPham).toBe('1997139000289');
        expect(parsed[0].heSo).toBe(3);
        expect(parsed[1].maSanPham).toBe('1997160000128');
        expect(parsed[1].heSo).toBe(2);
    });
});


