import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    detectHrmSlipKind,
    parseHrmDay20Text,
    parseHrmDay5Text,
    parseHrmNumber,
    resolveDependents,
} from './hrmSlipTextParser';

const day5Text = readFileSync('tests/fixtures/hrm-luong-ngay5.txt', 'utf8');
const day20Text = readFileSync('tests/fixtures/hrm-thuong-ngay20.txt', 'utf8');
const day5CollapsedText = readFileSync('tests/fixtures/hrm-luong-ngay5-thu-gon.txt', 'utf8');
const day5BText = readFileSync('tests/fixtures/hrm-luong-ngay5-b.txt', 'utf8');
const day20MultiCkText = readFileSync('tests/fixtures/hrm-thuong-ngay20-nhieu-dot-ck.txt', 'utf8');

describe('parseHrmNumber', () => {
    it('đọc số kiểu HRM', () => {
        expect(parseHrmNumber('7,722,410')).toBe(7722410);
        expect(parseHrmNumber('-17,000')).toBe(-17000);
        expect(parseHrmNumber('0')).toBe(0);
        expect(parseHrmNumber('')).toBeNull();
        expect(parseHrmNumber('NH TMCP VietinBank')).toBeNull();
    });
});

describe('detectHrmSlipKind', () => {
    it('phân biệt đúng 2 loại trang HRM', () => {
        expect(detectHrmSlipKind(day5Text)).toBe('day5');
        expect(detectHrmSlipKind(day20Text)).toBe('day20');
        expect(detectHrmSlipKind('nội dung linh tinh')).toBeNull();
    });
});

describe('parseHrmDay5Text — trang Chi tiết lương (dữ liệu thật)', () => {
    const data = parseHrmDay5Text(day5Text);

    it('bóc đúng các con số dùng để tính thuế', () => {
        expect(data).toMatchObject({
            monthYear: '08/2026',
            incomeDay5: 7_722_410,
            insuranceSalary: 4_730_000,
            insurance: 378_400 + 70_950 + 47_300, // 496.650
            dependents: 1,
            personalDeduction: 15_500_000,
            totalDeductionsDay1: 22_196_650,
            // Đoàn phí vẫn được bóc ra để tham khảo, nhưng KHÔNG tự điền vào biểu mẫu:
            // HRM xếp nó ở "Tổng khấu trừ" (trừ vào thực lãnh), không nằm trong giảm trừ tính thuế.
            unionFee: 23_650,
        });
    });

    it('lấy được tên, số tài khoản và tự khớp ngân hàng', () => {
        expect(data.fullName).toBe('Nguyễn Văn A');
        expect(data.bankAccount).toBe('100000000001');
        expect(data.bankName).toContain('VietinBank');
        expect(data.matchedBankCode).toBe('VietinBank');
    });

    it('phần giảm trừ còn thừa chuyển sang đợt 2 tính đúng', () => {
        expect(data.remainingDeductionsDay1).toBe(22_196_650 - 7_722_410);
    });

    it('dán nhầm trang thưởng vào ô lương thì báo lỗi rõ ràng', () => {
        expect(() => parseHrmDay5Text(day20Text)).toThrow(/Chi tiết lương/);
    });
});

describe('parseHrmDay20Text — trang Xem chi tiết thưởng (dữ liệu thật)', () => {
    const data = parseHrmDay20Text(day20Text);

    it('bóc đúng tổng thưởng, thuế đã khấu trừ và thu nhập đợt 2', () => {
        expect(data).toMatchObject({
            monthYear: '08/2026',
            bonusMain: 2_114_939,
            bonusHot: 18_465_000,
            // incomeDay20 = riêng thưởng đợt 2; còn (1) trên phiếu là tổng CẢ THÁNG
            incomeDay20: 2_114_939 + 18_465_000,
            monthTotalIncome: 28_302_349,
            actualTaxDay20: 305_285,
        });
    });

    it('liệt kê đủ 8 khoản thưởng nóng, đúng tên và số tiền', () => {
        const hot = data.bonusItems.filter(i => i.category === 'hot');
        expect(hot).toHaveLength(8);
        expect(hot.map(i => i.amount).reduce((a, b) => a + b, 0)).toBe(18_465_000);
        expect(hot[0]).toMatchObject({ name: 'Khoán công việc T08.2026', amount: 60_000 });
        expect(hot[7]).toMatchObject({ name: 'Thưởng thi đua trả chậm Home Credit T08.2026', amount: 2_998_000 });
    });

    it('thưởng chính chỉ lấy các dòng đánh số, không cộng đôi dòng tổng nhóm', () => {
        const main = data.bonusItems.filter(i => i.category === 'main');
        expect(main).toHaveLength(5);
        expect(main.map(i => i.amount).reduce((a, b) => a + b, 0)).toBe(2_114_939);
        expect(main.some(i => i.name.includes('Thưởng Nhân viên ST'))).toBe(false);
        expect(main[0].name).toBe('Thưởng ERP còn lại (tích lũy - nhập trả, Miếng dán màn hình, San sẻ)');
    });

    it('lấy chủ tài khoản, số tài khoản và ngân hàng', () => {
        expect(data.fullName).toBe('NGUYEN VAN A');
        expect(data.bankAccount).toBe('100000000001');
        expect(data.matchedBankCode).toBe('VietinBank');
    });

    it('dán nhầm trang lương vào ô thưởng thì báo lỗi rõ ràng', () => {
        expect(() => parseHrmDay20Text(day5Text)).toThrow(/Xem chi tiết thưởng/);
    });
});

describe('parseHrmDay5Text — khối "Tổng tiền giảm trừ" đang THU GỌN', () => {
    // Trên HRM, khối giảm trừ có thể đang đóng: text copy ra chỉ có dòng tổng 28.740.000,
    // KHÔNG có "Số lượng người phụ thuộc" lẫn "Giảm trừ bản thân".
    const data = parseHrmDay5Text(day5CollapsedText);

    it('vẫn suy ra đúng số người phụ thuộc từ tổng giảm trừ', () => {
        // 28.740.000 - 15.500.000 (bản thân) - 840.000 (BH) = 12.400.000 = 2 × 6.2tr
        expect(data.dependents).toBe(2);
    });

    it('bảo hiểm lấy được từ khối "Tổng khấu trừ" (luôn hiện dù khối giảm trừ đóng)', () => {
        expect(data.insurance).toBe(640_000 + 120_000 + 80_000);
        expect(data.incomeDay5).toBe(22_399_946);
        expect(data.totalDeductionsDay1).toBe(28_740_000);
        expect(data.bankAccount).toBe('100000000002');
    });

    it('tổng giảm trừ tự tính lại khớp đúng con số HRM in ra', () => {
        const rebuilt = data.personalDeduction + data.dependents * 6_200_000 + data.insurance;
        expect(rebuilt).toBe(data.totalDeductionsDay1);
    });
});

describe('resolveDependents', () => {
    it('ưu tiên số ghi rõ trên phiếu', () => {
        expect(resolveDependents({ explicit: 1, dependentDeduction: null, totalDeductions: 0, personalDeduction: 15_500_000, insurance: 0 })).toBe(1);
        expect(resolveDependents({ explicit: 0, dependentDeduction: 12_400_000, totalDeductions: 0, personalDeduction: 15_500_000, insurance: 0 })).toBe(0);
    });

    it('không có số thì lấy từ dòng "Giảm trừ người phụ thuộc"', () => {
        expect(resolveDependents({ explicit: null, dependentDeduction: 12_400_000, totalDeductions: 0, personalDeduction: 15_500_000, insurance: 0 })).toBe(2);
    });

    it('không có cả hai thì suy từ tổng giảm trừ', () => {
        expect(resolveDependents({ explicit: null, dependentDeduction: null, totalDeductions: 28_740_000, personalDeduction: 15_500_000, insurance: 840_000 })).toBe(2);
        // Không có người phụ thuộc: 15.5tr + 496.650 -> phần dư quá nhỏ, không được làm tròn thành 1
        expect(resolveDependents({ explicit: null, dependentDeduction: null, totalDeductions: 15_996_650, personalDeduction: 15_500_000, insurance: 496_650 })).toBe(0);
    });
});

describe('Phiếu thật B — trang thưởng có NHIỀU đợt chuyển khoản', () => {
    const day5 = parseHrmDay5Text(day5BText);
    const day20 = parseHrmDay20Text(day20MultiCkText);

    it('không để lọt dòng rác vào danh sách thưởng', () => {
        const names = day20.bonusItems.map(i => i.name);
        // Trước đây các dòng này lọt vào danh sách chọn nhận thay ("dư quá nhiều thông tin")
        expect(names).not.toContain('Tổng chuyển khoản');
        expect(names).not.toContain('Số tài khoản');
        expect(names).not.toContain('Trừ Thuế TNCN');
        expect(names).not.toContain('Chủ tài khoản');
        expect(names.some(n => n.includes('Thưởng Nhân viên ST'))).toBe(false);
        expect(day20.bonusItems.every(i => i.amount > 0)).toBe(true);
    });

    it('lấy đủ khoản thưởng của CẢ 3 đợt chuyển khoản', () => {
        const hot = day20.bonusItems.filter(i => i.category === 'hot');
        const main = day20.bonusItems.filter(i => i.category === 'main');
        expect(main).toHaveLength(8);
        expect(hot).toHaveLength(10); // 7 khoản CK 26/02 + 1 Tết + 2 khoản CK 05/03
        expect(hot.map(i => i.name)).toContain('Thưởng Nóng mỗi ngày mùa Tết 2026 (Từ 07/02/2026 – 22/02/2026)');
        expect(hot.map(i => i.name)).toContain('Khoán chi phí VPP T03.2026');
        expect(main.reduce((s, i) => s + i.amount, 0)).toBe(2_959_999);
    });

    it('đọc được thuế đã khấu trừ từ dòng "Trừ Thuế TNCN" (số âm)', () => {
        expect(day20.actualTaxDay20).toBe(2_848_000);
        expect(day20.bonusMain).toBe(2_959_999);
    });

    it('lấy tổng thu nhập cả tháng từ bảng thu nhập theo năm của trang lương', () => {
        expect(day5.monthTotalIncome).toBe(65_203_822);
        expect(day5.incomeDay5).toBe(50_662_823);
        // Thu nhập đợt 2 = tổng tháng - đợt 1, khớp đúng tổng các khoản thưởng thuộc tháng 01
        expect(day5.monthTotalIncome! - day5.incomeDay5).toBe(14_540_999);
    });
});

describe('Phiếu A — "(1) Tổng thu nhập chịu thuế" là tổng CẢ THÁNG', () => {
    it('(1) = lương đợt 1 + toàn bộ thưởng đợt 2 (không phải riêng đợt 2)', () => {
        const day5 = parseHrmDay5Text(day5Text);
        const day20 = parseHrmDay20Text(day20Text);
        expect(day20.monthTotalIncome).toBe(28_302_349);
        expect(day5.incomeDay5 + day20.bonusMain + day20.bonusHot).toBe(28_302_349);
        // Bảng thu nhập theo năm của trang lương cho cùng con số
        expect(day5.monthTotalIncome).toBe(28_302_349);
    });
});
