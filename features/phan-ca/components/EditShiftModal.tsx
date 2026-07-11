import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeftRight, ChevronLeft, Search, AlertTriangle, X } from 'lucide-react';
import { ScheduleInfo, StaffStats, SchedulingRules, StaffMember, DailyRequirements, Solution, EditShiftModalInfo, BusySchedule, SolutionAction } from '../types';
import { calculateTotalHours, findAutomaticReplacement } from '../utils/scheduleUtils';
import toast from 'react-hot-toast';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { EmptyState } from '../../../components/shared/ui/EmptyState';


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

    const tempStaffList = structuredClone(allStaff);
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
    <div className="mb-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{employeeName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{date}</p>
                <p className="text-sm mt-1 text-slate-700 dark:text-slate-300">Ca hiện tại: <span className="font-bold text-sky-600 dark:text-sky-400">{currentShift.role}</span></p>
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
            <div className="mt-2 p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded text-sm font-semibold text-center">
                <AlertTriangle size={16} className="inline mr-1.5 align-text-bottom" />
                {currentShift.warning}
            </div>
        )}
    </div>
  );

  const renderMainView = () => (
    <>
        <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">CHỌN CA THƯỜNG</h3>
                {!isAddingNewCommon && (
                    <Button variant="ghost" onClick={() => setIsAddingNewCommon(true)} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit text-xs bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 hover:bg-sky-200 dark:hover:bg-sky-900/50 font-semibold py-1 px-2 rounded transition">
                        Thêm mới +
                    </Button>
                )}
            </div>
            {isAddingNewCommon ? (
                <div className="flex gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700">
                    <input
                        type="text"
                        value={customCommonShift}
                        onChange={(e) => setCustomCommonShift(e.target.value)}
                        placeholder="Nhập mã ca, VD: 126"
                        className="config-input flex-grow"
                        autoFocus
                        onKeyDown={(e) => { if(e.key === 'Enter') handleSaveCustomShift('common') }}
                    />
                    <Button variant="ghost" onClick={() => handleSaveCustomShift('common')} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded transition text-sm">Lưu</Button>
                    <Button variant="ghost" onClick={() => { setIsAddingNewCommon(false); setCustomCommonShift(''); }} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-1 px-3 rounded transition text-sm">Hủy</Button>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2">
                    {COMMON_SHIFTS.map(shift => (
                        <Button variant="ghost" key={shift} onClick={() => handleSelectShift({ shift, role: shift })} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-900/20 border border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-400 font-semibold py-2 px-3 rounded transition text-sm shadow-sm">
                            {shift}
                        </Button>
                    ))}
                </div>
            )}
        </div>

        {department.toLowerCase().includes('all in one') && (
            <div className="mb-4">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">CHỌN CA ĐẶC BIỆT</h3>
                     {!isAddingNewSpecial && (
                        <Button variant="ghost" onClick={() => setIsAddingNewSpecial(true)} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 font-semibold py-1 px-2 rounded transition">
                            Thêm mới +
                        </Button>
                    )}
                 </div>
                 {isAddingNewSpecial ? (
                    <div className="flex gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700">
                         <input
                            type="text"
                            value={customSpecialShift}
                            onChange={(e) => setCustomSpecialShift(e.target.value)}
                            placeholder="VD: 126 (Kho)"
                            className="config-input flex-grow" autoFocus
                            onKeyDown={(e) => { if(e.key === 'Enter') handleSaveCustomShift('special') }}
                        />
                        <Button variant="ghost" onClick={() => handleSaveCustomShift('special')} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded transition text-sm">Lưu</Button>
                        <Button variant="ghost" onClick={() => { setIsAddingNewSpecial(false); setCustomSpecialShift(''); }} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-1 px-3 rounded transition text-sm">Hủy</Button>
                    </div>
                 ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {SPECIAL_SHIFTS.map(item => {
                            const isGhShift = item.label.includes('GH');
                            const isDisabled = isGhShift && info.gender === 'Nu';
                            return (
                                <Button
                                    variant="ghost"
                                    key={item.label}
                                    onClick={() => handleSelectShift(item.data)}
                                    className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-400 font-semibold py-2 px-3 rounded transition text-sm shadow-sm ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={isDisabled}
                                    title={isDisabled ? "Ca Giao Hàng chỉ dành cho nhân viên Nam" : ""}
                                >
                                    {item.label}
                                </Button>
                            );
                        })}
                    </div>
                 )}
            </div>
        )}

        {currentShift.role !== 'OFF' && currentShift.role !== 'Trống' && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 space-y-3">
                <Button
                    variant="ghost"
                    onClick={() => setView('manual_swap')}
                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-full text-inherit w-full bg-sky-50 dark:bg-sky-900/20 border-2 border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-400 font-black py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                >
                    <ArrowLeftRight size={20} />
                    HOÁN ĐỔI CA THỦ CÔNG
                </Button>

                <div className="grid grid-cols-2 gap-3">
                    <Button variant="ghost" onClick={() => handleBusyTimeClick('morning')} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl transition text-sm shadow-md">BẬN SÁNG</Button>
                    <Button variant="ghost" onClick={() => handleBusyTimeClick('afternoon')} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 px-4 rounded-xl transition text-sm shadow-md">BẬN CHIỀU</Button>
                </div>
            </div>
        )}

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
            <Button variant="ghost" onClick={handleOffClick} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-full text-inherit bg-rose-600 hover:bg-rose-700 text-white font-black py-3 px-4 rounded-xl transition w-full text-sm tracking-widest shadow-lg uppercase">
                CHO NGHỈ (OFF)
            </Button>
        </div>
    </>
  );

  const renderConfirmationView = (title: string, message: React.ReactNode, onConfirm: () => void) => (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg text-center">
        <h4 className="font-bold text-amber-800 dark:text-amber-400">{title}</h4>
        <div className="text-sm text-amber-700 dark:text-amber-300 my-3">{message}</div>
        <div className="flex justify-center gap-2 mt-4">
            <Button variant="ghost" onClick={resetFlow} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-1.5 px-4 rounded transition text-xs">Hủy</Button>
            {onConfirm && <Button variant="ghost" onClick={() => onConfirm()} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-sky-600 hover:bg-sky-700 text-white font-bold py-1.5 px-4 rounded transition text-xs">Tìm giải pháp</Button>}
             <Button variant="ghost" onClick={() => onSave({ shift: 'OFF', role: 'OFF', warning: 'Thiếu nhân sự, cần xử lý thủ công' })} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-4 rounded transition text-xs">Vẫn cho nghỉ (OFF)</Button>
        </div>
    </div>
  );

  const renderManualSwapView = () => (
      <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <Button variant="ghost" onClick={resetFlow} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">
                  <ChevronLeft size={24} />
              </Button>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Chọn đối tác hoán đổi ca</h3>
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
              <Search size={20} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          </div>

          <div className="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scroll">
              {swapCandidates.length > 0 ? (
                  swapCandidates.map(staff => (
                      <div key={staff.id} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-sky-300 dark:hover:border-sky-700 hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition-all flex justify-between items-center group shadow-sm">
                          <div>
                              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{staff.name.split(' - ')[1] || staff.name}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{staff.department}</p>
                              <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">Ca hiện tại: <span className="font-black text-sky-600 dark:text-sky-400">{staff.schedule[info.dayIndex]?.role || 'Trống'}</span></p>
                          </div>
                          <Button
                              variant="ghost"
                              onClick={() => {
                                  onConfirmNormalSwap(info.employeeId, staff.id, info.dayIndex);
                                  onClose();
                              }}
                              className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-2"
                          >
                              <ArrowLeftRight size={16} />
                              ĐỔI
                          </Button>
                      </div>
                  ))
              ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                      <EmptyState
                          icon={<Search size={20} />}
                          title="Không tìm thấy nhân viên phù hợp"
                          compact
                      />
                  </div>
              )}
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic text-center">
              * Lưu ý: Thao tác hoán đổi sẽ tráo đổi trực tiếp ca của hai người.
          </p>
      </div>
  );

  const renderSolutionAction = (action: SolutionAction, isPartOfPackage: boolean) => (
        <>
            <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong>{isPartOfPackage ? 'Hành động:' : 'Đề xuất cho:'}</strong> <strong className="text-sky-600 dark:text-sky-400">{action.staff.name}</strong>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ca hiện tại: <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">{action.originalShift.role || 'Trống'}</span>
                <span className="mx-2">→</span>
                Ca mới: <span className="font-mono font-bold bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 px-1 rounded">{action.newShift.role}</span>
            </p>
        </>
    );

  const renderSuggestionView = () => {
    return (
     <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 p-4 rounded-lg text-center">
        <h4 className="font-bold text-sky-700 dark:text-sky-400">Đề xuất thay thế</h4>
        {isLoading && <div className="flex justify-center items-center p-4"><div className="spinner"></div></div>}
        {!isLoading && (
            suggestion ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {suggestion.type === 'pure_swap' && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded border border-sky-300 dark:border-sky-700 text-left">
                        <div className="flex justify-between items-center">
                             <div>
                                <p className="font-semibold text-sky-800 dark:text-sky-400">Gợi Ý Hoán Đổi Tối Ưu</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                                    <strong>Hoán đổi ca</strong> với <strong className="text-indigo-600 dark:text-indigo-400">{suggestion.partner.name}</strong>
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Ca của bạn (<span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">{info.currentShift.role}</span>)
                                    <span className="mx-2 font-bold text-emerald-600 dark:text-emerald-400">↔</span>
                                    Ca của {suggestion.partner.name.split(' - ')[1] || suggestion.partner.name} (<span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">{suggestion.partnerShift.role}</span>)
                                </p>
                            </div>
                            <Button variant="ghost" onClick={handleConfirmSuggestion} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-sky-600 hover:bg-sky-700 text-white font-bold py-1 px-3 rounded transition text-xs self-center flex-shrink-0 ml-2">Xác nhận</Button>
                        </div>
                    </div>
                )}
                {suggestion.type === 'extend' && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded border border-sky-300 dark:border-sky-700 flex justify-between items-center text-left">
                        <div> {renderSolutionAction(suggestion, false)} </div>
                        <Button variant="ghost" onClick={handleConfirmSuggestion} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-sky-600 hover:bg-sky-700 text-white font-bold py-1 px-3 rounded transition text-xs self-center flex-shrink-0 ml-2">Chọn</Button>
                    </div>
                )}
                {suggestion.type === 'split_cover' && (
                     <div className="p-3 bg-white dark:bg-slate-800 rounded border border-emerald-300 dark:border-emerald-700 text-left">
                        <div className="flex justify-between items-center">
                            <p className="font-bold text-emerald-700 dark:text-emerald-400">Gói giải pháp (Nhiều người)</p>
                            <Button variant="ghost" onClick={handleConfirmSuggestion} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded transition text-xs self-center flex-shrink-0 ml-2">Chọn Gói</Button>
                        </div>
                        <div className="mt-2 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                             {suggestion.actions.map((action, actionIndex) => (
                                 <div key={actionIndex}> {renderSolutionAction(action, true)} </div>
                             ))}
                        </div>
                    </div>
                )}
                <div className="flex justify-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="ghost" onClick={resetFlow} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-1 px-3 rounded transition text-xs">Hủy</Button>
                    <Button variant="ghost" onClick={() => onSave({ shift: 'OFF', role: 'OFF', warning: 'Thiếu nhân sự, cần xử lý thủ công' })} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-3 rounded transition text-xs">Vẫn cho nghỉ (OFF)</Button>
                </div>
            </div>
            ) : (
                <>
                    <p className="text-sm text-rose-600 dark:text-rose-400 my-2">Không tìm thấy giải pháp thay thế phù hợp.</p>
                    <div className="flex justify-center gap-2 mt-3">
                        <Button variant="ghost" onClick={resetFlow} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-1 px-3 rounded transition text-xs">Hủy</Button>
                        <Button variant="ghost" onClick={() => onSave({ shift: 'OFF', role: 'OFF', warning: 'Thiếu nhân sự, cần xử lý thủ công' })} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-3 rounded transition text-xs">Vẫn cho nghỉ (OFF)</Button>
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
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg text-center">
          <h4 className="font-bold text-amber-800 dark:text-amber-400">Cảnh báo trùng lặp</h4>
          <p className="text-sm text-amber-700 dark:text-amber-300 my-2">Ca đặc biệt <strong>({pendingShift?.role})</strong> đã đủ số lượng yêu cầu cho ngày hôm nay. Bạn vẫn muốn thêm?</p>
          <div className="flex justify-center gap-2 mt-3">
              <Button variant="ghost" onClick={resetFlow} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-1 px-3 rounded transition text-xs">Hủy</Button>
              <Button variant="ghost" onClick={action} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded transition text-xs">Vẫn thêm</Button>
          </div>
      </div>
    );
  }

  const renderStaffingWarningView = () => (
      <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 rounded-lg text-center">
          <h4 className="font-bold text-rose-800 dark:text-rose-400">Cảnh báo thiếu hụt nhân sự!</h4>
          <p className="text-sm text-rose-700 dark:text-rose-300 my-2">Sau khi thay đổi, nhân sự ngày này sẽ dưới 70% yêu cầu. Bạn có chắc chắn muốn tiếp tục?</p>
          <div className="flex justify-center gap-2 mt-3">
              <Button variant="ghost" onClick={resetFlow} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-1 px-3 rounded transition text-xs">Hủy</Button>
              <Button variant="ghost" onClick={() => pendingAction && pendingAction()} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-3 rounded transition text-xs">Vẫn tiếp tục</Button>
          </div>
      </div>
  );


  const renderHistoryView = () => {
    const offHistory = info.changeHistory.filter(h => h.to === 'OFF');
    const swapHistory = info.changeHistory.filter(h => h.to !== 'OFF');

    if (info.changeHistory.length === 0) return null;

    return (
        <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-3">
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Lịch sử thay đổi</h4>
            <div className="max-h-24 overflow-y-auto text-[11px] space-y-1 pr-2 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 custom-scroll font-medium">
                {swapHistory.map((h, i) => (
                    <p key={`swap-${i}`}><span className="text-slate-400 dark:text-slate-500 font-mono">{h.date}:</span> Đổi <span className="line-through opacity-60">{h.from}</span> &rarr; <span className="font-bold text-slate-700 dark:text-slate-300">{h.to}</span></p>
                ))}
                {offHistory.map((h, i) => (
                     <p key={`off-${i}`} className="text-rose-600 dark:text-rose-400"><span className="text-slate-400 dark:text-slate-500 font-mono">{h.date}:</span> Nghỉ <span className="opacity-60">(từ {h.from})</span></p>
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
    <Modal isOpen onClose={onClose} title="Cập Nhật Ca Làm Việc" maxWidth="md">
        {renderHeader()}
        <div className="mt-2">
            {renderContent()}
        </div>
        {renderHistoryView()}
    </Modal>
  );
};

export default EditShiftModal;
