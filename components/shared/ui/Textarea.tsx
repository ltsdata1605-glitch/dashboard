import React, { forwardRef, useId } from 'react';
import { cn } from './utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  fullWidth?: boolean;
}

/**
 * Vùng nhập nhiều dòng dùng chung (GĐ10 2026-10-20) — CÙNG CHUẨN với Input: viền slate-300, bo `rounded-control`, chữ 14px, focus
 * viền + vòng sky, lỗi nối vào ô qua aria-invalid/aria-describedby. Trước đây 18 chỗ tự vẽ <textarea>, mỗi nơi một kiểu viền/bo/
 * màu focus (Phân ca còn có viền chàm riêng).
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, fullWidth = true, ...props }, ref) => {
    const errorId = `${useId()}-error`;
    const describedBy = [props['aria-describedby'], error ? errorId : undefined].filter(Boolean).join(' ') || undefined;
    return (
      <div data-ui="shared" className={cn(fullWidth ? 'w-full' : 'w-auto')}>
        <textarea
          ref={ref}
          className={cn(
            'flex min-h-20 w-full rounded-control border bg-white px-3 py-2 text-sm font-normal transition-colors',
            'border-slate-300 text-slate-900 placeholder:text-slate-400',
            'focus-visible:outline-none focus-visible:border-sky-500 focus-visible:ring-1 focus-visible:ring-sky-500',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100',
            error && 'border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500',
            className
          )}
          {...props}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={describedBy}
        />
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs font-bold text-rose-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
