import { useCallback, useEffect, useRef, useState } from 'react';
import { Employee, BonusMetrics, BonusComparePart } from '../types/nhanVienTypes';
import { parseBonusBlock } from '../utils/bonusParser';
import { formatEmployeeName, extractEmployeeId } from '../utils/nhanVienHelpers';
import { detectUserscript } from '../utils/bonusBridge';
import { runSingleBonusJob } from '../utils/bonusJobRunner';
import { getYearMonthPlan, formatShortRange, DateRangeDDMMYYYY } from '../utils/bonusDateRange';

const STALL_WARNING_MS = 90_000;
// Nghỉ giữa các bước — dài hơn nghỉ giữa các nhân viên (700ms trong userscript), để
// không dội tải liên tục hệ thống MWG khi chạy trọn 1 năm.
const INTER_STEP_DELAY_MS = 3000;

export type MultiMonthStatus = 'idle' | 'detecting' | 'not-installed' | 'running' | 'done' | 'error';

/** Loại lượt chạy nhiều bước: 'year' = mỗi bước 1 tháng; 'compare' = 2 bước kỳ này/kỳ trước. */
export type MultiRunKind = 'year' | 'compare';

export interface MultiMonthProgress {
    kind: MultiRunKind;
    monthIndex: number;
    monthTotal: number;
    monthLabel: string;
    employeeDone: number;
    employeeTotal: number;
    currentEmployeeId?: string;
}

export interface MultiMonthMonthResult {
    /** Với 'year' là yyyymm; với 'compare' là 'current' | 'previous'. */
    yyyymm: string;
    label: string;
    total: number;
    successCount: number;
    /** Có giá trị khi cả bước lỗi hẳn (job-error) — bước bị thiếu hoàn toàn. */
    error?: string;
}

export interface MultiMonthSummary {
    kind: MultiRunKind;
    monthsTotal: number;
    monthsDone: number;
    stoppedEarly: boolean;
    monthResults: MultiMonthMonthResult[];
    /** Nhân viên tên không đúng khuôn "Tên - Mã NV" — bị loại khỏi TẤT CẢ các bước, không
     * chạy job cho họ. Trước đây bị bỏ qua âm thầm, không đối chiếu với tổng số nhân viên thật. */
    skippedNames: string[];
}

/** 1 bước của kế hoạch chạy tuần tự: 1 job (1 khoảng ngày) + cách ghi kết quả của riêng nó. */
interface SequentialStep {
    key: string;
    label: string;
    fromDate: string;
    toDate: string;
    save: (entries: { originalName: string; metrics: BonusMetrics }[]) => Promise<void>;
}

export interface ComparePeriodsInput {
    current: DateRangeDDMMYYYY;
    previous: DateRangeDDMMYYYY;
}

