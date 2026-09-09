# KẾ HOẠCH TỔNG THỂ — Tái cấu trúc & Nâng cấp Dashboard YCX

> Lập ngày 2026-09-06. Dựa trên khảo sát toàn bộ mã nguồn + đo hiệu năng trên **dữ liệu thật**
> (tài khoản lts.truongson@gmail.com, siêu thị 99 Hùng Vương) bằng Playwright.
>
> Tài liệu này là **kế hoạch**, không phải nhật ký thi công. Nhật ký nằm ở `implementation_plan.md`.

---

## 0. Phương pháp — những gì đã thực đo, những gì còn là suy luận

| Đã ĐO thật | Cách đo |
|---|---|
| Quy mô mã nguồn, file lớn, trùng lặp | `find`/`wc`/`diff` trên toàn repo |
| Nợ thiết kế (1.416 vi phạm màu) | `violations-baseline.json` của lint-ratchet |
| Kích thước bundle production | `dist/assets/*.js` sau `npm run build` |
| Thời gian tải, RAM, DOM, thao tác | Playwright + Performance API trên dữ liệu thật |
| Lỗ hổng thư viện | `npm audit` |
| Luật Firestore, Cloud Functions | Đọc `firestore.rules`, `functions/src/*` |

| CHƯA đo được | Lý do | Cách bổ sung |
|---|---|---|
| Hiệu năng module Phân Tích với file YCX thật | Dữ liệu Excel nằm trong IndexedDB theo origin, profile test không có | Cần đường dẫn 1 file YCX thật |
| LCP/TTI trên production (dashboard.pro.vn) | Phiên đăng nhập gắn theo origin; preview chạy cổng khác | Đăng nhập 1 lần trên origin production |
| Chi phí Firestore thực tế (đọc/ghi/tháng) | Không có quyền xem billing | Xuất báo cáo usage từ Firebase Console |

---

## 1. BẢN ĐỒ HIỆN TRẠNG

### 1.1 Quy mô

| Khu vực | File | Dòng | Ghi chú |
|---|---:|---:|---|
| `components/` (Phân Tích + dùng chung) | 124 | 29.552 | Khu vực lớn nhất, là chuẩn thiết kế |
| `features/bi-dashboard/` (Report BI) | 89 | 23.082 | Mini-app độc lập |
| `features/sticker-event/` | 55 | 15.886 | Firebase project riêng |
| `features/phan-ca/` | 34 | 8.936 | |
| `services/` + `hooks/` + `utils/` + `contexts/` | 53 | 14.083 | |
| `functions/` (Cloud Functions) | 7 | 767 | Project TS riêng |
| **Tổng mã ứng dụng** | **~379** | **~92.000** | |

Ngoài ra có 2 dự án Node rời nằm trong repo, **không thuộc build Vite** và không có chủ sở hữu rõ
ràng: `price-scraper-server/` (server scraping giá, `PriceComparisonView.tsx` gọi tới) và
`telegram-agent/` (bot). Cả hai kéo theo `node_modules` riêng.

### 1.2 Hiệu năng đo trên dữ liệu thật (dev server, sau khi đã đăng nhập)

```
Tải trang → app dựng xong      : 358 ms
Vào Report BI                  : 377 ms
Render bảng Thi đua (29 dòng)  : 181 ms
Mở popup Bộ lọc cột            :  79 ms
DOM khi ở bảng Thi đua         : 893 node / 38 hàng
JS heap                        : 76 MB dùng / 111 MB cấp phát
IndexedDB + cache              : 5 MB
```

Thao tác **nhanh**. Vấn đề không nằm ở tốc độ phản hồi UI của Report BI, mà ở **khối lượng tải
xuống lần đầu** và **RAM**:

| Chunk JS (production) | Kích thước |
|---|---:|
| `DashboardView` (module Phân Tích) | **1,0 MB** |
| `vendor-firebase` | 652 KB |
| `StickerEventApp` | 576 KB |
| `vendor-excel` (xlsx) | 420 KB |
| `vendor-charts` (recharts) | 384 KB |
| `jspdf` | 384 KB |
| `worker` | 336 KB |
| `html2canvas` | 200 KB |
| **Tổng JS** | **5,9 MB** |

76 MB heap khi **chưa** mở module Phân Tích là dấu hiệu rõ của mô hình dữ liệu tốn bộ nhớ (mục 3.1).

### 1.3 Nợ kỹ thuật đã được ghi nhận

- **1.416 vi phạm màu phi-semantic** trải trên **118 file** (baseline lint-ratchet). Tức là hệ
  thống token màu đã có nhưng **không được dùng**: chỉ 210 chỗ dùng `var(--…)`, trong khi có 91 mã
  hex viết thẳng trong `.tsx` và hàng nghìn class màu tuỳ tiện.
- **~3.200 dòng trùng lặp**: `services/uiService.ts` (1.123 dòng) bị sao chép gần nguyên văn sang
  `features/phan-ca` và `features/sticker-event` (khác nhau chỉ ~130/1.100 dòng ≈ **88% giống
  nhau**), cộng thêm bản thứ tư `features/bi-dashboard/services/uiExport/imageExport.ts`.
- **God files** (>800 dòng): `WarehouseSummary.tsx` 1.496, `printService.ts` 1.467,
  `useStickerPrinterData.ts` 1.445, `scheduleUtils.ts` 1.272, `uiService.ts` 1.123,
  `useDataManagement.ts` 1.119, `CompetitionSummaryView.tsx` 1.065, `SupermarketConfig.tsx` 955.
- **Không có test đơn vị** (`vitest`/`jest` chưa cài). Chỉ có 16 test E2E Playwright (mới thêm
  2026-09-05/06) và 1 bộ test Firestore rules chưa chạy được vì thiếu Java.

Mặt tích cực đáng ghi nhận: chỉ **42** chỗ dùng `any`, **3** `@ts-ignore`, **0** `window.alert`,
**0** TODO/FIXME bỏ quên, **3** `console.log` sót. Kỷ luật kiểu dữ liệu tốt hơn nhiều dự án cùng loại.

---

## 2. BẢO MẬT

### P0 — Xử lý ngay

**2.1 `xlsx@0.18.5` có 2 lỗ hổng high và KHÔNG có bản vá trên npm**
- `GHSA-4r6h-8v6p-xvw6` Prototype Pollution, `GHSA-5pgg-2g8v-p4x9` ReDoS.
- Bề mặt tấn công lớn: file Excel **do người dùng tải lên** được parse ở ≥6 nơi
  (`services/worker.ts`, `services/dataService.ts` ×3, `features/sticker-event/services/fileParser.ts` ×2).
- Một file `.xlsx` dựng sẵn có thể làm treo tab (ReDoS) hoặc làm hỏng `Object.prototype` của toàn app.
- **Xử lý**: chuyển sang bản SheetJS phân phối chính thức (`https://cdn.sheetjs.com/xlsx-0.20.x/…`,
  cài qua URL trong `package.json`) — SheetJS đã ngừng phát hành trên npm, bản npm 0.18.5 là bản
  cuối và sẽ **không bao giờ** được vá. Kèm theo: `Object.freeze(Object.prototype)` không khả thi,
  thay vào đó parse Excel **trong Web Worker** (đã có sẵn `services/worker.ts`) để prototype
  pollution không chạm được vào ngữ cảnh chính, và bỏ cờ `WTF: true` (bật chế độ ném lỗi rộng).

**2.2 12 lỗ hổng phụ thuộc khác** (1 critical, 4 high, 7 moderate) — `@grpc/grpc-js`, `fast-uri`,
`dompurify`, `hono`, `@hono/node-server`. Phần lớn `npm audit fix` xử lý được. Cần làm cùng lúc với
2.1 rồi chạy lại toàn bộ E2E để bắt hồi quy.

### P1 — Trong đợt kế tiếp

**2.3 Không có Content-Security-Policy.** `index.html` không có meta CSP, hosting là GitHub Pages
(không đặt được header ở tầng CDN). Kết hợp với **15 chỗ `dangerouslySetInnerHTML`** (trong đó
`IndustryView.tsx`, `SummaryTableView.tsx`, `CompetitionListView.tsx` render **tên cột lấy từ dữ
liệu người dùng dán vào**) → một chuỗi độc trong dữ liệu dán có thể chạy script.
- Hiện chỉ `features/sticker-event/stickerprinter/ticketSanitize.ts` dùng DOMPurify; 3 file BI trên
  **không sanitize**.
- **Xử lý**: (a) thay `dangerouslySetInnerHTML` cho tiêu đề cột bằng render text + `<br/>` bằng JSX
  thật (chỉ cần tách chuỗi theo `<br/>`), (b) thêm meta CSP, (c) cân nhắc chuyển hosting sang
  Firebase Hosting để đặt được header (`Content-Security-Policy`, `X-Frame-Options`,
  `Referrer-Policy`) — dự án đã dùng Firebase nên không phát sinh hạ tầng mới.

**2.4 Ba bản sao cấu hình Firebase hard-code** (`services/firebase.ts`,
`features/phan-ca/services/firebase.ts`, `features/sticker-event/firebase-applet-config.json`).
Bản thân `apiKey` của Firebase không phải bí mật, nhưng ba bản sao khiến việc đổi project/khoá
thành ba lần sửa, dễ lệch.
**CẬP NHẬT 2026-09-07 — QUYẾT ĐỊNH: BỎ QUA, không làm** (đã hỏi user, xác nhận). Lý do phát hiện
lúc thực thi: "gom về một nguồn" như đề xuất ban đầu (cho `features/phan-ca` import chung
`services/firebase.ts` ở gốc) **vi phạm trực tiếp** quy tắc cách ly 4 khu vực của CLAUDE.md mục 1
(`features/*` không được import `services/*` ở gốc, ngoại lệ CHỈ cấp cho `bi-dashboard`, không cấp
cho `phan-ca`). Lợi ích thấp (tránh trùng lặp, không phải lỗ hổng bảo mật thật — apiKey không phải
bí mật) trong khi rủi ro cao (sửa cả 3 file khởi tạo Firebase dùng cho đăng nhập — sai là khoá
người dùng khỏi app). Nếu MUỐN giảm trùng lặp sau này mà không phá cách ly: mỗi khu vực vẫn giữ
`firebase.ts` riêng (không import chéo), nhưng đọc giá trị qua `import.meta.env.VITE_FIREBASE_*`
(biến build-time, không phải import module) thay vì hard-code — `features/sticker-event/firebase.ts`
ĐÃ làm đúng kiểu này sẵn (đọc `import.meta.env` với hard-code làm fallback), chỉ cần áp dụng thêm
cho `services/firebase.ts` và `features/phan-ca/services/firebase.ts`. Chưa làm vì cùng lý do
rủi ro/lợi ích ở trên, để lại cho lúc thật sự cần đổi project hoặc khoá.

**2.4b Phát hiện phụ, KHÔNG sửa (đã hỏi user, xác nhận chỉ ghi nhận)**:
`features/sticker-event/firebase-applet-config.json` có comment trong chính code
(`features/sticker-event/firebase.ts`: "Safe load for AI Studio config file (ignored on GitHub)")
nói file này ĐỊNH được gitignore, nhưng thực tế **không có trong `.gitignore`** và **đang được
commit thật** trong lịch sử git (xác nhận bằng `git check-ignore -v` trả về không bị ignore). Nội
dung: `projectId: "dashboa-7e20b"` — TRÙNG project với root/phan-ca (khác CLAUDE.md mô tả "project
riêng"), chỉ khác ở `firestoreDatabaseId` (dùng 1 Firestore database CON tên riêng trong CÙNG
project, không phải project riêng biệt). Không sửa vì: apiKey không phải bí mật thật (bảo mật thật
nằm ở Firestore Rules, đã audit kỹ — xem mục 1-2 trên), và xoá/gitignore file có thể làm vỡ build
sticker-event ở nơi đang deploy nếu chưa có biến môi trường thay thế tương ứng.

