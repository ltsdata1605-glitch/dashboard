# Kế hoạch: Rà soát & dọn dẹp toàn bộ module Report BI (features/bi-dashboard)

## Bối cảnh
User yêu cầu rà soát toàn bộ code trong `features/bi-dashboard`: loại bỏ code/tính năng thừa chưa dùng, tìm lỗi tiềm ẩn, xử lý sạch không phát sinh lỗi vặt.

Đã chạy 10 agent rà soát song song (code-review skill, effort "high") theo 10 góc nhìn khác nhau (quy ước CLAUDE.md, tái sử dụng/trùng lặp, đơn giản hoá, hiệu năng, "băng bó" thiếu vững chắc, quét từng dòng, wrapper/proxy correctness, setup/teardown bất đối xứng, cross-file trace, JS/React pitfall). Tổng cộng ~50 phát hiện, nhiều trùng lặp giữa các góc.

## Đã sửa (an toàn, khoanh vùng rõ, đã verify bằng `npm run check`)

1. **5 `<button>` thô → `<Button variant="unstyled">`** — `SupermarketConfig.tsx` (x3), `KpiOverview.tsx` (x2). Vi phạm rule CLAUDE.md §2 (component dùng chung bắt buộc).
2. **`calculateRunRate()` (metricService.ts) — dead code, 0 nơi gọi** → wire vào thay thế 3 chỗ tự viết lại công thức DKHT giống hệt: `IndividualCompetitionView.tsx` (x2), `CompetitionCompareView.tsx` (x1).
3. **`useWorker.ts`**: worker singleton thiếu `onerror` — 1 lỗi worker-level (crash module...) khiến MỌI pendingRequests treo vĩnh viễn, không resolve/reject. Đã thêm handler reject toàn bộ request đang chờ.
4. **10 chỗ gọi `runWorkerTask(...).then()` thiếu `.catch()`** (`useDashboardLogic.ts` x6, `useNhanVienData.ts` x3, `NhanVien.tsx` x1) → thêm `.catch(err => console.error(...))`, tránh unhandled rejection khiến view giữ dữ liệu cũ/rỗng im lặng khi parse lỗi.
5. **`utils/db.ts`**: `set/setMany/getAll/clearStore/deleteEntry` thiếu `transaction.onabort` (chỉ `get()` có sẵn) — abort không kèm lỗi (thiết bị sleep, bug trình duyệt) khiến Promise treo vĩnh viễn. Đã bổ sung đồng bộ theo đúng pattern có sẵn.
6. **`MonthlyBonusTable.tsx`**: `formatMillionShort` dùng `!value` nên bonus = 0 thật hiển thị "-" giống hệt "chưa có dữ liệu" (trong khi code gọi nó đã có `val === null` để phân biệt 2 trường hợp này) → đổi thành `value == null`.
7. **`useCompetitionData.ts`**: memo `relevantCompetitions` thiếu `isActive` trong dependency array (các memo khác cùng file đều có) → rời tab Thi đua rồi quay lại có thể bị đứng ở giá trị rỗng.
8. **`dashboardHelpers.ts` (`computeDerived`)**: %HT Target / Tỷ Trọng Trả Góp âm (DTQĐ âm do trả hàng nhiều) bị hiển thị nhầm thành "0%" do dùng `pct > 0` thay vì `pct !== 0` (trong khi công thức DTCK 20 dòng dưới cùng file đã dùng đúng `pct !== 0`).
9. **`CompetitionCompareView.tsx` (`DeltaBadge`)**: so sánh float không epsilon → 2 tỉ lệ bằng nhau về toán học nhưng khác nhau do sai số dấu phẩy động có thể hiện nhầm "+0%" thay vì "Hòa". Thêm epsilon 1e-9.
10. **`Settings.tsx`**: khôi phục backup — `FileReader` thiếu `onerror`, lỗi đọc file (không phải lỗi parse) khiến nút "Khôi phục" treo loading vĩnh viễn, không có cách thoát ngoài reload trang.
11. **Hợp nhất ternary "metric → nhãn nhóm mặc định" lặp 7 lần** (`CompetitionSummaryView.tsx` x4, `SupermarketConfig.tsx` x3) → 1 hàm `getDefaultGroupLabel()` dùng chung trong `dashboardHelpers.ts`.
12. **`SupermarketConfig.tsx`**: dọn 6 import không dùng (`CheckCircleIcon`, `ChevronDownIcon`, `SaveIcon`, `DocumentReportIcon`, `Card`, `parseNumber`) + fix prop `placeholder` của `StatusTile` bị khai báo nhưng chưa từng render (textarea paste hard-code "Nhấn Ctrl + V..." bỏ qua placeholder riêng của 3 nơi gọi).
13. **`SupermarketConfig.tsx`**: gradient nút bookmarklet dùng `via-teal-*` (màu ngoài bảng semantic) → bỏ stop giữa, còn `from-emerald-* to-sky-*`. Đây là nguyên nhân khiến `lint-ratchet` (nonSemanticColor) fail từ trước khi bắt đầu task này (28→30); đã xác minh bằng `git stash` rằng lỗi này không phải do các sửa đổi trong task. Sau fix, ratchet pass và tự hạ baseline.

