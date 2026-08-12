# Kế hoạch: Hoàn thiện các hạng mục "chưa làm" từ audit Report BI (08/2026)

> Tiếp nối audit trước (xem git log `c1fae341`..`32bedb90` và memory
> `project_report_bi_audit_2026_08.md`). User xác nhận qua AskUserQuestion:
> - DeltaBadge previous=0: **giữ nguyên**, không sửa.
> - uiService.ts: **tách thành 3 file**, giữ `uiService.ts` làm barrel re-export.
> - Dropdown tự dựng: **xây `MultiSelectDropdown` dùng chung**.

## 1. Sửa bất nhất dòng TỔNG CỘNG (InstallmentTab.tsx group mode)
`InstallmentTab.tsx` chế độ nhóm (group mode, mặc định) ẩn dòng TỔNG CỘNG khi đang lọc
bộ phận (`!exportDeptFilter && !isFiltering`), khác với:
- Chính `InstallmentTab.tsx` ở chế độ danh sách (list mode) — chỉ `!exportDeptFilter`.
- `useRevenueData.ts` (cả 2 chế độ) — chỉ `!exportDeptFilter`.
- `CrossSellingTab.tsx` (cả 2 chế độ) — chỉ `!exportDeptFilter`.

5/6 vị trí nhất quán, InstallmentTab group-mode là ngoại lệ duy nhất — đủ bằng chứng
đây là lỗi copy-paste, không phải chủ đích. Sửa bỏ `&& !isFiltering`.

## 2. Gộp danh sách 33 ngành hàng cấp 0 trùng lặp
`utils/dashboardHelpers.ts` và `utils/detailDataParser.ts` định nghĩa độc lập cùng 1
danh sách ngành hàng cấp 0 (VAS, PHỤ KIỆN, TABLET...). Gộp về 1 nguồn chung.

## 3. Tách uiService.ts (~1068 dòng) thành 3 file chuyên trách
Tạo thư mục `services/uiExport/`:
- `blobUtils.ts` — downloadBlob, canShareFiles, shareBlob
- `imageExport.ts` — waitForImages, exportElementAsImage (phần html-to-image lớn nhất)
- `colorUtils.ts` — fixOklchColors và helper canvas màu

`services/uiService.ts` giữ nguyên đường dẫn, chỉ còn `export * from './uiExport/...'`
— 13 file đang import từ `uiService` không cần sửa gì.

## 4. Xây MultiSelectDropdown dùng chung
Component mới `components/shared/ui/MultiSelectDropdown.tsx` — trigger button (icon +
label + badge đếm + chevron) + panel multi-select dùng Switch, có hàng "Chọn tất cả".
Migrate 2 khối trùng lặp trong `NhanVien.tsx` (lọc siêu thị, lọc bộ phận) sang dùng
component này. `SearchableSelect` (DetailTab.tsx) là single-select + tìm kiếm — hình
dạng khác, KHÔNG ép vào MultiSelectDropdown, để nguyên.

## Trình tự
Mỗi mục 1 commit riêng + `npm run check` xanh trước khi sang mục kế.