**2.5 Chưa bật Firebase App Check.** Rules hiện dựa hoàn toàn vào custom claim (`role`,
`departmentId`). Ai lấy được token hợp lệ đều gọi được API trực tiếp ngoài app. App Check chặn phần
lớn lạm dụng tự động, chi phí triển khai thấp.
**CẬP NHẬT 2026-09-07 — CẦN USER, không tự làm được**: bật App Check thật cần (a) tạo reCAPTCHA v3
site key trong Firebase Console, (b) bật chế độ ENFORCE cho Firestore/Functions trong Firebase
Console — cả 2 bước đều cần quyền truy cập Firebase Console mà agent không có, và bước (b) mang
tính phá vỡ nếu cấu hình sai (khoá luôn mọi request kể cả người dùng thật). Không viết code phía
client đoán trước site key (không test được, có thể throw runtime nếu thiếu key thật). Khi user
sẵn sàng: tạo site key ở Firebase Console → App Check → Web app → reCAPTCHA v3, rồi quay lại yêu
cầu agent thêm `initializeAppCheck()` vào `services/firebase.ts` với site key đó.

### P2 — Ghi nhận, chưa gấp

**2.6 `_system/{doc}` cho phép mọi người đăng nhập ghi** (bộ đếm traffic) — có thể bị bơm số. Ảnh
hưởng thấp, nhưng nên chuyển sang Cloud Function tăng đếm hoặc bỏ hẳn.

**2.7 `price-scraper-server/`** là server Express chạy cục bộ, không có auth. Nếu có ngày được
deploy công khai thì đó là SSRF-as-a-service. Cần quyết định: xoá khỏi repo, hay đưa vào Cloud
Functions có auth.

**Điểm mạnh cần giữ**: `firestore.rules` được viết cẩn thận và có ý thức — đã bịt lỗ manager đọc
toàn bộ `users`, đã chặn client ghi `role`/`status`/`departmentId` kể cả khi là admin, có chú thích
lý do từng khối. Cloud Functions đều kiểm tra `request.auth` và phân quyền trước khi hành động,
khoá Gemini nằm trong Secret Manager chứ không nằm trong bundle. Đây là phần **không cần làm lại**.

---

## 3. HIỆU NĂNG & DỮ LIỆU

### 3.1 Gốc rễ: mô hình `DataRow`

```ts
export type DataRow = { [key: string]: any };   // types.ts:16
```

Mỗi dòng bán hàng là một object với **khoá là tên cột tiếng Việt đầy đủ** ("Trạng thái thu tiền",
"Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính"…). Hệ quả dây chuyền:

1. **RAM**: mỗi dòng lặp lại ~25 chuỗi khoá dài. Với 50.000 dòng là hàng triệu chuỗi khoá — đây là
   lý do heap 76 MB khi chưa mở Phân Tích.
2. **Lưu trữ**: `saveSalesData` dùng `JSON.stringify` toàn bộ mảng rồi ghi một lần vào IndexedDB
   (`services/dbService/salesData.ts:97`). Chuỗi hoá 50k dòng chặn luồng chính hàng giây.
3. **Đọc ô**: `getRowValue()` phải dò nhiều biến thể tên cột, có cache theo khoá đầu nhưng vẫn là
   một lớp gián tiếp trên **mọi** lần đọc ô, trong mọi vòng lặp tính toán.
4. **Đồng bộ**: dữ liệu phải cắt thành chunk 300.000 ký tự để lách giới hạn 1 MiB/document của
   Firestore (`services/firestoreService.ts:309`).

**Hướng xử lý (làm dần, không phá tương thích):**

- **Bước 1 — chuẩn hoá khoá khi nạp**: ngay sau khi parse Excel, ánh xạ tên cột tiếng Việt → khoá
  ngắn cố định (`id`, `sp`, `kh`, `sl`, `gia`…). `getRowValue` giữ nguyên chữ ký nhưng tra bảng ánh
  xạ một lần thay vì dò biến thể. Ước tính giảm 40–60% RAM và bỏ được toàn bộ chi phí dò tên.
- **Bước 2 — lưu dạng cột (columnar)**: mỗi cột một mảng (`Float64Array` cho số, mảng chuỗi được
  dictionary-encode cho các cột lặp nhiều như Kho/Người tạo/Hình thức xuất). Đây là mô hình mọi
  công cụ BI dùng, cho phép lọc/nhóm nhanh hơn hàng chục lần và giảm RAM thêm 3–5 lần.
