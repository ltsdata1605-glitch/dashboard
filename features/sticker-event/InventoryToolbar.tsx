import React, { useMemo, useState } from 'react';
import { AppIcon } from '../../components/shared/ui/icon/AppIcon';
import { InventoryItem, Product } from './types';
import SearchBar from './SearchBar';
import { Button } from '../../components/shared/ui/Button';
import { Checkbox } from '../../components/shared/ui/Checkbox';
import { Select } from '../../components/shared/ui/Select';
import { StringMultiSelect } from '../../components/shared/ui/StringMultiSelect';

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
      <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-popup px-2.5 py-1.5 shadow-2xs">
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
            variant={showFilters || activeFilterCount > 0 ? 'tinted' : 'secondary'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            icon="filter"
          >
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
            <Checkbox
              checked={useInventoryQuantity}
              onChange={(e) => onUseInventoryQuantityChange(e.target.checked)}
              label="Tồn kho"
              wrapperClassName="gap-1.5 shrink-0 px-1 py-1"
              labelClassName="text-xs font-semibold text-slate-700"
            />
          </>
        )}

        <div className="h-4 w-px bg-slate-300/60 dark:bg-slate-700 shrink-0" />

        {/* 4. Sort controls */}
        <div className="flex items-center gap-1 shrink-0">
          <AppIcon name="sort" size="sm" className="text-slate-400" />
          {/* GĐ10: ô chọn dùng chung — 32px trên laptop như nút "Bộ lọc" cạnh bên, 44px trên máy cảm ứng */}
          <Select
            fullWidth={false}
            aria-label="Sắp xếp theo"
            value={sortField}
            onChange={(e) => handleSortFieldChange(e.target.value as SortField)}
            className="h-8 pl-2 text-xs font-medium text-slate-700 border-slate-200"
            options={SORT_OPTIONS}
          />
          {sortField !== 'none' && (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onSortChange?.(sortField, sortDirection === 'asc' ? 'desc' : 'asc')}
              title={sortDirection === 'asc' ? 'Tăng dần' : 'Giảm dần'}
              aria-label={sortDirection === 'asc' ? 'Tăng dần' : 'Giảm dần'}
              className="text-xs font-bold"
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
            variant="inline-link"
            size="sm"
            onClick={() => { onClearFilters(); onSortChange?.('none', 'desc'); setShowFilters(false); }}
            className="text-xs text-rose-500 hover:text-rose-700 shrink-0 px-1 py-1"
          >
            Xóa lọc
          </Button>
        )}

        {/* 6. Export image button */}
        {onExportImage && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onExportImage}
            icon="exportImage"
            title="Xuất danh sách thành ảnh PNG"
            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
          >
            <span>Xuất ảnh</span>
          </Button>
        )}
      </div>

      {/* Collapsible filter row */}
      {showFilters && (
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-control px-2.5 py-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {options.maSieuThi.length > 0 && (
            <div className="flex-1 min-w-0">
              <StringMultiSelect
                variant="compact"
                label="Siêu thị"
                options={options.maSieuThi}
                selected={filters.maSieuThi}
                onChange={(values) => onFilterChange('maSieuThi', values)}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <StringMultiSelect
              variant="compact"
              label="Ngành hàng"
              options={options.nganhHang}
              selected={filters.nganhHang}
              onChange={(values) => onFilterChange('nganhHang', values)}
            />
          </div>
          <div className="flex-1 min-w-0">
            <StringMultiSelect
              variant="compact"
              label="Nhóm hàng"
              options={options.nhomHang}
              selected={filters.nhomHang}
              onChange={(values) => onFilterChange('nhomHang', values)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryToolbar;
