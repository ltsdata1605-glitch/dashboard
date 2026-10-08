# Audit thiết kế Dashboard YCX — bản ZIP cung cấp ngày 2026-10-07

Phạm vi: `components/`, toàn bộ 7 thư mục `features/*`, `styles.css`, `styles/tokens.css`, các chuẩn dự án và các đường dẫn style liên quan xuất/in. Không sửa ứng dụng. Kết quả là đối chiếu mã nguồn; không khẳng định đã xem mọi màn hình chạy thực tế.

## Kết luận

**Dự án có nền tảng dùng chung, nhưng chưa có một hệ thống thiết kế được áp dụng thống nhất toàn app.** Icon và export đã tập trung khá tốt; modal phổ thông đã dùng chung hành vi. Nút, input, dropdown, KPI và bảng vẫn có nhiều bộ style cục bộ. Việc sửa `styles/tokens.css` hiện không đủ để đổi tất cả giao diện tương ứng.

Không nên yêu cầu Claude “gom toàn bộ CSS vào một file”. Cần một nguồn quyết định token/variant và các primitive dùng chung, còn bố cục nghiệp vụ và mẫu in vẫn có thể ở từng feature. Bảng nhiều cột, lịch phân ca, nhãn in, preview tin LINE có ngữ cảnh khác nhau: không mặc định mọi khác biệt là lỗi.

## Bằng chứng về mức độ tập trung

| Hạng mục | Phần dùng chung | Phần vẫn rời rạc / lệch |
|---|---|---|
| Màu/spacing/radius | `styles/tokens.css`, nhập ở `styles.css:2`; primitive → semantic → component; thêm bộ `--console-*` | Cùng lúc tồn tại brand sky-500, console accent sky-700, nút primary sky-600; control radius token 8px, console 4px, component hard-code 6px. `features/phan-ca/phanca.css` tự có palette indigo và biến scoped riêng. |
| Icon | `components/shared/ui/icon/iconRegistry.ts`, `iconTokens.ts`, `AppIcon.tsx`, `components/layout/navIcons.ts` | Registry đúng là điểm tập trung; logo thương hiệu/preview tin nhắn là ngoại lệ có chủ đích. Không xem emoji nội dung LINE hay bookmarklet là UI icon cần thay. |
| Button | `components/shared/ui/Button.tsx`; `cn` dùng `tailwind-merge`; loading/disabled/focus tích hợp | `ghost` và `unstyled` cho phép caller tự định nghĩa toàn bộ màu/kích cỡ/radius; rất nhiều nút có class dài đè variant. Có nút DOM thô ngoài shared. |
| Input/select | Shared `Input.tsx`, `Select.tsx` | Nhiều input có border/focus/size/radius cục bộ; native file/checkbox/date không nên bị chuyển máy móc. Chưa có shared Textarea. |
| Modal/confirm | Shared `Modal`, `ConfirmDialog`, hook `useModalBehavior` có stack, Escape, focus trap/restore, scroll lock, portal; modal chuẩn 6px/dvh | LINE/Thuế dựng khung 16px/vh riêng nhưng dùng cùng behavior hook: có chung hành vi, chưa chung khung style. Vẫn có `window.confirm`. |
| Dropdown/popup | Shared `Dropdown`, `MultiSelectDropdown`, `Tooltip`, `TouchTitleHint` | Root common có `SingleSelectDropdown`, `MultiSelectDropdown`, `SearchableSelect` riêng; BI có dropdown riêng. Shared Dropdown 12px, DropdownButton 8px, Modal 6px; portal root dropdown z=999999, shared dropdown token z=50. |
| KPI | Shared `KpiCard` được dùng ở Phân Tích, BI, Thi đua, Check thưởng, Khai thác | `IndustryKpiCard` và phần `PerformanceModal` còn tự dựng; giá trị/nhãn phụ là children do caller định dạng nên scale/font/color khác nhau. `StatCard` tồn tại nhưng không thấy JSX consumer. |
| Bảng | Shared `DataTable`; helper scroll cue | Hầu hết bảng nghiệp vụ tự dựng `table`; cùng lớp có mật độ 26px, px/py khác nhau, sticky/viền/pastel khác nhau. BI áp thêm CSS blanket radius=0, root không áp. |
| Card/section | `Card`, `SectionCard`, `SectionHeader`; global `.surface-card`, `.chart-card` | Card token radius 12px; SectionCard desktop 16px; tiêu chuẩn mới yêu cầu khối dữ liệu vuông/phẳng; global shadows và mobile overrides riêng. |
| Toast/load | App có một `react-hot-toast` Toaster; shared Skeleton, EmptyState, export progress host | DOM toast thủ công lặp trong hook/Phân Ca/modal; native confirm; các loader cục bộ overlay riêng. Toaster chưa có chung toastOptions/theme. |
| Export/in | `components/shared/export` với preset standard/bi/raw | Preset BI/raw và print sticker khác là ngoại lệ đã được ghi trong CLAUDE. Không chuyển CSS vật lý nhãn in về scale dashboard. |

