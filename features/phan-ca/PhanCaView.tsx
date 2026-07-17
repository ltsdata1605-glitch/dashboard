import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './phanca.css';
import { exportToImage, generateBusyTemplateTSV } from './utils/exportUtils';
import { recalculateStatsForStaff, findBestSolution, calculateTotalHours, calculateSpecialHours, findAutomaticReplacement, autoRefineSchedule, generateBalancingFeedback } from './utils/scheduleUtils';
import { parseStaffFromExcelBuffer } from './utils/excelImport';
import * as idb from './db/idb';
import Controls from './components/Controls';
import Legend from './components/Legend';
import ScheduleTable from './components/ScheduleTable';
import VerticalIndividualSchedule from './components/VerticalIndividualSchedule';
import EditRulesModal from './components/EditRulesModal';
import EditShiftModal from './components/EditShiftModal';
import DailyStatsTable from './components/DailyStatsTable';
import ImportStaffModal from './components/ImportStaffModal';
import EditPatternModal from './components/EditPatternModal';
import SuggestionModal from './components/SuggestionModal';
import HistoryModal from './components/HistoryModal';
import GoogleSheetExportModal from './components/GoogleSheetExportModal';
import HelpModal from './components/HelpModal';
import ConflictListModal from './components/ConflictListModal';
import BusyReportModal from './components/BusyReportModal';
import AiSuggestPatternModal from './components/AiSuggestPatternModal';
import { PhanCaToolbar } from './components/PhanCaToolbar';
import { ConfirmDialog } from '../../components/shared/ui/ConfirmDialog';
import { Button } from '../../components/shared/ui/Button';
import { SectionCard } from '../../components/shared/ui/SectionCard';
import { SectionHeader } from '../../components/shared/ui/SectionHeader';
import { exportScheduleToGoogleSheet } from './services/googleSheetsExport';
import { usePhanCaData } from './hooks/usePhanCaData';
import {
  StaffMember,
  ScheduleInfo,
  SchedulingRules,
  BalancingFeedback,
  EditShiftModalInfo,
  ImportedStaff,
  StaffWithGender,
  BusySchedule,
  MonthlyStats,
  ScheduleConfig,
  StaffInitialData
} from './types';
import { createFullSchedule } from './services/scheduleService';
import { abbreviateVietnameseName } from './utils/stringUtils';
import { DEFAULT_PATTERNS_HUNG_VUONG_910_99, rotateArray } from './constants';
const App: React.FC = () => {
  const {
    isImportingRef,
    monthYear, setMonthYear,
    startDay, setStartDay,
    duration, setDuration,
    supermarkets, setSupermarkets,
    currentSupermarket, setCurrentSupermarket,
    staffList, setStaffList,
    targets, setTargets,
    scheduleHistory, setScheduleHistory,
    nams, setNams,
    nus, setNus,
    rules, setRules,
    departmentPatterns, setDepartmentPatterns,
    dailyRequirements, setDailyRequirements,
    busySchedule,
    departmentFilter, setDepartmentFilter,
    includeTnInSbh, setIncludeTnInSbh,
    autoAddWeekendShifts, setAutoAddWeekendShifts,
    autoAddWeekendShift1, setAutoAddWeekendShift1,
    shiftDefinitions, setShiftDefinitions,
    unresolvedConflicts, setUnresolvedConflicts,
    isDbLoaded,
    setIsDataLoadedForSupermarket,
    year, month,
    uniqueDepartments,
    staffCountByDept,
    getKey,
    showToast,
    handleSupermarketChange,
    confirmDeleteStaffList,
    logHistory,
  } = usePhanCaData();
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [isEditRulesModalOpen, setEditRulesModalOpen] = useState(false);
  const [isEditShiftModalOpen, setEditShiftModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isEditPatternModalOpen, setEditPatternModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [isConflictModalOpen, setConflictModalOpen] = useState(false);
  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
      variant?: 'danger' | 'warning' | 'info' | 'success';
      confirmText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const showConfirm = (options: { title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info' | 'success'; confirmText?: string; }) => {
      setConfirmDialog({ ...options, isOpen: true });
  };
  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  const [balancingFeedback, setBalancingFeedback] = useState<BalancingFeedback | null>(null);
  const [editingRuleKey, setEditingRuleKey] = useState<'kho' | 'tn' | 'gh' | null>(null);
  const [editingCellInfo, setEditingCellInfo] = useState<EditShiftModalInfo | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [importedStaff, setImportedStaff] = useState<ImportedStaff[]>([]);
  const [statsDay, setStatsDay] = useState<number>(1);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [staffListForExport, setStaffListForExport] = useState<StaffMember[] | null>(null);
  const [weeklyExportConfig, setWeeklyExportConfig] = useState<{start: number, end: number} | null>(null);
  const [batchExportProgress, setBatchExportProgress] = useState<{ current: number, total: number, name: string } | null>(null);
  const [currentHighlightedId, setCurrentHighlightedId] = useState<string | null>(null);
  const [exportTitle, setExportTitle] = useState<string>('');
  const tableRef = useRef<HTMLTableElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busyFileInputRef = useRef<HTMLInputElement>(null);
  const durationDebounceTimer = useRef<number | null>(null);
  const handleDeleteStaffList = () => {
      showConfirm({
          title: 'Xóa danh sách nhân viên',
          message: 'Bạn có chắc chắn muốn xóa danh sách nhân viên hiện tại? Lịch phân ca, mẫu ca, và lịch bận cũng sẽ bị xóa.',
          variant: 'danger',
          confirmText: 'Xác nhận Xóa',
          onConfirm: () => { closeConfirm(); confirmDeleteStaffList(); },
      });
  };
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const imported = await parseStaffFromExcelBuffer(data);
            if (imported.length > 0) { setImportedStaff(imported); setImportModalOpen(true); }
            else showToast("Không tìm thấy dữ liệu nhân viên hợp lệ.", 'error');
        } catch (error) { showToast("Lỗi khi xử lý file Excel.", 'error'); }
        finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };
  const generateNewSchedule = useCallback((options: {
    forDepartment?: string;
    busyScheduleOverride?: BusySchedule;
    patternsOverride?: { [key: string]: string[] };
    rulesOverride?: SchedulingRules;
    namsOverride?: StaffInitialData[];
    nusOverride?: StaffInitialData[];
    autoAddWeekendShiftsOverride?: boolean;
    autoAddWeekendShift1Override?: boolean;
  } = {}) => {
      const { forDepartment, busyScheduleOverride, patternsOverride, rulesOverride, namsOverride, nusOverride, autoAddWeekendShiftsOverride, autoAddWeekendShift1Override } = options;
      const currentNams = namsOverride || nams;
      const currentNus = nusOverride || nus;
      if (!monthYear || isNaN(startDay) || isNaN(duration) || !(rulesOverride || rules) || (currentNams.length === 0 && currentNus.length === 0)) return;
      const [yearVal, monthVal] = monthYear.split('-').map(Number);
      (async () => {
        const d = new Date(yearVal, monthVal - 1, 1); d.setMonth(d.getMonth() - 1);
        const prevMonthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const prevStatsKey = getKey(`monthly_stats-${prevMonthYear}`);
        const previousMonthStats = await idb.loadData<MonthlyStats>(prevStatsKey) || {};
        const config: ScheduleConfig = { 
            year: yearVal, 
            month: monthVal, 
            startDay, 
            duration, 
            includeTn: includeTnInSbh,
            autoAddWeekendShifts: autoAddWeekendShiftsOverride !== undefined ? autoAddWeekendShiftsOverride : autoAddWeekendShifts,
            autoAddWeekendShift1: autoAddWeekendShift1Override !== undefined ? autoAddWeekendShift1Override : autoAddWeekendShift1
        };
        const targetDepartment = forDepartment || departmentFilter;
        const effectiveRules = rulesOverride || rules;
        const effectivePatterns = patternsOverride || departmentPatterns;
        const effectiveBusySchedule = busyScheduleOverride || busySchedule;
        let namsToSchedule = currentNams; let nusToSchedule = currentNus;
        if (targetDepartment) {
            namsToSchedule = currentNams.filter(n => n.department === targetDepartment);
            nusToSchedule = currentNus.filter(n => n.department === targetDepartment);
        }
        if (namsToSchedule.length === 0 && nusToSchedule.length === 0) return;
        const { staffList: newStaffListForDept, targets: newTargets } = createFullSchedule({ config, nams: namsToSchedule, nus: nusToSchedule, rules: effectiveRules, departmentPatterns: effectivePatterns, busySchedule: effectiveBusySchedule, previousMonthStats });
        const refinedStaffListForDept = autoRefineSchedule(newStaffListForDept, config, newTargets);
        let finalStaffList;
        if (targetDepartment && staffList.length > 0) {
            const otherDeptsStaff = staffList.filter(s => s.department !== targetDepartment);
            finalStaffList = [...otherDeptsStaff, ...refinedStaffListForDept];
        } else {
            finalStaffList = refinedStaffListForDept;
        }
        setStaffList(finalStaffList); setTargets(newTargets); setStatsDay(1);
        if (!targetDepartment) { setScheduleHistory([]); setUnresolvedConflicts([]); }
        setOnboardingStep(0);
        const currentStatsToSave: MonthlyStats = {};
        finalStaffList.forEach(staff => currentStatsToSave[staff.id] = { gh: staff.stats.gh, kho: staff.stats.kho, tn: staff.stats.tn, totalSpecialHours: calculateSpecialHours(staff, includeTnInSbh) });
        const currentStatsKey = getKey(`monthly_stats-${monthYear}`);
        await idb.saveData(currentStatsKey, currentStatsToSave);
        setBalancingFeedback(generateBalancingFeedback(currentStatsToSave, previousMonthStats));
      })();
  }, [monthYear, startDay, duration, nams, nus, rules, departmentPatterns, busySchedule, includeTnInSbh, autoAddWeekendShifts, autoAddWeekendShift1, staffList, departmentFilter, getKey]);
  useEffect(() => {
    if (durationDebounceTimer.current) clearTimeout(durationDebounceTimer.current);
    if (isDbLoaded && (nams.length > 0 || nus.length > 0)) { 
        durationDebounceTimer.current = window.setTimeout(() => generateNewSchedule(), 1000);
    }
    return () => { if (durationDebounceTimer.current) clearTimeout(durationDebounceTimer.current); };
  }, [duration, isDbLoaded, nams, nus]);
  const getSortedStaffForExport = (): StaffMember[] => {
    const staffListCopy = structuredClone(staffList) as StaffMember[];
    const hasImportIndex = staffListCopy.some(s => s.importIndex !== undefined);
    let depts: string[];
    if (hasImportIndex) {
        const getDeptMinIndex = (dept: string) => {
            const deptStaff = staffListCopy.filter(s => s.department === dept);
            return Math.min(...deptStaff.map(s => s.importIndex ?? 999999));
        };
        depts = [...new Set(staffListCopy.map(s => s.department))].sort((a, b) => {
            return getDeptMinIndex(a) - getDeptMinIndex(b);
        });
    } else {
        depts = [...new Set(staffListCopy.map(s => s.department))].sort();
    }
    let result: StaffMember[] = [];
    depts.forEach(dept => {
        const deptStaff = staffListCopy.filter(s => s.department === dept);
        if (hasImportIndex) {
            const sortedDeptStaff = deptStaff.sort((a, b) => {
                const indexA = a.importIndex ?? 999999;
                const indexB = b.importIndex ?? 999999;
                if (indexA !== indexB) return indexA - indexB;
                return a.name.localeCompare(b.name);
            });
            result.push(...sortedDeptStaff);
        } else {
            const namsInDept = deptStaff.filter(s => s.gender === 'Nam').sort((a: StaffMember, b: StaffMember) => a.name.localeCompare(b.name));
            const nusInDept = deptStaff.filter(s => s.gender === 'Nu').sort((a: StaffMember, b: StaffMember) => a.name.localeCompare(b.name));
            let i = 0, j = 0;
            while (i < namsInDept.length || j < nusInDept.length) {
                if (i < namsInDept.length) result.push(namsInDept[i++]);
                if (j < nusInDept.length) result.push(nusInDept[j++]);
            }
        }
    });
    return result;
  };
  const handleAutoAddWeekendShiftsChange = useCallback((checked: boolean) => {
    setAutoAddWeekendShifts(checked);
    logHistory(checked ? "Tự động tăng ca 2,5 T6-CN" : "Gỡ tự động tăng ca 2,5 T6-CN");
    generateNewSchedule({ autoAddWeekendShiftsOverride: checked });
  }, [generateNewSchedule, logHistory]);
  const handleAutoAddWeekendShift1Change = useCallback((checked: boolean) => {
    setAutoAddWeekendShift1(checked);
    logHistory(checked ? "Tự động tăng ca 1 T6-CN" : "Gỡ tự động tăng ca 1 T6-CN");
    generateNewSchedule({ autoAddWeekendShift1Override: checked });
  }, [generateNewSchedule, logHistory]);
  // --- XUẤT ẢNH ---
  const handleExportAll = async () => {
    setIsExportingImage(true);
    setStaffListForExport(getSortedStaffForExport());
    setExportTitle(`Lịch Công Tác: ${currentSupermarket || 'Cửa Hàng'}`);
    setWeeklyExportConfig(null);
    const [yearVal, monthVal] = monthYear.split('-').map(Number);
    const filename = `Lich_Toan_Bo_Thang_${monthVal}_${yearVal}.png`;
    setTimeout(() => {
        exportToImage(exportContainerRef, filename).finally(() => {
            setIsExportingImage(false);
            setStaffListForExport(null);
            setExportTitle('');
        });
    }, 400);
  };
  const handleExportWeekly = async () => {
    const list = getSortedStaffForExport();
    if (list.length === 0) return showToast("Chưa có lịch để xuất.", 'error');
    setIsExportingImage(true);
    setStaffListForExport(list);
    const [yearVal, monthVal] = monthYear.split('-').map(Number);
    const weeks: { start: number, end: number }[] = [];
    let day = 1;
    while (day <= duration) {
        const date = new Date(yearVal, monthVal - 1, startDay + day - 1);
        const dow = (date.getDay() + 6) % 7; 
        const len = Math.min(7 - dow, duration - day + 1);
        weeks.push({ start: day, end: day + len - 1 });
        day += len;
    }
    setBatchExportProgress({ current: 0, total: weeks.length, name: "Đang chuẩn bị xuất theo tuần..." });
    try {
        for (let i = 0; i < weeks.length; i++) {
            const week = weeks[i];
            setWeeklyExportConfig(week);
            setExportTitle(`Lịch Tuần ${i + 1} - ${currentSupermarket}`);
            setBatchExportProgress({ current: i + 1, total: weeks.length, name: `Đang xử lý Tuần ${i + 1}` });
            await new Promise(resolve => setTimeout(resolve, 800));
            await exportToImage(exportContainerRef, `Lich_Tuan_${i + 1}_Thang_${monthVal}_${yearVal}.png`);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    } catch (err) {
        showToast("Lỗi khi xuất ảnh theo tuần.", 'error');
    } finally {
        setBatchExportProgress(null);
        setWeeklyExportConfig(null);
        setStaffListForExport(null);
        setIsExportingImage(false);
        setExportTitle('');
    }
  };
  const handleExportIndividual = () => {
    const list = getSortedStaffForExport();
    if (list.length === 0) return showToast("Chưa có lịch để xuất.", 'error');
    showConfirm({
        title: 'Xuất Lịch Cá Nhân',
        message: 'Hệ thống sẽ tiến hành xuất file cho từng nhân viên. Bạn có đồng ý?',
        variant: 'info',
        confirmText: 'Đồng ý',
        onConfirm: async () => {
            closeConfirm();
            setIsExportingImage(true);
            setWeeklyExportConfig(null);
            setBatchExportProgress({ current: 0, total: list.length, name: "Khởi động xuất lịch cá nhân..." });
            const [yearVal, monthVal] = monthYear.split('-').map(Number);
            try {
                for (let i = 0; i < list.length; i++) {
                    const staff = list[i];
                    setBatchExportProgress({ current: i + 1, total: list.length, name: `Đang xuất NV: ${staff.name.split(' - ')[1] || staff.name}` });
                    setStaffListForExport([staff]);
                    setExportTitle(staff.name);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const sanitizedStaffName = staff.name.replace(/[^a-zA-Z0-9\s._-]/g, '').replace(/\s+/g, '_');
                    await exportToImage(exportContainerRef, `Lich_Ca_Nhan_${sanitizedStaffName}_Thang_${monthVal}_${yearVal}.png`);
                    await new Promise(resolve => setTimeout(resolve, 400));
                }
            } catch (err) {
                console.warn("Export error:", err);
                showToast("Lỗi khi xuất ảnh cá nhân.", 'error');
            } finally {
                setBatchExportProgress(null);
                setStaffListForExport(null);
                setIsExportingImage(false);
                setExportTitle('');
            }
        }
    });
  };
  const handleExportExcel = async () => {
    if (!nams.length && !nus.length) return showToast("Chưa có dữ liệu.", 'error');
    const XLSX = await import('xlsx');
    const sortedList = getSortedStaffForExport();
    const [yearVal, monthVal] = monthYear.split('-').map(Number);
    const data: (string | number)[][] = [['LỊCH PHÂN CA'], ['HỌ VÀ TÊN', 'SBH', 'TỔNG', ...Array.from({length: duration}, (_, i) => `Ngày ${i+1}`)]];
    sortedList.forEach(staff => {
        const row = [staff.name, Math.round(calculateSpecialHours(staff, includeTnInSbh)), Math.round(calculateTotalHours(staff))];
        for (let d = 1; d <= duration; d++) row.push(staff.schedule[d]?.role || '');
        data.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Lich");
    XLSX.writeFile(wb, `Lich_${monthVal}_${yearVal}.xlsx`);
  };
  const handleExportGoogleSheet = async () => {
    await exportScheduleToGoogleSheet({
        nams, nus, monthYear, duration, startDay, includeTnInSbh,
        getSortedStaffForExport, showToast,
    });
  };
  const handleSaveShift = (newShiftData: ScheduleInfo) => {
    if (!editingCellInfo) return;
    const { employeeId, dayIndex } = editingCellInfo;
    setStaffList(currentStaffList => {
      const newStaffList = structuredClone(currentStaffList);
      const staff = newStaffList.find((s: StaffMember) => s.id === employeeId);
      if (staff) {
        const originalShift = staff.schedule[dayIndex] || { role: 'Trống', shift: 'Trống' };
        if (JSON.stringify(originalShift) !== JSON.stringify(newShiftData)) {
            staff.stats.swapCount++;
            addChangeHistory(staff, dayIndex, originalShift.role, newShiftData.role);
        }
        staff.schedule[dayIndex] = { ...newShiftData, isManual: true };
        staff.stats = recalculateStatsForStaff(staff);
      }
      return newStaffList;
    });
    setUnresolvedConflicts(prev => prev.filter(c => !(c.employeeId === employeeId && c.dayIndex === dayIndex)));
    setEditShiftModalOpen(false); setEditingCellInfo(null);
  };
  const addChangeHistory = (staff: StaffMember, dayIndex: number, fromRole: string, toRole: string) => {
      const [yearVal, monthVal] = monthYear.split('-').map(Number);
      const dateString = `${new Date(yearVal, monthVal - 1, startDay + dayIndex - 1).getDate()}/${monthVal}`;
      staff.changeHistory.push({ dayIndex, date: dateString, from: fromRole, to: toRole });
  };
  const handleDeleteEmployee = useCallback((id: string) => {
      setEmployeeToDelete(id);
  }, []);
  const handleEditShift = useCallback((id: string, d: number) => {
      setStaffList(currentList => {
          const staff = currentList.find(s => s.id === id);
          if (!staff) return currentList;
          const [yearVal, monthVal] = monthYear.split('-').map(Number);
          const dateString = `${new Date(yearVal, monthVal - 1, startDay + d - 1).getDate()}/${monthVal}`;
          const currentShift = staff.schedule[d] || { shift: 'Trống', role: 'Trống' };
          const isSpecialShift = (currentShift.role || '').includes('(');
          setEditingCellInfo({
              employeeId: id,
              dayIndex: d,
              employeeName: staff.name,
              department: staff.department,
              gender: staff.gender,
              date: dateString,
              currentShift,
              isSpecialShift,
              employeeStats: staff.stats,
              changeHistory: staff.changeHistory
          });
          setEditShiftModalOpen(true);
          return currentList;
      });
  }, [monthYear, startDay]);
  const scheduleConfig = useMemo(() => ({
    year,
    month,
    startDay,
    duration
  }), [year, month, startDay, duration]);
  const handleEditRule = useCallback((k: 'kho' | 'tn' | 'gh') => {
    setEditingRuleKey(k);
    setEditRulesModalOpen(true);
  }, []);
  const handleShowConflicts = useCallback(() => {
    setConflictModalOpen(true);
  }, []);
  const handleGenerateClick = useCallback(() => {
    generateNewSchedule();
  }, [generateNewSchedule]);
  const handleDateControlClick = useCallback(() => {
    if (onboardingStep === 3) setOnboardingStep(4);
  }, [onboardingStep]);
  const handleSwapShifts = useCallback((id1: string, id2: string, dayIndex: number) => {
      setStaffList(prev => {
          const idx1 = prev.findIndex(s => s.id === id1);
          const idx2 = prev.findIndex(s => s.id === id2);
          if (idx1 === -1 || idx2 === -1) return prev;
          const newList = [...prev];
          // Clone deep targets
          const s1 = { ...newList[idx1], schedule: [...newList[idx1].schedule], stats: { ...newList[idx1].stats }, changeHistory: [...(newList[idx1].changeHistory || [])] };
          const s2 = { ...newList[idx2], schedule: [...newList[idx2].schedule], stats: { ...newList[idx2].stats }, changeHistory: [...(newList[idx2].changeHistory || [])] };
          const raw1 = s1.schedule[dayIndex];
          const raw2 = s2.schedule[dayIndex];
          // Handle empty shifts with empty string for cleanliness
          const shift1 = raw1 ? { ...raw1 } : { shift: '', role: '', isManual: false };
          const shift2 = raw2 ? { ...raw2 } : { shift: '', role: '', isManual: false };
          // Swap
          s1.schedule[dayIndex] = { 
              ...shift2, 
              isManual: true, 
              manualChangeInfo: { 
                  type: 'swap-initiator', 
                  originalShiftRole: shift1.role || 'Trống', 
                  partnerId: id2 
              } 
          };
          s2.schedule[dayIndex] = { 
              ...shift1, 
              isManual: true, 
              manualChangeInfo: { 
                  type: 'swap-partner', 
                  originalShiftRole: shift2.role || 'Trống', 
                  partnerId: id1 
              } 
          };
          // Update stats
          s1.stats = recalculateStatsForStaff(s1);
          s2.stats = recalculateStatsForStaff(s2);
          s1.stats.swapCount = (s1.stats.swapCount || 0) + 1;
          s2.stats.swapCount = (s2.stats.swapCount || 0) + 1;
          // History
          const [y, m] = monthYear.split('-').map(Number);
          const dateStr = `${new Date(y, m - 1, startDay + dayIndex - 1).getDate()}/${m}`;
          if (!s1.changeHistory) s1.changeHistory = [];
          s1.changeHistory.push({ 
              dayIndex, 
              date: dateStr, 
              from: shift1.role || 'Trống', 
              to: shift2.role || 'Trống',
              description: `Đổi ca với ${s2.name}`
          });
          if (!s2.changeHistory) s2.changeHistory = [];
          s2.changeHistory.push({ 
              dayIndex, 
              date: dateStr, 
              from: shift2.role || 'Trống', 
              to: shift1.role || 'Trống',
              description: `Đổi ca với ${s1.name}`
          });
          newList[idx1] = s1;
          newList[idx2] = s2;
          return newList;
      });
      setUnresolvedConflicts(prev => prev.filter(c => !((c.employeeId === id1 || c.employeeId === id2) && c.dayIndex === dayIndex)));
  }, [monthYear, startDay]);
  const handleConfirmImport = async (staffWithGenders: StaffWithGender[], supermarketName: string) => {
    isImportingRef.current = true; 
    try {
        const newNams = staffWithGenders.filter(s => s.gender === 'Nam').map(s => ({ name: s.name, department: s.department, importIndex: s.importIndex }));
        const newNus = staffWithGenders.filter(s => s.gender === 'Nu').map(s => ({ name: s.name, department: s.department, importIndex: s.importIndex }));
        const depts = [...new Set(staffWithGenders.map(s => s.department))];
        const patternsToSet: { [key: string]: string[] } = {};
        depts.forEach(dept => {
            if (dept.includes("Quản Lý") || dept.includes("Trưởng Ca")) patternsToSet[dept] = DEFAULT_PATTERNS_HUNG_VUONG_910_99['BP Quản lý/Trưởng Ca'];
            else if (dept.includes("Tiếp Đón") || dept.includes("Thu Ngân")) patternsToSet[dept] = DEFAULT_PATTERNS_HUNG_VUONG_910_99['BP Tiếp Đón Khách Hàng'];
            else patternsToSet[dept] = DEFAULT_PATTERNS_HUNG_VUONG_910_99['BP All In One'];
        });
        const keyPrefix = `${supermarketName}::`;
        await idb.saveData(keyPrefix + 'nams', newNams);
        await idb.saveData(keyPrefix + 'nus', newNus);
        await idb.saveData(keyPrefix + 'departmentPatterns', patternsToSet);
        if (!supermarkets.includes(supermarketName)) {
            const updatedSupermarkets = [...supermarkets, supermarketName].sort();
            setSupermarkets(updatedSupermarkets); 
            await idb.saveData('meta_supermarkets', updatedSupermarkets);
        }
        setNams(newNams); 
        setNus(newNus); 
        setDepartmentPatterns(patternsToSet);
        setCurrentSupermarket(supermarketName);
        if (depts.length > 0) {
            setDepartmentFilter(depts[0]);
        } else {
            setDepartmentFilter('');
        }
        setIsDataLoadedForSupermarket(true);
        setImportModalOpen(false); 
        setTimeout(() => {
            generateNewSchedule({ 
                forDepartment: depts.length > 0 ? depts[0] : '',
                namsOverride: newNams, 
                nusOverride: newNus, 
                patternsOverride: patternsToSet 
            });
            isImportingRef.current = false;
        }, 300);
    } catch (error) {
        console.warn("Import error:", error);
        showToast("Có lỗi xảy ra khi lưu dữ liệu nhân viên.", 'error');
        isImportingRef.current = false;
    }
  };
  const hasStaff = nams.length > 0 || nus.length > 0;
  // LUÔN ĐẢM BẢO listForTable ĐƯỢC GOM NHÓM THEO BỘ PHẬN VÀ XEN KẼ GIỚI TÍNH
  const listForTable = useMemo(() => {
    if (staffListForExport) return staffListForExport;
    const baseList = staffList.filter(s => !departmentFilter || s.department === departmentFilter);
    const depts = [...new Set(baseList.map(s => s.department))].sort();
    let result: StaffMember[] = [];
    depts.forEach(dept => {
        const deptStaff = baseList.filter(s => s.department === dept);
        const namsInDept = deptStaff.filter(s => s.gender === 'Nam').sort((a: StaffMember, b: StaffMember) => a.name.localeCompare(b.name));
        const nusInDept = deptStaff.filter(s => s.gender === 'Nu').sort((a: StaffMember, b: StaffMember) => a.name.localeCompare(b.name));
        let i = 0, j = 0;
        while (i < namsInDept.length || j < nusInDept.length) {
            if (i < namsInDept.length) result.push(namsInDept[i++]);
            if (j < nusInDept.length) result.push(nusInDept[j++]);
        }
    });
    return result;
  }, [staffListForExport, staffList, departmentFilter]);
  const isIndividualExport = isExportingImage && staffListForExport && staffListForExport.length === 1 && !weeklyExportConfig;
  return (
    <div className="phanca-root phan-ca-layout min-h-screen bg-slate-50 pb-20">
      {/* EXPORT OVERLAY */}
      {batchExportProgress && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[100]">
              <div className="bg-white p-10 shadow-xl flex flex-col items-center max-w-md w-full border border-slate-200">
                <div className="spinner !w-14 !h-14 !border-[5px] mb-6"></div>
                <p className="text-xl font-extrabold text-slate-800 mb-3">Đang xử lý dữ liệu</p>
                <div className="w-full bg-slate-100 h-2 mb-3 overflow-hidden">
                    <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${(batchExportProgress.current / batchExportProgress.total) * 100}%` }}></div>
                </div>
                <p className="text-slate-400 font-semibold text-sm mb-5">{batchExportProgress.current} / {batchExportProgress.total}</p>
                <div className="bg-indigo-50 text-indigo-700 font-bold px-5 py-3 w-full text-center truncate text-sm">
                    {batchExportProgress.name}
                </div>
              </div>
          </div>
      )}
      <PhanCaToolbar
          hasStaff={hasStaff}
          onImportClick={handleImportClick}
          onDeleteStaffList={handleDeleteStaffList}
          onOpenEditPattern={() => setEditPatternModalOpen(true)}
          onExportAll={handleExportAll}
          onExportWeekly={handleExportWeekly}
          onExportIndividual={handleExportIndividual}
          onExportExcel={handleExportExcel}
          onExportGoogleSheet={handleExportGoogleSheet}
      />
      <main className="max-w-[1600px] mx-auto px-0 lg:px-6 mt-3 lg:mt-6">
        <SectionCard className={`p-3 lg:p-6 mb-3 lg:mb-6 ${isExportingImage ? 'export-hidden' : ''}`}>
          <Controls
            monthYear={monthYear} setMonthYear={setMonthYear} startDay={startDay} setStartDay={setStartDay} duration={duration} setDuration={setDuration}
            onGenerate={handleGenerateClick} departments={uniqueDepartments} departmentFilter={departmentFilter} setDepartmentFilter={setDepartmentFilter}
            supermarkets={supermarkets} currentSupermarket={currentSupermarket} setSupermarket={handleSupermarketChange} onboardingStep={onboardingStep}
            hasStaff={hasStaff} hasPatternsForCurrentDept={!!departmentPatterns[departmentFilter]} onDateControlClick={handleDateControlClick}
          />
        </SectionCard>
        <SectionCard ref={exportContainerRef} className={isIndividualExport ? 'max-w-5xl mx-auto' : ''}>
          {!isIndividualExport && (
            <SectionHeader
              title={exportTitle || `LỊCH PHÂN CA - ${currentSupermarket || 'Cửa Hàng'}`}
              icon="calendar"
            >
              {!isExportingImage && (
                <Button variant="ghost" size="icon" onClick={() => setHistoryModalOpen(true)} title="Lịch sử thay đổi" className="text-slate-400">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </Button>
              )}
            </SectionHeader>
          )}
          
          <div className="p-3 lg:p-6 space-y-4">
            {!isIndividualExport && (
              <div>
                 <Legend 
                   targets={targets} 
                   onEditRule={handleEditRule} 
                   includeTnInSbh={includeTnInSbh} 
                   onIncludeTnInSbhChange={setIncludeTnInSbh} 
                   onboardingStep={onboardingStep} 
                   autoAddWeekendShifts={autoAddWeekendShifts}
                   onAutoAddWeekendShiftsChange={handleAutoAddWeekendShiftsChange}
                   autoAddWeekendShift1={autoAddWeekendShift1}
                   onAutoAddWeekendShift1Change={handleAutoAddWeekendShift1Change}
                 />
              </div>
            )}

            <div className={isExportingImage ? 'export-hidden' : ''}>
               <DailyStatsTable 
                  staffList={staffList} config={scheduleConfig} requirements={dailyRequirements} setRequirements={setDailyRequirements}
                  selectedDay={statsDay} setSelectedDay={setStatsDay} departmentFilter={departmentFilter} unresolvedConflicts={unresolvedConflicts} onShowUnresolvedConflicts={handleShowConflicts}
               />
            </div>

            <div>
              {hasStaff && targets ? (
                isIndividualExport ? (
                   <VerticalIndividualSchedule 
                      staff={listForTable[0]} 
                      config={scheduleConfig} 
                      targets={targets} 
                      includeTnInSbh={includeTnInSbh} 
                   />
                ) : (
                  <ScheduleTable 
                      staffList={listForTable} 
                      config={scheduleConfig} 
                      targets={targets} 
                      tableRef={tableRef}
                      includeTnInSbh={includeTnInSbh}
                      onDeleteEmployee={handleDeleteEmployee} 
                      onEditShift={handleEditShift}
                      onDayClick={setStatsDay}
                      weekRange={weeklyExportConfig} 
                      highlightId={currentHighlightedId}
                      onSwapShift={handleSwapShifts}
                  />
                )
              ) : hasStaff ? (
                <div className="py-32 flex flex-col items-center justify-center">
                  <div className="spinner !w-10 !h-10"></div>
                  <p className="mt-4 font-semibold text-slate-400 text-sm">Đang khởi tạo mục tiêu...</p>
                </div>
              ) : (
                <div className="py-32 flex flex-col items-center justify-center opacity-25">
                  <svg className="w-24 h-24 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <p className="font-bold text-lg uppercase tracking-[0.15em] text-slate-400">Dữ liệu đang trống</p>
                </div>
              )}
            </div>
            
            {/* Footer signature for official exports */}
            {!isIndividualExport && isExportingImage && (
                <div className="py-8 flex justify-end">
                    <div className="text-center w-56 border-t-2 border-slate-200 pt-4">
                        <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-10">Quản Lý Duyệt</p>
                        <p className="font-semibold text-slate-400 text-[9px] italic">(Ký và ghi rõ họ tên)</p>
                    </div>
                </div>
            )}
          </div>
        </SectionCard>
      </main>
      {/* Modals & Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
      {isEditRulesModalOpen && <EditRulesModal ruleKey={editingRuleKey!} currentRules={rules} availableShifts={[]} onClose={() => setEditRulesModalOpen(false)} onSave={(r) => { setRules(r); setEditRulesModalOpen(false); generateNewSchedule({rulesOverride: r}); }} />}
      {isEditPatternModalOpen && <EditPatternModal 
        allDepartments={uniqueDepartments} 
        currentPatterns={departmentPatterns} 
        onClose={() => setEditPatternModalOpen(false)} 
        onSave={(p) => { 
          setDepartmentPatterns(p); 
          setEditPatternModalOpen(false); 
          generateNewSchedule({patternsOverride: p}); 
        }} 
        staffCountByDept={staffCountByDept} 
        dailyRequirements={dailyRequirements} 
        onRequirementsUpdate={setDailyRequirements}
        shiftDefinitions={shiftDefinitions}
        onShiftDefinitionsUpdate={(sd) => {
            setShiftDefinitions(sd);
            idb.saveData(getKey('shiftDefinitions'), sd);
        }}
        nams={nams}
        nus={nus}
      />}
      {isImportModalOpen && <ImportStaffModal staffList={importedStaff} onClose={() => setImportModalOpen(false)} onConfirm={handleConfirmImport} existingSupermarkets={supermarkets} />}
      {isEditShiftModalOpen && editingCellInfo && <EditShiftModal info={editingCellInfo} onClose={() => setEditShiftModalOpen(false)} onSave={handleSaveShift} onFindSolution={() => null} onConfirmReplacement={() => {}} onConfirmDaySwap={() => {}} onFindSolutionForDemotion={() => null} onConfirmSwapAndChange={() => {}} rules={rules} allStaff={staffList} dailyRequirements={dailyRequirements} busySchedule={busySchedule} onConfirmCutShift={()=>{}} onConfirmNormalSwap={handleSwapShifts} onConfirmCutAndSwap={()=>{}} onConfirmMultipleChanges={(a) => {
          setStaffList(prev => {
             const newList = [...prev];
             a.forEach(act => {
                const idx = newList.findIndex(s => s.id === act.staff.id);
                if (idx !== -1) {
                    const s = { ...newList[idx], schedule: [...newList[idx].schedule], stats: { ...newList[idx].stats } };
                    s.schedule[editingCellInfo.dayIndex] = { ...act.newShift, isManual: true };
                    s.stats = recalculateStatsForStaff(s);
                    newList[idx] = s;
                }
             });
             return newList;
          });
          setEditShiftModalOpen(false);
      }} />}
      {isHistoryModalOpen && <HistoryModal history={scheduleHistory} onClose={() => setHistoryModalOpen(false)} onRestore={(i) => { setStaffList(scheduleHistory[i].scheduleSnapshot); setHistoryModalOpen(false); }} />}
      {isConflictModalOpen && <ConflictListModal conflicts={unresolvedConflicts} onClose={() => setConflictModalOpen(false)} />}
      <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={closeConfirm}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          confirmText={confirmDialog.confirmText}
      />
    </div>
  );
};
export default App;
