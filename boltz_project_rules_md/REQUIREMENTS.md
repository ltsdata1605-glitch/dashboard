# REQUIREMENTS.md

## Mục tiêu cải tiến

Dự án hiện tại được phát triển theo hướng Vibecoding nên thiếu chuẩn kỹ thuật, thiếu quy tắc thiết kế và thiếu cấu trúc đồng nhất. Lần cải tiến này nhằm đưa toàn bộ ứng dụng về một chuẩn chuyên nghiệp, ổn định, dễ bảo trì và dễ phát triển tiếp.

---

## Vấn đề hiện tại cần xử lý

### 1. Cấu trúc dự án rời rạc

- File và thư mục chưa có quy luật rõ.
- Code nằm rải rác nhiều nơi.
- Có thể có file không dùng, component không dùng, function không dùng.
- Có thể có nhiều đoạn code trùng chức năng.

### 2. UI không đồng nhất

- Cùng một loại button nhưng mỗi nơi một kiểu.
- Modal/popup không cùng layout, spacing, radius, shadow.
- Table không cùng style header, row, action, empty state.
- Card không cùng padding, radius, shadow.
- Form/filter không cùng behavior và visual style.

### 3. Logic tính toán không thống nhất

- Mỗi khu vực có thể tự tính riêng.
- Công thức có thể bị lệch giữa các màn hình.
- Không có calculation engine/shared helper rõ ràng.
- Dễ gây sai số liệu hoặc kết quả không đồng nhất.

### 4. Bộ lọc không liên kết

- Filter ở nhiều khu vực không đồng bộ.
- Khi đổi filter ở một nơi, nơi khác không phản ánh đúng.
- Thiếu single source of truth cho filter state.

### 5. 4 app/module riêng lẻ chưa cùng chuẩn

- Mỗi app/module có thể có UI rule riêng.
- Component có thể bị duplicate.
- Logic có thể tự xử lý riêng.
- Cần đưa về cùng architecture, design system và code style.

---

## Phạm vi cải tiến bắt buộc

Lần cải tiến này phải bao phủ:

- Cấu trúc thư mục.
- Kiến trúc module.
- Shared UI components.
- Design tokens.
- Modal/Dialog/Popup.
- Button.
- Table.
- Card.
- Form/Input/Select.
- Filter.
- Calculation/data processing.
- API/service layer.
- Database/data model nếu có.
- Responsive layout.
- Loading/empty/error states.
- 4 app/module riêng lẻ.
- Cleanup code thừa.
- Testing/build verification.

---

## Yêu cầu chức năng

### Filter

- Tất cả filter phải có cấu trúc state rõ ràng.
- Filter liên quan nhau phải cập nhật đồng bộ.
- Không để mỗi component tự định nghĩa filter format riêng.
- Filter phải có default value rõ ràng.
- Filter phải có reset/clear behavior thống nhất.

### Tính toán

- Công thức tính toán phải nằm ở shared utility/service.
- Không tính toán nghiệp vụ trực tiếp trong JSX/template.
- Mọi hàm tính toán phải có tên rõ nghĩa.
- Nếu có nhiều màn hình dùng cùng công thức, bắt buộc dùng chung function.
- Kết quả tính toán phải nhất quán giữa các module.

### UI Components

Các component sau phải được chuẩn hóa:

- `Button`
- `IconButton`
- `Card`
- `Modal/Dialog`
- `Popup/Popover`
- `Table/DataTable`
- `Input`
- `Select`
- `DateRangePicker` hoặc filter thời gian tương ứng
- `Badge`
- `Tabs`
- `LoadingState`
- `EmptyState`
- `ErrorState`
- `ConfirmDialog`

### 4 app/module riêng lẻ

Claude phải tự xác định 4 app/module trong source code thật, sau đó cập nhật danh sách vào đây:

```txt
Module 1: Root/Dashboard — components/, hooks/, services/, contexts/ (root) — tab analysis/check-thuong/settings
Module 2: bi-dashboard (Report BI) — features/bi-dashboard/ — tab employees
Module 3: phan-ca (Phân ca) — features/phan-ca/ — tab tools-phanca
Module 4: sticker-event (In Sticker) — features/sticker-event/ — tab tools-print-sticker
```

Lưu ý: 4 module này cố ý cách ly nhau theo `RULES.md` §2.0 (không import chéo, không dùng
chung state/filter cross-zone) — xem quyết định nền tảng trong `CHANGELOG.md` 2026-07-05.

Yêu cầu với cả 4 module:

- Dùng chung design tokens.
- Dùng chung shared UI components.
- Dùng chung filter engine nếu có filter.
- Dùng chung calculation utilities nếu có tính toán.
- Không có style riêng trái chuẩn.
- Không duplicate component đã tồn tại.

---

## Ngoài phạm vi nếu chưa được yêu cầu

- Không đổi business model chính.
- Không đổi database schema lớn nếu chưa có migration rõ ràng.
- Không thay đổi authentication/authorization nếu chưa có yêu cầu.
- Không viết lại toàn bộ project từ đầu nếu có thể refactor an toàn.
- Không thêm tính năng mới khi task hiện tại là cleanup/refactor.

---

## Tiêu chuẩn nghiệm thu

Một phần cải tiến đạt chuẩn khi:

- UI cùng style với `DESIGN.md`.
- Không có component trùng lặp không cần thiết.
- Không có logic tính toán lặp lại ở nhiều màn hình.
- Filter hoạt động đồng bộ.
- Code dễ đọc, dễ tìm, đúng vị trí.
- Build không lỗi.
- Responsive không vỡ layout.
- Có cập nhật `TASKS.md` và `CHANGELOG.md`.
