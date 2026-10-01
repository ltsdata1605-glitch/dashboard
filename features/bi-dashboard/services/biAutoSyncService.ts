/**
 * Service quản lý cầu nối Tự động Cập nhật dữ liệu Realtime & Luỹ kế
 * giữa Dashboard YCX và Tampermonkey Userscript.
 */
import * as db from '../utils/db';
import { configStore } from '../store/configStore';
import { shortenSupermarketName } from '../utils/dashboardHelpers';
import { detectUserscript } from '../utils/bonusBridge';

export const getDetailedTimestamp = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    return `${time} ${date}`;
};

export const EVT_BI_START_JOB = 'ycx-bi-automation:start-job';
export const EVT_BI_PROGRESS = 'ycx-bi-automation:progress';
export const EVT_BI_DONE = 'ycx-bi-automation:done';
export const EVT_BI_ERROR = 'ycx-bi-automation:error';
/** Nhờ userscript mở tab MWG bằng GM_openInTab (không bị chặn popup) — userscript ≥ 7.5 đáp lại OPEN_WORKER_OK. */
export const EVT_BI_OPEN_WORKER = 'ycx-bi-automation:open-worker';
export const EVT_BI_OPEN_WORKER_OK = 'ycx-bi-automation:open-worker-ok';

export type BiSyncMode = 'realtime' | 'luyke';

export interface BiSyncProgress {
    jobId: string;
    mode: BiSyncMode;
    step: number; // 1: Doanh thu hợp nhất, 2: Ngành hàng BI, 3: Nhân viên, 4: Thi đua, 5: Hoàn tất
    totalSteps: number;
    stepName: string;
    message: string;
}

export interface BiSyncResults {
    summary?: string;     // Doanh thu hợp nhất
    industry?: string;    // Siêu thị ngành hàng
    employee?: string;    // Doanh thu nhân viên
    competition?: string; // Thi đua (Cụm & Siêu thị)
    installment?: string; // Trả chậm (Luỹ kế)
    industryByStore?: Record<string, string>; // Ngành hàng theo từng siêu thị
    employeeByStore?: Record<string, string>; // Doanh thu nhân viên theo từng siêu thị
    installmentByStore?: Record<string, string>; // Trả chậm theo nhân viên, từng siêu thị (Luỹ kế, userscript 7.9+)
    competitionByStore?: Record<string, string>; // Thi đua theo nhân viên, từng siêu thị (Luỹ kế, userscript 7.10+)
}

export interface BiSyncJobDonePayload {
    jobId: string;
    mode: BiSyncMode;
    results: BiSyncResults;
}

