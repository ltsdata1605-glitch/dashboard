import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import './phanca.css';
import { exportToImage, generateBusyTemplateTSV } from './utils/exportUtils';
import { useActiveTab } from '../../../contexts/LayoutContext';
import { recalculateStatsForStaff, findBestSolution, calculateTotalHours, calculateSpecialHours, calculateNormalHours, findAutomaticReplacement, autoRefineSchedule, generateBalancingFeedback } from './utils/scheduleUtils';
import * as idb from './db/idb';
import Controls from './components/Controls';
import Legend from './components/Legend';
import ScheduleTable from './components/ScheduleTable';
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
  const [isEditRulesModalOpen, setEditRulesModalOpen] = useState(false);
  const [isEditShiftModalOpen, setEditShiftModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isEditPatternModalOpen, setEditPatternModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [isConflictModalOpen, setConflictModalOpen] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [shiftDefinitions, setShiftDefinitions] = useState<ShiftDefinitions>(DEFAULT_SHIFT_DEFINITIONS);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
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
    const uiState = { monthYear, startDay, duration, includeTnInSbh, lastSupermarket: currentSupermarket };
    idb.saveData('uiState', uiState);
  }, [nams, nus, rules, departmentPatterns, dailyRequirements, staffList, busySchedule, scheduleHistory, monthYear, isDbLoaded, isDataLoadedForSupermarket, startDay, duration, includeTnInSbh, currentSupermarket, getKey, unresolvedConflicts]);

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
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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
            else alert("Không tìm thấy dữ liệu nhân viên hợp lệ.");
        } catch (error) { alert("Lỗi khi xử lý file Excel."); }
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
    if (list.length === 0) return alert("Chưa có lịch để xuất.");
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
        alert("Lỗi khi xuất ảnh theo tuần.");
    } finally {
        setBatchExportProgress(null);
        setWeeklyExportConfig(null);
        setStaffListForExport(null);
        setIsExportingImage(false);
        setExportTitle('');
    }
  };

  const handleExportIndividual = async () => {
    const list = getSortedStaffForExport();
    if (list.length === 0) return alert("Chưa có lịch để xuất.");
    if (!confirm("Hệ thống sẽ tiến hành xuất file cho từng nhân viên. Bạn có đồng ý?")) return;
    
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
        console.error("Export error:", err);
        alert("Lỗi khi xuất ảnh cá nhân.");
    } finally {
        setBatchExportProgress(null);
        setStaffListForExport(null);
        setIsExportingImage(false);
        setExportTitle('');
    }
  };

  const handleExportExcel = () => {
    if (!nams.length && !nus.length) return alert("Chưa có dữ liệu.");
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
        console.error("Import error:", error);
        alert("Có lỗi xảy ra khi lưu dữ liệu nhân viên.");
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

  return (
    <div className="min-h-screen bg-[#f0f2f5] pb-20">
      {/* EXPORT OVERLAY */}
      {batchExportProgress && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center z-[100] text-white">
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
          <div className="flex items-center gap-1.5 px-2">
            {/* Data management group */}
            <div className="flex items-center border border-slate-200 bg-white rounded-md overflow-hidden shadow-sm">
              <button onClick={handleImportClick} className="h-9 px-3 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-1.5 border-r border-slate-200">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Nhập NV
              </button>
              <a href="https://office.thegioididong.com/quan-ly-phan-ca" target="_blank" rel="noopener noreferrer" className="h-9 px-3 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center border-r border-slate-200" title="Lấy danh sách nhân viên từ hệ thống">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
              <button onClick={handleDeleteStaffList} className="h-9 px-3 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-1.5 border-r border-slate-200" title="Xóa danh sách">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Xoá
              </button>
              <button onClick={() => setEditPatternModalOpen(true)} className="h-9 px-3 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                  Ca Xoay
              </button>
            </div>

            {/* Export group */}
            <div className="flex items-center shadow-sm rounded-md overflow-hidden">
              <button onClick={handleExportAll} className="h-9 px-3 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 transition-colors" disabled={!hasStaff}>
                  Tất cả
              </button>
              <button onClick={handleExportWeekly} className="h-9 px-3 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-l-0 border-slate-200 transition-colors" disabled={!hasStaff}>
                  Tuần
              </button>
              <button onClick={handleExportIndividual} className="h-9 px-3 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 border border-l-0 border-slate-800 transition-colors" disabled={!hasStaff}>
                  Từng NV
              </button>
              <button onClick={handleExportExcel} className="h-9 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-l-0 border-emerald-600 transition-colors" disabled={!hasStaff}>
                  Excel
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

        <div ref={exportContainerRef} className="bg-white overflow-hidden border border-slate-200 shadow-sm">
          <div className="px-8 pt-8 pb-6 border-b border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-indigo-600 text-white text-[9px] font-bold px-2.5 py-0.5 uppercase tracking-[0.12em]">Official Schedule</span>
                  <span className="text-slate-300 text-[9px] font-semibold uppercase tracking-[0.12em]">Tháng {monthYear.split('-')[1]}/{monthYear.split('-')[0]}</span>
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {exportTitle || `Lịch Công Tác: ${currentSupermarket || 'Cửa Hàng'}`}
                </h1>
              </div>
              {!isExportingImage && (
                <button onClick={() => setHistoryModalOpen(true)} className="p-2.5 border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors" title="Lịch sử thay đổi">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
              )}
            </div>
            <Legend targets={targets} onEditRule={(k) => { setEditingRuleKey(k); setEditRulesModalOpen(true); }} includeTnInSbh={includeTnInSbh} onIncludeTnInSbhChange={setIncludeTnInSbh} onboardingStep={onboardingStep} />
          </div>

          <div className={`px-5 pb-0 ${isExportingImage ? 'export-hidden' : ''}`}>
             <DailyStatsTable 
                staffList={staffList} config={{ year, month, startDay, duration }} requirements={dailyRequirements} setRequirements={setDailyRequirements}
                selectedDay={statsDay} setSelectedDay={setStatsDay} departmentFilter={departmentFilter} unresolvedConflicts={unresolvedConflicts} onShowUnresolvedConflicts={() => setConflictModalOpen(true)}
             />
          </div>

          <div className="px-5 py-6">
            {hasStaff && targets ? (
              <ScheduleTable 
                staffList={listForTable} config={{ year, month, startDay, duration }} targets={targets} tableRef={tableRef}
                includeTnInSbh={includeTnInSbh}
                onDeleteEmployee={(id) => setEmployeeToDelete(id)} onEditShift={(id, d) => setEditingCellInfo({
                    employeeId: id, dayIndex: d, employeeName: staffList.find(s => s.id === id)!.name, department: staffList.find(s => s.id === id)!.department,
                    gender: staffList.find(s => s.id === id)!.gender, date: `${new Date(year, month - 1, startDay + d - 1).getDate()}/${month}`,
                    currentShift: staffList.find(s => s.id === id)!.schedule[d] || { shift: 'Trống', role: 'Trống' },
                    isSpecialShift: (staffList.find(s => s.id === id)!.schedule[d]?.role || '').includes('('),
                    employeeStats: staffList.find(s => s.id === id)!.stats, changeHistory: staffList.find(s => s.id === id)!.changeHistory
                }) || setEditShiftModalOpen(true)}
                onDayHover={(d) => { if(d) setStatsDay(d); setHoveredDay(d); }} hoveredDay={hoveredDay} weekRange={weeklyExportConfig} highlightId={currentHighlightedId}
                onSwapShift={handleSwapShifts}
              />
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
          {isExportingImage && (
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
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[200] px-5 py-2.5 shadow-2xl flex items-center gap-2.5 animate-bounce-in ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 
          toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'
        }`}>
          {toast.type === 'success' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default App;
