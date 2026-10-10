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
    'xuất đổi bảo hành sản phẩm trả góp có imei', 'xuất bán trả góp cho nv phục vụ công việc',
    'xuất bán pre-order trả góp tại siêu thị', 'xuất trả góp online only giá rẻ',
    'xuất bán pre-order trả góp online', 'xuất bán trả góp online tạo tại siêu thị',
    'xuất bán pre-order trả góp tại siêu thị (tcđm)', 'xuất online only giá rẻ',
    'xuất bán online tạo tại siêu thị'
];

/**
 * Tự động phân loại và chuẩn hóa hình thức xuất (HTX):
 * Khắc phục lỗi khi các hình thức xuất bán hàng thực tế (tiền mặt / trả góp) của MWG/ĐMX
 * bị xếp nhầm vào nonRevenueEligibleHTX.
 */
export function autoNormalizeAndClassifyHTX(config: ProductConfig): void {
    if (!config.revenueEligibleHTX) config.revenueEligibleHTX = new Set<string>();
    if (!config.nonRevenueEligibleHTX) config.nonRevenueEligibleHTX = new Set<string>();
    if (!config.htxClassification) config.htxClassification = {};

    const clean = (s: string) => (s || '').toString().trim().toLowerCase().normalize('NFC');

    // 1. Nếu hoàn toàn không có revenueEligibleHTX thì bù danh sách mặc định
    if (config.revenueEligibleHTX.size === 0) {
        DEFAULT_REVENUE_ELIGIBLE_HTX.forEach(h => {
            config.revenueEligibleHTX!.add(clean(h));
        });
    }

    // 2. Tự động khắc phục lỗi phân loại nhầm:
    // Nếu trong nonRevenueEligibleHTX có các hình thức xuất bán hàng thực tế của MWG (xuất bán hàng tại siêu thị, xuất bán trả góp...)
    // thì chuyển ngay sang revenueEligibleHTX
    const toMoveToRevenue: string[] = [];
    config.nonRevenueEligibleHTX.forEach(rawHtx => {
        const norm = clean(rawHtx);
        const isThuHo = norm.includes('thu hộ') || norm.includes('thu ho');
        const isKmHoacKhac = norm.includes('khuyến mãi') || norm.includes('miễn phí') || norm.includes('tiêu dùng nội bộ') || norm.includes('cho mượn') || norm.includes('trả hàng') || norm.includes('điều chỉnh') || norm.includes('đổi code') || norm.includes('tiêu hao');
        const isBanHang = norm.includes('xuất bán') || norm.includes('bán hàng') || norm.includes('bán online') || norm.includes('bán lẻ') || norm.includes('bán trả góp') || norm.includes('trả góp online') || norm.includes('pre-order');

        if (isBanHang && !isThuHo && !isKmHoacKhac) {
            toMoveToRevenue.push(rawHtx);
        }
    });

    if (toMoveToRevenue.length > 0) {
        toMoveToRevenue.forEach(h => {
            config.nonRevenueEligibleHTX!.delete(h);
            config.nonRevenueEligibleHTX!.delete(clean(h));
            config.revenueEligibleHTX!.add(clean(h));
            config.revenueEligibleHTX!.add(h);
            if (clean(h).includes('trả góp') || clean(h).includes('tra gop')) {
                config.htxClassification![clean(h)] = 'tra_gop';
            } else {
                config.htxClassification![clean(h)] = 'tien_mat';
            }
        });
    }
}

/** Runtime → dạng lưu Cloud: mọi Set thành mảng. Không đụng tới object gốc. */
export const toCloudProductConfig = <T extends object>(config: T): T => {
    const c = config as Record<string, unknown>;
    autoNormalizeAndClassifyHTX(c as unknown as ProductConfig);
    const out: Record<string, unknown> = { ...c };
    if (c.groups && typeof c.groups === 'object') {
        out.groups = Object.fromEntries(Object.entries(c.groups as Record<string, unknown>).map(([k, v]) => [k, thanhMang(v)]));
    }
    for (const f of SET_FIELDS) {
        if (c[f] !== undefined && c[f] !== null) out[f] = thanhMang(c[f]);
    }
    return out as T;
};

/** Dạng lưu Cloud → runtime: mảng thành Set. Tự động bù và chuẩn hóa HTX. */
export const fromCloudProductConfig = (config: unknown): ProductConfig => {
    const c = { ...(config as Record<string, unknown>) };
    if (c.groups && typeof c.groups === 'object') {
        c.groups = Object.fromEntries(Object.entries(c.groups as Record<string, unknown>).map(([k, v]) => [k, new Set(thanhMang(v))]));
    }
    for (const f of SET_FIELDS) {
        if (c[f] !== undefined && c[f] !== null) c[f] = new Set(thanhMang(c[f]));
    }
    const pc = c as unknown as ProductConfig;
    autoNormalizeAndClassifyHTX(pc);
    return pc;
};

/**
 * Cấu hình có dùng được để TÍNH SỐ không. Chỉ cần có nhóm hàng (groups).
 */
export const isProductConfigComplete = (config: ProductConfig | null | undefined): boolean => {
    if (!config || !config.groups || Object.keys(config.groups).length === 0) return false;
    return true;
};
