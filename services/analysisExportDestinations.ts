/**
 * ĐÍCH XUẤT ẢNH THEO TỪNG NÚT ở Phân tích (2026-10-01): mỗi nút xuất ảnh chọn "Tải về máy" (mặc định) hoặc "Gửi vào
 * nhóm LINE X". Khi Auto Sync YCX Realtime nạp xong dữ liệu, mọi nút đang đặt "Gửi nhóm LINE" được tự xuất & gửi.
 *
 * Khoá của một nút = tên báo cáo trong tên file ảnh, bỏ tiền tố kho: "[910] - Tổng Quan Doanh Thu.png" →
 * "Tổng Quan Doanh Thu". Nhờ vậy handleExport (nơi mọi nút Phân tích đi qua) tự biết đích mà không phải sửa từng chỗ gọi.
 *
 * Lưu bằng saveSetting (IndexedDB riêng theo tài khoản, đồng bộ cloud như các cài đặt khác).
 * Trạng thái nằm trên globalThis (bundler từng tách module thành 2 bản — xem contexts/AuthContext.tsx).
 */
import { getSetting, saveSetting } from './dbService';

export type ExportDestination = { kind: 'download' } | { kind: 'line'; groupId: string; groupName: string };
type DestMap = Record<string, { groupId: string; groupName: string }>;

const SETTING_KEY = 'analysis_export_destinations';
const EVT = 'ycx-export-destinations-changed';

interface Store { map: DestMap; loaded: Promise<void> | null; runners: Map<string, () => Promise<unknown>>; runTarget?: { groupId: string; groupName: string } | null }
const G = globalThis as unknown as { __ycxExportDest?: Store };
const store: Store = G.__ycxExportDest || (G.__ycxExportDest = { map: {}, loaded: null, runners: new Map() });

export function reportKeyFromFilename(filename: string): string {
    return filename
        .replace(/\.(png|jpe?g)$/i, '')
        .replace(/^\[[^\]]*\]\s*-\s*/, '')
        .replace(/\s*\(\d+\)\s*$/, '')
        .trim();
}

export function loadExportDestinations(): Promise<void> {
    if (!store.loaded) {
        store.loaded = getSetting<DestMap>(SETTING_KEY)
            .then((m) => { store.map = m && typeof m === 'object' ? m : {}; window.dispatchEvent(new Event(EVT)); })
            .catch(() => { /* chưa có cài đặt */ });
    }
    return store.loaded;
}

export function getExportDestination(reportKey: string): ExportDestination {
    // Đang chạy lượt hẹn giờ có danh sách khu vực riêng → gửi đúng nhóm của khu vực đó, bỏ qua đích đặt ở nút
    if (store.runTarget?.groupId) return { kind: 'line', groupId: store.runTarget.groupId, groupName: store.runTarget.groupName };
    const d = store.map[reportKey];
    return d?.groupId ? { kind: 'line', groupId: d.groupId, groupName: d.groupName } : { kind: 'download' };
}

export async function setExportDestination(reportKey: string, dest: ExportDestination): Promise<void> {
    await loadExportDestinations();
    const next = { ...store.map };
    if (dest.kind === 'line') next[reportKey] = { groupId: dest.groupId, groupName: dest.groupName };
    else delete next[reportKey];
    store.map = next;
    window.dispatchEvent(new Event(EVT));
    await saveSetting(SETTING_KEY, next);
}

export function onExportDestinationsChanged(cb: () => void): () => void {
    window.addEventListener(EVT, cb);
    return () => window.removeEventListener(EVT, cb);
}

/** Nút xuất ảnh đăng ký cách tự xuất chính nó — để chạy tự động sau khi Auto Sync nạp xong. */
export function registerAutoExport(reportKey: string, run: () => Promise<unknown>): () => void {
    store.runners.set(reportKey, run);
    return () => { if (store.runners.get(reportKey) === run) store.runners.delete(reportKey); };
}

/** Tự xuất & gửi mọi nút đang đặt "Gửi nhóm LINE" (tuần tự). Trả về danh sách báo cáo đã chạy. */
export async function runLineAutoExports(): Promise<{ key: string; ok: boolean; error?: string }[]> {
    await loadExportDestinations();
    const out: { key: string; ok: boolean; error?: string }[] = [];
    for (const [key, run] of store.runners) {
        if (getExportDestination(key).kind !== 'line') continue;
        try { await run(); out.push({ key, ok: true }); } catch (e) { out.push({ key, ok: false, error: e instanceof Error ? e.message : String(e) }); }
    }
    return out;
}

/**
 * Lượt HẸN GIỜ có danh sách khu vực riêng (2026-10-02): xuất đúng các khu vực đã chọn, mỗi khu vực gửi vào nhóm LINE
 * đã chọn cho nó — không phụ thuộc đích đặt ở từng nút. Khu vực chưa hiển thị (đang ẩn / chưa mở) báo lỗi rõ tên.
 */
export async function runLineAutoExportsTo(items: { area: string; groupId: string; groupName: string }[]): Promise<{ key: string; ok: boolean; error?: string }[]> {
    await loadExportDestinations();
    const out: { key: string; ok: boolean; error?: string }[] = [];
    for (const it of items) {
        const run = store.runners.get(it.area);
        if (!run) { out.push({ key: it.area, ok: false, error: 'khu vực chưa hiển thị trên Phân tích' }); continue; }
        store.runTarget = { groupId: it.groupId, groupName: it.groupName };
        try { await run(); out.push({ key: it.area, ok: true }); } catch (e) { out.push({ key: it.area, ok: false, error: e instanceof Error ? e.message : String(e) }); } finally { store.runTarget = null; }
    }
    return out;
}
