import React from 'react';
import { InventoryItem, CheckingItem } from '../types/inventory';
import { Button } from '@/components/shared/ui/Button';
import { Input } from '@/components/shared/ui/Input';
import { DataTable, type DataTableColumn } from '@/components/shared/ui/DataTable';
import { ChevronLeft, ChevronRight, Copy, PackageSearch } from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  checkingData: Record<string, CheckingItem>;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateNote: (itemId: string, note: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  checkingData,
  onUpdateQuantity,
  onUpdateNote,
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
}) => {
  const handleCopyIMEI = (imei: string) => {
    navigator.clipboard.writeText(imei);
  };

  const getChenhDiffColor = (diff: number) => {
    if (diff === 0) return 'text-emerald-600 bg-emerald-50';
    if (diff < 0) return 'text-rose-600 bg-rose-50';
    return 'text-amber-600 bg-amber-50';
  };

  const columns: DataTableColumn<InventoryItem>[] = [
    {
      id: 'sku',
      header: 'Mã SKU',
      cell: (item) => <span className="font-mono text-xs text-slate-600">{item.maSanPham}</span>,
    },
    {
      id: 'ten',
      header: 'Tên Sản Phẩm',
      minWidth: '180px',
      cell: (item) => (
        <div className="max-w-xs truncate" title={item.tenSanPham}>
          {item.tenSanPham}
        </div>
      ),
    },
    {
      id: 'imei',
      header: 'IMEI',
      hideMobile: true,
      cell: (item) => (
        <div className="flex items-center gap-2">
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-600">
            {item.imei.substring(0, 10)}...
          </code>
          <Button
            type="button"
            variant="unstyled"
            size="none"
            onClick={() => handleCopyIMEI(item.imei)}
            className="text-slate-400 hover:text-slate-600"
            title="Copy IMEI"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      id: 'ton',
      header: 'Tồn KK',
      align: 'right',
      cell: (item) => <span className="text-slate-600">{item.soLuongTonKho}</span>,
    },
    {
      id: 'kiem',
      header: 'Kiểm',
      align: 'right',
      cell: (item) => (
        <Input
          type="number"
          min="0"
          max="999999"
          value={checkingData[item.id]?.soLuongKiemKe || 0}
          onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
          disabled={isLoading}
          className="w-16 text-right text-sm"
        />
      ),
    },
    {
      id: 'chenh',
      header: 'Chênh',
      align: 'right',
      cell: (item) => {
        const diff = checkingData[item.id]?.chieuThayCo ?? -item.soLuongTonKho;
        return (
          <span className={`inline-block rounded px-1.5 py-0.5 font-bold ${getChenhDiffColor(diff)}`}>
            {diff > 0 ? '+' : ''}{diff}
          </span>
        );
      },
    },
    {
      id: 'ghichu',
      header: 'Ghi Chú',
      hideMobile: true,
      minWidth: '140px',
      cell: (item) => (
        <Input
          type="text"
          placeholder="VD: Hư hỏng"
          value={checkingData[item.id]?.ghiChu || ''}
          onChange={(e) => onUpdateNote(item.id, e.target.value)}
          disabled={isLoading}
          className="text-xs"
        />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={items}
        rowKey={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="Không có sản phẩm nào khớp bộ lọc hiện tại"
        emptyIcon={<PackageSearch className="h-8 w-8" />}
      />

      {/* Pagination */}
      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-slate-600">
          Trang {currentPage}/{totalPages || 1} ({items.length} sản phẩm)
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Trước</span>
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, currentPage - 2) + i;
              if (page > totalPages) return null;
              return (
                <Button
                  key={page}
                  type="button"
                  variant="unstyled"
                  size="none"
                  onClick={() => onPageChange(page)}
                  className={`h-8 w-8 rounded text-xs font-medium ${
                    currentPage === page
                      ? 'bg-sky-600 text-white'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                  disabled={isLoading}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
            variant="outline"
            size="sm"
          >
            <span className="hidden sm:inline">Sau</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
