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

// Khi lưu danh sách, chỉ lưu msp+quantity để tiết kiệm dung lượng Firestore (xem
// onConfirmSaveList trong StickerEventApp.tsx); các field Product khác có thể có
// mặt với danh sách cũ (định dạng trước đây lưu full Product) nên để optional.
export type SavedListItem = Partial<Product> & { msp: string };

/** Sản phẩm nhập tay, lưu ở `stores/{storeId}/manualProducts`. Đặt ở đây (không phải trong
 *  services/firebaseService.ts như trước) để `services/fileParser.ts` dùng được kiểu này mà không
 *  phải import firebaseService — tránh kéo cả Firebase SDK vào module chỉ làm việc parse/IndexedDB.
 *  firebaseService.ts vẫn re-export để mọi nơi đang import từ đó không phải sửa. */
export interface ManualProductDoc {
  id: string;
  sanPham: string;
  msp: string;
  giaGoc: string;
  giaGiam: string;
  thuongERP: number;
  thuongNong: number;
  tongThuong: number;
  khuyenMai: string;
  ngayIn: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedList {
  id: string;
  name: string;
  userId: string;
  storeId: string;
  createdAt: string;
  items: SavedListItem[];
  totalItems: number;
  /** `true` khi danh sách được lưu dạng chunk ở subcollection `itemChunks` (danh sách lớn, xem
   * saveListToFirestore). Lúc LIỆT KÊ, `items` của các danh sách này để rỗng có chủ ý — đọc
   * itemChunks của mọi danh sách mỗi lần mở modal là nguồn tốn lượt đọc Firestore lớn nhất của
   * In Sticker (audit hạn mức 2026-09-17). Cần items thật thì gọi fetchSavedListItems(). */
  itemsChunked?: boolean;
}

// Dữ liệu doc Firestore users/{uid} (xem setDoc trong Login.tsx) — để optional vì
// đọc từ cache sessionStorage/Firestore, không chắc luôn đủ field.
export interface StickerEventUserData {
  uid?: string;
  username?: string;
  email?: string;
  role?: 'admin' | 'staff';
  storeId?: string;
  createdAt?: unknown;
  /** Kho hiện có Admin quản lý hay không (tính sẵn ở server — stickerResolveSession/stickerRegister)
   * — chỉ có ý nghĩa với staff, dùng để chặn xem dữ liệu khi kho chưa/không còn Admin. */
  storeHasAdmin?: boolean;
}

// Dùng cho danh sách user lấy từ Firestore (fetchAllUsers/SuperAdminModal) — uid luôn có
// vì đọc trực tiếp từ doc đã tồn tại, khác userData (user đang đăng nhập) có thể null.
export interface StickerEventUserRecord extends StickerEventUserData {
  uid: string;
}

export interface InventoryFilters {
  maSieuThi: string[];
  nganhHang: string[];
  nhomHang: string[];
  keyword: string;
}

export interface InventoryItem {
  maSieuThi: string;
  tenSieuThi: string;
  thuongHieu: string;
  nhaSanXuat?: string;
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
