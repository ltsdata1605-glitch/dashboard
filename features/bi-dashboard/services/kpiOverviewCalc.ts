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

        const storeKeys = Object.keys(defaultTargets);
        if (storeKeys.length > 0) {
            return storeKeys.reduce((acc, k) => acc + (overrides?.[k] ?? defaultTargets[k] ?? 0), 0);
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
        return Object.values(monthlyTargets).reduce<number>((sum, v) => sum + Number(v), 0);
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
    htTargetDuKienQDRaw: string | undefined
): number {
    return monthlyTarget > 0
        ? (dtDuKienQD / monthlyTarget) * 100
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
