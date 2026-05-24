export interface Product {
  msp: string; // AK
  sanPham: string; // A + B
  thuongERP: number; // Parsed from AJ
  thuongNong: number; // Parsed from AJ
  tongThuong: number; // Calculated
  giaGoc: string; // E
  giaGiam: string; // F
  khuyenMai: string; // H
  ngayIn: string; // AI
  selected: boolean;
  quantity: number;
}

export interface SavedList {
  id: string;
  name: string;
  userId: string;
  storeId: string;
  createdAt: string;
  items: any[];
  totalItems: number;
}

export interface InventoryItem {
  maSieuThi: string;
  tenSieuThi: string;
  thuongHieu: string;
  nganhHang: string;
  nhomHang: string;
  maSanPham: string;
  tenSanPham: string;
  trangThaiKinhDoanh: string;
  trangThaiSanPham: string;
  tongSoLuong: number;
  soLuongDiDuong: number;
  soLuongThucTe: number;
  soLuongDaDat: number;
  soLuongCoTheBan: number;
  sucBan: string;
  saleAverage: number;
  saleEstimate: number;
}
