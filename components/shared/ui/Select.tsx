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
            "flex h-10 w-full rounded-xl border bg-white px-4 py-2 text-[13px] font-semibold transition-all shadow-sm appearance-none cursor-pointer",
            "border-slate-200 text-slate-900",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
            "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus-visible:ring-indigo-400/20 dark:focus-visible:border-indigo-400 dark:disabled:bg-slate-900/50",
            leftIcon ? "pl-10" : "",
            "pr-10", // Space for chevron
            error && "border-rose-500 focus-visible:ring-rose-500/20 focus-visible:border-rose-500 dark:border-rose-500 dark:focus-visible:ring-rose-400/20 dark:focus-visible:border-rose-400",
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
