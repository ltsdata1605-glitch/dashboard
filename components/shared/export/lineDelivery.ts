/**
 * GỬI ẢNH VÀO NHÓM LINE — dùng chung toàn dự án (2026-10-02, kế hoạch "Gửi nhóm LINE từ mọi nút xuất ảnh").
 *
 * Vì sao nằm ở đây: cách gửi thật (bot của tài khoản, nén ảnh, tải lên `bot_media`, đẩy tin) nằm ở
 * `services/lineReportDelivery.ts` của GỐC — Report BI / Khai thác / Phân Ca không được import `services/` gốc
 * (CLAUDE.md mục 1). Nên gốc ĐĂNG KÝ một `LineTransport` lúc khởi động (`registerLineTransport`), còn mọi khu vực
 * chỉ nói chuyện với module này — một cổng duy nhất, không ai phải chép logic gửi.
 *
 * Cách nối vào các nút xuất ảnh có sẵn mà KHÔNG sửa vòng lặp xuất của từng nơi:
 *   runWithLineDelivery({ title, groups }, () => handleExportCuaManHinh())
 * mở một "phạm vi gửi LINE": trong lúc hàm xuất chạy, mọi ảnh đi tới khâu giao ảnh chung (`deliverImage`,
 * `offerBatchShare` — nơi DUY NHẤT ảnh được tải về / chia sẻ) bị chặn lại và xếp vào hàng đợi gửi LINE thay vì
 * tải về (hoặc cả hai nếu người dùng chọn "đồng thời tải về").
 *
 * Hàng đợi: tuần tự, MỖI LẦN GỬI ĐÚNG 1 ẢNH (chủ dự án chốt 2026-10-02 — không gộp ảnh), nghỉ ngắn giữa các ảnh để
 * không dồn mạng/CPU trên iPhone. Ảnh gửi xong được bỏ khỏi bộ nhớ ngay; chỉ ảnh lỗi được giữ để "Thử lại", và cũng
 * được bỏ khi đóng bảng.
 *
 * Trạng thái để trên globalThis (bundler từng tách một module thành 2 bản — xem contexts/AuthContext.tsx).
 */

export interface LineGroup { groupId: string; groupName: string }

export interface LineSendOutcome {
    /** Số nhóm nhận được ảnh */
    ok: number;
    /** Nhóm gửi lỗi + lý do (câu chữ đọc được, không chứa token) */
    failed: { group: LineGroup; error: string }[];
}

/** Cách gửi thật — gốc cung cấp (services/lineTransport.ts). */
export interface LineTransport {
    /** Bot + các nhóm bot đã tham gia. Ném lỗi có câu chữ đọc được nếu tài khoản chưa có bot. */
    loadGroups(): Promise<{ botName: string; groups: LineGroup[] }>;
    /** Gửi 1 ảnh (kèm 1 dòng chú thích) vào các nhóm. */
    sendImage(p: { blob: Blob; fileName: string; caption: string; groups: LineGroup[] }): Promise<LineSendOutcome>;
    /** Nhóm đã chọn lần trước của một khu vực (nhớ theo tài khoản). */
    getRememberedGroups(areaKey: string): Promise<LineGroup[]>;
    rememberGroups(areaKey: string, groups: LineGroup[]): Promise<void>;
}

export type LineItemStatus = 'queued' | 'sending' | 'ok' | 'failed' | 'skipped';
export interface LineSendItem { id: number; label: string; status: LineItemStatus; error?: string }

export interface LineSendState {
    id: number;
    /** Tên báo cáo / khu vực, vd "Thi Đua - ĐMX Hùng Vương" */
    title: string;
    /** "nhóm Cửa hàng 910" / "3 nhóm LINE" */
    groupsLabel: string;
    items: LineSendItem[];
    /** exporting = hàm xuất ảnh còn chạy; sending = đã xuất xong, còn ảnh trong hàng đợi */
    phase: 'exporting' | 'sending' | 'finished';
    cancelRequested: boolean;
    /** Lỗi ở khâu XUẤT (hàm xuất ném lỗi) — khác lỗi gửi từng ảnh */
    exportError?: string;
    /** Câu tổng kết khi xong */
    summary?: string;
}

interface Pending { blob: Blob; fileName: string; groups: LineGroup[] }
interface Scope { stateId: number; alsoDownload: boolean; groups: LineGroup[]; exporting: boolean }
type Listener = (s: LineSendState | null) => void;
interface Store {
    transport: LineTransport | null;
    state: LineSendState | null;
    scope: Scope | null;
    pending: Map<number, Pending>;
    seen: WeakSet<Blob>;
    listeners: Set<Listener>;
    seq: number;
    pumping: Promise<void> | null;
    hideTimer: ReturnType<typeof setTimeout> | null;
    mount: (() => void) | null;
    /** Chỉ cho test: thời gian nghỉ giữa 2 ảnh */
    gapMs: number;
}

