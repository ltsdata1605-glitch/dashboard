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
}> = ({ isOpen, onClose, summary }) => {
    if (!isOpen || !summary) return null;

    const errorMonths = summary.monthResults.filter(m => !!m.error).length;

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={summary.stoppedEarly ? 'Kết quả chạy Năm (đã dừng giữa chừng)' : 'Kết quả chạy Năm'}
            maxWidth="lg"
            footer={<Button variant="ghost" onClick={onClose} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit w-full py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">Đóng</Button>}
        >
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Badge variant="success">{summary.monthsDone - errorMonths}/{summary.monthsTotal} tháng thành công</Badge>
                {errorMonths > 0 && <Badge variant="danger">{errorMonths} tháng lỗi</Badge>}
                {summary.stoppedEarly && <Badge variant="warning">Đã dừng sớm — {summary.monthsDone}/{summary.monthsTotal} tháng đã xử lý</Badge>}
            </div>
            <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr>
                            <th className="text-left px-3 py-2 font-bold text-slate-500 dark:text-slate-400">Tháng</th>
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
