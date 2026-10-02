import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as db from '../utils/db';
import {
    getGlobalBonusEmployees,
    saveBonusBatchGlobal,
    saveBonusMonthlyGlobal,
    saveBonusPeriodLabelGlobal,
} from './globalBonusService';

vi.mock('../utils/db', () => {
    const store = new Map<string, any>();
    return {
        get: vi.fn(async (key: string) => store.get(key) ?? null),
        set: vi.fn(async (key: string, val: any) => { store.set(key, val); }),
        getAll: vi.fn(async () => Array.from(store.entries()).map(([key, value]) => ({ key, value }))),
        _store: store,
    };
});

describe('globalBonusService', () => {
    beforeEach(() => {
        (db as any)._store.clear();
        vi.clearAllMocks();
    });

    it('retrieves employees from config-*-danhsach when no analysis payload exists', async () => {
        const rawDS = `
1	111395 - Nguyễn Văn A	100,000,000
2	222456 - Trần Thị B	150,000,000
`;
        await db.set('nhanvien-active-supermarkets', ['Hùng Vương']);
        await db.set('config-Hùng Vương-danhsach', rawDS);

        const res = await getGlobalBonusEmployees();
        expect(res.employees.length).toBe(2);
        expect(res.employees[0].originalName).toContain('111395');
        expect(res.employeeSupermarketMap['111395 - Nguyễn Văn A']).toBe('Hùng Vương');
    });

    it('saves bonus batch entries directly to correct supermarket storage keys', async () => {
        const entries = [
            {
                originalName: '111395 - Nguyễn Văn A',
                metrics: { erp: 10, tNong: 0, tong: 10, dKien: 10, pNong: 0 },
            }
        ];
        const map = { '111395 - Nguyễn Văn A': 'Hùng Vương' };

        await saveBonusBatchGlobal(entries, map, 'Hùng Vương');

        const saved = await db.get('bonus-data-Hùng Vương');
        expect(saved).toBeDefined();
        expect(saved['111395 - Nguyễn Văn A'].erp).toBe(10);
    });

    it('saves monthly bonus to bonus-monthly-{safeName}-{yyyymm}', async () => {
        const entries = [
            {
                originalName: '111395 - Nguyễn Văn A',
                metrics: { erp: 50, tNong: 5, tong: 55, dKien: 55, pNong: 5 },
            }
        ];
        const map = { '111395 - Nguyễn Văn A': 'Hùng Vương' };

        await saveBonusMonthlyGlobal(entries, '2026-05', map, 'Hùng Vương');

        const saved = await db.get('bonus-monthly-Hùng Vương-2026-05');
        expect(saved).toBeDefined();
        expect(saved['111395 - Nguyễn Văn A'].erp).toBe(50);
    });

    it('saves period label globally', async () => {
        await saveBonusPeriodLabelGlobal('THÁNG 5/2026', ['Hùng Vương'], 'Hùng Vương');
        const label = await db.get('bonus-current-period-label-Hùng Vương');
        expect(label).toBe('THÁNG 5/2026');
    });
});