const G = globalThis as unknown as { __ycxLineSend?: Store };
const store: Store = G.__ycxLineSend || (G.__ycxLineSend = {
    transport: null, state: null, scope: null, pending: new Map(), seen: new WeakSet(), listeners: new Set(),
    seq: 0, pumping: null, hideTimer: null, mount: null, gapMs: 300,
});

// ── Cổng gửi ───────────────────────────────────────────────────────────────────────────────────
export function registerLineTransport(t: LineTransport | null) { store.transport = t; }
export function getLineTransport(): LineTransport | null { return store.transport; }

// ── Kho trạng thái (bảng tiến trình đọc) ─────────────────────────────────────────────────────────
function emit() { store.listeners.forEach((l) => l(store.state)); }
export function getLineSendState(): LineSendState | null { return store.state; }
export function subscribeLineSend(l: Listener): () => void {
    store.listeners.add(l);
    return () => { store.listeners.delete(l); };
}
/** Bảng tiến trình tự gắn vào trang (ExportProgressHost đăng ký) */
export function registerLineSendHostMount(fn: () => void) { store.mount = fn; }

const patch = (id: number, p: Partial<LineSendState>) => {
    if (!store.state || store.state.id !== id) return;
    store.state = { ...store.state, ...p };
    emit();
};
const patchItem = (id: number, itemId: number, p: Partial<LineSendItem>) => {
    const s = store.state;
    if (!s || s.id !== id) return;
    store.state = { ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, ...p } : it)) };
    emit();
};

/** Đang có lượt gửi LINE chưa xong — nút gửi phải khoá để tránh gửi trùng. */
export function isLineSendBusy(): boolean {
    return Boolean(store.state && store.state.phase !== 'finished');
}
/** Đang trong phạm vi gửi LINE (hàm xuất của nút "Gửi nhóm LINE" đang chạy). */
export function isLineDeliveryActive(): boolean {
    return Boolean(store.scope?.exporting);
}

// ── Chú thích ảnh ─────────────────────────────────────────────────────────────────────────────
const p2 = (n: number) => String(n).padStart(2, '0');

/** Tên báo cáo đọc được từ tên file: bỏ đuôi, tiền tố "[910] - " / "BI_PRO_", hậu tố ngày, gạch dưới. */
export function reportNameFromFilename(fileName: string): string {
    return fileName
        .replace(/\.(png|jpe?g)$/i, '')
        .replace(/^BI_PRO_/i, '')
        .replace(/[_\s-]*\d{4}-\d{2}-\d{2}$/, '')
        .replace(/^\[[^\]]*\]\s*-\s*/, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'Báo cáo';
}

/** "📊 Thi Đua - Hùng Vương — cập nhật 13:05 02/10" — cùng dạng chú thích Phân tích đang gửi. */
export function buildLineCaption(fileName: string, now = new Date()): string {
    return `📊 ${reportNameFromFilename(fileName)} — cập nhật ${p2(now.getHours())}:${p2(now.getMinutes())} ${p2(now.getDate())}/${p2(now.getMonth() + 1)}`;
}

export function groupsLabelOf(groups: LineGroup[]): string {
    if (groups.length === 1) return `nhóm ${groups[0].groupName}`;
    return `${groups.length} nhóm LINE`;
}

// ── Hàng đợi ──────────────────────────────────────────────────────────────────────────────────
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e)) || 'Lỗi không rõ';

function enqueue(stateId: number, blob: Blob, fileName: string, groups: LineGroup[]) {
    const s = store.state;
    if (!s || s.id !== stateId) return;
    if (store.seen.has(blob)) return;
    store.seen.add(blob);
    const itemId = ++store.seq;
    store.pending.set(itemId, { blob, fileName, groups });
    const label = reportNameFromFilename(fileName);
    if (s.cancelRequested) {
        store.pending.delete(itemId);
        store.state = { ...s, items: [...s.items, { id: itemId, label, status: 'skipped', error: 'Đã dừng gửi' }] };
        emit();
        return;
    }
    store.state = { ...s, items: [...s.items, { id: itemId, label, status: 'queued' }] };
    emit();
    void pump(stateId);
}

