import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import * as idb from '../db/idb';
import { useAuth } from '../../../contexts/AuthContext';
import { syncScheduleToCloud, fetchScheduleFromCloud } from '../services/firestoreSync';
import {
  StaffMember,
  SchedulingRules,
  DailyRequirements,
  ScheduleTargets,
  ScheduleHistoryEntry,
  StaffInitialData,
  UnresolvedConflict,
  ShiftDefinitions,
  BusySchedule,
  PhanCaUiState
} from '../types';
import { calculateSpecialHours } from '../utils/scheduleUtils';
import { DEFAULT_SHIFT_DEFINITIONS, getDefaultMonthYear, DEFAULT_RULES, ZERO_REQUIREMENTS } from '../constants';

// Toàn bộ state dữ liệu (được lưu IndexedDB + đồng bộ Firestore) và chuỗi effect
// load/persist/sync của PhanCaView — tách ra từ PhanCaView.tsx (đợt 3C, phần lõi
// trước đó cố ý chưa tách vì rủi ro cao). Chỉ di chuyển nguyên trạng, không đổi
// logic: cùng state, cùng effect body/deps, cùng thứ tự gọi idb/firestoreSync.
export function usePhanCaData() {
  const { user, db } = useAuth();
  const lastSyncedRef = useRef<{ [key: string]: string }>({});
  const staffListRef = useRef<StaffMember[]>([]);
  const isImportingRef = useRef<boolean>(false);

  const [monthYear, setMonthYear] = useState<string>(getDefaultMonthYear());
  const [startDay, setStartDay] = useState<number>(1);
  const [duration, setDuration] = useState<number>(30);
  const [supermarkets, setSupermarkets] = useState<string[]>([]);
  const [currentSupermarket, setCurrentSupermarket] = useState<string>('');
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
  const [includeTnInSbh, setIncludeTnInSbh] = useState<boolean>(false);
  const [autoAddWeekendShifts, setAutoAddWeekendShifts] = useState<boolean>(false);
  const [autoAddWeekendShift1, setAutoAddWeekendShift1] = useState<boolean>(false);
  const [shiftDefinitions, setShiftDefinitions] = useState<ShiftDefinitions>(DEFAULT_SHIFT_DEFINITIONS);
  const [unresolvedConflicts, setUnresolvedConflicts] = useState<UnresolvedConflict[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [isDataLoadedForSupermarket, setIsDataLoadedForSupermarket] = useState(false);

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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'error') {
      toast.error(message, { duration: 3000 });
    } else if (type === 'info') {
      toast(message, { duration: 3000 });
    } else {
      toast.success(message, { duration: 3000 });
    }
  };

  useEffect(() => {
    staffListRef.current = staffList;
  }, [staffList]);

  const syncAndLoadKey = useCallback(async <T,>(key: string, defaultValue: T): Promise<T> => {
      const localData = await idb.loadData<T>(key);
      const localTime = await idb.loadData<number>(`lastModified_${key}`) || 0;
      if (!user) {
          return localData !== undefined ? localData : defaultValue;
      }
      try {
          const cloudResult = await fetchScheduleFromCloud(db, user, key);
          if (cloudResult) {
              const cloudTime = cloudResult.updatedAt || 0;
              const cloudData = cloudResult.data as T;
              if (cloudTime > localTime || localData === undefined) {
                  console.warn(`[Cloud Sync PhanCa] Cloud is newer for ${key} (${cloudTime} > ${localTime}). Loading cloud...`);
                  await idb.saveData(key, cloudData, cloudTime);
                  return cloudData;
              } else if (localTime > cloudTime && localData !== undefined) {
                  console.warn(`[Cloud Sync PhanCa] Local is newer for ${key} (${localTime} > ${cloudTime}). Syncing to cloud...`);
                  await syncScheduleToCloud(db, user, key, localData);
                  lastSyncedRef.current[key] = JSON.stringify(localData);
              }
          } else if (localData !== undefined) {
              console.warn(`[Cloud Sync PhanCa] Cloud is empty for ${key}. Syncing local to cloud...`);
              await syncScheduleToCloud(db, user, key, localData);
              lastSyncedRef.current[key] = JSON.stringify(localData);
          }
      } catch (e) {
          console.error(`[Cloud Sync PhanCa] Error syncing key ${key}:`, e);
      }
      return localData !== undefined ? localData : defaultValue;
  }, [user, db]);

  useEffect(() => {
    const initApp = async () => {
      await idb.initDB();
      const savedSupermarkets = await syncAndLoadKey<string[]>('meta_supermarkets', []);
      const savedUiState = await syncAndLoadKey<PhanCaUiState | null>('uiState', null);
      lastSyncedRef.current['meta_supermarkets'] = JSON.stringify(savedSupermarkets);
      if (savedUiState) {
          lastSyncedRef.current['uiState'] = JSON.stringify(savedUiState);
      }
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
        setIncludeTnInSbh(savedUiState.includeTnInSbh !== undefined ? savedUiState.includeTnInSbh : false);
        setAutoAddWeekendShifts(savedUiState.autoAddWeekendShifts !== undefined ? savedUiState.autoAddWeekendShifts : false);
        setAutoAddWeekendShift1(savedUiState.autoAddWeekendShift1 !== undefined ? savedUiState.autoAddWeekendShift1 : false);
      }
      setIsDbLoaded(true);
    };
    initApp();
  }, [user, syncAndLoadKey]);

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
      const savedNams = await syncAndLoadKey<StaffInitialData[]>(getKey('nams'), []);
      const savedNus = await syncAndLoadKey<StaffInitialData[]>(getKey('nus'), []);
      const savedRules = await syncAndLoadKey<SchedulingRules>(getKey('rules'), DEFAULT_RULES);
      const savedPatterns = await syncAndLoadKey<{ [key: string]: string[] }>(getKey('departmentPatterns'), {});
      const savedReqs = await syncAndLoadKey<DailyRequirements>(getKey('dailyRequirements'), ZERO_REQUIREMENTS);
      const savedShiftDefs = await syncAndLoadKey<ShiftDefinitions>(getKey('shiftDefinitions'), DEFAULT_SHIFT_DEFINITIONS);
      const scheduleKey = getKey(`schedule-${monthYear}`);
      const historyKey = getKey(`history-${monthYear}`);
      const unresolvedKey = getKey(`unresolved-${monthYear}`);
      const busyScheduleKey = getKey(`busySchedule-${monthYear}`);
      const savedSchedule = await syncAndLoadKey<StaffMember[]>(scheduleKey, []);
      const savedHistory = await syncAndLoadKey<ScheduleHistoryEntry[]>(historyKey, []);
      const savedUnresolved = await syncAndLoadKey<UnresolvedConflict[]>(unresolvedKey, []);
      const savedBusySchedule = await syncAndLoadKey<BusySchedule>(busyScheduleKey, {});
      // Populate lastSyncedRef to prevent immediate write-back of fetched data
      lastSyncedRef.current[getKey('nams')] = JSON.stringify(savedNams);
      lastSyncedRef.current[getKey('nus')] = JSON.stringify(savedNus);
      lastSyncedRef.current[getKey('rules')] = JSON.stringify(savedRules);
      lastSyncedRef.current[getKey('departmentPatterns')] = JSON.stringify(savedPatterns);
      lastSyncedRef.current[getKey('dailyRequirements')] = JSON.stringify(savedReqs);
      lastSyncedRef.current[getKey('shiftDefinitions')] = JSON.stringify(savedShiftDefs);
      lastSyncedRef.current[scheduleKey] = JSON.stringify(savedSchedule);
      lastSyncedRef.current[historyKey] = JSON.stringify(savedHistory);
      lastSyncedRef.current[unresolvedKey] = JSON.stringify(savedUnresolved);
      lastSyncedRef.current[busyScheduleKey] = JSON.stringify(savedBusySchedule);
      setNams(savedNams);
      setNus(savedNus);
      const allDepts = [...new Set([...savedNams, ...savedNus].map(s => s.department))].sort();
      if (allDepts.length > 0) setDepartmentFilter(allDepts[0]);
      else setDepartmentFilter('');
      setDailyRequirements(savedReqs);
      setShiftDefinitions(savedShiftDefs);
      setRules(savedRules);
      setDepartmentPatterns(savedPatterns);
      setScheduleHistory(savedHistory);
      setUnresolvedConflicts(savedUnresolved);
      setStaffList(savedSchedule);
      setBusySchedule(savedBusySchedule);
      setIsDataLoadedForSupermarket(true);
    };
    loadSupermarketData();
  }, [isDbLoaded, currentSupermarket, getKey, monthYear, supermarkets.length, user, syncAndLoadKey]);

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
    const uiState = { monthYear, startDay, duration, includeTnInSbh, autoAddWeekendShifts, autoAddWeekendShift1, lastSupermarket: currentSupermarket };
    idb.saveData('uiState', uiState);
  }, [nams, nus, rules, departmentPatterns, dailyRequirements, staffList, busySchedule, scheduleHistory, monthYear, isDbLoaded, isDataLoadedForSupermarket, startDay, duration, includeTnInSbh, autoAddWeekendShifts, autoAddWeekendShift1, currentSupermarket, getKey, unresolvedConflicts]);

  // Hiệu ứng tự động đồng bộ đám mây (debounced 3s)
  useEffect(() => {
    if (!user || !isDbLoaded || !isDataLoadedForSupermarket || !currentSupermarket || isImportingRef.current) return;
    const timer = setTimeout(async () => {
      const syncIfChanged = async (key: string, data: unknown) => {
        const serialized = JSON.stringify(data);
        if (lastSyncedRef.current[key] === serialized) return;
        try {
          await syncScheduleToCloud(db, user, key, data);
          lastSyncedRef.current[key] = serialized;
        } catch (err) {
          console.error(`Lỗi khi đồng bộ ${key}:`, err);
        }
      };
      await syncIfChanged('meta_supermarkets', supermarkets);
      await syncIfChanged('uiState', { monthYear, startDay, duration, includeTnInSbh, autoAddWeekendShifts, autoAddWeekendShift1, lastSupermarket: currentSupermarket });
      await syncIfChanged(getKey('nams'), nams);
      await syncIfChanged(getKey('nus'), nus);
      await syncIfChanged(getKey('rules'), rules);
      await syncIfChanged(getKey('departmentPatterns'), departmentPatterns);
      await syncIfChanged(getKey('dailyRequirements'), dailyRequirements);
      await syncIfChanged(getKey('shiftDefinitions'), shiftDefinitions);
      await syncIfChanged(getKey(`schedule-${monthYear}`), staffList);
      await syncIfChanged(getKey(`history-${monthYear}`), scheduleHistory);
      await syncIfChanged(getKey(`busySchedule-${monthYear}`), busySchedule);
      await syncIfChanged(getKey(`unresolved-${monthYear}`), unresolvedConflicts);
    }, 3000);
    return () => clearTimeout(timer);
  }, [nams, nus, rules, departmentPatterns, dailyRequirements, staffList, busySchedule, scheduleHistory, monthYear, isDbLoaded, isDataLoadedForSupermarket, startDay, duration, includeTnInSbh, autoAddWeekendShifts, autoAddWeekendShift1, currentSupermarket, getKey, unresolvedConflicts, user, db, supermarkets]);

  useEffect(() => {
    if (monthYear) {
        const [y, m] = monthYear.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        setDuration(daysInMonth);
    }
  }, [monthYear]);

  const confirmDeleteStaffList = async () => {
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

  const logHistory = useCallback((description: string) => {
    const newEntry: ScheduleHistoryEntry = {
        timestamp: Date.now(),
        description,
        scheduleSnapshot: structuredClone(staffListRef.current)
    };
    setScheduleHistory(prev => [newEntry, ...prev]);
  }, []);

  return {
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
    busySchedule, setBusySchedule,
    departmentFilter, setDepartmentFilter,
    includeTnInSbh, setIncludeTnInSbh,
    autoAddWeekendShifts, setAutoAddWeekendShifts,
    autoAddWeekendShift1, setAutoAddWeekendShift1,
    shiftDefinitions, setShiftDefinitions,
    unresolvedConflicts, setUnresolvedConflicts,
    isDbLoaded,
    isDataLoadedForSupermarket, setIsDataLoadedForSupermarket,
    year, month,
    uniqueDepartments,
    staffCountByDept,
    getKey,
    showToast,
    handleSupermarketChange,
    confirmDeleteStaffList,
    logHistory,
  };
}
