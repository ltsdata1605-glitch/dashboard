import React from 'react';
import { cn } from './utils';

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    /** Tắt hover shadow ở laptop nếu section không cần nhấn tương tác (mặc định bật) */
    hoverable?: boolean;
}

/**
 * Khung "Card section" chuẩn dùng chung toàn app (DESIGN_SYSTEM_MODERN.md §3.1):
 * mobile phẳng full-bleed (rounded-none, border-y), laptop bo góc nổi (rounded-2xl, border, shadow).
 * Chỉ cung cấp bg/rounded/border/shadow/overflow — không áp padding, để header/body tự quản lý spacing riêng.
 *
 * Khác với `Card` (tĩnh, không đổi hình theo breakpoint): `SectionCard` dành riêng cho khung bọc
 * section cấp trang (KPI/Chart/Table) cần chuyển mobile-phẳng ↔ laptop-nổi.
 */
export const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
    ({ children, className, hoverable = true, ...rest }, ref) => (
        <div
            ref={ref}
            className={cn(
                'bg-white rounded-none lg:rounded-2xl border-y lg:border border-slate-200 shadow-sm transition-shadow overflow-hidden',
                hoverable && 'lg:hover:shadow-md',
                className
            )}
            {...rest}
        >
            {children}
        </div>
    )
);
SectionCard.displayName = 'SectionCard';

export default SectionCard;
