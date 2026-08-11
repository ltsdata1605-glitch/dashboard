# Kế hoạch: Audit & Nâng cấp module Report BI (`features/bi-dashboard/`)

> Ngày lập: 2026-08-11. Audit đọc toàn bộ ~85 file / ~21.700 dòng của module bằng 4 subagent song song (chia theo: Dashboard/Report views, Employee tabs, Competition/Bonus, Data layer). Dưới đây là tổng hợp finding + kế hoạch sửa theo mức ưu tiên.

## Nguyên tắc khi sửa
- Không đổi công thức tính doanh thu/DTQĐ hiện có trừ khi đúng là bug rõ ràng (nhầm biến/nhãn) — mọi thay đổi số liệu phải đối chiếu với view "đúng" song song đã xác định trong audit.
- Sửa theo từng nhóm nhỏ, commit riêng, chạy `npm run check` sau mỗi nhóm.
- Không refactor kiến trúc lớn (vd tách uiService.ts 1124 dòng) trong đợt này — chỉ ghi nhận, để đợt sau nếu được yêu cầu.

---

## PHASE 1 — Lỗi số liệu / logic thực sự (ưu tiên Cao, sửa trước)

| # | File:dòng | Vấn đề | Hướng sửa |
|---|---|---|---|
| 1.1 | `components/dashboard/MobileReportView.tsx:58-63` | Nhãn KPI mobile gán sai hoàn toàn (dtqd↔dtlk↔hqqd bị đổi tên) so với bản desktop `ReportView.tsx:40-45` | Sửa nhãn cho khớp bản desktop |
| 1.2 | `components/nhanvien/CompetitionCompareView.tsx:196-200` | Đếm bucket %DKHT chồng lấn: nhân viên No Sale bị đếm cả vào `dkhtNotDat` lẫn `noSale` | Sửa theo logic loại trừ lẫn nhau như `IndividualCompetitionView.tsx:212-215` |
| 1.3 | `components/dashboard/KpiOverview.tsx:154-158` | Thẻ "Bill Bán" (chế độ Luỹ kế) render trùng giá trị với thẻ "Trả Chậm" (`Math.ceil(tyTrongTraGop)`) | Kiểm tra field đúng cho "Bill Bán" trong `kpiData`, sửa lại |
| 1.4 | `components/dashboard/SummaryTableView.tsx:166-170` | Chèn cột `%HT Target (QĐ)` dùng `indexOf(value)` thay vì index → sai vị trí khi giá trị trùng (vd nhiều dòng "0%") | Đổi sang tính offset theo index thay vì tìm theo giá trị |
| 1.5 | `utils/dbMigration.ts:146-162` | `openDb()` migration thiếu `onblocked`/timeout → có thể treo vô thời hạn khi đa tab, chặn migrate dữ liệu cũ lúc khởi động | Áp dụng cùng cơ chế `onblocked` + timeout như `services/dbService.ts:14-85` |
| 1.6 | `utils/db.ts:149-166` (`get()`) | Thiếu xử lý `transaction.onerror/onabort` → Promise có thể treo vĩnh viễn nếu transaction bị abort | Bổ sung theo mẫu `set()`/`setMany()` cùng file |

## PHASE 2 — Code thừa / dead code (an toàn, giá trị cao, ít rủi ro)

| # | File | Vấn đề |
|---|---|---|
| 2.1 | `components/dashboard/DashboardWidgets.tsx:28-213` | ~180/214 dòng dead code (GaugeChart, KpiCard nội bộ, MainTabButton, SubTabButton, SupermarketNavBar không ai import) |
| 2.2 | `components/dashboard/IndustryView.tsx:59` + `components/dashboard/competition/CompetitionListView.tsx:55` | `const isMobile = false` cứng → nhánh mobile-card chết (~86 và ~66 dòng) |
| 2.3 | `components/nhanvien/RevenueTab.tsx:223`, `InstallmentTab.tsx:356`, `CrossSellingTab.tsx:444` | `isMobile=false` cứng → `RevenueMobileCard.tsx` toàn bộ file + `InstallmentMobileRow`/`CrossSellingMobileRow` chết hoàn toàn |
| 2.4 | `components/nhanvien/CrossSellingTab.tsx:53-108` | `AvatarUploader` không ai gọi, trùng logic với `shared/AvatarDisplay.tsx` |
| 2.5 | `CrossSellingTab.tsx:421`, `InstallmentTab.tsx:315` | `handleExportDataFile` không gắn nút nào |
| 2.6 | `CrossSellingTab.tsx:206-244`, `InstallmentTab.tsx:123-153` | `isHighlightFilterOpen`/`highlightRef` + listener chết, không UI nào dùng |
| 2.7 | `CrossSellingTab.tsx:21-51` | Tự định nghĩa lại `ImportPrevMonthModal` trùng với `revenue/ImportPrevMonthModal.tsx` đã có |
| 2.8 | `components/nhanvien/CompetitionTab.tsx:22-29`, `CompetitionGroupView.tsx:29` | `PALETTE`/`colorScheme` tính toán nhưng destructure bỏ, không dùng |
| 2.9 | `services/uiService.ts:77-126` | `showExportOverlay/updateExportOverlay/hideExportOverlay` không nơi nào gọi |
| 2.10 | `components/dashboard/ReportView.tsx` + `MobileReportView.tsx` | Logic `processedData` trùng ~100% → gộp thành 1 hook `useReportKpiData` dùng chung (giảm rủi ro lệch nhãn như finding 1.1 tái diễn) |
| 2.11 | `InstallmentTab.tsx:183-210` | Nhánh sort `p-dt-*` chết, không header nào gọi |

