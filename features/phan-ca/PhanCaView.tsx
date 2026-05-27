import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import './phanca.css';
import { exportToImage, generateBusyTemplateTSV } from './utils/exportUtils';
import { useActiveTab } from '../../contexts/LayoutContext';
import { recalculateStatsForStaff, findBestSolution, calculateTotalHours, calculateSpecialHours, calculateNormalHours, findAutomaticReplacement, autoRefineSchedule, generateBalancingFeedback } from './utils/scheduleUtils';
import * as idb from './db/idb';
import Controls from './components/Controls';
import Legend from './components/Legend';
import ScheduleTable from './components/ScheduleTable';
import VerticalIndividualSchedule from './components/VerticalIndividualSchedule';
import EditRulesModal from './components/EditRulesModal';
import ConfirmModal from './components/ConfirmModal';
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
import { ConfirmDialog } from '../../components/shared/ui/ConfirmDialog';

import { 
  StaffMember, 
  ScheduleInfo, 
  SchedulingRules, 
  DailyRequirements, 
  ScheduleTargets, 
  ScheduleHistoryEntry, 
  StaffInitialData, 
  BalancingFeedback, 
  EditShiftModalInfo, 
  UnresolvedConflict, 
  ImportedStaff, 
  StaffWithGender, 
  ShiftDefinitions, 
  BusySchedule,
  MonthlyStats,
  ScheduleConfig
} from './types';

import { createFullSchedule } from './services/scheduleService';

import { abbreviateVietnameseName } from './utils/stringUtils';
import { DEFAULT_PATTERNS_HUNG_VUONG_910_99, DEFAULT_SHIFT_DEFINITIONS } from './constants';

const rotateArray = <T,>(arr: T[], count: number): T[] => {
    const len = arr.length;
    if (len === 0) return [];
    const shift = count % len;
    if (shift === 0) return [...arr];
    return [...arr.slice(shift), ...arr.slice(0, shift)];
};

const getDefaultMonthYear = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}

const DEFAULT_RULES: SchedulingRules = {
  gh: { '2345': 1 },
  kho: { '123': 2, '456': 2 },
  tn: { '123': 1, '456': 1 },
  ghGender: 'Nam',
  khoGender: 'All',
  tnGender: 'All',
};

const ZERO_REQUIREMENTS: DailyRequirements = {
    '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0
};

