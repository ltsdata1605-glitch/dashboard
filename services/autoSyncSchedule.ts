/**
 * HẸN GIỜ CHO 5 NÚT AUTO SYNC PRO (2026-10-01): BI Realtime, BI Luỹ kế, Đổ thưởng, YCX Realtime, YCX Luỹ kế.
 * Mỗi nút có danh sách khung giờ riêng ("HH:mm"). Chủ dự án chốt: chạy TRONG TRÌNH DUYỆT — chỉ chạy khi máy bật,
 * Chrome đang mở dashboard.pro.vn (đã đăng nhập MWG, có Tampermonkey). Lỡ giờ (máy tắt) thì bỏ qua, không chạy bù.
 *
 * Lưu bằng saveSetting (IndexedDB riêng theo tài khoản). Dấu "đã chạy khung giờ X hôm nay" để ở localStorage (chung
 * mọi tab của trình duyệt) → mở 2 tab Dashboard cũng chỉ 1 tab chạy.
 */
import { getSetting, saveSetting } from './dbService';

export type ScheduleKey = 'bi-realtime' | 'bi-luyke' | 'bonus' | 'ycx-realtime' | 'ycx-luyke';
export interface ScheduleEntry { enabled: boolean; times: string[] }
export type Schedules = Partial<Record<ScheduleKey, ScheduleEntry>>;

export const SCHEDULE_LABELS: Record<ScheduleKey, string> = {
    'bi-realtime': 'Tự động Realtime (Report BI)',
    'bi-luyke': 'Tự động Luỹ kế (Report BI)',
    bonus: 'Tự động Đổ Thưởng',
    'ycx-realtime': 'YCX Realtime (Phân tích)',
    'ycx-luyke': 'YCX Luỹ kế (Phân tích)',
};

const SETTING_KEY = 'auto_sync_schedules';
const EVT = 'ycx-auto-sync-schedules-changed';
/** Khung giờ còn "hợp lệ" trong ngần này phút sau giờ hẹn (máy ngủ / tab bị trình duyệt làm chậm timer) */
export const SCHEDULE_WINDOW_MIN = 10;

interface Store { value: Schedules; loaded: Promise<void> | null }
const G = globalThis as unknown as { __ycxSchedules?: Store };
const store: Store = G.__ycxSchedules || (G.__ycxSchedules = { value: {}, loaded: null });

export function normalizeTime(t: string): string | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
    if (!m) return null;
    const h = Number(m[1]); const mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

export function loadSchedules(): Promise<void> {
    if (!store.loaded) {
        store.loaded = getSetting<Schedules>(SETTING_KEY)
            .then((v) => { store.value = v && typeof v === 'object' ? v : {}; window.dispatchEvent(new Event(EVT)); })
            .catch(() => { /* chưa có */ });
    }
    return store.loaded;
}
export function getSchedules(): Schedules { return store.value; }
export function getSchedule(key: ScheduleKey): ScheduleEntry { return store.value[key] || { enabled: false, times: [] }; }

export async function setSchedule(key: ScheduleKey, entry: ScheduleEntry): Promise<void> {
    await loadSchedules();
    const times = Array.from(new Set(entry.times.map(normalizeTime).filter((x): x is string => !!x))).sort();
    store.value = { ...store.value, [key]: { enabled: entry.enabled && times.length > 0, times } };
    window.dispatchEvent(new Event(EVT));
    await saveSetting(SETTING_KEY, store.value);
}
export function onSchedulesChanged(cb: () => void): () => void {
    window.addEventListener(EVT, cb);
    return () => window.removeEventListener(EVT, cb);
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const markerKey = (key: ScheduleKey, d: Date, t: string) => `ycx-sched-ran:${key}:${ymd(d)}:${t}`;

/** Khung giờ đến hạn mà chưa chạy (trong SCHEDULE_WINDOW_MIN phút sau giờ hẹn). Hàm thuần — test được. */
export function dueSchedules(s: Schedules, now: Date, hasRun: (marker: string) => boolean): { key: ScheduleKey; time: string; marker: string }[] {
    const out: { key: ScheduleKey; time: string; marker: string }[] = [];
    const phutNay = now.getHours() * 60 + now.getMinutes();
    (Object.keys(s) as ScheduleKey[]).forEach((key) => {
        const e = s[key];
        if (!e?.enabled) return;
        e.times.forEach((t) => {
            const [h, m] = t.split(':').map(Number);
            const lech = phutNay - (h * 60 + m);
            if (lech < 0 || lech >= SCHEDULE_WINDOW_MIN) return;
            const marker = markerKey(key, now, t);
            if (!hasRun(marker)) out.push({ key, time: t, marker });
        });
    });
    return out;
}

/** Giữ chỗ chạy khung giờ (localStorage, chung mọi tab). false = tab khác đã chạy. */
export function claimScheduleRun(marker: string): boolean {
    try {
        if (localStorage.getItem(marker)) return false;
        localStorage.setItem(marker, String(Date.now()));
        return true;
    } catch { return true; }
}
export function scheduleHasRun(marker: string): boolean {
    try { return Boolean(localStorage.getItem(marker)); } catch { return false; }
}

/** Khung giờ kế tiếp hôm nay (hiển thị trên nút) — null nếu hết khung trong ngày / chưa bật. */
export function nextScheduleTime(e: ScheduleEntry | undefined, now: Date = new Date()): string | null {
    if (!e?.enabled || e.times.length === 0) return null;
    const phut = now.getHours() * 60 + now.getMinutes();
    const sau = e.times.find((t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m >= phut; });
    return sau || e.times[0];
}
