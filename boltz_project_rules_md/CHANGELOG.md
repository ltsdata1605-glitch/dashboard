# CHANGELOG.md

Tất cả thay đổi quan trọng của dự án phải được ghi tại đây.

Format:

```md
## YYYY-MM-DD — Tên thay đổi

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Removed
- ...

### Notes
- ...
```

---

## 2026-07-05 — Khởi tạo bộ rule cải tiến toàn diện

### Added

- Thêm bộ tài liệu chuẩn cho Claude và dự án.
- Thêm `CLAUDE.md` làm luật làm việc bắt buộc.
- Thêm `REQUIREMENTS.md` mô tả mục tiêu cải tiến toàn diện.
- Thêm `DESIGN.md` chuẩn hóa style UI theo Boltz Dashboard.
- Thêm `ARCHITECTURE.md` định hướng cấu trúc thư mục, module, data flow.
- Thêm `TASKS.md` chia cải tiến thành các phase rõ ràng.
- Thêm `API.md`, `DATABASE.md`, `CODE_STYLE.md`, `TESTING.md`, `SECURITY.md`, `DEPLOYMENT.md`.

### Notes

- Đây là bước nền tảng để chuyển dự án từ Vibecoding sang quy trình phát triển chuyên nghiệp.
- Claude phải audit source code thật trước khi refactor sâu.

---

## 2026-07-05 — Audit toàn diện + chốt 3 quyết định nền tảng (chưa code)

### Added

- Đọc toàn bộ 14 file `.md` trong `boltz_project_rules_md/` + đối chiếu với `RULES.md`, `AUDIT.md`, `DESIGN_SYSTEM.md`, `UI_GUIDELINES.md` (tài liệu gốc của dự án) và source code thật.
- Xác định chính xác 4 module: Root/Dashboard, bi-dashboard (Report BI), phan-ca (Phân ca), sticker-event (In Sticker) — điền vào `TASKS.md` và `REQUIREMENTS.md`.
- Đo lại số liệu thật: modal tự viết theo zone (Root 10 + `components/modals` 13 cũ, bi-dashboard 4, phan-ca 1, sticker-event 15), `<button>` thô theo zone (Root 68, bi-dashboard 30, phan-ca 11, sticker-event 26), dependency không dùng (`ws`, `level`, `react-rnd`).

### Changed

- Không thay đổi code ứng dụng trong phiên audit này (đúng yêu cầu "không code ngay").

### Notes — 3 mâu thuẫn phát hiện giữa bộ rule mới và thực trạng, đã xin ý kiến và chốt

1. **Design tokens**: Phát hiện **3 tài liệu design system mâu thuẫn nhau** đang tồn tại song song — (a) thực tế đang chạy = sky/slate/emerald/amber/rose (`styles.css`, `components/shared/ui/*`, khớp với `DESIGN_SYSTEM.md` cũ), (b) `design-system/ycx-dashboard/MASTER.md` = navy `#1E40AF` + Fira Code (tài liệu mồ côi, không ai dùng), (c) `boltz_project_rules_md/DESIGN.md` mới = navy/blue "Boltz Crypto" `#2463C7`/`#1E1D4E`.
   → **Quyết định**: GIỮ NGUYÊN bảng màu thật (sky/slate/emerald/amber/rose). Chỉ áp quy tắc cấu trúc (button variant/size, modal size scale, radius/shadow pattern) từ `DESIGN.md` mới, không đổi hex màu.
2. **Cấu trúc thư mục**: `ARCHITECTURE.md` mới đề xuất `src/app`, `src/modules/module-a..d`, `src/shared/*`. Dự án thật không có `src/`, 3/4 module đã nằm trong `features/*` (đúng tinh thần "modules/"), `components/shared/ui` đã đúng vị trí "shared/ui".
   → **Quyết định**: KHÔNG di chuyển file vào cây `src/` mới — rủi ro vỡ import quá cao so với lợi ích thuần cấu trúc.
