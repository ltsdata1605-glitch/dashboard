import { describe, it, expect } from 'vitest';
import { extractAllSupermarketList, parseCompetitionDataBySupermarket } from './dashboardHelpers';

/** Lỗi thật 2026-10-01: danh sách siêu thị lẫn tên nhóm thi đua ("Máy Lạnh", "nồi chiên", "Sạc", "T10 IPHONE…") và "Siêu thị". */
const THI_DUA_LAN_TEN_CHUONG_TRINH = [
    'T10 IPHONE 18 series, iPhone Dù - Máy Lạnh',
    'Thời gian: 01/10 - 31/10',
    'DOANH THU\tTARGET\t% HT THÁNG',
    'ĐMM_AGI_TTO - Tri Tôn\t10\t20\t50',
    'PK - Sạc',
    '12\t30\t40',
    'Gia dụng - nồi chiên',
    '5\t9\t55',
].join('\n');

describe('extractAllSupermarketList — không lẫn tên chương trình thi đua', () => {
    it('tên chương trình dạng "X - Y" và chữ "Siêu thị" KHÔNG thành siêu thị', () => {
        const ds = extractAllSupermarketList({
            competitionLuyKe: THI_DUA_LAN_TEN_CHUONG_TRINH,
            competitionRealtime: 'Máy Lạnh\nDOANH THU\tTARGET\t% HT THÁNG\nSiêu thị\t1\t2\t50',
        });
        expect(ds).toEqual(['ĐMM_AGI_TTO - Tri Tôn']);
    });

    it('siêu thị trong Thi đua khớp siêu thị ở Doanh thu → gộp một, giữ siêu thị không tiền tố nếu đã biết', () => {
        const ds = extractAllSupermarketList({
            summaryRealtime: 'Siêu thị\tSỐ LƯỢNG\tDOANH THU QĐ\n1678 - ĐMM_AGI_TTO - Tri Tôn\t3\t14\nTổng (1 dòng)\t3\t14',
            competitionRealtime: 'Máy Lạnh\nDOANH THU\tTARGET\t% HT THÁNG\nĐMM_AGI_TTO - Tri Tôn\t1\t2\t50',
            supermarketMap: { 'Lương An Trà': '3717' },
        });
        expect(ds.some(n => n.includes('Tri Tôn'))).toBe(true);
        expect(ds.filter(n => n.includes('Tri Tôn'))).toHaveLength(1);
        expect(ds).toContain('Lương An Trà');
        expect(ds.join('|')).not.toMatch(/Máy Lạnh|Sạc|nồi chiên|^Siêu thị$/);
    });
});

describe('parseCompetitionDataBySupermarket — nhận tiền tố ĐMM/ĐMS có mã kho đầu dòng', () => {
    it('"1678 - ĐMM_AGI_TTO - Tri Tôn" và "7904 - ĐMS_AGI_TTO - Cô Tô" không bị bỏ', () => {
        const t = 'Máy Lạnh\nDOANH THU\tTARGET\t% HT THÁNG\n1678 - ĐMM_AGI_TTO - Tri Tôn\t10\t20\t50\n7904 - ĐMS_AGI_TTO - Cô Tô\t5\t10\t50';
        const kq = parseCompetitionDataBySupermarket(t);
        expect(Object.keys(kq).sort()).toEqual(['1678 - ĐMM_AGI_TTO - Tri Tôn', '7904 - ĐMS_AGI_TTO - Cô Tô']);
        expect(kq['1678 - ĐMM_AGI_TTO - Tri Tôn'].programs[0].name).toBe('Máy Lạnh');
    });
});
