/**
 * Cơ chế SO SÁNH KỲ dùng chung (KE_HOACH_TONG_THE.md mục 6 — "có sẵn ở vài chỗ, cần chuẩn hoá
 * thành cơ chế chung").
 *
 * Trước đây toàn bộ logic tính khoảng ngày nằm LẪN trong `useEffect` của
 * `components/tables/summary/hooks/useSummaryComparison.ts` — trộn với state setter của React và
 * với `processSummaryTable()` riêng của bảng Chi tiết Ngành hàng, nên không bảng nào khác dùng lại
 * được. File này tách đúng phần thuần tuý đó ra: **mode + mốc thời gian → 2 khoảng ngày**.
 *
 * Logic 11 chế độ được PORT NGUYÊN VĂN từ hook nói trên (kể cả các chi tiết dễ sai như: quý 1 lùi
 * về quý 4 năm trước, ngày 31 lùi về tháng chỉ có 30 ngày, tuần cuối tháng ngắn hơn 7 ngày) để
 * hành vi không lệch so với bảng đang chạy. Hàm thuần nên test được trực tiếp.
 */

import { getWeeksInMonth, getSafeDateInPrevMonth } from '../components/tables/summary/SummaryTableUtils';

/** 10 chế độ so sánh 2 kỳ. ('monthly_trend' của SummaryTable KHÔNG thuộc đây vì nó so N tháng,
 *  không phải 2 kỳ — giữ nguyên ở hook cũ.) */
export type PeriodMode =
    | 'day_adjacent'
    | 'day_same_period'
    | 'week_adjacent'
    | 'week_same_period'
    | 'month_adjacent'
    | 'month_same_period_year'
    | 'quarter_adjacent'
    | 'quarter_same_period_year'
    | 'ytd_same_period_year'
    | 'custom_range';

export const PERIOD_MODES: { id: PeriodMode; label: string }[] = [
    { id: 'day_adjacent', label: 'Ngày — so với hôm trước' },
    { id: 'day_same_period', label: 'Ngày — cùng ngày tháng trước' },
    { id: 'week_adjacent', label: 'Tuần — so với tuần trước' },
    { id: 'week_same_period', label: 'Tuần — cùng tuần tháng trước' },
    { id: 'month_adjacent', label: 'Tháng — so với tháng trước' },
    { id: 'month_same_period_year', label: 'Tháng — cùng kỳ năm trước' },
    { id: 'quarter_adjacent', label: 'Quý — so với quý trước' },
    { id: 'quarter_same_period_year', label: 'Quý — cùng kỳ năm trước' },
    { id: 'ytd_same_period_year', label: 'Luỹ kế từ đầu năm — cùng kỳ năm trước' },
    { id: 'custom_range', label: 'Tự chọn 2 khoảng thời gian' },
];

export interface PeriodAnchors {
    /** 'YYYY-MM-DD' — mốc cho các chế độ theo ngày và YTD. */
    selectedDate: string;
    /** 'YYYY-MM' — mốc cho các chế độ theo tuần/tháng/quý. */
    selectedMonth: string;
    /** Số thứ tự tuần trong tháng (1-based), cho 2 chế độ theo tuần. */
    selectedWeekId?: number;
    customRangeA?: { start: string; end: string };
    customRangeB?: { start: string; end: string };
}

export interface PeriodRanges {
    currentStart: Date;
    currentEnd: Date;
    prevStart: Date;
    prevEnd: Date;
    /** Nhãn ngắn để hiện trên tiêu đề bảng. */
    label: string;
    /** Câu giải thích đầy đủ cho người dùng biết đang so cái gì với cái gì. */
    description: string;
}

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const vn = (d: Date) => d.toLocaleDateString('vi-VN');

/**
 * Tính 2 khoảng ngày cho chế độ so sánh đã chọn.
 * @returns `null` khi lựa chọn không hợp lệ (vd chọn tuần 5 nhưng tháng chỉ có 4 tuần) — nơi gọi
 *          nên hiện trạng thái rỗng thay vì giữ lại kết quả cũ của lựa chọn trước.
 */
export function computePeriodRanges(mode: PeriodMode, anchors: PeriodAnchors): PeriodRanges | null {
    const { selectedDate, selectedMonth, selectedWeekId = 1, customRangeA, customRangeB } = anchors;

    if (mode === 'day_adjacent' || mode === 'day_same_period') {
        const current = new Date(selectedDate);
        if (isNaN(current.getTime())) return null;
        const currentStart = startOfDay(current);
        const currentEnd = endOfDay(current);

        // 'day_same_period' lùi về CÙNG NGÀY tháng trước, có xử lý tháng ngắn ngày:
        // 31/3 lùi về 28/2 (hoặc 29/2 năm nhuận) chứ không tràn sang 2/3.
        const prev = mode === 'day_adjacent'
            ? new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1)
            : getSafeDateInPrevMonth(current);

        return {
            currentStart, currentEnd,
            prevStart: startOfDay(prev), prevEnd: endOfDay(prev),
            label: mode === 'day_adjacent' ? 'NGÀY (LIỀN KỀ)' : 'NGÀY (CÙNG KỲ)',
            description: mode === 'day_adjacent'
                ? `So sánh ngày ${vn(currentStart)} với ngày hôm trước (${vn(prev)}).`
                : `So sánh ngày ${vn(currentStart)} với ngày cùng số của tháng trước (${vn(prev)}).`,
        };
    }

    if (mode === 'week_adjacent' || mode === 'week_same_period') {
        const [y, m] = selectedMonth.split('-').map(Number);
        if (!y || !m) return null;
        const weeks = getWeeksInMonth(y, m - 1);
        const wCurr = weeks.find(w => w.id === selectedWeekId);
        if (!wCurr) return null;

        if (mode === 'week_adjacent') {
            const wPrev = weeks.find(w => w.id === selectedWeekId - 1);
            if (!wPrev) {
                // Tuần đầu tháng không có tuần liền trước TRONG THÁNG — giữ nguyên hành vi cũ:
                // hiện dữ liệu tuần hiện tại, kỳ trước trùng kỳ này (chênh lệch = 0).
                return {
                    currentStart: wCurr.start, currentEnd: wCurr.end,
                    prevStart: wCurr.start, prevEnd: wCurr.end,
                    label: `TUẦN ${selectedWeekId}`,
                    description: `Dữ liệu tuần ${wCurr.id}. (Không có tuần trước liền kề trong tháng).`,
                };
            }
            return {
                currentStart: wCurr.start, currentEnd: wCurr.end,
                prevStart: wPrev.start, prevEnd: wPrev.end,
                label: `TUẦN ${selectedWeekId} vs TUẦN ${selectedWeekId - 1}`,
                description: `So sánh ${wCurr.label} với ${wPrev.label}.`,
            };
        }

        const prevMonthDate = new Date(y, m - 2, 1);
        const prevWeeks = getWeeksInMonth(prevMonthDate.getFullYear(), prevMonthDate.getMonth());
        // Tháng trước có thể ít tuần hơn — kẹp lại thay vì trả về rỗng.
        const prevWeek = prevWeeks.find(w => w.id === Math.min(selectedWeekId, prevWeeks.length));
        if (!prevWeek) return null;

        return {
            currentStart: wCurr.start, currentEnd: wCurr.end,
            prevStart: prevWeek.start, prevEnd: prevWeek.end,
            label: 'TUẦN (CÙNG KỲ THÁNG TRƯỚC)',
            description: `So sánh ${wCurr.shortLabel} tháng này với ${prevWeek.shortLabel} tháng trước.`,
        };
    }

    if (mode === 'month_adjacent' || mode === 'month_same_period_year') {
        const [y, m] = selectedMonth.split('-').map(Number);
        if (!y || !m) return null;
        const currentStart = new Date(y, m - 1, 1);
        const currentEnd = new Date(y, m, 0, 23, 59, 59, 999);

        if (mode === 'month_adjacent') {
            return {
                currentStart, currentEnd,
                prevStart: new Date(y, m - 2, 1),
                prevEnd: new Date(y, m - 1, 0, 23, 59, 59, 999),
                label: 'THÁNG (LIỀN KỀ)',
                description: `So sánh tháng ${m}/${y} với tháng trước đó.`,
            };
        }
        return {
            currentStart, currentEnd,
            prevStart: new Date(y - 1, m - 1, 1),
            prevEnd: new Date(y - 1, m, 0, 23, 59, 59, 999),
            label: 'THÁNG (CÙNG KỲ NĂM TRƯỚC)',
            description: `So sánh tháng ${m}/${y} với cùng kỳ năm trước.`,
        };
    }

    if (mode === 'quarter_adjacent' || mode === 'quarter_same_period_year') {
        const [y, m] = selectedMonth.split('-').map(Number);
        if (!y || !m) return null;
        const quarter = Math.floor((m - 1) / 3);
        const currentStart = new Date(y, quarter * 3, 1);
        const currentEnd = new Date(y, quarter * 3 + 3, 0, 23, 59, 59, 999);

        if (mode === 'quarter_adjacent') {
            // Quý 1 lùi về quý 4 NĂM TRƯỚC, không phải "quý 0".
            const prevStart = quarter === 0 ? new Date(y - 1, 9, 1) : new Date(y, (quarter - 1) * 3, 1);
            const prevEnd = quarter === 0
                ? new Date(y - 1, 12, 0, 23, 59, 59, 999)
                : new Date(y, (quarter - 1) * 3 + 3, 0, 23, 59, 59, 999);
            return {
                currentStart, currentEnd, prevStart, prevEnd,
                label: 'QUÝ (LIỀN KỀ)',
                description: `So sánh Quý ${quarter + 1}/${y} với quý liền kề trước đó.`,
            };
        }
        return {
            currentStart, currentEnd,
            prevStart: new Date(y - 1, quarter * 3, 1),
            prevEnd: new Date(y - 1, quarter * 3 + 3, 0, 23, 59, 59, 999),
            label: 'QUÝ (CÙNG KỲ NĂM TRƯỚC)',
            description: `So sánh Quý ${quarter + 1}/${y} với cùng kỳ năm trước.`,
        };
    }

    if (mode === 'ytd_same_period_year') {
        const current = new Date(selectedDate);
        if (isNaN(current.getTime())) return null;
        const prev = new Date(current);
        prev.setFullYear(current.getFullYear() - 1);
        return {
            currentStart: new Date(current.getFullYear(), 0, 1),
            currentEnd: endOfDay(current),
            prevStart: new Date(current.getFullYear() - 1, 0, 1),
            prevEnd: endOfDay(prev),
            label: 'LUỸ KẾ YTD (ĐẾN HIỆN TẠI)',
            description: `So sánh luỹ kế từ đầu năm đến ${vn(current)} với cùng kỳ năm ngoái.`,
        };
    }

    if (mode === 'custom_range') {
        if (!customRangeA || !customRangeB) return null;
        const cs = new Date(customRangeA.start), ce = new Date(customRangeA.end);
        const ps = new Date(customRangeB.start), pe = new Date(customRangeB.end);
        if ([cs, ce, ps, pe].some(d => isNaN(d.getTime()))) return null;
        return {
            currentStart: startOfDay(cs), currentEnd: endOfDay(ce),
            prevStart: startOfDay(ps), prevEnd: endOfDay(pe),
            label: 'KHOẢNG THỜI GIAN',
            description: 'So sánh tuỳ chỉnh giữa 2 khoảng thời gian.',
        };
    }

    return null;
}

