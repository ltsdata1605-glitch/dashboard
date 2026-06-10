# PLAN KIỂM TRA – NÂNG CẤP – TỐI ƯU DỰ ÁN DASHBOARDYCX

Ngày kiểm tra: 10/06/2026  
File kiểm tra: `backup_dashboardycx_20260610.zip`

---

## 1. Kết luận nhanh

Dự án hiện đã chạy được và build production thành công, nhưng đang có dấu hiệu rõ của giai đoạn “vibe coding / phát triển theo ngẫu hứng”:

- Có nhiều module lớn đang trộn UI + logic + xử lý file + lưu DB trong cùng một file.
- Nhiều file quá lớn, khó kiểm soát lỗi khi thêm/xoá tính năng.
- Bundle production có một số chunk rất lớn, dễ làm mobile tải chậm, lag, nóng máy.
- Có nhiều nơi xử lý Excel, ảnh, export, html2canvas, IndexedDB/Firebase; đây là nhóm dễ gây treo UI nếu chạy trên main thread.
- Có file `.env` trong source zip, cần đưa ra khỏi backup/code để tránh lộ token/key.
- TypeScript hiện chưa báo lỗi, build OK, nhưng vẫn có cảnh báo chunk và dependency audit có lỗ hổng.

Điểm tốt: dự án đã có bước cải thiện ban đầu như lazy load tab, ErrorBoundary, shared UI Button/Modal/ConfirmDialog/EmptyState, worker xử lý Excel, một số rule/design docs. Vì vậy không cần viết lại từ đầu; nên nâng cấp theo từng lớp, không đập đi làm lại.

---

## 2. Kết quả kiểm tra kỹ thuật

### 2.1. Công nghệ chính

- React 19 + Vite + TypeScript.
- Tailwind CSS v4.
- Firebase/Auth/Firestore/Storage.
- XLSX, PapaParse, html2canvas, html-to-image, jsPDF.
- Recharts, motion, lucide-react.
- Có thêm module `telegram-agent` dùng Node.js để điều khiển Antigravity qua Telegram.

### 2.2. Quy mô source

- Khoảng 318 file source `.ts/.tsx/.js/.css`.
- Khoảng 74.651 dòng source, chưa tính `node_modules` và `dist`.
- Một số file lớn nhất:
  - `features/sticker-event/StickerEventApp.tsx`: ~1.870 dòng.
  - `features/phan-ca/PhanCaView.tsx`: ~1.671 dòng.
  - `telegram-agent/bot.js`: ~1.503 dòng.
  - `features/sticker-event/services/printService.ts`: ~1.457 dòng.
  - `features/sticker-event/StickerPrinterView.tsx`: ~1.432 dòng.
  - `services/dbService.ts`: ~1.057 dòng.
  - `features/phan-ca/utils/scheduleUtils.ts`: ~1.050 dòng.
  - `services/uiService.ts`: ~866 dòng.

### 2.3. Build/type check

- `npm ci --ignore-scripts`: cài dependency thành công.
- `npm run lint`: TypeScript check thành công.
- `npm run build`: build production thành công.

Cảnh báo build đáng chú ý:

- Một số module vừa static import vừa dynamic import nên dynamic import không tách chunk như mong muốn:
  - `services/firestoreService.ts`
  - `react-hot-toast`
  - `services/notificationService.ts`
  - `hooks/useFilterState.ts`

Chunk production lớn:

- `StickerEventApp`: ~1.16 MB, gzip ~339 KB.
- `DashboardView`: ~1.00 MB, gzip ~280 KB.
- `vendor-ui`: ~1.00 MB, gzip ~201 KB.
- `vendor-firebase`: ~618 KB, gzip ~146 KB.
- `vendor-excel`: ~425 KB, gzip ~142 KB.
- `vendor-charts`: ~396 KB, gzip ~116 KB.
- CSS chính: ~316 KB, gzip ~40 KB.

### 2.4. Dependency audit

`npm audit` báo 6 vấn đề:

- 1 critical: liên quan `protobufjs`.
- 3 high: gồm `vite`, `picomatch`, `xlsx`.
- 2 moderate: gồm `postcss`, `@protobufjs/utf8`.

