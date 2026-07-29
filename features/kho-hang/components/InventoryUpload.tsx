import React, { useRef, useState } from 'react';
import { Button } from '@/components/shared/ui/Button';
import { validateFile, parseExcelFile } from '../utils/excelParser';
import { InventoryItem } from '../types/inventory';
import { AlertCircle, Upload, Loader } from 'lucide-react';

interface InventoryUploadProps {
  onUpload: (items: InventoryItem[], maKho: number) => void;
  onError: (error: string) => void;
  isLoading?: boolean;
}

export const InventoryUpload: React.FC<InventoryUploadProps> = ({
  onUpload,
  onError,
  isLoading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalLoading(true);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      onError(validationError);
      setLocalLoading(false);
      return;
    }

    // Parse file
    const result = await parseExcelFile(file);

    if (!result.success || !result.data) {
      onError(result.error || 'Lỗi phân tích file');
      setLocalLoading(false);
      return;
    }

    // Get maKho from first item (assume same kho for all items in file)
    const maKho = result.data[0]?.maKho;
    if (!maKho) {
      onError('File không chứa thông tin mã siêu thị hợp lệ');
      setLocalLoading(false);
      return;
    }

    setSelectedFileName(file.name);
    onUpload(result.data, maKho);
    setLocalLoading(false);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loading = isLoading || localLoading;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex-1">
        <label
          htmlFor="file-upload"
          className="flex cursor-pointer items-center gap-2"
        >
          <Upload className="h-5 w-5 text-sky-600" />
          <span className="font-medium text-slate-700">
            {loading ? (
              <span className="flex items-center gap-1">
                <Loader className="h-4 w-4 animate-spin" />
                Đang phân tích...
              </span>
            ) : selectedFileName ? (
              <span className="text-sm text-emerald-600">
                ✓ {selectedFileName} ({selectedFileName.split('.').pop()?.toUpperCase()})
              </span>
            ) : (
              'Nhập File Excel'
            )}
          </span>
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={loading}
            className="sr-only"
          />
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Chọn file Excel tồn kho (.xlsx hoặc .xls, tối đa 50MB)
        </p>
      </div>

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        variant="secondary"
        size="sm"
      >
        {loading ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            Đang tải...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Chọn File
          </>
        )}
      </Button>
    </div>
  );
};
