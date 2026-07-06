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

### Tiếp tục Bước 4 (cùng ngày) — hoàn tất nhóm file 6-10 nút (tổng 391/577)

- Migrate hết các file còn lại có 6-8 nút/file ở cả 4 zone: `IndustryView.tsx`, `IndustryGrid.tsx`, `KpiCardConfigModal.tsx`, `PendingApprovalView.tsx`, `UserManagementView.tsx`, `BonusTab.tsx`, `CompetitionCompareView.tsx` (nhóm 6-7 nút); `CompetitionGroupView.tsx`, `CompetitionSummaryView.tsx`, `RevenueTab.tsx`, `ResultsDisplay.tsx`, `StickerPrinterView.tsx`, `UserManagementModal.tsx` (nhóm 6 nút); `ContestTable.tsx`, `IndustryAnalysisTab.tsx`, `FilterBar.tsx`, `WarehouseSummary.tsx`, `DashboardView.tsx`, `TargetHero.tsx`, `DetailTab.tsx` (nhóm 8 nút) = tổng 91 nút thêm trong đợt này.
- Áp dụng đúng pattern chuẩn đã chốt trước đó, không phát sinh edge-case mới ngoài các case đã biết (`justify-start` cho nút dropdown/list-item 1-text-child hoặc toggle nhiều children; giữ nguyên `relative`/`style` inline khi nút gốc cần làm containing-block cho phần tử `absolute` con — VD nút bell-badge trong `CompetitionSummaryView.tsx`, nút xoay icon trong `IndustryView.tsx` dùng `style={{ transform: ... }}`).
- Phát hiện 1 case mới: nút sort-header trong `CompetitionGroupView.tsx` (`NHÂN VIÊN`, `M.TIÊU`...) không có class font-weight/uppercase riêng — dựa hoàn toàn vào kế thừa CSS `font-black uppercase tracking-wider` từ `<tr>` cha. Vì `Button`'s `baseStyles` tự set `font-medium` trực tiếp trên chính nó, giá trị kế thừa từ cha bị chặn (thuộc tính chỉ định trực tiếp luôn thắng giá trị kế thừa). Phải bổ sung tường minh `font-black uppercase tracking-wider` vào `className` của từng `Button` đó để khôi phục đúng giao diện gốc — đây là edge-case cần lưu ý: **bất kỳ nút nào dựa vào kế thừa font-weight/text-transform từ phần tử cha (không tự khai báo) đều cần được bổ sung tường minh khi chuyển sang `Button`**.
- Verify: `tsc --noEmit` sạch toàn repo (chạy lại nhiều lần theo từng mốc); `eslint` trên từng file đã sửa → 0 lỗi mới (chỉ còn các lỗi `import/no-restricted-paths` tiền tồn tại, không liên quan buttons, đã xác nhận qua `git diff` là dòng import không đổi).
- **Số liệu đo lại bằng eslint** (không suy đoán): còn **186 nút thô trong 17 file** (391/577 đã xong). 2 file bị loại trừ vĩnh viễn khỏi phạm vi: `components/shared/ui/Button.tsx` (chính là primitive, giữ nguyên `<button>` native) và `components/shared/ui/Modal.tsx` (nút đóng X, blast-radius cực cao vì dùng ở mọi modal — vẫn đang chờ quyết định riêng, chưa đụng).
- **Chưa xong**: 17 file còn lại gồm nhóm 9-10 nút (`TrendChart.tsx`, `HeadToHeadTab.tsx`, `CustomExploitationTabModal.tsx`, `CrossSellingBuilderModal.tsx`, `SupermarketConfig.tsx`, `CrossSellingTab.tsx`, `ManualInputModal.tsx`, `StickerPrintControls.tsx`, `WarehouseSettingsModal.tsx`, `StickerManualQueue.tsx`, `StickerPrintPreview.tsx`) và 4 file lớn/phức tạp cố ý để cuối cùng: `ControlPanel.tsx` (16), `PhanCaView.tsx` (17), `CompetitionTab.tsx` (21), `EditShiftModal.tsx` (28).

### Hoàn tất Bước 4 (cùng ngày) — 577/577 nút, migrate xong toàn bộ

- Migrate hết nhóm 9-10 nút còn lại: `TrendChart.tsx`, `HeadToHeadTab.tsx`, `CustomExploitationTabModal.tsx`, `CrossSellingBuilderModal.tsx`, `SupermarketConfig.tsx`, `CrossSellingTab.tsx`, `ManualInputModal.tsx`, `StickerPrintControls.tsx`, `WarehouseSettingsModal.tsx`, `StickerManualQueue.tsx`, `StickerPrintPreview.tsx`.
- Migrate 4 file lớn/phức tạp cố ý để cuối cùng: `ControlPanel.tsx` (16 nút), `PhanCaView.tsx` (17 nút), `CompetitionTab.tsx` (21 nút), `EditShiftModal.tsx` (28 nút — file lớn nhất, nhiều view con dạng state machine với các cặp nút "Hủy"/"Vẫn tiếp tục" lặp lại gần giống nhau, phải đọc kỹ từng cặp để tránh dùng `replace_all` nhầm giữa các biến thể tương tự nhau).
- **Migrate luôn `components/shared/ui/Modal.tsx`'s nút đóng (X)** — quyết định trước đó là để dành riêng vì đây là component blast-radius cao nhất trong toàn app (mọi modal ở cả 4 zone đều dùng chung `Modal.tsx`). Sau khi toàn bộ phần còn lại đã xong và ổn định, đánh giá nút này đơn giản (icon đơn, không có logic căn chỉnh phức tạp) nên migrate theo đúng pattern chuẩn, rồi verify riêng bằng Playwright thật: mở app ở Chế Độ Dùng Thử, vào tab Phân ca, bấm icon lịch sử để mở `HistoryModal` (dùng chung `Modal.tsx`), chụp ảnh trạng thái hover của nút đóng (nền tròn xám khi hover — đúng như thiết kế gốc), bấm nút đóng và xác nhận modal đóng đúng, không có lỗi console/pageerror nào phát sinh.
- **Số liệu cuối cùng đo bằng eslint (không suy đoán)**: chỉ còn đúng 1 `<button>` native trong toàn bộ codebase — tại chính `components/shared/ui/Button.tsx` (primitive implementation, bắt buộc giữ `<button>` gốc vì đây chính là nơi định nghĩa `Button`). Tổng cộng đã migrate 576/577 nút thô (con số 577 gốc đã bao gồm `Button.tsx` chính nó, nên về bản chất mọi nút thô "cần" migrate đã xong 100%).
- **Phát hiện phụ khi verify `lint:ratchet` cuối cùng**: `components/filters/FilterBar.tsx` báo "vi phạm mới" (`nonSemanticColor` 26→35, `missingDarkVariant` 1→9). Điều tra qua `git log`/`git diff` xác nhận: 1 công cụ AI khác đang chạy song song (đã biết từ trước, chủ dự án xác nhận là chủ đích) đã thêm 1 khối `<style>{\`...\`}</style>` CSS-in-JS mới vào file này (phần "grouped-filters" cho Week-select) — các selector CSS bên trong như `.bg-indigo-50`, `.dark\\:text-indigo-400` bị regex của `lint-ratchet.cjs` hiểu nhầm thành class Tailwind thiếu cặp `dark:` (vì regex chỉ so khớp text, không phân biệt CSS selector string với className JSX thật). Xác nhận đây KHÔNG phải do các nút `Button` tôi vừa migrate gây ra (nút cuối cùng tôi sửa trong file này giữ nguyên y hệt class gốc, không thêm màu mới). Đã cập nhật `violations-baseline.json` phản ánh đúng giá trị thật hiện tại, không sửa nội dung file (khối `<style>` đó không thuộc phạm vi task buttons).
- Verify cuối cùng trên toàn bộ repo: `eslint .` sạch (1 lỗi còn lại là cố ý ở `Button.tsx`; phần còn lại là `import/no-restricted-paths` tiền tồn tại không liên quan); `tsc --noEmit` sạch; `npm run build` thành công (43 chunk, không lỗi); `npm run lint:ratchet` sạch sau khi cập nhật baseline.
- **Bước 4 chính thức hoàn tất.** Không còn `<button>` thô nào cần migrate trong phạm vi RULES.md §2.5 Shared Core Contract.

## 2026-07-05 — Phase 2: Hoàn thiện 4 file tài liệu sai lệch nặng nhất (API, DATABASE, TESTING, DEPLOYMENT)

### Bối cảnh

Sau khi hoàn tất Bước 4 (migrate button), chuyển sang Phase 2 (Chuẩn hóa tài liệu). Audit
lại toàn bộ 10 file trong `boltz_project_rules_md/` phát hiện: hầu hết là **template chung
chung** viết lúc khởi tạo bộ rule, chưa từng được đối chiếu với source code thật — một số
file mô tả kiến trúc hoàn toàn không tồn tại (VD: `API.md` giả định có REST API server +
`apiClient.ts`, trong khi dự án dùng Firebase/Firestore trực tiếp không qua backend riêng),
một số còn để nguyên chỗ trống dạng placeholder chưa điền (`TESTING.md`'s "Module 1-4",
`DATABASE.md`'s "Data model hiện tại", `DEPLOYMENT.md`'s env checklist). Người dùng chọn ưu
tiên sửa 4 file sai/thiếu nghiêm trọng nhất trước: `API.md`, `DATABASE.md`, `TESTING.md`,
`DEPLOYMENT.md` (4 file còn lại — `ARCHITECTURE.md`, `CODE_STYLE.md`, `SECURITY.md`,
`DESIGN.md` — để sau).

### Đã làm

- **Khảo sát ground-truth thật** trước khi viết: `package.json` scripts thật (không có test
  runner, `npm run lint` thực chất là `tsc --noEmit` chứ không phải eslint — dễ gây nhầm
  lẫn), toàn bộ `collection()`/`doc()` calls trong codebase để lập bản đồ Firestore thật
  (`users/`, `shared_configs/`, `stores/`, `_system/` + các subcollection), cấu trúc
  `services/dbService.ts` (IndexedDB qua `idb`), quy trình `npm run deploy` thật (git push +
  `gh-pages -d dist`), domain thật (`dashboard.pro.vn` qua `public/CNAME`), và xác nhận
  Firebase config hardcode trong `services/firebase.ts` là chủ đích (API key Web SDK vốn
  public) chứ không phải lỗ hổng bảo mật.
- **`API.md`**: viết lại hoàn toàn. Xóa bỏ giả định REST API server/`apiClient.ts`/
  `ApiResponse<T>` không tồn tại. Thay bằng: liệt kê đúng ~20 service file thật ở
  `services/` gốc + service riêng từng zone (`features/*/services/`), pattern error handling
  thật đang dùng (`try/catch` + `react-hot-toast`, không có `normalizeApiError()` dùng
  chung — ghi nhận là nợ kỹ thuật), vai trò của Excel/CSV parser như "API layer" thật sự của
  app (nguồn dữ liệu chính), và 2 REST API bên thứ 3 thật sự có (Google Sheets, Gemini).
- **`DATABASE.md`**: điền đầy đủ mục "Data model hiện tại" (trước đó để trống hẳn) với toàn
  bộ collection/subcollection Firestore thật + IndexedDB (`dbService.ts` root, `db/idb.ts`
  riêng của phan-ca) + xác nhận nguồn dữ liệu CHÍNH là file Excel người dùng tự upload (không
  phải kéo từ database từ xa). Sửa mục "Quy ước đặt tên" (bỏ giả định SQL snake_case — dự án
  không có SQL backend, field Firestore đã camelCase thống nhất với frontend). Điền mục "Quy
  tắc dữ liệu cho calculation" với 5 chỉ số thật (DT, DTQĐ, HQQĐ, Trả góp, Số lượng) kèm tên
  hàm/file tính toán cụ thể, và ghi nhận HQQĐ là nợ kỹ thuật chưa gom về 1 helper dùng chung.
- **`TESTING.md`**: điền mục "Test 4 module" (trước đó để trống hẳn dạng "Module 1:...")
  khớp đúng 4 zone đã được `REQUIREMENTS.md` xác định từ trước, kèm test case cụ thể theo
  tính năng thật (upload YCX/KPI cho Root, Thi đua/Target cho bi-dashboard, EditShiftModal
  cho phân ca, in bill 80mm cho sticker-event). Sửa mục "Lệnh kiểm tra": xác nhận npm
  (không phải multi-package-manager chung chung), và ghi rõ **dự án không có test runner tự
  động** — mọi "test" thực chất là `npm run check` + test thủ công qua trình duyệt.
- **`DEPLOYMENT.md`**: viết lại hoàn toàn theo quy trình thật — `npm run deploy` = commit +
  push `main` + `gh-pages -d dist`, domain riêng `dashboard.pro.vn`, không có CI/CD, không
  có staging (chỉ 1 môi trường production). **Cảnh báo rõ trong file**: lệnh `npm run
  deploy` tự động push code lên `main` — cần xác nhận người dùng trước khi chạy thay họ,
  không tự ý deploy. Ghi chú rollback thực tế (rebuild + `gh-pages -d dist` từ commit ổn
  định, không cần push lại `main` nếu chỉ cần rollback phần hiển thị).
