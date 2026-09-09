import { describe, it, expect } from 'vitest';
import {
    computePeriodRanges,
    clampToDataMaxDate,
    findDataMaxDate,
    filterRowsInRange,
    PERIOD_MODES,
    type PeriodMode,
} from './periodService';

/**
 * Test cho cơ chế so sánh kỳ dùng chung. Tập trung vào các ca DỄ SAI của lịch — đây là loại lỗi
 * không lộ ra ngay mà âm thầm cho ra số sai: quý 1 phải lùi về quý 4 năm trước, ngày 31 lùi về
 * tháng chỉ có 28-30 ngày, tuần cuối tháng ngắn hơn 7 ngày, năm nhuận.
 */

const d = (s: string) => new Date(s);
const ymd = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

describe('computePeriodRanges — theo NGÀY', () => {
    it('ngày liền kề: lùi đúng 1 ngày', () => {
        const r = computePeriodRanges('day_adjacent', { selectedDate: '2026-09-09', selectedMonth: '2026-09' })!;
        expect(ymd(r.currentStart)).toBe('2026-09-09');
        expect(ymd(r.prevStart)).toBe('2026-09-08');
        expect(r.currentEnd.getHours()).toBe(23);
    });

    it('lùi qua ranh giới THÁNG: 1/9 → 31/8', () => {
        const r = computePeriodRanges('day_adjacent', { selectedDate: '2026-09-01', selectedMonth: '2026-09' })!;
        expect(ymd(r.prevStart)).toBe('2026-08-31');
    });

    it('cùng kỳ tháng trước, ca DỄ SAI: 31/3 lùi về 28/2 chứ KHÔNG tràn sang 2/3 hay 3/3', () => {
        const r = computePeriodRanges('day_same_period', { selectedDate: '2026-03-31', selectedMonth: '2026-03' })!;
        expect(ymd(r.prevStart)).toBe('2026-02-28');
    });

    it('cùng kỳ tháng trước, NĂM NHUẬN: 31/3/2024 lùi về 29/2/2024', () => {
        const r = computePeriodRanges('day_same_period', { selectedDate: '2024-03-31', selectedMonth: '2024-03' })!;
        expect(ymd(r.prevStart)).toBe('2024-02-29');
    });
});

describe('computePeriodRanges — theo THÁNG và QUÝ', () => {
    it('tháng liền kề: tháng 1 lùi về tháng 12 NĂM TRƯỚC', () => {
        const r = computePeriodRanges('month_adjacent', { selectedDate: '2026-01-15', selectedMonth: '2026-01' })!;
        expect(ymd(r.currentStart)).toBe('2026-01-01');
        expect(ymd(r.prevStart)).toBe('2025-12-01');
        expect(ymd(r.prevEnd)).toBe('2025-12-31');
    });

    it('tháng cùng kỳ năm trước giữ nguyên số tháng', () => {
        const r = computePeriodRanges('month_same_period_year', { selectedDate: '2026-09-09', selectedMonth: '2026-09' })!;
        expect(ymd(r.currentStart)).toBe('2026-09-01');
        expect(ymd(r.prevStart)).toBe('2025-09-01');
        expect(ymd(r.prevEnd)).toBe('2025-09-30');
    });

    it('quý liền kề, ca DỄ SAI: Quý 1 lùi về Quý 4 NĂM TRƯỚC (không phải "quý 0")', () => {
        const r = computePeriodRanges('quarter_adjacent', { selectedDate: '2026-02-10', selectedMonth: '2026-02' })!;
        expect(ymd(r.currentStart)).toBe('2026-01-01');
        expect(ymd(r.currentEnd)).toBe('2026-03-31');
        expect(ymd(r.prevStart)).toBe('2025-10-01');
        expect(ymd(r.prevEnd)).toBe('2025-12-31');
    });

    it('quý giữa năm lùi trong cùng năm', () => {
        const r = computePeriodRanges('quarter_adjacent', { selectedDate: '2026-08-01', selectedMonth: '2026-08' })!;
        expect(ymd(r.currentStart)).toBe('2026-07-01');
        expect(ymd(r.prevStart)).toBe('2026-04-01');
        expect(ymd(r.prevEnd)).toBe('2026-06-30');
    });

    it('quý cùng kỳ năm trước', () => {
        const r = computePeriodRanges('quarter_same_period_year', { selectedDate: '2026-08-01', selectedMonth: '2026-08' })!;
        expect(ymd(r.prevStart)).toBe('2025-07-01');
        expect(ymd(r.prevEnd)).toBe('2025-09-30');
    });
});

