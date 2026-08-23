# Kế hoạch: Sửa tên/tiêu đề ảnh xuất (download desktop + Web Share mobile) — toàn bộ 4 khu vực

## Bối cảnh & nguyên nhân gốc

Yêu cầu: khi xuất ảnh trên mobile mở bảng chia sẻ (Web Share API), chọn Zalo/LINE
phải gửi kèm **tiêu đề khu vực ảnh được xuất**, không phải tên file kỹ thuật. Trên
desktop, ảnh tải xuống phải có **tên = tên khu vực được xuất**.

Rà soát 4 bản sao độc lập của `shareBlob()`/`downloadBlob()` (root
`services/uiService.ts`, `features/bi-dashboard/services/uiExport/blobUtils.ts`,
`features/phan-ca/services/uiService.ts`, `features/sticker-event/services/uiService.ts`)
phát hiện 2 lỗi gốc:

1. **`shareBlob()` dùng bảng regex "dịch tên file → tiếng Việt" bị copy-paste y
   nguyên vào cả 4 khu vực**, nhưng bảng đó chỉ khớp filename của một vài màn hình
   cụ thể bên bi-dashboard (và ngay cả ở đó cũng gần như không khớp vì pattern
   không đúng, ví dụ regex tìm `"BC CrossSelling"` nhưng filename thực tế là
   `"CrossSelling_..."`) → hầu hết mọi nơi tiêu đề chia sẻ rơi về chuỗi kỹ thuật thô
   (gạch dưới/gạch ngang, có ngoặc vuông `[KHO]`, không dấu). Đồng thời `File.name`
   (nhiều app như Zalo/LINE hiển thị đúng field này) vẫn dùng `filename` gốc thô,
   **không hề dùng** `displayName` đã cố dịch.
2. **Một số nơi tạo `filename` phá huỷ dấu tiếng Việt ngay từ nguồn**, không thể
   khôi phục lại được ở bước sau: `.replace(/[^a-zA-Z0-9]/g, '_')` (biến mỗi ký tự
   có dấu thành `_` rời rạc, ví dụ "Tổng" → "T_ng") hoặc NFD-strip-diacritics. Có
   nơi còn hard-code sẵn tên file tiếng Anh/không dấu (ví dụ `Toan-bo-ban-tin.png`,
   `Lich_Toan_Bo_Thang_...`, `danh-sach-san-pham-...`) dù nơi gọi thừa biết tiêu đề
   tiếng Việt đầy đủ (label tab, `config.tableName`...).

Phần lớn các Tab trong bi-dashboard (RevenueTab, CrossSellingTab, InstallmentTab,
CompetitionTab, CompetitionSummaryView, IndividualCompetitionView,
CompetitionCompareView, CompetitionGroupView) **đã giữ đúng dấu tiếng Việt** trong
filename (chỉ thay khoảng trắng/`/` bằng `_`) — không cần sửa nguồn, chỉ cần sửa (1).

## Thiết kế sửa

**A. Chuẩn hoá `shareBlob()` (4 file)** — bỏ hẳn bảng regex dịch từng vùng, thay
bằng suy ra tiêu đề hiển thị tổng quát, an toàn cho mọi filename có sẵn:
```js
const displayName = filename.replace(/\.png$/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || 'Anh xuat';
const file = new File([blob], `${displayName}.png`, { type: 'image/png' }); // dùng displayName, không dùng filename thô
```
`title`/`text` trong `shareData` giữ nguyên là `displayName` (đã đúng từ trước, chỉ
là nguồn `displayName` được sửa lại).

**B. Vá các nơi phá dấu tiếng Việt tại nguồn** — đổi từ "xoá mọi ký tự non-ASCII"
sang "chỉ chặn ký tự thật sự không hợp lệ cho tên file" (`\ / : * ? " < > |`), giữ
nguyên dấu + khoảng trắng tiếng Việt:
- root: `ContestTable.tsx` (bỏ bước NFD strip-diacritics), `EmployeeAnalysis.tsx`
  (2 chỗ, bỏ NFD strip-diacritics), `UncollectedOrdersModal.tsx`,
  `UnshippedOrdersModal.tsx`, `hooks/useExportLogic.ts` (`handleBatchExport`).
- bi-dashboard: `Dashboard.tsx` (6 điểm gọi, cùng 1 hàm sanitize gốc).
- phan-ca: `PhanCaView.tsx` (`handleExportIndividual`).

**C. Viết lại tên file hard-code tiếng Anh/không dấu thành tiêu đề tiếng Việt thật**
(giữ nguyên phần `prefix` kho `${getExportFilenamePrefix(...)}` đang có, không đổi
định dạng của hàm này — ngoài phạm vi báo lỗi):
- root: `DashboardView.tsx` (2), `WarehouseSummary.tsx` (1), `TrendChart.tsx` (3),
  `PerformanceModal.tsx` (1), `UncollectedOrdersModal.tsx` (2),
  `UnshippedOrdersModal.tsx` (2), `useExportLogic.ts` (`handleBatchKhoExport`, 2).
- phan-ca: `PhanCaView.tsx` (2 filename cố định + phần tĩnh trong filename cá nhân).
- sticker-event: `StickerEventApp.tsx` (1).

**Không đổi**: định dạng `getExportFilenamePrefix()` (ngoặc vuông `[KHO]`), tên file
desktop vẫn giữ dấu nối `_`/khoảng trắng như từng khu vực đang dùng (chỉ đảm bảo có
dấu tiếng Việt đầy đủ) — tránh mở rộng phạm vi ngoài lỗi được báo cáo.

## Trình tự thực hiện
1. Sửa 4 file `shareBlob()` trước (thay đổi ít rủi ro nhất, cải thiện ngay lập tức
   phần lớn màn hình dù chưa sửa nguồn).
2. Vá các hàm sanitize phá dấu + viết lại filename hard-code, theo từng khu vực.
3. `npm run check` (root) + `cd functions` không liên quan, bỏ qua.
4. Test thủ công trên trình duyệt: giả lập mobile (DevTools) bấm xuất ảnh ở vài màn
   hình đại diện mỗi khu vực, xác nhận `navigator.share` nhận đúng `title`/`file.name`.
