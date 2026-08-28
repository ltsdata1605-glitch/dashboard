# Rà soát sâu toàn bộ module "Phân Tích" (root: components/ trừ shared/ui, hooks/, services/, contexts/, utils/)

## Bối cảnh
User yêu cầu "lần kiểm tra sâu và kỹ nhất": đồng nhất thiết kế (size chữ/font/icon/màu/spacing), đồng nhất cách lấy dữ liệu, dọn code thừa/chết, tìm lỗi. Đây là module "chuẩn vàng thiết kế" theo CLAUDE.md — quy mô ~42.700 dòng, lớn hơn Report BI đã audit trước đó.

Đã chạy 10 agent rà soát song song (10 góc nhìn: line-by-line, invariant/guard, cross-file tracer, React/TS pitfall, wrapper/proxy, reuse/duplication, altitude/bandaid, efficiency, CLAUDE.md conventions, simplification) — tổng ~50 phát hiện.

**Lưu ý phụ**: phát hiện 34 file tài liệu/kế hoạch cũ (AUDIT.md, DESIGN_SYSTEM*.md, KE_HOACH_*.md, boltz_project_rules_md/, tasks/*.md) đã bị xoá khỏi đĩa nhưng CHƯA commit — không phải do tôi xoá, nghi là dọn dẹp từ phiên khác (có 1 Remote Control session khác). KHÔNG đụng vào (không commit, không khôi phục), chỉ commit riêng các thay đổi của tôi.

## Tier 1 — Lỗi số liệu/tính toán nghiêm trọng (ưu tiên cao nhất)

1. **Đồng bộ cloud lệch field** (`services/firestoreService.ts`): `syncToCloud()` ghi `lastSync` vào doc gốc `users/{uid}`, nhưng `fetchFromCloud()` chỉ đọc sub-doc `setting/configuration` (có `updatedAt`, không có `lastSync`) → `cloudData.lastSync` luôn `undefined`/0 → `useDataManagement.ts` luôn nghĩ cloud cũ hơn local → thiết bị cũ có thể ghi đè cài đặt mới hơn từ thiết bị khác.
2. **Race điều kiện đổi tài khoản khi đang ghi heavy key** (`firestoreService.ts:419`): `syncHeavySettingToCloudQueued` giữ closure `user` của LẦN GỌI ĐẦU; nếu đổi tài khoản trong lúc đang ghi, lần ghi lại (queued) vẫn dùng `user` cũ → ghi nhầm dữ liệu tài khoản B vào doc tài khoản A. Edge case hiếm (cần đổi user cùng tab không reload) nhưng hậu quả nặng.
3. **Demo Mode rò dữ liệu** (`services/syncService.ts`): `initSyncListeners()` không kiểm tra `isDemoMode` (khác `useCloudSync.ts` có gate rõ ràng) → sửa cài đặt lúc đang xem Demo Mode vẫn bị đẩy lên Firestore tài khoản thật.
4. **Cùng 1 cấu hình lọc giá → 3 số liệu khác nhau** ở Kho/Đối đầu/Thi đua: `ColumnConfigModal.tsx` không validate `priceValue1` cho nhánh "data" (khác nhánh target/calculated có validate) → lưu được config thiếu giá trị → `useWarehouseLogic.ts`/`useHeadToHeadLogic.ts` fallback `priceValue1 || 0` (áp dụng filter sai) trong khi `ContestTable.tsx` guard `typeof === 'number'` (bỏ qua filter hẳn) → 3 kết quả khác nhau từ cùng 1 config.
5. **Logic "hàng hợp lệ" (`isValidSalesRow`) bị viết lại độc lập ở ≥5 nơi**: `TrendChart.tsx`, `SavedCalendarCard.tsx`, `ContestTable.tsx`, `useHeadToHeadLogic.ts`, `useIndustryAnalysisLogic.ts` — đã LỆCH THẬT: 2 file sau có thêm điều kiện `TRANG_THAI` (Trạng thái hồ sơ phải "mới"/bắt đầu "1") không có trong hàm chuẩn `isValidSalesRow()` (utils/dataUtils.ts) — vi phạm trực tiếp CLAUDE.md "CẤM tự ý viết lại công thức tính cục bộ".
6. **`getHinhThucThanhToan()` vs `isTraCham` trong `calculateRowMetrics()`**: 2 cách tính riêng, guard khác nhau (`.length>0` vs `!== undefined`) — đã có thể lệch ở edge case.
7. **`calculateRowMetrics()` dòng ~940**: `subgroup` tra cứu exact-match thô thay vì dùng `getSubgroup()` (có fallback lowercase + prefix số) như `group` 2 dòng trên — rủi ro sai `weightedQuantity` cho sản phẩm VieON có mã dạng "7161 - Dịch vụ VAS".
8. **`isInsurance` thiếu `'Bảo Dưỡng'`**: `computeHeSoQuyDoi` gộp `Bảo hiểm`/`Bảo Dưỡng`/`Bảo hiểm ĐMX` cùng hệ số 4.18, nhưng `isInsurance` trong `calculateRowMetrics()` chỉ nhận diện 2/3 tên → `weightedQuantity` xử lý khác nhau giữa các biến thể tên giống hệt về bản chất.
9. **`filterService.ts isKhoMatch`**: thiếu guard null trước `.toString()` → crash `TypeError` cho cả dataset nếu 1 dòng thiếu cột Kho.
10. **`filterService.ts isXuatMatch`**: so khớp chuỗi thô (không qua `cleanAndNormalize`) → có thể bỏ sót dòng nếu Excel dùng Unicode NFD.
11. **`employeeService.ts` dòng 254**: dùng `.toISOString()` (UTC) để tính `dateKey` xu hướng theo ngày, khác `toLocalISOString()`/`trendService.ts` (local) → đơn hàng sáng sớm có thể lệch ngày giữa biểu đồ xu hướng nhân viên và biểu đồ tổng.
12. **`useWarehouseLogic.ts` dòng ~406**: `if (coreTotals.doanhThuThuc)` bỏ qua set `hieuQuaQD`/`traChamPercent` khi doanh thu đúng bằng 0 → để `undefined` thay vì `0`, hiển thị trống/NaN%.
13. **Falsy-zero hiển thị sai** (nhiều file: `SummaryTableRow.tsx`, `MonthlyTrendTableRow.tsx`, `MonthlyTrendTable.tsx`, `RevenueCalendar.tsx`): % thật = 0 hiển thị `-` giống hệt "không có dữ liệu" — cần phân biệt rõ.
14. **Gộp tuần lệch nhãn ở ranh giới năm** (`useDataManagement.ts` ~976): key tuần theo chuẩn ISO-8601 (UTC) nhưng nhãn hiển thị tính theo local → cuối tháng 12/đầu tháng 1 có thể trùng key khác nhãn, ghi đè nhãn cho nhau.
15. **`useTrendChartLogic.ts`**: còn sót logic đọc `.dark` class (dark mode đã tắt toàn dự án) — mâu thuẫn với `TrendChart.tsx` đã gỡ bỏ observer tương tự; `isDark` không nằm trong dependency array của `useMemo`.
16. **`handleBatchKhoExport` (`useExportLogic.ts`)**: đổi filter Kho trong vòng lặp rồi chờ cố định 1500ms trước khi chụp ảnh, không đợi tín hiệu Worker xử lý xong (`isFilterProcessing` không lộ ra qua Context) → có thể xuất nhầm ảnh Kho trước đó với dataset lớn.
17. **`UncollectedOrdersModal.tsx`**: prop `onExportSheet` (có guard rỗng dữ liệu) không hề được gọi — nút "Sheet" dùng `handleExportGoogleSheet` cục bộ KHÔNG có guard → 0 đơn vẫn ép đăng nhập lại Google OAuth thay vì báo lỗi thân thiện.
18. **`UncollectedOrdersModal.tsx`**: text copy/tiêu đề ghi nhầm "quá hạn XUẤT" (giao hàng) trong khi modal này là "chưa thu tiền" — copy-paste từ `UnshippedOrdersModal.tsx` quên đổi.
19. **`useSummaryComparison.ts` dòng ~174**: 1 số nhánh guard sớm không reset `compTree`/`dateDisplay` như nhánh guard đầu effect → đổi lựa chọn thành combo không hợp lệ vẫn hiển thị dữ liệu cũ, không báo hiệu.

## Tier 2 — Vi phạm chuẩn thiết kế (CLAUDE.md)

20. **3 nơi tự dựng `<button>` bằng `document.createElement`** kèm hex cứng (`UncollectedOrdersModal.tsx`, `UnshippedOrdersModal.tsx`, `useExportLogic.ts`) — bypass `components/shared/ui/Button`.
21. **`ProcessingLoader.tsx`** (nằm trong chính module chuẩn vàng!): dùng `rounded-3xl` (cấm theo CLAUDE.md) + màu `blue-*`/`cyan-*` ngoài palette (15+ chỗ).
22. **`TrendChart.tsx`**: hex cứng `#FC8181`/`#68D391` cho tăng/giảm thay vì `rose`/`emerald`.
23. **`DataColumnForm.tsx`/`TargetColumnForm.tsx`**: tự dựng toggle segment thay vì `<Tabs variant="segment">` có sẵn.

## Tier 3 — Code thừa/chết/trùng lặp

24. **`calculateRevenueQD()`/`calculateWeightedQuantity()`** (utils/dataUtils.ts) — 0 nơi gọi, xác nhận độc lập bởi 3 agent — dead code kèm rủi ro bị dùng nhầm thay `calculateRowMetrics()`.
25. **15 khối migration gần giống hệt** trong `useEmployeeAnalysisLogic.ts`.
26. **`handleDeleteFile`/`handleViewReport`** (`useDashboardLogic.ts`) thân hàm giống hệt nhau.
27. **`DashboardView.tsx`**: 1 ternary className 2 nhánh giống hệt nhau (dead logic) + 1 `useEffect` rỗng còn sót lại từ migrate icon library cũ.
28. **`useIndustryAnalysisLogic.ts`**: gọi trùng `Promise.all([getIndustryVisibleGroups(), getIndustryVisibleGroups()])` — gọi 2 lần giống hệt, chỉ dùng kết quả đầu.
29. **`useEmployeeAnalysisLogic.ts`**: logic chuẩn hoá cột bị lặp y hệt ở 2 chỗ (load ban đầu + cloud-sync listener).
30. **`UncollectedOrdersModal.tsx` ~90% trùng `UnshippedOrdersModal.tsx`** (~700 dòng mỗi file).
31. Nhiều file tự viết lại lookup alias cột (`row['Nhóm Hàng'] || ...`) thay vì `getRowValue()`.
32. **`WarehouseSummary.tsx`**: `formatRevenueForKho`/`formatQuantityForKho` cục bộ trùng `formatRevenueForHeadToHead`/`formatQuantity` đã có sẵn.
33. **9 nơi lặp regex sanitize tên file** — không có helper dùng chung.
34. **`pullSettingsFromFirebase()`** (syncService.ts) dead code — `AuthContext.tsx` viết lại inline logic giống hệt thay vì gọi hàm này.
35. **`PerformanceTable.tsx`**: `useDashboardContext() || {}` — dead defensive code (hook luôn throw hoặc trả về giá trị xác định, không bao giờ `undefined`).

## Tier 4 — Hiệu năng (ngoài phạm vi yêu cầu, chỉ ghi nhận)
`KpiCards.tsx` không tận dụng cache `row._metrics`/`row._parentGroup` đã có sẵn, tính lại `calculateRowMetrics()` mỗi card; `useIndustryGridLogic.ts` gọi `calculateRowMetrics()` dư 2-3 lần/dòng; `ContestTable.tsx`/`useHeadToHeadLogic.ts` quét lại toàn mảng O(n×cột)/O(n×config). Không sửa trong đợt này — không phải bug/code thừa như yêu cầu, rủi ro cao nếu sửa vội cho các hàm tính KPI cốt lõi.

## Kế hoạch thực thi
Xử lý theo lô, mỗi lô build + `npm run check` + commit riêng:
- Lô 1: Tier 1 các mục an toàn/khoanh vùng rõ (9, 10, 12, 13, 27, 28).
- Lô 2: Tier 1 các mục cần đọc kỹ thêm trước khi sửa (1, 2, 3, 6, 7, 8, 11, 14, 15).
- Lô 3: Tier 1 mục cần quyết định nghiệp vụ (4, 5 — TRANG_THAI check nên áp dụng hay bỏ) — HỎI USER trước khi sửa hàng loạt, giống case DTQĐ tháng 7.
- Lô 4: Tier 1 phần còn lại (16-19) + Tier 2 (20-23).
- Lô 5: Tier 3 dọn dẹp an toàn (24-35), ưu tiên các mục rủi ro thấp trước.
