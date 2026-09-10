import { describe, it, expect } from 'vitest';
import { buildSummaryTable, type SummaryTableInput, type BuildSummaryTableOptions } from './summaryTableCalc';

/**
 * Đợt 1.4 — dây chuyền dựng bảng "Tổng quan Siêu thị".
 *
 * Khối này tách NGUYÊN VĂN bằng script (không gõ tay), nên rủi ro chép sai gần như bằng 0. Test ở
 * đây khoá các HÀNH VI dễ vỡ nhất khi sau này dựng lại giao diện: thứ tự cột, gộp cặp cột, ghim
 * dòng "Tổng", lọc siêu thị ẩn.
 */

const opts = (o: Partial<BuildSummaryTableOptions> = {}): BuildSummaryTableOptions => ({
    isCumulative: false,
    activeSupermarket: 'Tổng',
    supermarketMonthlyTargets: {},
    hiddenSupermarkets: [],
    daysInMonth: 30,
    ...o,
});

/** Bảng tối thiểu đủ để dây chuyền chạy hết các nhánh. */
const input = (rows: string[][]): SummaryTableInput => ({
    headers: ['Tên miền', 'DT Hôm Qua', 'DTLK', 'DTQĐ', 'Target (QĐ)', '% HT Target (QĐ)', 'Lượt Khách LK', '+/- Lượt Khách'],
    rows,
});

describe('buildSummaryTable — khung bảng', () => {
    it('bảng rỗng vẫn trả cấu trúc hợp lệ kèm tiêu đề, không ném lỗi', () => {
        const r = buildSummaryTable({ headers: [], rows: [] }, opts());
        expect(r.allHeaders).toEqual([]);
        expect(r.allRows).toEqual([]);
        expect(r.title).toContain('REALTIME DOANH THU');
    });

    it('tiêu đề đổi theo chế độ Realtime / Luỹ kế', () => {
        expect(buildSummaryTable(input([]), opts({ isCumulative: false })).title).toContain('REALTIME');
        expect(buildSummaryTable(input([]), opts({ isCumulative: true })).title).toContain('LUỸ KẾ');
    });

    it('chọn 1 siêu thị thì tiêu đề mang tên siêu thị đó, chọn "Tổng" thì ghi TỔNG QUAN', () => {
        expect(buildSummaryTable(input([]), opts({ activeSupermarket: 'Tổng' })).title).toContain('TỔNG QUAN');
        const one = buildSummaryTable(input([]), opts({ activeSupermarket: 'ĐML_STR_STR - 99 Hùng Vương' })).title;
        expect(one).not.toContain('TỔNG QUAN');
    });

    it('loại dòng trùng "Tên miền", chỉ giữ lần xuất hiện ĐẦU TIÊN', () => {
        const r = buildSummaryTable(
            input([['ST A', '1', '10', '12', '0', '0%', '5', '1'], ['ST A', '2', '20', '24', '0', '0%', '5', '1']]),
            opts()
        );
        expect(r.allRows.length).toBe(1);
    });
});

describe('cột phái sinh %HQQĐ', () => {
    it('tính đúng phần DTQĐ vượt so với DT thực', () => {
        const r = buildSummaryTable(input([['ST A', '0', '100', '150', '0', '0%', '0', '0']]), opts({ isCumulative: true }));
        const i = r.allHeaders.indexOf('%HQQĐ');
        expect(i).toBeGreaterThan(-1);
        expect(r.allRows[0][i], '150 so với 100 ⇒ vượt 50%').toBe('50%');
    });

    it('DT thực = 0 ⇒ 0%, không ra Infinity', () => {
        const r = buildSummaryTable(input([['ST A', '0', '0', '150', '0', '0%', '0', '0']]), opts({ isCumulative: true }));
        const i = r.allHeaders.indexOf('%HQQĐ');
        expect(r.allRows[0][i]).toBe('0%');
    });
});

describe('gộp cặp cột "giá trị + tăng trưởng" thành một ô', () => {
    it('cột tăng trưởng biến mất khỏi header, giá trị gộp vào ô gốc', () => {
        const r = buildSummaryTable(input([['ST A', '0', '10', '12', '0', '0%', '500', '+7%']]), opts());
        expect(r.allHeaders, 'cột +/- bị gộp nên không còn đứng riêng').not.toContain('+/- Lượt Khách');

        const i = r.allHeaders.indexOf('Lượt Khách LK');
        const cell = r.allRows[0][i];
        expect(cell.isMerged).toBe(true);
        expect(cell.value).toBe('500');
        expect(cell.growth).toBe('+7%');
    });
});

