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
            "flex h-9 w-full rounded-md border bg-white px-3 py-2 text-sm font-normal transition-colors",
            "border-slate-300 text-slate-900 placeholder:text-slate-400",
            "focus-visible:outline-none focus-visible:border-sky-500 focus-visible:ring-1 focus-visible:ring-sky-500",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100",
            "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-400 dark:disabled:bg-slate-900/50",
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            error && "border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500 dark:border-rose-500 dark:focus-visible:border-rose-400 dark:focus-visible:ring-rose-400",
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
