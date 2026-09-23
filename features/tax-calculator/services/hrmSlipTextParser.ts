import { BonusItem, SalarySlipDay5Data, SalarySlipDay20Data } from '../types/tax.types';
import { normalizeBankCode } from './bankCatalog';
import { DEPENDENT_DEDUCTION_2026, PERSONAL_DEDUCTION_2026 } from './taxCalculatorService';

/**
 * Bóc tách phiếu lương / bảng thưởng HRM của MWG từ TEXT dán trực tiếp (Ctrl+A, Ctrl+C trên trang
 * HRM rồi dán vào app) — thay cho việc chụp ảnh rồi nhờ AI đọc: nhanh hơn, không tốn hạn mức AI,
 * và không sai số do ảnh mờ. Chủ dự án yêu cầu 2026-09-23.
 *
 * Mỗi dòng dữ liệu có dạng "Nhãn<TAB>Giá trị" (do copy từ bảng HTML). Một số nhãn xuất hiện 2 lần
 * (ví dụ "8% BHXH" nằm cả ở phần giảm trừ lẫn phần khấu trừ) nên mặc định lấy lần xuất hiện ĐẦU.
 */

export type HrmSlipKind = 'day5' | 'day20';

export interface ParsedHrmLine {
    label: string;
    value: string;
    amount: number | null;
    /** Các cột sau nhãn — cần cho bảng thu nhập 12 tháng */
    columns: string[];
}

const NUMBER_RE = /^-?[\d.,]+$/;

/** "7,722,410" -> 7722410 ; "-17,000" -> -17000 ; "" -> null */
export const parseHrmNumber = (raw: string): number | null => {
    const text = (raw || '').trim();
    if (!text || !NUMBER_RE.test(text)) return null;
    const normalized = text.replace(/[.,]/g, '');
    if (!/^-?\d+$/.test(normalized)) return null;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
};

/** Tách text dán thành danh sách dòng "nhãn / giá trị" */
export const splitHrmLines = (text: string): ParsedHrmLine[] =>
    (text || '')
        .split(/\r?\n/)
        .map(line => {
            const parts = line.split('\t');
            const label = (parts[0] || '').replace(/\s+/g, ' ').trim();
            const value = (parts.length > 1 ? parts[parts.length - 1] : '').trim();
            const columns = parts.slice(1).map(c => c.trim());
            return { label, value, amount: parseHrmNumber(value), columns };
        })
        .filter(l => l.label.length > 0 || l.value.length > 0);

const stripDiacritics = (s: string): string =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

const labelMatches = (label: string, needle: string): boolean =>
    stripDiacritics(label).includes(stripDiacritics(needle));

/** Giá trị số của dòng có nhãn chứa `needle` (lần xuất hiện đầu tiên) */
export const numberByLabel = (lines: ParsedHrmLine[], needle: string): number | null => {
    const hit = lines.find(l => l.amount !== null && labelMatches(l.label, needle));
    return hit ? hit.amount : null;
};

/** Giá trị chữ của dòng có nhãn chứa `needle` */
export const textByLabel = (lines: ParsedHrmLine[], needle: string): string => {
    const hit = lines.find(l => l.value.length > 0 && labelMatches(l.label, needle));
    return hit ? hit.value : '';
};

/** "08/2026" — tháng lương của phiếu */
const findMonthYear = (lines: ParsedHrmLine[]): string => {
    for (const line of lines) {
        const m = line.label.match(/^(\d{1,2})\/(\d{4})$/);
        if (m) return line.label;
    }
    // Bảng thưởng: tiêu đề "Thưởng chính 08/2026"
    for (const line of lines) {
        const m = line.label.match(/(\d{1,2}\/\d{4})/);
        if (m && labelMatches(line.label, 'thuong')) return m[1];
    }
    return '';
};

