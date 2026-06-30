import React from 'react';
import { cn } from './utils';

/* ─── Badge ─── */

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  success:  'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning:  'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  danger:   'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
  info:     'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400',
  outline:  'bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
};

const dotColors: Record<BadgeVariant, string> = {
  default:  'bg-slate-400',
  success:  'bg-emerald-500',
  warning:  'bg-amber-500',
  danger:   'bg-rose-500',
  info:     'bg-sky-500',
  outline:  'bg-slate-400',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-xs',
};

export const Badge = React.memo<BadgeProps>(({
  variant = 'default',
  size = 'md',
  dot = false,
  icon,
  children,
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium leading-none whitespace-nowrap transition-colors',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />
      )}
      {icon && <span className="shrink-0 -ml-0.5">{icon}</span>}
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';
