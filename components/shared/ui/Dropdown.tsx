import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn, onActivateKey } from './utils';
import { ChevronDown } from 'lucide-react';
import { Button } from './Button';

/* ─── Dropdown ─── */

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect: (id: string) => void;
  /** Alignment relative to trigger */
  align?: 'left' | 'right';
  /** Width of dropdown panel */
  width?: 'auto' | 'trigger' | string;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  onSelect,
  align = 'left',
  width = 'auto',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, close]);

  const handleSelect = useCallback((item: DropdownItem) => {
    if (item.disabled || item.divider) return;
    onSelect(item.id);
    close();
  }, [onSelect, close]);

  return (
    <div ref={containerRef} className={cn('relative inline-flex', className)}>
      {/* Trigger */}
      <div role="button" tabIndex={0} onClick={toggle} onKeyDown={onActivateKey(toggle)} className="cursor-pointer">
        {trigger}
      </div>

      {/* Panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-1.5 z-[var(--p-z-dropdown)]',
            'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
            'rounded-xl shadow-lg overflow-hidden',
            'animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0',
            width === 'auto' ? 'min-w-[180px]' : width === 'trigger' ? 'w-full' : ''
          )}
          style={width !== 'auto' && width !== 'trigger' ? { width } : undefined}
        >
          <div className="py-1 max-h-[280px] overflow-y-auto custom-scrollbar">
            {items.map((item, idx) => {
              if (item.divider) {
                return <div key={`d-${idx}`} className="h-px bg-slate-100 dark:bg-slate-700 my-1" />;
              }
              return (
                <Button
                  variant="unstyled" size="none"
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  disabled={item.disabled}
                  className={cn(
                    'justify-start w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                    item.danger
                      ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50',
                    item.disabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {item.icon && <span className="shrink-0 w-4 h-4 flex items-center justify-center">{item.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

Dropdown.displayName = 'Dropdown';

/* ─── Simple DropdownButton trigger ─── */

export interface DropdownButtonProps {
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({ label, icon, className }) => (
  <Button
    variant="unstyled" size="none"
    className={cn(
      'inline-flex items-center gap-1.5 px-3 h-9 text-sm font-medium',
      'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
      'rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700',
      'text-slate-700 dark:text-slate-300 transition-colors',
      className
    )}
  >
    {icon && <span className="shrink-0">{icon}</span>}
    <span className="truncate">{label}</span>
    <ChevronDown size={14} className="shrink-0 text-slate-400" />
  </Button>
);

DropdownButton.displayName = 'DropdownButton';
