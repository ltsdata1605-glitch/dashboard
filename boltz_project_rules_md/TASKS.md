# TASKS.md

## Trạng thái tổng thể

Dự án đang bước vào giai đoạn **cải tiến toàn diện** từ Vibecoding sang cấu trúc chuyên nghiệp.

Mục tiêu: chuẩn hóa toàn bộ architecture, UI, component, filter, calculation, module và quy trình phát triển.

---

## Phase 0 — Chuẩn bị an toàn

- [x] Kiểm tra project có build được ở trạng thái hiện tại không. → Build/typecheck/lint sạch (verify 2026-07-05).
- [x] Xác định package manager: npm (package-lock.json, không có yarn/pnpm/bun lockfile).
- [x] Xác định framework: React 19 + Vite 6 + TypeScript + Tailwind CSS 4.
- [x] Xác định lệnh dev/build/lint/test trong `package.json`: `dev`, `build`, `preview`, `lint`(=tsc --noEmit), `typecheck`, `lint:eslint`, `lint:ratchet`, `check`(=typecheck+build+lint:ratchet), `deploy`.
- [x] Ghi nhận lỗi hiện tại: không có lỗi build sẵn có; có ~33 lỗi ESLint boundary (`import/no-restricted-paths`) đã tồn tại từ trước, chưa liên quan task hiện tại.
- [ ] Tạo backup/branch trước khi refactor lớn — **cần làm trước khi bắt đầu Phase 3 trở đi** (hiện đang làm việc trực tiếp trên branch `ui-rebuild-v1`).

---

## Phase 1 — Audit toàn bộ dự án

- [x] Liệt kê cấu trúc thư mục hiện tại — không có `src/`, code phẳng ở root (`App.tsx`, `components/`, `hooks/`, `services/`, `contexts/`, `features/`).
- [x] Xác định routes/pages chính — không dùng React Router, điều hướng bằng `activeTab` trong `LayoutContext`, `App.tsx > TabContent`.
- [x] Xác định chính xác 4 app/module riêng lẻ — xem bảng dưới.
- [x] Liệt kê modal/popup/button đang style khác nhau — xem số liệu dưới (đã giảm đáng kể ở phan-ca sau đợt migrate trước).
- [x] Liệt kê logic tính toán đang bị lặp — mỗi zone có utils tính toán riêng theo chủ đích cách ly (không phải lỗi), nhưng nội bộ từng zone từng có lệch (vd. `IndustryAnalysisTab.tsx` rank O(N² log N) — đã fix).
- [x] Liệt kê dependency có khả năng không dùng: `ws`, `level`, `react-rnd` — không import ở bất kỳ đâu trong app thật. **Đã xóa (2026-07-05)** bằng `npm uninstall ws level react-rnd`, verify build/typecheck sạch.
- [x] Liệt kê code/file khả năng không dùng: 18 file `fix_*.cjs` ở root (không phải 11 như ước tính ban đầu — đếm lại bằng `ls`), là script one-off dùng `fs.readFileSync`/`replace`/`writeFileSync` để patch 1 lần vào các file cụ thể (`hooks/useDataManagement.ts`, `features/bi-dashboard/hooks/useNhanVienData.ts`...) trong giai đoạn Vibecoding trước đây — không gọi từ `package.json`, không có trong CI, đã áp dụng xong (nội dung patch đã nằm trong code hiện tại). **Đã xóa toàn bộ 18 file (2026-07-05)** bằng `git rm`. `features/phan-ca/hooks/usePhanCa.ts` đã xóa (dead code, xác nhận 2026-07-05).
- [x] Lập rủi ro refactor — xem mục "3 mâu thuẫn" trong CHANGELOG 2026-07-05.

Ghi chú audit:

```txt
Tech stack: React 19 + Vite 6 + TypeScript + Tailwind CSS 4 + Firebase + Recharts
Package manager: npm
4 module chính:
  1. Root/Dashboard — components/, hooks/, services/, contexts/ (root) — tab analysis/check-thuong/settings
  2. bi-dashboard (Report BI) — features/bi-dashboard/ — tab employees
  3. phan-ca (Phân ca) — features/phan-ca/ — tab tools-phanca
  4. sticker-event (In Sticker) — features/sticker-event/ — tab tools-print-sticker
Vấn đề UI: modal tự viết fixed inset-0 (Root 10 + components/modals 13, bi-dashboard 4,
  phan-ca 1 còn lại là overlay không phải modal, sticker-event 15); <button> thô — SỐ LIỆU
  CŨ (Root 68, bi-dashboard 30, phan-ca 11, sticker-event 26) SAI, chỉ đếm 1 phần.
  Đo lại chính xác bằng `eslint` toàn zone (2026-07-05): Root 252, bi-dashboard 144,
  phan-ca 64, sticker-event 117 = 577 nút thô toàn app. Đây là con số thật, phản ánh
  quy mô lớn hơn nhiều so với ước tính ban đầu — việc "migrate hết button" KHÔNG nên làm
  bằng sửa hàng loạt không kiểm chứng (mỗi nút có class tùy biến riêng, ép qua `Button`
  sai cách sẽ đổi kích thước/bo góc/hover ngoài ý muốn = phá UI, vi phạm rule "không đổi
  UI ngoài DESIGN.md"). Đã làm mẫu 7 file nhỏ, rủi ro thấp ở phan-ca (11 nút) theo pattern
  an toàn (xem CHANGELOG 2026-07-05 "Bước 3"); phần còn lại (566 nút) là việc lớn, nên làm
  dần theo từng file có kiểm tra typecheck+eslint+build+xem trực tiếp trên trình duyệt,
  không nên làm trong 1 lượt.
Vấn đề logic: mỗi zone tự có utils tính toán riêng (CHỦ ĐÍCH — xem RULES.md §2.0,
  không gộp thành 1 engine chung); lệch cục bộ trong từng zone đã phát hiện & fix
  1 phần (IndustryAnalysisTab rank O(N² log N))
Vấn đề cấu trúc: 3 tài liệu design system mâu thuẫn nhau (xem CHANGELOG); telegram-agent/
  + tasks/ là tooling agent riêng, không thuộc app dashboard, KHÔNG nằm trong phạm vi
  cải tiến này; design-system/ycx-dashboard/MASTER.md là tài liệu mồ côi không ai dùng
Rủi ro: 4 module cố ý cách ly nhau (không được gộp state/filter cross-zone — mâu thuẫn
  với ARCHITECTURE.md mới, đã được chủ dự án xác nhận giữ nguyên cách ly 2026-07-05)
```

### Quyết định nền tảng (đã xác nhận với chủ dự án — 2026-07-05)

1. **Design tokens**: GIỮ NGUYÊN bảng màu sky/slate/emerald/amber/rose thật đang chạy (không đổi sang navy/blue "Boltz" trong `DESIGN.md` mới). Chỉ áp dụng quy tắc **cấu trúc** từ `DESIGN.md` mới (button variants/sizes, modal size scale sm/md/lg/xl, radius/shadow pattern, spacing scale) vào các component chưa chuẩn.
2. **Cấu trúc thư mục**: KHÔNG di chuyển file vào `src/app`/`src/modules`/`src/shared`. Giữ nguyên vị trí vật lý hiện tại (`features/*` đã đúng tinh thần "modules/", `components/shared/ui` đã đúng vị trí "shared/ui").
3. **Filter/state**: KHÔNG tạo 1 `FilterState` toàn cục xuyên 4 module. Chuẩn hóa filter theo cùng shape/convention **trong từng zone**, tôn trọng ranh giới cách ly đã có ở `RULES.md` §2.0.
4. **TASKS.md/CHANGELOG.md**: cập nhật tại `boltz_project_rules_md/` (không gộp lên root `RULES.md`/`AUDIT.md`/`NOTES.md`).

---

## Phase 2 — Chuẩn hóa tài liệu và rule

- [ ] Hoàn thiện `CLAUDE.md`.
- [ ] Hoàn thiện `REQUIREMENTS.md`.
- [ ] Hoàn thiện `DESIGN.md`.
- [ ] Hoàn thiện `ARCHITECTURE.md` theo source thực tế.
- [ ] Hoàn thiện `CODE_STYLE.md`.
- [ ] Hoàn thiện `TESTING.md`.
- [ ] Hoàn thiện `SECURITY.md`.
- [ ] Hoàn thiện `DEPLOYMENT.md`.

---

## Phase 3 — Design system

> Đã có sẵn từ trước (không cần tạo lại) tại `components/shared/ui/`: Button, Card, Modal,
> ConfirmDialog, Input, Select, Tabs, Badge, Tooltip, DataTable, EmptyState, StatCard,
> ProgressBar, Skeleton, Dropdown. Việc còn lại là **migrate các chỗ chưa dùng** (xem Phase 5),
> không phải tạo mới.

