# Kế Hoạch Nâng Cấp Thẻ KPI Ngành Hàng & Push Deploy

## Mục Tiêu
Nâng cấp toàn bộ các thẻ trong khu vực **"CHỈ SỐ KPI NGÀNH HÀNG (12 thẻ)"** (Report BI > Chi Tiết Ngành Hàng) sang phong cách Executive Modern chuyên nghiệp, sang trọng, đẳng cấp như các thẻ KPI tổng quan:
1. Thẻ bo góc tròn mượt mà `rounded-2xl` (16px), nền trắng mờ kính cao cấp `bg-white/95 backdrop-blur-xs`, viền `border border-slate-200/90`.
2. Vạch gradient màu ở đỉnh thẻ (`h-[3.5px] w-full shrink-0`) với 12 sắc thái luân phiên từ bảng màu semantic (`sky`, `amber`, `emerald`, `rose`, `slate`).
3. Header: Micro indicator dot tròn phát sáng + Tên ngành hàng in hoa sắc nét + Nút X xóa thẻ tinh gọn khi hover.
4. Hero Metric (Chỉ số chính): **Canh giữa hoàn hảo**, số to rõ `text-[20px] sm:text-[22px] font-black tabular-nums text-slate-800` với đơn vị nổi bật.
5. Footer Sub-Metric (Chỉ số phụ): **Gọn gàng trên 1 dòng ngang**, nhãn bên trái, pill badge thanh lịch bên phải.
6. Container lưới thẻ: Bo góc mềm mại, bộ chuyển đổi toggle "Doanh thu" / "Số lượng" mượt mà, spacing thoáng đãng.

---

## Các Bước Thực Hiện
- [ ] **Bước 1: Nâng cấp `IndustryKpiCard.tsx`**
  - Cập nhật `PASTEL_THEMES` với top accent gradient, dot color, sub-badge styles.
  - Tái cấu trúc layout: Top gradient -> Header với dot tròn + title -> Hero Metric canh giữa -> Footer 1 dòng ngang.
- [ ] **Bước 2: Nâng cấp `IndustryKpiGrid.tsx`**
  - Bo góc container `rounded-2xl`, tối ưu segmented button và header.
  - Tăng khoảng cách lưới `gap-2 sm:gap-2.5` cho bố cục thoáng đãng.
- [ ] **Bước 3: Kiểm tra chất lượng & Silent Verification Test**
  - Chạy `npx tsc --noEmit` và `npm run lint:ratchet`.
  - Chạy test Playwright headless xác thực trên profile thật `.e2e-chrome-profile`.
  - Chụp ảnh màn hình kiểm chứng kết quả.
- [ ] **Bước 4: Push & Deploy toàn diện**
  - Commit và push code lên GitHub `main`.
  - Build và deploy lên GitHub Pages (`https://dashboard.pro.vn/`).
  - Deploy Firebase Functions live (`npm run deploy:functions`).
  - Báo cáo kết quả kèm timestamp `[🕒 YYYY-MM-DD HH:mm:ss]`.
