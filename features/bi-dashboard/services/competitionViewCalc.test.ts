import { describe, it, expect } from 'vitest';
import type { SupermarketCompetitionData } from '../utils/dashboardHelpers';
import { buildCompetitionTable } from './competitionViewCalc';

/**
 * Đợt 1.5 — dựng bảng Thi đua của một siêu thị.
 *
 * Khối tách nguyên văn bằng script, nên test ở đây khoá các HÀNH VI dễ vỡ nhất khi dựng lại giao
 * diện: đổi tên cột theo chế độ, loại cột không thuộc chế độ, 2 cột phái sinh %HT V.Trội và
 * Còn Lại, và QUY ƯỚC DẤU của Còn Lại.
 */

const data = (headers: string[], rows: (string | number)[][]): SupermarketCompetitionData =>
    ({ headers, programs: rows.map((data, i) => ({ name: `CT${i}`, data, metric: 'SLLK' })) }) as SupermarketCompetitionData;

describe('buildCompetitionTable — khung', () => {
    it('không có dữ liệu ⇒ undefined, không ném lỗi', () => {
        expect(buildCompetitionTable(undefined, false)).toBeUndefined();
        expect(buildCompetitionTable({ headers: undefined } as unknown as SupermarketCompetitionData, false)).toBeUndefined();
    });

    it('luôn có cột "Còn Lại" ở cuối khi bảng có cột', () => {
        const r = buildCompetitionTable(data(['DTLK', 'Target'], [[100, 80]]), false);
        expect(r!.headers).toContain('Còn Lại');
    });
});

describe('đổi tên cột theo chế độ', () => {
    it('Luỹ kế: DTLK/DTQĐ/SLLK đều đổi thành "L.Kế"', () => {
        expect(buildCompetitionTable(data(['DTLK', 'Target'], [[10, 5]]), false)!.headers).toContain('L.Kế');
        expect(buildCompetitionTable(data(['SLLK', 'Target'], [[10, 5]]), false)!.headers).toContain('L.Kế');
    });

    it('Realtime: "DT Realtime"/"SỐ LƯỢNG (RT)" đổi thành "Realtime"', () => {
        expect(buildCompetitionTable(data(['DT Realtime', 'Target Ngày'], [[10, 5]]), true)!.headers).toContain('Realtime');
        expect(buildCompetitionTable(data(['SỐ LƯỢNG (RT)', 'TARGET'], [[10, 5]]), true)!.headers).toContain('Realtime');
    });

    it('cột thứ hạng vùng bị loại bỏ hoàn toàn', () => {
        const r = buildCompetitionTable(data(['DTLK', 'Target', 'HẠNG VÙNG'], [[10, 5, 'A']]), false);
        expect(r!.headers).not.toContain('HẠNG VÙNG');
        expect(r!.programs[0].data.length, 'dữ liệu dòng cũng phải bỏ đúng ô đó').toBe(r!.headers.length);
    });

    it('cột của chế độ KIA bị loại — Realtime không được lẫn cột Luỹ kế', () => {
        const r = buildCompetitionTable(data(['DT Realtime', 'Target Ngày', 'DTLK'], [[10, 5, 999]]), true);
        expect(r!.headers).not.toContain('L.Kế');
    });
});

describe('cột phái sinh %HT V.Trội (chỉ Luỹ kế)', () => {
    it('có Target V.Trội thì tự chèn cột %HT V.Trội và tính = L.Kế / Target V.Trội', () => {
        const r = buildCompetitionTable(data(['DTLK', 'Target', 'Target V.Trội'], [[80, 50, 100]]), false)!;
        const i = r.headers.indexOf('%HT V.Trội');
        expect(i).toBeGreaterThan(-1);
        expect(r.programs[0].data[i], '80/100 ⇒ 80%').toBe(80);
    });

    it('Target V.Trội = 0 ⇒ 0, không ra Infinity', () => {
        const r = buildCompetitionTable(data(['DTLK', 'Target', 'Target V.Trội'], [[80, 50, 0]]), false)!;
        const i = r.headers.indexOf('%HT V.Trội');
        expect(r.programs[0].data[i]).toBe(0);
    });

    it('không có Target V.Trội thì KHÔNG chèn cột', () => {
        const r = buildCompetitionTable(data(['DTLK', 'Target'], [[80, 50]]), false)!;
        expect(r.headers).not.toContain('%HT V.Trội');
    });
});

describe('cột Còn Lại — quy ước dấu', () => {
    it('ÂM khi chưa đạt, DƯƠNG khi vượt (conLai = thực hiện - mục tiêu)', () => {
        const chuaDat = buildCompetitionTable(data(['DTLK', 'Target'], [[30, 100]]), false)!;
        expect(chuaDat.programs[0].conLai, 'thiếu 70 ⇒ -70').toBe(-70);

        const vuot = buildCompetitionTable(data(['DTLK', 'Target'], [[150, 100]]), false)!;
        expect(vuot.programs[0].conLai, 'vượt 50 ⇒ +50').toBe(50);
    });

    it('ưu tiên Target V.Trội hơn Target khi cả hai cùng có', () => {
        const r = buildCompetitionTable(data(['DTLK', 'Target', 'Target V.Trội'], [[100, 50, 200]]), false)!;
        expect(r.programs[0].conLai, '100 - 200 (V.Trội) chứ không phải 100 - 50').toBe(-100);
    });

    it('thiếu cột thực hiện hoặc mục tiêu ⇒ conLai = null (hiển thị "-")', () => {
        const r = buildCompetitionTable(data(['DTLK'], [[100]]), false)!;
        expect(r.programs[0].conLai).toBeNull();
    });
});

describe('không làm hỏng dữ liệu gốc', () => {
    it('mảng programs đầu vào KHÔNG bị sửa (deep clone bên trong)', () => {
        const input = data(['DTLK', 'Target'], [[10, 5]]);
        const snapshot = JSON.stringify(input);
        buildCompetitionTable(input, false);
        expect(JSON.stringify(input), 'hàm phải thuần, không đụng tham số').toBe(snapshot);
    });
});