Đáng chú ý: `xlsx` có lỗ hổng high và npm báo không có fix tự động. Nếu dự án có import Excel từ người dùng, cần kiểm soát file đầu vào và cân nhắc thay thế hoặc cô lập xử lý.

### 2.5. Circular dependency

Phát hiện 2 vòng import:

1. `hooks/useExportLogic.ts` → `components/modals/PerformanceModal.tsx` → `contexts/DashboardContext.tsx` → `hooks/useExportLogic.ts`
2. `components/employees/EmployeeAnalysis.tsx` → `components/employees/EmployeeAnalysisModals.tsx` → `components/employees/modals/StructureModals.tsx` → `components/employees/EmployeeAnalysis.tsx`

Vòng import có thể chưa làm app crash, nhưng về lâu dài dễ gây lỗi khó đoán, đặc biệt khi tách lazy load/chunk.

### 2.6. File nhạy cảm

Trong zip có:

- `.env.local`
- `telegram-agent/.env`

Không nên để các file này trong backup chia sẻ hoặc git. Cần đổi token/key nếu file từng được gửi ra ngoài.

---

## 3. Những nhóm rủi ro gây lag, nóng máy, hao pin

### Nhóm 1: Component quá lớn

Các file trên 700–1.800 dòng thường chứa nhiều state, nhiều useEffect, nhiều handler, nhiều UI. Khi sửa một chức năng nhỏ có thể làm ảnh hưởng cả module.

Ưu tiên xử lý:

1. `StickerEventApp.tsx`
2. `PhanCaView.tsx`
3. `StickerPrinterView.tsx`
4. `DashboardView.tsx`
5. `NhanVien.tsx`
6. `IndustryView.tsx`
7. `TrendChart.tsx`
8. `WarehouseSummary.tsx`

Cách xử lý: tách mỗi file theo cấu trúc:

```txt
FeatureView.tsx              # chỉ điều phối layout chính
feature.types.ts             # type riêng của feature
feature.constants.ts         # cấu hình tĩnh
hooks/useFeatureState.ts     # state UI
hooks/useFeatureData.ts      # load/save data
hooks/useFeatureActions.ts   # action nghiệp vụ
components/                  # UI con
services/                    # xử lý dữ liệu nặng
```

### Nhóm 2: Xử lý nặng trên main thread

Các nhóm dễ làm mobile lag:

- Đọc/parse Excel bằng `xlsx`.
- Xuất ảnh bằng `html2canvas` hoặc `html-to-image`.
- Xuất PDF bằng `jsPDF`.
- Render chart/table rất nhiều dòng.
- Tính toán KPI nhiều lần khi filter thay đổi.
- Lưu/đọc IndexedDB nhiều lần trong component.

Cách xử lý:

- Chuyển parse Excel nặng sang Web Worker.
- Debounce filter/search 200–300ms.
- Với bảng nhiều dòng, dùng pagination hoặc virtual list.
- Memo hóa dữ liệu đã tính, không tính lại khi state UI nhỏ thay đổi.
- Export ảnh/PDF phải có queue, không chạy hàng loạt cùng lúc.

### Nhóm 3: Bundle lớn

Hiện app có nhiều chunk lớn. Trên mobile, tải chunk lớn + parse JS lớn là nguyên nhân nóng máy và mở app chậm.

Cách xử lý:

- Tách route/module rõ hơn.
- Không import Firebase/XLSX/Recharts/html2canvas ở module chưa dùng.
- Với tính năng export, chỉ import động khi bấm xuất.
- Tách `lucide-react` hoặc kiểm tra import icon để tránh kéo quá nhiều icon.
- Không để module vừa static import vừa dynamic import.

### Nhóm 4: State và DB phân tán

Dự án đang có nhiều nơi tự đọc/ghi local DB/Firebase/IndexedDB. Khi thêm tính năng dễ sinh xung đột.

Cách xử lý:

- Chọn 1 mô hình state chính:
  - UI state: trong component/hook.
  - Domain state: store trung tâm.
  - Persistent state: service lưu DB có debounce.
  - Server state: service Firebase riêng.
