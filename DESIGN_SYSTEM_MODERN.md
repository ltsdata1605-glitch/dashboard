# DESIGN SYSTEM MODERN — DASHBOARD YCX
> Nguồn chân lý cho đợt nâng cấp giao diện (Clean Executive). Mọi prompt trong
> `KE_HOACH_NANG_CAP_GIAO_DIEN.md` bám theo tài liệu này. Nền tảng token đã có sẵn trong
> `styles/tokens.css` + `styles.css` — tài liệu này hướng dẫn **cách DÙNG** cho nhất quán.

---

## 0. Nguyên tắc nền (bất biến)
1. **Phong cách: Clean Executive** — nền trắng, bóng đổ mềm, accent **sky**, nhiều khoảng thở ở laptop, số liệu sắc nét. Nghiêm túc – chuyên nghiệp, hợp báo cáo doanh thu.
2. **CHỈ chế độ Sáng** — Dark Mode đã tắt toàn dự án (`LayoutContext` ép Sáng). **KHÔNG viết class `dark:` mới**; class `dark:` cũ để yên (vô hiệu). Block `.dark` trong tokens.css cũng vô hiệu.
3. **Palette semantic duy nhất**: `sky` (primary) · `slate` (neutral) · `emerald` (tốt/tăng) · `amber` (cảnh báo) · `rose` (xấu/giảm). `indigo` = alias hợp lệ của sky (styles.css override). Không thêm màu ngoài.
4. **Khung nội dung laptop**: giữ `max-w-[960px] mx-auto`. Mobile: full-bleed.
5. **Breakpoint chính `lg` = 1024px**: `< lg` = **Mobile/Tablet**, `≥ lg` = **Laptop/Desktop**. `sm` (640) chỉ tinh chỉnh tablet.
6. **Component dùng chung**: button/modal/input/badge/dropdown qua `components/shared/ui/*`. Không `<button>` thô, không tự dựng modal.
7. **Không đụng logic/tính toán** — chỉ sửa trình bày.

---

## 1. Token & util class ĐÃ CÓ (dùng lại, đừng tạo mới)

### Token CSS (`styles/tokens.css`) — đã đầy đủ, không cần thêm
- **Spacing** (4/8pt): `--p-space-0..24`. → Tailwind: `p-2 p-3 p-6`, `gap-2.5 gap-4`, `space-y-3 space-y-6`.
- **Radius**: `--p-radius-sm..3xl,full`. → `rounded-lg` (input/button), `rounded-xl`/`rounded-2xl` (card), `rounded-full` (badge), `rounded-none` (bảng + card mobile).
- **Shadow**: `--p-shadow-xs..2xl`. → `shadow-sm` (card tĩnh), `shadow-md` (hover), `shadow-xl` (dropdown/modal).
- **Typography**: `--text-caption(10) / overline(11) / label(12) / body-sm(13) / body(14) / body-lg(16) / heading-sm(18) / heading(20) / heading-lg(24) / display(30)`. Font chính **UTM Avo**.
- **Motion**: `--p-duration-fast/normal/slow` (100/200/300ms), `--p-ease-default/spring`.
- **Component tokens**: card/button/input/modal/badge/table/topbar/stat/progress/tooltip/skeleton đã khai báo.

### Util class có sẵn (`styles.css`) — ưu tiên tái sử dụng
| Class | Dùng cho |
|---|---|
| `.premium-card-shadow` | Bóng card cao cấp (đã tối ưu mobile) |
| `.touch-feedback` | Phản hồi chạm (`active:scale`) trên phần tử bấm được |
| `.progress-shimmer` | Thanh tiến độ có hiệu ứng chạy |
| `.animate-pulse-glow-green` / `-amber` | Icon khi đạt/gần đạt target |
| `.animate-section-in` | Section xuất hiện mượt |
| `.no-scrollbar` / `.hide-scrollbar` | Dải cuộn ngang mobile (ẩn thanh cuộn) |
| `.scroll-fade-right` / `.scroll-fade-both` | Gợi ý còn nội dung khi cuộn ngang |
| `.snap-scroll-x` | Cuộn ngang snap (filter pill, KPI strip) |
| `.custom-scrollbar` | Thanh cuộn mảnh 6px |
| `.surface-card` / `.chart-card` | Khung card/chart (⚠️ chứa dark: cũ — vô hiệu, vẫn dùng được ở Sáng) |

