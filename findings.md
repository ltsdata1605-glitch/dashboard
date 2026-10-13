# Findings: Rà soát lưu trữ IndexedDB & Firebase toàn dự án

## Cơ chế lưu trữ & Đồng bộ hiện hành

1. **IndexedDB Scope theo UID (`utils/localDbScope.ts`)**:
   - Tên DB: `BI_HUB_DATABASE_V2__<uid>` (hoặc legacy `BI_HUB_DATABASE_V2` khi chưa đăng nhập).
   - Object Store:
     - `settings`: Cấu hình, target, tùy chỉnh, mappings.
     - `appStorage`: Dữ liệu lớn (Excel, cache).
   - Phân loại khóa:
     - `isLightSyncKey`: Lưu trong document `users/{uid}/setting/configuration` -> `settingsStoreBackup`.
     - `HEAVY_SYNC_KEYS`: Lưu riêng trong subcollection `users/{uid}/configs/{key}` có hỗ trợ chunking.
     - `isLocalOnlyKey`: Chỉ giữ trên máy (như tab active tạm).

2. **Kênh phát tín hiệu thay đổi**:
   - `saveSetting()` -> phát CustomEvent `ycx-setting-changed` với `{ key, source, unchanged }`.
   - `hooks/useCloudSync.ts` bắt `ycx-setting-changed`:
     - Nếu là `isHeavySyncKey` -> debounce 2s -> gọi `syncHeavySettingToCloudQueued`.
     - Nếu là `isLightSyncKey` -> debounce 2s -> gọi `forceSync()`.
   - Khi Cloud cập nhật xuống máy:
     - `saveSettingFromCloud` phát CustomEvent `indexeddb-change` với `{ key, source: 'cloud-sync' }`.

## Danh sách Rà soát các Modal & Thao tác Người Dùng

| STT | Module / Modal / Thao tác | File Component | Khóa IndexedDB | Đã lưu IndexedDB khi thao tác? | Đã sync Firebase? | Đã tự động cập nhật khi Cloud đổi? | Trạng thái |
|-----|---------------------------|----------------|----------------|--------------------------------|-------------------|-----------------------------------|------------|
| 1 | Cấu Hình Cột Báo Cáo (Kho) | `WarehouseSettingsModal.tsx` | `warehouseColumnConfig` | ✅ Đã khắc phục | ✅ Light Sync + forceSync | ✅ Đã thêm listener | ĐÃ XONG |
| 2 | Cấu hình dãy thẻ KPI (Ẩn/hiện, thứ tự, thêm/sửa) | `KpiCardConfigModal.tsx` | `kpiCardConfig` | ⚠️ Chỉ khi bấm "Hoàn tất" | ⚠️ Đợi bấm Hoàn tất | ⚠️ Chưa nghe indexeddb-change ở view | CẦN XỬ LÝ |
| 3 | Cấu hình Bảng Đối Đầu (Head to head) | `HeadToHeadConfigModal.tsx` | `headToHeadTables` | ⚠️ Chỉ khi bấm "Lưu" | ⚠️ Đợi bấm Lưu | ⚠️ Cần kiểm tra listener | CẦN XỬ LÝ |
| 4 | Cấu hình Tab Khai Thác Tùy Chỉnh | `CustomExploitationTabModal.tsx` | `customExploitationTabs` | ⚠️ Chỉ khi bấm "Lưu" | ⚠️ Đợi bấm Lưu | ⚠️ Cần kiểm tra listener | CẦN XỬ LÝ |
| 5 | Cấu hình Tab Hiệu Quả Khai Thác | `EfficiencyExploitationTabModal.tsx` | `efficiencyExploitationTabs` | ⚠️ Chỉ khi bấm "Lưu" | ⚠️ Đợi bấm Lưu | ⚠️ Cần kiểm tra listener | CẦN XỬ LÝ |
| 6 | Quản lý danh sách nhân viên | `EmployeeManagerModal.tsx` | `departmentMap`, `analysis-employees-list` | ⚠️ Xem xét | ⚠️ Xem xét | ⚠️ Xem xét | CẦN XỬ LÝ |
| 7 | Cấu hình Ngành hàng (Product Config) | `ProductConfigModal.tsx` | `productConfig` | ⚠️ Xem xét | ✅ Heavy Sync | ⚠️ Xem xét | CẦN XỬ LÝ |
| 8 | Nhập Target Kho (DTQĐ, DT Thực) | `WarehouseSummary.tsx` | `warehouseTargets`, `warehouseDTThucTargets` | ⚠️ Cần kiểm tra | ✅ Light sync | ⚠️ Cần kiểm tra | CẦN XỬ LÝ |
| 9 | Nhập Target Chỉ số con của Kho | `WarehouseSummary.tsx` | `warehouseColumnTargets` | ⚠️ Đã lưu IDB | ❌ Chưa trong isLightSyncKey / Heavy | ❌ Chưa sync Firebase | CẦN XỬ LÝ |
| 10 | Giờ mở/đóng cửa siêu thị | `WarehouseSummary.tsx` | `storeOpenCloseHours` | ⚠️ Đã lưu IDB | ❌ Chưa trong isLightSyncKey | ❌ Chưa sync Firebase | CẦN XỬ LÝ |
| 11 | Cấu hình Nhóm Ngành Hàng Hiển Thị | `IndustryAnalysisView.tsx` | `industryVisibleGroups` | ⚠️ Cần kiểm tra | ✅ Light sync | ⚠️ Cần kiểm tra | CẦN XỬ LÝ |
| 12 | Cấu hình Thưởng (Check Thưởng / Thi đua) | `BonusDataModal.tsx` | `checkthuong_data`, `bonus-data-*` | ⚠️ Cần kiểm tra | ✅ Heavy Sync | ⚠️ Cần kiểm tra | CẦN XỬ LÝ |
| 13 | Cấu hình Tile Link (Report BI) | `TileLinkConfigModal.tsx` | `bi_tile-links` / `tileLinkConfig` | ⚠️ Cần kiểm tra | ⚠️ Cần kiểm tra | ⚠️ Cần kiểm tra | CẦN XỬ LÝ |
| 14 | In Sticker & Lịch sử rút thăm | `features/sticker-event` | `stickerPrinterState`, `stickerSavedLists` | ✅ Heavy Sync | ✅ Heavy Sync | ✅ Đã kiểm tra | ĐÃ XONG |
| 15 | Phân ca (Schedules, patterns) | `features/phan-ca` | `ScheduleAppDB` | ⚠️ Cần kiểm tra | ⚠️ Cần kiểm tra | ⚠️ Cần kiểm tra | CẦN XỬ LÝ |
