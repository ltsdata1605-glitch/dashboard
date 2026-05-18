import React, { useState, useEffect } from 'react';
import { HOURS_CONFIG } from '../constants';
import * as idb from '../db/idb';
import { StaffMember, ScheduleConfig, ScheduleTargets, SchedulingRules, ScheduleInfo, DailyRequirements, StaffInitialData, ImportedStaff, StaffWithGender, Solution, EditShiftModalInfo, ChangeHistoryEntry, BusySchedule, BusyStatus, ScheduleSuggestion, ScheduleHistoryEntry, SolutionAction, UnresolvedConflict, EmployeeBusyReport, MonthlyStats, BalancingFeedback, ShiftDefinitions } from '../types';
import { GoogleGenAI } from "@google/genai";

interface EditPatternModalProps {
  currentPatterns: { [key: string]: string[] };
  allDepartments: string[];
  onClose: () => void;
  onSave: (newPatterns: { [key: string]: string[] }) => void;
  staffCountByDept: { [key: string]: number };
  dailyRequirements: DailyRequirements | null;
  onRequirementsUpdate: (reqs: DailyRequirements) => void;
  shiftDefinitions: ShiftDefinitions;
  onShiftDefinitionsUpdate: (sd: ShiftDefinitions) => void;
}

interface PreviewStats {
  [key: string]: number; // '1', '2', ..., '6'
  totalHours: number;
}


