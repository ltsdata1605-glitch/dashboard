/**
 * THANG SIZE ICON — nguồn chân lý DUY NHẤT (chuẩn hoá icon Giai đoạn 0, 2026-10-02).
 *
 * Chủ dự án chốt: dùng thang "đã chỉnh theo design system" (nút 16/18px) thay vì thang chung
 * 18/20px — vì chuẩn "Bảng điều khiển ca trực" (dòng bảng 26px, mỗi pixel dành cho số) sẽ phình
 * thanh công cụ nếu icon to thêm 2 nấc. Mobile luôn to hơn laptop một nấc để dễ nhìn/dễ bấm.
 *
 * Mốc chuyển laptop/mobile = `lg` của Tailwind (1024px) — trùng mốc toolbar desktop/mobile
 * (`lg:hidden`) đang dùng khắp dự án. iPad dọc (768–1023px) nhận size MOBILE (chủ dự án đồng ý).
 *
 * Px KHÔNG được viết lại ở nơi khác: `AppIcon` đẩy 2 giá trị này xuống CSS qua biến
 * `--ycx-icon-m` / `--ycx-icon-d`, `styles.css` (lớp `.ycx-icon`) chỉ chọn biến theo media query.
 * Đổi một con số ở đây là đổi toàn dự án.
 */
export const ICON_SIZES = {
  /** Trong badge, chữ phụ, link ngoài cạnh chữ nhỏ. */
  xs: { laptop: 12, mobile: 14 },
  /** Trong dòng bảng (26px), ô input/tìm kiếm/bộ lọc, nút trong dòng dữ liệu. */
  sm: { laptop: 14, mobile: 16 },
  /** MẶC ĐỊNH — nút thường, nút chỉ có icon (cỡ icon máy ảnh "CHUẨN" ở Report BI). */
  md: { laptop: 16, mobile: 18 },
  /** Thanh điều hướng trái/dưới, tab, menu. */
  lg: { laptop: 20, mobile: 22 },
  /** Hành động chính, header modal lớn. */
  xl: { laptop: 24, mobile: 24 },
  /** Empty state, trạng thái lớn — KHÔNG dùng trong nút. */
  state: { laptop: 32, mobile: 32 },
  /** Landing page, minh hoạ. */
  hero: { laptop: 48, mobile: 40 },
} as const;

export type IconSize = keyof typeof ICON_SIZES;

/** Độ dày nét thống nhất toàn dự án (mặc định của lucide). Trạng thái "đang chọn" phân biệt bằng màu, không bằng nét. */
export const ICON_STROKE_WIDTH = 2;

/** Khoảng cách icon ↔ chữ trong nút/nhãn: 6px (`gap-1.5`). */
export const ICON_TEXT_GAP_CLASS = 'gap-1.5';
