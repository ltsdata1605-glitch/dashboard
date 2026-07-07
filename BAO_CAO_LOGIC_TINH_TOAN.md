# BÁO CÁO RÀ SOÁT LOGIC TÍNH DTQĐ / SỐ LƯỢNG QUY ĐỔI (PROMPT 1A)
> Nhiệm vụ CHỈ ĐỌC — không có file code nào bị sửa khi lập báo cáo này.

## 1. Công thức chuẩn (utils/dataUtils.ts → calculateRowMetrics(), dòng 554-595)

```
revenue      = price                                  // price = COL.PRICE ('Giá bán_1')
revenueQD    = revenue × heso + (revenue × 0.3 nếu isTraCham)
isTraCham    = hình thức xuất thuộc nhóm Trả góp/Trả chậm (htxClassification hoặc HINH_THUC_XUAT_TRA_GOP)

isInsurance  = ngành/nhóm hàng là "Bảo hiểm" / "Bảo hiểm ĐMX"
qtyMultiplier = isInsurance ? undefined : (vasMultiplierMap[productCode] ?? quantityMultiplierMap[productCode])
isVieon      = subgroup === 'Vieon' hoặc tên SP chứa "VieON"
weightedQuantity = isVieon ? (quantity × heso)
                 : (qtyMultiplier !== undefined ? quantity × qtyMultiplier : quantity)
```

**Chỉ 3 nơi gọi thẳng hàm chuẩn này**: `services/filterService.ts:144` (gán vào `row._metrics`), `services/employeeService.ts:274`, `services/summaryService.ts:93,215`. Mọi service khác đọc `row._metrics` (do filterService gán 1 lần cho toàn bộ dữ liệu) đều **ĐÚNG CHUẨN gián tiếp**: `services/trendService.ts`, `services/kpiService.ts`, `services/industryService.ts` (revenue/revenueQD; weightedQuantity ở industryService.ts có biến thể riêng — xem mục 3).

## 2. Bảng đối chiếu — nơi TỰ TÍNH LẠI (không qua calculateRowMetrics/row._metrics)

| File : dòng | Công thức revenueQD đang dùng | +30% trả góp | Base doanh thu | weightedQuantity đang dùng | Dùng calculateRowMetrics? |
|---|---|:---:|---|---|:---:|
| `components/tables/summary/CrossSellingTable.tsx:45-50` | `(price×qty) × heso` | ❌ thiếu | ⚠️ `price×qty` — xem mục 3 (nghi vấn nhân đôi) | không tính (dùng `qty` thô) | ❌ |
| `components/charts/TrendChart.tsx:224-238` | `price × heso` | ❌ thiếu | `price` | Vieon: `qty×heso`; else: `qty×quantityMultiplierMap` (không check `isInsurance`, không ưu tiên `vasMultiplierMap`) | ❌ |
| `components/charts/SavedCalendarCard.tsx:78-96` | `price × heso` | ❌ thiếu | `price` | giống hệt TrendChart (bản sao/duplicate logic) | ❌ |
| `components/modals/PerformanceModal.tsx:149-156` | `price × heso` | ❌ thiếu | `price` | không tính | ❌ |
| `components/modals/UncollectedOrdersModal.tsx` (dòng 158-160, 196-198, 220-222, 619-620) | `rowRevenue × heso` | ❌ thiếu | `price` (`rowRevenue = price`) | không tính | ❌ |
| `components/modals/UnshippedOrdersModal.tsx` (dòng 150-152, 171 export, 207-209, 245-247, 269-271, 612-613) | `price × heso` | ❌ thiếu | `price` | không tính | ❌ |
| `components/employees/ContestTable.tsx:183-196` | `revenue × heso` | ❌ thiếu | `revenue` (= price) | Vieon: `qty×heso`; else: `qty×quantityMultiplierMap` (không check `isInsurance`, không ưu tiên `vasMultiplierMap`) | ❌ |
| `hooks/useHeadToHeadLogic.ts:221-227` | `price × heso` | ❌ thiếu | `price` | Vieon: `qty×heso`; else: **`qty` thô, không áp multiplier nào** | ❌ |
| `hooks/useWarehouseLogic.ts:130-148` | `rowRevenue × heso` | ❌ thiếu | `price` | Vieon: `qty×heso`; else: **`qty` thô, không áp multiplier nào** | ❌ |
| `components/kpis/KpiCards.tsx:364-370` | đọc thẳng `row['Doanh Thu QĐ'] \|\| row['Doanh Thu QD'] \|\| row['Doanh thu QĐ']` từ **field thô trên row**, không gọi `getHeSoQuyDoi` dù có import (import chết) | không xác định | không xác định | không tính | ❌ — không tính, đọc field lạ (xem mục 4) |