## Đã tìm nhưng KHÔNG tự sửa — cần quyết định của user trước khi động vào

### 🔴 Nghiêm trọng nhất: Ghi sai dữ liệu Thưởng khi chọn nhiều siêu thị ("Tổng hợp")
`hooks/useNhanVienData.ts` — `handleSaveBonus`/`handleSaveBonusBatch`/`handleSaveBonusMonthly` đều ghi cứng vào key `bonus-data-${activeSupermarkets[0]}` (siêu thị ĐẦU TIÊN), bất kể nhân viên thực tế thuộc siêu thị nào. Khi user chọn ≥2 siêu thị ("Tổng hợp" — chế độ có sẵn, dùng ở mọi tab) và chạy Auto-collect/lưu thưởng hàng loạt, dữ liệu thưởng thật của nhân viên ở siêu thị 2/3... bị ghi nhầm vào key siêu thị 1, biến mất khi xem lại siêu thị đó riêng lẻ.

**Vì sao chưa tự sửa**: pipeline parse hiện tại gộp text nhiều siêu thị thành 1 blob trước khi parse (`combinedDS += ds`), nên sau khi gộp KHÔNG còn biết 1 nhân viên thuộc siêu thị nào — đây là lỗ hổng kiến trúc (thiếu tagging per-employee-per-supermarket), không phải fix 1 dòng. Sửa đúng cách đòi hỏi parse riêng từng siêu thị + gắn nhãn + gộp có kiểm soát, ảnh hưởng tới `employeeDepartmentMap` dùng xuyên suốt cả module — rủi ro cao nếu làm vội, đúng như yêu cầu "không phát sinh lỗi vặt".

**Đề xuất**: nếu muốn xử lý, nên làm thành 1 đợt riêng có kế hoạch/test riêng.

### Khác (business logic cần người có domain quyết định, đổi sai sẽ lệch số liệu)
- 3 danh sách "loại trừ nhân viên/dòng rác" độc lập, đã LỆCH NHAU thật (`useNhanVienData.ts` excludedKeywords vs `nhanVienHelpers.ts` isIgnoredDept vs `useCompetitionData.ts` isStoreRow) — sửa sai có thể đổi số lượng nhân viên/doanh thu hiển thị.
- `KNOWN_BRANDS` (~200 tên brand hard-code) trong `detailDataParser.ts` — brand mới của MWG sẽ bị phân loại sai vào tree doanh thu.
- 2 hàm parse target thi đua độc lập (`useDashboardLogic.ts` vs `employeeParser.ts`) dùng rule khớp tên siêu thị khác nhau.
- Giá trị thi đua = 0 thật bị lưu như `null` (không phân biệt được "chưa có target" vs "đạt 0") trong `parseCompetitionData`.

