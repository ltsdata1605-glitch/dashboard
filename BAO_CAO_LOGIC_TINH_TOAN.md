# BÁO CÁO RÀ SOÁT LOGIC TÍNH DTQĐ / SỐ LƯỢNG QUY ĐỔI (ĐỢT 1A)
*Lập ngày: 14/07/2026*

## 1. Hiện trạng thực tế của codebase (Rà soát lại ngày 14/07/2026)

Qua kiểm tra rà soát thực tế toàn bộ codebase, kết quả cho thấy tình trạng đồng nhất công thức tính toán **tốt hơn nhiều** so với thời điểm kiểm toán cũ:
- Hầu hết các tệp tin trước đây bị ghi nhận là "tự tính toán lệch chuẩn" như `CrossSellingTable.tsx`, `TrendChart.tsx`, `SavedCalendarCard.tsx`, `PerformanceModal.tsx`, `UncollectedOrdersModal.tsx`, `UnshippedOrdersModal.tsx`, `ContestTable.tsx`, `useHeadToHeadLogic.ts`, `useWarehouseLogic.ts` và `KpiCards.tsx` **ĐÃ được hợp nhất thành công** sang gọi trực tiếp hàm chuẩn `calculateRowMetrics(row, productConfig)` từ `utils/dataUtils.ts`.
- Điều này giúp số liệu doanh thu và số lượng quy đổi khớp nhau hoàn toàn trên hầu hết các màn hình chính (Dashboard, Check thưởng, Lũy kế, Thi đua cá nhân/tổng quan).

---

## 2. Điểm lệch logic thực tế duy nhất còn sót lại

Qua rà soát chuyên sâu, tôi phát hiện ra **01 điểm lệch logic quan trọng** tại:
- **Tệp tin**: [useIndustryAnalysisLogic.ts](file:///Users/ltson/Documents/dashboardycx/components/employees/industry/useIndustryAnalysisLogic.ts) (dòng 292, 296).
- **Vấn đề**: Trong phần xử lý dồn tích dữ liệu cho các tab phân tích (tab hiệu quả và custom tab của nhân viên), đối với mọi cột có kiểu là `'revenue'` (doanh thu), hệ thống luôn cộng dồn:
  `colData.mainDt += price;` (tức là chỉ cộng dồn Doanh thu Thực `COL.PRICE`).
- **Hệ quả**: Nếu người dùng cấu hình một cột dữ liệu của custom tab hoặc sử dụng cột DTQĐ mặc định (có `metricType === 'revenueQD'` hoặc `col.id === 'doanhThuQD'`), cột này **vẫn chỉ được cộng dồn bằng Doanh thu Thực**, dẫn đến việc cột DTQĐ ở tab Phân tích ngành hàng của Nhân viên hiển thị sai lệch số liệu so với các bảng biểu khác.

---

## 3. Đề xuất giải pháp khắc phục (Đợt 1B)

Cập nhật tệp [useIndustryAnalysisLogic.ts](file:///Users/ltson/Documents/dashboardycx/components/employees/industry/useIndustryAnalysisLogic.ts):
1. Gọi hàm chuẩn `calculateRowMetrics(row, productConfig)` để lấy ra `revenue` (Doanh thu Thực) và `revenueQD` (Doanh thu Quy đổi).
2. Tự động nhận diện xem cột dữ liệu đang duyệt có tính chất quy đổi hay không:
   ```typescript
   const isQD = col.metricType === 'revenueQD' || col.id?.toLowerCase().includes('qd') || col.id?.toLowerCase().includes('quy_doi');
   const valToDt = isQD ? metrics.revenueQD : price;
   ```
3. Cộng dồn `valToDt` thay vì luôn cộng dồn `price`:
   ```typescript
   colData.mainDt += valToDt;
   ```

---

## 4. Xác nhận Bug CrossSellingTable.tsx
- **Xác nhận**: Nghi vấn lỗi nhân đôi doanh thu (`price * qty`) tại `CrossSellingTable.tsx` đã được giải quyết triệt để ở lượt sửa đổi trước đó. Tệp tin này hiện đã gọi `calculateRowMetrics()` chuẩn và gán `const doanhThuQD = metrics.revenueQD;` mà không tự nhân `qty` nữa. Do đó, lỗi này đã hoàn toàn biến mất.
