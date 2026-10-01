import { describe, it, expect } from 'vitest';
import { getMonthProgress, extractDateFromData, calculateRunRate } from './metricService';

describe('extractDateFromData — Trích xuất ngày tháng từ text báo cáo', () => {
    it('trích xuất từ format cập nhật lúc đầy đủ', () => {
        expect(extractDateFromData('Tìm báo cáo... Cập nhật lúc: 12:11:05 20/9/2026')).toEqual({
            day: 20,
            month: 9,
            year: 2026,
        });
        expect(extractDateFromData('Cập nhật lúc 10:00 30/09/2026')).toEqual({
            day: 30,
            month: 9,
            year: 2026,
        });
    });

    it('trích xuất từ định dạng đến ngày DD/MM', () => {
        expect(extractDateFromData('DOANH THU ĐẾN NGÀY 30/9')).toEqual({
            day: 30,
            month: 9,
        });
        expect(extractDateFromData('Đến ngày 15/10')).toEqual({
            day: 15,
            month: 10,
        });
    });

    it('trích xuất từ định dạng tháng/năm MM/YYYY', () => {
        expect(extractDateFromData('BÁO CÁO THÁNG 09/2026')).toEqual({
            month: 9,
            year: 2026,
        });
    });
});

describe('getMonthProgress & calculateRunRate khi đổ dữ liệu tháng đã qua', () => {
    it('khi đổ dữ liệu kết thúc tháng 9 (30/9) lúc đang ở tháng 10: dự kiến đúng bằng thực tế đạt được', () => {
        const now = new Date(2026, 9, 1); // 1/10/2026
        const detected = { day: 30, month: 9, year: 2026 };
        const progress = getMonthProgress(now, detected);

        expect(progress.daysInMonth).toBe(30); // Tháng 9 có 30 ngày, KHÔNG phải 31 ngày của tháng 10
        expect(progress.daysPassed).toBe(30);
        expect(progress.isPastMonth).toBe(true);

        const dtqd = 2.215;
        const duKien = calculateRunRate(dtqd, progress.daysPassed, progress.daysInMonth);
        // (2.215 / 30) * 30 = 2.215 (chứ không phải 68.665 do chia 1 nhân 31)
        expect(duKien).toBeCloseTo(2.215, 4);
    });

    it('khi đổ dữ liệu ngày 20/9 của tháng 9 lúc đang ở tháng 10: dự kiến theo 30 ngày của tháng 9', () => {
        const now = new Date(2026, 9, 5); // 5/10/2026
        const detected = { day: 20, month: 9, year: 2026 };
        const progress = getMonthProgress(now, detected);

        expect(progress.daysInMonth).toBe(30);
        expect(progress.daysPassed).toBe(20);

        const dtqd = 2.0;
        const duKien = calculateRunRate(dtqd, progress.daysPassed, progress.daysInMonth);
        // (2.0 / 20) * 30 = 3.0
        expect(duKien).toBeCloseTo(3.0, 4);
    });

    it('tự động nhận diện ngày 30 khi hiện tại là ngày 1 đầu tháng là của tháng trước', () => {
        const now = new Date(2026, 9, 1); // 1/10/2026
        const detected = { day: 30 }; // Chỉ trích xuất được số 30
        const progress = getMonthProgress(now, detected);

        expect(progress.month).toBe(9);
        expect(progress.daysInMonth).toBe(30);
        expect(progress.daysPassed).toBe(30);
    });
});