### Không sửa vì ngoài phạm vi yêu cầu (hiệu năng, không phải bug/code thừa)
7 phát hiện hiệu năng (IndustryView tái tạo `Intl.NumberFormat` mỗi cell, nhiều transaction IndexedDB nhỏ lẻ thay vì gộp, `structuredClone` nặng trên main thread, thuật toán O(n²) ở vài chỗ...) — không đụng tới, vì đây là tối ưu hiệu năng chứ không phải lỗi/code thừa như task yêu cầu, và refactor thuật toán ở các hàm tính KPI cốt lõi rủi ro cao nếu không có benchmark riêng.

## Kiểm tra
- `npm run check` (typecheck + eslint + build + lint-ratchet) — PASS toàn bộ, 0 lỗi.
- Diff cuối cùng: 15 file, +94/-43 dòng — khoanh vùng gọn, không đổi hành vi UI nhìn thấy được (trừ 2 bugfix hiển thị %âm và bonus=0, vốn là mục tiêu).

---

## Đợt 2 (theo yêu cầu tiếp theo): Fix bug ghi sai dữ liệu Thưởng đa siêu thị

### Thiết kế
`hooks/useNhanVienData.ts` — thêm state `employeeSupermarketMap: Record<originalName, tênSiêuThịGốc>`, chỉ xây dựng khi `activeSupermarkets.length > 1` (1 siêu thị thì không cần, tránh tốn parse thêm):
- Trong `fetchAllData`, sau khi gộp dữ liệu như cũ, với MỖI siêu thị active: parse riêng `ds` (danh sách doanh thu) của siêu thị đó qua `runWorkerTask('PARSE_REVENUE', ds)` để lấy danh sách `originalName` nhân viên thật sự thuộc siêu thị đó, cộng thêm nhân viên từ `manual-dept-mapping` riêng của siêu thị đó (nhân viên thêm tay).
- Dùng **tên siêu thị GỐC** (chưa rút gọn) làm value trong map — khớp đúng convention `bonus-history-*` đang dùng tên gốc (khác với `bonus-data-*`/`bonus-monthly-*` dùng tên đã rút gọn qua `shortenSupermarketName()`) — tránh phá vỡ key scheme cũ.
- Thêm `resolveEmployeeSupermarket(originalName)`: tra map, fallback `activeSupermarkets[0]` nếu không có (giữ nguyên hành vi cũ 1-siêu-thị, không regression).
- `handleSaveBonus`/`handleSaveBonusBatch`/`handleSaveBonusMonthly`: gom nhóm entries theo đúng siêu thị của từng nhân viên (qua resolver) rồi ghi riêng từng nhóm, thay vì đổ hết vào `activeSupermarkets[0]`.
- `setBonusPeriodLabel`: ghi nhãn kỳ báo cáo vào TẤT CẢ siêu thị active (không phải dữ liệu theo người nên không cần resolver, chỉ cần nhất quán).
- `NhanVien.tsx`: `<BonusDataModal supermarketName={...}>` đổi từ `activeSupermarkets[0]` sang `resolveEmployeeSupermarket(editingBonusEmployee.originalName)` — sửa luôn bug tương tự ở modal lưu thủ công (trước đây cũng dùng cứng `activeSupermarkets[0]` để ghi lịch sử `bonus-history-*`).

### Rủi ro & đã kiểm soát
- Chi phí thêm: parse lại `danhSach` từng siêu thị riêng lẻ (thêm N lệnh gọi worker khi N siêu thị active) — chỉ xảy ra ở chế độ đa siêu thị, không ảnh hưởng chế độ 1 siêu thị (phổ biến nhất).
- Trùng tên nhân viên giữa 2 siêu thị (hiếm, dùng chung mã NV): map lấy theo lượt parse đầu tiên tìm thấy — cùng rủi ro với `employeeDepartmentMap` đã có sẵn trong code (không phải rủi ro mới do đợt fix này tạo ra).
- Nhân viên chưa xác định được siêu thị (lỗi timing/dữ liệu lạ): fallback về `activeSupermarkets[0]` — đúng hệt hành vi cũ (lỗi), không tệ hơn trước.
- `npm run check` PASS toàn bộ sau khi sửa.

