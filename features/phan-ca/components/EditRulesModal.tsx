import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { SchedulingRules } from '../types';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';

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
  const [rules, setRules] = useState<SchedulingRules>(structuredClone(currentRules));
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
    const activeClasses = "bg-sky-500 text-white ring-2 ring-sky-300 dark:ring-sky-700 ring-offset-1 dark:ring-offset-slate-800";
    const inactiveClasses = "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600";
    return (
        <Button
            type="button"
            variant="ghost"
            onClick={() => setRules(prev => ({ ...prev, [genderKey]: value }))}
            className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 ${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
            {text}
        </Button>
    );
  };


  const renderFields = () => {
    const configuredShifts = Object.keys(rules[ruleKey]).sort();
    const unconfiguredShifts = availableShifts.filter(s => !configuredShifts.includes(s) && !s.includes('(') && s !== 'OFF' && s.trim() !== '').sort();

    return (
      <>
        {(ruleKey === 'gh' || ruleKey === 'kho' || ruleKey === 'tn') && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Điều kiện giới tính</label>
                <div className="flex justify-center gap-3">
                    <GenderPill value="Nam" text="Chỉ Nam" />
                    <GenderPill value="Nu" text="Chỉ Nữ" />
                    <GenderPill value="All" text="Không yêu cầu" />
                </div>
            </div>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 italic">Nhập số lượng nhân sự cần trong từng ca:</p>
        <div className="space-y-3 max-h-56 overflow-y-auto pr-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
          {configuredShifts.length > 0 ? configuredShifts.map(shift => (
            <div key={shift} className="flex items-center gap-3">
              <label className="w-1/3 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Ca {shift}:
              </label>
              <input
                type="number"
                className="flex-grow config-input"
                value={rules[ruleKey][shift] || 0}
                onChange={(e) => handleInputChange(shift, e.target.value)}
                min="0"
              />
              <Button
                variant="ghost"
                onClick={() => handleRemoveShiftRule(shift)}
                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1 rounded-full text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 transition"
                title={`Xóa cấu hình cho ca ${shift}`}
              >
                <Trash2 size={18} />
              </Button>
            </div>
          )) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center">Chưa có cấu hình ca nào. Hãy thêm ở bên dưới.</p>
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
            <Button
              type="button"
              onClick={() => {
                  if (newShiftCode && newShiftCode.trim()) {
                      handleAddShiftRule(newShiftCode.trim());
                      setNewShiftCode("");
                  }
              }}
              variant="secondary"
              className="whitespace-nowrap"
            >
              + Thêm
            </Button>
        </div>
      </>
    );
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={TITLES[ruleKey]}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave}>Lưu</Button>
        </div>
      }
    >
      {renderFields()}
    </Modal>
  );
};

export default EditRulesModal;
