import { describe, it, expect } from 'vitest';
import { 
    toggleCompetitionColumn, 
    ALLOWED_REALTIME_COLUMNS, 
    ALLOWED_LUYKE_COLUMNS,
    isSuperCompetitionActive,
    calculateGroupAchievementStats,
    calculateOverallCompetitionKpiStats,
    sortProgramsList
} from './competitionSortAndCalc';
import type { ProcessedProgram } from '../CompetitionView';

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

    it('Luỹ kế: nhóm Vượt trội gồm đủ 3 cột Target V.Trội, %HT V.Trội và %DKHT V.Trội', () => {
        const before = ['L.Kế', 'Target', '%HT', '%DKHT', 'Còn Lại'];
        const after = toggleCompetitionColumn('Target V.Trội', before, LUYKE, false);

        expect(after).toContain('Target V.Trội');
        expect(after).toContain('%HT V.Trội');
        expect(after).toContain('%DKHT V.Trội');
        expect(after).not.toContain('Target');
        expect(after).not.toContain('%HT');
        expect(after).not.toContain('%DKHT');
    });

    it('Luỹ kế: cột %HT V.Trội nằm ngay sau Target V.Trội và trước %DKHT V.Trội', () => {
        const idxTarVT = LUYKE.indexOf('Target V.Trội');
        const idxHtVT = LUYKE.indexOf('%HT V.Trội');
        const idxDkhtVT = LUYKE.indexOf('%DKHT V.Trội');

        expect(idxHtVT).toBe(idxTarVT + 1);
        expect(idxDkhtVT).toBe(idxHtVT + 1);
    });

    it('Luỹ kế: người dùng có thể tuỳ chỉnh tắt bớt cột %HT trong bộ Cơ bản', () => {
        const before = ['L.Kế', 'Target', '%HT', '%DKHT', 'Còn Lại'];
        const afterOffHt = toggleCompetitionColumn('%HT', before, LUYKE, false);

        expect(afterOffHt).not.toContain('%HT');
        expect(afterOffHt).toContain('Target');
        expect(afterOffHt).toContain('%DKHT');
        expect(afterOffHt).toContain('L.Kế');
        expect(afterOffHt).toContain('Còn Lại');

        // Bật lại %HT
        const afterOnHt = toggleCompetitionColumn('%HT', afterOffHt, LUYKE, false);
        expect(afterOnHt).toContain('%HT');
        expect(afterOnHt).toContain('Target');
        expect(afterOnHt).toContain('%DKHT');
    });

    it('Luỹ kế: người dùng có thể tuỳ chỉnh tắt bớt cột %HT V.Trội và %DKHT V.Trội trong bộ Vượt trội', () => {
        const before = ['L.Kế', 'Target V.Trội', '%HT V.Trội', '%DKHT V.Trội', 'Còn Lại'];
        
        // Tắt %HT V.Trội
        const afterOffHtVT = toggleCompetitionColumn('%HT V.Trội', before, LUYKE, false);
        expect(afterOffHtVT).not.toContain('%HT V.Trội');
        expect(afterOffHtVT).toContain('Target V.Trội');
        expect(afterOffHtVT).toContain('%DKHT V.Trội');

        // Tắt tiếp %DKHT V.Trội (chỉ còn lại Target V.Trội)
        const afterOffBoth = toggleCompetitionColumn('%DKHT V.Trội', afterOffHtVT, LUYKE, false);
        expect(afterOffBoth).not.toContain('%DKHT V.Trội');
        expect(afterOffBoth).not.toContain('%HT V.Trội');
        expect(afterOffBoth).toContain('Target V.Trội');

        // Bật lại %HT V.Trội
        const afterOnHtVT = toggleCompetitionColumn('%HT V.Trội', afterOffBoth, LUYKE, false);
        expect(afterOnHtVT).toContain('%HT V.Trội');
        expect(afterOnHtVT).toContain('Target V.Trội');
    });

    it('Realtime: người dùng có thể tuỳ chỉnh tắt bớt cột %HT hoặc %HT V.Trội', () => {
        const standardRT = ['Realtime', 'Target', '%HT', 'Còn Lại'];
        const afterOff = toggleCompetitionColumn('%HT', standardRT, REALTIME, true);
        expect(afterOff).not.toContain('%HT');
        expect(afterOff).toContain('Target');

        const superRT = ['Realtime', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'];
        const afterOffSuper = toggleCompetitionColumn('%HT V.Trội', superRT, REALTIME, true);
        expect(afterOffSuper).not.toContain('%HT V.Trội');
        expect(afterOffSuper).toContain('Target V.Trội');
    });
});

