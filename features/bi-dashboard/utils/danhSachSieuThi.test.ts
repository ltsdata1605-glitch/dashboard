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

    it('đã có Doanh thu hợp nhất → CHỈ lấy siêu thị trong Doanh thu (+ siêu thị tự thêm), bỏ Thi đua và bảng mã kho', () => {
        // Đúng định dạng userscript (acpSerializeSummaryRealtime) gửi về
        const summaryRealtime = [
            'Dashboards', 'Doanh thu hợp nhất', 'DT quy đổi', '127',
            'Siêu thị\tSỐ LƯỢNG\tDOANH THU QĐ\t% TỈ TRỌNG\tDOANH THU\tTARGET\t% HT TARGET (LK)\tTB 3 THÁNG\t% TT\tDT TRẢ GÓP\t% TRẢ GÓP',
            '1678 - ĐMM_AGI_TTO - Tri Tôn\t39\t111\t100.0%\t77\t6,135\t0.0%\t0\t+0.0%\t45\t58.4%',
            '7904 - ĐMS_AGI_TTO - Cô Tô\t6\t14\t100.0%\t11\t1,486\t0.0%\t0\t+0.0%\t11\t100.0%',
            '8231 - ĐMS_AGI_TTO - Lương An Trà\t1\t2\t100.0%\t1\t1,274\t0.0%\t0\t+0.0%\t0\t0.0%',
            'Tổng (1 dòng)\t46\t127\t100.0%\t89\t8,895\t0.0%\t0\t+0.0%\t56\t62.9%',
        ].join('\n');
        const ds = extractAllSupermarketList({
            summaryRealtime,
            // Thi đua có cả tên trông như siêu thị nhưng KHÔNG có trong Doanh thu → vẫn không lấy
            competitionRealtime: 'T10 - Máy Lạnh\nDOANH THU\tTARGET\t% HT THÁNG\nĐML_STR_STR - 99 Hùng Vương\t1\t2\t50\nSiêu thị\t1\t2\t3',
            competitionLuyKe: THI_DUA_LAN_TEN_CHUONG_TRINH,
            supermarketMap: { 'Siêu thị cũ ngoài cụm': '9999' },
            customSupermarkets: ['43 Mậu Thân'],
        });
        expect(ds).toEqual(['1678 - ĐMM_AGI_TTO - Tri Tôn', '7904 - ĐMS_AGI_TTO - Cô Tô', '8231 - ĐMS_AGI_TTO - Lương An Trà', '43 Mậu Thân']);
    });

    it('CHƯA có Doanh thu → mới dùng tạm Thi đua (đã lọc) và bảng mã kho để trang không trống', () => {
        const ds = extractAllSupermarketList({
            competitionRealtime: 'T10 - Máy Lạnh\nDOANH THU\tTARGET\t% HT THÁNG\nĐML_STR_STR - 99 Hùng Vương\t1\t2\t50',
            supermarketMap: { 'Lương An Trà': '8231' },
        });
        expect(ds).toEqual(['Lương An Trà', 'ĐML_STR_STR - 99 Hùng Vương']);
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
