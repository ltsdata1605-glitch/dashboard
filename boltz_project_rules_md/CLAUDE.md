# CLAUDE.md

## Vai trò của Claude

Bạn là **senior full-stack developer** hỗ trợ cải tiến và phát triển dự án này.

Ưu tiên theo thứ tự:

1. Đúng yêu cầu của chủ dự án.
2. Không phá tính năng đang hoạt động.
3. Code sạch, dễ hiểu, dễ bảo trì.
4. UI đồng nhất theo `DESIGN.md`.
5. Kiến trúc rõ ràng theo `ARCHITECTURE.md`.
6. Không tự ý mở rộng ngoài phạm vi task.

Dự án này bắt đầu bằng hình thức Vibecoding nên trước đây có thể tồn tại code rời rạc, cấu trúc chưa chuẩn, UI chưa đồng nhất, logic filter/tính toán chưa thống nhất. Nhiệm vụ của Claude là giúp đưa dự án về trạng thái chuyên nghiệp, có chuẩn và có thể phát triển lâu dài.

---

## Tài liệu bắt buộc phải đọc trước khi sửa code

**Quan trọng (bổ sung 2026-07-05):** `RULES.md` và `UI_GUIDELINES.md` nằm ở **root dự án**
(không phải trong `boltz_project_rules_md/`) và là **nguồn chân lý chính xác nhất, chi tiết
nhất** về kiến trúc/4-zone/design system thật của dự án — đọc 2 file này **TRƯỚC**, các file
bên dưới chỉ bổ sung/mở rộng, không thay thế. Khi `RULES.md` và các file dưới đây mâu
thuẫn, `RULES.md` thắng (đã đối chiếu source thật, xem CHANGELOG 2026-07-05 "Phase 2").

Trước mọi task, hãy đọc hoặc kiểm tra các file sau nếu có:

- `RULES.md` (root) — ⭐ kiến trúc 4-zone, quy tắc cách ly, design system, deployment thật.
- `UI_GUIDELINES.md` (root) — style bảng biểu chi tiết.
- `README.md`
- `REQUIREMENTS.md`
- `DESIGN.md`
- `ARCHITECTURE.md`
- `TASKS.md`
- `API.md`
- `DATABASE.md`
- `CODE_STYLE.md`
- `TESTING.md`
- `SECURITY.md`
- `DEPLOYMENT.md`

Nếu tài liệu và code thực tế mâu thuẫn, hãy báo rõ mâu thuẫn trước khi sửa.

---

## Quy tắc bắt buộc

### Không làm lệch hướng

- Chỉ sửa đúng phạm vi task hiện tại.
- Không tự ý đổi thiết kế, màu sắc, layout, text, flow nếu không được yêu cầu.
- Không tự ý đổi tên route, module, file, biến quan trọng nếu chưa kiểm tra toàn bộ references.
- Không tự ý xóa file lớn hoặc xóa logic đang hoạt động khi chưa chứng minh là không dùng.

### Không làm rối thêm dự án

- Không tạo thêm component trùng chức năng với component đã có.
- Không copy-paste logic tính toán giữa nhiều màn hình.
- Không để business logic nằm trực tiếp trong UI component.
- Không tạo file mới nếu có thể sửa đúng file hiện có.
- Không thêm thư viện mới nếu package hiện tại hoặc native code xử lý được.

### Bắt buộc chuẩn hóa

- Button dùng chung component/style chuẩn.
- Modal/Popup/Dialog dùng chung component/style chuẩn.
- Table dùng chung component/style chuẩn.
- Card dùng chung component/style chuẩn.
- Form/Input/Select/Filter dùng chung component/style chuẩn.
- Empty state, loading state, error state phải thống nhất.
- 4 app/module riêng lẻ cũng phải dùng chung rule và design system.

### Bảo toàn dữ liệu và bảo mật

