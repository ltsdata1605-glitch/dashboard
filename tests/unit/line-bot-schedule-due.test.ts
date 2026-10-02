import { describe, it, expect } from 'vitest';
import { dueSlot, vnNow, renderTemplate, runsOnDay, DUE_WINDOW_MINUTES } from '../../functions/src/lineBotScheduleDue';

/** Lịch "Gửi Notify" tự gửi trên máy chủ (functions/src/lineBotScheduler.ts → lineBotUserSchedules). */
const at = (date: string, dow: number, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return { date, dow, minutes: h * 60 + m };
};

describe('lịch Gửi Notify: đến giờ chưa', () => {
    const daily = { active: true, time: '06:00', repeatType: 'DAILY' as const, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };

    it('đúng giờ và trong 20 phút sau → đến giờ, trả khe ngày+giờ', () => {
        expect(dueSlot(daily, at('2026-10-02', 5, '06:00'))).toBe('2026-10-02 06:00');
        expect(dueSlot(daily, at('2026-10-02', 5, '06:19'))).toBe('2026-10-02 06:00');
    });
    it('trước giờ, hoặc trễ quá cửa sổ → chưa/không gửi', () => {
        expect(dueSlot(daily, at('2026-10-02', 5, '05:59'))).toBeNull();
        expect(dueSlot(daily, at('2026-10-02', 5, `06:${DUE_WINDOW_MINUTES}`))).toBeNull();
    });
    it('khe đã gửi → không gửi trùng; sang ngày mới → gửi lại', () => {
        const sent = { ...daily, lastAutoRunSlot: '2026-10-02 06:00' };
        expect(dueSlot(sent, at('2026-10-02', 5, '06:05'))).toBeNull();
        expect(dueSlot(sent, at('2026-10-03', 6, '06:05'))).toBe('2026-10-03 06:00');
    });
    it('đổi giờ lịch sau khi đã gửi → khe mới, gửi theo giờ mới', () => {
        const moved = { ...daily, time: '06:30', lastAutoRunSlot: '2026-10-02 06:00' };
        expect(dueSlot(moved, at('2026-10-02', 5, '06:30'))).toBe('2026-10-02 06:30');
    });
    it('lịch tắt hoặc giờ hỏng → không gửi', () => {
        expect(dueSlot({ ...daily, active: false }, at('2026-10-02', 5, '06:00'))).toBeNull();
        expect(dueSlot({ ...daily, time: '6h' }, at('2026-10-02', 5, '06:00'))).toBeNull();
        expect(dueSlot({ ...daily, time: '25:00' }, at('2026-10-02', 5, '06:00'))).toBeNull();
    });
    it('WEEKDAYS chỉ T2–T6; CUSTOM theo daysOfWeek; ONCE đúng ngày', () => {
        expect(runsOnDay({ repeatType: 'WEEKDAYS' }, at('2026-10-04', 0, '06:00'))).toBe(false); // CN
        expect(runsOnDay({ repeatType: 'WEEKDAYS' }, at('2026-10-05', 1, '06:00'))).toBe(true);
        expect(runsOnDay({ repeatType: 'CUSTOM', daysOfWeek: [2, 4] }, at('2026-10-06', 2, '06:00'))).toBe(true);
        expect(runsOnDay({ repeatType: 'CUSTOM', daysOfWeek: [2, 4] }, at('2026-10-07', 3, '06:00'))).toBe(false);
        expect(runsOnDay({ daysOfWeek: [3] }, at('2026-10-07', 3, '06:00'))).toBe(true); // lịch cũ chưa có repeatType
        expect(runsOnDay({ repeatType: 'ONCE', specificDate: '2026-10-07' }, at('2026-10-07', 3, '06:00'))).toBe(true);
        expect(runsOnDay({ repeatType: 'ONCE', specificDate: '2026-10-07' }, at('2026-10-08', 4, '06:00'))).toBe(false);
    });
});

describe('giờ Việt Nam và mẫu tin', () => {
    it('vnNow đổi đúng sang UTC+7 (qua nửa đêm, đúng thứ)', () => {
        // 2026-10-01 23:30 UTC = 2026-10-02 06:30 giờ VN, thứ Sáu
        expect(vnNow(new Date('2026-10-01T23:30:00Z'))).toEqual({ date: '2026-10-02', dow: 5, minutes: 390 });
    });
    it('thay {date} {bot_name} {ton_kho}', () => {
        expect(renderTemplate('📢 [{date}] {bot_name}: còn {ton_kho} mã', { date: '2026-10-02', botName: 'Bot 910', tonKho: 12 }))
            .toBe('📢 [02/10/2026] Bot 910: còn 12 mã');
    });
});
