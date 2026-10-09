import React from 'react';
import { motion } from 'motion/react';
import { cn } from './utils';

/**
 * LỚP PHỦ TOÀN MÀN HÌNH dùng chung (GĐ4 — chuẩn hoá `fixed inset-0`, 2026-10-09).
 *
 * Hộp thoại có tiêu đề/nút đóng → dùng `<Modal>`. `<Overlay>` dành cho phần KHÔNG phải hộp thoại:
 *  - `busy`       màn chờ chặn thao tác (đang xuất ảnh, đang xử lý…): `role="status"` + `aria-busy` để trình đọc màn hình báo.
 *  - `scrim`      lớp nền bắt click-ra-ngoài (đóng popover/menu): ẩn khỏi trình đọc màn hình, KHÔNG chứa nội dung.
 *  - `fullscreen` khung phủ kín màn hình có nội dung riêng (chế độ xem toàn màn hình, ngăn kéo): không thêm ngữ nghĩa.
 * Màu nền, z-index, căn giữa… do nơi dùng truyền qua `className` (giữ nguyên giao diện từng chỗ); thang z-index
 * hiện có: modal `z-50`, sheet/ngăn kéo `z-[150]`, màn chờ `z-[1000]`+ — xem DESIGN_SYSTEM.md.
 */
export type OverlayKind = 'busy' | 'scrim' | 'fullscreen';

export interface OverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  kind: OverlayKind;
}

export const Overlay = React.forwardRef<HTMLDivElement, OverlayProps>(function Overlay({ kind, className, children, ...rest }, ref) {
  const semantics: React.HTMLAttributes<HTMLDivElement> =
    kind === 'busy' ? { role: 'status', 'aria-live': 'polite', 'aria-busy': true }
    : kind === 'scrim' ? { 'aria-hidden': true }
    : {};
  return (
    <div ref={ref} {...semantics} {...rest} data-overlay={kind} className={cn('fixed inset-0', className)}>
      {children}
    </div>
  );
});

/** Bản có hoạt ảnh (initial/animate/exit của motion) — dùng cho lớp nền mờ dần của sheet/menu. */
export const MotionOverlay = motion.create(Overlay);

/**
 * Dùng khi cùng một phần tử LÚC THÌ nằm trong luồng, LÚC THÌ phủ kín màn hình (nút "Toàn màn hình" của bảng):
 * không thể đổi thẻ nên chỉ nối class này vào className. Ngoài trường hợp bật/tắt đó, dùng `<Overlay>`.
 */
export const FULLSCREEN_LAYER_CLASS = 'fixed inset-0';
