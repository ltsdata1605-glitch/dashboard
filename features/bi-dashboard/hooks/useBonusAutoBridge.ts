import { useCallback, useEffect, useRef, useState } from 'react';
import { Employee, BonusMetrics } from '../types/nhanVienTypes';
import { parseBonusBlock } from '../utils/bonusParser';
import { formatEmployeeName } from '../utils/nhanVienHelpers';
import { detectUserscript } from '../utils/bonusBridge';
import { runSingleBonusJob } from '../utils/bonusJobRunner';
import { getCurrentRangeDefault } from '../utils/bonusDateRange';

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

/** Khoảng ngày dd/mm/yyyy tuỳ chọn — do AutoBonusRangePickerModal tính sẵn (Hiện tại/Tháng/Khoảng thời gian). */
export interface BonusDateRangeInput {
    fromDate: string;
    toDate: string;
}

export interface UseBonusAutoBridgeResult {
    status: BonusAutoStatus;
    progress: { done: number; total: number; currentEmployeeId?: string } | null;
    stalled: boolean;
    summary: BonusAutoSummary | null;
    errorMessage: string | null;
    /** range bỏ trống -> dùng lại range gần nhất đã yêu cầu, hoặc mặc định "Hiện tại". */
    startAuto: (range?: BonusDateRangeInput) => void;
    dismiss: () => void;
}

/**
 * Điều phối chế độ "Tự động" cho 1 job đơn (1 khoảng ngày). Dò userscript, gửi job qua
 * bonusJobRunner, parse từng khối TSV bằng parseBonusBlock, rồi ghi hàng loạt qua
 * handleSaveBonusBatch. Không đụng tới luồng Thủ công (BonusDataModal) hiện có.
 * Chạy nhiều tháng liên tiếp (lựa chọn Năm) dùng useMultiMonthBonusRun.ts riêng, lặp
 * gọi runSingleBonusJob trực tiếp thay vì hook này.
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

    const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Giữ lại range vừa yêu cầu — để nút "Kiểm tra lại" trong AutoBonusInstallGuideModal
    // (gọi startAuto() không tham số khi retry sau khi cài xong userscript) chạy đúng
    // range người dùng đã chọn trong popup, thay vì rơi về mặc định "Hiện tại".
    const lastRangeRef = useRef<BonusDateRangeInput | null>(null);

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

    const startAuto = useCallback((range?: BonusDateRangeInput) => {
        if (status === 'detecting' || status === 'running') return; // chống bấm đúp khi job đang chạy
        if (range) lastRangeRef.current = range;

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

            const { fromDate, toDate } = lastRangeRef.current || getCurrentRangeDefault();

            setProgress({ done: 0, total: jobEmployees.length });
            setStatus('running');
            armStallTimer();

            const { promise } = runSingleBonusJob(
                jobEmployees.map(({ employeeId, originalName, displayName }) => ({ employeeId, originalName, displayName })),
                fromDate,
                toDate,
                (done, total, currentEmployeeId) => {
                    setStalled(false);
                    armStallTimer();
                    setProgress({ done, total, currentEmployeeId });
                },
            );

            promise.then(async ({ results, stoppedEarly }) => {
                clearStallTimer();

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

                setStatus('done');
                setSummary({ total: results.length, successCount: toSave.length, stoppedEarly, items });
            }).catch((err: Error) => {
                clearStallTimer();
                setStatus('error');
                setErrorMessage(err.message || 'Lỗi không rõ từ userscript');
            });
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
