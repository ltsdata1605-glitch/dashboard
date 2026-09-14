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

describe('loại bỏ các cột SL, %TT, +/-CK, DT và giữ lại TB 3T', () => {
    it('loại trừ Số lượng, % Tỉ trọng, +/- DTCK Tháng (QĐ), DT TRẢ GÓP và giữ lại TB 3 Tháng', () => {
        const fullHeaders = [
            'Tên miền',
            'Số lượng',
            'DTQĐ',
            '% Tỉ trọng',
            'DTLK',
            'Target (QĐ)',
            '% HT Target (QĐ)',
            'TB 3 Tháng',
            '+/- DTCK Tháng (QĐ)',
            'DT TRẢ GÓP',
            'Tỷ Trọng Trả Góp',
        ];
        const row = ['HÙNG VƯƠNG', '4411', '13361', '100%', '8650', '28562', '47%', '11615', '15%', '4315', '50%'];
        const r = buildSummaryTable({ headers: fullHeaders, rows: [row] }, opts({ isCumulative: true }));

        expect(r.allHeaders).not.toContain('Số lượng');
        expect(r.allHeaders).not.toContain('% Tỉ trọng');
        expect(r.allHeaders).not.toContain('+/- DTCK Tháng (QĐ)');
        expect(r.allHeaders).not.toContain('DT TRẢ GÓP');
        expect(r.allHeaders).toContain('TB 3 Tháng');
        expect(r.allHeaders).toContain('% TT');
        const tbIdx = r.allHeaders.indexOf('TB 3 Tháng');
        const ttIdx = r.allHeaders.indexOf('% TT');
        expect(ttIdx).toBe(tbIdx + 1);
        expect(r.allRows[0][ttIdx]).toBe('+15%');
        expect(r.allHeaders).toContain('Tỷ Trọng Trả Góp');
        expect(r.allHeaders).toContain('DTLK');
        expect(r.allHeaders).toContain('DTQĐ');
    });

    it('tự động tính % TT nếu bảng có TB 3 Tháng nhưng chưa có cột % TT', () => {
        const fullHeaders = ['Tên miền', 'DTQĐ', 'TB 3 Tháng'];
        // DTQĐ 14804 vs TB3T 12583 -> (14804 - 12583) / 12583 = +17.7%
        const row = ['HÙNG VƯƠNG', '14804', '12583'];
        const r = buildSummaryTable({ headers: fullHeaders, rows: [row] }, opts({ isCumulative: true }));

        const tbIdx = r.allHeaders.indexOf('TB 3 Tháng');
        const ttIdx = r.allHeaders.indexOf('% TT');
        expect(ttIdx).toBe(tbIdx + 1);
        expect(r.allRows[0][ttIdx]).toBe('+17.7%');
    });
});

describe('bổ sung cột DT Dự Kiến (QĐ) và %DKHT', () => {
    it('chèn DT Dự Kiến (QĐ) ngay sau DTQĐ và %DKHT ngay sau % HT Target (QĐ) với công thức nhịp ngày', () => {
        const fullHeaders = [
            'Tên miền',
            'DTQĐ',
            'DTLK',
            'Target (QĐ)',
            '% HT Target (QĐ)',
            'Tỷ Trọng Trả Góp',
            'TB 3 Tháng',
        ];
        // DTQĐ = 12000, Target = 30000, passedDays = 12, daysInMonth = 30
        // projected = (12000 / 12) * 30 = 30000
        // %DKHT = (30000 / 30000) * 100 = 100%
        const row = ['ST A', '12000', '10000', '30000', '40%', '50%', '11000'];
        const r = buildSummaryTable(
            { headers: fullHeaders, rows: [row] },
            opts({ isCumulative: true, daysInMonth: 30, passedDays: 12 })
        );

        // Vị trí cột: DT Dự Kiến (QĐ) sau DTQĐ
        const dtqdIdx = r.allHeaders.indexOf('DTQĐ');
        const dkIdx = r.allHeaders.indexOf('DT Dự Kiến (QĐ)');
        expect(dkIdx).toBe(dtqdIdx + 1);

        // Vị trí cột: %DKHT sau % HT Target (QĐ)
        const htIdx = r.allHeaders.indexOf('% HT Target (QĐ)');
        const dkhtIdx = r.allHeaders.indexOf('%DKHT');
        expect(dkhtIdx).toBe(htIdx + 1);

        // Giá trị tính toán
        expect(r.allRows[0][dkIdx]).toBe(30000);
        expect(r.allRows[0][dkhtIdx]).toBe('100%');
    });

    it('khi chỉ có 1 siêu thị trong bảng, dòng "Tổng" đồng nhất 100% các giá trị với siêu thị đó', () => {
        const fullHeaders = [
            'Tên miền', 'DTLK', 'DTQĐ', 'Target (QĐ)', '% HT Target (QĐ)', 'Tỷ Trọng Trả Góp', 'TB 3 Tháng'
        ];
        const rows = [
            ['HÙNG VƯƠNG', '691', '1098', '1238', '89%', '44%', '968'],
            ['Tổng', '144', '215', '2476', '9%', '22%', '968']
        ];
        const r = buildSummaryTable(
            { headers: fullHeaders, rows },
            opts({
                supermarketMonthlyTargets: { 'HÙNG VƯƠNG': 37140, 'Tổng': 37140 },
                daysInMonth: 30
            })
        );

        expect(r.allRows.length).toBe(2);
        const [hungVuongRow, tongRow] = r.allRows;
        expect(hungVuongRow[0]).toBe('HÙNG VƯƠNG');
        expect(tongRow[0]).toBe('Tổng');

        // Mọi cột khác 'Tên miền' ở dòng Tổng phải khớp 100% với Hùng Vương
        for (let c = 1; c < r.allHeaders.length; c++) {
            expect(tongRow[c], `Cột ${r.allHeaders[c]} của Tổng phải bằng Hùng Vương`).toEqual(hungVuongRow[c]);
        }
    });

    it('không cộng gộp target của dòng Tổng vào chính nó gây nhân đôi Target V.Trội', () => {
        const fullHeaders = [
            'Tên miền', 'DTLK', 'DTQĐ', 'Target (QĐ)', '% HT Target (QĐ)'
        ];
        const rows = [
            ['ST A', '100', '120', '100', '120%'],
            ['Tổng', '100', '120', '100', '120%']
        ];
        const r = buildSummaryTable(
            { headers: fullHeaders, rows },
            opts({
                supermarketMonthlyTargets: { 'ST A': 3000, 'Tổng': 3000, 'ST Không Có Trong Bảng': 5000 },
                daysInMonth: 30
            })
        );
        const tarIdx = r.allHeaders.indexOf('Target(QĐ) V.Trội');
        expect(tarIdx).toBeGreaterThan(-1);
        const tongRow = r.allRows[1];
        // Target của Tổng phải là target của ST A (3000 / 30 = 100), không phải (3000 + 3000 + 5000) / 30
        expect(tongRow[tarIdx]).toBe(100);
    });
});


