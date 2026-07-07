import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../../../../components/shared/ui/Button';
import { UseBonusAutoBridgeResult } from '../../../hooks/useBonusAutoBridge';
import { AutoBonusInstallGuideModal } from './AutoBonusInstallGuideModal';
import { AutoBonusErrorDetailModal } from './AutoBonusErrorDetailModal';
import { showAutoBonusResultToast, showAutoBonusErrorToast } from './AutoBonusToasts';

/**
 * Nút "Tự động" + trạng thái ngắn gọn cạnh nút "Cập nhật thưởng" (Thủ công).
 * Sở hữu luôn toàn bộ UI phụ trợ của chế độ Tự động: modal hướng dẫn cài đặt lần đầu,
 * toast kết quả (tự ẩn nếu 100% thành công, giữ nguyên + có "Xem chi tiết" nếu có lỗi
 * hoặc bị dừng giữa chừng), và modal chi tiết mở từ toast.
 */
export const AutoBonusPanel: React.FC<{ autoBridge: UseBonusAutoBridgeResult; onUseManual: () => void }> = ({ autoBridge, onUseManual }) => {
    const { status, progress, stalled, startAuto, summary, errorMessage, dismiss } = autoBridge;
    const isBusy = status === 'detecting' || status === 'running';
    const [showDetail, setShowDetail] = useState(false);

    // Chống bắn toast lặp lại nếu component re-render nhiều lần trong lúc status vẫn
    // đang ở 'done'/'error' (vd re-render do props khác đổi) — chỉ bắn đúng 1 lần mỗi lượt chạy.
    const firedRef = useRef<'done' | 'error' | null>(null);

    useEffect(() => {
        if (status === 'done' && firedRef.current !== 'done') {
            firedRef.current = 'done';
            if (summary) {
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
    }, [status, summary, errorMessage, dismiss]);

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                disabled={isBusy}
                onClick={startAuto}
                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-[11px] font-bold border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-all active:scale-95 disabled:opacity-60 disabled:active:scale-100"
            >
                <span>⚡ Tự động</span>
            </Button>
            {status === 'detecting' && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Đang kiểm tra tiện ích...</span>
            )}
            {status === 'running' && progress && (
                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold tabular-nums">
                    Đang chạy: {progress.done}/{progress.total}
                    {progress.currentEmployeeId ? ` (${progress.currentEmployeeId})` : ''}
                    {stalled ? ' — chưa có cập nhật mới, kiểm tra tab MWG đã đăng nhập/còn mở chưa' : ''}
                </span>
            )}

            <AutoBonusInstallGuideModal autoBridge={autoBridge} onUseManual={onUseManual} />
            <AutoBonusErrorDetailModal isOpen={showDetail} onClose={() => { setShowDetail(false); dismiss(); }} summary={summary} />
        </div>
    );
};

export default AutoBonusPanel;
