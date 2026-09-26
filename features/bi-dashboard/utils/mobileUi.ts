/**
 * THANG KÍCH THƯỚC CHO REPORT BI TRÊN ĐIỆN THOẠI (chủ dự án yêu cầu 2026-09-26:
 * "tối ưu giao diện mobile trên iPhone", "tiêu đề / icon / nút — fix size lại cho phù hợp mobile").
 *
 * Đo thật trên iPhone 15 (393x852) và iPhone SE (375x667) trước khi sửa — hai máy ra KẾT QUẢ GIỐNG
 * HỆT nên đây là vấn đề hệ thống, không phải do màn hình nào:
 *   - icon: **7 cỡ khác nhau** trong cùng một màn (8, 12, 14, 16, 18, 20, 22px)
 *   - nút:  **7 chiều cao khác nhau** (14, 24, 30, 32, 40, 42, 56px)
 *   - **20 nút nhỏ hơn 44x44px** — trong đó có CẢ 3 nút điều hướng chính của Report BI
 *     (Siêu thị / Nhân viên / Cập nhật) chỉ 28x24px
 *   - **71 chỗ chữ dưới 11px**, nhỏ nhất là 8px
 *
 * Dùng các hằng dưới đây thay vì tự đặt cỡ, để các khu vực không lệch nhau nữa.
 */

/**
 * Vùng chạm tối thiểu 44x44px — mức tối thiểu trong Human Interface Guidelines của Apple.
 * CHỈ ép trên điện thoại: desktop dùng chuột nên nút nhỏ vẫn bấm chính xác, ép 44px ở đó chỉ làm
 * thanh công cụ phình ra và chiếm chỗ của số liệu (CLAUDE.md mục 2: "mỗi pixel dành cho số").
 */
export const TOUCH_TARGET = 'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0';

/**
 * Lề ngang cho CHỮ và NÚT trên điện thoại.
 * Khung `<main>` của Report BI cố ý để `p-0` ở mobile để BẢNG dùng hết bề ngang (BiWrapper.tsx) —
 * nhưng tiêu đề và thanh công cụ ăn theo `p-0` đó thì chữ dính sát mép máy, trên iPhone trông như
 * bị cắt. Hàng nào là chữ/nút (không phải bảng) thì thêm lề này.
 */
export const MOBILE_GUTTER = 'px-3 sm:px-0';

/** Thang icon — CHỈ 3 cỡ. sm dùng trong bảng/chú thích, md là mặc định, lg cho nút chính. */
export const ICON_SIZE = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
} as const;

/** Chiều cao nút — CHỈ 3 nấc, mobile luôn ≥44px để chạm được. */
export const BUTTON_HEIGHT = {
    sm: 'h-11 sm:h-8',
    md: 'h-11 sm:h-9',
    lg: 'h-12 sm:h-11',
} as const;

/**
 * Cỡ chữ nhỏ nhất của dự án là 11px (CLAUDE.md mục 2 — "màn hình siêu thị thường là laptop cũ,
 * độ phân giải thấp"). Trên iPhone cầm tay thì 9-10px lại càng khó đọc.
 */
export const TEXT_MIN = 'text-[11px]';