3. **Filter/state toàn cục**: `ARCHITECTURE.md` mới đề xuất 1 `FilterState` dùng chung toàn app. Điều này ngược với `RULES.md` §2.0 hiện tại — 4 module cố ý cách ly, không dùng chung state cross-zone (bài học từ lần vibecode trước).
   → **Quyết định**: KHÔNG tạo global filter store. Chuẩn hóa filter theo cùng shape/convention trong từng zone.
4. **Vị trí tài liệu**: `TASKS.md`/`CHANGELOG.md` cập nhật tại `boltz_project_rules_md/` (giữ nguyên vị trí, không gộp lên root `RULES.md`/`AUDIT.md`/`NOTES.md`).
- Ghi nhận: `telegram-agent/`, `tasks/` (root), `design-system/ycx-dashboard/` là tooling agent/tài liệu mồ côi, **không thuộc phạm vi cải tiến app dashboard** — không động vào.
- Ghi nhận: `dashboardycx_backup.zip` (55MB) và `scratch/` đã gitignore, không bloat git — không cần xử lý.
- Ghi nhận: nhiều phase trong `TASKS.md` đã có tiến độ từ các phiên làm việc trước trong cùng session (migrate modal phan-ca sang `shared/ui`, tối ưu hiệu năng cả 4 zone) — đã cập nhật trạng thái `[x]` tương ứng.

---

## 2026-07-05 — Bước 1: Chốt 1 chuẩn Modal duy nhất

### Changed

- `components/shared/ui/Modal.tsx`: thêm `ReactDOM.createPortal(..., document.body)` — trước đây render inline trong cây component, khác với `ModalWrapper` (hệ cũ) vốn đã dùng portal. Fix khoảng cách kiến trúc này để `Modal` thực sự an toàn khi dùng trong component cha có `overflow-hidden`/`transform`.
- `components/shared/ui/Modal.tsx`: cập nhật scale `maxWidth` theo `DESIGN.md` mới — `sm`: 384px→**420px**, `md`: 448px→**560px**, `lg`: 512px→**720px**, `xl`: 576px→**960px**. Giữ nguyên `2xl`/`4xl`/`full` (không có trong scale gốc của `DESIGN.md`, dùng cho modal nhiều nội dung như bảng dữ liệu lớn).
- `components/shared/ui/ConfirmDialog.tsx`: đổi từ phụ thuộc `components/modals/ModalWrapper` (hệ cũ) sang `components/shared/ui/Modal` (chuẩn mới). Đây là fix quan trọng nhất của bước này — trước đây chính component `ConfirmDialog` trong "shared/ui" lại không dùng "shared/ui/Modal" của chính nó.
- Wire đúng prop `zIndex` của `ConfirmDialog` vào `Modal` (trước đây prop này tồn tại nhưng không được dùng — `ModalWrapper` không hỗ trợ `zIndex`).

### Notes

- **Quyết định chốt**: `components/shared/ui/Modal.tsx` là chuẩn Modal duy nhất cho toàn dự án (đúng khuyến nghị đã có sẵn ở `AUDIT.md`).
- Đo lại số liệu thật: `ModalWrapper` (hệ cũ) hiện có **26 file** đang dùng (nhiều hơn ước tính trước đó), trong đó 3 khả năng `Modal.tsx` CHƯA hỗ trợ: `controls` (slot custom trong header — `UncollectedOrdersModal.tsx`, `PerformanceModal.tsx`, `UnshippedOrdersModal.tsx`), `noRounded` (3 file), `position="bottom"` (bottom-sheet mobile — `ExportOptionsModal.tsx`).
- **Chưa migrate 26 file này** trong bước 1 — đây là phạm vi "bước 2" (migrate hàng loạt theo từng zone). Cần bổ sung 3 khả năng trên vào `Modal.tsx` trước khi bắt đầu bước 2, nếu không các modal đó sẽ mất tính năng khi migrate.
- Verify: `tsc --noEmit`, `npm run build`, `eslint`, `lint-ratchet` đều sạch. Test trình duyệt: mở modal `EditPatternModal` (phan-ca, dùng `Modal`) — xác nhận DOM portal ra gần `document.body` (không còn lồng sâu trong cây component), đóng bằng ESC hoạt động đúng, không có lỗi console mới.
- Không có thay đổi UI nhìn thấy được ngoài việc modal hơi rộng hơn 1 chút ở size sm/md/lg/xl (do áp scale mới từ `DESIGN.md`) — nằm trong phạm vi đã xin phép ở quyết định nền tảng #1.

