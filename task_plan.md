# Task Plan: Thẻ KPI các Ngành hàng (Industry & Sub-Industry KPI Cards)

## 1. Mục tiêu
Tạo lưới các thẻ KPI cho Ngành hàng & Nhóm hàng trong mục "CHI TIẾT NGÀNH HÀNG":
- Có nút `+` để người dùng thêm thẻ KPI (cho phép chọn Ngành hàng hoặc Nhóm hàng).
- Thiết kế thẻ KPI nhỏ gọn, responsive Grid với 6 cột trên 1 hàng (trên màn hình lớn).
- Danh sách 12 thẻ mặc định:
  1. Smartphone
  2. Laptop
  3. Iphone
  4. Đồng hồ thời trang
  5. Sim data
  6. Pin sạc dự phòng
  7. Camera
  8. Tai nghe
  9. Tủ lạnh, đông, mát
  10. Tivi
  11. Máy giặt, sấy
  12. Máy lạnh & máy nước nóng
- Cho phép xóa thẻ (nút xóa/remove), khôi phục mặc định.
- Lưu danh sách thẻ đã chọn vào IndexedDB để bảo toàn cấu hình khi tải lại trang.

## 2. Kiến trúc & Phân chia Component (Feature-Sliced Design)
- `features/bi-dashboard/services/industryKpiCalc.ts`:
  - Trích xuất số liệu cho một thẻ (SL, DT Thực, DTQĐ, %TT, %HT, Trả góp, % Trả góp) từ cây ngành hàng (`IndustryTreeNode[]`) hoặc bảng phẳng.
  - Chuẩn hoá và đối soát tên (bỏ mã số, case-insensitive, không dấu).
- `features/bi-dashboard/services/industryKpiCalc.test.ts`:
  - Unit tests kiểm tra tính chính xác của việc trích xuất số liệu cho cả 12 thẻ mặc định và các ngành/nhóm hàng tùy chọn.
- `features/bi-dashboard/components/dashboard/industryKpi/IndustryKpiCard.tsx`:
  - Component hiển thị thẻ KPI nhỏ gọn, sắc sảo.
- `features/bi-dashboard/components/dashboard/industryKpi/AddIndustryKpiModal.tsx`:
  - Modal chọn thêm Ngành hàng hoặc Nhóm hàng với ô tìm kiếm tiện lợi.
- `features/bi-dashboard/components/dashboard/industryKpi/IndustryKpiGrid.tsx`:
  - Grid 6 cột hiển thị các thẻ KPI kèm nút `+` thêm thẻ và menu tuỳ chỉnh.
- `features/bi-dashboard/components/dashboard/industryKpi/index.ts`:
  - Public export API.
- Tích hợp vào `IndustryView.tsx` phía trên bảng dữ liệu.

## 3. Các bước thực hiện
- [x] Bước 1: Tạo `industryKpiCalc.ts` và viết unit test `industryKpiCalc.test.ts`.
- [x] Bước 2: Chạy unit test để kiểm tra logic tính toán dữ liệu thẻ KPI.
- [x] Bước 3: Tạo `IndustryKpiCard.tsx`, `AddIndustryKpiModal.tsx`, `IndustryKpiGrid.tsx`, và `index.ts`.
- [x] Bước 4: Tích hợp `IndustryKpiGrid` vào `IndustryView.tsx`.
- [x] Bước 5: Kiểm tra TypeScript `npx tsc --noEmit` và chạy targeted test suite (44/44 tests passed).
- [x] Bước 6: Đánh giá visual và báo cáo kết quả kèm timestamp.
