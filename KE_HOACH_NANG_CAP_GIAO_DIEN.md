# KẾ HOẠCH NÂNG CẤP GIAO DIỆN — DASHBOARD YCX
> Mục tiêu: nâng module **Phân Tích** lên chuẩn **hiện đại – chuyên nghiệp**, responsive đủ 2 chế độ
> **Mobile** và **Laptop**, rồi lấy style đó làm **chuẩn** áp cho 3 module còn lại
> (bi-dashboard/Nhân viên, phan-ca, sticker-event).
>
> Mỗi khối "PROMPT" là 1 đơn vị độc lập — copy nguyên khối dán vào Antigravity.
> Làm tuần tự: **PHẦN 0 (chốt design) → PHẦN A (Phân Tích) → PHẦN B (chuẩn hoá) → PHẦN C (3 module)**.

---

## ⚠️ RÀNG BUỘC BẮT BUỘC (nhúng sẵn trong mọi prompt)
- **KHÔNG dùng Dark Mode** — dark mode đã tắt toàn dự án (`LayoutContext` ép Sáng). Không thêm logic dark mới. Class `dark:` cũ để yên (vô hiệu), **không tạo class `dark:` mới**, không tốn công.
- **KHÔNG đụng logic tính toán** — mọi số liệu đi qua `utils/dataUtils.ts → calculateRowMetrics` đã chuẩn hoá; chỉ sửa trình bày (layout/spacing/typography/màu/motion), không đổi công thức, không đổi data flow.
- **Chỉ dùng palette semantic**: sky (primary) / slate (neutral) / emerald (tốt) / amber (cảnh báo) / rose (xấu). Không thêm màu ngoài (indigo là alias sky, được phép).
- **Component dùng chung**: mọi button/modal/input/badge phải qua `components/shared/ui/*`. Không `<button>` thô, không tự dựng modal.
- **Tôn trọng kiến trúc 4 khu vực** (CLAUDE.md): `features/*` không import chéo, không import `hooks/*`/`services/*` gốc. Chỉ chia sẻ `components/shared/ui/*` + `utils/dataUtils.ts`.
- Trước mỗi prompt: **commit trạng thái hiện tại**. Sau khi xong: chạy `npm run check` phải xanh + **test cả 2 viewport Mobile (375px) và Laptop (≥1280px)**.

---

# PHẦN 0 — CHỐT "NGÔN NGỮ THIẾT KẾ HIỆN ĐẠI" (làm trước, là nền tảng)

> Đây là bước quan trọng nhất: định nghĩa **1 hệ thống thiết kế cụ thể** để mọi prompt sau bám theo.
> Không có bước này thì mỗi màn hình sẽ "hiện đại" theo 1 kiểu → lại lệch.

### Đặc tả hệ thống (đề xuất — điều chỉnh nếu muốn)

| Trục | Chuẩn đề xuất |
|---|---|
| **Phong cách** | "Clean Executive Analytics" — nền trắng, bóng đổ mềm, accent sky, nhiều khoảng thở ở laptop, dày-mà-gọn ở mobile, typography số liệu sắc nét. |
| **Breakpoint** | Ranh giới chính **`lg` = 1024px**: `< lg` = **Mobile/Tablet**, `≥ lg` = **Laptop/Desktop**. `sm` (640) chỉ để tinh chỉnh tablet. |
| **Grid nội dung** | Laptop: **giữ** container `max-w-[960px] mx-auto` (gọn – tập trung, theo lựa chọn của bạn); dùng 12-col grid nội bộ để bố trí. Mobile: 1 cột full-bleed. |
| **Spacing (4/8pt)** | Padding card `p-3 lg:p-6`; khoảng cách section `space-y-3 lg:space-y-6`; gap grid `gap-2.5 lg:gap-4`. Dùng nhất quán, bỏ số lẻ tuỳ tiện. |
| **Bo góc** | Card/section: **mobile `rounded-none` (full-bleed, `border-y`) → laptop `rounded-2xl` (`border`)**. Input/button `rounded-lg`. Badge/pill `rounded-full`. Bảng `rounded-none`. |
| **Elevation** | Card tĩnh `shadow-sm`; hover `shadow-md` + `-translate-y-0.5`; dropdown/modal `shadow-xl`. Bỏ lạm dụng `shadow-lg`. |
| **Typography** | Dùng token trong `styles/tokens.css` (đã có `--text-caption/overline/label/body/heading/display`). Header bảng: `text-[11px] font-bold uppercase tracking-wider`. Số KPI: đậm, `tabular-nums`. |
| **Màu vai trò** | Nền app `bg-slate-50`; bề mặt card `bg-white`; chữ chính `text-slate-800`, phụ `text-slate-500`, mờ `text-slate-400`; viền `border-slate-200`. Accent tương tác `sky-600`. |
| **Motion** | `transition-all duration-200/300`; hover nhấc nhẹ; nhấn `active:scale-[0.98]`; skeleton shimmer. Tôn trọng `prefers-reduced-motion`. |
| **Mobile UX** | Touch target ≥ 44px; toolbar sticky gọn; bảng cuộn ngang có **cột đầu sticky**; giá trị KPI hiển thị inline cạnh nhãn; bottom nav. |
| **Laptop UX** | Card bo góc nổi, hover states rõ; KPI 4 cột; chart + grid cạnh nhau khi đủ chỗ; section header sticky; toolbar hành động qua portal `#global-header-actions`. |