> ⚠️ Tối ưu pin mobile đã có: `< 1024px` tự tắt shimmer/glow/blur. Không cần lo hiệu năng khi thêm hiệu ứng — chúng chỉ chạy ở laptop.

---

## 2. Responsive — Mobile vs Laptop (quy tắc + ví dụ class)

| Yếu tố | Mobile (`< lg`) | Laptop (`≥ lg`) |
|---|---|---|
| **Container** | full-bleed `w-full`, `px-0 sm:px-2` | `max-w-[960px] mx-auto px-4` |
| **Section card** | `rounded-none border-y border-slate-200 premium-card-shadow` | `rounded-2xl border border-slate-200 shadow-sm hover:shadow-md` |
| **Padding card** | `p-3` | `lg:p-6` |
| **Khoảng cách section** | `space-y-3` | `lg:space-y-6` |
| **Lưới KPI** | `grid-cols-2` | `lg:grid-cols-4` (`sm:grid-cols-3`) |
| **Toolbar** | sticky gọn, icon nhỏ (`lg:hidden`) | icon to (`hidden lg:block`), actions rõ |
| **Bảng** | `overflow-x-auto no-scrollbar` + cột đầu `sticky left-0` | full width trong card |
| **Giá trị KPI** | hiển thị inline cạnh nhãn | dòng riêng, số lớn `tabular-nums` |
| **Touch target** | ≥ 44px (`h-11`/`min-h-[44px]`) | bình thường + hover states |
| **Hiệu ứng nặng** | tắt tự động (xem §1) | bật đầy đủ |

**Chuẩn 1 "Card section" (mobile→laptop):**
```html
<section class="bg-white rounded-none lg:rounded-2xl border-y lg:border border-slate-200
                shadow-sm lg:hover:shadow-md transition-shadow p-3 lg:p-6 premium-card-shadow">
  ...
</section>
```

**Toolbar responsive — kỹ thuật "double-icon" (1 Button, đổi cỡ icon theo breakpoint):**
```html
<Button variant="ghost" size="icon" ...>
  <Icon name="camera" size={4} className="lg:hidden" />
  <Icon name="camera" size={5} className="hidden lg:block" />
</Button>
```

---

## 3. Component pattern chuẩn (8 mẫu)

> **Đã trích xuất PHẦN B**: 3 pattern lõi (SectionCard, SectionHeader, KpiCard) đã chuyển vào
> `components/shared/ui/` — nơi CẢ 4 khu vực (Root, `bi-dashboard`, `phan-ca`, `sticker-event`)
> được phép import theo CLAUDE.md. Import qua barrel: `import { SectionCard, SectionHeader, KpiCard } from '.../shared/ui'`
> (điều chỉnh số cấp `../` theo vị trí file gọi).

### 3.1 SectionCard
`components/shared/ui/SectionCard.tsx`. Khung bọc mọi section — mobile phẳng full-bleed
(`rounded-none border-y`), laptop bo góc nổi (`rounded-2xl border shadow-sm hover:shadow-md`).
Chỉ cấp bg/rounded/border/shadow/overflow — **không** áp padding (header/body tự quản lý).
Khác với `Card` (có sẵn trong shared/ui, tĩnh không đổi theo breakpoint, dùng cho card thường) —
`SectionCard` dành riêng cho khung section cấp trang cần đổi hình mobile↔laptop.

```tsx
import { SectionCard, SectionHeader } from '../shared/ui'; // hoặc '../../shared/ui' tuỳ vị trí

<SectionCard className="mb-3 lg:mb-8" ref={myExportRef}>
  <SectionHeader title="TIÊU ĐỀ SECTION" icon="bar-chart-3" subtitle="Mô tả phụ">
    {/* toolbar actions bên phải, xem 3.2 */}
  </SectionHeader>
  <div className="p-2 lg:p-6">{/* nội dung */}</div>
</SectionCard>
```
Có `hoverable?: boolean` (mặc định `true`) để tắt hover-shadow khi section không tương tác.
Nếu section có state riêng (vd. `isFullScreen` đổi hẳn sang `fixed inset-0`), **không ép** dùng
`SectionCard` — giữ `<div>` thường với className rẽ nhánh thủ công (xem `WarehouseSummary.tsx`,
`SummaryTable.tsx` làm mẫu) để tránh xung đột class khi override.

