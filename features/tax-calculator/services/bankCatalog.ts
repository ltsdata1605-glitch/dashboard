import { Bank } from '../types/tax.types';

export const BANKS: Bank[] = [
    { name: "Ngân hàng TMCP Ngoại thương Việt Nam", code: "VCB", bin: "970436", short_name: "Vietcombank" },
    { name: "Ngân hàng TMCP Công thương Việt Nam", code: "CTG", bin: "970415", short_name: "VietinBank" },
    { name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", code: "BIDV", bin: "970418", short_name: "BIDV" },
    { name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam", code: "VBA", bin: "970405", short_name: "Agribank" },
    { name: "Ngân hàng TMCP Quân đội", code: "MBB", bin: "970422", short_name: "MBBank" },
    { name: "Ngân hàng TMCP Kỹ thương Việt Nam", code: "TCB", bin: "970407", short_name: "Techcombank" },
    { name: "Ngân hàng TMCP Á Châu", code: "ACB", bin: "970416", short_name: "ACB" },
    { name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", code: "VPB", bin: "970432", short_name: "VPBank" },
    { name: "Ngân hàng TMCP Sài Gòn Thương Tín", code: "STB", bin: "970403", short_name: "Sacombank" },
    { name: "Ngân hàng TMCP Quốc tế Việt Nam", code: "VIB", bin: "970441", short_name: "VIB" },
    { name: "Ngân hàng TMCP Tiên Phong", code: "TPB", bin: "970423", short_name: "TPBank" },
    { name: "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh", code: "HDB", bin: "970437", short_name: "HDBank" },
    { name: "Ngân hàng TMCP Phương Đông", code: "OCB", bin: "970448", short_name: "OCB" },
    { name: "Ngân hàng TMCP Đông Nam Á", code: "SEAB", bin: "970440", short_name: "SeABank" },
    { name: "Ngân hàng TMCP Sài Gòn - Hà Nội", code: "SHB", bin: "970443", short_name: "SHB" },
    { name: "Ngân hàng TNHH MTV Shinhan Việt Nam", code: "SHBVN", bin: "970424", short_name: "ShinhanBank" },
    { name: "Ngân hàng TMCP Bản Việt", code: "VCCB", bin: "970454", short_name: "VietCapitalBank" },
    { name: "Ngân hàng TMCP Bắc Á", code: "BAB", bin: "970409", short_name: "BacABank" },
    { name: "Ngân hàng TMCP An Bình", code: "ABB", bin: "970425", short_name: "ABBANK" },
    { name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam", code: "EIB", bin: "970431", short_name: "Eximbank" },
    { name: "Ngân hàng TMCP Kiên Long", code: "KLB", bin: "970452", short_name: "KienLongBank" },
];

export const VIETNAMESE_BANKS = BANKS;

export const BANK_OPTIONS = BANKS.map(b => ({
    value: b.short_name,
    label: `${b.short_name} - ${b.name}`,
    bank: b
})).sort((a, b) => a.label.localeCompare(b.label, 'vi'));

/**
 * Bí danh ngân hàng thường gặp trên phiếu lương MWG (viết tắt, tên tiếng Việt không dấu).
 * Khoá = short_name trong BANKS. Bí danh dưới 3 ký tự chỉ khớp khi trùng khít cả chuỗi.
 */
const BANK_ALIASES: Record<string, string[]> = {
    Vietcombank: ['vcb', 'vietcombank', 'ngoaithuong'],
    VietinBank: ['ctg', 'vietinbank', 'viettinbank', 'congthuong'],
    BIDV: ['bidv', 'dautuvaphattrien'],
    Agribank: ['vba', 'agribank', 'nongnghiep'],
    MBBank: ['mb', 'mbb', 'mbbank', 'quandoi', 'militarybank'],
    Techcombank: ['tcb', 'techcombank', 'kythuong'],
    ACB: ['acb', 'achau'],
    VPBank: ['vpb', 'vpbank', 'vietnamthinhvuong'],
    Sacombank: ['stb', 'sacombank', 'saigonthuongtin'],
    VIB: ['vib', 'quocte'],
    TPBank: ['tpb', 'tpbank', 'tienphong'],
    HDBank: ['hdb', 'hdbank', 'phattrienthanhphohochiminh'],
    OCB: ['ocb', 'phuongdong'],
    SeABank: ['seab', 'seabank', 'dongnama'],
    SHB: ['shb', 'saigonhanoi'],
    ShinhanBank: ['shbvn', 'shinhan', 'shinhanbank'],
    VietCapitalBank: ['vccb', 'bvbank', 'banviet', 'vietcapital'],
    BacABank: ['bab', 'bacabank', 'baca'],
    ABBANK: ['abb', 'abbank', 'anbinh'],
    Eximbank: ['eib', 'eximbank', 'xuatnhapkhau'],
    KienLongBank: ['klb', 'kienlong', 'kienlongbank'],
};

/** Bỏ dấu tiếng Việt và mọi ký tự không phải chữ/số: "Ngân hàng TMCP Quân Đội" -> "nganhangtmcpquandoi" */
const slugifyBankText = (raw: string): string =>
    raw
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

/**
 * Quy về đúng `short_name` trong BANKS (giá trị mà <select> và generateVietQrUrl dùng).
 * Nhận cả mã ("MBB"), short_name ("MBBank"), bí danh ("MB") lẫn tên đầy đủ trên phiếu lương.
 * Trả về '' khi không nhận ra — để UI hiển thị "-- Chọn ngân hàng --" thay vì giá trị rác.
 */
export const normalizeBankCode = (rawValue?: string | null): string => {
    const slug = slugifyBankText(rawValue || '');
    if (!slug) return '';

    // 1. Trùng khít short_name hoặc code trong danh mục
    const exact = BANKS.find(b => slugifyBankText(b.short_name) === slug || slugifyBankText(b.code) === slug);
    if (exact) return exact.short_name;

    // 2. Trùng khít một bí danh (kể cả bí danh ngắn như "mb")
    for (const [shortName, aliases] of Object.entries(BANK_ALIASES)) {
        if (aliases.includes(slug)) return shortName;
    }

    // 3. Chuỗi dài (tên đầy đủ) chứa bí danh — lấy bí danh dài nhất để tránh khớp nhầm
    let best: { shortName: string; length: number } | null = null;
    for (const [shortName, aliases] of Object.entries(BANK_ALIASES)) {
        for (const alias of aliases) {
            if (alias.length >= 3 && slug.includes(alias) && (!best || alias.length > best.length)) {
                best = { shortName, length: alias.length };
            }
        }
    }
    return best ? best.shortName : '';
};

/** Ngân hàng đã chọn có hợp lệ (nằm trong danh mục) hay không */
export const isKnownBankCode = (rawValue?: string | null): boolean => !!normalizeBankCode(rawValue);
