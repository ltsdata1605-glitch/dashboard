# Rà soát sâu toàn bộ module "Report BI" (features/bi-dashboard/, ~85 file/~22.000 dòng)

## Bối cảnh
User yêu cầu lần 2 (lần đầu ~2026-08-11/12, xem memory `project_report_bi_audit_2026_08.md`):
xoá code thừa/chức năng không dùng/code lỗi/xung đột, đồng nhất size chữ/màu sắc/font
chữ/thiết kế toàn bộ module + mọi modal.

Trước khi bắt đầu: phát hiện 9 file trong bi-dashboard có thay đổi CHƯA COMMIT (không
phải của tôi) — xác nhận với user đây là việc đang làm dở của user, đã commit riêng
(`79ea69d3`) làm checkpoint trước khi rà soát.

Đã chạy 4 agent song song (dead code, logic bug/xung đột, design-system compliance,
typography/spacing) đọc toàn bộ module. Tổng hợp bên dưới.

## Tier 1 — Bug/lỗi chức năng thật (ưu tiên cao nhất)

1. **[REGRESSION nghiêm trọng]** `RevenueTab.tsx`: nút mở modal "Cấu hình màu hiển thị"
   (`isColorModalOpen`) đã được thêm ở đợt audit trước (commit `32bedb90`, 2026-08-12)
   nhưng bị XOÁ MẤT trong commit checkpoint `79ea69d3` (việc đang làm dở của user) —
   tính năng hiện KHÔNG THỂ MỞ được từ UI. Cần thêm lại nút + `CogIcon`.
2. **ProgressBar bỏ sót ngưỡng màu amber 85-99%** — copy-paste giống hệt ở 3 nơi:
   `DashboardWidgets.tsx:30-33` (dùng ở `CompetitionListView.tsx:141`),
   `IndividualCompetitionView.tsx:27-33` (bản duplicate riêng), `CompetitionGridView.tsx:72-78`
   (inline duplicate). Giá trị [85,100) không khớp nhánh nào → rơi về màu mặc định
   (ở CompetitionGridView có thể trùng màu với "đã đạt 100%"). `CompetitionGridView.tsx`
   còn có `percentColor` dùng ngưỡng 2 bậc khác (`<85`/`>=85`, không có bậc 50%) → % chữ
   và thanh bar có thể lệch màu nhau.
3. **[Ảnh hưởng rộng] `parseEmployeeCompetitionTargets` (employeeParser.ts:185-225) bỏ
   qua số nhân viên/phòng ban khi chia target** — gán thẳng `departmentWeights` (vốn là %
   theo PHÒNG BAN) cho từng nhân viên rồi mới chuẩn hoá theo tổng trọng số nhân viên,
   không chia cho `employeeCount` như `useRevenueData.ts:89-91` đã làm đúng. Kết quả:
   nhân viên ở phòng ban đông người bị target thổi phồng (%HT bị dìm ảo thấp), phòng ban
   ít người bị target hụt (%HT bị đẩy ảo cao). Ảnh hưởng toàn bộ tab "Nhân viên > Thi đua"
   (CompetitionTab/IndividualCompetitionView/CompetitionGroupView/CompetitionSummaryView/
   CompetitionCompareView).
4. **`hasTreeData` (useIndustryViewLogic.ts:166) không xét `isRealtime`** — luôn đọc
   `luykeData.tree`, trong khi các biến tree khác trong cùng hook (`allSubIndustries`,
   `treeDisplayRows`, `expandAll`) đều đúng đắn switch theo `isRealtime`. Nếu user chỉ
   dán "Ngành hàng Realtime" (chưa dán Luỹ kế) và đang xem tab Realtime: bảng cây hiện
   đầy đủ nhưng nút Mở rộng/Thu gọn tất cả + dropdown "Lọc nhóm hàng" bị ẩn sai.
5. **`CompetitionGridView.tsx:46-70` không guard `header === undefined`** như
   `CompetitionListView.tsx` đã làm (fix cũ) cho cùng 1 causal bug ở
   `parseCompetitionDataBySupermarket()` (headers bị ghi đè last-write-wins không đồng bộ
   với `.data` của từng chương trình) — có thể đọc nhầm cột Target/Actual/%HT (sai số,
   không crash, không cảnh báo).

## Tier 1b — Tính năng dở dang/không thể dùng được (CẦN QUYẾT ĐỊNH: khôi phục hay xoá)

6. `isMobile = false` hard-code ở `IndividualCompetitionView.tsx:498` (chết ~55 dòng
   nhánh card mobile) và `BonusTab.tsx:87` (chết ~62 dòng + toàn bộ file
   `BonusMobileCard.tsx` 39 dòng không bao giờ render).
7. `Card.tsx` prop `rounded` bị destructure nhưng không dùng ở đâu trong hàm — 6 nơi gọi
   `rounded={false}` kỳ vọng có tác dụng (IndustryView/CrossSellingTab/RevenueTab/
   InstallmentTab/BonusTab/CompetitionTab) đều vô hiệu.
8. Tính năng "ghim/highlight nhân viên" chỉ hoạt động ở RevenueTab (có
   `handleHighlightToggle` + prop `onHighlightToggle`); CrossSellingTab/InstallmentTab
   đọc `highlightedEmployees` nhưng KHÔNG có cách bật (thiếu setter + prop wiring).
9. `DetailTab.tsx`: ô tìm kiếm cây sản phẩm/nhân viên hoàn toàn không có UI — state
   `searchQuery`/filter logic tồn tại và hoạt động (dùng ở dòng 356/408/413) nhưng
   `setSearchQuery` không được gọi ở đâu.
10. `DetailTab.tsx`: `isAllExpanded` set nhưng không đọc ở đâu — có vẻ định dùng đổi icon
    nút Mở rộng/Thu gọn nhưng chưa làm UI.
11. `Settings.tsx`: toàn bộ tính năng "quản lý Snapshot" (state, effect fetch hết DB lúc
    mount, handler xoá) tồn tại nhưng không có UI danh sách snapshot nào render — vừa là
    code chết vừa gây đọc thừa toàn bộ IndexedDB mỗi lần mở Settings.
12. `TargetHero.tsx`: `CompactTargetItem` nhận prop `onReset` nhưng không render nút gọi
    nó — 3 handler reset (Tổng target/Trả góp/Quy đổi) không thể bấm được.
13. `TargetHero.tsx`: prop `addUpdate` (ghi log "cập nhật gần đây") không được gọi ở đâu
    trong file — khác `CompetitionTarget` (SupermarketConfig.tsx:391) có gọi đúng — sửa
    target Doanh thu không được ghi log trong khi sửa target Thi đua thì có.
14. `DataUpdater.tsx`: prop `onNavigateToDashboard` (BiWrapper truyền vào, chuyển tab
    sang Dashboard) không được gọi ở đâu — có thể thiếu nút "Xong, xem Dashboard".
15. `IndividualCompetitionView.tsx`: `exportProgress` được set đúng trong vòng lặp xuất
    ảnh hàng loạt nhưng không render UI hiển thị tiến độ (vd "3/12 xuất ảnh...").
16. `RevenueTab.tsx`: toàn bộ nhánh "snapshot-compare" (so sánh hiệu suất theo thời gian)
    bị stub cứng từ `NhanVien.tsx:364` (mọi prop truyền `null`/no-op) từ lúc tạo file
    (2026-05-24) — tồn đọng lâu dài, không phải regression mới.

## Tier 2 — Dead code an toàn xoá (export/import/local không ai dùng, xác nhận qua tsc + grep)

17. 8 icon export chết trong `Icons.tsx`: `DocumentDuplicateIcon`, `StoreIcon`,
    `SunIcon`, `MoonIcon`, `PrinterIcon`, `FileTextIcon`, `CreditCardIcon`,
    `LineChartIcon`.
18. `NhanVien.tsx:2` — 4 import chết: `LineChartIcon`, `FilterIcon`, `CreditCardIcon`,
    `SparklesIcon`.
19. `types/nhanVienTypes.ts:26` — interface `CompetitionDataForCriterion` không ai dùng.
20. `bonusTableHelpers.tsx` — `getMondayOfDate`/`getWeekDates` chết (import duy nhất ở
    `useBonusViewData.ts:6` cũng chết).
21. `useWorker.ts:1` — cả dòng import `useEffect, useRef, useCallback` chết (đã refactor
    sang singleton module-scope, quên dọn import).
22. `dashboardHelpers.ts:274` — biến local `tree` trong `buildIndustryTree()` chết (hàm
    build/return `finalTree` riêng).
