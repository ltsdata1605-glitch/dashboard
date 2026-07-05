import React from 'react';
import { EmployeeBusyReport } from '../types';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';

interface BusyReportModalProps {
  report: EmployeeBusyReport[];
  onClose: () => void;
}

const BusyReportModal: React.FC<BusyReportModalProps> = ({ report, onClose }) => {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Đã Xử Lý Tự Động Lịch Bận"
      maxWidth="4xl"
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>OK</Button>
        </div>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Hệ thống đã tự động xử lý các yêu cầu từ file lịch bận. Dưới đây là kết quả chi tiết:
      </p>

      <div className="border-t border-b border-slate-200 dark:border-slate-700 py-2 pr-2">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
            <tr>
              <th className="p-2 text-left font-semibold text-slate-700 dark:text-slate-300 w-1/4">Nhân Viên</th>
              <th className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300">Bận Sáng (Y/C | Đã Xử Lý)</th>
              <th className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300">Bận Chiều (Y/C | Đã Xử Lý)</th>
              <th className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300">Nghỉ Cả Ngày (Y/C | Đã Xử Lý)</th>
              <th className="p-2 text-center font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20">Cần Xem Lại</th>
            </tr>
          </thead>
          <tbody>
            {report.map((item, index) => (
              <tr key={item.staffId} className={index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                <td className="p-2 font-medium text-slate-800 dark:text-slate-200">{item.staffName}</td>
                <td className="p-2 text-center text-slate-700 dark:text-slate-300">
                  <span className="font-bold">{item.requests.morning}</span> | <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{item.resolved.morning}</span>
                </td>
                <td className="p-2 text-center text-slate-700 dark:text-slate-300">
                  <span className="font-bold">{item.requests.afternoon}</span> | <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{item.resolved.afternoon}</span>
                </td>
                <td className="p-2 text-center text-slate-700 dark:text-slate-300">
                  <span className="font-bold">{item.requests.off}</span> | <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{item.resolved.off}</span>
                </td>
                <td className={`p-2 text-center font-bold ${item.unresolvedCount > 0 ? 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30' : 'text-slate-500 dark:text-slate-400'}`}>
                  {item.unresolvedCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

export default BusyReportModal;
