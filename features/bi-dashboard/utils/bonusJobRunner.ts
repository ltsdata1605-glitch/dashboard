/**
 * Lớp gọi bridge dùng chung cho 1 job "thu thập điểm thưởng" (mở tab MWG mới, chờ kết
 * quả). Tách khỏi useBonusAutoBridge.ts để useMultiMonthBonusRun.ts (chạy Năm — lặp
 * tuần tự nhiều job, mỗi job 1 tháng) dùng lại được, không phải copy lại logic bridge.
 */
import { BridgeEmployeeRequest, BridgeJobResultItem, sendStartJob, onProgress, onJobDone, onJobError } from './bonusBridge';

const MWG_URL = 'https://newinsite.thegioididong.com/office/thuong-nhan-vien';

function makeJobId(): string {
    return (crypto as { randomUUID?: () => string }).randomUUID
        ? crypto.randomUUID()
        : `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface RunBonusJobResult {
    results: BridgeJobResultItem[];
    stoppedEarly: boolean;
}

export interface RunBonusJobHandle {
    jobId: string;
    promise: Promise<RunBonusJobResult>;
}

let currentWorkerWindow: Window | null = null;

export function reopenWorkerTab(): Window | null {
    try {
        currentWorkerWindow = window.open(MWG_URL, 'mwg_bonus_worker');
        return currentWorkerWindow;
    } catch (e) {
        console.warn('[bonusJobRunner] Không thể mở tab MWG:', e);
        return null;
    }
}

/**
 * Gửi 1 job tới userscript đang chạy trên trang này (giả định đã dò `detectUserscript`
 * thành công trước đó) và mở tab MWG mới. Promise resolve khi nhận job-done, reject khi
 * nhận job-error. Tự dọn listener ngay khi nhận được kết quả đầu tiên khớp jobId — nhờ
 * vậy nếu GM_addValueChangeListener và poll dự phòng cùng bắn trùng 1 lần job-done,
 * lượt thứ 2 không còn listener nào để xử lý (chống ghi dữ liệu 2 lần).
 */
export function runSingleBonusJob(
    employees: BridgeEmployeeRequest[],
    fromDate: string,
    toDate: string,
    onProgressTick?: (done: number, total: number, currentEmployeeId?: string) => void,
    meta?: {
        multiStep?: boolean;
        isLastStep?: boolean;
        stepIndex?: number;
        stepTotal?: number;
        stepLabel?: string;
        isFirstStep?: boolean;
    },
): RunBonusJobHandle {
    const jobId = makeJobId();
    const createdAt = Date.now();

    const promise = new Promise<RunBonusJobResult>((resolve, reject) => {
        const unsubs: (() => void)[] = [];
        const cleanup = () => { unsubs.forEach(u => u()); unsubs.length = 0; };

        unsubs.push(onProgress(detail => {
            if (detail.jobId !== jobId) return;
            onProgressTick?.(detail.done, detail.total, detail.currentEmployeeId);
        }));
        unsubs.push(onJobDone(detail => {
            if (detail.jobId !== jobId) return;
            cleanup();
            resolve({ results: detail.results, stoppedEarly: !!detail.stoppedEarly });
        }));
        unsubs.push(onJobError(detail => {
            if (detail.jobId !== jobId) return;
            cleanup();
            reject(new Error(detail.message));
        }));

        sendStartJob(jobId, createdAt, {
            employees,
            fromDate,
            toDate,
            multiStep: meta?.multiStep,
            isLastStep: meta?.isLastStep,
            stepIndex: meta?.stepIndex,
            stepTotal: meta?.stepTotal,
            stepLabel: meta?.stepLabel,
        });

        // Chỉ mở tab mới ở bước đầu tiên hoặc khi chưa có tab đang mở.
        // Các bước tiếp theo trong chuỗi chạy Năm/So sánh sẽ tái sử dụng tab đang mở qua GM storage,
        // ngăn chặn 100% việc trình duyệt chặn popup do không có thao tác click trực tiếp.
        const shouldOpenWindow = meta?.isFirstStep ?? (!meta?.multiStep || !currentWorkerWindow || currentWorkerWindow.closed);
        if (shouldOpenWindow) {
            reopenWorkerTab();
        }
    });

    return { jobId, promise };
}
