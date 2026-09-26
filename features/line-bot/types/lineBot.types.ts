/**
 * Phân hệ BOT LINE Quản lý PMH & Tự động hoá
 * Types & Interfaces định nghĩa chặt chẽ
 */

export type CouponStatus = 'UNUSED' | 'SENT' | 'REVOKED';

export interface Coupon {
    id: string;
    code: string;
    type: string; // ví dụ: "Giờ Vàng Giá Sốc", "Event Cuối Tuần", "Event Lớn", "GIẢM 50K"
    productName?: string; // Tên sản phẩm (ví dụ: "Tủ lạnh Panasonic NR-DZ601VGKV")
    syntax?: string; // Cú pháp đăng ký PMH
    status: CouponStatus;
    orderId?: string; // Mã đơn hàng (MĐH)
    warehouse?: string; // Mã kho (ví dụ: "910", "3717")
    recipient?: string; // Tên nhân viên / Quản lý nhận
    recipientId?: string; // LINE User ID
    createdAt: string;
    updatedAt: string;
    revokedAt?: string;
    revokeReason?: string;
    expiryDate?: string; // Định dạng "YYYY-MM-DD" (hết hạn khi bước sang 00:00 ngày hôm sau)
    importBatchId?: string; // Mã định danh đợt nạp
    copiedAt?: string; // Thời gian người dùng bấm copy mã
}

export interface CouponImportBatch {
    batchId: string;
    importedAt: string;
    total: number;
    unused: number;
    sent: number;
    revoked: number;
    productNames: string[];
    types: string[];
    sampleCodes: string[];
    expiryDate?: string;
    couponIds: string[];
}

export interface ParsedImportItem {
    code: string;
    type: string;
    productName?: string;
    syntax?: string;
    expiryDate?: string; // Định dạng "YYYY-MM-DD"
}

export interface ExpiredProductRecord {
    id: string;
    productName: string;
    syntax?: string;
    type?: string;
    expiryDate: string; // "YYYY-MM-DD"
    expiredAt: string;
    count: number;
}

export type KeywordMatchType = 'EXACT' | 'CONTAINS';

