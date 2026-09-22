import { TaxBracket, BracketDetail, TaxCalculationInput, TaxCalculationResult, TaxLawVersion } from '../types/tax.types';
import { BANKS } from './bankCatalog';

// 1. MỨC GIẢM TRỪ GIA CẢNH
// Luật Thuế TNCN số 109/2025/QH15 (Áp dụng từ năm 2026)
export const PERSONAL_DEDUCTION_2026 = 15_500_000;
export const DEPENDENT_DEDUCTION_2026 = 6_200_000;

// Nghị quyết số 954/2020/UBTVQH14 (Hiện hành cũ)
export const PERSONAL_DEDUCTION_LEGACY = 11_000_000;
export const DEPENDENT_DEDUCTION_LEGACY = 4_400_000;

// Mặc định là luật mới nhất 2026
export const PERSONAL_DEDUCTION = PERSONAL_DEDUCTION_2026;
export const DEPENDENT_DEDUCTION = DEPENDENT_DEDUCTION_2026;

// 2. BIỂU THUẾ LŨY TIẾN TỪNG PHẦN
// Biểu thuế mới 5 bậc (Luật số 109/2025/QH15)
export const TAX_BRACKETS_2026: TaxBracket[] = [
    { level: 1, max: 10_000_000, rate: 0.05 },
    { level: 2, max: 30_000_000, rate: 0.10 },
    { level: 3, max: 60_000_000, rate: 0.20 },
    { level: 4, max: 100_000_000, rate: 0.30 },
    { level: 5, max: Infinity, rate: 0.35 }
];

// Biểu thuế cũ 7 bậc (Nghị quyết 954 / Luật số 04/2007/QH12)
export const TAX_BRACKETS_LEGACY: TaxBracket[] = [
    { level: 1, max: 5_000_000, rate: 0.05 },
    { level: 2, max: 10_000_000, rate: 0.10 },
    { level: 3, max: 18_000_000, rate: 0.15 },
    { level: 4, max: 32_000_000, rate: 0.20 },
    { level: 5, max: 52_000_000, rate: 0.25 },
    { level: 6, max: 80_000_000, rate: 0.30 },
    { level: 7, max: Infinity, rate: 0.35 }
];

export const TAX_BRACKETS = TAX_BRACKETS_2026;

const vndFormatter = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0
});

export const formatVnd = (value: number): string => {
    return `${vndFormatter.format(Math.round(value))} đ`;
};

export const formatNumber = (value: number): string => {
    return vndFormatter.format(Math.round(value));
};

export const parseCurrencyInput = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = val.replace(/[^0-9]/g, '');
    return clean ? Number(clean) : 0;
};

/**
 * Tính thuế lũy tiến từng phần kèm theo chi tiết phân rã từng bậc
 */
export const calculateProgressiveTaxDetailed = (
    assessableIncome: number,
    brackets: TaxBracket[] = TAX_BRACKETS_2026
): { totalTax: number; details: BracketDetail[] } => {
    if (assessableIncome <= 0) {
        return { totalTax: 0, details: [] };
    }

    let totalTax = 0;
    let remainingIncome = assessableIncome;
    const details: BracketDetail[] = [];

    for (let i = 0; i < brackets.length; i++) {
        const bracket = brackets[i];
        const prevMax = i > 0 ? brackets[i - 1].max : 0;

        if (remainingIncome > 0) {
            const bracketSpan = bracket.max === Infinity ? remainingIncome : bracket.max - prevMax;
            const incomeInBracket = Math.min(remainingIncome, bracketSpan);
            const taxInBracket = incomeInBracket * bracket.rate;

            totalTax += taxInBracket;
            details.push({
                level: bracket.level,
                incomeInBracket,
                rate: bracket.rate,
                taxInBracket
            });

            remainingIncome -= incomeInBracket;
        } else {
            break;
        }
    }

    return { totalTax: Math.round(totalTax), details };
};

/**
 * Tính toán thuế TNCN theo phiên bản luật được chọn (mặc định: luật mới nhất 2026)
 * Hỗ trợ quy trình gộp thu nhập 2 đợt (Ngày 5 và Ngày 20) chuẩn MWG
 */
