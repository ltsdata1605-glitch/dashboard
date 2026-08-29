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

## Kế hoạch thực thi
Theo lô, mỗi lô build + `npm run check` + commit riêng:
- Lô A: Tier 1 (fix bug thật, mục 1-5) — ưu tiên cao nhất, bắt đầu ngay.
- Lô B: Hỏi user (AskUserQuestion) cách xử lý Tier 1b (mục 6-16) — khôi phục hay xoá từng
  tính năng dở dang — vì đây là quyết định sản phẩm, không phải bug rõ ràng.
- Lô C: Tier 2 dead code (mục 17-23) — an toàn, làm theo quyết định ở Lô B nếu liên quan.
- Lô D: Tier 3 design-system (mục 24-30) — khối lượng lớn (83+6+20 chỗ), có thể cần chia
  nhỏ theo loại vi phạm.
- Lô E: Tier 4 đồng nhất size chữ/spacing/icon (mục 31-41) — yêu cầu chính của user; cân
  nhắc tạo primitive `TableHeaderCell`/`IconButton` dùng chung nếu khối lượng sửa tay quá
  lớn, thay vì sửa từng file lẻ tẻ.
