import { describe, expect, it } from 'vitest';
import { computeBonusByGroup, getBonusForProgram, formatBonusShort, unwrapCheckThuongRows, type CtRow } from './checkThuongBonus';

// Dòng theo đúng vị trí cột file Check Thưởng: [.., KENH(3), SIÊU THỊ(4), NGÀNH HÀNG(5), %DK(6), DKV(7), TOP(8), H.VƯỢT(9), H.%TAR(10), T.VƯỢT(11), T.TOP(12), TỔNG(13)]
const row = (kenh: string, store: string, group: string, pct: number, rankVuot: number | '', rankTar: number | '', tVuot: number, tTop: number, tong: number): CtRow =>
    ['', 'Tỉnh', 'QL', kenh, store, group, pct, 0, 7, rankVuot, rankTar, tVuot, tTop, tong];

const ROWS: CtRow[] = [
    row('ĐML', '910 - ĐML_STR_STR - 99 Hùng Vương', 'ĐIỆN THOẠI VIVO', 1.27, 5, '', 699655, 0, 699655),        // thưởng thật
    row('ĐML', '910 - ĐML_STR_STR - 99 Hùng Vương', 'MÁY GIẶT', 1.36, 8, 15, 0, 0, 0),                       // chưa đạt, nhóm có quỹ → dự kiến
    row('ĐML', '649 - ĐML_AGI_CMO - 02 Tỉnh Lộ 942', 'MÁY GIẶT', 1.5, 2, 4, 0, 1945000, 1945000),           // siêu thị khác đạt giải (hạng 4)
    row('ĐML', '899 - ĐML_AGI_CDO - 17A Nguyễn Văn Thoại', 'MÁY GIẶT', 1.4, 3, 2, 0, 1500000, 1500000),     // hạng 2 (thấp hơn 4 → không chọn)
    row('ĐML', '910 - ĐML_STR_STR - 99 Hùng Vương', 'MỞ THẺ TÍN DỤNG TPBANK EVO VÀ VPBANK MWG', 4.28, 2, '', 0, 0, 0), // không siêu thị nào có thưởng → không quỹ
    row('ĐML', '910 - ĐML_STR_STR - 99 Hùng Vương', 'OTT MANGO+, ICALLME -', 2.63, 2, '', 0, 1557000, 1557000),
    row('ĐML', '312 - ĐML_DTH_SDE - 90 Hùng Vương', 'ĐIỆN THOẠI VIVO', 1.1, 9, 12, 0, 0, 0),                  // bẫy: cùng tên đường "Hùng Vương", kho khác
];

describe('computeBonusByGroup — luật chép từ Check Thưởng', () => {
    const map = computeBonusByGroup(ROWS, 'ĐML_STR_STR - 99 Hùng Vương');
    it('khớp siêu thị dù tên Report BI không có mã kho đứng trước', () => {
        expect(map.size).toBe(4);
    });
    it('cột N > 0 → thưởng thật', () => {
        expect(map.get('ĐIỆN THOẠI VIVO')).toEqual({ amount: 699655, kind: 'actual' });
    });
    it('N = 0 nhưng nhóm có quỹ → dự kiến theo siêu thị đạt giải hạng %Target cao nhất', () => {
        expect(map.get('MÁY GIẶT')).toEqual({ amount: 1945000, kind: 'projected' });
    });
    it('không siêu thị nào có thưởng → không quỹ (0)', () => {
        expect(map.get('MỞ THẺ TÍN DỤNG TPBANK EVO VÀ VPBANK MWG')).toEqual({ amount: 0, kind: 'none' });
    });
    it('không thấy siêu thị → Map rỗng', () => {
        expect(computeBonusByGroup(ROWS, 'ĐMS_STR_CTH - An Hiệp').size).toBe(0);
    });
    it('KHÔNG khớp nhầm siêu thị cùng tên đường (bẫy "90 Hùng Vương" kho 312)', () => {
        expect(computeBonusByGroup(ROWS, 'ĐML_STR_STR - 99 Hùng Vương').get('ĐIỆN THOẠI VIVO')?.kind).toBe('actual');
        expect(computeBonusByGroup(ROWS, 'Hùng Vương').size).toBe(0);
    });
    it('có Mã Kho từ bảng map → khớp theo mã dù tên khác hẳn', () => {
        expect(computeBonusByGroup(ROWS, 'Siêu thị Hùng Vương (tên tự đặt)', '910').size).toBe(4);
    });
});

describe('getBonusForProgram — khớp tên gốc Report BI (khác hoa/thường)', () => {
    const map = computeBonusByGroup(ROWS, '910 - ĐML_STR_STR - 99 Hùng Vương');
    it('"Điện thoại Vivo" ↔ "ĐIỆN THOẠI VIVO"', () => {
        expect(getBonusForProgram(map, 'Điện thoại Vivo')?.amount).toBe(699655);
        expect(getBonusForProgram(map, 'Máy giặt')?.kind).toBe('projected');
    });
    it('khác dấu câu nhỏ vẫn khớp (dự phòng lỏng)', () => {
        expect(getBonusForProgram(map, 'OTT MANGO+, ICALLME')?.amount).toBe(1557000);
    });
    it('không có → null', () => {
        expect(getBonusForProgram(map, 'Tivi TCL')).toBeNull();
        expect(getBonusForProgram(new Map(), 'Máy giặt')).toBeNull();
    });
});

describe('formatBonusShort — cùng cách ghi với Check Thưởng', () => {
    it.each([[1117000, '1,117tr'], [892600, '892,6k'], [3002000, '3,002tr'], [0, '0'], [500, '500']])('%d -> %s', (v, s) => {
        expect(formatBonusShort(v)).toBe(s);
    });
});

describe('unwrapCheckThuongRows', () => {
    it('nhận cả mảng thuần lẫn bọc __fsArr (bản đồng bộ Firestore)', () => {
        const rows = unwrapCheckThuongRows({ competitionData: [ROWS[0], { __fsArr: ROWS[1] }, 'rác', null] });
        expect(rows.length).toBe(2);
        expect(rows[1][5]).toBe('MÁY GIẶT');
    });
    it('payload lạ → []', () => {
        expect(unwrapCheckThuongRows(null)).toEqual([]);
        expect(unwrapCheckThuongRows({})).toEqual([]);
    });
});
