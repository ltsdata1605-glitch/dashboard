/**
 * TRẠNG THÁI XUẤT ẢNH dùng chung toàn dự án (kế hoạch "Hợp nhất xuất ảnh", 2026-10-01).
 *
 * Trước đây có 5 kiểu báo chờ: 3 lớp phủ DOM tự dựng (gốc / Phân Ca / In Sticker), Report BI chỉ đổi
 * icon nút thành spinner, Khai thác dùng toast.loading — có nơi không báo gì. Nay mọi lượt xuất (1 ảnh
 * hay hàng loạt) đi qua MỘT kho trạng thái này và MỘT bảng tiến trình (ExportProgressHost.tsx).
 *
 * Trạng thái để trên globalThis (không phải biến module): bundler từng tách một module thành 2 bản
 * (xem contexts/AuthContext.tsx) — 2 bản phải thấy chung một lượt xuất, nếu không bảng tiến trình
 * hiện 2 cái hoặc không tắt.
 */

export type ExportItemStatus = 'ok' | 'failed' | 'skipped';
export interface ExportItemResult { label: string; status: ExportItemStatus; error?: string }

export interface ExportJobState {
    id: number;
    /** Tiêu đề lượt xuất, vd "Xuất ảnh theo nhân viên" */
    title: string;
    /** Bước đang làm cho người dùng đọc: "Đang chụp ảnh…", "Đang lưu ảnh…" */
    stage: string;
    /** Tổng số ảnh (1 = xuất lẻ) */
    total: number;
    /** Số ảnh đã xử lý xong (thành công hoặc lỗi) */
    done: number;
    /** Tên mục đang xuất, vd tên nhân viên / tên kho */
    current: string;
    startedAt: number;
    results: ExportItemResult[];
    phase: 'running' | 'finished';
    cancelRequested: boolean;
    /** Lượt hàng loạt mới có nút Huỷ */
    cancellable: boolean;
}

type Listener = (s: ExportJobState | null) => void;
interface Store { state: ExportJobState | null; listeners: Set<Listener>; seq: number; hideTimer: ReturnType<typeof setTimeout> | null; mount: (() => void) | null }

const G = globalThis as unknown as { __ycxExportStore?: Store };
const store: Store = G.__ycxExportStore || (G.__ycxExportStore = { state: null, listeners: new Set(), seq: 0, hideTimer: null, mount: null });

function emit() { store.listeners.forEach((l) => l(store.state)); }

export function getExportState(): ExportJobState | null { return store.state; }
export function subscribeExportState(l: Listener): () => void {
    store.listeners.add(l);
    return () => { store.listeners.delete(l); };
}
/** ExportProgressHost tự đăng ký hàm gắn bảng vào trang — tách ra để file này không phụ thuộc React. */
export function registerExportHostMount(fn: () => void) { store.mount = fn; }

function setState(next: ExportJobState | null) {
    if (store.hideTimer) { clearTimeout(store.hideTimer); store.hideTimer = null; }
    store.state = next;
    if (next) store.mount?.();
    emit();
}

export interface ExportJob {
    readonly id: number;
    /** Người dùng đã bấm Huỷ — vòng lặp hàng loạt phải dừng ở mục kế tiếp */
    readonly cancelled: boolean;
    /** Bắt đầu mục thứ `index` (0-based) */
    item(index: number, label: string): void;
    stage(text: string): void;
    /** Ghi kết quả một mục */
    result(label: string, status: ExportItemStatus, error?: string): void;
    /** Kết thúc lượt. `message`: câu tổng kết thay câu mặc định */
    finish(opts?: { message?: string; keepOpenMs?: number }): void;
}

/**
 * Mở một lượt xuất. Lượt đang chạy (vd vòng hàng loạt) thì lượt xuất lẻ bên trong KHÔNG thay bảng —
 * dùng `getActiveExportJob()` để biết.
 */
