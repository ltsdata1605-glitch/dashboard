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

- Calculation dùng chung nằm trong `utils/dataUtils.ts` (KHÔNG có `shared/lib/calculations`
  — xem `ARCHITECTURE.md`); calculation riêng từng zone nằm trong `features/*/utils/`.
- Không có backend/API server riêng — logic gọi Firebase/Firestore nằm trong `services/`
  (Root) hoặc `features/*/services/` (mỗi zone tự có, xem `API.md`).
- Format currency/date/number dùng helper chung `utils/dataUtils.ts` (`formatCurrency`,
  `formatQuantity`...) khi cùng mục đích hiển thị — nhưng 1 hàm cùng tên ở 2 zone không mặc
  nhiên là bản trùng lặp cần gộp (VD: format tiền đầy đủ để in sticker khác format rút gọn
  cho dashboard) — kiểm tra ngữ cảnh trước khi "dedupe" (xem `RULES.md` §2.0).
- Filter logic: mỗi zone tự quản lý `FilterState` riêng (không dùng chung 1 type filter
  cross-zone) — xem `ARCHITECTURE.md` mục "Filter architecture".
- Business rule quan trọng phải có tên hàm rõ nghĩa.

---

## CSS/UI rules

- Chỉ dùng bảng màu semantic đã duyệt: `sky`=primary, `slate`=secondary, `emerald`=success,
  `amber`=warning, `rose`=danger (định nghĩa tại `styles.css`'s `@theme` + `styles/tokens.css`
  — Tailwind CSS 4, KHÔNG có file `tailwind.config.js`). Xem `DESIGN.md` để biết chi tiết.
- **Lưu ý đặc thù dự án này**: `styles.css` override `--color-indigo-*` bằng hex của `sky`,
  nên `indigo-*` và `sky-*` hiện render giống hệt nhau ở nhiều nơi — 1 số chỗ khác lại dùng
  `indigo` như màu riêng biệt trong bảng màu xoay vòng (VD: `TargetHero.tsx`,
  `CompetitionTab.tsx`). KHÔNG tự ý tìm-thay `indigo` → `sky` hàng loạt — xử lý thủ công
  từng trường hợp nếu cần đụng tới (xem `RULES.md` §2.5 điểm 2).
- Mọi class có màu phải có `dark:` tương ứng — không có ngoại lệ theo zone.
- Mọi phần tử tương tác (button, modal, input, badge, bảng, dropdown, loading) BẮT BUỘC
  dùng `components/shared/ui/*` — cấm viết `<button>` thô hoặc tự dựng modal `fixed inset-0`
  mới (xem `RULES.md` §2.5 điểm 1; việc migrate toàn bộ `<button>` cũ đã hoàn tất, xem
  CHANGELOG 2026-07-05 "Bước 4").
- Không dùng `rounded-3xl` hoặc bo góc quá mạnh — ưu tiên `rounded-lg`/`rounded-xl`
  (`RULES.md` §4.1).

---

## Import/export rules

- Import theo đường dẫn rõ ràng.
- Tránh import vòng lặp.
- Nếu có barrel export (`index.ts`, VD: `components/shared/ui/index.ts`), dùng nhất quán.
- Không import từ file sâu nếu module đã có public export.
- **Bắt buộc theo `RULES.md` §2.0**: `features/bi-dashboard`, `features/phan-ca`,
  `features/sticker-event` KHÔNG được import chéo lẫn nhau, và KHÔNG được import
  `hooks/*`/`services/*` ở root — ESLint rule `import/no-restricted-paths` chặn việc này,
  chạy `npx eslint .` sẽ báo lỗi ngay nếu vi phạm.

---

## Review checklist

- [ ] Tên file/component/hàm rõ nghĩa.
- [ ] Không có code trùng không cần thiết.
- [ ] Không có logic nghiệp vụ lớn trong UI.
- [ ] Không có style lệch design token.
- [ ] Không có console.log/debugger.
- [ ] Không có import không dùng.
- [ ] Không có file quá dài bất thường nếu có thể tách.
