# ARCHITECTURE.md

## Mục tiêu kiến trúc

Kiến trúc dự án phải giúp:

- Dễ tìm file.
- Dễ sửa module.
- Dễ tái sử dụng component.
- Tránh trùng logic.
- Tránh mỗi module tự xử lý một kiểu.
- Dễ test, dễ build, dễ deploy.

---

## Cấu trúc thư mục đề xuất

Claude phải kiểm tra source hiện tại trước khi áp dụng. Không đổi toàn bộ cấu trúc một lần nếu rủi ro cao. Ưu tiên migrate từng phần.

```txt
src/
├── app/                       # App entry, routes, layout cấp cao
├── modules/                   # 4 app/module chính và các module nghiệp vụ
│   ├── module-a/
│   ├── module-b/
│   ├── module-c/
│   └── module-d/
├── shared/
│   ├── components/            # Component nghiệp vụ dùng chung
│   ├── ui/                    # UI primitives: Button, Modal, Table, Card...
│   ├── hooks/                 # Hooks dùng chung
│   ├── lib/                   # Helpers, utils, calculation engine
│   ├── services/              # API client, service layer
│   ├── stores/                # Global/shared state nếu có
│   ├── types/                 # Type/interface dùng chung
│   └── constants/             # Constants dùng chung
├── styles/
│   ├── globals.css
│   ├── tokens.css
│   └── components.css
├── assets/
└── config/
```

Nếu project không dùng React/Next/Vite, hãy điều chỉnh theo framework thực tế nhưng vẫn giữ nguyên nguyên tắc:

- Module code nằm trong `modules` hoặc vùng tương đương.
- UI dùng chung nằm trong `shared/ui`.
- Logic dùng chung nằm trong `shared/lib`.
- API/service nằm trong `shared/services`.
- Type/schema nằm trong `shared/types`.

---

## Ranh giới trách nhiệm

### UI Component

Chỉ chịu trách nhiệm hiển thị và tương tác UI.

Không nên chứa:

- Công thức tính toán nghiệp vụ phức tạp.
- API call trực tiếp nếu có service layer.
- Mapping dữ liệu phức tạp.
- Business rule lặp lại.

### Module

Module chịu trách nhiệm gom màn hình, logic nghiệp vụ và data mapping của một miền chức năng.

Một module nên có cấu trúc:

```txt
module-name/
├── components/
├── hooks/
├── services/
├── utils/
├── types.ts
├── constants.ts
└── index.ts
```

### Shared UI

Dành cho component nền tảng dùng toàn app:

```txt
shared/ui/
├── Button/
├── Card/
├── Modal/
├── Dialog/
├── Table/
├── Input/
├── Select/
├── Tabs/
├── Badge/
├── Dropdown/
├── Popover/
├── LoadingState/
├── EmptyState/
└── ErrorState/
```

---

## Data flow chuẩn

Luồng dữ liệu nên đi theo hướng:

```txt
API/Database
   ↓
Service layer
   ↓
Mapper/Normalizer
   ↓
Store/Hook/Query
   ↓
Module container
   ↓
UI component
```

Không nên để UI component gọi API và tự format dữ liệu phức tạp.

---

## Filter architecture

Tất cả filter nên đi qua một cấu trúc chuẩn:

```ts
type FilterState = {
  dateRange?: {
    from?: string;
    to?: string;
  };
  keyword?: string;
  status?: string[];
  category?: string[];
  module?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};
```

Quy tắc:

- Filter state có default value.
- Filter dùng chung helper để serialize/deserialize.
- Filter ảnh hưởng nhiều khu vực phải được quản lý tập trung.
- Khi reset filter, tất cả khu vực liên quan phải reset đồng bộ.
- Không để mỗi bảng hoặc mỗi card tự định nghĩa filter riêng.

---

## Calculation architecture

Công thức tính toán phải nằm ở:

```txt
shared/lib/calculations/
```

Ví dụ:

```txt
shared/lib/calculations/
├── totals.ts
├── percentages.ts
├── currency.ts
├── statistics.ts
└── index.ts
```

Quy tắc:

- Không tính trực tiếp trong JSX/template.
- Không copy công thức sang nhiều file.
- Hàm tính toán phải pure function nếu có thể.
- Input/output phải rõ ràng.
- Cần xử lý trường hợp null/undefined/NaN.

---

## Refactor strategy

Không rewrite toàn bộ dự án trong một lần.

Thứ tự refactor an toàn:

1. Backup/branch trước khi sửa.
2. Audit cấu trúc hiện tại.
3. Tạo shared design tokens.
4. Tạo shared UI primitives.
5. Refactor button/card/modal/table/filter trước.
6. Chuẩn hóa calculation/filter engine.
7. Migrate từng module sang chuẩn mới.
8. Xóa code thừa sau khi đã kiểm tra references.
9. Chạy build/lint/test.
10. Cập nhật docs.

---

## Quy tắc xóa code thừa

Trước khi xóa:

- Search toàn bộ project xem file/function/component có được import không.
- Kiểm tra dynamic import hoặc string route nếu có.
- Kiểm tra build sau khi xóa.
- Ghi rõ trong `CHANGELOG.md`.

Nếu chưa chắc, di chuyển vào vùng deprecated/tạm thời hoặc ghi chú thay vì xóa ngay.