/** Các chế độ mà việc "chỉ so tới ngày có dữ liệu" mới có ý nghĩa (kỳ hiện tại còn dở dang). */
export const MODES_SUPPORT_UP_TO_CURRENT_DAY: PeriodMode[] = [
    'week_same_period', 'month_adjacent', 'month_same_period_year',
    'quarter_same_period_year', 'ytd_same_period_year',
];

/**
 * Cắt kỳ hiện tại tới ngày CÓ DỮ LIỆU cuối cùng, và cắt kỳ trước theo đúng số ngày tương ứng.
 *
 * Vì sao cần: so tháng này (mới chạy 8 ngày) với cả tháng trước (30 ngày) là so sai — tháng này
 * chắc chắn "thua". Bật tuỳ chọn này thì cả 2 kỳ cùng độ dài, chênh lệch mới có ý nghĩa.
 *
 * Port nguyên văn từ `useSummaryComparison`. Trả về chính đối tượng cũ nếu không áp dụng được.
 */
export function clampToDataMaxDate(ranges: PeriodRanges, dataMaxDate: Date | null): PeriodRanges {
    if (!dataMaxDate) return ranges;
    if (dataMaxDate < ranges.currentStart || dataMaxDate > ranges.currentEnd) return ranges;

    const currentEnd = endOfDay(dataMaxDate);
    const offset = currentEnd.getTime() - ranges.currentStart.getTime();
    let prevEnd = new Date(ranges.prevStart.getTime() + offset);
    // Không cho kỳ trước dài hơn ranh giới gốc của nó (vd tràn sang tháng kế tiếp).
    if (prevEnd > ranges.prevEnd) prevEnd = ranges.prevEnd;

    return { ...ranges, currentEnd, prevEnd };
}

/** Ngày có dữ liệu lớn nhất — dùng làm đầu vào cho `clampToDataMaxDate`. */
export function findDataMaxDate(rows: { parsedDate?: Date }[]): Date | null {
    let maxTime = -Infinity;
    for (const r of rows) {
        const t = r.parsedDate?.getTime();
        if (t !== undefined && t > maxTime) maxTime = t;
    }
    return maxTime === -Infinity ? null : new Date(maxTime);
}

/** Lọc các dòng nằm trong 1 khoảng ngày (theo `parsedDate` đã chuẩn hoá lúc parse Excel). */
export function filterRowsInRange<T extends { parsedDate?: Date }>(rows: T[], start: Date, end: Date): T[] {
    const s = start.getTime(), e = end.getTime();
    return rows.filter(r => {
        const t = r.parsedDate?.getTime();
        return t !== undefined && t >= s && t <= e;
    });
}