### Cách kiểm tra thủ công đề xuất
Chọn 2 siêu thị active (chế độ "Tổng hợp"), lưu/thu thập Thưởng cho 1 nhân viên mỗi siêu thị, sau đó chuyển về xem riêng lẻ từng siêu thị — xác nhận dữ liệu thưởng xuất hiện đúng ở từng siêu thị tương ứng (trước đây sẽ đổ hết vào siêu thị đầu tiên).

---

## Đợt 3 (theo yêu cầu tiếp theo): Xử lý các mục "cần domain judgment" còn lại

Điều tra sâu hơn từng mục để xác định mục nào sửa an toàn được (bug cấu trúc, không phải đoán nghiệp vụ) và mục nào thực sự cần dừng lại.

### Đã sửa

**1. "Tất cả" (phòng ban) không thực sự là tất cả — `hooks/useNhanVienData.ts`**
`effectiveActiveDepartments` khi chọn "Tất cả" trước đây resolve về `departmentOptions` — danh sách ĐÃ bị lọc bớt (loại "quản lý"/"trưởng ca"/"kế toán"/"tiếp đón khách hàng") chỉ để phục vụ dropdown chọn phòng ban cho gọn. Nhưng danh sách lọc-bớt này lại được `useRevenueData.ts` dùng làm bộ lọc dòng thật (`departmentNames.includes(r.department)` — luôn áp dụng vì `departmentNames` không bao giờ chứa literal `'all'`), khiến nhân viên phòng Kế toán/Tiếp đón khách hàng/... — vốn VẪN được đếm là nhân viên thật qua `isIgnoredDept` (nhanVienHelpers.ts, chỉ loại "quản lý siêu thị"/"trưởng ca", hẹp hơn nhiều) — biến mất khỏi MỌI bảng hiển thị (Doanh thu/Bán kèm/Trả góp/Thi đua/Chi tiết) dù user đã chọn "Tất cả". Xác nhận đây là bug cấu trúc (2 mục đích dùng chung 1 danh sách), không phải câu hỏi nghiệp vụ "nên loại phòng nào" — vì `isIgnoredDept` (nơi THẬT SỰ quyết định ai được tính là nhân viên) đã ngầm trả lời câu hỏi đó rồi.
Fix: tách `allDepartmentNames` (đầy đủ, không lọc — dùng cho "Tất cả") khỏi `departmentOptions` (có lọc — chỉ dùng cho danh sách dropdown). Dropdown vẫn gọn như cũ; "Tất cả" giờ hiển thị đúng tất cả. Hiệu ứng dây chuyền: cùng sửa luôn lỗi tương tự ở `filteredEmployees` trong `useCompetitionData.ts` (nhận `effectiveActiveDepartments` qua prop, không cần sửa thêm).

**2. 2 hàm parse target thi đua lệch rule nhận diện siêu thị — `hooks/useDashboardLogic.ts`**
`parseCompetitionLuyKeBaseTargets` (tab Tổng quan) chỉ nhận diện dòng siêu thị bắt đầu bằng `ĐM` hoặc đúng bằng `Tổng`, thiếu tiền tố `TGD` và pattern chứa `" - "` — trong khi `dashboardHelpers.ts` (dùng ở `parseSummaryData`/`parseCompetitionDataBySupermarket`, tức là chính luồng dữ liệu chính của tab này) đã nhận diện `TGD` từ lâu (3 chỗ). Không phải câu hỏi nghiệp vụ — chỉ là áp dụng ĐÚNG pattern đã có sẵn, đã được kiểm chứng, trong cùng file cho 1 hàm bị bỏ sót. Nếu MWG có siêu thị dạng `TGD -...`, tab Tổng quan trước đây sẽ thiếu target thi đua của siêu thị đó dù tab Nhân viên (parseBaseTargetsMap, so khớp chính xác tên chứ không hardcode tiền tố) vẫn đúng.
Fix: đồng bộ điều kiện nhận diện dòng siêu thị giống hệt `dashboardHelpers.ts`.

### Đã điều tra kỹ hơn — xác nhận KHÔNG phải bug, giữ nguyên

**Giá trị thi đua = 0 lưu như `null` (`parseCompetitionData`, nhanVienHelpers.ts)** — lúc đầu nghi là bug (không phân biệt "chưa có target" vs "đạt 0"). Nhưng kiểm tra kỹ thấy `dkht === 0` (tương đương giá trị `null`/0 này) đang được dùng CÓ CHỦ ĐÍCH khắp module Thi đua như 1 hạng mục UI thật — "Chưa bán được" (`noSale = dkhtValues.filter(d => d === 0).length` ở `IndividualCompetitionView.tsx`, và tương tự ở `CompetitionCompareView.tsx`). Đổi hành vi này sẽ làm vỡ tính năng "Chưa bán được" đang hoạt động đúng, không phải sửa lỗi. **Giữ nguyên, không sửa.**

### Vẫn giữ nguyên — thật sự cần input bên ngoài, không tự đoán

- **`KNOWN_BRANDS`** (~200 tên brand hard-code, `detailDataParser.ts`) — không có cách nào tự xác định "danh sách brand hiện tại của MWG đã đầy đủ chưa" từ code; cần dữ liệu thật để đối chiếu hoặc đổi hẳn cách tiếp cận (dùng tín hiệu cấu trúc `row.indent` thay vì whitelist tên) — đây là thay đổi kiến trúc cho phần lõi dựng cây doanh thu chi tiết, rủi ro cao nếu không có dữ liệu mẫu thật để so sánh trước/sau. Để ngoài phạm vi cho tới khi có yêu cầu cụ thể kèm dữ liệu kiểm thử.
- **`isStoreRow`** (`useCompetitionData.ts`) — bộ lọc phòng vệ (lọc dòng "ĐMX -"/"BP "/"all in one" lọt qua từ parse) đang hoạt động đúng, không phải lỗi đang xảy ra — chỉ là kiến trúc chưa tối ưu (nên lọc ngay lúc parse thay vì vá ở tầng dưới). Không có lợi ích rõ ràng để đánh đổi rủi ro động vào core parser dùng chung nhiều nơi. Không sửa.

## Kiểm tra (Đợt 3)
- `npm run check` PASS toàn bộ, 0 lỗi mới.
- Diff: 2 file (`useNhanVienData.ts`, `useDashboardLogic.ts`), +32/-11 dòng.

---

## Đợt 5 (theo yêu cầu tiếp theo): Đồng bộ real-time + đồng nhất style TẤT CẢ bộ lọc nhóm hàng thi đua

### Yêu cầu
Chọn nhóm hàng thi đua ở 1 nơi → tự đồng bộ sang các nơi khác (Tổng quan>Thi đua, Nhân viên>Thi đua). Style bộ lọc phải đồng nhất với style bộ lọc khác trong dự án.

### Hiện trạng trước khi sửa
Đợt 4 đã sửa ĐÚNG cơ chế lưu trữ (originalTitle) nên phần "đồng bộ dữ liệu" về bản chất đã hoạt động — nhưng có 3 bộ lọc "Lọc nhóm"/"Lọc chương trình thi đua" là 3 bản UI tự viết tay HOÀN TOÀN RIÊNG BIỆT (CompetitionTab.tsx dùng `createPortal`+theo dõi scroll, IndividualCompetitionView.tsx và CompetitionView.tsx dùng `absolute` đơn giản) — không cái nào dùng chung component, style/hành vi lệch nhau, không đúng chuẩn `components/shared/ui/*` bắt buộc.

### Đã sửa
Mở rộng `components/shared/ui/MultiSelectDropdown.tsx` (component filter đa-chọn CHUẨN đã dùng sẵn cho bộ lọc siêu thị ở `NhanVien.tsx`/`DashboardHeader.tsx`) thêm 3 khả năng tuỳ chọn, KHÔNG phá vỡ 2 nơi đang dùng mặc định:
- `groups` (thay `options`): danh sách chia nhóm có tiêu đề (dùng cho "Tiêu chí SLLK/DTLK/DTQĐ").
- `searchValue`/`onSearchChange`/`searchPlaceholder`: ô tìm kiếm trong panel.
- `usePortal`: render qua `createPortal(document.body)` + theo dõi scroll/resize (giữ nguyên hành vi đã được chứng minh đúng ở `CompetitionTab.tsx`, tránh regression panel bị cắt bởi container cha).

Áp dụng vào cả 3 nơi, xoá state/refs/effect hand-roll cũ (giữ nguyên các dropdown KHÁC không thuộc phạm vi — "Highlight" ở CompetitionTab.tsx, "Cột hiển thị"/chọn nhân viên ở 2 file kia):
- `CompetitionTab.tsx` ("Lọc nhóm", Nhóm view): `usePortal` (giữ hành vi cũ), `groups` theo tiêu chí.
- `IndividualCompetitionView.tsx` ("Lọc nhóm", Cá nhân view): `absolute` đơn giản (khớp hành vi cũ), `groups` theo tiêu chí.
- `CompetitionView.tsx` ("Lọc chương trình", Tổng Quan): `absolute` đơn giản, `options` phẳng (không nhóm, khớp thiết kế gốc). Tiện sửa luôn 1 thiếu sót nhỏ phát hiện được: label/tìm kiếm trước đây bỏ qua `nameOverrides` (tên tuỳ chỉnh người dùng đặt) dù `nameOverrides` đã dùng ở chỗ khác trong cùng file — giờ nhất quán.

### Đã xác minh trực quan bằng Playwright (không phải chỉ build/typecheck)
Dựng dữ liệu giả qua kỹ thuật dán ClipboardEvent (xem `reference_bi_dashboard_seed_data_testing` trong memory), test đầy đủ:
- Cả 3 panel render đúng: nút trigger cùng style (icon + nhãn + badge đếm + chevron) — đồng nhất với bộ lọc siêu thị.
- Tìm kiếm trong panel lọc đúng danh sách hiển thị.
- "Chọn tất cả"/toggle từng mục hoạt động đúng, badge đếm cập nhật đúng.
- **Đồng bộ chéo xác nhận THẬT**: chọn "DAIKIN" ở Nhân viên > Thi đua > Nhóm → mở Tổng Quan > Thi đua > Lọc chương trình → DAIKIN đã hiện sẵn ở trạng thái ĐÃ CHỌN, bảng dữ liệu lọc đúng, hiện đúng số liệu thật (1.000.000/800.000/125%). Test tiếp tab Cá nhân → cùng trạng thái "3 đã chọn" hiện đúng, bảng thi đua cá nhân lọc đúng theo DAIKIN.
- Click ra ngoài đóng panel đúng (portal lẫn absolute).
- Phát hiện phụ (không phải bug code, do dữ liệu test tự dựng sai định dạng): dòng "BP `<tên>`" trong `danhSachData` cần có cột số thứ 2 mới được `parseRevenueData` nhận diện — đã dùng làm bài học, không phải lỗi trong các file đã sửa.

### Kiểm tra
- `npm run check` PASS toàn bộ, 0 lỗi mới.
- Diff: 4 file (`MultiSelectDropdown.tsx`, `CompetitionTab.tsx`, `IndividualCompetitionView.tsx`, `CompetitionView.tsx`), +229/-219 dòng — chủ yếu thay code hand-roll bằng lời gọi component chung nên tổng dòng giảm dù thêm tính năng.

---

## Đợt 4 (theo yêu cầu tiếp theo): Kiểm tra đồng bộ bộ lọc "Thi đua" (Nhân viên) vs "Tổng Quan > Thi đua"

### Câu hỏi
User hỏi bộ lọc tab "Thi Đua" (Nhân viên) có đồng bộ với bộ lọc "Tổng Quan > Thi đua" hay không.

