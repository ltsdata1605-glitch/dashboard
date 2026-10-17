import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AppIcon } from './icon/AppIcon';
import type { IconName } from './icon/iconRegistry';

/** Utility to merge tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'danger' | 'destructive' | 'ghost' | 'outline' | 'success' | 'inline-link' | 'unstyled';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'none';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /** @deprecated Dùng `icon` (tên chức năng trong iconRegistry) — size/khoảng cách tự chuẩn. */
  leftIcon?: React.ReactNode;
  /** @deprecated Dùng `iconRight`. */
  rightIcon?: React.ReactNode;
  /**
   * Icon bên trái theo TÊN CHỨC NĂNG (chuẩn hoá icon 2026-10-02). Nút tự chọn size icon theo
   * `size` của nút (`lg` → icon `lg`, còn lại → `md` 16/18px) và cách chữ đúng 6px (`gap-1.5`).
   */
  icon?: IconName;
  /** Icon bên phải theo tên chức năng (vd `chevronDown` cho nút mở menu). */
  iconRight?: IconName;
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
      icon,
      iconRight,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isUnstyled = variant === 'unstyled';

    // Audit A16 (2026-09-29): `outline-none` mà không có dấu focus thay thế → người dùng bàn phím
    // không biết đang đứng ở nút nào. `focus-visible` CHỈ hiện khi điều hướng bằng bàn phím, không
    // hiện khi chạm/bấm chuột → giao diện thường ngày không đổi.
    // `outline-solid` bắt buộc: ở Tailwind 4, `outline-none` đặt --tw-outline-style: none và
    // `outline-2` dùng lại chính biến đó → không có nó thì viền vẫn vô hình (đã đo trong test).
    const focusRing = 'focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500';
    const baseStyles = isUnstyled
      ? `outline-none ${focusRing} disabled:opacity-50 disabled:cursor-not-allowed`
      : `inline-flex items-center justify-center transition-colors duration-200 outline-none ${focusRing} disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap active:opacity-80`;

    // 5 KIỂU NÚT kiểu Apple (GĐ3 2026-10-11, KE_HOACH_GIAO_DIEN_APPLE.md mục 3.14) — mỗi màn CHỈ MỘT nút `primary`:
    //  primary     sky-600 đặc — hành động chính.
    //  secondary   "tinted" xám: nền slate-100, chữ đậm, KHÔNG viền (trước: trắng viền xám) — Huỷ, hành động phụ.
    //  tinted      nền sky-50, chữ sky-700 — hành động phụ QUAN TRỌNG (vẫn rõ là nút, không tranh với nút chính).
    //  destructive đỏ nhạt (nền rose-50, chữ rose-600) — việc nguy hiểm đặt cuối nhóm; bấm vẫn phải hỏi xác nhận.
    //  danger      đỏ ĐẶC — CHỈ cho nút xác nhận cuối cùng (ConfirmDialog "Xoá").
    //  ghost / outline giữ cho chỗ cũ (nút icon, thanh công cụ dày).
    const variants: Record<ButtonVariant, string> = {
      primary: 'font-semibold bg-sky-600 hover:bg-sky-700 text-white border border-transparent',
      secondary: 'font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-transparent dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
      tinted: 'font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-transparent',
      danger: 'font-semibold bg-rose-600 hover:bg-rose-700 text-white border border-transparent',
      destructive: 'font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-transparent',
      success: 'font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent',
      ghost: 'font-medium bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent',
      outline: 'font-medium bg-transparent text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-700 hover:bg-sky-50 dark:hover:bg-sky-900/20',
      'inline-link': 'font-medium bg-transparent text-sky-600 hover:text-sky-700 hover:underline border border-transparent p-0 h-auto min-h-0',
      unstyled: '',
    };

    // VÙNG CHẠM TRÊN ĐIỆN THOẠI — `min-h-11` (44px) là mức tối thiểu trong Human Interface
    // Guidelines của Apple. Đo thật trên iPhone 15 (2026-09-26) ở Report BI: 20 nút nhỏ hơn 44px,
    // nhỏ nhất chỉ 14px cao. Dùng `min-h`/`min-w` chứ KHÔNG đổi `h`: nhiều nơi tự đè `className="h-8"`,
    // mà theo CSS thì min-height vẫn thắng height — nên các nút đó cũng được chạm đủ rộng mà
    // không phải sửa từng chỗ. Audit 2026-10-07 (GĐ4): điều kiện là màn hẹp <640px HOẶC THIẾT BỊ CẢM
    // ỨNG (`pointer-coarse:`) — trước chỉ có "màn hẹp" nên iPhone xoay ngang (844px) và iPad (768–1024px) trước đây rơi
    // vào cỡ desktop 32–36px. Máy dùng chuột giữ cỡ gọn cũ để không phình thanh công cụ (CLAUDE.md mục 2).
    //
    // CỐ Ý không áp cho `size="none"`: đó là nút tự lo style hoàn toàn (ô trong bảng, nhãn bấm
    // được, icon bọc trong dòng dữ liệu) — ép 44px ở đó sẽ phá vỡ mật độ bảng.
    const sizes: Record<ButtonSize, string> = {
      sm: 'h-8 max-sm:min-h-11 pointer-coarse:min-h-11 px-3 text-xs rounded-control',
      md: 'h-9 max-sm:min-h-11 pointer-coarse:min-h-11 px-4 text-sm rounded-control',
      lg: 'h-11 px-6 text-base rounded-control',
      // Cỡ nút icon: h-8 w-8 gọn gàng, bo rounded-lg thanh lịch cả trên mobile và desktop (chủ dự án, f0a5558 — bỏ min-44 vì
      // nút phình làm "mobile icon squishing"). GĐ9: giữ ĐÚNG cỡ nhìn thấy đó, chỉ nới vùng chạm vô hình 44×44 bằng `ycx-hit`
      // (styles.css — màn hẹp hoặc cảm ứng), không đổi bố cục. Nút cạnh nhau sát hơn 12px thì vùng chạm chồng nhẹ ở khe.
      icon: 'ycx-hit h-8 w-8 rounded-lg p-0',
      none: '',
    };

    const effectiveSize = variant === 'inline-link' && size === 'md' ? 'none' : size;
    const iconSize = effectiveSize === 'lg' ? 'lg' : 'md';
    const hasNamedIcon = Boolean(icon || iconRight);

    return (
      // ĐÂY chính là component <Button> mà quy tắc RULES.md §2.5 yêu cầu mọi nơi khác dùng;
      // nó buộc phải render <button> thật của DOM nên được miễn trừ quy tắc đó.
      // eslint-disable-next-line no-restricted-syntax
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[effectiveSize], hasNamedIcon && 'gap-1.5', className)}
        // Đánh dấu nút CÓ KIỂU CHUẨN (không phải 'unstyled' tự tạo kiểu) — chế độ mật độ gọn của
        // Report BI (features/bi-dashboard/biDensity.css) không thu nhỏ các nút này (audit A20).
        data-ui={isUnstyled ? undefined : 'shared'}
        {...props}
      >
        {isLoading && <AppIcon name="loading" spin size={iconSize} className={hasNamedIcon ? undefined : '-ml-1 mr-2'} />}
        {!isLoading && icon && <AppIcon name={icon} size={iconSize} />}
        {!isLoading && leftIcon && <span className="mr-2 -ml-1 shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2 -mr-1 shrink-0">{rightIcon}</span>}
        {!isLoading && iconRight && <AppIcon name={iconRight} size={iconSize} />}
      </button>
    );
  }
);

Button.displayName = 'Button';
