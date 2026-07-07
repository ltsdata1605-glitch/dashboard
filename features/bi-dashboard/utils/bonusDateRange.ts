/**
 * Hàm thuần tính khoảng ngày cho các lựa chọn kỳ đổ thưởng (Hiện tại/Tháng/Năm/
 * Khoảng thời gian). Tách riêng khỏi useBonusAutoBridge.ts để useMultiMonthBonusRun.ts
 * dùng chung, không phụ thuộc React.
 */

const pad2 = (n: number) => String(n).padStart(2, '0');
export const toDDMMYYYY = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

/** yyyymm dạng "2026-07" — cùng quy ước monthYear đã dùng ở features/phan-ca. */
export const toYYYYMM = (year: number, monthIndex0: number) => `${year}-${pad2(monthIndex0 + 1)}`;

export function parseYYYYMM(yyyymm: string): { year: number; monthIndex0: number } {
    const [y, m] = yyyymm.split('-').map(Number);
    return { year: y, monthIndex0: m - 1 };
}

export function formatMonthLabel(yyyymm: string): string {
    const { year, monthIndex0 } = parseYYYYMM(yyyymm);
    return `${monthIndex0 + 1}/${year}`;
}

function isSameCalendarMonth(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Kỳ mặc định của tab "Hiện tại":
 * - Ngày hiện tại > 01: từ 01 tháng này -> hôm qua.
 * - Ngày hiện tại = 01: lấy TRỌN tháng trước (01 -> ngày cuối tháng trước).
 */
export function getCurrentRangeDefault(now: Date = new Date()): { fromDate: string; toDate: string; isFullPreviousMonth: boolean } {
    if (now.getDate() === 1) {
        const prevMonthAnchor = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const from = new Date(prevMonthAnchor.getFullYear(), prevMonthAnchor.getMonth(), 1);
        const to = new Date(prevMonthAnchor.getFullYear(), prevMonthAnchor.getMonth() + 1, 0); // ngày 0 = ngày cuối tháng trước đó
        return { fromDate: toDDMMYYYY(from), toDate: toDDMMYYYY(to), isFullPreviousMonth: true };
    }
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now);
    to.setDate(to.getDate() - 1);
    return { fromDate: toDDMMYYYY(from), toDate: toDDMMYYYY(to), isFullPreviousMonth: false };
}

/**
 * Kỳ cho 1 tháng cụ thể (tab "Tháng"):
 * - Tháng hiện tại: 01 -> hôm nay trừ 1.
 * - Tháng quá khứ: 01 -> ngày cuối tháng.
 */
export function getMonthRange(yyyymm: string, now: Date = new Date()): { fromDate: string; toDate: string } {
    const { year, monthIndex0 } = parseYYYYMM(yyyymm);
    const from = new Date(year, monthIndex0, 1);
    const isCurrentMonth = isSameCalendarMonth(from, now);
    if (isCurrentMonth) {
        const to = new Date(now);
        to.setDate(to.getDate() - 1);
        return { fromDate: toDDMMYYYY(from), toDate: toDDMMYYYY(to < from ? from : to) };
    }
    const to = new Date(year, monthIndex0 + 1, 0);
    return { fromDate: toDDMMYYYY(from), toDate: toDDMMYYYY(to) };
}

/** Danh sách N tháng gần nhất (mới nhất trước), dùng cho dropdown tab "Tháng". */
export function listRecentMonths(n = 12, now: Date = new Date()): { yyyymm: string; label: string }[] {
    const out: { yyyymm: string; label: string }[] = [];
    for (let i = 0; i < n; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyymm = toYYYYMM(d.getFullYear(), d.getMonth());
        out.push({ yyyymm, label: formatMonthLabel(yyyymm) });
    }
    return out;
}

export interface YearMonthPlanItem {
    yyyymm: string;
    label: string;
    fromDate: string;
    toDate: string;
}

/**
 * Kế hoạch chạy trọn 1 năm (tab "Năm"):
 * - Năm quá khứ: đủ 12 tháng, mỗi tháng trọn vẹn 01 -> ngày cuối tháng.
 * - Năm hiện tại: tháng 1 -> tháng hiện tại. Nếu hôm nay là ngày 01 -> bỏ luôn tháng
 *   hiện tại (chưa có dữ liệu gì, tránh sinh 1 tháng rỗng/khoảng ngày âm).
 */
export function getYearMonthPlan(year: number, now: Date = new Date()): YearMonthPlanItem[] {
    const isCurrentYear = year === now.getFullYear();
    const lastMonthIndex0 = isCurrentYear ? now.getMonth() : 11;
    const skipCurrentMonth = isCurrentYear && now.getDate() === 1;

    const plan: YearMonthPlanItem[] = [];
    for (let m = 0; m <= lastMonthIndex0; m++) {
        if (isCurrentYear && m === lastMonthIndex0 && skipCurrentMonth) continue;
        const yyyymm = toYYYYMM(year, m);
        const { fromDate, toDate } = getMonthRange(yyyymm, now);
        plan.push({ yyyymm, label: formatMonthLabel(yyyymm), fromDate, toDate });
    }
    return plan;
}

/** Ước lượng thô — hiệu chỉnh lại sau khi có số liệu thật từ 1 lần chạy Năm. */
export function estimateRunTime(monthsCount: number, employeeCount: number): { totalRequests: number; estimatedMinutes: number } {
    const totalRequests = monthsCount * employeeCount;
    const SECONDS_PER_REQUEST = 1.2;
    const estimatedMinutes = Math.max(1, Math.round((totalRequests * SECONDS_PER_REQUEST) / 60));
    return { totalRequests, estimatedMinutes };
}

/** Ràng buộc tab "Khoảng thời gian": 2 ngày dd/mm/yyyy phải cùng tháng. */
export function isSameMonthDDMMYYYY(a: string, b: string): boolean {
    const [da, ma, ya] = a.split('/').map(Number);
    const [db_, mb, yb] = b.split('/').map(Number);
    return ya === yb && ma === mb && !Number.isNaN(da) && !Number.isNaN(db_);
}

export function parseDDMMYYYY(s: string): Date | null {
    const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const [, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (Number.isNaN(d.getTime())) return null;
    return d;
}
