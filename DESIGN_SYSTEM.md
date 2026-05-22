# ANTIGRAVITY DESIGN SYSTEM (STORYBOOK)

Tài liệu nội bộ dành cho đội ngũ phát triển giao diện (UI Developers). Tất cả components và layout khi xây dựng mới bắt buộc phải tuân thủ Design System này để đảm bảo tính đồng bộ (Consistency).

## 1. DESIGN TOKENS (COLORS)

Hệ thống màu sắc sử dụng biến Semantic thay vì hardcode trực tiếp màu sắc. 

- **Primary (`--color-primary`)**: Tông màu `sky` (sky-500 đến sky-700) dùng cho các nút bấm chính, link quan trọng, action calls.
- **Secondary (`--color-secondary`)**: Tông màu `slate` (slate-100 đến slate-800) dùng cho text mô tả phụ, viền (borders), và nền phụ (backgrounds).
- **Success (`--color-success`)**: Khuyên dùng `emerald-500` cho các trạng thái Tốt, Hoàn Thành, Đạt Target.
- **Warning (`--color-warning`)**: Khuyên dùng `amber-500` cho Cảnh báo, Đang chờ duyệt, Thiếu thông tin.
- **Danger (`--color-danger`)**: Khuyên dùng `rose-500` cho Lỗi, Xoá, Rủi ro, Không đạt.

## 2. TYPOGRAPHY HIERARCHY

Tất cả Text bắt buộc phải sử dụng Utility Class của hệ thống.
Font chữ chung: `SVN-Gilroy` / `Inter` (cấu hình `--font-sans`).

| ClassName | Size | Trọng lượng (Weight) | Mục đích sử dụng (Usage) |
| :--- | :--- | :--- | :--- |
| `text-xs` | 12px | `font-normal`, `font-medium` | Metadata, thời gian, phụ đề cực nhỏ (Subtitles). |
| `text-sm` | 14px | `font-normal`, `font-medium` | Chữ hiển thị thông thường, nội dung trong Data Tables. |
| `text-base` | 16px | `font-medium`, `font-bold` | Nội dung văn bản (Paragraph), thẻ Input, Button chữ to. |
| `text-xl` | 20px | `font-bold`, `font-black` | Tiêu đề các Card (Card Titles), Modal Titles. |
| `text-2xl` | 24px | `font-black` | Heading chính của màn hình (Page Titles). |

*Lưu ý*: Với Table, Header bắt buộc phải dùng Style: `uppercase tracking-wider text-[11px] font-bold text-slate-500`.

## 3. COMPONENT LIBRARY

Các UI Component đã được chuẩn hoá nằm trong thư mục `components/shared/ui/`. Không viết lại HTML Native cho các thẻ này.

### 3.1 Button (`<Button />`)
- **variants**: `primary` (Mặc định), `secondary` (Nút phụ), `ghost` (Trong suốt), `danger` (Nút đỏ).
- **sizes**: `sm` (Nhỏ gọn), `md` (Chuẩn), `lg` (To).
- **Quy tắc**: Mọi action quan trọng nên có Icon đi kèm phía trước Text. Trạng thái Disable phải làm mờ.

### 3.2 Input (`<Input />`)
- Tích hợp sẵn hiệu ứng focus (Ring). Không hardcode class ring cục bộ.
- Bao gồm tính năng clear nội dung.

### 3.3 Modal (`<ModalWrapper />` & `<Modal />`)
- Sử dụng Wrapper chung để hưởng hiệu ứng `AnimatePresence` (phóng to từ từ).
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
