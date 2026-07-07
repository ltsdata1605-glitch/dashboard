import React from 'react';
import { Modal } from '../../../../../components/shared/ui/Modal';
import { Button } from '../../../../../components/shared/ui/Button';
import { Badge } from '../../../../../components/shared/ui/Badge';
import { BonusAutoSummary } from '../../../hooks/useBonusAutoBridge';

const numberFormat = new Intl.NumberFormat('vi-VN');

/**
 * Mở khi bấm "Xem chi tiết" từ toast kết quả. Liệt kê TẤT CẢ nhân viên trong lần chạy
 * (cả thành công lẫn lỗi) kèm Điểm thực lãnh — để đối chiếu nhanh không cần mở intranet.
 */
export const AutoBonusErrorDetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    summary: BonusAutoSummary | null;
}> = ({ isOpen, onClose, summary }) => {
    if (!isOpen || !summary) return null;

    const errorCount = summary.total - summary.successCount;

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={summary.stoppedEarly ? 'Kết quả (đã dừng giữa chừng)' : 'Kết quả cập nhật thưởng — Tự động'}
            maxWidth="lg"
            footer={<Button variant="ghost" onClick={onClose} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit w-full py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">Đóng</Button>}
        >
            <div className="flex items-center gap-2 mb-4">
                <Badge variant="success">{summary.successCount} thành công</Badge>
                {errorCount > 0 && <Badge variant="danger">{errorCount} lỗi</Badge>}
                {summary.stoppedEarly && <Badge variant="warning">Đã dừng sớm — {summary.total} nhân viên đã xử lý</Badge>}
            </div>
            <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr>
                            <th className="text-left px-3 py-2 font-bold text-slate-500 dark:text-slate-400">Nhân viên</th>
                            <th className="text-left px-3 py-2 font-bold text-slate-500 dark:text-slate-400">Mã NV</th>
                            <th className="text-right px-3 py-2 font-bold text-slate-500 dark:text-slate-400">Điểm thực lãnh / Lý do</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {summary.items.map((item, idx) => (
                            <tr key={`${item.employeeId}-${idx}`}>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.originalName}</td>
                                <td className="px-3 py-2 text-slate-500 dark:text-slate-400 tabular-nums">{item.employeeId}</td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    {item.status === 'ok' ? (
                                        <span className="font-bold text-slate-800 dark:text-slate-100">
                                            {item.diemThucLanh === null || item.diemThucLanh === undefined
                                                ? <span className="text-slate-400 dark:text-slate-500 font-normal">Không có dữ liệu kỳ này</span>
                                                : numberFormat.format(item.diemThucLanh)}
                                        </span>
                                    ) : (
                                        <span className="text-rose-600 dark:text-rose-400">{item.reason}</span>
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

export default AutoBonusErrorDetailModal;
