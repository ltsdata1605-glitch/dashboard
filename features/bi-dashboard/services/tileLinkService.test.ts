import { describe, it, expect } from 'vitest';
import { DEFAULT_TILE_LINKS, getTileLink } from './tileLinkService';

describe('tileLinkService', () => {
    it('chứa đúng các liên kết mặc định sạch không hardcode mã kho theo yêu cầu', () => {
        // Báo cáo Tổng hợp
        expect(DEFAULT_TILE_LINKS['summary-realtime']).toBe('https://baocao.dienmayxanh.com/dashboard/revenue-consolidated');
        expect(DEFAULT_TILE_LINKS['summary-luyke']).toBe('https://baocao.dienmayxanh.com/dashboard/revenue-consolidated');

        // Thi đua Cụm
        expect(DEFAULT_TILE_LINKS['competition-realtime']).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua');
        expect(DEFAULT_TILE_LINKS['competition-luyke']).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua');

        // Siêu thị ngành hàng - không hardcode 910
        expect(DEFAULT_TILE_LINKS['industry-realtime']).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?timetype=1');
        expect(DEFAULT_TILE_LINKS['industry-luyke']).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua');

        // DOANH THU NHÂN VIÊN
        expect(DEFAULT_TILE_LINKS['nhanvien-realtime']).toBe('https://baocao.dienmayxanh.com/dashboard/revenue-consolidated?timetype=1');
        expect(DEFAULT_TILE_LINKS['nhanvien-doanhthu']).toBe('https://baocao.dienmayxanh.com/dashboard/revenue-consolidated');

        // THI ĐUA & TRẢ CHẬM - không hardcode 910 & st=9567
        expect(DEFAULT_TILE_LINKS['nhanvien-thidua']).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua');
        expect(DEFAULT_TILE_LINKS['nhanvien-tragop']).toBe('https://baocao.dienmayxanh.com/dashboard/tra-cham');
    });

    it('getTileLink trả về link mặc định sạch khi chưa có siêu thị cụ thể', () => {
        expect(getTileLink('summary-realtime')).toBe('https://baocao.dienmayxanh.com/dashboard/revenue-consolidated');
        expect(getTileLink('industry-realtime')).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?timetype=1');
        expect(getTileLink('nhanvien-thidua')).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua');
        expect(getTileLink('nhanvien-tragop')).toBe('https://baocao.dienmayxanh.com/dashboard/tra-cham');
    });

    it('getTileLink tự động gắn mã kho động khi có tên siêu thị bất kỳ', () => {
        // Hỗ trợ siêu thị 3717
        expect(getTileLink('industry-realtime', null, '3717 - ĐML_STR_STR - Cần Thơ'))
            .toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?timetype=1&sieuthi=3717');
        expect(getTileLink('industry-luyke', null, '3717 - ĐML_STR_STR - Cần Thơ'))
            .toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?sieuthi=3717');
        expect(getTileLink('nhanvien-thidua', null, '3717 - ĐML_STR_STR - Cần Thơ'))
            .toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?sieuthi=3717');

        // Hỗ trợ siêu thị 1032
        expect(getTileLink('industry-realtime', null, '1032 - ĐM Tân Phú'))
            .toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?timetype=1&sieuthi=1032');

        // Hỗ trợ truyền thẳng mã kho
        expect(getTileLink('industry-luyke', null, '5678'))
            .toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?sieuthi=5678');
    });

    it('getTileLink ưu tiên link tuỳ chỉnh của người dùng', () => {
        const customLinks = {
            'summary-realtime': 'https://custom-domain.com/my-report',
            'nhanvien-thidua': 'https://custom-domain.com/thi-dua',
        };

        expect(getTileLink('summary-realtime', customLinks)).toBe('https://custom-domain.com/my-report');
        expect(getTileLink('nhanvien-thidua', customLinks)).toBe('https://custom-domain.com/thi-dua');

        // Ô chưa custom vẫn lấy mặc định sạch
        expect(getTileLink('industry-realtime', customLinks)).toBe('https://baocao.dienmayxanh.com/dashboard/thi-dua?timetype=1');
    });

    it('getTileLink fallback an toàn với key không xác định', () => {
        expect(getTileLink('unknown-key')).toBe('https://baocao.dienmayxanh.com/dashboard/revenue-consolidated');
    });
});
