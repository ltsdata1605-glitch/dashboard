# Task Plan: Chuyển đổi tính năng Check Thưởng sang Native React (Bỏ hoàn toàn iframe)

## 1. Goal
Chuyển đổi hoàn toàn tính năng **Check Thưởng Thi Đua** từ `public/check-thuong.html` (chạy qua thẻ `<iframe>` trong `CheckThuongView.tsx`) sang **Native React Components** 100% trong `features/check-thuong/`. Xoá bỏ hoàn toàn iframe, xoá cầu nối `postMessage` và đồng bộ 2 tầng IndexedDB, giúp màn hình hiển thị tức thì, hỗ trợ Dark Mode hoàn hảo, mượt mà trên mobile và nhất quán với kiến trúc toàn dự án.

## 2. Architecture & Design
- **Mô hình**: Feature-Sliced Design chuẩn mực tại `features/check-thuong/`.
- **Tầng dịch vụ & thuật toán**:
  - `features/check-thuong/services/checkThuongParser.ts`: Đọc file Excel (.xlsx) / CSV theo nhu cầu (`import('xlsx')` dynamic), tiền xử lý `preProcessData`, phân loại 6 nhóm thi đua.
  - `features/check-thuong/services/checkThuongSearch.ts`: So khớp mã kho (`createStoreMatcher`), tính toán tra cứu đơn kho và so sánh 2 kho (Store Comparison).
- **Tầng giao diện (Components chia nhỏ < 300 dòng)**:
  1. `CheckThuongHeroBanner.tsx`: Hiển thị tên siêu thị, tổng tiền thưởng, tỷ lệ % nhóm đạt ≥ 100%, nút xuất ảnh banner.
  2. `CheckThuongStatusSummary.tsx`: Cụm 6 thẻ mini trạng thái (Đạt thưởng, Sắp có, Đạt ≥ 100%, < 100%, Không quỹ, No Sale) kèm thanh bộ lọc pill filter và nút chuyển đổi chế độ xem (Bảng / Thẻ).
  3. `CheckThuongCategoryTable.tsx`: Bảng danh sách ngành hàng (chế độ List view) với thanh tiến độ %DK, hạng VT/%, thưởng và badge sấm sét cho ngành hàng "Sắp có".
  4. `CheckThuongCategoryCards.tsx`: Lưới thẻ ngành hàng (chế độ Card view) với màu pastel phong phú, chi tiết thưởng vượt trội và thưởng top target.
  5. `CheckThuongAnalysisCard.tsx`: Phân tích tự động & Đề xuất hành động (Cơ hội vàng, Môn mấp mé rớt hạng, Môn chưa phát sinh số).
  6. `CheckThuongComparisonView.tsx`: Màn hình So Sánh Trực Diện giữa 2 kho (Thẻ so sánh Winner, Top 3 thế mạnh, Bảng chi tiết so sánh +/- từng ngành hàng).
  7. `CheckThuongRankingModal.tsx`: Hộp thoại xem Bảng Xếp Hạng toàn hệ thống cho từng môn thi khi click vào ngành hàng.
  8. `CheckThuongEmptyDropzone.tsx`: Giao diện kéo-thả hoặc chọn file Excel khi chưa có dữ liệu.
- **Tích hợp chính**:
  - Cập nhật [`CheckThuongView.tsx`](file:///Users/ltson/dashboardycx/components/views/CheckThuongView.tsx) để render trực tiếp React components thay vì iframe.
  - Giữ nguyên các chức năng Header Subtitle Portal, TopBar Search Bar Portal, và chuyển tab "Tra cứu" / "Top thưởng".
- **Xuất ảnh**:
  - Tái sử dụng `html-to-image` từ các tiện ích có sẵn của dự án, tuân thủ Image Export Standard (mở rộng đầy đủ cột, fit content).

## 3. Implementation Phases
- [x] **Phase 1: Service Engine & Data Models**
  - Xây dựng kiểu dữ liệu TypeScript cho ngành hàng, nhóm trạng thái, so sánh và ranking trong `features/check-thuong/types/`.
  - Viết `checkThuongParser.ts` và `checkThuongSearch.ts` với đầy đủ unit test đảm bảo tính toán khớp 100% logic gốc.
- [x] **Phase 2: Xây dựng UI Components (Tra cứu đơn kho)**
  - Xây dựng `CheckThuongEmptyDropzone.tsx`.
  - Xây dựng `CheckThuongHeroBanner.tsx`.
  - Xây dựng `CheckThuongStatusSummary.tsx`.
  - Xây dựng `CheckThuongCategoryTable.tsx` & `CheckThuongCategoryCards.tsx`.
  - Xây dựng `CheckThuongAnalysisCard.tsx`.
  - Xây dựng `CheckThuongRankingModal.tsx` (dùng Modal chuẩn hệ thống).
- [x] **Phase 3: Xây dựng UI Component So Sánh 2 Kho**
  - Xây dựng `CheckThuongComparisonView.tsx` (Thẻ đối đầu Sky/Amber, Top 3 thế mạnh, Bảng chi tiết chênh lệch).
- [x] **Phase 4: Thay thế iframe trong CheckThuongView.tsx & Kiểm thử**
  - Thay thế toàn bộ khối `<iframe>` bằng Native React View (`<CheckThuongSearchView />`).
  - Đồng bộ state giữa Portal thanh Header và View.
  - Chuẩn hoá design system token (loại bỏ hoàn toàn vi phạm `indigo`, `tinyText`, `rawOverlay`, `iconEmoji`).
  - Chạy `npm run typecheck` (0 errors), Vitest targeted test (4/4 PASS), và Playwright E2E silent verification test (100% PASS, 2.7s).

## 4. Status Tracking
- Phase 1: Completed
- Phase 2: Completed
- Phase 3: Completed
- Phase 4: Completed
- **Overall Status**: Hoàn tất 100% chuyển đổi Check Thưởng sang Native React!