### Phát hiện
Rà soát toàn bộ state IndexedDB của 2 khu vực này:
- **"Lọc nhóm"** (Nhân viên, `CompetitionTab.tsx`) và **"Lọc chương trình thi đua"** (Tổng Quan, `CompetitionView.tsx`) dùng CHUNG 1 key `global-selected-competitions` — có vẻ chủ đích đồng bộ (naming convention "global-" trong codebase này luôn nghĩa là chia sẻ toàn app, ví dụ `global-compare-emp-a`, `global-competition-sort-config`).
- **NHƯNG**: 2 bên lưu 2 ĐỊNH DẠNG TÊN khác nhau vào cùng key đó — Nhân viên lưu tên đã rút gọn (`h.title`, qua `shortenName()`), Tổng Quan lưu tên gốc chưa rút gọn (`program.name` = `parts[0]` thô). `shortenName()` áp dụng ~47 rule đổi tên cứng (VD "BÁN HÀNG PANASONIC" → "Panasonic", "Thi đua Vivo" → "Vivo"...) + nhiều biến đổi động (thay "&"/"THI ĐUA"/"BÁN HÀNG "...). Với chương trình có tên đơn giản trùng khớp tình cờ (không rơi vào rule nào) thì đồng bộ VẪN đúng — nhưng với đa số chương trình có tên dài/đặc thù (rất phổ biến trong cách đặt tên thi đua của MWG), lưu ở 1 bên sẽ KHÔNG khớp được ở bên kia → lọc ở 1 tab không phản ánh đúng sang tab kia, trông như "đôi lúc đồng bộ, đôi lúc không".
- Các bộ lọc khác (siêu thị, phòng ban, sort, ẩn cột, highlight) — kiểm tra riêng từng cái, xác nhận KHÔNG chia sẻ key và đúng ý đồ thiết kế (Nhân viên hỗ trợ multi-select nhiều siêu thị "Tổng hợp", Tổng Quan chỉ 1 siêu thị/lần — 2 mô hình UI khác nhau, không nên và không cần đồng bộ).

### Đã sửa
Chuẩn hoá về DÙNG TÊN GỐC (`originalTitle`) làm khoá nhận diện trong Set `selectedCompetitions` ở TẤT CẢ nơi ghi/đọc (Tổng Quan vốn đã đúng theo cách này từ đầu, không đổi):
- `hooks/useCompetitionData.ts`
- `components/nhanvien/CompetitionTab.tsx` (chọn tất cả/bỏ chọn/toggle từng mục/đếm filter)
- `components/nhanvien/IndividualCompetitionView.tsx` (tương tự)
- `components/nhanvien/CompetitionCompareView.tsx`

Phần HIỂN THỊ (tên rút gọn trên UI) không đổi gì — vốn đã tính riêng qua `shortenName(comp.originalTitle, nameOverrides)` tại thời điểm render (áp dụng cả tên tuỳ chỉnh người dùng đặt), độc lập với khoá Set. `comp.title` (tên rút gọn tính lúc parse, không áp dụng nameOverrides) giờ không còn được dùng để so khớp filter nữa — chỉ còn dùng làm React `key` ở 1-2 chỗ (vô hại).

Tiện thể dọn 2 khai báo type key chết trong `db.ts` phát hiện được trong lúc rà soát (`competition-sort-config-${string}`, `competition_view_hidden_columns_${string}` — không nơi nào dùng, chỉ 2 biến thể có tiền tố `global-` mới thực sự tồn tại).

### Rủi ro & lưu ý quan trọng
⚠️ **Người dùng đã có sẵn lựa chọn lọc trong `global-selected-competitions` trước bản vá này sẽ bị "mất" lựa chọn 1 lần** — vì giá trị cũ lưu tên rút gọn, không còn khớp `originalTitle` nữa. Không mất dữ liệu, không lỗi — hệ thống tự hiểu là "chưa lọc gì" (hiển thị tất cả) cho tới khi người dùng chọn lại. Đây là cái giá chấp nhận được để sửa dứt điểm 1 lần, thay vì tiếp tục sống chung với đồng bộ nửa vời.

### Kiểm tra
- `npm run check` PASS toàn bộ, 0 lỗi mới.
- Test thủ công đề xuất: ở Tổng Quan > Thi đua, chọn lọc còn 1-2 chương trình có tên phức tạp (VD chứa "&" hoặc "THI ĐUA"); chuyển sang Nhân viên > Thi đua > Lọc nhóm — xác nhận đúng các chương trình đó đang được chọn (trước đây sẽ không khớp).