function pump(stateId: number): Promise<void> {
    if (store.pumping) return store.pumping;
    store.pumping = (async () => {
        try {
            for (;;) {
                const s = store.state;
                if (!s || s.id !== stateId) return;
                const next = s.items.find((it) => it.status === 'queued');
                if (!next) return;
                const job = store.pending.get(next.id);
                if (!job) { patchItem(stateId, next.id, { status: 'failed', error: 'Ảnh không còn trong bộ nhớ' }); continue; }
                if (s.cancelRequested) {
                    store.pending.delete(next.id);
                    patchItem(stateId, next.id, { status: 'skipped', error: 'Đã dừng gửi' });
                    continue;
                }
                patchItem(stateId, next.id, { status: 'sending', error: undefined });
                const t = store.transport;
                try {
                    if (!t) throw new Error('Chưa đăng nhập — không gửi được LINE');
                    const res = await t.sendImage({ blob: job.blob, fileName: job.fileName, caption: buildLineCaption(job.fileName), groups: job.groups });
                    if (res.failed.length === 0) {
                        store.pending.delete(next.id);
                        patchItem(stateId, next.id, { status: 'ok' });
                    } else {
                        // Thử lại chỉ gửi vào các nhóm còn lỗi — nhóm đã nhận không bị gửi trùng
                        job.groups = res.failed.map((f) => f.group);
                        const loi = res.failed.map((f) => `${f.group.groupName}: ${f.error}`).join('; ');
                        patchItem(stateId, next.id, { status: 'failed', error: res.ok > 0 ? `Gửi được ${res.ok} nhóm — lỗi ${loi}` : loi });
                    }
                } catch (e) {
                    patchItem(stateId, next.id, { status: 'failed', error: errMsg(e) });
                }
                if (store.gapMs > 0) await new Promise((r) => setTimeout(r, store.gapMs));
            }
        } finally {
            store.pumping = null;
        }
    })();
    return store.pumping;
}

async function drain(stateId: number) {
    // pump() có thể được gọi lại bởi enqueue trong lúc chờ — lặp tới khi hết việc
    while (store.pumping || store.state?.items.some((it) => it.status === 'queued')) {
        if (!store.state || store.state.id !== stateId) return;
        await pump(stateId);
    }
}

function finalize(stateId: number) {
    const s = store.state;
    if (!s || s.id !== stateId) return;
    const ok = s.items.filter((it) => it.status === 'ok').length;
    const failed = s.items.filter((it) => it.status === 'failed').length;
    const skipped = s.items.filter((it) => it.status === 'skipped').length;
    const total = s.items.length;
    let summary: string;
    if (total === 0) summary = s.exportError ? 'Xuất ảnh thất bại — chưa gửi ảnh nào' : 'Không có ảnh nào được xuất để gửi';
    else if (failed === 0 && skipped === 0) summary = total === 1 ? 'Đã gửi nhóm LINE thành công' : `Đã gửi đủ ${ok}/${total} ảnh vào ${s.groupsLabel}`;
    else if (ok === 0 && failed > 0) summary = 'Gửi nhóm LINE thất bại';
    else summary = `Gửi được ${ok}/${total} ảnh${failed ? ` — ${failed} ảnh lỗi` : ''}${skipped ? ` — dừng ${skipped} ảnh` : ''}`;
    store.state = { ...s, phase: 'finished', summary };
    emit();
    if (store.hideTimer) { clearTimeout(store.hideTimer); store.hideTimer = null; }
    if (total > 0 && failed === 0 && skipped === 0 && !s.exportError) {
        store.hideTimer = setTimeout(() => { if (store.state?.id === stateId) closeLineSendPanel(); }, 3500);
    }
}

export interface LineDeliveryOptions {
    /** Tên báo cáo hiện trên bảng tiến trình */
    title: string;
    groups: LineGroup[];
    /** Đồng thời tải ảnh về máy như bình thường */
    alsoDownload?: boolean;
}

export interface LineDeliverySummary { total: number; ok: number; failed: number; skipped: number; errors: string[]; exportError?: string }

const summarize = (s: LineSendState | null): LineDeliverySummary => {
    const items = s?.items || [];
    return {
        total: items.length,
        ok: items.filter((i) => i.status === 'ok').length,
        failed: items.filter((i) => i.status === 'failed').length,
        skipped: items.filter((i) => i.status === 'skipped').length,
        errors: items.filter((i) => i.status === 'failed').map((i) => `${i.label}: ${i.error || 'lỗi'}`),
        exportError: s?.exportError,
    };
};

/**
 * Chạy hàm xuất ảnh có sẵn của một màn hình, gửi MỌI ảnh nó xuất ra vào các nhóm LINE đã chọn.
 * Ném lỗi ngay (không chạy gì) khi đang có lượt gửi khác / chưa có cổng gửi / chưa chọn nhóm.
 */
