# Task Plan: Tự Động Xuất Ảnh Báo Cáo Cho Bot LINE (bcrt / bclk / bc)

## Mục Tiêu
Sau khi tự chạy Auto Sync (BI Realtime/Luỹ kế, YCX Realtime/Luỹ kế) hoàn tất:
1. Các khu vực được người dùng thiết lập xuất ảnh sẽ tự động render (chụp) và lưu lên Firebase (Storage `bot_media` + Firestore `report_commands`).
2. Khi người dùng / admin gõ cú pháp trong nhóm LINE hoặc chat bot:
   - `bcrt`: Bot tự động lấy ảnh báo cáo Realtime mới nhất gửi vào nhóm.
   - `bclk`: Bot tự động lấy ảnh báo cáo Luỹ kế mới nhất gửi vào nhóm.
   - `bc`: Bot tự động gửi ảnh báo cáo mới nhất (hoặc cả realtime/luỹ kế).
   - Hỗ trợ gửi tối đa 4 ảnh + 1 tiêu đề tóm tắt (trong 1 lượt ReplyToken hoàn toàn MIỄN PHÍ).
3. Người dùng có thể thiết lập:
   - Ngay tại các khu vực xuất ảnh (Chi Tiết Theo Kho, Tổng Quan Doanh Thu, và modal ExportOptionsModal).
   - Tại Modal Cài Đặt Hẹn Giờ Auto Sync Dock (quản lý tập trung mọi khu vực).

## Trạng Thái Các Pha
- [x] Pha 1: Thiết kế & xây dựng dịch vụ cấu hình & tự động xuất ảnh `autoReportExportService.ts`
- [x] Pha 2: Cập nhật Cloud Function `lineBotWebhook.ts` hỗ trợ lệnh `bcrt`, `bclk`, `bc`, và gửi nhiều ảnh (multi-image reply)
- [x] Pha 3: Tích hợp thiết lập xuất ảnh tại các khu vực (Chi Tiết Theo Kho, Tổng Quan Doanh Thu, ExportOptionsModal, AutoSyncScheduleButton)
- [x] Pha 4: Kích hoạt tự động xuất sau khi chạy Auto Sync (YCX Realtime/Luỹ kế trong `DashboardView.tsx` và BI Realtime/Luỹ kế trong `Dashboard.tsx` / `useBiAutoSync.ts`)
- [x] Pha 5: Kiểm thử tự động (Unit tests + Typecheck + Lint) và xác nhận hoạt động
- [x] Pha 6: Thêm tính năng cấu hình tùy chỉnh "LỆNH" cho Bot LINE (Realtime & Luỹ kế)
  - [x] 6.1: Mở rộng `AreaExportSetting` & `parseCommands` trong `services/autoReportExportService.ts`
  - [x] 6.2: Cập nhật `saveAutoReportImagesToFirebase` lưu doc cho từng lệnh tùy chỉnh
  - [x] 6.3: Nâng cấp UI modal `AreaAutoExportButton.tsx` hỗ trợ sửa lệnh trực tiếp, reset mặc định, gợi ý mẹo tra cứu động
  - [x] 6.4: Đồng bộ hiển thị lệnh trên `ExportOptionsModal.tsx`
  - [x] 6.5: Viết unit test cho tính năng cấu hình lệnh và xác thực chạy thử

## Quyết Định Kỹ Thuật
1. Lưu cấu hình: `saveSetting('auto_report_export_config')` (IndexedDB + Cloud sync).
2. Lưu ảnh Bot: `bot_media` và `line_bots/{botId}/report_commands/{cmd}` với `cmd = 'bcrt' | 'bclk' | 'bc'`.
3. Cấu trúc Firestore document:
   ```ts
   {
     command: 'bcrt' | 'bclk' | 'bc',
     reportKey: string,
     imageUrl: string,
     previewUrl: string,
     images: Array<{ reportKey: string; imageUrl: string; previewUrl: string }>,
     caption: string,
     mode: 'realtime' | 'luyke',
     updatedAt: string,
     updatedBy: string
   }
   ```
4. LINE Messaging API Reply: Gửi 1 tin text + tối đa 4 tin ảnh (`replyMsgs <= 5`), hoàn toàn miễn phí không trừ quota bot.
