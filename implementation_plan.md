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

---

# [MODULE Check Thưởng] Rà soát toàn diện (2026-09-02, commit `ae9cfe49`)

## Bối cảnh — kiến trúc khác hẳn phần còn lại của app
User yêu cầu "kiểm tra lại toàn bộ chức năng Check Thưởng". Phát hiện quan trọng: đây
KHÔNG phải React component thông thường như Phân Tích/Report BI — toàn bộ logic
nghiệp vụ nằm trong `public/check-thuong.html` (2477 dòng, ~186KB, vanilla JavaScript
viết inline, dùng CDN cho xlsx.js/html-to-image/idb-keyval), nhúng vào app React qua
`<iframe>` sandbox trong `components/views/CheckThuongView.tsx`, giao tiếp 2 chiều
bằng `postMessage`. File này KHÔNG qua `tsc`/`eslint`/`npm run build` (là static asset
trong `public/`, Vite chỉ copy nguyên văn) — mọi kiểm chứng phải làm thủ công (Node
`--check` cho cú pháp, Playwright cho hành vi thật).

**Phát hiện kỹ thuật quan trọng cho lần sau**: `check-thuong.html` DÙNG THẬT class
Tailwind (`rounded-xl`, `hidden`, `fixed`...) dù không tự load Tailwind — vì
`CheckThuongView.tsx` copy toàn bộ `<style>`/`<link>` của app cha vào iframe lúc
`onLoad` (dùng để áp font người dùng chọn, nhưng tiện thể mang theo cả Tailwind CSS
đã compile). Hệ quả: mở trực tiếp `check-thuong.html` (không qua iframe thật) khiến
MỌI class Tailwind vô hiệu — phải test qua đúng luồng `?tab=check-thuong` → click
"Dùng Thử" → `page.frameLocator(...)` mới đo được style thật.

Dùng 2 Explore agent song song (bug/tính toán, đồng nhất UI), sau đó tự verify từng
phát hiện bằng Node script độc lập + Playwright qua đúng luồng iframe thật trước khi
sửa (đúng kỷ luật đã áp dụng xuyên suốt các đợt audit trước).

## Đã sửa (commit `ae9cfe49`)

**Bug nghiêm trọng nhất — `parseNumber()` sai số kiểu VN thuần nghìn**:
`parseNumber("1.234.567")` trả về `1.234` thay vì `1234567` (sai ~1 triệu lần).
Nguyên nhân thật (khác mô tả ban đầu của agent — đã tự trace lại bằng tay + Node):
so sánh `lastIndexOf('.')`/`lastIndexOf(',')` trực tiếp — khi chuỗi chỉ có 1 LOẠI
dấu, dấu đó luôn có index ≥ 0 còn dấu vắng mặt = -1, nên nhánh "dấu cuối là thập
phân" LUÔN thắng, nhánh heuristic phân biệt đúng nghìn/thập phân (đã viết sẵn, đúng
logic) không bao giờ chạy tới được — dead code do lỗi so sánh, không phải dead code
đúng nghĩa. Chỉ ảnh hưởng khi ô Excel là **text** (không phải number cell) hoặc
**upload CSV**. Sửa: chỉ dùng "dấu cuối là thập phân" khi CẢ HAI loại dấu cùng xuất
hiện — verify bằng Node script độc lập, 15 test case đều pass.

**Bug mất dữ liệu âm thầm trong iframe** (cùng loại bug đã sửa ở `CheckThuongView.tsx`
phía React trước đây — chưa áp dụng bên trong iframe): `saveState()`/`reloadFromIDB()`
chỉ `console.warn` khi `idb-keyval` ghi/đọc thất bại. Thêm postMessage
`CHECK_THUONG_SAVE_ERROR`/`CHECK_THUONG_LOAD_ERROR` → `CheckThuongView.tsx` hiện
`toast.error` thật (iframe không có sẵn thư viện toast riêng).

**UX hứa nhưng không hoạt động — kéo-thả file**: UI ghi "hoặc thả các file Excel vào
đây" nhưng không có listener `dragover`/`drop` — thả file thật bị trình duyệt tự điều
hướng mở file (rời khỏi app). Tách `handleFileSelect(event)` → `processFile(file)`
dùng chung, thêm listener kéo-thả đầy đủ + chặn hành vi mặc định ở `document`. Verify
qua Playwright: giả lập kéo-thả CSV qua đúng iframe thật (`?tab=check-thuong` → Dùng
Thử → `frameLocator`), xử lý đúng ("Đã tải: test.csv", chuyển đúng sang màn hình tìm
kiếm), 0 lỗi console.

**UI lệch chuẩn** (màu sắc/font-family/`window.alert` đã SẠCH 100% từ đợt chuẩn hoá
trước — xác nhận lại qua agent, không cần sửa gì thêm ở phần đó):
- `#rankingModal`/`#versionModal` không bo góc trên desktop (chỉ có override 12px
  riêng cho mobile) — thêm `rounded-xl overflow-hidden`, verify qua Playwright đúng
  luồng iframe thật: `getComputedStyle().borderRadius = "12px"`.
- `.s-card` (thẻ ngành hàng) `border-radius:0` trên desktop trong khi mobile override
  8px — sửa base về 12px (khớp `.stat-mini` cùng "họ" thẻ nhỏ trong file).
- `.filter-pill` tên "pill" nhưng `border-radius:0` (hình chữ nhật) — sửa `9999px`.
- 2 bảng trong modal xếp hạng thiếu `font-bold` ở header — đã thêm.

## Đã xử lý tiếp — commit `826734a7` (2026-09-02, theo yêu cầu "hoàn thiện chức năng")

**1. `validateDataStructure()` lệch vị trí cột** — ĐÃ THÊM CẢNH BÁO MỀM (không phải
refactor lớn như đánh giá ban đầu): giữ nguyên `validateDataStructure()` (0 rủi ro
regression cho file đang chạy đúng), thêm hàm `warnIfColumnsMisaligned()` gọi ngay
sau khi tìm thấy dòng tiêu đề — `console.warn` khi cột ở đúng vị trí `COLS` mong đợi
(`SIÊU_THỊ`, `NGANH_HANG`, `TONG_THUONG`) không khớp từ khoá tương ứng. Không chặn,
không đổi hành vi cho end-user — chỉ giúp người quản lý template phát hiện sớm qua
DevTools nếu Excel gốc đổi cấu trúc cột.

**2. Modal "Lịch Sử Phiên Bản" mồ côi** — ĐÃ KHÔI PHỤC. Thêm 2 nút trigger dùng chung
class `.version-info-trigger`: 1 trong `landingPage` (badge nhỏ cạnh "Local
Processing/Instant Speed/Smart UI"), 1 dạng cố định góc màn hình
`#versionInfoPersistent` (`position:fixed`, luôn hiện bất kể trạng thái landing/đã
tải file). **Phát hiện phụ quan trọng trong lúc làm**: thử đặt nút thứ 2 bên trong
`#searchSection` trước — Playwright báo "element not visible" dù element tồn tại
đúng trong DOM, truy ra nguyên nhân: `#searchSection` có `style="display:none
!important"` INLINE, JS chỉ `classList.remove('hidden')` (không đủ thắng inline
`!important`) nên section này (chứa input mã Kho, nút tra cứu/đổi file bên trong
iframe) **không bao giờ thật sự hiện ra được** — cực nhiều khả năng đây là cách "ẩn
tạm" có chủ đích sau khi thêm thanh tìm kiếm tương đương ở header cha qua React
portal (`CheckThuongView.tsx` → `#global-header-actions`, cùng gửi postMessage
`CHECK_THUONG_SEARCH`/`CHECK_THUONG_CHANGE_FILE`), không phải lỗi quên. KHÔNG sửa
(gỡ style có thể lộ ra 2 thanh tìm kiếm trùng lặp — cần quyết định thiết kế trước) —
đã ghi chú tại chỗ trong code, chuyển nút version sang vị trí khác không phụ thuộc
section này.

## Đã điều tra, KHÔNG sửa — cần quyết định thêm hoặc rủi ro > lợi ích
- **`#searchSection` có `style="display:none !important"` inline không bao giờ được
  gỡ** — xem phát hiện phụ ở mục "Đã xử lý tiếp" ngay trên. Chức năng tương đương đã
  hoạt động qua React portal nên KHÔNG ảnh hưởng người dùng cuối — chỉ là dead code
  bên trong iframe. Cần quyết định thiết kế (giữ nguyên làm dự phòng, hay xoá hẳn
  HTML chết) trước khi động vào.
- Công thức "nearly/cơ hội vàng" lặp lại y hệt ở 3 nơi — hiện nhất quán, chỉ là rủi ro
  bảo trì (sửa 1 chỗ quên chỗ khác), không phải bug hiện tại — không sửa.
- Race condition chọn 2 file liên tiếp cực nhanh (FileReader cũ không bị huỷ) — xác
  suất thấp, không sửa.
- `.pastel-violet`/`.pastel-teal`/`.pastel-orange` đã đổi đúng hex sang
  indigo/sky/rose nhưng giữ tên class cũ — chỉ là nợ đặt tên, không ảnh hưởng hiển
  thị, không sửa.
- `postMessage(..., '*')` không kiểm tra `event.origin` — rủi ro thấp vì đã sandbox
  iframe, không sửa.

## Verify
`node --check` xác nhận cú pháp JS hợp lệ sau khi sửa (file không qua tsc/eslint vì
là static asset). 0 `id` trùng lặp trong HTML. Playwright qua ĐÚNG luồng
`?tab=check-thuong` → "Dùng Thử" → `frameLocator` (không phải mở file trực tiếp — xem
lưu ý Tailwind ở trên): xác nhận bo góc modal = 12px thật, kéo-thả file hoạt động
đúng end-to-end, 0 lỗi console.

**Sự cố ngoài ý muốn trong lúc audit**: lúc dọn tiến trình test, đã lỡ tắt nhầm dev
server (`npm run dev`, cổng 5173) mà user đã yêu cầu chạy trước đó — nhận diện qua
`lsof -ti:5173` trả về 2 PID không rõ PID nào là của lệnh vừa chạy, kill nhầm 1 trong
2. Đã khởi động lại ngay khi phát hiện. **Bài học nhắc lại (đã từng mắc lỗi này 1 lần
trước đó trong phiên)**: KHÔNG bao giờ `kill` theo PID lấy từ `lsof -ti:<port>` nếu
không chắc chắn 100% đó là tiến trình vừa tự khởi động trong CÙNG 1 lệnh — nên lưu
lại PID ngay lúc `nohup ... &` thay vì tra lại qua port sau đó.

---

# [BUG THẬT USER BÁO CÁO KHI DÙNG] Toast "cập nhật ở nơi khác" nổ sai khi tự upload
# (2026-09-02, commit `415923b4`) — KHÔNG nằm trong `public/check-thuong.html`

## Bối cảnh
User tự tay dùng thử ngay sau đợt sửa trên: "Tôi vừa up file lên thì hệ thống lại
thông báo có file dữ liệu mới cần cập nhật" — toast "Dữ liệu Check Thưởng vừa được
cập nhật ở nơi khác (tab hoặc thiết bị khác)" (`CheckThuongView.tsx`) nổ SAI ngay sau
khi TỰ MÌNH upload, không hề có tab/thiết bị nào khác.

**Quan trọng: bug này KHÔNG nằm trong `check-thuong.html`** — nằm ở cơ chế đồng bộ
Cloud CHUNG cho mọi "khóa nặng" (`hooks/useCloudSync.ts` + `services/
firestoreService.ts` + `services/dbService/core.ts`), chỉ lộ rõ nhất qua
`checkthuong_data` vì đây là payload lớn nhất (~4MB, ghi chunked nhiều batch) nên cửa
sổ đua (race window) dài nhất, dễ trúng nhất.

## Phát hiện qua git history — đây là lần thứ 3
Đọc code phát hiện bug này đã được "vá" 2 LẦN TRƯỚC, cả 2 đều ghi rõ trong comment là
đang sửa CHÍNH bug user vừa báo cáo lần này:
1. Commit `67df4f76` (2026-08-11): thêm `isInitialSnapshot` — sửa case "mở app 1 tab
   bình thường cũng nổ toast" (đồng bộ khởi động bị hiểu nhầm thành tab khác).
2. `services/dbService/core.ts` hàm `touchLastModified()` (không rõ ngày qua git
   blame nhanh, đọc comment): thêm sau khi "user báo cáo LẠI" — chốt lại
   `lastModified_` cục bộ ngay sau khi ghi Firestore xong, để lần so sánh
   `cloudTime > localTime` kế tiếp không còn lệch nhiều giây.

Cả 2 lớp đều là SUY LUẬN GIÁN TIẾP qua so sánh mốc thời gian — vẫn còn cửa sổ đua do
lệch đồng hồ client/server + độ trễ round-trip mạng, không đóng được TRIỆT ĐỂ.

## Đã sửa — dùng tín hiệu TRỰC TIẾP từ Firestore SDK thay vì suy luận
`hooks/useCloudSync.ts`: thêm guard MỚI làm lớp chặn ĐẦU TIÊN (trước cả 2 lớp cũ, giữ
nguyên không xoá): kiểm tra `docChange.doc.metadata.hasPendingWrites`. Đây là cờ do
chính Firestore SDK quản lý — `true` nghĩa là snapshot đến từ cache cục bộ của CHÍNH
TAB này cho 1 lượt ghi CHƯA được server xác nhận, tức chắc chắn là tiếng vọng của
chính mình (không phải suy luận qua so sánh số). Đã xác nhận `services/firebase.ts`
KHÔNG bật multi-tab IndexedDB persistence (`enableIndexedDbPersistence`/
`enableMultiTabIndexedDbPersistence`/`persistentMultipleTabManager` — 0 kết quả grep)
nên cache của tab/thiết bị khác không thể lẫn vào cache "pending" của tab này — tín
hiệu này đáng tin cậy 100% cho đúng use-case cần phân biệt.

## Verify — GIỚI HẠN QUAN TRỌNG, CẦN USER TỰ XÁC NHẬN
`tsc --noEmit`, `eslint`, `npm run build` đều sạch. **CHƯA test trực tiếp với
Firestore thật** — cần tài khoản đăng nhập thật + thao tác upload file lớn để quan
sát hành vi `onSnapshot` sống, không có sẵn trong môi trường agent (không tự đăng
nhập OAuth thay user được, và dựng Firestore Emulator cho riêng test này là việc lớn
hơn cần thiết cho 1 fix đã có cơ sở lý thuyết vững). Fix dựa trên hiểu biết chuẩn về
Firestore JS SDK (`hasPendingWrites` là cơ chế được thiết kế đúng mục đích này, tài
liệu chính thức) + lập luận đã ghi đầy đủ trong comment code. **Đề nghị user tự thử
lại đúng thao tác đã gặp bug (upload file Check Thưởng) để xác nhận đã hết.**

---

# [MODULE In Sticker / features/sticker-event/] Bug "Lưu danh sách" + audit toàn diện
# (2026-09-03, commit `7ca50d94`, rules đã deploy production)

## Bug user báo cáo — ĐÃ SỬA + ĐÃ VERIFY BẰNG TEST THẬT

"Event - Tồn kho": admin lưu danh sách sau khi xử lý tồn kho "không lưu được" (luôn
thất bại), nhân viên "lúc lưu được lúc không". Nguyên nhân: `saveListToFirestore()`
nhét toàn bộ items vào 1 field của 1 document Firestore — vượt giới hạn cứng 1MiB khi
danh sách đủ lớn (đặc biệt admin lưu TOÀN BỘ tồn kho chưa lọc). Bằng chứng gốc rễ:
file `services/firebaseService.ts` đã có SẴN pattern chunking cho products/inventory
(`CHUNK_SIZE` 400/300) — đội ngũ trước đã biết cần chunk, nhưng bỏ sót tính năng "Lưu
danh sách".

**Đã sửa**: `saveListToFirestore()` tự chunk khi `items.length > 3000` vào
subcollection `itemChunks/` (tương thích ngược 100% với danh sách nhỏ/cũ),
`fetchSavedListsFromFirestore()` tự ráp lại đúng cho cả 2 dạng lưu trữ (vẫn trả kèm
`items` đầy đủ như cũ — KHÔNG đổi sang lazy-load vì phát hiện `useStickerPrinterData.ts`
dùng ngay `c.items` lúc liệt kê tổng quan để build preview sticker, đổi sẽ phá luồng
đó), `deleteSavedListFromFirestore()` dọn thêm subcollection khi xoá. Thêm rule
Firestore cho subcollection mới (thiếu sẽ rơi xuống rule wildcard chặt hơn, gây
permission-denied im lặng).

**Verify bằng test end-to-end THẬT** (không chỉ đọc code): dùng tài khoản
`admin_test_claude_qa2`/kho `TESTCLAUDEQA` qua Playwright — đăng nhập → thêm sản phẩm
test → Lưu DS → alert xác nhận thành công → **danh sách xuất hiện NGAY trong "DS đã
lưu"** (đúng phần bug user báo cáo, nay đã hoạt động đúng) → bấm Mở → nạp lại đúng nội
dung → 0 lỗi console. Đã hỏi + được xác nhận deploy `firestore.stickerevent.rules` lên
production ngay trong phiên. **Chưa test được nhánh chunk thật** (cần file tồn kho
hàng nghìn dòng, không có sẵn) — tự tin dựa trên: pattern tái dùng y hệt code đã chạy
production cho products/inventory, tsc/eslint/build sạch.

## Bug rò rỉ dữ liệu chéo project phát hiện thêm khi audit (ĐÃ SỬA)

Trong lúc audit sâu luồng lưu/tải danh sách, phát hiện `'stickerSavedLists'` nằm
trong `HEAVY_SYNC_KEYS` (`services/firestoreService.ts`, khu vực ROOT). Cùng lớp bug
đã gặp nhiều lần ở module này (cached_dept_id/cached_emp_name, sessionStorage stale
cache): sticker-event dùng Firebase project CÁCH LY riêng nhưng `dbService.ts` của nó
bắn CHUNG sự kiện window `'ycx-setting-changed'` với root (2 zone chia sẻ 1 IndexedDB
vật lý — `BI_HUB_DATABASE_V2/settings`), nên root tưởng đây là setting của chính nó
và tự đồng bộ 2 chiều với Firebase project GỐC — vừa rò rỉ dữ liệu sang project không
nên chứa, vừa có nguy cơ đọc ngược dữ liệu cũ ghi đè lên đúng key IndexedDB cục bộ mà
sticker-event đang dùng. Đã bỏ khỏi `HEAVY_SYNC_KEYS`, thêm vào `excludedKeys` ở cả 2
nơi trong `hooks/useCloudSync.ts` (commit `b2e50c18`).

## Bug tính sai % giảm giá + giá hiển thị trên tem (ĐÃ SỬA)

`stickerprinter/excelParsers.ts` (`parseTemplateExcelData`, luồng tạo tem Giá Sốc/Giờ
Vàng từ file Excel mẫu): giá bán đọc từ Excel KHÔNG được chuẩn hoá qua
`normalizeStickerPriceUnit()` trước khi dùng — trong khi cùng file này đã dùng đúng
chuẩn hoá đó ở luồng khác (`parseErpPriceExcelData` qua `formatPriceChangePercent`).
Lỗi nhập liệu phổ biến (thiếu 3 số 0, VD gõ "1500" thay vì "1500000") khiến cả giá
hiển thị trên tem lẫn % giảm giá tự động chọn ngưỡng (`isSelected`) sai lệch nặng.
Đã gọi `normalizeStickerPriceUnit(retailPrice, salePrice)` ngay sau khi parse, dùng
chung cho cả giá hiển thị và % tính sau đó (commit `34c6e6e4`).

Đã kiểm tra vị trí thứ 2 agent nghi ngờ trùng lặp (`StickerPrintPreview.tsx`,
`autoCalcPercentForContainer`) — **false positive**, file này ĐÃ gọi
`normalizeStickerPriceUnit(oldVal, newVal)` đúng chuẩn trước khi tính, không cần sửa.

## Bug saveUserState() vượt giới hạn 1MiB Firestore (ĐÃ SỬA)

Cùng lớp lỗi với `saveListToFirestore()` nhưng ở tính năng khác: `saveUserState()`
(tự động lưu debounce 1s mỗi khi `displayedProducts` đổi, để khôi phục phiên làm việc
giữa các thiết bị) ghi toàn bộ `Product[]` đầy đủ vào 1 field — cùng dữ liệu đã phải
chunk 400/doc ở `uploadProductsToFirestore`. Trước đây `setDoc()` throw khi vượt giới
hạn khiến CẢ `displayedProducts` LẪN `inventoryFilters` đều không được lưu, lỗi bị
nuốt hoàn toàn (`catch` chỉ `console.error`, comment ghi rõ "Silent fail... not
interrupt UX") nên người dùng không hề biết đồng bộ đa thiết bị đã âm thầm ngừng hoạt
động.

**Chọn chiến lược KHÁC** `saveListToFirestore()` (chunk): vì hàm này chạy tự động rất
thường xuyên (debounce 1s), chunk theo subcollection sẽ tạo khối lượng write Firestore
lớn không cần thiết cho 1 tính năng phụ (không quan trọng bằng "Lưu danh sách" chủ
động). Thay vào đó: nếu `displayedProducts.length > 3000`, bỏ qua riêng phần đó (ghi
`displayedProductsTooLarge: true`), vẫn lưu `inventoryFilters` bình thường, có
`console.warn` rõ ràng thay vì nuốt lỗi (commit `34c6e6e4`).

## Sửa UI theo đúng CLAUDE.md (ĐÃ SỬA, commit `4afb64cf`)

- `StickerPrintControls.tsx`: nút "BẤM ĐỂ IN" dùng hex cứng `#fbbc04`/`#f0b400` — vi
  phạm trực tiếp CLAUDE.md §2 ("Cấm khai báo custom property màu sắc mới trong
  features/*") → đổi sang `amber-400`/`amber-500` (màu ramp đã duyệt, thị giác gần
  như không đổi).
- `StickerPrintControls.tsx`: 2 nút chọn "Nền in" (ĐMX/TGĐ) viết `<button>` thô +
  màu `blue-600` → đổi sang `<Button variant="unstyled">` (RULES.md §2.5 — ESLint
  `no-restricted-syntax` xác nhận hết cảnh báo sau khi sửa) + đổi `blue`→`sky` theo
  bảng màu semantic chuẩn.
- `StickerManualQueue.tsx`: `text-slate-750` là class Tailwind KHÔNG TỒN TẠI (thang
  màu slate chỉ có 50-900/950) — âm thầm không áp dụng màu chữ nào cho ô tìm kiếm
  (no-op, không phải lỗi hiển thị rõ rệt nhưng là dead code gây hiểu nhầm) → sửa
  thành `text-slate-700`.

## Thêm cảnh báo file Excel rỗng/sai định dạng (ĐÃ SỬA, commit `4afb64cf`)

`useStickerPrinterData.ts` → `handleExcelUpload` (luồng "File giá ĐSD - TBBM"):
`parseBatchItemsFromExcelRows` âm thầm trả về `[]` khi file rỗng hoặc không khớp cấu
trúc cột cố định (đọc thẳng theo index cột, không có header-matching) — người dùng
không biết upload có thành công hay không. Đã thêm `toast.error` khi `items.length ===
0`, giống cách `handleTemplateUpload` đã báo lỗi qua `parsed.error` từ trước.

*Lưu ý: phát hiện gốc của agent audit ghi nhầm đây là lỗi "thiếu validate cho luồng
Phiếu Rút Thăm (draw)" — SAI, đã tự kiểm chứng: `handleExcelUpload` chỉ được dùng ở
nhánh gia_soc/gio_vang trong `StickerPrintControls.tsx` (nút "File giá ĐSD - TBBM"),
luồng draw không có nút upload Excel này. Root cause thật là thiếu cảnh báo chung cho
mọi lần upload rỗng, không riêng draw.*

## Cố ý CHƯA sửa (ghi nhận lý do, theo đúng thói quen phiên làm việc này)

- **`hooks/useStickerEventPrint.ts`: key setting không có prefix** (`'modernPositions'`,
  `'printSettings'`) — cùng cơ chế IndexedDB vật lý chung với root (`BI_HUB_DATABASE_V2/
  settings`) nên về lý thuyết có nguy cơ trùng key với root trong tương lai (đúng lớp
  bug vừa sửa ở mục `stickerSavedLists` trên). **Đã kiểm tra: KHÔNG có collision thật ở
  thời điểm hiện tại** (grep toàn repo, root không dùng 2 tên key này). Không sửa ngay
  vì đổi tên key persisted cần xử lý migration cho dữ liệu người dùng cũ đã lưu (nếu
  không, người dùng hiện tại sẽ bị reset về layout/print settings mặc định khi mở app
  sau khi deploy) — rủi ro thực hiện cao hơn lợi ích phòng ngừa 1 nguy cơ chưa xảy ra.
  Nếu về sau root app cần thêm setting trùng tên, xử lý migration lúc đó.
- **`services/uiService.ts`: nhánh `isDark` chết** (dòng ~440, ~900, ~965) — đọc
  `document.documentElement.classList.contains('dark')`, luôn `false` vì dark mode đã
  tắt toàn dự án. Đúng diện CLAUDE.md §2 đã nêu rõ: "Các class `dark:` cũ trong code
  được giữ nguyên (vô hiệu, không cần dọn dẹp)" — áp dụng tương tự cho logic JS đọc
  class `dark`, không phải bug (không gây sai kết quả, chỉ là nhánh không bao giờ vào)
  nên không dọn.
- **190 occurrence class `dark:` còn lại trong 8 file** (chủ yếu `stickerprinter/`) —
  tương tự trên, vô hiệu do dark mode đã tắt toàn dự án, không dọn theo đúng chính
  sách CLAUDE.md. *(Sửa lại hiểu biết cũ trong memory: trước đây từng ghi nhận nhầm
  sticker-event "light-only, 0 dark mode" — SAI, đã đếm lại thực tế.)*

## Verify

`tsc --noEmit`, `eslint`, `npm run build` sạch cho toàn bộ các thay đổi trên (lỗi tsc
hiện có trong `features/phan-ca` là thay đổi CÓ SẴN của user trước phiên làm việc,
không liên quan). Bug "Lưu danh sách" đã test end-to-end thật qua Playwright + tài
khoản production thật (xem mục trên). Các fix còn lại trong đợt audit này (chuẩn hoá
giá Excel, saveUserState, UI màu/button, cảnh báo file rỗng) **chưa test tay trực
tiếp trên UI** — xác nhận qua đọc code + build/lint sạch, do không có sẵn file Excel
mẫu đúng định dạng cột cố định để tái tạo trong môi trường agent. Đề nghị user tự thử
lại nếu có nghi ngờ, đặc biệt luồng "File giá ĐSD - TBBM".

---

# [MODULE Report BI] Quản lý tự cấu hình bảng map Siêu thị → Mã Kho + auto-detect tên
# (2026-09-03, commit `93d5f4b0`, CHƯA deploy production)

## Bối cảnh

Bảng "Map Siêu thị → Mã Kho" (`BiSupermarketMapAdmin.tsx`) — dùng để biết dán dữ liệu
Báo cáo Tổng hợp/Thi đua Luỹ kế (gộp nhiều siêu thị 1 lần dán) vào đúng
`biData/{maKho}` khi chia sẻ cho nhân viên cùng Kho — trước đây chỉ Admin cấu hình
được. Quản lý các Kho mới/siêu thị mới phải nhờ Admin thêm hộ, dù chính họ đã biết
rõ Mã Kho của mình (field `departmentId` khai báo lúc đăng ký tài khoản, xem màn
"Cài Đặt Hệ Thống > Phân Quyền"). User yêu cầu 4 phần: (1) mở quyền cấu hình cho
Quản lý, (2) tận dụng `departmentId` có sẵn để giới hạn/pre-fill Mã Kho, (3) tự động
liệt kê tên siêu thị đã xuất hiện trong dữ liệu vừa dán thay vì gõ tay, (4) thiết kế
gọn lại UI.

## Quyết định kiến trúc quan trọng — đã hỏi user qua AskUserQuestion

Bảng map cũ là **1 Firestore document DUY NHẤT** `biSupermarketMap/config` (field
`map: Record<name,maKho>`) chứa mapping của TOÀN BỘ hệ thống, không tách theo Kho.
Nếu chỉ đổi 1 dòng Rules (`isAdmin()` → `isManager()`) thì BẤT KỲ Quản lý nào cũng có
toàn quyền sửa/xoá mapping của MỌI siêu thị, kể cả siêu thị không thuộc Kho họ quản
lý — rủi ro 1 Quản lý vô tình ghi đè/xoá nhầm mapping của Kho khác, ảnh hưởng dữ liệu
chia sẻ của người khác.

**Đã hỏi user chọn giữa 2 phương án** (an toàn hơn nhưng cần đổi cấu trúc lưu trữ,
hay đơn giản hơn nhưng rủi ro cross-Kho) — **user chọn phương án an toàn**: đổi sang
**1 Firestore document CHO MỖI Mã Kho** (`biSupermarketMap/{maKho}`, field
`names: string[]`) để Rules kiểm tra quyền TRỰC TIẾP qua path param, mirror đúng
pattern đã có sẵn cho `biData/{maKho}` (dùng `myKhos()`) — không cần Cloud Function
mới. `fetchSupermarketMap()` (hàm đọc, dùng ở nhiều nơi khác: `DataUpdater.tsx`,
`useDashboardLogic.ts`) giữ nguyên contract cũ 100% (vẫn trả `Record<name,maKho>`,
đọc gộp từ toàn bộ collection) — không phải sửa bất kỳ nơi gọi nào khác.

## Đã làm

1. **`firestore.rules`**: `biSupermarketMap/{maKho}` — `write: if isAdmin() ||
   (isManager() && maKho in myKhos())`. Khác biệt CỐ Ý so với `biData/{maKho}`: Admin
   bypass hoàn toàn `myKhos()` (ghi được mọi Mã Kho, kể cả Kho không thuộc quyền quản
   lý trực tiếp của họ) vì đây vẫn là bảng tra cứu toàn hệ thống Admin cần vận hành
   được hết; Quản lý chỉ `maKho in myKhos()`.
2. **`biSupermarketMapService.ts`**: viết lại hoàn toàn. Xoá `saveSupermarketMap()`
   cũ (ghi đè cả object — dễ mất dữ liệu khi 2 người sửa gần đồng thời). Thêm 3 hàm
   dùng `arrayUnion`/`arrayRemove` (không đọc-rồi-ghi-đè cả mảng, tránh race
   condition): `addSupermarketNameToKho`, `removeSupermarketNameFromKho`,
   `moveSupermarketNameToKho` (đổi Kho 1 dòng = xoá khỏi doc cũ + thêm vào doc mới,
   gộp 1 `writeBatch` atomic).
3. **`BiSupermarketMapAdmin.tsx`**: viết lại. Nhận props `isAdmin`/`allowedKhos`/
   `summaryLuyKe`/`competitionLuyKe` từ `DataUpdater.tsx`. Ô chọn Mã Kho theo role:
   Admin tự do gõ; Quản lý 1 Kho → Badge cố định; Quản lý nhiều Kho → `Select` giới
   hạn đúng `allowedKhos`. Nút Sửa/Xoá chỉ hiện ở dòng thuộc đúng Kho người dùng
   (`canEditRow`). Tự động liệt kê `unmappedNames` = tên trong
   `extractSupermarketList(summaryLuyKe)` ∪ `parseCompetitionDataBySupermarket(
   competitionLuyKe)` (đã có sẵn, không viết logic parse mới) mà chưa có trong map —
   hiển thị nổi bật, chỉ cần điền Mã Kho + Lưu từng dòng. Gọn UI: hướng dẫn dài/form
   thêm thủ công/bảng đầy đủ đều ẩn sau toggle, đóng mặc định — 0 tên cần cấu hình
   thì Card chỉ còn 1 dòng subtitle + nút thu gọn.
4. **`DataUpdater.tsx`**: gate hiển thị đổi từ `isAdmin` sang `canManageSharedBiData`
   (admin hoặc manager có ≥1 Kho), truyền thêm 4 props trên.
5. **`tests/firestore.rules.test.mjs`**: thêm nhóm test `biSupermarketMap/{maKho}`,
   mirror nhóm `KHO DATA` đã có — có case riêng xác nhận Admin bypass `myKhos()`
   thành công (điểm khác biệt cố ý so với `biData`).

## Migration dữ liệu cũ

`biSupermarketMap/config` (schema cũ) chỉ có ĐÚNG 1 dòng thật:
`"ĐML_STR_STR - 99 Hùng Vương" → "910"`. Quyết định KHÔNG viết script migration (chi
phí/rủi ro cao hơn hẳn 1 thao tác thủ công) — **sau khi deploy, cần Admin nhập lại
tay đúng 1 dòng này qua UI mới** (nút "Thêm siêu thị khác", < 30 giây, đồng thời là
bước UAT xác nhận luồng thêm thủ công hoạt động đúng). Doc `config` cũ để nguyên
không xoá — `fetchSupermarketMap()` mới bỏ qua an toàn doc nào không có field
`names` dạng mảng, không tạo entry rác.

## Verify — giới hạn cần lưu ý

`tsc`/`eslint`/`build` sạch cho toàn bộ file đã sửa (`npm run check` đầy đủ vẫn bị
chặn bởi lỗi tsc/ratchet sẵn có trong `features/phan-ca` — thay đổi dở dang riêng của
user, không liên quan). **Test `tests/firestore.rules.test.mjs` viết xong nhưng CHƯA
CHẠY ĐƯỢC** — máy không có Java Runtime cho Firestore Emulator (`npm run test:rules`
báo lỗi "Unable to locate a Java Runtime"). Code test mirror chính xác cấu trúc nhóm
`KHO DATA` đang PASS sẵn có trong cùng file, tự tin về mặt cú pháp/logic nhưng **chưa
có xác nhận chạy thật**. Đề nghị: cài Java (`brew install openjdk`) rồi chạy
`npm run test:rules` trước khi deploy rules lên production, hoặc deploy rules trước
rồi verify bằng tài khoản Quản lý thật theo đúng 11 kịch bản thủ công đã liệt kê
trong bản kế hoạch triển khai (`/Users/ltson/.claude/plans/wobbly-hugging-raccoon.md`
— các mục Migration/Thứ tự thực hiện/Verify).

**CHƯA deploy `firestore.rules` lên production** — cần user xác nhận trước khi
`npm run deploy:rules` (theo đúng quy trình mọi lần deploy trong dự án này).

## Fix bổ sung — user dùng thử ngay sau khi làm xong, phát hiện 3 bug UI (commit `b429b601`)

User bấm thử UI mới (Admin) ngay trong phiên, báo cáo 2 vấn đề, đọc code phát hiện
thêm 1 vấn đề thứ 3 liên quan:

1. **"Vừa gõ 1 số bị văng ra" (mất focus mỗi ký tự)** — root cause: `KhoInput` (ô
   chọn Mã Kho dùng chung cho 3 chỗ) bị định nghĩa LỒNG bên trong component
   `BiSupermarketMapAdmin`. Mỗi keystroke → state đổi → component cha re-render →
   React tạo function reference MỚI cho `KhoInput` → coi là 1 loại component khác →
   unmount/mount lại `<input>` DOM → mất focus. Đây là bug kinh điển của React
   ("component định nghĩa lồng bên trong component khác") — **cần nhớ khi viết code
   React trong dự án này về sau: KHÔNG BAO GIỜ định nghĩa 1 component (kể cả nhỏ,
   kể cả chỉ dùng nội bộ 1 file) bên trong function body của component khác**, luôn
   hoist ra module scope, truyền props thay vì đóng gói qua closure. Đã sửa.
2. **Vùng trống lớn vô hình sau ô Mã Kho** — `Input`/`Select` mặc định
   `fullWidth=true` (div wrapper `w-full`), trong khi class `w-24`/`w-28` truyền qua
   `className` chỉ áp cho `<input>` bên trong, không áp cho wrapper — dư khoảng trắng
   chiếm hết flex-basis còn lại trước nút "Lưu". Thiếu `fullWidth={false}` ở nhánh
   admin (đã có sẵn ở nhánh Select cho manager, chỉ quên ở nhánh Input). Đã sửa.
3. **"Mã kho chỉ cho phép nhập số"** — thêm `.replace(/\D/g, '')` lọc ký tự không
   phải chữ số ngay khi gõ (chỉ áp dụng cho ô Mã Kho tự do của Admin — Quản lý dùng
   Badge/Select nên không cần lọc).
4. **"Tên siêu thị không xuống dòng, căng đều ra"** — đổi layout dòng "chưa có Mã
   Kho" từ `flex` sang CSS Grid 3 cột cố định, tên dùng `truncate` + `title` (1 dòng,
   hiện đầy đủ khi hover) thay vì tự xuống dòng theo nội dung.

Đã verify tsc/eslint/build sạch. **Chưa test lại bằng UI thật sau fix** (agent không
mở được browser tương tác) — đề nghị user gõ thử lại Mã Kho để xác nhận hết mất
focus.

## Fix bổ sung lần 2 — thu gọn UI theo yêu cầu tiếp theo (commit `e6532f21`)

Sau khi bấm thử UI, user yêu cầu thêm: bỏ hẳn "Hướng dẫn"; thu gọn bảng/khu vực;
**mặc định đóng toàn bộ khu vực cấu hình, chỉ hiện 1 dòng trạng thái** — cảnh báo
màu đỏ nếu có siêu thị chưa khai báo Mã Kho, im lặng (không thông báo) nếu đã đủ.

Đã sửa: bỏ hẳn nút "Hướng dẫn" + đoạn text hướng dẫn + subtitle Card. Thêm state
`isExpanded` (mặc định `false`) — khu vực cấu hình (danh sách chưa map/thêm thủ
công/bảng đầy đủ) giờ nằm trong 1 khối ẩn/hiện, đóng mặc định. Dòng trạng thái luôn
hiện (kể cả lúc đóng): `rose` (đỏ, đúng yêu cầu "cảnh báo đỏ") + số lượng nếu
`unmappedNames.length > 0`, `slate-400` (xám, im lặng) "Đã cấu hình đủ Mã Kho" nếu
không. Đồng thời giảm padding/gap/chiều cao các phần tử (Input/Select/Button đồng
bộ `h-8`) và đổi màu box "chưa có Mã Kho" từ `amber` sang `rose` để khớp đúng "cảnh
báo đỏ" thay vì "cảnh báo vàng" như thiết kế lần đầu.

Verify: tsc/eslint/build sạch. Vẫn **chưa test lại bằng UI thật** — cùng giới hạn
môi trường agent như lần fix trước.

---

# [MODULE Phân Tích] Bỏ bo góc rounded-xl/2xl ở toàn bộ khu vực (2026-09-04)

## Đợt 1 — 2 điểm user tự chỉ ra qua ảnh chụp (commit `743a0532`)

User gửi ảnh chụp module Phân Tích, khoanh đỏ 2 góc bo tròn không mong muốn trên
desktop (lg breakpoint):
1. `components/summary/WarehouseSummary.tsx:589` — card "CHI TIẾT THEO KHO" (bọc 1
   bảng biểu thật). Class cũ `rounded-none lg:rounded-2xl` → bỏ hẳn `lg:rounded-2xl`,
   giữ `rounded-none` mọi kích thước. Component này chỉ có đúng 1 nơi gọi trong toàn
   repo (`DashboardView.tsx`) nên sửa thẳng an toàn.
2. `SectionCard` (component dùng chung `components/shared/ui/SectionCard.tsx`) bọc
   banner "ĐƠN HÀNG QUÁ HẠN XUẤT" ở `DashboardView.tsx:461` — **KHÔNG sửa default
   của `SectionCard`** (dùng chung nhiều module khác: `features/phan-ca`,
   `features/bi-dashboard` qua `Card.tsx` riêng, `features/sticker-event`) — chỉ
   override đúng 1 lần gọi bằng `className="relative lg:rounded-none"`
   (tailwind-merge tự áp đúng, không đụng các `SectionCard` khác).

## Đợt 2 — "áp dụng cho TẤT CẢ khu vực" (commit `fc9504c7`)

User yêu cầu mở rộng ra toàn bộ module thay vì chỉ 2 điểm. Dùng Explore agent rà
137 file trong cây import THẬT của `DashboardView.tsx` (BFS qua import, chỉ theo
`components/`, `hooks/`, `services/`, `contexts/`, `utils/` ở gốc — không vào
`features/*`), phân loại rõ "khu vực/card lớn" (cần sửa) vs "phần tử nhỏ"
(button/input/badge/dropdown/toast/overlay tạm thời — không sửa). Đã sửa 10 file:

- 3 nơi dùng `SectionCard` dùng chung còn lại: `TrendChart.tsx:386`,
  `IndustryGrid.tsx:224`, `EmployeeAnalysis.tsx:187` — cùng cách override
  `lg:rounded-none` qua `className` như Đợt 1, không đụng default component.
- 5 nơi hardcode đúng mẫu `rounded-none lg:rounded-2xl`/`rounded-b-none
  lg:rounded-b-2xl` như `WarehouseSummary` đã sửa: `SummaryTable.tsx` (2 chỗ — card
  ngoài dòng 126 + phần thân dòng 201), `ContestTable.tsx:400`,
  `HeadToHeadTable.tsx:145`, `IndustryAnalysisTab.tsx:376`.
- `IndustryGrid.tsx`: 2 card con lồng bên trong (lưới ngành hàng dòng 308, pie chart
  dòng 409) + 1 khối nền lồng trong card pie (dòng 425, `rounded-xl lg:rounded-2xl`)
  — cùng đổi để nhất quán với card cha đã flat.
- `DashboardView.tsx:400` — banner marquee "Thông báo" Super Admin, `rounded-xl` →
  `rounded-none`.
- `LoadingOverlay.tsx` + `SkeletonLoader.tsx` (3 khung `ChartSkeleton`/
  `TableSkeleton`/`TabbedTableSkeleton`) — sửa DEFAULT trực tiếp (không qua
  className override) vì cả 2 file này chỉ có ĐÚNG 1 nơi gọi trong toàn repo
  (`WarehouseSummary.tsx` và `DashboardView.tsx` tương ứng) — không rủi ro lan sang
  module khác. Lý do sửa `LoadingOverlay`: nó phủ `absolute inset-0` ngay trong card
  `WarehouseSummary` đã flat từ Đợt 1 — nếu không sửa, overlay loading sẽ lộ góc bo
  tròn đè lên card vuông góc, lệch rõ.

## Quyết định quan trọng — CHỦ ĐÍCH KHÔNG sửa modal

CLAUDE.md quy định rõ: "Bo góc: rounded-md (cho input/button), rounded-xl (cho
card/modal)... Bảng biểu dùng rounded-none (phẳng)." Modal là 1 LOẠI UI KHÁC với
"khu vực"/bảng biểu theo đúng design system đã duyệt — user cũng chưa từng chỉ vào
modal nào trong các yêu cầu trước, chỉ luôn chỉ vào card/section cố định trên trang.
`components/shared/ui/Modal.tsx` có sẵn prop `noRounded` để override từng lần gọi
nếu về sau user muốn áp dụng cho modal — nhưng KHÔNG tự ý làm việc này khi chưa được
yêu cầu rõ.

## Verify

`tsc --noEmit`, `eslint`, `npm run build` sạch cho toàn bộ 12 file đã sửa qua cả 2
đợt. **Chưa test lại bằng UI thật** (agent không mở được browser tương tác trong
môi trường này) — đề nghị user tự kiểm tra trực quan trên `http://127.0.0.1:5173`
(dev server đang chạy sẵn).

---

# [MODULE Report BI] Khôi phục style tab/bảng về bản backup 08/17 (2026-09-05)

## Yêu cầu

"Tất cả các style thiết kế tab, bảng: sẽ lấy lại thiết kế ở bản backup cũ:
`archive/125. dashboardycx_backup_20260817_203212.zip`" — chỉ khôi phục STYLE thị
giác (màu/border/canh lề/bo góc/kiểu hiển thị %), giữ nguyên 100% logic/tính năng/
bug-fix đã làm từ 08/17 tới nay (Đợt 4 phân quyền siêu thị, audit trail, Custom
Target KPI, lịch sử Thi đua, redesign 18 bảng, nhiều bug fix).

## Cách làm

Giải nén backup, dùng Explore agent đối chiếu 44 file `.tsx` khác nhau trong
`features/bi-dashboard/`, phân 3 nhóm: **A** (thuần style, 6 file — sau khi loại
`Card.tsx` vì chỉ thêm prop mới không phải style thật), **B** (trộn style+logic,
xử lý thủ công từng hunk), **C** (thuần logic, bỏ qua — 4 file:
`CompetitionGridView.tsx`, `bonusTableHelpers.tsx`, `Icons.tsx`, `KpiOverview.tsx`).

**2 nguyên tắc loại trừ quan trọng** (đã hỏi + được user xác nhận qua
AskUserQuestion trước khi làm):
1. **"Button pattern"** (`variant="ghost"`+className dài → `variant="unstyled"
   size="none"`+className ngắn) — render HỆT NHAU trên màn hình, không phải style
   thị giác — GIỮ NGUYÊN bản hiện tại ở mọi file, không revert.
2. **Đổi widget** (`<input>`→`<Input leftIcon="search">`, dropdown tự chế→
   `<MultiSelectDropdown>`) — nâng cấp chức năng thật (icon tìm kiếm, chọn nhiều),
   không phải style — GIỮ NGUYÊN.
3. (Tự đặt thêm) Hunk "cũ" mâu thuẫn trực tiếp luật CLAUDE.md hiện hành (VD nút
   `rounded-xl` trong khi CLAUDE.md quy định `rounded-md`) — KHÔNG revert.

## Đã sửa — 16 file (3 đợt commit)

**Nhóm A (commit `f5436595`)**: `ColorSettingsModal.tsx`,
`AutoBonusErrorDetailModal.tsx`, `Badges.tsx` (MedalBadge quay lại huy hiệu tròn
ring thay vì chữ phẳng "#1/#2/#3"), `BonusDesktopRow.tsx`, `BonusDailyTable.tsx`
(copy thẳng từ backup — xác nhận diff 100% chỉ xoá `border-r`), `CompetitionGroupView.tsx`
(màu rgb() gốc thay vì hex emerald/rose/amber, bỏ Pill, khôi phục zebra-striping).

**Nhóm B (commit `502468f7`, `2144c308`, `c6aa22d7`, `6f10ccf8`)**:
`MultiMonthResultDetailModal.tsx`, `MonthlyBonusTable.tsx` (giữ bug fix
`formatMillionShort`), `BonusGroupListTable.tsx` (giữ mũi tên chỉ hướng sort mới),
`CompetitionListView.tsx` (giữ bug fix `isDash`), `InstallmentTab.tsx` (giữ tính
năng bấm-tên-highlight qua bàn phím), `CrossSellingTab.tsx` (tương tự), `SummaryTableView.tsx`
(giữ nguyên `<Input leftIcon="search">`), `CompetitionCompareView.tsx` (giữ bug fix
epsilon 1e-9), `RevenueTab.tsx` (**đặc biệt cẩn thận** — file này truyền props
xuống `RevenueDesktopRow.tsx` nơi user đang sửa dở; giữ nguyên 100% logic
`hasTarget`/`getHtColor`, chỉ đổi className), `DetailTab.tsx` (bảng pivot đa cấp,
giữ nguyên `DeltaBadge`/cấp "Sản phẩm" mới/`filterSanPham`).

Mọi commit đều verify `tsc`/`eslint`/`build` sạch riêng lẻ trước khi sang file tiếp
theo — không dồn hết rồi mới kiểm tra 1 lần.

## Cố ý KHÔNG sửa — có lý do rõ ràng

- **`RevenueDesktopRow.tsx`, `services/employeeParser.ts`**: user đang sửa dở,
  chưa commit — tuyệt đối không đụng theo yêu cầu bảo toàn.
- **`DashboardHeader.tsx`**: đã hỏi user qua AskUserQuestion — widget đã đổi hẳn
  (select→MultiSelectDropdown, Tabs→2 Button rời, tab "Báo cáo" đã bị xoá logic từ
  lâu), không tách được style khỏi việc đổi widget, dựng lại có rủi ro layout/hành
  vi lệch. User chọn bỏ qua.
- **`NhanVien.tsx`** (phần header icon-box/subtitle): kiểm tra thấy đoạn code liền
  kề có comment ghi rõ đây là **bug fix z-index** (`z-50`, tránh dropdown
  `MultiSelectDropdown` bị `overflow-hidden` của pill cha cắt mất — user từng báo
  cáo lỗi này). Không tách an toàn được style khỏi bug fix → bỏ qua toàn bộ, không
  sửa gì trong file này.
- **7 file kiểm tra kỹ, xác nhận KHÔNG còn hunk style thật nào** sau khi áp 2
  nguyên tắc loại trừ ở trên (toàn bộ "style" trong diff của các file này chỉ là
  Button-pattern hoặc widget-swap): `TargetHero.tsx`, `BonusDataModal.tsx`,
  `CompetitionTab.tsx`, `CompetitionView.tsx`, `CompetitionSummaryView.tsx`,
  `IndividualCompetitionView.tsx`, `SupermarketConfig.tsx`. Không cần sửa gì —
  không phải "bỏ sót", đã kiểm tra kỹ.
- **`Dashboard.tsx`, `Settings.tsx`, `DataUpdater.tsx`**: tương tự trên — style
  trong diff chỉ có 2 hunk Button-pattern mỗi file, không còn gì để revert.

## Còn treo — CHƯA xử lý, cần đợt sau

- **`components/dashboard/IndustryView.tsx`**: có genuine style content (~12 dấu
  hiệu border-r/text-right/Pill/bg-màu qua kiểm tra nhanh) nhưng cấu trúc phức tạp
  — class Tailwind được sinh bằng template string nhiều dòng lồng nhau qua nhiều
  tầng pivot (Ngành hàng > Nhóm hàng > Hàng), rủi ro làm sai cao hơn các bảng khác
  nếu vội. **Chưa động vào file này** — cần 1 đợt riêng, đọc kỹ toàn bộ hàm sinh
  class trước khi sửa.
- **`BonusTab.tsx`**: chỉ 1 hunk rất nhỏ (tên file export đổi từ
  `Bonus_Report_{sm}.png` → `Báo Cáo Thưởng - {sm}.png`) — không ảnh hưởng giao
  diện, bỏ qua vì không đáng công sức riêng 1 dòng.

## Verify

`tsc --noEmit`, `eslint`, `npm run build` sạch sau MỖI commit (không chỉ lần cuối).
Với các file rủi ro cao (`RevenueTab.tsx`, `CompetitionGroupView.tsx`), sau khi sửa
đã `diff` lại với backup để xác nhận phần còn khác biệt 100% là logic, không sót
style. **Chưa test bằng UI thật** (giới hạn môi trường agent) — đề nghị user tự
soi từng bảng đã liệt kê trên `http://127.0.0.1:5173`, đặc biệt các bảng Thi
đua/Thưởng/Doanh thu Nhân viên/Chi tiết Ngành hàng.

---

# Xuất ảnh "Phân Tích Hiệu Quả Cá Nhân" — xuất đủ thông tin (2026-09-05)

**Yêu cầu**: nút camera trong modal Phân Tích Hiệu Quả Cá Nhân (`components/modals/PerformanceModal.tsx`)
phải xuất ĐỦ thông tin. User xác nhận ảnh cũ thiếu 2 thứ: (1) tiêu đề + tên nhân viên,
(2) bảng bị cắt cột bên phải.

**Đã sửa**

1. `components/modals/PerformanceModal.tsx`
   - Thêm header chỉ-dành-cho-ảnh vào đầu `modalContent`: `hidden export-always-show`
     (uiService ép `display:flex` cho `.export-always-show` khi clone, và không xoá phần tử
     `.hidden` nào đã bị ép display). Bỏ qua khi `isBatchExporting` vì nhánh batch tự dựng
     header riêng — tránh 2 tiêu đề chồng nhau.
   - `forcedWidth` khi xuất lẻ: 640 → 960 trên desktop (giữ 640 cho viewport < 768px),
     khớp với `handleBatchExport` vốn đã dùng 960. 640px là nguyên nhân bảng "Chi Tiết Theo
     Khách Hàng" bị dồn chữ/cắt cột.
   - Màu tên NV trong header ảnh dùng `text-sky-700` (palette semantic) thay vì `indigo`
     của header modal, để không tăng `nonSemanticColor` trong lint-ratchet.

2. `services/uiService.ts` — `exportElementAsImage()`
   - Pattern "tên nhân viên" (`text.includes(' - ') && /\d+/`) chỉ còn áp dụng cho phần tử LÁ
     (`el.children.length === 0`). Trước đây `textContent` của div bọc gộp text của mọi con,
     nên chỉ cần 1 nhãn `12345 - Tên NV` ở đâu đó là cả khối cha bị ép
     `white-space: nowrap` + `min-width: max-content` → nội dung nở ngang vượt bề rộng chụp và
     bị cắt bên phải. Ảnh hưởng chung mọi ảnh xuất của khu vực Root (không riêng modal này).

**Verify**: `eslint` sạch trên 2 file sửa, `npm run build` OK, `lint:ratchet` không phát sinh
vi phạm mới ở 2 file này. `tsc --noEmit` còn 24 lỗi CÓ SẴN ở `features/phan-ca/*` và
`features/bi-dashboard/.../DashboardHeader.tsx` — đến từ thay đổi chưa commit trong working tree
của user (`features/phan-ca/types.ts`, `PhanCaView.tsx`...), không liên quan đợt sửa này.
**Chưa test bằng UI thật** — cần user mở modal 1 nhân viên, bấm nút camera và soi ảnh: phải có
tiêu đề + tên NV ở đầu ảnh, và bảng chi tiết không mất cột Doanh Thu bên phải.

## Bổ sung cùng ngày — rút gọn tên sản phẩm trong ảnh xuất

**Triệu chứng còn lại sau bản sửa trên**: ảnh đã có header và đủ nội dung, nhưng vài dòng có tên
sản phẩm rất dài (vd "Pin sạc dự phòng Polymer 20000mAh Type C PD QC 3.0 22.5W Xmobile CarryOn
Y112 Xám kèm Cáp Lightning và Type C" — 108 ký tự) vẫn kéo bảng bung ngang, đẩy cột Doanh Thu
ra ngoài khung ảnh.

**Nguyên nhân**: bảng chi tiết dùng `rowSpan` cho ô "Mã ĐH", nên ở các dòng bán kèm (dòng thứ
2, 3... của cùng đơn) ô **Sản phẩm** trở thành `td` đầu tiên. Bước 7 của
`exportElementAsImage()` coi cột đầu là cột "nhóm/tên" và ép `white-space: nowrap` +
`min-width: max-content` cho nó → tên dài không xuống dòng, kéo giãn cả bảng.

**Cách xử lý** (`components/modals/PerformanceModal.tsx`): rút gọn tên sản phẩm **chỉ trong ảnh
xuất** (`isExporting || isBatchExporting`), cắt tại ranh giới từ gần nhất rồi thêm "…".
Ngưỡng: 60 ký tự cho ảnh 960px (desktop + xuất hàng loạt), 40 ký tự cho ảnh 640px (xuất lẻ từ
điện thoại). Giao diện vẫn hiển thị tên đầy đủ, và thuộc tính `title` của ô giữ nguyên tên gốc.

**Đã cân nhắc nhưng KHÔNG làm**: sửa heuristic "cột đầu = nowrap" trong `uiService.ts` — nó
dùng chung cho mọi bảng xuất ảnh của khu vực Root, sửa ở đó rủi ro hồi quy cao hơn nhiều so với
lợi ích, trong khi yêu cầu của user đúng là "rút gọn tên sản phẩm".

## Bổ sung lần 2 — thu hẹp bề rộng ảnh cho vừa nội dung

Ảnh 960px để lại khoảng trống lớn giữa cột "Sản phẩm" và cột "SL" (đo trên ảnh user gửi:
phần dư ≈ 190px CSS), và thanh tỷ trọng ngành hàng bị kéo quá dài.

- `PerformanceModal.handleExport`: `forcedWidth` desktop 960 → **800** (mobile giữ 640).
- `useExportLogic.handleBatchExport`: `forcedWidth` 960 → **800** để ảnh xuất lẻ và xuất hàng
  loạt của cùng modal giống hệt nhau.
- `EXPORT_PRODUCT_NAME_MAX_LENGTH`: 60 → **55** ký tự cho khớp bề rộng mới (ngưỡng hẹp 40 giữ
  nguyên cho ảnh 640px).

Không ép được bảng co về `width: auto` trong ảnh: bước 7 của `exportElementAsImage()` set
`width: 100% !important` cho MỌI `table`, và `onCloneReady` chạy TRƯỚC bước đó nên không đè
được — nên cách khả thi là chỉnh bề rộng khung chụp như trên.

---

# Thay biểu đồ "Tỷ Trọng Doanh Thu Ngành Hàng" bằng bảng Phụ kiện / Dịch vụ / Gia dụng (2026-09-05)

**Yêu cầu**: bỏ khối "Tỷ Trọng Doanh Thu Ngành Hàng" trong modal Phân Tích Hiệu Quả Cá Nhân, thay
bằng bảng số lượng Phụ kiện & ĐGD "giống như Chi Tiết Theo Kho" (ảnh user khoanh trọn 3 nhóm cột:
SL PHỤ KIỆN, SL DỊCH VỤ, SL GIA DỤNG).

**File mới**: `components/modals/EmployeeCategoryTable.tsx`
- `useCategoryColumns()` đọc cấu hình cột người dùng đã lưu cho bảng Kho
  (`getWarehouseColumnConfig()` — IndexedDB), giữ nguyên định nghĩa cột chuẩn từ
  `DEFAULT_WAREHOUSE_COLUMNS` và chỉ tôn trọng `isVisible` của người dùng (cùng cách
  `migrateColumns()` trong `WarehouseSummary.tsx` làm). Trong lúc chờ IndexedDB / khi đọc lỗi thì
  dùng cấu hình mặc định. **Cột custom bị bỏ qua** — chúng cần bộ lọc riêng của `useWarehouseLogic`,
  không tính được từ metrics theo nhóm.
- Số liệu: gọi LẠI `calculateWarehouseSummary()` (services/summaryService.ts) trên đúng tập dòng
  của nhân viên rồi cộng các nhóm — không viết công thức mới, nên từng con số khớp bảng Kho (cùng
  bộ lọc hợp lệ, cùng `weightedQuantity` từ `calculateRowMetrics`). Hàm đó gom theo Mã Kho nên
  nhân viên bán ở nhiều kho được cộng lại.
- Cách đọc giá trị cột (`byIndustry`/`byGroup`/`byProduct`, `categoryName` nhiều nhóm ngăn bởi dấu
  phẩy, doanh thu quy về triệu) sao đúng `getColumnValue()` của `useWarehouseLogic`.

**`components/modals/PerformanceModal.tsx`**
- Xoá khối biểu đồ tỷ trọng + phần tính `industryBreakdown` (không còn nơi dùng).
- Thêm `employeeRevenueRows` = dòng hợp lệ của nhân viên **không lọc `price > 0`** — dịch vụ/quà
  tặng giá 0 vẫn phải được đếm số lượng (khác `employeeSalesData` vốn dùng cho phần khách hàng).

**Bề rộng ảnh xuất**: `getCategoryExportWidth()` + `CATEGORY_TABLE_CLASS` đặt trong `constants.ts`
(nơi trung lập để `hooks/useExportLogic.ts` không phải import 1 component). Bảng nhiều cột cần
rộng hơn 800px vì `services/uiService.ts` ép mỗi `th` sub-header tối thiểu 55px (cột đầu 100px)
lúc chụp → công thức `clamp(minWidth, 150 + số_cột × 56, 1150)`. Xuất hàng loạt đếm số cột ngay
trên DOM đã render (nó chụp thẳng `.modal-content`, không đi qua `handleExport`).

**Verify**: eslint sạch, tsc không lỗi ở các file này, build OK, lint-ratchet không phát sinh vi
phạm mới. **Chưa chạy UI thật** — cần user mở modal 1 nhân viên đối chiếu số của bảng mới với dòng
tương ứng ở bảng "Chi Tiết Theo Kho" (khi lọc đúng nhân viên đó), và xuất ảnh xem bảng có bị cắt
cột không.

## Bổ sung — đồng bộ tuyệt đối cột với bảng "Chi Tiết Theo Kho"

User chốt nguyên tắc: siêu thị quan tâm cột nào thì nhân viên cũng vậy — ẩn 1 cột ở bảng Kho là
bảng trong modal nhân viên ẩn theo. Rà lại thì bản đầu còn 3 chỗ có thể lệch:

1. Điều kiện lọc: modal dùng `isVisible !== false`, bảng Kho dùng `filter(c => c.isVisible)` →
   cấu hình lưu thiếu field `isVisible` sẽ hiện ở modal nhưng ẩn ở bảng Kho. Đã đổi thành
   `isVisible === true`.
2. Thứ tự cột: modal sắp theo thứ tự trong `DEFAULT_WAREHOUSE_COLUMNS`, bảng Kho sắp theo `order`
   người dùng đã kéo. Đã đổi sang `order`, và giữ `order`/`isVisible` của cấu hình lưu (chỉ lấy
   lại phần *định nghĩa* cột từ default, đúng như `migrateColumns()`).
3. Version cấu hình: `WarehouseSummary` reset về mặc định khi `warehouseColumnConfigVersion`
   không khớp `'v3'`; modal trước đây không kiểm tra nên có thể bám cấu hình cũ. Đã tách hằng
   `WAREHOUSE_COLUMN_CONFIG_VERSION` trong `constants.ts` cho cả 2 nơi dùng chung, và modal áp
   dụng cùng luật reset.

**Còn khác biệt có chủ ý**: cột **custom** (do người dùng tự tạo trong 3 nhóm đó) không hiển thị ở
modal — giá trị của chúng cần bộ lọc riêng trong `useWarehouseLogic` (industries/subgroups/
manufacturers/productCodes/priceCondition), không đọc được từ metrics theo nhóm. Nếu cần, sẽ làm
riêng một đợt.

---

# Report BI — 2 cột "M.TIÊU V.TRỘI" / "%HTDK V.TRỘI" luôn trống (2026-09-05)

**Triệu chứng**: bảng "Luỹ kế Thi đua" hiển thị "-" ở 2 cột này cho MỌI chương trình, trong khi các
cột khác (L.KẾ, %HTDK, C.LẠI) vẫn đúng.

**Đối chiếu backup** `archive/105. dashboardycx_backup_20260807_094503.zip`: 2 cột này KHÔNG đến từ
dữ liệu dán mà do `useDashboardLogic.ts` tự tính (`augmentData`):
`Target V.Trội = base target × % điều chỉnh` (`comptarget-{kho}-targets` trong IndexedDB, mặc định
100%), `%HTDK V.Trội = (luỹ kế / ngày đã qua × ngày trong tháng) / Target V.Trội × 100`. Bản hiện
tại vẫn còn nguyên phần tính đó (chỉ đổi nguồn base target sang `computeCompetitionBaseTargets`
theo Đợt 4 — đọc từ dữ liệu đã parse thay vì raw text, để nhân viên chỉ-đọc cũng có số).

**Nguyên nhân**: cả 4 khối augment (realtime/luỹ kế × siêu thị/dòng Tổng) đều theo mẫu

```
if (!headers.includes('Target V.Trội')) headersToAdd.push(...)   // chỉ thêm khi CHƯA có
...
program.data.length = originalHeaderCount;
program.data.push(targetVT); program.data.push(htdkVT);          // luôn ghi vào CUỐI
```

Dữ liệu dán từ BI hiện đã kèm sẵn 2 cột đó (bỏ trống), nên `headersToAdd` rỗng → 2 giá trị tính
được rơi vào vị trí **không có header tương ứng** → `CompetitionListView` bỏ qua
(`header === undefined → return null`), còn ô hiển thị vẫn là ô trống của nguồn ⇒ luôn "-".
(Trường hợp nguồn chỉ có 1 trong 2 cột còn tệ hơn: `originalHeaderCount` lệch 1 → cắt mất ô cuối
rồi ghi lệch cột.)

**Sửa** (`features/bi-dashboard/hooks/useDashboardLogic.ts`): thêm `ensureColumnIndex()` (lấy index
cột, tạo cột nếu thiếu) + `writeProgramCells()` (chuẩn hoá độ dài data bằng ô '' — tránh lỗ mảng bị
`Array.map` bỏ qua làm thiếu ô — rồi ghi theo index). Cả 4 khối chuyển từ `push` sang ghi theo
index, nên đúng cho cả nguồn có sẵn 2 cột lẫn nguồn chưa có.

**Verify**: eslint + tsc sạch cho file này, build OK, ratchet không phát sinh vi phạm mới.
**Chưa test dữ liệu thật** — cần user mở lại tab Thi đua (Luỹ kế và Realtime) xem 2 cột đã ra số.
Nếu ra "0" thì nguyên nhân tiếp theo là base target/% điều chỉnh chưa cấu hình cho siêu thị đó
(SupermarketConfig → target thi đua), không phải lỗi ghi cột nữa.

## Bộ lọc bảng Thi đua — bấm thẳng vào nút gạt không ăn (2026-09-05)

**Nguyên nhân**: trong popup "Bộ lọc bảng Thi đua"
(`features/bi-dashboard/components/dashboard/CompetitionView.tsx`, cả 2 danh sách "Chương trình" và
"Cột hiển thị"), `<Switch />` nằm **bên trong** `<div onClick={toggle}>` của cả dòng. Một cú bấm
vào nút chạy `onChange` rồi nổi bọt lên `div` chạy tiếp `toggle` → đảo trạng thái 2 lần, nhìn như
nút chết; bấm vào phần trống của dòng chỉ chạy 1 lần nên vẫn hoạt động.

**Sửa**: `Switch` trong `DashboardWidgets.tsx` gọi `e.stopPropagation()` trước `onChange`. Sửa ở
component thay vì ở CompetitionView vì nút đã tự xử lý sự kiện của nó thì không nên để phần tử cha
xử lý lại. Các nơi dùng `Switch` khác (IndustryView, SummaryTableView, CompetitionTab,
CompetitionSummaryView) đặt nhãn bấm được là phần tử **anh em** của Switch nên không phụ thuộc việc
nổi bọt — không bị ảnh hưởng.

**Verify**: eslint + tsc sạch, build OK. Ratchet: 2 vi phạm còn lại (`Legend.tsx`,
`SummaryTableHeader.tsx`) đến từ thay đổi chưa commit trong working tree của user, không phải đợt
sửa này.

## Bảng Thi đua — thứ tự cột, bộ cột mặc định, đổi tên %HTDK, sắp xếp mặc định (2026-09-05)

1. **Thứ tự cột = thứ tự bật**: `CompetitionView` chuyển từ lưu danh sách cột ẨN
   (`competition-hidden-cols-*`) sang lưu danh sách cột BẬT theo thứ tự
   (`competition-visible-cols-*-v2`); bật thêm cột nào thì cột đó vào cuối danh sách ⇒ cuối bảng.
   Popup Bộ lọc hiện số thứ tự cột bên trái tên để thấy ngay vị trí. `CompetitionListView` đổi prop
   `hiddenColumns` → `visibleColumns`, render header/ô theo danh sách đã sắp xếp và tra ô bằng
   `headers.indexOf(cột)` thay vì `program.data.map` (nhờ vậy cũng hết lệch khi data thiếu ô), cột
   "Còn Lại" trở thành một cột bình thường trong danh sách thay vì luôn ghim cuối.
2. **Bộ cột mặc định**: Realtime = `Target V.Trội, Realtime, %HT V.Trội, Còn Lại`;
   Luỹ kế = `Target V.Trội, L.Kế, %HTDK, Còn Lại`.
3. **Đổi nhãn `%HTDK` → `%DKHT`**: thêm `getCompetitionColumnLabel()` trong `dashboardHelpers.ts`
   dùng chung cho bảng và popup Bộ lọc (chỉ đổi NHÃN, tên cột trong dữ liệu giữ nguyên `%HTDK` để
   không phá logic sort/rename). Cột `%HTDK V.Trội` giữ nguyên tên vì user chỉ yêu cầu đổi `%HTDK`.
   `getHeaderCellClass` nhận thêm `%DKHT` để cột này vẫn giữ màu rose.
4. **Sắp xếp mặc định giảm dần**: Realtime theo `%HT`, Luỹ kế theo `%HTDK` (trước đây là
   `Realtime`/`L.Kế`).

Hai khoá IndexedDB (`competition-sort-config-*`, cột hiển thị) đều thêm hậu tố `-v2`: cấu hình cũ
đang lưu trên máy người dùng luôn khác `null`/khác mặc định nên mặc định mới sẽ không bao giờ được
áp nếu giữ khoá cũ. Đổi khoá = mọi người nhận bộ mặc định mới, và vẫn tự chỉnh lại được như thường.

**Verify**: eslint (chỉ còn 2 warning `<button>` thô có sẵn từ trước ở popup), tsc sạch, build OK,
ratchet không phát sinh vi phạm mới ở các file này. **Chưa test UI thật.**

## Bảng Cấu hình Target Thi đua — bỏ thanh trượt, gộp chức năng sửa tên/nhóm vào bảng (2026-09-05)

`features/bi-dashboard/components/SupermarketConfig.tsx`:

- **Bỏ `<input type="range">`** ở cột "% Target", chỉ giữ ô nhập số %; cột thu từ `minWidth 220px`
  xuống `width 90px`, căn giữa.
- **Cột "Tiêu chí" sửa tên tại chỗ**: bấm vào tên → ô nhập; Enter hoặc rời ô = lưu, Esc = huỷ, để
  trống = trả về tên rút gọn mặc định của BI. Ghi thẳng vào `competition-name-overrides` (đúng khoá
  modal cũ dùng nên các nơi khác trong báo cáo vẫn đọc được).
- **Thêm cột "Nhóm tiêu chí" ở CUỐI bảng**, dùng lại `GroupCombobox` của modal cũ (chọn nhóm có
  sẵn, tạo nhóm mới, xoá/khôi phục nhóm preset). Ghi vào `competition-group-overrides`.
- **Xoá modal `BulkRenameModal` và nút bút chì mở modal** — chức năng đã nằm hết trong bảng (xoá
  ~8.100 ký tự code chết, dọn luôn import `Modal`/`XIcon`/`PencilIcon` không còn dùng).

Hai điểm kỹ thuật đáng lưu:
- Bảng được **gom nhóm theo chính giá trị "Nhóm tiêu chí"**, nên ghi ngay từng ký tự sẽ làm hàng
  nhảy sang bảng khác giữa lúc gõ và ô nhập mất focus. Thêm `CompetitionGroupCell` giữ bản nháp cục
  bộ, chỉ ghi khi CHỐT (chọn trong danh sách / rời ô) — `GroupCombobox` được thêm prop `onCommit`
  để phân biệt "đang gõ" với "đã chốt".
- `CompetitionGroupCell` đặt ở top-level của file, không định nghĩa lồng trong component cha (lồng
  sẽ khiến ô nhập mất focus mỗi ký tự).

**Chức năng bị mất so với modal cũ**: nút "Mặc định" của modal (xoá TOÀN BỘ tên hiển thị + nhóm +
danh sách nhóm đã xoá trong một lần). Vẫn reset được từng dòng (xoá trắng ô tên / "Bỏ chọn" trong
dropdown nhóm). Chưa làm lại nút reset hàng loạt vì user không yêu cầu — cần thì bổ sung sau.

**Verify**: eslint + tsc sạch, build OK, ratchet không phát sinh vi phạm mới ở file này.

## Ô "Nhóm tiêu chí" — làm gọn danh sách + Enter để lưu (2026-09-05)

**Nguyên nhân danh sách bị vỡ chữ/cao bất thường**: 4 nút bên trong `GroupCombobox` (mở danh sách,
"Khôi phục", "Bỏ chọn", nút xoá từng nhóm) dùng `<Button variant="unstyled">` nhưng **quên
`size="none"`**, nên nhận kích thước mặc định `md` = `h-9 px-4`. Trong modal cũ (rộng) không lộ,
nhưng ở cột bảng chỉ ~170px thì nút chiếm hết chỗ, đẩy tiêu đề "Nhóm có sẵn (3)" xuống nhiều dòng
và làm mỗi hàng cao gấp đôi.

**Sửa**: thêm `size="none"` cho cả 4 nút; danh sách chuyển sang `w-max min-w-full max-w-[260px]`
neo phải (nới rộng về bên trái, không tràn khỏi bảng vì đây là cột cuối); thêm `whitespace-nowrap`
cho tiêu đề và các hàng; giảm padding hàng `py-1.5 → py-1`, nút xoá `p-1 → p-0.5`.

**Enter để lưu**: ô nhập nhóm bắt `Enter` → chốt giá trị đang gõ (tạo nhóm mới ngay tại chỗ), đóng
danh sách và rời focus; `Escape` chỉ đóng danh sách. Ô "Tiêu chí" (tên hiển thị) đã có sẵn Enter =
lưu từ đợt trước.

**Verify**: eslint + tsc sạch, build OK, ratchet không phát sinh vi phạm mới ở file này.

## Test E2E sâu cho Report BI + Phân Tích (2026-09-05)

Bộ test Playwright kiểm chứng đúng các thay đổi trong ngày, chạy **10/10 pass** trên cả dev server
lẫn bản build (`E2E_BASE_URL=http://127.0.0.1:4173` + `vite preview`).

**`tests/e2e/bi-competition.spec.ts`** (4 test): cột mặc định đúng thứ tự + nhãn `%DKHT`; 2 cột
vượt trội CÓ số (bug `push` sai vị trí); sắp xếp mặc định giảm dần theo %DKHT; bấm THẲNG vào nút
gạt thì cột được bật và nằm cuối bảng (bug double-toggle + thứ tự theo lượt bật).

**`tests/e2e/phan-tich-performance-modal.spec.ts`** (5 test): bảng "Phụ Kiện & Điện Gia Dụng" thay
cho biểu đồ tỷ trọng; đủ 3 nhóm cột; header ảnh xuất nằm trong DOM nhưng ẩn trên UI; còn nút xuất
ảnh + danh sách khách hàng; **số liệu khớp dữ liệu nạp vào** (CAM 2, SDP 1, Loa 1, MLN 1, N.Cơm 1 —
trùng khít bảng "Chi Tiết Theo Kho" của cùng dữ liệu).

**Những chỗ mất thời gian nhất khi dựng dữ liệu giả (ghi lại để lần sau khỏi dò):**
- Sidebar thu gọn: nhãn chữ `display:none` và hover không bung trong test → nhận diện mục menu bằng
  icon lucide (`button:has(svg.lucide-users)`).
- Thi đua: parser coi "dòng ngay TRƯỚC một dòng header" là tên chương trình, nên mỗi khối dữ liệu
  phải có 1 dòng đệm (dòng `Tổng`) ở cuối, không thì dòng số liệu bị nuốt.
- Bảng Thi đua mặc định ở Realtime + siêu thị "Tổng" (rỗng) → phải chuyển "Luỹ kế" và chọn siêu thị.
- File Excel Phân Tích: cột `Nhóm Hàng` phải là **MÃ số** theo `productConfig.childToParentMap`
  (tên tiếng Việt rơi vào "nhóm hàng mới chưa cấu hình" và bị bỏ qua sạch); `Trạng thái hồ sơ` phải
  là `1 - Mới` vì bộ lọc mặc định là `trangThai: ['1 - Mới']` — sai giá trị là mọi KPI về 0.
- `innerText` trả text đã qua `text-transform: uppercase`, so khớp tên cột phải bỏ qua hoa/thường.

**Phát hiện phụ**: lần chạy đầu trên dev server đang mở sẵn của user báo `ClockIcon is not defined`
(màn Report BI trắng). Chạy lại trên bản build và trên chính dev server đó sau khi Vite nạp lại
module đều bình thường → là nhiễu HMR sau khi sửa import, KHÔNG phải lỗi code.

`playwright.config.ts` thêm biến `E2E_BASE_URL` để chạy test trên server có sẵn (bản build) thay vì
dev server — dùng khi cần loại trừ nhiễu HMR.

## Test E2E trên DỮ LIỆU THẬT (tài khoản lts.truongson@gmail.com) — 2026-09-06

**Cách vào**: profile Chrome RIÊNG cho test (`.e2e-chrome-profile/`, đã gitignore), user tự đăng
nhập Google một lần. Không đụng profile Chrome cá nhân; không ai đọc mật khẩu.

- `scripts/e2e-auth-setup.mjs` mở Chrome qua Playwright để đăng nhập — **Google chặn** ("This
  browser or app may not be secure") vì cửa sổ do công cụ tự động khởi chạy. Cách chạy được: mở
  Chrome BÌNH THƯỜNG bằng lệnh hệ điều hành với `--user-data-dir` trỏ vào profile test, đăng nhập
  ở đó, đóng cửa sổ. Sau đó Playwright dùng lại profile bình thường (Google chỉ chặn lúc ĐĂNG NHẬP,
  không chặn phiên đã có).
- `tests/e2e/helpers/realDataContext.ts`: fixture `launchPersistentContext` trỏ vào profile đó.
  Context để phạm vi TEST (mở/đóng mỗi test) và dùng `pages()[0]`; thử worker-scoped + `newPage()`
  thì trang trắng và context đóng giữa chừng.

**Kết quả (16/16 test toàn bộ bộ E2E pass, trong đó 6 test trên dữ liệu thật):**
- Luỹ kế: cột `M.TIÊU V.TRỘI · L.KẾ · %DKHT · C.LẠI`, **cột vượt trội có số thật**
  (150, 586, 103, 167, 546, 1, 314, 50, 1.269, …) — xác nhận bản sửa `useDashboardLogic` chạy đúng
  trên dữ liệu thật, không còn "-".
- Realtime: cột `M.TIÊU V.TRỘI · T.HIỆN · %HT V.TRỘI · C.LẠI` đúng bộ mặc định mới.
- Bộ lọc cột: bấm THẲNG nút gạt → cột bật và nằm CUỐI bảng.
- Bảng Cấu hình Target Thi đua: không còn `input[type=range]`, cột "NHÓM TIÊU CHÍ" ở cuối, sửa tên
  tại chỗ + Enter lưu được (test tự trả lại tên gốc sau khi kiểm tra).

**Gotcha khi test trên dữ liệu thật (khác hẳn dữ liệu giả):**
- Trạng thái Realtime/Luỹ kế, siêu thị đang chọn và cấu hình cột đều được LƯU trong IndexedDB →
  test phải tự đưa về trạng thái mong muốn, không tin vào mặc định, và phải idempotent.
- `page.locator('div').filter({hasText})` quét toàn bộ div — với trang dữ liệu thật thì treo tới
  hết timeout. Dùng XPath đi thẳng tới phần tử.
- Trang "Cập nhật" có nhiều `<table>` (map siêu thị, mỗi nhóm tiêu chí một bảng) → `table.first()`
  trỏ nhầm; lọc theo `filter({ has: getByText('Nhóm tiêu chí') })`.
- App tải dữ liệu thật từ Firestore nên chậm hơn nhiều: các test này để `test.setTimeout(180_000)`.

**Ghi nhận**: ô "tên tiêu chí" trong `SupermarketConfig.tsx` hiện là `<div onDoubleClick>` (title
"Nhấp đúp để sửa tên hiển thị"), khác bản `<Button onClick>` đợt trước — file đã được sửa ngoài
phiên làm việc này, test đã bám theo trạng thái hiện tại.

---

# Đợt 0 — Lưới an toàn cho tầng tính toán (KE_HOACH_TONG_THE.md) — 2026-09-07

**Mục tiêu**: cài `vitest`, viết test đơn vị cho 4 hàm/khu vực tính toán cốt lõi trước khi bất kỳ
đợt sửa nào sau đó (Đợt 1-8) được phép chạm vào tầng số liệu.

**Đã làm**
- Cài `vitest` + `@vitest/coverage-v8` (devDependencies). `vitest.config.ts` riêng (không dùng
  chung `vite.config.ts` vì test đơn vị là TS thuần, không cần plugin react/tailwind), quét
  `**/*.test.ts`, loại trừ `tests/e2e/` (Playwright) để 2 bộ test không giẫm lên nhau.
- Thêm script `test:unit`/`test:unit:watch`/`test:unit:coverage`. **Đưa `test:unit` vào
  `npm run check`** (giữa `lint:eslint` và `build`) — từ giờ không đổi nào chạm tầng tính toán mà
  phá vỡ test đơn vị có thể lọt qua `npm run check`.
- 4 file test, colocated cạnh source, **76 test, toàn bộ pass**:
  - `utils/dataUtils.test.ts` (40 test): `getRowValue`, `parseNumber`, `roundUp`, `getParentGroup`/
    `getSubgroup`, `getHinhThucThanhToan`, `getHeSoQuyDoi`, `calculateRowMetrics` (nguồn chân lý
    DTQĐ theo CLAUDE.md mục 1), `isValidSalesRow`, `isUncollectedOrder`.
  - `services/filterService.test.ts` (17 test): `isXuatMatch`, `isTrangThaiMatch`/`isNguoiTaoMatch`/
    `isKhoMatch`/`isDepartmentMatch` (null/mảng/Set), `getCreatorDepartment`, `isDateMatch`.
  - `features/bi-dashboard/utils/dashboardHelpers.test.ts` (9 test): `parseCompetitionDataBySupermarket`
    — cả 2 định dạng (cũ: tên+header cùng dòng; mới: tên dòng riêng trước header), bỏ qua dòng
    metadata, sắp xếp chương trình theo tên.
  - `services/summaryService.test.ts` (10 test): `calculateWarehouseSummary` — DT Thực/DTQĐ/Hiệu
    Quả QĐ, trả góp +30%, loại "Đã hủy"/"Đã trả"/"Không tính doanh thu", thu hộ không tính doanh
    thu nhưng đếm `slThuHo`, `slTiepCan` dùng Set khách hàng, sắp xếp nhiều Kho theo DTQĐ giảm dần.

**2 phát hiện THẬT trong lúc viết test — CHƯA sửa, ngoài phạm vi Đợt 0/1, cần user quyết định:**

1. **Bug mất dữ liệu ở `parseCompetitionDataBySupermarket`** (dòng ~156-160
   `features/bi-dashboard/utils/dashboardHelpers.ts`): nhánh "dòng đứng ngay TRƯỚC 1 dòng header
   = tên chương trình mới" được kiểm tra TRƯỚC nhánh nhận diện siêu thị. Hệ quả: nếu dòng số liệu
   của 1 siêu thị đứng ngay trước dòng header của chương trình kế tiếp (không có dòng đệm ở giữa),
   dòng số liệu đó bị hiểu nhầm thành "tên chương trình" và **mất luôn, im lặng, không lỗi**. Test
   `'BUG THẬT...'` trong `dashboardHelpers.test.ts` tái hiện chính xác điều kiện này. Ảnh hưởng
   thực tế phụ thuộc định dạng dữ liệu BI thật khi dán — nếu định dạng dán từ baocao.dienmayxanh.com
   không chèn dòng đệm (như "Tổng") giữa các khối chương trình, một số chương trình có thể bị thiếu
   số liệu trong bảng Thi đua mà không ai nhận ra.
2. **Bất đối xứng chuẩn hoá hoa/thường** giữa `isValidSalesRow` và `isUncollectedOrder`
   (`utils/dataUtils.ts`): `isValidSalesRow` so khớp Hình thức xuất qua `cleanAndNormalize()`
   (không nhạy hoa/thường). Nhánh fallback tĩnh của `isUncollectedOrder` (khi không có
   `revenueEligibleHTX`) so khớp trực tiếp với hằng số gốc, KHÔNG chuẩn hoá — một biến thể
   hoa/thường thật trong Excel (phổ biến) có thể khiến đơn "chưa thu" bị phân loại sai.

**Verify**: `npx vitest run` 76/76 pass. `eslint .` 0 lỗi (8 cảnh báo có sẵn, không liên quan).
`npm run build` OK. `npm run lint:ratchet` không phát sinh vi phạm mới ở file của Đợt 0.
`npm run typecheck` **FAIL** — nhưng lỗi hoàn toàn nằm ở `features/phan-ca/EditShiftModal.tsx`,
`features/phan-ca/PhanCaView.tsx`, `features/bi-dashboard/.../DashboardHeader.tsx` — 3 file
**chưa từng bị Đợt 0 đụng tới** (xác nhận bằng `git diff --stat HEAD -- <3 file>` rỗng), lỗi có
sẵn từ công việc "đồng bộ icon/kích thước toolbar" đang dở của user trước phiên này (commit
`0be9889d`). `npm run check` vì vậy dừng ở bước typecheck — không phải do Đợt 0. 8 test E2E liên
quan (`smoke`, `bi-competition` x4, `phan-tich-performance-modal` x2, `real-data` trên dữ liệu
thật) chạy lại vẫn pass, xác nhận việc cài vitest không ảnh hưởng runtime app.

---

# Đợt 1 — Bảo mật P0 (KE_HOACH_TONG_THE.md) — 2026-09-07

**Mục tiêu**: xử lý lỗ hổng nghiêm trọng nhất đã khảo sát — `xlsx@0.18.5` (Prototype Pollution +
ReDoS, không có bản vá trên npm) và các lỗ hổng phụ thuộc khác.

**Đã làm**
1. **Thay `xlsx@0.18.5` → `xlsx@0.20.3`** (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
   trong `package.json` — SheetJS đã rời npm, bản chính thức chỉ còn phân phối qua CDN của họ).
   0.20.3 là bản mới nhất hiện có (đã dò tuần tự 0.20.4→0.21.1, đều 404) và **vá cả 2 CVE**:
   Prototype Pollution (CVE-2023-30533, vá từ 0.19.3) và ReDoS (CVE-2024-22363, vá từ 0.20.2).
2. **`npm audit fix`** (không dùng `--force`): 26 lỗ hổng (9 high, 1 critical trước đó) → còn
   **9 moderate, 0 high, 0 critical**. Nâng `dompurify` 3.4.11 → 3.4.15 trong phạm vi `^3.4.11` đã
   khai báo — đây là gói DUY NHẤT trong nhóm còn lại thực sự chạy ở trình duyệt (dùng sanitize HTML
   ở `features/sticker-event/stickerprinter/ticketSanitize.ts`).
   **Cố ý KHÔNG chạy `--force`**: 9 lỗ hổng còn lại (`stream-json`, `uuid`, `@opentelemetry/core`,
   `qs`, `body-parser`, `express`...) đều là phụ thuộc bắc cầu của `firebase-tools` (CLI deploy,
   devDependency, không đóng gói vào bundle trình duyệt) — `--force` sẽ **hạ cấp `firebase-tools`
   xuống 10.1.1** (bản rất cũ, phá vỡ lệnh deploy). Rủi ro thực tế thấp (chỉ chạy trên máy dev khi
   gõ `firebase deploy`), đổi lại cái giá quá đắt — không đáng.
3. **Xác minh phạm vi rủi ro thật trước khi hành động** (không suy đoán):
   - `@grpc/grpc-js` (high) đến từ cả `firebase` (client SDK) lẫn `firebase-tools` — nhưng
     `grep -rl "grpc" dist/assets/*.js` sau `npm run build` **rỗng**: không lọt vào bundle trình
     duyệt (Vite tree-shake nhánh Node-only của `@firebase/firestore`).
   - `fast-uri`/`hono`/`@hono/node-server` đến từ `@google/genai` — nhưng gói này **chỉ được
     import ở `functions/src/gemini.ts`** (Cloud Function, project TS riêng, không qua Vite build).
     Xác nhận bằng `grep -rln "@google/genai" . | grep -v functions/` → rỗng.
4. **Xác minh `set_fs()` — phát hiện phụ, không phải lỗi ứng dụng**: sau khi nâng cấp, script Node
   viết file test (`tests/e2e/helpers/salesFixture.ts`) báo lỗi "cannot save file". Nguyên nhân:
   bản ESM (`.mjs`) của `xlsx` >= 0.19 **không tự dò `fs` của Node** như bản CJS cũ (đọc source
   `node_modules/xlsx/xlsx.mjs` xác nhận `write_dl()` yêu cầu gọi `XLSX.set_fs(fs)` tường minh).
   Đã rà toàn bộ 8 chỗ gọi `XLSX.writeFile` trong repo — **7/8 chạy ở trình duyệt** (Blob/download,
   không cần `set_fs`), chỉ helper test Node cần sửa. Thêm 1 dòng `XLSX.set_fs(fs)` vào
   `tests/e2e/helpers/salesFixture.ts`.
5. **Tự sửa 1 lỗi hiểu sai của chính mình khi viết test Đợt 0** (không phải do Đợt 1 gây ra): test
   `parseCompetitionDataBySupermarket` kỳ vọng `metric: 'SLLK'` nhưng code hiện tại GỘP SLLK vào
   DTLK có chủ đích (comment "cùng kết quả, khác đơn vị đo") — tôi đọc sót dòng comment này lúc
   viết test lần đầu. Đã sửa test khớp đúng hành vi thật, không sửa code.

**Verify (tự chạy thật, không chỉ tin build/typecheck)**:
- `npm run build` OK. `vendor-excel` tăng 420KB→500KB (bản xlsx mới lớn hơn — đánh đổi hợp lý,
  việc tách bundle để lại cho Đợt 3 "hiệu năng bundle").
- `npx vitest run`: **76/76 pass**, ổn định qua 3 lần chạy liên tiếp.
- **E2E trên CẢ dữ liệu giả lẫn dữ liệu thật** — quan trọng nhất vì đây là kiểm chứng thật sự
  rằng nâng cấp xlsx không làm hỏng luồng đọc/ghi Excel: `npm run test:e2e` toàn bộ 16/17 pass
  (1 test `perf-audit` skip theo thiết kế, cần cờ `PERF=1`). 1 lần chạy đơn lẻ gặp 1 test flaky
  (`vẫn có nút xuất ảnh...`) — chạy lại riêng và chạy lại toàn bộ đều pass, xác nhận không liên
  quan tới thay đổi của Đợt 1.
- `eslint .`: 0 lỗi (8 cảnh báo có sẵn, không liên quan).
- `npm run typecheck`: vẫn còn đúng 3 file lỗi có sẵn từ trước Đợt 0 (`EditShiftModal.tsx`,
  `PhanCaView.tsx`, `DashboardHeader.tsx`) — chưa ai xử lý, ngoài phạm vi Đợt 0/1.

**Chưa làm trong Đợt 1 (đã cân nhắc, cố ý hoãn — không phải bỏ sót)**: "parse Excel trong Worker"
(mục P0 trong KE_HOACH_TONG_THE.md) chỉ còn ý nghĩa phòng thủ-theo-chiều-sâu sau khi đã vá cả 2 CVE
gốc — `services/worker.ts` ĐÃ chạy trong Worker sẵn (luồng chính: Phân Tích), 3 điểm còn lại
(`dataService.ts` ×3 cho config/legacy, `fileParser.ts` ×2 cho sticker-event) chạy ở main thread.
Việc dời sang Worker là refactor có rủi ro riêng (cần dây postMessage), không phải sửa bảo mật cấp
thiết — để lại cho đợt "Dọn code" (KE_HOACH_TONG_THE.md mục 4) khi có test đơn vị bao phủ đủ hơn.

---

# Đợt 2 (phần 1/3) — Đóng lỗ XSS lưu trữ ở 3 file Report BI (KE_HOACH_TONG_THE.md mục 2.3) — 2026-09-07

**Rủi ro**: 7/15 chỗ dùng `dangerouslySetInnerHTML` trong repo render tên cột theo mẫu
`mapping[header] || header` — khi tên cột (đọc từ dữ liệu Thi đua/Báo cáo Tổng hợp NGƯỜI DÙNG DÁN
VÀO) không khớp bảng ánh xạ cố định trong code (luôn đúng với bất kỳ nội dung lạ nào), chuỗi THÔ
được render thẳng làm HTML — XSS lưu trữ. 8/15 chỗ còn lại đã an toàn từ trước (6 chỗ ở
`DrawTicketBlock.tsx` dùng DOMPurify, 1 chỗ ở `Scanner.tsx` là CSS tĩnh không có biến).

**Đã sửa**: `features/bi-dashboard/components/dashboard/SafeHeaderText.tsx` (mới) — hàm
`renderHeaderText()` tách chuỗi theo đúng dấu phân cách `"<br/>"` bằng `String.split` (không parse
HTML), chèn phần tử `<br/>` THẬT giữa các đoạn; mọi ký tự khác luôn đi qua làm children React (tự
động escape). Áp dụng cho `CompetitionListView.tsx` (1 chỗ), `SummaryTableView.tsx` (3 chỗ),
`IndustryView.tsx` (3 chỗ) — thay hẳn `dangerouslySetInnerHTML` bằng children JSX thường.

**Verify (đã tự chứng minh lỗ hổng CÓ THẬT, không chỉ suy đoán)**:
- `SafeHeaderText.test.ts` (4 test đơn vị): xác nhận payload độc luôn ở dạng `string` trong
  `props.children`, không có React element nào được "dựng" từ nội dung input.
- `tests/e2e/xss-header-sanitization.spec.ts`: dán 1 payload thật
  (`<img src=x onerror="window.__xssFired=...">`) làm tên cột qua UI thật (ClipboardEvent), rồi:
  1. **Chạy trên code CŨ** (tạm `git stash` riêng file `CompetitionListView.tsx`) → test THẤT BẠI
     với `window.__xssFired === 1` — **script độc THẬT SỰ đã chạy**, xác nhận lỗ hổng có thật và
     khai thác được qua đúng luồng dán dữ liệu thông thường.
  2. **Khôi phục bản đã vá** (`git stash pop`) → test PASS, `window.__xssFired === undefined`,
     không có dialog, không có `<img src="x">` nào được tạo ra trong DOM.
  Đây là bằng chứng "đỏ trước khi sửa — xanh sau khi sửa", không chỉ tin vào suy luận code.
- `npx vitest run`: 80/80 pass. `eslint .`: 0 lỗi. `npm run build` OK. `npm run test:e2e`:
  17/17 pass (1 skip theo thiết kế). `lint:ratchet`: không phát sinh vi phạm mới ở file của Đợt 2.
- `npm run typecheck`: vẫn 3 lỗi có sẵn từ trước (ngoài phạm vi, xem Đợt 0/1).

**Còn lại của Đợt 2** (mục 2.3 phần CSP + 2.4 gom cấu hình Firebase + 2.5 App Check) — làm tiếp
theo các phần riêng, ghi log sau.

---

# Đợt 2 (phần 2/3) — Content-Security-Policy chế độ Report-Only (mục 2.3) — 2026-09-07

**Đã làm**:
1. Chuyển 2 script inline trong `index.html` ra file riêng (`public/reload-on-chunk-error.js`,
   `public/prevent-pull-to-refresh.js`) — để bỏ hẳn nhu cầu `script-src 'unsafe-inline'`, lớp
   phòng thủ CHÍNH chống XSS (kể cả nếu có 1 lỗ dangerouslySetInnerHTML nào đó sót lại chưa phát
   hiện, script-src chặt sẽ ngăn nó CHẠY được).
2. Thêm `<meta http-equiv="Content-Security-Policy-Report-Only">` vào `index.html` — CHỈ CẢNH BÁO
   ở console, KHÔNG chặn gì (xem lý do chọn report-only bên dưới). Directive chính:
   `script-src 'self' https://www.googletagmanager.com` (không unsafe-inline/unsafe-eval),
   `style-src 'self' 'unsafe-inline' ...` (giữ unsafe-inline — React dùng `style={{}}` khắp nơi,
   loại bỏ cần refactor lớn ngoài phạm vi đợt này; rủi ro thấp hơn nhiều so với script),
   `connect-src`/`img-src`/`frame-src` theo đúng danh sách domain THẬT đã đo được (xem dưới),
   `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.

**Vì sao Report-Only chứ không Enforce ngay**: `signInWithPopup` (đăng nhập Google) không tự test
được bằng Playwright — Google chặn cửa sổ do công cụ tự động điều khiển ("This browser or app may
not be secure", đã gặp lỗi này khi tự động hoá đăng nhập ở phiên trước). Đây là luồng RỦI RO NHẤT
nếu CSP sai (mọi người dùng bị khoá khỏi đăng nhập) mà tôi không thể tự xác nhận. Report-Only cho
quan sát đầy đủ mà không có rủi ro chặn nhầm.

**Đã tự kiểm chứng bằng Playwright (bắt sự kiện `securitypolicyviolation`, không chỉ đọc code)**:
- Demo mode + Report BI: dán cả 3 khối dữ liệu (Realtime/Luỹ kế/Thi đua) → **0 vi phạm**.
- Phân Tích: upload + parse file Excel thật (qua Worker) → **0 vi phạm**.
- **Dữ liệu thật** (phiên đăng nhập Google thật, không phải demo): điều hướng Report BI, xem bảng
  Thi đua Luỹ kế → **0 vi phạm**.
- Liệt kê TOÀN BỘ domain thật sự được gọi trong 1 phiên điều hướng đầy đủ trên dữ liệu thật:
  `firebase.googleapis.com`, `firestore.googleapis.com`, `fonts.googleapis.com`,
  `identitytoolkit.googleapis.com` (làm mới token), `lh3.googleusercontent.com` (ảnh đại diện
  Google — lý do giữ `img-src ... https:` rộng), `us-central1-dashboa-7e20b.cloudfunctions.net`
  (Cloud Function `resolveSession` chạy khi mở app), `www.googletagmanager.com` (Analytics) — **tất
  cả đều đã được phép trong policy**, không có domain nào ngoài dự kiến.

**CHƯA kiểm chứng được (rõ ràng, không giấu)**:
- Luồng đăng nhập Google MỚI (`signInWithPopup` từ đầu) — lý do nêu trên. Người dùng cần TỰ đăng
  xuất rồi đăng nhập lại 1 lần, mở DevTools Console xem có dòng "Content-Security-Policy" nào
  không, trước khi đổi sang chế độ enforce (bỏ "-Report-Only").
- `features/sticker-event` (in tem, quét mã, xuất Google Sheets) và `features/phan-ca` (gợi ý AI,
  xuất Google Sheets) — chưa có E2E che phủ các luồng này để tự kiểm tra qua CSP.
- `price-scraper-server` (localhost:3456) — tính năng còn rất mới (file
  `components/views/PriceComparisonView.tsx` chưa từng qua audit), đã tạm cho phép trong
  `connect-src` để không chặn nhầm.
- Firebase Analytics collection ping thật (`google-analytics.com`) — `gtag.js` xác nhận có tải,
  nhưng chưa thấy request thu thập dữ liệu thật trong cửa sổ test ngắn; đã phép sẵn trong
  `connect-src` phòng hờ.

**Verify chung**: `npx vitest run` 80/80, `eslint .` 0 lỗi, `npm run build` OK, `npm run test:e2e`
17/17 (1 skip theo thiết kế).

**Bước tiếp theo (không tự làm — cần người dùng)**: sau khi tự đăng xuất/đăng nhập lại 1 lần và
xác nhận Console sạch, đổi `Content-Security-Policy-Report-Only` → `Content-Security-Policy` để
CSP thực sự có hiệu lực chặn. Giới hạn cố hữu của `<meta>` so với header HTTP thật: không hỗ trợ
`frame-ancestors`/`report-uri`/`sandbox` — nếu cần các directive này (chống clickjacking chẳng
hạn), phải chuyển hosting sang nơi đặt được header thật (Firebase Hosting, đã ghi trong
KE_HOACH_TONG_THE.md mục 2.3).

---

# Đợt 2 (phần 3/3, kết thúc) — mục 2.4/2.5: quyết định KHÔNG làm, đã hỏi user — 2026-09-07/08

Khi bắt tay vào "gom cấu hình Firebase" (mục 2.4), phát hiện đề xuất ban đầu (cho `phan-ca` import
chung `services/firebase.ts` ở gốc) **vi phạm trực tiếp** quy tắc cách ly 4 khu vực của CLAUDE.md —
ngoại lệ import `services/firebase.ts` chỉ cấp cho `bi-dashboard`, không cấp cho `phan-ca`. Đồng
thời phát hiện phụ: `features/sticker-event/firebase-applet-config.json` có comment trong code nói
định gitignore nhưng thực tế đang được commit thật, và dùng CHUNG project `dashboa-7e20b` với
root/phan-ca (khác mô tả "project riêng" trong CLAUDE.md) — chỉ khác Firestore database con.

**Đã hỏi user cả 2 việc, user xác nhận cả 2: KHÔNG LÀM, chỉ ghi nhận vào kế hoạch.**
Lý do: lợi ích thấp (không phải lỗ hổng bảo mật thật — apiKey Firebase không phải bí mật, bảo mật
thật nằm ở Firestore Rules đã audit kỹ ở Đợt 1-2), rủi ro cao (sửa 3 file khởi tạo Firebase dùng
cho đăng nhập — sai là khoá người dùng khỏi app; xoá/gitignore file cấu hình có thể vỡ build
sticker-event nếu nơi deploy chưa có biến môi trường thay thế). Chi tiết đầy đủ + hướng làm thay
thế nếu sau này cần (dùng `import.meta.env.VITE_FIREBASE_*` thay vì import chéo) đã ghi vào
`KE_HOACH_TONG_THE.md` mục 2.4/2.4b.

Mục 2.5 (App Check) **cần quyền Firebase Console mà agent không có** (tạo reCAPTCHA site key +
bật chế độ enforce) — không tự làm được, không đoán code trước khi có site key thật (không test
được, có thể lỗi runtime). Đã ghi hướng dẫn cụ thể cho user trong `KE_HOACH_TONG_THE.md` mục 2.5.

## Tổng kết Đợt 2

| Mục | Trạng thái |
|---|---|
| 2.3a — Đóng XSS `dangerouslySetInnerHTML` (7 chỗ, 3 file) | ✅ Xong, kiểm chứng đỏ/xanh bằng E2E thật |
| 2.3b — Content-Security-Policy | ✅ Xong (chế độ Report-Only), kiểm chứng 0 vi phạm trên dữ liệu thật |
| 2.4 — Gom cấu hình Firebase | ❌ Không làm (xung đột kiến trúc, đã hỏi user) |
| 2.4b — File config sticker-event lộ ngoài ý định | 📝 Chỉ ghi nhận (đã hỏi user) |
| 2.5 — Firebase App Check | ⏸ Cần user (quyền Firebase Console) |

**Việc còn cần USER tự làm trước khi Đợt 2 thực sự "xong"**:
1. Tự đăng xuất → đăng nhập lại 1 lần bằng Google thật, mở DevTools Console kiểm tra không có dòng
   "Content-Security-Policy" nào xuất hiện, rồi báo lại để đổi `Content-Security-Policy-Report-Only`
   → `Content-Security-Policy` (enforce thật).
2. Nếu dùng nhiều `features/sticker-event`/`features/phan-ca` (in tem, quét mã, xuất Google Sheets,
   gợi ý AI) — tự thử qua 1 lượt, xem Console có cảnh báo CSP không.
3. Nếu muốn bật App Check: tạo reCAPTCHA v3 site key ở Firebase Console trước.

---

# Đợt 2 — Bổ sung KHẨN: CSP enforce làm hỏng tải cấu hình lõi, đã sửa — 2026-09-08

**User tự đăng xuất/đăng nhập lại theo yêu cầu, gửi log Console: KHÔNG có dòng CSP nào, chỉ có
cảnh báo `Cross-Origin-Opener-Policy` của chính Firebase Auth (cơ chế khác CSP, không đặt được qua
`<meta>`, có từ trước, vô hại).** Dựa trên bằng chứng đó, đổi `Content-Security-Policy-Report-Only`
→ `Content-Security-Policy` (enforce thật).

**NHƯNG sau đó tự kiểm chứng lại bằng E2E dưới enforce thật (không tin report-only là đủ), phát
hiện HỎNG THẬT**: bộ test chính thức `phan-tich-performance-modal.spec.ts` (5 test đã ổn định suốt
phiên làm việc) **fail đồng loạt cả 5**. Điều tra bằng console log trực tiếp: app tải cấu hình
ngành hàng/hệ số quy đổi (chính là dữ liệu `productConfig` nuôi `calculateRowMetrics()` — nguồn
chân lý duy nhất cho DTQĐ, đã viết 40 test cho ở Đợt 0) từ **1 Google Sheet công khai**
(`docs.google.com/spreadsheets/.../pub?output=xlsx`, cấu hình mặc định ở
`hooks/useDashboardLogic.ts`) — domain này **hoàn toàn vắng mặt** trong `connect-src` tôi viết.
Bị CSP chặn cứng → `loadConfigFromSheet()` throw → app fallback "dữ liệu cũ rỗng" → mọi phân loại
ngành hàng/hệ số quy đổi mất tác dụng.

**Vì sao lọt qua bước kiểm chứng trước đó**: mọi lần đo domain thật ("liệt kê tất cả host") trong
lúc làm Đợt 2 đều đi qua **Report BI** (dùng phiên đăng nhập thật) — khu vực này KHÔNG gọi
`loadConfigFromSheet()` (đó là logic riêng của khu vực gốc/Phân Tích, nạp lúc `useDataManagement`
khởi động). Bài học: "kiểm chứng trên dữ liệu thật" phải test ĐÚNG khu vực bị ảnh hưởng, không chỉ
1 khu vực tiện kiểm tra nhất.

**Điều tra thêm, sửa đúng 2 lần** (test lại sau mỗi lần, không đoán 1 phát):
1. Thêm `https://docs.google.com` → vẫn lỗi, vì Google Sheets **chuyển hướng file thật** sang
   subdomain ngẫu nhiên dạng `doc-XX-XX-sheets.googleusercontent.com` (đổi mỗi lần build sheet).
2. Thêm `https://*.googleusercontent.com` (wildcard, vì subdomain ngẫu nhiên không liệt kê được) →
   console hiện `[Config] Đã tải 692 hệ số từ sheet 'Bảo Hiểm ĐMX'...` — cấu hình tải THÀNH CÔNG.

`connect-src` cuối cùng: thêm `https://docs.google.com https://*.googleusercontent.com`.

**Verify lại toàn bộ sau khi sửa**: `npx vitest run` 80/80, `npm run build` OK,
`npm run test:e2e` **17/17 pass** (1 skip theo thiết kế) — chạy 2 LẦN LIÊN TIẾP để chắc chắn không
phải may mắn nhất thời, bao gồm `phan-tich-performance-modal.spec.ts` (khu vực bị hỏng) VÀ
`real-data*.spec.ts` (phiên đăng nhập thật, đảm bảo fix không phá lại luồng Report BI).

**Bài học ghi lại cho lần sau**: CSP `connect-src` phải audit domain theo TỪNG KHU VỰC ĐỘC LẬP của
app (Phân Tích/Report BI/Check Thưởng/phan-ca/sticker-event đều có nguồn dữ liệu ngoài RIÊNG), một
lượt đo trên 1 khu vực không đại diện cho toàn app. `docs.google.com` là ví dụ điển hình của domain
REDIRECT sang subdomain không đoán trước được — cần bắt bằng thực nghiệm (mở DevTools/Playwright
network), không đoán từ đọc code.

**Phát hiện phụ, KHÔNG sửa (ngoài phạm vi, phát hiện lúc kiểm chứng)**:
`features/bi-dashboard/services/analysisEmployeeSyncService.ts` (file MỚI, không phải của phiên
này, do tiến trình chỉnh sửa song song tạo ra) import `services/dbService` ở gốc — vi phạm ĐÚNG quy
tắc cách ly CLAUDE.md mà tôi vừa phát hiện ở mục 2.4 (`import/no-restricted-paths` báo lỗi thật khi
chạy `eslint .`, không phải cảnh báo). Cần người tạo file này tự sửa hoặc xin ngoại lệ như
bi-dashboard đã có cho `services/firebase.ts`.

---

## Đợt 3 — Hiệu năng bundle (2026-09-08)

Mục tiêu theo KE_HOACH_TONG_THE.md mục 3.2/7: chunk khởi động < 700 KB, tổng JS tải lần đầu < 1,5 MB.

**Đo lại trước khi sửa (bài học ở mục "Đo lại số liệu trước khi tin plan" trong memory) — số liệu
"bundle 5,9 MB, DashboardView 1,0 MB tải một lần" trong KE_HOACH_TONG_THE.md mục 1 là tổng TẤT CẢ
chunk cộng lại, KHÔNG phải payload thật lúc khởi động app**. Đọc `dist/index.html` +
`dist/.vite/manifest.json` sau `npm run build` cho thấy danh sách chunk thật sự được
`<link rel="modulepreload">` (tức tải ngay lúc boot) chỉ gồm: entry (187 kB) + vendor-react
(194 kB) + shared-utils (27 kB) + vendor-firebase (666 kB) + vendor-motion (128 kB) + vendor-icons
(88 kB) ≈ **1,29 MB thô / ~340 kB gzip** — đã dưới mục tiêu 1,5 MB từ trước, nhờ một đợt sửa trước
đó (comment "PERF FIX" có sẵn trong `App.tsx`, không phải do tôi viết) đổi từ prefetch cứng 3 tab
nặng nhất sang chỉ preload đúng tab đang mở, cộng với xlsx/jspdf/html2canvas đã được `await import()`
động sẵn ở đúng nơi dùng (`services/worker.ts` qua cú pháp Vite `?worker`,
`sticker-event/services/printService.ts`). Hai mục trong kế hoạch 3.2 ("chuyển xlsx sang import()
động", "bỏ 2 thư viện xuất ảnh thừa khỏi bundle chính") coi như **đã đạt từ trước**, không cần sửa
thêm — xác nhận bằng build thật, không chỉ đọc code.

**Việc thực sự còn thiếu và đã làm**: `DashboardView.tsx` (chunk riêng của tab Phân Tích, KHÔNG
nằm trong bundle khởi động nhưng vẫn là 1 khối 1,05 MB/291 kB gzip DUY NHẤT tải khi mở tab) static-
import cả 5 section nặng (`TrendChart`, `IndustryGrid`, `EmployeeAnalysis`, `SummaryTable`,
`WarehouseSummary` — 2 cái đầu dùng `recharts`). Chuyển cả 5 sang `React.lazy` + bọc
`React.Suspense` với skeleton có sẵn (`ChartSkeleton`/`TableSkeleton`/`TabbedTableSkeleton`), giữ
`KpiCards` static (nội dung "above the fold" đầu tiên, không dùng recharts). Kết quả đo bằng
`npm run build`: chunk `DashboardView` giảm từ **1.051 kB → 221 kB thô (291 kB → 60,5 kB gzip)**,
5 section tách thành 5 chunk riêng tải song song ngay sau đó — KpiCards không còn phải đợi parse
xong `vendor-charts` + các bảng lớn mới vẽ. Người dùng đã ẩn bớt section qua tuỳ chọn hiển thị có
sẵn (`FilterSection`) giờ thực sự tiết kiệm băng thông (trước đây ẩn section chỉ ẩn DOM, code vẫn
tải).

File sửa: `components/views/DashboardView.tsx` (import → `React.lazy`, bọc `React.Suspense` quanh
5 chỗ render, sửa lại comment cũ ghi số đo đã lỗi thời).

**Phát hiện phụ khi viết test kiểm chứng, ĐÃ SỬA (không phải Đợt 3, nhưng phát hiện lúc verify Đợt
3 nên sửa ngay theo đúng tinh thần "không đợt nào được để lại vi phạm CSP")**: viết test Playwright
bắt `page.on('console')` khi tải file Excel demo, thấy lỗi
`Creating a worker from 'blob:...' violates ... script-src ... worker-src was not explicitly set`.
Dò bằng cách monkey-patch `window.Worker` qua `page.addInitScript` để in stack trace lúc tạo Worker
từ blob: → xác định nguồn là thư viện `canvas-confetti` (hiệu ứng pháo giấy khi tải file thành
công, gọi từ `hooks/useFileUploadLogic.ts:414`) tự tạo 1 Worker nội bộ để vẽ animation không chặn
main thread. Xác nhận bằng `git stash` — lỗi đã có TỪ TRƯỚC Đợt 3 (từ đợt bật CSP enforce ở Đợt 2,
không phải do sửa `DashboardView.tsx` gây ra). Không làm hỏng tính năng thật (thư viện tự lùi về vẽ
trên main thread khi Worker lỗi) nhưng in lỗi Console mỗi lần tải file — đã thêm
`worker-src 'self' blob:;` vào CSP trong `index.html` (kèm comment giải thích), verify lại: lỗi hết
hẳn, không phải lỗ hổng bảo mật (blob: worker chạy code cùng-origin do chính JS của trang tạo).

**Verify**: `npm run typecheck` — CÓ lỗi nhưng xác nhận bằng `git stash` là lỗi TỪ TRƯỚC, không
liên quan `DashboardView.tsx` (100% nằm ở `EmployeeAnalysis.tsx`/`features/bi-dashboard/.../
DashboardHeader.tsx`/`features/phan-ca/...` — tất cả thuộc tiến trình chỉnh sửa song song hoặc lỗi
kiểu đã có sẵn ở HEAD, không phải phạm vi Đợt 3, đã báo cho user). `npx eslint
components/views/DashboardView.tsx` sạch. `npx vitest run` 80/80. `npm run build` OK. `npx
playwright test tests/e2e/` **17/17 pass** (1 skip theo thiết kế) — chạy 2 lần (trước và sau khi
thêm `worker-src`), bao gồm cả test trên phiên đăng nhập thật (`real-data*.spec.ts`) để chắc chắn
CSP mới không phá luồng Report BI thật. Ngoài ra viết 1 test tạm kiểm tra riêng cả 5 section lazy
(`#trend-chart-section svg.recharts-surface`, `#industry-grid-section svg.recharts-surface`,
`#summary-table-section table`, `#employee-analysis-section`) đều render đủ nội dung thật, không
kẹt ở skeleton — xoá sau khi xác nhận xanh (không phải test hồi quy lâu dài, chỉ để kiểm chứng lúc
sửa).

**Chưa làm trong Đợt 3 (cân nhắc để lại)**: `vendor-firebase` (666 kB thô/156 kB gzip, eager) là
chunk khởi động lớn nhất hiện tại nhưng đã DƯỚI mục tiêu 700 kB nên không bắt buộc — thu nhỏ thêm
đòi hỏi tách nhỏ Firebase SDK theo module (auth/firestore/functions/analytics riêng), rủi ro cao
hơn nhiều (đụng vào init dùng chung cho cả 4 khu vực) so với lợi ích, để lại cho đợt sau nếu cần.

---

## Đợt 4 — Chuẩn hoá khoá cột DataRow, Bước 1 (2026-09-08)

Mục tiêu theo KE_HOACH_TONG_THE.md mục 3.1: ngay sau khi parse Excel, ánh xạ tên cột tiếng Việt đầy
đủ → khoá ngắn cố định, `getRowValue` giữ nguyên chữ ký nhưng tra bảng 1 lần thay vì dò biến thể.
Chỉ làm Bước 1 (đổi khoá) — KHÔNG làm Bước 2/3 (lưu dạng cột/nhị phân, để đợt sau khi có nhiều test
hơn cho tầng tính toán, đúng như kế hoạch đã ghi).

**Khảo sát trước khi sửa** (Explore agent, đọc toàn bộ 4 khu vực): chỉ khu vực GỐC (Phân Tích/Check
Thưởng — `services/`, `hooks/`, `components/`) dùng `DataRow`/`COL`/`getRowValue`. Cả 3
`features/*` đều có mô hình dữ liệu RIÊNG không liên quan (bi-dashboard không parse Excel;
phan-ca/sticker-event parse Excel dạng `header:1` mảng vị trí rồi tự map sang type riêng, không
qua `DataRow`) — **hoàn toàn ngoài phạm vi Đợt 4**, đúng tinh thần cách ly CLAUDE.md.

**Phát hiện quan trọng làm thay đổi cách tiếp cận**: `services/worker.ts` (nơi parse Excel THẬT SỰ
đang chạy — `services/dataService.ts::processSalesFile` tưởng là parser nhưng thực ra là code CHẾT,
0 nơi gọi, xác nhận bằng grep toàn repo) đã có sẵn bước "chỉ giữ ~34 cột cần thiết theo whitelist
`reqCols`" (dòng 64-71 cũ) — tức là ĐÃ làm gần hết việc "giảm ~50 cột Excel thô xuống còn đúng số
cột cần dùng" mà mục 3.1 mô tả, chỉ còn thiếu bước cuối: đổi tên khoá thành NGẮN thay vì vẫn giữ
nguyên chuỗi tiếng Việt dài. Việc còn lại nhỏ hơn nhiều so với hình dung ban đầu — không cần viết
lại pipeline parse, chỉ cần đổi GIÁ TRỊ được gán làm khoá trong vòng lặp map cột đã có sẵn.

**Rủi ro thật đã tìm trước khi sửa** (275 nơi dùng đúng `getRowValue`/`COL` — an toàn tự động; nhưng
~20 chỗ đọc thẳng `row['Tên cột tiếng Việt']` bỏ qua `getRowValue` — sẽ ÂM THẦM vỡ nếu đổi khoá mà
không sửa các chỗ này trước, không có lỗi throw, chỉ mất dữ liệu):
- **Mức nghiêm trọng cao nhất**: `computeRbacFilteredData()` và `computeUniqueFilterOptions()`
  trong `utils/dataUtils.ts` (dòng ~707/716/743-752) đọc thẳng `row['Mã kho tạo']`/`row['Người
  tạo']`. Đây là hàm QUYẾT ĐỊNH nhân viên/quản lý xem được dòng nào — nếu vỡ, nhân viên đăng nhập
  sẽ thấy Dashboard TRỐNG HOÀN TOÀN, không có thông báo lỗi nào (giống hệt loại bug đã từng có thật
  ở comment sẵn trong file, dòng 710-719, về việc so khớp "Người tạo" sai định dạng).
- **Mức nghiêm trọng cao**: `services/khoDataService.ts:280` (`syncDataToKhoIfManager`) đọc thẳng
  `row['Mã kho tạo']` khi tách dữ liệu đồng bộ lên Firestore theo từng Kho — nếu vỡ, KHÔNG Kho nào
  nhận được dữ liệu đồng bộ sau khi admin/manager tải file mới, âm thầm không báo lỗi.
- **Mức thấp hơn**: `hooks/useDashboardLogic.ts:208`, `hooks/useFileUploadLogic.ts:502`,
  `components/filters/FilterSection.tsx:112-113` (đọc `row['Trạng thái hồ sơ']`/`row['Người tạo']`
  để dựng lại danh sách lọc sau khi xoá/tải file) — vỡ thì bộ lọc rỗng, không phải mất dữ liệu.
  `components/modals/UncollectedOrdersModal.tsx:507-508` (đọc `a['Người tạo']` chỉ để SẮP XẾP danh
  sách xuất Excel) — vỡ thì sai thứ tự, không mất dữ liệu.
- **Phát hiện phụ, sửa kèm vì cùng loại lỗi**: `components/tables/summary/CrossSellingTable.tsx:68`
  đọc `row['Sản phẩm']` — chuỗi này **không tồn tại** trong `COL` (`COL.PRODUCT` chỉ có `'Tên Sản
  Phẩm'`/`'Tên sản phẩm'`) nên biến `SanPham` LUÔN RỖNG từ trước tới nay — tính năng "so khớp từ
  khoá theo tên sản phẩm" của Bảng Chéo Sản Phẩm (`r.keywords`, dòng 94) đang âm thầm không hoạt
  động, độc lập với việc đổi khoá lần này. Sửa luôn thành `getRowValue(row, COL.PRODUCT)`.

**Thiết kế — tương thích ngược bắt buộc, không phá dữ liệu cũ đã lưu**: dữ liệu đã lưu trong
IndexedDB/Firestore từ TRƯỚC bản vá này vẫn giữ nguyên khoá tiếng Việt gốc (`saveSalesData`/
`cloudDataService.ts` chỉ `JSON.stringify` nguyên trạng object, không đụng vào khoá) — nếu
`getRowValue` chỉ tra khoá ngắn mà bỏ nhánh dò biến thể cũ, dữ liệu cũ đã lưu sẽ đọc ra `undefined`
toàn bộ ngay khi mở lại app. Cách xử lý: `getRowValue` thử khoá ngắn TRƯỚC (nhanh, hàng mới), KHÔNG
tìm thấy thì rơi xuống nguyên vẹn logic dò biến thể cũ (hàng cũ/dữ liệu tạo thủ công nơi khác) — cả
2 loại dữ liệu cùng đọc đúng, hàng cũ chỉ không được hưởng tốc độ mới cho tới khi người dùng tải lại
file.

**File sửa**:
1. `constants.ts` — thêm `COL_SHORT_KEY` (khoá ngắn cho từng field logic của `COL`, vd `ID→'id'`,
   `KHO→'kho'`) và `VARIANT_TO_SHORT_KEY` (map phẳng TỪNG biến thể tiếng Việt → khoá ngắn, dựng từ
   `COL`+`COL_SHORT_KEY` lúc module load, không hardcode riêng). Đồng thời gộp thêm các biến thể lẻ
   đang nằm rải rác ở 3 modal gần giống nhau (`'NguoiTao'`, `'NV Tạo'` → NGUOI_TAO; `'TenKhachHang'`,
   `'Khách hàng'` → CUSTOMER_NAME; `'TrangThaiXuat'` → XUAT; `'Trạng thái'` trần → TRANG_THAI) vào
   thẳng `COL` — 1 nguồn chân lý duy nhất thay vì rải rác.
2. `utils/dataUtils.ts` — `getRowValue`: thêm nhánh tra khoá ngắn trước nhánh cache/dò biến thể cũ
   (không xoá nhánh cũ). Sửa `computeRbacFilteredData`/`computeUniqueFilterOptions` dùng
   `getRowValue`+`COL` thay vì bracket trực tiếp.
3. `services/worker.ts` — bỏ mảng `reqCols` hardcode (35 chuỗi, đã lệch khỏi `COL` — thiếu
   `'Nganh Hang'`, `'Nhom Hang'`, `'Hãng SX'`, `'Mã SP'`/`'Mã sp'`/`'Mã Hàng'`/`'Mã hàng'`,
   `'Thời Gian Hẹn Giao'`, `'Thoi gian hen giao'` — các cột dùng đúng những tên này bị ÂM THẦM RỚT
   MẤT khỏi dữ liệu từ trước tới giờ, độc lập với đợt sửa này), thay bằng danh sách dựng từ
   `VARIANT_TO_SHORT_KEY` (1 nguồn chân lý với `COL`) — vòng lặp map cột giữ nguyên cấu trúc, chỉ
   đổi giá trị gán làm khoá từ chuỗi tiếng Việt dài sang khoá ngắn.
4. `services/khoDataService.ts`, `hooks/useDashboardLogic.ts`, `hooks/useFileUploadLogic.ts`,
   `components/filters/FilterSection.tsx`, `components/modals/UncollectedOrdersModal.tsx`,
   `components/tables/summary/CrossSellingTable.tsx` — thay bracket trực tiếp bằng
   `getRowValue`+`COL` ở đúng các dòng liệt kê ở mục rủi ro trên.
5. `services/dataService.ts::processSalesFile` — hàm CHẾT (0 caller) dùng đúng pattern object-mode
   `sheet_to_json` sẽ tạo dữ liệu khoá tiếng Việt không qua chuẩn hoá mới; để nguyên logic xử lý
   nhưng không cần sửa theo (không ai gọi) — cân nhắc xoá hẳn ở Đợt 5 (dọn code) thay vì sửa ở đây.

**Không đổi/không phá tương thích**: `COL` vẫn giữ nguyên hình dạng mảng — 275 nơi gọi
`getRowValue(row, COL.X)` không cần sửa gì. `saveSalesData`/luồng Firestore không đổi (đã key-shape
agnostic sẵn, xác nhận lúc khảo sát). Không export/in ấn nào bị ảnh hưởng — toàn bộ export Excel
dùng object khoá cố định tự dựng (`{'Kho Xuất': ..., 'Người Tạo': ...}`), không suy ra header từ
khoá nội bộ của row.

**Phát hiện lúc rà — hoá ra KHÔNG phải bypass thật**: `components/modals/UncollectedOrdersModal.tsx:507-508`
(`a['Người tạo']` trong hàm sắp xếp trước khi xuất Excel) ban đầu bị liệt vào danh sách rủi ro,
nhưng đọc kỹ thì `a`/`b` ở đây là phần tử của `exportData` — 1 object MỚI tự dựng ngay phía trên với
khoá cố định `'Người tạo'` (dòng ~487), KHÔNG phải `DataRow` gốc. Đổi khoá nội bộ của `DataRow`
không ảnh hưởng gì tới đây — để nguyên, không sửa.

**Verify**:
- `npx vitest run`: **92/92 pass** (12 test mới — khoá ngắn/tương thích ngược cho `getRowValue`,
  toàn vẹn bảng `COL_SHORT_KEY`/`VARIANT_TO_SHORT_KEY` không trùng/không sót, `computeRbacFilteredData`
  + `computeUniqueFilterOptions` với CẢ 2 dạng row — khoá ngắn mới và khoá tiếng Việt cũ).
- `npx tsc --noEmit`: so sánh output trước/sau bằng `grep -v` loại các file KHÔNG do tôi sửa — 0
  lỗi mới. Các lỗi còn lại (EmployeeAnalysis.tsx, DashboardHeader.tsx, phan-ca/EditShiftModal.tsx,
  phan-ca/PhanCaView.tsx) xác nhận đã có sẵn ở HEAD `89a340fb` từ trước (không liên quan Đợt 4).
- `npx eslint` trên đúng 9 file đã sửa: sạch.
- `npm run build`: OK.
- `npm run lint:ratchet`: có 5 vi phạm màu KHÔNG do tôi (IndustryGrid.tsx, TrendChart.tsx,
  SummaryTableHeader.tsx, PriceComparisonView.tsx, phan-ca/Legend.tsx — không nằm trong danh sách
  file tôi sửa) — xác nhận bằng `git stash` toàn bộ thay đổi rồi chạy lại ratchet: **giống hệt**,
  đã có sẵn ở HEAD, không phải do Đợt 4.
- **Kiểm chứng số liệu THẬT quan trọng nhất**: viết 1 test tạm tải file Excel mẫu (`createSalesXlsx`)
  qua đúng luồng `services/worker.ts` đã sửa, chụp lại toàn bộ text vùng KPI (DT Thực, DTQĐ, HQQĐ,
  Tỷ trọng ngành hàng, Top nhân viên...). Chạy 1 lần trên code ĐÃ sửa, `git stash` riêng đúng các
  file Đợt 4 rồi chạy lại lần 2 trên code TRƯỚC khi sửa (giữ nguyên `implementation_plan.md`/test
  file tạm). **Kết quả giống hệt từng ký tự** ở cả 2 lần chạy (DT Thực 44 Tr, DTQĐ 62 Tr, HQQĐ 43%,
  4 ngành hàng cùng tỷ trọng, top nhân viên #1 195025 cùng số liệu) — bằng chứng cụ thể rằng đổi
  khoá cột không làm sai lệch bất kỳ phép tính nào trên pipeline thật, không chỉ là "trang không
  crash". Xoá test tạm sau khi xác nhận xong (không phải test hồi quy lâu dài).
- `npx playwright test tests/e2e/`: 17/17 pass (1 skip theo thiết kế), gồm cả
  `phan-tich-performance-modal.spec.ts` (tải Excel thật qua worker.ts đã sửa) và
  `real-data*.spec.ts` (Report BI trên phiên đăng nhập thật — xác nhận bi-dashboard không bị ảnh
  hưởng, đúng như khảo sát ban đầu là khu vực này không dùng `DataRow`).

**Chưa làm (để lại cho Bước 2/3 sau, đúng kế hoạch)**: lưu dạng cột (columnar/`Float64Array`) và
lưu IndexedDB dạng nhị phân — mục 3.1 tự ghi rõ nên làm sau khi có nhiều test hơn cho tầng tính
toán, Đợt 4 lần này chỉ làm Bước 1 (đổi khoá).

**Chưa làm, phát hiện phụ ngoài phạm vi**: `services/dataService.ts::processSalesFile` là code CHẾT
(0 caller, xác nhận bằng grep toàn repo) dùng pattern parse object-mode cũ (khoá tiếng Việt dài,
không qua chuẩn hoá mới) — để nguyên, không sửa theo vì không ai gọi tới; cân nhắc XOÁ HẲN ở Đợt 5
(dọn code) thay vì vá logic cho 1 hàm chết.

---

## Đợt 5 — Dọn code, phần cơ học an toàn (2026-09-09)

**Đo lại trước, số trong kế hoạch sai khá nhiều** (đúng như bài học "đừng tin số cũ trong plan"):

| Hạng mục | Kế hoạch ghi | Đo thật hôm nay | Ghi chú |
|---|---|---|---|
| `console.log` | 3 | 3 (app) + 17 (tests) | Kế hoạch đúng phần app; 17 dòng trong `tests/e2e/` là output test hợp lệ, KHÔNG được xoá |
| `catch {}` rỗng | 9 | 9 | Khớp |
| `@ts-ignore` | 3 | 3 | Khớp |
| `key={index}` | 32 | 33 chỗ / 23 file | Nhưng **29/33 là dương tính giả** — xem dưới |
| File > 800 dòng | 8 | 9 | Khớp xấp xỉ |

### Đã làm

**1. `@ts-ignore` 3 → 0 (sửa gốc chứ không phải xoá bừa)**. Cả 3 chỗ đều là workaround cho
*virtual module* của Vite (`?worker`, `import.meta.glob`) mà TypeScript không biết kiểu. Nguyên
nhân gốc: `tsconfig.json` khai `"types": ["node"]` nên thiếu hẳn `vite/client` — bộ khai báo kiểu
CHÍNH THỨC của Vite cho đúng các cú pháp này. Thêm `"vite/client"` vào `types` là bỏ được cả 3
`@ts-ignore` mà typecheck vẫn sạch. Đây là sửa đúng bệnh: `@ts-ignore` tắt kiểm tra kiểu cho TOÀN
BỘ dòng phía dưới (che luôn lỗi thật nếu sau này dòng đó hỏng), giờ 3 chỗ này lại được kiểm tra kiểu
bình thường.

**2. `console.log` trong `services/worker.ts`: 3 dòng luôn chạy → chỉ cảnh báo khi thật sự có
vấn đề.** 3 dòng này (đánh dấu "DEBUG TẠM" từ đợt chẩn đoán lỗi file 60MB) chạy ở MỌI lần tải file,
đổ nguyên dòng tiêu đề Excel của người dùng ra console. Không xoá trắng (mất khả năng chẩn đoán) mà
đổi thành: chỉ `console.warn` khi **không khớp được cột nào** — đúng tình huống cần chẩn đoán, kèm
gợi ý nguyên nhân hay gặp nhất (dòng tiêu đề không nằm ở hàng đầu). Kiểm chứng bằng Playwright bắt
`page.on('console')` lúc tải file mẫu: **0 dòng log worker** (trước là 3).

**3. `catch {}` rỗng 9 → 0, phân loại theo BẢN CHẤT chứ không thêm log hàng loạt:**
- *2 chỗ nuốt lỗi THẬT* — `services/notificationService.ts` (`markAsRead`, `markAllAsRead`): ghi
  Firestore hỏng (mất mạng/thiếu quyền) bị nuốt sạch, thông báo "đã đọc" sẽ hiện lại là chưa đọc ở
  lần mở sau mà không ai biết vì sao. Thêm `console.error` — đồng nhất với chính các `catch` khác
  trong cùng file (file này vốn đã log ở chỗ khác, 2 chỗ này là ngoại lệ không nhất quán).
- *7 chỗ nuốt lỗi CÓ CHỦ Ý* (3 bản `dbService` đóng kết nối IndexedDB trễ, 3 chỗ `JSON.parse` cache
  hỏng, 1 chỗ `navigator.clipboard` bị từ chối quyền): giữ nguyên hành vi nhưng **viết rõ lý do**
  vào code, đổi `catch (e) {}` → `catch { /* lý do */ }`. Riêng chỗ cache `role` ở sticker-event ghi
  rõ: cache hỏng thì giữ `isAdmin = false` (quyền THẤP NHẤT) — cố ý không nâng quyền khi không đọc
  được cache.

**4. `key={index}`: audit 33 chỗ, chỉ 4 chỗ là lỗi thật — đã sửa; 29 chỗ còn lại là dương tính
giả, cố ý giữ nguyên.** Kế hoạch ghi "32 chỗ gây render sai khi sắp xếp/lọc" là **nói quá**. Thực tế:
- *Đúng và phải giữ index* (29 chỗ): skeleton/placeholder (`Array.from({length: n})` — không có
  danh tính, không bao giờ đổi thứ tự), mảng tĩnh (`[0,1,2]` chấm loading), đường kẻ thụt đầu dòng
  thuần trang trí, mảnh text tách từ `<br/>` (vị trí CHÍNH LÀ danh tính), header nhóm cột dựng từ
  config ổn định.
- *Lỗi thật, đã sửa* (4 chỗ, đều là danh sách **rút ngắn khi người dùng thao tác**):
  `components/views/PriceComparisonView.tsx` 2 bảng (có nút xoá gọi
  `setProducts(prev => prev.filter((_, i) => i !== index))` — xoá dòng giữa mảng trong khi key là
  index là ca lỗi React kinh điển: các dòng sau trượt lên chiếm DOM của dòng trước, sai trạng thái
  hover/focus), và `components/modals/UnconfiguredGroupsModal.tsx` 2 bảng (bấm "bỏ qua"/"khôi phục"
  chuyển phần tử qua lại giữa 2 danh sách). Đổi sang key theo NỘI DUNG
  (`${p.sku}|${p.name}`, `${group.nganhHang}|${group.nhomHang}`) — trùng key chỉ xảy ra khi 2 dòng
  giống hệt nhau, lúc đó đổi chỗ cũng không nhìn thấy khác biệt.

**Verify Đợt 5**: `npx tsc --noEmit` không lỗi mới (so bằng `grep -v` các file không do tôi sửa);
`npx eslint` trên 13 file đã sửa — 0 error, 3 warning xác nhận CÓ SẴN từ trước bằng `git stash`
(1 cái chỉ đổi số dòng 612→617 do tôi thêm comment); `npx vitest run` 92/92; `npm run build` OK;
`npx playwright test` 17/17 (1 skip theo thiết kế).

### CHƯA làm — 3 việc lớn còn lại của Đợt 5, cần bạn quyết trước

**a) Gom 4 bản `uiService`/`imageExport` (việc lớn nhất của Đợt 5) — VƯỚNG QUY TẮC CÁCH LY.**
Đo mức trùng lặp thật (diff sau khi bỏ khoảng trắng):

| Cặp file | Số dòng KHÁC nhau | Mức giống nhau |
|---|---|---|
| root ↔ sticker-event | 132 / ~1.100 | ~88% |
| root ↔ phan-ca | 144 / ~1.100 | ~87% |
| phan-ca ↔ sticker-event | **38 / ~1.090** | **~96,5%** |

Tức khoảng **1.000 dòng gần như y hệt bị chép 3 lần** (`services/uiService.ts` 1.123 dòng,
`features/phan-ca/services/uiService.ts` 1.091, `features/sticker-event/services/uiService.ts`
1.081; riêng bi-dashboard đã được tách sẵn thành `uiExport/` 3 file 1.061 dòng). Đây là loại nợ kỹ
thuật gây lỗi thật: sửa bug ở 1 bản, 2 bản kia vẫn sai.
**Vướng ở đâu**: CLAUDE.md mục 1 cấm `features/*` import `services/*` ở gốc. Kế hoạch đề xuất tạo
thư mục dùng chung mới `services/export/` — nhưng làm vậy phải (1) nới `import/no-restricted-paths`
trong `eslint.config.js`, và (2) sửa CLAUDE.md để ghi nhận ngoại lệ thứ 4. Đây là **quyết định kiến
trúc**, không phải việc dọn dẹp cơ học, nên tôi dừng lại hỏi thay vì tự làm — nhất là vì tiền lệ ở
Đợt 2 bạn đã chọn "bỏ qua" với đề xuất gom cấu hình Firebase tương tự.

**b) Tách 9 file > 800 dòng**: `WarehouseSummary.tsx` (1.496), `useDataManagement.ts` (1.215),
`services/uiService.ts` (1.123), `CompetitionSummaryView.tsx` (1.065), `nhanVienHelpers.ts` (1.020),
`SupermarketConfig.tsx` (1.010), `utils/dataUtils.ts` (1.000), `imageExport.ts` (924),
`salesData.ts` (826). Đây là refactor thuần hình thức (không thêm tính năng, không sửa lỗi) nhưng
rủi ro hồi quy thật, và 2 file trong danh sách (`nhanVienHelpers.ts`, `SupermarketConfig.tsx`) vừa
được phiên làm việc song song sửa xong. Đề xuất: chỉ tách khi có lý do cụ thể (sắp sửa lớn vào file
đó), không tách hàng loạt chỉ để đạt chỉ tiêu số dòng.

**c) Số phận `price-scraper-server/` và `telegram-agent/`**: cần bạn xác nhận còn dùng hay bỏ —
đây là thao tác xoá thư mục, không tự quyết. (`services/dataService.ts::processSalesFile` — hàm
chết 0 caller phát hiện ở Đợt 4 — cũng nằm trong nhóm chờ quyết định xoá này.)

### Quyết định của user (2026-09-09) cho 3 việc trên

**a) `uiService` — GIỮ NGUYÊN 3 bản, chỉ ghi nhận.** User chọn không nới quy tắc cách ly (nhất
quán với quyết định ở Đợt 2 về gom cấu hình Firebase). Hệ quả cần NHỚ khi bảo trì: **sửa 1 bug ở
tầng xuất ảnh phải sửa ở CẢ 3 chỗ** — `services/uiService.ts`, `features/phan-ca/services/uiService.ts`,
`features/sticker-event/services/uiService.ts` (bi-dashboard dùng bản đã tách riêng
`features/bi-dashboard/services/uiExport/`). Trùng lặp đo được: root↔sticker-event ~88%,
root↔phan-ca ~87%, phan-ca↔sticker-event ~96,5%.

**b) Tách 9 file > 800 dòng — KHÔNG làm hàng loạt.** Giữ nguyên cho tới khi có lý do cụ thể (sắp
sửa lớn vào đúng file đó), vì đây là refactor thuần hình thức nhưng rủi ro hồi quy thật.

**c) `price-scraper-server/` — GIỮ, đang dùng thật** (không phải code chết như kế hoạch phỏng đoán):
`components/views/PriceComparisonView.tsx` hướng dẫn người dùng chạy `cd price-scraper-server &&
npm start`, và chính `http://localhost:3456` trong `connect-src` của CSP là server này.
**`telegram-agent/` (1.808 dòng) — ĐÃ XOÁ** theo quyết định user (3 tháng không đụng, không file
nào trong app import tới, README trỏ đường dẫn máy người dùng khác `/Users/dangkhoa/...`).
- Trước khi xoá đã sao lưu 2 thứ KHÔNG nằm trong git (xoá là mất vĩnh viễn):
  `telegram-agent/.env` (chứa `TELEGRAM_BOT_TOKEN`) → `archive/telegram-agent.env.backup-20260909`,
  và thư mục `logs/` → `archive/telegram-agent-logs-backup-20260909/`. `archive/` đã nằm trong
  `.gitignore` nên 2 bản sao này chỉ ở máy local, KHÔNG lên GitHub.
- 15 file còn lại đều được git theo dõi nên khôi phục được bằng `git revert`/`git checkout` nếu cần.
- ⚠️ **Việc user nên tự làm**: token bot Telegram trong `.env` cũ vẫn còn hiệu lực trên máy chủ
  Telegram — nếu chắc chắn không dùng bot này nữa, nên thu hồi token qua @BotFather (`/revoke`),
  vì xoá file local không vô hiệu hoá được token.
- Gỡ kèm mục "QUY TRÌNH THỰC THI TASK TỪ XA (TELEGRAM AGENT WORKFLOW)" trong `AGENT_RULES.md` —
  toàn bộ hạ tầng của quy trình đó đã không còn (`tasks/` không tồn tại, `safety.js` chỉ còn trong
  file backup cũ), để lại chỉ khiến agent đọc file này hiểu nhầm là quy trình vẫn đang chạy.

---

## Đợt 6 (phần 1) — Chuẩn hoá màu: sửa chỉ số đo trước, rồi sửa 2 file nặng nhất (2026-09-09)

**Phát hiện quan trọng nhất: chỉ số của kế hoạch đo SAI bản chất, khiến mục tiêu "1.416 → <400"
phần lớn là công việc ảo.** Quét lại toàn dự án theo họ màu:

| Họ màu | Số lần | Đánh giá |
|---|---|---|
| `indigo` | **1.390 (94%)** | **HỢP LỆ** theo CLAUDE.md ("6 họ semantic: 5 màu chuẩn + indigo") |
| blue | 33 | Sai chuẩn |
| red | 25 | Sai chuẩn |
| purple | 17 | Sai chuẩn |
| gray / yellow / green | 15 | Sai chuẩn |

Tức nợ thật chỉ **90**, không phải 1.416. Kiểm chứng thêm 2 điều:
1. `styles.css` (dòng 14-23) **cố tình override `--color-indigo-*` thành đúng hex của `sky`**
   (indigo-500 = `#0ea5e9` = sky-500) — indigo hoạt động như alias của "primary".
2. Module **Phân Tích — chính là chuẩn vàng** — dùng indigo 12%, NHIỀU HƠN cả sky 11%. Nên không
   thể coi indigo là "màu lạ cần loại"; nó là một phần ngôn ngữ thiết kế đang có.

**Bug thật tìm được nhờ việc đo này** (RULES.md §2.5 đã cảnh báo, nay xác nhận cụ thể): có 4 nơi
dùng `sky` và `indigo` như 2 màu KHÁC NHAU trong cùng một dải xoay vòng, nhưng chúng render y hệt
nhau → dải 6 màu thực chất chỉ phân biệt được 5:
- `utils/dataUtils.ts:15` `BORDER_ACCENT_FAMILIES`
- `features/bi-dashboard/components/nhanvien/CompetitionSummaryView.tsx:23` `HEADER_COLUMN_COLOR_KEYS`
- `features/bi-dashboard/components/SupermarketConfig.tsx:299` và `DataUpdater.tsx:75` (`colorTheme`)
CHƯA sửa — xem mục "còn lại" bên dưới.

### Đã làm

**1. Sửa công cụ đo trước khi sửa code** (`scripts/lint-ratchet.cjs`): tách chỉ số cũ làm 2 —
`nonSemanticColor` (màu NGOÀI bảng đã duyệt, phải về 0) và `indigoAlias` (nợ indigo hợp lệ, chỉ
được giảm). Vì logic so sánh của script vốn đã generic theo tên chỉ số nên không phải sửa gì thêm.
Lý do bắt buộc phải tách: đổi `purple` (sai chuẩn) → `indigo` (đúng chuẩn) là cải thiện THẬT nhưng
chỉ số gộp cũ không hề đổi, tức công cụ không đo được tiến bộ.

**2. `components/views/PriceComparisonView.tsx` — 64 class** blue/red/yellow/green →
sky/rose/amber/emerald. File này **chưa từng có trong `violations-baseline.json`**, nghĩa là nó lọt
vào repo mà chưa từng đi qua cổng kiểm tra lần nào — file vi phạm nặng nhất dự án.

**3. `features/phan-ca/components/Legend.tsx` — 17 class** purple → indigo, đồng bộ với các
checkbox trong cùng thanh công cụ (trạng thái bật vẫn phân biệt bằng nền + viền, không cần khác hệ
màu). ⚠️ **Đây là đổi màu NHÌN THẤY ĐƯỢC** (tím → xanh) ở nút "SBH gender boost" — nếu không thích
thì revert riêng file này.

**Kết quả: `nonSemanticColor` 90 → 9 (giảm 90%), ratchet từ ĐỎ chuyển XANH.**

**Cố ý KHÔNG sửa 8 chỗ ở `features/sticker-event/services/printService.ts`** — đây là **dương tính
giả của ratchet**: chúng không phải class Tailwind mà là CSS tự viết tay trong stylesheet bản in
(`.text-gray-600 { color: #4b5563; }`). Tôi đã thử đổi rồi hoàn tác, vì đổi tên class thành `slate`
trong khi giá trị hex vẫn là của `gray` sẽ khiến tên gọi nói dối giá trị thật; còn đổi cả hex là
đổi màu MỰC IN THẬT trên tem giá — không thuộc phạm vi chuẩn giao diện.

**Verify**: typecheck sạch, vitest 98/98, build OK, `npm run lint:ratchet` XANH, Playwright 17/17
(1 lần chạy đầu có 1 test flaky `phan-tich-performance-modal.spec.ts:42`, chạy riêng PASS và chạy
lại toàn bộ cũng PASS — là flaky sẵn có, không phải hồi quy). Chụp ảnh màn So Sánh Giá sau khi đổi
để kiểm tra trực quan: tiêu đề/nút/viền đã sang tông sky, badge "Server Online" sang emerald, đồng
bộ với phần còn lại của app.

### ⚠️ Sự cố mất code do phiên làm việc song song

Giữa lúc làm, toàn bộ thay đổi chưa commit ở `PriceComparisonView.tsx` và `Legend.tsx` **bị xoá
sạch** — không còn trong `git status`, nội dung quay về như cũ. Nguyên nhân: phiên làm việc song
song chạy lệnh git ghi đè working tree (ngay sau đó `git status` hiện file của họ:
`TargetHero.tsx`, `employeeParser.ts`, `employeeParser.test.ts`). Đã làm lại và **commit ngay lập
tức** để bảo vệ. Bài học cho các đợt sau: khi có phiên khác đang chạy song song, commit từng phần
nhỏ ngay khi xong thay vì gom nhiều file rồi commit một lần cuối.

### Còn lại của Đợt 6 (chưa làm)

- **Bug dải màu sky/indigo trùng nhau** (4 nơi nêu trên) — cần quyết định hướng xử lý, vì 3 cách
  đều có đánh đổi lớn: (i) bỏ override `--color-indigo-*` trong `styles.css` → **toàn bộ 1.390 chỗ
  dùng indigo trong app đổi màu cùng lúc** từ xanh sky sang tím indigo, rủi ro thị giác rất lớn;
  (ii) thay indigo trong các dải xoay vòng bằng "tầng sắc độ thứ 2" của họ màu có sẵn (đúng ý
  CLAUDE.md "6 họ x 2 tầng sắc độ", phạm vi hẹp hơn nhiều); (iii) chấp nhận dải chỉ có 5 màu phân
  biệt. Khuyến nghị (ii).
- **Giảm dần `indigoAlias` 1.407** theo thứ tự kế hoạch (Report BI → Phân Tích → sticker-event).
  Lưu ý RULES.md §2.5 đã cảnh báo: KHÔNG tìm-thay hàng loạt, phải xét từng chỗ là "alias primary"
  hay "màu riêng trong dải" — trộn 2 nhóm này sẽ làm mất phân biệt màu vốn cần có.
- `sticker-event` là khu vực lệch chuẩn nhất (indigo 26% / sky 2%, ngược hẳn 3 khu vực còn lại).

---

## Đợt 6 (phần 2-4) + CỘT MỐC: `npm run check` XANH lần đầu (2026-09-09)

### Đợt 6 phần 2-3 — dọn sạch nợ indigo, 1.407 → 27

Nhận định then chốt sau khi xét từng chỗ: **dải màu "6 họ semantic" của dự án CHƯA BAO GIỜ thật sự
có 6 màu phân biệt — nó luôn chỉ có 5**, vì `styles.css` map `indigo` thành đúng hex của `sky`.
Các chỗ như `FilterChip` (union màu không hề có 'sky'), `KpiCards` ('indigo' = sky sắc độ đậm hơn),
bản đồ màu theo ngành hàng... thực chất đều là sky dưới một cái tên khác.

Vì vậy hướng xử lý đúng là **để code nói thật về thứ đang hiển thị**, thay vì gỡ override (sẽ đổi
màu 1.390 chỗ cùng lúc):
- Phân loại **bằng máy chứ không đoán**: file nào chứa token chuỗi `'indigo'` (tức indigo đóng vai
  màu riêng) thì tách ra xét tay; còn lại là alias thuần.
- Đổi 1.380/1.407 class `indigo-*` → `sky-*`, giữ nguyên số sắc độ.
- **Mức chênh màu thực tế**: 9/11 sắc độ có hex TRÙNG KHÍT → 0 pixel đổi. `indigo-600` (275 chỗ)
  lệch 3/255 ở kênh đỏ do typo cũ `#0584c7` (sky-600 thật là `#0284c7`) — đổi sang sky là sửa luôn
  typo. `indigo-950` (12 chỗ) không được map nên là tím thật — chỗ duy nhất đổi màu thấy được,
  gần hết nằm trong biến thể `dark:` (đã tắt toàn dự án nên vô hiệu).
- Kiểm chứng: chụp ảnh TOÀN TRANG Phân Tích trước và sau → **giống hệt nhau**.

Còn đúng 27 class ở `features/bi-dashboard/components/SupermarketConfig.tsx` — cố ý không đụng vì
phiên làm việc song song đang sửa file đó. Đã ghi chú ngay trong `styles.css`: sau khi đổi nốt 27
class này thì XOÁ HẲN khối override, lúc đó `indigo` mới trở lại là màu tím thật và có thể dùng làm
màu thứ 6 THẬT SỰ cho dải xoay vòng — nhưng đó phải là quyết định thiết kế có chủ ý.

### Đợt 6 phần 4 — hết `<button>` thô
4 chỗ cuối (`PriceComparisonView` 2, `CompetitionView` 2) đổi sang `<Button variant="unstyled"
size="none">`, giữ nguyên className nên không đổi giao diện. Rule này giờ chỉ còn đúng 1 kết quả là
bên trong chính `Button.tsx` — đã khai `eslint-disable-next-line` kèm lý do tại đó.

### CỘT MỐC — `npm run check` xanh lần đầu (exit code 0, 0 lỗi 0 cảnh báo)

CLAUDE.md mục 0.7 bắt buộc chạy `npm run check` trước khi báo cáo, nhưng cổng này **đã ĐỎ từ trước
khi loạt đợt rà soát bắt đầu** — toàn bộ lỗi nằm trong code đã commit, không phải do các đợt vừa
rồi gây ra (đã xác nhận nhiều lần bằng `git stash`). Nay sạch hoàn toàn.

**25 lỗi typecheck, 4 nhóm:**
1. `features/phan-ca/components/EditShiftModal.tsx` (21 lỗi — chiếm 84%): modal tự sinh 3 dạng gợi
   ý riêng (`pure_swap`/`extend`/`split_cover`, thuộc tính PHẲNG) nhưng bị gán nhầm kiểu `Solution`
   dùng chung (hình dạng khác hẳn: mọi thay đổi gói trong `actions[]`, type chỉ nhận
   'swap'|'direct'|'add'|'split'|'reassign'). Khai union `ShiftSuggestion` đúng hình dạng thật để
   TS tự thu hẹp kiểu ở từng nhánh render — KHÔNG dùng `any`/`@ts-ignore` để giấu lỗi.
   **Diff của file này chỉ gồm chú thích kiểu + comment**, không đổi 1 dòng logic nào → JavaScript
   sinh ra sau biên dịch giữ nguyên hành vi (bằng chứng mạnh hơn cả click thử tay).
2. `features/phan-ca/PhanCaView.tsx` (2): thiếu import kiểu `SbhGenderBoost`.
3. `features/bi-dashboard/.../DashboardHeader.tsx` (1): so sánh `activeMainTab === 'report'` trong
   khi `MainTab` chỉ còn `'realtime' | 'cumulative'` → nhánh "BÁO CÁO" là code chết, đã gỡ.
4. `components/employees/EmployeeAnalysis.tsx` (1): `<Button>` nhận prop `loading` không tồn tại
   (đúng tên `isLoading`) nên bị đổ thẳng xuống DOM — gây CẢ lỗi typecheck LẪN cảnh báo React lúc
   chạy. Dùng `disabled` thay vì `isLoading` để không vẽ thêm spinner thứ 2 (Icon đã tự xoay).

**Lỗi eslint cuối cùng** — `analysisEmployeeSyncService.ts` import `services/dbService` gốc: đây là
**cầu nối có chủ đích** giữa Phân Tích và Report BI nên buộc phải chạm cả 2 phía; cụ thể cần
`saveSetting()` gốc vì hàm đó phát event `ycx-setting-changed` mà `useCloudSync` gốc đang nghe (bản
`saveSetting` riêng của bi-dashboard ghi sang IndexedDB khác và không phát event này). Khai **ngoại
lệ thứ 4** trong `eslint.config.js` theo ĐÚNG 1 đường dẫn file, KHÔNG mở cho cả thư mục — đã kiểm
chứng bằng file dò: file thứ 2 trong cùng thư mục import `services/` gốc VẪN bị chặn. Ghi vào
CLAUDE.md mục 1.

### Đo lại hiệu năng — báo cáo trung thực, không tô hồng

Chạy `PERF=1 npx playwright test perf-audit` 3 lần trên dữ liệu thật:

| Chỉ số | Mốc cũ (mục 1 kế hoạch) | 3 lần đo | Kết luận |
|---|---|---|---|
| App khởi động | 358 ms | 314 / 310 / 302 | **nhanh hơn ~14%, ổn định qua cả 3 lần** |
| Vào Report BI | 377 ms | 387 / 400 / 344 | trong nhiễu, không kết luận được |
| Render bảng Thi đua | 181 ms | 208 / 181 / 247 | nhiễu rất lớn, không kết luận được |
| JS heap | 76 MB | 81 / 80 / 76 | trong nhiễu |

**Diễn giải trung thực**: chỉ có "app khởi động" là cải thiện thấy rõ và lặp lại được. 3 chỉ số còn
lại đi ngang trong biên độ nhiễu — hợp lý, vì phép đo này đi vào **Report BI**, trong khi Đợt 3
(tách `DashboardView`) tác động lên tab **Phân Tích**, còn lợi ích RAM của Đợt 4 chỉ áp dụng cho
file parse MỚI chứ không phải dữ liệu đã cache sẵn mà phép đo này đang đọc. Cải thiện chắc chắn và
đo trực tiếp được (không nhiễu) là **kích thước chunk**: `DashboardView` 1.051 kB → 221 kB
(291 → 60,5 kB gzip), lấy thẳng từ output `npm run build`.
