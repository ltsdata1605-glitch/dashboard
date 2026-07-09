import React from 'react';
import { cn } from './utils';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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
  /** Additional className */
  className?: string;
  /** Max height with scroll */
  maxHeight?: string;
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
    return <ArrowUpDown size={12} className="text-slate-300 dark:text-slate-600" />;
  }
  return direction === 'asc'
    ? <ArrowUp size={12} className="text-sky-500" />
    : <ArrowDown size={12} className="text-sky-500" />;
};

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
  className,
  maxHeight,
}: DataTableProps<T>) {
  // Build group headers
  const groups = React.useMemo(() => {
    const result: { label: string; color: string; colSpan: number }[] = [];
    let currentGroup = '';
    let currentSpan = 0;
    let currentColor = 'slate';
    columns.forEach((col, i) => {
      const group = col.group || '';
      if (group === currentGroup) {
        currentSpan++;
      } else {
        if (currentSpan > 0) result.push({ label: currentGroup, color: currentColor, colSpan: currentSpan });
        currentGroup = group;
        currentColor = col.groupColor || 'slate';
        currentSpan = 1;
      }
      if (i === columns.length - 1) {
        result.push({ label: currentGroup, color: currentColor, colSpan: currentSpan });
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

  const cellPadding = compact ? 'px-2 py-1.5' : 'px-3 py-2.5';
  const headerPadding = compact ? 'px-2 py-1.5' : 'px-3 py-2';

  return (
    <div
      className={cn('w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/50', className)}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            {/* Group Headers */}
            {hasGroups && (
              <tr>
                {groups.map((g, i) => (
                  <th
                    key={`g-${i}`}
                    colSpan={g.colSpan}
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider text-center border-b border-slate-200 dark:border-slate-700/50 py-1.5 px-2',
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
              {columns.map(col => (
                <th
                  key={col.id}
                  className={cn(
                    'text-[11px] font-bold uppercase tracking-wider',
                    'border-b border-slate-200 dark:border-slate-700/50',
                    'text-slate-500 dark:text-slate-400 whitespace-nowrap',
                    headerPadding,
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.sticky && 'sticky left-0 z-20 bg-slate-50 dark:bg-slate-800/60',
                    col.sortable && 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 transition-colors',
                    col.hideMobile && 'hidden lg:table-cell',
                    col.className
                  )}
                  style={{
                    width: col.width,
                    minWidth: col.minWidth,
                  }}
                  onClick={() => col.sortable && handleSort(col)}
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
            {!isLoading && data.map((row, ri) => (
              <tr
                key={rowKey(row, ri)}
                className={cn(
                  'border-b border-slate-100 dark:border-slate-800/50 last:border-b-0',
                  'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors',
                  onRowClick && 'cursor-pointer',
                  isRowHighlighted?.(row, ri) && 'bg-sky-50/50 dark:bg-sky-500/5'
                )}
                onClick={() => onRowClick?.(row, ri)}
              >
                {columns.map(col => (
                  <td
                    key={col.id}
                    className={cn(
                      'text-sm text-slate-700 dark:text-slate-300',
                      cellPadding,
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      col.sticky && 'sticky left-0 z-10 bg-white dark:bg-slate-900',
                      col.hideMobile && 'hidden lg:table-cell',
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
            ))}
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
