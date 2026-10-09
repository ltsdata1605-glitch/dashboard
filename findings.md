# Findings: Cấu hình Ngành hàng & Dữ liệu lưu Firebase

- **Cấu trúc dữ liệu `ProductConfig` hiện tại**:
  - `groups`: `{ [nhomCha: string]: Set<string> }`
  - `subgroups`: `{ [nhomCha: string]: { [nhomCon: string]: string[] } }`
  - `childToParentMap`: `{ [productCode: string]: string }`
  - `childToSubgroupMap`: `{ [productCode: string]: string }`
  - `quantityMultiplierMap`: `{ [productCode: string]: number }`
  - `vasMultiplierMap`: `{ [productCode: string]: number }`
  - `vasNameMultiplierMap`: `{ [productName: string]: number }`
  - `revenueEligibleHTX`: `Set<string>`
  - `nonRevenueEligibleHTX`: `Set<string>`
  - `htxClassification`: `{ [htx: string]: 'tra_gop' | 'tien_mat' | 'thu_ho' | 'khac' }`
  - `industryBiMap`: `{ [nhomHang: string]: { parent: string; child: string } }`

- **Đặc thù lưu trữ Firestore**:
  - Đã có sẵn 2 hàm chuẩn hoá: `toCloudProductConfig()` và `fromCloudProductConfig()` trong `services/productConfigSerialization.ts`.
  - Firestore Rules: Collection `shared_configs` đã có rule `allow read: if isSignedIn(); allow write: if isManager();`. Document ID `global_product_config` nằm trọn trong rule này và hoạt động ngay trên production.

- **Vị trí UI trong "Phân Quyền & Duyệt Yêu Cầu"**:
  - File: `components/views/UserManagementView.tsx`.
  - Thanh tab hiện có: `Chờ duyệt` (pending), `Hoạt động` (active), `Hết hạn` (expired).
  - Thêm tab thứ 4: `Cấu hình ngành hàng` (`config`).
