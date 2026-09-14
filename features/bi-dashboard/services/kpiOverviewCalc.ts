import { parseNumber } from '../utils/dashboardHelpers';

/**
 * Logic tính 4 thẻ KPI đầu màn Tổng quan — TÁCH RA từ `KpiOverview.tsx` (Đợt 1.2 của dự án làm lại
 * Report BI, xem implementation_plan.md).
 *
 * Đặt ở `services/` để sống sót khi đập bỏ `components/` — xem giải thích đầy đủ ở
 * `competitionSummaryCalc.ts`.
 *
 * REFACTOR THUẦN: công thức chép nguyên văn, KHÔNG sửa con số nào. Có một chỗ trông như trùng lặp
 * (hai khối tra target DTQĐ và DT Thực gần y hệt nhau) nhưng KHÁC nhau ở nhánh dự phòng — đã giữ
 * nguyên khác biệt đó qua tham số `fallbackWhenNoStores`, KHÔNG "dọn cho gọn". Gộp nhầm 2 nhánh
 * này sẽ đổi số mà không ai nhận ra.
 */

/** Bảng target tuỳ chỉnh người dùng tự đặt, lưu theo tên siêu thị. */
export type TargetOverrides = Record<string, number> | undefined;

/** Khoá đại diện cho "xem tất cả siêu thị" trong bộ chọn. */
export const ALL_STORES_KEY = 'Tổng';

/**
 * Tra target ngày của siêu thị đang xem.
 *
 * Thứ tự ưu tiên:
 *   1. Target người dùng TỰ ĐẶT cho đúng siêu thị đó (chỉ tính khi > 0 — đặt 0 coi như chưa đặt).
 *   2. Khi xem "Tổng": cộng target của mọi siêu thị, mỗi siêu thị vẫn ưu tiên giá trị tự đặt.
 *   3. Target mặc định của siêu thị.
 *
 * @param fallbackWhenNoStores giá trị dùng khi xem "Tổng" mà KHÔNG có siêu thị nào trong danh sách.
 *        Hai nơi gọi truyền khác nhau — đó là khác biệt CÓ THẬT giữa DTQĐ và DT Thực, không phải
 *        trùng lặp cần gộp.
 */
export function resolveDailyTarget(
    activeSupermarket: string,
    overrides: TargetOverrides,
    defaultTargets: Record<string, number>,
    fallbackWhenNoStores: () => number
): number {
    if (activeSupermarket === ALL_STORES_KEY) {
        const own = overrides?.[ALL_STORES_KEY];
        if (own !== undefined && own > 0) return own;

        const storeKeys = Object.keys(defaultTargets).filter(k => k !== ALL_STORES_KEY);
        if (storeKeys.length > 0) {
            return storeKeys.reduce((acc, k) => acc + (overrides?.[k] ?? defaultTargets[k] ?? 0), 0);
        }
        if (defaultTargets[ALL_STORES_KEY] !== undefined && defaultTargets[ALL_STORES_KEY] > 0) {
            return defaultTargets[ALL_STORES_KEY];
        }
        return fallbackWhenNoStores();
    }

    const own = overrides?.[activeSupermarket];
    if (own !== undefined && own > 0) return own;
    return defaultTargets[activeSupermarket] || 0;
}

/**
 * Hiệu quả quy đổi (HQQĐ) = phần doanh thu quy đổi VƯỢT so với doanh thu thực, tính theo %.
 *
 * Lưu ý dấu trừ 1: DTQĐ luôn >= DT thực, nên `dtqd/dtlk` luôn >= 1; trừ đi 1 để ra phần TĂNG THÊM.
 * DTQĐ bằng đúng DT thực ⇒ HQQĐ = 0%, không phải 100%.
 */
export function computeHqqd(dtlk: number, dtqd: number): number {
    return dtlk > 0 ? ((dtqd / dtlk) - 1) * 100 : 0;
}

