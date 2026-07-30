import React, { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/shared/ui/Input';
import { Button } from '@/components/shared/ui/Button';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';

interface QRScannerInputProps {
  onScan: (imei: string) => boolean; // returns true if found
  isLoading?: boolean;
}

export const QRScannerInput: React.FC<QRScannerInputProps> = ({
  onScan,
  isLoading = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [lastScanResult, setLastScanResult] = useState<{
    status: 'success' | 'error' | null;
    message?: string;
  }>({ status: null });
  const [scanCount, setScanCount] = useState(0);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Extract IMEI from QR code data (support 2 formats)
  const extractIMEI = (data: string): string => {
    // Format 1: Just IMEI (VD: 51134F31MF952)
    if (data.match(/^[A-Z0-9]{10,20}$/i)) {
      return data.trim();
    }

    // Format 2: SKU|IMEI (VD: 4844146000110|51134F31MF952)
    const parts = data.split('|');
    if (parts.length === 2) {
      const imei = parts[1]?.trim();
      if (imei && imei.match(/^[A-Z0-9]{10,20}$/i)) {
        return imei;
      }
    }

    // Format 3: Other formats - try to find IMEI pattern
    const match = data.match(/[A-Z0-9]{10,20}/i);
    if (match) {
      return match[0];
    }

    return data.trim();
  };

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();

    if (!inputValue.trim()) {
      setLastScanResult({ status: 'error', message: 'Vui lòng nhập IMEI' });
      setTimeout(() => setLastScanResult({ status: null }), 2000);
      return;
    }

    const imei = extractIMEI(inputValue);

    // Call onScan
    const found = onScan(imei);

    if (found) {
      setLastScanResult({
        status: 'success',
        message: `✓ Scan thành công (${scanCount + 1})`,
      });
      setScanCount((c) => c + 1);

      // Clear input & re-focus for next scan
      setInputValue('');
      inputRef.current?.focus();

      // Auto-hide success message
      setTimeout(() => setLastScanResult({ status: null }), 1500);
    } else {
      setLastScanResult({
        status: 'error',
        message: `⚠️ IMEI ${imei} không tìm thấy`,
      });

      // Clear input & re-focus
      setInputValue('');
      inputRef.current?.focus();

      // Auto-hide error message
      setTimeout(() => setLastScanResult({ status: null }), 2000);
    }
  };

  const handleReset = () => {
    setScanCount(0);
    setInputValue('');
    setLastScanResult({ status: null });
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-4">
      {/* Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Đặt con trỏ rồi quét QR hoặc gõ IMEI... (Enter để scan)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleScan}
          disabled={isLoading}
          className="border-sky-300 bg-white pl-4"
        />

        {/* Result indicator */}
        {lastScanResult.status && (
          <div
            className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 ${
              lastScanResult.status === 'success'
                ? 'text-emerald-600'
                : 'text-rose-600'
            }`}
          >
            {lastScanResult.status === 'success' ? (
              <CheckCircle className="h-4 w-4 animate-bounce" />
            ) : (
              <AlertCircle className="h-4 w-4 animate-pulse" />
            )}
          </div>
        )}

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-600">
            <Loader className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>

      {/* Message & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="min-w-0 flex-1">
          {lastScanResult.message && (
            <p
              className={`truncate ${
                lastScanResult.status === 'success'
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}
            >
              {lastScanResult.message}
            </p>
          )}
          {!lastScanResult.message && (
            <p className="truncate text-sky-600">
              💡 Quét QR code hoặc gõ IMEI để kiểm kê
            </p>
          )}
        </div>

        {scanCount > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-medium text-slate-700">
              Đã scan: <span className="text-sky-600">{scanCount}</span>
            </span>
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              🔄 Reset
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