23. ~30 chỗ unused import/local/param rải rác nhiều file (Dashboard.tsx, CompetitionView.tsx,
    SummaryTableView.tsx, IndustryView.tsx, DataUpdater.tsx, BonusGroupListTable.tsx (props
    sortField/sortDir chết — bảng không có chỉ báo cột đang sort!), CompetitionCompareView.tsx,
    CompetitionTab.tsx, DetailTab.tsx, IndividualCompetitionView.tsx (gồm `donutSegments`
    tính nhưng không render), InstallmentTab.tsx, RevenueTab.tsx, AvatarDisplay.tsx (prop
    `supermarketName` không dùng — cache key avatar chỉ theo tên, có thể trùng avatar giữa
    2 nhân viên cùng tên khác siêu thị), Settings.tsx, Slider.tsx, SupermarketConfig.tsx,
    useDashboardLogic.ts, useIndustryViewLogic.ts, imageExport.ts, dashboardHelpers.ts.

## Tier 3 — Vi phạm chuẩn thiết kế (CLAUDE.md) + trùng lặp

24. **83 chỗ / 27 file** dùng `Button variant="ghost"` kèm className reset toàn bộ style
    (`bg-transparent border-0 rounded-none h-auto w-auto p-0 ...`) thay vì dùng sẵn
    `variant="unstyled" size="none"` (đã có, chỉ 9 nơi dùng đúng).
25. **6+ dropdown tìm kiếm tự dựng** trùng `MultiSelectDropdown`/`Dropdown` đã có sẵn:
    `DetailTab.tsx` (SearchableSelect), `CompetitionCompareView.tsx` (EmployeeSelector),
    `SupermarketConfig.tsx` (GroupCombobox), `IndividualCompetitionView.tsx` (inline,
    nằm ngay cạnh 1 chỗ dùng đúng MultiSelectDropdown trong cùng file),
    `CompetitionTab.tsx` (panel "Highlight" mới, nằm ngay cạnh chỗ dùng đúng
    MultiSelectDropdown trong cùng file — bằng chứng rõ nhất), `CompetitionSummaryView.tsx`,
    `IndustryView.tsx` (2 chỗ), `SummaryTableView.tsx`.
26. ~20 chỗ `<input>` thô thay vì `components/shared/ui/Input.tsx`, bo góc không đồng nhất
    giữa các chỗ thô (`rounded-md`/`rounded`/`rounded-xl` lẫn lộn cho cùng vai trò).
27. Hex màu lệch tông: `IndividualCompetitionView.tsx:226-229` dùng đỏ thô `#dc2626`
    (Tailwind red-600, KHÔNG phải rose) trong khi `RevenueTab.tsx` (đã sửa đợt trước) dùng
    đúng `#f43f5e` (rose-500) cho cùng khái niệm "kém/tốt/trung bình".
28. Modal-modal lệch nhau: `SupermarketConfig.tsx` (BulkRenameModal) title tự custom khác
    style mặc định của `Modal`; 6/9 modal tự dựng nút footer theo pattern reset ở mục 24
    (3 modal dùng `Button` sạch: TargetHero/KpiOverview/AutoBonusRangePickerModal); nút
    primary ở SupermarketConfig dùng gradient riêng khác các modal khác (flat `bg-sky-600`);
    `ColorSettingsModal` nút phụ `text-xs` lệch cỡ chữ so với các modal khác đều `text-sm`.
29. `dark:` class MỚI vẫn đang được thêm liên tục (317 dòng thêm trong tháng 8, 99 dòng
    chỉ trong 10 ngày gần nhất, gồm cả trong code mới ở mục 25 CompetitionTab.tsx) — vi
    phạm đang tiếp diễn, không phải cruft cũ.
30. `z-[999999]` mới (panel "Highlight" ở CompetitionTab.tsx) lệch hẳn quy ước module
    (`z-[100]`/`z-50`).

## Tier 4 — Đồng nhất size chữ/font/spacing (yêu cầu chính của user)

Nguyên nhân gốc theo cả 2 agent: bi-dashboard KHÔNG có primitive `Table`/`TableHeaderCell`/
`IconButton` dùng chung như `Card`/`Modal`/`Button`/`EmptyState` đã có — mọi nơi tự dựng
`<thead>/<th>/<td>`/icon-button nên mỗi file chọn số px riêng.

31. Header bảng: đa số dùng `text-[11px] font-black uppercase tracking-wider` (~11 file,
    coi là chuẩn thực tế của module) — outlier: `SummaryTableView.tsx:436`
    (`text-[10px] sm:text-[12px] font-bold`, có responsive lạ), `DetailTab.tsx:579`
    (`font-bold` không phải `font-black`), `MultiMonthResultDetailModal.tsx`/
    `AutoBonusErrorDetailModal.tsx` (không có size/uppercase/tracking gì cả).
32. Cell dữ liệu: đa số `text-[13px]` — outlier `CompetitionGroupView.tsx`
    (`text-[10px]`/`text-[11px]`), `MonthlyBonusTable.tsx` (`text-xs`), 2 modal ở mục 31
    (không set size).
33. Ô textarea "dán dữ liệu thô": 4 file, 4 size khác nhau (`text-[10px]`/`[11px]`/`[12px]`/
    `text-xs sm:text-sm`).
34. Tiêu đề "banner thi đua": 4 file, 4 tổ hợp size/leading/tracking khác nhau.
35. Nhãn tiểu mục kiểu "vạch màu + chữ hoa nhỏ": 5 file, 5 tổ hợp size/tracking khác nhau.
36. Icon cùng vai trò lệch size nhiều nơi: PencilIcon (3 size), TrashIcon (4 size, kể cả
    lệch NGAY TRONG CÙNG 1 FILE ở TargetHero.tsx và DataUpdater.tsx), FilterIcon (3 size +
    tự mâu thuẫn trong CompetitionSummaryView.tsx), ChevronDownIcon (3 size), ClockIcon
    (3 size, lệch ngay trong SupermarketConfig.tsx). `CompetitionSummaryView.tsx` toàn bộ
    toolbar icon to hơn 40-70% mọi tab "Nhân viên" khác.
37. Icon stroke-width trộn 2 và 1.5 không theo quy tắc rõ ràng.
38. Padding ô bảng: header cột "Nhân viên" dao động `py-1`→`py-3` (4 mức) cho cùng vai
    trò; `RevenueDesktopRow.tsx` vs `BonusDesktopRow.tsx` lệch padding ngang 2x;
    `CompetitionCompareView.tsx` cell padding ngang gấp 2-4x các bảng thi đua khác;
    2 modal ở mục 31 padding rộng hơn hẳn mọi bảng khác trong module.
39. `InstallmentTab.tsx`: viền dưới header cột "Nhân viên" mỏng/xám khác hẳn các cột khác
    CÙNG DÒNG header (dày/có màu) — lệch ngay trong 1 file.
40. Heading hierarchy: `SupermarketConfig.tsx` tiêu đề section nhỏ hẳn (`text-[11px]`) so
    với chuẩn 3-file khác (`text-sm sm:text-base lg:text-lg`); `CompetitionGridView.tsx`
    dùng `font-medium` (duy nhất) + border riêng.
41. Modal: `AutoBonusRangePickerModal.tsx` footer dùng `Button` sạch → bo góc `rounded-md`
    khác hẳn 6 modal còn lại dùng pattern reset → `rounded-xl`; `ColorSettingsModal.tsx`
    nút phụ `text-xs` lệch; `BonusDataModal.tsx` title custom + badge lệch 6 modal còn lại
    chỉ truyền string thường.

## Kế hoạch thực thi — ĐÃ HOÀN THÀNH (2026-08-29)

- **Lô A** (commit `595018ae`): Tier 1 mục 1-4 ✅ DONE. Mục 5 (CompetitionGridView.tsx
  thiếu guard header undefined) ⏸️ DEFERRED — sửa đúng cần đổi cấu trúc dữ liệu
  `parseCompetitionDataBySupermarket()` (lưu header riêng theo từng chương trình thay vì
  chung theo siêu thị), rủi ro cao hơn lợi ích, cùng logic đã quyết định KHÔNG sửa ở
  `CompetitionListView.tsx` đợt audit trước.
- **Lô B** (commit `7cf41666`, `01d4ae3f`): Hỏi user qua AskUserQuestion cho mục 6/11/16
  — cả 3 chọn "xoá". Mục 6 ✅ xoá code card mobile chết + xoá file BonusMobileCard.tsx.
  Mục 11 ✅ xoá toàn bộ tính năng Snapshot Settings chết. Mục 16 ✅ xoá toàn bộ plumbing
  snapshot-compare chết (RevenueTab + useRevenueData + NhanVien + types). Mục 7,8,9,10,
  12,13,14,15 ✅ DONE — nối lại UI còn thiếu cho state/logic đã có sẵn (rủi ro thấp, ý
  định rõ ràng từ chính code + comment).
- **Lô C** (commit `81527d15`): Tier 2 mục 17-23 ✅ DONE toàn bộ — dọn hết theo xác nhận
  `tsc --noUnusedLocals --noUnusedParameters` (0 cảnh báo còn lại trong bi-dashboard/).
  Tiện thể xoá luôn code donut chart cũ đã bị thay thế (giải quyết mục 27 hex màu sai
  luôn), thêm chỉ báo sort ↑/↓ còn thiếu ở BonusGroupListTable.tsx.
- **Lô D** (commit `bb48a63c`, `24e632a4`, `b4b9c201`, `71c817df`): Tier 3 + phần Tier 4:
  - Mục 24 ✅ DONE — thực tế 84 chỗ / 30 file (không phải 83/27 như audit ban đầu ước
    lượng, có nhiều biến thể cụm reset khác nhau chưa khớp hết lúc đếm sơ bộ). Xác nhận
    0 kết quả còn lại khi grep `bg-transparent hover:bg-transparent`.
  - Mục 25 ⏸️ DEFERRED có chủ ý sau khi điều tra kỹ từng trường hợp — KHÔNG phải "quên
    dùng component chung" đơn thuần như audit ban đầu nghĩ:
    - `DetailTab.tsx`/`CompetitionCompareView.tsx`/`IndividualCompetitionView.tsx`/
      `SupermarketConfig.tsx` (GroupCombobox): đơn-chọn + tìm kiếm — không khớp hình dạng
      `MultiSelectDropdown` (multi-chọn qua checkbox), không có component chung tương
      đương — ĐÃ quyết định giữ nguyên ở đợt audit trước (xem memory), giữ nguyên quyết
      định đó.
    - `IndustryView.tsx` (2 chỗ): dùng `Switch` toggle ẩn/hiện theo từng dòng
      (`hiddenIndustries`/`hiddenSubIndustries`) — khác hẳn ngữ nghĩa "chọn" của
      `MultiSelectDropdown`, đổi sẽ đảo ngược logic + đổi hẳn kiểu control, rủi ro UX.
    - `CompetitionTab.tsx` (panel "Highlight"): ĐÚNG là multi-chọn nhân viên (khớp
      `MultiSelectDropdown` về mặt ngữ nghĩa) nhưng có chấm màu (`getEmployeeDotColor`)
      cho từng nhân viên mà `MultiSelectDropdown` không hỗ trợ custom render theo từng
      lựa chọn — chuyển sẽ mất tính năng này hoặc phải mở rộng API component dùng chung
      toàn app (rủi ro lan rộng ngoài phạm vi Report BI). Đã nâng cấp riêng ô tìm kiếm
      sang `Input` (Lô D phần 2) — phần dropdown/panel giữ nguyên.
    - `CompetitionSummaryView.tsx`, `SummaryTableView.tsx`: đã nâng cấp ô tìm kiếm bên
      trong sang `Input`, phần khung dropdown giữ nguyên tương tự lý do trên.
  - Mục 26 ✅ DONE — 13 ô input tìm kiếm/tên chuyển sang `Input` dùng chung (không phải
    ~20 như ước lượng ban đầu — phần còn lại xác nhận là type=number/range/date, không
    có component chung tương đương, đúng như audit ghi chú).
  - Mục 27 ✅ DONE (giải quyết trong Lô C khi xoá code donut chart chết chứa hex sai).
  - Mục 28, 41 ✅ DONE một phần — bo góc rounded-xl→rounded-md cho 8 nút footer modal
    (7 file), text-xs→text-sm nút phụ ColorSettingsModal, bỏ gradient riêng
    SupermarketConfig.tsx. Title tự custom (`BulkRenameModal`, `BonusDataModal` có badge
    "Batch Mode") GIỮ NGUYÊN — mang thông tin chức năng thật, không phải lệch ngẫu nhiên.
  - Mục 29 (dark: class mới) — GHI NHẬN, không xử lý: CLAUDE.md chỉ cấm class MỚI, không
    yêu cầu dọn class cũ; việc dọn hàng loạt dark: đang hoạt động (dù vô hiệu do dark mode
    tắt) ngoài phạm vi yêu cầu lần này.
  - Mục 30 (z-[999999]) — GHI NHẬN, không xử lý riêng (thuộc panel Highlight ở mục 25,
    đã quyết định giữ nguyên phần đó).
  - Mục 31, 39 (2 outlier header + border InstallmentTab) ✅ DONE.
  - Mục 32-38, 40 (padding/icon-size/textarea/banner/tick-bar-label/heading còn lại)
    ⏸️ DEFERRED — sau khi kiểm tra vài trường hợp cụ thể (VD TrashIcon 2 size trong
    DataUpdater.tsx), phát hiện phần lớn là do KHÁC VAI TRÒ UI thật (icon-button độc lập
    compact vs icon+label trong toolbar), không phải lệch ngẫu nhiên như audit ban đầu
    liệt kê gộp chung — khối lượng còn lại rất lớn (~10 file icon, ~10 file padding, 4
    file textarea, 4 file banner, 5 file tick-bar-label) và cần rà từng trường hợp riêng
    lẻ để tránh "sửa nhầm" chỗ đang đúng theo ngữ cảnh. Nguyên nhân gốc (không có
    primitive `TableHeaderCell`/`IconButton` dùng chung) vẫn đúng — nếu làm tiếp nên cân
    nhắc tạo 2 primitive này trước thay vì sửa tay từng file.

Toàn bộ 8 commit của Lô A-D đều qua `npm run check` (typecheck + eslint + build +
lint-ratchet) sạch trước khi commit.

## Đợt 2 — Đánh giá độ hoàn thiện logic/tính năng + nâng cấp bảng (2026-08-29/30)

User hỏi tiếp: logic/tính năng Report BI đã hoàn thiện production-grade chưa, cần nâng
cấp gì; đồng thời muốn nâng cấp giao diện bảng hiện tại chuyên nghiệp hơn nhưng GIỮ
NGUYÊN phong cách thiết kế đang có (không redesign toàn bộ).

**Đánh giá độ hoàn thiện**: chạy agent rà soát riêng, tìm ra các khoảng trống chức năng
(gaps). Hỏi user ưu tiên qua AskUserQuestion — user chọn làm ngay 2/16 mục có tác động cao
nhất, phần còn lại chọn "chỉ ghi nhận vào kế hoạch, chưa làm ngay":

- ✅ **DONE** (commit `c424e06e`) — Lưu lịch sử Thi đua Luỹ kế theo ngày: trước đây dán
  dữ liệu Thi đua mới là mất trắng bảng xếp hạng cũ, không xem lại được thi đua hôm
  qua/tuần trước. Đã thêm `features/bi-dashboard/utils/competitionHistory.ts` — tự động
  lưu snapshot mỗi siêu thị vào IndexedDB theo ngày (upsert theo `getLocalDateKey()`,
  giữ tối đa 60 ngày) ngay khi dán Luỹ kế mới; `CompetitionView.tsx` thêm nút "Lịch sử"
  (view Luỹ kế) mở dropdown chọn ngày cũ xem lại, có banner "đang xem lịch sử" + nút "Về
  trực tiếp". Đã kiểm thử end-to-end bằng Playwright (dán dữ liệu → xác nhận IndexedDB →
  dán lại cùng ngày xác nhận upsert không nhân đôi → seed thêm 1 ngày cũ → xem qua UI →
  quay lại trực tiếp) — không lỗi console.
