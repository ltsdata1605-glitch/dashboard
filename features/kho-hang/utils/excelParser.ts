import * as XLSX from 'xlsx';
import { InventoryItem, ExcelParseResult } from '../types/inventory';

// Tên cột trong file Excel (Excel column names from user's file)
const REQUIRED_COLUMNS = [
  'Mã siêu thị',
  'Tên siêu thị',
  'Thương hiệu công ty',
  'Ngành hàng',
  'Nhóm hàng',
  'Mã sản phẩm',
  'Tên sản phẩm',
  'Tên hình thức nhập',
  'Ngày nhập',
  'Số hóa đơn',
  'Ngày hóa đơn',
  'Nhà cung cấp',
  'IMEI_1',
  'Trạng thái sản phẩm',
  'Số lượng',
  'Giá vốn',
  'Giá nhập (Chưa VAT)',
];

export const parseExcelFile = (file: File): Promise<ExcelParseResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({ success: false, error: 'File không thể đọc được' });
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
          resolve({ success: false, error: 'File Excel không có sheet nào' });
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        // Validate columns
        if (rawData.length === 0) {
          resolve({ success: false, error: 'File Excel rỗng' });
          return;
        }

        const firstRow = rawData[0] as Record<string, unknown>;
        const fileColumns = Object.keys(firstRow);

        // Check required columns
        const missingColumns = REQUIRED_COLUMNS.filter(
          (col) => !fileColumns.includes(col)
        );

        if (missingColumns.length > 0) {
          resolve({
            success: false,
            error: `File không hợp lệ: Thiếu cột '${missingColumns[0]}'`,
          });
          return;
        }

        // Parse data
        const items: InventoryItem[] = [];
        let skipCount = 0;

        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i] as Record<string, unknown>;

          try {
            const maKho = parseNumber(row['Mã siêu thị']);
            const maSanPham = String(row['Mã sản phẩm'] || '').trim();
            const imei = String(row['IMEI_1'] || '').trim();

            // Validate bắt buộc
            if (!maKho || !maSanPham || !imei) {
              skipCount++;
              continue;
            }

            // Tạo unique ID
            const id = `${maKho}-${maSanPham}-${imei}`;

            const item: InventoryItem = {
              id,
              maKho,
              tenKho: String(row['Tên siêu thị'] || '').trim(),
              thuongHieuCongTy: String(row['Thương hiệu công ty'] || '').trim(),
              nganhHang: String(row['Ngành hàng'] || '').trim(),
              nhomHang: String(row['Nhóm hàng'] || '').trim(),
              maSanPham,
              tenSanPham: String(row['Tên sản phẩm'] || '').trim(),
              tenHinhThucNhap: String(row['Tên hình thức nhập'] || '').trim() || undefined,
              ngayNhap: parseDate(row['Ngày nhập']),
              soHoaDon: String(row['Số hóa đơn'] || '').trim() || undefined,
              ngayHoaDon: parseDate(row['Ngày hóa đơn']),
              nhaCungCap: String(row['Nhà cung cấp'] || '').trim() || undefined,
              imei,
              trangThaiSanPham: String(row['Trạng thái sản phẩm'] || '').trim() || undefined,
              soLuongTonKho: parseNumber(row['Số lượng']) || 0,
              giaTien: parseNumber(row['Giá vốn']),
              giaNhap: parseNumber(row['Giá nhập (Chưa VAT)']),
            };

            items.push(item);
          } catch (error) {
            // Log warning nhưng không skip toàn bộ file
            console.warn(`Lỗi parse dòng ${i + 2}:`, error);
            skipCount++;
          }
        }

        if (items.length === 0) {
          resolve({
            success: false,
            error: `Không có dữ liệu hợp lệ (${skipCount} dòng bị lỗi)`,
          });
          return;
        }

        resolve({
          success: true,
          data: items,
          itemsCount: items.length,
        });
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Lỗi phân tích file',
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, error: 'Lỗi đọc file' });
    };

    reader.readAsArrayBuffer(file);
  });
};

// Helper functions
const parseNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
};

const parseDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;

  if (value instanceof Date) return value;

  if (typeof value === 'number') {
    // Excel serial date
    const date = new Date((value - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? undefined : date;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
};

// Validate file before parse
export const validateFile = (file: File): string | null => {
  // Check file type
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    return 'Vui lòng chọn file Excel (.xlsx hoặc .xls)';
  }

  // Check file size (50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return `File quá lớn (tối đa 50MB, file của bạn ${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }

  return null;
};
