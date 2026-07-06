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
export function calculateRunRate(revenue: number, daysPassed: number, totalDays: number): number {
    if (daysPassed <= 0) return 0;
    return (revenue / daysPassed) * totalDays;
}