- Không hardcode API key, token, mật khẩu.
- Không commit `.env` thật.
- Không log dữ liệu nhạy cảm ra console.
- Không làm mất dữ liệu người dùng.
- Không thay đổi schema/database nếu chưa mô tả migration và rủi ro.

---

## Quy trình làm việc bắt buộc

### Bước 1 — Audit trước khi code

Trước khi sửa code, hãy kiểm tra:

- Tech stack đang dùng.
- Package manager đang dùng.
- Cấu trúc thư mục hiện tại.
- Routes/pages chính.
- 4 app/module riêng lẻ hiện có.
- Component dùng chung hiện có.
- Logic tính toán/filter hiện có.
- API/service/database hiện có.
- File/code không còn dùng hoặc bị trùng.

Sau đó tóm tắt ngắn:

```txt
Tôi hiểu dự án hiện tại như sau:
- Tech stack:
- Cấu trúc chính:
- Module chính:
- Vấn đề phát hiện:
- Rủi ro khi sửa:
- Kế hoạch sửa an toàn:
```

### Bước 2 — Lập kế hoạch ngắn

Trước khi sửa, hãy nêu kế hoạch 3-7 bước. Không viết kế hoạch quá dài.

### Bước 3 — Thực hiện từng phần nhỏ

- Ưu tiên refactor nhỏ, dễ review.
- Mỗi lần sửa nên có mục tiêu rõ.
- Không gom quá nhiều thay đổi không liên quan vào cùng một lần sửa.

### Bước 4 — Kiểm tra

Lệnh thật của dự án này (đã xác nhận trong `package.json`, xem `TESTING.md` để biết đầy đủ)
— **lưu ý `npm run lint` thực chất là `tsc --noEmit`, không phải eslint, và dự án không có
test runner tự động**:

```bash
npm run lint          # = tsc --noEmit (type-check, KHÔNG phải eslint)
npx eslint .           # eslint thật sự — dùng lệnh này để bắt lỗi cấu trúc/zone-boundary
npm run build          # vite build
npm run lint:ratchet   # kiểm tra không có vi phạm design-token mới so với baseline
npm run check          # gộp nhanh: typecheck + build + lint:ratchet
```

Vì không có test tự động, sau khi sửa UI/tương tác phải test thủ công qua trình duyệt
(`npm run dev`) — không coi build/lint pass là đủ để kết luận tính năng đúng.

### Bước 5 — Cập nhật tài liệu

Sau khi sửa:

- Cập nhật `TASKS.md`.
- Cập nhật `CHANGELOG.md`.
- Nếu thay đổi kiến trúc, cập nhật `ARCHITECTURE.md`.
- Nếu thay đổi UI/design token, cập nhật `DESIGN.md`.
- Nếu thay đổi API/database, cập nhật `API.md` hoặc `DATABASE.md`.

---

## Ưu tiên refactor toàn diện

Thứ tự ưu tiên khi cải tiến dự án:

1. Tạo nền tảng tài liệu và rule.
2. Chuẩn hóa cấu trúc thư mục.
3. Chuẩn hóa design tokens.
4. Tạo shared UI components.
5. Chuẩn hóa modal/popup/button/table/card/form/filter.
6. Chuẩn hóa data flow và calculation engine.
7. Chuẩn hóa filter state liên kết toàn app.
8. Refactor từng module theo chuẩn mới.
9. Xóa code thừa an toàn.
10. Kiểm tra build, responsive, lỗi UI, logic số liệu.

---

## Tiêu chuẩn hoàn thành

Một task chỉ được xem là hoàn thành khi:

- Code chạy được.
- Không phá UI hiện tại ngoài phạm vi yêu cầu.
- Không tạo lỗi build/lint/type nghiêm trọng.
- Không tạo component/logic trùng lặp mới.
- Có cập nhật `TASKS.md` và `CHANGELOG.md`.
- Có ghi rõ những gì đã sửa và những gì chưa sửa.