export interface KeywordReply {
    id: string;
    keyword: string;
    matchType: KeywordMatchType;
    replyText: string;
    imageUrls: string[];
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export type ScheduleTargetType = 'ALL_GROUPS' | 'SPECIFIC_GROUPS';
export type ScheduleRepeatType = 'DAILY' | 'CUSTOM' | 'WEEKDAYS' | 'ONCE';

export interface BotSchedule {
    id: string;
    name: string;
    time: string; // Định dạng "HH:mm" (ví dụ: "06:00", "15:00")
    repeatType?: ScheduleRepeatType; // Chu kỳ lặp: 'DAILY' | 'CUSTOM' | 'WEEKDAYS' | 'ONCE'
    daysOfWeek: number[]; // 0: Chủ Nhật, 1: Thứ 2, ..., 6: Thứ 7
    specificDate?: string; // Định dạng "YYYY-MM-DD" nếu chọn 'ONCE'
    targetType: ScheduleTargetType;
    targetGroupIds: string[]; // Danh sách Group ID được chọn
    messageTemplate: string; // Nội dung hỗ trợ biến {ton_kho}, {date}, {bot_name}
    active: boolean;
    lastRunAt?: string;
    createdAt: string;
    updatedAt: string;
}

export type AdminRole = 'SUPER_ADMIN' | 'APPROVER' | 'VIEWER';

export interface LineAdmin {
    id: string;
    name: string;
    lineUserId: string; // Dạng "U..." (33 ký tự)
    role: AdminRole;
    phone?: string;
    note?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LineGroup {
    id: string;
    groupId: string; // Dạng "C..." (33 ký tự)
    groupName: string;
    pictureUrl?: string;
    memberCount?: number;
    active: boolean;
    joinedAt: string;
    lastActiveAt: string;
}

export interface CouponRequest {
    id: string;
    warehouse: string;
    orderId: string;
    couponType: string;
    requesterName: string;
    requesterId: string; // LINE User ID
    groupId?: string;
    groupName?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'OUT_OF_STOCK';
    couponCode?: string;
    adminApprover?: string;
    createdAt: string;
    updatedAt: string;
}

export interface LineBotConfig {
    userId: string; // UID của Quản lý sở hữu
    channelAccessToken: string;
    channelSecret: string;
    botName?: string;
    botBasicId?: string; // Ví dụ "@123xyz"
    pictureUrl?: string;
    webhookUrl?: string;
    active: boolean;
    autoApprove: boolean; // Tự động duyệt cấp mã khi đúng cú pháp
    approvalCommand: string; // Lệnh duyệt (mặc định: "DUYỆT")
    lowStockThresholds: {
        warning: number; // Mặc định 30
        high: number;    // Mặc định 20
        critical: number; // Mặc định 10
    };
    syntaxTemplate: string; // Mẫu cú pháp chuẩn
    filterUserNames?: string[]; // Danh sách tên người để lọc PMH (ví dụ: ["Lê Trường Sơn", "Sơn"])
    liffId?: string; // LINE LIFF ID để 1-chạm vừa copy vừa gửi tin nhắn xác nhận
    scheduledGroupId?: string; // ID nhóm LINE nhận thông báo định kỳ (6h00 & 22h00)
    scheduledNotifications?: {
        morningReport?: boolean; // Bật thông báo 6h00 sáng (chỉ gửi khi còn tồn coupon)
        eveningReport?: boolean; // Bật tổng kết 22h00 tối (tổng số phiếu & danh sách người dùng)
    };
    departmentId?: string; // Mã kho liên kết (ví dụ "910", "21453")
    ownerEmail?: string; // Email tài khoản Google người tạo bot
    ownerName?: string; // Tên hiển thị người tạo bot
    isWarehouseShared?: boolean; // Cho phép các tài khoản cùng mã kho kế thừa và dùng chung (mặc định: true)
    createdAt: string;
    updatedAt: string;
}

export interface WarehouseBotSummary {
    id: string; // botId (UID tài khoản tạo bot)
    botName?: string;
    botBasicId?: string;
    pictureUrl?: string;
    departmentId: string;
    ownerEmail?: string;
    ownerName?: string;
    active: boolean;
    autoApprove?: boolean;
    updatedAt: string;
}

export interface FilteredCouponRecord {
    id: string;
    code: string;
    productName: string;
    categoryLabel?: string;
    recipient: string;
    orderId?: string;
    cardIndex: number;
    status: 'UNUSED' | 'USED';
    filteredAt: string;
    usedBy?: string;
    usedAt?: string;
}

export interface PmhFilterResult {
    totalBlocks: number;
    matchedBlocks: string[];
    matchedCodes: Array<{
        recipient: string;
        typeOrProduct: string;
        code: string;
        orderId?: string;
        rawBlock: string;
        revokedCode?: string;
        isReissue?: boolean;
        compactBlock?: string;
    }>;
    summaryMessage: string;
    flexMessages?: any[];
}

export interface ParsedCouponForm {
    isValid: boolean;
    warehouse?: string;
    orderId?: string;
    couponType?: string;
    managerName?: string;
    rawText: string;
    errorMessage?: string;
}

/**
 * Cấu hình tính năng cho mỗi Nhóm LINE (admin có thể tắt/bật tính năng riêng theo nhóm)
 */
export interface GroupFeatureConfig {
    id: string;
    userId: string; // UID quản lý sở hữu
    groupId: string; // LINE Group ID (dạng "C...")
    groupName?: string; // Tên nhóm (cached từ LineGroup)
    // Phải khớp GroupFeatures ở functions/src/groupFeatureHelper.ts (webhook đọc đúng các khoá này).
    features: {
        filterCoupon: boolean; // Lọc PMH khi chuyển tiếp danh sách + lệnh "loc csd"
        issueCoupon: boolean;  // Cấp mã PMH: form xin PMH, lệnh e{n}/gv{n}, số trần
        syntax_tk: boolean;    // Lệnh "tk" / "tk event" / "tk gvgs" (thống kê tồn kho)
        syntax_cancel: boolean; // Lệnh "huy [mã]" (huỷ/thu hồi mã)
        syntax_search: boolean; // Tra cứu mã: dán 1 mã coupon vào chat
        keywordReply: boolean; // Tự động trả lời theo keyword
        autoReply: boolean;    // Tin nhắn tự động khác (hướng dẫn "hd"…)
    };
    createdAt: string;
    updatedAt: string;
}

export interface StockSummaryItem {
    type: string;
    total: number;
    unused: number;
    sent: number;
    revoked: number;
}

export interface InteractedUser {
    id: string; // LINE User ID
    lineUserId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
    lastInteractionType?: 'GROUP' | 'DIRECT';
    lastGroupId?: string;
    lastGroupName?: string;
    lastMessage?: string;
    lastInteractedAt: string;
}
