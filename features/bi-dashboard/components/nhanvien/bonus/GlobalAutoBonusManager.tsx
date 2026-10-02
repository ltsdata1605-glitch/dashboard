import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBonusAutoBridge, BonusAutoStatus } from '../../../hooks/useBonusAutoBridge';
import { useMultiMonthBonusRun, MultiMonthStatus, ComparePeriodsInput } from '../../../hooks/useMultiMonthBonusRun';
import { AutoBonusInstallGuideModal } from './AutoBonusInstallGuideModal';
import { AutoBonusErrorDetailModal } from './AutoBonusErrorDetailModal';
import { MultiMonthResultDetailModal } from './MultiMonthResultDetailModal';
import { AutoBonusRangePickerModal } from './AutoBonusRangePickerModal';
import { showAutoBonusResultToast, showAutoBonusErrorToast, showMultiMonthResultToast } from './AutoBonusToasts';
import { getCurrentRangeDefault, DateRangeDDMMYYYY } from '../../../utils/bonusDateRange';
import {
    getGlobalBonusEmployees,
    saveBonusBatchGlobal,
    saveBonusMonthlyGlobal,
    saveBonusCompareGlobal,
    saveBonusPeriodLabelGlobal,
    GlobalBonusEmployeesResult,
} from '../../../services/globalBonusService';
import { BonusMetrics, BonusComparePart, Employee } from '../../../types/nhanVienTypes';

type PendingRetry =
    | { type: 'single'; label: string }
    | { type: 'year'; year: number; label: string }
    | { type: 'compare'; periods: ComparePeriodsInput; label: string }
    | null;

/**
 * Trình điều phối Tự động Đổ Thưởng TOÀN CỤC.
 * Luôn được mount tại App/GlobalAutoSyncDock để có thể nhận lệnh và chạy ở MỌI NƠI,
 * trên MỌI TRANG/TAB mà không cần người dùng phải chuyển về tab Thưởng.
 */
