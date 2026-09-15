import { describe, it, expect } from 'vitest';
import { isSameEmployee } from '../../../utils/nhanVienHelpers';
import { getRevenueForEmployee, computeTierThresholds, getCellColor, TierThresholds } from './bonusTableHelpers';
import { getBonusForEmployee } from '../../../utils/bonusParser';
import { RevenueRow } from '../../../types/nhanVienTypes';

describe('Employee Revenue Matching in Bonus Tab', () => {
    describe('isSameEmployee', () => {
        it('correctly matches employee in Analysis short format with raw Revenue canonical format', () => {
            // Examples from actual user screenshots
            expect(isSameEmployee('111395 - C.Tâm', 'Cao Đăng Trí Tâm - 111395')).toBe(true);
            expect(isSameEmployee('107617 - A.Nhân', 'Nguyễn Anh Nhân - 107617')).toBe(true);
            expect(isSameEmployee('95970 - T.Út', 'Trần Út - 95970')).toBe(true);
            expect(isSameEmployee('140138 - M.Duy', '140138 - Mai Duy')).toBe(true);
            expect(isSameEmployee('51115 - T.Thu', 'Trịnh Thu - 51115')).toBe(true);
        });

        it('matches by raw employee ID', () => {
            expect(isSameEmployee('111395', 'Cao Đăng Trí Tâm - 111395')).toBe(true);
            expect(isSameEmployee('111395 - C.Tâm', '111395')).toBe(true);
        });

        it('returns false for different employees', () => {
            expect(isSameEmployee('111395 - C.Tâm', '95970 - T.Út')).toBe(false);
            expect(isSameEmployee('111395', '95970')).toBe(false);
            expect(isSameEmployee(undefined, '111395')).toBe(false);
        });
    });

    describe('getRevenueForEmployee', () => {
        const mockRevenueRow1: RevenueRow = {
            type: 'employee',
            name: '111395 - C.Tâm',
            originalName: 'Cao Đăng Trí Tâm - 111395',
            department: 'BP ALL IN ONE - DMX',
            dtlk: 279,
            dtqd: 437,
            hieuQuaQD: 0.57,
            soLuong: 10,
        };

        const mockRevenueRow2: RevenueRow = {
            type: 'employee',
            name: '107617 - A.Nhân',
            originalName: 'Nguyễn Anh Nhân - 107617',
            department: 'BP ALL IN ONE - DMX',
            dtlk: 384,
            dtqd: 573,
            hieuQuaQD: 0.49,
            soLuong: 15,
        };

        // Build revenueMap as in useBonusViewData
        const revenueMap = new Map<string, RevenueRow>();
        [mockRevenueRow1, mockRevenueRow2].forEach(r => {
            if (r.originalName) {
                revenueMap.set(r.originalName, r);
                revenueMap.set(r.originalName.toLowerCase().trim(), r);
                const id = r.originalName.match(/\d+/)?.[0];
                if (id) revenueMap.set(id, r);
            }
            if (r.name) {
                revenueMap.set(r.name, r);
                revenueMap.set(r.name.toLowerCase().trim(), r);
                const id = r.name.match(/\d+/)?.[0];
                if (id) revenueMap.set(id, r);
            }
        });

        it('finds RevenueRow when employee in BonusTab has originalName as short form from Analysis', () => {
            // When Analysis is active, item.originalName in BonusTab is '111395 - C.Tâm'
            const result = getRevenueForEmployee(revenueMap, '111395 - C.Tâm', '111395 - C.Tâm');
            expect(result).toBeDefined();
            expect(result?.dtqd).toBe(437);
            expect(Math.round((result?.hieuQuaQD || 0) * 100)).toBe(57);
        });

        it('finds RevenueRow for 107617 - A.Nhân', () => {
            const result = getRevenueForEmployee(revenueMap, '107617 - A.Nhân', '107617 - A.Nhân');
            expect(result).toBeDefined();
            expect(result?.dtqd).toBe(573);
            expect(Math.round((result?.hieuQuaQD || 0) * 100)).toBe(49);
        });

        it('finds RevenueRow when queried by canonical originalName', () => {
            const result = getRevenueForEmployee(revenueMap, 'Cao Đăng Trí Tâm - 111395');
            expect(result).toBeDefined();
            expect(result?.dtqd).toBe(437);
        });

        it('returns undefined when employee is not in revenueMap', () => {
            const result = getRevenueForEmployee(revenueMap, '999999 - Unknown');
            expect(result).toBeUndefined();
        });
    });

    describe('getBonusForEmployee', () => {
        const mockBonusData = {
            // Old record from 5/9/2026 (stored as Name - ID) with old bonus 5.513
            'Nguyễn Chí Tâm - 111395': {
                erp: 2500000,
                tNong: 3012732,
                tong: 5512732,
                dKien: 20000000,
                pNong: 54.6,
                updatedAt: '12:03:13 5/9/2026',
            },
            // Latest record from 9/9/2026 (stored as ID - Name) with new bonus 8.219
            '111395 - Nguyễn Chí Tâm': {
                erp: 3945481,
                tNong: 4264960,
                tong: 8218441,
                dKien: 30820000,
                pNong: 51.9,
                updatedAt: '20:16:34 9/9/2026',
            },
        };

        it('resolves the latest bonus (8.219) even when queried with the old canonical name (Nguyễn Chí Tâm - 111395)', () => {
            const result = getBonusForEmployee(mockBonusData, 'Nguyễn Chí Tâm - 111395');
            expect(result).toBeDefined();
            expect(result?.tong).toBe(8218441);
            expect(Math.ceil((result?.tong || 0) / 1000)).toBe(8219);
        });

        it('resolves the latest bonus (8.219) when queried with raw short revenue name (111395 - C.Tâm)', () => {
            const result = getBonusForEmployee(mockBonusData, '111395 - C.Tâm', '111395 - C.Tâm');
            expect(result).toBeDefined();
            expect(result?.tong).toBe(8218441);
            expect(Math.ceil((result?.tong || 0) / 1000)).toBe(8219);
        });

        it('resolves the latest bonus (8.219) when queried with employee ID directly (111395)', () => {
            const result = getBonusForEmployee(mockBonusData, '111395');
            expect(result).toBeDefined();
            expect(result?.tong).toBe(8218441);
        });
    });

    describe('computeTierThresholds & getCellColor (TOP 30%, BOT, Trung tính)', () => {
        it('calculates average and top 30% cutoff correctly for a team of 10', () => {
            const vals = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
            const thresholds = computeTierThresholds(vals);
            // sum = 550, avg = 55
            expect(thresholds.avg).toBe(55);
            // top 30% of 10 is 3 items -> index 2 -> value 80
            expect(thresholds.top30).toBe(80);

            // TOP 30%
            expect(getCellColor(100, thresholds)).toContain('text-emerald-600');
            expect(getCellColor(80, thresholds)).toContain('text-emerald-600');

            // Trung tính (>= 55 and < 80)
            expect(getCellColor(70, thresholds)).toContain('text-slate-700');
            expect(getCellColor(60, thresholds)).toContain('text-slate-700');
            expect(getCellColor(55, thresholds)).toContain('text-slate-700');

            // BOT (< 55)
            expect(getCellColor(50, thresholds)).toContain('text-rose-600');
            expect(getCellColor(10, thresholds)).toContain('text-rose-600');
        });

        it('handles missing or empty data gracefully', () => {
            const thresholds = computeTierThresholds([]);
            expect(thresholds.avg).toBe(0);
            expect(thresholds.top30).toBe(0);

            expect(getCellColor(0, thresholds, false)).toContain('text-slate-400');
            expect(getCellColor(0, thresholds, true)).toContain('text-slate-400');
        });

        it('excludes 0 values from average and top 30% cutoff calculation', () => {
            // 4 valid values [100, 80, 60, 40] + two 0s
            const vals = [100, 0, 80, 60, 0, 40];
            const thresholds = computeTierThresholds(vals);
            // 4 valid values: sum = 280, avg = 70
            expect(thresholds.avg).toBe(70);
            // top 30% of 4 is Math.ceil(1.2) = 2 items -> sorted[1] = 80
            expect(thresholds.top30).toBe(80);

            expect(getCellColor(100, thresholds)).toContain('text-emerald-600');
            expect(getCellColor(80, thresholds)).toContain('text-emerald-600');
            expect(getCellColor(60, thresholds)).toContain('text-rose-600'); // 60 < 70 (BOT)
        });
    });
});

