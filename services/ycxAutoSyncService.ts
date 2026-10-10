/**
 * TỰ ĐỘNG YCX (Realtime & Luỹ kế) cho Phân tích (2026-10-01).
 *
 * Luỹ kế (bản 7.15): như Realtime nhưng Từ ngày = 01 đầu tháng, Đến ngày = HÔM QUA, nạp như "Lũy kế / Quá khứ".
 * Hôm nay là ngày 01 thì chưa có ngày nào để luỹ kế → bấm Luỹ kế chạy Realtime (chủ dự án chốt).
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
/** Bản userscript tối thiểu: 7.13 treo ở ô Kho / Lịch sử lỗi 415 (7.14 sửa); 7.15 thêm Luỹ kế; 7.16 hẹn giờ + gửi LINE */
export const YCX_MIN_USERSCRIPT_VERSION = '7.16';

export type YcxMode = 'realtime' | 'luyke';

/** Luỹ kế vào ngày 01 → chạy Realtime (chưa có ngày nào của tháng để luỹ kế). */
export function resolveYcxMode(requested: YcxMode, now: Date = new Date()): YcxMode {
    return requested === 'luyke' && now.getDate() === 1 ? 'realtime' : requested;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const ddmm = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

/**
 * Tiêu đề tự động cho YCX Luỹ kế:
 * "YCX Từ ngày 1 - Ngày hiện tại -1 + hh:mm"
 * Ví dụ: Ngày 10/10 lúc 08:45 -> "YCX Từ ngày 1 - 9/10 + 08:45"
 * Nếu hôm nay là ngày 1 -> Lùi về ngày cuối tháng trước (ví dụ: ngày 1/10 -> "YCX Từ ngày 1 - 30/9 + 08:45")
 */
export function formatYcxLuyKeTitle(now: Date = new Date()): string {
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const day = yesterday.getDate();
    const month = yesterday.getMonth() + 1;
    const hh = pad2(now.getHours());
    const mm = pad2(now.getMinutes());
    return `YCX Từ ngày 1 - ${day}/${month} + ${hh}:${mm}`;
}

/**
 * Tiêu đề tự động cho YCX khi chọn tháng:
 * "YCX Tháng được chọn"
 * Ví dụ: "YCX Tháng 9.2026" hoặc "YCX Tháng 10.2026"
 */
export function formatYcxMonthTitle(monthVal?: string | Date): string {
    if (!monthVal) {
        const d = new Date();
        return `YCX Tháng ${d.getMonth() + 1}.${d.getFullYear()}`;
    }
    if (monthVal instanceof Date) {
        return `YCX Tháng ${monthVal.getMonth() + 1}.${monthVal.getFullYear()}`;
    }
    if (/^\d{4}-\d{2}$/.test(monthVal)) {
        const [y, m] = monthVal.split('-');
        return `YCX Tháng ${parseInt(m, 10)}.${y}`;
    }
    if (/^\d{6}$/.test(monthVal)) {
        const y = monthVal.slice(0, 4);
        const m = parseInt(monthVal.slice(4), 10);
        return `YCX Tháng ${m}.${y}`;
    }
    if (/^\d{1,2}\/\d{4}$/.test(monthVal)) {
        const [m, y] = monthVal.split('/');
        return `YCX Tháng ${parseInt(m, 10)}.${y}`;
    }
    return `YCX Tháng ${monthVal}`;
}

/**
 * Chuẩn hoá tên tệp YCX nếu là tên tệp xuất thô từ MWG report 77
 * (ví dụ: "Chitiếtyêucầuxuấtcbe3c931...20261010_081500_...").
 * Trích xuất ngày giờ xuất để tạo tiêu đề đẹp: "YCX Từ ngày 1 - 9/10 + 08:15".
 */
export function cleanYcxFileName(rawFilename?: string): string {
    if (!rawFilename) return formatYcxLuyKeTitle();
    const isMwgRaw = /^(?:Chiti[eế]ty[eê]uc[aâ]uxu[aấ]t|Report|Chi\s*tiết\s*yêu\s*cầu\s*xuất)/i.test(rawFilename);
    if (!isMwgRaw) return rawFilename;

    const m = rawFilename.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
    if (m) {
        const [_, y, mo, d, h, mi] = m;
        const fileDate = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
        if (!isNaN(fileDate.getTime())) {
            return formatYcxLuyKeTitle(fileDate);
        }
    }
    return formatYcxLuyKeTitle();
}

/** Khoảng ngày sẽ chọn trên báo cáo 77 (hiển thị cho người dùng — userscript tự tính lại cùng công thức). */
export function ycxDateRange(mode: YcxMode, now: Date = new Date(), month?: string): { from: string; to: string } {
    if (mode === 'realtime') return { from: ddmm(now), to: ddmm(now) };
    if (month) {
        const [y, m] = month.includes('-') ? month.split('-').map(Number) : [Number(month.slice(0, 4)), Number(month.slice(4))];
        const lastDay = new Date(y, m, 0).getDate();
        return {
            from: `01/${pad2(m)}/${y}`,
            to: `${pad2(lastDay)}/${pad2(m)}/${y}`
        };
    }
    const homQua = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return { from: ddmm(new Date(now.getFullYear(), now.getMonth(), 1)), to: ddmm(homQua) };
}

export const YCX_SOURCE = 'ycx-ycx-auto';
const EVT_START = 'ycx-ycx-auto:start-job';
const PING = 'ycx-bonus-bridge:ping';
const PONG = 'ycx-bonus-bridge:pong';
const BRIDGE_SOURCE = 'ycx-bonus-bridge';

export type YcxStep = 'open' | 'conditions' | 'export' | 'waiting' | 'download' | 'load';

export function ycxSteps(mode: YcxMode, now: Date = new Date()): { id: YcxStep; label: string }[] {
    const r = ycxDateRange(mode, now);
    return [
        { id: 'open', label: 'Mở báo cáo 77 trên report.mwgroup.vn' },
        { id: 'conditions', label: mode === 'luyke'
            ? `Chọn điều kiện: ${r.from} → ${r.to} · Kho tạo · Tất cả ngành hàng · Tất cả kho`
            : 'Chọn điều kiện: hôm nay · Kho tạo · Tất cả ngành hàng · Tất cả kho' },
        { id: 'export', label: 'Bấm Xuất excel' },
        { id: 'waiting', label: 'Chờ MWG xuất file (Lịch sử xuất excel)' },
        { id: 'download', label: 'Tải file về Dashboard' },
        { id: 'load', label: mode === 'luyke' ? 'Nạp vào Phân tích (Lũy kế / Quá khứ)' : 'Nạp vào Phân tích (Tệp Realtime)' },
    ];
}

export const YCX_STEPS = ycxSteps('realtime');

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

export function buildYcxReportUrl(jobId: string, mode: YcxMode = 'realtime', month?: string): string {
    const mParam = month ? `&ycx_month=${encodeURIComponent(month)}` : '';
    return `${YCX_REPORT_URL}?ycx_ycx=${mode}&ycx_job=${encodeURIComponent(jobId)}${mParam}`;
}

/**
 * Bắt đầu một lượt: báo userscript ghi job (để tab báo cáo nhận cả khi bị chuyển qua trang đăng nhập) rồi mở tab.
 * PHẢI gọi ngay trong cú bấm của người dùng — nếu không trình duyệt chặn cửa sổ bật lên.
 * Trả về false nếu trình duyệt vẫn chặn.
 */
export function startYcxJob(jobId: string, mode: YcxMode = 'realtime', opts: { auto?: boolean; month?: string } = {}): Promise<boolean> {
    window.dispatchEvent(new CustomEvent(EVT_START, { detail: { source: YCX_SOURCE, type: 'start-job', jobId, mode, month: opts.month } }));
    const url = buildYcxReportUrl(jobId, mode, opts.month);
    if (!opts.auto) {
        // Bấm tay: mở NGAY trong cú bấm (chờ gì trước đó là trình duyệt chặn cửa sổ bật lên)
        const w = window.open(url, '_blank');
        return Promise.resolve(!!w);
    }
    // Hẹn giờ: không có cú bấm → nhờ userscript ≥ 7.16 mở bằng GM_openInTab; không phản hồi thì thử window.open
    return new Promise((resolve) => {
        const onOk = (e: Event) => {
            if ((e as CustomEvent).detail?.url !== url) return;
            window.removeEventListener('ycx-bi-automation:open-worker-ok', onOk);
            clearTimeout(t);
            resolve(true);
        };
        const t = setTimeout(() => {
            window.removeEventListener('ycx-bi-automation:open-worker-ok', onOk);
            let w: Window | null = null;
            try { w = window.open(url, '_blank'); } catch { /* bị chặn */ }
            resolve(!!w);
        }, 1500);
        window.addEventListener('ycx-bi-automation:open-worker-ok', onOk);
        window.dispatchEvent(new CustomEvent('ycx-bi-automation:open-worker', { detail: { source: 'ycx-bi-automation', url } }));
    });
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
