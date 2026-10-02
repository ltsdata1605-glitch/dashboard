/**
 * Quyết định một lịch "Gửi Notify" (line_bots/{uid}/schedules/{id}) đã ĐẾN GIỜ gửi chưa — hàm thuần, test được.
 * Dùng bởi `lineBotUserSchedules` (lineBotScheduler.ts), chạy 5 phút/lần theo giờ Việt Nam.
 *
 * Mỗi lượt gửi gắn với một "khe" `${YYYY-MM-DD} ${HH:mm}`; khe đã gửi lưu ở `lastAutoRunSlot` → không gửi trùng
 * dù hàm chạy lại, chạy trễ hay Cloud Scheduler gọi 2 lần.
 */

export type RepeatType = 'DAILY' | 'CUSTOM' | 'WEEKDAYS' | 'ONCE';

export interface ScheduleLike {
    active?: boolean;
    time?: string; // "HH:mm"
    repeatType?: RepeatType;
    daysOfWeek?: number[]; // 0 = Chủ Nhật … 6 = Thứ 7
    specificDate?: string; // "YYYY-MM-DD" khi ONCE
    lastAutoRunSlot?: string;
}

export interface VnNow {
    date: string; // "YYYY-MM-DD" theo giờ Việt Nam
    dow: number; // 0 = Chủ Nhật
    minutes: number; // phút trong ngày
}

/** Lịch đến giờ được gửi muộn tối đa bấy nhiêu phút (hàm chạy 5 phút/lần; dư ra cho lượt chạy trễ/khởi động chậm). */
export const DUE_WINDOW_MINUTES = 20;

export function vnNow(d: Date = new Date()): VnNow {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
        }).formatToParts(d).map((p) => [p.type, p.value]),
    );
    const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
        date: `${parts.year}-${parts.month}-${parts.day}`,
        dow: dowMap[parts.weekday] ?? 0,
        minutes: Number(parts.hour) * 60 + Number(parts.minute),
    };
}

export function parseHHmm(time: string | undefined): number | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(time || '').trim());
    if (!m) return null;
    const h = Number(m[1]);
    const mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
}

/** Hôm nay (giờ VN) có thuộc lịch lặp không. */
export function runsOnDay(s: ScheduleLike, now: VnNow): boolean {
    switch (s.repeatType) {
        case 'ONCE': return !!s.specificDate && s.specificDate === now.date;
        case 'DAILY': return true;
        case 'WEEKDAYS': return now.dow >= 1 && now.dow <= 5;
        default: return Array.isArray(s.daysOfWeek) && s.daysOfWeek.includes(now.dow); // CUSTOM / lịch cũ không có repeatType
    }
}

export function slotKey(s: ScheduleLike, now: VnNow): string {
    return `${now.date} ${String(s.time || '').trim()}`;
}

/** Trả về khe cần gửi, hoặc null nếu chưa/không đến giờ hoặc khe này đã gửi. */
export function dueSlot(s: ScheduleLike, now: VnNow, windowMinutes = DUE_WINDOW_MINUTES): string | null {
    if (s.active === false) return null;
    const at = parseHHmm(s.time);
    if (at === null) return null;
    if (!runsOnDay(s, now)) return null;
    const late = now.minutes - at;
    if (late < 0 || late >= windowMinutes) return null;
    const slot = slotKey(s, now);
    return s.lastAutoRunSlot === slot ? null : slot;
}

/** Thay biến trong mẫu tin: {date} (dd/mm/yyyy giờ VN), {bot_name}, {ton_kho}. */
export function renderTemplate(template: string, vars: { date: string; botName?: string; tonKho?: number | null }): string {
    const [y, m, d] = vars.date.split('-');
    return String(template || '')
        .replace(/\{date\}/g, `${d}/${m}/${y}`)
        .replace(/\{bot_name\}/g, vars.botName || '')
        .replace(/\{ton_kho\}/g, vars.tonKho === null || vars.tonKho === undefined ? '' : String(vars.tonKho));
}
