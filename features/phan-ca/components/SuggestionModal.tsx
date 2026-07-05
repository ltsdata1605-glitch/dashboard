import React from 'react';
import { ScheduleSuggestion } from '../types';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';

interface SuggestionModalProps {
  suggestions: ScheduleSuggestion[];
  onAccept: (suggestion: ScheduleSuggestion) => void;
  onClose: () => void;
}

const SuggestionModal: React.FC<SuggestionModalProps> = ({ suggestions, onAccept, onClose }) => {
  if (suggestions.length === 0) {
    return null;
  }

  const getRoleName = (type: 'kho' | 'tn') => {
    return type === 'kho' ? 'Kho' : 'Thu Ngân';
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="💡 Gợi Ý Tối Ưu Lịch"
      maxWidth="2xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Đóng</Button>
        </div>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Hệ thống đã phát hiện một số chênh lệch về số ca. Dưới đây là các đề xuất hoán đổi để lịch làm việc được cân bằng hơn:
      </p>

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
            <div className="flex-grow">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Đổi ca <span className={`font-bold ${suggestion.type === 'kho' ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400'}`}>{getRoleName(suggestion.type)}</span> ngày <span className="text-sky-600 dark:text-sky-400">{suggestion.dateString}</span>
              </p>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 grid grid-cols-2 gap-x-4">
                <p>
                  Từ: <strong className="text-slate-700 dark:text-slate-300">{suggestion.highCountStaff.name}</strong>
                  ({suggestion.highCountStaff.stats[suggestion.type]} ca)
                </p>
                <p>
                  Sang: <strong className="text-slate-700 dark:text-slate-300">{suggestion.lowCountStaff.name}</strong>
                  ({suggestion.lowCountStaff.stats[suggestion.type]} ca)
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => onAccept(suggestion)} className="shrink-0">
              Chấp Nhận
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default SuggestionModal;
