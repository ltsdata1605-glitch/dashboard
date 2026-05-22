import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleInfo, StaffStats, SchedulingRules, StaffMember, DailyRequirements, Solution, EditShiftModalInfo, BusySchedule, SolutionAction } from '../types';
import { calculateTotalHours, findAutomaticReplacement } from '../utils/scheduleUtils';
import toast from 'react-hot-toast';


interface EditShiftModalProps {
  info: EditShiftModalInfo;
  onClose: () => void;
  onSave: (newShiftData: ScheduleInfo) => void;
  onFindSolution: () => Solution;
  onConfirmReplacement: (replacementId: string) => void;
  onConfirmDaySwap: (swapPartnerId: string, swapDay: number) => void;
  onFindSolutionForDemotion: (roleToReplace: 'gh' | 'kho' | 'tn') => Solution;
  onConfirmSwapAndChange: (replacementId: string, newShiftForOriginal: ScheduleInfo) => void;
  rules: SchedulingRules;
  allStaff: StaffMember[];
  dailyRequirements: DailyRequirements;
  busySchedule: BusySchedule; // Thêm lịch bận
  onConfirmCutShift: (employeeId: string, dayIndex: number, newShift: ScheduleInfo) => void;
  onConfirmNormalSwap: (employeeId1: string, employeeId2: string, dayIndex: number) => void;
  onConfirmCutAndSwap: (originalEmployeeId: string, partnerId: string, dayIndex: number, newUserShift: ScheduleInfo) => void;
  onConfirmMultipleChanges: (actions: SolutionAction[]) => void; // Thêm prop mới
}

const COMMON_SHIFTS = ["123", "456", "2345", "345", "245", "56", "23"];
const SPECIAL_SHIFTS: { label: string; data: ScheduleInfo }[] = [
    { label: 'Kho 123', data: { shift: '123', role: '123 (Kho)' } },
    { label: 'Kho 456', data: { shift: '456', role: '456 (Kho)' } },
    { label: 'TN 123', data: { shift: '123', role: '123 (TN)' } },
    { label: 'TN 456', data: { shift: '456', role: '456 (TN)' } },
    { label: 'GH 2345', data: { shift: '2345', role: '2345 (GH)' } },
];

type ModalView = 'main' | 'off_confirm' | 'demotion_confirm' | 'promotion_confirm' | 'suggestion' | 'staffing_warning_confirm' | 'manual_swap';

const getRoleType = (role: string): 'gh' | 'kho' | 'tn' | 'normal' => {
    if (role.includes('(GH)')) return 'gh';
    if (role.includes('(Kho)')) return 'kho';
    if (role.includes('(TN)')) return 'tn';
    return 'normal';
}