- ✅ **DONE** (commit `c424e06e`) — Sửa Auto Bonus bỏ sót nhân viên tên sai khuôn: nhân
  viên có tên không đúng khuôn "Tên - Mã NV" trước đây bị `.filter()` loại khỏi job tính
  điểm thưởng âm thầm, không xuất hiện trong summary, khiến toast "N/N thành công" sai
  lệch so với tổng số nhân viên thật. Sửa ở `useBonusAutoBridge.ts` (chạy 1 tháng) và
  `useMultiMonthBonusRun.ts` (chạy nhiều tháng) — vẫn tính các nhân viên này vào tổng,
  đánh dấu `status: 'error'` kèm lý do rõ trong kết quả cuối; modal chi tiết nhiều tháng
  (`MultiMonthResultDetailModal.tsx`) hiển thị danh sách tên bị bỏ qua.
- ⏸️ **GHI NHẬN, CHƯA LÀM** (theo lựa chọn tường minh của user, không phải quên) — các
  mục còn lại từ đánh giá độ hoàn thiện, liệt kê theo nhãn ngắn (chi tiết đầy đủ từng mục
  nằm trong báo cáo agent gốc, không chép lại ở đây để tránh số liệu cũ/sai lệch theo thời
  gian — cần đọc lại code hiện tại nếu triển khai về sau thay vì tin theo mô tả cũ):
  audit trail (ai sửa gì khi nào), phân quyền theo từng siêu thị, safety net cho hành
  động "Làm mới tất cả" (xoá toàn bộ dữ liệu không hoàn tác được), biểu đồ/trực quan hoá
  xu hướng theo thời gian, so sánh tháng trước ở `DetailTab.tsx`, giới hạn lưu trữ lịch sử
  Auto Bonus, banner cảnh báo dữ liệu đã "hỏng"/ported, xử lý edge-case target = 0 (empty
  state), bảo vệ khỏi trôi tên phiên bản thi đua, xuất Excel/CSV, hỗ trợ in ấn.

**Nâng cấp giao diện bảng**: đã dựng artifact so sánh 3 hướng thiết kế (Hiện tại /
Enterprise Tinh Gọn / SaaS Hiện Đại) dùng đúng cấu trúc cột + dữ liệu mẫu thực tế của
`RevenueTab`, tôn trọng palette/font hiện tại của app — gửi link cho user để chọn hướng.
✅ User đã chọn hướng **Enterprise Tinh Gọn** — xem chi tiết triển khai ở "Đợt 3" bên dưới.

## Đợt 3 — Triển khai toàn bộ hạng mục còn treo của Đợt 2 (2026-08-31)

User yêu cầu "thực hiện các công việc còn treo chưa làm". Trước khi code, chạy 4 agent
khảo sát song song (đọc code thật hiện tại, KHÔNG dựa vào nhãn ngắn cũ) để có kế hoạch
chính xác, sau đó hỏi lại 4 quyết định thật sự cần user (AskUserQuestion) trước khi bắt
tay code. Kết quả khảo sát quan trọng cần nhớ nếu quay lại dở dang:

- **Phân quyền theo siêu thị**: KHÔNG có nền móng nào sẵn có (không field user, không
  collection Firestore/`khoData`-tương-đương, không mapping user↔siêu thị). Report BI
  dùng chung 100% Auth/Firestore project với root nhưng dữ liệu riêng tư tuyệt đối theo
  từng UID — không có khái niệm "nhiều người cùng xem 1 bộ dữ liệu bị giới hạn theo siêu
  thị" như hiện tại. Muốn làm bảo mật thật phải sửa Cloud Functions + Firestore Rules +
  dựng lại tầng lưu trữ dữ liệu dùng chung (kiến trúc mới, nhiều ngày). User chọn **tách
  thành yêu cầu riêng sau, KHÔNG làm trong đợt này** — cần chốt mô hình nghiệp vụ thật
  (1 tài khoản dùng chung nhiều nhân viên hay mỗi người 1 tài khoản cần bảo mật thật)
  trước khi lên kế hoạch tiếp.
- **Xuất Excel/CSV, Hỗ trợ in ấn**: KHÔNG được chọn ở vòng hỏi ưu tiên lần 2 (chỉ chọn 9
  mục + redesign bảng) — vẫn ở trạng thái ghi nhận, chưa làm.