### PROMPT 0 — Chốt design tokens & tài liệu chuẩn (CHỈ ĐỌC + ghi tài liệu, KHÔNG sửa UI)
```
Bối cảnh: dự án Dashboard YCX. Đọc CLAUDE.md, DESIGN_SYSTEM.md, CHUAN_THIET_KE_PHAN_TICH.md,
styles/tokens.css, styles.css. Dark mode ĐÃ TẮT toàn dự án — bỏ qua mọi thứ liên quan dark.
Nhiệm vụ CHỈ ĐỌC + ghi 1 file tài liệu, KHÔNG sửa file UI nào.

Mục tiêu: chốt "ngôn ngữ thiết kế hiện đại - chuyên nghiệp" thành 1 nguồn chân lý duy nhất để mọi
màn hình bám theo, dựa trên bảng đặc tả sau (điều chỉnh cho khớp token đã có trong tokens.css):
  - Phong cách: Clean Executive Analytics (nền trắng, bóng mềm, accent sky, thoáng ở laptop).
  - Breakpoint chính lg=1024px (mobile < lg, laptop >= lg); GIỮ container laptop max-w-[960px] (không mở rộng).
  - Spacing 4/8pt: p-3 lg:p-6, space-y-3 lg:space-y-6, gap-2.5 lg:gap-4.
  - Bo góc: card mobile rounded-none border-y -> laptop rounded-2xl border; input/button rounded-lg; bảng rounded-none.
  - Elevation: card shadow-sm, hover shadow-md + -translate-y-0.5, modal shadow-xl.
  - Typography: dùng token --text-* trong tokens.css; header bảng text-[11px] font-bold uppercase tracking-wider; số KPI tabular-nums.
  - Màu: app bg-slate-50, card bg-white, chữ slate-800/500/400, viền slate-200, accent sky-600. CHỈ palette semantic.
  - Motion: transition duration-200/300, hover nhấc nhẹ, active:scale, tôn trọng prefers-reduced-motion.

Việc cần làm:
1. Đọc tokens.css/styles.css, liệt kê token nào ĐÃ có (spacing/typography/radius/shadow) và token nào CÒN THIẾU cần bổ sung để phục vụ đặc tả trên.
2. Đối chiếu với hiện trạng module Phân Tích (components/views/DashboardView.tsx + components/kpis, tables, charts, summary): chỗ nào đã đạt chuẩn, chỗ nào lệch (liệt kê cụ thể file:dòng).
3. Viết/ cập nhật file DESIGN_SYSTEM_MODERN.md gồm: bảng token cuối cùng, quy tắc responsive Mobile vs Laptop (kèm ví dụ class Tailwind cho từng breakpoint), 6-8 "component pattern" chuẩn (Card section, SectionHeader+toolbar, KPI card, Chart card, Table, Filter pill, Empty/Skeleton, Modal).
4. KHÔNG sửa code UI. Chỉ có thể THÊM token mới vào tokens.css nếu bước 1 xác định thiếu (chỉ thêm, không sửa token đang dùng).

Xuất: DESIGN_SYSTEM_MODERN.md (nguồn chân lý). Báo cáo danh sách lệch chuẩn để làm ở PHẦN A.
```

---

# PHẦN A — NÂNG CẤP MODULE PHÂN TÍCH (chuẩn vàng)

> Làm theo thứ tự A1→A6. Mỗi prompt: commit trước, chạy `npm run check` sau, **test cả Mobile 375px + Laptop 1280px**.
> Phạm vi: `components/views/DashboardView.tsx`, `components/kpis/*`, `components/charts/*`,
> `components/tables/*`, `components/summary/*`, `components/common/SectionHeader.tsx`.

