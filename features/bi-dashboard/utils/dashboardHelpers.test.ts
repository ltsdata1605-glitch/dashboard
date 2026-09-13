import { describe, it, expect } from 'vitest';
import {
    parseCompetitionDataBySupermarket,
    isEmployeeName,
    parseSummaryData,
    extractSupermarketList,
    parseIndustryRealtimeData,
    parseIndustryLuyKeData
} from './dashboardHelpers';

/** Lưới an toàn (KE_HOACH_TONG_THE.md đợt 0) cho parser dữ liệu Thi đua dán vào Report BI —
 *  đây là nguồn dữ liệu duy nhất cho toàn bộ bảng Thi đua, không qua tính toán lại ở nơi khác. */

describe('parseCompetitionDataBySupermarket', () => {
    it('chuỗi rỗng trả về object rỗng, không throw', () => {
        expect(parseCompetitionDataBySupermarket('')).toEqual({});
    });

    it('định dạng CŨ: tên chương trình + header trên CÙNG 1 dòng, siêu thị + số liệu trên CÙNG 1 dòng', () => {
        const text = [
            'VAS\tSLLK\tTarget\t% HT Target Tháng',
            'ĐML_STR_STR - 99 Hùng Vương\t224\t39\t574',
        ].join('\n');

        const result = parseCompetitionDataBySupermarket(text);
        expect(Object.keys(result)).toEqual(['ĐML_STR_STR - 99 Hùng Vương']);
        expect(result['ĐML_STR_STR - 99 Hùng Vương'].headers).toEqual(['SLLK', 'Target', '% HT Target Tháng']);
        // LƯU Ý CHO NGƯỜI SỬA SAU: logic phân loại metric SLLK/DTLK ở dashboardHelpers.ts đã đổi
        // 3 LẦN chỉ trong 1 phiên làm việc (rõ ràng đang có người khác chỉnh song song, xem
        // implementation_plan.md "Đợt 0" + "Đợt 2 phần 1") — hiện tại (2026-09-08): header khớp
        // CHÍNH XÁC 'SLLK'/'SỐ LƯỢNG'/'SL REALTIME' giữ nguyên metric 'SLLK' (để hiển thị đúng đơn
        // vị "Cái"); các biến thể SL khác gộp vào 'DTLK'. Nếu test này lại đỏ, ĐỪNG vội "sửa cho
        // qua" — đọc lại đúng đoạn code tương ứng, đây nhiều khả năng là 1 đợt chỉnh nghiệp vụ
        // đang diễn ra, không phải lỗi.
        expect(result['ĐML_STR_STR - 99 Hùng Vương'].programs).toEqual([
            { name: 'VAS', data: ['224', '39', '574'], metric: 'SLLK' },
        ]);
    });

    it('định dạng MỚI: tên chương trình dòng riêng (ngay TRƯỚC dòng header), siêu thị và số liệu TÁCH 2 dòng', () => {
        const text = [
            'Nồi cơm',
            'DOANH THU\tTARGET\t% HT THÁNG',
            'ĐM_STR - Kho X',
            '1511\t1041\t145',
        ].join('\n');

        const result = parseCompetitionDataBySupermarket(text);
        expect(result['ĐM_STR - Kho X'].headers).toEqual(['DOANH THU', 'TARGET', '% HT THÁNG']);
        expect(result['ĐM_STR - Kho X'].programs).toEqual([
            { name: 'Nồi cơm', data: ['1511', '1041', '145'], metric: 'DTLK' },
        ]);
    });

    it('nhận diện siêu thị qua tiền tố "TGD" (không chỉ "ĐM")', () => {
        const text = [
            'VAS\tSLLK\tTarget',
            'TGD_ABC - Chi nhánh Y\t10\t20',
        ].join('\n');
        const result = parseCompetitionDataBySupermarket(text);
        expect(Object.keys(result)).toEqual(['TGD_ABC - Chi nhánh Y']);
        expect(result['TGD_ABC - Chi nhánh Y'].programs[0].data).toEqual(['10', '20']);
    });

    it('dòng "Tổng\\t<số liệu>" (tổng hợp toàn hệ thống) KHÔNG được nhận diện là 1 siêu thị — bị bỏ qua', () => {
        // Khác dòng "Tổng" ĐỨNG RIÊNG (khớp isEntity qua so khớp cả dòng === 'TỔNG', xem test khác):
        // dòng "Tổng" kèm số liệu trên CÙNG dòng không khớp bất kỳ nhánh isEntity nào (so khớp
        // toàn dòng thất bại vì còn phần số liệu phía sau), rơi vào nhánh fallback rồi bị loại vì
        // parts[0]="Tổng" không phải số — ghi lại đúng hành vi hiện tại, không phải hành vi mong đợi.
        const text = [
            'VAS\tSLLK\tTarget',
            'Tổng\t10\t20',
        ].join('\n');
        const result = parseCompetitionDataBySupermarket(text);
        expect(result).toEqual({});
    });

    it('bỏ qua các dòng metadata (URL, "Cập nhật lúc", "Xuất Excel"...) không làm hỏng parse', () => {
        const text = [
            'https://baocao.dienmayxanh.com/dashboard/thi-dua',
            'Cập nhật lúc 10:00 05/09/2026',
            'VAS\tSLLK\tTarget',
            'ĐM_STR - Kho X\t10\t20',
        ].join('\n');
        const result = parseCompetitionDataBySupermarket(text);
        expect(result['ĐM_STR - Kho X'].programs).toHaveLength(1);
    });

    it('sắp xếp các chương trình của mỗi siêu thị theo tên (localeCompare)', () => {
        const text = [
            'VAS\tSLLK\tTarget',
            'ĐM_STR - Kho X\t10\t20',
            'Tổng\t10\t20',
            'Ba lô\tSLLK\tTarget',
            'ĐM_STR - Kho X\t5\t8',
            'Tổng\t5\t8',
        ].join('\n');
        const result = parseCompetitionDataBySupermarket(text);
        expect(result['ĐM_STR - Kho X'].programs.map(p => p.name)).toEqual(['Ba lô', 'VAS']);
    });

    it(
        'BUG THẬT (phát hiện khi viết test, CHƯA sửa — ngoài phạm vi Đợt 0/1): dòng số liệu của ' +
        'siêu thị bị NUỐT MẤT nếu nó đứng ngay TRƯỚC dòng header của chương trình kế tiếp, vì ' +
        'nhánh "dòng đứng trước 1 dòng header = tên chương trình" (dòng ~157 dashboardHelpers.ts) ' +
        'được kiểm tra TRƯỚC nhánh nhận diện siêu thị. Không có dòng đệm (ví dụ "Tổng") giữa 2 ' +
        'khối dữ liệu liền nhau ⇒ mất số liệu của chương trình đứng trước, im lặng, không lỗi.',
        () => {
            const text = [
                'VAS\tSLLK\tTarget',
                'ĐM_STR - Kho X\t224\t39', // <- dòng này sẽ bị nuốt vì dòng NGAY SAU là header
                'SIM TỔNG\tSLLK\tTarget',
                'ĐM_STR - Kho X\t56\t22',
            ].join('\n');

            const result = parseCompetitionDataBySupermarket(text);
            const names = (result['ĐM_STR - Kho X']?.programs ?? []).map(p => p.name);
            // Hành vi ĐÚNG mong đợi phải là ['SIM TỔNG', 'VAS'] (2 chương trình) — nhưng thực tế
            // chỉ còn 1, vì dòng số liệu của VAS bị hiểu nhầm thành tên chương trình mới.
            expect(names).not.toContain('VAS');
            expect(names).toEqual(['SIM TỔNG']);
        }
    );

    it('cách né bug trên trong thực tế: chèn 1 dòng đệm bất kỳ (không phải header) giữa 2 khối', () => {
        const text = [
            'VAS\tSLLK\tTarget',
            'ĐM_STR - Kho X\t224\t39',
            'Tổng\t224\t39', // dòng đệm — không phải header nên không kích hoạt nhánh "tên chương trình"
            'SIM TỔNG\tSLLK\tTarget',
            'ĐM_STR - Kho X\t56\t22',
        ].join('\n');

        const result = parseCompetitionDataBySupermarket(text);
        const names = result['ĐM_STR - Kho X'].programs.map(p => p.name);
        expect(names.sort()).toEqual(['SIM TỔNG', 'VAS']);
    });

    it('isEmployeeName nhận diện chính xác dòng nhân viên MWG và không nhầm siêu thị', () => {
        expect(isEmployeeName('276650 - Quách Trần Phương Thảo')).toBe(true);
        expect(isEmployeeName('17952 - Đinh Thị Mỹ Hường')).toBe(true);
        expect(isEmployeeName('51115 - Trần Thị Thu')).toBe(true);
        expect(isEmployeeName('107617 - Phạm Anh Nhân')).toBe(true);
        
        // Siêu thị thật sự không bị coi là nhân viên
        expect(isEmployeeName('ĐML_STR_STR - 99 Hùng Vương (Kho bán hàng lưu động)')).toBe(false);
        expect(isEmployeeName('ĐM_STR - Kho X')).toBe(false);
        expect(isEmployeeName('TGD_ABC - Chi nhánh Y')).toBe(false);
        expect(isEmployeeName('1234 - ĐM Cần Thơ')).toBe(false);
        expect(isEmployeeName('5678 - Kho Hùng Vương')).toBe(false);
        expect(isEmployeeName('Tổng')).toBe(false);
    });

    it('parseCompetitionDataBySupermarket loại trừ các dòng nhân viên, chỉ trích xuất siêu thị', () => {
        const text = [
            'VAS\tSLLK\tTarget\t% HT Target Tháng',
            'ĐML_STR_STR - 99 Hùng Vương (Kho bán hàng lưu động)\t224\t39\t574',
            '276650 - Quách Trần Phương Thảo\t15\t10\t150',
            '17952 - Đinh Thị Mỹ Hường\t12\t10\t120',
            '51115 - Trần Thị Thu\t8\t10\t80',
        ].join('\n');

        const result = parseCompetitionDataBySupermarket(text);
        // Chỉ có siêu thị thật sự được nhận diện, 3 nhân viên không xuất hiện trong keys
        expect(Object.keys(result)).toEqual(['ĐML_STR_STR - 99 Hùng Vương (Kho bán hàng lưu động)']);
        expect(result['ĐML_STR_STR - 99 Hùng Vương (Kho bán hàng lưu động)'].programs).toHaveLength(1);
    });
});