### Lô 1 — An toàn dữ liệu, rủi ro thấp, độc lập ✅ DONE (commit `3004f125`)
1. **Safety net khôi phục từ file**: `Settings.tsx` và `Dashboard.tsx` có 2 luồng "Khôi
   phục từ File" TRÙNG LẶP (copy-paste), cả 2 gọi `db.clearStore()` NGAY khi file JSON
   hợp lệ về cấu trúc, KHÔNG qua `ConfirmDialog` nào — khác với nút "Làm mới tất cả"
   (`DataUpdater.tsx`) vốn ĐÃ an toàn từ trước. Gộp 2 luồng thành
   `features/bi-dashboard/utils/backupRestore.ts`, thêm `ConfirmDialog` xác nhận trước
   khi ghi đè (hiện số mục sẽ mất), validate thêm `metadata.appName` để tránh restore
   nhầm file JSON khác cấu trúc tình cờ khớp mảng object.
2. **Giới hạn lưu trữ Auto Bonus**: `bonus-history-${sm}-${name}` đã có cap 30 phần tử
   nhưng logic lặp lại y hệt ở 2 nơi (`useNhanVienData.ts`, `BonusDataModal.tsx`) — gộp
   thành 1 hàm dùng chung trong `utils/bonusHistory.ts`. `bonus-monthly-${sm}-${yyyymm}`
   HOÀN TOÀN KHÔNG có giới hạn — mỗi tháng tạo thêm N key mới vĩnh viễn (N = số siêu
   thị), các key này đều `isHeavySyncKey=true` nên phình cả Firestore theo thời gian.
   Thêm `pruneOldBonusMonthlyKeys()` (giữ 12 tháng, dư so với `monthsWindow=6` đang hiển
   thị), gọi 1 lần lúc mount `BiWrapper.tsx` cạnh `migrateClusterDataToMain()` sẵn có.

### Lô 2 — Chống trôi tên phiên bản thi đua ✅ DONE (commit `17f00b03`)
Làm nhẹ hơn kế hoạch gốc — KHÔNG cần thêm `id` ổn định/migration (rủi ro migration
không xứng đáng so với lợi ích): trim + nút "Cập nhật" trực tiếp + badge "chưa lưu"
đã giải quyết triệt để 2/3 nguyên nhân gốc (trim, thiếu đường cập nhật) mà không cần
đổi mô hình định danh. Nguyên nhân gốc còn lại (key không scope siêu thị) xử lý bằng
reset `activeVersionName` khi đổi siêu thị thay vì đổi cấu trúc key lưu trữ.

<!-- kế hoạch gốc, tham khảo nếu cần làm thêm id/migration về sau -->
3 nguyên nhân gốc xác nhận qua code: (a) `Version.name` không có `id` ổn định, so khớp
bằng chuỗi thô; (b) tên không `.trim()` trước khi lưu (`CompetitionTab.tsx:203`) nên
`"Máy lạnh"` và `"Máy lạnh "` tạo 2 bản ghi khác nhau; (c) key lưu trữ
(`nhanvien-competition-versions`/`nhanvien-active-version`) KHÔNG scope theo siêu thị
(khác hầu hết key khác trong `db.ts`), đổi siêu thị không reset version đang active; (d)
không có đường "cập nhật phiên bản đang xem" — sửa filter rồi quên bấm lưu lại đúng tên
cũ sẽ tạo bản trùng, bản cũ mồ côi im lặng. Sửa: thêm `id` ổn định (migrate dữ liệu cũ
trong `utils/dbMigration.ts`), trim + validate trùng tên khi lưu, scope key theo siêu
thị hoặc reset khi đổi siêu thị, thêm badge "• chưa lưu" khi filter khác bản đã lưu.

### Lô 3 — Audit trail ✅ DONE (commit `f3b89726`)
`last-updates-list` hiện có KHÔNG phải audit trail thật — không có trường "ai", cap
cứng 10 mục/1-slot-mỗi-id (ghi đè, không phải log), và **quan trọng: chưa từng được đọc
ở bất kỳ đâu trong toàn bộ repo** (chỉ set, không get). Thêm
`features/bi-dashboard/utils/auditTrail.ts` (`logAuditEvent`, log nhiều-sự-kiện/ngày,
cap kép theo ngày 60 + theo số dòng tuyệt đối 2000, khác `competitionHistory.ts` ở chỗ
KHÔNG upsert-theo-ngày). Bridge danh tính user: `BiWrapper.tsx` thêm
`import { useAuth } from '../../../contexts/AuthContext'` (có tiền lệ hợp lệ — file này
đã import `contexts/LayoutContext` gốc; CLAUDE.md chỉ cấm cross-import `hooks/*`/
`services/*` gốc, không cấm `contexts/*`). Thêm `logAuditEvent` tại ~10 điểm mutation
quan trọng (xoá tất cả, khôi phục backup, lưu/xoá phiên bản thi đua, lưu Auto Bonus...).
UI hiển thị: panel mới trong `Settings.tsx`.

### Lô 4 — Phân tích & hiển thị ✅ DONE (commit `427a2d69`, `8e361fa9`, `a03dc642`)
3. **Biểu đồ xu hướng theo thời gian**: recharts đã có sẵn trong bundle (dùng 1 chỗ duy
   nhất hiện nay — donut chart tĩnh ở `IndividualCompetitionView.tsx`, KHÔNG phải time
   series). `CompetitionView.tsx` đã có sẵn `historySnapshots` trong state (từ tính
   năng Lịch sử Thi đua vừa làm ở Đợt 2) — dữ liệu chuỗi ngày thật, không cần nguồn mới.
   Thêm `components/dashboard/competition/CompetitionTrendChart.tsx` dùng
   `AreaChart`/`LineChart`, trục X = ngày, trục Y = giá trị L.Kế/%HTDK của chương trình
   đang chọn, đặt cạnh nút "Lịch sử". EmptyState khi &lt;2 ngày dữ liệu.
4. **So sánh tháng trước ở DetailTab**: hiện tại 0% — có sẵn key `prev-month-target-*`
   trong `db.ts` nhưng KHÔNG liên quan (dùng cho Target Thi đua ở `SupermarketConfig.tsx`
   khác hẳn ngữ cảnh). Cần thêm `prev-month-detail-${string}` mới, tái dùng
   `ImportPrevMonthModal` (đã generic sẵn) + `DeltaBadge`, parse bằng
   `parseDetailDataV2` có sẵn. **User chọn**: chỉ hiện delta ở cấp Phòng ban/Nhân viên
   (khớp độ chi tiết RevenueTab đang dùng), KHÔNG hiện ở 4 cấp sâu hơn (ngành hàng/nhóm
   hàng/hàng/sản phẩm) — matching theo path ghép do cây 6 cấp có thể trùng tên ở nhánh
   khác nhau, nhưng chỉ cần match tới cấp employee là đủ theo phạm vi đã chốt.
5. **Banner cảnh báo dữ liệu "ported" (định dạng BI cũ)**: **User xác nhận nghĩa** = dữ
   liệu dán vào dùng định dạng báo cáo cũ (trước khi user tự đổi sang định dạng BI mới
   tuần trước). Đã tìm ra chữ ký phân biệt CHÍNH XÁC qua code:
   `COMPETITION_REALTIME_REPORT_HEADER`/`COMPETITION_LUYKE_REPORT_HEADER`
   (`DataUpdater.tsx:18-19`) là chuỗi header CHÍNH XÁC của định dạng CŨ — validator hiện
   tại chấp nhận CẢ 2 (match chuỗi cũ chính xác HOẶC match heuristic từ khoá cho định
   dạng mới) vì header thật của định dạng mới không còn khớp chuỗi cũ nữa (lý do ban đầu
   user phải nới lỏng validator). → Banner kích hoạt khi
   `data.includes(COMPETITION_REALTIME_REPORT_HEADER)` hoặc
   `data.includes(COMPETITION_LUYKE_REPORT_HEADER)` (match chuỗi cũ CHÍNH XÁC, không
   phải nhánh heuristic) ngay sau khi dán ở `DataUpdater.tsx` (cạnh dòng 366/390), gợi ý
   dán lại từ nguồn mới `https://baocao.dienmayxanh.com/dashboard/thi-dua` (URL mới user
   đã tự cập nhật vào `downloadUrl` của chính StatusTile này). Chỉ áp dụng cho 2 tile
   Thi Đua Cụm — 2 tile Báo Cáo Tổng Hợp dùng validator strict-only, không bị ảnh hưởng.
6. **Edge-case target = 0**: khảo sát xác nhận đây KHÔNG phải lỗi tính toán — mọi phép
   chia cho target đã có guard đúng ở toàn bộ ~25 vị trí đã rà. Vấn đề thật là UX: khi
   target=0 (chưa cấu hình), UI hiển thị y hệt "0% hoàn thành" và tô màu ĐỎ như đang
   underperform nặng, gây hiểu nhầm. Thêm tham số `hasTarget` cho `getHtColor`/hàm màu
   tương tự ở `RevenueTab.tsx`, `RevenueDesktopRow.tsx`, `CompetitionGroupView.tsx`,
   `CompetitionSummaryView.tsx`, `IndividualCompetitionView.tsx` — hiện "—"/badge xám
   "Chưa có Target" thay vì "0%" đỏ. Làm đồng loạt cả 5-6 file trong 1 lượt để tránh UX
   không nhất quán (nơi sửa nơi chưa).

### Lô 5 — Redesign 18 bảng sang "Enterprise Tinh Gọn" ✅ DONE (18/18, commit `615e50f2`
→ `af280e73`, 8 commit nhỏ theo từng nhóm bảng)

Toàn bộ 18 bảng đã redesign, mỗi bảng verify bằng `npx tsc --noEmit` + `eslint` +
`npm run build`, phần lớn có kiểm thử trực quan bằng Playwright với dữ liệu thật.
**1 quyết định có chủ đích lệch khỏi pattern chung**: `CompetitionSummaryView.tsx`
GIỮ NGUYÊN nền màu 2 lớp nhóm/cột (HEADER_GROUP_THEMES/HEADER_COLUMN_THEMES) —
đây là tính năng user đã trực tiếp yêu cầu/tinh chỉnh ở đợt audit trước, không
phải phần "mặc định chưa tinh chỉnh" nên không áp nền trắng đồng nhất; chỉ bỏ
viền dọc (border-r) như các bảng khác. Xem chi tiết ở [[project_report_bi_deep_audit_lo_a_d_2026_08]] (memory) hoặc `git log` từng file.

### Lô 5 — Kế hoạch gốc (tham khảo, đã thực thi ở trên)
User chọn làm toàn bộ 18 bảng trong 1 đợt (không tách 2 giai đoạn). Spec đích (từ
artifact, đối chiếu Tailwind tương đương): bỏ `border-b-[3px] border-b-{màu}-400` +
`border-r` giữa mọi cột (chỉ còn viền ngang mỏng giữa các dòng), header nền trắng đồng
nhất (bỏ `bg-slate-50`/`bg-{màu}-50` theo nhóm), chữ header xám nhạt uppercase nhỏ, số
liệu canh phải, cột tên canh trái có avatar tròn nhỏ, %HT/trạng thái đổi từ tô chữ màu
sang "pill" bo tròn nền bán-trong-suốt (`bg-{màu}-100 text-{màu}-700`), dòng
TỔNG/TRUNG BÌNH nền xám nhạt + border-top đậm hơn.

Danh sách đầy đủ 18 file (đường dẫn, độ phức tạp) — làm theo thứ tự từ đơn giản/làm
khuôn mẫu trước:
- **Khuôn mẫu (làm đầu tiên)**: `nhanvien/revenue/RevenueDesktopRow.tsx` +
  `nhanvien/RevenueTab.tsx` (Doanh thu) — pattern chuẩn để đối chiếu khi làm các file
  còn lại.
- **Đơn giản** (2): `nhanvien/bonus/AutoBonusErrorDetailModal.tsx`,
  `nhanvien/bonus/MultiMonthResultDetailModal.tsx` — đã gần khớp spec sẵn.
- **Trung bình** (8, không kể RevenueTab đã tính ở khuôn mẫu):
  `nhanvien/InstallmentTab.tsx` (header colSpan/rowSpan động theo NCC),
  `nhanvien/CrossSellingTab.tsx`, `nhanvien/bonus/BonusDesktopRow.tsx` +
  `nhanvien/bonus/BonusGroupListTable.tsx` (1 cặp), `nhanvien/IndividualCompetitionView.tsx`,
  `nhanvien/CompetitionCompareView.tsx`, `nhanvien/CompetitionGroupView.tsx`.
- **Phức tạp** (7 — cần xử lý riêng từng đặc thù, KHÔNG copy-paste đơn thuần):
  `dashboard/IndustryView.tsx` (colSpan/rowSpan runtime + cây luỹ kế + sticky column),
  `dashboard/SummaryTableView.tsx` (tương tự, sticky column dùng `shadow` giả viền dọc
  — cần bỏ shadow đó theo tinh thần spec), `dashboard/competition/CompetitionListView.tsx`
  (nhiều `tbody` lặp theo tiêu chí), `nhanvien/CompetitionSummaryView.tsx` (1065 dòng,
  CÓ kéo-thả cột — giữ nguyên hành vi drag-drop, chỉ đổi style), `nhanvien/bonus/
  BonusDailyTable.tsx` (tô màu HEATMAP theo ngưỡng — khác hẳn "pill", cần quyết định
  cách áp dụng riêng khi tới file này, có thể giữ heatmap nền ô nhưng đổi viền/header
  theo spec chung), `nhanvien/bonus/MonthlyBonusTable.tsx` (có `&lt;tfoot&gt;` thật),
  `nhanvien/DetailTab.tsx` (cây 7 cấp, cột %HQQĐ ĐÃ dùng pill sẵn — tham khảo ngược làm
  mẫu pill cho các bảng khác).

Mỗi file redesign xong cần kiểm tra: không đổi cấu trúc dữ liệu/logic tính toán (chỉ
đổi className/style), sort/drag-drop/expand-collapse vẫn hoạt động, `npm run check`
sạch. Do khối lượng lớn (18 file), test trực quan bằng Playwright theo lô thay vì từng
file để tiết kiệm thời gian, ưu tiên test kỹ các file "phức tạp" có tương tác (drag-drop,
expand cây, heatmap).

## Đợt 4 — Phân quyền theo siêu thị (✅ HOÀN TẤT, ĐÃ DEPLOY PRODUCTION 2026-09-01)

### Mô hình nghiệp vụ đã chốt với user (2026-08-31)
1. Mỗi nhân viên có **tài khoản Google riêng** (không dùng chung tài khoản/thiết bị).
2. Cần **bảo mật thật** — nhân viên siêu thị A cố tình sửa URL/mở console phải KHÔNG
   xem/sửa được dữ liệu siêu thị B. Lọc chỉ ở client KHÔNG được coi là đạt yêu cầu này.
3. User muốn **lập kế hoạch/thiết kế chi tiết trước**, duyệt xong mới bắt tay code.

### Phát hiện quan trọng — vì sao "chỉ lọc UI" KHÔNG BAO GIỜ đạt được mục 2 ở trên
Kiến trúc Report BI hiện tại: mỗi nhân viên **tự dán** báo cáo BI thô vào **tài khoản
riêng của họ** (`users/{uid}/setting`, `users/{uid}/configs` — Firestore Rules đã chặn
đúng `isSelf(uid)`, không ai đọc được dữ liệu Firestore của người khác). Nghĩa là: nếu 1
nhân viên tự dán 1 báo cáo BÊN NGOÀI (từ portal công ty) có chứa NHIỀU siêu thị (vì bản
thân báo cáo gốc vốn phủ cả cụm/miền, không phải lỗi của app), thì dữ liệu đó vốn đã nằm
100% trong máy/tài khoản của CHÍNH họ — không có Firestore Rule nào "chặn" được việc họ
đọc lại chính dữ liệu họ vừa dán, vì đó là dữ liệu họ SỞ HỮU hợp lệ trên thiết bị của họ.
→ Muốn "chặn được thật sự" theo đúng nghĩa mục 2, bắt buộc phải đổi cách dữ liệu ĐI VÀO
hệ thống: không còn "mỗi người tự dán bản riêng của mình" nữa, mà chuyển sang **"quản
lý/admin dán 1 lần vào kho dữ liệu DÙNG CHUNG theo từng siêu thị, nhân viên chỉ ĐỌC đúng
(các) siêu thị được cấp quyền"** — dữ liệu ngoài phạm vi được cấp quyền sẽ KHÔNG BAO GIỜ
tải xuống trình duyệt của nhân viên đó, nên không có gì để mở console mà xem được.
**Đây là thay đổi luồng làm việc thật sự (ai được phép dán dữ liệu), không chỉ là thêm 1
lớp kiểm tra quyền — cần user xác nhận lại có chấp nhận đổi luồng này không** (xem mục
"Cần user quyết định" bên dưới).

### Tin tốt: đã có sẵn 1 pattern gần như giống hệt, đã chạy production — `khoData/{maKho}`
Module Phân Tích ở root đã giải quyết ĐÚNG bài toán này cho "Kho" (kho hàng), chỉ khác
tên miền là "siêu thị": xem `firestore.rules` dòng 65-80 (`khoData/{maKho}/salesFiles/…`,
hàm `myKhos()`), `services/khoDataService.ts` (365 dòng, đầy đủ upload/download/cache/
retention/chunk theo giới hạn 1MiB Firestore), và `functions/src/admin.ts`
(`adminUpdateUser` — manager chỉ sửa được user thuộc đúng Kho của mình, dựa vào custom
claim `departmentId`). Thiết kế bên dưới **nhân bản gần như nguyên trạng pattern này**
cho "siêu thị" thay vì tự nghĩ ra kiến trúc mới — giảm rủi ro, giảm thời gian thiết kế.

### Quyết định cuối (2026-08-31, vòng hỏi thứ 2) — ĐƠN GIẢN HOÁ đáng kể so với bản nháp đầu
4. **1 Kho = 1 Siêu thị, luôn khớp nhau** trong thực tế công ty user → **KHÔNG cần custom
   claim mới `allowedSupermarkets`, KHÔNG cần hệ thống mã riêng cho Report BI**. Dùng lại
   NGUYÊN VẸN `departmentId`/`myKhos()` đã có sẵn (đang gate module Phân Tích) làm cơ chế
   phân quyền chung cho CẢ Report BI. Việc này đúng tinh thần CLAUDE.md mục 1.1 (không đổi
   ý nghĩa field `departmentId`) vì đây vẫn là cùng 1 field, chỉ SỬ DỤNG LẠI giá trị claim
   đã có ở tầng Auth token — không phải import code TypeScript giữa 2 zone (không vi phạm
   quy tắc cách ly 4 khu vực, vốn cấm cross-import code, không cấm đọc chung 1 claim JWT).
5. Admin tạo danh sách mã siêu thị cố định trước, map "tên trong báo cáo dán" → mã — nay
   cụ thể hoá thành: map "tên trong báo cáo Report BI" → **đúng Mã Kho đã tồn tại sẵn**
   (không phải mã mới), nhiều khả năng admin đã thuộc/có sẵn danh sách này từ trước.
6. Đồng ý đổi luồng: chỉ manager/admin được dán dữ liệu dùng chung, nhân viên chỉ đọc.
7. Phạm vi: làm xong ở Report BI trước, kiểm chứng ổn định, MỚI áp dụng tương tự sang
   Phân Tích sau (không làm 2 module song song). Vì Phân Tích vốn đã dùng `departmentId`/
   `myKhos()` từ trước, "áp dụng sang Phân Tích" gần như không cần việc gì thêm ở đó — chủ
   yếu là việc ở Report BI.