const EditPatternModal: React.FC<EditPatternModalProps> = ({ currentPatterns, allDepartments, onClose, onSave, staffCountByDept, dailyRequirements, onRequirementsUpdate, shiftDefinitions, onShiftDefinitionsUpdate }) => {
  const [patternsByDept, setPatternsByDept] = useState(currentPatterns);
  const [selectedDept, setSelectedDept] = useState<string>(allDepartments[0] || '');
  const [previewStats, setPreviewStats] = useState<PreviewStats | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [departmentRequirements, setDepartmentRequirements] = useState<{ [key: string]: DailyRequirements }>({});
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [isSuggesting, setIsSuggesting] = useState(false);


  useEffect(() => {
    const checkFirstVisit = async () => {
        try {
            const hasSeen = await idb.loadData<boolean>('hasSeenPatternHelp');
            if (!hasSeen) {
                setShowHelp(true);
            }
            const savedReqs = await idb.loadData<{ [key: string]: DailyRequirements }>('departmentPatternRequirements');
            if (savedReqs) {
                setDepartmentRequirements(savedReqs);
            }
        } catch (error) {
            console.error("Failed to load initial data for pattern modal:", error);
        }
    };
    checkFirstVisit();
  }, []);
  
  useEffect(() => {
    if ((!selectedDept || !allDepartments.includes(selectedDept)) && allDepartments.length > 0) {
      setSelectedDept(allDepartments[0]);
    }
  }, [allDepartments, selectedDept]);
  
  // Start onboarding guide if the department has no patterns
  useEffect(() => {
    if (selectedDept && (!currentPatterns[selectedDept] || currentPatterns[selectedDept].length === 0)) {
        setOnboardingStep(1);
    } else {
        setOnboardingStep(0);
    }
  }, [selectedDept, currentPatterns]);


  // Sync IN: When dailyRequirements prop (from App state, changed by DailyStatsTable) changes,
  // update the internal state of this modal for the currently selected department.
  useEffect(() => {
    if (selectedDept && dailyRequirements) {
        const currentInternalReqs = departmentRequirements[selectedDept];
        // Only update if the external data is different to prevent re-render loops.
        if (JSON.stringify(currentInternalReqs) !== JSON.stringify(dailyRequirements)) {
            setDepartmentRequirements(prev => ({
                ...prev,
                [selectedDept]: dailyRequirements
            }));
        }
    }
  }, [dailyRequirements, selectedDept, departmentRequirements]);


  // Sync OUT: When the user changes department in this modal,
  // push the requirements for that department out to the App state.
  useEffect(() => {
    if (selectedDept) {
      const reqsForSelectedDept = departmentRequirements[selectedDept] || dailyRequirements;
      if (reqsForSelectedDept) {
        onRequirementsUpdate(reqsForSelectedDept);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDept, departmentRequirements]);


  useEffect(() => {
    if (!selectedDept) {
      setPreviewStats(null);
      return;
    }
    
    const pattern = patternsByDept[selectedDept] || [];
    const numStaff = pattern.length; // Logic mới: Tính toán dựa trên số dòng (chu kỳ) của mẫu ca

    const defaultStats: PreviewStats = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, totalHours: 0 };

    if (numStaff === 0) {
      setPreviewStats(defaultStats);
      return;
    }

    const shiftCounts: { [key: string]: number } = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 };
    let totalHoursInPattern = 0;

    pattern.forEach(shiftCode => {
      // Just check existence of digits for hours calculation
      const cleanStr = shiftCode.replace(/[^0-9]/g, '');
      for (const char of cleanStr) {
        if (shiftCounts[char] !== undefined) {
          shiftCounts[char]++;
          totalHoursInPattern += (HOURS_CONFIG[char] || 0);
        }
      }
    });

    const avgStats: PreviewStats = { totalHours: 0 };
    
    Object.keys(shiftCounts).forEach(slot => {
      const avg = (shiftCounts[slot] / pattern.length) * numStaff;
      avgStats[slot] = Math.round(avg); 
    });
    
    const avgTotalHoursPerDay = (totalHoursInPattern / pattern.length) * numStaff;
    avgStats.totalHours = Math.round(avgTotalHoursPerDay);
    
    setPreviewStats(avgStats);

  }, [patternsByDept, selectedDept]);

  const handleCheckboxChange = (patternIndex: number, shiftNumber: number) => {
    const shiftChar = String(shiftNumber);
    const currentPattern = patternsByDept[selectedDept]?.[patternIndex] || '';
    
    let newPatternValue;
    
    if (currentPattern.includes(shiftChar)) {
        // Remove strictly that character
        newPatternValue = currentPattern.replace(shiftChar, '');
    } else {
        // Append
        const digits = currentPattern.match(/\d/g) || [];
        const nonDigits = currentPattern.match(/[^\d]/g) || [];
        
        const newDigits = [...digits, shiftChar].sort().join('');
        // Reconstruct implies potential loss of order for mixed content, 
        // but typically patterns are just digits. 
        // For simplicity with mixed input, we just append if complex, or sort if simple.
        
        if (nonDigits.length > 0) {
            newPatternValue = currentPattern + shiftChar;
        } else {
            newPatternValue = newDigits;
        }
    }
    
    const updatedPatterns = [...(patternsByDept[selectedDept] || [])];
    updatedPatterns[patternIndex] = newPatternValue;
    setPatternsByDept(prev => ({ ...prev, [selectedDept]: updatedPatterns }));
  };

  const handlePatternTextChange = (patternIndex: number, value: string) => {
    const updatedPatterns = [...(patternsByDept[selectedDept] || [])];
    updatedPatterns[patternIndex] = value;
    setPatternsByDept(prev => ({ ...prev, [selectedDept]: updatedPatterns }));
  };

  const handleAddPattern = () => {
    if (onboardingStep === 2) setOnboardingStep(0);
    if (selectedDept) {
      const updatedPatterns = [...(patternsByDept[selectedDept] || []), ''];
      setPatternsByDept(prev => ({ ...prev, [selectedDept]: updatedPatterns }));
    }
  };

  const handleRemovePattern = (index: number) => {
    const updatedPatterns = (patternsByDept[selectedDept] || []).filter((_, i) => i !== index);
    setPatternsByDept(prev => ({ ...prev, [selectedDept]: updatedPatterns }));
  };
  
  const handleRequirementChange = (slot: string, value: string) => {
    if (onboardingStep === 1) setOnboardingStep(2);
    const newValue = parseInt(value, 10);
    const cleanValue = isNaN(newValue) ? 0 : newValue; // Treat invalid/empty as 0

    if (cleanValue >= 0 && selectedDept) {
        const newDeptReqs = {
            ...(departmentRequirements[selectedDept] || dailyRequirements || {}),
            [slot]: cleanValue
        };
        
        // Update internal state first
        setDepartmentRequirements(prev => ({
            ...prev,
            [selectedDept]: newDeptReqs
        }));

        // Then, push the update to the parent (App state)
        onRequirementsUpdate(newDeptReqs);
    }
  };


  const suggestPattern = async () => {
    if (!selectedDept) return;
    const reqs = departmentRequirements[selectedDept] || dailyRequirements;
    if (!reqs) return;

    setIsSuggesting(true);
    try {
        // Thuật toán gợi ý đơn giản: 
        // 1. Xác định số lượng nhân sự cần thiết (max của các yêu cầu ca)
        // 2. Tạo các chuỗi ca xoay vòng
        const slots = ['1', '2', '3', '4', '5', '6'];
        const totalReq = slots.reduce((sum, s) => sum + (reqs[s] || 0), 0);
        
        // Giả định số lượng nhân sự tối ưu là khoảng 1.5 - 2 lần tổng yêu cầu ca (để có ngày nghỉ)
        // Hoặc dựa trên yêu cầu thực tế nếu đã nhập.
        const staffNeeded = Math.max(staffCountByDept[selectedDept] || 0, Math.ceil(totalReq * 1.5));
        
        const newPatterns: string[] = [];
        for (let i = 0; i < staffNeeded; i++) {
            newPatterns.push("");
        }

        let currentStaffIdx = 0;
        slots.forEach(slot => {
            const count = reqs[slot] || 0;
            for (let c = 0; c < count; c++) {
                // Phân bổ ca này cho nhân sự tiếp theo
                newPatterns[currentStaffIdx % staffNeeded] += slot;
                currentStaffIdx++;
            }
        });

        // Sắp xếp lại các ký tự trong mỗi pattern
        const finalPatterns = newPatterns.map(p => p.split('').sort().join(''));
        
        setPatternsByDept(prev => ({
            ...prev,
            [selectedDept]: finalPatterns
        }));
    } catch (error) {
        console.error("Suggestion failed:", error);
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleSave = async () => {
    if (showHelp) {
        await idb.saveData('hasSeenPatternHelp', true);
    }
    await idb.saveData('departmentPatternRequirements', departmentRequirements);
    const validatedPatterns: { [key: string]: string[] } = {};
    for (const dept in patternsByDept) {
        const patterns = patternsByDept[dept].map(p => p.trim()).filter(Boolean);
        if (patterns.length > 0) {
            validatedPatterns[dept] = patterns;
        }
    }
    onSave(validatedPatterns);
  };

  const handleClose = async () => {
    if (showHelp) {
        await idb.saveData('hasSeenPatternHelp', true);
    }
    await idb.saveData('departmentPatternRequirements', departmentRequirements);
    onClose();
  };


  const patternsForSelectedDept = patternsByDept[selectedDept] || [];
  const SHIFTS = [1, 2, 3, 4, 5, 6];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] backdrop-blur-sm">
      <div className="bg-white p-5 shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col border border-slate-200">
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Quản Lý Mẫu Ca Xoay</h2>
            <button onClick={handleClose} className="p-1 hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {showHelp && (
            <div className="relative mb-3 p-3 bg-indigo-50/50 border border-indigo-100 text-indigo-800 text-xs shadow-sm">
                <button 
                    onClick={async () => {
                        setShowHelp(false);
                        await idb.saveData('hasSeenPatternHelp', true);
                    }} 
                    className="absolute top-1 right-1 text-indigo-400 hover:text-indigo-600 font-bold p-1"
                    title="Đóng hướng dẫn"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h4 className="font-black flex items-center gap-1.5 uppercase tracking-wider mb-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Hướng dẫn nhanh
                </h4>
                <ul className="list-disc list-inside space-y-0.5 ml-1 text-[11px]">
                    <li><strong>Tick vào các ô</strong> để tạo một chuỗi ca (VD: tick Ca 1, 2, 3 sẽ tạo mã ca "123").</li>
                    <li><strong>Mã Ca</strong> và <strong>GC/Ca</strong> (Giờ công/Ca) sẽ tự động cập nhật.</li>
                    <li>Bạn cũng có thể <strong>nhập trực tiếp</strong> vào ô Mã Ca (chấp nhận cả chữ và số).</li>
                    <li>Nhấn <strong>"+ Thêm nhân viên mới"</strong> để thêm một bước vào chu kỳ xoay ca.</li>
                    <li className="font-bold text-rose-600">Ca xoay hiệu quả khi số lượng ca xoay bằng 1/2 số lượng nhân sự.</li>
                </ul>
            </div>
        )}

        <div className="mb-3 flex items-center gap-3 bg-slate-50 border border-slate-200 p-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Chọn bộ phận:</label>
            <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="flex-grow px-2 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 outline-none focus:border-indigo-500"
            >
                {allDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept} ({staffCountByDept[dept] || 0} NV)</option>
                ))}
            </select>
        </div>
        
        {previewStats && (
            <div className="mb-3 border border-slate-200 bg-white">
                <div className="bg-slate-50 p-2 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Xem trước số lượng (Trung bình/ngày)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400">
                                <th className="p-1.5 text-left w-20 font-black">Chỉ số</th>
                                <th className="p-1.5 font-black">Ca 1</th>
                                <th className="p-1.5 font-black">Ca 2</th>
                                <th className="p-1.5 font-black">Ca 3</th>
                                <th className="p-1.5 font-black">Ca 4</th>
                                <th className="p-1.5 font-black">Ca 5</th>
                                <th className="p-1.5 font-black">Ca 6</th>
                                <th className="p-1.5 font-black text-indigo-600 bg-indigo-50 border-l border-slate-200">GC/Ngày</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-100 bg-white">
                                <td className="p-1.5 font-bold text-indigo-600 text-left text-[10px] uppercase tracking-widest">Khung Giờ</td>
                                {['1', '2', '3', '4', '5', '6'].map(slot => (
                                    <td key={slot} className="p-1">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <input 
                                                type="time" 
                                                value={shiftDefinitions[slot]?.startTime || ''} 
                                                onChange={(e) => onShiftDefinitionsUpdate({ ...shiftDefinitions, [slot]: { ...shiftDefinitions[slot], startTime: e.target.value } })}
                                                className="w-[60px] text-[9px] font-mono font-bold text-slate-600 border border-slate-200 rounded p-0.5 text-center focus:border-indigo-500 outline-none" 
                                            />
                                            <input 
                                                type="time" 
                                                value={shiftDefinitions[slot]?.endTime || ''} 
                                                onChange={(e) => onShiftDefinitionsUpdate({ ...shiftDefinitions, [slot]: { ...shiftDefinitions[slot], endTime: e.target.value } })}
                                                className="w-[60px] text-[9px] font-mono font-bold text-slate-600 border border-slate-200 rounded p-0.5 text-center focus:border-indigo-500 outline-none" 
                                            />
                                        </div>
                                    </td>
                                ))}
                                <td className="p-1.5 bg-indigo-50 border-l border-slate-200"></td>
                            </tr>
                            <tr className="relative border-b border-slate-100">
                                {onboardingStep === 1 && (
                                    <td colSpan={8} className="absolute inset-0 ring-2 ring-rose-500 pointer-events-none">
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-48 bg-rose-600 text-white text-[10px] font-bold py-1 px-2 shadow-lg z-50 text-center">
                                            Bước 1: Nhập số lượng yêu cầu.
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-rose-600 rotate-45"></div>
                                        </div>
                                    </td>
                                )}
                                <td className="p-1.5 font-bold text-rose-600 text-left">Yêu Cầu</td>
                                {['1', '2', '3', '4', '5', '6'].map(slot => (
                                    <td key={slot} className="p-1">
                                        <input
                                            id={`pattern-req-input-${slot}`}
                                            type="number"
                                            value={departmentRequirements[selectedDept]?.[slot] || ''}
                                            onChange={(e) => handleRequirementChange(slot, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const nextSlot = String(parseInt(slot) + 1);
                                                    const nextInput = document.getElementById(`pattern-req-input-${nextSlot}`);
                                                    if (nextInput) {
                                                        (nextInput as HTMLInputElement).focus();
                                                        (nextInput as HTMLInputElement).select();
                                                    }
                                                }
                                            }}
                                            className="w-full max-w-[50px] mx-auto text-center font-bold bg-white border border-slate-300 p-1 focus:border-indigo-500 outline-none text-xs"
                                            min="0"
                                            placeholder="-"
                                        />
                                    </td>
                                ))}
                                <td className="p-1.5 bg-indigo-50 border-l border-slate-200"></td>
                            </tr>
                            <tr>
                                <td className="p-1.5 font-bold text-slate-700 text-left">Đã sắp</td>
                                {['1', '2', '3', '4', '5', '6'].map(slot => {
                                    const required = departmentRequirements[selectedDept]?.[slot] || 0;
                                    const scheduled = previewStats[slot];
                                    let statusColor = 'text-slate-700';
                                    if (required > 0) {
                                        if (scheduled < required) statusColor = 'text-amber-600';
                                        else if (scheduled > required) statusColor = 'text-rose-600';
                                        else statusColor = 'text-emerald-600';
                                    }
                                    return <td key={slot} className={`p-1.5 font-mono font-bold text-sm ${statusColor}`}>{scheduled}</td>
                                })}
                                <td className="p-1.5 font-mono font-black text-sm text-indigo-700 bg-indigo-50 border-l border-slate-200">{previewStats.totalHours}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        <div className="overflow-y-auto flex-grow mb-3 pr-2 border-t border-slate-200 pt-3">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black text-slate-700">Danh sách ca: <span className="text-indigo-600">{selectedDept}</span></h3>
            <button 
                onClick={suggestPattern}
                disabled={isSuggesting || !selectedDept}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all disabled:opacity-50"
            >
                {isSuggesting ? (
                    <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
                Gợi ý ca xoay
            </button>
          </div>
          
          <div className="bg-white border border-slate-200">
              <div className="grid grid-cols-12 gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-200 py-2 pr-8">
                  <div className="col-span-1 text-center">STT</div>
                  {SHIFTS.map(s => <div key={s} className="col-span-1 text-center">Ca {s}</div>)}
                  <div className="col-span-2 text-center border-l border-slate-200">Mã Ca</div>
                  <div className="col-span-2 text-center border-l border-slate-200">GC/Ca</div>
                  <div className="col-span-1 text-center"></div>
              </div>
              
              {patternsForSelectedDept.length > 0 ? (
                patternsForSelectedDept.map((pattern, index) => {
                  const totalHours = pattern.split('').reduce((sum, char) => sum + (HOURS_CONFIG[char] || 0), 0);
                  return (
                    <div key={index} className="grid grid-cols-12 gap-1 items-center border-b border-slate-100 hover:bg-slate-50 py-1 relative">
                        <div className="col-span-1 text-center text-slate-400 font-mono text-xs font-bold">{index + 1}</div>
                        {SHIFTS.map(shift => (
                            <div key={shift} className="col-span-1 text-center flex justify-center">
                                <input
                                    type="checkbox"
                                    checked={pattern.includes(String(shift))}
                                    onChange={() => handleCheckboxChange(index, shift)}
                                    className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer rounded-none accent-indigo-600"
                                />
                            </div>
                        ))}
                        <div className="col-span-2 px-1 border-l border-slate-100">
                            <input 
                                type="text"
                                value={pattern}
                                onChange={(e) => handlePatternTextChange(index, e.target.value)}
                                className="w-full text-center font-mono font-bold text-indigo-700 bg-white border border-slate-200 py-1 text-xs outline-none focus:border-indigo-500"
                                placeholder="-"
                            />
                        </div>
                        <div className="col-span-2 text-center font-mono font-bold text-amber-700 bg-amber-50 py-1 text-xs border-l border-slate-100">
                            {totalHours > 0 ? totalHours : '-'}
                        </div>
                        <div className="col-span-1 text-center absolute right-2">
                            <button onClick={() => handleRemovePattern(index)} className="text-slate-400 hover:text-rose-600 font-bold p-1 hover:bg-rose-50 transition" title="Xóa dòng này">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-center text-slate-400 text-xs italic py-4">Chưa có mẫu ca nào cho bộ phận này.</p>
              )}
          </div>
          
           <div className="relative mt-3">
                {onboardingStep === 2 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 bg-rose-600 text-white text-[10px] font-bold py-1 px-2 shadow-lg z-50 text-center">
                        Bước 2: Thêm chu kỳ xoay ca.
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-2 h-2 bg-rose-600 rotate-45"></div>
                    </div>
                )}
               <button onClick={handleAddPattern} className={`bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 border border-slate-300 transition-all w-full text-xs ${onboardingStep === 2 ? 'ring-2 ring-rose-500' : ''}`} disabled={!selectedDept}>
                  + Thêm nhân viên mới
              </button>
           </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 mt-auto">
          <button type="button" onClick={handleClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-5 transition-all text-xs">
            Hủy
          </button>
          <button type="button" onClick={handleSave} className="bg-slate-900 hover:bg-black text-white font-bold py-2 px-6 shadow transition-all text-xs">
            Lưu Thay Đổi
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPatternModal;