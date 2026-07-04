import React, { forwardRef } from 'react';
import { cn } from './utils';
import { Icon } from '../../common/Icon';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  error?: string;
  leftIcon?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, leftIcon, fullWidth = true, options, children, ...props }, ref) => {
    return (
      <div className={cn("relative", fullWidth ? "w-full" : "w-auto")}>
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center">
            <Icon name={leftIcon} size={4.5} />
          </div>
        )}
        
        <select
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded-md border bg-white px-3 py-2 text-sm font-normal transition-colors appearance-none cursor-pointer",
            "border-slate-300 text-slate-900",
            "focus-visible:outline-none focus-visible:border-sky-500 focus-visible:ring-1 focus-visible:ring-sky-500",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100",
            "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-400 dark:disabled:bg-slate-900/50",
            leftIcon ? "pl-9" : "",
            "pr-9", // Space for chevron
            error && "border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500 dark:border-rose-500 dark:focus-visible:border-rose-400 dark:focus-visible:ring-rose-400",
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center">
          <Icon name="chevron-down" size={4} />
        </div>
        
        {error && (
          <p className="mt-1.5 text-xs font-bold text-rose-500 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