8. Ngoại lệ cách ly: đồng ý thêm `services/firebase.ts` làm ngoại lệ dùng chung thứ 3
   (cạnh `components/shared/ui/*` và `utils/dataUtils.ts`).

### Kiến trúc đề xuất (bản đã chốt)

**1. KHÔNG cần Cloud Function mới cho việc set claim** — `departmentId` đã được set sẵn
qua `resolveSession`/`adminUpdateUser` hiện có. Chỉ cần đảm bảo admin gán đúng Mã Kho cho
từng nhân viên Report BI (UI đã có sẵn ở `UserManagementView.tsx`).

**2. Bảng map "tên siêu thị trong báo cáo" → "Mã Kho"** — dữ liệu nhỏ, ít thay đổi, admin
tự khai báo. Đề xuất lưu ở Firestore `shared_configs/{id}` (collection đã có sẵn, rule đã
cho phép `isManager()` ghi/`isSignedIn()` đọc — xem `firestore.rules` dòng 60-63, KHÔNG
cần thêm rule mới cho riêng việc này) hoặc 1 doc con mới `shared_configs/bi-supermarket-map`.
Cấu trúc: `{ "ĐM_TEST - 99 Test Street": "58614", ... }`.

**3. Firestore collection mới `biData/{maKho}/{reportType}/…`** (tái dùng đúng path
`maKho` — không phải `maSieuThi` — để rule mirror thẳng `khoData` không cần hàm mới):
```
match /biData/{maKho} {
  match /{document=**} {
    allow read:  if isSignedIn() && maKho in myKhos();
    allow write: if isSignedIn() && isManager() && maKho in myKhos();
  }
}
```
(`myKhos()` dùng lại y nguyên hàm đã có ở dòng 16-20 `firestore.rules` — không viết hàm mới.)

**4. Service client mới** `features/bi-dashboard/services/biDataService.ts` (trong
bi-dashboard, giữ cách ly code — chỉ dùng chung CLAIM qua Auth token, không import code
root), mirror `khoDataService.ts`:
- `uploadBiDataIfManager()` — manager/admin dán báo cáo → parse bằng
  `parseCompetitionDataBySupermarket()`/`extractSupermarketList()` có sẵn → map tên siêu
  thị sang Mã Kho qua bảng ở mục 2 → ghi từng phần lên `biData/{maKho}/{reportType}`.
- `fetchAllowedBiData()` — đọc + gộp dữ liệu từ mọi `maKho` trong claim `departmentId`
  của user hiện tại (đã có sẵn qua `useAuth()`/`AuthContext`, KHÔNG cần đọc `allowedSupermarkets`
  nào khác), cache cục bộ theo từng Kho (mirror `fetchAllowedKhoData()`).
- Tên siêu thị hiển thị trong UI vẫn dùng chuỗi gốc/rút gọn như hiện tại (không đổi UX
  hiển thị) — chỉ tầng LƯU TRỮ/PHÂN QUYỀN chuyển sang khoá theo Mã Kho.

**5. Phạm vi dữ liệu đợt đầu**: Thi đua Luỹ kế + Summary Luỹ kế (đã có sẵn hàm parse theo
từng siêu thị, rủi ro thấp nhất, dùng làm mẫu) — các loại dữ liệu Report BI còn lại (cấu
hình từng siêu thị, Auto Bonus, Trả góp, Bán kèm…) VẪN GIỮ NGUYÊN mô hình riêng tư theo
uid như hiện tại cho tới khi có yêu cầu mở rộng tiếp, KHÔNG đổi trong đợt này.

### Việc còn cần làm rõ trước khi code (nhỏ, không chặn hẳn — có thể vừa làm vừa hỏi)
- UI cho admin quản lý bảng map "tên báo cáo → Mã Kho" (mục 2) — thêm màn hình nhỏ ở đâu
  (trong `UserManagementView.tsx`, hay trang cấu hình riêng)?
- Khi 1 tên trong báo cáo dán vào KHÔNG có trong bảng map (siêu thị mới/tên viết khác) —
  hành vi mong muốn: chặn hẳn không cho dán, hay dán được nhưng cảnh báo "chưa gán Mã
  Kho, tạm ẩn với nhân viên khác cho tới khi admin map"?

### Ước lượng khối lượng (đã đơn giản hoá — không cần Cloud Function/claim mới)
- Firestore Rules: thêm block `biData` (mirror `khoData`, tái dùng `myKhos()`) — rất nhỏ
  (~0.25 ngày).
- Bảng map tên→Mã Kho + UI quản lý cho admin — nhỏ (~0.5-1 ngày).
- `biDataService.ts` mới + tích hợp vào Thi đua Luỹ kế/Summary Luỹ kế (DataUpdater.tsx
  paste flow đổi luồng dán cho manager/admin, useDashboardLogic.ts đọc dữ liệu qua
  `fetchAllowedBiData()` thay vì IndexedDB riêng tư) — trung bình, có mẫu `khoDataService.ts`
  để theo sát (~1.5-2 ngày kể cả test kỹ vì đụng luồng dữ liệu cốt lõi).
- Thêm `services/firebase.ts` vào danh sách ngoại lệ dùng chung — rất nhỏ, chỉ cập nhật
  CLAUDE.md mục 1 (~0.1 ngày).
- **Tổng ước lượng đợt đầu: ~2.5-3.5 ngày làm việc** (giảm gần 1 nửa so với ước lượng ban
  đầu 4-5 ngày, nhờ dùng lại `departmentId`/`myKhos()` có sẵn thay vì dựng hệ thống mã +
  claim song song).

**Trạng thái: thiết kế đã chốt đủ 8 điểm nghiệp vụ/kỹ thuật ở trên. Sẵn sàng bắt tay code
khi user xác nhận bắt đầu — vẫn còn 2 chi tiết nhỏ (UI quản lý bảng map, hành vi khi tên
chưa được map) có thể quyết định luôn lúc bắt đầu code thay vì hỏi thêm 1 vòng riêng.**

### Tiến độ triển khai (2026-08-31)

**✅ DONE — Nền tảng (commit `2aa6928f`)**
- `firestore.rules`: block `biData/{maKho}` (mirror `khoData`, tái dùng `myKhos()`) +
  block `biSupermarketMap/{doc}` (đọc: mọi user đăng nhập, ghi: chỉ admin). **CHƯA DEPLOY**
  — deploy rules là việc thủ công của user (`npm run deploy:rules`, cần `firebase login`),
  không tự động hoá theo CLAUDE.md.
- `eslint.config.js`: ngoại lệ cách ly thứ 3 — bi-dashboard được import `services/firebase.ts`
  gốc (chỉ `db`/`auth`), đã verify biên bằng file test tạm (xoá sau khi verify).
- `features/bi-dashboard/services/biDataService.ts` (mới): tách/gộp Summary Luỹ kế theo
  raw-text fragment/Kho; Thi đua Luỹ kế parse 1 lần qua `parseCompetitionDataBySupermarket()`
  rồi lưu OBJECT đã parse/Kho (raw text Thi đua KHÔNG tách được theo siêu thị vì header/tên
  chương trình chia sẻ giữa nhiều siêu thị trong cùng 1 lần dán — xem lại hàm gốc trước khi
  đổi hướng này).
- `features/bi-dashboard/services/biSupermarketMapService.ts` (mới): bảng map lưu ở
  `biSupermarketMap/config` — KHÔNG dùng `shared_configs` như bản nháp ban đầu ở mục 2 phía
  trên (đã đọc `services/firestoreService.ts`, xác nhận `shared_configs` thiết kế cho chia sẻ
  cấu hình tuỳ ý nhiều document, sai ngữ nghĩa cho 1 bảng tra cứu cố định duy nhất).
- `features/bi-dashboard/hooks/useReportBiAuth.ts` (mới): cầu nối `departmentId`/`userRole`/
  `employeeName` từ `AuthContext` gốc, tính `allowedKhos`/`canManageSharedBiData`/`isAdmin`.

**✅ DONE — Gắn vào luồng đọc/ghi + UI admin (commit `5d612a86`)**
- `useDashboardLogic.ts`: hợp nhất Summary Luỹ kế (ưu tiên text cục bộ, rỗng thì dùng bản
  dùng chung tái dựng từ fragment) + Thi đua Luỹ kế (gộp theo tên siêu thị, shared trước
  local đè lên — bù đúng phần chưa dán trên máy này). Không đổi shape trả về của hook.
- `DataUpdater.tsx`: 2 StatusTile "Luỹ kế" (Báo cáo Tổng hợp + Thi đua Cụm) readOnly với
  nhân viên thường; admin/manager dán xong tự động ghi thêm lên `biData/{maKho}`, tên siêu
  thị chưa có trong bảng map → toast cảnh báo (skippedNames), không chặn dán cục bộ.
- `BiSupermarketMapAdmin.tsx` (mới): trả lời câu hỏi "UI đặt ở đâu" ở mục "Việc còn cần làm
  rõ" phía trên — đặt ngay trong `DataUpdater.tsx`, phía trên card "Dữ Liệu Báo Cáo Cụm",
  chỉ admin thấy (gate `isAdmin`). Thêm/sửa/xoá từng dòng map qua `biSupermarketMapService.ts`.
- Trả lời câu hỏi còn lại "hành vi khi tên chưa được map": dán được bình thường ở local
  (không chặn), phần KHÔNG map được chỉ bị loại khỏi lượt ghi lên `biData` (không chia sẻ
  cho tới khi admin thêm vào bảng map) — cảnh báo mềm qua toast, đúng tinh thần các validator
  khác trong `DataUpdater.tsx`.
- Verify: `tsc --noEmit` + `eslint features/bi-dashboard` + `npm run build` + `lint:ratchet`
  đều sạch trong phạm vi bi-dashboard (1 vi phạm ratchet còn lại ở `features/phan-ca/
  Legend.tsx` — không liên quan, không đụng tới, thuộc việc khác của user).

