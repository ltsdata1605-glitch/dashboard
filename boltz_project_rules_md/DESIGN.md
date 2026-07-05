# DESIGN.md

## Định hướng thiết kế (đã đối chiếu thật 2026-07-05)

**Bản mô tả "Boltz Crypto Admin Dashboard" bên dưới là định hướng BAN ĐẦU lúc khởi tạo bộ
rule — dự án THẬT hiện tại đã đi theo hướng riêng, không hoàn toàn giống mô tả gốc.** Ưu
tiên đọc `RULES.md` §4 (Design System) và `styles/tokens.css` làm nguồn chân lý, phần dưới
đây chỉ còn đúng ở định hướng chung (sạch, nhiều khoảng trắng, card bo góc, shadow nhẹ):

- Hiện đại, sạch, nhiều khoảng trắng, card trắng bo góc, shadow nhẹ — **vẫn đúng**.
- Tông màu chính THẬT: **Sky (xanh dương) làm brand/primary + Slate làm neutral**, cộng
  Emerald/Amber/Rose cho success/warning/danger (xem token thật bên dưới) — KHÔNG phải
  "trắng, xanh dương, xanh lá, cam, tím" chung chung như mô tả gốc.
- Bo góc THẬT nhỏ hơn nhiều so với mô tả gốc: Button dùng `rounded-md` (~6-8px), Card dùng
  `rounded-xl` (~12px) — KHÔNG dùng bo góc "lớn" 18-24px hay pill-shape cho button (xem
  `RULES.md` §4.1: "Không dùng rounded corners mạnh — tránh `rounded-3xl`").

Không được để mỗi màn hình/mỗi module có style riêng nếu không có lý do rõ ràng.

---

## Design tokens (THẬT — 3 tầng Primitive → Semantic → Component)

**Nguồn chân lý duy nhất là `styles/tokens.css`** (382 dòng, đã có sẵn, KHÔNG cần tạo mới).
Dự án dùng Tailwind CSS 4 (`@theme` trong `styles.css`), KHÔNG có file `tailwind.config.js`.
Token hex trong bản DESIGN.md gốc (`#2463C7`, `#1E1D4E`...) **không tồn tại trong code thật**
— đã bỏ hoàn toàn, thay bằng token thật:

```css
/* Tầng 1 — Primitive (styles/tokens.css, rút gọn) */
--p-sky-500: #0ea5e9;   /* brand chính */
--p-sky-600: #0284c7;
--p-slate-50 … --p-slate-950   /* neutral, đủ 11 bậc */
--p-emerald-500: #10b981;  /* success */
--p-amber-500: #f59e0b;    /* warning */
--p-rose-500: #f43f5e;     /* danger */
--p-violet-500/600/700     /* accent phụ, dùng rải rác */

--p-radius-sm: 4px;  --p-radius-md: 6px;  --p-radius-lg: 8px;
--p-radius-xl: 12px; --p-radius-2xl: 16px; --p-radius-3xl: 24px; --p-radius-full: 9999px;

/* Tầng 2 — Semantic */
--brand: var(--p-sky-500);           --brand-hover: var(--p-sky-600);
--surface-primary: #ffffff;          --surface-ground: var(--p-slate-100);
--text-primary: var(--p-slate-900);  --text-secondary: var(--p-slate-600);
--status-success/warning/danger/info → emerald/amber/rose/sky tương ứng
--shadow-card: var(--p-shadow-sm);   --shadow-modal: var(--p-shadow-xl);

/* Tầng 3 — Component (ví dụ Button, Modal — xem file đầy đủ cho Card/Input/Badge) */
--btn-radius: var(--p-radius-lg);       /* = 8px, KHÔNG phải pill */
--btn-height-sm: 32px; --btn-height-md: 40px; --btn-height-lg: 48px;
--modal-radius: var(--p-radius-2xl);    /* = 16px */
--modal-shadow: var(--shadow-modal);
```

**Lưu ý đặc thù đã biết** (xem `RULES.md` §2.5 điểm 2): `styles.css`'s `@theme` override
`--color-indigo-*` bằng đúng hex của `sky` (VD: `--color-indigo-600: #0584c7`), nên trong
code thật, class Tailwind `indigo-*` và `sky-*` hiện render **giống hệt nhau** ở phần lớn
nơi dùng làm "primary". Một số chỗ khác (VD: `TargetHero.tsx`, `CompetitionTab.tsx`,
`colorTheme` type ở `DataUpdater.tsx`/`SupermarketConfig.tsx`) lại dùng `indigo` như 1 màu
riêng biệt trong bảng màu xoay vòng cùng `sky` — 2 nhóm này đang vô tình trông giống nhau.
Chưa sửa tự động vì rủi ro trộn lẫn 2 ý nghĩa màu khác nhau — xử lý thủ công theo từng
trường hợp nếu cần đụng tới, không tìm-thay hàng loạt `indigo` ↔ `sky`.

---

## Layout chuẩn

### Desktop

```txt
┌───────────────────────────────────────────────────────────────┐
│ Sidebar │ Topbar                                              │
│         ├─────────────────────────────────────────────────────┤
│         │ Main content                                        │
│         │ Header / Filters                                    │
│         │ Statistic cards                                     │
│         │ Charts / Tables / Module content                    │
└─────────┴─────────────────────────────────────────────────────┘
```

CSS tham khảo:

```css
.app-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 280px 1fr;
  background: var(--color-bg);
}

.sidebar {
  background: var(--color-page);
  padding: 32px 28px;
}

.main-content {
  padding: 32px 40px 48px;
}

.content-grid {
  display: grid;
  gap: 28px;
}
```

### Responsive

- Tablet: sidebar có thể thu nhỏ, grid chuyển 2 cột.
- Mobile: sidebar chuyển drawer/bottom nav, card xếp 1 cột.
- Table cần scroll ngang hoặc layout compact.
- Modal mobile phải full width gần sát mép nhưng vẫn có padding.

---

## Component rules

### Button

Tất cả nút phải dùng `components/shared/ui/Button.tsx` — không viết `<button>` thô hoặc
button style rời rạc (đã migrate xong 100% button cũ, xem CHANGELOG 2026-07-05 "Bước 4").

Variants THẬT (`ButtonVariant` type trong `Button.tsx`) — **KHÔNG có `success`**:

- `primary` — `bg-sky-600 hover:bg-sky-700 text-white`
- `secondary` — `bg-white dark:bg-slate-800 border border-slate-300 ...`
- `danger` — `bg-rose-600 hover:bg-rose-700 text-white`
- `ghost` — `bg-transparent ... hover:bg-slate-100 dark:hover:bg-slate-800`
- `outline` — `bg-transparent text-sky-600 border border-sky-300 ...`

Sizes THẬT (`ButtonSize` type) — có thêm `icon` so với bản mô tả gốc:

- `sm` — `h-8 px-3 text-xs rounded-md`
- `md` — `h-9 px-4 text-sm rounded-md` (mặc định)
- `lg` — `h-11 px-6 text-base rounded-md`
- `icon` — `h-9 w-9 rounded-md p-0` (nút chỉ có icon, không có text)

Style thật (tóm tắt từ `baseStyles` trong `Button.tsx`) — **bo góc `rounded-md`, KHÔNG phải
pill/tròn hoàn toàn** như bản mô tả gốc từng ghi:

```ts
// baseStyles áp dụng cho MỌI variant:
'inline-flex items-center justify-center font-medium transition-colors duration-200 ' +
'outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'

// Mỗi size tự quyết định radius riêng qua className (VD: 'h-9 px-4 text-sm rounded-md'),
// KHÔNG có 1 radius pill cố định dùng chung cho mọi button.
```

Có sẵn `leftIcon`/`rightIcon`/`isLoading` prop (spinner tự động khi `isLoading=true`) — dùng
prop này thay vì tự chèn icon thủ công vào `children` khi có thể.

Không được tạo mỗi nơi một class/component button riêng nếu chức năng giống nhau — nếu cần
1 biến thể mới thật sự không có sẵn, thêm vào `Button.tsx` (thêm variant/size mới), không
tạo component `Button` thứ 2.

---

### Card

Card chuẩn:

```css
.card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: 24px;
}

.card:hover {
  box-shadow: var(--shadow-card-hover);
}
```

Quy tắc THẬT (token `--card-radius`/`--card-padding` trong `styles/tokens.css`):

- Card dùng radius `--p-radius-xl` = **12px** (KHÔNG phải 18-24px như mô tả gốc).
- Shadow nhẹ (`--shadow-card` = `--p-shadow-sm`), hover chuyển sang `--shadow-card-hover`.
- Padding mặc định `--card-padding` = `--p-space-6` = **24px**.
- Header card gồm title, subtitle/action nếu cần.

---

### Modal / Dialog / Popup

Component thật: `components/shared/ui/Modal.tsx` (không phải "Dialog") +
`ConfirmDialog.tsx` (dựng sẵn trên `Modal` cho xác nhận nguy hiểm). Rule chung:

- Overlay: `--modal-overlay` = `rgba(0,0,0,0.5)`.
- Modal nền trắng/`surface-primary`, radius `--modal-radius` = `--p-radius-2xl` = **16px**
  (KHÔNG phải "radius lớn" chung chung — đã đo chính xác).
- Header rõ title (prop `title`/`subTitle`/`titleColorClass`), footer action qua prop
  `footer` — nút trong `footer` render như portal sibling (KHÔNG lồng trong `<form>`), nên
  dùng `type="button" onClick={...}` thay vì `type="submit"` (xem CHANGELOG "Bước 2").
- Nút đóng nằm góc phải (đã migrate sang `Button` với `variant="ghost"`, xem CHANGELOG
  "Bước 4" phần Modal.tsx).
- Không để modal tự style riêng trong từng module — dùng `maxWidth` prop, không tự set
  width bằng style/className tùy tiện.

Kích thước THẬT (prop `maxWidth`, đủ 7 giá trị — bản gốc chỉ liệt kê 4):