describe('computePeriodRanges — theo TUẦN', () => {
    it('tuần liền kề trong tháng', () => {
        const r = computePeriodRanges('week_adjacent', { selectedDate: '2026-09-09', selectedMonth: '2026-09', selectedWeekId: 2 })!;
        expect(ymd(r.currentStart)).toBe('2026-09-08');
        expect(ymd(r.prevStart)).toBe('2026-09-01');
    });

    it('TUẦN 1 không có tuần trước trong tháng → kỳ trước trùng kỳ này (chênh lệch 0), không vỡ', () => {
        const r = computePeriodRanges('week_adjacent', { selectedDate: '2026-09-01', selectedMonth: '2026-09', selectedWeekId: 1 })!;
        expect(r.prevStart.getTime()).toBe(r.currentStart.getTime());
        expect(r.description).toContain('Không có tuần trước liền kề');
    });

    it('tuần cùng kỳ tháng trước: tháng trước ít tuần hơn thì KẸP lại, không trả rỗng', () => {
        // Tháng 3/2026 có 5 tuần; tháng 2/2026 chỉ có 4 tuần → chọn tuần 5 phải kẹp về tuần 4.
        const r = computePeriodRanges('week_same_period', { selectedDate: '2026-03-30', selectedMonth: '2026-03', selectedWeekId: 5 });
        expect(r, 'không được trả null chỉ vì tháng trước ít tuần hơn').not.toBeNull();
        expect(r!.prevStart.getMonth(), 'kỳ trước phải nằm trong tháng 2').toBe(1);
    });

    it('chọn tuần không tồn tại trong tháng → trả null để nơi gọi hiện trạng thái rỗng', () => {
        expect(computePeriodRanges('week_adjacent', { selectedDate: '2026-09-01', selectedMonth: '2026-09', selectedWeekId: 99 })).toBeNull();
    });
});

describe('computePeriodRanges — YTD và khoảng tuỳ chọn', () => {
    it('YTD: từ 1/1 đến ngày chọn, so với cùng khoảng năm trước', () => {
        const r = computePeriodRanges('ytd_same_period_year', { selectedDate: '2026-09-09', selectedMonth: '2026-09' })!;
        expect(ymd(r.currentStart)).toBe('2026-01-01');
        expect(ymd(r.currentEnd)).toBe('2026-09-09');
        expect(ymd(r.prevStart)).toBe('2025-01-01');
        expect(ymd(r.prevEnd)).toBe('2025-09-09');
    });

    it('khoảng tuỳ chọn dùng đúng 2 khoảng người dùng nhập', () => {
        const r = computePeriodRanges('custom_range', {
            selectedDate: '2026-09-09', selectedMonth: '2026-09',
            customRangeA: { start: '2026-09-01', end: '2026-09-07' },
            customRangeB: { start: '2026-08-01', end: '2026-08-07' },
        })!;
        expect(ymd(r.currentStart)).toBe('2026-09-01');
        expect(ymd(r.prevEnd)).toBe('2026-08-07');
    });

    it('thiếu khoảng tuỳ chọn hoặc ngày không hợp lệ → null chứ không ném lỗi', () => {
        expect(computePeriodRanges('custom_range', { selectedDate: '2026-09-09', selectedMonth: '2026-09' })).toBeNull();
        expect(computePeriodRanges('day_adjacent', { selectedDate: 'không-phải-ngày', selectedMonth: '2026-09' })).toBeNull();
    });

    it('mọi chế độ khai báo trong PERIOD_MODES đều tính được (không có mục chết trong dropdown)', () => {
        for (const m of PERIOD_MODES) {
            const r = computePeriodRanges(m.id as PeriodMode, {
                selectedDate: '2026-09-09', selectedMonth: '2026-09', selectedWeekId: 2,
                customRangeA: { start: '2026-09-01', end: '2026-09-07' },
                customRangeB: { start: '2026-08-01', end: '2026-08-07' },
            });
            expect(r, `chế độ "${m.label}" không tính được khoảng ngày`).not.toBeNull();
            expect(r!.currentEnd.getTime(), `chế độ "${m.label}" có khoảng ngày ngược`).toBeGreaterThanOrEqual(r!.currentStart.getTime());
        }
    });
});