## PHASE 3 — Đồng bộ style (theo CLAUDE.md mục 2)

| # | File | Vấn đề | Hướng sửa |
|---|---|---|---|
| 3.1 | `components/nhanvien/revenue/ColorSettingsModal.tsx:6-16,38-44` | Bảng màu mặc định dùng cyan/vàng/cam/hồng/tím ngoài palette cho toàn bộ bảng Doanh thu | Đổi `VIVID_COLORS`/`DEFAULT_COLOR_SETTINGS` về palette sky/slate/emerald/amber/rose/indigo |
| 3.2 | `components/nhanvien/RevenueTab.tsx:114-119` (`getHtColor`) | Bộ màu hard-code riêng (đỏ/xanh lá/cam) song song với `colorSettings` đã có | Gộp dùng chung `colorSettings` |
| 3.3 | `components/nhanvien/CompetitionSummaryView.tsx:485,498` | Màu `violet`/`teal` ngoài palette + dựng class Tailwind bằng template literal (JIT có thể không sinh CSS ở production) | Đổi về palette đã duyệt, dùng class literal tĩnh (map cố định thay vì nội suy chuỗi) |
| 3.4 | `components/Dashboard.tsx:27-105` | Tự dựng `EmptyState` glassmorphism riêng thay vì `components/shared/ui/EmptyState` (trong khi `IndustryView`/`CompetitionView` cùng module đã dùng đúng) | Thay bằng `shared/ui/EmptyState` |
| 3.5 | `components/Dashboard.tsx:55,57,58` | `rounded-[32px]/[24px]/[20px]` vượt chuẩn | Đổi về `rounded-xl` |
| 3.6 | `components/NhanVien.tsx:336-382`, `DetailTab.tsx` (`LevelSelect`, `SearchableSelect`) | Tự dựng dropdown (useState+useRef+click-outside) thay vì `shared/ui/Dropdown`/`Select` | Thay bằng component chuẩn |
| 3.7 | `RevenueTab.tsx:249-254` | `<input type="checkbox">` thô trong khi module đã dùng `Switch` chuẩn ở chỗ khác cùng file | Thay bằng `Switch` |
| 3.8 | `components/SupermarketConfig.tsx` (nhiều dòng: 59-65, 86-101, 178-188, 379-397), `components/DataUpdater.tsx:111-121` | Input/textarea/range thô thay vì `shared/ui/Input`; `Slider` đã import nhưng không dùng ở dòng 379-385 | Thay bằng `shared/ui/Input`, dùng `Slider` đã import |
| 3.9 | `CompetitionCompareView.tsx:314`, `IndividualCompetitionView.tsx:500,316` vs `CompetitionGroupView.tsx:254`, `CompetitionSummaryView.tsx` | 4 view Competition* không đồng nhất: 2 view dùng glassmorphism (`rounded-2xl`, `backdrop-blur-xl`, `bg-white/95`) không có trong design system, 2 view còn lại đúng chuẩn flat/`rounded-xl` | Chuẩn hoá 2 view lệch về style flat giống `CompetitionGroupView`/`CompetitionSummaryView` |
| 3.10 | `SupermarketConfig.tsx:153-158` | `colorTheme="purple"` nhưng thực chất map sang class `indigo-*` — tên gây hiểu nhầm | Đổi tên giá trị thành `'indigo'` |
| 3.11 | `Settings.tsx:243`, `SupermarketConfig.tsx:79,332` | `rounded-2xl` lệch chuẩn `rounded-xl` | Đổi về `rounded-xl` |

*Không đổi:* class `dark:` cũ (theo CLAUDE.md không cần dọn), các Modal trong `bonus/` (đã đúng chuẩn `shared/ui/Modal`).

## PHASE 4 — Hiệu năng

