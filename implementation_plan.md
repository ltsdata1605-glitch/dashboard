# Kế hoạch: Đồng bộ kích thước icon toolbar toàn bộ module Phân Tích

## Bối cảnh
User chỉ icon camera (nút "Chụp ảnh") trong toolbar "Chi Tiết Theo Kho"
(`WarehouseSummary.tsx`) làm chuẩn, yêu cầu đồng bộ toàn bộ icon nút hành động
trong toolbar/header các card của module Phân Tích theo đúng kích thước đó.

**Pattern chuẩn** (đã xác nhận đúng ở WarehouseSummary.tsx dòng 600-656):
mỗi nút icon toolbar (`Button variant="unstyled" size="none"` với
`p-1.5 lg:p-2 rounded-md`) render CẶP ĐÔI:
```tsx
<Icon name="X" size={4} className="lg:hidden" />
<Icon name="X" size={5} className="hidden lg:block" />
```
Icon mobile = 4, desktop (từ breakpoint `lg:` = 1024px) = 5.

## Kết quả rà soát (agent Explore) — 5 nhóm lệch chuẩn

**A. WarehouseSummary.tsx:655** — spinner `loader-2` khi xuất ảnh chỉ có
`size={4}` cố định, không cặp `lg:` như icon camera tĩnh cạnh nó.

**B. TrendChart.tsx (658,667), SavedCalendarCard.tsx (157,165),
IndustryGrid.tsx (294)** — icon cố định `size={3.5}`, không tách mobile/desktop.

**C. Cụm Phân Tích Nhân Viên** (EmployeeAnalysis.tsx, EmployeeAnalysisFilters.tsx,
ContestTable.tsx, HeadToHeadTab.tsx, EmployeeAnalysisContent.tsx,
TopSellerList.tsx, IndustryAnalysisTab.tsx, performance/PerformanceSingleTable.tsx)
— toàn bộ đang dùng breakpoint **`sm:` (640px)** + size **3.5/4.5 → 5**, không
phải `lg:` (1024px) + 4 → 5. Đổi cả breakpoint lẫn size mobile.

**D. components/tables/summary/*** (SummaryTableHeader.tsx,
SummaryTableFilterBar.tsx, FilterPopover.tsx) — hỗn hợp: vài nút 1-size cố
định, vài nút dùng `sm:`+3.5/4, vài nút dùng đúng `lg:` nhưng size 3/4 (lệch 1
bậc so với chuẩn 4/5).

**E. DashboardView.tsx (301-302, 433)** — nút đóng/xóa dạng inline (không phải
SectionHeader chuẩn), 1 size cố định `size={3.5}`.

## Quyết định phạm vi
User chọn sửa **toàn bộ 5 nhóm** (không chỉ A+B) — bao gồm đổi breakpoint
`sm:`→`lg:` ở cụm Phân Tích Nhân Viên, chấp nhận thay đổi cách icon hiển thị ở
độ rộng tablet (640–1024px).

## Không đổi
Icon trang trí nhỏ bên trong nội dung (search icon trong input, check-icon
checkbox, icon trong badge số...) — KHÔNG phải nút hành động toolbar, giữ
nguyên theo agent audit.

## Trình tự
1. Nhóm A+B (rủi ro thấp, core Phân Tích, không đổi breakpoint) — sửa trước.
2. Nhóm D (components/tables/summary — dùng chung nhiều nơi).
3. Nhóm E (DashboardView — 2 điểm nhỏ).
4. Nhóm C (lớn nhất, đổi `sm:`→`lg:` — cần cẩn thận không sai breakpoint còn
   sót ở chỗ khác trong cùng file).
5. `npm run typecheck && npm run lint:eslint && npm run build` sau mỗi nhóm
   lớn, `npm run check` đầy đủ ở bước cuối.
6. Chạy dev server, chụp thử responsive ở vài độ rộng để xác nhận không vỡ layout.
