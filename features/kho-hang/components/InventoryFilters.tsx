import React, { useMemo, useState } from 'react';
import { Button } from '@/components/shared/ui/Button';
import { Input } from '@/components/shared/ui/Input';
import { FilterState } from '../types/inventory';
import { Search, X } from 'lucide-react';

interface FilterOption {
  khoList: number[];
  nganhList: string[];
  nhomList: string[];
  nhaCungCapList: string[];
  trangThaiSPList: string[];
}

interface InventoryFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  filterOptions: FilterOption;
  isLoading?: boolean;
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filters,
  onFiltersChange,
  filterOptions,
  isLoading = false,
}) => {
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({
    search: true,
    kho: false,
    nganh: false,
    nhom: false,
    nhaCungCap: false,
    trangThaiSP: false,
    trangThaiKiem: false,
  });

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchText ||
      filters.selectedKho.length > 0 ||
      filters.selectedNganh.length > 0 ||
      filters.selectedNhom.length > 0 ||
      filters.selectedNhaCungCap.length > 0 ||
      filters.selectedTrangThaiSP.length > 0 ||
      filters.selectedTrangThaiKiem.length > 0
    );
  }, [filters]);

  const toggleFilter = (key: string) => {
    setExpandedFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSearchChange = (text: string) => {
    onFiltersChange({ searchText: text });
  };

  const toggleMultiSelect = (
    key: keyof FilterState,
    value: any,
    currentList: any[]
  ) => {
    const newList = currentList.includes(value)
      ? currentList.filter((v) => v !== value)
      : [...currentList, value];

    onFiltersChange({ [key]: newList });
  };

  const handleClearAll = () => {
    onFiltersChange({
      searchText: '',
      selectedKho: [],
      selectedNganh: [],
      selectedNhom: [],
      selectedNhaCungCap: [],
      selectedTrangThaiSP: [],
      selectedTrangThaiKiem: [],
      priceRange: [0, 100000000],
      dateRange: [null, null],
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      {/* Search */}
      <div className="space-y-2">
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => toggleFilter('search')}
        >
          <label className="font-medium text-slate-700">
            🔍 Tìm kiếm
          </label>
        </div>
        {expandedFilters.search && (
          <div className="relative">
            <Input
              type="text"
              placeholder="Tên sản phẩm, mã, IMEI..."
              value={filters.searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              disabled={isLoading}
              className="pl-8"
            />
            {filters.searchText && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Siêu Thị */}
        <FilterSection
          label="🏪 Siêu Thị"
          expanded={expandedFilters.kho}
          onToggle={() => toggleFilter('kho')}
          isActive={filters.selectedKho.length > 0}
        >
          <div className="space-y-2">
            {filterOptions.khoList.map((kho) => (
              <label key={kho} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.selectedKho.includes(kho)}
                  onChange={() =>
                    toggleMultiSelect('selectedKho', kho, filters.selectedKho)
                  }
                  disabled={isLoading}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">Kho {kho}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Ngành Hàng */}
        <FilterSection
          label="📦 Ngành Hàng"
          expanded={expandedFilters.nganh}
          onToggle={() => toggleFilter('nganh')}
          isActive={filters.selectedNganh.length > 0}
        >
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {filterOptions.nganhList.map((nganh) => (
              <label key={nganh} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.selectedNganh.includes(nganh)}
                  onChange={() =>
                    toggleMultiSelect('selectedNganh', nganh, filters.selectedNganh)
                  }
                  disabled={isLoading}
                  className="rounded"
                />
                <span className="truncate text-xs text-slate-700">{nganh}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Nhóm Hàng */}
        <FilterSection
          label="📂 Nhóm Hàng"
          expanded={expandedFilters.nhom}
          onToggle={() => toggleFilter('nhom')}
          isActive={filters.selectedNhom.length > 0}
        >
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {filterOptions.nhomList.map((nhom) => (
              <label key={nhom} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.selectedNhom.includes(nhom)}
                  onChange={() =>
                    toggleMultiSelect('selectedNhom', nhom, filters.selectedNhom)
                  }
                  disabled={isLoading}
                  className="rounded"
                />
                <span className="truncate text-xs text-slate-700">{nhom}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Nhà Cung Cấp */}
        <FilterSection
          label="🏭 Nhà CC"
          expanded={expandedFilters.nhaCungCap}
          onToggle={() => toggleFilter('nhaCungCap')}
          isActive={filters.selectedNhaCungCap.length > 0}
        >
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {filterOptions.nhaCungCapList.map((cc) => (
              <label key={cc} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.selectedNhaCungCap.includes(cc)}
                  onChange={() =>
                    toggleMultiSelect('selectedNhaCungCap', cc, filters.selectedNhaCungCap)
                  }
                  disabled={isLoading}
                  className="rounded"
                />
                <span className="truncate text-xs text-slate-700">{cc}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Trạng Thái SP */}
        <FilterSection
          label="📊 Trạng Thái SP"
          expanded={expandedFilters.trangThaiSP}
          onToggle={() => toggleFilter('trangThaiSP')}
          isActive={filters.selectedTrangThaiSP.length > 0}
        >
          <div className="space-y-1">
            {filterOptions.trangThaiSPList.map((status) => (
              <label key={status} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.selectedTrangThaiSP.includes(status)}
                  onChange={() =>
                    toggleMultiSelect('selectedTrangThaiSP', status, filters.selectedTrangThaiSP)
                  }
                  disabled={isLoading}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">{status}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Trạng Thái Kiểm */}
        <FilterSection
          label="🔄 Trạng Thái Kiểm"
          expanded={expandedFilters.trangThaiKiem}
          onToggle={() => toggleFilter('trangThaiKiem')}
          isActive={filters.selectedTrangThaiKiem.length > 0}
        >
          <div className="space-y-1">
            {(['chua_kiem', 'da_kiem', 'hoan_thanh'] as const).map((status) => (
              <label key={status} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.selectedTrangThaiKiem.includes(status)}
                  onChange={() =>
                    toggleMultiSelect('selectedTrangThaiKiem', status, filters.selectedTrangThaiKiem)
                  }
                  disabled={isLoading}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">
                  {status === 'chua_kiem' && 'Chưa kiểm kê'}
                  {status === 'da_kiem' && 'Đã kiểm kê'}
                  {status === 'hoan_thanh' && 'Hoàn thành'}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>
      </div>

      {/* Clear All */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            onClick={handleClearAll}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
            Xóa Tất Cả Filter
          </Button>
        </div>
      )}
    </div>
  );
};

interface FilterSectionProps {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  isActive: boolean;
  children: React.ReactNode;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  label,
  expanded,
  onToggle,
  isActive,
  children,
}) => {
  return (
    <div className="space-y-1 rounded border border-slate-200 bg-slate-50 p-2">
      <button
        onClick={onToggle}
        className={`flex w-full items-center justify-between text-xs font-medium ${
          isActive ? 'text-sky-600' : 'text-slate-700'
        } hover:text-slate-900`}
      >
        {label}
        <span>{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && <div className="text-xs">{children}</div>}
    </div>
  );
};
