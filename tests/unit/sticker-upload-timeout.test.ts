/**
 * Trần thời gian cho lượt tải file của In Sticker (bản sửa 2026-09-18).
 *
 * Vì sao có test này: ngày 17/09/2026, luồng tải file KHÔNG có trần thời gian nào, nên khi một
 * bước treo thì `isLoading` kẹt `true` vĩnh viễn, ô chọn file bị `disabled` mãi, và cách duy nhất
 * còn lại là TẢI LẠI TRANG rồi thử lại. Chủ dự án lặp vòng đó suốt 3 tiếng → 41.000 lượt ghi +
 * 80.000 lượt đọc, làm cạn hạn mức ngày của database (xem implementation_plan.md mục "Biểu đồ
 * Usage thật của database In Sticker").
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    UPLOAD_TIMEOUT_MS,
    withUploadTimeout,
    isUploadTimeout,
} from '../../features/sticker-event/hooks/useStickerEventFile';

afterEach(() => { vi.useRealTimers(); });

describe('withUploadTimeout — luôn có đường thoát', () => {
    it('promise treo VĨNH VIỄN vẫn bị cắt sau đúng trần thời gian', async () => {
        vi.useFakeTimers();
        const treoVinhVien = new Promise<string>(() => { /* không bao giờ resolve — đúng bug thật */ });

        const p = withUploadTimeout(treoVinhVien, 'đồng bộ lên máy chủ');
        const assertion = expect(p).rejects.toThrow(/UPLOAD_TIMEOUT:đồng bộ lên máy chủ/);
        await vi.advanceTimersByTimeAsync(UPLOAD_TIMEOUT_MS);
        await assertion;
    });

    it('promise xong TRƯỚC trần thì trả kết quả bình thường, không bị cắt oan', async () => {
        vi.useFakeTimers();
        const p = withUploadTimeout(Promise.resolve('xong'), 'lưu vào máy');
        await vi.advanceTimersByTimeAsync(0);
        await expect(p).resolves.toBe('xong');
    });

    it('promise chậm nhưng vẫn trong trần → KHÔNG bị cắt', async () => {
        vi.useFakeTimers();
        const chamNhungOk = new Promise<string>((resolve) => setTimeout(() => resolve('ok'), UPLOAD_TIMEOUT_MS - 1000));
        const p = withUploadTimeout(chamNhungOk, 'đọc file');
        await vi.advanceTimersByTimeAsync(UPLOAD_TIMEOUT_MS - 1000);
        await expect(p).resolves.toBe('ok');
    });

    it('lỗi THẬT của bước đó được ném nguyên vẹn, không bị nhầm thành timeout', async () => {
        const loiThat = Promise.reject(new Error('File sai định dạng'));
        await expect(withUploadTimeout(loiThat, 'đọc file')).rejects.toThrow('File sai định dạng');
    });
});

describe('isUploadTimeout — phân biệt đúng loại lỗi để hiện đúng thông điệp', () => {
    it('nhận diện lỗi timeout', () => {
        expect(isUploadTimeout(new Error('UPLOAD_TIMEOUT:đồng bộ lên máy chủ'))).toBe(true);
    });

    it('KHÔNG nhận nhầm lỗi định dạng file thành timeout', () => {
        // Nhận nhầm sẽ hiện thông điệp "đừng thử lại liên tục" cho một lỗi mà thử lại vô ích,
        // còn lỗi định dạng thật thì mất hướng dẫn kiểm tra file.
        expect(isUploadTimeout(new Error('File sai định dạng'))).toBe(false);
        expect(isUploadTimeout('UPLOAD_TIMEOUT:x')).toBe(false); // chuỗi trần, không phải Error
        expect(isUploadTimeout(null)).toBe(false);
        expect(isUploadTimeout(undefined)).toBe(false);
    });
});

describe('Trần thời gian đủ rộng cho file thật', () => {
    it('ít nhất 2 phút — không cắt oan file 3.000 dòng trên mạng chậm', () => {
        // Mục đích của trần KHÔNG phải cắt ngang lượt tải bình thường (10 chunk × ~300KB ghi tuần
        // tự), mà là bảo đảm luôn thoát được thay vì treo câm lặng.
        expect(UPLOAD_TIMEOUT_MS).toBeGreaterThanOrEqual(120_000);
    });
});