const App: React.FC = () => {
  const { activeTab } = useActiveTab();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [monthYear, setMonthYear] = useState<string>(getDefaultMonthYear());
  const [startDay, setStartDay] = useState<number>(1);
  const [duration, setDuration] = useState<number>(30);
  const [supermarkets, setSupermarkets] = useState<string[]>([]);
  const [currentSupermarket, setCurrentSupermarket] = useState<string>('');
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [targets, setTargets] = useState<ScheduleTargets | null>(null);
  const [scheduleHistory, setScheduleHistory] = useState<ScheduleHistoryEntry[]>([]);
  const [nams, setNams] = useState<StaffInitialData[]>([]);
  const [nus, setNus] = useState<StaffInitialData[]>([]);
  const [rules, setRules] = useState<SchedulingRules>(DEFAULT_RULES);
  const [departmentPatterns, setDepartmentPatterns] = useState<{ [key: string]: string[] }>({});
  const [dailyRequirements, setDailyRequirements] = useState<DailyRequirements>(ZERO_REQUIREMENTS);
  const [busySchedule, setBusySchedule] = useState<BusySchedule>({});
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [includeTnInSbh, setIncludeTnInSbh] = useState<boolean>(true);
  const [autoAddWeekendShifts, setAutoAddWeekendShifts] = useState<boolean>(false);
  const [isEditRulesModalOpen, setEditRulesModalOpen] = useState(false);
  const [isEditShiftModalOpen, setEditShiftModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isEditPatternModalOpen, setEditPatternModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [isConflictModalOpen, setConflictModalOpen] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
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

  const [shiftDefinitions, setShiftDefinitions] = useState<ShiftDefinitions>(DEFAULT_SHIFT_DEFINITIONS);
  const [balancingFeedback, setBalancingFeedback] = useState<BalancingFeedback | null>(null);
  const [editingRuleKey, setEditingRuleKey] = useState<'kho' | 'tn' | 'gh' | null>(null);
  const [editingCellInfo, setEditingCellInfo] = useState<EditShiftModalInfo | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [importedStaff, setImportedStaff] = useState<ImportedStaff[]>([]);
  const [unresolvedConflicts, setUnresolvedConflicts] = useState<UnresolvedConflict[]>([]);
  const [statsDay, setStatsDay] = useState<number>(1);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [isDataLoadedForSupermarket, setIsDataLoadedForSupermarket] = useState(false);
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
  const staffListRef = useRef<StaffMember[]>([]);
  const durationDebounceTimer = useRef<number | null>(null);
  const isImportingRef = useRef<boolean>(false);

  const [year, month] = useMemo(() => {
    if (!monthYear) return [new Date().getFullYear(), new Date().getMonth() + 1];
    return monthYear.split('-').map(Number);
  }, [monthYear]);

  const uniqueDepartments = useMemo(() => {
    return [...new Set([...nams, ...nus].map(s => s.department))];
  }, [nams, nus]);

  const staffCountByDept = useMemo(() => {
    const counts: { [key: string]: number } = {};
    [...nams, ...nus].forEach(s => {
      counts[s.department] = (counts[s.department] || 0) + 1;
    });
    return counts;
  }, [nams, nus]);

  const getKey = useCallback((key: string) => {
    return currentSupermarket ? `${currentSupermarket}::${key}` : key;
  }, [currentSupermarket]);

  useEffect(() => {
    staffListRef.current = staffList;
  }, [staffList]);

  useEffect(() => {
    const initApp = async () => {
      await idb.initDB();
      const savedSupermarkets = await idb.loadData<string[]>('meta_supermarkets') || [];
      const savedUiState = await idb.loadData<any>('uiState');
      if (savedSupermarkets.length > 0) {
        setSupermarkets(savedSupermarkets);
        const lastSupermarket = savedUiState?.lastSupermarket;
        setCurrentSupermarket(savedSupermarkets.includes(lastSupermarket) ? lastSupermarket : savedSupermarkets[0]);
      } else {
        setSupermarkets([]);
        setCurrentSupermarket('');
      }
      if (savedUiState) {
        setMonthYear(savedUiState.monthYear || getDefaultMonthYear());
        setStartDay(savedUiState.startDay || 1);
        setDuration(savedUiState.duration || 30);
        setIncludeTnInSbh(savedUiState.includeTnInSbh !== undefined ? savedUiState.includeTnInSbh : true);
        setAutoAddWeekendShifts(savedUiState.autoAddWeekendShifts !== undefined ? savedUiState.autoAddWeekendShifts : false);
      }
      setIsDbLoaded(true);
    };
    initApp();
  }, []);

  const handleSupermarketChange = (supermarket: string) => {
    setIsDataLoadedForSupermarket(false);
    setStaffList([]);
    setNams([]);
    setNus([]);
    setTargets(null);
    setDepartmentFilter('');
    setCurrentSupermarket(supermarket);
  };
  
  useEffect(() => {
    if (!isDbLoaded || !currentSupermarket || isImportingRef.current) {
      if(isDbLoaded && supermarkets.length === 0) setIsDataLoadedForSupermarket(true);
      return;
    }
    const loadSupermarketData = async () => {
      const savedNams = await idb.loadData<StaffInitialData[]>(getKey('nams')) || [];
      const savedNus = await idb.loadData<StaffInitialData[]>(getKey('nus')) || [];
      const savedRules = await idb.loadData<SchedulingRules>(getKey('rules'));
      const savedPatterns = await idb.loadData<{ [key: string]: string[] }>(getKey('departmentPatterns'));
      const savedReqs = await idb.loadData<DailyRequirements>(getKey('dailyRequirements'));
      const savedShiftDefs = await idb.loadData<ShiftDefinitions>(getKey('shiftDefinitions'));
      setNams(savedNams);
      setNus(savedNus);
      const allDepts = [...new Set([...savedNams, ...savedNus].map(s => s.department))].sort();
      if (allDepts.length > 0) setDepartmentFilter(allDepts[0]);
      else setDepartmentFilter('');
      setDailyRequirements(savedReqs || ZERO_REQUIREMENTS);
      setShiftDefinitions(savedShiftDefs || DEFAULT_SHIFT_DEFINITIONS);
      setRules(savedRules || DEFAULT_RULES);
      setDepartmentPatterns(savedPatterns || {});
      const scheduleKey = getKey(`schedule-${monthYear}`);
      const historyKey = getKey(`history-${monthYear}`);
      const unresolvedKey = getKey(`unresolved-${monthYear}`);
      const savedSchedule = await idb.loadData<StaffMember[]>(scheduleKey);
      const savedHistory = await idb.loadData<ScheduleHistoryEntry[]>(historyKey);
      const savedUnresolved = await idb.loadData<UnresolvedConflict[]>(unresolvedKey);
      setScheduleHistory(savedHistory || []);
      setUnresolvedConflicts(savedUnresolved || []);
      if (savedSchedule && savedSchedule.length > 0) setStaffList(savedSchedule);
      else setStaffList([]);
      const busyScheduleKey = getKey(`busySchedule-${monthYear}`);
      const savedBusySchedule = await idb.loadData<BusySchedule>(busyScheduleKey);
      setBusySchedule(savedBusySchedule || {});
      setIsDataLoadedForSupermarket(true);
    };
    loadSupermarketData();
  }, [isDbLoaded, currentSupermarket, getKey, monthYear, supermarkets.length]);

  useEffect(() => {
     if (isDataLoadedForSupermarket && (nams.length > 0 || nus.length > 0)) {
          const allStaffWithPatterns = [...nams, ...nus].filter(s => departmentPatterns[s.department]?.length > 0);
          const totalStaffForTargets = allStaffWithPatterns.length;
          const totalGhShifts = Object.keys(rules.gh).reduce((acc, key) => acc + rules.gh[key], 0) * duration;
          const totalKhoShifts = Object.keys(rules.kho).reduce((acc, key) => acc + rules.kho[key], 0) * duration;
          const totalTnShifts = Object.keys(rules.tn).reduce((acc, key) => acc + rules.tn[key], 0) * duration;
          const totalNamInTargets = nams.filter(s => departmentPatterns[s.department]?.length > 0).length;
          
          let sbhDiff = 0;
          if (staffList.length > 0) {
              const allInOneStaff = staffList.filter((s) => 
                  !s.department.toLowerCase().includes('quản lý') && 
                  !s.department.toLowerCase().includes('trưởng ca') &&
                  !s.department.toLowerCase().includes('tiếp đón') &&
                  !s.department.toLowerCase().includes('kế toán')
              );
              if (allInOneStaff.length > 1) {
                  const hours = allInOneStaff.map(s => calculateSpecialHours(s, includeTnInSbh));
                  sbhDiff = Math.max(...hours) - Math.min(...hours);
              }
          }

          const newTargets: ScheduleTargets = {
              kho: totalStaffForTargets > 0 ? Math.ceil(totalKhoShifts / totalStaffForTargets) : 1,
              tn: totalStaffForTargets > 0 ? Math.ceil(totalTnShifts / totalStaffForTargets) : 1,
              gh: totalNamInTargets > 0 ? Math.ceil(totalGhShifts / totalNamInTargets) : 1,
              sbhDiff: sbhDiff
          };
          setTargets(newTargets);
     } else if(isDataLoadedForSupermarket) {
         setTargets(null);
     }
  }, [isDataLoadedForSupermarket, nams, nus, rules, duration, departmentPatterns, staffList, includeTnInSbh]);

  useEffect(() => {
    if (!isDbLoaded || !isDataLoadedForSupermarket || !currentSupermarket || isImportingRef.current) return;
    idb.saveData(getKey('nams'), nams);
    idb.saveData(getKey('nus'), nus);
    idb.saveData(getKey('rules'), rules);
    idb.saveData(getKey('departmentPatterns'), departmentPatterns);
    idb.saveData(getKey('dailyRequirements'), dailyRequirements);
    idb.saveData(getKey('shiftDefinitions'), shiftDefinitions);
    
    const scheduleKey = getKey(`schedule-${monthYear}`);
    idb.saveData(scheduleKey, staffList);
    
    const historyKey = getKey(`history-${monthYear}`);
    idb.saveData(historyKey, scheduleHistory);
    const busyScheduleKey = getKey(`busySchedule-${monthYear}`);
    idb.saveData(busyScheduleKey, busySchedule);
    const unresolvedKey = getKey(`unresolved-${monthYear}`);
    idb.saveData(unresolvedKey, unresolvedConflicts);
    const uiState = { monthYear, startDay, duration, includeTnInSbh, autoAddWeekendShifts, lastSupermarket: currentSupermarket };
    idb.saveData('uiState', uiState);
  }, [nams, nus, rules, departmentPatterns, dailyRequirements, staffList, busySchedule, scheduleHistory, monthYear, isDbLoaded, isDataLoadedForSupermarket, startDay, duration, includeTnInSbh, autoAddWeekendShifts, currentSupermarket, getKey, unresolvedConflicts]);

  const logHistory = useCallback((description: string) => {
    const newEntry: ScheduleHistoryEntry = {
        timestamp: Date.now(),
        description,
        scheduleSnapshot: JSON.parse(JSON.stringify(staffListRef.current))
    };
    setScheduleHistory(prev => [newEntry, ...prev]);
  }, []);

  useEffect(() => {
    if (monthYear) {
        const [y, m] = monthYear.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        setDuration(daysInMonth);
    }
  }, [monthYear]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'error') {
      toast.error(message, { duration: 3000 });
    } else if (type === 'info') {
      toast(message, { duration: 3000 });
    } else {
      toast.success(message, { duration: 3000 });
    }
  };

  const handleDeleteStaffList = () => {
      setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteStaffList = async () => {
      setIsDeleteConfirmOpen(false);
      
      // Clear state
      setNams([]);
      setNus([]);
      setStaffList([]);
      setTargets(null);
      setDepartmentPatterns({});
      setBusySchedule({});
      setScheduleHistory([]);
      setUnresolvedConflicts([]);
      setDailyRequirements(ZERO_REQUIREMENTS);
      setDepartmentFilter('');
      setShiftDefinitions(DEFAULT_SHIFT_DEFINITIONS);
      
      // Clear DB explicitly to be safe
      await idb.saveData(getKey('nams'), []);
      await idb.saveData(getKey('nus'), []);
      await idb.saveData(getKey('departmentPatterns'), {});
      await idb.saveData(getKey('dailyRequirements'), ZERO_REQUIREMENTS);
      await idb.saveData(getKey('shiftDefinitions'), DEFAULT_SHIFT_DEFINITIONS);
      await idb.saveData(getKey(`schedule-${monthYear}`), []);
      await idb.saveData(getKey(`busySchedule-${monthYear}`), {});
      await idb.saveData(getKey(`history-${monthYear}`), []);
      await idb.saveData(getKey(`unresolved-${monthYear}`), []);
      await idb.saveData(getKey(`monthly_stats-${monthYear}`), {});

      // Remove current supermarket from the global list
      const updatedSupermarkets = supermarkets.filter(sm => sm !== currentSupermarket);
      setSupermarkets(updatedSupermarkets);
      await idb.saveData('meta_supermarkets', updatedSupermarkets);
      
      if (updatedSupermarkets.length > 0) {
          setCurrentSupermarket(updatedSupermarkets[0]);
      } else {
          setCurrentSupermarket('');
      }

      showToast("Đã xóa siêu thị và toàn bộ dữ liệu.", "success");
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const json: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            const imported: ImportedStaff[] = [];
            let currentDepartment = "";
            json.slice(2).forEach(row => {
                let departmentRaw = row[0]?.toString().trim();
                
                // Tăng cường nhận diện dòng tiêu đề bộ phận trong Excel (chống lỗi gộp ô sai cột)
                if (!departmentRaw || departmentRaw === "") {
                    // Nếu cột A trống, tìm ở các cột khác xem có chữ "BP " hoặc "Bộ phận"
                    for (let i = 1; i < Math.min(row.length, 5); i++) {
                        const cellVal = row[i]?.toString().trim();
                        if (cellVal && (cellVal.includes("BP ") || cellVal.toLowerCase().includes("bộ phận") || cellVal.includes("All In One"))) {
                            departmentRaw = cellVal;
                            break;
                        }
                    }
                    // Nếu vẫn không thấy, kiểm tra xem dòng này có phải chỉ có 1 ô duy nhất không (thường là tiêu đề)
                    if (!departmentRaw) {
                        const validCells = row.filter(c => c !== undefined && c !== null && c.toString().trim() !== "");
                        if (validCells.length === 1 && isNaN(Number(validCells[0]))) {
                            departmentRaw = validCells[0].toString().trim();
                        }
                    }
                }

                // Chỉ cập nhật currentDepartment nếu nó không phải là 1 số (tránh lấy nhầm mã nhân viên)
                if (departmentRaw && isNaN(Number(departmentRaw))) {
                    currentDepartment = departmentRaw;
                }
                let department = currentDepartment;
                const staffCode = row[1]?.toString().trim();
                const staffName = row[2]?.toString().trim();
                if (department && staffCode && staffName) {
                    if (department.includes("BP Kế Toán")) return;
                    if (department.includes("BP Trưởng Ca") || department.includes("BP Quản Lý Siêu Thị")) department = "BP Quản Lý/Trưởng Ca";
                    const combinedName = `${staffCode} - ${staffName}`;
                    imported.push({ id: combinedName, name: combinedName, department: department });
                }
            });
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
  } = {}) => {
      const { forDepartment, busyScheduleOverride, patternsOverride, rulesOverride, namsOverride, nusOverride } = options;
      const currentNams = namsOverride || nams;
      const currentNus = nusOverride || nus;
      if (!monthYear || isNaN(startDay) || isNaN(duration) || !(rulesOverride || rules) || (currentNams.length === 0 && currentNus.length === 0)) return;
      const [yearVal, monthVal] = monthYear.split('-').map(Number);
      (async () => {
        const d = new Date(yearVal, monthVal - 1, 1); d.setMonth(d.getMonth() - 1);
        const prevMonthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const prevStatsKey = getKey(`monthly_stats-${prevMonthYear}`);
        const previousMonthStats = await idb.loadData<MonthlyStats>(prevStatsKey) || {};
        const config: ScheduleConfig = { year: yearVal, month: monthVal, startDay, duration, includeTn: includeTnInSbh };
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
  }, [monthYear, startDay, duration, nams, nus, rules, departmentPatterns, busySchedule, includeTnInSbh, staffList, departmentFilter, getKey]);
  
  useEffect(() => {
    if (durationDebounceTimer.current) clearTimeout(durationDebounceTimer.current);
    if (isDbLoaded && (nams.length > 0 || nus.length > 0)) { 
        durationDebounceTimer.current = window.setTimeout(() => generateNewSchedule(), 1000);
    }
    return () => { if (durationDebounceTimer.current) clearTimeout(durationDebounceTimer.current); };
  }, [duration, isDbLoaded, nams, nus]);

  const getSortedStaffForExport = (): StaffMember[] => {
    const staffListCopy = JSON.parse(JSON.stringify(staffList));
    const depts = [...new Set(staffListCopy.map((s: StaffMember) => s.department))].sort();
    let result: StaffMember[] = [];
    
    depts.forEach(dept => {
        const deptStaff = staffListCopy.filter((s: StaffMember) => s.department === dept);
        const namsInDept = deptStaff.filter((s: StaffMember) => s.gender === 'Nam').sort((a: StaffMember, b: StaffMember) => a.name.localeCompare(b.name));
        const nusInDept = deptStaff.filter((s: StaffMember) => s.gender === 'Nu').sort((a: StaffMember, b: StaffMember) => a.name.localeCompare(b.name));
        
        let i = 0, j = 0;
        while (i < namsInDept.length || j < nusInDept.length) {
            if (i < namsInDept.length) result.push(namsInDept[i++]);
            if (j < nusInDept.length) result.push(nusInDept[j++]);
        }
    });
    return result;
  };

  const handleAutoAddWeekendShiftsChange = (checked: boolean) => {
    setAutoAddWeekendShifts(checked);
    
    if (staffList.length === 0 || !monthYear) return;
    const [yearVal, monthVal] = monthYear.split('-').map(Number);
    
    const isWeekend = (year: number, month: number, startDay: number, dayIndex: number) => {
        const date = new Date(year, month - 1, startDay + dayIndex - 1);
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    };
    
    const updatedStaffList = staffList.map(staff => {
        const newStaff = { ...staff, schedule: [...staff.schedule] };
        let hasChanges = false;
        
        for (let d = 1; d <= duration; d++) {
            if (isWeekend(yearVal, monthVal, startDay, d)) {
                const info = newStaff.schedule[d];
                if (info && info.role !== 'OFF') {
                    if (checked) {
                        let added = "";
                        let newShift = info.shift;
                        if (!newShift.includes('2')) {
                            newShift += '2';
                            added += '2';
                        }
                        if (!newShift.includes('5')) {
                            newShift += '5';
                            added += '5';
                        }
                        if (added) {
                            newShift = newShift.split('').sort().join('');
                            let newRole = newShift;
                            const match = info.role.match(/\(([^)]+)\)/);
                            if (match) {
                                newRole = `${newShift} (${match[1]})`;
                            }
                            
                            newStaff.schedule[d] = {
                                ...info,
                                shift: newShift,
                                role: newRole,
                                addedWeekendShifts: (info.addedWeekendShifts || "") + added,
                                isManual: true
                            };
                            hasChanges = true;
                        }
                    } else {
                        if (info.addedWeekendShifts) {
                            let newShift = info.shift;
                            for (const char of info.addedWeekendShifts) {
                                newShift = newShift.replace(char, '');
                            }
                            
                            let newRole = newShift;
                            const match = info.role.match(/\(([^)]+)\)/);
                            if (match) {
                                newRole = `${newShift} (${match[1]})`;
                            }
                            
                            newStaff.schedule[d] = {
                                ...info,
                                shift: newShift,
                                role: newRole,
                                addedWeekendShifts: undefined
                            };
                            hasChanges = true;
                        }
                    }
                }
            }
        }
        
        if (hasChanges) {
            newStaff.stats = recalculateStatsForStaff(newStaff);
        }
        return newStaff;
    });
    
    setStaffList(updatedStaffList);
    logHistory(checked ? "Tự động tăng ca 2,5 T7-CN" : "Gỡ tự động tăng ca 2,5 T7-CN");
  };

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

  const handleExportExcel = () => {
    if (!nams.length && !nus.length) return showToast("Chưa có dữ liệu.", 'error');
    const sortedList = getSortedStaffForExport();
    const [yearVal, monthVal] = monthYear.split('-').map(Number);
    const data: any[][] = [['LỊCH PHÂN CA'], ['HỌ VÀ TÊN', 'SBH', 'TỔNG', ...Array.from({length: duration}, (_, i) => `Ngày ${i+1}`)]];
    sortedList.forEach(staff => {
        const row = [staff.name, Math.ceil(calculateSpecialHours(staff, includeTnInSbh)), Math.ceil(calculateTotalHours(staff))];
        for (let d = 1; d <= duration; d++) row.push(staff.schedule[d]?.role || '');
        data.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Lich");
    XLSX.writeFile(wb, `Lich_${monthVal}_${yearVal}.xlsx`);
  };

  const handleExportGoogleSheet = async () => {
    if (!nams.length && !nus.length) return showToast("Chưa có dữ liệu.", 'error');
    
    const toastEl = document.createElement('div');
    toastEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:opacity .2s';
    toastEl.textContent = '📊 Đang tạo Google Sheet...';
    document.body.appendChild(toastEl);

    const attemptExport = async (retryCount = 0): Promise<void> => {
        toastEl.textContent = '🔑 Đang xác thực Google...';
        sessionStorage.removeItem('googleOAuthToken');
        const { loginWithGoogleForceConsent } = await import('../../services/firebase');
        await loginWithGoogleForceConsent();
        let token = sessionStorage.getItem('googleOAuthToken');
        if (!token) throw new Error('Không thể lấy token xác thực.');

        toastEl.textContent = '📊 Đang tạo Google Sheet...';
        const { exportToGoogleSheet } = await import('../../services/googleSheetsService');

        const sortedList = getSortedStaffForExport();
        const [yearVal, monthVal] = monthYear.split('-').map(Number);
        
        // --- Build Rows ---
        const rows: any[][] = [];
        
        // Row 0: Top Headers
        const row0 = ['STT', 'HỌ VÀ TÊN', 'GIỜ CÔNG', '', '', 'SỐ NGÀY SBH', '', '', 'SỐ LẦN', ''];
        for (let w = 0; w < Math.ceil(duration / 7); w++) {
             row0.push(`TUẦN ${w+1}`);
             for (let j = 0; j < 6; j++) row0.push('');
        }
        row0.length = 10 + duration; // Cut off to exact duration
        rows.push(row0);
        
        // Row 1: Sub Headers
        const row1 = ['', '', 'SBH', 'TV', 'TỔNG', 'GH', 'KH', 'TN', 'ĐỔI', 'OFF'];
        for (let d = 1; d <= duration; d++) {
             const date = new Date(yearVal, monthVal - 1, startDay + d - 1);
             const dowStr = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
             row1.push(`${date.getDate()}\n${dowStr}`);
        }
        rows.push(row1);
        
        // Rows: Staff Data
        sortedList.forEach((staff, i) => {
            const specialHours = calculateSpecialHours(staff, includeTnInSbh);
            const normalHours = calculateNormalHours(staff);
            const totalHours = calculateTotalHours(staff);
            const stats = staff.stats;
            
            const rowData: any[] = [
                i + 1,
                staff.name,
                Math.round(specialHours),
                Math.round(normalHours),
                Math.round(totalHours),
                stats.gh || '-',
                stats.kho || '-',
                stats.tn || '-',
                stats.swapCount || '-',
                stats.offDays || '-'
            ];
            
            for (let d = 1; d <= duration; d++) {
                 const info = staff.schedule[d];
                 if (!info || info.role === '') {
                     rowData.push('');
                     continue;
                 }
                 if (info.role === 'OFF') {
                     rowData.push('OFF');
                 } else {
                     let text = info.shift;
                     if (info.role.includes('(GH)')) text += '\nGH';
                     else if (info.role.includes('(Kho)')) text += '\nKH';
                     else if (info.role.includes('(TN)')) text += '\nTN';
                     rowData.push(text);
                 }
            }
            rows.push(rowData);
        });
        
        // --- Build Formatting Requests ---
        const formattingRequests = (sheetId: number) => {
            const reqs: any[] = [];
            
            // Fix: Freeze 2 rows and 2 cols FIRST, before merging!
            reqs.push({
                updateSheetProperties: {
                    properties: { sheetId, gridProperties: { frozenRowCount: 2, frozenColumnCount: 2 } },
                    fields: 'gridProperties(frozenRowCount,frozenColumnCount)'
                }
            });
            
            // Merges
            const merges = [
                { startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 1 }, // STT
                { startRowIndex: 0, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 2 }, // Ho ten
                { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 2, endColumnIndex: 5 }, // Gio cong
                { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 5, endColumnIndex: 8 }, // Ngay sbh
                { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 8, endColumnIndex: 10 }, // So lan
            ];
            for (let w = 0; w < Math.ceil(duration / 7); w++) {
                const s = 10 + w * 7;
                const e = Math.min(s + 7, 10 + duration);
                if (e > s) merges.push({ startRowIndex: 0, endRowIndex: 1, startColumnIndex: s, endColumnIndex: e });
            }
            
            merges.forEach(m => {
                reqs.push({
                    mergeCells: { range: { sheetId, ...m }, mergeType: "MERGE_ALL" }
                });
            });
            
            // Base Header formatting
            reqs.push({
                repeatCell: {
                    range: { sheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 10 + duration },
                    cell: {
                        userEnteredFormat: {
                            textFormat: { bold: true, fontSize: 10 },
                            horizontalAlignment: 'CENTER',
                            verticalAlignment: 'MIDDLE',
                            backgroundColorStyle: { rgbColor: { red: 248/255, green: 250/255, blue: 252/255 } } // bg-slate-50
                        }
                    },
                    fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,backgroundColorStyle)'
                }
            });
            
            // Header block group colors
            const headerBlockFormats = [
                { sCol: 2, eCol: 5, bg: { red: 240/255, green: 249/255, blue: 255/255 }, fg: { red: 7/255, green: 89/255, blue: 133/255 } }, // Gio cong (sky)
                { sCol: 5, eCol: 8, bg: { red: 253/255, green: 244/255, blue: 255/255 }, fg: { red: 134/255, green: 25/255, blue: 143/255 } }, // Ngay SBH (fuchsia)
                { sCol: 8, eCol: 10, bg: { red: 255/255, green: 247/255, blue: 237/255 }, fg: { red: 154/255, green: 52/255, blue: 18/255 } }, // So lan (orange)
                { sCol: 10, eCol: 10 + duration, bg: { red: 240/255, green: 253/255, blue: 250/255 }, fg: { red: 17/255, green: 94/255, blue: 89/255 } }, // Tuan (teal)
            ];
            
            headerBlockFormats.forEach(h => {
                reqs.push({
                    repeatCell: {
                        range: { sheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: h.sCol, endColumnIndex: h.eCol },
                        cell: {
                            userEnteredFormat: {
                                backgroundColorStyle: { rgbColor: h.bg },
                                textFormat: { bold: true, fontSize: 10, foregroundColorStyle: { rgbColor: h.fg } },
                                horizontalAlignment: 'CENTER',
                                verticalAlignment: 'MIDDLE'
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColorStyle,textFormat,horizontalAlignment,verticalAlignment)'
                    }
                });
            });
            // (Frozen properties moved to the top)
            
            // Column widths
            const colWidths = [
                { startIndex: 0, endIndex: 1, width: 40 }, // STT
                { startIndex: 1, endIndex: 2, width: 150 }, // Ho ten
                { startIndex: 2, endIndex: 10, width: 45 }, // Metrics
                { startIndex: 10, endIndex: 10 + duration, width: 50 }, // Days
            ];
            colWidths.forEach(cw => {
                reqs.push({
                    updateDimensionProperties: {
                        range: { sheetId, dimension: "COLUMNS", startIndex: cw.startIndex, endIndex: cw.endIndex },
                        properties: { pixelSize: cw.width },
                        fields: 'pixelSize'
                    }
                });
            });
            
            // Data Rows Alignment
            reqs.push({
                repeatCell: {
                    range: { sheetId, startRowIndex: 2, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: 10 + duration },
                    cell: {
                        userEnteredFormat: {
                            horizontalAlignment: 'CENTER',
                            verticalAlignment: 'MIDDLE',
                            textFormat: { bold: true, fontSize: 10 }
                        }
                    },
                    fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat)'
                }
            });
            
            // Base Name column alignment (Left)
            reqs.push({
                repeatCell: {
                    range: { sheetId, startRowIndex: 2, endRowIndex: rows.length, startColumnIndex: 1, endColumnIndex: 2 },
                    cell: {
                        userEnteredFormat: {
                            horizontalAlignment: 'LEFT',
                            verticalAlignment: 'MIDDLE'
                        }
                    },
                    fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)'
                }
            });
            
            // Name column colors based on gender
            sortedList.forEach((staff, index) => {
                const isNam = staff.gender === 'Nam';
                reqs.push({
                    repeatCell: {
                        range: { sheetId, startRowIndex: 2 + index, endRowIndex: 3 + index, startColumnIndex: 1, endColumnIndex: 2 },
                        cell: {
                            userEnteredFormat: {
                                textFormat: { 
                                    bold: true, 
                                    fontSize: 10, 
                                    foregroundColorStyle: { 
                                        rgbColor: isNam ? { red: 2/255, green: 132/255, blue: 199/255 } : { red: 225/255, green: 29/255, blue: 72/255 } 
                                    } 
                                }
                            }
                        },
                        fields: 'userEnteredFormat.textFormat'
                    }
                });
            });
            
            // Conditional Formats for Tags
            const addCondRule = (text: string, bg: any, fg: any) => {
                reqs.push({
                    addConditionalFormatRule: {
                        rule: {
                            ranges: [{ sheetId, startRowIndex: 2, endRowIndex: rows.length, startColumnIndex: 10, endColumnIndex: 10 + duration }],
                            booleanRule: {
                                condition: { type: "TEXT_CONTAINS", values: [{ userEnteredValue: text }] },
                                format: { backgroundColorStyle: { rgbColor: bg }, textFormat: { foregroundColorStyle: { rgbColor: fg }, bold: true } }
                            }
                        },
                        index: 0
                    }
                });
            };
            
            // GH: amber #fef3c7 (254, 243, 199) -> fg #92400e (146, 64, 14)
            addCondRule("GH", { red: 254/255, green: 243/255, blue: 199/255 }, { red: 146/255, green: 64/255, blue: 14/255 });
            // KH: emerald #d1fae5 (209, 250, 229) -> fg #065f46 (6, 95, 70)
            addCondRule("KH", { red: 209/255, green: 250/255, blue: 229/255 }, { red: 6/255, green: 95/255, blue: 70/255 });
            // TN: purple #f3e8ff (243, 232, 255) -> fg #6b21a8 (107, 33, 168)
            addCondRule("TN", { red: 243/255, green: 232/255, blue: 255/255 }, { red: 107/255, green: 33/255, blue: 168/255 });
            // OFF: rose #ffe4e6 (255, 228, 230) -> fg #9f1239 (159, 18, 57)
            addCondRule("OFF", { red: 255/255, green: 228/255, blue: 230/255 }, { red: 159/255, green: 18/255, blue: 57/255 });
            
            // Sunday header text color
            for (let d = 1; d <= duration; d++) {
                 const date = new Date(yearVal, monthVal - 1, startDay + d - 1);
                 if (date.getDay() === 0) { // Sunday
                     reqs.push({
                         repeatCell: {
                             range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 9 + d, endColumnIndex: 10 + d },
                             cell: { userEnteredFormat: { textFormat: { foregroundColorStyle: { rgbColor: { red: 225/255, green: 29/255, blue: 72/255 } }, bold: true } } },
                             fields: 'userEnteredFormat.textFormat'
                         }
                     });
                 }
            }

            return reqs;
        };

        toastEl.textContent = `📊 Đang ghi ${sortedList.length} nhân viên...`;

        try {
            const url = await exportToGoogleSheet(token, {
                title: `Lịch Phân Ca - Tháng ${monthVal}/${yearVal}`,
                rows,
                sheetName: 'LichPhanCa',
                formattingRequests
            });

            toastEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#16a34a;color:#fff;padding:14px 20px;border-radius:12px;font-size:13px;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.2);transition:opacity .2s;display:flex;flex-direction:column;gap:10px;max-width:420px;width:90vw';
            toastEl.innerHTML = '';

            const msgDiv = document.createElement('div');
            msgDiv.textContent = '✅ Đã tạo Google Sheet thành công!';
            msgDiv.style.fontWeight = '600';
            toastEl.appendChild(msgDiv);

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';

            const openBtn = document.createElement('a');
            openBtn.href = url;
            openBtn.target = '_blank';
            openBtn.textContent = '📄 Mở Sheet';
            openBtn.style.cssText = 'padding:6px 14px;background:#fff;color:#16a34a;border-radius:8px;font-weight:700;font-size:12px;text-decoration:none;cursor:pointer';

            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Đóng';
            closeBtn.style.cssText = 'padding:6px 14px;background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:8px;font-weight:600;font-size:12px;cursor:pointer';
            closeBtn.onclick = () => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 200); };

            btnRow.appendChild(openBtn);
            btnRow.appendChild(closeBtn);
            toastEl.appendChild(btnRow);

            setTimeout(() => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 200); }, 15000);
        } catch (apiErr: any) {
            if (apiErr?.message === 'AUTH_EXPIRED' && retryCount < 1) {
                toastEl.textContent = '🔄 Token hết hạn, đang xác thực lại...';
                return attemptExport(retryCount + 1);
            }
            throw apiErr;
        }
    };

    try {
        await attemptExport();
    } catch (err: any) {
        console.error('Google Sheets export error:', err);
        const errMsg = (err?.message || '').toLowerCase();
        if (errMsg.includes('popup') || errMsg.includes('cancel')) {
            toastEl.textContent = '❌ Đăng nhập bị huỷ.';
        } else if (errMsg.includes('network') || errMsg.includes('failed to fetch')) {
            toastEl.textContent = '🌐 Không có kết nối mạng.';
        } else if (errMsg === 'auth_expired') {
            toastEl.textContent = '🔑 Phiên đăng nhập hết hạn. Vui lòng thử lại.';
        } else {
            toastEl.textContent = `⚠️ Lỗi: ${err?.message || 'Không xác định'}`;
        }
        toastEl.style.background = '#dc2626';
        setTimeout(() => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 200); }, 3000);
    }
  };

  const handleSaveShift = (newShiftData: ScheduleInfo) => {
    if (!editingCellInfo) return;
    const { employeeId, dayIndex } = editingCellInfo;
    setStaffList(currentStaffList => {
      const newStaffList = JSON.parse(JSON.stringify(currentStaffList));
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
        const newNams = staffWithGenders.filter(s => s.gender === 'Nam').map(s => ({ name: s.name, department: s.department }));
        const newNus = staffWithGenders.filter(s => s.gender === 'Nu').map(s => ({ name: s.name, department: s.department }));
        
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
    <div className="phan-ca-layout min-h-screen bg-[#f0f2f5] pb-20">
      {/* EXPORT OVERLAY */}
      {batchExportProgress && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[100]">
              <div className="bg-white p-10 shadow-2xl flex flex-col items-center max-w-md w-full border border-slate-200">
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

      {/* GLOBAL HEADER ACTIONS PORTAL */}
      {mounted && activeTab === 'tools-phanca' && document.getElementById('global-header-actions') && createPortal(
          <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm">
            {/* Data management group */}
            <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
              <button onClick={handleImportClick} className="flex items-center gap-2 px-4 py-2 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold text-sm transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  <span>Nhập NV</span>
              </button>
              <a href="https://office.thegioididong.com/quan-ly-phan-ca" target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 border-l border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" title="Lấy danh sách nhân viên từ hệ thống">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
              <button onClick={handleDeleteStaffList} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-900/20 border-l border-slate-100 dark:border-slate-700 transition-colors" title="Xóa danh sách">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
              <button onClick={() => setEditPatternModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 font-semibold text-sm border-l border-slate-100 dark:border-slate-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                  <span>Ca Xoay</span>
              </button>
            </div>

            {/* Export group */}
            <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
              <button onClick={handleExportAll} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" disabled={!hasStaff}>
                  Tất cả
              </button>
              <button onClick={handleExportWeekly} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 border-l border-slate-100 dark:border-slate-700 transition-colors" disabled={!hasStaff}>
                  Tuần
              </button>
              <button onClick={handleExportIndividual} className="px-4 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 border-l border-slate-700 transition-colors" disabled={!hasStaff}>
                  Từng NV
              </button>
              <button onClick={handleExportExcel} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 border-l border-emerald-700 transition-colors" disabled={!hasStaff}>
                  Excel
              </button>
              <button onClick={handleExportGoogleSheet} className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border-l border-blue-200 transition-colors" disabled={!hasStaff} title="Xuất ra Google Sheet">
                  Sheet
              </button>
            </div>
          </div>,
          document.getElementById('global-header-actions')!
      )}

      {/* Mobile action bar — lg:hidden */}
      <div className="lg:hidden sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/60 px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button onClick={handleImportClick} className="h-8 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors flex items-center gap-1.5 shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Nhập NV
          </button>
          <a href="https://office.thegioididong.com/quan-ly-phan-ca" target="_blank" rel="noopener noreferrer" className="h-8 px-2.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center justify-center shrink-0" title="Lấy DS NV">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <button onClick={handleDeleteStaffList} className="h-8 px-2.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors flex items-center gap-1.5 shrink-0" title="Xóa danh sách">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Xoá
          </button>
          <button onClick={() => setEditPatternModalOpen(true)} className="h-8 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors flex items-center gap-1.5 shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
              Ca Xoay
          </button>
          <div className="w-px h-5 bg-slate-200 shrink-0"></div>
          <button onClick={handleExportAll} className="h-8 px-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md transition-colors shrink-0" disabled={!hasStaff}>
              Tất cả
          </button>
          <button onClick={handleExportWeekly} className="h-8 px-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md transition-colors shrink-0" disabled={!hasStaff}>
              Tuần
          </button>
          <button onClick={handleExportIndividual} className="h-8 px-2.5 text-xs font-bold text-white bg-slate-800 rounded-md transition-colors shrink-0" disabled={!hasStaff}>
              Từng NV
          </button>
          <button onClick={handleExportExcel} className="h-8 px-2.5 text-xs font-bold text-white bg-emerald-600 rounded-md transition-colors shrink-0" disabled={!hasStaff}>
              Excel
          </button>
          <button onClick={handleExportGoogleSheet} className="h-8 px-2.5 text-xs font-bold text-blue-700 bg-blue-50 rounded-md transition-colors shrink-0" disabled={!hasStaff} title="Xuất ra Google Sheet">
              Sheet
          </button>
      </div>

      <main className="max-w-[1600px] mx-auto px-6 mt-6">
        <div className={`bg-white p-5 border border-slate-200 mb-6 ${isExportingImage ? 'export-hidden' : ''}`}>
          <Controls 
            monthYear={monthYear} setMonthYear={setMonthYear} startDay={startDay} setStartDay={setStartDay} duration={duration} setDuration={setDuration}
            onGenerate={() => generateNewSchedule()} departments={uniqueDepartments} departmentFilter={departmentFilter} setDepartmentFilter={setDepartmentFilter}
            supermarkets={supermarkets} currentSupermarket={currentSupermarket} setSupermarket={handleSupermarketChange} onboardingStep={onboardingStep}
            hasStaff={hasStaff} hasPatternsForCurrentDept={!!departmentPatterns[departmentFilter]} onDateControlClick={() => onboardingStep === 3 && setOnboardingStep(4)}
          />
        </div>

        <div ref={exportContainerRef} className={`bg-white overflow-hidden border border-slate-200 shadow-sm ${isIndividualExport ? 'max-w-5xl mx-auto' : ''}`}>
          <div className={`px-8 pt-8 pb-6 border-b border-slate-100 ${isIndividualExport ? 'hidden' : ''}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                  {exportTitle || `LỊCH PHÂN CA - ${currentSupermarket || 'Cửa Hàng'}`}
                </h1>
              </div>
              {!isExportingImage && (
                <button onClick={() => setHistoryModalOpen(true)} className="p-2.5 border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors" title="Lịch sử thay đổi">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
              )}
            </div>
            <div>
               <Legend 
                 targets={targets} 
                 onEditRule={(k) => { setEditingRuleKey(k); setEditRulesModalOpen(true); }} 
                 includeTnInSbh={includeTnInSbh} 
                 onIncludeTnInSbhChange={setIncludeTnInSbh} 
                 onboardingStep={onboardingStep} 
                 autoAddWeekendShifts={autoAddWeekendShifts}
                 onAutoAddWeekendShiftsChange={handleAutoAddWeekendShiftsChange}
               />
            </div>
          </div>

          <div className={`px-5 pb-0 ${isExportingImage ? 'export-hidden' : ''}`}>
             <DailyStatsTable 
                staffList={staffList} config={{ year, month, startDay, duration }} requirements={dailyRequirements} setRequirements={setDailyRequirements}
                selectedDay={statsDay} setSelectedDay={setStatsDay} departmentFilter={departmentFilter} unresolvedConflicts={unresolvedConflicts} onShowUnresolvedConflicts={() => setConflictModalOpen(true)}
             />
          </div>

          <div className="px-5 py-6">
            {hasStaff && targets ? (
              isIndividualExport ? (
                 <VerticalIndividualSchedule 
                    staff={listForTable[0]} 
                    config={{ year, month, startDay, duration }} 
                    targets={targets} 
                    includeTnInSbh={includeTnInSbh} 
                 />
              ) : (
                <ScheduleTable 
                    staffList={listForTable} config={{ year, month, startDay, duration }} targets={targets} tableRef={tableRef}
                    includeTnInSbh={includeTnInSbh}
                    onDeleteEmployee={(id) => setEmployeeToDelete(id)} onEditShift={(id, d) => {
                        setEditingCellInfo({
                            employeeId: id, dayIndex: d, employeeName: staffList.find(s => s.id === id)!.name, department: staffList.find(s => s.id === id)!.department,
                            gender: staffList.find(s => s.id === id)!.gender, date: `${new Date(year, month - 1, startDay + d - 1).getDate()}/${month}`,
                            currentShift: staffList.find(s => s.id === id)!.schedule[d] || { shift: 'Trống', role: 'Trống' },
                            isSpecialShift: (staffList.find(s => s.id === id)!.schedule[d]?.role || '').includes('('),
                            employeeStats: staffList.find(s => s.id === id)!.stats, changeHistory: staffList.find(s => s.id === id)!.changeHistory
                        });
                        setEditShiftModalOpen(true);
                    }}
                    onDayHover={(d) => { if(d) setStatsDay(d); setHoveredDay(d); }} hoveredDay={hoveredDay} weekRange={weeklyExportConfig} highlightId={currentHighlightedId}
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
              <div className="px-8 py-8 flex justify-end">
                  <div className="text-center w-56 border-t-2 border-slate-200 pt-4">
                      <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-10">Quản Lý Duyệt</p>
                      <p className="font-semibold text-slate-400 text-[9px] italic">(Ký và ghi rõ họ tên)</p>
                  </div>
              </div>
          )}
        </div>
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
      {isDeleteConfirmOpen && <ConfirmModal 
        message="Bạn có chắc chắn muốn xóa danh sách nhân viên hiện tại? Lịch phân ca, mẫu ca, và lịch bận cũng sẽ bị xóa." 
        onConfirm={confirmDeleteStaffList} 
        onCancel={() => setIsDeleteConfirmOpen(false)} 
      />}

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
