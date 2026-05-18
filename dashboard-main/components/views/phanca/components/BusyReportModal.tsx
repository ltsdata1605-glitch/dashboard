import React from 'react';
import { EmployeeBusyReport } from '../types';

interface BusyReportModalProps {
  report: EmployeeBusyReport[];
  onClose: () => void;
}

const BusyReportModal: React.FC<BusyReportModalProps> = ({ report, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-bold text-green-700 mb-2">Đã Xử Lý Tự Động Lịch Bận</h2>
        <p className="text-sm text-gray-600 mb-4">
          Hệ thống đã tự động xử lý các yêu cầu từ file lịch bận. Dưới đây là kết quả chi tiết:
        </p>
        
        <div className="overflow-y-auto flex-grow border-t border-b py-2 pr-2">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr>
                <th className="p-2 text-left font-semibold text-gray-700 w-1/4">Nhân Viên</th>
                <th className="p-2 text-center font-semibold text-gray-700">Bận Sáng (Y/C | Đã Xử Lý)</th>
                <th className="p-2 text-center font-semibold text-gray-700">Bận Chiều (Y/C | Đã Xử Lý)</th>
                <th className="p-2 text-center font-semibold text-gray-700">Nghỉ Cả Ngày (Y/C | Đã Xử Lý)</th>
                <th className="p-2 text-center font-semibold text-red-700 bg-red-50">Cần Xem Lại</th>
              </tr>
            </thead>
            <tbody>
              {report.map((item, index) => (
                <tr key={item.staffId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-2 font-medium text-gray-800">{item.staffName}</td>
                  <td className="p-2 text-center">
                    <span className="font-bold">{item.requests.morning}</span> | <span className="text-green-600 font-semibold">{item.resolved.morning}</span>
                  </td>
                  <td className="p-2 text-center">
                    <span className="font-bold">{item.requests.afternoon}</span> | <span className="text-green-600 font-semibold">{item.resolved.afternoon}</span>
                  </td>
                  <td className="p-2 text-center">
                    <span className="font-bold">{item.requests.off}</span> | <span className="text-green-600 font-semibold">{item.resolved.off}</span>
                  </td>
                  <td className={`p-2 text-center font-bold ${item.unresolvedCount > 0 ? 'text-red-600 bg-red-100' : 'text-gray-500'}`}>
                    {item.unresolvedCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-6">
          <button 
            type="button" 
            onClick={onClose} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusyReportModal;