**✅ DONE — Kiểm chứng "chặn thật" bằng Firebase Local Emulator Suite (2026-09-01)**
User hỏi "có cách nào cho agent tự quyền test không" — giải pháp không cần cấp quyền production
gì cả: `@firebase/rules-unit-testing` (đã có sẵn trong `node_modules`, không cần cài mới) chạy
`firestore.rules` thật trên Firestore Emulator cục bộ (Java lấy qua `brew --prefix openjdk`,
máy chưa link `java` mặc định), giả lập token Auth với custom claim `role`/`departmentId` tuỳ ý
— hoàn toàn không cần tài khoản Google thật, không đụng dữ liệu production. Script tạm chạy 10
assertion (`assertSucceeds`/`assertFails`), xoá ngay sau khi chạy xong — không phải file lưu lại
trong repo:
- managerA (Kho A) ghi được `biData/KHO_A` ✅ / employeeA (Kho A) đọc được, GHI thì bị chặn ✅
- **employeeB (Kho B, KHÁC Kho) đọc `biData/KHO_A` bị chặn ✅ — đúng phép thử cốt lõi "nhân
  viên siêu thị khác không đọc được dữ liệu siêu thị này", server-side thật (log emulator có
  `PERMISSION_DENIED` tại đúng dòng rule trong `firestore.rules`, không phải giả lập suông)**
- employeeB ghi `biData/KHO_A` bị chặn ✅ / user chưa đăng nhập đọc bị chặn ✅
- adminX ghi `biSupermarketMap` được ✅ / managerA (không phải admin) ghi bị chặn ✅ / user
  đăng nhập bất kỳ đọc được ✅ / chưa đăng nhập đọc bị chặn ✅
- **Kết quả: 10/10 PASS.** Đây là bằng chứng độc lập (không dựa vào đọc code bằng mắt) rằng
  `firestore.rules` mục Đợt 4 hoạt động đúng thiết kế — miễn là được DEPLOY (xem mục dưới).

**✅ Xác nhận — module Phân Tích KHÔNG cần việc gì thêm**
Grep xác nhận `khoDataService.ts` đã được gọi thật (không phải code chết) từ
`hooks/useFileUploadLogic.ts`, `hooks/useDataManagement.ts`, `components/upload/
KhoFileManager.tsx` — nghĩa là phân quyền theo Kho ở Phân Tích **đã chạy production từ trước**,
độc lập với Đợt 4. Mục 7 quyết định nghiệp vụ ("áp dụng sang Phân Tích sau") thực chất không
còn việc gì phải làm thêm — Phân Tích vốn đã dùng đúng `departmentId`/`myKhos()` từ lâu.

**✅ DONE — Deploy `firestore.rules` lên production (2026-09-01)**
User hỏi "có cách nào cho agent tự quyền test/deploy" → thử `firebase login` qua Bash của agent
trước, THẤT BẠI ("Cannot run login in non-interactive mode" — môi trường chạy lệnh của agent
không có TTY, `login`/`login:ci` đều cần). Kiểm tra lại thì phát hiện máy đã sẵn có credential
Firebase CLI hợp lệ từ trước (`~/.config/configstore/firebase-tools.json`, không phải agent vừa
tạo), `firebase projects:list` xác nhận đã trỏ đúng `dashboa-7e20b`. Sau khi hỏi lại user 1 lần
nữa cho rõ ràng (đây là deploy thật lên production, không phải bước phụ) và được xác nhận "Có,
deploy ngay" — agent chạy `firebase deploy --only firestore:rules` trực tiếp:
```
✔  firestore: released rules firestore.rules to cloud.firestore
✔  Deploy complete!
```
(Cảnh báo compile "Unused function: isAdmin" thuộc `firestore.stickerevent.rules` dòng 9 — file
rules khác, không liên quan `firestore.rules` của Đợt 4, không phải lỗi mới.)
**Tính năng phân quyền theo siêu thị đã hoạt động THẬT trên production kể từ đây** — kết hợp
với 10/10 test emulator ở trên (verify cùng nội dung rules trước khi đẩy lên), đã đủ bằng chứng
"chặn được thật" theo đúng yêu cầu ban đầu của user, không chỉ dừng ở code review bằng mắt.

**Còn lại — không bắt buộc, thuần UX**
Test 2 tài khoản Google thật (khác `departmentId`) qua UI thật — chỉ còn ý nghĩa kiểm tra trải
nghiệm hiển thị (đã hết ý nghĩa "kiểm tra có chặn thật không", câu đó emulator + deploy ở trên
đã trả lời dứt điểm rồi). Làm khi nào user có 2 tài khoản thật để thử, không chặn việc gì khác.

**Biết trước, có thể chấp nhận là giới hạn của đợt đầu (không phải bug):**
- Manager quản lý ≥2 Kho, chỉ dán dữ liệu phủ 1 phần số Kho đó trên 1 thiết bị → phần
  Summary Luỹ kế của (các) Kho còn lại sẽ không tự bù từ bản dùng chung (Thi đua Luỹ kế
  THÌ có bù, vì gộp theo object; Summary gộp theo "ưu tiên local toàn phần" đơn giản hơn).
- Admin sửa bảng map trong lúc đang mở sẵn `DataUpdater.tsx` ở tab khác → tab đó phải
  tải lại trang mới thấy map mới (không tự đồng bộ real-time).

---

# [MODULE KHÁC] Audit + sửa module "Phân Tích" (root: components/, hooks/, services/,
# utils/ — KHÔNG phải Report BI/bi-dashboard, xem memory `project_phan_tich_audit_2026_09.md`)

## Bối cảnh (2026-09-01)
User yêu cầu kiểm tra lại module "Phân Tích" tìm lỗ hổng/bug + xác nhận các khu vực
tính toán đồng nhất + đồng nhất thiết kế UI (bảng/modal/font/màu). Dùng 2 Explore agent
song song khảo sát (1 hướng tính toán/bug, 1 hướng UI), sau đó TỰ ĐIỀU TRA SÂU từng
phát hiện trước khi sửa (không tin thẳng báo cáo agent — xem
`feedback_audit_before_trusting_plan_numbers.md` mục 5, đã cập nhật thêm case này).

## Kết quả điều tra — nhiều phát hiện ban đầu của agent là FALSE POSITIVE sau khi truy hết chuỗi gọi hàm/đọc hết ngữ cảnh:
1. "Bug" cache `row._metrics` stale ở So Sánh giai đoạn — KHÔNG PHẢI BUG. `_metrics`
   chỉ được ghi trong Web Worker (`services/filterService.ts`, chỉ gọi được từ
   `services/analytics.worker.ts`); dữ liệu main-thread (`baseFilteredData` mà
   `useSummaryComparison.ts` dùng) không bao giờ có `_metrics` do ranh giới
   postMessage/structured-clone tách biệt object — luôn rơi vào fallback tính mới
   (`calculateRowMetrics()`). Không sửa.
2. `WarehouseSummary.tsx` "2 bảng font-size khác nhau" — KHÔNG PHẢI BUG. Đọc hết cả 2
   bảng (dòng 749-926 + 994-1185) lộ ra hệ thống scale responsive 4 tầng nhất quán,
   lặp lại y hệt ở cả 2 bảng. Không sửa.
3. "Card/toast bo góc chẻ 3 kiểu" — KHÔNG PHẢI BUG. 3 kiểu = 3 ngữ cảnh layout khác
   nhau (full-bleed section / popover nổi / toast-card nhỏ), mỗi kiểu tự nhất quán
   trong ngữ cảnh của nó. Không sửa.
4. Modal danh sách đơn hàng (`PerformanceModal`/`UnshippedOrdersModal`/
   `UncollectedOrdersModal`) header style khác bảng pivot — KHÔNG PHẢI BUG, khác thể
   loại nội dung (danh sách đơn hàng thô vs bảng tổng hợp KPI), nhất quán ở cả 3 file.
   Không sửa.
5. `EmployeeManagerModal`/`UnconfiguredGroupsModal` header size lệch nhẹ — mức độ quá
   nhỏ, modal CRUD/utility ít người dùng, rủi ro sửa > lợi ích. Không sửa.

Chi tiết đầy đủ + trích code cho từng mục xem memory `project_phan_tich_audit_2026_09.md`.

