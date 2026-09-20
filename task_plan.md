# Task Plan: Tính Năng Chọn Ngày Hết Hạn Mã PMH & Tự Động Xoá Khỏi Kho

## 1. Mục tiêu (Goals)
- Bổ sung bộ chọn **Ngày hết hạn (Expiry Date)** tại góc dưới bên trái của modal "Nạp Mã PMH Vào Kho" (`CouponImportModal.tsx`).
- Tự động nhận diện ngày trong nội dung dán (ví dụ `Ngày 18/09/2026` ... `Ngày 27/09/2026`) để gợi ý sẵn ngày hết hạn mới nhất cho người dùng.
- **Tự động xoá khỏi kho**: Nếu qua ngày hết hạn (ví dụ chọn ngày `27/09/2026` thì bắt đầu từ 00:00 ngày `28/09/2026` trở đi), toàn bộ mã chưa dùng (`UNUSED`) của sản phẩm sẽ tự động xoá hoàn toàn khỏi kho PMH.
- **Thông báo hết hạn khi người dùng xin mã**: Nếu người dùng gửi cú pháp xin mã cho sản phẩm mà mã đã bị xoá do hết hạn, Bot LINE sẽ thông báo rõ ràng cho người dùng là mã đã hết hạn dùng (kèm ngày hết hạn cụ thể), thay vì thông báo "Hết mã" hoặc không tìm thấy.
- Hiển thị thông tin hạn sử dụng trực quan trong bảng quản lý kho PMH (`CouponManagerTab.tsx`).

---

## 2. Các giai đoạn thực hiện (Phases)

### Phase 1: Chuẩn hoá Type & Dữ liệu (Hoàn thành)
- [x] Cập nhật `Coupon` và `ParsedImportItem` với trường `expiryDate?: string` trong `lineBot.types.ts`.
- [x] Định nghĩa interface `ExpiredProductRecord`.

### Phase 2: Nâng cấp Parser & Trích xuất Ngày (Hoàn thành)
- [x] Bổ sung hàm bóc tách ngày `extractLatestDateFromText` và cập nhật `parsePastedCouponList` trong `couponParser.ts`.
- [x] Bổ sung helper `isDateExpired(expiryDate, compareDate)`.
- [x] Viết test trong `tests/unit/coupon-parser.test.ts`.

### Phase 3: Nâng cấp Giao diện Nạp Mã & Quản lý Kho (Hoàn thành)
- [x] Thêm input chọn ngày hết hạn ở góc dưới bên trái footer `CouponImportModal.tsx`.
- [x] Tự động gợi ý ngày lớn nhất từ danh sách dán vào ô chọn ngày.
- [x] Cập nhật `CouponManagerTab.tsx` thêm cột "Hạn Dùng" với các trạng thái màu sắc phù hợp.

### Phase 4: Nâng cấp Service & Tự Động Xoá Khỏi Kho (Hoàn thành)
- [x] Cập nhật `lineBotFirestoreService.addCouponsBatch` để lưu `expiryDate`.
- [x] Bổ sung hàm `cleanupExpiredCoupons(userId)` tự động xoá mã hết hạn và lưu vết vào `expired_products`.

### Phase 5: Nâng cấp Backend Bot LINE Webhook & Thông Báo Hết Hạn (Hoàn thành)
- [x] Thêm hàm dọn dẹp mã hết hạn trong `functions/src/lineBotWebhook.ts`.
- [x] Kiểm tra `expired_products` khi người dùng xin mã để trả về thông báo mã đã hết hạn dùng.

### Phase 6: Kiểm thử, Build & Triển khai (Hoàn thành)
- [x] Chạy targeted unit test: `npx vitest run tests/unit/coupon-parser.test.ts` (27/27 passed).
- [x] Chạy `npx tsc --noEmit` (0 lỗi).
- [x] Chạy `npm --prefix functions run build` (0 lỗi).
