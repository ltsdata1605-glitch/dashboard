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
}

export interface BiSyncJobDonePayload {
    jobId: string;
    mode: BiSyncMode;
    results: BiSyncResults;
}

function makeJobId(): string {
    return `bi-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sendStartBiJob(jobId: string, mode: BiSyncMode): void {
    window.dispatchEvent(new CustomEvent(EVT_BI_START_JOB, {
        detail: {
            source: 'ycx-bi-automation',
            type: 'start-job',
            jobId,
            mode,
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
        // 1. Doanh thu hợp nhất Luỹ kế
        if (results.summary) {
            await saveBiField('summary-luy-ke', results.summary, 'summary-luy-ke-ts');
        }
        // 2. Siêu thị ngành hàng Luỹ kế
        if (results.industry && safeName) {
            const key = `config-${safeName}-industry-luyke`;
            await saveBiField(key, results.industry, `${key}-ts`);
        }
        // 3. Doanh thu nhân viên Luỹ kế (danhSach)
        if (results.employee && safeName) {
            const key = `config-${safeName}-danhsach`;
            await saveBiField(key, results.employee, `${key}-ts`);
        }
        // 4. Thi đua Luỹ kế -> Ghi vào CẢ Thi đua cụm và Thi đua siêu thị
        if (results.competition) {
            await saveBiField('competition-luy-ke', results.competition, 'competition-luy-ke-ts');
            if (safeName) {
                const key = `config-${safeName}-thidua`;
                await saveBiField(key, results.competition, `${key}-ts`);
            }
        }
        // 5. Trả chậm Luỹ kế -> Ghi vào Trả chậm siêu thị
        if (results.installment && safeName) {
            const key = `config-${safeName}-tragop`;
            await saveBiField(key, results.installment, `${key}-ts`);
        }
    }

    return { successCount, errors };
}

/**
 * Khởi chạy chuỗi tự động thu thập: Kiểm tra userscript, mở tab worker, bắn event
 */
export async function startBiAutoSyncSession(mode: BiSyncMode): Promise<{ jobId: string; workerWindow: Window | null }> {
    const isInstalled = await detectUserscript(800);
    if (!isInstalled.installed) {
        throw new Error('USERSCRIPT_NOT_INSTALLED');
    }

    // Bắt buộc userscript phải từ bản 6.2 trở lên để chạy ngầm 100% qua Direct Internal API
    const ver = isInstalled.version || '0';
    if (ver < '6.2') {
        throw new Error(`USERSCRIPT_OUTDATED:${ver}`);
    }

    const jobId = makeJobId();
    sendStartBiJob(jobId, mode);

    // Mở tab worker trực tiếp trong click gesture kèm URL query + hash để userscript trên tab MWG đọc được ngay lập tức
    const targetUrl = `https://baocao.dienmayxanh.com/dashboard/revenue-consolidated?ycx_mode=${mode}&job_id=${jobId}#ycx_mode=${mode}&job_id=${jobId}`;
    let workerWindow: Window | null = null;
    try {
        workerWindow = window.open(targetUrl, 'mwg_bi_worker');
    } catch (e) {
        console.warn('[BiAutoSync] Không mở được popup tab:', e);
    }

    return { jobId, workerWindow };
}