const EditShiftModal: React.FC<EditShiftModalProps> = ({ 
    info, 
    onClose, 
    onSave, 
    onFindSolution, 
    onConfirmReplacement,
    onConfirmDaySwap,
    onFindSolutionForDemotion,
    onConfirmSwapAndChange,
    rules,
    allStaff,
    dailyRequirements,
    busySchedule,
    onConfirmCutShift,
    onConfirmNormalSwap,
    onConfirmCutAndSwap,
    onConfirmMultipleChanges
}) => {
  const { employeeName, date, currentShift, employeeStats, department } = info;

  const [view, setView] = useState<ModalView>('main');
  const [suggestion, setSuggestion] = useState<Solution>(null);
  const [isLoading, setIsLoading] = useState(false);
  const suggestionTimeoutRef = React.useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
    };
  }, []);
  const [pendingShift, setPendingShift] = useState<ScheduleInfo | null>(null);
  const [suggestionContext, setSuggestionContext] = useState<'off' | 'demotion' | 'busy' | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isAddingNewCommon, setIsAddingNewCommon] = useState(false);
  const [customCommonShift, setCustomCommonShift] = useState('');
  const [isAddingNewSpecial, setIsAddingNewSpecial] = useState(false);
  const [customSpecialShift, setCustomSpecialShift] = useState('');
  const [swapSearchTerm, setSwapSearchTerm] = useState('');


  const checkAndProceed = (changes: { employeeId: string; newShift: ScheduleInfo }[], finalAction: () => void) => {
    const totalRequired = Object.keys(dailyRequirements).reduce((sum, key) => sum + dailyRequirements[key], 0);
    if (totalRequired === 0) {
        finalAction();
        return;
    }

    const tempStaffList = JSON.parse(JSON.stringify(allStaff));
    changes.forEach(change => {
        const staff = tempStaffList.find((s: StaffMember) => s.id === change.employeeId);
        if (staff) {
            staff.schedule[info.dayIndex] = change.newShift;
        }
    });

    const totalScheduled = tempStaffList.filter((s: StaffMember) => {
        const sched = s.schedule[info.dayIndex];
        return sched && sched.role !== 'OFF';
    }).length;

    if (totalScheduled / totalRequired < 0.7) {
        setPendingAction(() => finalAction);
        setView('staffing_warning_confirm');
    } else {
        finalAction();
    }
  };


  const handleSelectShift = (newShiftData: ScheduleInfo) => {
    const action = () => {
        const currentRoleType = getRoleType(currentShift.role);
        const newRoleType = getRoleType(newShiftData.role);
        
        if (currentRoleType !== 'normal' && currentRoleType !== newRoleType) {
            setPendingShift(newShiftData);
            setView('demotion_confirm');
            return;
        }

        if (newRoleType !== 'normal') {
            let requiredCount = 0;
            if (newRoleType === 'gh' && rules.gh[newShiftData.shift]) {
                requiredCount = rules.gh[newShiftData.shift];
            } else if (newRoleType === 'kho' && rules.kho[newShiftData.shift]) {
                requiredCount = rules.kho[newShiftData.shift];
            } else if (newRoleType === 'tn' && rules.tn[newShiftData.shift]) {
                requiredCount = rules.tn[newShiftData.shift];
            }

            const currentCount = allStaff.filter(staff => staff.schedule[info.dayIndex]?.role === newShiftData.role).length;

            if (currentCount >= requiredCount) {
                setPendingShift(newShiftData);
                setView('promotion_confirm');
                return;
            }
        }
        onSave(newShiftData);
    };
    
    checkAndProceed([{ employeeId: info.employeeId, newShift: newShiftData }], action);
  };

  const handleOffClick = () => {
    const action = () => {
        if (currentShift.role !== 'Trống' && currentShift.role !== 'OFF') {
          setView('off_confirm');
        } else {
          onSave({ shift: 'OFF', role: 'OFF' });
        }
    };
    checkAndProceed([{ employeeId: info.employeeId, newShift: { shift: 'OFF', role: 'OFF' }}], action);
  };

  const findAndSuggest = (context: 'off' | 'demotion' | 'busy', shiftToCover?: string) => {
      setIsLoading(true);
      setSuggestionContext(context);
      setSuggestion(null);
      setView('suggestion');

      if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
      suggestionTimeoutRef.current = window.setTimeout(() => {
          let allSolutions: Solution[] = [];

          if (context === 'busy') {
              const swapSolution = findSwapSolutions(info.currentShift.shift.includes('1') || info.currentShift.shift.includes('2') || info.currentShift.shift.includes('3') ? 'morning' : 'afternoon');
              if (swapSolution) allSolutions.push(swapSolution);
          }
          
          if (context === 'off' || !allSolutions.some(s => s?.type === 'pure_swap')) {
              const splitSolutionActions = findAutomaticReplacement(shiftToCover || info.currentShift.shift, info.dayIndex, allStaff, info.employeeId, busySchedule);
              if (splitSolutionActions && splitSolutionActions.length > 0) {
                  if (splitSolutionActions.length === 1) {
                      allSolutions.push({
                          type: 'extend',
                          staff: splitSolutionActions[0].staff,
                          originalShift: splitSolutionActions[0].originalShift,
                          newShift: splitSolutionActions[0].newShift,
                      });
                  } else {
                      allSolutions.push({ type: 'split_cover', actions: splitSolutionActions });
                  }
              }
          }

          if (allSolutions.length > 0) {
              let bestSolution: Solution = null;
              
              const solutionPriority = { 'pure_swap': 1, 'split_cover': 2, 'extend': 3, 'swap': 4, 'replace': 5 };
              allSolutions.sort((a, b) => {
                  if (!a || !b) return 0;
                  const priorityA = solutionPriority[a.type as keyof typeof solutionPriority] || 99;
                  const priorityB = solutionPriority[b.type as keyof typeof solutionPriority] || 99;
                  if (priorityA !== priorityB) return priorityA - priorityB;
                  if (a.type === 'split_cover' && b.type === 'split_cover') {
                      return b.actions.length - a.actions.length; // Ưu tiên gói có nhiều người hơn
                  }
                  return 0;
              });

              bestSolution = allSolutions[0];
              setSuggestion(bestSolution);
          }
          
          setIsLoading(false);
      }, 200);
  };
  
  const resetFlow = () => {
      setView('main');
      setSuggestion(null);
      setPendingShift(null);
      setSuggestionContext(null);
      setPendingAction(null);
      setSwapSearchTerm('');
  }

  const handleConfirmSuggestion = () => {
    if (!suggestion) return;

    if (suggestion.type === 'pure_swap') {
        onConfirmNormalSwap(info.employeeId, suggestion.partner.id, info.dayIndex);
        onClose();
    } else if (suggestion.type === 'extend') {
        onConfirmMultipleChanges([{
            staff: suggestion.staff,
            newShift: suggestion.newShift,
            originalShift: suggestion.originalShift
        }]);
    } else if (suggestion.type === 'split_cover') {
        onConfirmMultipleChanges(suggestion.actions);
    }
  };

  const handleSaveCustomShift = (type: 'common' | 'special') => {
    if (type === 'common' && customCommonShift.trim()) {
        const value = customCommonShift.trim();
        handleSelectShift({ shift: value, role: value });
        setIsAddingNewCommon(false);
        setCustomCommonShift('');
    } else if (type === 'special' && customSpecialShift.trim()) {
        const value = customSpecialShift.trim();
        const shiftCode = value.split(' ')[0] || value; 
        handleSelectShift({ shift: shiftCode, role: value });
        setIsAddingNewSpecial(false);
        setCustomSpecialShift('');
    }
  };

  const findSwapSolutions = (period: 'morning' | 'afternoon'): Solution | null => {
    const employeeShift = info.currentShift.shift;

    const potentialPartners = allStaff.filter(s => {
        if (s.id === info.employeeId) return false;
        if (busySchedule[s.id]?.[info.dayIndex]) return false;
        const sched = s.schedule[info.dayIndex];
        return sched && sched.role && !sched.role.includes('(') && sched.role !== 'OFF' && !sched.isManual;
    });

    let swapCandidates: { partner: StaffMember; partnerShift: ScheduleInfo }[] = [];
    
    // Ưu tiên 1: Xử lý cho ca 2345
    if (employeeShift === '2345') {
        const targetShifts = period === 'morning' ? ['45', '456'] : ['123', '23'];
        swapCandidates = potentialPartners
            .filter(p => targetShifts.includes(p.schedule[info.dayIndex]!.shift))
            .map(p => ({ partner: p, partnerShift: p.schedule[info.dayIndex]! }));
    } else {
    // Logic hoán đổi thuần túy chung
        const employeeShiftChars = employeeShift.split('');
        swapCandidates = potentialPartners.filter(p => {
            const partnerShiftChars = p.schedule[info.dayIndex]!.shift.split('');
            return !employeeShiftChars.some(char => partnerShiftChars.includes(char));
        }).map(p => ({ partner: p, partnerShift: p.schedule[info.dayIndex]! }));
    }
    
    if (swapCandidates.length === 0) return null;

    // Sắp xếp để chọn người tốt nhất
    swapCandidates.sort((a, b) => {
        const totalSpecialA = a.partner.stats.gh + a.partner.stats.kho + a.partner.stats.tn;
        const totalSpecialB = b.partner.stats.gh + b.partner.stats.kho + b.partner.stats.tn;
        if (totalSpecialA !== totalSpecialB) return totalSpecialA - totalSpecialB;
        return calculateTotalHours(a.partner) - calculateTotalHours(b.partner);
    });

    const bestSwap = swapCandidates[0];
    return { type: 'pure_swap', partner: bestSwap.partner, partnerShift: bestSwap.partnerShift };
  };

  const handleBusyTimeClick = (period: 'morning' | 'afternoon') => {
    const shiftString = currentShift.shift;
    const isMorningShift = /[123]/.test(shiftString);
    const isAfternoonShift = /[456]/.test(shiftString);

    if ((period === 'morning' && !isMorningShift) || (period === 'afternoon' && !isAfternoonShift)) {
        toast.error('Lịch bận của bạn không ảnh hưởng đến ca làm việc này.', { duration: 3000 });
        return;
    }

    if (info.isSpecialShift) {
        findAndSuggest('off', currentShift.shift);
    } else {
        findAndSuggest('busy', currentShift.shift);
    }
  };

  const swapCandidates = useMemo(() => {
      const term = swapSearchTerm.toLowerCase().trim();
      return allStaff.filter(s => {
          if (s.id === info.employeeId) return false;
          // Filter by term
          const nameMatch = s.name.toLowerCase().includes(term);
          const deptMatch = s.department.toLowerCase().includes(term);
          if (!nameMatch && !deptMatch) return false;
          
          const sched = s.schedule[info.dayIndex];
          return !!sched;
      });
  }, [allStaff, info.employeeId, info.dayIndex, swapSearchTerm]);


  const renderHeader = () => (
    <div className="mb-4 bg-gray-50 p-3 rounded-lg border">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-bold text-lg text-gray-800">{employeeName}</p>
                <p className="text-sm text-gray-500">{date}</p>
                <p className="text-sm mt-1">Ca hiện tại: <span className="font-bold text-blue-600">{currentShift.role}</span></p>
            </div>
            <div className="text-right">
                 <span className={`stat-badge ${employeeStats.swapCount > 8 ? 'stat-badge-warn' : 'stat-badge-ok'}`} title="Số lần đổi ca thủ công trong tháng">
                    Đổi ca: {employeeStats.swapCount}
                </span>
                <span className={`stat-badge ml-2 ${employeeStats.offDays > 4 ? 'stat-badge-warn' : 'stat-badge-ok'}`} title="Số ngày nghỉ trong tháng">
                    OFF: {employeeStats.offDays}
                </span>
            </div>
        </div>
         {currentShift.warning && (
            <div className="mt-2 p-2 bg-red-100 text-red-700 border border-red-200 rounded text-sm font-semibold text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1.5 align-text-bottom" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                {currentShift.warning}
            </div>
        )}
    </div>
  );

  const renderMainView = () => (
    <>
        <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">CHỌN CA THƯỜNG</h3>
                {!isAddingNewCommon && (
                    <button onClick={() => setIsAddingNewCommon(true)} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold py-1 px-2 rounded transition">
                        Thêm mới +
                    </button>
                )}
            </div>
            {isAddingNewCommon ? (
                <div className="flex gap-2 p-2 bg-gray-50 rounded-md border">
                    <input
                        type="text"
                        value={customCommonShift}
                        onChange={(e) => setCustomCommonShift(e.target.value)}
                        placeholder="Nhập mã ca, VD: 126"
                        className="config-input flex-grow"
                        autoFocus
                        onKeyDown={(e) => { if(e.key === 'Enter') handleSaveCustomShift('common') }}
                    />
                    <button onClick={() => handleSaveCustomShift('common')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded transition text-sm">Lưu</button>
                    <button onClick={() => { setIsAddingNewCommon(false); setCustomCommonShift(''); }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded transition text-sm">Hủy</button>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2">
                    {COMMON_SHIFTS.map(shift => (
                        <button key={shift} onClick={() => handleSelectShift({ shift, role: shift })} className="bg-white hover:bg-blue-50 border border-blue-300 text-blue-800 font-semibold py-2 px-3 rounded transition text-sm shadow-sm">
                            {shift}
                        </button>
                    ))}
                </div>
            )}
        </div>
        
        {department.toLowerCase().includes('all in one') && (
            <div className="mb-4">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">CHỌN CA ĐẶC BIỆT</h3>
                     {!isAddingNewSpecial && (
                        <button onClick={() => setIsAddingNewSpecial(true)} className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold py-1 px-2 rounded transition">
                            Thêm mới +
                        </button>
                    )}
                 </div>
                 {isAddingNewSpecial ? (
                    <div className="flex gap-2 p-2 bg-gray-50 rounded-md border">
                         <input
                            type="text"
                            value={customSpecialShift}
                            onChange={(e) => setCustomSpecialShift(e.target.value)}
                            placeholder="VD: 126 (Kho)"
                            className="config-input flex-grow" autoFocus
                            onKeyDown={(e) => { if(e.key === 'Enter') handleSaveCustomShift('special') }}
                        />
                        <button onClick={() => handleSaveCustomShift('special')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded transition text-sm">Lưu</button>
                        <button onClick={() => { setIsAddingNewSpecial(false); setCustomSpecialShift(''); }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded transition text-sm">Hủy</button>
                    </div>
                 ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {SPECIAL_SHIFTS.map(item => {
                            const isGhShift = item.label.includes('GH');
                            const isDisabled = isGhShift && info.gender === 'Nu';
                            return (
                                <button 
                                    key={item.label} 
                                    onClick={() => handleSelectShift(item.data)} 
                                    className={`bg-white hover:bg-purple-50 border border-purple-300 text-purple-800 font-semibold py-2 px-3 rounded transition text-sm shadow-sm ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isDisabled}
                                    title={isDisabled ? "Ca Giao Hàng chỉ dành cho nhân viên Nam" : ""}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                 )}
            </div>
        )}

        {currentShift.role !== 'OFF' && currentShift.role !== 'Trống' && (
            <div className="border-t pt-4 mt-4 space-y-3">
                <button 
                    onClick={() => setView('manual_swap')} 
                    className="w-full bg-indigo-50 border-2 border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-black py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    HOÁN ĐỔI CA THỦ CÔNG
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleBusyTimeClick('morning')} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl transition text-sm shadow-md">BẬN SÁNG</button>
                    <button onClick={() => handleBusyTimeClick('afternoon')} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2.5 px-4 rounded-xl transition text-sm shadow-md">BẬN CHIỀU</button>
                </div>
            </div>
        )}

        <div className="border-t pt-4 mt-4">
            <button onClick={handleOffClick} className="bg-rose-600 hover:bg-rose-700 text-white font-black py-3 px-4 rounded-xl transition w-full text-sm tracking-widest shadow-lg uppercase">
                CHO NGHỈ (OFF)
            </button>
        </div>
    </>
  );
  
  const renderConfirmationView = (title: string, message: React.ReactNode, onConfirm: () => void) => (
      <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg text-center">
        <h4 className="font-bold text-orange-800">{title}</h4>
        <div className="text-sm text-orange-700 my-3">{message}</div>
        <div className="flex justify-center gap-2 mt-4">
            <button onClick={resetFlow} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1.5 px-4 rounded transition text-xs">Hủy</button>
            {onConfirm && <button onClick={() => onConfirm()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded transition text-xs">Tìm giải pháp</button>}
             <button onClick={() => onSave({ shift: 'OFF', role: 'OFF', warning: 'Thiếu nhân sự, cần xử lý thủ công' })} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-4 rounded transition text-xs">Vẫn cho nghỉ (OFF)</button>
        </div>
    </div>
  );

  const renderManualSwapView = () => (
      <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b pb-2">
              <button onClick={resetFlow} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h3 className="font-bold text-slate-800">Chọn đối tác hoán đổi ca</h3>
          </div>
          
          <div className="relative">
              <input 
                  type="text" 
                  className="config-input w-full pl-10" 
                  placeholder="Tìm theo tên hoặc bộ phận..." 
                  value={swapSearchTerm}
                  onChange={(e) => setSwapSearchTerm(e.target.value)}
                  autoFocus
              />
              <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          <div className="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scroll">
              {swapCandidates.length > 0 ? (
                  swapCandidates.map(staff => (
                      <div key={staff.id} className="p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex justify-between items-center group shadow-sm">
                          <div>
                              <p className="font-bold text-slate-800 text-sm">{staff.name.split(' - ')[1] || staff.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{staff.department}</p>
                              <p className="text-xs mt-1 text-slate-600">Ca hiện tại: <span className="font-black text-indigo-600">{staff.schedule[info.dayIndex]?.role || 'Trống'}</span></p>
                          </div>
                          <button 
                              onClick={() => {
                                  onConfirmNormalSwap(info.employeeId, staff.id, info.dayIndex);
                                  onClose();
                              }} 
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-2"
                          >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                              ĐỔI
                          </button>
                      </div>
                  ))
              ) : (
                  <div className="py-8 text-center text-slate-400 italic text-sm bg-slate-50 rounded-xl border border-dashed">
                      Không tìm thấy nhân viên phù hợp
                  </div>
              )}
          </div>
          
          <p className="text-[10px] text-slate-400 font-medium italic text-center">
              * Lưu ý: Thao tác hoán đổi sẽ tráo đổi trực tiếp ca của hai người.
          </p>
      </div>
  );

  const renderSolutionAction = (action: SolutionAction, isPartOfPackage: boolean) => (
        <>
            <p className="text-sm text-gray-700">
                <strong>{isPartOfPackage ? 'Hành động:' : 'Đề xuất cho:'}</strong> <strong className="text-cyan-600">{action.staff.name}</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">
                Ca hiện tại: <span className="font-mono bg-gray-100 px-1 rounded">{action.originalShift.role || 'Trống'}</span>
                <span className="mx-2">→</span>
                Ca mới: <span className="font-mono font-bold bg-cyan-100 text-cyan-800 px-1 rounded">{action.newShift.role}</span>
            </p>
        </>
    );

  const renderSuggestionView = () => {
    return (
     <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
        <h4 className="font-bold text-blue-700">Đề xuất thay thế</h4>
        {isLoading && <div className="flex justify-center items-center p-4"><div className="spinner"></div></div>}
        {!isLoading && (
            suggestion ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {suggestion.type === 'pure_swap' && (
                    <div className="p-3 bg-white rounded border border-indigo-300 text-left">
                        <div className="flex justify-between items-center">
                             <div>
                                <p className="font-semibold text-indigo-800">Gợi Ý Hoán Đổi Tối Ưu</p>
                                <p className="text-sm text-gray-700 mt-2">
                                    <strong>Hoán đổi ca</strong> với <strong className="text-purple-600">{suggestion.partner.name}</strong>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Ca của bạn (<span className="font-mono bg-gray-100 px-1 rounded">{info.currentShift.role}</span>)
                                    <span className="mx-2 font-bold text-green-600">↔</span>
                                    Ca của {suggestion.partner.name.split(' - ')[1] || suggestion.partner.name} (<span className="font-mono bg-gray-100 px-1 rounded">{suggestion.partnerShift.role}</span>)
                                </p>
                            </div>
                            <button onClick={handleConfirmSuggestion} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded transition text-xs self-center flex-shrink-0 ml-2">Xác nhận</button>
                        </div>
                    </div>
                )}
                {suggestion.type === 'extend' && (
                    <div className="p-3 bg-white rounded border border-cyan-300 flex justify-between items-center text-left">
                        <div> {renderSolutionAction(suggestion, false)} </div>
                        <button onClick={handleConfirmSuggestion} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded transition text-xs self-center flex-shrink-0 ml-2">Chọn</button>
                    </div>
                )}
                {suggestion.type === 'split_cover' && (
                     <div className="p-3 bg-white rounded border border-teal-300 text-left">
                        <div className="flex justify-between items-center">
                            <p className="font-bold text-teal-700">Gói giải pháp (Nhiều người)</p>
                            <button onClick={handleConfirmSuggestion} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-1 px-3 rounded transition text-xs self-center flex-shrink-0 ml-2">Chọn Gói</button>
                        </div>
                        <div className="mt-2 space-y-2 border-t pt-2">
                             {suggestion.actions.map((action, actionIndex) => (
                                 <div key={actionIndex}> {renderSolutionAction(action, true)} </div>
                             ))}
                        </div>
                    </div>
                )}
                <div className="flex justify-center gap-2 mt-3 pt-3 border-t">
                    <button onClick={resetFlow} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded transition text-xs">Hủy</button>
                    <button onClick={() => onSave({ shift: 'OFF', role: 'OFF', warning: 'Thiếu nhân sự, cần xử lý thủ công' })} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded transition text-xs">Vẫn cho nghỉ (OFF)</button>
                </div>
            </div>
            ) : (
                <>
                    <p className="text-sm text-red-600 my-2">Không tìm thấy giải pháp thay thế phù hợp.</p>
                    <div className="flex justify-center gap-2 mt-3">
                        <button onClick={resetFlow} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded transition text-xs">Hủy</button>
                        <button onClick={() => onSave({ shift: 'OFF', role: 'OFF', warning: 'Thiếu nhân sự, cần xử lý thủ công' })} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded transition text-xs">Vẫn cho nghỉ (OFF)</button>
                    </div>
                </>
            )
        )}
    </div>
    );
  };
  
  const renderPromotionConfirmView = () => {
    const action = () => {
        checkAndProceed([{ employeeId: info.employeeId, newShift: pendingShift! }], () => onSave(pendingShift!));
    }
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
          <h4 className="font-bold text-yellow-800">Cảnh báo trùng lặp</h4>
          <p className="text-sm text-yellow-700 my-2">Ca đặc biệt <strong>({pendingShift?.role})</strong> đã đủ số lượng yêu cầu cho ngày hôm nay. Bạn vẫn muốn thêm?</p>
          <div className="flex justify-center gap-2 mt-3">
              <button onClick={resetFlow} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded transition text-xs">Hủy</button>
              <button onClick={action} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded transition text-xs">Vẫn thêm</button>
          </div>
      </div>
    );
  }

  const renderStaffingWarningView = () => (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
          <h4 className="font-bold text-red-800">Cảnh báo thiếu hụt nhân sự!</h4>
          <p className="text-sm text-red-700 my-2">Sau khi thay đổi, nhân sự ngày này sẽ dưới 70% yêu cầu. Bạn có chắc chắn muốn tiếp tục?</p>
          <div className="flex justify-center gap-2 mt-3">
              <button onClick={resetFlow} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded transition text-xs">Hủy</button>
              <button onClick={() => pendingAction && pendingAction()} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded transition text-xs">Vẫn tiếp tục</button>
          </div>
      </div>
  );


  const renderHistoryView = () => {
    const offHistory = info.changeHistory.filter(h => h.to === 'OFF');
    const swapHistory = info.changeHistory.filter(h => h.to !== 'OFF');

    if (info.changeHistory.length === 0) return null;

    return (
        <div className="mt-4 border-t pt-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Lịch sử thay đổi</h4>
            <div className="max-h-24 overflow-y-auto text-[11px] space-y-1 pr-2 text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 custom-scroll font-medium">
                {swapHistory.map((h, i) => (
                    <p key={`swap-${i}`}><span className="text-slate-400 font-mono">{h.date}:</span> Đổi <span className="line-through opacity-60">{h.from}</span> &rarr; <span className="font-bold text-slate-700">{h.to}</span></p>
                ))}
                {offHistory.map((h, i) => (
                     <p key={`off-${i}`} className="text-rose-600"><span className="text-slate-400 font-mono">{h.date}:</span> Nghỉ <span className="opacity-60">(từ {h.from})</span></p>
                ))}
            </div>
        </div>
    );
  };


  const renderContent = () => {
    switch (view) {
        case 'off_confirm':
            const isSpecial = getRoleType(currentShift.role) !== 'normal';
            const title = isSpecial ? "Cảnh báo ca đặc biệt!" : "Xác nhận cho nghỉ";
            const message = isSpecial ? 
                <>Nhân viên này đang có ca quan trọng (<strong>{currentShift.role}</strong>). Cần tìm giải pháp thay thế để đảm bảo hoạt động.</> :
                <>Cho nhân viên <strong>nghỉ</strong> sẽ giảm nhân sự trong ngày. Bạn có muốn tìm giải pháp không?</>;

            return renderConfirmationView(title, message, () => findAndSuggest(
                'off', 
                currentShift.shift
            ));
        case 'demotion_confirm':
             return renderConfirmationView("Thay đổi ca đặc biệt!", <>Bạn đang đổi ca quan trọng <strong>({currentShift.role})</strong>. Cần tìm người thay thế cho vị trí này.</>, () => findAndSuggest('demotion', currentShift.shift));
        case 'suggestion':
            return renderSuggestionView();
        case 'promotion_confirm':
            return renderPromotionConfirmView();
        case 'staffing_warning_confirm':
            return renderStaffingWarningView();
        case 'manual_swap':
            return renderManualSwapView();
        default:
            return renderMainView();
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white p-6 rounded-[32px] shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200 border border-white/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Cập Nhật Ca Làm Việc</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-800 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        {renderHeader()}
        <div className="mt-2">
            {renderContent()}
        </div>
        {renderHistoryView()}

      </div>
    </div>
  );
};

export default EditShiftModal;
