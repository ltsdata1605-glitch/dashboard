import React from 'react';
import { cn } from './utils';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { AppIcon } from './icon/AppIcon';

/* ─── DataTable ─── */

export type SortDirection = 'asc' | 'desc' | null;

export interface DataTableColumn<T = unknown> {
  /** Unique column key */
  id: string;
  /** Header label */
  header: React.ReactNode;
  /** Cell renderer */
  cell: (row: T, index: number) => React.ReactNode;
  /** Header group label */
  group?: string;
  /** Header group color */
  groupColor?: 'sky' | 'emerald' | 'amber' | 'rose' | 'slate';
  /** Column width */
  width?: string;
  /** Min width */
  minWidth?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Header text alignment override (defaults to `align`) */
  headerAlign?: 'left' | 'center' | 'right';
  /** Sticky left column */
  sticky?: boolean;
  /** Sortable */
  sortable?: boolean;
  /** Hide on mobile */
  hideMobile?: boolean;
  /** Custom className for all cells in this column */
  className?: string;
}

export interface DataTableProps<T = unknown> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Row key extractor */
  rowKey: (row: T, index: number) => string | number;
  /** Loading state */
  isLoading?: boolean;
  /** Loading rows count */
  loadingRows?: number;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state icon */
  emptyIcon?: React.ReactNode;
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Current sort column */
  sortColumn?: string;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Sort change handler */
  onSort?: (columnId: string, direction: SortDirection) => void;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Row highlight condition */
  isRowHighlighted?: (row: T, index: number) => boolean;
  /** Footer row */
  footer?: React.ReactNode;
  /** Compact mode */
  compact?: boolean;
  /** Show a light vertical divider between columns */
  columnDividers?: boolean;
  /** Additional className */
  className?: string;
  /** Max height with scroll */
  maxHeight?: string;
  /** Cho phép phần tử con (như dropdown/popover) overflow tự do, không sinh thanh cuộn */
  overflowVisible?: boolean;
  /** Cố định layout bảng (table-fixed) để các cột luôn thẳng hàng tuyệt đối giữa các bảng khác nhau */
  fixedLayout?: boolean;
  /** Custom className cho thẻ table */
  tableClassName?: string;
  /** Tùy biến HTML attributes cho từng thẻ <tr> (ví dụ: draggable, event drag & drop, className...) */
  rowProps?: (row: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
}

/* Group header color map */
const groupColorClasses: Record<string, string> = {
  sky:     'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
  amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  rose:    'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300',
  slate:   'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
};

const SortIcon: React.FC<{ direction: SortDirection; active: boolean }> = ({ direction, active }) => {
  if (!active || !direction) {
    return <AppIcon name="sort" size="xs" className="text-slate-300" />;
  }
  return direction === 'asc'
    ? <AppIcon name="sortAsc" size="xs" className="text-sky-500" />
    : <AppIcon name="sortDesc" size="xs" className="text-sky-500" />;
};

