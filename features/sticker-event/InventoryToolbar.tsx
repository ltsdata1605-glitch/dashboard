import React, { useMemo, useState } from 'react';
import { InventoryItem } from './types';
import MultiSelectDropdown from './MultiSelectDropdown';
import { ArrowUpDown, Filter, ImageDown } from 'lucide-react';

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
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const options = useMemo(() => {
    const maSieuThi = Array.from(new Set(inventory.map(item => item.maSieuThi))).sort();
    const nganhHang = Array.from(new Set(inventory.map(item => item.nganhHang))).sort();
    if (hasManualProducts && !nganhHang.includes('Nhóm thủ công')) {
      nganhHang.unshift('Nhóm thủ công');
    }
    const nhomHang = Array.from(new Set(inventory.map(item => item.nhomHang))).sort();
    
    return { maSieuThi, nganhHang, nhomHang };
  }, [inventory, hasManualProducts]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.maSieuThi.length > 0) count++;
    if (filters.nganhHang.length > 0) count++;
    if (filters.nhomHang.length > 0) count++;
    return count;
  }, [filters]);

  if (inventory.length === 0) return null;

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
      <div className="flex items-center gap-2 flex-wrap bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 py-1.5">
        {/* BỘ LỌC toggle button */}
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 shrink-0 px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 hover:bg-slate-100'} border border-slate-200`}
        >
          <Filter className="w-3 h-3" />
          <span className="uppercase tracking-wider text-[10px]">Bộ lọc</span>
          {activeFilterCount > 0 && (
            <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-px rounded-full min-w-[16px] text-center leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="h-4 w-px bg-slate-300/60 shrink-0" />

        {/* Tồn kho checkbox */}
        <label className="flex items-center gap-1 cursor-pointer shrink-0">
          <input 
            type="checkbox" 
            checked={useInventoryQuantity}
            onChange={(e) => onUseInventoryQuantityChange(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
          />
          <span className="text-[11px] font-medium text-slate-600">Tồn kho</span>
        </label>

        <div className="h-4 w-px bg-slate-300/60 shrink-0" />

        {/* Sort controls */}
        <div className="flex items-center gap-1 shrink-0">
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
          <select
            value={sortField}
            onChange={(e) => handleSortFieldChange(e.target.value as SortField)}
            className="text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {sortField !== 'none' && (
            <button
              onClick={() => onSortChange?.(sortField, sortDirection === 'asc' ? 'desc' : 'asc')}
              className="flex items-center justify-center w-5 h-5 rounded bg-slate-200 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition-colors text-[10px] font-bold"
              title={sortDirection === 'asc' ? 'Tăng dần' : 'Giảm dần'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export image button */}
        {onExportImage && (
          <button
            onClick={onExportImage}
            className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            title="Xuất danh sách thành ảnh PNG"
          >
            <ImageDown className="w-3.5 h-3.5" />
            Xuất ảnh
          </button>
        )}

        {/* Clear button */}
        {(activeFilterCount > 0 || sortField !== 'none') && (
          <button 
            onClick={() => { onClearFilters(); onSortChange?.('none', 'desc'); setShowFilters(false); }}
            className="text-[10px] text-red-500 hover:text-red-700 font-medium shrink-0"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Collapsible filter row */}
      {showFilters && (
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex-1 min-w-0">
            <MultiSelectDropdown
              label=""
              options={options.maSieuThi}
              selectedValues={filters.maSieuThi}
              onChange={(values) => onFilterChange('maSieuThi', values)}
              placeholder="Siêu thị"
            />
          </div>
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
