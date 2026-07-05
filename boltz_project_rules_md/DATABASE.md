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

Dự án dùng Firestore (NoSQL) chứ không phải SQL, nên field trong document Firestore
đã dùng thống nhất **`camelCase`** giống hệt phía frontend (không cần mapper
snake_case ↔ camelCase như dự án dùng SQL backend):

```ts
// Field trong document Firestore (users/{uid}) và type frontend giống nhau:
type UserDoc = {
  role: 'admin' | 'manager' | 'employee' | 'pending';
  departmentId: string;
  employeeName: string;
  lastActive: Timestamp;
};
```

Riêng dữ liệu Excel người dùng upload (nguồn dữ liệu chính) thì tên cột do file gốc
quyết định (tiếng Việt, không theo quy ước code) — được map sang field `camelCase`
nội bộ ngay tại tầng parser (`services/parsers/`, `utils/dataUtils.ts`,
`features/*/utils/*Parser.ts`), không để tên cột thô từ Excel rò rỉ ra UI component.

---

## Data model hiện tại

Đã audit source code thật (2026-07-05). Dự án **không có backend/API server riêng** — 3 nguồn dữ liệu song song:

```txt
Data source:
  1. File Excel/CSV người dùng tự upload (.xlsx, .xls) — NGUỒN DỮ LIỆU CHÍNH.
     Parse client-side bằng `xlsx` + `papaparse`, không có server xử lý.
     Ví dụ: file YCX (doanh thu), file phân ca, file tồn kho/giá sticker.
  2. Firebase Firestore — lưu cấu hình, tài khoản, đồng bộ cloud (KHÔNG lưu dữ liệu
     Excel gốc dạng thô, chỉ lưu config/state đã xử lý + 1 số bản ghi tổng hợp).
  3. IndexedDB (qua thư viện `idb`) — cache cục bộ trong trình duyệt, dùng cho
     dữ liệu lớn (đã parse) cần load nhanh lần sau, hoạt động được cả khi offline/demo mode.

Database type: Firebase Firestore (NoSQL, document-based) — KHÔNG phải SQL.
  Không có tailwind.config/schema migration truyền thống; cấu trúc doc là quy ước
  trong code (services/firestoreService.ts và các service khác), không có schema
  enforce ở tầng database.

Main collections (Firestore) — điểm vào chính: services/firebase.ts (khởi tạo app/db):
  - `users/{uid}` — hồ sơ tài khoản. Field quan trọng: `role` ('admin' | 'manager' |
    'employee' | 'pending'), `departmentId` (mã kho, có thể nhiều mã cách nhau dấu
    phẩy với 'manager'), `employeeName`, `status` ('pending' | 'approved' | 'blocked'
    | 'new' | 'expired'), `lastActive`, `expiresAt`.
    - Subcollection `users/{uid}/notifications/{id}` — thông báo hệ thống cho user đó.
    - Subcollection `users/{uid}/configs/{key}` — cấu hình đã lưu (cột, target...).
    - Subcollection `users/{uid}/schedules/{key}` — lịch phân ca đã lưu (zone phan-ca).
    - Subcollection `users/{uid}/salesData/{...}` + doc `salesData/meta` — dữ liệu
      doanh thu đồng bộ cloud (zone Root, qua `services/cloudDataService.ts`).
    - Doc `users/{uid}/setting/configuration` — 1 doc cấu hình tổng cho user.
    - Doc `users/{uid}/state/current` — trạng thái làm việc dở (zone sticker-event).
  - `shared_configs/{id}` — cấu hình được admin/manager chia sẻ dùng chung cho nhiều
    user (đọc qua `services/firestoreService.ts`, `AdminAnnouncementModal.tsx`).
  - `stores/{storeId}` — dữ liệu riêng theo mã kho, dùng bởi zone `sticker-event`
    (`features/sticker-event/services/firebaseService.ts`):
    - Subcollection `productChunks/{chunk_N}`, `inventoryChunks/{chunk_N}` — dữ liệu
      sản phẩm/tồn kho được chia nhỏ thành chunk (do giới hạn dung lượng 1 doc Firestore).
    - Subcollection `savedLists/{id}` — danh sách sticker đã lưu.
    - Subcollection `manualProducts/{id}` — sản phẩm nhập thủ công.
    - Doc `metadata/sync`, `metadata/products`, `metadata/inventory` — mốc đồng bộ.
  - `_system/stats` — 1 doc thống kê traffic/online-user toàn hệ thống
    (`hooks/useSystemTraffic.ts`).

IndexedDB (client-side, KHÔNG phải Firestore):
  - Root: `services/dbService.ts` — 2 object store `APP_STORE` (dữ liệu app: cache
    Excel đã parse, config lớn) và `SETTINGS_STORE` (setting nhỏ). Truy cập qua hook
    `hooks/useIndexedDBState.ts` dùng chung.
  - Zone `phan-ca` có `db/idb.ts` riêng (theo nguyên tắc cách ly zone, RULES.md §2.0).
  - Dùng để cache avatar, cấu hình cột, dữ liệu đã parse — tồn tại độc lập với
    Firestore để app vẫn chạy được ở "Chế độ Dùng Thử" (demo/offline, không cần đăng
    nhập Firebase).

Relationships:
  - `users.departmentId` là khóa liên kết ngầm (không phải foreign key thật) tới dữ
    liệu Excel đã upload — dữ liệu lọc theo mã kho khớp với `departmentId` của user.
  - `stores/{storeId}` (zone sticker-event) dùng `storeId` = mã kho, cùng khái niệm
    với `departmentId` nhưng là 1 collection Firestore riêng biệt (không phải
    subcollection của `users`) vì dữ liệu này dùng chung cho nhiều nhân viên cùng kho.

Known issues:
  - Không có validation schema tập trung cho document Firestore — mỗi service tự
    định nghĩa field cần thiết qua TypeScript interface phía client, không có
    Firestore Security Rules kiểm tra field-level đầy đủ (rủi ro bảo mật, xem
    `SECURITY.md`).
  - `productChunks`/`inventoryChunks` chia nhỏ thủ công theo số lượng cố định — nếu
    đổi kích thước chunk phải xử lý migration dữ liệu cũ theo chunk size mới.
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

Các số liệu tính toán phải có nguồn dữ liệu rõ. Các chỉ số chính hiện có trong dự án:

```txt
Chỉ số: Doanh Thu Thực (DT / revenue)
Nguồn dữ liệu: file Excel YCX người dùng upload (cột giá bán)
Công thức: calculateRowMetrics() trong utils/dataUtils.ts
Field liên quan: revenue
Module sử dụng: Root (Dashboard), bi-dashboard (Nhân Viên/Thi Đua)

