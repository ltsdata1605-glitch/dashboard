import React, { forwardRef } from 'react';
import { cn } from './utils';
import { Icon } from '../../common/Icon';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconClick?: () => void;
  onLeftIconClick?: () => void;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, onRightIconClick, onLeftIconClick, fullWidth = true, ...props }, ref) => {
    return (
      <div className={cn("relative", fullWidth ? "w-full" : "w-auto")}>
        {leftIcon && (
          <button
            type="button"
            onClick={onLeftIconClick}
            disabled={!onLeftIconClick}
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center",
              onLeftIconClick ? "cursor-pointer hover:text-indigo-500 transition-colors" : "cursor-default"
            )}
          >
            <Icon name={leftIcon} size={4.5} />
          </button>
        )}
        
        <input
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-xl border bg-white px-4 py-2 text-[13px] font-semibold transition-all shadow-sm",
            "border-slate-200 text-slate-900 placeholder:text-slate-400",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
            "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:ring-indigo-400/20 dark:focus-visible:border-indigo-400 dark:disabled:bg-slate-900/50",
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            error && "border-rose-500 focus-visible:ring-rose-500/20 focus-visible:border-rose-500 dark:border-rose-500 dark:focus-visible:ring-rose-400/20 dark:focus-visible:border-rose-400",
            className
          )}
          {...props}
        />
        
        {rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            disabled={!onRightIconClick}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center justify-center",
              onRightIconClick ? "cursor-pointer hover:text-indigo-500 transition-colors" : "cursor-default"
            )}
          >
            <Icon name={rightIcon} size={4.5} />
          </button>
        )}
        
        {error && (
          <p className="mt-1.5 text-xs font-bold text-rose-500 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
