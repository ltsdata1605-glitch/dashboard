import React from 'react';
import { ScheduleSuggestion } from '../types';

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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-blue-800">💡 Gợi Ý Tối Ưu Lịch</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl">&times;</button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Hệ thống đã phát hiện một số chênh lệch về số ca. Dưới đây là các đề xuất hoán đổi để lịch làm việc được cân bằng hơn:
        </p>

        <div className="overflow-y-auto flex-grow pr-2 space-y-3">
          {suggestions.map((suggestion, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-between gap-4">
              <div className="flex-grow">
                <p className="font-semibold text-gray-800">
                  Đổi ca <span className={`font-bold ${suggestion.type === 'kho' ? 'text-green-600' : 'text-purple-600'}`}>{getRoleName(suggestion.type)}</span> ngày <span className="text-blue-600">{suggestion.dateString}</span>
                </p>
                <div className="text-xs text-gray-500 mt-1 grid grid-cols-2 gap-x-4">
                   <p>
                      Từ: <strong className="text-gray-700">{suggestion.highCountStaff.name}</strong> 
                      ({suggestion.highCountStaff.stats[suggestion.type]} ca)
                   </p>
                   <p>
                      Sang: <strong className="text-gray-700">{suggestion.lowCountStaff.name}</strong> 
                      ({suggestion.lowCountStaff.stats[suggestion.type]} ca)
                   </p>
                </div>
              </div>
              <button
                onClick={() => onAccept(suggestion)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition text-sm flex-shrink-0"
              >
                Chấp Nhận
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuggestionModal;