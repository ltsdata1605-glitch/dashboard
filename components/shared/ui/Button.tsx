import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility to merge tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'unstyled';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'none';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isUnstyled = variant === 'unstyled';
    
    const baseStyles = isUnstyled
      ? 'outline-none disabled:opacity-50 disabled:cursor-not-allowed'
      : 'inline-flex items-center justify-center font-medium transition-colors duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
    
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-sky-600 hover:bg-sky-700 text-white border border-transparent',
      secondary: 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700',
      danger: 'bg-rose-600 hover:bg-rose-700 text-white border border-transparent',
      ghost: 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent',
      outline: 'bg-transparent text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-700 hover:bg-sky-50 dark:hover:bg-sky-900/20',
      unstyled: '',
    };

    // VÙNG CHẠM TRÊN ĐIỆN THOẠI — `min-h-11` (44px) là mức tối thiểu trong Human Interface
    // Guidelines của Apple. Đo thật trên iPhone 15 (2026-09-26) ở Report BI: 20 nút nhỏ hơn 44px,
    // nhỏ nhất chỉ 14px cao. Dùng `min-h`/`min-w` chứ KHÔNG đổi `h`: nhiều nơi tự đè `className="h-8"`,
    // mà theo CSS thì min-height vẫn thắng height — nên các nút đó cũng được chạm đủ rộng mà
    // không phải sửa từng chỗ. Từ `sm:` trở lên trả về đúng chiều cao cũ để desktop không phình
    // thanh công cụ, chiếm chỗ của số liệu (CLAUDE.md mục 2).
    //
    // CỐ Ý không áp cho `size="none"`: đó là nút tự lo style hoàn toàn (ô trong bảng, nhãn bấm
    // được, icon bọc trong dòng dữ liệu) — ép 44px ở đó sẽ phá vỡ mật độ bảng.
    const sizes: Record<ButtonSize, string> = {
      sm: 'h-8 min-h-11 sm:min-h-0 px-3 text-xs rounded-md',
      md: 'h-9 min-h-11 sm:min-h-0 px-4 text-sm rounded-md',
      lg: 'h-11 px-6 text-base rounded-md',
      icon: 'h-8 w-8 rounded-md p-0',
      none: '',
    };

    return (
      // ĐÂY chính là component <Button> mà quy tắc RULES.md §2.5 yêu cầu mọi nơi khác dùng;
      // nó buộc phải render <button> thật của DOM nên được miễn trừ quy tắc đó.
      // eslint-disable-next-line no-restricted-syntax
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!isLoading && leftIcon && <span className="mr-2 -ml-1 shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2 -mr-1 shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
