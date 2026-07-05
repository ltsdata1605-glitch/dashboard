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

## Cấu trúc thư mục thật (audit 2026-07-05)

**Nguồn chân lý đầy đủ và chi tiết nhất là `RULES.md` (mục 1 "Cấu trúc thư mục" và mục 2
"Kiến trúc module") — file này chỉ tóm tắt lại ở mức tổng quan, khi có mâu thuẫn hoặc cần
chi tiết, ưu tiên đọc `RULES.md`.**

Dự án **không dùng thư mục `src/`** — cấu trúc phẳng ngay tại root, KHÔNG có `app/`,
`modules/`, `shared/lib/`, `shared/services/`, `stores/` như template gốc mô tả trước đây
(bản mô tả đó là lý thuyết chung, chưa từng khớp với dự án này):

```txt
dashboardycx/
├── App.tsx                  # Router chính — tab-based qua LayoutContext, KHÔNG dùng react-router
├── index.tsx / index.html   # Entry point
├── styles.css               # Tailwind 4 @theme tokens + global CSS
├── styles/tokens.css        # Design token 3 tầng (Primitive → Semantic → Component)
├── constants.ts / types.ts  # Hằng số & type dùng chung toàn app
├── contexts/                # AuthContext, LayoutContext, DashboardContext, ThemeContext
├── hooks/                   # CHỈ dành cho module analysis (Dashboard) + check-thuong (Root)
├── services/                # Firebase/Firestore/IndexedDB/parser — CHỈ dành cho Root
├── utils/                   # Pure function dùng CHUNG cho cả 4 khu vực (dataUtils.ts...)
├── components/
│   ├── shared/ui/           # ⭐ Bộ component chuẩn dùng chung 4 khu vực — xem danh sách thật bên dưới
│   ├── layout/               # Sidebar, Header, MobileBottomNav (Root, nhưng Header là điểm
│   │                          #   mount portal desktop-toolbar dùng chung qua #global-header-actions)
│   ├── views/                # Các module chính của Root (mỗi file = 1 tab)
│   ├── employees/ charts/ tables/ filters/ modals/ common/ upload/  # Root only
├── features/                 # ⭐ 3 khu vực CÁCH LY, mỗi thư mục = 1 "mini-app" riêng
│   ├── bi-dashboard/         # Report BI — tab `employees`, mount qua <BiWrapper/>
│   ├── phan-ca/              # Phân ca — tab `tools-phanca`, mount qua <PhanCaView/>
│   └── sticker-event/        # In Sticker — tab `tools-print-sticker`, mount qua <StickerPrinterView/>
└── public/                  # Static assets
```

**Các thư mục KHÁC ở root tồn tại nhưng KHÔNG phải là 1 phần của ứng dụng** — không import
gì từ đây khi bàn về kiến trúc app: `_agents/` (cũ, đã archive — không nhầm với `.agents/`
chính thức), `archive/` (file zip backup), `design-system/` (dự án tham khảo riêng),
`scratch/`, `tasks/`, `telegram-agent/` (hạ tầng cho 1 công cụ AI khác chạy song song trên
cùng repo — xem CHANGELOG 2026-07-05 "Lưu ý môi trường phát hiện giữa chừng").

Nguyên tắc áp dụng cho cấu trúc thật này:

- Mỗi zone (`features/bi-dashboard`, `features/phan-ca`, `features/sticker-event`) code
  nằm trong chính thư mục của nó — KHÔNG có thư mục `modules/` chung.
- UI dùng chung nằm trong `components/shared/ui/` (không phải `shared/ui`).
- Logic tính toán dùng chung nằm trong `utils/dataUtils.ts` (không có `shared/lib/`).
- Service/API nằm trong `services/` (Root) hoặc `features/*/services/` (mỗi zone tự có,
  không dùng chung) — xem `API.md`.
- Type/interface dùng chung nằm trong `types.ts` (Root) hoặc `features/*/types/` riêng
  từng zone (KHÔNG có `shared/types/` tập trung).

---

## Ranh giới trách nhiệm

### UI Component

Chỉ chịu trách nhiệm hiển thị và tương tác UI.

Không nên chứa:

- Công thức tính toán nghiệp vụ phức tạp.
- API call trực tiếp nếu có service layer.
- Mapping dữ liệu phức tạp.
- Business rule lặp lại.

### Module (= mỗi zone trong `features/*`)

Module chịu trách nhiệm gom màn hình, logic nghiệp vụ và data mapping của một miền chức năng.
Cấu trúc lý tưởng bên dưới KHÔNG bắt buộc giống hệt 100% — 3 zone thật hiện đã khác nhau
đôi chút (audit 2026-07-05), không cần ép về 1 khuôn cứng nếu rủi ro cao khi đổi:

```txt
features/zone-name/
├── components/     # bi-dashboard, phan-ca đi theo mẫu này
├── hooks/
├── services/
├── utils/
├── types.ts
└── ...             # phan-ca có thêm db/, model/; bi-dashboard có thêm contexts/, store/, workers/
```

Riêng `features/sticker-event/` để phần lớn file `.tsx` NGAY tại top-level (không gom vào
`components/`) — đây là hiện trạng đã tồn tại lâu, không migrate lại chỉ vì lý do "cho giống
2 zone kia" trừ khi có yêu cầu refactor rõ ràng cho riêng zone này.

### Shared UI

`components/shared/ui/` — danh sách THẬT hiện có (2026-07-05, xem
`components/shared/ui/index.ts` để biết export chính xác):