describe('parseSummaryData & extractSupermarketList với định dạng portal Doanh thu hợp nhất mới', () => {
    const luyKeSample = [
        'Dashboards',
        '[Doanh thu hợp nhất](https://baocao.dienmayxanh.com/dashboard/revenue-consolidated)',
        'Doanh thu hợp nhất',
        '21707 - Sơn Lê Trường',
        'Quỹ thời gian: 12/30 ngày',
        '40%',
        'DT quy đổi',
        '13,361',
        'triệu đồng · lũy kế tới hết ngày 12/09',
        '% HT target',
        '46.8%',
        'Target trọn kỳ 28,562 · tiến độ 40.0%',
        'TT vs TB 3 tháng',
        '+15.0%',
        'TB3T cùng cửa sổ: 11,615',
        'DT dự kiến?',
        '33,404',
        'nhịp 12 ngày → 30 ngày',
        'TLPVTC lũy kế',
        '18.4%',
        '3,317 bill / 18,019 khách · 1/1 ST có máy đếm',
        'Tỉ trọng trả góp',
        '49.9%',
        'DT trả góp 4,315 / 8,650',
        'Siêu thị',
        'SỐ LƯỢNG',
        'DOANH THU QĐ',
        '% TỈ TRỌNG',
        'DOANH THU',
        'TARGET',
        '% HT TARGET',
        'TB 3 THÁNG',
        '% TT',
        'DT TRẢ GÓP',
        '% TRẢ GÓP',
        '910 - ĐML_STR_STR - 99 Hùng Vương',
        '4,411',
        '13,361',
        '100.0%',
        '8,650',
        '28,562',
        '46.8%',
        '11,615',
        '+15.0%',
        '4,315',
        '49.9%',
        'Tổng (1 dòng)',
        '4,411',
        '13,361',
        '100.0%',
        '8,650',
        '28,562',
        '46.8%',
        '11,615',
        '+15.0%',
        '4,315',
        '49.9%',
        'Đơn vị: triệu đồngTỉ trọng tính trong nhóm cùng cấp cha',
        '✅ Đã copy xong 3.709 ký tự! Giờ bạn có thể dán (Ctrl+V) an toàn.'
    ].join('\n');

    const realtimeSample = [
        'Dashboards',
        'Doanh thu hợp nhất',
        '21707 - Sơn Lê Trường',
        'THỜI GIAN LÀM VIỆC: 08:00 - 22:00',
        '6%',
        'DT quy đổi',
        '26',
        'triệu đồng · ngày 13/09 · cập nhật 08:34 · lũy kế tới hết ngày 12/09',
        '% HT target (LK)',
        '?',
        '46.8%',
        'Target trọn kỳ 28,562 · tiến độ 40.0%',
        'TT vs TB 3 tháng',
        '?',
        '-97.3%',
        'TB3T cùng cửa sổ: 968',
        'DT dự kiến',
        '?',
        '33,404',
        'nhịp 12 ngày → 30 ngày',
        'TLPVTC hôm nay',
        '18.8%',
        '311 bill / 1,656 khách · 1/1 ST có máy đếm',
        'Tỉ trọng trả góp',
        '0.0%',
        'DT trả góp 0 / 14',
        'Siêu thị',
        'SỐ LƯỢNG',
        'DOANH THU QĐ',
        '% TỈ TRỌNG',
        'DOANH THU',
        'TARGET',
        '% HT TARGET (LK)',
        'TB 3 THÁNG',
        '% TT',
        'DT TRẢ GÓP',
        '% TRẢ GÓP',
        '910 - ĐML_STR_STR - 99 Hùng Vương',
        '6\t26\t100.0%\t14\t28,562\t46.8%\t968\t-97.3%\t0\t0.0%',
        'Tổng (1 dòng)\t6\t26\t100.0%\t14\t28,562\t46.8%\t968\t-97.3%\t0\t0.0%',
        'Đơn vị: triệu đồng',
        'Tỉ trọng tính trong nhóm cùng cấp cha'
    ].join('\n');

    it('bóc tách đầy đủ các chỉ số KPI và bảng từ dữ liệu Luỹ kế mới', () => {
        const result = parseSummaryData(luyKeSample);
        expect(result.kpis.dtqd).toBe('13,361');
        expect(result.kpis.htTargetQD).toBe('46.8%');
        expect(result.kpis.targetQD).toBe('28,562');
        expect(result.kpis.dtDuKien).toBe('33,404');
        expect(result.kpis.tlpv).toBe('18.4%');
        expect(result.kpis.lbill).toBe('3,317');
        expect(result.kpis.lbillBH).toBe('3,317');
        expect(result.kpis.lkhach).toBe('18,019');
        expect(result.kpis.tyTrongTraGop).toBe('49.9%');
        expect(result.kpis.dtlk).toBe('8,650');
        expect(result.kpis.dtckThangQD).toBe('+15.0%');

        expect(result.table.headers).toEqual([
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
        ]);

        expect(result.table.rows).toHaveLength(2);
        expect(result.table.rows[0][0]).toBe('910 - ĐML_STR_STR - 99 Hùng Vương');
        expect(result.table.rows[0][2]).toBe('13,361'); // DTQĐ
        expect(result.table.rows[0][4]).toBe('8,650');  // DTLK
        expect(result.table.rows[1][0]).toBe('Tổng');
        expect(result.table.rows[1][2]).toBe('13,361');
    });

    it('bóc tách đầy đủ các chỉ số KPI và bảng từ dữ liệu Realtime mới', () => {
        const result = parseSummaryData(realtimeSample);
        expect(result.kpis.dtqd).toBe('26');
        expect(result.kpis.htTargetQD).toBe('46.8%');
        expect(result.kpis.targetQD).toBe('28,562');
        expect(result.kpis.dtDuKien).toBe('33,404');
        expect(result.kpis.tlpv).toBe('18.8%');
        expect(result.kpis.lbill).toBe('311');
        expect(result.kpis.lkhach).toBe('1,656');
        expect(result.kpis.tyTrongTraGop).toBe('0.0%');
        expect(result.kpis.dtlk).toBe('14');
        expect(result.kpis.dtckThangQD).toBe('-97.3%');

        expect(result.table.rows).toHaveLength(2);
        expect(result.table.rows[0][0]).toBe('910 - ĐML_STR_STR - 99 Hùng Vương');
        expect(result.table.rows[0][1]).toBe('6');      // Số lượng
        expect(result.table.rows[0][2]).toBe('26');     // DTQĐ
        expect(result.table.rows[0][4]).toBe('14');     // DTLK
        expect(result.table.rows[1][0]).toBe('Tổng');
    });

    it('extractSupermarketList trích xuất chính xác danh sách siêu thị từ Luỹ kế mới', () => {
        const smList = extractSupermarketList(luyKeSample);
        expect(smList).toEqual(['910 - ĐML_STR_STR - 99 Hùng Vương']);
    });
});

