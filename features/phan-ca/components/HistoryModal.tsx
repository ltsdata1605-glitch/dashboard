import React from 'react';
import { ScheduleHistoryEntry } from '../types';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';

interface HistoryModalProps {
  history: ScheduleHistoryEntry[];
  onRestore: (index: number) => void;
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ history, onRestore, onClose }) => {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Lịch Sử Thay Đổi & Khôi Phục"
      maxWidth="xl"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Đóng</Button>
        </div>
      }
    >
      {history.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-slate-500 dark:text-slate-400 italic">Chưa có thay đổi nào được ghi lại cho lịch này.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {history.map((entry, index) => (
            <li key={entry.timestamp} className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-md border border-slate-200 dark:border-slate-700 flex justify-between items-center gap-4">
              <div className="flex-grow">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{entry.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {new Date(entry.timestamp).toLocaleString('vi-VN', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => onRestore(index)}
                className="shrink-0"
                title="Khôi phục lại trạng thái của lịch ngay trước khi có thay đổi này"
              >
                Khôi phục
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

export default HistoryModal;
