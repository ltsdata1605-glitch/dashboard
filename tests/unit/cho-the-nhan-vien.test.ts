import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { choTheNhanVien } from '../../hooks/choTheNhanVien';

/**
 * Vòng xuất hàng loạt NV chờ ĐÚNG thẻ của đúng người thay vì chờ cứng 800 ms (2026-10-20: CI WebKit "Đã xuất 2/3 ảnh" — React vẽ
 * trễ khi máy bận). Đồng hồ giả + khung giả: thẻ "xuất hiện" ở mốc thời gian định trước — không phụ thuộc tốc độ máy chạy test.
 */
type The = { getAttribute: (k: string) => string | null };
const khung = (lich: Array<{ tu: number; ten: string }>) => {
    const batDau = Date.now();
    return {
        querySelector: () => {
            const t = Date.now() - batDau;
            const hien = lich.filter(m => t >= m.tu).pop();
            return hien ? ({ getAttribute: () => hien.ten } as The) : null;
        },
    } as unknown as Pick<HTMLElement, 'querySelector'>;
};

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('choTheNhanVien', () => {
    it('thẻ có sẵn → trả thẻ sau 800 ms (nhịp ổn định biểu đồ như trước)', async () => {
        const kq = choTheNhanVien(khung([{ tu: 0, ten: 'NV A' }]), 'NV A');
        await vi.advanceTimersByTimeAsync(799);
        let xong = false; void kq.then(() => { xong = true; });
        await vi.advanceTimersByTimeAsync(0);
        expect(xong).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(await kq).not.toBeNull();
    });

    it('React vẽ trễ 2,5 s (máy bận) → VẪN lấy được thẻ (bản cũ chờ cứng 800 ms: đánh hỏng oan)', async () => {
        const kq = choTheNhanVien(khung([{ tu: 2500, ten: 'NV B' }]), 'NV B');
        await vi.advanceTimersByTimeAsync(4000);
        expect(await kq).not.toBeNull();
    });

    it('thẻ người TRƯỚC còn sót → không nhận nhầm; đợi thẻ đúng người', async () => {
        let nhan: unknown = 'chưa';
        const kq = choTheNhanVien(khung([{ tu: 0, ten: 'NV cũ' }, { tu: 3000, ten: 'NV mới' }]), 'NV mới');
        void kq.then(v => { nhan = v; });
        await vi.advanceTimersByTimeAsync(2000);
        expect(nhan).toBe('chưa');
        await vi.advanceTimersByTimeAsync(2000);
        expect((await kq)?.getAttribute('data-batch-employee')).toBe('NV mới');
    });

    it('không bao giờ vẽ được → trả null sau ~15,8 s (mục đó báo lỗi, vòng lặp đi tiếp)', async () => {
        const kq = choTheNhanVien(khung([]), 'NV C');
        await vi.advanceTimersByTimeAsync(16_000);
        expect(await kq).toBeNull();
    });
});
