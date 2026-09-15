import { describe, test, expect } from 'vitest';

describe('Check Thưởng - TOP Supermarkets Logic', () => {
    // Mock COLS object
    const COLS = {
        KENH: 3,
        SIÊU_THỊ: 4,
        NGANH_HANG: 5,
        PERCENT_DU_KIEN: 6,
        TONG_THUONG: 13
    };

    // Mock parseNumber function
    const parseNumber = (val: any): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        let str = String(val).trim();
        if (str === '-' || str === '') return 0;
        str = str.replace(/[^\d.,-]/g, '');
        const hasDot = str.includes('.');
        const hasComma = str.includes(',');
        if (hasDot && hasComma) {
            const lastDot = str.lastIndexOf('.');
            const lastComma = str.lastIndexOf(',');
            if (lastComma > lastDot) {
                str = str.replace(/\./g, '').replace(',', '.');
            } else {
                str = str.replace(/,/g, '');
            }
        } else if (hasComma) {
            if (str.split(',').length > 2 || str.match(/,\d{3}$/)) {
                str = str.replace(/,/g, '');
            } else {
                str = str.replace(',', '.');
            }
        } else if (hasDot) {
            if (str.split('.').length > 2 || str.match(/\.\d{3}$/)) {
                str = str.replace(/\./g, '');
            }
        }
        return parseFloat(str) || 0;
    };

    // Implemented logic from check-thuong.html
    const calculateTopSupermarkets = (data: any[]) => {
        const supermarketMap: any = {};
        data.forEach(row => {
            const kenh = row[COLS.KENH] || 'N/A';
            const sieuThi = row[COLS.SIÊU_THỊ];
            const thuong = parseNumber(row[COLS.TONG_THUONG]);
            const percentDuKien = parseNumber(row[COLS.PERCENT_DU_KIEN]);

            if (!sieuThi) return;

            if (!supermarketMap[sieuThi]) {
                supermarketMap[sieuThi] = {
                    sieuThi: sieuThi,
                    kenh: kenh,
                    tongThuong: 0,
                    soNhom: 0,
                    soNhomDat: 0,
                    tongPercentTarget: 0
                };
            }

            supermarketMap[sieuThi].tongThuong += thuong;
            supermarketMap[sieuThi].soNhom += 1;
            supermarketMap[sieuThi].tongPercentTarget += percentDuKien;

            if (percentDuKien >= 1) {
                supermarketMap[sieuThi].soNhomDat += 1;
            }
        });

        const topList = Object.values(supermarketMap)
            .sort((a: any, b: any) => b.tongThuong - a.tongThuong);

        return {
            all: topList,
            top20: topList.slice(0, 20)
        };
    };

    test('should calculate top supermarkets with correct totals', () => {
        const testData = [
            [undefined, undefined, undefined, 'Channel A', '910 - Siêu Thị 1', 'Ngành 1', 1.0, undefined, undefined, undefined, undefined, undefined, undefined, 1000000],
            [undefined, undefined, undefined, 'Channel A', '910 - Siêu Thị 1', 'Ngành 2', 0.8, undefined, undefined, undefined, undefined, undefined, undefined, 500000],
            [undefined, undefined, undefined, 'Channel B', '920 - Siêu Thị 2', 'Ngành 1', 1.0, undefined, undefined, undefined, undefined, undefined, undefined, 2000000],
        ];

        const result = calculateTopSupermarkets(testData);

        // Verify data structure
        expect(result.all).toBeDefined();
        expect(result.top20).toBeDefined();

        // Verify top 20 is subset of all
        expect(result.top20.length).toBeLessThanOrEqual(result.all.length);

        // Verify sorting (highest bonus first)
        expect(result.all[0].tongThuong).toBeGreaterThanOrEqual(result.all[1]?.tongThuong || 0);

        // Verify aggregation
        const sieuThi1 = result.all.find((s: any) => s.sieuThi === '910 - Siêu Thị 1');
        expect(sieuThi1?.tongThuong).toBe(1500000); // 1M + 500k
        expect(sieuThi1?.soNhom).toBe(2);
        expect(sieuThi1?.soNhomDat).toBe(1); // Only 1 >= 100%
    });

    test('should handle empty data gracefully', () => {
        const result = calculateTopSupermarkets([]);
        expect(result.all).toEqual([]);
        expect(result.top20).toEqual([]);
    });

    test('should group by channel correctly', () => {
        const testData = [
            [undefined, undefined, undefined, 'Channel A', '910 - ST1', 'Ngành 1', 1.0, undefined, undefined, undefined, undefined, undefined, undefined, 1000000],
            [undefined, undefined, undefined, 'Channel B', '920 - ST2', 'Ngành 1', 1.0, undefined, undefined, undefined, undefined, undefined, undefined, 2000000],
        ];

        const result = calculateTopSupermarkets(testData);

        expect(result.all.length).toBe(2);
        expect(result.all[0].kenh).toBeDefined();
        expect(result.all[1].kenh).toBeDefined();
    });

    test('should handle Vietnamese number format (1.000.000,50)', () => {
        const testData = [
            [undefined, undefined, undefined, 'Channel A', '910 - ST1', 'Ngành 1', 1.0, undefined, undefined, undefined, undefined, undefined, undefined, '1.000.000,50'],
        ];

        const result = calculateTopSupermarkets(testData);

        const st = result.all[0];
        expect(st.tongThuong).toBe(1000000.50);
    });

    test('should limit to top 20 correctly', () => {
        const testData = Array.from({ length: 25 }, (_, i) => [
            undefined, undefined, undefined, 'Channel A',
            `${910 + i} - ST${i}`, 'Ngành 1', 1.0,
            undefined, undefined, undefined, undefined, undefined, undefined,
            (25 - i) * 100000 // Descending order: 2.5M, 2.4M, ..., 0.1M
        ]);

        const result = calculateTopSupermarkets(testData);

        expect(result.all.length).toBe(25);
        expect(result.top20.length).toBe(20);

        // Top 20 should have highest values
        expect(result.top20[0].tongThuong).toBe(2500000);
        expect(result.top20[19].tongThuong).toBe(600000);
    });
});
