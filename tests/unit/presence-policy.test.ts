/**
 * Khoá nhịp presence ("đang online") — bản sửa hạn mức Firestore 2026-09-17 mục 6
 * (xem implementation_plan.md mục "Audit hạn mức đọc/ghi Firestore").
 */
import { describe, it, expect } from 'vitest';
import {
    PRESENCE_PING_INTERVAL_MS,
    ONLINE_WINDOW_MS,
    ONLINE_COUNT_INTERVAL_MS,
    shouldRunAgain,
} from '../../services/presencePolicy';

describe('Bất biến: cửa sổ online phải RỘNG hơn chu kỳ ping', () => {
    it('cửa sổ > chu kỳ ping — nếu không sẽ đếm THIẾU người đang online', () => {
        // Ping gần nhất của người đang dùng thật có thể đã cũ tới đúng 1 chu kỳ ping. Cửa sổ hẹp
        // hơn chu kỳ khiến họ bị coi là offline, mà KHÔNG có lỗi nào báo ra.
        expect(ONLINE_WINDOW_MS).toBeGreaterThan(PRESENCE_PING_INTERVAL_MS);
    });

    it('còn biên an toàn ít nhất 3 phút cho độ trễ mạng/serverTimestamp', () => {
        expect(ONLINE_WINDOW_MS - PRESENCE_PING_INTERVAL_MS).toBeGreaterThanOrEqual(3 * 60 * 1000);
    });
});

describe('Chu kỳ đã giảm tải so với bản cũ', () => {
    it('chu kỳ ping là 15 phút (trước bản sửa: 5 phút)', () => {
        expect(PRESENCE_PING_INTERVAL_MS).toBe(15 * 60 * 1000);
    });

    it('1 người mở tab 8 giờ: 32 lượt ghi (trước bản sửa: 96)', () => {
        const workdayMs = 8 * 60 * 60 * 1000;
        const writes = Math.floor(workdayMs / PRESENCE_PING_INTERVAL_MS);
        expect(writes).toBe(32);
        expect(Math.floor(workdayMs / (5 * 60 * 1000))).toBe(96); // mốc cũ, để đối chiếu
    });

    it('20 người mở tab 8 giờ: dưới 700 lượt ghi (trước bản sửa: ~1.900)', () => {
        const writesPerPerson = Math.floor((8 * 60 * 60 * 1000) / PRESENCE_PING_INTERVAL_MS);
        expect(writesPerPerson * 20).toBeLessThan(700);
    });

    it('chu kỳ đếm online giữ nguyên 10 phút', () => {
        expect(ONLINE_COUNT_INTERVAL_MS).toBe(10 * 60 * 1000);
    });
});

describe('shouldRunAgain — chặn ghi/đọc lặp khi chuyển tab qua lại', () => {
    const T0 = 1_700_000_000_000;

    it('chưa từng chạy (0) → chạy ngay', () => {
        expect(shouldRunAgain(0, PRESENCE_PING_INTERVAL_MS, T0)).toBe(true);
    });

    it('vừa chạy xong → KHÔNG chạy lại', () => {
        expect(shouldRunAgain(T0, PRESENCE_PING_INTERVAL_MS, T0)).toBe(false);
    });

    it('chuyển tab qua lại 30 lần trong 2 phút → đúng 1 lượt ghi (trước: 30)', () => {
        let lastAt = 0;
        let writes = 0;
        for (let i = 0; i < 30; i++) {
            const now = T0 + i * 4000; // mỗi 4 giây bật/tắt tab 1 lần
            if (shouldRunAgain(lastAt, PRESENCE_PING_INTERVAL_MS, now)) {
                lastAt = now;
                writes += 1;
            }
        }
        expect(writes).toBe(1);
    });

    it('hết chu kỳ → chạy lại', () => {
        expect(shouldRunAgain(T0, PRESENCE_PING_INTERVAL_MS, T0 + PRESENCE_PING_INTERVAL_MS)).toBe(true);
        expect(shouldRunAgain(T0, PRESENCE_PING_INTERVAL_MS, T0 + PRESENCE_PING_INTERVAL_MS - 1)).toBe(false);
    });

    it('mở tab suốt 1 giờ: đúng 4 lượt ghi (trước bản sửa: 12)', () => {
        let lastAt = 0;
        let writes = 0;
        // Mô phỏng mỗi phút có 1 lần hàm được gọi (interval + các lần bật/tắt tab).
        for (let minute = 0; minute < 60; minute++) {
            const now = T0 + minute * 60_000;
            if (shouldRunAgain(lastAt, PRESENCE_PING_INTERVAL_MS, now)) {
                lastAt = now;
                writes += 1;
            }
        }
        expect(writes).toBe(4);
    });
});
