# Project README

## Tổng quan

Đây là dự án dashboard được phát triển theo hướng Vibecoding và đang bước vào giai đoạn cải tiến toàn diện để trở thành một ứng dụng chuyên nghiệp, thống nhất, dễ bảo trì và dễ mở rộng.

Mục tiêu chính:

- Chuẩn hóa cấu trúc dự án.
- Chuẩn hóa UI/UX theo style Boltz Dashboard.
- Chuẩn hóa component dùng chung.
- Chuẩn hóa logic tính toán và bộ lọc.
- Refactor 4 app/module riêng lẻ theo cùng rule và cùng design system.
- Loại bỏ code thừa, code trùng, cấu trúc rời rạc.
- Tạo nền tảng để phát triển lâu dài.

---

## Tài liệu quan trọng

**⭐ Đọc `RULES.md` và `UI_GUIDELINES.md` ở ROOT dự án TRƯỚC TIÊN** — đây là nguồn chân lý
chính xác nhất về kiến trúc 4-zone/design system thật (không nằm trong thư mục này). Các
file bên dưới đã được đối chiếu và cập nhật khớp với 2 file đó (2026-07-05):

| File | Mục đích |
|---|---|
| `CLAUDE.md` | Luật làm việc bắt buộc cho Claude |
| `REQUIREMENTS.md` | Yêu cầu tổng thể và phạm vi cải tiến |
| `DESIGN.md` | Design system, UI rule, component style |
| `ARCHITECTURE.md` | Kiến trúc code, thư mục, data flow |
| `TASKS.md` | Danh sách việc cần làm và tiến độ |
| `CHANGELOG.md` | Nhật ký thay đổi |
| `API.md` | Quy ước API/service |
| `DATABASE.md` | Quy ước database/schema/data model |
| `CODE_STYLE.md` | Quy tắc code |
| `TESTING.md` | Quy tắc kiểm thử |
| `SECURITY.md` | Quy tắc bảo mật |
| `DEPLOYMENT.md` | Build/deploy/release |

---

## Cách bắt đầu cho Claude

Trước khi code, hãy đọc:

```txt
RULES.md            (root — ⭐ đọc trước tiên)
UI_GUIDELINES.md     (root)
CLAUDE.md
REQUIREMENTS.md
DESIGN.md
ARCHITECTURE.md
TASKS.md
```

Sau đó audit dự án và xác định:

- Framework đang dùng.
- Package manager đang dùng.
- Cấu trúc thư mục hiện tại.
- 4 app/module riêng lẻ hiện có.
- Component nào đang bị trùng.
- Logic tính toán/filter nào đang rời rạc.
- UI nào đang lệch style.

---

## Lệnh thường dùng

Dự án dùng **npm** (có `package-lock.json`, xác nhận thật — không phải pnpm/yarn/bun).
Lệnh thật (xem `TESTING.md`/`DEPLOYMENT.md` để biết chi tiết đầy đủ):

```bash
npm install
npm run dev
npm run lint          # = tsc --noEmit, KHÔNG phải eslint
npx eslint .           # eslint thật sự
npm run build
npm run check          # gộp typecheck + eslint + build + lint:ratchet (2026-07-05: đã thêm eslint)
```

**Không có `npm run test`** — dự án chưa có test runner tự động (không Vitest/Jest).

---

## Nguyên tắc phát triển

- Không code theo cảm tính nữa.
- Không thêm tính năng khi chưa có yêu cầu rõ.
- Không tạo nhiều kiểu UI cho cùng một chức năng.
- Không để mỗi module tự xử lý filter/tính toán riêng.
- Không đưa logic nghiệp vụ vào component UI.
- Mọi thành phần lặp lại phải được đưa về shared component.
- Mọi thay đổi phải ghi vào `CHANGELOG.md`.