/** Target tháng khi xem Luỹ kế. Xem "Tổng" thì cộng mọi siêu thị. */
export function computeMonthlyTarget(
    isRealtime: boolean,
    activeSupermarket: string,
    monthlyTargets: Record<string, number> | undefined
): number {
    if (isRealtime || !monthlyTargets) return 0;
    if (activeSupermarket === ALL_STORES_KEY) {
        if (monthlyTargets[ALL_STORES_KEY] !== undefined && monthlyTargets[ALL_STORES_KEY] > 0) {
            return monthlyTargets[ALL_STORES_KEY];
        }
        return Object.entries(monthlyTargets)
            .filter(([k]) => k !== ALL_STORES_KEY)
            .reduce<number>((sum, [_, v]) => sum + Number(v), 0);
    }
    return monthlyTargets[activeSupermarket] || 0;
}

/** % hoàn thành, trả 0 khi chưa có target (không chia cho 0). */
export const percentOf = (value: number, target: number): number =>
    target > 0 ? (value / target) * 100 : 0;

/**
 * % hoàn thành target DTQĐ tháng. Chưa đặt target tháng thì DÙNG LẠI số hệ thống đã tính sẵn
 * (`kpiData.htTargetDuKienQD`) thay vì hiện 0 — giữ nguyên hành vi bản gốc.
 */
export function computeMonthlyQdPercent(
    dtDuKienQD: number,
    monthlyTarget: number,
    htTargetDuKienQDRaw: string | undefined,
    dtqd: number = 0
): number {
    const revenueToCompare = dtDuKienQD > 0 ? dtDuKienQD : dtqd;
    return monthlyTarget > 0
        ? (revenueToCompare / monthlyTarget) * 100
        : parseNumber(htTargetDuKienQDRaw);
}

/**
 * % tiến độ DT Thực.
 *
 * Trả `undefined` (KHÔNG phải 0) khi chưa có target — để giao diện ẩn thanh tiến độ thay vì vẽ
 * thanh 0% trông như đang bết bát.
 */
export function computeDtThucProgress(
    isRealtime: boolean,
    dtlk: number,
    dailyTarget: number,
    monthlyTarget: number
): number | undefined {
    const target = isRealtime ? dailyTarget : monthlyTarget;
    return target > 0 ? Math.ceil((dtlk / target) * 100) : undefined;
}

/** Target HQQĐ/Trả chậm đang áp dụng: ưu tiên người dùng tự đặt, sau đó target hệ thống, cuối cùng mặc định. */
export function resolveRateTarget(
    activeSupermarket: string,
    overrides: TargetOverrides,
    systemTarget: number | undefined,
    fallback: number
): number {
    return (overrides?.[activeSupermarket]) ?? systemTarget ?? fallback;
}

export const DEFAULT_HQQD_TARGET = 40;
export const DEFAULT_TRA_CHAM_TARGET = 45;

/**
 * Tỷ lệ thời gian bán hàng trong ngày (từ 8h00 đến 21h30).
 * Trả về tỷ lệ từ 0 đến 1 (ví dụ: 0.59 = 59%).
 */
export function computeDayTimeRatio(
    now: Date = new Date(),
    startTime: string = '08:00',
    endTime: string = '21:30'
): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = (startH || 8) * 60 + (startM || 0);
    const endMinutes = (endH || 21) * 60 + (endM || 30);
    const totalMinutes = Math.max(1, endMinutes - startMinutes);

    const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    if (nowMinutes <= startMinutes) return 0;
    if (nowMinutes >= endMinutes) return 1;
    return (nowMinutes - startMinutes) / totalMinutes;
}

/**
 * Tính doanh thu dự kiến trong ngày dựa vào tỷ lệ thời gian đã trôi qua.
 * Ví dụ: dtlk = 126 Tr, timeRatio = 0.59 => Dự kiến = Math.round(126 / 0.59) = 214 Tr.
 */
export function computeRealtimeProjected(revenue: number, timeRatio: number): number {
    if (revenue <= 0) return 0;
    if (timeRatio <= 0 || timeRatio >= 1) return revenue;
    return Math.round(revenue / timeRatio);
}
