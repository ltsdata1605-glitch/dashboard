import React from 'react';
import { cn } from './utils';

/* ─── Skeleton ─── */

export interface SkeletonProps {
  /** Width — CSS value or Tailwind class */
  width?: string;
  /** Height — CSS value or Tailwind class */
  height?: string;
  /** Shape variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Custom className */
  className?: string;
  /** Number of skeleton lines to render */
  lines?: number;
}

const baseClasses = 'animate-pulse bg-slate-200 dark:bg-slate-700/60';

const variantClasses = {
  text:        'rounded-md',
  circular:    'rounded-full',
  rectangular: 'rounded-none',
  rounded:     'rounded-xl',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height = '16px',
  variant = 'text',
  className,
  lines,
}) => {
  if (lines && lines > 1) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              variantClasses[variant],
              className
            )}
            style={{
              width: i === lines - 1 ? '75%' : (width || '100%'),
              height,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{
        width: width || '100%',
        height,
      }}
    />
  );
};

Skeleton.displayName = 'Skeleton';

/* ─── Skeleton Presets ─── */

/** Card skeleton — mimics a stat card loading state */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 space-y-3', className)}>
    <Skeleton width="40%" height="12px" />
    <Skeleton width="60%" height="28px" variant="rounded" />
    <Skeleton width="80%" height="10px" />
  </div>
);
SkeletonCard.displayName = 'SkeletonCard';

/** Table skeleton — mimics a data table loading state */
export const SkeletonTable: React.FC<{ rows?: number; cols?: number; className?: string }> = ({
  rows = 5,
  cols = 4,
  className,
}) => (
  <div className={cn('space-y-2', className)}>
    {/* Header */}
    <div className="flex gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={`h-${i}`} width={`${100 / cols}%`} height="12px" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, r) => (
      <div key={`r-${r}`} className="flex gap-3 py-1.5">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={`c-${r}-${c}`} width={`${100 / cols}%`} height="14px" />
        ))}
      </div>
    ))}
  </div>
);
SkeletonTable.displayName = 'SkeletonTable';

/** Chart skeleton — mimics a chart loading state */
export const SkeletonChart: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5', className)}>
    <div className="flex items-center justify-between mb-4">
      <Skeleton width="120px" height="14px" />
      <Skeleton width="80px" height="14px" />
    </div>
    <div className="flex items-end gap-2 h-40">
      {[60, 80, 45, 90, 55, 70, 85, 40, 75, 65, 50, 95].map((h, i) => (
        <Skeleton
          key={i}
          width="100%"
          height={`${h}%`}
          variant="rounded"
          className="flex-1"
        />
      ))}
    </div>
  </div>
);
SkeletonChart.displayName = 'SkeletonChart';
