import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { BonusAutoSummary } from '../../../hooks/useBonusAutoBridge';

const SUCCESS_DURATION_MS = 5000;
const TOAST_ID = 'ycx-auto-bonus-result';
// duration lớn để react-hot-toast không tự âm thầm dismiss theo timer riêng của nó —
// việc dismiss thật sự do chính component bên dưới điều khiển (để hover-pause chuẩn xác).
const LONG_DURATION_MS = 24 * 60 * 60 * 1000;

const SuccessToastBody: React.FC<{ id: string; total: number; onExpire: () => void }> = ({ id, total, onExpire }) => {
    const [remaining, setRemaining] = useState(SUCCESS_DURATION_MS);
    const [paused, setPaused] = useState(false);
    const [mounted, setMounted] = useState(false);
    const startRef = useRef(Date.now());
    const percentAtPauseRef = useRef(100);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        if (paused) return;
        startRef.current = Date.now();
        const timer = setTimeout(() => { toast.dismiss(id); onExpire(); }, remaining);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paused]);

    const handleEnter = () => {
        const elapsed = Date.now() - startRef.current;
        const left = Math.max(0, remaining - elapsed);
        percentAtPauseRef.current = (left / SUCCESS_DURATION_MS) * 100;
        setRemaining(left);
        setPaused(true);
    };
    const handleLeave = () => setPaused(false);

    return (
        <div
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            className="w-80 rounded-xl shadow-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 px-4 py-3 overflow-hidden"
        >
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">✅ {total}/{total} nhân viên cập nhật thành công</p>
            <div className="h-1 bg-emerald-100 dark:bg-emerald-900/40 rounded-full mt-2 overflow-hidden">
                <div
                    className="h-full bg-emerald-500 dark:bg-emerald-400"
                    style={
                        paused
                            ? { width: `${percentAtPauseRef.current}%`, transition: 'none' }
                            : { width: mounted ? '0%' : '100%', transition: mounted ? `width ${remaining}ms linear` : 'none' }
                    }
                />
            </div>
        </div>
    );
};

const IssueToastBody: React.FC<{
    id: string;
    successCount: number;
    total: number;
    stoppedEarly: boolean;
    onViewDetail: () => void;
    onDismiss: () => void;
}> = ({ id, successCount, total, stoppedEarly, onViewDetail, onDismiss }) => {
    const errorCount = total - successCount;
    const headline = stoppedEarly
        ? `⏹ Đã dừng: xong ${total} nhân viên (${successCount} thành công${errorCount > 0 ? `, ${errorCount} lỗi` : ''})`
        : `⚠️ ${successCount}/${total} thành công, ${errorCount} lỗi`;
    const colorClass = stoppedEarly
        ? 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
        : 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400';

    return (
        <div className={`w-80 rounded-xl shadow-lg bg-white dark:bg-slate-800 border px-4 py-3 ${colorClass}`}>
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold flex-1">{headline}</p>
                <button
                    onClick={() => { toast.dismiss(id); onDismiss(); }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs leading-none flex-shrink-0"
                    aria-label="Đóng"
                >
                    ✕
                </button>
            </div>
            <button
                onClick={() => { toast.dismiss(id); onViewDetail(); }}
                className="mt-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
            >
                Xem chi tiết
            </button>
        </div>
    );
};

/** Chọn đúng loại toast (thành công tự ẩn / có vấn đề không tự ẩn) dựa vào summary. */
export function showAutoBonusResultToast(
    summary: BonusAutoSummary,
    handlers: { onViewDetail: () => void; onDismissed: () => void },
): void {
    const allOk = !summary.stoppedEarly && summary.successCount === summary.total && summary.total > 0;

    if (allOk) {
        toast.custom(
            (t) => <SuccessToastBody id={t.id} total={summary.total} onExpire={handlers.onDismissed} />,
            { id: TOAST_ID, duration: LONG_DURATION_MS },
        );
    } else {
        toast.custom(
            (t) => (
                <IssueToastBody
                    id={t.id}
                    successCount={summary.successCount}
                    total={summary.total}
                    stoppedEarly={summary.stoppedEarly}
                    onViewDetail={handlers.onViewDetail}
                    onDismiss={handlers.onDismissed}
                />
            ),
            { id: TOAST_ID, duration: LONG_DURATION_MS },
        );
    }
}

/** Toast lỗi toàn cục (job-level, không có kết quả nhân viên nào cả). */
export function showAutoBonusErrorToast(message: string, onDismissed: () => void): void {
    toast.error(message, { id: TOAST_ID, duration: 6000 });
    setTimeout(onDismissed, 6000);
}
