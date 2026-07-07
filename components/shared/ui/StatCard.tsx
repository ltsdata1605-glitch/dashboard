import React from 'react';
import { cn } from './utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ─── StatCard ─── */

export type TrendDirection = 'up' | 'down' | 'flat';

export interface StatCardProps {
  /** Label above the value */
  label: string;
  /** Main value display */
  value: React.ReactNode;
  /** Optional subtitle or secondary info */
  subtitle?: React.ReactNode;
  /** Trend indicator */
  trend?: {
    direction: TrendDirection;
    value: string;
    label?: string;
  };
  /** Icon displayed in top-right corner */
  icon?: React.ReactNode;
  /** Color accent for icon background */
  accent?: 'sky' | 'emerald' | 'amber' | 'rose' | 'slate';
  /** Click handler */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

const accentClasses: Record<string, { bg: string; icon: string }> = {
  sky:     { bg: 'bg-sky-50 dark:bg-sky-500/10', icon: 'text-sky-600 dark:text-sky-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-500/10', icon: 'text-amber-600 dark:text-amber-400' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-500/10', icon: 'text-rose-600 dark:text-rose-400' },
  slate:   { bg: 'bg-slate-100 dark:bg-slate-800', icon: 'text-slate-600 dark:text-slate-400' },
};

const trendColors: Record<TrendDirection, string> = {
  up:   'text-emerald-600 dark:text-emerald-400',
  down: 'text-rose-600 dark:text-rose-400',
  flat: 'text-slate-500 dark:text-slate-400',
};

const TrendIcon: React.FC<{ direction: TrendDirection }> = ({ direction }) => {
  const size = 14;
  switch (direction) {
    case 'up':   return <TrendingUp size={size} />;
    case 'down': return <TrendingDown size={size} />;
    case 'flat': return <Minus size={size} />;
  }
};

export const StatCard = React.memo<StatCardProps>(({
  label,
  value,
  subtitle,
  trend,
  icon,
  accent = 'sky',
  onClick,
  className,
}) => {
  const colors = accentClasses[accent] || accentClasses.sky;

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-[var(--card-radius)] border border-slate-100 dark:border-white/5',
        'p-4 sm:p-5 transition-all duration-200',
        'shadow-[var(--card-shadow)]',
        onClick && 'cursor-pointer hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 active:translate-y-0',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          {/* Label */}
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {label}
          </p>

          {/* Value */}
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight leading-none">
            {value}
          </p>

          {/* Subtitle & Trend */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {trend && (
              <span className={cn(
                'inline-flex items-center gap-0.5 text-xs font-bold',
                trendColors[trend.direction]
              )}>
                <TrendIcon direction={trend.direction} />
                {trend.value}
                {trend.label && (
                  <span className="text-slate-400 dark:text-slate-500 font-normal ml-0.5">
                    {trend.label}
                  </span>
                )}
              </span>
            )}
            {subtitle && (
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Icon */}
        {icon && (
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-3',
            colors.bg, colors.icon
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';