describe('parseIndustryRealtimeData and parseIndustryLuyKeData (New Portal Format)', () => {
    const industryRealtimeSample = [
        'NGÀNH HÀNG / NHÓM HÀNG',
        'SỐ LƯỢNG',
        'DOANH THU QĐ',
        '% TỈ TRỌNG',
        'DOANH THU',
        'TARGET',
        '% HT TARGET (LK)',
        'TB 3 THÁNG',
        '% TT',
        'DT TRẢ GÓP',
        '% TRẢ GÓP',
        '22 - Laptop',
        '7\t214\t34.5%\t147\t—\t—\t87\t+146.9%\t128\t87.1%',
        '42 - Laptop',
        '7\t214\t100.0%\t147\t—\t—\t87\t+146.9%\t128\t87.1%',
        '13 - Điện thoại',
        '11\t70\t11.3%	62\t—\t—\t226\t-68.9%\t34\t55.2%',
        '1491 - Smartphone',
        '11\t70\t100.0%\t62\t—\t—\t226\t-68.8%\t34\t55.2%',
        '18 - Điện Thoại Di Động',
        '0\t0\t0.0%\t0\t—\t—\t1\t-100.0%\t0\t—',
        'Tổng (27 dòng)\t210\t621\t100.0%\t388\t28,562\t46.8%\t968\t-35.8%\t193\t49.9%',
    ].join('\n');

    const industryLuyKeSample = [
        'NGÀNH HÀNG / NHÓM HÀNG',
        'SỐ LƯỢNG',
        'DOANH THU QĐ',
        '% TỈ TRỌNG',
        'DOANH THU',
        'TARGET',
        '% HT TARGET',
        'TB 3 THÁNG',
        '% TT',
        'DT TRẢ GÓP',
        '% TRẢ GÓP',
        '13 - Điện thoại',
        '277\t2,823\t21.1%\t2,362\t—\t—\t2,715\t+4.0%\t1,631\t69.1%',
        '1491 - Smartphone',
        '257\t2,810\t99.5%\t2,348\t—\t—\t2,707\t+3.8%\t1,631\t69.4%',
        '18 - Điện Thoại Di Động',
        '20\t13\t0.5%\t13\t—\t—\t8\t+59.6%\t0\t0.0%',
        '22 - Laptop',
        '60\t1,790\t13.4%\t1,333\t—\t—\t1,042\t+71.8%\t665\t49.9%',
        '42 - Laptop',
        '60\t1,790\t100.0%\t1,333\t—\t—\t1,042\t+71.8%\t665\t49.9%',
        'Tổng (27 dòng)\t4,411\t13,361\t100.0%\t8,650\t28,562\t46.8%\t11,615\t+15.0%\t4,315\t49.9%',
    ].join('\n');

    it('parseIndustryRealtimeData bóc tách đúng cây ngành hàng và hàng tổng', () => {
        const result = parseIndustryRealtimeData(industryRealtimeSample);
        expect(result.headers).toEqual([
            'Nhóm ngành hàng',
            'Số lượng',
            'DTLK',
            'DTQĐ',
            '% Tỉ trọng',
            'Target (QĐ)',
            '% HT Target (QĐ)',
            'TB 3 Tháng',
            '% TT',
            'DT TRẢ GÓP',
            'Tỷ Trọng Trả Góp',
        ]);
        expect(result.tree.length).toBe(2); // Laptop, Điện thoại
        expect(result.tree[0].name).toBe('22 - Laptop');
        expect(result.tree[0].children.length).toBe(1); // 42 - Laptop
        expect(result.tree[1].name).toBe('13 - Điện thoại');
        expect(result.tree[1].children.length).toBe(2); // Smartphone, Điện thoại di động
        expect(result.totalRow).toBeDefined();
        expect(result.totalRow?.[0]).toBe('Tổng');
        expect(result.totalRow?.[1]).toBe('210'); // Số lượng
        expect(result.totalRow?.[2]).toBe('388'); // DTLK (THỰC)
        expect(result.totalRow?.[3]).toBe('621'); // DTQĐ
    });

    it('parseIndustryLuyKeData bóc tách đúng dữ liệu bảng và cây ngành hàng luỹ kế', () => {
        const result = parseIndustryLuyKeData(industryLuyKeSample);
        expect(result.table.headers).toHaveLength(11);
        expect(result.tree.length).toBe(2); // Điện thoại, Laptop
        expect(result.tree[0].name).toBe('13 - Điện thoại');
        expect(result.tree[0].children.length).toBe(2);
        expect(result.totalRow).toBeDefined();
        expect(result.totalRow?.[0]).toBe('Tổng');
        expect(result.totalRow?.[1]).toBe('4,411'); // Số lượng
        expect(result.totalRow?.[2]).toBe('8,650'); // DTLK (THỰC)
        expect(result.totalRow?.[3]).toBe('13,361'); // DTQĐ
    });
});

describe('formatIndustryDisplayName', () => {
    it('loại bỏ số mã ở đầu và viết hoa chữ cái đầu', async () => {
        const { formatIndustryDisplayName } = await import('../components/dashboard/IndustryView');
        expect(formatIndustryDisplayName('464 - giao dịch airtime')).toBe('Giao dịch airtime');
        expect(formatIndustryDisplayName('18 - sim trắng')).toBe('Sim trắng');
        expect(formatIndustryDisplayName('364 - it')).toBe('IT');
        expect(formatIndustryDisplayName('1491 - smartphone')).toBe('Smartphone');
        expect(formatIndustryDisplayName('1094 - tivi led (imei)')).toBe('Tivi LED (IMEI)');
        expect(formatIndustryDisplayName('22 - laptop')).toBe('Laptop');
        expect(formatIndustryDisplayName('NNH ĐIỆN TỬ')).toBe('Điện tử');
    });
});



