import { describe, expect, it } from 'vitest';
import { BANKS, normalizeBankCode } from './bankCatalog';

/**
 * Ngân hàng nhận tiền phải TỰ ĐỘNG khớp từ phiếu lương (chủ dự án yêu cầu 2026-09-23).
 * Trước đây mặc định là 'MB' — không có trong danh mục nên <select> trống và QR không dựng được,
 * đồng thời chặn luôn bước tự điền (điều kiện cũ là `!input.bankCode`).
 */
describe('normalizeBankCode', () => {
    it('nhận đúng short_name và mã trong danh mục', () => {
        expect(normalizeBankCode('MBBank')).toBe('MBBank');
        expect(normalizeBankCode('mbb')).toBe('MBBank');
        expect(normalizeBankCode('VCB')).toBe('Vietcombank');
        expect(normalizeBankCode('Vietcombank')).toBe('Vietcombank');
    });

    it('nhận viết tắt ngắn thường thấy trên phiếu lương', () => {
        expect(normalizeBankCode('MB')).toBe('MBBank');
        expect(normalizeBankCode('mb ')).toBe('MBBank');
        expect(normalizeBankCode('TCB')).toBe('Techcombank');
    });

    it('nhận tên tiếng Việt đầy đủ (có dấu) của mọi ngân hàng trong danh mục', () => {
        for (const bank of BANKS) {
            expect({ name: bank.name, code: normalizeBankCode(bank.name) })
                .toEqual({ name: bank.name, code: bank.short_name });
        }
    });

    it('nhận chuỗi lẫn lộn kiểu phiếu lương MWG', () => {
        expect(normalizeBankCode('NH TMCP Quân Đội (MB)')).toBe('MBBank');
        expect(normalizeBankCode('Ngan hang Ngoai thuong Viet Nam')).toBe('Vietcombank');
        expect(normalizeBankCode('Sacombank - CN Gò Vấp')).toBe('Sacombank');
    });

    it('trả về chuỗi rỗng khi không nhận ra (để UI hiện "-- Chọn ngân hàng --")', () => {
        expect(normalizeBankCode('')).toBe('');
        expect(normalizeBankCode(undefined)).toBe('');
        expect(normalizeBankCode('Ngân hàng Ngoài Danh Mục XYZ')).toBe('');
    });
});