export const calculateTax = (input: Partial<TaxCalculationInput>): TaxCalculationResult => {
    const version: TaxLawVersion = input.taxLawVersion || '2026_law';
    const isNewLaw = version === '2026_law';

    const personalDeduction = input.personalDeduction || (isNewLaw ? PERSONAL_DEDUCTION_2026 : PERSONAL_DEDUCTION_LEGACY);
    const dependentDeductionUnit = isNewLaw ? DEPENDENT_DEDUCTION_2026 : DEPENDENT_DEDUCTION_LEGACY;
    const brackets = isNewLaw ? TAX_BRACKETS_2026 : TAX_BRACKETS_LEGACY;

    const incomeDay5 = Math.max(0, input.incomeDay5 || 0);
    const incomeDay20 = Math.max(0, input.incomeDay20 || 0);

    // Tổng thu nhập tháng: Nếu có dữ liệu 2 đợt thì ưu tiên tổng 2 đợt (hoặc input.totalIncome nếu được nhập trực tiếp)
    let totalIncome = Math.max(0, input.totalIncome || 0);
    if (totalIncome === 0 && (incomeDay5 > 0 || incomeDay20 > 0)) {
        totalIncome = incomeDay5 + incomeDay20;
    }

    const dependents = Math.max(0, input.dependents || 0);
    const insurance = Math.max(0, input.insurance || (input.insuranceSalary ? Math.round(input.insuranceSalary * 0.105) : 0));
    const unionFee = Math.max(0, input.unionFee || 0);

    // Tính tiền nhận thay: Tổng từ các mục thưởng được tích chọn + tiền nhập tuỳ biến
    let proxyAmount = 0;
    if (input.bonusItems && input.selectedProxyItemIds && input.selectedProxyItemIds.length > 0) {
        const selectedBonusSum = input.bonusItems
            .filter(item => input.selectedProxyItemIds?.includes(item.id))
            .reduce((sum, item) => sum + item.amount, 0);
        proxyAmount = selectedBonusSum + Math.max(0, input.customProxyAmount || 0);
    } else if (input.customProxyAmount && input.customProxyAmount > 0) {
        proxyAmount = input.customProxyAmount;
    } else {
        proxyAmount = Math.max(0, input.proxyAmount || 0);
    }

    const dependentDeductions = dependents * dependentDeductionUnit;
    const totalDeductions = personalDeduction + dependentDeductions + insurance + unionFee;

    // Giảm trừ còn thừa từ Đợt 1 mang sang Đợt 2
    const remainingDeductionsDay1 = Math.max(0, totalDeductions - incomeDay5);

    // 1. Trường hợp có số tiền nhận thay (thực tế nhận)
    const assessableIncomeWithProxy = Math.max(0, totalIncome - totalDeductions);
    const { totalTax: totalTaxWithProxy, details: bracketsWithProxy } = calculateProgressiveTaxDetailed(
        assessableIncomeWithProxy,
        brackets
    );

    // 2. Trường hợp KHÔNG có số tiền nhận thay (thu nhập chuẩn của nhân viên)
    const incomeWithoutProxy = Math.max(0, totalIncome - proxyAmount);
    const assessableIncomeWithoutProxy = Math.max(0, incomeWithoutProxy - totalDeductions);
    const { totalTax: totalTaxWithoutProxy, details: bracketsWithoutProxy } = calculateProgressiveTaxDetailed(
        assessableIncomeWithoutProxy,
        brackets
    );

    // 3. Số tiền thuế phát sinh do nhận thay (chênh lệch cần giữ lại từ đồng nghiệp)
    const taxOnProxyAmount = Math.max(0, Math.round(totalTaxWithProxy - totalTaxWithoutProxy));

    // 4. Số tiền thực chuyển lại cho đồng nghiệp (Khoản nhận thay - Thuế phát sinh)
    const netRefundToFriend = Math.max(0, proxyAmount - taxOnProxyAmount);
    const effectiveProxyTaxRate = proxyAmount > 0 ? (taxOnProxyAmount / proxyAmount) * 100 : 0;

    // 5. Nếu đang dùng luật mới 2026, tính xem tiết kiệm được bao nhiêu so với luật cũ
    let savingsVsLegacy: number | undefined = undefined;
    if (isNewLaw) {
        const legacyDeductions = PERSONAL_DEDUCTION_LEGACY + (dependents * DEPENDENT_DEDUCTION_LEGACY) + insurance + unionFee;
        const legacyAssessable = Math.max(0, totalIncome - legacyDeductions);
        const { totalTax: legacyTax } = calculateProgressiveTaxDetailed(legacyAssessable, TAX_BRACKETS_LEGACY);
        savingsVsLegacy = Math.max(0, legacyTax - totalTaxWithProxy);
    }

    return {
        taxLawVersion: version,
        incomeDay5,
        incomeDay20,
        totalIncome,
        totalDeductions,
        remainingDeductionsDay1,
        assessableIncomeWithProxy,
        totalTaxWithProxy,
        bracketsWithProxy,
        incomeWithoutProxy,
        assessableIncomeWithoutProxy,
        totalTaxWithoutProxy,
        bracketsWithoutProxy,
        taxOnProxyAmount,
        netRefundToFriend,
        effectiveProxyTaxRate,
        personalDeduction,
        dependentDeductions,
        insuranceDeductions: insurance,
        unionFeeDeduction: unionFee,
        savingsVsLegacy
    };
};

/**
 * Tạo link mã QR thanh toán VietQR / SePay
 */
export const generateVietQrUrl = (params: {
    bankAccount?: string;
    bankCode?: string;
    amount: number;
    description?: string;
}): string => {
    const { bankAccount, bankCode, amount, description } = params;
    if (!bankAccount || !bankCode || amount <= 0) return '';

    const selectedBank = BANKS.find(
        b => b.short_name.toLowerCase() === bankCode.toLowerCase() || b.code.toLowerCase() === bankCode.toLowerCase()
    );
    if (!selectedBank) return '';

    const cleanAcc = bankAccount.trim().replace(/\s+/g, '');
    const cleanAmount = Math.round(amount);
    const cleanDes = encodeURIComponent(description?.trim() || 'Hoan tien thue TNCN');

    return `https://qr.sepay.vn/img?acc=${cleanAcc}&bank=${selectedBank.bin}&amount=${cleanAmount}&des=${cleanDes}&template=compact`;
};
