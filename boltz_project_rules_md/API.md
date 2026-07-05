# API.md

## Mục tiêu

Chuẩn hóa cách gọi API/service để tránh mỗi module tự gọi và tự xử lý dữ liệu một kiểu.

---

## Nguyên tắc chung

- Không gọi API trực tiếp rải rác trong UI component.
- API call nên nằm trong service layer.
- Response nên được normalize/map trước khi đưa vào UI.
- Error handling phải thống nhất.
- Loading state phải thống nhất.
- Không hardcode base URL trong component.
- Không đưa token/API key vào source code.

---

## Cấu trúc service đề xuất

```txt
src/shared/services/
├── apiClient.ts
├── errors.ts
├── types.ts
└── modules/
    ├── moduleA.service.ts
    ├── moduleB.service.ts
    ├── moduleC.service.ts
    └── moduleD.service.ts
```

Nếu mỗi module có service riêng:

```txt
src/modules/module-name/services/
└── module-name.service.ts
```

---

## API client chuẩn

API client nên xử lý chung:

- Base URL.
- Headers.
- Auth token nếu có.
- Timeout nếu có.
- Error normalization.
- JSON parse.

Không để mỗi service tự viết lại logic này.

---

## Response format chuẩn

Nếu backend cho phép kiểm soát response, ưu tiên format:

```ts
type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code?: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
};
```

Nếu backend đã có format khác, service layer phải map về format nội bộ dễ dùng.

---

## Error handling

Phân loại lỗi:

- Network error.
- Unauthorized/Forbidden.
- Validation error.
- Not found.
- Server error.
- Unknown error.

UI không nên tự parse lỗi thô. Dùng helper chung:

```ts
normalizeApiError(error)
```

---

## Filter/query params

Filter phải dùng format thống nhất:

```ts
type QueryParams = {
  keyword?: string;
  from?: string;
  to?: string;
  status?: string[];
  category?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};
```

Không để mỗi module tự đặt tên query khác nhau nếu cùng ý nghĩa.

---

## Checklist API

- [ ] Không có API call trực tiếp trong UI component.
- [ ] Có api client dùng chung.
- [ ] Có error handling thống nhất.
- [ ] Có loading/error state thống nhất.
- [ ] Có mapper/normalizer nếu response phức tạp.
- [ ] Không hardcode secret/token/base URL.
