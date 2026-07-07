/**
 * Lớp giao thức "cầu nối" giữa code React (không có quyền GM_*) và instance userscript
 * đang chạy trên chính trang Dashboard, dùng CustomEvent trên window. Userscript
 * (mwg-auto-thu-thap-diem-thuong.user.js) là bên còn lại đọc/ghi các event này và
 * chuyển tiếp sang GM storage để nói chuyện với tab MWG (xem plan trong repo).
 *
 * Mọi message đều bọc `source` để lọc bỏ event giả do script khác trên trang dispatch.
 */

export const BRIDGE_SOURCE = 'ycx-bonus-bridge';

const EVT_PING = 'ycx-bonus-bridge:ping';
const EVT_PONG = 'ycx-bonus-bridge:pong';
const EVT_START_JOB = 'ycx-bonus-bridge:start-job';
const EVT_PROGRESS = 'ycx-bonus-bridge:progress';
const EVT_JOB_DONE = 'ycx-bonus-bridge:job-done';
const EVT_JOB_ERROR = 'ycx-bonus-bridge:job-error';

export interface BridgeEmployeeRequest {
    employeeId: string;
    originalName: string;
    /** Tên rút gọn kiểu "107617 - A.Nhân" (formatEmployeeName) — chỉ để userscript hiển thị đẹp. */
    displayName?: string;
}

export interface BridgeStartJobRequest {
    employees: BridgeEmployeeRequest[];
    fromDate: string; // dd/mm/yyyy
    toDate: string;   // dd/mm/yyyy
}

export interface BridgeJobResultItem {
    employeeId: string;
    originalName: string;
    status: 'ok' | 'error';
    tsv?: string;
    error?: string;
    /** Điểm thực lãnh (dòng Tổng cộng) — userscript tự parse để Dashboard đối chiếu nhanh, không cần tính lại. */
    diemThucLanh?: number | null;
}

interface PongDetail { source: string; type: 'pong'; nonce: string; version?: string }
interface ProgressDetail { source: string; type: 'progress'; jobId: string; done: number; total: number; currentEmployeeId?: string }
interface JobDoneDetail { source: string; type: 'job-done'; jobId: string; results: BridgeJobResultItem[]; stoppedEarly?: boolean }
interface JobErrorDetail { source: string; type: 'job-error'; jobId: string; message: string }

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}

function hasBridgeSource(v: Record<string, unknown>): boolean {
    return v.source === BRIDGE_SOURCE;
}

function isPongDetail(v: unknown): v is PongDetail {
    return isPlainObject(v) && hasBridgeSource(v) && v.type === 'pong' && typeof v.nonce === 'string';
}

function isProgressDetail(v: unknown): v is ProgressDetail {
    return isPlainObject(v) && hasBridgeSource(v) && v.type === 'progress'
        && typeof v.jobId === 'string' && typeof v.done === 'number' && typeof v.total === 'number';
}

function isJobDoneDetail(v: unknown): v is JobDoneDetail {
    return isPlainObject(v) && hasBridgeSource(v) && v.type === 'job-done'
        && typeof v.jobId === 'string' && Array.isArray(v.results);
}

function isJobErrorDetail(v: unknown): v is JobErrorDetail {
    return isPlainObject(v) && hasBridgeSource(v) && v.type === 'job-error'
        && typeof v.jobId === 'string' && typeof v.message === 'string';
}

/** Dò userscript có cài không: ping rồi chờ pong hợp lệ tối đa `timeoutMs`. */
export function detectUserscript(timeoutMs = 1000): Promise<{ installed: boolean; version?: string }> {
    return new Promise(resolve => {
        const nonce = Math.random().toString(36).slice(2);
        let settled = false;

        const cleanup = () => window.removeEventListener(EVT_PONG, onPongEvt as EventListener);
        const finish = (result: { installed: boolean; version?: string }) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(result);
        };

        const onPongEvt = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (isPongDetail(detail) && detail.nonce === nonce) {
                finish({ installed: true, version: detail.version });
            }
        };

        window.addEventListener(EVT_PONG, onPongEvt as EventListener);
        window.dispatchEvent(new CustomEvent(EVT_PING, { detail: { source: BRIDGE_SOURCE, type: 'ping', nonce } }));

        setTimeout(() => finish({ installed: false }), timeoutMs);
    });
}

/** Gửi yêu cầu bắt đầu 1 job thu thập tới userscript đang chạy trên trang này. */
export function sendStartJob(jobId: string, createdAt: number, request: BridgeStartJobRequest): void {
    window.dispatchEvent(new CustomEvent(EVT_START_JOB, {
        detail: { source: BRIDGE_SOURCE, type: 'start-job', jobId, createdAt, request },
    }));
}

function subscribe<T>(eventName: string, isValid: (v: unknown) => v is T, cb: (detail: T) => void): () => void {
    const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (isValid(detail)) cb(detail);
    };
    window.addEventListener(eventName, handler as EventListener);
    return () => window.removeEventListener(eventName, handler as EventListener);
}

export const onProgress = (cb: (detail: ProgressDetail) => void) => subscribe(EVT_PROGRESS, isProgressDetail, cb);
export const onJobDone = (cb: (detail: JobDoneDetail) => void) => subscribe(EVT_JOB_DONE, isJobDoneDetail, cb);
export const onJobError = (cb: (detail: JobErrorDetail) => void) => subscribe(EVT_JOB_ERROR, isJobErrorDetail, cb);