- Không để component UI gọi DB trực tiếp trừ wrapper cấp cao.

### Nhóm 5: Rule phát triển chưa đủ chặt

Dù đã có `RULES.md`, `DESIGN_SYSTEM.md`, `AGENT_RULES.md`, dự án vẫn cần thêm rule bắt buộc khi Antigravity sửa code:

- Không sửa UI/logic ngoài phạm vi task.
- Mỗi task phải có plan trước, diff sau.
- Không thêm dependency khi chưa giải thích lý do.
- Không thêm setInterval/setTimeout nếu chưa có cleanup.
- Không import thư viện nặng ở top-level nếu chỉ dùng khi bấm nút.
- Không tạo file >500 dòng nếu không có lý do đặc biệt.

---

## 4. Kiến trúc mục tiêu đề xuất

Không cần viết lại toàn bộ. Chỉ cần đưa dần về kiến trúc này:

```txt
src/
  app/
    App.tsx
    providers/
    routes/

  shared/
    ui/
      Button.tsx
      Modal.tsx
      ConfirmDialog.tsx
      Input.tsx
      Select.tsx
      Table.tsx
      EmptyState.tsx
      Skeleton.tsx
    hooks/
    utils/
    constants/

  services/
    db/
    firebase/
    export/
    parser/
    worker/
    notification/

  features/
    dashboard/
      components/
      hooks/
      services/
      types.ts
      index.tsx

    bi-dashboard/
      components/
      hooks/
      services/
      types.ts
      index.tsx

    sticker-event/
      components/
      hooks/
      services/
      types.ts
      index.tsx

    phan-ca/
      components/
      hooks/
      services/
      types.ts
      index.tsx

    check-thuong/
      components/
      hooks/
      services/
      types.ts
      index.tsx

  workers/
    excelWorker.ts
    exportWorker.ts
```

Nguyên tắc: `components` chỉ hiển thị UI; `hooks` điều phối state; `services` xử lý nghiệp vụ/data; `workers` xử lý nặng.

---

## 5. Workflow chuẩn khi thêm/xoá/sửa tính năng

### Bước 1: Viết yêu cầu theo mẫu

```txt
Tên tính năng:
Mục tiêu:
Module ảnh hưởng:
Không được thay đổi:
Dữ liệu đầu vào:
Dữ liệu đầu ra:
Luồng người dùng:
Trường hợp lỗi:
Tiêu chí hoàn thành:
```

### Bước 2: Antigravity chỉ được phân tích trước

Không cho sửa ngay. Bắt buộc trả về:

```txt
1. File sẽ đọc
2. File sẽ sửa
3. Chức năng liên quan
4. Rủi ro có thể phát sinh
5. Cách test sau khi sửa
6. Kế hoạch rollback nếu lỗi
```

### Bước 3: Sửa nhỏ theo từng commit/task

Không làm kiểu “tối ưu toàn bộ app” trong một lần. Chia nhỏ:

- Task 1: tách component.
- Task 2: tách logic.
- Task 3: thêm test/check.
- Task 4: tối ưu hiệu năng.
- Task 5: cleanup import/dependency.

### Bước 4: Kiểm tra bắt buộc

Sau mỗi task chạy:

```bash
npm run lint
npm run build
npm audit
```

Nếu sửa hiệu năng, cần thêm checklist thủ công trên mobile:

- Mở app lần đầu.
- Chuyển tab 5 lần.
- Import file lớn.
- Lọc dữ liệu liên tục.
- Xuất ảnh/PDF.
- Để app mở 10 phút kiểm tra nóng máy.

---

## 6. Roadmap nâng cấp chi tiết

## Phase 0 – Đóng băng & bảo vệ dự án

Mục tiêu: tránh sửa lan man trước khi refactor.

Việc cần làm:

1. Tạo nhánh backup/refactor riêng.
2. Xoá `.env` khỏi source/zip/git.
3. Thêm `.env*` vào `.gitignore` nếu chưa đủ.
4. Đổi token/key nếu đã từng chia sẻ file zip.
5. Ghi lại danh sách chức năng hiện có.
6. Tạo checklist test thủ công cho từng module.

Kết quả cần đạt:

- Có bản backup sạch.
- Có danh sách module/chức năng.
- Có quy định không sửa ngoài phạm vi.

---

## Phase 1 – Kiểm kê toàn bộ module

Mục tiêu: biết dự án có gì trước khi sửa.

Tạo bảng inventory:

```txt
Module | File chính | Data dùng | DB/API dùng | Chức năng | Rủi ro | Người dùng chính
```

Module cần lập danh sách:

1. DashboardView / phân tích doanh thu.
2. BI Dashboard / Report BI.
3. Nhân viên / cá nhân / thi đua.
4. Sticker Event.
5. Sticker Printer.
6. Phân Ca.
7. Check Thưởng.
8. User Management / phân quyền.
9. Settings.
10. Telegram Agent.

Kết quả cần đạt:

- Có bản đồ chức năng.
- Biết file nào là “source of truth”.
- Biết file nào trùng logic.

---

## Phase 2 – Sửa lỗi nền tảng trước

Mục tiêu: app ổn định trước khi tối ưu.

Việc cần làm:

1. Xử lý 2 circular dependency.
2. Sửa cảnh báo dynamic/static import trong Vite.
3. Cập nhật dependency có fix tự động.
4. Riêng `xlsx`, không nâng/xoá vội; cần đánh giá thay thế hoặc cô lập.
5. Xoá file build/dist cũ khỏi source nếu không cần.
6. Xoá file `.bak`, `old_check_thuong.txt`, `scratch` khỏi production hoặc chuyển vào `/archive`.

Kết quả cần đạt:

- `npm run lint` OK.
- `npm run build` OK.
- Không còn circular dependency.
- Cảnh báo chunk giảm.

---

## Phase 3 – Tối ưu mobile/battery

Mục tiêu: giảm nóng máy, hao pin, lag.

Việc cần làm theo ưu tiên:

1. Tách import nặng:
   - `xlsx`
   - `html2canvas`
   - `html-to-image`
   - `jspdf`
   - Firebase service không dùng ngay

2. Chuyển xử lý nặng sang worker:
   - Parse Excel.
   - Chuẩn hoá dữ liệu lớn.
   - Tính KPI lớn.

3. Giảm render:
   - Tách bảng lớn thành component memo.
   - Dùng `React.memo` đúng chỗ.
   - `useMemo` cho data đã filter/sort.
   - Không tạo object/array/function lớn trong render.

4. Giảm DOM:
   - Table nhiều dòng dùng pagination/virtualization.
   - Không render tab ẩn nếu tab đó không cần giữ trạng thái.
   - Với tab giữ trạng thái, pause timer/listener khi inactive.

5. Giảm animation:
   - Không dùng animation liên tục ở bảng/dashboard.
   - Tôn trọng `prefers-reduced-motion`.
   - Tránh blur/shadow quá nặng trên mobile.

Kết quả cần đạt:

- Mở app nhanh hơn.
- Chuyển tab mượt hơn.
- Import/export không làm đứng UI.
- Bundle chính nhỏ hơn.

---

## Phase 4 – Tách God Component

Mục tiêu: dễ sửa tính năng mà không gây lỗi dây chuyền.

Thứ tự tách:

1. `StickerEventApp.tsx`
2. `PhanCaView.tsx`
3. `StickerPrinterView.tsx`
4. `DashboardView.tsx`
5. `NhanVien.tsx`
6. `IndustryView.tsx`
7. `TrendChart.tsx`
8. `WarehouseSummary.tsx`

Mẫu tách mỗi module:

```txt
index.tsx
components/Header.tsx
components/Toolbar.tsx
components/DataTable.tsx
components/Modals.tsx
hooks/useXxxData.ts
hooks/useXxxActions.ts
services/xxxParser.ts
services/xxxExport.ts
types.ts
constants.ts
```

Rule bắt buộc:

- File UI chính tối đa 300–500 dòng.
- Hook tối đa 300 dòng.
- Service có thể dài hơn nhưng phải có function rõ ràng.
- Mỗi function nên có 1 nhiệm vụ.

---

## Phase 5 – Chuẩn hoá Design System

Mục tiêu: hết tình trạng mỗi màn một kiểu.

