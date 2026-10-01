import { describe, it, expect } from 'vitest';
import { resolveYcxMode, ycxDateRange, ycxSteps } from './ycxAutoSyncService';

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
});
