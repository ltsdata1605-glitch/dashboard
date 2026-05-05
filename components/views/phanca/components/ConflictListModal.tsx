import React from 'react';
import { UnresolvedConflict } from '../types';

interface ConflictListModalProps {
  conflicts: UnresolvedConflict[];
  onClose: () => void;
}

const ConflictListModal: React.FC<ConflictListModalProps> = ({ conflicts, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-bold text-red-700 mb-4">Danh Sách Ca Cần Xử Lý</h2>
        <p className="text-sm text-gray-600 mb-4">
          Hệ thống không tìm thấy người thay thế tự động cho các ca dưới đây. 
          Nhân viên đã được cho nghỉ <span className="font-bold text-red-500">OFF</span>, nhưng bạn cần tìm người làm thay cho các ca này bằng cách bấm vào ô tương ứng trên lịch chính.
        </p>
        
        <div className="overflow-y-auto flex-grow border-t border-b py-2 pr-2">
          {conflicts.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                  <th className="p-2 text-left font-semibold text-gray-700">Nhân Viên</th>
                  <th className="p-2 text-center font-semibold text-gray-700">Ngày</th>
                  <th className="p-2 text-center font-semibold text-gray-700">Ca Cần Thay Thế</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((conflict, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-red-50'}>
                    <td className="p-2 font-medium text-gray-800">{conflict.employeeName}</td>
                    <td className="p-2 text-center">{conflict.date}</td>
                    <td className="p-2 text-center font-mono bg-orange-100 text-orange-800 rounded">{conflict.originalShift.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 italic p-4">Không có ca nào cần xử lý.</p>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button 
            type="button" 
            onClick={onClose} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition"
          >
            Đã Hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictListModal;