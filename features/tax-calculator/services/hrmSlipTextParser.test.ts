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
        expect(data.fullName).toBe('Lý Thị Thu Ngân');
        expect(data.bankAccount).toBe('109005866487');
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
            incomeDay20: 28_302_349,
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
        expect(data.fullName).toBe('LY THI THU NGAN');
        expect(data.bankAccount).toBe('109005866487');
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
        expect(data.bankAccount).toBe('107867333424');
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
