import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../../../../components/shared/ui/Button';
import { UseBonusAutoBridgeResult } from '../../../hooks/useBonusAutoBridge';
import { UseMultiMonthBonusRunResult } from '../../../hooks/useMultiMonthBonusRun';
import { AutoBonusInstallGuideModal } from './AutoBonusInstallGuideModal';
import { AutoBonusErrorDetailModal } from './AutoBonusErrorDetailModal';
import { MultiMonthResultDetailModal } from './MultiMonthResultDetailModal';
import { AutoBonusRangePickerModal } from './AutoBonusRangePickerModal';
import { showAutoBonusResultToast, showAutoBonusErrorToast, showMultiMonthResultToast } from './AutoBonusToasts';

type PendingRetry = { type: 'single'; label: string } | { type: 'year'; year: number; label: string } | null;

/**
 * Nút "Tự động" + trạng thái ngắn gọn cạnh nút "Cập nhật thưởng" (Thủ công). Sở hữu
 * toàn bộ UI phụ trợ: popup "Chọn thời gian đổ thưởng" (Hiện tại/Tháng/Năm/Khoảng thời
 * gian), modal hướng dẫn cài đặt lần đầu (dùng chung cho cả job đơn lẫn chạy Năm), toast
 * kết quả của từng luồng, và modal chi tiết tương ứng. Khi chạy xong có ít nhất 1 kết quả
 * thành công, báo `onPeriodLabelChange` để BonusTab đổi tiêu đề báo cáo đúng theo kỳ vừa chọn.
 */
export const AutoBonusPanel: React.FC<{
    autoBridge: UseBonusAutoBridgeResult;
    multiMonthRun: UseMultiMonthBonusRunResult;
    employeeCount: number;
    onUseManual: () => void;
    onPeriodLabelChange: (label: string) => void;
}> = ({ autoBridge, multiMonthRun, employeeCount, onUseManual, onPeriodLabelChange }) => {
    const { status, progress, stalled, startAuto, summary, errorMessage, dismiss } = autoBridge;
    const {
        status: monthStatus, progress: monthProgress, stalled: monthStalled, startYear,
        summary: monthSummary, errorMessage: monthErrorMessage, dismiss: monthDismiss, stop: stopYear,
    } = multiMonthRun;

    const isBusy = status === 'detecting' || status === 'running' || monthStatus === 'detecting' || monthStatus === 'running';
    const [showPicker, setShowPicker] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showMonthDetail, setShowMonthDetail] = useState(false);
    // Nhớ lượt vừa yêu cầu (job đơn hay chạy Năm, năm nào) — để nút "Kiểm tra lại" trong
    // modal cài đặt biết gọi lại đúng luồng nào sau khi userscript đã được cài xong.
    const pendingRetryRef = useRef<PendingRetry>(null);

    // Chống bắn toast lặp lại nếu component re-render nhiều lần trong lúc status vẫn
    // đang ở 'done'/'error' — chỉ bắn đúng 1 lần mỗi lượt chạy. 2 ref riêng cho 2 luồng
    // độc lập (job đơn / chạy Năm) vì cả hai có thể lần lượt "done" trong cùng phiên.
    const firedRef = useRef<'done' | 'error' | null>(null);
    useEffect(() => {
        if (status === 'done' && firedRef.current !== 'done') {
            firedRef.current = 'done';
            if (summary) {
                if (summary.successCount > 0 && pendingRetryRef.current?.type === 'single') {
                    onPeriodLabelChange(pendingRetryRef.current.label);
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
    }, [status, summary, errorMessage, dismiss, onPeriodLabelChange]);

    const monthFiredRef = useRef<'done' | 'error' | null>(null);
    useEffect(() => {
        if (monthStatus === 'done' && monthFiredRef.current !== 'done') {
            monthFiredRef.current = 'done';
            if (monthSummary) {
                // Chỉ đổi tiêu đề nếu THÁNG HIỆN TẠI trong lượt Năm này thực sự thành công —
                // đây là tháng duy nhất handleSaveBonusMonthly có mirror sang bonus-data-*,
                // nên tiêu đề "NĂM ... LUỸ KẾ" chỉ đúng khi dữ liệu "hôm nay" cũng đã cập nhật.
                const now = new Date();
                const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const currentMonthResult = monthSummary.monthResults.find(m => m.yyyymm === currentYYYYMM);
                if (currentMonthResult && currentMonthResult.successCount > 0 && pendingRetryRef.current?.type === 'year') {
                    onPeriodLabelChange(pendingRetryRef.current.label);
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
    }, [monthStatus, monthSummary, monthErrorMessage, monthDismiss, onPeriodLabelChange]);

    const handleRunSingle = (range: { fromDate: string; toDate: string; label: string }) => {
        pendingRetryRef.current = { type: 'single', label: range.label };
        startAuto(range);
    };
    const handleRunYear = (year: number, label: string) => {
        pendingRetryRef.current = { type: 'year', year, label };
        startYear(year);
    };
    const handleRetry = () => {
        const pending = pendingRetryRef.current;
        if (pending?.type === 'year') startYear(pending.year);
        else startAuto();
    };

    const isNotInstalled = status === 'not-installed' || monthStatus === 'not-installed';
    const isDetecting = status === 'detecting' || monthStatus === 'detecting';

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                disabled={isBusy}
                onClick={() => setShowPicker(true)}
                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-[11px] font-bold border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-all active:scale-95 disabled:opacity-60 disabled:active:scale-100"
            >
                <span>⚡ Tự động</span>
            </Button>
            {isDetecting && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Đang kiểm tra tiện ích...</span>
            )}
            {status === 'running' && progress && (
                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold tabular-nums">
                    Đang chạy: {progress.done}/{progress.total}
                    {progress.currentEmployeeId ? ` (${progress.currentEmployeeId})` : ''}
                    {stalled ? ' — chưa có cập nhật mới, kiểm tra tab MWG đã đăng nhập/còn mở chưa' : ''}
                </span>
            )}
            {monthStatus === 'running' && monthProgress && (
                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold tabular-nums flex items-center gap-2">
                    <span>
                        Tháng {monthProgress.monthIndex + 1}/{monthProgress.monthTotal} ({monthProgress.monthLabel}) — nhân viên {monthProgress.employeeDone}/{monthProgress.employeeTotal}
                        {monthStalled ? ' — chưa có cập nhật mới, kiểm tra tab MWG đã đăng nhập/còn mở chưa' : ''}
                    </span>
                    <Button variant="ghost" onClick={stopYear} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit text-rose-600 dark:text-rose-400 hover:underline font-bold">Dừng lại</Button>
                </span>
            )}

            <AutoBonusRangePickerModal
                isOpen={showPicker}
                onClose={() => setShowPicker(false)}
                employeeCount={employeeCount}
                onRunSingle={handleRunSingle}
                onRunYear={handleRunYear}
            />
            <AutoBonusInstallGuideModal
                isNotInstalled={isNotInstalled}
                isDetecting={isDetecting}
                onRetry={handleRetry}
                onDismiss={() => { dismiss(); monthDismiss(); }}
                onUseManual={onUseManual}
            />
            <AutoBonusErrorDetailModal isOpen={showDetail} onClose={() => { setShowDetail(false); dismiss(); }} summary={summary} />
            <MultiMonthResultDetailModal isOpen={showMonthDetail} onClose={() => { setShowMonthDetail(false); monthDismiss(); }} summary={monthSummary} />
        </div>
    );
};

export default AutoBonusPanel;
