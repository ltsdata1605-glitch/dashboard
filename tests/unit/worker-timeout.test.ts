import { describe, it, expect } from 'vitest';
import { workerTimeoutMs } from '../../utils/dataUtils';

/** Đợt 4 (2026-09-30): hạn chờ Worker đọc Excel theo dung lượng, thay cho 60s cứng. */
describe('workerTimeoutMs', () => {
    it('tệp nhỏ vẫn giữ tối thiểu 60 giây', () => {
        expect(workerTimeoutMs(0)).toBe(60_000);
        expect(workerTimeoutMs(1024 * 1024)).toBe(63_000);
    });
    it('tệp 100MB (cỡ lớn nhất chủ dự án dùng) được 6 phút', () => {
        expect(workerTimeoutMs(100 * 1024 * 1024)).toBe(360_000);
    });
    it('không âm với kích thước lỗi', () => {
        expect(workerTimeoutMs(-5)).toBe(60_000);
    });
});
