import React from 'react';
import { cn } from './utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[200px]", className)}>
      {icon && (
        <div className="mb-4 text-slate-300 dark:text-slate-600">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[250px] mb-4">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
