import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import type { KeyboardEvent } from 'react';

/**
 * tailwind-merge BIẾT 4 token bo góc của dự án (`rounded-control/card/popup/overlay`, styles.css `@theme inline`) là cỡ bo góc:
 * `cn('rounded-control', 'rounded-card')` → giữ lớp SAU như mọi lớp Tailwind khác. Trước đây (bản mặc định) token không được nhận
 * ra nên cả 2 lớp cùng ở lại và CSS thắng theo CHỮ CÁI (card < control < full < lg < … < popup) — đè bo góc của Input/Button qua
 * className phải thêm `!` (GĐ10 bước 4, 2026-10-21; test `components/shared/ui/cnBoGoc.test.ts`).
 */
const twMerge = extendTailwindMerge({ extend: { theme: { radius: ['control', 'card', 'popup', 'overlay'] } } });

/** Utility to merge tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * onKeyDown handler cho div/span đóng vai trò button (role="button") — kích hoạt bằng
 * Enter/Space giống hành vi <button> thật, dùng cho các phần tử clickable không thể đổi
 * sang <button>/<Button> vì lý do layout (VD: nằm trong <span>/<tr>/list row phức tạp).
 */
export function onActivateKey(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
}
