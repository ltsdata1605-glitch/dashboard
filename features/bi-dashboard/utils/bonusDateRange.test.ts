import { describe, expect, it } from 'vitest';
import {
    getComparePeriodDefault,
    getSamePeriodPreviousMonth,
    formatShortRange,
    getYearMonthPlan,
} from './bonusDateRange';

describe('getSamePeriodPreviousMonth — cùng kỳ tháng trước', () => {
    it('lùi đúng 1 tháng, giữ nguyên số ngày đầu/cuối', () => {
        expect(getSamePeriodPreviousMonth({ fromDate: '01/09/2026', toDate: '21/09/2026' }))
            .toEqual({ fromDate: '01/08/2026', toDate: '21/08/2026' });
    });
    it('kẹp ngày cuối theo độ dài tháng trước (30/03 -> 28/02)', () => {
        expect(getSamePeriodPreviousMonth({ fromDate: '01/03/2026', toDate: '30/03/2026' }))
            .toEqual({ fromDate: '01/02/2026', toDate: '28/02/2026' });
        expect(getSamePeriodPreviousMonth({ fromDate: '01/05/2026', toDate: '31/05/2026' }))
            .toEqual({ fromDate: '01/04/2026', toDate: '30/04/2026' });
    });
    it('tháng 1 -> tháng 12 năm trước', () => {
        expect(getSamePeriodPreviousMonth({ fromDate: '01/01/2027', toDate: '15/01/2027' }))
            .toEqual({ fromDate: '01/12/2026', toDate: '15/12/2026' });
    });
    it('chuỗi không hợp lệ -> trả nguyên', () => {
        const bad = { fromDate: 'x', toDate: 'y' };
        expect(getSamePeriodPreviousMonth(bad)).toEqual(bad);
    });
});

describe('getComparePeriodDefault — ví dụ chủ dự án: hôm nay 22/9', () => {
    it('so 01→21/08 với 01→21/09', () => {
        const r = getComparePeriodDefault(new Date(2026, 8, 22));
        expect(r.current).toEqual({ fromDate: '01/09/2026', toDate: '21/09/2026' });
        expect(r.previous).toEqual({ fromDate: '01/08/2026', toDate: '21/08/2026' });
        expect(r.isFullPreviousMonth).toBe(false);
    });
    it('ngày 01 -> trọn tháng trước vs trọn tháng trước nữa', () => {
        const r = getComparePeriodDefault(new Date(2026, 9, 1));
        expect(r.current).toEqual({ fromDate: '01/09/2026', toDate: '30/09/2026' });
        expect(r.previous).toEqual({ fromDate: '01/08/2026', toDate: '30/08/2026' });
        expect(r.isFullPreviousMonth).toBe(true);
    });
});

describe('formatShortRange', () => {
    it('rút gọn "01→21/9"', () => {
        expect(formatShortRange({ fromDate: '01/09/2026', toDate: '21/09/2026' })).toBe('01→21/9');
        expect(formatShortRange({ fromDate: '01/08/2026', toDate: '21/08/2026' })).toBe('01→21/8');
    });
});

describe('getYearMonthPlan — kế hoạch chạy năm và hỗ trợ tiếp tục', () => {
    it('chạy từ tháng 5 đến tháng 8 của năm 2026', () => {
        const now = new Date(2026, 8, 25); // Tháng 9/2026
        const plan = getYearMonthPlan(2026, now, 4, 7); // tháng 5 (index 4) -> tháng 8 (index 7)
        expect(plan).toHaveLength(4);
        expect(plan[0].label).toBe('5/2026');
        expect(plan[3].label).toBe('8/2026');
    });

    it('chạy trọn năm 2025 (năm quá khứ) đủ 12 tháng', () => {
        const now = new Date(2026, 8, 25);
        const plan = getYearMonthPlan(2025, now);
        expect(plan).toHaveLength(12);
        expect(plan[0].label).toBe('1/2025');
        expect(plan[11].label).toBe('12/2025');
    });
});

