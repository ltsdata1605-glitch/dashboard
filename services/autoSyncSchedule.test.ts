import { describe, it, expect } from 'vitest';
import { dueSchedules, missedSchedules, nextScheduleTime, normalizeTime, type Schedules } from './autoSyncSchedule';
import { reportKeyFromFilename } from './analysisExportDestinations';

/** Hẹn giờ Auto Sync (2026-10-01): đến hạn trong 10 phút sau giờ hẹn, mỗi khung 1 lần/ngày. */
describe('hẹn giờ Auto Sync', () => {
    const s: Schedules = { 'ycx-realtime': { enabled: true, times: ['09:00', '14:30'] }, 'bi-luyke': { enabled: false, times: ['09:00'] } };
    const at = (h: number, m: number) => new Date(2026, 9, 15, h, m, 20);
    it('chưa tới giờ / quá 10 phút → không chạy; trong khung → chạy', () => {
        expect(dueSchedules(s, at(8, 59), () => false)).toEqual([]);
        expect(dueSchedules(s, at(9, 0), () => false).map((d) => d.key)).toEqual(['ycx-realtime']);
        expect(dueSchedules(s, at(9, 9), () => false)).toHaveLength(1);
        expect(dueSchedules(s, at(9, 10), () => false)).toEqual([]);
    });
    it('đã chạy khung đó hôm nay → không chạy lại; nút đang tắt → bỏ qua', () => {
        const d = dueSchedules(s, at(9, 1), () => false)[0];
        expect(d.marker).toBe('ycx-sched-ran:ycx-realtime:2026-10-15:09:00');
        expect(dueSchedules(s, at(9, 2), (m) => m === d.marker)).toEqual([]);
    });
    it('giờ kế tiếp hiển thị trên nút', () => {
        expect(nextScheduleTime(s['ycx-realtime'], at(10, 0))).toBe('14:30');
        expect(nextScheduleTime(s['ycx-realtime'], at(20, 0))).toBe('09:00');
        expect(nextScheduleTime(s['bi-luyke'], at(8, 0))).toBeNull();
    });
    it('chuẩn hoá giờ', () => {
        expect(normalizeTime('9:05')).toBe('09:05');
        expect(normalizeTime('24:00')).toBeNull();
        expect(normalizeTime('abc')).toBeNull();
    });
});

describe('khoá đích xuất ảnh theo tên file', () => {
    it('bỏ tiền tố kho, đuôi file, số thứ tự', () => {
        expect(reportKeyFromFilename('[910_1678] - Tổng Quan Doanh Thu.png')).toBe('Tổng Quan Doanh Thu');
        expect(reportKeyFromFilename('[TAT-CA-KHU-VUC] - Lịch Doanh Thu (3).png')).toBe('Lịch Doanh Thu');
    });
});

describe('missedSchedules — khung giờ bị lỡ khi trang không chạy (2026-10-02)', () => {
    const s = { 'bi-realtime': { enabled: true, times: ['15:00', '17:00'] } };
    const at = (hm: string) => new Date(`2026-10-02T${hm}:00`);
    it('tab ngủ 14:58 → 15:30: 15:00 bị lỡ, 17:00 chưa tới', () => {
        expect(missedSchedules(s, at('14:58').getTime(), at('15:30'), () => false).map((x) => x.time)).toEqual(['15:00']);
    });
    it('trang vẫn kiểm đều (lần trước 15:09) → 15:00 chưa hết hạn ở lần kiểm 15:09, hết hạn 15:10 → lỡ nếu chưa chạy', () => {
        expect(missedSchedules(s, at('15:09').getTime(), at('15:10'), () => false).map((x) => x.time)).toEqual(['15:00']);
        expect(missedSchedules(s, at('15:09').getTime(), at('15:10'), () => true)).toEqual([]);
    });
    it('vẫn trong 10 phút → chưa tính lỡ (dueSchedules còn chạy được)', () => {
        expect(missedSchedules(s, at('14:58').getTime(), at('15:05'), () => false)).toEqual([]);
    });
    it('lần đầu mở (chưa có mốc) hoặc mốc quá 1 ngày → không báo lỡ', () => {
        expect(missedSchedules(s, 0, at('15:30'), () => false)).toEqual([]);
        expect(missedSchedules(s, at('15:30').getTime() - 25 * 3600_000, at('15:30'), () => false)).toEqual([]);
    });
});

describe('nextScheduleLabel', () => {
    it('các khung hôm nay đã qua → "mai HH:mm"', async () => {
        const { nextScheduleLabel } = await import('./autoSyncSchedule');
        const e = { enabled: true, times: ['09:00', '15:00'] };
        expect(nextScheduleLabel(e, new Date('2026-10-02T10:00:00'))).toBe('15:00');
        expect(nextScheduleLabel(e, new Date('2026-10-02T16:00:00'))).toBe('mai 09:00');
    });
});
