import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn, onActivateKey } from './utils';
import { ChevronDown } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

/* ─── MultiSelectDropdown ───
 * Dropdown lọc đa-chọn: nút trigger (icon + nhãn rút gọn + badge đếm + chevron) và
 * panel danh sách toggle được, có hàng "Chọn tất cả" riêng. Khác với `Dropdown`
 * (đơn-chọn, tự đóng sau khi chọn), panel ở đây giữ mở khi chọn nhiều mục liên tiếp.
 *
 * Hỗ trợ thêm (tuỳ chọn, không phá vỡ các nơi đang dùng mặc định):
 * - `groups` thay cho `options` khi cần chia danh sách theo nhóm có tiêu đề (VD tiêu chí
 *   SLLK/DTLK/DTQĐ ở bộ lọc "chương trình thi đua").
 * - `searchValue`/`onSearchChange` để có ô tìm kiếm trong panel (danh sách dài).
 * - `usePortal` để panel render qua createPortal + theo dõi scroll/resize, dùng khi nút
 *   trigger nằm sâu trong container có thể bị cắt panel `absolute` thông thường.
 */

export interface MultiSelectDropdownOption {
  key: string;
  label: string;
  checked: boolean;
}

export interface MultiSelectDropdownGroup {
  key: string;
  label: string;
  options: MultiSelectDropdownOption[];
}

export interface MultiSelectDropdownProps {
  icon?: React.ReactNode;
  triggerLabel: string;
  iconOnly?: boolean;
  count?: number;
  allLabel?: string;
  allChecked?: boolean;
  onToggleAll?: () => void;
  /** Danh sách phẳng — bỏ qua nếu truyền `groups`. */
  options?: MultiSelectDropdownOption[];
  /** Danh sách chia nhóm có tiêu đề — ưu tiên hơn `options` nếu có. */
  groups?: MultiSelectDropdownGroup[];
  onToggleOption: (key: string) => void;
  align?: 'left' | 'right';
  panelWidthClass?: string;
  /** Mặc định `max-h-72`; panel `usePortal` thường cần cao hơn (VD `max-h-[80vh]`). */
  maxHeightClass?: string;
  className?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Render panel qua createPortal(document.body) + theo dõi scroll/resize thay vì `absolute`
   *  thường — dùng khi trigger nằm trong container có nguy cơ cắt mất panel. */
  usePortal?: boolean;
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

const OptionRow: React.FC<{ option: MultiSelectDropdownOption; onToggle: (key: string) => void }> = ({ option, onToggle }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onToggle(option.key)}
    onKeyDown={onActivateKey(() => onToggle(option.key))}
    className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
  >
    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate pr-2">{option.label}</span>
    <ToggleDot checked={option.checked} />
  </div>
);

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  icon,
  triggerLabel,
  iconOnly = false,
  count,
  allLabel,
  allChecked = false,
  onToggleAll,
  options,
  groups,
  onToggleOption,
  align = 'right',
  panelWidthClass = 'w-64',
  maxHeightClass = 'max-h-72',
  className,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  usePortal = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideTrigger && !insidePanel) setIsOpen(false);
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

  // Chế độ usePortal: panel render qua document.body (position: fixed), phải tự theo dõi
  // scroll/resize để bám theo nút trigger — trigger cuộn trong 1 container lồng nhau, panel
  // portal không tự cuộn theo cùng nếu không tính lại vị trí (xem lý do dùng usePortal ở
  // features/bi-dashboard/components/nhanvien/CompetitionTab.tsx, nơi pattern này ra đời).
  useEffect(() => {
    if (!isOpen || !usePortal) return;
    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setPortalStyle(
        align === 'right'
          ? { position: 'fixed', top: rect.bottom + 8, right: window.innerWidth - rect.right }
          : { position: 'fixed', top: rect.bottom + 8, left: rect.left }
      );
    };
    updatePosition();
    searchInputRef.current?.focus({ preventScroll: true });
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, usePortal, align]);

  useEffect(() => {
    if (isOpen && !usePortal) searchInputRef.current?.focus({ preventScroll: true });
  }, [isOpen, usePortal]);

  const panelContent = (
    <div
      ref={panelRef}
      style={usePortal ? portalStyle : undefined}
      className={cn(
        usePortal ? 'fixed' : cn('absolute top-[calc(100%+8px)]', align === 'right' ? 'right-0' : 'left-0'),
        'z-[var(--p-z-dropdown)] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col animate-fade-in',
        maxHeightClass,
        panelWidthClass
      )}
    >
      {onSearchChange && (
        <div className="p-2 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <Input
            ref={searchInputRef}
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 text-xs"
          />
        </div>
      )}
      <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 flex-1">
        {allLabel && onToggleAll && (
          <div
            role="button"
            tabIndex={0}
            onClick={onToggleAll}
            onKeyDown={onActivateKey(onToggleAll)}
            className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <span className="text-xs font-black text-sky-700 dark:text-sky-400">{allLabel}</span>
            <ToggleDot checked={allChecked} />
          </div>
        )}
        {groups
          ? groups.filter(g => g.options.length > 0).map(group => (
              <div key={group.key} className="pt-1.5 first:pt-0">
                <h5 className="px-2 py-1 mb-0.5 text-[11px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-wider bg-sky-50 dark:bg-sky-900/30 rounded-md">{group.label}</h5>
                <div className="space-y-0.5">
                  {group.options.map(opt => <OptionRow key={opt.key} option={opt} onToggle={onToggleOption} />)}
                </div>
              </div>
            ))
          : (options || []).map(opt => <OptionRow key={opt.key} option={opt} onToggle={onToggleOption} />)}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={cn('relative w-full sm:w-auto min-w-0', className)}>
      {iconOnly ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={triggerLabel}
          className={cn(
            'relative h-7 w-7 transition-colors',
            isOpen || (typeof count === 'number' && count > 0)
              ? 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          )}
        >
          {icon}
          {typeof count === 'number' && count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[11px] font-black text-white">
              {count}
            </span>
          )}
        </Button>
      ) : (
        <Button
          variant="unstyled"
          size="none"
          onClick={toggle}
          className="w-full h-full flex items-center justify-between gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            {icon}
            <span className="truncate text-left max-w-[80px] sm:max-w-[160px]">{triggerLabel}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-1.5 sm:ml-2">
            {typeof count === 'number' && (
              <span className="text-[11px] sm:text-[11px] font-black text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 rounded-full px-1.5 py-0.5">{count}</span>
            )}
            <ChevronDown size={14} className={cn('text-slate-400 transition-transform duration-200 sm:w-4 sm:h-4 w-3.5 h-3.5', isOpen && 'rotate-180')} />
          </div>
        </Button>
      )}
      {isOpen && (usePortal ? createPortal(panelContent, document.body) : panelContent)}
    </div>
  );
};

MultiSelectDropdown.displayName = 'MultiSelectDropdown';
