# SECURITY.md

## Mục tiêu

Đảm bảo dự án không lộ dữ liệu nhạy cảm, không hardcode secret và không tạo rủi ro bảo mật trong quá trình refactor.

---

## Quy tắc bắt buộc

- Không commit file `.env` thật.
- Không hardcode API key, token, password, secret.
- Không log token/user data ra console.
- Không lưu dữ liệu nhạy cảm vào localStorage nếu không cần thiết.
- Không tắt validate/auth để fix lỗi nhanh.
- Không thêm package không rõ nguồn gốc.
- Không dùng `dangerouslySetInnerHTML` hoặc render HTML thô nếu chưa sanitize.

---

## Environment variables

Nếu cần env, dùng file mẫu:

```txt
.env.example
```

Ví dụ:

```env
VITE_API_BASE_URL=
NEXT_PUBLIC_API_BASE_URL=
DATABASE_URL=
```

Không đưa giá trị thật vào tài liệu hoặc source code.

---

## API/Auth

- Token nếu có phải được xử lý ở API client/service layer.
- Không truyền token thủ công rải rác trong component.
- Khi unauthorized, xử lý thống nhất.
- Không expose thông tin lỗi server nhạy cảm ra UI.

---

## Data validation

- Validate input trước khi gửi API nếu cần.
- Validate response quan trọng trước khi tính toán.
- Không tin dữ liệu từ client hoàn toàn.
- Xử lý null/undefined để tránh crash.

---

## Dependency security

Khi thêm package mới:

- Kiểm tra package có thật sự cần không.
- Ưu tiên package phổ biến, đang maintain.
- Không thêm package chỉ để làm việc nhỏ có thể tự xử lý.
- Sau khi thêm package, chạy build/test.

---

## Checklist bảo mật

- [ ] Không có secret trong source.
- [ ] Không có `.env` thật bị commit.
- [ ] Không có console.log dữ liệu nhạy cảm.
- [ ] Không thêm package không cần thiết.
- [ ] API client xử lý auth tập trung.
- [ ] Error message không lộ thông tin nhạy cảm.
- [ ] Input quan trọng được validate.
