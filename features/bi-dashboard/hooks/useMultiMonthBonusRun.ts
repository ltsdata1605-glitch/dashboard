import { useCallback, useEffect, useRef, useState } from 'react';
import { Employee, BonusMetrics } from '../types/nhanVienTypes';
import { parseBonusBlock } from '../utils/bonusParser';
import { formatEmployeeName } from '../utils/nhanVienHelpers';
import { detectUserscript } from '../utils/bonusBridge';
import { runSingleBonusJob } from '../utils/bonusJobRunner';
import { getYearMonthPlan } from '../utils/bonusDateRange';

const STALL_WARNING_MS = 90_000;
// Nghỉ giữa các tháng — dài hơn nghỉ giữa các nhân viên (700ms trong userscript), để
// không dội tải liên tục hệ thống MWG khi chạy trọn 1 năm.
const INTER_MONTH_DELAY_MS = 3000;

export type MultiMonthStatus = 'idle' | 'detecting' | 'not-installed' | 'running' | 'done' | 'error';

export interface MultiMonthProgress {
    monthIndex: number;
    monthTotal: number;
    monthLabel: string;
    employeeDone: number;
    employeeTotal: number;
    currentEmployeeId?: string;
}

export interface MultiMonthMonthResult {
    yyyymm: string;
    label: string;
    total: number;
    successCount: number;
    /** Có giá trị khi cả tháng lỗi hẳn (job-error) — tháng bị thiếu hoàn toàn. */
    error?: string;
}

export interface MultiMonthSummary {
    monthsTotal: number;
    monthsDone: number;
    stoppedEarly: boolean;
    monthResults: MultiMonthMonthResult[];
}

export interface UseMultiMonthBonusRunResult {
    status: MultiMonthStatus;
    progress: MultiMonthProgress | null;
    stalled: boolean;
    summary: MultiMonthSummary | null;
    errorMessage: string | null;
    startYear: (year: number) => void;
    /** B1a: chỉ có hiệu lực ở ranh giới tháng — tháng đang chạy vẫn hoàn tất bình thường. */
    stop: () => void;
    dismiss: () => void;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Điều phối "chạy trọn 1 năm" (Phương án 1 — Dashboard lặp tuần tự, mỗi tháng là 1 job
 * đơn y hệt luồng useBonusAutoBridge, KHÔNG cần sửa userscript). Mỗi tháng gọi lại
 * runSingleBonusJob (mở tab MWG mới), ghi qua handleSaveBonusMonthly kèm nhãn tháng.
 * 1 tháng lỗi hẳn -> ghi nhận, chạy tiếp tháng sau; "Dừng lại" chỉ có hiệu lực ở ranh
 * giới tháng (xem rủi ro/quyết định B1a trong thiết kế đã duyệt).
 */
export function useMultiMonthBonusRun(
    allEmployees: Employee[],
    handleSaveBonusMonthly: (entries: { originalName: string; metrics: BonusMetrics }[], yyyymm: string) => Promise<void>,
): UseMultiMonthBonusRunResult {
    const [status, setStatus] = useState<MultiMonthStatus>('idle');
    const [progress, setProgress] = useState<MultiMonthProgress | null>(null);
    const [stalled, setStalled] = useState(false);
    const [summary, setSummary] = useState<MultiMonthSummary | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const stopRequestedRef = useRef(false);
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

    useEffect(() => () => clearStallTimer(), []);

    const startYear = useCallback((year: number) => {
        if (status === 'detecting' || status === 'running') return;

        stopRequestedRef.current = false;
        setStalled(false);
        setSummary(null);
        setErrorMessage(null);
        setStatus('detecting');

        detectUserscript(1000).then(async ({ installed }) => {
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

            const plan = getYearMonthPlan(year);
            if (plan.length === 0) {
                setStatus('error');
                setErrorMessage('Không có tháng nào để chạy trong năm đã chọn.');
                return;
            }

            setStatus('running');
            const monthResults: MultiMonthMonthResult[] = [];
            let stoppedEarly = false;

            for (let i = 0; i < plan.length; i++) {
                if (stopRequestedRef.current) { stoppedEarly = true; break; }
                const monthItem = plan[i];
                setProgress({ monthIndex: i, monthTotal: plan.length, monthLabel: monthItem.label, employeeDone: 0, employeeTotal: jobEmployees.length });
                armStallTimer();

                const { promise } = runSingleBonusJob(
                    jobEmployees.map(({ employeeId, originalName, displayName }) => ({ employeeId, originalName, displayName })),
                    monthItem.fromDate,
                    monthItem.toDate,
                    (done, total, currentEmployeeId) => {
                        setStalled(false);
                        armStallTimer();
                        setProgress({ monthIndex: i, monthTotal: plan.length, monthLabel: monthItem.label, employeeDone: done, employeeTotal: total, currentEmployeeId });
                    },
                );

                try {
                    const { results } = await promise;
                    clearStallTimer();

                    const toSave: { originalName: string; metrics: BonusMetrics }[] = [];
                    results.forEach(r => {
                        if (r.status !== 'ok') return;
                        const parsed = parseBonusBlock(r.tsv || '');
                        if (!('error' in parsed)) toSave.push({ originalName: r.originalName, metrics: parsed.metrics });
                    });
                    if (toSave.length > 0) await handleSaveBonusMonthly(toSave, monthItem.yyyymm);

                    monthResults.push({ yyyymm: monthItem.yyyymm, label: monthItem.label, total: results.length, successCount: toSave.length });
                } catch (err) {
                    clearStallTimer();
                    monthResults.push({
                        yyyymm: monthItem.yyyymm, label: monthItem.label, total: 0, successCount: 0,
                        error: (err as Error).message || 'Lỗi không rõ',
                    });
                }

                if (i < plan.length - 1) {
                    if (stopRequestedRef.current) { stoppedEarly = true; break; }
                    await sleep(INTER_MONTH_DELAY_MS);
                }
            }

            setStatus('done');
            setSummary({ monthsTotal: plan.length, monthsDone: monthResults.length, stoppedEarly, monthResults });
        });
    }, [status, allEmployees, handleSaveBonusMonthly, armStallTimer]);

    const stop = useCallback(() => { stopRequestedRef.current = true; }, []);

    const dismiss = useCallback(() => {
        setStatus('idle');
        setSummary(null);
        setErrorMessage(null);
        setProgress(null);
        setStalled(false);
    }, []);

    return { status, progress, stalled, summary, errorMessage, startYear, stop, dismiss };
}
