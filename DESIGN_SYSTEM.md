# ANTIGRAVITY DESIGN SYSTEM (STORYBOOK)

Tài liệu nội bộ dành cho đội ngũ phát triển giao diện (UI Developers). Tất cả components và layout khi xây dựng mới bắt buộc phải tuân thủ Design System này để đảm bảo tính đồng bộ (Consistency).

> **Trạng thái**: file này từng bị xoá nhầm ở commit `8675fd05`, khôi phục ngày 2026-09-10 và đã
> **đối chiếu lại với code thật**. `CLAUDE.md` viện dẫn file này, và skill `ui-system-master`
> cũng trỏ vào đây — thiếu nó thì agent rơi xuống công cụ sinh bảng màu ngoài chuẩn.
>
> Thứ tự ưu tiên khi có mâu thuẫn: `AGENT_RULES.md` > `RULES.md` > **file này**.

## 1. DESIGN TOKENS (COLORS)

Hệ thống màu sắc sử dụng biến Semantic thay vì hardcode trực tiếp màu sắc. 

- **Primary (`--color-primary`)**: Tông màu `sky` (sky-500 đến sky-700) dùng cho các nút bấm chính, link quan trọng, action calls.
- **Secondary (`--color-secondary`)**: Tông màu `slate` (slate-100 đến slate-800) dùng cho text mô tả phụ, viền (borders), và nền phụ (backgrounds).
- **Success (`--color-success`)**: Khuyên dùng `emerald-500` cho các trạng thái Tốt, Hoàn Thành, Đạt Target.
- **Warning (`--color-warning`)**: Khuyên dùng `amber-500` cho Cảnh báo, Đang chờ duyệt, Thiếu thông tin.
- **Danger (`--color-danger`)**: Khuyên dùng `rose-500` cho Lỗi, Xoá, Rủi ro, Không đạt.

**Cấm khai báo custom property màu mới trong `features/*`.** Khi cần phân biệt trên 5 hạng mục dữ
liệu, dùng pattern "6 họ semantic × 2 tầng sắc độ" (5 màu trên + `indigo`), không tự chế màu ngoài
palette. Mốc hiện tại do `scripts/lint-ratchet.cjs` giữ là **0 vi phạm** — thêm màu lạ sẽ làm đỏ
`npm run check`.

### 1.1 DARK MODE — ĐÃ TẮT TOÀN DỰ ÁN (từ 2026-07-10)

**Cấm viết class `dark:` mới.** Các class `dark:` cũ trong code được giữ nguyên (vô hiệu, không cần
dọn) — chỉ dọn ở file vừa tạo mới. Đây là chỗ nhiều skill AI bên ngoài làm sai nhất: phần lớn skill
UI đại trà mặc định "dashboard chuyên nghiệp thì phải có dark mode". Ở dự án này thì không.

## 2. TYPOGRAPHY HIERARCHY

Tất cả Text bắt buộc phải sử dụng Utility Class của hệ thống.
Font chữ chung — theo đúng `styles.css`, KHÔNG phải Inter/SVN-Gilroy như bản cũ ghi nhầm:

```css
--font-sans: "UTM Avo", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
```

| ClassName | Size | Trọng lượng (Weight) | Mục đích sử dụng (Usage) |
| :--- | :--- | :--- | :--- |
| `text-xs` | 12px | `font-normal`, `font-medium` | Metadata, thời gian, phụ đề cực nhỏ (Subtitles). |
| `text-sm` | 14px | `font-normal`, `font-medium` | Chữ hiển thị thông thường, nội dung trong Data Tables. |
| `text-base` | 16px | `font-medium`, `font-bold` | Nội dung văn bản (Paragraph), thẻ Input, Button chữ to. |
| `text-xl` | 20px | `font-bold`, `font-black` | Tiêu đề các Card (Card Titles), Modal Titles. |
| `text-2xl` | 24px | `font-black` | Heading chính của màn hình (Page Titles). |

*Lưu ý*: Với Table, Header bắt buộc phải dùng Style: `uppercase tracking-wider text-[11px] font-bold text-slate-500`.

> ⚠️ **`tracking-wider`, KHÔNG phải `tracking-tight`.** Đã đo trên code thật (2026-09-10): trong các
> class mang dấu hiệu header bảng, `tracking-wider` xuất hiện **46 lần** còn `tracking-tight` chỉ **9
> lần**. `CLAUDE.md` từng ghi nhầm là `tracking-tight` và đã khiến người viết code mới làm sai theo —
> nay đã sửa lại CLAUDE.md cho khớp. Nếu gặp header đang dùng `tracking-tight`, đó là di sản của lỗi
> đó, không phải chuẩn.

## 3. COMPONENT LIBRARY

Các UI Component đã được chuẩn hoá nằm trong thư mục `components/shared/ui/`. Không viết lại HTML Native cho các thẻ này.

### 3.1 Button (`<Button />`)
- **variants**: `primary` (Mặc định), `secondary` (Nút phụ), `ghost` (Trong suốt), `danger` (Nút đỏ).
- **sizes**: `sm` (Nhỏ gọn), `md` (Chuẩn), `lg` (To).
- **Quy tắc**: Mọi action quan trọng nên có Icon đi kèm phía trước Text. Trạng thái Disable phải làm mờ.

### 3.2 Input (`<Input />`)
- Tích hợp sẵn hiệu ứng focus (Ring). Không hardcode class ring cục bộ.
- Bao gồm tính năng clear nội dung.

### 3.3 Modal (`<Modal />`)
- Dùng `components/shared/ui/Modal.tsx`. (Bản cũ của tài liệu nhắc `<ModalWrapper />` — component đó
  KHÔNG tồn tại, đã kiểm chứng ngày 2026-09-10. Đừng đi tìm.)
- Cấm tự dựng modal `fixed inset-0` mới.
- Luôn có nút `X` (đóng) ở góc trên bên phải. Hỗ trợ bấm nút `Escape` (Esc) trên bàn phím để đóng.
- Phần thân Modal dài bắt buộc phải có `overflow-y-auto`.

### 3.4 Confirm Dialog (`<ConfirmDialog />`)
- **Nghiêm cấm** dùng `window.alert`, `window.confirm`, `window.prompt`.
- Dùng `<ConfirmDialog />` để hỏi người dùng khi thực hiện tác vụ rủi ro (Reset, Xóa). Nút Submit phải truyền biến màu đỏ (`danger`).

## 4. UI/UX RULES

- **Shadow (Đổ bóng)**: Tránh lạm dụng đổ bóng đậm (`shadow-lg`). Dùng `shadow-sm` cho Card tĩnh, và `shadow-xl` hoặc `shadow-2xl` cho Dropdown / Modal.
- **Bo góc (Border Radius)**: 
  - `rounded-md` (6px): Inputs, Buttons.
  - `rounded-xl` (12px): Cards, Modals.
  - `rounded-none` (0px): Data Tables (thiết kế phẳng).
- **Loading State**: Sử dụng Component `<Skeleton />` (hoặc hiệu ứng nhấp nháy bộ xương) thay vì hiển thị chữ "Loading...".
- **Responsive**: Hỗ trợ cảm ứng, không hover state gây kẹt trên màn hình điện thoại. Bảng dài phải có lớp `.scrollbar-hide` cho scroll ngang.