## Đã sửa (commit sẽ ghi hash sau khi commit)
- **Bo góc input text** → thống nhất `rounded-md` (CLAUDE.md mục 2): sửa trigger +
  search-input trong `components/common/SingleSelectDropdown.tsx`,
  `components/common/MultiSelectDropdown.tsx` (kèm sửa panel dropdown về `rounded-xl`
  đúng rule card/popover), `components/tables/summary/FilterPopover.tsx` (2 input +
  panel), `components/modals/GtdhTargetModal.tsx`, `components/upload/
  UploadSection.tsx`, `components/modals/FileNamingModal.tsx`,
  `components/summary/WarehouseSummary.tsx` (2 input target Kho, KHÔNG đụng font-size
  của file này — xem mục "không phải bug" #2 ở trên).
- **Màu hex cứng** → `components/employees/industry/IndustryTableUtils.tsx:57`:
  `text-[#46505e]` → `text-slate-600` (khớp CLAUDE.md mục 2, palette semantic).
- **Font-size header bảng lệch thật** (3 kiểu scale KHÔNG khớp nhau trong 1 file, khác
  hẳn case WarehouseSummary ở trên — đây LÀ bug thật) → hội tụ về `text-[11px]` cố
  định (khớp quy ước đa số toàn app, vd `ContestTable.tsx`):
  `components/tables/SummaryTable.tsx` (10 chỗ, cả 2 header — chế độ so sánh và chế độ
  thường) và `components/tables/MonthlyTrendTable.tsx` (3 chỗ).

## Verify
- `tsc --noEmit`: sạch (0 lỗi liên quan file đã sửa; lỗi còn lại 100% thuộc
  `features/phan-ca/` — việc khác của user, không đụng tới).
- `eslint` toàn bộ 10 file đã sửa: sạch.
- `npm run build`: thành công.
- `npm run lint:ratchet`: không phát sinh vi phạm mới (vi phạm còn lại vẫn là
  `features/phan-ca/Legend.tsx`, không liên quan).
- **Giới hạn đã biết**: KHÔNG test trực quan bằng dữ liệu Excel thật trên trình duyệt
  (không có file mẫu sẵn trong repo, tạo file .xlsx giả cần đúng schema nhiều sheet/cột
  — rủi ro tự tạo lỗi mới). Đã xác nhận bằng đọc code: cả `SummaryTable.tsx` và
  `MonthlyTrendTable.tsx` đều nằm trong wrapper `overflow-x-auto` (dòng 211) — tăng
  font-size chỉ có thể làm bảng cần cuộn ngang nhiều hơn, KHÔNG thể làm vỡ layout/cắt
  chữ. Khuyến nghị user tự soi mắt 1 lần trên trình duyệt với dữ liệu thật sau khi
  deploy, đặc biệt bảng So Sánh giai đoạn (nhiều cột nhất).

---

# [MODULE Report BI, tiếp tục] Rà soát vòng 2 sau Đợt 4 (2026-09-01, commit `89901a44`,
# `7074b4a6`)

## Bối cảnh
User yêu cầu "tiếp tục rà soát Report BI" — vòng rà soát MỚI, tập trung vào code mới
nhất (Đợt 3 Lô 5 + Đợt 4 phân quyền siêu thị, vừa deploy production). Dùng 2 Explore
agent song song (1 hướng bug/tính toán, 1 hướng đồng nhất UI 18 bảng đã redesign), sau
đó tự điều tra sâu từng phát hiện trước khi sửa.

## Đã sửa (commit `89901a44`)
1. **Bug thật — cảnh báo giả "Tổng" khi dán Thi đua Luỹ kế**: `biDataService.ts`
   `uploadCompetitionLuyKeIfManager()` luôn đẩy key "Tổng" (do
   `parseCompetitionDataBySupermarket()` luôn sinh ra, không bao giờ có trong bảng map)
   vào `skippedNames` — mọi lần admin/manager dán đều nhận cảnh báo giả, che mất cảnh
   báo thật. Đã thêm điều kiện bỏ qua "Tổng" trước khi đối chiếu map.
2. **Bug thật — cột "Target V.Trội"/"%HTDK V.Trội" luôn = 0 cho nhân viên chỉ-đọc**:
   `useDashboardLogic.ts` `parseCompetitionLuyKeBaseTargets()` tự parse lại RAW TEXT
   `competitionLuyKe` (luôn rỗng với nhân viên không dán local, vì Thi đua Luỹ kế được
   thiết kế lưu OBJECT đã parse chứ không phải raw text — xem lý do ở mục Đợt 4 phía
   trên). Đổi hàm (đổi tên `computeCompetitionBaseTargets`) sang đọc trực tiếp
   `competitionLuyKeBySupermarket` (object đã merge local+shared, cùng shape) — vừa
   fix bug, vừa bỏ được 1 lượt re-parse thừa. Dọn luôn biến `competitionLuyKe` alias
   không còn cần thiết.
3. **UI — 4 file lệch chuẩn "Enterprise Tinh Gọn"**: `CompetitionGroupView.tsx` (màu
   RGB `rgb(34,197,94)`/`rgb(239,68,68)`/`rgb(234,179,8)` ngoài palette → hex
   emerald-600/rose-600/amber-600, cột %HT chuyển sang `<Pill>`), `DetailTab.tsx` +
   `IndustryView.tsx` (pill tự viết bằng `bg-{color}-100`+`dark:` → dùng chung
   `<Pill>` có sẵn từ Lô 5 — 2 file này bị sót khi `Pill.tsx` ra đời sau),
   `BiSupermarketMapAdmin.tsx` (Đợt 4, code MỚI NHẤT nhưng lại dùng `DataTable` mặc
   định `rounded-xl`+`columnDividers` — đi ngược đúng 2 điểm cốt lõi Lô 5 vừa chuẩn
   hoá — thêm `className="rounded-none"`, bỏ `columnDividers`).

## Đã sửa (commit `7074b4a6`) — bug nghiêm trọng nhất, cần hỏi user trước khi sửa
**Phát hiện**: nhân viên chỉ-đọc (chưa dán local) mở Dashboard thấy **KPI card trống**
và **mất dòng "Tổng"** ở Summary Luỹ kế — vì `biData/{maKho}` chỉ lưu fragment từng
Kho, không lưu dòng "Tổng"/khối KPI gốc (2 thứ đó vốn là số liệu tổng hợp TOÀN CỤM,
không tách theo Kho được). Đây là lựa chọn nghiệp vụ thật (Tổng nên là gì khi dữ liệu
chỉ có 1 phần?), đã hỏi user qua AskUserQuestion — **user chọn: "Tự tính Tổng = tổng
(các) Kho họ thấy được"**.

Đã triển khai: `biDataService.ts` thêm `buildSyntheticTotalLine()` — tự dựng 1 dòng
"Tổng" (cộng dồn) sau khi gộp fragment các Kho, nối vào cuối text trả về từ
`fetchAllowedSummaryLuyKeText()`. Cột có "%" trong header hoặc thiếu giá trị ở dòng
nào → để trống (an toàn hơn hiển thị % sai do cộng dồn tỷ lệ). Vì dòng "Tổng" nối vào
đúng ĐỊNH DẠNG RAW TEXT gốc, `parseSummaryData()` (vốn đã nhận diện `firstCol==='Tổng'`
là dòng hợp lệ) và `SummaryTableView.tsx` (`tRowIdx = tempRows.findIndex(r =>
r[nameIndex]==='Tổng')`) hoạt động đúng KHÔNG CẦN sửa gì thêm.

**Hiệu ứng phụ tốt phát hiện khi điều tra**: `getKpiData()` không CHỈ đọc từ
`sourceData.kpis` (khối regex-extract toàn báo cáo, vẫn rỗng) — với
`activeSupermarket==='Tổng'`, phần lớn field (`dtlk`, `dtqd`, `dtDuKien`, `lkhach`,
`tlpv`, `tyTrongTraGop`...) đọc TRỰC TIẾP từ dòng bảng khớp tên siêu thị đang chọn, nên
tự động được lấp đầy đúng theo dòng "Tổng" tổng hợp mới — không cần sửa `getKpiData()`.

**Gap còn sót lại (nhỏ, chưa xử lý)**: 1 vài field %-based cụ thể không nằm trong
`mapping` của `getKpiData()` (vd `htTargetQD`/`targetQD` riêng cho view LuyKe, hoặc cột
%-header bị để trống trong dòng Tổng tổng hợp) vẫn hiển thị "0%" thay vì ẩn/ghi chú —
vì `KpiOverview.tsx` dùng `parseNumber(kpiData.xxx)` cho hầu hết card, mà
`parseNumber(undefined)` trả về `0` (không phải "N/A"). Phạm vi ảnh hưởng nhỏ hơn nhiều
so với đánh giá ban đầu (đã tự sửa được phần lớn qua fix dòng Tổng) — CHƯA xử lý tiếp
vì cần đọc/hiểu hết ~15 KPI card trong `KpiOverview.tsx` (chưa đọc toàn bộ), rủi ro
sửa vội gây thêm bug mới cho 1 component chưa quen thuộc — để user quyết định có cần
xử lý tiếp không.

## Đã điều tra, KHÔNG sửa — false positive
- `Settings.tsx` audit-trail table "thiếu viền `border`" (agent nêu) — thực ra bảng
  nằm trong `<section>` đã có border riêng bao ngoài (title bar + nội dung), thêm viền
  cho bảng sẽ tạo viền đôi — đúng pattern nhất quán với section "Sao lưu & Khôi phục"
  cạnh đó trong CÙNG file.
- `BonusDesktopRow.tsx`/`BonusGroupListTable.tsx` pill tự viết (không dùng `Pill`) —
  có comment tự giải thích lý do kỹ thuật hợp lý (hàm màu trả class rời rạc chứ không
  phải hex) — giữ nguyên, không phải lỗi.
- Sticky-column shadow 2 công thức khác nhau (`shadow-[2px_0_4px_-2px_...]` vs
  `shadow-[4px_0_6px_-4px_...]`) — mức độ quá thấp (cosmetic, gần như không nhận ra
  bằng mắt thường), 4 vs 3 chỗ dùng không rõ bên nào là "chuẩn" — không sửa, ghi nhận
  nếu sau này cần dọn.
- Race condition nhẹ ở `BiSupermarketMapAdmin.tsx` (2 admin sửa map cùng lúc,
  last-write-wins) — rủi ro thấp (thường chỉ 1 admin thao tác), không sửa.
- Audit trail (Đợt 3) chưa mở rộng ghi log cho hành động Đợt 4 (sửa bảng map, kết quả
  upload biData) — khoảng trống thật nhưng không phải bug/không ảnh hưởng người dùng
  cuối, để dành cho yêu cầu riêng nếu user cần.

## Verify
`tsc --noEmit`, `eslint features/bi-dashboard`, `npm run build`, `npm run
lint:ratchet` đều sạch. Fix dòng "Tổng" tổng hợp đã test độc lập bằng script Node
ngoài repo (không phải Playwright — không cần trình duyệt để verify logic thuần hàm)
xác nhận: tổng đúng, cột % để trống đúng, trường hợp chỉ 1 Kho ra kết quả hợp lý
(Tổng = chính dòng đó).