### 3.2 SectionHeader + toolbar
`components/shared/ui/SectionHeader.tsx`. Trái: icon chip (`bg-sky-600/10 text-sky-600`) + tiêu đề
(`text-sm lg:text-xl font-bold text-slate-800 uppercase`) + subtitle phụ. Phải: `children` (toolbar
actions) dùng kỹ thuật **double-icon** — 1 `<Button>` chứa 2 `<Icon>` (nhỏ `lg:hidden` / to `hidden
lg:block`) thay vì 2 khối JSX tách biệt:
```tsx
<Button variant="unstyled" size="none" onClick={...} className="p-1.5 lg:p-2 rounded-md hover:bg-slate-100">
  <Icon name="camera" size={4} className="lg:hidden" />
  <Icon name="camera" size={5} className="hidden lg:block" />
</Button>
```
Khác với `CardHeader` (có sẵn trong shared/ui, đơn giản, không icon chip) — dùng `SectionHeader`
cho section cấp trang. **Không** thêm `sticky` vào `SectionHeader` — sticky toolbar (nếu cần) đã có
sẵn ở cấp `FilterBar`/thanh công cụ trang, tránh chồng 2 lớp sticky.

### 3.3 KPI Card
`components/shared/ui/KpiCard.tsx` (tách từ `components/kpis/KpiCards.tsx`, component trình bày
thuần — chỉ nhận props, không phụ thuộc hook/context nên dùng được ở cả `features/*`). Dải gradient
accent trên, icon chip nền tint + `glowColor`, số `tabular-nums`, nhãn `text-[9px] lg:text-[11px]
uppercase text-slate-400`, progress bar `progress-shimmer`, footer trend emerald/rose.
```tsx
import { KpiCard } from '../shared/ui/KpiCard';

<KpiCard icon="wallet" iconColor="sky" title="Doanh thu" trendLabel="Mục tiêu" trendValue="85%" progressPercent={85}>
  <div className="text-[15px] lg:text-2xl font-extrabold tabular-nums text-sky-600">1.2 Tỷ</div>
</KpiCard>
```
Lưới bọc ngoài: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 lg:gap-4`.
Khác với `StatCard` (có sẵn trong shared/ui, đơn giản hơn — không progress/gradient) — dùng
`KpiCard` khi cần thể hiện tiến độ so với target.

### 3.4 Chart Card
Bọc bằng `SectionCard` + header qua `SectionHeader`; thân chart cao vừa ở mobile, legend
cuộn/đưa xuống; tooltip `rounded-lg shadow-xl bg-white`; màu chuỗi = ramp semantic (sky/emerald/
amber/rose + sắc độ). Không nhánh `isDark` (luôn 1 bảng màu Sáng — dark mode đã tắt toàn dự án).

### 3.5 Table
Header: `text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50`, có thể
`sticky top-0 z-30` khi cần cố định lúc cuộn dọc (xem mẫu `MonthlyTrendTable.tsx`/`SummaryTable.tsx`).
Ô: `text-[11px] sm:text-[13px]`, thêm `tabular-nums` **1 lần ở cấp `<table>`** (kế thừa CSS cho
toàn bộ ô con, không cần sửa từng span). Mobile: khung `overflow-x-auto no-scrollbar`, cột đầu
`sticky left-0 bg-white z-10`. Row hover `hover:bg-slate-50`. Tăng/giảm: `text-emerald-600`/
`text-rose-600`. Bảng luôn `rounded-none`, viền mảnh `border-slate-200`.

### 3.6 Filter pill / chip
`rounded-full` `text-label` `px-3 h-8`; active nền `sky-50 text-sky-700 border-sky-200`; dải pill cuộn ngang dùng `snap-scroll-x no-scrollbar`.

### 3.7 Empty state
Dùng `EmptyState` có sẵn trong `components/shared/ui/EmptyState.tsx` — **không tự viết lại**
khối icon+text rải rác mỗi nơi:
```tsx
import { EmptyState } from '../shared/ui/EmptyState';
import { Icon } from '../common/Icon';