**Đã ĐÚNG CHUẨN (không cần sửa):**
- `services/filterService.ts`, `services/employeeService.ts`, `services/summaryService.ts` — gọi thẳng `calculateRowMetrics`.
- `services/trendService.ts`, `services/kpiService.ts` — dùng `row._metrics.revenue/revenueQD/isTraCham` nguyên vẹn.
- `services/industryService.ts` — `revenue/revenueQD` dùng `row._metrics` (đúng), nhưng `weightedQuantity` tự tính riêng: chỉ xử lý Vieon (`qty×heso`), **không áp `vasMultiplierMap`/`quantityMultiplierMap` cho sản phẩm quy đổi số lượng khác** (VAS, phụ kiện...) — lệch nhẹ so với chuẩn.
- `components/employees/industry/useIndustryAnalysisLogic.ts:236-243` — bảng này **không có cột revenueQD** (chỉ "revenue" thô + "weightedQuantity"), nên không dính lỗi thiếu 30%. Nhưng `weightedQuantity` có cùng kiểu lệch như TrendChart/ContestTable (không check `isInsurance`, không ưu tiên `vasMultiplierMap`).
- `hooks/useTrendChartLogic.ts`, `services/metricService.ts` (cả 2 bản gốc/bi-dashboard) — chỉ đọc dữ liệu đã tính sẵn từ `trendService`, không tự tính.

## 3. Nghi vấn CrossSellingTable.tsx — xác minh COL.PRICE

**Kết luận: gần như chắc chắn là BUG (nhân đôi doanh thu bởi số lượng).**

Bằng chứng:
- `constants.ts:9` — `COL.PRICE = ['Giá bán_1']`.
- Hàm chuẩn `calculateRowMetrics` dòng 555-557: `const price = getRowValue(row, COL.PRICE); const revenue = price;` — **không nhân với quantity**. Đây là hàm được 3 service lõi (filterService/employeeService/summaryService) dùng làm nguồn doanh thu chính của toàn app.
- Tất cả 9 nơi khác trong bảng ở mục 2 đều lấy `revenue = price` (không nhân qty), trong đó **4 chỗ có comment tường minh xác nhận**: `UncollectedOrdersModal.tsx` (4 dòng) và `UnshippedOrdersModal.tsx` (4 dòng) đều ghi `// Doanh thu là giá trị của cột Giá bán_1`.
- Riêng `CrossSellingTable.tsx:47-48` là **nơi DUY NHẤT trong toàn bộ codebase** viết `const rowRevenue = price * qty;` — khác biệt với mọi chỗ còn lại.

⚠️ Lưu ý minh bạch: file mẫu `du-lieu-mau.txt` được nhắc trong kế hoạch hoá ra là file RTF chứa nội dung không liên quan (có vẻ là bản chụp màn hình menu HRM/ERP, không phải dữ liệu bán hàng mẫu với cột `Giá bán_1`) — **không dùng để đối chiếu trực tiếp được**. Kết luận "BUG" ở trên dựa hoàn toàn vào bằng chứng chéo từ chính code (9/10 nơi đồng nhất + comment tường minh + hàm chuẩn), độ tin cậy cao nhưng vẫn khuyến nghị bạn thử nhân giá thực tế trên 1 đơn hàng thật để chắc chắn 100% trước khi sửa ở PROMPT 1B.