Thống kê phục vụ tìm ứng viên, **không phải tỷ lệ đồng nhất**: tìm opening-tag bằng text trên 275 file TSX ứng dụng trong `components/` và `features/`, loại `*.test.tsx`/`*.spec.tsx`. Có thể bao gồm comment/template và phần implementation primitive.

| Chuỗi | Số lần xuất hiện | File có xuất hiện |
|---|---:|---:|
| `<Button` / `<button` | 851 / 171 | 199 / 43 |
| `<Input` / `<input` | 87 / 175 | 40 / 85 |
| `<Select` / `<select` | 38 / 33 | 15 / 25 |
| `<textarea` | 18 | 17 |
| `<DataTable` / `<table` | 2 / 57 | 2 / 49 |
| `<Modal` / `<ConfirmDialog` | 73 / 23 | 69 / 18 |
| `<KpiCard` / `<StatCard` | 23 / 0 | 6 / 0 |
| `<Card` / `<SectionCard` | 10 / 10 | 7 / 9 |

Chỉ 3 TSX feature dùng trực tiếp `var(--console-...)`: `features/khai-thac/components/{HistoryTab,DashboardTab,GroupSection}.tsx`, chủ yếu font nhãn. Không tìm thấy consumer ứng dụng của `--console-row-h`, `--console-radius-control`, `--console-radius-overlay` ngoài khai báo. Chỉ 6 file trong components/features có các kiểu `var(--console|btn|input|modal|card|table|text-|brand...)` được tìm theo text; không bao gồm các biến icon động/z-index hoặc CSS primitive Phân Ca. Phần lớn style hiện vẫn dùng class Tailwind trực tiếp, tức dùng chung palette nhưng chưa dùng chung semantics/component token.

## Phát hiện có thể giao Claude

### DS-01 — P2: Biến CSS Phân Ca không đi theo modal portal

- Xác minh từ mã: `phanca.css:5-18` khai `--border-light`, `--surface-0`, `--brand-secondary` chỉ trên `.phanca-root`; `phanca.css:235-249` dùng các biến này trong `.config-input` và focus, đồng thời đặt `outline:none`.
- `EditRulesModal.tsx:107-109,129-131,167` dùng input class đó bên trong shared Modal. `Modal.tsx:250,370` đưa DOM ra `document.body`. Modal không bọc `.phanca-root`, nên không kế thừa các biến feature của phần trang.
- Cùng pattern trong `EditShiftModal.tsx:392,427,506,710`, `AiSuggestPatternModal.tsx:296,307,342` và textarea ở dòng 376.
- Hậu quả CSS có thể xác định: declaration border/background/focus color dùng biến không định nghĩa trở thành invalid; `outline:none` vẫn còn, nên focus có nguy cơ không nhìn thấy. Không coi inheritance của React context là inheritance CSS.
- Cách sửa: chuyển các input/textareas này sang primitive shared và token semantic global; nếu giữ theme Phân Ca thì đưa theme vào scope thực sự của portal với fallback, tránh nhân bản màu.
- Nghiệm thu: modal quy tắc/đổi ca/AI có computed border/background/focus đúng trước và sau mở Phân Ca; Tab nhìn thấy focus; không còn biến undefined trong portal. Kiểm iPhone keyboard/zoom riêng.

### DS-02 — P2: CSS Phân Ca làm thay đổi animation của các khu vực khác

