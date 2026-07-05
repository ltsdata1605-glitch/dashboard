# DATABASE.md

## Mục tiêu

Chuẩn hóa data model/database để tránh dữ liệu bị hiểu sai, field đặt tên không nhất quán, hoặc mỗi module tự xử lý một kiểu.

Nếu dự án không có database trực tiếp, file này vẫn dùng để ghi quy ước data model, local storage, mock data hoặc external data source.

---

## Nguyên tắc chung

- Không thay đổi schema lớn nếu chưa có migration rõ ràng.
- Không xóa field/table nếu chưa kiểm tra toàn bộ nơi sử dụng.
- Không đổi ý nghĩa field mà không cập nhật toàn bộ logic liên quan.
- Không lưu dữ liệu nhạy cảm không cần thiết.
- Không hardcode dữ liệu giả vào production data layer.

---

## Quy ước đặt tên

Ưu tiên thống nhất một kiểu:

- Database: `snake_case` nếu backend/database đang dùng SQL.
- Frontend model/type: `camelCase`.
- Mapping giữa database và frontend nên nằm ở mapper/normalizer.

Ví dụ:

```ts
type UserRecord = {
  created_at: string;
};

type User = {
  createdAt: string;
};
```

---

## Data model hiện tại

Claude phải audit source code/database thật và điền vào đây.

```txt
Data source:
Database type:
Main tables/collections:
Important fields:
Relationships:
Known issues:
```

---

## Quy tắc migration

Nếu cần thay đổi schema:

1. Ghi rõ lý do.
2. Ghi rõ field/table ảnh hưởng.
3. Ghi rõ rủi ro mất dữ liệu.
4. Viết migration nếu project có hệ thống migration.
5. Test dữ liệu cũ và dữ liệu mới.
6. Cập nhật `CHANGELOG.md`.

---

## Quy tắc dữ liệu cho calculation

Các số liệu tính toán phải có nguồn dữ liệu rõ:

```txt
Chỉ số:
Nguồn dữ liệu:
Công thức:
Field liên quan:
Module sử dụng:
```

Không để mỗi module tự hiểu khác nhau về cùng một field/chỉ số.

---

## Checklist database/data model

- [ ] Có danh sách data source chính.
- [ ] Có mô tả field quan trọng.
- [ ] Có mapping nếu backend/frontend khác naming.
- [ ] Có quy tắc migration.
- [ ] Có quy tắc xử lý null/empty data.
- [ ] Có tài liệu cho các công thức tính toán dựa trên dữ liệu.
