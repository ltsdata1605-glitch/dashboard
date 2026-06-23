import React, { useState, useEffect } from 'react';
import { ImportedStaff, StaffWithGender } from '../types';

interface ImportStaffModalProps {
  staffList: ImportedStaff[];
  onClose: () => void;
  onConfirm: (staffWithGenders: StaffWithGender[], supermarketName: string) => void;
  existingSupermarkets: string[];
}

// Bổ sung thêm ID thường gặp và quy tắc gán nhãn giới tính
const GENDER_MAP: { [key: string]: 'Nam' | 'Nu' } = {
  '106637': 'Nam', '107229': 'Nam', '107617': 'Nam', '111395': 'Nam', '140138': 'Nam',
  '15447': 'Nam', '15887': 'Nu', '174687': 'Nu', '174689': 'Nu', '17952': 'Nu',
  '195025': 'Nu', '23522': 'Nu', '23526': 'Nam', '24754': 'Nu', '24755': 'Nam',
  '260550': 'Nu', '260963': 'Nam', '261417': 'Nam', '28679': 'Nam', '28980': 'Nam',
  '41477': 'Nam', '51115': 'Nu', '58614': 'Nam', '58619': 'Nu', '58625': 'Nu',
  '62864': 'Nam', '64743': 'Nam', '7587': 'Nu', '95968': 'Nu', '95970': 'Nu',
  '160211': 'Nu', '19419': 'Nam', '25164': 'Nam', '52966': 'Nam', '21453': 'Nam',
  '22094': 'Nam', '23532': 'Nu', '21707': 'Nam', '154789': 'Nu', '260345': 'Nam',
  '51118': 'Nam', '149668': 'Nam', '175348': 'Nam', '260962': 'Nu'
};

const ImportStaffModal: React.FC<ImportStaffModalProps> = ({ staffList, onClose, onConfirm, existingSupermarkets }) => {
  const [genderAssignments, setGenderAssignments] = useState<{ [key: string]: 'Nam' | 'Nu' }>({});
  const [supermarketName, setSupermarketName] = useState('');
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    // Cố gắng đoán giới tính từ ID nhân viên
    const initialGenders = staffList.reduce((acc, staff) => {
      const userId = staff.name.split(' - ')[0]; 
      // Nếu không có trong map, hãy kiểm tra một số tên phổ biến hoặc để trống (yêu cầu người dùng chọn)
      // Ở đây ta mặc định là 'Nu' nhưng yêu cầu người dùng kiểm tra lại
      acc[staff.id] = GENDER_MAP[userId] || 'Nu';
      return acc;
    }, {} as { [key: string]: 'Nam' | 'Nu' });
    setGenderAssignments(initialGenders);
  }, [staffList]);

  const handleGenderChange = (staffId: string, gender: 'Nam' | 'Nu') => {
    setGenderAssignments(prev => ({
      ...prev,
      [staffId]: gender,
    }));
  };

  const handleConfirm = () => {
    if (!supermarketName.trim()) {
        setShowErrorTooltip(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setShowErrorTooltip(false), 3000);
        return;
    }

    // Đảm bảo dữ liệu nhân viên được chuyển đổi đầy đủ
    const staffWithGenders: StaffWithGender[] = staffList.map(staff => ({
      ...staff,
      gender: genderAssignments[staff.id],
    }));
    
    onConfirm(staffWithGenders, supermarketName.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] backdrop-blur-sm">
      <div className="bg-white p-6 shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col border border-slate-200">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Cấu Hình Nhập Nhân Viên</h2>
                <p className="text-slate-500 font-medium text-xs mt-1">Xác nhận thông tin siêu thị và giới tính nhân viên để hệ thống phân ca chính xác.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        
        <div className="mb-4 p-4 bg-indigo-50/50 border border-indigo-100">
            <label className="block text-[10px] font-black text-indigo-600 mb-1.5 uppercase tracking-widest">Tên Siêu Thị <span className="text-rose-500">*</span></label>
            <div className="relative">
                <input 
                    type="text" 
                    className={`w-full px-3 py-2 bg-white border font-bold text-slate-700 outline-none transition-all ${showErrorTooltip ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-slate-300 focus:border-indigo-500'}`}
                    placeholder="VD: ĐML_STR_STR - 99 Hùng Vương"
                    value={supermarketName}
                    onChange={(e) => {
                        setSupermarketName(e.target.value);
                        if(e.target.value.trim()) setShowErrorTooltip(false);
                    }}
                    list="supermarket-suggestions"
                />
                <datalist id="supermarket-suggestions">
                    {existingSupermarkets.map(s => <option key={s} value={s} />)}
                </datalist>
                
                {showErrorTooltip && (
                    <div className="absolute left-0 -top-12 bg-rose-600 text-white text-xs font-bold rounded-lg py-2 px-3 shadow-xl z-10">
                        Vui lòng nhập tên siêu thị!
                        <div className="absolute bottom-0 left-4 -mb-1 w-2 h-2 bg-rose-600 transform rotate-45"></div>
                    </div>
                )}
            </div>
            <p className="text-[11px] text-slate-500 font-bold mt-2 italic flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Nhập tên mới để tạo siêu thị mới, hoặc chọn tên có sẵn để cập nhật nhân viên.
            </p>
        </div>

        <div className="flex-grow overflow-hidden flex flex-col bg-slate-50 border border-slate-200">
            <div className="p-3 bg-white border-b border-slate-200 flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Danh sách nhân viên ({staffList.length})</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 font-black uppercase">Vui lòng kiểm tra lại giới tính</span>
            </div>
            
            <div className="overflow-y-auto flex-grow">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
                  <tr className="text-slate-500 font-black text-[10px] uppercase tracking-widest">
                    <th className="px-4 py-2 text-left">Họ tên nhân viên</th>
                    <th className="px-4 py-2 text-left">Bộ phận</th>
                    <th className="px-4 py-2 text-center w-32">Giới tính</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((staff) => (
                    <tr key={staff.id} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100">
                      <td className="px-4 py-2 font-bold text-slate-700">{staff.name}</td>
                      <td className="px-4 py-2 text-slate-500 font-medium text-xs">{staff.department}</td>
                      <td className="px-4 py-1.5">
                        <div className="flex justify-center items-center gap-1">
                          <button 
                            onClick={() => handleGenderChange(staff.id, 'Nam')}
                            className={`flex-1 py-1 px-2 text-[10px] font-black transition-all border ${genderAssignments[staff.id] === 'Nam' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                          >
                            NAM
                          </button>
                          <button 
                            onClick={() => handleGenderChange(staff.id, 'Nu')}
                            className={`flex-1 py-1 px-2 text-[10px] font-black transition-all border ${genderAssignments[staff.id] === 'Nu' ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                          >
                            NỮ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-all">
            Hủy bỏ
          </button>
          <button type="button" onClick={handleConfirm} className="px-6 py-2 bg-slate-900 hover:bg-black text-white font-bold transition-all flex items-center gap-2">
            Lưu & Tiếp Tục
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportStaffModal;