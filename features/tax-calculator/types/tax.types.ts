/**
 * Kiểu dữ liệu cho module Tính Thuế
 * Hỗ trợ Luật Thuế TNCN mới nhất 2026 (Luật 109/2025/QH15 - 5 bậc)
 * và Biểu thuế hiện hành cũ (Nghị quyết 954/2020 - 7 bậc)
 */

export type TaxLawVersion = '2026_law' | 'legacy_law';

export interface TaxBracket {
    level: number;
    max: number; // Infinity cho bậc cao nhất
    rate: number; // e.g. 0.05
}

export interface TaxCalculationInput {
    name: string;
    totalIncome: number; // Tổng thu nhập chịu thuế (VND)
    dependents: number; // Số người phụ thuộc
    proxyAmount: number; // Số tiền nhận thay (VND)
    insurance: number; // Bảo hiểm bắt buộc (VND)
    unionFee: number; // Phí công đoàn (VND)
    bankAccount?: string; // Số tài khoản nhận hoàn thuế
    bankCode?: string; // Mã ngân hàng (short_name)
    qrDescription?: string; // Nội dung chuyển khoản
    taxLawVersion?: TaxLawVersion; // Phiên bản luật thuế ('2026_law' hoặc 'legacy_law')
}

export interface BracketDetail {
    level: number;
    incomeInBracket: number;
    rate: number;
    taxInBracket: number;
}

export interface TaxCalculationResult {
    taxLawVersion: TaxLawVersion;

    // Với số tiền nhận thay (thực tế)
    assessableIncomeWithProxy: number; // Thu nhập tính thuế (sau giảm trừ)
    totalTaxWithProxy: number; // Thuế TNCN thực tế phát sinh
    bracketsWithProxy: BracketDetail[]; // Chi tiết phân rã từng bậc thuế

    // Nếu KHÔNG có số tiền nhận thay
    incomeWithoutProxy: number; // Thu nhập nếu không nhận thay
    assessableIncomeWithoutProxy: number; // Thu nhập tính thuế nếu không nhận thay
    totalTaxWithoutProxy: number; // Thuế TNCN nếu không nhận thay
    bracketsWithoutProxy: BracketDetail[]; // Chi tiết phân rã từng bậc thuế

    // Chênh lệch cần hoàn lại
    taxOnProxyAmount: number; // Số tiền thuế phát sinh do nhận thay (tiền cần hoàn)

    // Các khoản giảm trừ
    personalDeduction: number; // 15.5M (2026) hoặc 11M (cũ)
    dependentDeductions: number; // 6.2M x dependents (2026) hoặc 4.4M x dependents (cũ)
    insuranceDeductions: number;
    unionFeeDeduction: number;
    totalDeductions: number;

    // Khoản tiết kiệm thuế so với luật cũ (khi áp dụng luật mới 2026)
    savingsVsLegacy?: number;
}

export interface Bank {
    name: string;
    code: string;
    bin: string;
    short_name: string;
}

export interface SavedTaxRecord {
    id?: number;
    name: string;
    totalIncome: number;
    dependents: number;
    proxyAmount: number;
    insurance: number;
    unionFee: number;
    taxOnProxyAmount: number;
    taxLawVersion?: TaxLawVersion;
    bankAccount?: string;
    bankCode?: string;
    createdAt: string; // ISO string
    syncedToCloud?: boolean;
}