## 4. Phát hiện thêm ngoài phạm vi dự kiến ban đầu — KpiCards.tsx custom KPI card

`components/kpis/KpiCards.tsx` dòng 364-370 (tính năng "custom KPI card" cấu hình theo `dataFilters`) đọc trực tiếp:
```js
row['Doanh Thu QĐ'] || row['Doanh Thu QD'] || row['Doanh thu QĐ']
```
từ `warehouseFilteredData` (kiểu `DataRow[]` — dữ liệu thô lọc theo kho, xem `hooks/useDataManagement.ts:27`). Đã grep toàn bộ codebase: **không tìm thấy bất kỳ chỗ nào gán field `'Doanh Thu QĐ'` lên các row thô này** trước khi tới đây (field `'Doanh Thu QĐ'` chỉ xuất hiện như constant nhãn hiển thị ở `constants.ts:53` và như field xuất Excel ở `UnshippedOrdersModal.tsx:171` — hai nơi không liên quan tới `warehouseFilteredData`). Nhiều khả năng đây là dữ liệu **luôn = 0** (rơi vào `|| 0`) — tức tính năng "custom KPI card" với `metricType: 'revenueQD'` có thể đang **không hoạt động / luôn trả về 0** mà chưa ai phát hiện. Đây không nằm trong phạm vi mô tả ban đầu của kế hoạch nhưng đáng để bạn xác nhận (thử tạo 1 custom KPI card với metricType "revenueQD" và xem có ra số hay không).

Ngoài ra `getHeSoQuyDoi` được import trong `KpiCards.tsx` nhưng không có lệnh gọi nào — import chết (không phải lỗi tính toán, chỉ là dọn dẹp code thừa, có thể xử lý ở Đợt 3A/eslint không bắt vì không phải quy tắc `no-unused-vars` cho import kiểu named-but-reexported... — ghi nhận để tiện dọn sau).

## 5. Phân loại tổng hợp

### 🔴 Chắc chắn là BUG (không cần quyết định nghiệp vụ, có thể sửa thẳng ở 1B)
1. **`CrossSellingTable.tsx`** — nhân đôi doanh thu theo `qty` (mục 3).
2. **`hooks/useHeadToHeadLogic.ts`** và **`hooks/useWarehouseLogic.ts`** — `weightedQuantity` cho sản phẩm không phải Vieon **hoàn toàn bỏ qua** `vasMultiplierMap`/`quantityMultiplierMap` (số lượng quy đổi = số lượng thô cho mọi VAS/phụ kiện không phải Vieon) — đây là sai lệch cấu trúc rõ ràng so với chuẩn, không phải lựa chọn nghiệp vụ.
3. **`KpiCards.tsx` custom KPI card `revenueQD`** — nhiều khả năng luôn trả về 0 do đọc field không tồn tại (mục 4) — cần xác nhận rồi sửa.

### 🟡 Lệch cấu trúc nhẹ hơn — nên đồng bộ nhưng ít rủi ro hơn
- `industryService.ts`, `useIndustryAnalysisLogic.ts`, `TrendChart.tsx`, `SavedCalendarCard.tsx`, `ContestTable.tsx`: `weightedQuantity` thiếu ưu tiên `vasMultiplierMap` và thiếu check `isInsurance` — nên hợp nhất về logic chuẩn.

### 🟢 CẦN BẠN QUYẾT ĐỊNH NGHIỆP VỤ (không phải bug kỹ thuật thuần)
**Việc thiếu +30% trả góp** ở 9 nơi (TrendChart, SavedCalendarCard, PerformanceModal, UncollectedOrdersModal, UnshippedOrdersModal, ContestTable, useHeadToHeadLogic, useWarehouseLogic) — về mặt kỹ thuật đây là "lệch so với hàm chuẩn", nhưng liệu +30% có **NÊN** áp dụng ở từng màn hình này hay không là quyết định của bạn, vì mỗi màn hình phục vụ mục đích khác nhau:

| Màn hình | Vai trò | +30% trả góp NÊN áp dụng? |
|---|---|---|
| TrendChart (lịch DT theo ngày) + SavedCalendarCard | So sánh xu hướng DTQĐ theo ngày/lịch | Nếu mục đích là khớp với số DTQĐ "chính thức" (báo cáo/KPI) → NÊN cộng. Nếu chỉ minh hoạ xu hướng tương đối → có thể chấp nhận không cộng, nhưng cần ghi chú rõ trên UI để không gây hiểu nhầm là số khớp KPI. |
| PerformanceModal (hiệu quả QĐ nhân viên/kho) | Tính % hiệu quả quy đổi | Nếu dùng để đánh giá thi đua/lương thưởng → NÊN cộng để khớp KPI chính. Nếu sai sẽ đánh giá thấp hơn thực tế cho nhân viên có nhiều đơn trả góp. |
| UncollectedOrdersModal / UnshippedOrdersModal | Theo dõi đơn chưa thu tiền/chưa xuất | Đây là số liệu vận hành (theo dõi tồn đọng), có thể không cần khớp tuyệt đối KPI — nhưng nếu ai đó dùng số DTQĐ ở đây để đối chiếu KPI thì sẽ thấy lệch. |
| ContestTable (thi đua) | Xếp hạng nhân viên theo cột tuỳ chỉnh | Nếu cột "revenueQD" dùng để xếp hạng/thưởng thi đua → NÊN cộng, nếu không sẽ tạo bất công cho nhân viên bán trả góp nhiều. |
| useHeadToHeadLogic (so sánh 2 nhân viên/kho) | So sánh trực tiếp 2 đối tượng | Cùng công thức cho cả 2 bên nên tương đối công bằng khi so sánh nội bộ, nhưng vẫn lệch nếu so với KPI tổng ở màn hình khác. |
| useWarehouseLogic (cột tuỳ chỉnh báo cáo kho) | Cấu hình cột tự do theo kho | Tương tự ContestTable — tuỳ vào việc cột này có dùng để đánh giá KPI kho hay không. |

**Câu hỏi cần bạn chốt trước khi chạy PROMPT 1B:**
1. Những màn hình nào ở bảng trên **PHẢI** cộng +30% trả góp giống hàm chuẩn (để khớp số với KPI chính), và màn hình nào **cố ý** không cộng (và vì sao)?
2. Xác nhận: `CrossSellingTable.tsx` nhân đôi theo `qty` là bug thật (không phải cố ý) — có đồng ý sửa về `revenue = price` (bỏ `×qty`) không?
3. `useHeadToHeadLogic.ts`/`useWarehouseLogic.ts` bỏ qua hoàn toàn multiplier VAS/phụ kiện cho hàng không-Vieon — có đồng ý hợp nhất về `calculateRowMetrics`/dùng chung logic `qtyMultiplier` không?
4. Tính năng custom KPI card `revenueQD` trong `KpiCards.tsx` — bạn có đang dùng tính năng này không? Nếu có và đang thấy số 0/sai, xác nhận để sửa sang tính qua `calculateRowMetrics` thay vì đọc field thô.

**Hệ quả nếu chọn "cộng +30% cho tất cả":** số liệu DTQĐ sẽ tăng lên ở các màn hình trên (đặc biệt nơi có tỷ trọng trả góp cao), có thể khiến số cũ (trước khi sửa) và số mới lệch nhau khi so sánh lịch sử — nên thông báo trước cho người dùng cuối biết mốc thời gian đổi công thức.
**Hệ quả nếu chọn "giữ nguyên không cộng" cho một số màn hình:** cần ghi chú rõ trong UI/tooltip rằng số ở màn hình đó là "DTQĐ ước tính" khác với "DTQĐ chính thức" ở KPI tổng, tránh người dùng nhầm lẫn khi đối chiếu 2 màn hình.

---
*Không có file code nào bị sửa trong quá trình lập báo cáo này.*
