/**
 * Kiểu dữ liệu của khu vực "Báo cáo khai thác" (features/khai-thac).
 *
 * Mô hình giữ đúng nghiệp vụ của app gốc (Bao-Cao-Khai-Thac): mỗi lần bấm "Báo cáo" là MỘT ĐƠN
 * HÀNG (một ngày có nhiều đơn), dữ liệu lưu cục bộ trong IndexedDB của trình duyệt.
 */

export type ItemGroup = 'products' | 'household' | 'services' | 'insurance' | 'accessories';

/** Thứ tự hiển thị trên form. Nhóm "Bảo hiểm" (thêm 2026-09-21) nằm ngay dưới Dịch vụ bổ sung. */
export const ITEM_GROUPS: ItemGroup[] = ['products', 'household', 'services', 'insurance', 'accessories'];

/** Mục tuỳ chỉnh do người dùng thêm vào một nhóm — đếm số lượng hoặc nhập tiền (Tr). */
export interface CustomField {
    id: string;
    name: string;
    group: ItemGroup;
    type: 'count' | 'revenue';
}

export interface OtherItem {
    name: string;
    count: number;
}

/** Bản nháp đang nhập (tự lưu mỗi lần gõ) — cũng là nội dung của một đơn hàng. */
export interface ReportDraft {
    staffName: string;
    /** Tổng doanh thu đơn hàng, đơn vị triệu đồng, giữ dạng chuỗi để ô nhập không bị ép số. */
    revenueTotal: string;
    /** Phần trả chậm (kèm ví) trong tổng doanh thu, triệu đồng. */
    installment: string;
    moVi: boolean;
    priceWar: boolean;
    /** Số lượng theo nhóm → theo khoá mục (mục chuẩn trong catalog hoặc id mục tuỳ chỉnh dạng đếm). */
    counts: Record<ItemGroup, Record<string, number>>;
    /** Các ô tiền (Tr): `vi`, `bhDmx`, `bhKhac` (xem AMOUNT_ITEMS) và id mục tuỳ chỉnh dạng tiền.
     *  Khoá `insurance` (BHMR cũ, trước 2026-09-21) được di trú sang `bhDmx` khi nạp — xem migrateAmounts(). */
    amounts: Record<string, string>;
    others: Record<ItemGroup, OtherItem>;
    notes: string;
}

export interface SavedReport extends ReportDraft {
    id: string;
    /** YYYY-MM-DD theo giờ máy. */
    date: string;
    /** ISO — lúc bấm Báo cáo. */
    savedAt: string;
}

export const LEAD_STATUSES = ['Chưa liên hệ', 'Đã liên hệ', 'Đã chốt', 'Tham khảo', 'Từ chối'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
    id: string;
    name: string;
    phone: string;
    product: string;
    status: LeadStatus;
    statusDetails: string;
    notes: string;
    createdAt: number;
    updatedAt: number;
}

export type DashboardRange = 'today' | 'week' | 'month';
