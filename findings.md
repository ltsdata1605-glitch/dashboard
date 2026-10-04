# Khảo Sát & Phát Hiện (Findings)

## Tiêu Chí Style KPI Phân Tích (Benchmark Chuẩn "Executive Modern")
1. **Khung thẻ**: `rounded-2xl` (16px), viền `border border-slate-200/80 dark:border-slate-800/80`, nền `bg-white/95 dark:bg-slate-900/90`, đổ bóng `shadow-xs hover:shadow-lg`, vạch gradient đỉnh thẻ `h-[3.5px] w-full shrink-0 ${style.topAccent}`.
2. **Header thẻ**: Icon squircle `w-7 h-7 rounded-xl` mềm mại kèm bóng `shadow-2xs`, tiêu đề in hoa `text-[11px] font-bold uppercase tracking-wider text-slate-500`, micro status indicator dot tròn `w-2 h-2 rounded-full`.
3. **Giá trị chính (Value)**: Cụm số to rõ nổi bật, **canh giữa tuyệt đối** (`w-full flex items-center justify-center text-center`), định dạng số lớn `font-black leading-none tracking-tight tabular-nums`, đơn vị đi kèm cân đối.
4. **Footer thẻ**: **1 dòng ngang duy nhất** (`flex items-center justify-between gap-1 text-[11px] leading-none mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/70`), badge chênh lệch nhỏ gọn `text-[10px] px-1.5 py-0.5 rounded-md shrink-0`.
5. **Loại bỏ progress bar** ở đáy thẻ để giao diện tối giản, thanh thoát, giảm 50% chiều cao thừa.

## Danh Sách Các Khu Vực / Tính Năng Đã Khảo Sát & Trạng Thái:
1. `components/kpis/KpiCards.tsx` (Phân Tích - Tổng quan doanh thu): **ĐÃ ĐỒNG BỘ** (rounded-2xl, số canh giữa, chân 1 dòng).
2. `features/bi-dashboard/components/dashboard/KpiOverview.tsx` (Report BI - Siêu Thị Doanh Thu Realtime & Luỹ kế): **ĐÃ ĐỒNG BỘ** (rounded-2xl, số canh giữa, chân 1 dòng).
3. `features/bi-dashboard/components/dashboard/competition/CompetitionKpiCards.tsx` (Report BI - Thẻ Thi Đua): **CẦN CẬP NHẬT** (hiện đang dùng khung phẳng rounded-none, vạch 2.5px, progress bar cũ, số chưa canh giữa).
4. `features/khai-thac/components/DashboardTab.tsx` (Khai Thác Doanh Số Cá Nhân): **CẦN CẬP NHẬT** (đã dùng KpiCard nhưng số còn lệch trái, cần canh giữa `justify-center w-full`).
5. `components/modals/PerformanceModal.tsx` (Modal Hiệu Suất Nhân Viên): **CẦN CẬP NHẬT** (đang dùng KpiCard riêng rounded-xl, số lệch trái, chân thẻ 2 tầng).
6. `features/check-thuong/components/CheckThuongSummaryCards.tsx` (Check Thưởng - Thẻ Tổng Quan): **CẦN CẬP NHẬT** (khung phẳng rounded-none, icon vuông nhỏ, số lệch trái, progress bar cũ).
7. `components/common/SkeletonLoader.tsx` (Skeleton Thẻ KPI): **CẦN CẬP NHẬT** (cần canh giữa số giả lập, bỏ progress bar dài ở chân thẻ để khớp layout).