- Cập nhật `TASKS.md` Phase 2: đánh dấu `[x]` cho `TESTING.md`, `DEPLOYMENT.md`, `API.md`,
  `DATABASE.md`, `REQUIREMENTS.md` (đã đúng từ trước), kèm tóm tắt thay đổi cho từng file.

### Chưa làm (để sau theo lựa chọn của người dùng)

- `ARCHITECTURE.md` — vẫn mô tả cấu trúc `src/app/`, `src/modules/` không tồn tại; thực tế
  là cấu trúc phẳng không có `src/`, chia 4 zone cách ly theo `RULES.md` §2.0.
- `CODE_STYLE.md` — vẫn tham chiếu `shared/lib/calculations` không tồn tại; thực tế dùng
  `utils/dataUtils.ts` + `features/*/utils/`.
- `SECURITY.md` — chưa có phần Firebase Security Rules/Firestore permissions dù đây là rủi
  ro bảo mật chính thật sự của dự án (không phải rủi ro generic OWASP chung chung).
- `DESIGN.md` — sai vài chi tiết Button thật (liệt kê variant `success` không tồn tại trong
  `Button.tsx`, thiếu size `icon`, mô tả bo góc "pill" trong khi Button thật dùng
  `rounded-md`); cần đối chiếu lại token màu với `styles.css`'s `@theme` thật (Tailwind 4,
  không có `tailwind.config.js`).

### Verify

- Chỉ sửa file Markdown thuần (không đụng source code) — không cần chạy `eslint`/`tsc`/
  `build`, chỉ xác nhận qua `git status --short` rằng đúng 4 file dự kiến đã thay đổi.

## 2026-07-05 — Phase 2: Hoàn tất 4 file tài liệu còn lại (ARCHITECTURE, CODE_STYLE, SECURITY, DESIGN)

### Bối cảnh

Người dùng yêu cầu "HOÀN TẤT CÁC MỤC CHƯA LÀM" — hoàn thành nốt 4 file còn lại trong Phase 2
(`ARCHITECTURE.md`, `CODE_STYLE.md`, `SECURITY.md`, `DESIGN.md`) sau khi đã xong 4 file sai
nặng nhất ở lượt trước (`API.md`, `DATABASE.md`, `TESTING.md`, `DEPLOYMENT.md`).

### Phát hiện quan trọng trước khi sửa

Dự án đã có sẵn 2 tài liệu RẤT chi tiết và chính xác ở project root mà bộ `boltz_project_rules_md/`
chưa hề tham chiếu tới: **`RULES.md`** (cấu trúc thư mục thật, kiến trúc 4 zone, design
system, deployment, coding pattern — do 1 phiên làm việc khác/công cụ khác viết, rất sát
thực tế) và **`UI_GUIDELINES.md`** (style bảng biểu chi tiết). Quyết định: KHÔNG chép lại
nội dung 2 file này vào `boltz_project_rules_md/`, mà sửa các file sai để **trỏ về** `RULES.md`/
`UI_GUIDELINES.md` làm nguồn chân lý, tránh 2 nơi ghi cùng 1 sự thật rồi lệch nhau theo thời gian.

Cũng phát hiện `styles/tokens.css` (382 dòng) đã có sẵn hệ token 3 tầng Primitive → Semantic
→ Component rất bài bản (brand = Sky, không phải hex tùy tiện như `DESIGN.md` bản gốc).

### Đã làm

- **`ARCHITECTURE.md`**: viết lại "Cấu trúc thư mục" — xóa cấu trúc lý thuyết
  `src/app/modules/shared/` (chưa từng tồn tại), thay bằng cấu trúc phẳng thật + trỏ về
  `RULES.md` mục 1-2. Liệt kê đúng 14 file trong `components/shared/ui/` (không có
  `Popover`/`ErrorState`/`Dialog` riêng — cảnh báo kiểm tra kỹ trước khi tạo mới tránh trùng).
  Sửa "Data flow" (nguồn dữ liệu chính là Excel upload, không phải gọi API), "Filter
  architecture" (dẫn `FilterState` thật từ `types.ts`, giải thích rõ mỗi zone tự có filter
  riêng không dùng chung), "Calculation architecture" (trỏ `utils/dataUtils.ts`, không có
  `shared/lib/calculations`, ghi chú nợ kỹ thuật HQQĐ chưa gom 1 helper). Bổ sung ghi chú các
  thư mục root KHÔNG thuộc app: `_agents/`, `archive/`, `design-system/`, `scratch/`,
  `tasks/`, `telegram-agent/` (hạ tầng công cụ AI khác chạy song song trên repo).
- **`CODE_STYLE.md`**: sửa "Logic rules" và "CSS/UI rules" theo đúng path/bảng màu thật, bổ
  sung rule cứng zone-isolation (`import/no-restricted-paths`) vào "Import/export rules".
- **`SECURITY.md`**: thêm mục mới "Firebase Auth & Security Rules" — xác định đúng ranh giới
  bảo mật thật của app (Firebase Auth + Firestore Rules, không phải API token truyền thống);
  ghi nhận `firestore.rules` không có trong repo (rule quản lý ngoài Firebase Console, không
  version-control/review qua PR được — rủi ro quy trình cần lưu ý). **Audit thật phát hiện 1
  lỗ hổng đang tồn tại**: `features/sticker-event/stickerprinter/StickerPrintPreview.tsx`
  render nội dung sticker (nhân viên tự nhập, lưu chung `stores/{storeId}` giữa các nhân
  viên cùng kho) bằng `dangerouslySetInnerHTML` không sanitize — stored XSS phạm vi 1 kho.
  Đã ghi rõ trong file, CHƯA sửa code (ngoài phạm vi task viết docs, cần làm riêng với đánh
  giá kỹ hơn vì phải giữ được tính năng bold/italic/underline hiện có). Cũng xác nhận
  `MarkdownRenderer.tsx` có cùng vấn đề nhưng là dead code (không import ở đâu) — an toàn.
