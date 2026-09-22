import { describe, it, expect } from 'vitest';
import {
    calculateProgressiveTaxDetailed,
    calculateTax,
    generateVietQrUrl,
    formatVnd,
    formatNumber,
    parseCurrencyInput,
    PERSONAL_DEDUCTION_2026,
    DEPENDENT_DEDUCTION_2026,
    TAX_BRACKETS_2026,
} from '../../features/tax-calculator/services/taxCalculatorService';
import { matchBankFromRawText } from '../../features/tax-calculator/services/salarySlipOcrService';

describe('taxCalculatorService', () => {
    describe('calculateProgressiveTaxDetailed', () => {
        it('returns 0 when assessable income is <= 0', () => {
            const res0 = calculateProgressiveTaxDetailed(0);
            expect(res0.totalTax).toBe(0);
            expect(res0.details).toHaveLength(0);

            const resNeg = calculateProgressiveTaxDetailed(-1000000);
            expect(resNeg.totalTax).toBe(0);
        });

        it('calculates Tier 1 in 2026 Law correctly (income <= 10M at 5%)', () => {
            const res = calculateProgressiveTaxDetailed(8_000_000, TAX_BRACKETS_2026);
            expect(res.totalTax).toBe(400_000); // 8M * 5%
            expect(res.details).toHaveLength(1);
            expect(res.details[0].incomeInBracket).toBe(8_000_000);
            expect(res.details[0].taxInBracket).toBe(400_000);
        });

        it('calculates Tier 2 in 2026 Law correctly (income 10M - 30M at 10%)', () => {
            const res = calculateProgressiveTaxDetailed(25_000_000, TAX_BRACKETS_2026);
            // Tier 1: 10M * 5% = 500k
            // Tier 2: 15M * 10% = 1.5M
            // Total = 2,000,000
            expect(res.totalTax).toBe(2_000_000);
            expect(res.details).toHaveLength(2);
            expect(res.details[0].taxInBracket).toBe(500_000);
            expect(res.details[1].taxInBracket).toBe(1_500_000);
        });
    });

    describe('calculateTax (Luật Thuế 2026)', () => {
        it('calculates 2026 Law deductions and tax difference correctly', () => {
            // Case 2026:
            // Tổng thu nhập: 25.5M
            // Giảm trừ bản thân: 15.5M
            // Nhận thay: 5M
            const input = {
                name: 'Nguyễn Văn A',
                totalIncome: 25_500_000,
                dependents: 0,
                proxyAmount: 5_000_000,
                insurance: 0,
                unionFee: 0,
            };

            const result = calculateTax(input);

            expect(result.personalDeduction).toBe(PERSONAL_DEDUCTION_2026); // 15.5M
            expect(result.dependentDeductions).toBe(0);
            expect(result.totalDeductions).toBe(15_500_000);

            // TNTT có nhận thay: 25.5M - 15.5M = 10M -> Thuế 10M * 5% = 500,000
            expect(result.assessableIncomeWithProxy).toBe(10_000_000);
            expect(result.totalTaxWithProxy).toBe(500_000);

            // TNTT không nhận thay: (25.5M - 5M) - 15.5M = 5M -> Thuế: 5M * 5% = 250,000
            expect(result.incomeWithoutProxy).toBe(20_500_000);
            expect(result.assessableIncomeWithoutProxy).toBe(5_000_000);
            expect(result.totalTaxWithoutProxy).toBe(250_000);

            // Tiền thuế phát sinh do nhận thay: 500k - 250k = 250,000
            expect(result.taxOnProxyAmount).toBe(250_000);
        });

        it('handles dependent deductions properly in 2026 law (6.2M per dependent)', () => {
            const input = {
                name: 'Lê Văn C',
                totalIncome: 35_000_000,
                dependents: 2, // 2 * 6.2M = 12.4M
                proxyAmount: 3_000_000,
                insurance: 2_000_000,
                unionFee: 100_000,
            };

            const result = calculateTax(input);
            expect(result.dependentDeductions).toBe(2 * DEPENDENT_DEDUCTION_2026);
            expect(result.insuranceDeductions).toBe(2_000_000);
            expect(result.unionFeeDeduction).toBe(100_000);
            expect(result.totalDeductions).toBe(15_500_000 + 12_400_000 + 2_000_000 + 100_000);
        });

        it('calculates exact MWG HRM 2-slot payroll slips (Trương Hoàng Phúc example)', () => {
            // Dữ liệu bóc tách từ 2 ảnh HRM thực tế của người dùng:
            // Đợt 1 (Ngày 04/09): Lương chịu thuế 5.278.580 đ, BHXH 496.650 đ, Bản thân 15.5M
            // Đợt 2 (Ngày 21/09): Tổng thu nhập tháng = 30.740.804 đ (hoặc 5.278.580 + 25.462.224)
            // 2 khoản nhận thay: Khoán công việc (9.305.000) + Thưởng thi đua VAS (2.337.000) = 11.642.000 đ
            const input = {
                name: 'TRƯƠNG HOÀNG PHÚC',
                incomeDay5: 5_278_580,
                insurance: 496_650,
                dependents: 0,
                personalDeduction: 15_500_000,
                incomeDay20: 25_462_224,
                totalIncome: 30_740_804,
                bonusItems: [
                    { id: 'b1', name: 'Thưởng ERP còn lại', amount: 702_909 },
                    { id: 'b2', name: 'Thưởng thêm Hệ số K', amount: 373_488 },
                    { id: 'b3', name: 'Khoán công việc T08.2026', amount: 9_305_000 },
                    { id: 'b4', name: 'Thưởng bán hàng Combo', amount: 190_000 },
                    { id: 'b5', name: 'Thưởng thi đua VAS T08.2026', amount: 2_337_000 },
                ],
                selectedProxyItemIds: ['b3', 'b5'], // Tích chọn 2 khoản nhận thay
                customProxyAmount: 0,
                actualTaxDay20: 974_415,
            };

            const result = calculateTax(input);

            // 1. Tổng giảm trừ đợt 1
            expect(result.personalDeduction).toBe(15_500_000);
            expect(result.insuranceDeductions).toBe(496_650);
            expect(result.totalDeductions).toBe(15_996_650);

            // 2. Mức giảm trừ còn dư từ Đợt 1 chuyển sang Đợt 2
            expect(result.remainingDeductionsDay1).toBe(15_996_650 - 5_278_580); // 10.718.070 đ

            // 3. Thu nhập tính thuế thực tế Đợt 2: 30.740.804 - 15.996.650 = 14.744.154 đ
            expect(result.assessableIncomeWithProxy).toBe(14_744_154);

            // 4. Thuế TNCN thực tế tính theo Luật 2026 (5 bậc):
            // Bậc 1: 10.000.000 * 5% = 500.000
            // Bậc 2: 4.744.154 * 10% = 474.415,4 -> 474.415
            // Tổng thuế = 974.415 đ -> KHỚP 100% VỚI DÒNG "Trừ thuế TNCN: 974.415" TRÊN PHIẾU LƯƠNG HRM!
            expect(result.totalTaxWithProxy).toBe(974_415);

            // 5. Khoản nhận thay
            // Tổng nhận thay: 9.305.000 + 2.337.000 = 11.642.000 đ
            // Thu nhập chuẩn không nhận thay: 30.740.804 - 11.642.000 = 19.098.804 đ
            // TNTT chuẩn: 19.098.804 - 15.996.650 = 3.102.154 đ
            // Thuế chuẩn: 3.102.154 * 5% = 155.108 đ
            expect(result.incomeWithoutProxy).toBe(19_098_804);
            expect(result.assessableIncomeWithoutProxy).toBe(3_102_154);
            expect(result.totalTaxWithoutProxy).toBe(155_108);

            // 6. Chênh lệch thuế cần giữ lại từ đồng nghiệp:
            // 974.415 - 155.108 = 819.307 đ
            expect(result.taxOnProxyAmount).toBe(819_307);

            // 7. Số tiền thực chuyển lại cho đồng nghiệp:
            // 11.642.000 - 819.307 = 10.822.693 đ
            expect(result.netRefundToFriend).toBe(10_822_693);
        });
    });

    describe('matchBankFromRawText (AI bank extractor)', () => {
        it('matches common Vietnamese banks from raw OCR text', () => {
            expect(matchBankFromRawText('Ngan hang TMCP Quan Doi (MB Bank)')).toBe('MBBank');
            expect(matchBankFromRawText('Vietcombank')).toBe('Vietcombank');
            expect(matchBankFromRawText('Techcombank')).toBe('Techcombank');
            expect(matchBankFromRawText('Ngan hang A Chau ACB')).toBe('ACB');
        });

        it('returns undefined for unrecognized bank name', () => {
            expect(matchBankFromRawText('')).toBeUndefined();
            expect(matchBankFromRawText('Unknown Bank XYZ 999')).toBeUndefined();
        });
    });

    describe('generateVietQrUrl', () => {
        it('generates valid SePay VietQR URL with correct params', () => {
            const url = generateVietQrUrl({
                bankAccount: '1234567890',
                bankCode: 'Vietcombank',
                amount: 700000,
                description: 'Hoan tien thue nhan thay'
            });

            expect(url).toContain('https://qr.sepay.vn/img');
            expect(url).toContain('acc=1234567890');
            expect(url).toContain('bank=970436'); // VCB BIN
            expect(url).toContain('amount=700000');
            expect(url).toContain('des=Hoan%20tien%20thue%20nhan%20thay');
        });

        it('returns empty string if missing required fields', () => {
            expect(generateVietQrUrl({ bankAccount: '', bankCode: 'Vietcombank', amount: 500000 })).toBe('');
            expect(generateVietQrUrl({ bankAccount: '123', bankCode: '', amount: 500000 })).toBe('');
            expect(generateVietQrUrl({ bankAccount: '123', bankCode: 'Vietcombank', amount: 0 })).toBe('');
        });
    });

    describe('formatting and helpers', () => {
        it('formats numbers and currency properly', () => {
            expect(formatNumber(1250000)).toBe('1.250.000');
            expect(formatVnd(1250000)).toBe('1.250.000 đ');
        });

        it('parses raw string currency inputs cleanly', () => {
            expect(parseCurrencyInput('1.250.000')).toBe(1250000);
            expect(parseCurrencyInput('1,250,000 đ')).toBe(1250000);
            expect(parseCurrencyInput('')).toBe(0);
            expect(parseCurrencyInput(500000)).toBe(500000);
        });
    });
});
