import type { ProductConfig } from '../types';

/**
 * Đổi productConfig qua lại giữa dạng runtime (có `Set`) và dạng lưu Firestore (chỉ mảng/đối tượng).
 *
 * VÌ SAO CÓ FILE NÀY (2026-09-28, đo trên dữ liệu thật Kho 910): Firestore không lưu được `Set` — nó
 * thành `{}` rỗng. Code cũ chỉ tự đổi riêng `groups` ở 4 chỗ khác nhau, bỏ sót `revenueEligibleHTX`
 * (835 mục) và `nonRevenueEligibleHTX` (1062 mục). Máy mới lấy bản Cloud để khỏi tải cả workbook →
 * bộ lọc hình thức xuất rỗng → DTQĐ 788 thay vì 772, đơn quá hạn 21 thay vì 15, cho tới khi lượt
 * kiểm tra Google Sheet ngầm tải lại (~12 giây; mạng tới Sheet lỗi thì số sai nằm luôn).
 * Mọi đường ghi/đọc productConfig lên/xuống Cloud PHẢI đi qua 2 hàm dưới đây.
 */

/** Các trường kiểu `Set<string>` ở cấp gốc của ProductConfig (ngoài `groups` là map các Set). */
const SET_FIELDS = ['revenueEligibleHTX', 'nonRevenueEligibleHTX'] as const;

const thanhMang = (v: unknown): string[] =>
    v instanceof Set ? Array.from(v as Set<string>) : Array.isArray(v) ? (v as string[]) : [];

/** Runtime → dạng lưu Cloud: mọi Set thành mảng. Không đụng tới object gốc. */
export const toCloudProductConfig = <T extends object>(config: T): T => {
    const c = config as Record<string, unknown>;
    const out: Record<string, unknown> = { ...c };
    if (c.groups && typeof c.groups === 'object') {
        out.groups = Object.fromEntries(Object.entries(c.groups as Record<string, unknown>).map(([k, v]) => [k, thanhMang(v)]));
    }
    for (const f of SET_FIELDS) {
        if (c[f] !== undefined && c[f] !== null) out[f] = thanhMang(c[f]);
    }
    return out as T;
};

/** Dạng lưu Cloud → runtime: mảng thành Set. Bản Cloud cũ đã hỏng (`{}`) thành Set RỖNG. */
export const fromCloudProductConfig = (config: unknown): ProductConfig => {
    const c = { ...(config as Record<string, unknown>) };
    if (c.groups && typeof c.groups === 'object') {
        c.groups = Object.fromEntries(Object.entries(c.groups as Record<string, unknown>).map(([k, v]) => [k, new Set(thanhMang(v))]));
    }
    for (const f of SET_FIELDS) {
        if (c[f] !== undefined && c[f] !== null) c[f] = new Set(thanhMang(c[f]));
    }
    return c as unknown as ProductConfig;
};

/**
 * Cấu hình có dùng được để TÍNH SỐ không. Sheet luôn sinh ra 2 tập hình thức xuất; cả hai rỗng nghĩa
 * là bản đã hỏng khi qua Cloud (xem đầu file) — dùng nó là ra số sai, phải tải lại từ Sheet.
 */
export const isProductConfigComplete = (config: ProductConfig | null | undefined): boolean => {
    if (!config || !config.groups || Object.keys(config.groups).length === 0) return false;
    const soMuc = (s?: Set<string>) => (s instanceof Set ? s.size : 0);
    return soMuc(config.revenueEligibleHTX) + soMuc(config.nonRevenueEligibleHTX) > 0;
};