---

## 2026-07-05 — Bước 2: Migrate hàng loạt 26 file `ModalWrapper` → `Modal`

### Changed

Migrate toàn bộ 26 consumer của `components/modals/ModalWrapper.tsx` (hệ cũ) sang `components/shared/ui/Modal.tsx` (chuẩn đã chốt ở bước 1), theo zone:

- **Root — `components/modals/`**: `UncollectedOrdersModal.tsx`, `PerformanceModal.tsx`, `UnshippedOrdersModal.tsx` (dùng `controls`), `FileHistoryModal.tsx`, `FileNamingModal.tsx`, `ChangelogModal.tsx`, `UploadConflictModal.tsx`, `UploadTypeSelectionModal.tsx`, `UnconfiguredGroupsModal.tsx` (dùng `hideHeader` + header tự dựng), `CrossSellingBuilderModal.tsx`, `GtdhTargetModal.tsx`, `EmployeeManagerModal.tsx`.
- **Root — khác**: `components/layout/Header.tsx`, `components/kpis/modals/KpiCardConfigModal.tsx`, `components/common/ExportOptionsModal.tsx` (dùng `position="bottom"` + `noRounded`), `components/summary/WarehouseSettingsModal.tsx`, `components/summary/WarehouseSummary.tsx`.
- **Root — `components/employees/`**: `HeadToHeadTab.tsx`, `EmployeeAnalysisModals.tsx` (4 modal xác nhận xóa gộp thành `ConfirmDialog` thay vì tự viết riêng), `modals/StructureModals.tsx` (`TabModal`, `TableModal`), `head-to-head/HeadToHeadConfigModal.tsx`, `modals/ColumnConfigModal.tsx`, `modals/CustomExploitationTabModal.tsx`.
- **bi-dashboard**: `features/bi-dashboard/components/nhanvien/revenue/ImportPrevMonthModal.tsx`, `ColorSettingsModal.tsx`.

### Removed

- `components/modals/ModalWrapper.tsx` — xóa hẳn sau khi grep xác nhận không còn file nào import (chỉ còn 2 dòng comment nhắc tên "ModalWrapper" trong `Modal.tsx` để giải thích lịch sử, không phải import thật).

### Notes