- **Bước 3 — lưu IndexedDB dạng nhị phân**: bỏ `JSON.stringify`, ghi thẳng ArrayBuffer theo cột.
  Vừa nhanh vừa không chặn luồng chính.

Bước 1 làm được ngay và ít rủi ro. Bước 2–3 nên làm sau khi có test đơn vị cho tầng tính toán
(mục 7).

### 3.2 Bundle 5,9 MB

- `DashboardView` **1,0 MB** trong một chunk: toàn bộ module Phân Tích (bảng, biểu đồ, modal, xuất
  ảnh) tải một lần dù người dùng chỉ xem KPI. → Tách theo section (`business-overview`,
  `trend-chart`, `industry-grid`, `summary-table`, `employee-analysis`) bằng `React.lazy`.
- `jspdf` (384 KB) + `html2canvas` (200 KB) + `html-to-image`: **ba** thư viện xuất ảnh/PDF cùng tồn
  tại. Chọn một (`html-to-image` đang là bản dùng chính), bỏ hai bản còn lại khỏi bundle chính.
- `vendor-excel` 420 KB nạp cùng app dù chỉ dùng khi tải file → chuyển sang `import()` động.
- `StickerEventApp` 576 KB: đã lazy, giữ nguyên.

Mục tiêu: **chunk khởi động < 700 KB**, tổng JS tải lần đầu **< 1,5 MB**.

### 3.3 Firestore

- 23 chỗ `getDocs()` nhưng chỉ 4 chỗ có `limit()`. Với `khoData/{maKho}/salesFiles` nhiều tháng, mỗi
  lần mở app là một lần quét toàn bộ collection → chi phí đọc tăng tuyến tính theo thời gian dùng.
- 6 `onSnapshot` — cần rà xem có listener nào không được huỷ khi unmount (rò rỉ + chi phí).
- Chunk 300.000 ký tự/document là giải pháp đúng cho giới hạn 1 MiB, nhưng ghi/đọc N document cho
  một lần đồng bộ. Sau khi có mô hình cột (3.1), dữ liệu nén tốt hơn nhiều, số chunk giảm mạnh.

### 3.4 React

264 `useMemo`, 186 `useCallback`, 60 `React.memo` trên 254 `useEffect` — mật độ tối ưu hoá cao, cho
thấy đã có xử lý. Hai điểm cần rà: **32 chỗ dùng index làm `key`** (gây render sai khi sắp xếp/lọc —
đúng loại bảng hay đổi thứ tự trong dự án này), và **9 khối `catch {}` rỗng** nuốt lỗi im lặng.

---

## 4. DỌN CODE

| Việc | Khối lượng | Lợi ích |
|---|---|---|
| Gom 4 bản `uiService`/`imageExport` về `services/export/` dùng chung | ~3.200 dòng → ~1.200 | Sửa một lần, hết lệch hành vi xuất ảnh giữa các module |
| Tách 8 god file (>800 dòng) theo trách nhiệm | 8 file | Đọc/sửa được, giảm rủi ro mỗi lần đụng vào |
| Quyết định số phận `price-scraper-server/`, `telegram-agent/` | 2 thư mục | Bớt nhầm lẫn, bớt bề mặt tấn công |
| Xoá 3 `console.log`, 9 `catch {}` rỗng, 3 `@ts-ignore` | nhỏ | Không nuốt lỗi |
| Thay 32 `key={index}` | 32 chỗ | Hết render sai khi sắp xếp |

**Nguyên tắc bắt buộc khi gộp code dùng chung**: bốn khu vực đang cố ý cách ly (CLAUDE.md mục 1).
Code gom về chỉ được đặt ở `components/shared/ui/*`, `utils/dataUtils.ts` hoặc thư mục dùng chung
mới (`services/export/`) — **không** để `features/*` import chéo nhau.

---

## 5. CHUẨN HOÁ THIẾT KẾ — lấy module Phân Tích làm gốc