- `PhanCaView.tsx:3` nhập `phanca.css`; stylesheet không được gỡ khi đổi tab.
- `phanca.css:303-308` định nghĩa `@keyframes fadeIn` và `.animate-fade-in` toàn cục (0.3s, translateY 4px → 0). Trùng `styles.css:166-167,174` (0.2s, opacity).
- Dropdown shared (`Dropdown.tsx:131`) và Tooltip (`Tooltip.tsx:76`) dùng chính class này. Nhiều màn khác cũng dùng nó.
- Cùng file còn selector global `.config-input`, `.spinner`, `.glass` và `@keyframes spin`; việc chỉ scope custom property trên `.phanca-root` chưa cách ly stylesheet.
- Sửa: namespaced class/keyframe Phân Ca hoặc CSS module, đồng thời bảo đảm portal vẫn nhận style cần thiết; không chỉ thêm prefix khiến modal mất style.
- Nghiệm thu: computed animation/keyframe của Dropdown/Tooltip/màn khác không đổi giữa trước và sau lần đầu mở Phân Ca. Có bài kiểm chuyển tab để bắt lỗi phụ thuộc thứ tự nạp.

### DS-03 — P2: CSS blanket trong BI đè cả control shared

- `BiWrapper.tsx:198-215` inject `[class*="rounded-"] ... { border-radius:0 !important; }`. Không miễn trừ `[data-ui="shared"]` hoặc button/input/select/dropdown, chỉ miễn KPI/avatar/preserve-rounded.
- Shared `Button.tsx:80-86`, `Input.tsx:51`, `Select.tsx:36` đều có `rounded-md`. Khi DOM trong `.bi-report-module`, cùng primitive thành 0px; ở khu vực khác là 6px; modal portal ra body giữ 6px.
- Đây là xung đột CSS cụ thể, không chỉ khác design giữa hai màn. Rule muốn làm bảng vuông nhưng chọn mọi control.
- Sửa: selector chính xác cho container dữ liệu/bảng; component token quyết định control radius. Không dùng blanket class substring và `!important` để ép cả zone.
- Nghiệm thu: Button/Input/Select cùng variant có computed border-radius đồng nhất khi ở root, BI, modal và toolbar portal; bảng vẫn vuông.

### DS-04 — P2: Hành vi và khung modal chỉ được hợp nhất một phần

- Shared Modal `Modal.tsx:244,293` dùng 6px, `max-h-[90dvh]`, portal và body scroll, safe-area khi bottom-sheet.
- `features/line-bot/components/ScheduleEditModal.tsx:174-175` dùng backdrop local, `rounded-2xl`, `max-w-lg`, `max-h-[90vh]`; dùng `useModalBehavior` tại dòng 90 nên không nói là thiếu Escape/focus trap. `features/tax-calculator/components/ApiKeyConfigModal.tsx:69-70` có 16px và không có trần height/scroll ở khung, body dòng 90 cũng không scroll.
- Input lịch hẹn dòng 196 là nền slate-50/radius12/text12; shared input nền trắng/radius6/text14. Input API key dòng 104 lại border/focus/size riêng.
- Cách sửa: thay khung modal bằng shared Modal, bổ sung slots/header layout cần thiết; input dùng shared primitive. Giữ luồng save/submitting hiện có.
- Nghiệm thu: các modal có chung border/radius/backdrop/footer; ngăn xếp lồng, Escape, trả focus, scroll lock vẫn đúng; iPhone SE/keyboard mở vẫn tới được nút Save.

### DS-05 — P2: KPI nhỏ dưới sàn chữ; trạng thái/action của shared KPI chưa tổng quát

- `KpiCard.tsx:202,214,218` nhãn/giá trị phụ mobile là 10px, mặc dù DESIGN_SYSTEM sàn 11px. Đây là code dùng chung nên lan mọi caller. `IndustryKpiCard.tsx:200,209,217` thêm 10–10.5px; root không được mobile density CSS BI bù lên.
- Một số kích cỡ <11px là preview bản in/LINE mô phỏng có thể hợp lý; không dùng tổng count 89 text token dưới11 trong17files để bắt sửa toàn bộ. Ưu tiên KPI tương tác thật và toolbar trước.
- `KpiCard.tsx:126,159-164` mặc định `isGood=true`, luôn vẽ chấm “Đạt mục tiêu” khi không có badge. `CheckThuongSummaryCards.tsx:23-29,39-44` là số tổng kho/tổng thưởng, không truyền isGood/target, vẫn nhận trạng thái đạt kể cả số0. Nên có status neutral/unknown và chỉ mã hóa đạt khi có mục tiêu.
- `KpiCard.tsx:134-136` là div onClick không role/tabIndex/onKeyDown và có tooltip cố định “Cập nhật > Target Doanh thu”; Check thưởng Top1 (caller dòng63) thực tế chọn kho. Tooltip/action không đúng và chỉ dùng bàn phím không kích hoạt được.
- Sửa: token typography ≥11; explicit status enum, actionLabel/ariaLabel từ caller; button/link semantic khi clickable. Không tự chuyển mọi KPI thành vuông: test hiện yêu cầu 16px (DS-08).
- Nghiệm thu: KPI mobile/desktop theo scale chung, không chấm đạt ở KPI không có target; click/Enter/Space cùng hành vi, tooltip phản ánh đúng tính năng.

