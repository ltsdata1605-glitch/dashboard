import { describe, it, expect } from 'vitest';
import {
    getCurrentRangeDefault,
    getMonthRange,
    getComparePeriodDefault,
    getSamePeriodPreviousMonth,
    listRecentMonths,
} from '../../features/bi-dashboard/utils/bonusDateRange';

describe('bonusDateRange - Kiểm tra tính khoảng thời gian đổ thưởng chuẩn xác', () => {
    it('ngày 19/10/2026: kỳ Hiện tại phải là từ 01/10/2026 -> 18/10/2026 (ngày hiện tại - 1)', () => {
        const oct19 = new Date(2026, 9, 19, 8, 30, 0); // 19/10/2026
        const range = getCurrentRangeDefault(oct19);
        expect(range.fromDate).toBe('01/10/2026');
        expect(range.toDate).toBe('18/10/2026');
        expect(range.isFullPreviousMonth).toBe(false);
    });

    it('ngày 02/10/2026: kỳ Hiện tại phải là 01/10/2026 -> 01/10/2026', () => {
        const oct2 = new Date(2026, 9, 2, 10, 0, 0);
        const range = getCurrentRangeDefault(oct2);
        expect(range.fromDate).toBe('01/10/2026');
        expect(range.toDate).toBe('01/10/2026');
        expect(range.isFullPreviousMonth).toBe(false);
    });

    it('ngày 01/10/2026: ngày 01 tự động lấy trọn tháng trước (01/09/2026 -> 30/09/2026)', () => {
        const oct1 = new Date(2026, 9, 1, 6, 0, 0);
        const range = getCurrentRangeDefault(oct1);
        expect(range.fromDate).toBe('01/09/2026');
        expect(range.toDate).toBe('30/09/2026');
        expect(range.isFullPreviousMonth).toBe(true);
    });

    it('getMonthRange cho tháng hiện tại vào ngày 19/10/2026 phải là 01/10/2026 -> 18/10/2026', () => {
        const oct19 = new Date(2026, 9, 19, 8, 30, 0);
        const range = getMonthRange('2026-10', oct19);
        expect(range.fromDate).toBe('01/10/2026');
        expect(range.toDate).toBe('18/10/2026');
    });

    it('getComparePeriodDefault vào ngày 19/10/2026: so sánh 01-18/10 với 01-18/09', () => {
        const oct19 = new Date(2026, 9, 19, 8, 30, 0);
        const compare = getComparePeriodDefault(oct19);
        expect(compare.current.fromDate).toBe('01/10/2026');
        expect(compare.current.toDate).toBe('18/10/2026');
        expect(compare.previous.fromDate).toBe('01/09/2026');
        expect(compare.previous.toDate).toBe('18/09/2026');
    });
});
