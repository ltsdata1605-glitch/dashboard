import { describe, it, expect } from 'vitest';
import { resolveYcxMode, ycxDateRange, ycxSteps, formatYcxLuyKeTitle, formatYcxMonthTitle, cleanYcxFileName } from './ycxAutoSyncService';

/** YCX Luỹ kế (2026-10-01): Từ 01 đầu tháng → Đến HÔM QUA; bấm Luỹ kế ngày 01 thì chạy Realtime. */
describe('YCX Luỹ kế — quy tắc ngày', () => {
    it('ngày 15 → 01 → 14, giữ Luỹ kế', () => {
        const now = new Date(2026, 9, 15, 9);
        expect(resolveYcxMode('luyke', now)).toBe('luyke');
        expect(ycxDateRange('luyke', now)).toEqual({ from: '01/10/2026', to: '14/10/2026' });
    });
    it('ngày 02 → 01 → 01 (cùng tháng)', () => {
        expect(ycxDateRange('luyke', new Date(2026, 10, 2))).toEqual({ from: '01/11/2026', to: '01/11/2026' });
    });
    it('ngày 01 → Luỹ kế đổi thành Realtime', () => {
        expect(resolveYcxMode('luyke', new Date(2026, 9, 1, 23, 59))).toBe('realtime');
        expect(resolveYcxMode('realtime', new Date(2026, 9, 15))).toBe('realtime');
    });
    it('các bước hiển thị đúng cách nạp', () => {
        expect(ycxSteps('luyke', new Date(2026, 9, 15)).at(-1)!.label).toContain('Lũy kế / Quá khứ');
        expect(ycxSteps('realtime').at(-1)!.label).toContain('Tệp Realtime');
    });

    describe('Quy tắc định dạng tên tệp Luỹ kế tự động & thủ công', () => {
        it('formatYcxLuyKeTitle: YCX Từ ngày 1 - Ngày hiện tại -1 + hh:mm', () => {
            // Ngày 10/10/2026 lúc 08:45 -> Từ ngày 1 - 9/10 + 08:45
            const testDate = new Date(2026, 9, 10, 8, 45);
            expect(formatYcxLuyKeTitle(testDate)).toBe('YCX Từ ngày 1 - 9/10 + 08:45');
        });

        it('formatYcxLuyKeTitle ngày đầu tháng: lùi về ngày cuối tháng trước', () => {
            // Ngày 01/10/2026 lúc 12:00 -> Từ ngày 1 - 30/9 + 12:00
            const testDate = new Date(2026, 9, 1, 12, 0);
            expect(formatYcxLuyKeTitle(testDate)).toBe('YCX Từ ngày 1 - 30/9 + 12:00');
        });

        it('formatYcxMonthTitle: YCX Tháng được chọn', () => {
            expect(formatYcxMonthTitle('2026-09')).toBe('YCX Tháng 9.2026');
            expect(formatYcxMonthTitle('2026-10')).toBe('YCX Tháng 10.2026');
            expect(formatYcxMonthTitle('202611')).toBe('YCX Tháng 11.2026');
        });

        it('cleanYcxFileName: chuẩn hoá tên tệp thô từ MWG report 77', () => {
            const rawMwgName = 'Chitiếtyêucầuxuấtcbc3c931af5b46beb6a5963a56a2e13920261010_081500_51fbf89fa41e45f9bc9411f12ef9d9b4_202610101500';
            expect(cleanYcxFileName(rawMwgName)).toBe('YCX Từ ngày 1 - 9/10 + 08:15');

            // Tên tuỳ chỉnh do người dùng nhập thì giữ nguyên không đổi
            expect(cleanYcxFileName('Luỹ kế tháng 10')).toBe('Luỹ kế tháng 10');
            expect(cleanYcxFileName('YCX Tháng 9.2026')).toBe('YCX Tháng 9.2026');
        });
    });
});
