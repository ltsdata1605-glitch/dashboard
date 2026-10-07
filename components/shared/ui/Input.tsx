import React, { forwardRef, useId } from 'react';
import { cn } from './utils';
import { AppIcon } from './icon/AppIcon';
import type { IconName } from './icon/iconRegistry';
import { resolveIconName } from './icon/legacyIconNames';
import { Button } from './Button';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  /** Tên chức năng (iconRegistry) — tên kiểu cũ ('search', 'x'…) vẫn nhận qua lớp chuyển tiếp. */
  leftIcon?: IconName | string;
  rightIcon?: IconName | string;
  onRightIconClick?: () => void;
  onLeftIconClick?: () => void;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, onRightIconClick, onLeftIconClick, fullWidth = true, ...props }, ref) => {
    // Audit A17 (2026-09-30): dòng lỗi trước đây chỉ là <p> đứng cạnh — trình đọc màn hình không biết
    // ô nào đang lỗi. Nay nối lỗi vào ô qua aria-invalid + aria-describedby (giữ describedby sẵn có).
    const errorId = `${useId()}-error`;
    const describedBy = [props['aria-describedby'], error ? errorId : undefined].filter(Boolean).join(' ') || undefined;
    const left = resolveIconName(leftIcon) ?? (leftIcon ? 'help' : undefined);
    const right = resolveIconName(rightIcon) ?? (rightIcon ? 'help' : undefined);
    return (
      <div data-ui="shared" className={cn(fullWidth ? "w-full" : "w-auto")}>
        {/* Khối `relative` CHỈ bọc ô nhập (2026-10-06): trước đây bọc cả dòng báo lỗi bên dưới nên icon
            canh `top-1/2` theo cả khối → khi có lỗi, icon tụt xuống lệch khỏi ô nhập. */}
        <div className="relative">
        {left && (onLeftIconClick ? (
          <Button
            type="button"
            variant="unstyled" size="none"
            onClick={onLeftIconClick}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center cursor-pointer hover:text-sky-500 transition-colors after:absolute after:-inset-[13px] after:content-[''] sm:after:hidden"
          >
            <AppIcon name={left} size="md" />
          </Button>
        ) : (
          // Icon TRANG TRÍ (2026-10-06): trước là <button disabled> không nhãn — trình đọc màn hình đọc thành một
          // nút vô nghĩa, và nó chặn cú bấm vào vùng icon. Nay là span bỏ qua con trỏ → bấm vào icon là vào ô nhập.
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center">
            <AppIcon name={left} size="md" />
          </span>
        ))}
        
        <input
          ref={ref}
          className={cn(
            "flex h-9 pointer-coarse:min-h-11 w-full rounded-control border bg-white px-3 py-2 text-sm font-normal transition-colors",
            "border-slate-300 text-slate-900 placeholder:text-slate-400",
            "focus-visible:outline-none focus-visible:border-sky-500 focus-visible:ring-1 focus-visible:ring-sky-500",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100",
            "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-400 dark:disabled:bg-slate-900/50",
            left && "pl-9",
            right && "pr-9",
            error && "border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500 dark:border-rose-500 dark:focus-visible:border-rose-400 dark:focus-visible:ring-rose-400",
            className
          )}
          {...props}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={describedBy}
        />
        
        {right && (onRightIconClick ? (
          <Button
            type="button"
            variant="unstyled" size="none"
            onClick={onRightIconClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center cursor-pointer hover:text-sky-500 transition-colors after:absolute after:-inset-[13px] after:content-[''] sm:after:hidden"
          >
            <AppIcon name={right} size="md" />
          </Button>
        ) : (
          // Icon TRANG TRÍ (2026-10-06): trước là <button disabled> không nhãn — trình đọc màn hình đọc thành một
          // nút vô nghĩa, và nó chặn cú bấm vào vùng icon. Nay là span bỏ qua con trỏ → bấm vào icon là vào ô nhập.
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center">
            <AppIcon name={right} size="md" />
          </span>
        ))}
        </div>

        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs font-bold text-rose-500 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
