# Kế hoạch Thực thi: Tính năng "Tuỳ chỉnh bật/tắt cột %HT trong bộ Target Thi đua"

## 1. Mục tiêu & Yêu cầu của Người dùng
- Trong cùng 1 bộ (Bộ Cơ bản: `TAR`, `%HT`, `%DKHT` hoặc Bộ Vượt trội: `TAR V.TRỘI`, `%HT V.TRỘI`, `%DKHT V.TRỘI`), người dùng có thể linh hoạt tuỳ chỉnh **tắt bớt cột `%HT`** (hoặc `%DKHT`) mà không bị cưỡng bức chuyển bộ hoặc tắt toàn bộ nhóm.
- Đảm bảo 2 bộ Target vẫn giữ tính chất loại trừ tương hỗ (Mutually Exclusive) khi chuyển đổi giữa Cơ bản và Vượt trội.
- Đảm bảo bảng luôn có ít nhất 1 bộ Target để tính toán cột `C.LẠI`.

## 2. Kết quả triển khai
- [x] Cập nhật hàm `toggleCompetitionColumn` trong `competitionSortAndCalc.ts`:
  - Cho phép người dùng bật/tắt riêng lẻ các cột tỷ lệ `%` (`%HT`, `%DKHT`, `%HT V.Trội`, `%DKHT V.Trội`) trong bộ đang kích hoạt.
  - Khi click vào cột Target chính (`Target` hoặc `Target V.Trội`), hệ thống chuyển đổi qua lại giữa bộ Cơ bản và Vượt trội.
  - Tự động đánh số thứ tự cột trực quan và an toàn (không bao giờ mất trắng cả 2 bộ).
- [x] Bổ sung 3 unit tests mới trong `competitionSortAndCalc.test.ts` (Tổng: 20/20 tests PASS).
- [x] Chạy kiểm tra toàn diện `npm run check` (177 unit tests PASS, TypeScript 0 lỗi, ESLint 0 lỗi, build Vite production hoàn tất).
- [x] Kiểm thử trực quan qua trình duyệt:
  - Tắt công tắc `%HT`: Cột `%HT` lập tức ẩn trên bảng, `TAR` và `%DKHT` vẫn hiển thị chuẩn xác.
  - Bật lại công tắc `%HT`: Cột `%HT` hiển thị lại bình thường.