Việc cần làm:

1. Dùng thống nhất `components/shared/ui` hoặc chuyển thành `shared/ui`.
2. Bổ sung component còn thiếu:
   - `Input`
   - `Textarea`
   - `Checkbox`
   - `Switch`
   - `Table`
   - `Tabs`
   - `Badge`
   - `Skeleton`
   - `Toast wrapper`
3. Xoá dần inline class trùng lặp.
4. Không dùng `alert/confirm`; dùng `ConfirmDialog`/toast.
5. Viết rule màu, font, padding, modal, table.

Kết quả cần đạt:

- UI đồng bộ.
- Sửa màu/font một chỗ áp dụng toàn app.
- Màn hình mobile ít lệch bố cục hơn.

---

## Phase 6 – Chuẩn hoá data/service/store

Mục tiêu: logic không bị rải rác.

Việc cần làm:

1. Gom parser:
   - Excel parser.
   - TSV/parser doanh thu.
   - Parser nhân viên.
   - Parser kho/hàng/chỉ tiêu.

2. Gom service:
   - `firebaseService`
   - `dbService`
   - `exportService`
   - `notificationService`
   - `permissionService`

3. State rule:
   - UI state để local.
   - Data dùng nhiều màn đưa vào store/hook chung.
   - DB write phải debounce.
   - Không cho component con tự ghi DB lung tung.

Kết quả cần đạt:

- Một luật tính KPI chỉ nằm ở một nơi.
- Một logic parse data chỉ nằm ở một nơi.
- Thêm tính năng ít gây xung đột.

---

## Phase 7 – Test & kiểm soát chất lượng

Mục tiêu: sau này thêm/xoá tính năng không sợ hư app.

Việc cần làm:

1. Thêm script:

```json
{
  "typecheck": "tsc --noEmit",
  "build": "vite build",
  "audit": "npm audit",
  "check": "npm run typecheck && npm run build"
}
```

2. Thêm test tối thiểu cho:
   - Parser Excel.
   - Tính KPI.
   - Filter dữ liệu.
   - Permission user.
   - Export logic.

3. Tạo checklist test thủ công:
   - Login.
   - Dashboard.
   - BI.
   - Nhân viên.
   - Phân ca.
   - Sticker.
   - Check thưởng.
   - Settings.

4. Sau mỗi lần Antigravity sửa:
   - Chụp diff.
   - Ghi file đã sửa.
   - Ghi cách test.
   - Không tự ý sửa module ngoài task.

---

## 7. Rule bắt buộc cho Antigravity

Dán nội dung này vào rule/project instruction:

```txt
Bạn là Senior React/Vite/TypeScript Performance Engineer.
Nhiệm vụ chính: nâng cấp dự án hiện có, không viết lại từ đầu, không thay đổi giao diện hoặc chức năng nếu chưa được yêu cầu.

QUY TẮC BẮT BUỘC:
1. Trước khi sửa code phải phân tích file liên quan và trình bày plan.
2. Không sửa ngoài phạm vi task.
3. Không đổi UI/UX nếu task là tối ưu logic/performance.
4. Không thêm dependency mới nếu chưa giải thích rõ lý do.
5. Không import thư viện nặng ở top-level nếu chỉ dùng khi người dùng bấm nút.
6. Không tạo thêm component/file quá 500 dòng; nếu vượt phải tách nhỏ.
7. Không dùng window.alert/confirm/prompt; dùng shared UI dialog/toast.
8. Không dùng setInterval/setTimeout nếu không có cleanup rõ ràng.
9. Mọi listener addEventListener phải có removeEventListener.
10. Mọi xử lý Excel/export ảnh/PDF nặng phải cân nhắc dynamic import hoặc Web Worker.
11. Sau khi sửa phải chạy typecheck/build và báo kết quả.
12. Luôn giữ khả năng rollback.

KHI TỐI ƯU MOBILE:
- Ưu tiên giảm bundle, giảm render, giảm tính toán trên main thread.
- Không dùng animation liên tục nếu không cần.
- Không render bảng quá lớn cùng lúc.
- Debounce search/filter.
- Memo hóa dữ liệu đã tính.
```

