# Task Plan: Hướng dẫn cài đặt Tampermonkey siêu chi tiết từng bước cho người không rành máy tính

## 1. Yêu cầu của người dùng
- Khi máy chưa cài Tampermonkey hoặc chưa cài userscript:
  + Tab Nhân viên > Thưởng > Tự động chưa thể tự động đổ thưởng.
  + Nút Tự động Realtime và Luỹ kế chưa thể chạy tự động.
- Khi người dùng chưa cài, hệ thống phải **tự động xuất hiện 1 modal hướng dẫn chi tiết từng bước** để bất kể ai, kể cả người không rành máy tính, đều có thể cài đặt thành công 100%.

## 2. Kế hoạch thực hiện chi tiết

### Bước 1: Xây dựng Component Hướng Dẫn Cài Đặt Tampermonkey (`TampermonkeyInstallGuideContent.tsx`)
- [x] Tạo component `features/bi-dashboard/components/common/TampermonkeyInstallGuideContent.tsx`:
  - **Bước 1**: Cài đặt tiện ích Tampermonkey
    + Nút bấm mở Chrome Web Store.
    + Hướng dẫn click nút "Thêm vào Chrome".
    + Hộp cảnh báo nổi bật: Bật "Chế độ dành cho nhà phát triển" (Developer mode) kèm nút **"Sao chép link chrome://extensions"** 1-click.
  - **Bước 2**: Cài đặt Script Tự Động của Dashboard YCX
    + Nút bấm mở file script `.user.js`.
    + Hướng dẫn nhận diện nút "Cài đặt" (Install) của Tampermonkey.
  - **Bước 3**: Kiểm tra kết nối & Bắt đầu tự động
    + Nút kiểm tra tự động kết nối qua `detectUserscript()`.
    + Bắn pháo hoa `confetti()` và toast chúc mừng khi kết nối thành công, tự động tiếp tục quy trình người dùng đang chờ.
  - Nút chuyển sang "Dùng thủ công" nếu đang vội.

### Bước 2: Nâng cấp `AutoBonusInstallGuideModal.tsx` (Tab Nhân viên > Thưởng > Tự động)
- [x] Nhúng `TampermonkeyInstallGuideContent` vào `AutoBonusInstallGuideModal.tsx`, mở rộng độ rộng modal (`maxWidth="lg"`), tối ưu trải nghiệm người dùng.

### Bước 3: Nâng cấp `BiAutoSyncModal.tsx` & `useBiAutoSync.tsx` (Tự động Realtime & Luỹ kế)
- [x] Khi `status === 'not-installed'`, hiển thị toàn bộ giao diện 3 bước của `TampermonkeyInstallGuideContent`.
- [x] Bổ sung prop `onRetry` trong `BiAutoSyncModalProps`.
- [x] Trong `useBiAutoSync.tsx` và `DataUpdater.tsx`, truyền callback `onRetry` để chạy lại `handleStartAutoSync`.

### Bước 4: Tích hợp vào Floating Action Dock (`BiWrapper.tsx`)
- [x] Thêm khả năng mở modal hướng dẫn cài đặt khi bấm vào huy hiệu "Tampermonkey • Hướng dẫn" ở chân dock.

### Bước 5: Kiểm tra xác minh (Verification)
- [x] Chạy `npm run typecheck` đạt 0 lỗi.
- [x] Chạy targeted unit tests liên quan đạt 22/22 passed.
