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

### 3.1 SectionCard
Khung bọc mọi section. Mobile phẳng full-bleed, laptop bo góc nổi. → khuyến nghị tách 1 component `components/common/SectionCard.tsx` dùng lại.

### 3.2 SectionHeader + toolbar
`components/common/SectionHeader.tsx`. Trái: icon + tiêu đề (`text-heading-sm font-bold text-slate-800`). Phải: actions (children) dùng double-icon. Mobile sticky top nền trắng.

### 3.3 KPI Card
`components/kpis/KpiCards.tsx` (đã "premium"). Chuẩn: dải gradient accent trên, icon chip nền tint + `glowColor`, số `tabular-nums` `text-display`, nhãn `text-overline uppercase text-slate-400`, progress `progress-shimmer`, footer trend emerald/rose. Lưới `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 lg:gap-4`.

### 3.4 Chart Card
Header qua SectionHeader; thân chart cao vừa ở mobile, legend cuộn/đưa xuống; tooltip `rounded-lg shadow-xl bg-white`; màu chuỗi = ramp semantic (sky/emerald/amber/rose + sắc độ). Bỏ nhánh `isDark` (luôn LIGHT_COLORS).

### 3.5 Table
Header: `text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50`, sticky khi cuộn dọc. Ô: `text-[11px] sm:text-[13px] tabular-nums` (số căn phải). Mobile: khung `overflow-x-auto no-scrollbar`, cột đầu `sticky left-0 bg-white z-10`. Row hover `hover:bg-slate-50`. Tăng/giảm: `text-emerald-600`/`text-rose-600`. Bảng luôn `rounded-none`, viền mảnh `border-slate-200`.

### 3.6 Filter pill / chip
`rounded-full` `text-label` `px-3 h-8`; active nền `sky-50 text-sky-700 border-sky-200`; dải pill cuộn ngang dùng `snap-scroll-x no-scrollbar`.

### 3.7 Empty state
Giữa khung: icon mờ (`text-slate-300`), câu ngắn (`text-body text-slate-500`), 1 nút hành động (`shared/ui/Button`). Không để trống trơn.

### 3.8 Skeleton
`components/common/SkeletonLoader.tsx` — khối `bg-slate-200 rounded-md animate-shimmer` khớp đúng khung thật (KPI/chart/table). Dùng khi tải.

---

## 4. Checklist 12 điểm (đối chiếu khi áp cho mọi màn hình)
1. [ ] Bọc trong **SectionCard** đúng pattern (mobile phẳng / laptop bo góc nổi).
2. [ ] Container laptop `max-w-[960px] mx-auto`; mobile full-bleed, **không tràn ngang**.
3. [ ] Spacing theo chuẩn: `p-3 lg:p-6`, `space-y-3 lg:space-y-6`, `gap-2.5 lg:gap-4`.
4. [ ] Chỉ **palette semantic** (sky/slate/emerald/amber/rose, indigo=alias). Không màu lạ.
5. [ ] Typography theo token (`text-overline` header bảng, số `tabular-nums`, tiêu đề `font-bold text-slate-800`).
6. [ ] Bóng: card `shadow-sm`, hover `shadow-md`, modal/dropdown `shadow-xl`. Không lạm dụng `shadow-lg`.
7. [ ] Toolbar responsive **double-icon**, không tạo 2 khối JSX tách biệt.
8. [ ] Bảng: header sticky + `rounded-none` + mobile cuộn ngang cột đầu sticky.
9. [ ] Nút/modal/input/badge **qua `shared/ui/*`**, không thô.
10. [ ] Touch target mobile ≥ 44px; có `touch-feedback` ở phần tử bấm.
11. [ ] **KHÔNG** class `dark:` mới; **KHÔNG** đụng logic/tính toán.
12. [ ] `npm run check` xanh + test **Mobile 375px** & **Laptop 1280px**.

---

## 5. Ghi chú hiện trạng (để làm Phần A)
- Token/CSS nền tảng **đã đủ** — không cần thêm token; việc còn lại là **dùng nhất quán** ở tầng component.
- `styles.css` còn nhiều class custom trỏ dark (`.surface-card`, `.chart-card`, `.bg-static-blobs`, scrollbar...) — **để yên** (vô hiệu ở Sáng), không cần dọn trong đợt này.
- Điểm cần chuẩn hoá ở Phần A: đồng nhất khung SectionCard (hiện mỗi section tự viết wrapper), header bảng (cỡ chữ chưa đều), bỏ nhánh `isDark` thừa trong charts, thống nhất lưới KPI & spacing.
