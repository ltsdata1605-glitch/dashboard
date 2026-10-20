import React, { forwardRef } from 'react';
import { cn } from './utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Chữ cạnh ô tick — bấm vào chữ cũng tick. Không có chữ thì PHẢI truyền `aria-label`. */
  label?: React.ReactNode;
  /** Lớp cho khung <label> bọc ngoài (vùng bấm) — vd chip có viền. */
  wrapperClassName?: string;
  /** Lớp cho phần chữ. */
  labelClassName?: string;
}

/**
 * Ô tick dùng chung (GĐ10 2026-10-20): ô 16px, màu sky (`accent`), bo nhẹ. LUÔN bọc trong <label> có `ycx-hit` → bấm chữ cũng
 * tick và vùng chạm 44×44 trên điện thoại mà không đổi cỡ nhìn thấy (`::after` không gắn được lên chính <input>). Trước đây 25 chỗ
 * tự vẽ ô tick, mỗi nơi một cỡ/màu/bo. Bật/tắt một tuỳ chọn dạng công tắc thì dùng `Switch`, không dùng ô tick.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, wrapperClassName, labelClassName, disabled, ...props }, ref) => (
    <label
      data-ui="shared"
      className={cn(
        'ycx-hit inline-flex items-center gap-2 select-none',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        wrapperClassName
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        disabled={disabled}
        className={cn('h-4 w-4 shrink-0 rounded-sm border-slate-300 accent-sky-600', disabled ? 'cursor-not-allowed' : 'cursor-pointer', className)}
        {...props}
      />
      {label !== undefined && label !== null && label !== false && (
        <span className={cn('text-sm text-slate-700', labelClassName)}>{label}</span>
      )}
    </label>
  )
);

Checkbox.displayName = 'Checkbox';
