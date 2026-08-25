# Kế hoạch: Bật đồng bộ Firebase cho "Highlight" (Report BI → Nhân viên)

## Bối cảnh
- "Lọc nhóm" (`global-selected-competitions`) đã tự động đồng bộ Firestore sẵn qua `useCloudSync` (theo tài khoản đăng nhập, không phải demo mode).
- "Highlight" (`highlight-employees-multi`) đang bị đánh dấu tường minh là local-only trong `isLocalOnlyKey()`, nên chỉ lưu IndexedDB, không lên Firestore.
- User xác nhận muốn bật đồng bộ Highlight, tái dùng đúng hạ tầng sẵn có (document `users/{uid}/setting/configuration`, field `settingsStoreBackup`) — không tạo collection/rule mới. `firestore.rules:40` đã cho phép owner read/write toàn bộ `setting/{doc}`.

## Thay đổi
- **File**: `hooks/useCloudSync.ts`
  - Xoá dòng `k === 'highlight-employees-multi' ||` khỏi hàm `isLocalOnlyKey()` (dòng 23).
  - Không đổi gì khác trong file — các key `active-*`, `*-active-tab`, `dashboard-main-tab`... vẫn giữ nguyên local-only (nằm ngoài phạm vi yêu cầu).

## Hệ quả
- `highlight-employees-multi` sẽ đi qua đúng luồng debounce (2s) → `forceSync()` → ghi vào `settingsStoreBackup.highlight-employees-multi` trên Firestore, và đọc ngược lại qua `onSnapshot` real-time listener như các key nhẹ khác.
- Đồng bộ **theo tài khoản đăng nhập, nhiều thiết bị** — không phải chia sẻ giữa nhiều tài khoản khác nhau xem chung dashboard.
- Không tạo Firestore collection mới, không cần cập nhật `firestore.rules`.

## Kiểm tra
- `npm run check` (typecheck + eslint + build + lint-ratchet).
- Test thủ công: đăng nhập cùng 1 tài khoản trên 2 tab/trình duyệt, bật Highlight vài nhân viên ở tab A, xác nhận tab B tự cập nhật (hoặc sau reload).