/**
 * Tổng thu nhập chịu thuế CẢ THÁNG, lấy từ bảng "BỨC TRANH THU NHẬP THEO NĂM" ở đầu trang
 * Chi tiết lương (dòng "Thu nhập" có 12 cột T1..T12 + cột Tổng).
 * Đây là con số HRM dùng để tính thuế cho cả tháng (gồm cả đợt 1 lẫn đợt 2), đã đối chiếu:
 *   - Phiếu A: cột T8 = 28.302.349 = đúng dòng "(1) Tổng thu nhập chịu thuế" ở trang thưởng.
 *   - Phiếu B: cột T1 - lương đợt 1 = 14.540.999 = đúng tổng các khoản thưởng đợt 2.
 */
export const monthIncomeFromYearTable = (lines: ParsedHrmLine[], monthYear: string): number | null => {
    const m = monthYear.match(/^(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const monthIndex = Number(m[1]) - 1;
    if (monthIndex < 0 || monthIndex > 11) return null;

    const row = lines.find(l => l.label === 'Thu nhập' && l.columns.length >= 13);
    if (!row) return null;
    const value = parseHrmNumber(row.columns[monthIndex]);
    return value !== null && value > 0 ? value : null;
};

/** Tên người: dòng ngay trước thanh điều hướng "Trang chủ … HRM …" */
const findHeaderName = (lines: ParsedHrmLine[]): string => {
    const idx = lines.findIndex(
        l => labelMatches(l.label, 'trang chu') && labelMatches(l.label, 'hrm')
    );
    if (idx > 0) {
        const prev = lines[idx - 1].label.trim();
        if (prev && !/^\d+$/.test(prev) && prev.length <= 60) return prev;
    }
    return '';
};

/** Nhận biết text dán thuộc phiếu nào để báo khi người dùng dán nhầm ô */
export const detectHrmSlipKind = (text: string): HrmSlipKind | null => {
    const flat = stripDiacritics(text || '');
    const isDay20 =
        flat.includes('xem chi tiet thuong') ||
        flat.includes('thuc nhan thuong nong') ||
        flat.includes('tong thuong chinh');
    if (isDay20) return 'day20';
    const isDay5 =
        flat.includes('chi tiet luong') ||
        flat.includes('tong luong, phu cap') ||
        flat.includes('luong bhxh');
    if (isDay5) return 'day5';
    return null;
};

/**
 * Số người phụ thuộc. Trên HRM, khối "Tổng tiền giảm trừ" CÓ THỂ ĐANG THU GỌN — lúc đó text copy
 * ra chỉ có dòng tổng, không có "Số lượng người phụ thuộc". Vẫn suy ra được vì:
 *   Tổng giảm trừ = Giảm trừ bản thân + Bảo hiểm (8%+1.5%+1%) + Số người phụ thuộc × 6.2tr
 * (các dòng bảo hiểm luôn hiện ở khối "Tổng khấu trừ" nên không mất).
 */
export const resolveDependents = (args: {
    explicit: number | null;
    dependentDeduction: number | null;
    totalDeductions: number;
    personalDeduction: number;
    insurance: number;
}): number => {
    const { explicit, dependentDeduction, totalDeductions, personalDeduction, insurance } = args;
    if (explicit !== null && explicit >= 0) return explicit;

    if (dependentDeduction !== null && dependentDeduction > 0) {
        return Math.round(dependentDeduction / DEPENDENT_DEDUCTION_2026);
    }

    if (totalDeductions > 0) {
        const rest = totalDeductions - personalDeduction - insurance;
        if (rest >= DEPENDENT_DEDUCTION_2026 / 2) {
            return Math.round(rest / DEPENDENT_DEDUCTION_2026);
        }
    }
    return 0;
};

export interface ParsedDay5 extends SalarySlipDay5Data {
    unionFee: number;
}

/** Phiếu "1. Lương ngày 5" (HRM › Chi tiết lương) */
export const parseHrmDay5Text = (text: string): ParsedDay5 => {
    const lines = splitHrmLines(text);
    if (detectHrmSlipKind(text) !== 'day5') {
        throw new Error(
            'Nội dung dán vào không phải trang "Chi tiết lương" (HRM ngày 5). Hãy mở đúng trang, bấm Ctrl+A rồi Ctrl+C và dán lại.'
        );
    }

    const incomeDay5 = numberByLabel(lines, 'Tổng thu nhập chịu thuế TNCN trong tháng') ?? 0;
    const insuranceSalary = numberByLabel(lines, 'Lương BHXH') ?? 0;
    const bhxh = numberByLabel(lines, '8% BHXH') ?? 0;
    const bhyt = numberByLabel(lines, '1.5% BHYT') ?? 0;
    const bhtn = numberByLabel(lines, '1% BHTN') ?? 0;
    const totalDeductionsDay1 = numberByLabel(lines, 'Tổng tiền giảm trừ') ?? 0;
    const personalDeduction = numberByLabel(lines, 'Giảm trừ bản thân') ?? PERSONAL_DEDUCTION_2026;
    const dependents = resolveDependents({
        explicit: numberByLabel(lines, 'Số lượng người phụ thuộc'),
        dependentDeduction: numberByLabel(lines, 'Giảm trừ người phụ thuộc'),
        totalDeductions: totalDeductionsDay1,
        personalDeduction,
        insurance: bhxh + bhyt + bhtn,
    });
    const unionFee = numberByLabel(lines, 'đoàn phí công đoàn') ?? 0;
    const bankAccount = textByLabel(lines, 'Số TK').replace(/\s+/g, '');
    const bankName = textByLabel(lines, 'Ngân hàng CK') || textByLabel(lines, 'Ngân hàng');

    if (incomeDay5 <= 0) {
        throw new Error(
            'Không tìm thấy dòng "Tổng thu nhập chịu thuế TNCN trong tháng" trong nội dung dán. Hãy copy TOÀN BỘ trang Chi tiết lương.'
        );
    }

    const monthYear = findMonthYear(lines);

    return {
        fullName: findHeaderName(lines),
        monthYear,
        monthTotalIncome: monthIncomeFromYearTable(lines, monthYear) ?? undefined,
        incomeDay5,
        insuranceSalary,
        insurance: bhxh + bhyt + bhtn,
        dependents,
        personalDeduction,
        totalDeductionsDay1,
        remainingDeductionsDay1: Math.max(0, totalDeductionsDay1 - incomeDay5),
        unionFee,
        bankAccount,
        bankName,
        matchedBankCode: normalizeBankCode(bankName) || undefined,
        isValid: true,
    };
};

/**
 * Các nhãn KHÔNG phải khoản thưởng — phải loại khỏi danh sách, nếu không sẽ lọt "Tổng chuyển
 * khoản", "Số tài khoản" (bị đọc thành 251.002.772.022 đ), "Trừ Thuế TNCN"… vào danh sách chọn
 * nhận thay (chủ dự án báo 2026-09-23: "dư quá nhiều thông tin").
 */
const NON_BONUS_EXACT = [
    'Tổng chuyển khoản',
    'Chủ tài khoản',
    'Số tài khoản',
    'Ngân hàng',
    'Trừ Thuế TNCN',
    'Trừ TNCN',
    'Tổng thưởng chính',
    'Thực nhận thưởng chính',
    'Thực nhận thưởng nóng',
    'Còn lại', // phải so KHỚP CẢ DÒNG: có khoản thưởng tên "Thưởng ERP còn lại (tích lũy…)"
    'Thuế TNCN phải nộp',
];

const NON_BONUS_CONTAINS = [
    'Phải thu Công nhân viên',
    'Thưởng Nhân viên ST', // dòng TỔNG của nhóm thưởng chính, không phải 1 khoản riêng
    'Tổng thu nhập chịu thuế',
    'Tổng tiền giảm trừ',
    'Thu nhập tính thuế',
    'Giờ công chuẩn',
];

const isNonBonusLabel = (label: string): boolean => {
    const clean = stripDiacritics(label.trim().replace(/\s+/g, ' '));
    if (NON_BONUS_EXACT.some(needle => stripDiacritics(needle) === clean)) return true;
    if (NON_BONUS_CONTAINS.some(needle => labelMatches(label, needle))) return true;
    return /^CK\s*\d{2}\/\d{2}\/\d{4}$/i.test(label.trim());
};

/** Dòng thưởng chính được HRM đánh số "01." … "15." */
const isNumberedMainItem = (label: string): boolean => /^\d{2}\.\s/.test(label.trim());

/** Thuế TNCN đã bị khấu trừ ở đợt 2 — phiếu ghi "Trừ Thuế TNCN -2,848,000" hoặc "Thuế TNCN phải nộp" */
const findWithheldTax = (lines: ParsedHrmLine[]): number => {
    let best = 0;
    lines.forEach(line => {
        if (line.amount === null) return;
        const isTaxLine =
            labelMatches(line.label, 'Trừ Thuế TNCN') ||
            labelMatches(line.label, 'Trừ TNCN') ||
            labelMatches(line.label, 'Thuế TNCN phải nộp');
        if (isTaxLine) best = Math.max(best, Math.abs(line.amount));
    });
    return best;
};

/**
 * Phiếu "2. Thưởng ngày 20" (HRM › Xem chi tiết thưởng).
 * Trang này có thể gồm NHIỀU đợt chuyển khoản (CK 26/02, CK 09/02, CK 05/03…) — lấy hết các khoản
 * thưởng của mọi đợt, vì khoản nào cũng có thể là tiền nhận thay.
 */
export const parseHrmDay20Text = (text: string): SalarySlipDay20Data => {
    const lines = splitHrmLines(text);
    if (detectHrmSlipKind(text) !== 'day20') {
        throw new Error(
            'Nội dung dán vào không phải trang "Xem chi tiết thưởng" (HRM ngày 20). Hãy mở đúng trang, bấm Ctrl+A rồi Ctrl+C và dán lại.'
        );
    }

    // Tổng thưởng chính có thể xuất hiện nhiều lần (mỗi đợt CK một dòng) -> cộng dồn
    const bonusMain = lines
        .filter(l => l.amount !== null && labelMatches(l.label, 'Tổng thưởng chính'))
        .reduce((sum, l) => sum + (l.amount as number), 0);

    const mainItems: BonusItem[] = [];
    const hotItems: BonusItem[] = [];
    lines.forEach(line => {
        if (line.amount === null || line.amount === 0) return;
        if (isNonBonusLabel(line.label)) return;
        const name = line.label.replace(/^\d{2}\.\s*/, '').trim();
        if (!name) return;
        if (isNumberedMainItem(line.label)) {
            mainItems.push({ id: `hrm_main_${mainItems.length + 1}`, name, amount: line.amount, category: 'main' });
        } else {
            hotItems.push({ id: `hrm_hot_${hotItems.length + 1}`, name, amount: line.amount, category: 'hot' });
        }
    });

    const bonusHot = hotItems.reduce((sum, item) => sum + item.amount, 0);

    if (bonusHot <= 0 && bonusMain <= 0) {
        throw new Error(
            'Không tìm thấy khoản thưởng nào trong nội dung dán. Hãy copy TOÀN BỘ trang Xem chi tiết thưởng.'
        );
    }

    // "(1) Tổng thu nhập chịu thuế TNCN trong tháng" trên trang này là tổng CẢ THÁNG (gồm cả đợt 1),
    // không phải riêng đợt 2 — đã đối chiếu trên phiếu thật. Có thể vắng mặt khi khối "Trừ thuế
    // TNCN" đang thu gọn.
    const monthTotalIncome = numberByLabel(lines, 'Tổng thu nhập chịu thuế') ?? undefined;
    const bankName = textByLabel(lines, 'Ngân hàng');

    return {
        fullName: textByLabel(lines, 'Chủ tài khoản') || findHeaderName(lines),
        monthYear: findMonthYear(lines),
        monthTotalIncome,
        incomeDay20: bonusMain + bonusHot,
        bonusMain,
        bonusHot,
        actualTaxDay20: findWithheldTax(lines),
        bonusItems: [...hotItems, ...mainItems],
        bankAccount: textByLabel(lines, 'Số tài khoản').replace(/\s+/g, ''),
        bankName,
        matchedBankCode: normalizeBankCode(bankName) || undefined,
        isValid: true,
    };
};