```txt
components/shared/ui/
├── Button.tsx          # variant: primary/secondary/danger/ghost/outline; size: sm/md/lg/icon
├── Card.tsx
├── Modal.tsx           # thay cho Dialog — maxWidth: sm/md/lg/xl/2xl/4xl/full
├── ConfirmDialog.tsx    # dialog xác nhận dựng sẵn trên Modal
├── DataTable.tsx
├── Input.tsx
├── Select.tsx
├── Tabs.tsx
├── Badge.tsx
├── Dropdown.tsx
├── Skeleton.tsx         # loading state — KHÔNG có component "LoadingState" riêng
├── EmptyState.tsx
├── StatCard.tsx
├── ProgressBar.tsx
├── Tooltip.tsx
└── utils.ts             # cn() helper (clsx + tailwind-merge)
```

Không có `Popover.tsx`, `ErrorState.tsx`, `Dialog.tsx` riêng biệt tính đến thời điểm audit
— nếu cần, phải kiểm tra lại xem đã thật sự thiếu chưa trước khi tạo mới (tránh trùng
component nếu tên khác nhưng chức năng đã có sẵn ở `Modal`/`ConfirmDialog`/`Skeleton`).

---

## Data flow chuẩn (thật)

Nguồn dữ liệu CHÍNH của app là file Excel/CSV người dùng tự upload, không phải gọi API —
xem `API.md`/`DATABASE.md` để biết chi tiết. Luồng thật:

```txt
File Excel/CSV người dùng upload
   ↓
Parser (services/parsers/, features/*/utils/*Parser.ts) — map cột Excel → field camelCase
   ↓
(tùy chọn) Đồng bộ lên Firestore / cache IndexedDB để dùng lại lần sau
   ↓
Hook tính toán (VD: useDashboardLogic, useIndustryViewLogic) — áp dụng filter, tính KPI
   ↓
Context (DashboardContext...) hoặc props truyền xuống
   ↓
UI component (chỉ hiển thị, không tự tính toán/parse lại)
```

Không nên để UI component tự parse Excel hoặc tự tính công thức nghiệp vụ phức tạp — dồn
về hook/parser/`utils/dataUtils.ts`.

---

## Filter architecture

`FilterState` thật đã tồn tại tại `types.ts` (Root, dùng cho `analysis`/`check-thuong`) —
KHÔNG dùng shape generic `keyword/status/category` như lý thuyết chung, mà theo đúng nghiệp
vụ retail của dự án:

```ts
// types.ts (rút gọn, xem file thật để đầy đủ)
export interface FilterState {
    kho: string[];              // mã kho/siêu thị được chọn
    xuat: string;                // trạng thái xuất hàng
    trangThai: string[];
    nguoiTao: string[];          // người tạo đơn
    department: string[];
    parent: string[];            // ngành hàng cha
    startDate: string;
    endDate: string;
    dateRange: string;
    selectedMonths: string[];
    industryGrid: { selectedGroups: string[]; selectedSubgroups: string[] };
    summaryTable: { kho: string[]; child: string[]; manufacturer: string[]; creator: string[]; product: string[] };
    // ... còn field khác, xem types.ts
}
```

Mỗi zone `features/*` **không dùng chung `FilterState` này** — mỗi zone tự định nghĩa
filter state riêng phù hợp nghiệp vụ của nó (VD: `phan-ca` filter theo tháng/bộ phận,
`sticker-event` filter theo mã kho/loại sản phẩm) vì các zone cách ly theo `RULES.md` §2.0,
không chia sẻ state cross-zone.

Quy tắc:

- Filter state có default value.
- Filter dùng chung helper để serialize/deserialize.
- Filter ảnh hưởng nhiều khu vực phải được quản lý tập trung.
- Khi reset filter, tất cả khu vực liên quan phải reset đồng bộ.
- Không để mỗi bảng hoặc mỗi card tự định nghĩa filter riêng.

---

## Calculation architecture (thật)

Không có thư mục `shared/lib/calculations/` — công thức tính toán dùng chung thật sự nằm ở:

```txt
utils/dataUtils.ts        # Dùng chung cho CẢ 4 khu vực — formatCurrency, formatQuantity,
                           # calculateRowMetrics (revenue/revenueQD/quantity), getHeSoQuyDoi...
features/*/utils/*.ts     # Công thức riêng của từng zone (KHÔNG dùng chung, KHÔNG import
                           # chéo sang zone khác) — VD: features/phan-ca/utils/scheduleUtils.ts,
                           # features/sticker-event/utils/format.ts
```

Xem `DATABASE.md` mục "Quy tắc dữ liệu cho calculation" để biết danh sách chỉ số thật
(DT, DTQĐ, HQQĐ, Trả góp, Số lượng) kèm tên hàm/file cụ thể.

**Lưu ý đã biết (nợ kỹ thuật)**: một hàm cùng tên ở 2 zone không mặc nhiên là trùng lặp cần
gộp — ví dụ `features/sticker-event/utils/format.ts:formatCurrency` format đầy đủ để in
sticker, khác mục đích với `utils/dataUtils.ts:formatCurrency` rút gọn cho dashboard. Kiểm
tra ngữ cảnh dùng trước khi "dedupe" (xem `RULES.md` §2.0). Ngoài ra HQQĐ (hiệu quả quy đổi)
hiện tính rải rác ở nhiều hook khác nhau, chưa gom về 1 helper dùng chung.

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