export const GlobalAutoBonusManager: React.FC = () => {
    const [employeeState, setEmployeeState] = useState<GlobalBonusEmployeesResult>({
        employees: [],
        supermarkets: [],
        employeeSupermarketMap: {},
    });

    const refreshEmployees = useCallback(async () => {
        try {
            const data = await getGlobalBonusEmployees();
            setEmployeeState(data);
        } catch (e) {
            console.warn('[GlobalAutoBonusManager] Lỗi nạp nhân viên:', e);
        }
    }, []);

    useEffect(() => {
        void refreshEmployees();
        const handleRefresh = () => { void refreshEmployees(); };
        window.addEventListener('analysis-employees-updated', handleRefresh);
        window.addEventListener('indexeddb-change', handleRefresh);
        window.addEventListener('bi-supermarket-map-changed', handleRefresh);
        return () => {
            window.removeEventListener('analysis-employees-updated', handleRefresh);
            window.removeEventListener('indexeddb-change', handleRefresh);
            window.removeEventListener('bi-supermarket-map-changed', handleRefresh);
        };
    }, [refreshEmployees]);

    const defaultSupermarket = employeeState.supermarkets[0] || 'Tổng';

    const handleSaveBatch = useCallback(async (entries: { originalName: string; metrics: BonusMetrics }[]) => {
        await saveBonusBatchGlobal(entries, employeeState.employeeSupermarketMap, defaultSupermarket);
    }, [employeeState.employeeSupermarketMap, defaultSupermarket]);

    const handleSaveMonthly = useCallback(async (entries: { originalName: string; metrics: BonusMetrics }[], yyyymm: string) => {
        await saveBonusMonthlyGlobal(entries, yyyymm, employeeState.employeeSupermarketMap, defaultSupermarket);
    }, [employeeState.employeeSupermarketMap, defaultSupermarket]);

    const handleSaveCompare = useCallback(async (
        entries: { originalName: string; metrics: BonusMetrics }[],
        part: BonusComparePart,
        range: DateRangeDDMMYYYY,
        runId: string,
    ) => {
        await saveBonusCompareGlobal(entries, part, range, runId, employeeState.employeeSupermarketMap, defaultSupermarket);
    }, [employeeState.employeeSupermarketMap, defaultSupermarket]);

    const handlePeriodLabelChange = useCallback(async (label: string) => {
        await saveBonusPeriodLabelGlobal(label, employeeState.supermarkets, defaultSupermarket);
    }, [employeeState.supermarkets, defaultSupermarket]);

    // Khởi tạo các bridge thực thi
    const autoBridge = useBonusAutoBridge(employeeState.employees, handleSaveBatch);
    const multiMonthRun = useMultiMonthBonusRun(employeeState.employees, handleSaveMonthly, handleSaveCompare);

    const { status, progress, stalled, startAuto, summary, errorMessage, dismiss } = autoBridge;
    const {
        status: monthStatus, progress: monthProgress, stalled: monthStalled, startYear, startCompare,
        summary: monthSummary, errorMessage: monthErrorMessage, dismiss: monthDismiss, stop: stopYear,
        resume, canResume, resumeInfo,
    } = multiMonthRun;

    const isBusy = status === 'detecting' || status === 'running' || monthStatus === 'detecting' || monthStatus === 'running';

    const [showPicker, setShowPicker] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showMonthDetail, setShowMonthDetail] = useState(false);
    const pendingRetryRef = useRef<PendingRetry>(null);

    const isBusyRef = useRef(isBusy);
    isBusyRef.current = isBusy;

    const handleRunSingle = useCallback((range: { fromDate: string; toDate: string; label: string }) => {
        pendingRetryRef.current = { type: 'single', label: range.label };
        startAuto(range);
    }, [startAuto]);

    const handleRunSingleRef = useRef(handleRunSingle);
    handleRunSingleRef.current = handleRunSingle;

    const handleRunYear = useCallback((year: number, label: string, fromMonthIndex0?: number, toMonthIndex0?: number) => {
        pendingRetryRef.current = { type: 'year', year, label };
        startYear(year, fromMonthIndex0, toMonthIndex0);
    }, [startYear]);

    const handleRunCompare = useCallback((periods: ComparePeriodsInput, label: string) => {
        pendingRetryRef.current = { type: 'compare', periods, label };
        startCompare(periods);
    }, [startCompare]);

    const handleRetry = useCallback(() => {
        const pending = pendingRetryRef.current;
        if (pending?.type === 'year') startYear(pending.year);
        else if (pending?.type === 'compare') startCompare(pending.periods);
        else startAuto();
    }, [startYear, startCompare, startAuto]);

    // Lắng nghe sự kiện kích hoạt từ Dock, BonusTab, hoặc Hẹn giờ
    useEffect(() => {
        const handleTrigger = (e: Event) => {
            void refreshEmployees();
            if ((e as CustomEvent).detail?.auto) {
                window.dispatchEvent(new CustomEvent('ycx-auto-bonus-trigger-ack'));
                if (isBusyRef.current) return;
                const r = getCurrentRangeDefault();
                const [d, m] = r.toDate.split('/').map(Number);
                handleRunSingleRef.current({ fromDate: r.fromDate, toDate: r.toDate, label: `ĐẾN NGÀY ${d}/${m}` });
                return;
            }
            setShowPicker(true);
        };

        const handleStop = () => {
            stopYear();
        };

        const handleResume = () => {
            resume();
        };

        window.addEventListener('ycx-trigger-auto-bonus', handleTrigger);
        window.addEventListener('ycx-stop-auto-bonus', handleStop);
        window.addEventListener('ycx-resume-auto-bonus', handleResume);
        return () => {
            window.removeEventListener('ycx-trigger-auto-bonus', handleTrigger);
            window.removeEventListener('ycx-stop-auto-bonus', handleStop);
            window.removeEventListener('ycx-resume-auto-bonus', handleResume);
        };
    }, [refreshEmployees, stopYear, resume]);

    // Bắn sự kiện cập nhật trạng thái tiến trình đổ thưởng để khung AUTO SYNC dock và BonusTab hiển thị
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('ycx-auto-bonus-status-changed', {
            detail: { isBusy, status, progress, monthStatus, monthProgress, canResume, resumeInfo }
        }));
    }, [isBusy, status, progress, monthStatus, monthProgress, canResume, resumeInfo]);

    // Toasts và kết quả cho Single job
    const firedRef = useRef<'done' | 'error' | null>(null);
    useEffect(() => {
        if (status === 'done' && firedRef.current !== 'done') {
            firedRef.current = 'done';
            if (summary) {
                if (summary.successCount > 0 && pendingRetryRef.current?.type === 'single') {
                    void handlePeriodLabelChange(pendingRetryRef.current.label);
                }
                showAutoBonusResultToast(summary, {
                    onViewDetail: () => setShowDetail(true),
                    onDismissed: () => dismiss(),
                });
            }
        } else if (status === 'error' && firedRef.current !== 'error') {
            firedRef.current = 'error';
            showAutoBonusErrorToast(errorMessage || 'Chế độ Tự động gặp lỗi không xác định.', () => dismiss());
        } else if (status !== 'done' && status !== 'error') {
            firedRef.current = null;
        }
    }, [status, summary, errorMessage, dismiss, handlePeriodLabelChange]);

    // Toasts và kết quả cho MultiMonth (Năm hoặc So sánh)
    const monthFiredRef = useRef<'done' | 'error' | null>(null);
    useEffect(() => {
        if (monthStatus === 'done' && monthFiredRef.current !== 'done') {
            monthFiredRef.current = 'done';
            if (monthSummary) {
                const now = new Date();
                const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const currentMonthResult = monthSummary.monthResults.find(m => m.yyyymm === currentYYYYMM);
                if (currentMonthResult && currentMonthResult.successCount > 0 && pendingRetryRef.current?.type === 'year') {
                    void handlePeriodLabelChange(pendingRetryRef.current.label);
                }
                if (monthSummary.kind === 'compare' && pendingRetryRef.current?.type === 'compare') {
                    const bothOk = monthSummary.monthResults.length === 2 && monthSummary.monthResults.every(m => m.successCount > 0);
                    if (bothOk) {
                        void handlePeriodLabelChange(pendingRetryRef.current.label);
                        window.dispatchEvent(new CustomEvent('ycx-auto-bonus-compare-done'));
                    }
                }
                showMultiMonthResultToast(monthSummary, {
                    onViewDetail: () => setShowMonthDetail(true),
                    onDismissed: () => monthDismiss(),
                });
            }
        } else if (monthStatus === 'error' && monthFiredRef.current !== 'error') {
            monthFiredRef.current = 'error';
            showAutoBonusErrorToast(monthErrorMessage || 'Chạy Năm gặp lỗi không xác định.', () => monthDismiss());
        } else if (monthStatus !== 'done' && monthStatus !== 'error') {
            monthFiredRef.current = null;
        }
    }, [monthStatus, monthSummary, monthErrorMessage, monthDismiss, handlePeriodLabelChange]);

    const isNotInstalled = status === 'not-installed' || monthStatus === 'not-installed';
    const isDetecting = status === 'detecting' || monthStatus === 'detecting';

    return (
        <>
            <AutoBonusRangePickerModal
                isOpen={showPicker}
                onClose={() => setShowPicker(false)}
                employeeCount={employeeState.employees.length}
                onRunSingle={handleRunSingle}
                onRunYear={handleRunYear}
                onRunCompare={handleRunCompare}
                canResume={canResume}
                resumeInfo={resumeInfo}
                onResume={resume}
            />
            <AutoBonusInstallGuideModal
                isNotInstalled={isNotInstalled}
                isDetecting={isDetecting}
                onRetry={handleRetry}
                onDismiss={() => { dismiss(); monthDismiss(); }}
                onUseManual={() => {
                    dismiss();
                    monthDismiss();
                    window.dispatchEvent(new CustomEvent('ycx-open-manual-bonus'));
                }}
            />
            <AutoBonusErrorDetailModal
                isOpen={showDetail}
                onClose={() => { setShowDetail(false); dismiss(); }}
                summary={summary}
            />
            <MultiMonthResultDetailModal
                isOpen={showMonthDetail}
                onClose={() => { setShowMonthDetail(false); monthDismiss(); }}
                summary={monthSummary}
                resumeInfo={resumeInfo}
                onResume={resume}
            />
        </>
    );
};

export default GlobalAutoBonusManager;