| # | File | Vấn đề | Hướng sửa |
|---|---|---|---|
| 4.1 | `hooks/useDashboardLogic.ts:135-357` | `dataVersion` toàn cục không phân biệt siêu thị → deep-clone (`JSON.parse(JSON.stringify)`) **toàn bộ cụm** mỗi khi 1 target ở 1 siêu thị đổi | Scope lại theo siêu thị hoặc tránh deep-clone bằng JSON (clone nông theo phần cần sửa) |
| 4.2 | `hooks/useNhanVienData.ts:40-129` | Cùng pattern: đổi 1 key ở 1 siêu thị bất kỳ → fetch lại toàn bộ siêu thị đang active | Scope listener theo siêu thị đang xem |
| 4.3 | `hooks/useRevenueData.ts:90-95`, `InstallmentTab.tsx:168-171`, `CrossSellingTab.tsx:254-257` | `.find()` lồng trong `.map()` để tra cứu tháng trước → O(n×m) | Dựng `Map` tra cứu O(1) trước khi map |
| 4.4 | `hooks/useCompetitionData.ts:127-147`, `CompetitionCompareView.tsx:154-160` | `findIndex`/`.find()` trong vòng lặp render → O(n²) | Dùng `Map<name, index/employee>` |
| 4.5 | `CompetitionSummaryView.tsx` (`getEmployeeTongBot`/`getEmployeeNoSale`) | Gọi lặp 5 lần/render, không memo | Tính 1 lần bằng `useMemo` thành `Map` |
| 4.6 | `bonus/BonusDailyTable.tsx` | Logic xác định cuối tuần lặp lại 4 nơi, tạo `Date` object mỗi ô | Tính 1 lần thành `Record<string, boolean>` |
| 4.7 | `RevenueTab.tsx:84`, `InstallmentTab.tsx:147`, `CrossSellingTab.tsx:238` | `new Intl.NumberFormat()` tạo mới mỗi render, truyền prop `f` xuống row đã `React.memo` → vô hiệu hoá memo | Hoist ra module scope (theo mẫu `DetailTab.tsx:90-91`) |
| 4.8 | `components/TargetHero.tsx:418-424,206-211` | Object màu tạo mới trong `.map()`/mỗi render component | Hoist ra module-level constant |
| 4.9 | `services/employeeParser.ts:157-216` | `shortenSupermarketName` gọi lại mỗi dòng dù không đổi; rebuild `empWeights` mỗi dòng | Hoist ra ngoài vòng lặp trong |
| 4.10 | `utils/nhanVienHelpers.ts` (`parseCrossSellingData`/`parseInstallmentData`) | Fallback quét tuyến tính O(n) mỗi dòng, trong khi `parseCompetitionData` đã có `fastDeptMap` O(1) | Áp dụng cùng cơ chế cache map |
| 4.11 | `services/uiService.ts:1052-1124` (`fixOklchColors`) | `getComputedStyle` cho từng phần tử DOM khi export ảnh → reflow lặp lại, chậm với bảng lớn | Cân nhắc giảm phạm vi duyệt hoặc batch |
| 4.12 | `SummaryTableView.tsx:488-580`, `IndustryView.tsx:765-794` | `indexOf(header)` lặp trong 2 lớp `.map()` | Tính `Map<header,index>` 1 lần trước vòng lặp |

*Không sửa (đã kiểm tra, ổn):* `hooks/useWorker.ts` (worker singleton đúng chuẩn), job runner nhiều tháng (`bonusJobRunner.ts`/`useMultiMonthBonusRun.ts`, chạy tuần tự async, không chặn UI).

## PHASE 5 — Ghi nhận, không sửa trong đợt này (rủi ro thấp/giá trị thấp hoặc cần quyết định sản phẩm)
- `components/shared/Badges.tsx:27` — `DeltaBadge` bỏ qua so sánh khi `previous===0` — cần hỏi ý định sản phẩm trước khi đổi hành vi hiển thị.
- Bất nhất dòng TỔNG CỘNG khi lọc bộ phận giữa 3 tab (`InstallmentTab` ẩn, `RevenueTab`/`CrossSellingTab` hiện) — cần xác nhận hành vi mong muốn.
- `services/uiService.ts` 1124 dòng gánh 4 trách nhiệm — chỉ tách khi có yêu cầu cụ thể (theo CLAUDE.md mục 3).
- Trùng lặp danh sách 33 ngành hàng cấp 0 giữa `dashboardHelpers.ts`/`detailDataParser.ts`, `Criterion` type trùng 2 nơi, `getYesterdayDateString` trùng ở `SummaryTableView.tsx` — dọn dạng "gộp nguồn chung" nhưng không đổi hành vi, mức ưu tiên thấp.
- `window.open` MWG không giữ handle để đóng tab — phụ thuộc userscript ngoài phạm vi.
- `useBonusAutoBridge.ts` thiếu `isMounted` guard (không leak/crash ở React 18, chỉ thiếu nhất quán).
- `configStore.ts` 2 lượt `emitChange()` cho 1 lần load.
- `industryBiMap` gửi lại qua postMessage mỗi lần parse dù gần như tĩnh.

---

## Trình tự thực hiện
1. Phase 1 (bug số liệu) → commit → `npm run check`
2. Phase 2 (dead code) → commit → `npm run check`
3. Phase 4 (hiệu năng, rủi ro thấp vì không đổi output) → commit → `npm run check`
4. Phase 3 (style, ảnh hưởng UI trực quan nhiều nhất) → commit → `npm run check` → test UI thủ công các view chính
