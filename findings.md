# Findings & Architecture: Auto Report Export to Bot LINE

## 1. Cơ Chế Auto Sync Hiện Tại
- **YCX Auto Sync**:
  - `GlobalAutoSyncDock.tsx` kích hoạt Tampermonkey userscript tải file report từ MWG.
  - Khi có file, phát sự kiện `'ycx-auto-sync-file'`.
  - `DashboardView.tsx` nhận file và gọi `handleFileProcessing([file], false, isLuyKe, ...)`.
  - Khi xử lý xong và cập nhật state `processedData`, việc nạp dữ liệu hoàn tất.
- **BI Auto Sync**:
  - `useBiAutoSync.ts` kích hoạt Tampermonkey thu thập dữ liệu BI.
  - Sau khi xong, lưu vào database và phát `'ycx-bi-automation:done'`.
  - `Dashboard.tsx` có sẵn lắng nghe `'ycx-bi-auto-export:request'` để chụp các khu vực BI (`bi-doanh-thu-tong`, `bi-doanh-thu-tung-st`, `bi-nganh-hang-tung-st`, `bi-thi-dua-tong`, `bi-thi-dua-tung-st`).

## 2. Lưu Ảnh & Gán Lệnh Cho Bot LINE
- `services/lineReportDelivery.ts`:
  - `prepareLineImage(blob)` nén ảnh preview JPEG.
  - `prepareLineHdImage(blob)` nén ảnh HD gốc PNG/WEBP.
  - `uploadLineImage(base64)` upload lên Firebase Functions `lineBotWebhook?action=uploadMedia` (lưu vào collection `bot_media`).
  - `uploadLineHdImage(base64)` tương tự cho ảnh HD.
  - `saveReportCommandImage` lưu vào `line_bots/{botId}/report_commands/{cmd}`.

## 3. Bot Webhook (`functions/src/lineBotWebhook.ts`)
- Nhận tin nhắn trong nhóm LINE hoặc 1-1.
- Nếu gõ `cleanCmd` (`bc`, `bcrt`, `bclk`):
  - Tra cứu `db.collection('line_bots').doc(uid).collection('report_commands').doc(cleanCmd)`.
  - Khi có `images` (nhiều ảnh): Reply 1 text + các ảnh (tối đa 4 ảnh) trong 1 request `/v2/bot/message/reply`.
  - Miễn phí 100% không tốn quota tin nhắn.

## 4. Giao Diện Thiết Lập (UI)
- Trên component Chi Tiết Theo Kho / Tổng Quan Doanh Thu:
  - Nút tuỳ chọn nhanh hoặc popover/modal cấu hình:
    - `[x] Tự động xuất khi chạy Realtime (lệnh: bcrt)`
    - `[x] Tự động xuất khi chạy Luỹ kế (lệnh: bclk)`
- Trên modal xuất ảnh chung `ExportOptionsModal`:
  - Thêm phần cấu hình Bot LINE tương tự.
- Trên Modal Hẹn giờ / Auto Sync Dock:
  - Bảng quản lý tập trung các khu vực để người dùng xem và tick nhanh.
