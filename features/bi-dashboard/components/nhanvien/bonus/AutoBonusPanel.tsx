import React, { useEffect, useState } from 'react';
import { Button } from '../../../../../components/shared/ui/Button';
import { UseBonusAutoBridgeResult, BonusAutoStatus } from '../../../hooks/useBonusAutoBridge';
import { UseMultiMonthBonusRunResult, MultiMonthStatus, MultiMonthProgress } from '../../../hooks/useMultiMonthBonusRun';

export interface AutoBonusPanelProps {
    autoBridge?: UseBonusAutoBridgeResult;
    multiMonthRun?: UseMultiMonthBonusRunResult;
    employeeCount?: number;
    onUseManual?: () => void;
    onPeriodLabelChange?: (label: string) => void;
    onCompareDone?: () => void;
}

/**
 * Thanh trạng thái + nút bấm "⚡ Tự động" hiển thị bên cạnh "Cập nhật thưởng" trong BonusTab.
 * Toàn bộ logic chạy nền và modal đã được nâng cấp tập trung tại GlobalAutoBonusManager (toàn cục),
 * giúp tính năng hoạt động xuyên suốt ở mọi trang/tab mà không cần chuyển màn hình.
 */
export const AutoBonusPanel: React.FC<AutoBonusPanelProps> = ({
    onUseManual,
    onPeriodLabelChange,
    onCompareDone,
}) => {
    const [state, setState] = useState<{
        isBusy: boolean;
        status: BonusAutoStatus;
        progress: { done: number; total: number; currentEmployeeId?: string } | null;
        monthStatus: MultiMonthStatus;
        monthProgress: MultiMonthProgress | null;
        canResume?: boolean;
        resumeInfo?: { label: string; remainingCount: number } | null;
    }>({
        isBusy: false,
        status: 'idle',
        progress: null,
        monthStatus: 'idle',
        monthProgress: null,
        canResume: false,
        resumeInfo: null,
    });

    useEffect(() => {
        const handleStatus = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail) {
                setState({
                    isBusy: !!detail.isBusy,
                    status: detail.status || 'idle',
                    progress: detail.progress || null,
                    monthStatus: detail.monthStatus || 'idle',
                    monthProgress: detail.monthProgress || null,
                    canResume: detail.canResume,
                    resumeInfo: detail.resumeInfo || null,
                });
            }
        };

        const handleCompare = () => {
            onCompareDone?.();
        };

        const handleLabel = (e: Event) => {
            const label = (e as CustomEvent).detail?.label;
            if (label && onPeriodLabelChange) {
                onPeriodLabelChange(label);
            }
        };

        const handleManual = () => {
            onUseManual?.();
        };

        window.addEventListener('ycx-auto-bonus-status-changed', handleStatus);
        window.addEventListener('ycx-auto-bonus-compare-done', handleCompare);
        window.addEventListener('ycx-auto-bonus-period-label-changed', handleLabel);
        window.addEventListener('ycx-open-manual-bonus', handleManual);

        return () => {
            window.removeEventListener('ycx-auto-bonus-status-changed', handleStatus);
            window.removeEventListener('ycx-auto-bonus-compare-done', handleCompare);
            window.removeEventListener('ycx-auto-bonus-period-label-changed', handleLabel);
            window.removeEventListener('ycx-open-manual-bonus', handleManual);
        };
    }, [onCompareDone, onPeriodLabelChange, onUseManual]);

    const handleTrigger = () => {
        window.dispatchEvent(new CustomEvent('ycx-trigger-auto-bonus'));
    };

    const handleResume = () => {
        window.dispatchEvent(new CustomEvent('ycx-resume-auto-bonus'));
    };

    const handleStop = () => {
        window.dispatchEvent(new CustomEvent('ycx-stop-auto-bonus'));
    };

    const { isBusy, status, progress, monthStatus, monthProgress, canResume, resumeInfo } = state;
    const isDetecting = status === 'detecting' || monthStatus === 'detecting';

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="unstyled" size="none"
                disabled={isBusy}
                onClick={handleTrigger}
                className="inline-flex items-center gap-1.5 h-7.5 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded-md transition-all active:scale-95 disabled:opacity-60 disabled:active:scale-100 shrink-0"
            >
                <span>⚡ Tự động</span>
            </Button>
            {!isBusy && canResume && resumeInfo && (
                <Button
                    variant="unstyled" size="none"
                    onClick={handleResume}
                    title={resumeInfo.label}
                    className="inline-flex items-center gap-1.5 h-7.5 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-md transition-all active:scale-95 shrink-0"
                >
                    <span>▶ Tiếp tục ({resumeInfo.remainingCount} tháng)</span>
                </Button>
            )}
            {isDetecting && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Đang kiểm tra tiện ích...</span>
            )}
            {status === 'running' && progress && (
                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold tabular-nums">
                    Đang chạy: {progress.done}/{progress.total}
                    {progress.currentEmployeeId ? ` (${progress.currentEmployeeId})` : ''}
                </span>
            )}
            {monthStatus === 'running' && monthProgress && (
                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold tabular-nums flex items-center gap-2">
                    <span>
                        {monthProgress.kind === 'compare' ? 'Kỳ' : 'Tháng'} {monthProgress.monthIndex + 1}/{monthProgress.monthTotal} ({monthProgress.monthLabel}) — nhân viên {monthProgress.employeeDone}/{monthProgress.employeeTotal}
                    </span>
                    <Button variant="unstyled" size="none" onClick={handleStop} className="text-rose-600 dark:text-rose-400 hover:underline font-bold">Dừng lại</Button>
                </span>
            )}
        </div>
    );
};

export default AutoBonusPanel;
