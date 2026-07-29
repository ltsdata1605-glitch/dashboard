// Inventory Types & Interfaces

export interface InventoryItem {
  id: string; // unique key: maKho + maSanPham + IMEI
  maKho: number;
  tenKho: string;
  thuongHieuCongTy: string;
  nganhHang: string;
  nhomHang: string;
  maSanPham: string;
  tenSanPham: string;
  tenHinhThucNhap?: string;
  ngayNhap?: Date;
  soHoaDon?: string;
  ngayHoaDon?: Date;
  nhaCungCap?: string;
  imei: string;
  trangThaiSanPham?: string;
  soLuongTonKho: number;
  giaTien?: number;
  giaNhap?: number;
}

export interface CheckingItem {
  itemId: string;
  soLuongKiemKe: number;
  chieuThayCo: number; // soLuongKiemKe - soLuongTonKho
  ghiChu?: string;
  lastScannedAt?: Date;
}

export interface InventorySession {
  id: string;
  userId: string;
  storeName: string;
  maKho: number;
  startDate: Date;
  endDate?: Date;
  status: 'in_progress' | 'completed';
  items: Record<string, CheckingItem>;
}

export interface FilterState {
  searchText: string;
  selectedKho: number[];
  selectedNganh: string[];
  selectedNhom: string[];
  selectedNhaCungCap: string[];
  selectedTrangThaiSP: string[];
  selectedTrangThaiKiem: ('chua_kiem' | 'da_kiem' | 'hoan_thanh')[];
  priceRange: [number, number];
  dateRange: [Date | null, Date | null];
}

export interface InventoryStats {
  totalSKU: number;
  totalQuantity: number;
  alreadyChecked: number;
  checkedPercent: number;
  totalDiff: number;
  diffPercent: number;
}

export interface ExcelParseResult {
  success: boolean;
  data?: InventoryItem[];
  error?: string;
  itemsCount?: number;
}

export interface QRScanResult {
  found: boolean;
  item?: InventoryItem;
  error?: string;
}
