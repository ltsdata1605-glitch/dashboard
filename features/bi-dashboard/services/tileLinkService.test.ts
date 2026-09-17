import { describe, it, expect } from 'vitest';
import { DEFAULT_TILE_LINKS, getTileLink } from './tileLinkService';

describe('tileLinkService', () => {
    it('chứa đúng các liên kết mặc định theo yêu cầu người dùng', () => {
        // Báo cáo Tổng hợp
        expect(DEFAULT_TILE_LINKS['summary-realtime']).toBe('https://baocao.dienmayxanh.com/dashboard/revenue-consolidated');
        expect(DEFAULT_TILE_LINKS['summary-luyke']).toBe('https://baocao.dienmayxanh.com/dashboard/revenue-consolidated');

        // Thi đua Cụm
        expect(DEFAULT_TILE_LINKS['competition-realtime']).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua');
        expect(DEFAULT_TILE_LINKS['competition-luyke']).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua');

        // Siêu thị ngành hàng
        expect(DEFAULT_TILE_LINKS['industry-realtime']).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?sieuthi=910&timetype=1');
        expect(DEFAULT_TILE_LINKS['industry-luyke']).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?sieuthi=910');

        // DOANH THU NHÂN VIÊN
        expect(DEFAULT_TILE_LINKS['nhanvien-realtime']).toBe('https://baocao.dienmayxanh.com/dashboard/revenue-consolidated?timetype=1');
        expect(DEFAULT_TILE_LINKS['nhanvien-doanhthu']).toBe('https://baocao.dienmayxanh.com/dashboard/revenue-consolidated');

        // THI ĐUA & TRẢ CHẬM
        expect(DEFAULT_TILE_LINKS['nhanvien-thidua']).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?sieuthi=910&st=9567');
        expect(DEFAULT_TILE_LINKS['nhanvien-tragop']).toBe('https://baocao.dienmayxanh.com/dashboard/tra-cham');
    });

    it('getTileLink trả về link mặc định khi chưa có cấu hình tuỳ chỉnh', () => {
        expect(getTileLink('summary-realtime')).toBe('https://baocao.dienmayxanh.com/dashboard/revenue-consolidated');
        expect(getTileLink('industry-realtime')).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?sieuthi=910&timetype=1');
        expect(getTileLink('nhanvien-thidua')).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?sieuthi=910&st=9567');
        expect(getTileLink('nhanvien-tragop')).toBe('https://baocao.dienmayxanh.com/dashboard/tra-cham');
    });

    it('getTileLink ưu tiên link tuỳ chỉnh của người dùng', () => {
        const customLinks = {
            'summary-realtime': 'https://custom-domain.com/my-report',
            'nhanvien-thidua': 'https://custom-domain.com/thi-dua',
        };

        expect(getTileLink('summary-realtime', customLinks)).toBe('https://custom-domain.com/my-report');
        expect(getTileLink('nhanvien-thidua', customLinks)).toBe('https://custom-domain.com/thi-dua');

        // Ô chưa custom vẫn lấy mặc định
        expect(getTileLink('industry-realtime', customLinks)).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?sieuthi=910&timetype=1');
    });

    it('getTileLink fallback an toàn với key không xác định', () => {
        expect(getTileLink('unknown-key')).toBe('https://baocao.dienmayxanh.com/dashboard/revenue-consolidated');
    });
});