### 5.1 Vì sao Phân Tích là chuẩn

Đây là module lâu đời nhất, đã qua nhiều vòng chỉnh (bo góc, viền, font header bảng, palette
sky/slate) và là nơi người dùng nhìn nhiều nhất. Các module khác đã được chỉnh dần theo nó nhưng
chưa triệt để.

### 5.2 Rút chuẩn thành tài liệu + code, không để trong đầu

Hiện `styles/tokens.css` có 426 dòng token (primitive → semantic → component) nhưng **chỉ 210 chỗ
dùng**. Việc cần làm:

1. **Trích chuẩn từ Phân Tích thành token**: đo lại từ `DashboardView.tsx` + các bảng con những giá
   trị đang dùng thật (bo góc, độ dày viền, cỡ chữ header bảng `text-[11px] font-bold tracking-tight`,
   khoảng cách card, bảng màu trạng thái) → ghi thành token có tên nghiệp vụ
   (`--table-header-size`, `--card-radius`, `--border-subtle`…).
2. **Ba component khung bắt buộc**: `SectionCard` (khung mỗi khối), `DataTable` (mọi bảng),
   `KpiCard` (mọi thẻ số). Đã tồn tại trong `components/shared/ui/` — việc còn lại là **ép dùng**.
3. **Chuyển 1.416 vi phạm màu theo từng đợt**, ưu tiên theo mức độ người dùng nhìn thấy:
   - Đợt A: Report BI (bảng Thi đua, Summary, Industry) — 4 file, ~120 vi phạm.
   - Đợt B: các bảng của Phân Tích chưa chuẩn (`WarehouseSummary` 33, `TrendChart` 31,
     `IndustryAnalysisTab` 25…).
   - Đợt C: sticker-event (nhiều nhất, ~200) — làm cuối vì ít người dùng nhất.
4. **Siết ratchet**: sau mỗi đợt, hạ baseline. Ratchet đã có sẵn, chỉ cần dùng đúng.

### 5.3 Đồng bộ tương tác

Rà toàn bộ theo checklist: mọi bảng có cùng cách sắp xếp (bấm header), cùng cách ẩn/hiện cột, cùng
vị trí nút xuất ảnh, cùng kiểu empty state, cùng kiểu loading skeleton. Hiện mỗi module một kiểu —
đây là thứ người dùng cảm nhận rõ nhất là "chắp vá".

---

## 6. LỘ TRÌNH THÀNH CÔNG CỤ BI DOANH NGHIỆP

Phần này là **nâng cấp năng lực**, chỉ nên bắt đầu sau khi phần 2–5 xong ít nhất 70%.

### Giai đoạn 1 — Nền tảng dữ liệu (điều kiện cần cho mọi thứ sau)

- **Mô hình cột + chỉ mục** (mục 3.1 bước 2): điều kiện bắt buộc để lọc/nhóm tức thời trên hàng
  trăm nghìn dòng.
- **Một nguồn chân lý cho chỉ số**: hiện `calculateRowMetrics()` là chuẩn cho doanh thu/DTQĐ. Mở
  rộng thành **catalog chỉ số** khai báo được (tên, công thức, đơn vị, cách tổng hợp, cách so sánh)
  thay vì rải rác trong component. Đây là thứ phân biệt "báo cáo" với "công cụ phân tích".
- **Lịch sử theo thời gian**: hiện dữ liệu chủ yếu là ảnh chụp hiện tại; muốn phân tích xu hướng
  cần lưu snapshot theo ngày có cấu trúc (đã có mầm mống ở `snapshot-data-*`).

### Giai đoạn 2 — Năng lực phân tích

- **Pivot động**: người dùng tự chọn hàng/cột/chỉ số (thay vì bảng cố định như hiện nay).
- **So sánh kỳ**: hôm nay/hôm qua, tuần này/tuần trước, cùng kỳ tháng trước — có sẵn ở vài chỗ,
  cần chuẩn hoá thành cơ chế chung.
- **Cảnh báo theo ngưỡng**: thay vì người dùng tự soi bảng, hệ thống đẩy thông báo khi chỉ số vượt
  ngưỡng (đã có hạ tầng `notifications` trong Cloud Functions).
