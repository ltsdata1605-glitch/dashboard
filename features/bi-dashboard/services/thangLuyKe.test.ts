import { describe, it, expect } from 'vitest';
import { thangLuyKeMacDinh, nhanThang } from './biAutoSyncService';

describe('thangLuyKeMacDinh — "Tháng hiện tại" của Tự động Luỹ kế', () => {
    it('ngày thường → tháng này', () => {
        expect(thangLuyKeMacDinh(new Date(2026, 9, 15))).toBe('202610');
        expect(thangLuyKeMacDinh(new Date(2026, 9, 2))).toBe('202610');
    });
    it('NGÀY 1 → tháng liền trước (chưa có số luỹ kế tháng mới)', () => {
        expect(thangLuyKeMacDinh(new Date(2026, 9, 1))).toBe('202609');
    });
    it('ngày 1/1 → tháng 12 năm trước', () => {
        expect(thangLuyKeMacDinh(new Date(2027, 0, 1))).toBe('202612');
    });
    it('nhanThang hiển thị MM/YYYY', () => {
        expect(nhanThang('202609')).toBe('09/2026');
    });
});
