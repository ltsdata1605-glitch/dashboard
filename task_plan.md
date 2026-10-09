# Task Plan: Tích hợp cấu hình Ngành hàng & Dữ liệu vào Phân Quyền & Duyệt Yêu Cầu (Firebase Firestore)

## 1. Goal
Chuyển đổi hoàn toàn cấu hình sản phẩm / ngành hàng (`ProductConfig`) từ việc phải nạp qua Google Sheet (chậm, phụ thuộc mạng, khó kiểm soát) sang quản lý trực tiếp trong màn hình **"Phân Quyền & Duyệt Yêu Cầu"**. Cho phép Admin/Quản lý nhập danh sách (Paste từ Excel/Sheet hoặc Tải file Excel lên), xem/chỉnh sửa, lưu trực tiếp lên Firebase Firestore. Toàn bộ Dashboard sẽ ưu tiên nạp cấu hình siêu tốc từ Firebase Firestore.

## 2. Architecture & Design
- **Feature Location (FSD)**:
  - Thư mục: `features/product-config/` (Feature-Sliced Design chuẩn mực).
  - Giao diện: `ProductConfigManagerTab.tsx` tích hợp làm tab mới trong màn hình `UserManagementView.tsx` ("Phân Quyền & Duyệt Yêu Cầu").
- **Data Model & Storage**:
  - Firestore Document: `shared_configs/global_product_config`.
  - Tuân thủ Firestore security rules hiện hữu (`shared_configs/{id}`: allow read `isSignedIn()`, allow write `isManager()`).
  - Sử dụng `toCloudProductConfig()` và `fromCloudProductConfig()` từ `services/productConfigSerialization.ts` để lưu trữ an toàn mảng/Set.
  - Lưu kèm metadata: `updatedAt`, `updatedBy` (email/tên admin), `version`, `summary` (số nhóm cha, số nhóm con, số mã ngành hàng, số hệ số quy đổi...).
- **Data Input Modes (Linh hoạt tối đa cho người dùng)**:
  1. **Tải lên file Excel (.xlsx)**: Kéo thả file Cấu hình Dashboard có sẵn (hỗ trợ đọc trọn vẹn mọi sheet: Ngành hàng, Ngành hàng BI, Bảo Hiểm ĐMX, Bảo Hiểm, Vas, Hình thức xuất).
  2. **Dán nhanh từ Clipboard (Copy/Paste TSV từ Google Sheet / Excel)**: Cho phép dán trực tiếp dữ liệu dạng bảng.
  3. **Xem và tìm kiếm danh sách cấu hình trực quan**: Bảng tra cứu nhóm cha, nhóm con, nhóm hàng, hệ số quy đổi.
- **Loading & Performance**:
  - Nâng cấp `useDataManagement.ts` / `services/dataService.ts`:
    - Bước 1: Đọc nhanh từ `shared_configs/global_product_config` trên Firebase (hoặc IndexedDB cache).
    - Bước 2: Nếu có trên Firebase, nạp ngay lập tức (<50ms), bỏ qua hoàn toàn việc gọi HTTP tải Google Sheet.
    - Bước 3: Nếu Firebase chưa có, fallback về Google Sheet mặc định.

## 3. Implementation Phases
- [ ] **Phase 1: Service Layer & Parser**
  - Xây dựng `features/product-config/services/firebaseProductConfigService.ts`:
    - `saveGlobalProductConfig(config, user)`
    - `getGlobalProductConfig()`
    - `subscribeGlobalProductConfig()`
  - Xây dựng parser đa năng `parsePastedConfig()` và tái sử dụng parser file Excel.
- [ ] **Phase 2: UI Component trong Phân Quyền & Duyệt Yêu Cầu**
  - Tạo `features/product-config/components/ProductConfigManagerTab.tsx` (< 300 dòng theo FSD).
  - Tích hợp tab **"Cấu hình dữ liệu"** (hoặc "Cấu hình Ngành hàng") vào `UserManagementView.tsx`.
- [ ] **Phase 3: Tích hợp vào Data Engine toàn hệ thống**
  - Cập nhật luồng nạp cấu hình trong `services/dataService.ts` và `hooks/useDataManagement.ts`.
- [ ] **Phase 4: Targeted Testing & Verification**
  - Viết unit test cho service lưu/đọc config Firebase.
  - Test E2E / component test.
  - Chạy `npm run lint:ratchet:ci`.
