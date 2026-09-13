# Task Plan: Liên kết Target Trả Góp & Target Quy Đổi với cột %T.Góp & HQQĐ

## 1. Mục tiêu (Goals)
- Liên kết giá trị **Target Trả góp** và **Target Quy đổi** (được cấu hình ở tab **Cập nhật** -> **Target Doanh thu**) vào 2 cột **`%T.Góp`** và **`HQQĐ`** trong bảng Doanh thu (`RevenueTab` & `RevenueDesktopRow`).
- Dùng giá trị target động này làm mốc chuẩn để đánh giá dữ liệu và tô màu trạng thái:
  - **`%T.Góp`**: Đánh giá dựa trên `Target Trả góp` (ví dụ: `60%`).
  - **`HQQĐ`**: Đánh giá dựa trên `Target Quy đổi` (ví dụ: `60%`).
- Xử lý phân cấp trạng thái cho các dữ liệu **kém hơn target** (dưới mốc target) với độ tương phản cao, màu sắc đậm nét, rõ ràng.

---

## 2. Các giai đoạn thực hiện (Phases)

### Phase 1: Phân tích & Đặc tả quy tắc điều kiện (Hoàn thành)
- [x] Định vị nguồn dữ liệu Target Trả góp (`targethero-${safeName}-tragop`) và Target Quy đổi (`targethero-${safeName}-quydoi`) trong `TargetHero.tsx`.
- [x] Khảo sát luồng truyền dữ liệu từ `TargetHero` $\rightarrow$ IndexedDB $\rightarrow$ `RevenueTab` / `RevenueDesktopRow`.
- [x] Xác nhận với người dùng về công thức/mức phân tầng cụ thể khi dữ liệu **kém hơn target** (Phương án 3 mức: $\ge 100\%$ Xanh lá, $85\% - < 100\%$ Cam đậm, $< 85\%$ Đỏ đậm).

### Phase 2: Nạp Target Trả Góp & Target Quy Đổi vào RevenueTab (Hoàn thành)
- [x] Trong `RevenueTab.tsx`, nạp `targetTraGop` và `targetQuyDoi` từ IndexedDB theo `supermarketName`.
- [x] Tự động đồng bộ và tính trung bình khi xem ở chế độ nhiều siêu thị / "Tổng hợp".
- [x] Truyền giá trị `targetTraGop` và `targetQuyDoi` xuống component `RevenueDesktopRow` và các dòng tổng phòng ban.

### Phase 3: Cập nhật logic tính màu động theo Target (Hoàn thành)
- [x] Viết hàm `getMetricColorByTarget(val: number, target: number)`.
- [x] Áp dụng cho cột `HQQĐ` (`val = row.hieuQuaQD * 100`, `target = targetQuyDoi`).
- [x] Áp dụng cho cột `%T.Góp` (`val = row.calculatedInstallment`, `target = targetTraGop`).
- [x] Nâng cấp `toBoldVividColor` để loại bỏ màu vàng nhạt, thay bằng Cam đậm (`#ea580c`).

### Phase 4: Kiểm thử & Xác minh (Hoàn thành)
- [x] Chạy `npm run typecheck` (0 errors).
- [x] Chạy `npm run test:unit` (353 tests passed).
- [x] Báo cáo đầy đủ và đính kèm timestamp thực tế.
