/**
 * Kiểu dữ liệu cho module Tính Thuế
 * Hỗ trợ Luật Thuế TNCN mới nhất 2026 (Luật 109/2025/QH15 - 5 bậc)
 * Chuẩn nghiệp vụ chi trả 2 đợt (Ngày 5 và Ngày 20) của MWG (Thế Giới Di Động / Điện Máy Xanh)
 */

export type TaxLawVersion = '2026_law' | 'legacy_law';

export interface TaxBracket {
    level: number;
    max: number; // Infinity cho bậc cao nhất
    rate: number; // e.g. 0.05
}

export interface BonusItem {
    id: string;
    name: string;
    amount: number;
    category?: 'hot' | 'main' | 'other';
    isProxy?: boolean;
}

/** Dữ liệu bóc tách từ Bảng lương ngày 5 (Chi tiết lương) */
export interface SalarySlipDay5Data {
    fullName: string;
    monthYear: string;
    /** Tổng thu nhập chịu thuế CẢ THÁNG (đợt 1 + đợt 2) — lấy từ bảng thu nhập theo năm của HRM */
    monthTotalIncome?: number;
    incomeDay5: number; // Tổng thu nhập chịu thuế đợt 1
    insuranceSalary: number; // Lương đóng BHXH
    insurance: number; // Tổng giảm trừ bảo hiểm (10.5%: BHXH, BHYT, BHTN)
    dependents: number; // Số người phụ thuộc
    personalDeduction: number; // Mức giảm trừ bản thân (15.5M)
    totalDeductionsDay1: number; // Tổng giảm trừ đợt 1
    remainingDeductionsDay1: number; // Giảm trừ còn thừa chuyển sang đợt 2
    bankAccount?: string;
    bankName?: string;
    matchedBankCode?: string;
    isValid?: boolean;
    error?: string;
}

/** Dữ liệu bóc tách từ Bảng thưởng ngày 20 (Xem chi tiết thưởng) */
export interface SalarySlipDay20Data {
    fullName: string;
    monthYear: string;
    /** Dòng "(1) Tổng thu nhập chịu thuế TNCN trong tháng" — là tổng CẢ THÁNG, không phải riêng đợt 2 */
    monthTotalIncome?: number;
    incomeDay20: number; // Tổng thu nhập chịu thuế đợt 2 (hoặc tổng thưởng)
    bonusMain: number; // Thưởng chính
    bonusHot: number; // Thưởng nóng
    actualTaxDay20: number; // Thuế TNCN bị trừ thực tế (dòng "Trừ thuế TNCN")
    bonusItems: BonusItem[]; // Danh sách từng khoản thưởng
    bankAccount?: string;
    bankName?: string;
    matchedBankCode?: string;
    isValid?: boolean;
    error?: string;
}

export interface TaxCalculationInput {
    name: string;
    monthYear?: string;
    /** Tổng thu nhập chịu thuế cả tháng do HRM công bố (ưu tiên hơn phép cộng 2 đợt) */
    monthTotalIncome?: number;

    // Đợt 1 (Ngày 5)
    incomeDay5: number;
    insuranceSalary: number;
    insurance: number;
    dependents: number;
    personalDeduction: number;

    // Đợt 2 (Ngày 20)
    incomeDay20: number;
    bonusMain: number;
    bonusHot: number;
    actualTaxDay20: number;
    bonusItems: BonusItem[];
    selectedProxyItemIds: string[];
    customProxyAmount: number;

    // Tổng hợp & Nhận thay
    totalIncome: number; // Tổng thu nhập tháng (incomeDay5 + incomeDay20)
    proxyAmount: number; // Tổng tiền nhận thay (tổng selected items + customProxyAmount)
    unionFee: number; // Phí công đoàn (nếu có)
    bankAccount?: string;
    bankCode?: string;
    qrDescription?: string;
    taxLawVersion?: TaxLawVersion;

    // Trạng thái đã tải ảnh
    hasDay5Slip?: boolean;
    hasDay20Slip?: boolean;
}

export interface BracketDetail {
    level: number;
    incomeInBracket: number;
    rate: number;
    taxInBracket: number;
}

export interface TaxCalculationResult {
    taxLawVersion: TaxLawVersion;

    // Thông tin tổng hợp 2 đợt
    incomeDay5: number;
    incomeDay20: number;
    totalIncome: number;
    totalDeductions: number;
    remainingDeductionsDay1: number; // Mức giảm trừ còn thừa từ đợt 1 mang sang đợt 2

    // Với số tiền nhận thay (thực tế tại Đợt 2)
    assessableIncomeWithProxy: number; // Thu nhập tính thuế thực tế
    totalTaxWithProxy: number; // Thuế TNCN thực tế (khớp với dòng Trừ thuế TNCN đợt 2)
    bracketsWithProxy: BracketDetail[]; // Chi tiết phân rã từng bậc thuế

    // Nếu KHÔNG có số tiền nhận thay (Thu nhập chuẩn của nhân viên)
    incomeWithoutProxy: number; // Thu nhập chuẩn không nhận thay
    assessableIncomeWithoutProxy: number; // TNTT chuẩn
    totalTaxWithoutProxy: number; // Thuế chuẩn không nhận thay
    bracketsWithoutProxy: BracketDetail[]; // Chi tiết phân rã từng bậc thuế chuẩn

    // Chênh lệch cần hoàn lại & Thực chuyển
    taxOnProxyAmount: number; // Tiền thuế phát sinh do nhận thay (cần giữ lại / lấy lại)
    netRefundToFriend: number; // Thực chuyển lại cho đồng nghiệp (Khoản nhận thay - Thuế phát sinh)
    effectiveProxyTaxRate: number; // Tỷ lệ thuế phát sinh trên khoản nhận thay (%)

    // Các khoản giảm trừ
    personalDeduction: number;
    dependentDeductions: number;
    insuranceDeductions: number;
    unionFeeDeduction: number;

    // Khoản tiết kiệm thuế so với luật cũ (nếu có)
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
    monthYear?: string;
    incomeDay5?: number;
    incomeDay20?: number;
    totalIncome: number;
    dependents: number;
    proxyAmount: number;
    taxOnProxyAmount: number;
    netRefundToFriend?: number;
    insurance?: number;
    unionFee?: number;
    taxLawVersion?: TaxLawVersion;
    bankAccount?: string;
    bankCode?: string;
    proxyItemsDetail?: string; // Chi tiết loại khoán, thưởng nhận thay
    proxyItemNames?: string[]; // Danh sách tên các khoản nhận thay
    customProxyAmount?: number;
    vietQrUrl?: string; // Link ảnh QR chuyển khoản SePay / VietQR
    createdAt: string; // ISO string
    syncedToCloud?: boolean;
}
