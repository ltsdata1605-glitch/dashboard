# Kế Hoạch Nâng Cấp Giao Diện Thẻ KPI (KpiCard / KpiCards)

## 1. Mục tiêu
Nâng cấp các thẻ KPI (Tổng Quan Doanh Thu) trở nên hiện đại, mượt mà, chuyên nghiệp chuẩn dashboard tài chính cấp cao (Linear / Apple / Stripe style), giải quyết triệt để các hạn chế hiện tại:
- Bỏ tình trạng cả 5 thẻ bị "nhuộm đỏ" toàn bộ khi chưa đạt mục tiêu, giữ lại nhận diện màu sắc đặc trưng của từng chỉ số.
- Thiết kế bo góc mềm mại `rounded-2xl`, hiệu ứng đổ bóng đa tầng nhẹ nhàng và viền thẻ thanh lịch.
- Icon đặt trong khung squircle (`rounded-xl`) có nền màu tinh tế, hiệu ứng micro-interaction khi rê chuột.
- Thanh tiến độ (progress bar) dạng viên nang (pill `rounded-full`) với dải gradient hiện đại, chuyển động mượt mà.
- Footer mục tiêu và mức chênh lệch (+ / -) hiển thị dạng micro-badge / chip tinh gọn, rõ ràng, không bị dính sát hay đơn điệu.
- Đảm bảo 100% tương thích với công cụ chụp xuất ảnh báo cáo (`captureEngine.ts` và `presetBi.ts`).

## 2. Kế hoạch triển khai
- [x] **Giai đoạn 1**: Hoàn thiện thiết kế giao diện trong `KpiCard.tsx`
  - Cập nhật cấu trúc thẻ: bo góc `rounded-2xl`, viền mỏng thanh thoát, dải accent đỉnh thẻ bo theo góc bo `rounded-t-2xl`.
  - Icon squircle badge với nền tint mềm mại theo chủ đề màu của từng chỉ số (sky, emerald, amber, rose, slate/indigo).
  - Thanh tiến độ pill bo tròn với gradient mềm mại.
  - Phù hiệu trạng thái tinh gọn (micro-dot / status badge) thông minh, không làm choáng ngợp thẻ.
- [x] **Giai đoạn 2**: Tinh chỉnh hiển thị số liệu và chip chênh lệch trong `KpiCards.tsx`
  - Chuyển số chênh lệch (`+...` hoặc `-...`) thành micro-badge / chip có nền màu nhẹ (rose-50 / emerald-50) sang trọng.
  - Tối ưu typography: số chính đậm đà, đơn vị chữ nhỏ tương phản vừa mắt.
- [x] **Giai đoạn 3**: Đồng bộ style Executive Modern sang toàn bộ dự án
  - [x] `features/bi-dashboard/components/dashboard/KpiOverview.tsx`: Hàng 1 (DT Thực, DTQĐ, HQQĐ, Trả Chậm) có pill progress bar và chip target/chênh lệch; Hàng 2 (L.Khách, TLPVTC, Bill Bán, Bill T.Hộ) đồng bộ typography và spacing.
  - [x] `features/khai-thac/components/DashboardTab.tsx`: 4 thẻ KPI Khai Thác (Tổng doanh số, Trả góp, Mở Ví, Chiến giá) nâng cấp số đo và chip trend.
  - [x] `components/modals/PerformanceModal.tsx`: Nâng cấp local KpiCard sang khung rounded-xl, squircle icon, gradient top accent và typography đồng bộ.
  - [x] `components/common/SkeletonLoader.tsx`: Nâng cấp KpiCardSkeleton đồng bộ bo góc rounded-2xl, squircle icon và pill progress bar.
- [x] **Giai đoạn 4**: Targeted Testing & TypeScript Verification
  - Chạy `npx tsc --noEmit` và `npx vitest related ...`. Đã vượt qua 100% không lỗi.