<EmptyState icon={<Icon name="inbox" size={5} />} title="Không có dữ liệu" compact />
```
`compact` cho khung nhỏ (trong card/ô bảng); mặc định (không `compact`) cho khung lớn, có thể
thêm `description` + `action` (nút `shared/ui/Button`).

### 3.8 Skeleton
`components/common/SkeletonLoader.tsx` (Root: `KpiCardsSkeleton`/`ChartSkeleton`/`TableSkeleton`/
`TabbedTableSkeleton`) — khung khớp `SectionCard` thật (`rounded-none lg:rounded-2xl border-y
lg:border shadow-sm`) để không "nhảy" khung khi load xong dữ liệu. `features/*` nên tự viết
skeleton riêng theo cùng công thức hình dạng này (không ép dùng chung 1 component vì kích thước
KPI/chart mỗi feature khác nhau) — xem `components/shared/ui/Skeleton.tsx` (`SkeletonCard`/
`SkeletonTable`/`SkeletonChart`) làm khối dựng sẵn nếu feature cần nhanh.

---

## 4. Checklist 12 điểm (đối chiếu khi áp cho mọi màn hình)
1. [ ] Bọc trong **`SectionCard`** (`components/shared/ui/SectionCard.tsx`) đúng pattern (mobile phẳng / laptop bo góc nổi) — trừ section có state riêng kiểu `isFullScreen` (xem ngoại lệ ở §3.1).
2. [ ] Container laptop `max-w-[960px] mx-auto` (Root/Phân Tích) — `features/*` giữ khung container hiện có của feature, không ép 960px nếu phá layout riêng; mobile full-bleed, **không tràn ngang**.
3. [ ] Spacing theo chuẩn: `p-3 lg:p-6`, `space-y-3 lg:space-y-6`, `gap-2.5 lg:gap-4`.
4. [ ] Chỉ **palette semantic** (sky/slate/emerald/amber/rose, indigo=alias). Không màu lạ.
5. [ ] Typography theo token (`text-overline` header bảng, số `tabular-nums` — thêm 1 lần ở cấp `<table>`, tiêu đề `font-bold text-slate-800`).
6. [ ] Bóng: card `shadow-sm`, hover `shadow-md`, modal/dropdown `shadow-xl`. Không lạm dụng `shadow-lg`.
7. [ ] Header section dùng **`SectionHeader`** (`components/shared/ui/SectionHeader.tsx`); toolbar responsive **double-icon**, không tạo 2 khối JSX tách biệt.
8. [ ] Bảng: header (có thể `sticky top-0`) + `rounded-none` + mobile cuộn ngang cột đầu sticky.
9. [ ] Nút/modal/input/badge/KPI card/empty-state **qua `shared/ui/*`** (`Button`, `Modal`, `KpiCard`, `EmptyState`...), không tự viết lại thô.
10. [ ] Touch target mobile ≥ 44px; có `touch-feedback` ở phần tử bấm.
11. [ ] **KHÔNG** class `dark:` mới; **KHÔNG** đụng logic/tính toán/data flow riêng của feature.
12. [ ] `npm run check` xanh + test **Mobile 375px** & **Laptop 1280px**.

---

## 5. Báo cáo lệch chuẩn hiện trạng module Phân tích (Lập ngày 14/07/2026)

Qua kiểm tra rà soát chi tiết giao diện module **Phân Tích** (DashboardView và các component con), dưới đây là danh sách các điểm lệch chuẩn cần xử lý trong **PHẦN A**:

1. **`components/employees/EmployeeAnalysis.tsx`** (Dòng 186):
   - **Lệch**: Vẫn đang dùng thẻ div thô với shadow và border tự do (`bg-white shadow-lg border-y sm:border rounded-none sm:rounded-xl`).
   - **Cách sửa (Đợt A1)**: Đổi wrapper ngoài cùng sang dùng component dùng chung `<SectionCard>`.

2. **`components/views/DashboardView.tsx`** (Dòng 540-553):
   - **Lệch**: Toolbar actions trong SectionHeader bọc KPI đang dùng JSX nút bấm thô (`Button variant="unstyled"`) lặp lại nhiều lần.
   - **Cách sửa (Đợt A5)**: Rà soát và tối ưu các actions này theo kỹ thuật double-icon đồng bộ.

3. **`components/kpis/KpiCards.tsx`**:
   - **Lệch**: Khoảng cách grid gap và spacing ở mobile vẫn còn dùng trị số tùy tiện lệch 4/8pt.
   - **Cách sửa (Đợt A2)**: Đồng bộ grid layout: `gap-2.5 lg:gap-4` và `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`.

4. **Typography và bảng biểu (`SummaryTable.tsx`)**:
   - **Lệch**: Cần kiểm tra kỹ việc thêm thuộc tính font `tabular-nums` đồng bộ ở cấp thẻ `<table>` để bảo đảm các số liệu doanh thu căn thẳng hàng sắc nét.
   - **Cách sửa (Đợt A4)**: Xác minh class `tabular-nums` được thêm đúng nơi.
