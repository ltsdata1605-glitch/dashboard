/**
 * Khoá lại nhịp ghi Firestore của trạng thái phiên In Sticker (bản sửa hạn mức 2026-09-17).
 *
 * Trước bản sửa: MỖI thao tác người dùng (tick chọn, bấm +/-, gõ 1 ký tự vào ô số lượng, đổi bộ
 * lọc) tốn 1 lượt ghi Firestore sau debounce 1s; 2 handler flush (beforeunload + visibilitychange)
 * còn ghi THẲNG không qua debounce nào, nên chuyển tab qua lại là ghi lặp đúng payload cũ.
 */
import { describe, it, expect } from 'vitest';
import {
    LOCAL_SAVE_DEBOUNCE_MS,
    CLOUD_SAVE_DEBOUNCE_MS,
    CLOUD_SAVE_MAX_WAIT_MS,
    cloudSaveDelayMs,
    shouldSyncToCloud,
} from '../../features/sticker-event/services/sessionSyncPolicy';

describe('Nhịp lưu: cục bộ nhanh, cloud chậm', () => {
    it('ghi cloud thưa hơn ghi cục bộ ít nhất 20 lần', () => {
        expect(CLOUD_SAVE_DEBOUNCE_MS / LOCAL_SAVE_DEBOUNCE_MS).toBeGreaterThanOrEqual(20);
    });

    it('trần chờ dài hơn debounce (nếu không, trần vô nghĩa)', () => {
        expect(CLOUD_SAVE_MAX_WAIT_MS).toBeGreaterThan(CLOUD_SAVE_DEBOUNCE_MS);
    });
});

describe('cloudSaveDelayMs — debounce có trần chờ', () => {
    const T0 = 1_700_000_000_000;

    it('thay đổi vừa xảy ra → chờ đủ 20s', () => {
        expect(cloudSaveDelayMs(T0, T0)).toBe(CLOUD_SAVE_DEBOUNCE_MS);
    });

    it('không có gì đang chờ → chờ đủ 20s', () => {
        expect(cloudSaveDelayMs(null, T0)).toBe(CLOUD_SAVE_DEBOUNCE_MS);
    });

    it('đã chờ 30s → vẫn chờ tiếp 20s (chưa tới trần 60s)', () => {
        expect(cloudSaveDelayMs(T0, T0 + 30_000)).toBe(CLOUD_SAVE_DEBOUNCE_MS);
    });

    it('đã chờ 45s → chỉ chờ thêm 15s để không vượt trần 60s', () => {
        expect(cloudSaveDelayMs(T0, T0 + 45_000)).toBe(15_000);
    });

    it('đã chờ quá 60s → ghi NGAY, không đẩy lùi nữa', () => {
        expect(cloudSaveDelayMs(T0, T0 + 60_000)).toBe(0);
        expect(cloudSaveDelayMs(T0, T0 + 120_000)).toBe(0);
    });

    it('không bao giờ trả giá trị âm hay vượt debounce', () => {
        for (const waited of [0, 1, 999, 19_999, 20_000, 59_999, 60_001, 10 ** 9]) {
            const d = cloudSaveDelayMs(T0, T0 + waited);
            expect(d).toBeGreaterThanOrEqual(0);
            expect(d).toBeLessThanOrEqual(CLOUD_SAVE_DEBOUNCE_MS);
        }
    });
});

describe('shouldSyncToCloud — chặn ghi lặp payload không đổi', () => {
    it('có thay đổi mới → ghi', () => {
        expect(shouldSyncToCloud(7, 6)).toBe(true);
    });

    it('không có gì mới → KHÔNG ghi', () => {
        expect(shouldSyncToCloud(7, 7)).toBe(false);
    });

    it('lần đầu (chưa ghi cloud lần nào, mốc -1) → ghi', () => {
        expect(shouldSyncToCloud(1, -1)).toBe(true);
    });

    it('mô phỏng phiên làm việc thật: 12 thao tác + chuyển tab 3 lần + đóng tab = 2 lượt ghi', () => {
        // Diễn lại đúng thứ tự mà useStickerEventState.ts gọi 2 hàm này.
        let revision = 0;
        let lastSynced = -1;
        let writes = 0;
        const flush = () => {
            if (!shouldSyncToCloud(revision, lastSynced)) return;
            lastSynced = revision;
            writes += 1;
        };

        // 12 thao tác liên tiếp nhanh (debounce chưa kịp bắn), rồi người dùng ngừng tay → 1 lượt ghi.
        for (let i = 0; i < 12; i++) revision += 1;
        flush();
        expect(writes).toBe(1);

        // Chuyển tab ẩn/hiện 3 lần mà KHÔNG sửa gì → 0 lượt ghi thêm (bản cũ: 3 lượt).
        flush(); flush(); flush();
        expect(writes).toBe(1);

        // Sửa thêm 1 thao tác rồi đóng tab → đúng 1 lượt ghi nữa.
        revision += 1;
        flush();
        expect(writes).toBe(2);

        // beforeunload bắn tiếp ngay sau đó → không ghi lại payload vừa ghi.
        flush();
        expect(writes).toBe(2);
    });
});
