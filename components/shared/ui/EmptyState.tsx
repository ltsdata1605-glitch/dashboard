import React from 'react';
import { cn } from './utils';
import { AppIcon } from './icon/AppIcon';
import type { IconName } from './icon/iconRegistry';

/* ─── EmptyState ─── */

/**
 * TRẠNG THÁI TRỐNG dùng chung — một kiểu cho cả app (GĐ3 2026-10-11, KE_HOACH_GIAO_DIEN_APPLE.md mục 3.12; lỗi #20: 4 kiểu
 * "Không có dữ liệu" khác nhau trên cùng một trang). Icon 32px trong vòng tròn xám nhạt, tiêu đề 15px đậm vừa, mô tả 13px xám,
 * nút hành động (nếu có). `icon` nhận TÊN chức năng (khuyên dùng) hoặc node tự dựng (cách cũ).
 */
export interface EmptyStateProps {
  icon?: IconName | React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Compact variant for inline use */
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6 px-4' : 'py-14 px-6',
        className
      )}
    >
      {icon && (
        <div className={cn(
          'flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-3',
          compact ? 'w-11 h-11' : 'w-14 h-14'
        )}>
          {typeof icon === 'string' ? <AppIcon name={icon as IconName} size={compact ? 'xl' : 'state'} /> : icon}
        </div>
      )}
      <h4 className={cn(
        'font-semibold text-slate-800 dark:text-slate-200',
        compact ? 'text-sm' : 'text-[15px] leading-5'
      )}>
        {title}
      </h4>
      {description && (
        <p className={cn(
          'text-slate-500 dark:text-slate-400 mt-1 max-w-sm',
          compact ? 'text-xs' : 'text-[13px] leading-[18px]'
        )}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">{action}</div>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
