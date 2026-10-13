import React from 'react';
import { cn } from './utils';
import { Button } from './Button';
import { AppIcon } from './icon/AppIcon';
import type { IconName } from './icon/iconRegistry';

/**
 * DANH SÁCH NHÓM kiểu app Cài đặt của iOS ("inset grouped" — KE_HOACH_GIAO_DIEN_APPLE.md mục 3.8, GĐ3 2026-10-11).
 *
 * Dùng cho menu "Khác", Tuỳ chỉnh, Phân quyền, cài đặt Bot LINE… — thay các lưới ô màu / thẻ viền màu mỗi nơi một kiểu.
 *  - `ListGroup`: tiêu đề nhóm 13px xám (viết thường như câu) + thẻ trắng bo 12px + chú thích cuối nhóm (tuỳ chọn).
 *  - `ListRow`: hàng ≥ 44px (cảm ứng 48px) — [ô icon màu 28px] [nhãn 15px + mô tả 13px] [giá trị] [công tắc | ›].
 *    Có `onClick` thì cả hàng là nút (vùng chạm trọn hàng); `destructive` → chữ đỏ (việc nguy hiểm, nên đặt nhóm cuối).
 *  - Đường kẻ mảnh giữa các hàng thụt lề theo nhãn (như iOS) — vẽ bằng CSS `.ycx-list-row` trong styles.css.
 */
export type ListIconTone = 'sky' | 'emerald' | 'amber' | 'rose' | 'slate';

const ICON_TONE: Record<ListIconTone, string> = {
  sky: 'bg-sky-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500', slate: 'bg-slate-400',
};

export interface ListGroupProps {
  title?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

export const ListGroup: React.FC<ListGroupProps> = ({ title, footer, children, className, ...rest }) => (
  <section className={cn('ycx-list-group', className)} {...rest}>
    {title && <h3 className="px-4 pb-1.5 text-[13px] font-normal leading-[18px] text-slate-500">{title}</h3>}
    <div className="overflow-hidden rounded-popup bg-white border border-slate-200/70">{children}</div>
    {footer && <p className="px-4 pt-1.5 text-[12px] leading-4 text-slate-500">{footer}</p>}
  </section>
);
ListGroup.displayName = 'ListGroup';

export interface ListRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: IconName;
  iconTone?: ListIconTone;
  /** Giá trị hiện bên phải (xám), vd "Bật", "UTM Avo". */
  value?: React.ReactNode;
  /** Phần tử bên phải tự dựng — thường là `<Switch>`. */
  trailing?: React.ReactNode;
  /** Mũi tên › — mặc định hiện khi có `onClick` và không có `trailing`. */
  chevron?: boolean;
  destructive?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  'data-testid'?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  label, description, icon, iconTone = 'sky', value, trailing, chevron, destructive, selected, disabled, onClick, className, ...rest
}) => {
  const coChevron = chevron ?? (!!onClick && !trailing);
  const noiDung = (
    <>
      {icon && (
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-white', destructive ? 'bg-rose-500' : ICON_TONE[iconTone])}>
          <AppIcon name={icon} size="md" />
        </span>
      )}
      <span className="min-w-0 flex-1 py-2">
        <span className={cn('block text-[15px] lg:text-sm leading-5 truncate', destructive ? 'text-rose-600 font-medium' : 'text-slate-900')}>{label}</span>
        {description && <span className="block text-[13px] leading-[18px] text-slate-500 line-clamp-2">{description}</span>}
      </span>
      {value !== undefined && <span className="shrink-0 max-w-[45%] truncate text-[15px] lg:text-sm text-slate-500">{value}</span>}
      {selected && <AppIcon name="check" size="md" className="shrink-0 text-sky-600" />}
      {trailing && <span className="shrink-0 flex items-center">{trailing}</span>}
      {coChevron && <AppIcon name="chevronRight" size="md" className="shrink-0 text-slate-300" />}
    </>
  );
  const lop = cn(
    'ycx-list-row relative flex w-full items-center gap-3 px-4 min-h-11 pointer-coarse:min-h-12 text-left',
    icon && 'ycx-list-row--icon',
    disabled && 'opacity-50',
    className,
  );
  if (onClick) {
    return (
      <Button variant="unstyled" size="none" type="button" onClick={onClick} disabled={disabled}
        className={cn(lop, 'transition-colors hover:bg-slate-50 active:bg-slate-100')} {...rest}>
        {noiDung}
      </Button>
    );
  }
  return <div className={lop} {...rest}>{noiDung}</div>;
};
ListRow.displayName = 'ListRow';