- Pattern migrate áp dụng nhất quán cho cả 26 file: `maxWidthClass="max-w-*"` → `maxWidth="sm|md|lg|xl|2xl|4xl"` (map theo giá trị px gần nhất); nội dung footer tách ra truyền qua prop `footer` của `Modal` (trước đây nằm chung trong `<form>`/children của `ModalWrapper`); do `footer` của `Modal` render như phần tử con trực tiếp của portal (không còn lồng trong `<form>` như cấu trúc cũ), các nút submit trong footer đổi từ `type="submit"` sang `type="button" onClick={handleSubmit}` — đã verify bằng `tsc --noEmit` là không phát sinh lỗi type; các modal có `if (!isOpen) return null` ở đầu component đã được bỏ (trừ 1 trường hợp `UploadConflictModal.tsx` giữ nguyên vì guard đó gộp chung với điều kiện dữ liệu khác `conflicts.length === 0`, tách ra rủi ro hơn lợi ích) để `AnimatePresence` của `Modal` chạy được animation exit thay vì bị unmount đột ngột; những modal có header/vùng cuộn tự tùy biến dùng thủ thuật `-m-5` để huỷ padding `p-5` mặc định của `Modal`, tránh double-padding.
- `components/employees/EmployeeAnalysisModals.tsx`: phát hiện 4 modal xác nhận xóa gần giống hệt nhau (xóa tab/bảng/cột/thẻ tùy chỉnh) đang tự viết riêng trên `ModalWrapper` — gộp thành `ConfirmDialog` có sẵn trong `shared/ui` thay vì migrate riêng lẻ (giảm trùng lặp, đúng tinh thần "không tạo thêm component trùng lặp" trong yêu cầu ban đầu).
- `components/modals/CrossSellingBuilderModal.tsx`: phát hiện và xóa 1 header block chết (`hidden`, có comment "Header Custom - Hidden as we use ModalWrapper props now") + 1 lớp modal-shell lồng thừa — dọn cùng lúc vì đã động vào file này.
- Verify: `tsc --noEmit` sạch; `npm run build` thành công (không lỗi, chunk size không đổi bất thường); `eslint` trên toàn bộ file đã sửa không phát sinh lỗi mới (chỉ còn warning `no-restricted-syntax` cho `<button>` thô đã tồn tại từ trước, ngoài phạm vi task này); `npm run lint:ratchet` → OK, không có vi phạm mới (baseline giảm nhẹ vì xóa `ModalWrapper.tsx` loại bỏ luôn các vi phạm đã ghi nhận trong file đó).
- **Giới hạn đã biết**: không test click-through bằng trình duyệt được cho các modal ở `components/employees/*` (`HeadToHeadConfigModal`, `ColumnConfigModal`, `StructureModals`, `CustomExploitationTabModal`) vì các màn hình đó chỉ hiện ra sau khi upload file Excel dữ liệu thật (không có sẵn file mẫu phù hợp schema trong repo để tự động hóa). Đã spot-check `Modal.tsx` (cùng component engine mà các modal này dùng) qua 2 modal khác reach được không cần upload data (popup "Thông báo", modal "Cài đặt cấu hình") — mở/đóng đúng, không lỗi console. Khuyến nghị: người dùng tự tay mở thử các modal trên trong luồng thật (sau khi upload 1 file YCX) trước khi coi bước 2 là verify đầy đủ 100%.

---

## 2026-07-05 — Bước 3: Dọn dependency/script thừa + đo lại số liệu thật + thí điểm migrate `<button>`

### Removed

- Gỡ 3 dependency không dùng ở bất kỳ đâu trong source (`npm uninstall ws level react-rnd`, xác nhận bằng grep import trước khi gỡ) — giảm 23 package trong `node_modules`.
- Xóa 18 file `fix_*.cjs` ở root (`git rm`) — script one-off dùng `fs.readFileSync`/`.replace()`/`fs.writeFileSync` để patch code 1 lần trong giai đoạn Vibecoding trước đây (VD: `fix_bg_sync.cjs` patch `hooks/useDataManagement.ts`, `fix_type.cjs` patch `features/bi-dashboard/hooks/useNhanVienData.ts`). Đã xác nhận: không gọi từ `package.json`, không có trong bất kỳ workflow/script nào khác, nội dung patch đã nằm sẵn trong code hiện tại (chạy 1 lần rồi bỏ quên).

### Changed — migrate 11 `<button>` thô sang `Button` (phan-ca, nhóm rủi ro thấp)

7 file: `Legend.tsx` (3 nút KHO/TN/GH), `HelpModal.tsx` (nút đóng), `DailyStatsTable.tsx` (nút "ca cần xử lý"), `Controls.tsx` (nút "Tạo Lịch"), `EditRulesModal.tsx` (2 nút: gender pill + xóa cấu hình ca), `ImportStaffModal.tsx` (2 nút NAM/NỮ), `ScheduleTable.tsx` (nút xóa nhân viên).

