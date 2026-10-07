import React, { useMemo, useState } from 'react';
import { AppIcon } from '../../components/shared/ui/icon/AppIcon';
import { InventoryItem, Product } from './types';
import MultiSelectDropdown from './MultiSelectDropdown';
import SearchBar from './SearchBar';
import { Button } from '../../components/shared/ui/Button';

export type SortField = 'none' | 'giaGoc' | 'giaGiam' | 'tongThuong' | 'discount' | 'tonKho' | 'sanPham';
export type SortDirection = 'asc' | 'desc';

interface InventoryToolbarProps {
  inventory: InventoryItem[];
  filters: {
    maSieuThi: string[];
    nganhHang: string[];
    nhomHang: string[];
    keyword: string;
  };
  useInventoryQuantity: boolean;
  onFilterChange: (key: string, value: string | string[]) => void;
  onClearFilters: () => void;
  onUseInventoryQuantityChange: (checked: boolean) => void;
  hasManualProducts?: boolean;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
  onExportImage?: () => void;

  // Tích hợp Tìm kiếm sản phẩm trực tiếp trên thanh lọc
  searchQuery?: string;
  onSearchChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenScanner?: () => void;
  searchDisabled?: boolean;
  suggestions?: Product[];
  onSuggestionClick?: (product: Product) => void;
  showNoResults?: boolean;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'none', label: 'Mặc định' },
  { value: 'giaGoc', label: 'Giá Gốc' },
  { value: 'giaGiam', label: 'Giá Đã Giảm' },
  { value: 'tongThuong', label: 'Thưởng' },
  { value: 'discount', label: '% Giảm giá' },
  { value: 'tonKho', label: 'Tồn kho' },
  { value: 'sanPham', label: 'Tên sản phẩm' },
];

