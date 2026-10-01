import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCompetitionData, validateThiDuaData } from './nhanVienHelpers';

/**
 * Thi đua Luỹ kế theo NHÂN VIÊN — userscript 7.10 (acpSerializeCompetitionStaff) dựng ô "Thi đua" của từng siêu thị
 * từ API competition-bymsg-get (VIEWLEVEL STORE + STOREIDS). Dữ liệu TRÍCH mẫu API thật chủ dự án gửi 2026-10-01
 * (kho 910, 09/2026). Toàn bộ 971 dòng mẫu đã chạy thử qua bộ đọc: đủ 39 chương trình, tổng khớp API.
 * Đưa qua ĐÚNG bộ đọc của ô Thi đua (parseCompetitionData) và đối chiếu.
 */
const SRC = readFileSync(resolve(__dirname, '../../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js'), 'utf-8');
const cat = (from: string, to: string) => SRC.slice(SRC.indexOf(from), SRC.indexOf(to));
const serialize = new Function(`${cat('  function acpCompIsQty(item) {', '  function acpSerializeCompetitionRealtime(')}
${cat('  function acpSerializeCompetitionStaff(', '  // TRẢ CHẬM theo NHÂN VIÊN')}; return acpSerializeCompetitionStaff;`)() as (rows: unknown[], storeId?: unknown) => string;

const dong = (programid: number, programname: string, competitiontype: number, salegroupid: string, salegroupname: string, quantity: number, revenue: number, storeid = 910) =>
    ({ programid, programname, competitiontype, columnname: 'STAFFUSER', salegroupid, salegroupname, revenue_kfactor: 0, quantity, revenue, target: null, targetpercent_month: null, storeid });

const MAU = [
    dong(865, 'Bảo hiểm tổng', 4, '17952', 'Đinh Thị Mỹ Hương', 20, 114.84),
    dong(865, 'Bảo hiểm tổng', 4, '95970', 'Chế Thị Út', 33, 154.94),
    dong(865, 'Bảo hiểm tổng', 4, 'online', 'Online', 2, 9.5),
    dong(868, 'SIM tổng', 2, '95970', 'Chế Thị Út', 12, 3.1),
    dong(868, 'SIM tổng', 2, '17952', 'Đinh Thị Mỹ Hương', 7, 1.2),
    dong(897, 'NẠP RÚT TIỀN TÀI KHOẢN NGÂN HÀNG', 6, '95970', 'Chế Thị Út', 30, 1440.29),
    dong(880, 'Máy giặt', 3, '95970', 'Chế Thị Út', 4, 52.25),
    dong(880, 'Máy giặt', 3, '11111', 'Nhân viên kho khác', 9, 99, 1678),
];

describe('Thi đua theo nhân viên từ API → ô Thi đua của siêu thị', () => {
    const text = serialize(MAU, 910);
    const nv = { '95970 - Chế Thị Út': 'BP Tư Vấn', '17952 - Đinh Thị Mỹ Hương': 'BP Thu Ngân' };
    const kq = parseCompetitionData(text, nv);
    const headers = kq.DTLK.headers; // bộ đọc gom SỐ LƯỢNG vào nhóm DTLK, mỗi header giữ metric gốc
    const giaTri = (ma: string, ct: string) => {
        const i = headers.findIndex(h => h.originalTitle === ct);
        return kq.DTLK.employees.find(e => e.originalName.startsWith(ma))?.values[i];
    };

    it('ô Thi đua nhận ra là dữ liệu thi đua', () => {
        expect(validateThiDuaData(text)).toBe(true);
    });

    it('đủ tên chương trình (không ra "Chương trình 0"), đúng loại số', () => {
        expect(headers.map(h => `${h.originalTitle}|${h.metric}`).sort()).toEqual([
            'Bảo hiểm tổng|DTLK', 'Máy giặt|DTLK', 'NẠP RÚT TIỀN TÀI KHOẢN NGÂN HÀNG|SLLK', 'SIM tổng|SLLK',
        ]);
    });

    it('giá trị từng nhân viên: doanh thu (Tr, 2 số lẻ) hoặc số lượng theo competitiontype', () => {
        expect(giaTri('95970', 'Bảo hiểm tổng')).toBeCloseTo(154.94, 2);
        expect(giaTri('17952', 'Bảo hiểm tổng')).toBeCloseTo(114.84, 2);
        expect(giaTri('95970', 'SIM tổng')).toBe(12);
        expect(giaTri('95970', 'NẠP RÚT TIỀN TÀI KHOẢN NGÂN HÀNG')).toBe(30); // type 6 = số lượng
        expect(giaTri('95970', 'Máy giặt')).toBeCloseTo(52.25, 2);
        expect(kq.DTLK.employees.find(e => e.originalName.startsWith('95970'))?.department).toBe('BP Tư Vấn');
    });

    it('bỏ dòng "online" và nhân viên của siêu thị khác', () => {
        expect(text).not.toMatch(/online/i);
        expect(text).not.toContain('11111');
    });

    it('tên chương trình trùng kiểu "dòng rác trang" vẫn giữ được, không lấy nhầm dòng nhân viên', () => {
        const t = serialize([
            dong(1, 'Bảo hiểm tổng', 4, '95970', 'Chế Thị Út', 1, 10),
            dong(2, 'Siêu thị xanh', 3, '95970', 'Chế Thị Út', 1, 20),
            dong(3, 'Chương trình 5', 3, '95970', 'Chế Thị Út', 1, 30),
        ], 910);
        const titles = parseCompetitionData(t, nv).DTLK.headers.map(h => h.originalTitle);
        expect(titles).toEqual(['Bảo hiểm tổng', 'TĐ Siêu thị xanh', 'CT 5']);
    });

    it('API rỗng → chuỗi rỗng (không ghi đè ô cũ)', () => {
        expect(serialize([], 910)).toBe('');
    });
});