export interface UseMultiMonthBonusRunResult {
    status: MultiMonthStatus;
    progress: MultiMonthProgress | null;
    stalled: boolean;
    summary: MultiMonthSummary | null;
    errorMessage: string | null;
    startYear: (year: number) => void;
    /** So sánh cùng kỳ tháng: chạy KỲ NÀY trước (để bảng Tổng hợp cập nhật sớm) rồi KỲ TRƯỚC. */
    startCompare: (periods: ComparePeriodsInput) => void;
    /** B1a: chỉ có hiệu lực ở ranh giới bước — bước đang chạy vẫn hoàn tất bình thường. */
    stop: () => void;
    dismiss: () => void;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function makeRunId(): string {
    return (crypto as { randomUUID?: () => string }).randomUUID
        ? crypto.randomUUID()
        : `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Điều phối chạy NHIỀU JOB TUẦN TỰ (Phương án 1 — Dashboard lặp tuần tự, mỗi bước là 1 job
 * đơn y hệt luồng useBonusAutoBridge, KHÔNG cần sửa userscript). Mỗi bước gọi lại
 * runSingleBonusJob (mở tab MWG mới) rồi ghi qua hàm `save` riêng của bước đó:
 * - `startYear`: mỗi tháng 1 bước, ghi qua handleSaveBonusMonthly kèm nhãn tháng.
 * - `startCompare`: 2 bước [kỳ này, kỳ trước], ghi qua handleSaveBonusCompare cùng 1 runId.
 * 1 bước lỗi hẳn -> ghi nhận, chạy tiếp bước sau; "Dừng lại" chỉ có hiệu lực ở ranh giới
 * bước (xem rủi ro/quyết định B1a trong thiết kế đã duyệt).
 */
export function useMultiMonthBonusRun(
    allEmployees: Employee[],
    handleSaveBonusMonthly: (entries: { originalName: string; metrics: BonusMetrics }[], yyyymm: string) => Promise<void>,
    handleSaveBonusCompare: (
        entries: { originalName: string; metrics: BonusMetrics }[],
        part: BonusComparePart,
        range: DateRangeDDMMYYYY,
        runId: string,
    ) => Promise<void>,
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

    const runPlan = useCallback((kind: MultiRunKind, buildPlan: () => SequentialStep[]) => {
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

            const parsedEmployees = allEmployees.map(e => {
                const employeeId = extractEmployeeId(e.originalName) || extractEmployeeId(e.name);
                return { employeeId, originalName: e.originalName, displayName: formatEmployeeName(e.originalName) };
            });
            const jobEmployees = parsedEmployees.filter(e => e.employeeId);
            // Nhân viên không tìm thấy mã NV (dạng số) trước đây bị loại âm thầm, không
            // báo cho user biết N nhân viên nào đã bị bỏ qua suốt cả lượt chạy.
            const skippedNames = parsedEmployees.filter(e => !e.employeeId).map(e => e.originalName);

            if (jobEmployees.length === 0) {
                setStatus('error');
                setErrorMessage('Không xác định được mã NV nào từ danh sách nhân viên hiện tại.');
                return;
            }

            const plan = buildPlan();
            if (plan.length === 0) {
                setStatus('error');
                setErrorMessage(kind === 'year' ? 'Không có tháng nào để chạy trong năm đã chọn.' : 'Không có kỳ nào để chạy.');
                return;
            }

            setStatus('running');
            const monthResults: MultiMonthMonthResult[] = [];
            let stoppedEarly = false;

            for (let i = 0; i < plan.length; i++) {
                if (stopRequestedRef.current) { stoppedEarly = true; break; }
                const step = plan[i];
                setProgress({ kind, monthIndex: i, monthTotal: plan.length, monthLabel: step.label, employeeDone: 0, employeeTotal: jobEmployees.length });
                armStallTimer();

                const { promise } = runSingleBonusJob(
                    jobEmployees.map(({ employeeId, originalName, displayName }) => ({ employeeId, originalName, displayName })),
                    step.fromDate,
                    step.toDate,
                    (done, total, currentEmployeeId) => {
                        setStalled(false);
                        armStallTimer();
                        setProgress({ kind, monthIndex: i, monthTotal: plan.length, monthLabel: step.label, employeeDone: done, employeeTotal: total, currentEmployeeId });
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
                    if (toSave.length > 0) await step.save(toSave);

                    monthResults.push({ yyyymm: step.key, label: step.label, total: results.length + skippedNames.length, successCount: toSave.length });
                } catch (err) {
                    clearStallTimer();
                    monthResults.push({
                        yyyymm: step.key, label: step.label, total: 0, successCount: 0,
                        error: (err as Error).message || 'Lỗi không rõ',
                    });
                }

                if (i < plan.length - 1) {
                    if (stopRequestedRef.current) { stoppedEarly = true; break; }
                    await sleep(INTER_STEP_DELAY_MS);
                }
            }

            setStatus('done');
            setSummary({ kind, monthsTotal: plan.length, monthsDone: monthResults.length, stoppedEarly, monthResults, skippedNames });
        });
    }, [status, allEmployees, armStallTimer]);

    const startYear = useCallback((year: number) => {
        runPlan('year', () => getYearMonthPlan(year).map(m => ({
            key: m.yyyymm,
            label: m.label,
            fromDate: m.fromDate,
            toDate: m.toDate,
            save: entries => handleSaveBonusMonthly(entries, m.yyyymm),
        })));
    }, [runPlan, handleSaveBonusMonthly]);

    const startCompare = useCallback((periods: ComparePeriodsInput) => {
        const runId = makeRunId();
        const parts: { part: BonusComparePart; range: DateRangeDDMMYYYY; label: string }[] = [
            { part: 'current', range: periods.current, label: `Kỳ này ${formatShortRange(periods.current)}` },
            { part: 'previous', range: periods.previous, label: `Kỳ trước ${formatShortRange(periods.previous)}` },
        ];
        runPlan('compare', () => parts.map(({ part, range, label }) => ({
            key: part,
            label,
            fromDate: range.fromDate,
            toDate: range.toDate,
            save: entries => handleSaveBonusCompare(entries, part, range, runId),
        })));
    }, [runPlan, handleSaveBonusCompare]);

    const stop = useCallback(() => { stopRequestedRef.current = true; }, []);

    const dismiss = useCallback(() => {
        setStatus('idle');
        setSummary(null);
        setErrorMessage(null);
        setProgress(null);
        setStalled(false);
    }, []);

    return { status, progress, stalled, summary, errorMessage, startYear, startCompare, stop, dismiss };
}
