import { useCallback } from 'react';
import { InventoryItem } from '../types/inventory';

interface UseQRScanProps {
  items: InventoryItem[];
  onScanSuccess: (itemId: string) => void;
  onScanError: (message: string) => void;
}

export const useQRScan = ({
  items,
  onScanSuccess,
  onScanError,
}: UseQRScanProps) => {
  // Extract IMEI from QR code (support hybrid formats)
  const extractIMEI = useCallback((data: string): string => {
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

    // Format 3: Try to extract IMEI pattern from any data
    const match = data.match(/[A-Z0-9]{10,20}/i);
    if (match) {
      return match[0];
    }

    return data.trim();
  }, []);

  // Find item by IMEI
  const findItemByIMEI = useCallback(
    (imei: string): InventoryItem | undefined => {
      return items.find(
        (item) => item.imei.toUpperCase() === imei.toUpperCase()
      );
    },
    [items]
  );

  // Main scan function
  const scan = useCallback(
    (rawData: string): boolean => {
      if (!rawData.trim()) {
        onScanError('Vui lòng nhập IMEI');
        return false;
      }

      // Extract IMEI from raw data
      const imei = extractIMEI(rawData);

      if (!imei) {
        onScanError('Không thể nhận diện IMEI từ dữ liệu');
        return false;
      }

      // Find matching item
      const item = findItemByIMEI(imei);

      if (!item) {
        onScanError(`IMEI ${imei} không tìm thấy trong kho`);
        return false;
      }

      // Call callback on success
      onScanSuccess(item.id);
      return true;
    },
    [extractIMEI, findItemByIMEI, onScanSuccess, onScanError]
  );

  return {
    scan,
    extractIMEI,
    findItemByIMEI,
  };
};
