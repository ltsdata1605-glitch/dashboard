import { describe, it, expect } from 'vitest';
import { moTaBoLoc } from './moTaBoLoc';

describe('moTaBoLoc — dòng phụ "đang lọc gì" của khối Phân tích', () => {
    it('không lọc gì → chỉ "Tất cả thời gian"', () => {
        expect(moTaBoLoc({ kho: ['all'], xuat: 'all', dateRange: 'all' })).toBe('Tất cả thời gian');
    });
    it('đủ kho, xuất, khoảng ngày — viết như câu, ngăn bằng " · "', () => {
        expect(moTaBoLoc({ kho: ['910', '1234'], xuat: 'Đã xuất', dateRange: 'custom', startDate: '2026-10-01T00:00:00', endDate: '2026-10-13' }))
            .toBe('Kho 910, 1234 · Xuất: Đã xuất · 01/10/2026 – 13/10/2026');
    });
    it('kho dạng chuỗi (dữ liệu cũ) vẫn nhận', () => {
        expect(moTaBoLoc({ kho: '910', dateRange: 'all' })).toBe('Kho 910 · Tất cả thời gian');
    });
    it('bộ phận chỉ hiện khi khối yêu cầu', () => {
        const f = { department: ['Kho', 'Thu ngân'], dateRange: 'all' };
        expect(moTaBoLoc(f)).toBe('Tất cả thời gian');
        expect(moTaBoLoc(f, { boPhan: true })).toBe('Bộ phận: Kho, Thu ngân · Tất cả thời gian');
    });
});
