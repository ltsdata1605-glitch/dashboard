import { describe, it, expect } from 'vitest';
import { toggleCompetitionColumn, ALLOWED_REALTIME_COLUMNS, ALLOWED_LUYKE_COLUMNS } from './competitionSortAndCalc';

/**
 * Lưới an toàn cho quy tắc LIÊN KẾT NHÓM CỘT của bảng Thi đua (thêm ngày 2026-09-09).
 *
 * Vì sao test ở tầng đơn vị chứ không phải E2E: trước đây quy tắc này được phủ gián tiếp bằng 1
 * test Playwright lái popup "Bộ lọc thi đua" (bấm nút gạt rồi đọc lại header bảng). Cách đó rất
 * dễ vỡ — nhãn cột đi qua `getCompetitionColumnLabel()` nên đổi hoa/thường là hỏng selector, popup
 * lại tự đóng sau mỗi lần gạt. Trong khi đó `toggleCompetitionColumn()` là HÀM THUẦN, nên kiểm
 * đúng 4 quy tắc đã ghi trong tài liệu của nó ở đây vừa chính xác vừa chạy trong mili-giây.
 *
 * 4 quy tắc (trích từ chính comment của hàm):
 *   1. Bật 1 cột nhóm Cơ bản  => bật CẢ nhóm Cơ bản, TẮT nhóm Vượt trội.
 *   2. Bật 1 cột nhóm Vượt trội => bật CẢ nhóm Vượt trội, TẮT nhóm Cơ bản.
 *   3. Bấm vào cột của nhóm ĐANG bật => chuyển sang nhóm còn lại (luôn còn 1 bộ Target để tính
 *      cột "Còn Lại" — đây là lý do nghiệp vụ, không phải tiện tay).
 *   4. Cột độc lập (T.HIỆN/L.Kế/Còn Lại) bật/tắt bình thường.
 */

const LUYKE = [...ALLOWED_LUYKE_COLUMNS];
const REALTIME = [...ALLOWED_REALTIME_COLUMNS];

const superCols = (cols: string[]) => cols.filter(c => c.includes('V.Trội'));
const standardCols = (cols: string[]) => cols.filter(c => c === 'Target' || c === '%HT' || c === '%DKHT');

describe('toggleCompetitionColumn — liên kết 2 nhóm cột loại trừ nhau', () => {
    it('quy tắc 1: đang bật nhóm Vượt trội, bấm "Target" → bật cả nhóm Cơ bản và TẮT SẠCH Vượt trội', () => {
        const before = ['L.Kế', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
        const after = toggleCompetitionColumn('Target', before, LUYKE, false);

        expect(superCols(after), 'nhóm Vượt trội phải bị tắt hết').toEqual([]);
        expect(after).toContain('Target');
        expect(standardCols(after).length, 'phải bật CẢ nhóm Cơ bản chứ không chỉ cột vừa bấm').toBeGreaterThan(1);
    });

    it('quy tắc 2: đang bật nhóm Cơ bản, bấm "Target V.Trội" → bật cả nhóm Vượt trội và TẮT SẠCH Cơ bản', () => {
        const before = ['L.Kế', 'Target', '%HT', '%DKHT', 'Còn Lại'];
        const after = toggleCompetitionColumn('Target V.Trội', before, LUYKE, false);

        expect(standardCols(after), 'nhóm Cơ bản phải bị tắt hết').toEqual([]);
        expect(after).toContain('Target V.Trội');
        expect(superCols(after).length, 'phải bật CẢ nhóm Vượt trội').toBeGreaterThan(1);
    });

    it('quy tắc 3: bấm vào cột của nhóm ĐANG bật thì KHÔNG tắt trắng mà chuyển sang nhóm kia — luôn còn 1 bộ Target', () => {
        const withStandard = ['L.Kế', 'Target', '%HT', '%DKHT', 'Còn Lại'];
        const afterA = toggleCompetitionColumn('Target', withStandard, LUYKE, false);
        expect(standardCols(afterA)).toEqual([]);
        expect(superCols(afterA).length, 'tắt nhóm Cơ bản thì phải bật nhóm Vượt trội thay thế').toBeGreaterThan(0);

        const afterB = toggleCompetitionColumn('Target V.Trội', afterA, LUYKE, false);
        expect(superCols(afterB)).toEqual([]);
        expect(standardCols(afterB).length, 'và ngược lại').toBeGreaterThan(0);
    });

    it('quy tắc 3 (hệ quả quan trọng): KHÔNG BAO GIỜ rơi vào trạng thái mất cả 2 nhóm Target', () => {
        // Bấm liên tiếp 6 lần vào các cột Target khác nhau — sau mỗi lần vẫn phải còn đúng 1 nhóm.
        let cols = ['L.Kế', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
        for (const click of ['Target', 'Target V.Trội', '%HT', '%HT V.Trội', '%DKHT', 'Target V.Trội']) {
            cols = toggleCompetitionColumn(click, cols, LUYKE, false);
            const conBo = standardCols(cols).length > 0 || superCols(cols).length > 0;
            expect(conBo, `sau khi bấm "${click}" thì mất sạch cả 2 nhóm Target → cột "Còn Lại" hết căn cứ tính`).toBe(true);
        }
    });

    it('quy tắc 4: cột độc lập bật/tắt bình thường, KHÔNG kéo theo nhóm nào', () => {
        const before = ['L.Kế', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];

        const afterOff = toggleCompetitionColumn('Còn Lại', before, LUYKE, false);
        expect(afterOff).not.toContain('Còn Lại');
        expect(superCols(afterOff), 'tắt cột độc lập không được đụng tới nhóm Target').toEqual(superCols(before));

        const afterOn = toggleCompetitionColumn('Còn Lại', afterOff, LUYKE, false);
        expect(afterOn).toContain('Còn Lại');
    });

    it('Realtime: nhóm Cơ bản KHÔNG có %DKHT (chỉ Luỹ kế mới có)', () => {
        const after = toggleCompetitionColumn('Target', ['Realtime', 'Target V.Trội', '%HT V.Trội'], REALTIME, true);
        expect(after).toContain('Target');
        expect(after, 'Realtime không được tự bật %DKHT').not.toContain('%DKHT');
    });

    it('kết quả luôn giữ THỨ TỰ CHUẨN theo allAllowedColumns, không phải thứ tự bấm', () => {
        const after = toggleCompetitionColumn('Target', ['Còn Lại', 'L.Kế'], LUYKE, false);
        const indices = after.map(c => (LUYKE as string[]).indexOf(c));
        expect(indices, 'thứ tự cột phải tăng dần theo bảng chuẩn').toEqual([...indices].sort((a, b) => a - b));
        expect(after.every(c => (LUYKE as string[]).includes(c)), 'không được sinh ra cột lạ ngoài danh sách cho phép').toBe(true);
    });
});