### DS-06 — P2: Touch target áp theo breakpoint khác layout mobile

- Button `Button.tsx:80-86`, Input `Input.tsx:51`, Select `Select.tsx:36` bỏ min44 từ `sm`=640. Trong khi app layout/icon coi dưới `lg`=1024 là mobile, DESIGN_SYSTEM ghi iPad dọc dùng mobile.
- iPhone landscape/iPad dọc 640–1023 có thể dùng icon button32px/input36px mặc dù đang trong giao diện mobile. `size="none"` còn không có min44 (ngoại lệ mật độ bảng đã ghi comment: không ép tất cả cell lên44).
- Sửa: thống nhất rule interactive control cho coarse pointer hoặc breakpoint đã chọn; có variant compact cho ô bảng với vùng chạm/hit area phù hợp. Không phình bảng máy tính.
- Nghiệm thu: toolbar/modal actions ≥44×44 ở iPhone dọc/ngang và iPad, bằng computed rect; cùng lúc laptop vẫn đạt mật độ thiết kế.

### DS-07 — P2/P3: Dropdown/toast/confirm còn nhiều đường triển khai

- Shared `Dropdown.tsx:128-130` dùng radius12/z50; `DropdownButton.tsx:192-194` radius8. Root `components/common/SingleSelectDropdown.tsx` dùng portal radius12/z999999, input search cục bộ, các menu options tự style; `components/common/MultiSelectDropdown.tsx` là implementation khác shared cùng tên. Không gộp trước khi đối chiếu contract search/multiselect/portal.
- `App.tsx:361` một Toaster với z999999 nhưng không toastOptions chung. DOM toast vẫn lặp ở `hooks/useExportLogic.ts:419,508`, `features/phan-ca/services/googleSheetsExport.ts:23,267`, `components/modals/UncollectedOrdersModal.tsx:314,329,337,424` với radius8/12, màu slate/green-600/red-600 hard-code, bottom24 không safe-area/theme chung.
- Browser confirm còn thực thi tại `DashboardView.tsx:232,234`, `FilteredCouponsTab.tsx:66`, `TaxCalculatorView.tsx:173,260`, trong khi chuẩn cấm và đã có ConfirmDialog. Dashboard dùng Cancel ở câu đầu để mở câu hỏi xóa TOÀN BỘ: UX hủy dễ hiểu sai; nên hiện lựa chọn phạm vi xóa rõ ràng.
- Sửa: facade toast (success/error/progress/action) dùng cùng host/token, ConfirmDialog cho thao tác rủi ro; shared popup positioning/style/keyboard vẫn giữ behavior từng loại chọn.
- Nghiệm thu: không còn native confirm ở code app, Cancel không khởi động một hành động xóa khác; popup đạt cùng radius/border/font, không bị cut bởi container, Escape chỉ đóng lớp trên, toast nằm trên safe-area.

### DS-08 — P2: Tài liệu, token và test mô tả những chuẩn trái nhau

- DESIGN_SYSTEM §0/§3 và CLAUDE:209-211 đòi vùng dữ liệu vuông, control4px, overlay6px, không shadow static.
- RULES:166-175 đòi ưu tiên rounded-lg/xl và table pastel; RULES:182-191 còn glass/pill toolbar và text-indigo primary. RULES được ghi ưu tiên cao hơn DESIGN_SYSTEM nên Claude dễ chọn “chuẩn” khác nhau.
- Token `styles/tokens.css:313,319,333,342` là card12/control8/modal16, trong khi console294 overlay6; `Button.tsx:62` dùng primary sky600, token console278 sky700, brand sky500.
- Shared `KpiCard.tsx:112-140` ghi “Executive Modern”, radius16 và gradient/shadow. `tests/e2e/kpi-style-real-user.spec.ts:17,44,74,91,105,119` yêu cầu KPI16px. `SectionCard.tsx:11-23`/barrel index còn trỏ DESIGN_SYSTEM_MODERN.md không tồn tại.
- Không thể kết luận user muốn bỏ KPI16px chỉ từ doc cũ: code+test biểu thị một chủ đích khác. Task đầu tiên cần chốt một spec áp dụng, liệt kê ngoại lệ KPI/preview/in/navigation và cập nhật doc/token/test đồng bộ.
- Nghiệm thu: một canonical spec; mỗi token/variant có giá trị hiệu lực rõ; không tài liệu mất file; test không bảo vệ style ngược spec.

