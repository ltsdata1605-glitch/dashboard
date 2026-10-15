/**
 * MÀU NGÀNH HÀNG — một nguồn duy nhất cho thẻ ngành ở Phân tích (components/charts/IndustryGrid) và ô ngành ở 2 modal
 * "chưa xuất" / "chưa thu" (components/modals/UnshippedOrdersModal, UncollectedOrdersModal).
 *
 * Vì sao có (2026-10-15): 2 modal dựng class ĐỘNG `border-${color}-500`, `bg-${color}-100`, `text-${color}-600`. Tailwind chỉ
 * sinh class có tên ĐẦY ĐỦ xuất hiện trong mã nguồn, nên 6 ngành (Tablet, Phụ kiện, Gia dụng, CE, Sim, Vieon — khoá
 * cyan/violet/orange/teal/lime/fuchsia) CHƯA TỪNG có màu: vạch trái, ô icon, con số đều mất màu. Bảng dưới viết mọi class
 * TƯỜNG MINH (đừng dựng lại bằng chuỗi ghép — test `tests/unit/industry-colors.test.ts` chặn).
 *
 * Khoá màu cũ (blue/cyan/violet…) giữ nguyên để không phải đổi dữ liệu/logic, nhưng ánh xạ về bảng màu semantic
 * (CLAUDE.md mục 2: sky/emerald/amber/rose/slate) — đúng bảng IndustryGrid đã dùng từ đợt dọn màu, nên một ngành mang CÙNG màu
 * ở mọi nơi. Hai tầng: ĐẬM (chữ 700, vạch 500) và NHẠT (chữ 500, vạch 300 — số vẫn 600 cho dễ đọc).
 */
export type IndustryColorKey =
    | 'blue' | 'sky' | 'indigo' | 'cyan' | 'violet'
    | 'emerald' | 'teal' | 'lime'
    | 'amber' | 'orange'
    | 'rose' | 'pink' | 'fuchsia'
    | 'slate';

/** Tên ngành → khoá màu (trước 2026-10-15 chép 3 nơi: 2 modal + hooks/useIndustryGridLogic). */
export const INDUSTRY_COLOR_KEY: Readonly<Record<string, IndustryColorKey>> = {
    'Smartphone': 'blue', 'Laptop': 'sky', 'Tablet': 'cyan',
    'Phụ kiện': 'violet', 'Gia dụng': 'orange', 'Wearable': 'rose',
    'CE': 'teal', 'Bảo hiểm': 'emerald', 'Sim': 'lime',
    'Máy lọc nước': 'indigo', 'Vieon': 'fuchsia', 'Khác': 'slate',
};

export interface IndustryTone {
    /** Nền ô icon. */
    bg: string;
    /** Màu icon. */
    text: string;
    /** Vạch màu mép trái ô (modal). */
    border: string;
    /** Màu con số doanh thu (modal). */
    value: string;
}

export const INDUSTRY_TONE: Readonly<Record<IndustryColorKey, IndustryTone>> = {
    // Tầng ĐẬM
    blue:    { bg: 'bg-sky-50',      text: 'text-sky-700',     border: 'border-sky-500',     value: 'text-sky-700' },
    sky:     { bg: 'bg-sky-50',      text: 'text-sky-700',     border: 'border-sky-500',     value: 'text-sky-700' },
    indigo:  { bg: 'bg-sky-50',      text: 'text-sky-700',     border: 'border-sky-500',     value: 'text-sky-700' },
    cyan:    { bg: 'bg-sky-100',     text: 'text-sky-700',     border: 'border-sky-500',     value: 'text-sky-700' },
    violet:  { bg: 'bg-sky-100',     text: 'text-sky-700',     border: 'border-sky-500',     value: 'text-sky-700' },
    emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-500', value: 'text-emerald-700' },
    teal:    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-500', value: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-500',   value: 'text-amber-700' },
    orange:  { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-500',   value: 'text-amber-700' },
    rose:    { bg: 'bg-rose-50',     text: 'text-rose-700',    border: 'border-rose-500',    value: 'text-rose-700' },
    pink:    { bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-500',    value: 'text-rose-700' },
    // Tầng NHẠT
    lime:    { bg: 'bg-emerald-50',  text: 'text-emerald-500', border: 'border-emerald-300', value: 'text-emerald-600' },
    fuchsia: { bg: 'bg-rose-50',     text: 'text-rose-500',    border: 'border-rose-300',    value: 'text-rose-600' },
    slate:   { bg: 'bg-slate-100',   text: 'text-slate-500',   border: 'border-slate-300',   value: 'text-slate-600' },
};

/** Tông màu theo KHOÁ (vd 'cyan'); khoá lạ → slate. */
export function industryToneByKey(key: string | undefined | null): IndustryTone {
    return (key && (INDUSTRY_TONE as Record<string, IndustryTone>)[key]) || INDUSTRY_TONE.slate;
}

/** Tông màu theo TÊN NGÀNH (vd 'Tablet'); ngành lạ → slate. */
export function industryToneByName(name: string | undefined | null): IndustryTone {
    return INDUSTRY_TONE[(name && INDUSTRY_COLOR_KEY[name]) || 'slate'];
}