### PROMPT A1 — Khung layout & responsive shell
```
Bối cảnh: Dashboard YCX, module Phân Tích. Đọc CLAUDE.md + DESIGN_SYSTEM_MODERN.md. Dark mode đã tắt.
Trước khi sửa: commit "chore: trước khi nâng cấp layout Phân Tích (A1)".

Mục tiêu: chuẩn hoá KHUNG module Phân Tích theo DESIGN_SYSTEM_MODERN.md, đảm bảo 2 chế độ:
  - Mobile (<lg): 1 cột full-bleed, section là card rounded-none border-y, khoảng cách space-y-3, padding gọn.
  - Laptop (>=lg): GIỮ container max-w-[960px] mx-auto, section card rounded-2xl border shadow-sm, space-y-6, padding p-6.

Việc cần làm (chỉ layout/spacing/wrapper, KHÔNG đổi nội dung/logic/thứ tự section):
1. components/views/DashboardView.tsx: GIỮ container chính max-w-[960px]; chỉ cập nhật các wrapper section cho khớp đặc tả (bo góc, border, shadow, padding, space-y theo breakpoint).
2. Đảm bảo mọi section (WarehouseSummary, KPI, TrendChart, IndustryGrid, SummaryTable) dùng CÙNG 1 "Card section" pattern (nên tách thành 1 component <SectionCard> trong components/common/ dùng lại, nếu chưa có).
3. Kiểm tra không tràn ngang ở mobile (overflow-x), bảng phải cuộn trong khung riêng.

Ràng buộc: không đổi logic, không đổi thứ tự/nội dung section, không thêm dark:.
Xong: npm run check + chụp Mobile 375px & Laptop 1280px. Báo cáo.
```

### PROMPT A2 — KPI cards (đã "premium", tinh chỉnh nhất quán + responsive)
```
Bối cảnh: Dashboard YCX. Đọc DESIGN_SYSTEM_MODERN.md. Dark mode đã tắt.
Trước khi sửa: commit "chore: trước khi nâng cấp KPI cards (A2)".

Mục tiêu: KpiCards (components/kpis/KpiCards.tsx) đã có KpiCard "premium" (gradient strip, icon chip, progress). Chuẩn hoá cho khớp design system + responsive 2 chế độ:
  - Mobile: grid 2 cột, KpiCard gọn — icon + nhãn + số trên 1 hàng, ẩn bớt phụ; touch target đủ lớn.
  - Laptop: grid 4 cột, số lớn tabular-nums, có trend/target footer, hover nhấc nhẹ shadow-md.

Việc cần làm:
1. Thống nhất spacing/typography/elevation của KpiCard theo token (số dùng tabular-nums, nhãn text-caption/overline).
2. Đảm bảo lưới KPI: mobile 2 cột (grid-cols-2), sm 3 cột, laptop 4 cột — gap theo chuẩn.
3. Giữ nguyên dữ liệu/logic KPI (không đụng calculateRowMetrics, không đổi field). Chỉ trình bày.

Xong: npm run check + test 2 viewport. Báo cáo.
```

### PROMPT A3 — Charts (TrendChart + IndustryGrid) hiện đại + responsive
```
Bối cảnh: Dashboard YCX. Đọc DESIGN_SYSTEM_MODERN.md. Dark mode đã tắt (bỏ nhánh isDark trong chart nếu có — luôn dùng bảng màu sáng).
Trước khi sửa: commit "chore: trước khi nâng cấp charts Phân Tích (A3)".

Mục tiêu: components/charts/TrendChart.tsx và IndustryGrid.tsx theo chuẩn "Chart card":
  - Header chart dùng SectionHeader + toolbar (kỹ thuật double-icon lg:hidden / hidden lg:block).
  - Mobile: chart cao vừa phải, chú thích (legend) xuống dưới/cuộn, tránh tràn; số rút gọn.
  - Laptop: chart + lưới cạnh nhau nếu đủ chỗ; tooltip bo góc shadow-xl; màu chuỗi dùng ramp semantic (đã chuẩn hoá — sky/emerald/amber/rose + sắc độ).
  - Vì dark mode đã tắt: có thể đơn giản hoá — bỏ state isDark/MutationObserver theo dõi '.dark', dùng thẳng bảng màu sáng (LIGHT_COLORS). (Kiểm tra kỹ trước khi xoá để không vỡ.)

Ràng buộc: không đổi dữ liệu/tính toán chart. Xong: npm run check + test 2 viewport. Báo cáo.
```