describe('thứ tự cột và dòng', () => {
    it('"Tên miền" luôn đứng đầu', () => {
        const r = buildSummaryTable(input([['ST A', '0', '10', '12', '0', '0%', '0', '0']]), opts());
        expect(r.allHeaders[0]).toBe('Tên miền');
    });

    it('dòng "Tổng" luôn bị ghim XUỐNG CUỐI dù sắp xếp thế nào', () => {
        const r = buildSummaryTable(
            input([
                ['Tổng', '0', '100', '120', '0', '50%', '0', '0'],
                ['ST A', '0', '10', '12', '0', '10%', '0', '0'],
                ['ST B', '0', '20', '24', '0', '90%', '0', '0'],
            ]),
            opts()
        );
        expect(r.allRows[r.allRows.length - 1][0]).toBe('Tổng');
    });

    it('siêu thị bị ẩn không xuất hiện, nhưng dòng "Tổng" thì KHÔNG bị ẩn nhầm', () => {
        const r = buildSummaryTable(
            input([
                ['ST A', '0', '10', '12', '0', '0%', '0', '0'],
                ['ST B', '0', '20', '24', '0', '0%', '0', '0'],
                ['Tổng', '0', '30', '36', '0', '0%', '0', '0'],
            ]),
            opts({ hiddenSupermarkets: ['ST A'] })
        );
        const names = r.allRows.map(row => row[0]);
        expect(names).not.toContain('ST A');
        expect(names).toContain('ST B');
        expect(names, 'dòng Tổng được tách ra trước khi lọc nên không bị ảnh hưởng').toContain('Tổng');
    });

    it('sắp xếp GIẢM DẦN theo %HT V.Trội — cột này ƯU TIÊN hơn "% HT Target (QĐ)"', () => {
        // Khoá sắp xếp KHÔNG phải cột "% HT Target (QĐ)" có sẵn trong dữ liệu: hễ bảng có
        // "%HT V.Trội" (luôn được chèn ở chế độ Realtime) thì cột đó thắng. Đây là hành vi thật,
        // phát hiện khi test đầu tiên đỏ — giả định ban đầu của người viết test mới là cái sai.
        const r = buildSummaryTable(
            input([
                ['ST A', '0', '10', '12', '0', '90%', '0', '0'],   // %HT Target(QĐ) cao...
                ['ST B', '0', '20', '24', '0', '10%', '0', '0'],
            ]),
            // ...nhưng target tháng làm %HT V.Trội của ST B cao hơn hẳn: 24/(300/30) = 240%
            opts({ supermarketMonthlyTargets: { 'ST A': 30000, 'ST B': 300 } })
        );
        expect(r.allRows[0][0], 'thắng theo %HT V.Trội chứ không theo % HT Target (QĐ)').toBe('ST B');
    });

    it('KHÔNG có cột %HT V.Trội thì mới rơi về "% HT Target Dự Kiến (QĐ)" (chế độ Luỹ kế)', () => {
        const r = buildSummaryTable(
            {
                headers: ['Tên miền', 'DTLK', 'DTQĐ', '% HT Target Dự Kiến (QĐ)'],
                rows: [['ST A', '10', '12', '10%'], ['ST B', '20', '24', '90%']],
            },
            opts({ isCumulative: true })
        );
        expect(r.allRows[0][0]).toBe('ST B');
    });
});

describe('Target V.Trội theo target tháng', () => {
    it('chế độ Realtime chia target tháng cho số ngày để ra target NGÀY', () => {
        const r = buildSummaryTable(
            input([['ST A', '0', '100', '150', '0', '0%', '0', '0']]),
            opts({ supermarketMonthlyTargets: { 'ST A': 3000 }, daysInMonth: 30 })
        );
        const i = r.allHeaders.indexOf('Target(QĐ) V.Trội');
        expect(i).toBeGreaterThan(-1);
        expect(r.allRows[0][i], '3000 / 30 ngày').toBe(100);
    });

    it('dòng "Tổng" cộng target tháng của MỌI siêu thị', () => {
        const r = buildSummaryTable(
            input([['Tổng', '0', '100', '150', '0', '0%', '0', '0']]),
            opts({ supermarketMonthlyTargets: { A: 3000, B: 6000 }, daysInMonth: 30 })
        );
        const i = r.allHeaders.indexOf('Target(QĐ) V.Trội');
        expect(r.allRows[0][i], '(3000 + 6000) / 30').toBe(300);
    });

    it('daysInMonth tiêm vào có tác dụng (test tất định, không phụ thuộc ngày chạy)', () => {
        const mk = (d: number) => {
            const r = buildSummaryTable(
                input([['ST A', '0', '100', '150', '0', '0%', '0', '0']]),
                opts({ supermarketMonthlyTargets: { 'ST A': 2800 }, daysInMonth: d })
            );
            return r.allRows[0][r.allHeaders.indexOf('Target(QĐ) V.Trội')];
        };
        expect(mk(28)).toBe(100);
        expect(mk(31)).toBeCloseTo(2800 / 31);
    });
});
