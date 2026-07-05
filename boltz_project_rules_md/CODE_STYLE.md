# CODE_STYLE.md

## Mục tiêu

Giữ code sạch, dễ đọc, dễ tìm, dễ bảo trì. Không để dự án tiếp tục phát triển theo kiểu cảm tính và rời rạc.

---

## Nguyên tắc tổng quát

- Code rõ nghĩa hơn code ngắn khó hiểu.
- Tên biến/hàm/component phải mô tả đúng mục đích.
- Một file không nên ôm quá nhiều trách nhiệm.
- Không lặp code nếu có thể tách helper/component.
- Không tạo abstraction quá sớm nếu chỉ dùng một lần.
- Không dùng magic number/string rải rác.
- Không để console.log debug trong production code.

---

## Naming convention

### Component

```txt
PascalCase
```

Ví dụ:

```txt
DashboardLayout
FilterPanel
DataTable
ConfirmDialog
```

### Function/variable

```txt
camelCase
```

Ví dụ:

```txt
calculateTotalRevenue
formatCurrency
selectedDateRange
```

### Constants

```txt
UPPER_SNAKE_CASE
```

Ví dụ:

```txt
DEFAULT_PAGE_SIZE
FILTER_DEFAULTS
```

### File names

Ưu tiên thống nhất theo project hiện tại. Nếu chưa có chuẩn, dùng:

```txt
ComponentName.tsx
useSomething.ts
something.service.ts
something.utils.ts
something.types.ts
```

---

## Component rules

Một component tốt nên:

- Có props rõ ràng.
- Không chứa quá nhiều logic nghiệp vụ.
- Dễ tái sử dụng.
- Dễ test.
- Không phụ thuộc trực tiếp vào nhiều global state nếu không cần.

Không nên:

- Component dài hàng trăm dòng không chia tách.
- Vừa gọi API, vừa tính toán, vừa render UI phức tạp.
- Copy component rồi sửa style riêng cho từng module.

---

## Logic rules

- Calculation nằm trong `shared/lib/calculations` hoặc module utils.
- API logic nằm trong service layer.
- Format currency/date/number dùng helper chung.
- Filter logic dùng helper/state chuẩn.
- Business rule quan trọng phải có tên hàm rõ nghĩa.

---

## CSS/UI rules

- Ưu tiên design tokens trong `DESIGN.md`.
- Không dùng màu hex rải rác nếu token đã có.
- Không inline style nếu có thể dùng class/component.
- Không tạo nhiều class khác nhau cho cùng một loại button/card/table.
- Không dùng shadow quá đậm, radius quá khác biệt với design system.

---

## Import/export rules

- Import theo đường dẫn rõ ràng.
- Tránh import vòng lặp.
- Nếu có barrel export (`index.ts`), dùng nhất quán.
- Không import từ file sâu nếu module đã có public export.

---

## Review checklist

- [ ] Tên file/component/hàm rõ nghĩa.
- [ ] Không có code trùng không cần thiết.
- [ ] Không có logic nghiệp vụ lớn trong UI.
- [ ] Không có style lệch design token.
- [ ] Không có console.log/debugger.
- [ ] Không có import không dùng.
- [ ] Không có file quá dài bất thường nếu có thể tách.
