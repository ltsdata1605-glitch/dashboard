import { describe, expect, it } from 'vitest';
import { SavedTaxRecord } from '../types/tax.types';
import { groupRecordsByMonth, monthKeyOfRecord } from './taxHistoryGrouping';

const rec = (over: Partial<SavedTaxRecord>): SavedTaxRecord => ({
    name: 'A',
    totalIncome: 0,
    dependents: 0,
    proxyAmount: 0,
    taxOnProxyAmount: 0,
    createdAt: '2026-09-23T10:00:00.000Z',
    ...over,
});

describe('monthKeyOfRecord', () => {
    it('ưu tiên tháng lương trên phiếu, nhận nhiều kiểu viết', () => {
        expect(monthKeyOfRecord(rec({ monthYear: '08/2026' }))).toBe('2026-08');
        expect(monthKeyOfRecord(rec({ monthYear: '8/2026' }))).toBe('2026-08');
        expect(monthKeyOfRecord(rec({ monthYear: 'Tháng 08/2026' }))).toBe('2026-08');
        expect(monthKeyOfRecord(rec({ monthYear: 'T08-2026' }))).toBe('2026-08');
        expect(monthKeyOfRecord(rec({ monthYear: '2026-08' }))).toBe('2026-08');
    });

    it('không có tháng lương thì lấy tháng tạo bản ghi', () => {
        expect(monthKeyOfRecord(rec({ createdAt: '2026-07-05T03:00:00.000Z' }))).toBe('2026-07');
        expect(monthKeyOfRecord(rec({ monthYear: 'không rõ' }))).toBe('2026-09');
    });

    it('bỏ qua tháng vô lý (13/2026) để không tạo nhóm rác', () => {
        expect(monthKeyOfRecord(rec({ monthYear: '13/2026' }))).toBe('2026-09');
    });
});

describe('groupRecordsByMonth', () => {
    it('gom theo tháng, tháng mới nhất lên đầu, trong tháng bản ghi mới lên đầu', () => {
        const groups = groupRecordsByMonth([
            rec({ name: 'cu', monthYear: '07/2026', createdAt: '2026-08-05T01:00:00.000Z', taxOnProxyAmount: 100 }),
            rec({ name: 'moi', monthYear: '08/2026', createdAt: '2026-09-05T01:00:00.000Z', taxOnProxyAmount: 200 }),
            rec({ name: 'moi-hon', monthYear: '08/2026', createdAt: '2026-09-06T01:00:00.000Z', taxOnProxyAmount: 300, proxyAmount: 50 }),
        ]);

        expect(groups.map(g => g.label)).toEqual(['Tháng 8/2026', 'Tháng 7/2026']);
        expect(groups[0].records.map(r => r.name)).toEqual(['moi-hon', 'moi']);
        expect(groups[0].totalTax).toBe(500);
        expect(groups[0].totalProxy).toBe(50);
        expect(groups[1].records).toHaveLength(1);
    });

    it('danh sách rỗng trả về mảng rỗng', () => {
        expect(groupRecordsByMonth([])).toEqual([]);
    });
});
