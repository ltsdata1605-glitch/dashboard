import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface AddEmployeeModalProps {
  onClose: () => void;
  onAdd: (name: string, gender: 'Nam' | 'Nu', department: string) => void;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nu'>('Nam');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && department.trim()) {
      onAdd(name.trim(), gender, department.trim());
    } else {
      toast.error("Vui lòng nhập đầy đủ Tên/Mã và Bộ phận của nhân viên.", { duration: 3000 });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Thêm Nhân Viên Mới</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-1">Tên/Mã Nhân Viên</label>
            <input
              type="text"
              id="employeeName"
              className="w-full config-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: 12345 - T.Văn A"
              required
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">Bộ phận</label>
            <input
              type="text"
              id="department"
              className="w-full config-input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="VD: BP Bán Hàng"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="Nam"
                  checked={gender === 'Nam'}
                  onChange={() => setGender('Nam')}
                  className="mr-2"
                />
                Nam
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="Nu"
                  checked={gender === 'Nu'}
                  onChange={() => setGender('Nu')}
                  className="mr-2"
                />
                Nữ
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition">
              Hủy
            </button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
              Thêm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;