- [x] Design tokens color/spacing/radius/shadow — đã có ở `styles.css` + `styles/tokens.css`, giữ nguyên theo quyết định nền tảng #1.
- [x] Shared `Button`, `Card`, `Modal`, `ConfirmDialog`, `Input`, `Select`, `Tabs`, `Badge`, `Tooltip`, `DataTable`, `EmptyState`, `StatCard`, `ProgressBar`, `Skeleton`, `Dropdown` — đã tồn tại tại `components/shared/ui/`.
- [x] **Chốt chuẩn Modal duy nhất** (2026-07-05): `components/shared/ui/Modal.tsx` là chuẩn chính thức (đúng khuyến nghị `AUDIT.md`).
  - Fix: `Modal.tsx` trước đây render inline (không portal) — khác biệt kiến trúc so với `ModalWrapper` (dùng `createPortal`). Đã thêm `ReactDOM.createPortal(..., document.body)` để tránh modal bị kẹt/lệch nếu component cha có `overflow-hidden`/`transform`.
  - Fix: `ConfirmDialog` (chính component trong `shared/ui`) trước đây lại phụ thuộc `ModalWrapper` (hệ cũ) thay vì `Modal` — đã chuyển sang dùng `Modal`.
  - Áp size scale từ `DESIGN.md` mới: sm=420px, md=560px, lg=720px, xl=960px (giữ nguyên 2xl/4xl/full làm size mở rộng riêng cho modal nhiều nội dung, ngoài phạm vi DESIGN.md gốc).
  - Verify: build/typecheck/eslint/lint-ratchet sạch; test trình duyệt xác nhận portal hoạt động đúng (modal render ở gần `document.body`, không còn lồng sâu trong cây component), ESC đóng đúng, không lỗi console mới.
