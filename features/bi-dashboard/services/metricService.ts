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
export interface MonthProgress {
    daysPassed: number;
    daysInMonth: number;
    isPastMonth: boolean;
    day: number;
    month: number;
    year: number;
}

/**
 * Trích xuất ngày, tháng, năm từ chuỗi dữ liệu (báo cáo, tiêu đề, footer, v.v.).
 */
export function extractDateFromData(text: string | null | undefined): { day?: number; month?: number; year?: number } | null {
    if (!text || typeof text !== 'string') return null;

    // Pattern 1: Ngày đầy đủ "Cập nhật lúc: 12:11:05 20/9/2026", "30/09/2026", "30/9/2026"
    const dmyMatch = text.match(/(?:cập nhật lúc:?\s*[\d:]*\s*|đến ngày\s*|hết ngày\s*|ngày\s*)?(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i);
    if (dmyMatch) {
        const d = parseInt(dmyMatch[1], 10);
        const m = parseInt(dmyMatch[2], 10);
        const y = parseInt(dmyMatch[3], 10);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2020 && y <= 2035) {
            return { day: d, month: m, year: y };
        }
    }

    // Pattern 2: "Đến ngày 30/9", "hết ngày 30/9", "ngày 30/9"
    const dmMatch = text.match(/(?:đến ngày|hết ngày|ngày)\s*(\d{1,2})[/-](\d{1,2})(?!\d)/i);
    if (dmMatch) {
        const d = parseInt(dmMatch[1], 10);
        const m = parseInt(dmMatch[2], 10);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
            return { day: d, month: m };
        }
    }

    // Pattern 2b: "30/9", "30/09" xuất hiện trong văn bản báo cáo hoặc tiêu đề
    const genericDmMatch = text.match(/(?:^|[^\d/])(\d{1,2})[/-](\d{1,2})(?!\d|[/-])/);
    if (genericDmMatch) {
        const d = parseInt(genericDmMatch[1], 10);
        const m = parseInt(genericDmMatch[2], 10);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
            return { day: d, month: m };
        }
    }

    // Pattern 3: Tháng/Năm "09/2026", "Tháng 9/2026"
    const myMatch = text.match(/(?:tháng\s*)?(\d{1,2})[/-](\d{4})/i);
    if (myMatch) {
        const m = parseInt(myMatch[1], 10);
        const y = parseInt(myMatch[2], 10);
        if (m >= 1 && m <= 12 && y >= 2020 && y <= 2035) {
            return { month: m, year: y };
        }
    }

    // Pattern 4: "quỹ thời gian: 30 / 30" hoặc "nhịp 30"
    const singleDayMatch = text.match(/(?:quỹ thời gian:\s*|nhịp\s*)(\d{1,2})/i);
    if (singleDayMatch) {
        const d = parseInt(singleDayMatch[1], 10);
        if (d >= 1 && d <= 31) {
            return { day: d };
        }
    }

    return null;
}

/**
 * Tiến độ tháng dùng cho mọi phép tính Run Rate & Dự kiến trong BI Dashboard:
 * 
 * 1. Khi đổ dữ liệu của THÁNG ĐÃ QUA (ví dụ nạp số tháng 9 khi đang ở tháng 10):
 *    - daysInMonth lấy theo đúng số ngày của tháng đã qua (ví dụ tháng 9 có 30 ngày, tháng 8 có 31 ngày).
 *    - daysPassed lấy theo số ngày của dữ liệu đó (nếu dữ liệu chốt cuối tháng thì daysPassed = daysInMonth).
 *    - Khi đó (DT / daysPassed) * daysInMonth = DT, KHÔNG bị phóng đại theo số ngày của tháng mới!
 * 
 * 2. Ngày mùng 1 đầu tháng:
 *    - Ngày hôm qua là ngày cuối cùng của tháng liền trước, dữ liệu luỹ kế là toàn bộ tháng trước.
 *    - Tự động lấy daysPassed = số ngày tháng trước, daysInMonth = số ngày tháng trước.
 * 
 * 3. Mặc định khi không có dữ liệu ngày tháng cụ thể trong tháng hiện tại:
 *    - daysPassed = now.getDate() - 1, daysInMonth = số ngày tháng hiện tại.
 */
export function getMonthProgress(
    now: Date = new Date(),
    detected?: { day?: number; month?: number; year?: number } | null
): { daysPassed: number; daysInMonth: number; isPastMonth?: boolean; day?: number; month?: number; year?: number } {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();

    // Trường hợp 1: Có dữ liệu ngày/tháng được nhận diện cụ thể
    if (detected) {
        let m = detected.month;
        let y = detected.year || currentYear;
        const d = detected.day;

        // Nếu chỉ có ngày mà ngày > currentDay (VD dữ liệu ngày 30 trong khi hôm nay là mùng 1 hoặc mùng 2)
        // thì chắc chắn là ngày của tháng liền trước
        if (!m && d && d > currentDay) {
            const prevMonthDate = new Date(currentYear, currentMonth - 2, 1);
            m = prevMonthDate.getMonth() + 1;
            y = prevMonthDate.getFullYear();
        }

        if (m) {
            if (!detected.year && m > currentMonth) {
                y = currentYear - 1;
            }
            const dim = new Date(y, m, 0).getDate();
            const isPast = y < currentYear || (y === currentYear && m < currentMonth);

            let dp: number;
            if (d && d > 0) {
                dp = Math.min(dim, d);
            } else if (isPast) {
                dp = dim; // Tháng đã qua: đã qua trọn vẹn cả tháng
            } else {
                dp = Math.max(1, currentDay - 1);
            }

            return {
                daysPassed: Math.max(1, dp),
                daysInMonth: dim,
                isPastMonth: isPast,
                day: d || dp,
                month: m,
                year: y,
            };
        }
    }

    // Trường hợp 2: Vào ngày mùng 1 đầu tháng (currentDay === 1), báo cáo luỹ kế "đến hôm qua"
    // là toàn bộ tháng liền trước đã kết thúc hoàn chỉnh.
    if (!detected && currentDay === 1) {
        const prevMonthLastDate = new Date(currentYear, currentMonth - 1, 0);
        const prevDim = prevMonthLastDate.getDate();
        return {
            daysPassed: prevDim,
            daysInMonth: prevDim,
            isPastMonth: true,
            day: prevDim,
            month: prevMonthLastDate.getMonth() + 1,
            year: prevMonthLastDate.getFullYear(),
        };
    }

    // Trường hợp 3: Mặc định theo đồng hồ hiện tại
    const dim = new Date(currentYear, currentMonth, 0).getDate();
    return {
        daysPassed: Math.max(1, currentDay - 1),
        daysInMonth: dim,
        isPastMonth: false,
        day: Math.max(1, currentDay - 1),
        month: currentMonth,
        year: currentYear,
    };
}

export function calculateRunRate(revenue: number, daysPassed: number, totalDays: number): number {
    if (daysPassed <= 0) return 0;
    return (revenue / daysPassed) * totalDays;
}
