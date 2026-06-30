import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from './utils';

/* ─── Tooltip ─── */

export interface TooltipProps {
  content: React.ReactNode;
  /** Tooltip placement */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing (ms) */
  delay?: number;
  children: React.ReactElement;
  className?: string;
  /** Disable tooltip */
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  side = 'top',
  delay = 200,
  children,
  className,
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const triggerRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }, [delay, disabled]);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionClasses = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top:    'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-900 dark:border-t-slate-700',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-900 dark:border-b-slate-700',
    left:   'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-900 dark:border-l-slate-700',
    right:  'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-900 dark:border-r-slate-700',
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isVisible && content && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-[var(--p-z-tooltip)] pointer-events-none',
            'px-2 py-1 text-xs font-medium text-white bg-slate-900 dark:bg-slate-700 rounded-md shadow-lg',
            'whitespace-nowrap animate-fade-in',
            positionClasses[side],
            className
          )}
        >
          {content}
          <span className={cn('absolute border-4', arrowClasses[side])} />
        </div>
      )}
    </div>
  );
};

Tooltip.displayName = 'Tooltip';
