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

Claude phải tự kiểm tra `package.json` để xác định lệnh chính xác. Nếu tồn tại, ưu tiên dùng:

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

Nếu project dùng `pnpm`, `yarn`, `bun` thì dùng đúng package manager đang có lockfile.

---

## Nguyên tắc phát triển

- Không code theo cảm tính nữa.
- Không thêm tính năng khi chưa có yêu cầu rõ.
- Không tạo nhiều kiểu UI cho cùng một chức năng.
- Không để mỗi module tự xử lý filter/tính toán riêng.
- Không đưa logic nghiệp vụ vào component UI.
- Mọi thành phần lặp lại phải được đưa về shared component.
- Mọi thay đổi phải ghi vào `CHANGELOG.md`.