/** true khi viewport ≥ 1024px (breakpoint `lg` — cùng ngưỡng với lớp `hidden lg:table-cell`). */
function useIsLgUp(): boolean {
  const query = '(min-width: 1024px)';
  const [matches, setMatches] = React.useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : true
  );
  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return matches;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  loadingRows = 5,
  emptyMessage = 'Không có dữ liệu',
  emptyIcon,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  stickyHeader = true,
  isRowHighlighted,
  footer,
  compact = false,
  columnDividers = false,
  className,
  maxHeight,
  overflowVisible = false,
  fixedLayout = false,
  tableClassName,
  rowProps,
}: DataTableProps<T>) {
  // Cột `hideMobile` bị ẩn bằng CSS dưới `lg` — nhóm cột phải tính colSpan theo số cột ĐANG HIỆN,
  // nếu không dải nhóm lệch sang phải so với cột bên dưới trên điện thoại (audit A18, 2026-09-29).
  const isDesktop = useIsLgUp();

  // Build group headers
  const groups = React.useMemo(() => {
    const result: { label: string; color: string; colSpan: number; mobileSpan: number }[] = [];
    let currentGroup = '';
    let currentSpan = 0;
    let currentMobileSpan = 0;
    let currentColor = 'slate';
    columns.forEach((col, i) => {
      const group = col.group || '';
      if (group === currentGroup) {
        currentSpan++;
        if (!col.hideMobile) currentMobileSpan++;
      } else {
        if (currentSpan > 0) result.push({ label: currentGroup, color: currentColor, colSpan: currentSpan, mobileSpan: currentMobileSpan });
        currentGroup = group;
        currentColor = col.groupColor || 'slate';
        currentSpan = 1;
        currentMobileSpan = col.hideMobile ? 0 : 1;
      }
      if (i === columns.length - 1) {
        result.push({ label: currentGroup, color: currentColor, colSpan: currentSpan, mobileSpan: currentMobileSpan });
      }
    });
    return result;
  }, [columns]);

  const hasGroups = groups.some(g => g.label);

  const handleSort = React.useCallback((col: DataTableColumn<T>) => {
    if (!col.sortable || !onSort) return;
    const newDirection: SortDirection =
      sortColumn === col.id
        ? (sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc')
        : 'asc';
    onSort(col.id, newDirection);
  }, [sortColumn, sortDirection, onSort]);

  // `table-fixed` BỎ QUA `minWidth` của cột: cột không có `width` chỉ nhận phần còn thừa sau các
  // cột cố định. Trên iPhone (393px) bảng Target Thi đua (4 cột ~100px + cột tên minWidth 180px)
  // bóp cột tên còn ~60px → tên chương trình đè lên cột "Gốc". Đặt bề rộng tối thiểu của bảng =
  // tổng độ rộng các cột để bảng CUỘN NGANG trong khung thay vì bóp cột.
  const fixedMinWidth = React.useMemo(() => {
    if (!fixedLayout) return undefined;
    const total = columns.reduce((sum, col) => {
      const px = parseFloat(col.width || col.minWidth || '');
      return sum + ((col.width || col.minWidth || '').endsWith('px') && !isNaN(px) ? px : 0);
    }, 0);
    return total > 0 ? `${total}px` : undefined;
  }, [columns, fixedLayout]);

  const cellPadding = compact ? 'px-2 py-1.5' : 'px-3 py-2.5';
  const headerPadding = compact ? 'px-2 py-1.5' : 'px-3 py-2';

  return (
    <div
      className={cn(
        'w-full rounded-card border border-slate-200 dark:border-slate-700/50',
        overflowVisible ? 'overflow-visible' : 'overflow-hidden',
        className
      )}
      // overflowVisible: không có khung cuộn trong → giữ cách cũ (cuộn dọc ở khung ngoài).
      style={maxHeight && overflowVisible ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      {/* Audit A18: `stickyHeader` trước đây không được dùng tới — và dù có dùng, khung cuộn dọc nằm ở
          div NGOÀI còn div trong (overflow-x-auto) mới là khung cuộn gần nhất của thead, nên sticky không
          bám được. Nay chiều cao tối đa đặt ở CHÍNH khung cuộn trong. */}
      <div
        className={overflowVisible ? 'overflow-visible' : 'overflow-x-auto custom-scrollbar'}
        style={maxHeight && !overflowVisible ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        <table className={cn('w-full border-collapse', fixedLayout && 'table-fixed', tableClassName)} style={fixedMinWidth ? { minWidth: fixedMinWidth } : undefined}>
          <thead className={cn(stickyHeader && !overflowVisible && 'sticky top-0 z-10 bg-white dark:bg-slate-900')}>
            {/* Group Headers */}
            {hasGroups && (
              <tr>
                {groups.map((g, i) => (
                  <th
                    key={`g-${i}`}
                    colSpan={isDesktop ? g.colSpan : Math.max(1, g.mobileSpan)}
                    className={cn(
                      g.mobileSpan === 0 && 'hidden lg:table-cell',
                      'text-[11px] font-bold uppercase tracking-wider text-center border-b border-slate-200 dark:border-slate-700/50 py-1.5 px-2',
                      g.label ? groupColorClasses[g.color] || groupColorClasses.slate : 'bg-transparent'
                    )}
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
            )}

            {/* Column Headers */}
            <tr className="bg-slate-50 dark:bg-slate-800/60">
              {columns.map((col, i) => (
                <th
                  key={col.id}
                  className={cn(
                    'text-[11px] font-bold uppercase tracking-wider',
                    'border-b border-slate-200 dark:border-slate-700/50',
                    'text-slate-500 dark:text-slate-400 whitespace-nowrap',
                    headerPadding,
                    (col.headerAlign ?? col.align) === 'right' ? 'text-right' : (col.headerAlign ?? col.align) === 'center' ? 'text-center' : 'text-left',
                    col.sticky && 'sticky left-0 z-20 bg-slate-50 dark:bg-slate-800/60',
                    col.sortable && 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 transition-colors',
                    col.hideMobile && 'hidden lg:table-cell',
                    columnDividers && i > 0 && 'border-l border-slate-200 dark:border-slate-700/50',
                    col.className
                  )}
                  style={{
                    width: col.width,
                    minWidth: col.minWidth,
                  }}
                  onClick={() => col.sortable && handleSort(col)}
                  // Audit A19: sắp xếp được bằng bàn phím + trình đọc màn hình biết chiều đang sắp.
                  tabIndex={col.sortable && onSort ? 0 : undefined}
                  onKeyDown={col.sortable && onSort ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(col); }
                  } : undefined}
                  aria-sort={col.sortable ? (sortColumn === col.id && sortDirection === 'asc' ? 'ascending' : sortColumn === col.id && sortDirection === 'desc' ? 'descending' : 'none') : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <SortIcon
                        direction={sortColumn === col.id ? (sortDirection ?? null) : null}
                        active={sortColumn === col.id}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Loading State */}
            {isLoading && Array.from({ length: loadingRows }).map((_, ri) => (
              <tr key={`loading-${ri}`}>
                {columns.map(col => (
                  <td key={col.id} className={cn(cellPadding, col.hideMobile && 'hidden lg:table-cell')}>
                    <Skeleton height="14px" width={`${50 + Math.random() * 50}%`} />
                  </td>
                ))}
              </tr>
            ))}

            {/* Empty State */}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyMessage}
                    compact
                  />
                </td>
              </tr>
            )}

            {/* Data Rows */}
            {!isLoading && data.map((row, ri) => {
              const customRowProps = rowProps ? rowProps(row, ri) : undefined;
              const { className: customRowClassName, onClick: customOnClick, ...restRowProps } = customRowProps || {};
              return (
                <tr
                  key={rowKey(row, ri)}
                  className={cn(
                    'border-b border-slate-100 dark:border-slate-800/50 last:border-b-0',
                    'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors',
                    onRowClick && 'cursor-pointer',
                    isRowHighlighted?.(row, ri) && 'bg-sky-50/50 dark:bg-sky-500/5',
                    customRowClassName
                  )}
                  onClick={(e) => {
                    customOnClick?.(e);
                    if (!e.defaultPrevented) {
                      onRowClick?.(row, ri);
                    }
                  }}
                  {...restRowProps}
                >
                  {columns.map((col, i) => (
                  <td
                    key={col.id}
                    className={cn(
                      'text-sm text-slate-700 dark:text-slate-300',
                      cellPadding,
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      col.sticky && 'sticky left-0 z-10 bg-white dark:bg-slate-900',
                      col.hideMobile && 'hidden lg:table-cell',
                      columnDividers && i > 0 && 'border-l border-slate-100 dark:border-slate-800/50',
                      col.className
                    )}
                    style={{
                      width: col.width,
                      minWidth: col.minWidth,
                    }}
                  >
                    {col.cell(row, ri)}
                  </td>
                ))}
              </tr>
            );
          })}
          </tbody>

          {/* Footer */}
          {footer && (
            <tfoot>
              {footer}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

DataTable.displayName = 'DataTable';
