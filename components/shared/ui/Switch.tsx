import React from 'react';
import { cn } from './utils';
import { Button } from './Button';

/**
 * CÔNG TẮC dùng chung kiểu iOS (KE_HOACH_GIAO_DIEN_APPLE.md mục 3.7 — GĐ3, 2026-10-11).
 *
 * Thay cho ≥ 15 công tắc tự vẽ mỗi nơi một cỡ, một màu (xanh / xanh lá / đỏ / cam — lỗi #16 trong video). Một kiểu duy nhất:
 * bật = xanh lá `emerald-500` (đúng quy ước iOS), tắt = `slate-300`, núm trắng có bóng, chuyển động 200 ms.
 *  - `md` 44 × 26 (mặc định — danh sách cài đặt, iPhone) · `sm` 36 × 20 (thanh công cụ / bảng dày trên laptop).
 *  - Vùng chạm ≥ 44 × 44 trên màn cảm ứng nhờ lớp `::after` vô hình (styles.css `.ycx-switch`) — không đổi bố cục.
 *  - Là `<button role="switch" aria-checked>`: Space/Enter bật tắt, trình đọc màn hình đọc đúng "công tắc, bật/tắt".
 *  - Đặt cạnh nhãn: `<label htmlFor={id}>` hoặc `aria-labelledby`; không có nhãn nhìn thấy thì truyền `label`.
 */
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Tên đọc cho trình đọc màn hình khi không có nhãn nhìn thấy. */
  label?: string;
  size?: 'md' | 'sm';
  disabled?: boolean;
  id?: string;
  className?: string;
  title?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'data-testid'?: string;
  /** -1 khi công tắc chỉ để NHÌN và cả hàng chứa nó mới là nút bấm (không để Tab dừng 2 lần trên cùng một việc). */
  tabIndex?: number;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onChange, label, size = 'md', disabled, id, className, title, ...rest },
  ref,
) {
  const md = size === 'md';
  return (
    <Button
      ref={ref}
      id={id}
      type="button"
      variant="unstyled"
      size="none"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      data-state={checked ? 'on' : 'off'}
      className={cn(
        'ycx-switch relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer',
        md ? 'h-[26px] w-11' : 'h-5 w-9',
        checked ? 'bg-emerald-500' : 'bg-slate-300',
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cn(
          'block rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.28)] transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
          md ? 'h-[22px] w-[22px]' : 'h-4 w-4',
          checked ? (md ? 'translate-x-[18px]' : 'translate-x-4') : 'translate-x-0',
        )}
      />
    </Button>
  );
});

Switch.displayName = 'Switch';
export default Switch;
