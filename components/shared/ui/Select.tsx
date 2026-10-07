import React, { forwardRef } from 'react';
import { cn } from './utils';
import { AppIcon } from './icon/AppIcon';
import type { IconName } from './icon/iconRegistry';
import { resolveIconName } from './icon/legacyIconNames';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  error?: string;
  /** Tên chức năng (iconRegistry) — tên kiểu cũ vẫn nhận qua lớp chuyển tiếp. */
  leftIcon?: IconName | string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, leftIcon, fullWidth = true, options, children, ...props }, ref) => {
    const left = resolveIconName(leftIcon) ?? (leftIcon ? 'help' : undefined);
    return (
      <div className={cn(fullWidth ? "w-full" : "w-auto")}>
        {/* `relative` chỉ bọc ô chọn — xem chú thích cùng chỗ ở Input.tsx (icon tụt khi có lỗi). */}
        <div className="relative">
        {left && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center">
            <AppIcon name={left} size="md" />
          </div>
        )}
        
        <select
          ref={ref}
          className={cn(
            "flex h-9 max-sm:min-h-11 pointer-coarse:min-h-11 w-full rounded-control border bg-white px-3 py-2 text-sm font-normal transition-colors appearance-none cursor-pointer",
            "border-slate-300 text-slate-900",
            "focus-visible:outline-none focus-visible:border-sky-500 focus-visible:ring-1 focus-visible:ring-sky-500",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100",
            "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-400 dark:disabled:bg-slate-900/50",
            left ? "pl-9" : "",
            "pr-9", // Space for chevron
            error && "border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500 dark:border-rose-500 dark:focus-visible:border-rose-400 dark:focus-visible:ring-rose-400",
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center">
          <AppIcon name="chevronDown" size="md" />
        </div>
        </div>

        {error && (
          <p className="mt-1.5 text-xs font-bold text-rose-500 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