function makeJobId(): string {
    return `bi-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Tháng Luỹ kế mặc định (YYYYMM) khi chọn "Tháng hiện tại": tháng này; riêng NGÀY 1 thì lấy tháng TRƯỚC
 * (chủ dự án 2026-10-01: ngày 1 chưa có số luỹ kế tháng mới → đổ dữ liệu tháng liền kề trước đó).
 */
export function thangLuyKeMacDinh(now: Date = new Date()): string {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    if (now.getDate() === 1) d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "202609" → "09/2026" để hiển thị. */
export function nhanThang(yyyymm: string): string {
    return /^\d{6}$/.test(yyyymm) ? `${yyyymm.slice(4)}/${yyyymm.slice(0, 4)}` : yyyymm;
}

export function sendStartBiJob(jobId: string, mode: BiSyncMode, month?: string): void {
    window.dispatchEvent(new CustomEvent(EVT_BI_START_JOB, {
        detail: {
            source: 'ycx-bi-automation',
            type: 'start-job',
            jobId,
            mode,
            month: month || null,
            createdAt: Date.now(),
        }
    }));
}

export function onBiProgress(cb: (progress: BiSyncProgress) => void): () => void {
    const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail && detail.source === 'ycx-bi-automation' && detail.type === 'progress') {
            cb(detail as BiSyncProgress);
        }
    };
    const messageHandler = (e: MessageEvent) => {
        const data = e.data;
        if (data && data.source === 'ycx-bi-automation' && data.type === 'progress') {
            cb(data as BiSyncProgress);
        }
    };
    window.addEventListener(EVT_BI_PROGRESS, handler as EventListener);
    window.addEventListener('message', messageHandler);
    return () => {
        window.removeEventListener(EVT_BI_PROGRESS, handler as EventListener);
        window.removeEventListener('message', messageHandler);
    };
}

export function onBiDone(cb: (payload: BiSyncJobDonePayload) => void): () => void {
    const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail && detail.source === 'ycx-bi-automation' && detail.type === 'done') {
            cb(detail as BiSyncJobDonePayload);
        }
    };
    const messageHandler = (e: MessageEvent) => {
        const data = e.data;
        if (data && data.source === 'ycx-bi-automation' && data.type === 'done') {
            cb(data as BiSyncJobDonePayload);
        }
    };
    window.addEventListener(EVT_BI_DONE, handler as EventListener);
    window.addEventListener('message', messageHandler);
    return () => {
        window.removeEventListener(EVT_BI_DONE, handler as EventListener);
        window.removeEventListener('message', messageHandler);
    };
}

export function onBiError(cb: (payload: { jobId: string; message: string }) => void): () => void {
    const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail && detail.source === 'ycx-bi-automation' && detail.type === 'error') {
            cb(detail);
        }
    };
    const messageHandler = (e: MessageEvent) => {
        const data = e.data;
        if (data && data.source === 'ycx-bi-automation' && data.type === 'error') {
            cb(data);
        }
    };
    window.addEventListener(EVT_BI_ERROR, handler as EventListener);
    window.addEventListener('message', messageHandler);
    return () => {
        window.removeEventListener(EVT_BI_ERROR, handler as EventListener);
        window.removeEventListener('message', messageHandler);
    };
}

/**
 * Áp dụng kết quả thu thập tự động vào hệ thống (IndexedDB, configStore, last updates)
 */
export async function applyBiSyncResults(
    mode: BiSyncMode,
    results: BiSyncResults,
    activeSupermarketName: string | null
): Promise<{ successCount: number; errors: string[] }> {
    const nowTs = getDetailedTimestamp();
    const safeName = activeSupermarketName ? shortenSupermarketName(activeSupermarketName) : '';
    let successCount = 0;
    const errors: string[] = [];

    // Helper lưu key vào configStore + db + dispatch event
    const saveBiField = async (key: string, val: string, tsKey: string) => {
        try {
            await db.set(key, val);
            await db.set(tsKey, nowTs);
            configStore.setCache(key, val);
            configStore.setCache(tsKey, nowTs);
            window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key } }));
            window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: tsKey } }));
            successCount++;
        } catch (e: any) {
            errors.push(`Lỗi lưu ${key}: ${e.message}`);
        }
    };

    if (mode === 'realtime') {
        // 1. Doanh thu hợp nhất Realtime
        if (results.summary) {
            await saveBiField('summary-realtime', results.summary, 'summary-realtime-ts');
        }
        // 2. Siêu thị ngành hàng Realtime: Lưu lần lượt cho từng siêu thị nếu có dữ liệu theo siêu thị
        if (results.industryByStore && Object.keys(results.industryByStore).length > 0) {
            const savedSafeNames = new Set<string>();
            for (const [stKey, indText] of Object.entries(results.industryByStore)) {
                const stSafeName = shortenSupermarketName(stKey);
                if (stSafeName && !savedSafeNames.has(stSafeName)) {
                    savedSafeNames.add(stSafeName);
                    const key = `config-${stSafeName}-industry-realtime`;
                    await saveBiField(key, indText, `${key}-ts`);
                }
            }
        } else if (results.industry && safeName) {
            const key = `config-${safeName}-industry-realtime`;
            await saveBiField(key, results.industry, `${key}-ts`);
        }
        // 3. Doanh thu nhân viên Realtime: Lưu lần lượt cho từng siêu thị nếu có dữ liệu theo siêu thị
        if (results.employeeByStore && Object.keys(results.employeeByStore).length > 0) {
            const savedSafeNames = new Set<string>();
            for (const [stKey, empText] of Object.entries(results.employeeByStore)) {
                const stSafeName = shortenSupermarketName(stKey);
                if (stSafeName && !savedSafeNames.has(stSafeName)) {
                    savedSafeNames.add(stSafeName);
                    const key = `config-${stSafeName}-employee-realtime`;
                    await saveBiField(key, empText, `${key}-ts`);
                }
            }
        } else if (results.employee && safeName) {
            const key = `config-${safeName}-employee-realtime`;
            await saveBiField(key, results.employee, `${key}-ts`);
        }
        // 4. Thi đua Realtime
        if (results.competition) {
            await saveBiField('competition-realtime', results.competition, 'competition-realtime-ts');
        }
    } else {
        // LUỸ KẾ
        // Bản 7.7+ chạy Direct API → có industryByStore/employeeByStore: lưu theo TỪNG siêu thị như Realtime.
        // Đường UI cũ (không có *ByStore) giữ cách lưu cũ theo siêu thị đang chọn.
        const quaApi = Boolean(results.industryByStore || results.employeeByStore);
        // 1. Doanh thu hợp nhất Luỹ kế
        if (results.summary) {
            await saveBiField('summary-luy-ke', results.summary, 'summary-luy-ke-ts');
        }
        // 2. Siêu thị ngành hàng Luỹ kế
        if (results.industryByStore && Object.keys(results.industryByStore).length > 0) {
            const daLuu = new Set<string>();
            for (const [stKey, indText] of Object.entries(results.industryByStore)) {
                const stSafeName = shortenSupermarketName(stKey);
                if (stSafeName && !daLuu.has(stSafeName)) {
                    daLuu.add(stSafeName);
                    const key = `config-${stSafeName}-industry-luyke`;
                    await saveBiField(key, indText, `${key}-ts`);
                }
            }
        } else if (results.industry && safeName) {
            const key = `config-${safeName}-industry-luyke`;
            await saveBiField(key, results.industry, `${key}-ts`);
        }
        // 3. Doanh thu nhân viên Luỹ kế (danhSach)
        if (results.employeeByStore && Object.keys(results.employeeByStore).length > 0) {
            const daLuu = new Set<string>();
            for (const [stKey, empText] of Object.entries(results.employeeByStore)) {
                const stSafeName = shortenSupermarketName(stKey);
                if (stSafeName && !daLuu.has(stSafeName)) {
                    daLuu.add(stSafeName);
                    const key = `config-${stSafeName}-danhsach`;
                    await saveBiField(key, empText, `${key}-ts`);
                }
            }
        } else if (results.employee && safeName) {
            const key = `config-${safeName}-danhsach`;
            await saveBiField(key, results.employee, `${key}-ts`);
        }
        // 4. Thi đua Luỹ kế (cụm). Đường UI cũ còn ghi thêm vào Thi đua siêu thị; dữ liệu API cụm là bảng theo chương
        // trình (không có nhân viên) nên KHÔNG ghi vào ô Thi đua nhân viên — ô đó lấy từ competitionByStore (7.10+).
        if (results.competition) {
            await saveBiField('competition-luy-ke', results.competition, 'competition-luy-ke-ts');
            if (!quaApi && safeName) {
                const key = `config-${safeName}-thidua`;
                await saveBiField(key, results.competition, `${key}-ts`);
            }
        }
        // 4b. Thi đua theo nhân viên từng siêu thị (7.10+) → ô "THI ĐUA" của Cấu hình siêu thị
        if (results.competitionByStore && Object.keys(results.competitionByStore).length > 0) {
            const daLuu = new Set<string>();
            for (const [stKey, tdText] of Object.entries(results.competitionByStore)) {
                const stSafeName = shortenSupermarketName(stKey);
                if (stSafeName && !/^\d+$/.test(stSafeName) && !daLuu.has(stSafeName)) {
                    daLuu.add(stSafeName);
                    const key = `config-${stSafeName}-thidua`;
                    await saveBiField(key, tdText, `${key}-ts`);
                }
            }
        }
        // 5. Trả chậm Luỹ kế theo nhân viên — 7.9+ có installmentByStore (từng siêu thị); đường UI cũ theo siêu thị đang chọn
        if (results.installmentByStore && Object.keys(results.installmentByStore).length > 0) {
            const daLuu = new Set<string>();
            for (const [stKey, tcText] of Object.entries(results.installmentByStore)) {
                const stSafeName = shortenSupermarketName(stKey);
                if (stSafeName && !daLuu.has(stSafeName)) {
                    daLuu.add(stSafeName);
                    const key = `config-${stSafeName}-tragop`;
                    await saveBiField(key, tcText, `${key}-ts`);
                }
            }
        } else if (results.installment && safeName) {
            const key = `config-${safeName}-tragop`;
            await saveBiField(key, results.installment, `${key}-ts`);
        }
    }

    return { successCount, errors };
}

/** Đường dẫn userscript (cùng domain Dashboard) — mở link này thì Tampermonkey hiện trang Cài đặt / Cập nhật. */
export const USERSCRIPT_URL = '/scripts/mwg-auto-thu-thap-diem-thuong.user.js';

/** Bản tối thiểu khi KHÔNG đọc được bản mới nhất (mất mạng…): cần Bước 3 GROUPBY BICAT & DT quy đổi + Trả góp. */
export const USERSCRIPT_MIN_VERSION = '6.3';

/** So phiên bản theo SỐ từng đoạn ("7.10" > "7.9"; so chuỗi thì sai). Trả <0, 0, >0. */
export function compareVersions(a: string, b: string): number {
    const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] || 0) - (pb[i] || 0);
        if (d !== 0) return d;
    }
    return 0;
}

/** Đọc dòng `// @version` của userscript đang phát trên Dashboard (bản mới nhất). null nếu không đọc được. */
export async function fetchLatestUserscriptVersion(): Promise<string | null> {
    try {
        const res = await fetch(`${USERSCRIPT_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const m = (await res.text()).match(/^\/\/\s*@version\s+([\d.]+)/m);
        return m ? m[1] : null;
    } catch {
        return null;
    }
}

// ====== TỰ CHẠY TIẾP SAU KHI CẬP NHẬT USERSCRIPT ======
// Tampermonkey KHÔNG nạp bản mới vào trang đang mở sẵn: trang Dashboard vẫn giữ bản cũ tới khi tải lại → bấm Cập nhật
// xong quay lại vẫn báo "bản cũ" (chủ dự án gặp 2026-10-01). Nên: ghi nhớ lượt dở vào sessionStorage (sống qua tải lại,
// riêng từng tab) → quay lại tab thì tự tải lại → BiWrapper mở mục Cập nhật → DataUpdater tự chạy tiếp.
const PENDING_KEY = 'ycx-bi-auto-pending';
const PENDING_TTL_MS = 10 * 60 * 1000;
/** Tự tải lại tối đa ngần này lần cho một lượt dở (chưa cập nhật mà cứ quay lại tab thì không tải lại mãi). */
export const PENDING_MAX_RELOADS = 2;

export interface PendingAutoSync { mode: BiSyncMode; ts: number; reloads: number; month?: string }

export function readPendingAutoSync(): PendingAutoSync | null {
    try {
        const raw = sessionStorage.getItem(PENDING_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as PendingAutoSync;
        if ((p.mode !== 'realtime' && p.mode !== 'luyke') || Date.now() - p.ts > PENDING_TTL_MS) return null;
        return p;
    } catch {
        return null;
    }
}
export function savePendingAutoSync(p: PendingAutoSync): void {
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch { /* chế độ riêng tư chặn storage */ }
}
export function clearPendingAutoSync(): void {
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* bỏ qua */ }
}

/**
 * Mở tab MWG. Lượt tự chạy tiếp (sau tải lại) KHÔNG có cú bấm của người dùng → window.open bị trình duyệt chặn, nên
 * nhờ userscript (≥ 7.5) mở bằng GM_openInTab (không bị chặn); không có phản hồi thì mới thử window.open.
 */
async function moTabMwg(url: string, nhoUserscript: boolean): Promise<Window | 'userscript' | null> {
    if (nhoUserscript) {
        const ok = await new Promise<boolean>((resolve) => {
            const onOk = () => { window.removeEventListener(EVT_BI_OPEN_WORKER_OK, onOk); resolve(true); };
            window.addEventListener(EVT_BI_OPEN_WORKER_OK, onOk);
            window.dispatchEvent(new CustomEvent(EVT_BI_OPEN_WORKER, { detail: { source: 'ycx-bi-automation', url } }));
            setTimeout(() => { window.removeEventListener(EVT_BI_OPEN_WORKER_OK, onOk); resolve(false); }, 600);
        });
        if (ok) return 'userscript';
    }
    try {
        return window.open(url, 'mwg_bi_worker');
    } catch (e) {
        console.warn('[BiAutoSync] Không mở được popup tab:', e);
        return null;
    }
}

/**
 * Khởi chạy chuỗi tự động thu thập: Kiểm tra userscript, mở tab worker, bắn event.
 * Userscript cũ hơn bản đang phát → TỰ MỞ trang cập nhật (Tampermonkey) và dừng, không chạy bằng bản cũ.
 * `tuChayTiep`: lượt chạy lại tự động sau khi tải trang (không có cú bấm) — không mở lại trang cập nhật, chờ ping lâu hơn
 * (userscript có thể chưa kịp nạp), mở tab MWG qua userscript.
 */
export async function startBiAutoSyncSession(mode: BiSyncMode, opts: { tuChayTiep?: boolean; month?: string } = {}): Promise<{ jobId: string; workerWindow: Window | null; workerOpened: boolean }> {
    // Chạy song song để vẫn nằm trong thời hạn "người dùng vừa bấm" (trình duyệt mới cho mở tab mới)
    const [isInstalled, latest] = await Promise.all([detectUserscript(opts.tuChayTiep ? 4000 : 800), fetchLatestUserscriptVersion()]);
    if (!isInstalled.installed) {
        throw new Error('USERSCRIPT_NOT_INSTALLED');
    }

    const ver = isInstalled.version || '0';
    const canDat = latest || USERSCRIPT_MIN_VERSION;
    if (compareVersions(ver, canDat) < 0) {
        if (!opts.tuChayTiep) {
            try { window.open(USERSCRIPT_URL, '_blank'); } catch { /* trình duyệt chặn → modal có nút mở tay */ }
        }
        throw new Error(`USERSCRIPT_OUTDATED:${ver}:${latest || ''}`);
    }

    const jobId = makeJobId();
    // Luỹ kế: tháng chọn (YYYYMM); không truyền → tháng mặc định (ngày 1 thì tháng trước)
    const month = mode === 'luyke' ? (opts.month && /^\d{6}$/.test(opts.month) ? opts.month : thangLuyKeMacDinh()) : undefined;
    sendStartBiJob(jobId, mode, month);

    // Mở tab worker kèm URL query + hash để userscript trên tab MWG đọc được ngay lập tức
    const extra = month ? `&ycx_month=${month}` : '';
    const targetUrl = `https://baocao.dienmayxanh.com/dashboard/revenue-consolidated?ycx_mode=${mode}&job_id=${jobId}${extra}#ycx_mode=${mode}&job_id=${jobId}${extra}`;
    const tab = await moTabMwg(targetUrl, Boolean(opts.tuChayTiep));
    const workerWindow = tab && tab !== 'userscript' ? tab : null;
    return { jobId, workerWindow, workerOpened: Boolean(tab) };
}