```txt
sm: max-w-[420px]
md: max-w-[560px]   (mặc định)
lg: max-w-[720px]
xl: max-w-[960px]
2xl: max-w-2xl       (Tailwind default ~672px)
4xl: max-w-4xl       (Tailwind default ~896px)
full: max-w-[95vw]
```

Trạng thái bắt buộc:

- Loading.
- Error.
- Confirm nếu thao tác nguy hiểm — dùng `ConfirmDialog.tsx` có sẵn, không tự dựng modal
  confirm riêng.
- ESC/click outside theo rule thống nhất (đã implement sẵn trong `Modal.tsx`).

---

### Table / DataTable

Table chuẩn phải có:

- Header rõ ràng.
- Row spacing dễ đọc.
- Action column thống nhất.
- Empty state.
- Loading state.
- Pagination nếu dữ liệu dài.
- Responsive behavior.

Style tham khảo (đổi tên token cho khớp `styles/tokens.css` thật — xem `UI_GUIDELINES.md`
để biết chi tiết đầy đủ style bảng, VD: header pastel `bg-sky-50`/`bg-emerald-50`/
`bg-violet-50`, border `border-slate-200 dark:border-slate-700`):

```css
.table-card {
  background: var(--surface-primary);
  border-radius: var(--p-radius-xl);
  padding: var(--p-space-6);
  box-shadow: var(--shadow-card);
}

.table th {
  text-align: left;
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 600;
}

.table td {
  color: var(--text-secondary);
  font-size: 14px;
  border-top: 1px solid var(--border-subtle);
}
```

---

### Filter

Filter phải cùng style và cùng behavior:

- Có label rõ nếu cần.
- Có default value.
- Có reset/clear.
- Có loading state khi filter ảnh hưởng dữ liệu.
- Filter liên kết phải dùng chung filter state.

Không được để mỗi bảng tự định nghĩa filter format riêng.

---

## Typography

Font THẬT đang dùng (`--font-sans` trong `styles.css`'s `@theme`, KHÔNG phải danh sách
"ưu tiên chọn 1 trong 4" như bản gốc — đây là font-family stack cố định đã áp dụng toàn app):

```css
--font-sans: "UTM Avo", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
```

Không tự ý đổi sang Inter/Poppins/Nunito Sans nếu không có yêu cầu — 2 font đó KHÔNG được
dùng trong dự án này dù từng được liệt kê trong bản DESIGN.md gốc.

Scale: dự án dùng trực tiếp scale chữ của Tailwind (`text-xs`, `text-sm`, `text-[11px]`,
`text-[13px]`...) rải rác theo từng component, KHÔNG có 1 bộ `--font-*` token riêng tập
trung như bản gốc mô tả — đây là điểm chưa chuẩn hóa, có thể cân nhắc khi làm Phase 3
(Design system) nếu muốn gom về token.

Quy tắc màu chữ THẬT (semantic token trong `styles/tokens.css`, KHÔNG phải hex "navy"):

- Heading/text chính: `--text-primary` = `var(--p-slate-900)` (`#0f172a`).
- Body/secondary: `--text-secondary` = `var(--p-slate-600)` (`#475569`).
- Muted: `--text-tertiary` = `var(--p-slate-400)` (`#94a3b8`).
- Không dùng quá nhiều font-size tự phát ngoài scale Tailwind chuẩn.

---

## Checklist UI bắt buộc

- [x] Tất cả button dùng `components/shared/ui/Button.tsx` — **hoàn tất 2026-07-05**, xem
      CHANGELOG "Bước 4" (576/577 nút thô đã migrate, chỉ còn `Button.tsx` chính nó).
- [ ] Sidebar/topbar/main layout đồng nhất.
- [ ] Tất cả modal/popup dùng `components/shared/ui/Modal.tsx`/`ConfirmDialog.tsx`.
- [ ] Tất cả table dùng `components/shared/ui/DataTable.tsx` hoặc style chuẩn theo
      `UI_GUIDELINES.md`.
- [ ] Tất cả card dùng `components/shared/ui/Card.tsx`.
- [ ] Filter thống nhất style và state (lưu ý: mỗi zone `features/*` có `FilterState` riêng,
      KHÔNG dùng chung 1 type — xem `ARCHITECTURE.md`).
- [ ] Loading/empty/error state thống nhất — dự án có `Skeleton.tsx`/`EmptyState.tsx`,
      CHƯA có `ErrorState.tsx` riêng (cần rà soát có thật sự thiếu không trước khi tạo mới).
- [ ] Cả 4 zone (Root, bi-dashboard, phan-ca, sticker-event) dùng chung đúng 2 thứ:
      `components/shared/ui/*` và `utils/dataUtils.ts` — KHÔNG dùng chung gì khác (cách ly
      theo `RULES.md` §2.0, đây là chủ đích, không phải thiếu sót cần "thống nhất thêm").
- [ ] Responsive desktop/tablet/mobile không vỡ layout.
- [ ] Không còn style inline tùy tiện nếu có thể chuyển về class/component.