### DS-09 — P2/P3: Bảng có chung màu nhưng chưa có primitive mật độ/trình bày chung

- Shared DataTable `DataTable.tsx:198-204` compact py6px hoặc normal py10px, text-sm (dòng333) và wrapper12px; không dùng console-row26, padding3px hay font-label token. Consumer tìm thấy tại `features/bi-dashboard/components/BiSupermarketMapAdmin.tsx:408` và `features/bi-dashboard/components/SupermarketConfig.tsx:889`.
- Root `SummaryTable.tsx:230-239`/`SummaryTableRow.tsx:204-215` có bảng thủ công, mobile chữ11px, nhiều background ô, viền header3px; mẫu mới mobile muốn chữ14.5px và viền trạng thái3px mép row. Phân Ca CSS:115-129 còn padding10/12px, font14, hợp lý có thể là lịch tương tác nhưng chưa ghi variant/ngoại lệ.
- `features/khai-thac/components/HistoryTab.tsx:35,87-88` dùng h28/header font-label/table13px khá gần console; bảng cùng app bên trên dùng style khác.
- Không ép bảng48cột vào API DataTable hiện thiếu merge header/row tree/inline editing. Nên shared TableFrame/Head/Cell/row density + token group/status, để renderer nghiệp vụ giữ riêng.
- Nghiệm thu: bảng số cùng variant đạt row/header/font/border/sticky/hover chung; khác biệt lịch tương tác/preview in có variant ghi rõ; iPhone vẫn dạng bảng, cuộn ngang trong khung, không tràn toàn trang.

## Thứ tự migration đề xuất

1. **D0** Chốt canonical spec và exceptions, resolve DS-08. Không tự đổi font UTM Avo hay bật dark. Không dùng “mọi KPI16 là sai” làm tiêu chí.
2. **D1** Sửa bug scope/portal/CSS nạp phụ thuộc tab (DS-01/02/03), test computed CSS trước/sau vào Phân Ca/BI; đây là ổn định UI, không cần redesign lớn.
3. **D2** Wire token semantics vào shared Button/Input/Select/Modal/popup; chuẩn hóa breakpoint touch (DS-04/06). Định nghĩa variant cần thiết và native field exceptions. Thêm Textarea primitive.
4. **D3** Migrate caller theo zone: Root → BI updater/nhân viên → Phân Ca → LINE/Thuế → các công cụ. Loại override màu/size/radius trừ bố cục; không chỉ đổi `<button>` thành `Button variant=unstyled` rồi giữ nguyên toàn bộ style.
5. **D4** KPI semantics/accessibility/typography (DS-05), shared frame cho Industry KPI và Performance modal; giữ cấu trúc số đặc thù. Consolidate Toast/Confirm/popup behavior (DS-07).
6. **D5** Shared table presentation primitives và mobile table tests (DS-09). Kiểm toàn bộ tab với seed data đại diện, không chỉ landing/login.
7. **D6** Regression: snapshots + computed token assertions tại1366×768,1440×900,390×844,375×667,844×390,768×1024; Chromium/WebKit và ít nhất iPhone Safari thật. Keyboard-only/VoiceOver/focus/scroll/stack test; kiểm component states loading/disabled/error/empty.

Tiêu chí cuối: đổi một token control radius/color/height làm đổi mọi component tương ứng; có explicit exceptions; không blanket CSS ảnh hưởng shared; không style phụ thuộc thứ tự tab; báo cáo đạt/chưa kiểm cho từng ma trận thiết bị.

## Giới hạn xác minh

Đã đọc và đối chiếu source component, caller và CSS. Root đang xử lý dependency/build; ở thời điểm này TypeScript module chưa khả dụng để thống kê AST. Đã thử fixture HTML riêng với CSS Phân Ca nguyên bản, nhưng Chromium headless không khởi động trong sandbox (`setsockopt` / `shutdown: Operation not permitted`); **chưa có computed style/browser proof** cho fixture hoặc toàn app. Không dùng lời bình lịch sử “đã đo thật” trong source như bằng chứng chạy lại của audit này. Các finding trên ghi cụ thể cơ chế code; chưa xác minh viewport trên iPhone thật.