---

## 8. Prompt mẫu để giao Antigravity kiểm tra từng module

### Prompt 1 – Kiểm tra tổng quan không sửa code

```txt
Hãy kiểm tra toàn bộ dự án theo vai trò Principal React/Vite/TypeScript Performance Engineer.
Không sửa code.

Mục tiêu:
1. Lập bản đồ toàn bộ module/chức năng.
2. Tìm file quá lớn, logic bị trộn, duplicate code.
3. Tìm điểm có thể gây lag/nóng máy/hao pin trên mobile.
4. Tìm nơi xử lý nặng trên main thread: Excel, export ảnh/PDF, chart, table lớn, IndexedDB, Firebase listener.
5. Tìm circular dependency, import nặng, dynamic import sai cách.
6. Đề xuất roadmap refactor không đổi UI và không đổi chức năng.

Kết quả trả về theo bảng:
Module | File liên quan | Vấn đề | Mức độ | Rủi ro | Cách sửa | Cách test
```

### Prompt 2 – Tối ưu mobile không đổi giao diện

```txt
Hãy kiểm tra dự án theo hướng tối ưu mobile, không đổi giao diện, không đổi chức năng.

Tập trung tìm:
- Component render quá nhiều.
- Table/chart quá nặng.
- useEffect chạy lặp không cần thiết.
- setInterval/setTimeout/listener thiếu cleanup.
- xử lý Excel/export ảnh/PDF trên main thread.
- import thư viện nặng ở top-level.
- bundle/chunk quá lớn.

Trước tiên chỉ báo cáo danh sách vấn đề và đề xuất cách xử lý.
Không sửa code cho đến khi tôi approve.
```

### Prompt 3 – Tách God Component an toàn

```txt
Hãy refactor file [TÊN_FILE] theo hướng tách nhỏ nhưng không đổi UI và không đổi chức năng.

Yêu cầu:
1. Đọc kỹ file và liệt kê các phần: state, derived data, handler, UI section, modal, service call.
2. Đề xuất cấu trúc file mới.
3. Chỉ tách từng bước nhỏ, mỗi bước build được.
4. Không đổi tên biến public nếu có thể làm gãy import.
5. Sau khi tách, chạy typecheck/build.
6. Báo lại file đã sửa và cách test thủ công.

Chưa được sửa code cho đến khi tôi approve plan.
```

### Prompt 4 – Kiểm tra trước khi thêm tính năng mới

```txt
Tôi muốn thêm tính năng: [MÔ TẢ].

Trước khi code, hãy kiểm tra dự án và trả lời:
1. Tính năng này thuộc module nào?
2. Những file nào cần đọc?
3. Những file nào có thể phải sửa?
4. Có logic sẵn nào tái sử dụng được không?
5. Có rủi ro xung đột với chức năng hiện tại không?
6. Cách triển khai ít ảnh hưởng nhất là gì?
7. Cách test sau khi làm xong?

Không sửa code trước khi tôi approve.
```

---

## 9. Thứ tự ưu tiên khuyến nghị

Nếu chỉ có thời gian làm từng phần, hãy làm theo thứ tự này:

1. Bảo mật `.env` và token.
2. Sửa circular dependency.
3. Giảm bundle/import nặng.
4. Tách xử lý Excel/export ra dynamic import/worker.
5. Tách `StickerEventApp.tsx` và `PhanCaView.tsx`.
6. Chuẩn hoá shared UI.
7. Chuẩn hoá DB/service/parser.
8. Thêm test/checklist.

---

## 10. Tiêu chí hoàn thành cuối cùng

Dự án được xem là ổn khi đạt các tiêu chí:

- `npm run lint` OK.
- `npm run build` OK.
- Không còn circular dependency.
- Không còn file UI chính trên 800 dòng.
- Chunk chính giảm rõ rệt.
- Import Excel/export chỉ load khi dùng.
- Không còn `.env` trong source/backup.
- Không còn alert/confirm native trong source chính.
- Mỗi module có README ngắn: chức năng, data, file chính, cách test.
- Thêm/xoá tính năng có workflow rõ ràng, không còn sửa theo ngẫu hứng.