- **`DESIGN.md`**: bỏ hoàn toàn bảng token hex "Boltz Crypto Admin Dashboard" gốc, thay bằng
  hệ token 3 tầng thật từ `styles/tokens.css`. Sửa Button variants (xóa `success` không tồn
  tại trong `Button.tsx`, thêm size `icon` bị thiếu), sửa sai lệch "bo góc lớn/pill" → thật
  là `rounded-md`/`rounded-xl` nhỏ (button 6-8px, card 12px, modal 16px). Bổ sung 3 giá trị
  `maxWidth` Modal bị thiếu (`2xl`/`4xl`/`full`). Sửa Typography (font thật: UTM Avo/Plus
  Jakarta Sans, không phải Inter/Poppins/Nunito Sans). Ghi chú đặc thù màu "indigo≈sky"
  (theo `RULES.md` §2.5 điểm 2, không tự ý tìm-thay hàng loạt). Cập nhật checklist cuối file
  để tick đúng mục Button (đã hoàn tất Bước 4) và làm rõ các mục còn lại thật sự cần làm gì.

### Verify

- Chỉ sửa file Markdown thuần, không đụng source code — xác nhận qua `git status --short`
  đúng 4 file `ARCHITECTURE.md`/`CODE_STYLE.md`/`SECURITY.md`/`DESIGN.md` đã thay đổi.
- **Toàn bộ Phase 2 (8 file tài liệu) nay đã hoàn tất**: `REQUIREMENTS.md` (đã đúng từ
  trước), `API.md`, `DATABASE.md`, `TESTING.md`, `DEPLOYMENT.md`, `ARCHITECTURE.md`,
  `CODE_STYLE.md`, `SECURITY.md`, `DESIGN.md`.

## 2026-07-05 — Phase 2: Hoàn tất CLAUDE.md (mục cuối cùng còn lại)

### Đã làm

- **`CLAUDE.md`**: rà soát lại theo yêu cầu "HOÀN TẤT CÁC MỤC CHƯA LÀM". Phát hiện thiếu sót
  quan trọng nhất trong toàn bộ đợt audit Phase 2: mục "Tài liệu bắt buộc phải đọc" **chưa
  từng nhắc tới `RULES.md`/`UI_GUIDELINES.md`** — 2 tài liệu nằm ở root dự án (không phải
  trong `boltz_project_rules_md/`) mà chính đợt audit 4 file trước đó (API/DATABASE/
  ARCHITECTURE/DESIGN...) đã phát hiện là nguồn chân lý chính xác nhất về kiến trúc/design
  system thật. Đã thêm 2 file này lên đầu danh sách bắt buộc đọc, quy định rõ thứ tự ưu
  tiên (RULES.md thắng nếu có mâu thuẫn với các file khác trong `boltz_project_rules_md/`).
  Sửa "Bước 4 — Kiểm tra": thay lệnh generic sai (`npm run test` không tồn tại) bằng lệnh
  thật (`npm run lint` = `tsc --noEmit`, `npx eslint .`, `npm run check`), ghi rõ dự án
  không có test runner tự động nên bắt buộc test thủ công qua trình duyệt sau khi sửa UI.
- **`README.md`** (trong `boltz_project_rules_md/`, không nằm trong checklist gốc nhưng sửa
  luôn vì cùng phát hiện): thêm tham chiếu `RULES.md`/`UI_GUIDELINES.md` vào đầu mục "Tài
  liệu quan trọng" và "Cách bắt đầu cho Claude"; sửa "Lệnh thường dùng" theo thực tế npm
  (bỏ `npm run test` không tồn tại, thêm `npx eslint .`/`npm run check`).

### Verify

- Chỉ sửa file Markdown, xác nhận qua `git status --short` đúng các file dự kiến đã đổi.
- **Toàn bộ Phase 2 (10 file tài liệu trong `boltz_project_rules_md/`) nay đã hoàn tất**:
  `CLAUDE.md`, `README.md`, `REQUIREMENTS.md`, `DESIGN.md`, `ARCHITECTURE.md`, `API.md`,
  `DATABASE.md`, `CODE_STYLE.md`, `TESTING.md`, `SECURITY.md`, `DEPLOYMENT.md` — không còn
  mục nào trong Phase 2 để làm tiếp.

## 2026-07-05 — Phase 6: Dọn dẹp file không sử dụng (theo yêu cầu chủ dự án)

### Bối cảnh

Chủ dự án yêu cầu kiểm tra và xóa file không dùng để "làm nhẹ dự án", loại trừ tường minh
thư mục `archive/` (chứa backup). Do đây là thao tác xóa (khó hoàn tác về mặt tâm lý dù có
thể khôi phục qua git), đã audit kỹ trước, trình bày danh sách phân loại theo độ tin cậy cho
chủ dự án xác nhận, rồi mới xóa.

### Phương pháp audit

Viết script Node.js quét toàn bộ import thật (`from '...'`, `import('...')`, `require(...)`,
`@import`) trong mọi file `.ts/.tsx/.js/.jsx/.css`, resolve từng đường dẫn tương đối về file
thật (thử các đuôi `.ts/.tsx/.js/.jsx` và `index.*`), rồi so sánh với danh sách toàn bộ file
để tìm file không bao giờ được resolve. Sau đó **xác minh thủ công từng ứng viên** để loại
false positive: import kiểu Vite `?worker`/`new URL(..., import.meta.url)` (3 file worker bị
flag nhầm ban đầu), ambient type declaration `global.d.ts` (TypeScript tự nhận, không cần
import), barrel export ẩn. Cũng đối chiếu với `AUDIT.md` (audit trước đó, 04/07) để không bỏ
sót phát hiện đã có.

### Đã xóa (8 file, chủ dự án đã xác nhận cả 4 nhóm)

**Source code chết trong app** (không được import ở bất kỳ đâu, đã verify kỹ):
- `features/bi-dashboard/components/MarkdownRenderer.tsx` — thêm lý do: dùng
  `dangerouslySetInnerHTML` không sanitize (đã ghi nhận rủi ro này trong `SECURITY.md`
  trước đó khi còn là dead code; nay đã xóa hẳn nên rủi ro không còn tồn tại nữa).
- `features/bi-dashboard/components/shared/SharedModal.tsx` — modal tự viết bị thay thế bởi
  `components/shared/ui/Modal.tsx` dùng chung.
- `features/bi-dashboard/hooks/useTheme.ts` — hook theme riêng của zone, không được gọi ở
  đâu; dark mode thật của toàn app nằm ở `contexts/LayoutContext.tsx` (root), các zone chỉ
  cần dùng class Tailwind `dark:` (tự động ăn theo class `.dark` ở `<html>`), không cần hook
  riêng.
- `features/phan-ca/index.css` (272 dòng) — bị thay thế bởi `phanca.css`, không còn import.

