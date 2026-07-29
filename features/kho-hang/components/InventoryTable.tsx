import React from 'react';
import { InventoryItem, CheckingItem } from '../types/inventory';
import { Button } from '@/components/shared/ui/Button';
import { Input } from '@/components/shared/ui/Input';
import { ChevronLeft, ChevronRight, Trash2, Copy } from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  checkingData: Record<string, CheckingItem>;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateNote: (itemId: string, note: string) => void;
  onDeleteRow?: (itemId: string) => void;
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
  onDeleteRow,
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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-12 text-center">
        <p className="text-lg font-medium text-slate-700">📦 Chưa có dữ liệu kiểm kê</p>
        <p className="mt-1 text-sm text-slate-500">Nhập file tồn kho Excel để bắt đầu</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-100">
            <tr>
              <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-bold text-slate-700">
                Mã SKU
              </th>
              <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-bold text-slate-700">
                Tên Sản Phẩm
              </th>
              <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-bold text-slate-700">
                IMEI
              </th>
              <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-right font-bold text-slate-700">
                Tồn KK
              </th>
              <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-right font-bold text-slate-700">
                Kiểm
              </th>
              <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-right font-bold text-slate-700">
                Chênh
              </th>
              <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-bold text-slate-700">
                Ghi Chú
              </th>
              <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-center font-bold text-slate-700">
                Hành Động
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const checking = checkingData[item.id];
              const diff = checking?.chieuThayCo ?? -item.soLuongTonKho;

              return (
                <tr
                  key={item.id}
                  className={`border-b border-slate-200 hover:bg-slate-50 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  }`}
                >
                  {/* Mã SKU */}
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">
                    {item.maSanPham.substring(0, 13)}
                  </td>

                  {/* Tên SP */}
                  <td className="px-3 py-2">
                    <div className="max-w-xs truncate text-slate-700" title={item.tenSanPham}>
                      {item.tenSanPham.substring(0, 50)}
                      {item.tenSanPham.length > 50 ? '...' : ''}
                    </div>
                  </td>

                  {/* IMEI */}
                  <td className="px-3 py-2">
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
                  </td>

                  {/* Tồn KK */}
                  <td className="px-3 py-2 text-right text-slate-600">
                    {item.soLuongTonKho}
                  </td>

                  {/* Kiểm */}
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      max="999999"
                      value={checking?.soLuongKiemKe || 0}
                      onChange={(e) =>
                        onUpdateQuantity(item.id, parseInt(e.target.value) || 0)
                      }
                      disabled={isLoading}
                      className="w-16 text-right text-sm"
                    />
                  </td>

                  {/* Chênh */}
                  <td className={`px-3 py-2 text-right font-bold ${getChenhDiffColor(diff)}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </td>

                  {/* Ghi Chú */}
                  <td className="px-3 py-2">
                    <Input
                      type="text"
                      placeholder="VD: Hư hỏng"
                      value={checking?.ghiChu || ''}
                      onChange={(e) => onUpdateNote(item.id, e.target.value)}
                      disabled={isLoading}
                      className="text-xs"
                    />
                  </td>

                  {/* Hành Động */}
                  <td className="px-3 py-2 text-center">
                    {onDeleteRow && (
                      <Button
                        type="button"
                        variant="unstyled"
                        size="none"
                        onClick={() => onDeleteRow(item.id)}
                        className="text-rose-400 hover:text-rose-600"
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
        <span className="text-sm text-slate-600">
          Hiển thị trang {currentPage} của {totalPages} ({items.length} items)
        </span>

        <div className="flex gap-2">
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </Button>

          {/* Page numbers */}
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
            Sau
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
