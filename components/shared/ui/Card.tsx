import React from 'react';
import { cn } from './utils';

/* ─── Card ─── */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: 'elevated' | 'outlined' | 'flat';
  /** Adds hover lift effect */
  interactive?: boolean;
  /** Inner padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses = {
  elevated: 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-[var(--card-shadow)]',
  outlined: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700',
  flat:     'bg-slate-50 dark:bg-slate-800/50 border border-transparent',
};

const paddingClasses = {
  none: '',
  sm:   'p-3 sm:p-4',
  md:   'p-4 sm:p-6',
  lg:   'p-6 sm:p-8',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', interactive = false, padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[var(--card-radius)] transition-all duration-200',
          variantClasses[variant],
          paddingClasses[padding],
          interactive && 'cursor-pointer hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[var(--card-shadow)]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/* ─── Card Sub-components ─── */

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className,
  children,
  ...props
}) => {
  if (children) {
    return (
      <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
        {children}
      </div>
    );
  }
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      <div className="min-w-0 flex-1">
        {title && (
          <h3 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight truncate">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 ml-3">{action}</div>}
    </div>
  );
};
CardHeader.displayName = 'CardHeader';

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn(className)} {...props}>
    {children}
  </div>
);
CardBody.displayName = 'CardBody';

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn('mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center', className)}
    {...props}
  >
    {children}
  </div>
);
CardFooter.displayName = 'CardFooter';
