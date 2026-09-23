import { BonusItem, SalarySlipDay5Data, SalarySlipDay20Data } from '../types/tax.types';
import { normalizeBankCode } from './bankCatalog';

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
            return { label, value, amount: parseHrmNumber(value) };
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
    const personalDeduction = numberByLabel(lines, 'Giảm trừ bản thân') ?? 15_500_000;
    const dependents = numberByLabel(lines, 'Số lượng người phụ thuộc') ?? 0;
    const unionFee = numberByLabel(lines, 'đoàn phí công đoàn') ?? 0;
    const bankAccount = textByLabel(lines, 'Số TK').replace(/\s+/g, '');
    const bankName = textByLabel(lines, 'Ngân hàng CK') || textByLabel(lines, 'Ngân hàng');

    if (incomeDay5 <= 0) {
        throw new Error(
            'Không tìm thấy dòng "Tổng thu nhập chịu thuế TNCN trong tháng" trong nội dung dán. Hãy copy TOÀN BỘ trang Chi tiết lương.'
        );
    }

    return {
        fullName: findHeaderName(lines),
        monthYear: findMonthYear(lines),
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

/** Các dòng tiền nằm giữa 2 mốc tiêu đề */
const itemsBetween = (
    lines: ParsedHrmLine[],
    startNeedle: string,
    endNeedle: string,
    skip: (label: string) => boolean
): ParsedHrmLine[] => {
    const start = lines.findIndex(l => labelMatches(l.label, startNeedle));
    if (start < 0) return [];
    const out: ParsedHrmLine[] = [];
    for (let i = start + 1; i < lines.length; i++) {
        const line = lines[i];
        if (labelMatches(line.label, endNeedle)) break;
        if (line.amount === null || line.amount === 0) continue;
        if (skip(line.label)) continue;
        out.push(line);
    }
    return out;
};

/** Phiếu "2. Thưởng ngày 20" (HRM › Xem chi tiết thưởng) */
export const parseHrmDay20Text = (text: string): SalarySlipDay20Data => {
    const lines = splitHrmLines(text);
    if (detectHrmSlipKind(text) !== 'day20') {
        throw new Error(
            'Nội dung dán vào không phải trang "Xem chi tiết thưởng" (HRM ngày 20). Hãy mở đúng trang, bấm Ctrl+A rồi Ctrl+C và dán lại.'
        );
    }

    const bonusMain = numberByLabel(lines, 'Tổng thưởng chính') ?? 0;
    const bonusHot = numberByLabel(lines, 'Thực nhận thưởng nóng') ?? 0;
    const incomeDay20 = numberByLabel(lines, 'Tổng thu nhập chịu thuế TNCN trong tháng') ?? 0;
    const actualTaxDay20 = numberByLabel(lines, 'Thuế TNCN phải nộp') ?? 0;

    // Thưởng chính: chỉ lấy các dòng đánh số "01." "02." … — dòng "Thưởng Nhân viên ST …" là TỔNG
    // của nhóm, lấy cả hai là cộng đôi.
    const mainItems = itemsBetween(
        lines,
        'Thưởng chính',
        'Tổng thưởng chính',
        label => !/^\d{2}\./.test(label.trim())
    ).map<BonusItem>((line, i) => ({
        id: `hrm_main_${i + 1}`,
        name: line.label.replace(/^\d{2}\.\s*/, '').trim(),
        amount: line.amount as number,
        category: 'main',
    }));

    const hotItems = itemsBetween(
        lines,
        'Thưởng nóng',
        'Thực nhận thưởng nóng',
        () => false
    ).map<BonusItem>((line, i) => ({
        id: `hrm_hot_${i + 1}`,
        name: line.label.trim(),
        amount: line.amount as number,
        category: 'hot',
    }));

    if (bonusHot <= 0 && hotItems.length === 0 && bonusMain <= 0) {
        throw new Error(
            'Không tìm thấy khoản thưởng nào trong nội dung dán. Hãy copy TOÀN BỘ trang Xem chi tiết thưởng.'
        );
    }

    const bankName = textByLabel(lines, 'Ngân hàng');

    return {
        fullName: textByLabel(lines, 'Chủ tài khoản') || findHeaderName(lines),
        monthYear: findMonthYear(lines),
        incomeDay20: incomeDay20 > 0 ? incomeDay20 : bonusMain + bonusHot,
        bonusMain,
        bonusHot,
        actualTaxDay20,
        bonusItems: [...hotItems, ...mainItems],
        bankAccount: textByLabel(lines, 'Số tài khoản').replace(/\s+/g, ''),
        bankName,
        matchedBankCode: normalizeBankCode(bankName) || undefined,
        isValid: true,
    };
};
