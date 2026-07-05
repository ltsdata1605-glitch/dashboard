# DESIGN.md

## Định hướng thiết kế

Toàn bộ dự án phải đi theo style **Boltz Crypto Admin Dashboard**:

- Hiện đại.
- Sạch.
- Cao cấp.
- Fintech/dashboard style.
- Nhiều khoảng trắng.
- Card trắng, bo góc lớn, shadow nhẹ.
- Text dễ đọc, ưu tiên navy thay vì đen thuần.
- Tông màu chính: trắng, xanh dương, xanh lá, cam, tím.

Không được để mỗi màn hình/mỗi module có style riêng nếu không có lý do rõ ràng.

---

## Design tokens

Nên đưa các token này vào CSS variables, Tailwind config hoặc theme file dùng chung.

```css
:root {
  --color-primary: #2463C7;
  --color-primary-hover: #1F57B3;
  --color-primary-dark: #1E1D4E;
  --color-primary-soft: #EAF2FF;

  --color-bg: #F4F7FF;
  --color-page: #FFFFFF;
  --color-card: #FFFFFF;
  --color-surface: #F8FAFF;

  --color-text-main: #1E1D4E;
  --color-text-secondary: #636B7B;
  --color-text-muted: #A5ADBA;

  --color-border: #EEF1F6;
  --color-divider: #EEF1F6;

  --color-success: #37C871;
  --color-warning: #F5A623;
  --color-danger: #FF5B75;
  --color-orange: #FF731D;
  --color-purple: #633DC7;

  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-pill: 999px;

  --shadow-card: 0 18px 45px rgba(30, 45, 90, 0.06);
  --shadow-card-hover: 0 22px 55px rgba(30, 45, 90, 0.10);
  --shadow-button: 0 12px 24px rgba(36, 99, 199, 0.22);

  --space-4: 4px;
  --space-8: 8px;
  --space-12: 12px;
  --space-16: 16px;
  --space-20: 20px;
  --space-24: 24px;
  --space-28: 28px;
  --space-32: 32px;
  --space-40: 40px;
}
```

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

Tất cả nút phải dùng component chuẩn, không viết button style rời rạc.

Variants:

- `primary`
- `secondary`
- `ghost`
- `danger`
- `success`
- `outline`

Sizes:

- `sm`
- `md`
- `lg`

Style mặc định:

```css
.button {
  border-radius: var(--radius-pill);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: 160ms ease;
}

.button-primary {
  background: var(--color-primary);
  color: #FFFFFF;
  box-shadow: var(--shadow-button);
}
```

Không được tạo mỗi nơi một class button riêng nếu chức năng giống nhau.

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

Quy tắc:

- Card chính dùng radius 18px-24px.
- Shadow nhẹ, không dùng shadow đậm.
- Padding thống nhất 24px hoặc 28px.
- Header card gồm title, subtitle/action nếu cần.

---

### Modal / Dialog / Popup

Tất cả modal/popup phải dùng chung rule:

- Overlay nền đen trong suốt nhẹ.
- Modal nền trắng.
- Radius lớn.
- Header rõ title.
- Footer có action primary/secondary.
- Nút đóng nằm góc phải.
- Không để modal tự style riêng trong từng module.

Kích thước:

```txt
sm: 420px
md: 560px
lg: 720px
xl: 960px
```

Trạng thái bắt buộc:

- Loading.
- Error.
- Confirm nếu thao tác nguy hiểm.
- ESC/click outside theo rule thống nhất.

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

Style tham khảo:

```css
.table-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-card);
}

.table th {
  text-align: left;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
}

.table td {
  color: var(--color-text-secondary);
  font-size: 14px;
  border-top: 1px solid var(--color-divider);
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

Font ưu tiên:

- Inter
- Plus Jakarta Sans
- Poppins
- Nunito Sans

Scale:

```css
--font-xs: 11px;
--font-sm: 13px;
--font-md: 14px;
--font-lg: 18px;
--font-xl: 24px;
--font-2xl: 28px;
```

Quy tắc:

- Heading dùng navy đậm `#1E1D4E`.
- Body dùng xám xanh `#636B7B`.
- Muted dùng `#A5ADBA`.
- Không dùng quá nhiều font-size tự phát.

---

## Checklist UI bắt buộc

- [ ] Sidebar/topbar/main layout đồng nhất.
- [ ] Tất cả button dùng shared Button.
- [ ] Tất cả modal/popup dùng shared Dialog/Modal.
- [ ] Tất cả table dùng shared DataTable/Table style.
- [ ] Tất cả card dùng shared Card.
- [ ] Filter thống nhất style và state.
- [ ] Loading/empty/error state thống nhất.
- [ ] 4 app/module riêng lẻ dùng chung design tokens.
- [ ] Responsive desktop/tablet/mobile không vỡ layout.
- [ ] Không còn style inline tùy tiện nếu có thể chuyển về class/component.