Pattern áp dụng: mỗi nút được chuyển sang `<Button variant="ghost" className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 <class gốc>">` — do `Button` dùng `tailwind-merge` (`cn()`), class truyền vào `className` luôn nằm SAU CÙNG trong chuỗi merge nên class gốc của nút (màu, viền, bo góc, chiều cao/padding nếu có) sẽ tự động thắng các class mặc định của `variant`/`size` trong `Button`; phần reset (`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0`) chỉ có tác dụng cho những thuộc tính mà class gốc KHÔNG tự khai báo (ví dụ nút chỉ có `p-1` không khai `h-*` → nếu không reset, `Button` sẽ ép chiều cao cố định `h-9`/`h-8` từ `size`, làm nút to hơn nút gốc). Đây là cách migrate "không đổi UI" an toàn cho nút đã có đủ class tùy biến riêng.

### Notes

- **Đo lại số liệu thật bằng `eslint` cho toàn bộ 4 zone** (số cũ trong `TASKS.md`/audit trước đây SAI, chỉ đếm 1 phần): Root **252** (cũ ghi 68), bi-dashboard **144** (cũ ghi 30), phan-ca **64** (cũ ghi 11), sticker-event **117** (cũ ghi 26) → **tổng 577 `<button>` thô toàn app**, không phải ~135 như tưởng trước đó.
- **Quyết định quan trọng**: KHÔNG migrate hàng loạt 577 nút này bằng cách sửa tự động/không kiểm chứng. Lý do: mỗi nút có class tùy biến riêng (kích thước, bo góc, hover, màu) — nếu ép qua `Button` mà không xử lý đúng thứ tự merge class như trên, rất dễ vô tình đổi kích thước/bo góc/hover ngoài ý muốn, vi phạm trực tiếp yêu cầu "không đổi UI ngoài DESIGN.md" và "không phá tính năng đang hoạt động" của chủ dự án. 11 nút vừa migrate là bộ thí điểm rủi ro thấp (đã kiểm từng nút bằng tay) để xác nhận pattern an toàn trước khi làm tiếp — phần còn lại (566 nút, gồm cả `EditShiftModal.tsx` ~30 nút trong lưới lịch phức tạp) nên làm dần theo từng file, có kiểm tra riêng, không dồn vào 1 lượt.
- Verify: `tsc --noEmit` sạch; `eslint` trên 7 file đã sửa → 0 lỗi/warning (kể cả warning `no-restricted-syntax` cho `<button>` thô đã biến mất đúng như kỳ vọng); `npm run build` thành công.
- Test trình duyệt (Playwright, chế độ "Dùng Thử"): mở trực tiếp `Công cụ > Phân ca` (module này KHÔNG bị chặn bởi màn hình upload Excel như `Phân tích`, vào được ngay) — xác nhận `Legend`/`DailyStatsTable`/`Controls` (bảng thống kê, nút "Tạo Lịch") hiển thị đúng, không lệch layout, không đổi kích thước/bo góc. Riêng `HelpModal.tsx`: phát hiện component này được `import` trong `PhanCaView.tsx` nhưng **không hề được render/gọi ở đâu cả** (dead import từ trước, không liên quan thay đổi lần này) — không test click-through được vì không có đường vào UI; đã xác nhận đúng bằng logic merge class thay vì trực quan. `EditRulesModal.tsx`/`ImportStaffModal.tsx` cần dữ liệu nhân viên thật (upload Excel) để mở được — không test click-through được, chỉ xác nhận bằng logic + eslint + typecheck.
- Trong lúc cài lại Playwright tạm thời để test (gói này không nằm trong `package.json`, chỉ tồn tại "trôi nổi" trong `node_modules` từ phiên trước), phát hiện lệnh `npm uninstall` đã dọn luôn gói này (vì nó "extraneous" — không được khai báo). Đã cài lại bằng `npm install --no-save playwright` chỉ để test, không ghi vào `package.json`/lock file (đã kiểm tra `git diff` xác nhận).

### Tiếp tục Bước 4 (cùng ngày) — thêm ~26 nút nữa (tổng 84/577)

