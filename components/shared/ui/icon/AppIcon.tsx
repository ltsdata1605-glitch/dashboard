import React from 'react';
import { cn } from '../utils';
import { ICON_REGISTRY, FILLED_BRAND_ICONS, type IconName } from './iconRegistry';
import { ICON_SIZES, ICON_STROKE_WIDTH, type IconSize } from './iconTokens';

export interface AppIconProps {
  /** Tên CHỨC NĂNG trong `iconRegistry.ts` — không phải tên hình. */
  name: IconName;
  /** Token size (mặc định `md`). Tự đổi laptop ↔ mobile ở mốc `lg` (1024px) — xem `iconTokens.ts`. */
  size?: IconSize;
  /**
   * NGOẠI LỆ: size px cố định, không đổi theo màn hình. Bắt buộc ghi chú lý do ngay tại chỗ gọi
   * (vd icon nằm trong ảnh xuất cố định khổ). Có `px` thì `size` bị bỏ qua.
   */
  px?: number;
  /** Xoay liên tục — dùng cho `loading`. */
  spin?: boolean;
  /** Có nhãn → icon mang nghĩa riêng (role="img"); không nhãn → trang trí, ẩn khỏi trình đọc màn hình. */
  label?: string;
  /** Chỉ dùng cho MÀU (`text-*`) và hiệu ứng; KHÔNG truyền `w-*`/`h-*` để đặt size — dùng `size`. */
  className?: string;
}

/**
 * Icon dùng chung của toàn dự án (chuẩn hoá icon Giai đoạn 0, 2026-10-02).
 *
 * Size đổi theo màn hình bằng CSS (lớp `.ycx-icon` trong `styles.css` + 2 biến px truyền qua
 * `style`), KHÔNG bằng hook JS đọc kích thước cửa sổ: không render lại khi xoay máy, không nháy
 * size ở lần vẽ đầu, và ảnh xuất (html-to-image chép computed style) giữ đúng size đang hiển thị.
 *
 * `shrink-0` có sẵn trong `.ycx-icon` → icon không bị bóp méo khi nằm trong flex chật.
 */
export const AppIcon: React.FC<AppIconProps> = ({ name, size = 'md', px, spin = false, label, className }) => {
  const Component = ICON_REGISTRY[name] || ICON_REGISTRY.alert;
  if (!Component) return null;
  const tokens = ICON_SIZES[size];
  const mobile = px ?? tokens.mobile;
  const laptop = px ?? tokens.laptop;
  const style = { '--ycx-icon-m': `${mobile}px`, '--ycx-icon-d': `${laptop}px` } as React.CSSProperties;

  return (
    <Component
      className={cn('ycx-icon', spin && 'animate-spin', className)}
      style={style}
      data-icon={name}
      {...(FILLED_BRAND_ICONS.has(name) ? {} : { strokeWidth: ICON_STROKE_WIDTH })}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    />
  );
};
