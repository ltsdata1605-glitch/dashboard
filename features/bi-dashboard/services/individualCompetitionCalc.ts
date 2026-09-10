import { isSameEmployee } from '../utils/nhanVienHelpers';
import { calculateRunRate, getMonthProgress } from './metricService';

/**
 * 🔴 SỬA LỖI 2026-09-10: trước đây file này có `getIndividualMonthProgress` riêng, THIẾU chốt
 * `Math.max(1, ...)` nên đúng ngày mùng 1 mọi hạng mục rơi vào "NoSale". Đã xoá hẳn và dùng chung
 * `getMonthProgress` của `metricService`. Tên cũ re-export để nơi gọi không phải sửa.
 */
export { getMonthProgress };
export const getIndividualMonthProgress = getMonthProgress;

/**
 * Logic báo cáo Thi đua CÁ NHÂN — tách từ `IndividualCompetitionView.tsx` (Đợt 1.3 của dự án làm
 * lại Report BI). Đặt ở `services/` để sống sót khi đập bỏ `components/`.
 *
 * REFACTOR THUẦN: chép nguyên văn, không đổi con số nào.
 */

/**
 * Dòng dữ liệu nhân viên tối thiểu mà các hàm ở đây cần.
 *
 * `originalName` để OPTIONAL vì `RevenueRow`/`InstallmentRow` thật sự khai báo như vậy — có dòng
 * không kèm tên gốc. `isSameEmployee` đã trả `false` khi gặp undefined, nên dòng đó đơn giản là
 * không khớp ai. Ép kiểu bắt buộc ở đây sẽ nói dối về dữ liệu thật.
 */
export interface EmployeeLikeRow {
    type: string;
    originalName?: string;
}

/** Tìm dòng của đúng nhân viên đang xem. Khớp tên LỎNG qua `isSameEmployee` vì tên giữa các nguồn
 *  dữ liệu thường lệch dấu/khoảng trắng/mã số. */
export function findEmployeeRow<T extends EmployeeLikeRow>(
    rows: T[] | null | undefined,
    originalName: string
): T | null | undefined {
    if (!rows) return null;
    return rows.find(r => r.type === 'employee' && isSameEmployee(r.originalName, originalName));
}

export interface RankResult {
    rank: number;
    total: number;
}

/**
 * Xếp hạng nhân viên theo một chỉ số, giảm dần.
 *
 * Không tìm thấy nhân viên trong danh sách thì trả hạng = TỔNG SỐ NGƯỜI (tức đứng bét), chứ không
 * phải 0 hay -1. Giữ đúng hành vi bản gốc: chưa có dữ liệu thì hiển thị như đang đứng cuối.
 */
export function computeRank(
    rows: EmployeeLikeRow[] | null | undefined,
    key: string,
    originalName: string
): RankResult {
    const empRows = (rows || []).filter(r => r.type === 'employee');
    // Đọc chỉ số theo khoá ĐỘNG (dtlk / totalPercent / pctBillBk) nên phải ép kiểu — giữ đúng
    // cách bản gốc làm. Thiếu khoá hoặc không phải số thì coi như 0.
    const valueOf = (r: EmployeeLikeRow) => ((r as unknown as Record<string, unknown>)[key] as number) || 0;
    const sorted = [...empRows].sort((a, b) => valueOf(b) - valueOf(a));
    const idx = sorted.findIndex(r => isSameEmployee(r.originalName, originalName));
    return { rank: idx >= 0 ? idx + 1 : empRows.length, total: empRows.length };
}

/** Một hạng mục thi đua của nhân viên, sau khi đã tính target/thực hiện. */
export interface PerformanceItem {
    name: string;
    completion: number;
    remaining: number;
    target: number;
    actual: number;
}

export interface CompetitionStats {
    total: number;
    dkhtDat: number;
    dkhtGanDat: number;
    dkhtChuaDat: number;
    noSale: number;
    avgDkht: number;
}


/**
 * Thống kê tổng hợp các hạng mục thi đua của một nhân viên, phân nhóm theo %DKHT (dự kiến hoàn
 * thành theo nhịp hiện tại).
 *
 * Phân nhóm: đạt (>=100), gần đạt (80–99), chưa đạt (>0 và <80), NoSale (đúng bằng 0).
 * Hạng mục không có target tính là 0 ⇒ rơi vào NoSale.
 */
export function computeCompetitionStats(
    items: PerformanceItem[],
    daysPassed: number,
    daysInMonth: number
): CompetitionStats {
    const total = items.length;
    const dkhtValues = items.map(i => {
        if (!i.target || i.target <= 0) return 0;
        return (calculateRunRate(i.actual, daysPassed, daysInMonth) / i.target) * 100;
    });

    return {
        total,
        dkhtDat: dkhtValues.filter(d => d >= 100).length,
        dkhtGanDat: dkhtValues.filter(d => d >= 80 && d < 100).length,
        dkhtChuaDat: dkhtValues.filter(d => d > 0 && d < 80).length,
        noSale: dkhtValues.filter(d => d === 0).length,
        avgDkht: total > 0 ? dkhtValues.reduce((s, d) => s + d, 0) / total : 0,
    };
}

/**
 * Số liệu một hạng mục thi đua của nhân viên.
 *
 * `remaining = actual - target` (ÂM khi chưa đạt) — cùng quy ước với cột "Còn Lại" ở bảng Thi đua,
 * xem `CompetitionView.tsx`. Đừng đảo dấu.
 */
export function computePerformanceRow(target: number, actual: number): {
    completion: number;
    remaining: number;
} {
    return {
        completion: target > 0 ? (actual / target) * 100 : 0,
        remaining: actual - target,
    };
}
