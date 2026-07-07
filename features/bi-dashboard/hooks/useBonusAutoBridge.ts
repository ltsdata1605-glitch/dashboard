import { useCallback, useEffect, useRef, useState } from 'react';
import { Employee, BonusMetrics } from '../types/nhanVienTypes';
import { parseBonusBlock } from '../utils/bonusParser';
import { formatEmployeeName } from '../utils/nhanVienHelpers';
import {
    detectUserscript,
    sendStartJob,
    onProgress,
    onJobDone,
    onJobError,
    BridgeJobResultItem,
} from '../utils/bonusBridge';

const MWG_URL = 'https://newinsite.thegioididong.com/office/thuong-nhan-vien';
const STALL_WARNING_MS = 90_000;

export type BonusAutoStatus = 'idle' | 'detecting' | 'not-installed' | 'running' | 'done' | 'error';

export interface BonusAutoResultItem {
    originalName: string;
    employeeId: string;
    status: 'ok' | 'error';
    /** Điểm thực lãnh dòng Tổng cộng — chỉ có khi status === 'ok'. */
    diemThucLanh?: number | null;
    /** Lý do lỗi — chỉ có khi status === 'error'. */
    reason?: string;
}

export interface BonusAutoSummary {
    total: number;
    successCount: number;
    stoppedEarly: boolean;
    items: BonusAutoResultItem[];
}

export interface UseBonusAutoBridgeResult {
    status: BonusAutoStatus;
    progress: { done: number; total: number; currentEmployeeId?: string } | null;
    stalled: boolean;
    summary: BonusAutoSummary | null;
    errorMessage: string | null;
    startAuto: () => void;
    dismiss: () => void;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toDDMMYYYY = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

function computeDefaultRange(): { fromDate: string; toDate: string } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    let to = new Date(now);
    to.setDate(to.getDate() - 1);
    if (to < from) to = from; // ngày 1 đầu tháng: "hôm qua" thuộc tháng trước -> dùng luôn ngày 1
    return { fromDate: toDDMMYYYY(from), toDate: toDDMMYYYY(to) };
}

/**
 * Điều phối chế độ "Tự động": dò userscript, gửi job, nhận tiến độ/kết quả qua
 * bonusBridge, parse từng khối TSV bằng parseBonusBlock, rồi ghi hàng loạt qua
 * handleSaveBonusBatch. Không đụng tới luồng Thủ công (BonusDataModal) hiện có.
 */
