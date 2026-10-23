import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon, type IconName } from './icon';
import { Button } from './Button';
import { cn } from './utils';
import HeaderSystemGroup from '../../layout/HeaderSystemGroup';

/**
 * TopBarGroup Props — Khung viên nhộng con (Action Pill)
 */
export interface TopBarGroupProps {
    children: React.ReactNode;
    className?: string;
    role?: string;
    ariaLabel?: string;
}

export const TopBarGroup: React.FC<TopBarGroupProps> = ({
    children,
    className,
    role = 'group',
    ariaLabel,
}) => {
    return (
        <div
            role={role}
            aria-label={ariaLabel}
            className={cn(
                'flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0',
                className
            )}
        >
            {children}
        </div>
    );
};

/**
 * TopBarButton Props
 */
export interface TopBarButtonProps {
    id?: string;
    label?: string;
    icon?: IconName | React.ReactNode;
    iconSize?: 'xs' | 'sm' | 'md' | 'lg';
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    active?: boolean;
    disabled?: boolean;
    spin?: boolean;
    title?: string;
    ariaLabel?: string;
    className?: string;
    borderLeft?: boolean;
    variant?: 'default' | 'emerald' | 'sky' | 'amber' | 'rose';
    children?: React.ReactNode;
}

export const TopBarButton: React.FC<TopBarButtonProps> = ({
    id,
    label,
    icon,
    iconSize = 'md',
    onClick,
    active = false,
    disabled = false,
    spin = false,
    title,
    ariaLabel,
    className,
    borderLeft = false,
    variant = 'default',
    children,
}) => {
    const hasLabel = Boolean(label || children);

    const variantStyles = {
        default: active
            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold'
            : 'text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900/50',
        emerald: active
            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold'
            : 'bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-semibold',
        sky: active
            ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 font-bold'
            : 'text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20',
        amber: active
            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold'
            : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20',
        rose: active
            ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-bold'
            : 'text-rose-700 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20',
    };

    return (
        <Button
            id={id}
            variant="unstyled"
            size="none"
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={ariaLabel || title || label}
            className={cn(
                'flex items-center justify-center transition-colors focus:outline-none select-none',
                hasLabel ? 'gap-2 px-4 py-2 text-base font-medium' : 'w-10 h-10 p-2',
                borderLeft && 'border-l border-slate-100 dark:border-slate-700',
                variantStyles[variant],
                disabled && 'opacity-60 cursor-not-allowed',
                className
            )}
        >
            {icon && (
                typeof icon === 'string' ? (
                    <AppIcon name={icon as IconName} size={iconSize} spin={spin} />
                ) : (
                    icon
                )
            )}
            {label && <span>{label}</span>}
            {children}
        </Button>
    );
};

/**
 * TopBarLink Props — Đường link liên kết ngoài dạng nút pill
 */
export interface TopBarLinkProps {
    href: string;
    icon?: IconName | React.ReactNode;
    iconSize?: 'xs' | 'sm' | 'md' | 'lg';
    label?: string;
    title?: string;
    target?: string;
    rel?: string;
    className?: string;
    borderLeft?: boolean;
    children?: React.ReactNode;
}

export const TopBarLink: React.FC<TopBarLinkProps> = ({
    href,
    icon,
    iconSize = 'md',
    label,
    title,
    target = '_blank',
    rel = 'noopener noreferrer',
    className,
    borderLeft = true,
    children,
}) => {
    const hasLabel = Boolean(label || children);

    return (
        <a
            href={href}
            target={target}
            rel={rel}
            title={title}
            className={cn(
                'flex items-center justify-center text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors select-none',
                hasLabel ? 'gap-2 px-4 py-2 text-base font-medium' : 'w-10 h-10 p-2',
                borderLeft && 'border-l border-slate-100 dark:border-slate-700',
                className
            )}
        >
            {icon && (
                typeof icon === 'string' ? (
                    <AppIcon name={icon as IconName} size={iconSize} />
                ) : (
                    icon
                )
            )}
            {label && <span>{label}</span>}
            {children}
        </a>
    );
};

/**
 * TopBarDivider — Đường phân cách thanh mảnh giữa các phần tử
 */
export const TopBarDivider: React.FC<{ className?: string }> = ({ className }) => {
    return <div className={cn('w-px h-3.5 bg-slate-200 dark:bg-slate-700 shrink-0 mx-0.5', className)} />;
};

/**
 * TopBarActions Props
 */
export interface TopBarActionsProps {
    children: React.ReactNode;
    /** Bật/tắt tự động hiển thị cụm hệ thống chuẩn [ T | 🔔 ] ở cuối thanh (Mặc định: true) */
    showSystemGroup?: boolean;
    /** Phần tử tuỳ biến nhúng vào giữa [ T ] và [ 🔔 ] trong cụm hệ thống (ví dụ: nút toggle filter) */
    systemChildren?: React.ReactNode;
    /** Bật/tắt toàn bộ thanh bar (Mặc định: true) */
    enabled?: boolean;
    /** ID phần tử HTML đích để tự động portal (Mặc định: 'global-header-actions', truyền false nếu muốn render tại chỗ) */
    portalTargetId?: string | false;
    /** Tuỳ biến lớp CSS cho khung kính mờ ngoài */
    className?: string;
    /** Trợ năng nhãn aria */
    ariaLabel?: string;
}

/**
 * TopBarActions — Thanh công cụ Desktop chuẩn hoá 100% toàn dự án (Apple Frosted Glass HIG)
 *
 * Chuẩn thiết kế:
 *  - Khung ngoài: Kính mờ `bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm`
 *  - Tự động Portal vào `#global-header-actions` trên Desktop, kiểm tra mounted an toàn tránh hydration mismatch.
 *  - Tự động tích hợp cụm hệ thống chuẩn [ T (Font) | 🔔 (Thông báo) ] ở cuối thanh.
 *  - Hỗ trợ Compound Component: <TopBarActions.Group>, <TopBarActions.Button>, <TopBarActions.Link>, <TopBarActions.Divider>.
 */
export const TopBarActionsComponent: React.FC<TopBarActionsProps> = ({
    children,
    showSystemGroup = true,
    systemChildren,
    enabled = true,
    portalTargetId = 'global-header-actions',
    className,
    ariaLabel = 'Thanh thao tác trên cùng',
}) => {
    const [mounted, setMounted] = useState(false);
    const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setMounted(true);
        if (!portalTargetId || typeof document === 'undefined') {
            setTargetElement(null);
            return;
        }
        setTargetElement(document.getElementById(portalTargetId));
    }, [portalTargetId]);

    if (!enabled) return null;

    const content = (
        <div
            role="toolbar"
            aria-label={ariaLabel}
            className={cn(
                'hidden lg:flex flex-wrap items-center gap-4 w-auto bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300',
                className
            )}
        >
            {children}

            {showSystemGroup && (
                <HeaderSystemGroup>
                    {systemChildren}
                </HeaderSystemGroup>
            )}
        </div>
    );

    // Nếu không dùng portal hoặc portalTargetId === false, render thẳng
    if (portalTargetId === false) {
        return content;
    }

    if (!mounted || !targetElement) {
        return null;
    }

    return createPortal(content, targetElement);
};

export const TopBarActions = Object.assign(TopBarActionsComponent, {
    Group: TopBarGroup,
    Button: TopBarButton,
    Link: TopBarLink,
    Divider: TopBarDivider,
});

export default TopBarActions;