const InventoryToolbar: React.FC<InventoryToolbarProps> = ({ 
  inventory, 
  filters, 
  useInventoryQuantity,
  onFilterChange,
  onClearFilters,
  onUseInventoryQuantityChange,
  hasManualProducts = false,
  sortField = 'none',
  sortDirection = 'desc',
  onSortChange,
  onExportImage,
  searchQuery,
  onSearchChange,
  onOpenScanner,
  searchDisabled,
  suggestions,
  onSuggestionClick,
  showNoResults,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const options = useMemo(() => {
    const maSieuThi = Array.from(new Set(inventory.map(item => item.maSieuThi).filter(Boolean))).sort();
    const nganhHang = Array.from(new Set(inventory.map(item => item.nganhHang).filter(Boolean))).sort();
    if (hasManualProducts && !nganhHang.includes('Nhóm thủ công')) {
      nganhHang.unshift('Nhóm thủ công');
    }
    const nhomHang = Array.from(new Set(inventory.map(item => item.nhomHang).filter(Boolean))).sort();
    
    return { maSieuThi, nganhHang, nhomHang };
  }, [inventory, hasManualProducts]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.maSieuThi.length > 0) count++;
    if (filters.nganhHang.length > 0) count++;
    if (filters.nhomHang.length > 0) count++;
    return count;
  }, [filters]);

  if (inventory.length === 0 && !onSearchChange) return null;

  const handleSortFieldChange = (field: SortField) => {
    if (!onSortChange) return;
    if (field === sortField && field !== 'none') {
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, field === 'sanPham' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="space-y-1.5">
      {/* Main row */}
      <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-2xs">
        {/* 1. Ô tìm kiếm sản phẩm (Được chuyển lên thanh lọc theo yêu cầu) */}
        {onSearchChange && (
          <div className="w-full sm:w-72 md:w-80 lg:w-84 xl:w-96 shrink-0">
            <SearchBar
              searchQuery={searchQuery || ''}
              onSearchChange={onSearchChange}
              onIconClick={onOpenScanner || (() => {})}
              disabled={!!searchDisabled}
              suggestions={suggestions || []}
              onSuggestionClick={onSuggestionClick || (() => {})}
              showNoResults={!!showNoResults}
              hideTitle={true}
              compact={true}
            />
          </div>
        )}

        {onSearchChange && inventory.length > 0 && (
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0 hidden sm:block" />
        )}

        {/* 2. Nút BỘ LỌC toggle button */}
        {inventory.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            className={`bg-transparent hover:bg-transparent border-0 rounded-none h-8 w-auto p-0 text-inherit flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'} border`}
          >
            <AppIcon name="filter" size="sm" />
            <span className="uppercase tracking-wider text-[11px]">Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="bg-sky-600 text-white text-[11px] font-bold px-1.5 py-px rounded-full min-w-[16px] text-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}

        {/* 3. Tồn kho checkbox */}
        {inventory.length > 0 && (
          <>
            <div className="h-4 w-px bg-slate-300/60 dark:bg-slate-700 shrink-0" />
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0 px-1 py-1">
              <input 
                type="checkbox" 
                checked={useInventoryQuantity}
                onChange={(e) => onUseInventoryQuantityChange(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tồn kho</span>
            </label>
          </>
        )}

        <div className="h-4 w-px bg-slate-300/60 dark:bg-slate-700 shrink-0" />

        {/* 4. Sort controls */}
        <div className="flex items-center gap-1 shrink-0">
          <AppIcon name="sort" size="sm" className="text-slate-400" />
          <select
            value={sortField}
            onChange={(e) => handleSortFieldChange(e.target.value as SortField)}
            className="text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 h-8 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 cursor-pointer"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {sortField !== 'none' && (
            <Button
              variant="ghost"
              onClick={() => onSortChange?.(sortField, sortDirection === 'asc' ? 'desc' : 'asc')}
              className="bg-transparent hover:bg-transparent border-0 rounded-none h-8 w-8 p-0 text-inherit flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 text-slate-600 hover:text-sky-700 transition-colors text-xs font-bold border border-slate-200 dark:border-slate-700"
              title={sortDirection === 'asc' ? 'Tăng dần' : 'Giảm dần'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </Button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* 5. Nút Clear bộ lọc */}
        {(activeFilterCount > 0 || sortField !== 'none') && (
          <Button
            variant="ghost"
            onClick={() => { onClearFilters(); onSortChange?.('none', 'desc'); setShowFilters(false); }}
            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit text-xs text-rose-500 hover:text-rose-700 font-medium shrink-0 px-1 py-1"
          >
            Xóa lọc
          </Button>
        )}

        {/* 6. Export image button */}
        {onExportImage && (
          <Button
            variant="ghost"
            onClick={onExportImage}
            className="bg-transparent hover:bg-transparent border-0 rounded-none h-8 w-auto p-0 text-inherit flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors"
            title="Xuất danh sách thành ảnh PNG"
          >
            <AppIcon name="imageDownload" size="sm" />
            <span>Xuất ảnh</span>
          </Button>
        )}
      </div>

      {/* Collapsible filter row */}
      {showFilters && (
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {options.maSieuThi.length > 0 && (
            <div className="flex-1 min-w-0">
              <MultiSelectDropdown
                label=""
                options={options.maSieuThi}
                selectedValues={filters.maSieuThi}
                onChange={(values) => onFilterChange('maSieuThi', values)}
                placeholder="Siêu thị"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <MultiSelectDropdown
              label=""
              options={options.nganhHang}
              selectedValues={filters.nganhHang}
              onChange={(values) => onFilterChange('nganhHang', values)}
              placeholder="Ngành hàng"
            />
          </div>
          <div className="flex-1 min-w-0">
            <MultiSelectDropdown
              label=""
              options={options.nhomHang}
              selectedValues={filters.nhomHang}
              onChange={(values) => onFilterChange('nhomHang', values)}
              placeholder="Nhóm hàng"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryToolbar;
