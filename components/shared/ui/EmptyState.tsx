import React from 'react';
import { cn } from './utils';

/* ─── EmptyState ─── */

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Compact variant for inline use */
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6 px-4' : 'py-16 px-6',
        className
      )}
    >
      {icon && (
        <div className={cn(
          'flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-4',
          compact ? 'w-10 h-10' : 'w-14 h-14'
        )}>
          {icon}
        </div>
      )}
      <h4 className={cn(
        'font-bold text-slate-700 dark:text-slate-300 tracking-tight',
        compact ? 'text-sm' : 'text-base'
      )}>
        {title}
      </h4>
      {description && (
        <p className={cn(
          'text-slate-500 dark:text-slate-400 mt-1 max-w-sm',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">{action}</div>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