- Migrate thêm nhiều file rủi ro thấp ở cả 4 zone: `components/common/` (ErrorBoundary, FilterChip, SearchableSelect, DebugPanel, MultiSelectDropdown, SingleSelectDropdown), `components/views/` (SettingsView, CouponConverterView, CheckThuongView, LoginView + `settings/` BaseDataSection, CloudSyncSection, DangerZoneSection, SettingsAccountTab), `components/tables/` (MonthlyTrendTableRow, SummaryTableComparisonBar), `components/layout/` (Footer, FontSelector), `components/employees/` (EmployeeAnalysisFilters, column-config/TargetColumnForm, performance/PerformanceSingleTable), `components/upload/FileHistoryManager.tsx`, `components/charts/SavedCalendarCard.tsx`, `components/modals/ChangelogModal.tsx` + `FileNamingModal.tsx`; toàn bộ `features/bi-dashboard/` còn lại (BiWrapper, ExportButton, Slider, Dashboard, Settings, revenue/RevenueDesktopRow+RevenueMobileCard, shared/AvatarDisplay+SharedModal, dashboard/SummaryTableView, revenue/ImportPrevMonthModal — 2 nút footer sót lại từ lần migrate Modal trước); toàn bộ `features/sticker-event/` nhóm 1-2 nút (AlertModal, ErrorBoundary, SearchBar, ChangePasswordModal, ConfirmModal, FilterModal, LayoutSelectionModal, Login, PdfPreviewModal, SaveListModal, UserGuideModal).
- **2 file nền tảng rủi ro cao đã làm cẩn thận**: `components/shared/ui/Input.tsx` (nút icon trái/phải) và `components/shared/ui/Dropdown.tsx` (nút item danh sách + `DropdownButton`) — đây là component gốc được hàng chục màn hình khác dùng lại, nên sau khi sửa đã bật lại Playwright để test trực quan qua "Cài đặt cấu hình" và "Phân ca": không lỗi console, không lệch UI.
- Phát hiện thêm 1 pattern cần xử lý riêng: nút chứa **nhiều children xếp dọc** (VD: `LayoutSelectionModal.tsx`'s `LayoutOptionButton` có 2 thẻ `<p>` xếp chồng) — nếu không bọc lại trong 1 `<div>` bao ngoài, `Button`'s `inline-flex` mặc định sẽ xếp chúng THEO HÀNG NGANG thay vì xếp chồng dọc như cũ. Đã sửa bằng cách bọc children gốc trong `<div>` trước khi đưa vào `Button`. Cũng phát hiện pattern nút có **nhiều children ngang cần giữ căn trái** (VD: `MultiSelectDropdown`/`SingleSelectDropdown`/`FontSelector` item list, `EditRulesModal`'s GenderPill) — thêm `justify-start` vào class ghi đè `justify-center` mặc định của `Button`, vì các nút này set `w-full text-left` nhưng có nhiều children (checkbox + label) nên mặc định `justify-center` của `Button` sẽ dồn chúng vào giữa thay vì bám lề trái.
- Phát hiện phụ (ngoài phạm vi buttons): `violations-baseline.json` thiếu entry cho `components/modals/AdminAnnouncementModal.tsx` (file được thêm sau, chưa từng quét vào baseline) khiến `lint:ratchet` báo "vi phạm mới" dù file này KHÔNG hề bị đụng tới trong session — đã xác nhận bằng `git diff` (rỗng) rồi bổ sung baseline đúng giá trị thật hiện tại (`missingDarkVariant: 2`) để ratchet phản ánh đúng, không sửa nội dung file.
- Verify: `tsc --noEmit` sạch toàn repo; `npm run build` thành công nhiều lần trong lúc làm; `eslint` trên từng file/batch đã sửa → 0 lỗi; `npm run lint:ratchet` → OK.
- **Chưa xong**: còn ~493 nút, tập trung nhiều nhất ở `EditShiftModal.tsx` (28), `CompetitionTab.tsx` (21), `PhanCaView.tsx` (17), `ControlPanel.tsx` (16) — các file lưới/calendar phức tạp, cố tình để lại làm sau với sự tập trung riêng thay vì vội vàng trong lúc đang xử lý hàng loạt file nhỏ.
