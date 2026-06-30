import React from 'react';
import { cn } from './utils';

/* ─── ProgressBar ─── */

export interface ProgressBarProps {
  /** Value from 0 to 100 */
  value: number;
  /** Max value (default: 100) */
  max?: number;
  /** Color variant */
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'auto';
  /** Size */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Show percentage label */
  showLabel?: boolean;
  /** Show shimmer animation */
  shimmer?: boolean;
  /** Custom label */
  label?: string;
  /** Additional className */
  className?: string;
}

const sizeClasses = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

const colorClasses: Record<string, { bar: string; shimmer: string }> = {
  brand:   { bar: 'bg-sky-500', shimmer: 'from-sky-500 via-sky-300 to-sky-500' },
  success: { bar: 'bg-emerald-500', shimmer: 'from-emerald-500 via-emerald-300 to-emerald-500' },
  warning: { bar: 'bg-amber-500', shimmer: 'from-amber-500 via-amber-300 to-amber-500' },
  danger:  { bar: 'bg-rose-500', shimmer: 'from-rose-500 via-rose-300 to-rose-500' },
};

/** Auto-select color based on percentage */
function getAutoColor(percentage: number): string {
  if (percentage >= 100) return 'success';
  if (percentage >= 70) return 'brand';
  if (percentage >= 40) return 'warning';
  return 'danger';
}

export const ProgressBar = React.memo<ProgressBarProps>(({
  value,
  max = 100,
  variant = 'brand',
  size = 'md',
  showLabel = false,
  shimmer = false,
  label,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const resolvedVariant = variant === 'auto' ? getAutoColor(percentage) : variant;
  const colors = colorClasses[resolvedVariant] || colorClasses.brand;

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
              {label}
            </span>
          )}
          {showLabel && (
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 ml-2">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={cn(
        'w-full rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out relative',
            colors.bar,
            shimmer && 'overflow-hidden'
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          {shimmer && percentage > 0 && (
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-r opacity-30',
                colors.shimmer,
                'animate-shimmer bg-[length:200%_100%]'
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';