describe('calculateGroupAchievementStats & isSuperCompetitionActive — đếm số ngành hàng >100% và <100%', () => {
    it('isSuperCompetitionActive: nhận diện đúng chế độ Vượt trội vs Cơ bản (bình thường)', () => {
        expect(isSuperCompetitionActive(['L.Kế', 'Target V.Trội', '%HT V.Trội', '%DKHT V.Trội', 'Còn Lại'])).toBe(true);
        expect(isSuperCompetitionActive(['Realtime', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'])).toBe(true);

        expect(isSuperCompetitionActive(['L.Kế', 'Target', '%HT', '%DKHT', 'Còn Lại'])).toBe(false);
        expect(isSuperCompetitionActive(['Realtime', 'Target', '%HT', 'Còn Lại'])).toBe(false);
    });

    const mockHeaders = ['L.Kế', 'Target', '%HT', '%DKHT', 'Target V.Trội', '%HT V.Trội', '%DKHT V.Trội', 'Còn Lại'];

    const mockPrograms: ProcessedProgram[] = [
        {
            metric: 'DTLK',
            name: 'MANGO',
            data: ['202', '150', '135%', '505%', '180', '112%', '450%', '52'],
            conLai: 52
        },
        {
            metric: 'DTLK',
            name: 'REALME',
            data: ['98', '334', '30%', '100%', '350', '28%', '90%', '-236'],
            conLai: -236
        },
        {
            metric: 'DTLK',
            name: 'VAY TIỀN MẶT',
            data: ['0', '164', '0%', '0%', '180', '0%', '0%', '-163'],
            conLai: -163
        }
    ];

    it('Luỹ kế với nhóm Cơ bản (bình thường): so sánh mốc 100% theo %DKHT cơ bản', () => {
        const visibleCols = ['L.Kế', 'Target', '%HT', '%DKHT', 'Còn Lại'];
        const stats = calculateGroupAchievementStats(mockPrograms, mockHeaders, visibleCols, false);

        expect(stats.isSuperMode).toBe(false);
        expect(stats.total).toBe(3);
        // MANGO: 505% (>=100) -> đạt
        // REALME: 100% (>=100) -> đạt
        // VAY TIỀN MẶT: 0% (<100) -> chưa đạt
        expect(stats.over100).toBe(2);
        expect(stats.under100).toBe(1);
    });

    it('Luỹ kế với nhóm Vượt trội (V.Trội): so sánh mốc 100% theo %DKHT V.Trội', () => {
        const visibleCols = ['L.Kế', 'Target V.Trội', '%HT V.Trội', '%DKHT V.Trội', 'Còn Lại'];
        const stats = calculateGroupAchievementStats(mockPrograms, mockHeaders, visibleCols, false);

        expect(stats.isSuperMode).toBe(true);
        expect(stats.total).toBe(3);
        // MANGO: 450% (>=100) -> đạt
        // REALME: 90% (<100) -> chưa đạt (vì target vượt trội cao hơn)
        // VAY TIỀN MẶT: 0% (<100) -> chưa đạt
        expect(stats.over100).toBe(1);
        expect(stats.under100).toBe(2);
    });

    it('Realtime với nhóm Cơ bản: so sánh mốc 100% theo %HT cơ bản', () => {
        const rtHeaders = ['Realtime', 'Target', '%HT', 'Còn Lại'];
        const rtPrograms: ProcessedProgram[] = [
            { metric: 'DTLK', name: 'A', data: ['150', '100', '150%', '50'], conLai: 50 },
            { metric: 'DTLK', name: 'B', data: ['80', '100', '80%', '-20'], conLai: -20 }
        ];
        const stats = calculateGroupAchievementStats(rtPrograms, rtHeaders, rtHeaders, true);

        expect(stats.isSuperMode).toBe(false);
        expect(stats.total).toBe(2);
        expect(stats.over100).toBe(1);
        expect(stats.under100).toBe(1);
    });

    it('Danh sách rỗng: trả về total: 0, over100: 0, under100: 0 an toàn', () => {
        const stats = calculateGroupAchievementStats([], mockHeaders, ['L.Kế', 'Target', '%HT'], false);
        expect(stats.total).toBe(0);
        expect(stats.over100).toBe(0);
        expect(stats.under100).toBe(0);
    });
});

describe('calculateOverallCompetitionKpiStats — 4 thẻ KPI dưới Quỹ thời gian', () => {
    const mockHeaders = ['L.Kế', 'Target', '%HT', '%DKHT', 'Target V.Trội', '%HT V.Trội', '%DKHT V.Trội', 'Còn Lại'];

    // 4 nhóm kiểm thử:
    // P1: %DKHT = 120% (>= 100%) -> Đạt
    // P2: %DKHT = 85%  (80% <= val < 100%) -> Gần đạt
    // P3: %DKHT = 60%  (val < 80% & > 0) -> Chưa đạt
    // P4: %DKHT = 0%   (val === 0) -> Kết quả 0%
    const testPrograms: ProcessedProgram[] = [
        { metric: 'DTLK', name: 'Nhóm 1', data: ['120', '100', '120%', '120%', '150', '80%', '90%', '20'], conLai: 20 },
        { metric: 'DTLK', name: 'Nhóm 2', data: ['85', '100', '85%', '85%', '150', '56%', '60%', '-15'], conLai: -15 },
        { metric: 'DTLK', name: 'Nhóm 3', data: ['60', '100', '60%', '60%', '150', '40%', '40%', '-40'], conLai: -40 },
        { metric: 'DTLK', name: 'Nhóm 4', data: ['0', '100', '0%', '0%', '150', '0%', '0%', '-100'], conLai: -100 }
    ];

    it('Tính chuẩn xác 4 chỉ số KPI ở chế độ Cơ bản', () => {
        const visibleCols = ['L.Kế', 'Target', '%HT', '%DKHT', 'Còn Lại'];
        const stats = calculateOverallCompetitionKpiStats(testPrograms, mockHeaders, visibleCols, false);

        expect(stats.isSuperMode).toBe(false);
        expect(stats.total).toBe(4);

        // 1. % số nhóm đạt 100%: 1/4 = 25%
        expect(stats.countOver100).toBe(1);
        expect(stats.pctOver100).toBe(25);

        // 2. % số nhóm < 100%: 3/4 = 75%
        expect(stats.countUnder100).toBe(3);
        expect(stats.pctUnder100).toBe(75);

        // 3. 80% < Số nhóm < 100%: 1 nhóm (Nhóm 2: 85%)
        expect(stats.countNear100).toBe(1);
        expect(stats.pctNear100).toBe(25);

        // 4. Số nhóm kết quả 0%: 1 nhóm (Nhóm 4: 0%)
        expect(stats.countZero).toBe(1);
        expect(stats.pctZero).toBe(25);
    });

    it('Tự động chuyển đổi khi xem Vượt trội', () => {
        const visibleCols = ['L.Kế', 'Target V.Trội', '%HT V.Trội', '%DKHT V.Trội', 'Còn Lại'];
        const stats = calculateOverallCompetitionKpiStats(testPrograms, mockHeaders, visibleCols, false);

        expect(stats.isSuperMode).toBe(true);
        expect(stats.total).toBe(4);
        // %DKHT V.Trội:
        // Nhóm 1: 90% (80 <= val < 100) -> countNear100
        // Nhóm 2: 60% (< 80)
        // Nhóm 3: 40% (< 80)
        // Nhóm 4: 0%  (0%) -> countZero
        expect(stats.countOver100).toBe(0);
        expect(stats.countUnder100).toBe(4);
        expect(stats.countNear100).toBe(1);
        expect(stats.countZero).toBe(1);
    });

    it('Danh sách rỗng: không bị chia cho 0 (NaN)', () => {
        const stats = calculateOverallCompetitionKpiStats([], mockHeaders, ['L.Kế', 'Target', '%HT'], false);
        expect(stats.total).toBe(0);
        expect(stats.pctOver100).toBe(0);
        expect(stats.pctUnder100).toBe(0);
        expect(stats.pctNear100).toBe(0);
        expect(stats.pctZero).toBe(0);
    });
});

describe('sortProgramsList — hỗ trợ customOrder (thứ tự kéo thả tuỳ chỉnh)', () => {
    const mockHeaders = ['Tiêu chí', 'L.Kế', 'Target', '%HT', '%DKHT'];
    const p1: ProcessedProgram = { name: 'CHƯƠNG TRÌNH A', metric: 'SLLK', data: ['10', '100', '10%', '20%'], conLai: 90 };
    const p2: ProcessedProgram = { name: 'CHƯƠNG TRÌNH B', metric: 'SLLK', data: ['50', '100', '50%', '60%'], conLai: 50 };
    const p3: ProcessedProgram = { name: 'CHƯƠNG TRÌNH C', metric: 'SLLK', data: ['90', '100', '90%', '95%'], conLai: 10 };

    it('áp dụng đúng thứ tự customOrder khi sortConfig là null', () => {
        const customOrder = ['CHƯƠNG TRÌNH C', 'CHƯƠNG TRÌNH A', 'CHƯƠNG TRÌNH B'];
        const sorted = sortProgramsList([p1, p2, p3], null, mockHeaders, {}, ['Target', '%HT'], false, customOrder);
        expect(sorted.map(p => p.name)).toEqual(['CHƯƠNG TRÌNH C', 'CHƯƠNG TRÌNH A', 'CHƯƠNG TRÌNH B']);
    });

    it('nếu người dùng click sort cột rõ ràng, sortConfig sẽ được ưu tiên hơn customOrder', () => {
        const customOrder = ['CHƯƠNG TRÌNH C', 'CHƯƠNG TRÌNH A', 'CHƯƠNG TRÌNH B'];
        // Sort theo %HT (cột 3) giảm dần -> B (50%), C (90%), A (10%) -> C, B, A
        const sorted = sortProgramsList([p1, p2, p3], { columnIndex: 3, direction: 'desc' }, mockHeaders, {}, ['Target', '%HT'], false, customOrder);
        expect(sorted.map(p => p.name)).toEqual(['CHƯƠNG TRÌNH C', 'CHƯƠNG TRÌNH B', 'CHƯƠNG TRÌNH A']);
    });

    it('các chương trình chưa có trong customOrder được đặt ở phía sau một cách ổn định', () => {
        const customOrder = ['CHƯƠNG TRÌNH B'];
        const sorted = sortProgramsList([p1, p2, p3], null, mockHeaders, {}, ['Target', '%HT'], false, customOrder);
        expect(sorted[0].name).toBe('CHƯƠNG TRÌNH B');
    });
});

