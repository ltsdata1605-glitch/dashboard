# Task Plan: Toàn diện kiểm tra & khắc phục Lưu trữ 2 nơi (IndexedDB + Firebase) cho toàn bộ dự án

## Mục tiêu
Đảm bảo **tất cả** thao tác người dùng (cấu hình, ẩn/hiện, sắp xếp, target, bộ lọc, dữ liệu nhập, danh sách, mẫu in...) trên toàn bộ các phân hệ/modal/module của ứng dụng đều được tự động lưu trữ đầy đủ vào **2 nơi**:
1. **IndexedDB** (cục bộ theo tài khoản, tức thì, bảo toàn offline).
2. **Firebase** (Firestore Cloud theo tài khoản `users/{uid}`, đồng bộ xuyên thiết bị, không mất khi reload/đổi máy).

---

## Các giai đoạn thực hiện

- [x] **Giai đoạn 1: Khảo sát & Kiểm kê toàn bộ Modal, Module, Thao tác người dùng**
  - Rà soát tất cả các modal cấu hình (KPI, Bảng kho, Bảng đối đầu, Tab khai thác, Nhân viên, Sticker, Phân ca, Thi đua, Ngành hàng, v.v.).
  - Rà soát các thao tác chỉnh sửa trực tiếp trên giao diện (nhập target, lọc kho, chế độ xem, v.v.).
  - Đối chiếu danh mục khóa lưu trữ với `isLightSyncKey`, `HEAVY_SYNC_KEYS`, và cơ chế sync Firebase.
  - Ghi nhận chi tiết vào `findings.md`.

- [x] **Giai đoạn 2: Thiết kế giải pháp chuẩn hóa cơ chế Auto-Save & Cloud-Sync**
  - Đảm bảo mọi modal đều áp dụng cơ chế:
    - Lưu tức thì khi thao tác (không phụ thuộc vào nút "Hoàn tất" hay đóng modal).
    - Cập nhật IndexedDB ngay lập tức.
    - Kích hoạt sự kiện đồng bộ `ycx-setting-changed` / Firebase sync.
    - Khi đóng modal (`onClose`), tự động flush sync lên Firebase.
  - Kiểm tra và bổ sung các khóa còn thiếu trong hệ thống đồng bộ Cloud (`HEAVY_SYNC_KEYS` hoặc `isLightSyncKey`).

- [x] **Giai đoạn 3: Thực hiện khắc phục theo từng Module**
  - Nhóm 1: Các Modal cấu hình trong Phân Tích (`KpiCardConfigModal`, `HeadToHeadConfigModal`, `CustomExploitationTabModal`, `EfficiencyExploitationTabModal`, `EmployeeManagerModal`, `ColumnConfigModal`, v.v.).
  - Nhóm 2: Các thao tác Target & Bộ lọc trực tiếp (`warehouseColumnTargets`, `storeOpenCloseHours`, `industryVisibleGroups`, v.v.).
  - Nhóm 3: Module Report BI (`features/bi-dashboard`).
  - Nhóm 4: Module In Sticker & Sự kiện (`features/sticker-event`).
  - Nhóm 5: Module Phân ca (`features/phan-ca`).

- [x] **Giai đoạn 4: Kiểm chứng & Đo lường thực tế**
  - Chạy `npm run typecheck` đảm bảo 0 lỗi TypeScript (PASS).
  - Chạy các targeted unit tests liên quan đến storage & sync (`tests/unit/light-sync-keys.test.ts` 43/43 PASS).
  - Chạy Silent Headless Verification (Playwright: `test-warehouse-auto-save.spec.ts` & `test-kpi-auto-save.spec.ts` PASS 100%).

---

## Quyết định kỹ thuật
- Mọi thao tác người dùng đều được ghi nhận qua hàm lưu chuẩn phát event `ycx-setting-changed`.
- Đồng bộ đa thiết bị: khi Cloud cập nhật, các view lắng nghe `indexeddb-change` để tự động render lại không cần F5.
