import React, { useCallback, useRef, useEffect } from 'react';
import { cn } from './utils';

/* ─── Tabs ─── */

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Visual variant */
  variant?: 'underline' | 'pills' | 'segment';
  /** Size */
  size?: 'sm' | 'md';
  /** Full width tabs */
  fullWidth?: boolean;
  /** Additional className */
  className?: string;
}

export const Tabs = React.memo<TabsProps>(({
  items,
  activeId,
  onChange,
  variant = 'underline',
  size = 'md',
  fullWidth = false,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view on mobile
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const active = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      if (activeRect.left < containerRect.left || activeRect.right > containerRect.right) {
        active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeId]);

  const handleClick = useCallback((id: string) => {
    onChange(id);
  }, [onChange]);

  const sizeClasses = {
    sm: 'text-xs h-8',
    md: 'text-sm h-10',
  };

  if (variant === 'underline') {
    return (
      <div
        ref={containerRef}
        className={cn(
          'flex overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-700/60',
          fullWidth && 'w-full',
          className
        )}
      >
        {items.map(item => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              ref={isActive ? activeRef : undefined}
              onClick={() => handleClick(item.id)}
              disabled={item.disabled}
              className={cn(
                'relative flex items-center gap-1.5 px-3 font-medium whitespace-nowrap transition-colors shrink-0',
                sizeClasses[size],
                fullWidth && 'flex-1 justify-center',
                isActive
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                item.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              {item.label}
              {item.badge !== undefined && (
                <span className={cn(
                  'min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-bold flex items-center justify-center leading-none',
                  isActive
                    ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                )}>
                  {item.badge}
                </span>
              )}
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div
        ref={containerRef}
        className={cn(
          'flex gap-1 overflow-x-auto no-scrollbar',
          fullWidth && 'w-full',
          className
        )}
      >
        {items.map(item => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              ref={isActive ? activeRef : undefined}
              onClick={() => handleClick(item.id)}
              disabled={item.disabled}
              className={cn(
                'flex items-center gap-1.5 px-3 font-medium whitespace-nowrap rounded-lg transition-all shrink-0',
                sizeClasses[size],
                fullWidth && 'flex-1 justify-center',
                isActive
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                item.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              {item.label}
              {item.badge !== undefined && (
                <span className={cn(
                  'min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-bold flex items-center justify-center leading-none',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Segment variant
  return (
    <div
      ref={containerRef}
      className={cn(
        'inline-flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 overflow-x-auto no-scrollbar',
        fullWidth && 'w-full',
        className
      )}
    >
      {items.map(item => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => handleClick(item.id)}
            disabled={item.disabled}
            className={cn(
              'flex items-center gap-1.5 px-3 font-medium whitespace-nowrap rounded-md transition-all shrink-0',
              sizeClasses[size],
              fullWidth && 'flex-1 justify-center',
              isActive
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
              item.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            {item.label}
            {item.badge !== undefined && (
              <span className={cn(
                'min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-bold flex items-center justify-center leading-none',
                isActive
                  ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              )}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});

Tabs.displayName = 'Tabs';
