import React from 'react';
import InventoryToolbar, { SortField, SortDirection } from './InventoryToolbar';
import { Button } from '../../components/shared/ui/Button';
import { Modal } from '../../components/shared/ui/Modal';
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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bộ lọc & Sắp xếp"
      titleColorClass="text-slate-900"
      maxWidth="2xl"
      footer={
        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md"
          >
            Xong
          </Button>
        </div>
      }
    >
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
    </Modal>
  );
};

export default FilterModal;
