import React from 'react';
import { Icon } from '../../common/Icon';

export interface QuickActionItem {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  color?: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
}

interface QuickActionTilesProps {
  actions: QuickActionItem[];
  className?: string;
}

const COLOR_BORDER_MAP: Record<string, string> = {
  sky: 'border-sky-200 dark:border-sky-600 hover:border-sky-400 dark:hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10',
  emerald: 'border-emerald-200 dark:border-emerald-600 hover:border-emerald-400 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
  amber: 'border-amber-200 dark:border-amber-600 hover:border-amber-400 dark:hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10',
  rose: 'border-rose-200 dark:border-rose-600 hover:border-rose-400 dark:hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10',
  violet: 'border-violet-200 dark:border-violet-600 hover:border-violet-400 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10',
};

const COLOR_ICON_BG_MAP: Record<string, string> = {
  sky: 'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400',
  violet: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
};

/**
 * Quick Action Tiles — 4 action buttons in a row (mobile) → flexible layout (desktop)
 * Each tile has icon with circle background + text label below
 * Perfect for "Tạo đơn hàng", "Nhập hàng", "Thêm khách hàng", "Quét mã vạch" style actions
 */
export const QuickActionTiles: React.FC<QuickActionTilesProps> = ({ actions, className = '' }) => {
  return (
    <div className={`grid grid-cols-4 lg:grid-cols-4 gap-2 lg:gap-3 ${className}`}>
      {actions.map((action) => {
        const color = action.color || 'sky';
        const borderClass = COLOR_BORDER_MAP[color] || COLOR_BORDER_MAP['sky'];
        const iconBgClass = COLOR_ICON_BG_MAP[color] || COLOR_ICON_BG_MAP['sky'];

        return (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`flex flex-col items-center justify-center gap-2 lg:gap-2.5 p-2.5 lg:p-3 rounded-lg lg:rounded-xl border-2 transition-all duration-200 touch-feedback hover:shadow-md active:scale-95 ${borderClass}`}
          >
            {/* Icon with circular background */}
            <div className={`w-10 h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center ${iconBgClass}`}>
              <Icon name={action.icon} size={5} className="lg:hidden" />
              <Icon name={action.icon} size={5.5} className="hidden lg:block" />
            </div>

            {/* Label text */}
            <span className="text-[10px] lg:text-xs font-semibold text-center leading-tight text-slate-700 dark:text-slate-300 line-clamp-2">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default QuickActionTiles;
