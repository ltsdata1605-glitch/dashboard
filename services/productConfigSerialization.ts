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

/** Các hình thức xuất mặc định tính doanh thu khi cấu hình từ Cloud chưa khai báo HTX */
export const DEFAULT_REVENUE_ELIGIBLE_HTX = [
    'bán lẻ', 'xuất bán lẻ', 'bán hàng', 'bán sỉ', 'bán trả góp', 'doanh thu',
    'bán online', 'xuất bán online', 'giao hàng thu tiền', 'bán mang về',
    'xuất bán hàng online tại siêu thị', 'xuất bán hàng online tiết kiệm', 'xuất bán hàng tại siêu thị',
    'xuất bán hàng tại siêu thị (tcđm)', 'xuất bán online giá rẻ', 'xuất bán pre-order tại siêu thị',
    'xuất bán ưu đãi cho nhân viên', 'xuất dịch vụ thu hộ bảo hiểm', 'xuất đổi bảo hành sản phẩm imei',
    'xuất đổi bảo hành tại siêu thị', 'xuất bán hàng trả góp online', 'xuất bán hàng trả góp online giá rẻ',
    'xuất bán hàng trả góp online tiết kiệm', 'xuất bán hàng trả góp tại siêu thị',
    'xuất bán hàng trả góp tại siêu thị (tcđm)', 'xuất bán trả góp ưu đãi cho nhân viên',
    'xuất đổi bảo hành sản phẩm trả góp có imei', 'xuất bán trả góp cho nv phục vụ công việc'
];

/** Dạng lưu Cloud → runtime: mảng thành Set. Tự động bù HTX mặc định nếu thiếu. */
export const fromCloudProductConfig = (config: unknown): ProductConfig => {
    const c = { ...(config as Record<string, unknown>) };
    if (c.groups && typeof c.groups === 'object') {
        c.groups = Object.fromEntries(Object.entries(c.groups as Record<string, unknown>).map(([k, v]) => [k, new Set(thanhMang(v))]));
    }
    for (const f of SET_FIELDS) {
        if (c[f] !== undefined && c[f] !== null) c[f] = new Set(thanhMang(c[f]));
    }
    // Bù tập HTX tính doanh thu mặc định nếu Cloud config không có (khi xoá bỏ Google Sheet)
    const revHtx = c.revenueEligibleHTX as Set<string> | undefined;
    if (!revHtx || revHtx.size === 0) {
        c.revenueEligibleHTX = new Set(DEFAULT_REVENUE_ELIGIBLE_HTX);
    }
    return c as unknown as ProductConfig;
};

/**
 * Cấu hình có dùng được để TÍNH SỐ không. Chỉ cần có nhóm hàng (groups).
 */
export const isProductConfigComplete = (config: ProductConfig | null | undefined): boolean => {
    if (!config || !config.groups || Object.keys(config.groups).length === 0) return false;
    return true;
};
