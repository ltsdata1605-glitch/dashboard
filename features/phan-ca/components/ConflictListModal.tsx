import React from 'react';
import { UnresolvedConflict } from '../types';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { EmptyState } from '../../../components/shared/ui/EmptyState';

interface ConflictListModalProps {
  conflicts: UnresolvedConflict[];
  onClose: () => void;
}

const ConflictListModal: React.FC<ConflictListModalProps> = ({ conflicts, onClose }) => {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Danh Sách Ca Cần Xử Lý"
      maxWidth="2xl"
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>Đã Hiểu</Button>
        </div>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Hệ thống không tìm thấy người thay thế tự động cho các ca dưới đây.
        Nhân viên đã được cho nghỉ <span className="font-bold text-rose-600 dark:text-rose-400">OFF</span>, nhưng bạn cần tìm người làm thay cho các ca này bằng cách bấm vào ô tương ứng trên lịch chính.
      </p>

      <div className="border-t border-b border-slate-200 dark:border-slate-700 py-2 pr-2">
        {conflicts.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
              <tr>
                <th className="p-2 text-left font-semibold text-slate-700 dark:text-slate-300">Nhân Viên</th>
                <th className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300">Ngày</th>
                <th className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300">Ca Cần Thay Thế</th>
              </tr>
            </thead>
            <tbody>
              {conflicts.map((conflict, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-rose-50 dark:bg-rose-900/10'}>
                  <td className="p-2 font-medium text-slate-800 dark:text-slate-200">{conflict.employeeName}</td>
                  <td className="p-2 text-center text-slate-700 dark:text-slate-300">{conflict.date}</td>
                  <td className="p-2 text-center font-mono bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded">{conflict.originalShift.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Không có ca nào cần xử lý."
            compact
          />
        )}
      </div>
    </Modal>
  );
};

export default ConflictListModal;
