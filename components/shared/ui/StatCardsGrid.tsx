import React from 'react';
import { Icon } from '../../common/Icon';

export interface StatCardItem {
  icon: string;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
}

interface StatCardsGridProps {
  cards: StatCardItem[];
  className?: string;
}

const COLOR_BG_MAP: Record<string, string> = {
  sky: 'bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400',
  violet: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
};

/**
 * Stat Cards Grid — 2x2 (mobile) → 4x1 (desktop) layout
 * Perfect for displaying 4 key metrics with icon, large number, label, and optional subtitle
 * Example: Orders, Products, Low Stock, Customers
 */
export const StatCardsGrid: React.FC<StatCardsGridProps> = ({ cards, className = '' }) => {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 ${className}`}>
      {cards.map((card, idx) => {
        const color = card.color || 'sky';
        const bgColor = COLOR_BG_MAP[color] || COLOR_BG_MAP['sky'];

        return (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-lg lg:rounded-xl p-3 lg:p-4 transition-all duration-300 hover:shadow-lg dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
          >
            {/* Icon with background circle */}
            <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center mb-2.5 lg:mb-3 ${bgColor}`}>
              <Icon name={card.icon} size={5} className="lg:hidden" />
              <Icon name={card.icon} size={5.5} className="hidden lg:block" />
            </div>

            {/* Large value number */}
            <div className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white leading-none mb-1">
              {card.value}
            </div>

            {/* Label */}
            <div className="text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-400 mb-0.5">
              {card.label}
            </div>

            {/* Optional subtitle */}
            {card.subtitle && (
              <div className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-500">
                {card.subtitle}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatCardsGrid;
