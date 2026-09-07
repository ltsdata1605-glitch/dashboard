import { describe, it, expect } from 'vitest';
import { parseCompetitionDataBySupermarket } from './dashboardHelpers';

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
        // metric 'SLLK' được GỘP vào 'DTLK' có chủ đích (comment trong dashboardHelpers.ts:
        // "SỐ LƯỢNG gộp vào DTLK — cùng kết quả, khác đơn vị đo") — chỉ 'QĐ'/'QD' mới tách riêng
        // thành 'DTQĐ'. Cột hiển thị (headers) vẫn giữ nguyên "SLLK", chỉ nhãn PHÂN LOẠI nội bộ gộp.
        expect(result['ĐML_STR_STR - 99 Hùng Vương'].programs).toEqual([
            { name: 'VAS', data: ['224', '39', '574'], metric: 'DTLK' },
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
});