describe('clampToDataMaxDate — so cùng độ dài kỳ', () => {
    it('tháng mới chạy 8 ngày: cắt kỳ trước còn đúng 8 ngày để so cho công bằng', () => {
        const base = computePeriodRanges('month_adjacent', { selectedDate: '2026-09-08', selectedMonth: '2026-09' })!;
        const r = clampToDataMaxDate(base, d('2026-09-08T10:00:00'));

        expect(ymd(r.currentEnd)).toBe('2026-09-08');
        expect(ymd(r.prevStart)).toBe('2026-08-01');
        expect(ymd(r.prevEnd), 'kỳ trước phải cắt còn 8 ngày đầu tháng 8').toBe('2026-08-08');
    });

    it('không cắt khi ngày dữ liệu nằm NGOÀI kỳ hiện tại', () => {
        const base = computePeriodRanges('month_adjacent', { selectedDate: '2026-09-08', selectedMonth: '2026-09' })!;
        const r = clampToDataMaxDate(base, d('2026-07-15'));
        expect(r.currentEnd.getTime()).toBe(base.currentEnd.getTime());
    });

    it('không có dữ liệu → giữ nguyên khoảng gốc', () => {
        const base = computePeriodRanges('month_adjacent', { selectedDate: '2026-09-08', selectedMonth: '2026-09' })!;
        expect(clampToDataMaxDate(base, null)).toBe(base);
    });

    it('không để kỳ trước TRÀN quá ranh giới gốc của nó', () => {
        // Tháng 3 (31 ngày) so với tháng 2 (28 ngày): dữ liệu tới 31/3 thì kỳ trước không được
        // tràn sang tháng 3 mà phải dừng ở 28/2.
        const base = computePeriodRanges('month_adjacent', { selectedDate: '2026-03-31', selectedMonth: '2026-03' })!;
        const r = clampToDataMaxDate(base, d('2026-03-31T23:00:00'));
        expect(r.prevEnd.getMonth(), 'kỳ trước bị tràn sang tháng khác').toBe(1);
        expect(ymd(r.prevEnd)).toBe('2026-02-28');
    });
});

describe('findDataMaxDate / filterRowsInRange', () => {
    it('tìm đúng ngày lớn nhất, bỏ qua dòng thiếu ngày', () => {
        const rows = [{ parsedDate: d('2026-09-01') }, { parsedDate: undefined }, { parsedDate: d('2026-09-05') }];
        expect(ymd(findDataMaxDate(rows)!)).toBe('2026-09-05');
        expect(findDataMaxDate([])).toBeNull();
        expect(findDataMaxDate([{ parsedDate: undefined }])).toBeNull();
    });

    it('lọc đúng theo khoảng, bao gồm 2 đầu mút', () => {
        const rows = [
            { id: 'a', parsedDate: d('2026-09-01T00:00:00') },
            { id: 'b', parsedDate: d('2026-09-05T12:00:00') },
            { id: 'c', parsedDate: d('2026-09-10T00:00:00') },
            { id: 'd', parsedDate: undefined },
        ];
        const out = filterRowsInRange(rows, d('2026-09-01T00:00:00'), d('2026-09-05T23:59:59'));
        expect(out.map(r => r.id)).toEqual(['a', 'b']);
    });
});
