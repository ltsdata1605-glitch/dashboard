import { describe, it, expect } from 'vitest';
import { describeBatchOutcome, sameKhoSelection, waitUntil } from '../../services/batchExportResult';

/** Audit A03/A04 (2026-09-29) — kết quả batch xuất ảnh của Phân tích. */
describe('sameKhoSelection', () => {
    it('so sánh không phụ thuộc thứ tự; [] chỉ khớp []', () => {
        expect(sameKhoSelection(['A', 'B'], ['B', 'A'])).toBe(true);
        expect(sameKhoSelection([], [])).toBe(true);
        expect(sameKhoSelection(['A'], [])).toBe(false);
        expect(sameKhoSelection(['A'], ['B'])).toBe(false);
        expect(sameKhoSelection(null, [])).toBe(false);
        expect(sameKhoSelection(undefined, ['A'])).toBe(false);
    });
});

describe('waitUntil', () => {
    it('trả false khi hết giờ — người gọi không được chụp tiếp bằng dữ liệu cũ', async () => {
        let t = 0;
        const ok = await waitUntil(() => false, { timeoutMs: 1000, intervalMs: 100, now: () => t, sleep: async ms => { t += ms; } });
        expect(ok).toBe(false);
        expect(t).toBeGreaterThanOrEqual(1000);
    });

    it('trả true ngay khi điều kiện đúng (Worker chậm hơn 8s vẫn chờ được nếu timeout đủ)', async () => {
        let t = 0;
        const ok = await waitUntil(() => t >= 9000, { timeoutMs: 20000, intervalMs: 100, now: () => t, sleep: async ms => { t += ms; } });
        expect(ok).toBe(true);
        expect(t).toBe(9000);
    });
});

describe('describeBatchOutcome', () => {
    it('đủ ảnh → thành công', () => {
        expect(describeBatchOutcome([{ label: 'A', ok: true }, { label: 'B', ok: true }]))
            .toEqual({ type: 'success', message: 'Đã xuất đủ 2/2 ảnh.' });
    });

    it('1 ảnh lỗi giữa batch → báo lỗi kèm tên', () => {
        const r = describeBatchOutcome([{ label: 'An', ok: true }, { label: 'Bình', ok: false }, { label: 'Chi', ok: true }]);
        expect(r.type).toBe('error');
        expect(r.message).toContain('2/3');
        expect(r.message).toContain('Bình');
    });

    it('nhiều mục lỗi → chỉ liệt kê 5 tên đầu', () => {
        const items = Array.from({ length: 8 }, (_, i) => ({ label: `NV${i + 1}`, ok: false }));
        const r = describeBatchOutcome(items);
        expect(r.message).toContain('Không xuất được ảnh nào (8 mục)');
        expect(r.message).toContain('NV5');
        expect(r.message).not.toContain('NV6');
        expect(r.message).toContain('+3 mục khác');
    });

    it('lỗi trước khi xuất được mục nào (vd tải chunk thất bại) → báo lỗi, không im lặng', () => {
        const r = describeBatchOutcome([], new Error('Failed to fetch dynamically imported module'));
        expect(r.type).toBe('error');
        expect(r.message).toContain('Failed to fetch');
    });

    it('lỗi giữa chừng sau khi đã xuất vài ảnh → nói rõ bị dừng', () => {
        const r = describeBatchOutcome([{ label: 'A', ok: true }], new Error('x'));
        expect(r.type).toBe('error');
        expect(r.message).toContain('bị dừng giữa chừng');
    });
});
