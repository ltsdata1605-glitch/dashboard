import React from 'react';
import { ScheduleHistoryEntry } from '../types';

interface HistoryModalProps {
  history: ScheduleHistoryEntry[];
  onRestore: (index: number) => void;
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ history, onRestore, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Lịch Sử Thay Đổi & Khôi Phục</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl">&times;</button>
        </div>
        
        <div className="overflow-y-auto flex-grow border-t border-b py-2 pr-2">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 italic">Chưa có thay đổi nào được ghi lại cho lịch này.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((entry, index) => (
                <li key={entry.timestamp} className="bg-gray-50 p-3 rounded-md border border-gray-200 flex justify-between items-center gap-4">
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-800">{entry.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(entry.timestamp).toLocaleString('vi-VN', { 
                          day: '2-digit', month: '2-digit', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit', second: '2-digit' 
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => onRestore(index)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded transition text-sm flex-shrink-0"
                    title="Khôi phục lại trạng thái của lịch ngay trước khi có thay đổi này"
                  >
                    Khôi phục
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;