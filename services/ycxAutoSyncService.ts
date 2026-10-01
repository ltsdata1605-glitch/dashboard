/**
 * TỰ ĐỘNG YCX REALTIME cho Phân tích (2026-10-01).
 *
 * Luồng: khung "AUTO SYNC YCX" → mở report.mwgroup.vn/home/dashboard/77 (tab mới) → userscript bản ≥ 7.14 trên trang
 * đó đặt điều kiện (Kho tạo · Tất cả ngành hàng · Tất cả kho · hôm nay), bấm Xuất excel, chờ "Lịch sử xuất excel" xuất
 * xong → userscript phía Dashboard tải file bằng phiên đăng nhập MWG (GM_xmlhttpRequest) → `postMessage` ArrayBuffer về
 * đây → Phân tích nạp như bấm "File YCX" → "Tệp Realtime".
 *
 * File này ở GỐC (không import từ features/ — CLAUDE.md mục 1), nên tự có hàm dò userscript / so phiên bản thay vì
 * dùng lại bản của Report BI. Giao thức ping/pong là của chung userscript (`ycx-bonus-bridge`).
 */

export const YCX_REPORT_URL = 'https://report.mwgroup.vn/home/dashboard/77';
export const YCX_USERSCRIPT_URL = '/scripts/mwg-auto-thu-thap-diem-thuong.user.js';
/** Bản userscript tối thiểu cho Tự động YCX (7.13 treo ở ô Kho và đọc Lịch sử lỗi HTTP 415 — 7.14 sửa) */
export const YCX_MIN_USERSCRIPT_VERSION = '7.14';

export const YCX_SOURCE = 'ycx-ycx-auto';
const EVT_START = 'ycx-ycx-auto:start-job';
const PING = 'ycx-bonus-bridge:ping';
const PONG = 'ycx-bonus-bridge:pong';
const BRIDGE_SOURCE = 'ycx-bonus-bridge';

export type YcxStep = 'open' | 'conditions' | 'export' | 'waiting' | 'download' | 'load';

export const YCX_STEPS: { id: YcxStep; label: string }[] = [
    { id: 'open', label: 'Mở báo cáo 77 trên report.mwgroup.vn' },
    { id: 'conditions', label: 'Chọn điều kiện: Kho tạo · Tất cả ngành hàng · Tất cả kho' },
    { id: 'export', label: 'Bấm Xuất excel' },
    { id: 'waiting', label: 'Chờ MWG xuất file (Lịch sử xuất excel)' },
    { id: 'download', label: 'Tải file về Dashboard' },
    { id: 'load', label: 'Nạp vào Phân tích (Tệp Realtime)' },
];

export type YcxMessage =
    | { source: typeof YCX_SOURCE; type: 'progress'; jobId: string; step: YcxStep; message: string }
    | { source: typeof YCX_SOURCE; type: 'error'; jobId: string; step?: YcxStep; message: string }
    | { source: typeof YCX_SOURCE; type: 'file'; jobId: string; fileName: string; buffer: ArrayBuffer };

export function compareVersions(a: string, b: string): number {
    const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] || 0) - (pb[i] || 0);
        if (d !== 0) return d;
    }
    return 0;
}

/** Hỏi userscript có đang chạy trên trang này không (ping/pong chung của userscript). */
export function detectYcxUserscript(timeoutMs = 1000): Promise<{ installed: boolean; version?: string }> {
    return new Promise((resolve) => {
        const nonce = Math.random().toString(36).slice(2);
        let xong = false;
        const onPong = (e: Event) => {
            const d = (e as CustomEvent).detail as { source?: string; type?: string; nonce?: string; version?: string } | null;
            if (d && d.source === BRIDGE_SOURCE && d.type === 'pong' && d.nonce === nonce) finish({ installed: true, version: d.version });
        };
        const finish = (r: { installed: boolean; version?: string }) => {
            if (xong) return;
            xong = true;
            window.removeEventListener(PONG, onPong);
            resolve(r);
        };
        window.addEventListener(PONG, onPong);
        window.dispatchEvent(new CustomEvent(PING, { detail: { source: BRIDGE_SOURCE, type: 'ping', nonce } }));
        setTimeout(() => finish({ installed: false }), timeoutMs);
    });
}

/** Bản userscript mới nhất đang phát trên Dashboard (dòng `// @version`). */
export async function fetchLatestYcxUserscriptVersion(): Promise<string | null> {
    try {
        const res = await fetch(`${YCX_USERSCRIPT_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const m = (await res.text()).match(/^\/\/\s*@version\s+([\d.]+)/m);
        return m ? m[1] : null;
    } catch {
        return null;
    }
}

export function newYcxJobId(): string {
    return `ycx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildYcxReportUrl(jobId: string): string {
    return `${YCX_REPORT_URL}?ycx_ycx=realtime&ycx_job=${encodeURIComponent(jobId)}`;
}

/**
 * Bắt đầu một lượt: báo userscript ghi job (để tab báo cáo nhận cả khi bị chuyển qua trang đăng nhập) rồi mở tab.
 * PHẢI gọi ngay trong cú bấm của người dùng — nếu không trình duyệt chặn cửa sổ bật lên.
 * Trả về false nếu trình duyệt vẫn chặn.
 */
export function startYcxJob(jobId: string): boolean {
    window.dispatchEvent(new CustomEvent(EVT_START, { detail: { source: YCX_SOURCE, type: 'start-job', jobId, mode: 'realtime' } }));
    const w = window.open(buildYcxReportUrl(jobId), '_blank');
    return !!w;
}

export function isYcxMessage(data: unknown): data is YcxMessage {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    if (d.source !== YCX_SOURCE || typeof d.jobId !== 'string') return false;
    if (d.type === 'file') return typeof d.fileName === 'string' && d.buffer instanceof ArrayBuffer;
    return (d.type === 'progress' || d.type === 'error') && typeof d.message === 'string';
}

/** Lắng nghe tin của userscript cho đúng một lượt `jobId` (tin của lượt khác / lượt cũ bị bỏ qua). */
export function listenYcxJob(jobId: string, onMessage: (m: YcxMessage) => void): () => void {
    const handler = (e: MessageEvent) => {
        if (e.source !== window) return;
        if (isYcxMessage(e.data) && e.data.jobId === jobId) onMessage(e.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
}

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function ycxBufferToFile(buffer: ArrayBuffer, fileName: string): File {
    const type = /\.xls$/i.test(fileName) ? 'application/vnd.ms-excel' : /\.csv$/i.test(fileName) ? 'text/csv' : EXCEL_MIME;
    return new File([buffer], fileName, { type, lastModified: Date.now() });
}