### PROMPT A4 — Bảng (SummaryTable) hiện đại + responsive mobile
```
Bối cảnh: Dashboard YCX. Đọc DESIGN_SYSTEM_MODERN.md. Dark mode đã tắt.
Trước khi sửa: commit "chore: trước khi nâng cấp SummaryTable (A4)".

Mục tiêu: components/tables/SummaryTable.tsx (+ summary/*) theo chuẩn "Table":
  - Header bảng: text-[11px] font-bold uppercase tracking-wider, nền slate nhạt, sticky khi cuộn dọc.
  - Mobile: bảng cuộn ngang trong khung overflow-x-auto riêng, CỘT ĐẦU (tên) sticky trái; hàng đủ cao để chạm; cỡ chữ ô text-[11px] sm:text-[13px].
  - Laptop: full width trong section card, hover row nền slate-50, số căn phải tabular-nums, phân cách nhóm cột rõ.
  - Zebra nhẹ (tuỳ chọn) + trạng thái tăng/giảm dùng emerald/rose.

Ràng buộc: không đổi logic sắp xếp/lọc/tính. Xong: npm run check + test 2 viewport (đặc biệt cuộn ngang mobile). Báo cáo.
```

### PROMPT A5 — SectionHeader & toolbar thống nhất (mobile + laptop)
```
Bối cảnh: Dashboard YCX. Đọc DESIGN_SYSTEM_MODERN.md. Dark mode đã tắt.
Trước khi sửa: commit "chore: trước khi chuẩn hoá SectionHeader (A5)".

Mục tiêu: components/common/SectionHeader.tsx thành component header CHUẨN dùng lại toàn app:
  - Tiêu đề + icon trái; vùng actions phải (children).
  - Toolbar responsive dùng kỹ thuật double-icon (1 Button chứa Icon nhỏ lg:hidden + Icon to hidden lg:block) thay vì 2 khối JSX.
  - Mobile: sticky top, nền trắng/blur, gọn; Laptop: có thể to hơn, actions rõ.
  - Chuẩn hoá mọi SectionHeader trong Phân Tích dùng đúng pattern này.

Ràng buộc: không đổi hành vi nút. Xong: npm run check + test 2 viewport. Báo cáo.
```

### PROMPT A6 — Trạng thái loading / skeleton / empty
```
Bối cảnh: Dashboard YCX. Đọc DESIGN_SYSTEM_MODERN.md. Dark mode đã tắt.
Trước khi sửa: commit "chore: trước khi nâng cấp skeleton/empty (A6)".

Mục tiêu: chuẩn hoá trạng thái tải & rỗng của Phân Tích cho chuyên nghiệp:
  - Skeleton (components/common/SkeletonLoader.tsx) khớp đúng khung KPI/chart/table thật, shimmer mượt.
  - Empty state (chưa có dữ liệu / lọc ra 0 dòng): có icon + câu hướng dẫn ngắn + nút hành động (shared/ui/Button).
  - Đồng nhất ở cả 2 viewport.

Xong: npm run check + test 2 viewport (thử trạng thái rỗng). Báo cáo.
```

---

# PHẦN B — CHUẨN HOÁ THÀNH DESIGN SYSTEM DÙNG LẠI

### PROMPT B — Trích xuất pattern Phân Tích thành component/tài liệu dùng chung
```
Bối cảnh: Dashboard YCX. Module Phân Tích đã nâng cấp xong (PHẦN A). Đọc DESIGN_SYSTEM_MODERN.md.
Trước khi sửa: commit "chore: trước khi trích xuất design system dùng lại (B)".

Mục tiêu: biến style Phân Tích thành bộ dùng lại được cho 3 module khác:
1. Rà các pattern lặp trong Phân Tích (SectionCard, SectionHeader+toolbar, KpiCard, ChartCard khung, Table khung, Empty/Skeleton) — bảo đảm chúng nằm trong components/common/ hoặc components/shared/ui/ (nơi CẢ 4 khu vực được phép dùng chung theo CLAUDE.md), KHÔNG nằm sâu trong components riêng của Phân Tích.
2. Nếu component còn phụ thuộc hook/service gốc (features/* không import được) → tách phần trình bày thuần (nhận props) để tái sử dụng.
3. Cập nhật DESIGN_SYSTEM_MODERN.md: mỗi pattern kèm "cách dùng" + ví dụ code, và checklist 12 điểm để đối chiếu khi áp cho module khác.

Ràng buộc: đây là SHARED — grep kỹ import trước khi di chuyển/đổi tên; không phá Phân Tích.
Xong: npm run check. Báo cáo danh sách component dùng chung + checklist.
```