Chỉ số: Doanh Thu Quy Đổi (DTQĐ / revenueQD)
Nguồn dữ liệu: revenue nhân với hệ số quy đổi theo ngành hàng/nhóm hàng
Công thức: getHeSoQuyDoi() + calculateRowMetrics() trong utils/dataUtils.ts —
  hệ số quy đổi lấy từ Google Sheet cấu hình (nạp qua services, xem "Bảo Hiểm",
  "Bảo Hiểm ĐMX", "Vas" trong log console lúc khởi động app)
Field liên quan: revenueQD
Module sử dụng: Root, bi-dashboard (mọi tab thi đua/target đều dùng DTQĐ)

Chỉ số: Hiệu Quả QĐ (HQQĐ)
Nguồn dữ liệu: tỉ lệ revenueQD / target hoặc so với mốc tham chiếu
Công thức: tính trong từng hook/module tiêu thụ (VD: useTrendChartLogic,
  useIndustryViewLogic) dựa trên revenueQD đã tính sẵn — CHƯA có 1 hàm dùng chung
  duy nhất, đây là nợ kỹ thuật cần chuẩn hóa ở Phase 4 (xem TASKS.md)
Field liên quan: revenueQD, target
Module sử dụng: bi-dashboard

Chỉ số: Trả Góp (Tỉ lệ trả chậm/trả góp)
Nguồn dữ liệu: cột "Hình thức thanh toán" trong file YCX
Công thức: getHinhThucThanhToan() trong utils/dataUtils.ts — phân loại
  'tra_gop' | 'tien_mat' | 'thu_ho' | 'khac'
Field liên quan: hinhThucThanhToan (đã map từ cột Excel gốc)
Module sử dụng: Root, bi-dashboard

Chỉ số: Số Lượng (quantity)
Nguồn dữ liệu: file Excel YCX (cột số lượng), có nhân hệ số quy đổi cho 1 số
  nhóm hàng đặc biệt (VD: Vieon — xem features/bi-dashboard/components/TargetHero.tsx)
Công thức: calculateRowMetrics() trong utils/dataUtils.ts
Field liên quan: quantity
Module sử dụng: Root, bi-dashboard
```

Không để mỗi module tự hiểu khác nhau về cùng một field/chỉ số. Hiện tại `revenue`/
`revenueQD`/`quantity` đã dùng chung 1 nguồn (`calculateRowMetrics()`), nhưng HQQĐ
(hiệu quả quy đổi) vẫn còn tính rải rác ở nhiều hook khác nhau — ưu tiên gom về 1
helper dùng chung khi làm Phase 4 (Chuẩn hóa filter và calculation).

---

## Checklist database/data model

- [ ] Có danh sách data source chính.
- [ ] Có mô tả field quan trọng.
- [ ] Có mapping nếu backend/frontend khác naming.
- [ ] Có quy tắc migration.
- [ ] Có quy tắc xử lý null/empty data.
- [ ] Có tài liệu cho các công thức tính toán dựa trên dữ liệu.
