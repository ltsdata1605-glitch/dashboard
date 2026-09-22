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
