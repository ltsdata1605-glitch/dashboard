import React, { useState } from 'react';
import { SchedulingRules } from '../types';

interface EditRulesModalProps {
  ruleKey: 'kho' | 'tn' | 'gh';
  currentRules: SchedulingRules;
  availableShifts: string[];
  onClose: () => void;
  onSave: (newRules: SchedulingRules) => void;
}

const TITLES: { [key in 'kho' | 'tn' | 'gh']: string } = {
  kho: 'Chỉnh Sửa Quy Tắc "Kho"',
  tn: 'Chỉnh Sửa Quy Tắc "Thu Ngân"',
  gh: 'Chỉnh Sửa Quy Tắc "Giao Hàng"',
};

const EditRulesModal: React.FC<EditRulesModalProps> = ({ ruleKey, currentRules, availableShifts, onClose, onSave }) => {
  const [rules, setRules] = useState<SchedulingRules>(JSON.parse(JSON.stringify(currentRules)));
  const [newShiftCode, setNewShiftCode] = useState('');

  const handleSave = () => {
    onSave(rules);
  };

  const handleInputChange = (shiftCode: string, value: string) => {
    const count = parseInt(value, 10);
    if (!isNaN(count)) {
        setRules(prev => ({
            ...prev,
            [ruleKey]: {
                ...prev[ruleKey],
                [shiftCode]: count
            }
        }));
    }
  };

  const handleAddShiftRule = (shiftCode: string) => {
    if (shiftCode) {
        setRules(prev => ({
            ...prev,
            [ruleKey]: {
                ...prev[ruleKey],
                [shiftCode]: 1 // Mặc định là 1 nhân viên
            }
        }));
    }
  };

  const handleRemoveShiftRule = (shiftCode: string) => {
    const newShiftRules = { ...rules[ruleKey] };
    delete newShiftRules[shiftCode];
    setRules(prev => ({
        ...prev,
        [ruleKey]: newShiftRules
    }));
  };
  
  const genderKey = `${ruleKey}Gender` as 'ghGender' | 'khoGender' | 'tnGender';
  
  const GenderPill: React.FC<{ value: 'Nam' | 'Nu' | 'All', text: string }> = ({ value, text }) => {
    const isActive = rules[genderKey] === value;
    const baseClasses = "px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm";
    const activeClasses = "bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-1";
    const inactiveClasses = "bg-gray-100 text-gray-700 hover:bg-gray-200";
    return (
        <button
            type="button"
            onClick={() => setRules(prev => ({ ...prev, [genderKey]: value }))}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
            {text}
        </button>
    );
  };


  const renderFields = () => {
    const configuredShifts = Object.keys(rules[ruleKey]).sort();
    const unconfiguredShifts = availableShifts.filter(s => !configuredShifts.includes(s) && !s.includes('(') && s !== 'OFF' && s.trim() !== '').sort();

    return (
      <>
        {(ruleKey === 'gh' || ruleKey === 'kho' || ruleKey === 'tn') && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <label className="block text-sm font-bold text-gray-700 mb-2">Điều kiện giới tính</label>
                <div className="flex justify-center gap-3">
                    <GenderPill value="Nam" text="Chỉ Nam" />
                    <GenderPill value="Nu" text="Chỉ Nữ" />
                    <GenderPill value="All" text="Không yêu cầu" />
                </div>
            </div>
        )}
        <p className="text-sm text-gray-500 mb-3 italic">Nhập số lượng nhân sự cần trong từng ca:</p>
        <div className="space-y-3 max-h-56 overflow-y-auto pr-2 mb-4 border-b pb-4">
          {configuredShifts.length > 0 ? configuredShifts.map(shift => (
            <div key={shift} className="flex items-center gap-3">
              <label className="w-1/3 block text-sm font-medium text-gray-700">
                Ca {shift}:
              </label>
              <input
                type="number"
                className="flex-grow config-input"
                value={rules[ruleKey][shift] || 0}
                onChange={(e) => handleInputChange(shift, e.target.value)}
                min="0"
              />
              <button 
                onClick={() => handleRemoveShiftRule(shift)}
                className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition"
                title={`Xóa cấu hình cho ca ${shift}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )) : (
            <p className="text-sm text-gray-500 italic text-center">Chưa có cấu hình ca nào. Hãy thêm ở bên dưới.</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
            <input 
              type="text"
              className="config-input flex-grow"
              placeholder="Nhập mã ca (VD: 123, 456...)"
              list="available-shifts"
              value={newShiftCode}
              onChange={(e) => setNewShiftCode(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                      if (newShiftCode && newShiftCode.trim()) {
                          handleAddShiftRule(newShiftCode.trim());
                          setNewShiftCode(""); 
                      }
                  }
              }}
            />
            <datalist id="available-shifts">
                {unconfiguredShifts.map(s => <option key={s} value={s} />)}
            </datalist>
            <button 
              type="button" 
              onClick={() => {
                  if (newShiftCode && newShiftCode.trim()) {
                      handleAddShiftRule(newShiftCode.trim());
                      setNewShiftCode(""); 
                  }
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded transition text-sm whitespace-nowrap"
            >
              + Thêm
            </button>
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-lg font-bold mb-4 text-gray-800">{TITLES[ruleKey]}</h2>
        <div className="mb-6">
            {renderFields()}
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition">
            Hủy
          </button>
          <button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditRulesModal;