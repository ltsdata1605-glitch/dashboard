import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility to merge tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-[0.98] outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap';
    
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white shadow-md shadow-sky-500/20 border border-transparent',
      secondary: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm',
      danger: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/50 shadow-sm',
      ghost: 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent',
      outline: 'bg-transparent text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-900/20'
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-[11px] rounded-lg tracking-wide uppercase',
      md: 'h-10 px-4 text-xs rounded-xl tracking-widest uppercase',
      lg: 'h-12 px-6 text-sm rounded-xl tracking-widest uppercase',
      icon: 'h-10 w-10 rounded-xl p-0'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!isLoading && leftIcon && <span className="mr-2 -ml-1 shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2 -mr-1 shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
