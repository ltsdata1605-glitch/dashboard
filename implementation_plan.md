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
