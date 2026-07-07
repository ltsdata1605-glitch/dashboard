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

        sendStartJob(jobId, createdAt, { employees, fromDate, toDate });
        window.open(MWG_URL, '_blank');
    });

    return { jobId, promise };
}
