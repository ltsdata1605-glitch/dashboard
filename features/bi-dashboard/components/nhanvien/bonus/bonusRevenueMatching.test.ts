import { describe, it, expect } from 'vitest';
import { isSameEmployee } from '../../../utils/nhanVienHelpers';
import { getRevenueForEmployee } from './bonusTableHelpers';
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
});