- **Drill-down xuyên suốt**: bấm một ô bất kỳ → xem các dòng cấu thành. Hiện chỉ có ở vài bảng.

### Giai đoạn 3 — Chia sẻ & vận hành

- **Xuất báo cáo có lịch**: gửi định kỳ qua Telegram hoặc email. (Cập nhật 2026-09-09: thư mục
  `telegram-agent/` đã được XOÁ ở Đợt 5 theo quyết định của user — nếu sau này làm mục này thì
  dựng lại từ đầu, ưu tiên Cloud Functions đã có sẵn thay vì script chạy trên máy cá nhân.)
- **Nhật ký truy cập dữ liệu**: ai xem gì, khi nào — cần cho dữ liệu doanh thu nhiều siêu thị.
- **Phân quyền theo cấp**: hiện là admin/manager/employee theo Kho. Doanh nghiệp thật cần thêm cấp
  vùng/miền.

---

## 7. TRÌNH TỰ THỰC HIỆN

Nguyên tắc: **không đợt nào được phép làm hỏng thứ đang chạy**. Mỗi đợt kết thúc bằng
`npm run check` + `npm run test:e2e` xanh, và có ảnh chụp đối chiếu trước/sau.

| Đợt | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| **0. Lưới an toàn** (làm trước tiên) | Cài `vitest`; viết test đơn vị cho `calculateRowMetrics`, `getRowValue`, `parseCompetitionDataBySupermarket`, `filterService`; bổ sung E2E cho 4 khu vực | Test đơn vị phủ ≥80% tầng tính toán; E2E chạy trong CI |
| **1. Bảo mật P0** | Thay `xlsx`, `npm audit fix`, parse Excel trong Worker | 0 lỗ hổng high/critical; E2E xanh |
| **2. Bảo mật P1** | Bỏ `dangerouslySetInnerHTML` ở 3 file BI, thêm CSP, gom cấu hình Firebase, bật App Check | Không còn HTML thô từ dữ liệu người dùng |
| **3. Hiệu năng bundle** | Tách `DashboardView` theo section, `import()` động cho xlsx, bỏ 2 thư viện xuất ảnh thừa | Chunk khởi động < 700 KB |
| **4. Mô hình dữ liệu bước 1** | Chuẩn hoá khoá cột khi nạp | RAM giảm ≥40% với cùng file; test đơn vị xanh |
| **5. Dọn code** | Gom `uiService`, tách god file, xử lý `key={index}`/`catch {}` | Không còn file >800 dòng ở khu vực Phân Tích/BI |
| **6. Chuẩn hoá thiết kế** | Đợt A → B → C như mục 5.2 | Baseline ratchet giảm từ 1.416 → <400 |
| **7. Nền tảng BI** | Mô hình cột, catalog chỉ số, snapshot | Lọc 100k dòng < 200 ms |
| **8. Năng lực BI** | Pivot động, so sánh kỳ, cảnh báo, drill-down | Theo từng tính năng |

Đợt 0 đứng trước tất cả vì mọi đợt sau đều **sửa vào tầng tính toán** — không có test đơn vị thì mỗi
lần sửa là một lần đánh cược với số liệu doanh thu.

---

## 8. RỦI RO & NGUYÊN TẮC

1. **Số liệu sai nguy hiểm hơn app chậm.** Mọi thay đổi chạm tầng tính toán phải có test đơn vị
   trước, và phải đối chiếu tổng doanh thu/DTQĐ trước–sau trên cùng một file thật.
2. **Không refactor lớn khi chưa có lưới an toàn.** Đợt 0 không được rút gọn.
3. **Cách ly 4 khu vực là cố ý**, không phải nợ kỹ thuật. Chỉ gom những thứ thực sự trùng lặp 88%
   như `uiService`, và gom về nơi dùng chung — không nối `features/*` với nhau.
4. **Ratchet chỉ đi xuống.** Sau mỗi đợt phải hạ baseline, không được để tăng.
5. **Mỗi đợt một nhánh Git riêng**, commit nhỏ theo từng nhóm file, có thể revert độc lập.