export function useBonusAutoBridge(
    allEmployees: Employee[],
    handleSaveBonusBatch: (entries: { originalName: string; metrics: BonusMetrics }[]) => Promise<void>,
): UseBonusAutoBridgeResult {
    const [status, setStatus] = useState<BonusAutoStatus>('idle');
    const [progress, setProgress] = useState<{ done: number; total: number; currentEmployeeId?: string } | null>(null);
    const [stalled, setStalled] = useState(false);
    const [summary, setSummary] = useState<BonusAutoSummary | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const activeJobIdRef = useRef<string | null>(null);
    const unsubscribeRef = useRef<(() => void)[]>([]);
    const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearStallTimer = () => {
        if (stallTimerRef.current) {
            clearTimeout(stallTimerRef.current);
            stallTimerRef.current = null;
        }
    };

    const armStallTimer = useCallback(() => {
        clearStallTimer();
        stallTimerRef.current = setTimeout(() => setStalled(true), STALL_WARNING_MS);
    }, []);

    const cleanupSubscriptions = () => {
        unsubscribeRef.current.forEach(unsub => unsub());
        unsubscribeRef.current = [];
        clearStallTimer();
    };

    useEffect(() => () => cleanupSubscriptions(), []);

    const startAuto = useCallback(() => {
        if (status === 'detecting' || status === 'running') return; // chống bấm đúp khi job đang chạy

        cleanupSubscriptions();
        setStalled(false);
        setSummary(null);
        setErrorMessage(null);
        setStatus('detecting');

        detectUserscript(1000).then(({ installed }) => {
            if (!installed) {
                setStatus('not-installed');
                return;
            }

            const jobEmployees = allEmployees
                .map(e => {
                    const employeeId = e.originalName.split(' - ')[1]?.trim() || '';
                    return { employeeId, originalName: e.originalName, displayName: formatEmployeeName(e.originalName) };
                })
                .filter(e => e.employeeId);

            if (jobEmployees.length === 0) {
                setStatus('error');
                setErrorMessage('Không xác định được mã NV nào từ danh sách nhân viên hiện tại.');
                return;
            }

            const jobId = (crypto as { randomUUID?: () => string }).randomUUID
                ? crypto.randomUUID()
                : `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const createdAt = Date.now();
            const { fromDate, toDate } = computeDefaultRange();

            activeJobIdRef.current = jobId;
            setProgress({ done: 0, total: jobEmployees.length });
            setStatus('running');
            armStallTimer();

            const finishWithResults = async (results: BridgeJobResultItem[], stoppedEarly: boolean) => {
                const toSave: { originalName: string; metrics: BonusMetrics }[] = [];
                const items: BonusAutoResultItem[] = [];

                results.forEach(r => {
                    if (r.status === 'error') {
                        items.push({ originalName: r.originalName, employeeId: r.employeeId, status: 'error', reason: r.error || 'Lỗi không rõ' });
                        return;
                    }
                    const parsed = parseBonusBlock(r.tsv || '');
                    if ('error' in parsed) {
                        items.push({ originalName: r.originalName, employeeId: r.employeeId, status: 'error', reason: parsed.error });
                    } else {
                        toSave.push({ originalName: r.originalName, metrics: parsed.metrics });
                        items.push({ originalName: r.originalName, employeeId: r.employeeId, status: 'ok', diemThucLanh: r.diemThucLanh ?? parsed.metrics.tong });
                    }
                });

                if (toSave.length > 0) await handleSaveBonusBatch(toSave);

                cleanupSubscriptions();
                setStatus('done');
                setSummary({ total: results.length, successCount: toSave.length, stoppedEarly, items });
            };

            const unsubProgress = onProgress(detail => {
                if (detail.jobId !== activeJobIdRef.current) return;
                setStalled(false);
                armStallTimer();
                setProgress({ done: detail.done, total: detail.total, currentEmployeeId: detail.currentEmployeeId });
            });

            const unsubDone = onJobDone(detail => {
                if (detail.jobId !== activeJobIdRef.current) return;
                // Null ngay (đồng bộ) trước khi xử lý async — chống trường hợp
                // GM_addValueChangeListener + poll dự phòng cùng bắn sự kiện job-done
                // trùng nhau, có thể khiến handleSaveBonusBatch chạy 2 lần.
                activeJobIdRef.current = null;
                void finishWithResults(detail.results, !!detail.stoppedEarly);
            });

            const unsubError = onJobError(detail => {
                if (detail.jobId !== activeJobIdRef.current) return;
                cleanupSubscriptions();
                activeJobIdRef.current = null;
                setStatus('error');
                setErrorMessage(detail.message);
            });

            unsubscribeRef.current = [unsubProgress, unsubDone, unsubError];

            sendStartJob(jobId, createdAt, {
                employees: jobEmployees.map(({ employeeId, originalName, displayName }) => ({ employeeId, originalName, displayName })),
                fromDate,
                toDate,
            });
            window.open(MWG_URL, '_blank');
        });
    }, [status, allEmployees, handleSaveBonusBatch, armStallTimer]);

    const dismiss = useCallback(() => {
        setStatus('idle');
        setSummary(null);
        setErrorMessage(null);
        setProgress(null);
        setStalled(false);
    }, []);

    return { status, progress, stalled, summary, errorMessage, startAuto, dismiss };
}