- [x] **Bước 2 — Migrate hàng loạt 26 file `ModalWrapper` → `Modal`** (2026-07-05): toàn bộ 26 consumer đã chuyển xong (danh sách xem CHANGELOG). Pattern áp dụng nhất quán: `maxWidthClass`→`maxWidth` enum, footer tách ra prop `footer` (button trong footer đổi `type="submit"`→`type="button" onClick=...` vì footer render như portal sibling, không còn lồng trong `<form>`), bỏ guard `if (!isOpen) return null` (để `AnimatePresence` chạy hết animation exit), dùng `-m-5` để huỷ padding mặc định khi modal có header/scroll tuỳ biến riêng. `components/modals/ModalWrapper.tsx` đã **xóa hẳn** sau khi xác nhận (grep) không còn nơi nào import. Verify: `tsc --noEmit` sạch, `npm run build` thành công, `eslint` không phát sinh lỗi mới (chỉ còn warning `<button>` thô đã có từ trước), `lint:ratchet` OK (baseline giảm, không có vi phạm mới).
- [ ] Giới hạn đã biết: chưa test tương tác trình duyệt (click-through) cho các modal ở `components/employees/*` vì cần upload file Excel dữ liệu thật để vào được màn hình đó (không có sẵn trong repo) — đã spot-check portal/animation của `Modal.tsx` qua 2 modal khác reach được không cần data (bell "Thông báo", gear "Cài đặt cấu hình") và không thấy lỗi console.
- [~] **Bước 4 — Migrate 577 `<button>` thô sang `Button` (đang làm, 2026-07-05)**: tiến hành thủ công từng file theo yêu cầu chủ dự án ("làm dần từng file có kiểm tra, không dồn 1 lượt"), KHÔNG dùng codemod tự động hàng loạt (đã thử viết codemod AST, bị auto-mode classifier chặn đúng vì vi phạm tinh thần "không dồn 1 lượt" — đã dừng, quay lại sửa tay). Sau khi chủ dự án xác nhận "tiếp tục cho đến khi hoàn tất, không cần xác nhận", tiến hành liên tục theo lô. **Tiến độ: đã xong 391/577 nút** (theo eslint đo trực tiếp: còn 186 nút thô trong 17 file, trong đó 2 file cố ý loại trừ vĩnh viễn là `Button.tsx` chính nó và `Modal.tsx` nút đóng — xem ghi chú riêng bên dưới). Đã làm cả các file nền tảng rủi ro cao: `components/shared/ui/Input.tsx`, `Dropdown.tsx`, `Tabs.tsx`, `components/layout/Sidebar.tsx` + `NotificationDropdown.tsx` (hiển thị trên MỌI trang) — đã spot-check bằng trình duyệt, không lỗi console/UI. Pattern chuẩn: `<Button variant="ghost" className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit <class gốc>">`, cộng thêm `justify-start` khi nút có nhiều children cần căn trái (mặc định `Button` là `justify-center`), và bọc children xếp-dọc trong 1 `<div>` khi nút gốc có nhiều dòng nội dung xếp chồng (nếu không, `Button`'s `inline-flex` sẽ ép chúng xếp ngang thay vì xếp dọc như cũ). Còn lại 186 nút trong 17 file, gồm cả các file lớn/phức tạp cố ý để sau: `EditShiftModal.tsx` (28, lưới lịch phức tạp), `CompetitionTab.tsx` (21), `PhanCaView.tsx` (17), `ControlPanel.tsx` (16), và nhóm 9-10 nút còn lại (`TrendChart.tsx`, `HeadToHeadTab.tsx`, `CustomExploitationTabModal.tsx`, `CrossSellingBuilderModal.tsx`, `SupermarketConfig.tsx`, `CrossSellingTab.tsx`, `ManualInputModal.tsx`, `StickerPrintControls.tsx`, `WarehouseSettingsModal.tsx`, `StickerManualQueue.tsx`, `StickerPrintPreview.tsx`). Verify sau mỗi batch: `eslint` (file vừa sửa), `tsc --noEmit` (toàn repo) — tất cả đều sạch tại checkpoint này (186 nút còn lại).
- [ ] **Lưu ý môi trường phát hiện giữa chừng**: có 1 công cụ AI khác (Antigravity IDE) đang chạy song song trên cùng repo này, tự động commit các thay đổi riêng của nó (chủ đề: sticker/draw-ticket print styling) — đôi khi gộp chung với các thay đổi migrate-button chưa commit của phiên này vào cùng 1 commit message không liên quan. Đã hỏi và được chủ dự án xác nhận đây là chủ đích ("Tiếp tục, không sao") — không cần dừng lại, nhưng cần lưu ý khi đọc lại git log sau này: 1 commit message có thể chứa nhiều loại thay đổi không liên quan tới nhau.
- [ ] Phát hiện phụ (không liên quan buttons): `components/modals/AdminAnnouncementModal.tsx` có 2 vi phạm `missingDarkVariant` (thiếu cặp `dark:`) chưa từng được ghi vào `violations-baseline.json` (file được thêm cùng commit với lần cuối cập nhật baseline, có vẻ bị sót). Đã bổ sung vào baseline với giá trị thật hiện tại (2) để `lint:ratchet` phản ánh đúng — CHƯA sửa 2 dòng thiếu `dark:` đó (ngoài phạm vi task buttons hiện tại).
- [ ] Bổ sung `Popup/Popover` chuẩn nếu chưa có tương đương đủ dùng.
- [ ] Bổ sung `LoadingState`/`ErrorState` chuẩn (hiện có `Skeleton`/`EmptyState`, cần rà soát có thiếu `ErrorState` riêng không).

---

## Phase 4 — Chuẩn hóa filter và calculation

- [ ] Thiết kế `FilterState` dùng chung.
- [ ] Tạo default filter values.
- [ ] Tạo helper reset filter.
- [ ] Tạo helper serialize/deserialize filter nếu cần.
- [ ] Tạo shared calculation utilities.
- [ ] Di chuyển công thức tính toán khỏi UI component.
- [ ] Đảm bảo các khu vực dùng cùng công thức cho cùng chỉ số.
- [ ] Test các case null/undefined/zero/empty data.

---

## Phase 5 — Refactor 4 app/module riêng lẻ

> Lưu ý: KHÔNG gộp state/filter cross-module (quyết định nền tảng #3). "Chuẩn hóa filter/calculation"
> nghĩa là mỗi module tự nhất quán nội bộ theo cùng convention, không phải dùng chung 1 store.

### Module 1: `Root/Dashboard` (components/, hooks/, services/, contexts/)

- [x] Chuẩn hóa calculation — đã fix re-render cascade `useDashboardLogic`/`DashboardContext`, dead code `useIndustryGridLogic`, `IndustryAnalysisTab` rank O(N² log N).
- [x] Chuẩn hóa modal — toàn bộ `components/modals/`, `components/kpis/`, `components/employees/`, `components/summary/`, `components/common/ExportOptionsModal.tsx`, `components/layout/Header.tsx` đã migrate sang `Modal`/`ConfirmDialog` chuẩn (bước 2, 2026-07-05); `ModalWrapper.tsx` (hệ cũ) đã xóa.
- [ ] Chuẩn hóa layout/component — còn lại: modal tự viết dạng `fixed inset-0` chưa quy về `Modal` (khác nhóm với `ModalWrapper` đã migrate) + 68 `<button>` thô chưa migrate.
- [ ] Chuẩn hóa filter — rà soát `useFilterState.ts` có đúng 1 nguồn cho toàn Root chưa.
- [ ] Kiểm tra responsive.
- [x] Kiểm tra build.

### Module 2: `bi-dashboard` (Report BI) — `features/bi-dashboard/`

- [x] Chuẩn hóa calculation — đã fix `useIndexedDBState` re-render toàn cục, `ExportOptionsProvider` unmemoized.
- [x] Chuẩn hóa modal — `ImportPrevMonthModal.tsx`, `ColorSettingsModal.tsx` (features/bi-dashboard/components/nhanvien/revenue/) đã migrate sang `Modal` (bước 2, 2026-07-05).
- [ ] Chuẩn hóa layout/component — còn lại modal tự viết khác (không qua `ModalWrapper`) + 30 `<button>` thô chưa migrate sang `shared/ui`.
- [ ] Chuẩn hóa filter — rà soát filter state riêng của zone này.
- [ ] Kiểm tra responsive.
- [x] Kiểm tra build.

### Module 3: `phan-ca` (Phân ca) — `features/phan-ca/`

- [x] Chuẩn hóa component — **đã migrate xong 11/12 modal sang `shared/ui/Modal` + `ConfirmDialog`** (1 file `ConfirmModal.tsx` bị xóa vì trùng cơ chế có sẵn).
- [x] Chuẩn hóa calculation — đã fix `structuredClone` thay JSON round-trip, tối ưu `greedyPolish`, xóa dead code `usePhanCa.ts`.
- [~] `<button>` thô — đã migrate 7 file nhỏ, rủi ro thấp sang `Button` (2026-07-05): `Legend.tsx` (3 nút), `HelpModal.tsx` (1), `DailyStatsTable.tsx` (1), `Controls.tsx` (1), `EditRulesModal.tsx` (2), `ImportStaffModal.tsx` (2), `ScheduleTable.tsx` (1) = 11 nút. **Số liệu thật đo lại bằng eslint: zone này có 64 `<button>` thô, không phải 11 như ghi trước đó** (số cũ chỉ tính riêng nội dung 1 vài modal, không phải toàn zone) — còn ~53 nút trong `EditShiftModal.tsx` (lưới lịch phức tạp, ~30 nút), `EditPatternModal.tsx`, `AiSuggestPatternModal.tsx` cố tình CHƯA đụng vào trong lượt này vì rủi ro thị giác cao hơn (nút trong lưới/calendar có class điều kiện phức tạp), cần làm riêng với kiểm tra kỹ hơn.
- [ ] Kiểm tra responsive.
- [x] Kiểm tra build.

### Module 4: `sticker-event` (In Sticker) — `features/sticker-event/`

- [x] Chuẩn hóa calculation — đã fix CSS re-inject mỗi render, `DrawTicketBlock` thiếu memo, `innerHTML +=` O(n²) khi in.
- [ ] Chuẩn hóa layout/component — 15 modal tự viết + 117 `<button>` thô chưa migrate (số liệu thật đo lại bằng eslint 2026-07-05, cũ ghi nhầm 26).
- [ ] `printService.ts` gọi html2canvas từng sticker trong vòng lặp (bill 80mm) — **để nguyên, rủi ro cao, cần test máy in thật trước khi đổi** (đã đánh giá kỹ, xem CHANGELOG).
- [ ] Kiểm tra responsive.
- [x] Kiểm tra build.

---

## Phase 6 — Cleanup và tối ưu

- [x] Xóa code không dùng sau khi kiểm tra references — 18 file `fix_*.cjs` ở root (2026-07-05, xem Phase 1).
- [ ] Gộp component trùng chức năng.
- [ ] Gộp helper trùng chức năng.
- [ ] Xóa CSS class không dùng.
- [x] Xóa dependency không dùng nếu chắc chắn — `ws`, `level`, `react-rnd` (2026-07-05, xem Phase 1).
- [ ] Tối ưu import/export.
- [ ] Tối ưu bundle nếu cần.
- [ ] Kiểm tra console warning/error.

---

## Phase 7 — Kiểm tra hoàn thiện

- [ ] Chạy lint.
- [ ] Chạy typecheck nếu có.
- [ ] Chạy test nếu có.
- [ ] Chạy build.
- [ ] Test desktop.
- [ ] Test tablet.
- [ ] Test mobile.
- [ ] Test filter liên kết.
- [ ] Test modal/popup.
- [ ] Test table empty/loading/error.
- [ ] Test 4 module chính.
- [ ] Cập nhật `CHANGELOG.md`.

---

## Quy tắc cập nhật task

Sau mỗi lần sửa, Claude phải cập nhật:

```txt
- Task đã hoàn thành.
- Task đang làm dở.
- Task phát sinh.
- Lỗi/rủi ro còn lại.
```
