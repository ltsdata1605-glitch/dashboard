/**
 * Tuần trong kỳ lịch — DÙNG CHUNG cho đầu bảng lịch (ScheduleTable), "Xuất theo tuần" (PhanCaView) và file Google Sheet
 * (googleSheetsExport), để Sheet luôn cùng tuần, cùng màu với app. 2026-10-21: Sheet từng tự chia cứng 7 ngày và tô một màu teal.
 */

/**
 * Màu đầu bảng theo tuần — chỉ trong bảng màu chuẩn (GĐ10 b3): teal → emerald tầng đậm (tuần 1 vốn đã gần như trùng tuần 5),
 * fuchsia → indigo (giữ sắc tím, KHÔNG dùng rose vì cột T7/CN đã tô hồng), yellow → amber.
 */
export const weekThemes = [
    { bg: '#ecfdf5', text: '#065f46', border: '#d1fae5' }, // Emerald (tầng đậm)
    { bg: '#f0f9ff', text: '#0369a1', border: '#e0f2fe' }, // Sky
    { bg: '#eef2ff', text: '#4338ca', border: '#e0e7ff' }, // Indigo
    { bg: '#fffbeb', text: '#b45309', border: '#fde68a' }, // Amber
    { bg: '#ecfdf5', text: '#047857', border: '#d1fae5' }, // Emerald
] as const;

/** Chia kỳ lịch thành tuần THEO LỊCH Thứ 2 → Chủ nhật (tuần đầu/cuối có thể thiếu ngày). start/end: ngày thứ mấy trong kỳ (1…duration). */
export const splitCalendarWeeks = (year: number, month: number, startDay: number, duration: number): { start: number; end: number }[] => {
    const weeks: { start: number; end: number }[] = [];
    let day = 1;
    while (day <= duration) {
        const dow = (new Date(year, month - 1, startDay + day - 1).getDay() + 6) % 7; // 0 = Thứ 2
        const len = Math.min(7 - dow, duration - day + 1);
        weeks.push({ start: day, end: day + len - 1 });
        day += len;
    }
    return weeks;
};
