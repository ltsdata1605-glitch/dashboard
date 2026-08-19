import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn, onActivateKey } from './utils';
import { ChevronDown } from 'lucide-react';
import { Button } from './Button';

/* ─── MultiSelectDropdown ───
 * Dropdown lọc đa-chọn: nút trigger (icon + nhãn rút gọn + badge đếm + chevron) và
 * panel danh sách toggle được, có hàng "Chọn tất cả" riêng. Khác với `Dropdown`
 * (đơn-chọn, tự đóng sau khi chọn), panel ở đây giữ mở khi chọn nhiều mục liên tiếp.
 */

export interface MultiSelectDropdownOption {
  key: string;
  label: string;
  checked: boolean;
}

export interface MultiSelectDropdownProps {
  icon?: React.ReactNode;
  triggerLabel: string;
  count?: number;
  allLabel?: string;
  allChecked?: boolean;
  onToggleAll?: () => void;
  options: MultiSelectDropdownOption[];
  onToggleOption: (key: string) => void;
  align?: 'left' | 'right';
  panelWidthClass?: string;
  className?: string;
}

const ToggleDot: React.FC<{ checked: boolean }> = ({ checked }) => (
  <span
    aria-hidden="true"
    className={cn(
      'relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200',
      checked ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'
    )}
  >
    <span
      className={cn(
        'inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200',
        checked ? 'translate-x-3' : 'translate-x-0'
      )}
    />
  </span>
);

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  icon,
  triggerLabel,
  count,
  allLabel,
  allChecked = false,
  onToggleAll,
  options,
  onToggleOption,
  align = 'right',
  panelWidthClass = 'w-64',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn('relative w-full sm:w-auto min-w-0', className)}>
      <Button
        variant="unstyled"
        size="none"
        onClick={toggle}
        className="w-full h-full flex items-center justify-between gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {icon}
          <span className="truncate text-left max-w-[100px] sm:max-w-[160px]">{triggerLabel}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {typeof count === 'number' && (
            <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 rounded-full px-1.5 py-0.5">{count}</span>
          )}
          <ChevronDown size={16} className={cn('text-slate-400 transition-transform duration-200', isOpen && 'rotate-180')} />
        </div>
      </Button>
      {isOpen && (
        <div
          className={cn(
            'absolute top-[calc(100%+8px)] z-[var(--p-z-dropdown)] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 max-h-72 overflow-y-auto custom-scrollbar animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0',
            panelWidthClass
          )}
        >
          <div className="space-y-0.5">
            {allLabel && onToggleAll && (
              <div
                role="button"
                tabIndex={0}
                onClick={onToggleAll}
                onKeyDown={onActivateKey(onToggleAll)}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-xs font-black text-sky-600 dark:text-sky-400">{allLabel}</span>
                <ToggleDot checked={allChecked} />
              </div>
            )}
            {options.map(opt => (
              <div
                key={opt.key}
                role="button"
                tabIndex={0}
                onClick={() => onToggleOption(opt.key)}
                onKeyDown={onActivateKey(() => onToggleOption(opt.key))}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{opt.label}</span>
                <ToggleDot checked={opt.checked} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

MultiSelectDropdown.displayName = 'MultiSelectDropdown';
