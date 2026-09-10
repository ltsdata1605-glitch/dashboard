/**
 * Metric Service
 * Centralized business logic calculations for KPIs, efficiency, AOV, and run rates.
 * Part of Phase 1 Refactoring Roadmap for Core Consolidation and Type Safety.
 */

/**
 * Calculates QD Effectiveness (Hiệu quả Quy đổi) as a fraction (e.g., 0.15 for 15%).
 * Used in kpiService and nhanVienHelpers.
 */
export function calculateHieuQuaQDFraction(doanhThuQD: number, doanhThuThuc: number): number {
    if (doanhThuThuc <= 0) return 0;
    return (doanhThuQD - doanhThuThuc) / doanhThuThuc;
}

/**
 * Calculates QD Effectiveness (Hiệu quả Quy đổi) as a percentage (e.g., 15.0 for 15%).
 * Used in summaryService and employeeService.
 */
export function calculateHieuQuaQDPercent(doanhThuQD: number, doanhThuThuc: number): number {
    if (doanhThuThuc <= 0) return 0;
    return ((doanhThuQD - doanhThuThuc) / doanhThuThuc) * 100;
}

/**
 * Calculates generic percentage of a part over a total (e.g., installment rates, cross-selling rates).
 * Returns 0 if total is 0 or negative.
 */
export function calculatePercentage(part: number, total: number): number {
    if (total <= 0) return 0;
    return (part / total) * 100;
}

/**
 * Calculates Average Order Value (AOV).
 * Returns 0 if quantity is 0 or negative.
 */
export function calculateAOV(revenue: number, quantity: number): number {
    if (quantity <= 0) return 0;
    return revenue / quantity;
}

/**
 * Calculates Run Rate revenue projection.
 * Returns 0 if daysPassed is 0 or negative.
 */
/**
 * Tiến độ tháng dùng cho mọi phép run rate.
 *
 * `daysPassed = ngày hôm nay - 1` vì dữ liệu chốt tới hết hôm qua, và **tối thiểu 1**.
 *
 * 🔴 Chốt `Math.max(1, ...)` KHÔNG phải chi tiết vặt: thiếu nó thì đúng ngày MÙNG 1,
 * `daysPassed = 0` ⇒ `calculateRunRate` trả 0 ⇒ mọi %DKHT thành 0 ⇒ TOÀN BỘ hạng mục bị
 * xếp vào nhóm "NoSale". Cả siêu thị mở báo cáo đầu tháng thấy trắng bảng mà không hiểu vì sao.
 *
 * Trước 2026-09-10 có HAI bản của hàm này — `competitionSummaryCalc.getMonthProgress` (có chốt)
 * và `individualCompetitionCalc.getIndividualMonthProgress` (KHÔNG có chốt). Đã gộp về đây để
 * chúng không thể lệch nhau lần nữa. ĐỪNG tạo bản thứ ba.
 */
export function getMonthProgress(now: Date = new Date()): { daysPassed: number; daysInMonth: number } {
    return {
        daysPassed: Math.max(1, now.getDate() - 1),
        daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    };
}

export function calculateRunRate(revenue: number, daysPassed: number, totalDays: number): number {
    if (daysPassed <= 0) return 0;
    return (revenue / daysPassed) * totalDays;
}