---

# PHẦN C — ÁP STYLE CHUẨN CHO 3 MODULE CÒN LẠI

> Mỗi module 1 prompt. Đây là các khu vực **ISOLATED** — sửa an toàn, không ảnh hưởng khu vực khác.
> Nguyên tắc: **giữ nguyên chức năng/logic**, chỉ khoác lại giao diện theo DESIGN_SYSTEM_MODERN.md,
> responsive đủ Mobile + Laptop. Làm theo checklist 12 điểm ở PHẦN B.

### PROMPT C1 — Module Nhân viên (features/bi-dashboard)
```
Bối cảnh: Dashboard YCX, module Nhân viên (features/bi-dashboard, tab 'employees'). Đọc CLAUDE.md +
DESIGN_SYSTEM_MODERN.md + checklist PHẦN B. Dark mode đã tắt. Đây là khu vực ISOLATED.
Trước khi sửa: commit "chore: trước khi áp style chuẩn cho bi-dashboard (C1)".

Mục tiêu: khoác lại UI toàn bộ màn hình bi-dashboard theo chuẩn Phân Tích (SectionCard, SectionHeader+toolbar,
KpiCard, ChartCard, Table, Empty/Skeleton), responsive Mobile (<lg) + Laptop (>=lg) đúng đặc tả.

Cách làm BẮT BUỘC theo lô, có kiểm mắt:
1. Liệt kê các màn hình/tab chính của bi-dashboard (Dashboard tổng, Nhân viên: Bonus/Competition/Detail/Revenue...).
2. Làm TỪNG màn hình một, dùng component dùng chung ở PHẦN B; sau mỗi màn hình xem lại Mobile + Laptop.
3. Chỉ đổi trình bày — KHÔNG đụng logic bonus/competition/tính toán; features/* KHÔNG được import hooks/services gốc.
4. Sau mỗi 2-3 màn hình chạy npm run check.

Xong: npm run check + test 2 viewport toàn module. Báo cáo từng màn hình + ảnh.
```

### PROMPT C2 — Module Phân ca (features/phan-ca)
```
(Như C1 nhưng phạm vi = features/phan-ca, tab 'tools-phanca'. Commit "chore: trước khi áp style chuẩn cho phan-ca (C2)".
Lưu ý riêng: bảng xếp ca (ScheduleTable) là lưới dày đặc — áp chuẩn "Table" + cuộn ngang mobile + cột đầu sticky;
màu ca giữ ý nghĩa phân loại nhưng dùng palette semantic. phanca.css: chuyển dần class custom sang Tailwind theo
chuẩn, KHÔNG thêm dark:. Không đụng logic xếp ca/xuất Google Sheets.)
```

### PROMPT C3 — Module In tem sự kiện (features/sticker-event)
```
(Như C1 nhưng phạm vi = features/sticker-event, tab 'tools-print-sticker'. Commit "chore: trước khi áp style chuẩn cho sticker-event (C3)".
⚠️ Lưu ý chí tử: vùng XEM TRƯỚC CON TEM và printService.ts là nội dung IN (giấy trắng, khổ in cố định) — CHỈ
khoác lại phần CHROME (toolbar, panel, modal, form nhập, list), TUYỆT ĐỐI không đổi layout/khổ vùng in tem.
Nút brand Google-yellow #fbbc04 giữ nguyên. Không đụng logic in/scan.)
```

---

## THỨ TỰ & MẸO
1. **PHẦN 0** (Prompt 0) — chốt design tokens + DESIGN_SYSTEM_MODERN.md. Duyệt trước khi đi tiếp.
2. **PHẦN A** (A1→A6) — nâng Phân Tích. Đây là "bản mẫu vàng", làm kỹ nhất.
3. **PHẦN B** — trích xuất component/tài liệu dùng chung + checklist.
4. **PHẦN C** (C1→C3) — áp cho 3 module, mỗi module làm từng màn hình, kiểm mắt Mobile + Laptop.

> Sau mỗi prompt: `npm run check` xanh + test **Mobile 375px và Laptop ≥1280px** rồi mới commit.
> Nếu muốn xem trực tiếp: chạy `npm run dev` và dùng DevTools bật device toolbar để đối chiếu 2 chế độ.
