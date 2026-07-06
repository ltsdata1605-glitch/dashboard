import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { KeyboardEvent } from 'react';

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
