import React, { useState } from 'react';
import { useInventoryData } from './hooks/useInventoryData';
import { useQRScan } from './hooks/useQRScan';
import { InventoryUpload } from './components/InventoryUpload';
import { InventoryFilters } from './components/InventoryFilters';
import { InventoryTable } from './components/InventoryTable';
import { InventoryStats } from './components/InventoryStats';
import { QRScannerInput } from './components/QRScannerInput';
import { Button } from '@/components/shared/ui/Button';
import { ConfirmDialog } from '@/components/shared/ui/ConfirmDialog';
import { ExternalLink, Trash2 } from 'lucide-react';
import type { InventoryItem } from './types/inventory';

export const InventoryView: React.FC = () => {
  const inventory = useInventoryData();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // QR Scan hook
  const qrScan = useQRScan({
    items: inventory.items,
    onScanSuccess: (itemId) => {
      inventory.scanIMEI(
        inventory.items.find((i) => i.id === itemId)?.imei || ''
      );
      showToast('success', `✅ Scan thành công`);
    },
    onScanError: (message) => {
      showToast('error', `⚠️ ${message}`);
    },
  });

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpload = (items: InventoryItem[], maKho: number) => {
    inventory.uploadItems(items, maKho);
    showToast('success', `✅ Đã tải ${items.length} sản phẩm`);
  };

  const handleError = (error: string) => {
    showToast('error', `❌ ${error}`);
  };

  const handleClearData = () => {
    inventory.clearData();
    setShowClearConfirm(false);
    showToast('success', '✅ Đã xóa dữ liệu');
  };

  const hasData = inventory.items.length > 0;

  return (
    <div className="space-y-4 p-4">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-white shadow-lg ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500'
              : toastMessage.type === 'error'
                ? 'bg-rose-500'
                : 'bg-amber-500'
          }`}
        >
          {toastMessage.message}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg bg-white p-4 lg:flex-row lg:items-center">
        <InventoryUpload
          onUpload={handleUpload}
          onError={handleError}
          isLoading={inventory.isLoading}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://report.mwgroup.vn/home/dashboard/6', '_blank')}
            className="text-xs"
          >
            <ExternalLink className="h-4 w-4" />
            Mở Report
          </Button>

          {hasData && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={inventory.isLoading}
              className="text-xs"
            >
              <Trash2 className="h-4 w-4" />
              Xóa Dữ Liệu
            </Button>
          )}
        </div>
      </div>

      {hasData ? (
        <>
          {/* Stats */}
          <InventoryStats stats={inventory.stats} />

          {/* QR Scanner */}
          <QRScannerInput
            onScan={qrScan.scan}
            isLoading={inventory.isLoading}
          />

          {/* Filters */}
          <InventoryFilters
            filters={inventory.filters}
            onFiltersChange={inventory.updateFilters}
            filterOptions={inventory.filterOptions}
            isLoading={inventory.isLoading}
          />

          {/* Table */}
          <InventoryTable
            items={inventory.paginatedItems}
            checkingData={inventory.checkingData}
            onUpdateQuantity={inventory.updateQuantity}
            onUpdateNote={inventory.updateCheckingNote}
            currentPage={inventory.currentPage}
            totalPages={inventory.totalPages}
            onPageChange={inventory.setCurrentPage}
            isLoading={inventory.isLoading}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <div className="text-4xl">📦</div>
          <p className="mt-2 text-lg font-medium text-slate-700">Chưa có dữ liệu kiểm kê</p>
          <p className="mt-1 text-sm text-slate-500">
            Hãy nhập file tồn kho Excel để bắt đầu kiểm kê
          </p>
        </div>
      )}

      {/* Clear Confirm Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="⚠️ Xóa toàn bộ dữ liệu?"
        message={`Bạn sẽ xóa ${inventory.items.length} sản phẩm đã tải. Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={handleClearData}
        onClose={() => setShowClearConfirm(false)}
        variant="danger"
      />
    </div>
  );
};

export default InventoryView;
