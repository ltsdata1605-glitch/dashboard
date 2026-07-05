import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { ImportedStaff, StaffWithGender } from '../types';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';

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
  const [showError, setShowError] = useState(false);
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
        setShowError(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setShowError(false), 3000);
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
    <Modal
      isOpen
      onClose={onClose}
      zIndex="z-[60]"
      title="Cấu Hình Nhập Nhân Viên"
      maxWidth="4xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Hủy bỏ</Button>
          <Button onClick={handleConfirm} rightIcon={<ArrowRight size={16} />}>Lưu & Tiếp Tục</Button>
        </div>
      }
    >
      <p className="text-slate-500 dark:text-slate-400 font-medium text-xs -mt-2 mb-4">Xác nhận thông tin siêu thị và giới tính nhân viên để hệ thống phân ca chính xác.</p>

      <div className="mb-4 p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-md">
        <label className="block text-[10px] font-black text-sky-600 dark:text-sky-400 mb-1.5 uppercase tracking-widest">Tên Siêu Thị <span className="text-rose-500">*</span></label>
        <Input
          type="text"
          error={showError ? 'Vui lòng nhập tên siêu thị!' : undefined}
          className="font-bold"
          placeholder="VD: ĐML_STR_STR - 99 Hùng Vương"
          value={supermarketName}
          onChange={(e) => {
            setSupermarketName(e.target.value);
            if (e.target.value.trim()) setShowError(false);
          }}
          list="supermarket-suggestions"
        />
        <datalist id="supermarket-suggestions">
          {existingSupermarkets.map(s => <option key={s} value={s} />)}
        </datalist>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-2 italic">
          Nhập tên mới để tạo siêu thị mới, hoặc chọn tên có sẵn để cập nhật nhân viên.
        </p>
      </div>

      <div className="flex flex-col bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Danh sách nhân viên ({staffList.length})</span>
          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 font-black uppercase rounded">Vui lòng kiểm tra lại giới tính</span>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 border-b border-slate-200 dark:border-slate-700">
            <tr className="text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest">
              <th className="px-4 py-2 text-left">Họ tên nhân viên</th>
              <th className="px-4 py-2 text-left">Bộ phận</th>
              <th className="px-4 py-2 text-center w-32">Giới tính</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">{staff.name}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400 font-medium text-xs">{staff.department}</td>
                <td className="px-4 py-1.5">
                  <div className="flex justify-center items-center gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => handleGenderChange(staff.id, 'Nam')}
                      className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 flex-1 py-1 px-2 text-[10px] font-black transition-all border rounded ${genderAssignments[staff.id] === 'Nam' ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                    >
                      NAM
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleGenderChange(staff.id, 'Nu')}
                      className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 flex-1 py-1 px-2 text-[10px] font-black transition-all border rounded ${genderAssignments[staff.id] === 'Nu' ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                    >
                      NỮ
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

export default ImportStaffModal;