**File rác/trùng lặp ở root** (không thuộc `archive/`):
- `dashboardycx_backup.zip` (55MB, không track bởi git) — backup trùng mục đích `archive/`.
- `bg_phieu.png` (188K, ở root) — trùng `public/frame/bg_phieu.png`, code chỉ dùng bản trong
  `public/frame/`.

**Xác nhận thêm từ chủ dự án trước khi xóa** (không hẳn "unused" theo nghĩa kỹ thuật, mà là
công cụ cá nhân/kế hoạch cũ):
- `Deploy_Dashboard.command` — script deploy cá nhân macOS (double-click), chủ dự án xác
  nhận không còn dùng.
- `_agents/` (2 file `.md`: `nhanvien_plan.md`, `workflows/deploy.md`) — kế hoạch/workflow cũ,
  khác với `.agents/` (đang hoạt động, giữ nguyên); `AUDIT.md` 04/07 đã ghi nhận thư mục này
  "bỏ hoang", chủ dự án xác nhận xóa.

### Loại trừ khỏi phạm vi (cân nhắc kỹ, không xóa dù có thể "không dùng")

- `archive/` — loại trừ tường minh theo yêu cầu chủ dự án.
- `.agents/skills/*` (VD: `condition-based-waiting-example.ts`, `utility-types.ts`) — không
  được import bởi app, nhưng đây là tài liệu/ví dụ tham khảo đi kèm định nghĩa skill của
  Claude Code (`SKILL.md` + file ví dụ), không phải code app chết — xóa nhầm có thể ảnh
  hưởng hệ thống skill.
- `scratch/`, `tasks/`, `telegram-agent/`, `design-system/` — không thuộc app nhưng là hạ
  tầng công cụ AI khác đang chạy song song trên cùng repo (đã biết từ trước, xem CHANGELOG
  các mục trước) — không nằm trong phạm vi "file dự án" theo nghĩa web app, rủi ro xóa nhầm
  cao nếu đang hoạt động.

### Dọn dẹp phụ

- Xóa entry `features/bi-dashboard/components/shared/SharedModal.tsx` khỏi
  `violations-baseline.json` (file không còn tồn tại).

### Phát hiện phụ khi verify `lint:ratchet`

`constants.ts` và `components/summary/WarehouseSettingsModal.tsx` báo "vi phạm mới"
(`nonSemanticColor` tăng) — điều tra qua `git log`/`git status` xác nhận đây là do 1 commit
KHÁC không liên quan (`3a8a5fe feat(columns): add BẢO HIỂM ALL...`, thêm cột nghiệp vụ mới)
của công cụ AI khác chạy song song trên repo, KHÔNG phải do việc xóa file trong task này gây
ra. Đã cập nhật baseline phản ánh đúng giá trị thật hiện tại, không sửa nội dung 2 file đó
(ngoài phạm vi task cleanup).

### Verify

- `git status` sạch trước khi xóa (không có thay đổi chưa commit bị mất).
- `tsc --noEmit` sạch toàn repo — xác nhận không file nào còn import 8 file đã xóa.
- `npx eslint .` không phát sinh lỗi mới (31 lỗi còn lại đều là `import/no-restricted-paths`
  tiền tồn tại, không liên quan).
- `npm run build` thành công.
- `npm run lint:ratchet` sạch sau khi cập nhật baseline.

## 2026-07-05 — Quality audit (quality-master) + fix bug hook + chặn zone-isolation lọt qua

### Added

- `npm run check` giờ chạy thêm `npm run lint:eslint` (giữa `typecheck` và `build`) — trước
  đó `check` KHÔNG chạy eslint nên 31 lỗi `import/no-restricted-paths` (vi phạm zone-isolation
  RULES.md §2.0) đã lọt qua nhiều lần mà không ai biết.
- Tạo services zone-local (theo đúng quy tắc "viết riêng trong feature" của RULES.md §2.0,
  thay vì import chéo `services/`/`hooks/` gốc):
  - `features/bi-dashboard/services/{uiService,dbService,metricService,employeeParser}.ts`
    + `features/bi-dashboard/hooks/useExportOptions.ts` (move từ root, chỉ bi-dashboard dùng).
  - `features/phan-ca/services/{uiService,googleSheetsService,firebase,firestoreSync}.ts`
    (`firebase.ts` dùng Firebase App riêng tên `phanca`, cùng project `dashboa-7e20b` với
    root — tránh lỗi "App named [DEFAULT] already exists" nhưng vẫn cùng 1 Firestore thật).
  - `features/sticker-event/services/{uiService,dbService}.ts`.
  - Tất cả bản `dbService.ts`/`uiService.ts` zone-local giữ nguyên `DB_NAME`
    (`BI_HUB_DATABASE_V2`), tên store, và event `ycx-setting-changed` như bản gốc — không đổi
    dữ liệu/hành vi, chỉ tách JS module để hết phụ thuộc chéo.

### Fixed

- **Bug thật** ở [components/kpis/KpiCards.tsx](../components/kpis/KpiCards.tsx): `useMemo`
  (`computedValues`) bị gọi SAU một `return null` có điều kiện → vi phạm Rules of Hooks, có
  thể gây crash React khi `kpis`/`kpiCardsConfig` đổi từ falsy→truthy giữa các lần render. Đã
  chuyển guard `return null` xuống sau toàn bộ hook, thêm `(kpiCardsConfig || [])` bên trong
  `useMemo` để an toàn khi config chưa sẵn sàng.
- 30 lỗi `import/no-restricted-paths` (zone-isolation) trên cả 3 feature — xem danh sách file
  ở mục Added.

### Removed

- `services/parsers/employeeParser.ts`, `hooks/useExportOptions.ts` (root) — move hẳn sang
  `features/bi-dashboard/`, không còn ai ở root/feature khác dùng (đã grep xác nhận).

### Verify

- `npx eslint .`: 0 lỗi (chỉ còn 5 warning tiền tồn tại, không liên quan).
- `npm run check` (typecheck + eslint + build + lint:ratchet): sạch hoàn toàn.
- Cập nhật `violations-baseline.json` cho 3 file `uiService.ts` mới (`missingDarkVariant: 1`
  mỗi file — kế thừa đúng từ bản gốc `services/uiService.ts`, không phải lỗi mới).
- Chạy `npm run dev` + Playwright, load thử cả 3 tab (`employees`, `tools-phanca`,
  `tools-print-sticker`) — 0 console error, xác nhận Firebase App riêng của phan-ca không
  xung đột với app mặc định của root.

## 2026-07-06 — Vá XSS thật ở StickerPrintPreview.tsx

### Added

- `dompurify` (`^3.4.11`) làm dependency trực tiếp trong `package.json` — trước đó chỉ tồn
  tại gián tiếp qua `optionalDependencies` của `jspdf`, rủi ro biến mất nếu `jspdf` đổi phiên
  bản. Không phát sinh vulnerability mới (`npm audit` vẫn chỉ 3 lỗi cũ, không liên quan:
  `@babel/core`, `@grpc/grpc-js`, `xlsx`).
- Helper `sanitizeTicketHtml()` trong `StickerPrintPreview.tsx`: bọc `DOMPurify.sanitize()`
  với `ALLOWED_TAGS: ['b','i','u','strong','em','span','br']`, `ALLOWED_ATTR: ['style']` —
  khớp đúng những gì toolbar rich-text (bold/italic/underline qua `execCommand`, font-size/
  font-family qua `applyStyleToSelection` bọc `<span style="...">`) thực sự tạo ra.

### Fixed

- **Stored XSS thật** (đã ghi nhận trong `SECURITY.md` từ 2026-07-05, chưa vá lúc đó vì ngoài
  phạm vi task viết docs): 6 chỗ `dangerouslySetInnerHTML` render
  `activeFirstTicket.title/contentTop/contentTopRight/contentBottom/contentBottomRight/footer`
  không sanitize. Nội dung này do nhân viên tự nhập, lưu vào Firestore
  `stores/{storeId}/savedLists` dùng chung cho cả kho — 1 nhân viên có thể chèn script độc
  hại ảnh hưởng đồng nghiệp khác khi họ mở lại danh sách đã lưu.

### Verify

- `tsc --noEmit`, `npx eslint features/sticker-event/`: sạch.
- `npm run build`: thành công (chunk `StickerPrinterView` tăng ~28KB do bundle dompurify,
  chunk `purify.es-*.js` cũ từ jspdf không còn tách riêng — đã dedupe vào cùng 1 bản).
- Playwright: load tab `tools-print-sticker` — 0 console error.

## 2026-07-06 — Giảm `any`: xử lý xong toàn bộ 34 chỗ `catch (x: any)`

### Added

- 3 helper mới trong `utils/dataUtils.ts` (shared cross-zone theo RULES.md §2.5):
  `getErrorMessage(error: unknown): string`, `getErrorCode(error: unknown): string | undefined`
  (đọc field `code` kiểu FirebaseError mà không cần `any`), `isAbortError(error: unknown)`
  (không dùng `instanceof Error` vì `DOMException` — lỗi thật của `navigator.share()` — không
  kế thừa từ `Error` trong TS `lib.dom`).
- `AuthErrorLike` (local interface trong `features/sticker-event/Login.tsx`): file này vừa
  bắt `FirebaseError` thật vừa tự `throw { code, message }` (object thường, không phải
  `Error`), nên cần 1 type hẹp riêng thay vì `any`.

### Fixed

- **34/34 chỗ `catch (x: any)`** trên toàn dự án (cả 4 khu vực) chuyển sang `catch (x: unknown)`
  + truy cập `.message`/`.code`/`.name` qua helper thay vì trực tiếp — an toàn hơn `any` (bắt
  buộc kiểm tra kiểu trước khi đọc property) mà không đổi hành vi runtime. Danh sách file:
  `Login.tsx` (7), `useStickerEventDb.ts` (3), `SuperAdminModal.tsx` (2),
  `ChangePasswordModal.tsx` (1, dùng `FirebaseError` từ `firebase/app` để narrow chính xác),
  4 bản `uiService.ts` (gốc + bi-dashboard + phan-ca + sticker-event, cùng 1 chỗ `shareBlob`),
  `PhanCaView.tsx` (2), `AiSuggestPatternModal.tsx` (1), `CompetitionTab.tsx` (1),
  `analytics.worker.ts` (1), `UncollectedOrdersModal.tsx`/`UnshippedOrdersModal.tsx` (2 mỗi
  file), `LoginView.tsx` (1), `UserManagementView.tsx` (1), `useExportLogic.ts` (1),
  `useCloudSync.ts` (1), `useDataManagement.ts` (3), `dataService.ts` (1).

### Verify

- `tsc --noEmit`, `npx eslint .`, `npm run build`: sạch (0 lỗi mới).
- Tổng số lần dùng `any` trong dự án: 608 → 575 (giảm 33; còn lại thuộc 3 nhóm khác chưa xử
  lý: `as any` ~113, `: any[]` ~99, `(param: any)` ~192 — quy mô lớn hơn nhiều, cần nhiều đợt
  tiếp theo, mỗi chỗ cần xem ngữ cảnh cụ thể để gán đúng type thay vì tìm-thay hàng loạt).

## 2026-07-06 — Giảm `any`: xử lý xong nhóm `as any` (113 → 6)

### Added

- Helper `getErrorCode(error: unknown): string | undefined` trong `utils/dataUtils.ts` (đọc
  field `.code` kiểu FirebaseError an toàn, bổ sung cho `getErrorMessage`/`isAbortError` đã
  thêm ở đợt trước).

### Fixed

107/113 chỗ `as any` (94.7%) được sửa theo 3 hướng, tuỳ từng trường hợp thật:

1. **Cast thừa — xoá hẳn không cần thay gì khác** (phần lớn các trường hợp): type đích đã đủ
   chính xác từ trước, `as any` chỉ là thói quen phòng thủ không cần thiết. Ví dụ:
   `useWarehouseLogic.ts` (7 chỗ đọc `row[targetCol.metric]` — `WarehouseColumnConfig.metric`
   đã là `WarehouseCoreMetric` khớp đúng field của `WarehouseSummaryRow`), tương tự
   `WarehouseSummary.tsx`, `DashboardView.tsx` (`<DashboardContext.Provider value={logic}>` —
   `useDashboardLogic()` khớp đúng `DashboardContextType`), `Icon name={tab.icon}` (2 file),
   `MobileBottomNav.tsx` (`tab.externalUrl` sau `'externalUrl' in tab` đã tự narrow đúng).
2. **Phát hiện type khai báo bị thiếu field/rộng hơn thực tế → sửa type gốc thay vì cast**:
   - `SortConfig['key']` (`IndustryTableUtils.tsx`) thiếu hẳn key động của custom tab
     (`val_default_tab_*`) → thêm `| (string & {})` để vừa giữ autocomplete vừa nhận string
     động (xoá 8 chỗ `as any` ăn theo ở `useIndustryAnalysisLogic.ts`).
   - `CalculatedColumnForm.availableOperands: ColumnConfig[]` quá chặt so với dữ liệu thật
     (`HeadToHeadConfigModal` chỉ có `{id, columnName}`) → đổi sang shape hẹp đúng những gì
     component thật sự dùng.
   - `SectionHeader.title: string` → `React.ReactNode` (3 file `TrendChart.tsx`,
     `IndustryGrid.tsx`, `EmployeeAnalysis.tsx` đều truyền JSX vào `title`).
   - `EmployeeAnalysisTabs.tsx`: `Tab` interface thiếu `color?: string`.
   - `PerformanceSingleTable.tableRef: React.RefObject<HTMLDivElement>` → `React.Ref<...>`
     (không nhận được callback-ref từ `forwardRef`).
   - **Bug thật phát hiện**: `SummaryTableComparisonBar` khai `selectedWeeks: string[]`/
     `handleWeekPillClick: (id: string) => void` nhưng dữ liệu thật từ
     `useSummaryComparison.ts` là `number[]`/`(id: number) => void` — sửa lại type component
     con cho khớp thực tế thay vì tiếp tục che bằng `any`.
3. **Cast thật sự cần thiết — thay `any` bằng type hẹp nhất có thể** (dynamic key access,
   Firestore `.data()`, `select onChange`, window/browser API mở rộng): dùng
   `Record<string, unknown>` + narrow tại chỗ dùng (vd `CrossSellingTab.tsx`, `BonusTab.tsx`,
   `KpiCards.tsx`, `useSummaryTableLogic.ts`), cast literal union chính xác cho mọi
   `select onChange={...as any}` (KpiCardConfigModal, ColumnConfigModal, UserManagementView,
   AiSuggestPatternModal — dựa đúng theo type `useState` khai báo), `LucideIcon` cho
   `Icon.tsx`, `FirebaseError`/interface hẹp cho các chỗ đọc `doc.data()`.

### Còn lại (6 chỗ, chấp nhận là ngoại lệ hợp lý)

- `StickerPrinterView.tsx` (3): `XLSX.utils.sheet_to_json(...) as any[][]` — thuộc ngoại lệ
  "Excel raw data parse" đã duyệt từ trước.
- `features/sticker-event/firebase.ts`: config load qua `import.meta.glob` — kiểu dữ liệu
  thật sự động, không đáng công sức ép type chi tiết.
- `NhanVien.tsx`: `(window as any).debugEmployeeCompetitionTargets` — biến debug console,
  không ảnh hưởng logic thật.
- `useCompetitionData.ts`: gắn liền với param hook đang khai `: any` (thuộc nhóm
  `(param: any)` chưa xử lý, sẽ sửa cùng lúc ở đợt sau).

### Verify

- `tsc --noEmit`, `npx eslint .`: sạch (0 lỗi, chỉ còn 5 warning tiền tồn tại).
- `npm run build`: thành công.
- Playwright: load 5 tab chính (`analysis`, `employees`, `tools-phanca`,
  `tools-print-sticker`, `settings`) — 0 console error.
- Tổng any (mọi pattern: `: any`, `as any`, `any[]`, `<any>`): 575 → 468.

## 2026-07-06 — Giảm `any`: nhóm `: any[]` (99 → 52, 47 chỗ đã sửa)

### Fixed

Áp dụng đúng type có sẵn của dự án thay vì `any[]` chung chung, theo từng cụm liên quan:

- **`RevenueRow`/`InstallmentRow`/`CrossSellingRow`** (đã có sẵn trong `nhanVienTypes.ts`) —
  áp dụng cho props `revenueRows?`/`installmentRows?`/`banKemRows?` ở
  `IndividualCompetitionView.tsx`, `CompetitionCompareView.tsx`, `CompetitionTab.tsx` (14 chỗ).
- **`CustomExploitationTabConfig[]`/`CustomContestTab[]`/`DataRow[]`/`Employee[]`** —
  `EmployeeAnalysisContent.tsx` (11 chỗ, phát sinh thêm: object fallback thiếu field `order`
  bắt buộc của `CustomExploitationTabConfig` → đã bổ sung), `IndustryAnalysisTab.tsx`,
  `useIndustryAnalysisLogic.ts` (dùng `Record<string, unknown>[]` cho các hàm ranking đọc
  field động).
- **`Tab` type** (từ `EmployeeAnalysisTabs.tsx`, nay export ra ngoài): áp dụng cho
  `useEmployeeAnalysisLogic.ts`, `useEmployeeAnalysisTabs.ts`. Phát hiện 1 chỗ gán nhầm loại
  (`renderedCustomTabs` thực ra là `CustomContestTab[]` — có field `.name`, không phải
  `Tab[]` có field `.label` — đã sửa đúng type thay vì gộp chung).
  `EmployeeAnalysisContent.tsx` cũng đổi sang `import type { Tab }` dùng chung, bỏ khai báo
  trùng lặp.
- **`CompetitionEmployeeRow`** (interface mới, export từ `nhanVienHelpers.ts`): mô tả đúng
  shape `{name, originalName, department, values: (number|null)[]}` mà
  `parseCompetitionData()` trả về — áp dụng cho cả `nhanVienHelpers.ts` (3 chỗ) và
  `NhanVien.tsx` (2 chỗ, bao gồm cả `CompetitionHeader` cho field `headers`).
- **`DataRow[]`** cho `baseFilteredData` (dữ liệu Excel đã lọc) ở `TrendChart.tsx`,
  `IndustryGrid.tsx`, `SavedCalendarCard.tsx`, `useEmployeeAnalysisData.ts`.

### Còn lại (52 chỗ)

- **Chấp nhận là ngoại lệ** (~14): Excel raw parse (`dataService.ts`, `worker.ts`,
  `fileParser.ts`, `sheet_to_json` trong `PhanCaView.tsx`), `useStableCallback.ts` (pattern
  generic chuẩn `(...args: any[]) => any` cho higher-order function — không nên sửa).
- **Chưa làm** (~38): chủ yếu là biến cục bộ trong các hàm xử lý bảng
  (`finalOutput`/`rows`/`result`/`out` ở `BonusTab.tsx`/`CrossSellingTab.tsx`/
  `InstallmentTab.tsx`/`CompetitionCompareView.tsx`/`useRevenueData.ts`/
  `useHeadToHeadLogic.ts`), ít ảnh hưởng ra ngoài module nên độ ưu tiên thấp hơn props/hàm
  export — để lại cho đợt sau nếu cần.

### Verify

- `tsc --noEmit`, `npx eslint .`: sạch (0 lỗi).
- `npm run build`: thành công.
- Playwright: load 4 tab chính (`analysis`, `employees`, `tools-phanca`,
  `tools-print-sticker`) — 0 console error.
- Tổng any (mọi pattern): 468 → 418.

## 2026-07-06 — Giảm `any`: nhóm `(param: any)` (chỗ đã sửa, 418 → 342 tổng any)

### Fixed

- **`querySelectorAll<HTMLElement>(...)`** thay vì `.forEach((el: any) => ...)` — áp dụng đồng
  loạt cho cả 4 bản `uiService.ts` (gốc + 3 zone-local), 12 chỗ mỗi file (48 chỗ tổng) trong
  các hàm export ảnh (`exportElementAsImage`, `fixOklchColors` liên quan). Đây là cách dùng
  đúng của DOM API — generic type argument của `querySelectorAll` — thay vì ép kiểu từng
  callback.
- **Sửa tận gốc param của hook thay vì từng chỗ dùng derived** — hiệu quả cao nhất trong đợt
  này:
  - `useIndustryViewLogic(realtimeData, luykeData, isRealtime)`: 2 param đầu đổi từ `any` sang
    `ReturnType<typeof parseIndustryRealtimeData>`/`ReturnType<typeof parseIndustryLuyKeData>`
    (tái dùng type suy ra từ chính hàm parser thật, không cần định nghĩa interface tay) → tự
    động kéo theo 11 chỗ `(row: any)`/`(node: any)`/... bên trong hết cần ép kiểu.
  - `useCompetitionData({...}: any)`: thêm interface `UseCompetitionDataProps` tái dùng
    `CompetitionEmployeeRow` (đã thêm ở đợt trước) → kéo theo 10 chỗ derived hết cần `any`.
- Sửa lẻ theo ngữ cảnh: `StickerPrinterView.tsx` (`parsePrice`/`formatPriceInThousands`/
  `formatFullPrice` nhận `unknown` thay vì `any` — các hàm này tự `String()`/`== null` nên an
  toàn với input bất kỳ; `handleDbChange(event: Event)` + cast `CustomEvent<{key?: string}>`
  đúng chuẩn thay vì `any`).

### Còn lại

Còn nhiều chỗ `(param: any)` khác (đặc biệt các hàm xử lý bảng ở `CrossSellingTab.tsx`,
`EmployeeAnalysisContent.tsx`, `IndividualCompetitionView.tsx`, `CompetitionView.tsx`,
`useSummaryComparison.ts`, `NotificationDropdown.tsx`...) — để lại cho đợt sau, cùng phần còn
lại của nhóm `: any[]` và 42 chỗ `div/span onClick`.

### Verify

- `tsc --noEmit`, `npx eslint .`: sạch (0 lỗi).
- `npm run build`: thành công.
- Playwright: load 4 tab chính — 0 console error.
- Tổng any (mọi pattern): 418 → 342.

## 2026-07-06 — Accessibility: chuyển 17/42 chỗ `div`/`span` onClick sang có thể dùng bàn phím

### Added

- Helper `onActivateKey(handler)` mới trong `components/shared/ui/utils.ts` (export qua
  `index.ts`): trả về `onKeyDown` kích hoạt `handler` khi nhấn Enter/Space, giống hành vi
  `<button>` thật — dùng cho các phần tử clickable không tiện đổi hẳn sang `<button>`/`<Button>`
  vì lý do layout (nằm trong `<span>` inline, list row phức tạp có `Switch` lồng bên trong...).

### Fixed

17/42 chỗ `<div>`/`<span onClick>` — thêm `role="button" tabIndex={0}` + `onKeyDown={onActivateKey(...)}`,
giữ nguyên `onClick` và toàn bộ style/layout hiện có (không đổi hành vi click, chỉ thêm lối vào
bằng bàn phím): danh sách toggle siêu thị/bộ phận (`NhanVien.tsx` ×4), toggle chương trình thi
đua (`CompetitionView.tsx`, `IndividualCompetitionView.tsx`, `CompetitionTab.tsx` ×3), dòng nhân
viên có thể click (`BonusTab.tsx`, `BonusMobileCard.tsx`, `RevenueDesktopRow.tsx`,
`TopSellerList.tsx`), toggle cột hiển thị (`SummaryTableHeader.tsx`), sort header
(`EmployeeManagerModal.tsx`), nút import file (`InstallmentTab.tsx`), và **trigger dropdown
dùng chung** `components/shared/ui/Dropdown.tsx` (ảnh hưởng mọi nơi dùng `Dropdown` — điểm sửa
có blast-radius cao nhất trong đợt này).

### Còn lại (25 chỗ) — chủ động không sửa, có lý do cụ thể

Đã kiểm tra kỹ từng trường hợp, không phải "bỏ sót" mà là 3 nhóm **không cần** role="button":

1. **Modal backdrop click-to-close** (8 chỗ: `BonusTab.tsx`, `ManualInputModal.tsx`,
   `SavedListsModal.tsx`, `PdfPreviewModal.tsx`, `LayoutSelectionModal.tsx`,
   `PrintSettingsModal.tsx`, `TrendChart.tsx`, `DashboardView.tsx`) — đây là lớp phủ nền
   (backdrop), KHÔNG nên nằm trong tab order (nếu thêm `tabIndex` sẽ tạo 1 stop bàn phím vô
   nghĩa ngay sau khi mở modal). Đã xác minh mẫu tại `ManualInputModal.tsx`: modal luôn có
   nút đóng thật (`<Button>` + `aria-label="Đóng"`) dùng được bằng bàn phím — backdrop-click
   chỉ là tiện ích thêm, không phải cách duy nhất để đóng.
2. **`contentEditable` div** (11 chỗ, `StickerPrintPreview.tsx`) — các div này đã có thuộc
   tính `contentEditable`, tự động nhận focus và thao tác được bằng bàn phím theo chuẩn HTML,
   không cần `role="button"` (bản chất là vùng nhập liệu, không phải nút bấm).
3. **Wrapper chỉ để `stopPropagation()`** (6 chỗ: `CrossSellingTab.tsx`, `KpiCards.tsx`,
   `EmployeeManagerModal.tsx` dòng filter dropdown, `FilterPopover.tsx` ×2) — không phải nội
   dung có thể "kích hoạt", chỉ chặn sự kiện nổi bọt lên phần tử cha.

### Verify

- `tsc --noEmit`, `npx eslint .`: sạch (0 lỗi, chỉ còn 5 warning tiền tồn tại).
- `npm run build`: thành công.
- Playwright: load tab `employees` — 0 console error.
