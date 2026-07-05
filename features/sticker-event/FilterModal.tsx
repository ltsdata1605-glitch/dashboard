import React from 'react';
import { X } from 'lucide-react';
import InventoryToolbar, { SortField, SortDirection } from './InventoryToolbar';
import { Button } from '../../components/shared/ui/Button';
import { InventoryItem } from './types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  inventory,
  filters,
  useInventoryQuantity,
  onFilterChange,
  onClearFilters,
  onUseInventoryQuantityChange,
  sortField,
  sortDirection,
  onSortChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">Bộ lọc & Sắp xếp</h2>
          <Button
            variant="ghost"
            onClick={onClose}
            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <InventoryToolbar
            inventory={inventory}
            filters={filters}
            useInventoryQuantity={useInventoryQuantity}
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
            onUseInventoryQuantityChange={onUseInventoryQuantityChange}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
          />
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md"
          >
            Xong
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
