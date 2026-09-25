import React from 'react';
import { Modal } from '../../../../../components/shared/ui/Modal';
import { Button } from '../../../../../components/shared/ui/Button';
import { Badge } from '../../../../../components/shared/ui/Badge';
import { MultiMonthSummary } from '../../../hooks/useMultiMonthBonusRun';

/** Mở khi bấm "Xem chi tiết" từ toast kết quả "Chạy N tháng" — liệt kê từng tháng đã
 * chạy, tháng nào lỗi hẳn (job-error) sẽ hiện rõ lý do để biết cần chạy lại tháng nào. */
export const MultiMonthResultDetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    summary: MultiMonthSummary | null;
    resumeInfo?: { label: string; remainingCount: number } | null;
    onResume?: () => void;
}> = ({ isOpen, onClose, summary, resumeInfo, onResume }) => {
    if (!isOpen || !summary) return null;

    const errorMonths = summary.monthResults.filter(m => !!m.error).length;
    const isCompare = summary.kind === 'compare';
    const unit = isCompare ? 'kỳ' : 'tháng';
    const runName = isCompare ? 'So sánh cùng kỳ' : 'chạy Năm';
    const canResume = (summary.stoppedEarly || errorMonths > 0) && !!onResume;

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={summary.stoppedEarly ? `Kết quả ${runName} (đã dừng giữa chừng)` : `Kết quả ${runName}`}
            maxWidth="lg"
            footer={
                <div className="flex items-center justify-between gap-3 w-full">
                    {canResume ? (
                        <Button
                            variant="primary"
                            onClick={() => { onClose(); onResume(); }}
                            className="flex-1 py-2 text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow transition-colors"
                        >
                            ▶ {resumeInfo?.label ? `Tiếp tục (${resumeInfo.label})` : 'Chạy tiếp các tháng còn lại'}
                        </Button>
                    ) : <div />}
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="px-5 py-2 text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    >
                        Đóng
                    </Button>
                </div>
            }
        >
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Badge variant="success">{summary.monthsDone - errorMonths}/{summary.monthsTotal} {unit} thành công</Badge>
                {errorMonths > 0 && <Badge variant="danger">{errorMonths} {unit} lỗi</Badge>}
                {summary.stoppedEarly && <Badge variant="warning">Đã dừng sớm — {summary.monthsDone}/{summary.monthsTotal} {unit} đã xử lý</Badge>}
                {summary.skippedNames.length > 0 && <Badge variant="warning">{summary.skippedNames.length} nhân viên bị bỏ qua</Badge>}
            </div>
            {summary.skippedNames.length > 0 && (
                <div className="mb-4 p-3 rounded-none border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-800 dark:text-amber-300">
                    <p className="font-bold mb-1">Tên không đúng khuôn "Tên - Mã NV", đã bỏ qua ở mọi {unit}:</p>
                    <p className="leading-relaxed">{summary.skippedNames.join(', ')}</p>
                </div>
            )}
            <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-none">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr>
                            <th className="text-left px-3 py-2 font-bold text-slate-500 dark:text-slate-400">{isCompare ? 'Kỳ' : 'Tháng'}</th>
                            <th className="text-right px-3 py-2 font-bold text-slate-500 dark:text-slate-400">Kết quả</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {summary.monthResults.map(m => (
                            <tr key={m.yyyymm}>
                                <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-300">{m.label}</td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    {m.error ? (
                                        <span className="text-rose-600 dark:text-rose-400">{m.error}</span>
                                    ) : (
                                        <span className="font-bold text-slate-800 dark:text-slate-100">
                                            {m.successCount}/{m.total} nhân viên
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
};

export default MultiMonthResultDetailModal;