export function startExportJob(opts: { title: string; total?: number; cancellable?: boolean; stage?: string }): ExportJob {
    const id = ++store.seq;
    const total = Math.max(1, opts.total ?? 1);
    setState({
        id, title: opts.title, stage: opts.stage || (total > 1 ? 'Đang chuẩn bị…' : 'Đang chụp ảnh…'),
        total, done: 0, current: '', startedAt: Date.now(), results: [], phase: 'running',
        cancelRequested: false, cancellable: opts.cancellable ?? total > 1,
    });
    const mine = () => (store.state && store.state.id === id ? store.state : null);
    const patch = (p: Partial<ExportJobState>) => { const s = mine(); if (s) { store.state = { ...s, ...p }; emit(); } };
    return {
        id,
        get cancelled() { return Boolean(mine()?.cancelRequested); },
        item(index, label) { patch({ done: Math.min(index, total), current: label, stage: total > 1 ? `Đang xuất ${index + 1}/${total}` : (mine()?.stage || '') }); },
        stage(text) { patch({ stage: text }); },
        result(label, status, error) {
            const s = mine(); if (!s) return;
            const results = [...s.results, { label, status, error }];
            store.state = { ...s, results, done: Math.min(results.length, total) };
            emit();
        },
        finish(f = {}) {
            const s = mine(); if (!s) return;
            const failed = s.results.filter((r) => r.status === 'failed').length;
            const ok = s.results.filter((r) => r.status === 'ok').length;
            const huy = s.cancelRequested;
            const message = f.message
                || (s.total === 1 ? (failed ? 'Xuất ảnh thất bại' : 'Đã xuất ảnh')
                    : huy ? `Đã huỷ — xuất được ${ok}/${s.total} ảnh`
                        : failed ? `Xuất được ${ok}/${s.total} ảnh — ${failed} ảnh lỗi` : `Đã xuất đủ ${ok}/${s.total} ảnh`);
            store.state = { ...s, phase: 'finished', stage: message, done: huy ? s.done : s.total };
            emit();
            // Lẻ & thành công: tắt gần như ngay. Có lỗi / hàng loạt: để người dùng đọc tổng kết.
            // Có câu tổng kết riêng mà chưa xuất đủ (vd lỗi cả lượt) → cũng giữ lại để người dùng đọc
            const thieu = ok < s.total && !huy;
            const keep = f.keepOpenMs ?? (s.total === 1 && !failed ? 600 : failed || huy || (f.message && thieu) ? 0 : 2500);
            if (keep > 0) {
                store.hideTimer = setTimeout(() => { if (store.state?.id === id) setState(null); }, keep);
            }
        },
    };
}

export function getActiveExportJob(): ExportJobState | null {
    return store.state && store.state.phase === 'running' ? store.state : null;
}
export function requestCancelExport() {
    if (store.state && store.state.phase === 'running' && store.state.cancellable) {
        store.state = { ...store.state, cancelRequested: true, stage: 'Đang huỷ sau ảnh hiện tại…' };
        emit();
    }
}
export function closeExportPanel() { setState(null); }

// ── Tương thích API cũ showExportOverlay / updateExportOverlay / hideExportOverlay ────────────────
// Các nơi gọi cũ (gốc, Phân Ca, In Sticker) truyền chuỗi tiến trình kiểu "3/12" — tách ra để có thanh %.
let legacy: { job: ExportJob; total: number } | null = null;
const parseProgress = (p?: string) => {
    const m = p ? /(\d+)\s*\/\s*(\d+)/.exec(p) : null;
    return m ? { cur: Number(m[1]), total: Number(m[2]) } : null;
};
export function showExportOverlay(message = 'Đang xuất ảnh...', progress?: string) {
    const pr = parseProgress(progress);
    legacy = { job: startExportJob({ title: message, total: pr?.total ?? 1, cancellable: false }), total: pr?.total ?? 1 };
    if (pr) legacy.job.item(Math.max(0, pr.cur - 1), '');
}
export function updateExportOverlay(message?: string, progress?: string) {
    if (!legacy) return;
    const pr = parseProgress(progress);
    if (pr) legacy.job.item(Math.max(0, pr.cur - 1), message || '');
    else if (message) legacy.job.stage(message);
}
export function hideExportOverlay() {
    if (!legacy) return;
    const s = store.state;
    if (s && s.id === legacy.job.id) setState(null);
    legacy = null;
}