export async function runWithLineDelivery(opts: LineDeliveryOptions, run: () => Promise<unknown> | unknown): Promise<LineDeliverySummary> {
    if (!store.transport) throw new Error('Chưa đăng nhập — đăng nhập để gửi nhóm LINE');
    if (isLineSendBusy()) throw new Error('Đang gửi nhóm LINE lượt trước — đợi xong rồi gửi tiếp');
    if (!opts.groups.length) throw new Error('Chưa chọn nhóm LINE nào');
    if (store.hideTimer) { clearTimeout(store.hideTimer); store.hideTimer = null; }
    releaseAll();
    const id = ++store.seq;
    store.state = {
        id, title: opts.title, groupsLabel: groupsLabelOf(opts.groups), items: [], phase: 'exporting', cancelRequested: false,
    };
    store.scope = { stateId: id, alsoDownload: Boolean(opts.alsoDownload), groups: opts.groups, exporting: true };
    store.mount?.();
    emit();
    try {
        await run();
    } catch (e) {
        patch(id, { exportError: errMsg(e) });
    } finally {
        if (store.scope?.stateId === id) store.scope = null;
    }
    patch(id, { phase: 'sending' });
    await drain(id);
    finalize(id);
    return summarize(store.state?.id === id ? store.state : null);
}

/** Gửi 1 ảnh ĐÃ CÓ vào nhóm LINE qua cùng hàng đợi + bảng tiến trình (Phân tích: nút đã đặt đích LINE, hẹn giờ). */
export function sendBlobToLine(p: { blob: Blob; fileName: string; title?: string; groups: LineGroup[] }): Promise<LineDeliverySummary> {
    return runWithLineDelivery(
        { title: p.title || reportNameFromFilename(p.fileName), groups: p.groups },
        () => { const sc = store.scope; if (sc) enqueue(sc.stateId, p.blob, p.fileName, sc.groups); },
    );
}

/**
 * Khâu giao ảnh chung gọi TRƯỚC khi tải về / chia sẻ. Trả về true = ảnh đã được nhận để gửi LINE và KHÔNG được
 * tải về (người dùng chỉ chọn gửi LINE); false = giao bình thường (không có phạm vi gửi, hoặc chọn "đồng thời tải về").
 */
export function interceptImageDelivery(blob: Blob, fileName: string): boolean {
    const sc = store.scope;
    if (!sc || !sc.exporting) return false;
    enqueue(sc.stateId, blob, fileName, sc.groups);
    return !sc.alsoDownload;
}

/** Dừng gửi: ảnh đang gửi chạy nốt, các ảnh còn lại bỏ qua. Lượt xuất hàng loạt đang chạy cũng được yêu cầu huỷ. */
export function cancelLineSend(onCancelExport?: () => void) {
    const s = store.state;
    if (!s || s.phase === 'finished' || s.cancelRequested) return;
    store.state = { ...s, cancelRequested: true };
    emit();
    onCancelExport?.();
}

/** Gửi lại các ảnh lỗi (ảnh vẫn còn trong bộ nhớ — không phải xuất lại). */
export async function retryFailedLineSends(): Promise<LineDeliverySummary> {
    const s = store.state;
    if (!s || s.phase !== 'finished') return summarize(s);
    const retry = s.items.filter((it) => it.status === 'failed' && store.pending.has(it.id));
    if (!retry.length) return summarize(s);
    if (store.hideTimer) { clearTimeout(store.hideTimer); store.hideTimer = null; }
    const ids = new Set(retry.map((r) => r.id));
    store.state = {
        ...s, phase: 'sending', cancelRequested: false, summary: undefined,
        items: s.items.map((it) => (ids.has(it.id) ? { ...it, status: 'queued', error: undefined } : it)),
    };
    emit();
    await drain(s.id);
    finalize(s.id);
    return summarize(store.state);
}

function releaseAll() {
    store.pending.clear();
}

/** Đóng bảng (chỉ khi đã xong) — bỏ hết ảnh còn giữ để thử lại. */
export function closeLineSendPanel() {
    const s = store.state;
    if (s && s.phase !== 'finished') return;
    if (store.hideTimer) { clearTimeout(store.hideTimer); store.hideTimer = null; }
    releaseAll();
    store.state = null;
    emit();
}

/** Chỉ cho test */
export function __resetLineSendForTest(gapMs = 0) {
    if (store.hideTimer) clearTimeout(store.hideTimer);
    Object.assign(store, { state: null, scope: null, pending: new Map(), seen: new WeakSet(), pumping: null, hideTimer: null, gapMs });
    emit();
}
