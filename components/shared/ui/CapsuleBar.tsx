import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon, type IconName } from './icon';
import { Button } from './Button';
import { cn } from './utils';

/**
 * Capsule Item — Cấu hình từng nút trong cụm viên nhộng
 */
export interface CapsuleItem {
    id: string;
    label: string;
    icon: IconName | React.ReactNode;
    onClick: () => void;
    active?: boolean;
    activeClassName?: string;
    iconClassName?: string;
    disabled?: boolean;
    badge?: string | number;
    title?: string;
    testId?: string;
}

export interface CapsuleBarProps {
    /** Danh sách các nút chức năng trong cụm */
    items: CapsuleItem[];
    /** Nhãn trợ năng (vd: "Phân hệ Report BI", "Thao tác nhanh") */
    ariaLabel?: string;
    /** Tuỳ biến lớp CSS cho thanh khung capsule ngoài */
    className?: string;
    /** Tuỳ biến lớp CSS cho từng nút bên trong */
    itemClassName?: string;
    /** Kích thước: 'compact' (32x32px nhỏ gọn chuẩn Zalo/iOS mẫu), 'sm' (28x28px), 'md' (36x36px), 'lg' (44x44px). Mặc định 'compact' */
    size?: 'compact' | 'sm' | 'md' | 'lg';
    /** ID phần tử HTML đích để tự động portal (vd: 'mobile-topbar-actions') */
    portalTargetId?: string;
    /** Cờ bật/tắt hiển thị (mặc định true) */
    enabled?: boolean;
    /** Vai trò trợ năng (mặc định 'group') */
    role?: 'group' | 'toolbar' | 'tablist';
}

/**
 * CapsuleBar — Cụm công cụ / điều hướng dạng viên nhộng bo tròn chuẩn Apple iOS HIG (như Zalo / iOS Navigation Capsule)
 *
 * Tiêu chuẩn thiết kế:
 *  - Bo góc viên nhộng `rounded-full`, nền mờ nhẹ translucent `bg-slate-100/90 dark:bg-slate-800/90`.
 *  - Viền mảnh mờ tinh tế `border border-slate-200/70 dark:border-slate-700/70`.
 *  - Kích thước mặc định 'compact' (32×32px) cực kỳ nhỏ gọn thanh thoát như Zalo/iOS mẫu.
 *  - Tích hợp lớp `ycx-hit` mở rộng vùng chạm vô hình đạt 44×44px trên màn cảm ứng chuẩn Apple HIG.
 *  - Hỗ trợ chuyển đổi tab/view active nổi bật hoặc cụm nút hành động độc lập.
 *  - Hỗ trợ `portalTargetId` tự động đưa lên thanh Topbar mobile mà không cần viết lặp `createPortal`.
 */
export const CapsuleBar: React.FC<CapsuleBarProps> = ({
    items,
    ariaLabel = 'Cụm chức năng',
    className,
    itemClassName,
    size = 'compact',
    portalTargetId,
    enabled = true,
    role = 'group',
}) => {
    const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!portalTargetId || typeof document === 'undefined') {
            setTargetElement(null);
            return;
        }
        setTargetElement(document.getElementById(portalTargetId));
    }, [portalTargetId]);

    if (!enabled || items.length === 0) return null;

    const sizeConfig = {
        sm: { btn: 'w-7 h-7 min-w-[28px] min-h-[28px]', iconSize: 'xs' as const },
        compact: { btn: 'w-8 h-8 min-w-[32px] min-h-[32px]', iconSize: 'sm' as const },
        md: { btn: 'w-9 h-9 min-w-[36px] min-h-[36px]', iconSize: 'sm' as const },
        lg: { btn: 'w-11 h-11 min-w-[44px] min-h-[44px]', iconSize: 'md' as const },
    };
    const currentSize = sizeConfig[size] || sizeConfig.compact;

    const barContent = (
        <div
            data-segmented=""
            data-capsule-bar=""
            role={role}
            aria-label={ariaLabel}
            className={cn(
                'flex items-center rounded-full bg-white/75 dark:bg-slate-800/75 backdrop-blur-xl border border-white/80 dark:border-slate-700/60 p-0.5 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.07),0_2px_6px_-1px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.95)] select-none',
                className
            )}
        >
            {items.map((item) => {
                const isActive = !!item.active;
                return (
                    <Button
                        variant="unstyled"
                        size="none"
                        key={item.id}
                        disabled={item.disabled}
                        aria-pressed={isActive}
                        data-active={isActive ? 'true' : undefined}
                        data-testid={item.testId}
                        onClick={item.onClick}
                        title={item.title || item.label}
                        aria-label={item.label}
                        className={cn(
                            currentSize.btn,
                            'ycx-hit relative rounded-full flex items-center justify-center transition-all duration-200 select-none active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
                            isActive
                                ? cn('bg-white dark:bg-slate-700 shadow-xs', item.activeClassName)
                                : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-500 dark:text-slate-400',
                            itemClassName
                        )}
                    >
                        {typeof item.icon === 'string' ? (
                            <AppIcon
                                name={item.icon as IconName}
                                size={currentSize.iconSize}
                                className={cn('transition-colors', item.iconClassName)}
                            />
                        ) : (
                            item.icon
                        )}
                        <span className="sr-only">{item.label}</span>
                        {item.badge !== undefined && item.badge !== null && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center leading-none pointer-events-none shadow-xs">
                                {item.badge}
                            </span>
                        )}
                    </Button>
                );
            })}
        </div>
    );

    if (portalTargetId) {
        if (!targetElement) return null;
        return createPortal(barContent, targetElement);
    }

    return barContent;
};

export default CapsuleBar;
