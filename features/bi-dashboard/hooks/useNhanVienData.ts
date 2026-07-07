import { useState, useEffect, useMemo, useCallback } from 'react';
import { shortenSupermarketName, extractSupermarketList } from '../utils/dashboardHelpers';
import { useIndexedDBState } from './useIndexedDBState';
import * as db from '../utils/db';
import { RevenueRow, BonusMetrics, ManualDeptMapping } from '../types/nhanVienTypes';
import { formatEmployeeName } from '../utils/nhanVienHelpers';
import { useWorker } from './useWorker';

export function useNhanVienData(isActive?: boolean) {
    const [summaryLuyKe] = useIndexedDBState<string>('summary-luy-ke', '');
    const [activeSupermarketsRaw, setActiveSupermarkets, isActiveSupermarketsLoaded] = useIndexedDBState<string[]>('nhanvien-active-supermarkets', []);
    const [hiddenEmployees, setHiddenEmployees] = useState<string[]>([]);
    
    const supermarkets = useMemo(() => extractSupermarketList(summaryLuyKe), [summaryLuyKe]);
    const activeSupermarkets = useMemo(() => Array.isArray(activeSupermarketsRaw) 
        ? activeSupermarketsRaw.filter(sm => supermarkets.includes(sm)) 
        : [], [activeSupermarketsRaw, supermarkets]);

    const [aggregatedData, setAggregatedData] = useState({
        danhSach: '',
        thiDua: '',
        traGop: '',
        banKem: '',
        manualMapping: {} as ManualDeptMapping,
        bonusData: {} as Record<string, BonusMetrics | null>
    });

    const [dataVersion, setDataVersion] = useState(0);
    const [aggregatedWeights, setAggregatedWeights] = useState<Record<string, number>>({});

    useEffect(() => {
        if (isActiveSupermarketsLoaded && activeSupermarkets.length === 0 && supermarkets.length > 0) {
            setActiveSupermarkets([supermarkets[0]]);
        }
    }, [supermarkets, isActiveSupermarketsLoaded, activeSupermarkets, setActiveSupermarkets]);

    useEffect(() => {
        if (!isActiveSupermarketsLoaded || isActive === false) return;
        let isMounted = true;
        const fetchAllData = async () => {
            if (activeSupermarkets.length === 0) {
                setAggregatedData({
                    danhSach: '',
                    thiDua: '',
                    traGop: '',
                    banKem: '',
                    manualMapping: {},
                    bonusData: {}
                });
                return;
            }
            
            const uniqueSafeNames = Array.from(new Set(activeSupermarkets.map(sm => shortenSupermarketName(sm))));
            
            const results = await Promise.all(uniqueSafeNames.map(safeName => {
                return Promise.all([
                    db.get(`config-${safeName}-danhsach`),
                    db.get(`config-${safeName}-thidua`),
                    db.get(`config-${safeName}-tragop`),
                    db.get(`config-${safeName}-bankem`),
                    db.get(`manual-dept-mapping-${safeName}`),
                    db.get(`bonus-data-${safeName}`),
                    db.get(`targethero-${safeName}-departmentweights`),
                    db.get(`hidden-employees-${safeName}`)
                ]);
            }));

            if (!isMounted) return;

            let combinedDS = '', combinedTD = '', combinedTG = '', combinedBK = '';
            let combinedMM: ManualDeptMapping = {};
            let combinedBonus: Record<string, BonusMetrics | null> = {};
            const allWeights: Record<string, number[]> = {};

            const combinedHidden: string[] = [];
            results.forEach(([ds, td, tg, bk, mm, bonus, weights, hidden]) => {
                if (ds) combinedDS += (combinedDS ? '\n' : '') + ds;
                if (td) combinedTD += (combinedTD ? '\n' : '') + td;
                if (tg) combinedTG += (combinedTG ? '\n' : '') + tg;
                if (bk) combinedBK += (combinedBK ? '\n' : '') + bk;
                if (mm) Object.assign(combinedMM, mm);
                if (bonus) Object.assign(combinedBonus, bonus);
                if (Array.isArray(hidden)) combinedHidden.push(...hidden);
                if (weights) {
                    Object.entries(weights as Record<string, number>).forEach(([dept, w]) => {
                        if (!allWeights[dept]) allWeights[dept] = [];
                        allWeights[dept].push(w);
                    });
                }
            });

            const finalWeights: Record<string, number> = {};
            Object.entries(allWeights).forEach(([dept, wList]) => {
                finalWeights[dept] = wList.reduce((a, b) => a + b, 0) / wList.length;
            });

            setAggregatedWeights(finalWeights);
            setHiddenEmployees(combinedHidden);
            setAggregatedData({
                danhSach: combinedDS,
                thiDua: combinedTD,
                traGop: combinedTG,
                banKem: combinedBK,
                manualMapping: combinedMM,
                bonusData: combinedBonus
            });
        };
        fetchAllData();
        return () => { isMounted = false; };
    }, [activeSupermarkets, dataVersion, isActiveSupermarketsLoaded, isActive]);

    useEffect(() => {
        const handleDbChange = (event: CustomEvent) => {
            const key = event.detail.key;
            if (key.startsWith('config-') || key.startsWith('manual-dept-mapping') || key.startsWith('bonus-data-') || key.startsWith('targethero-') || key.startsWith('comptarget-') || key.startsWith('hidden-employees-') || key === 'summary-luy-ke') {
                setDataVersion(v => v + 1);
            }
        };
        window.addEventListener('indexeddb-change', handleDbChange as EventListener);
        return () => window.removeEventListener('indexeddb-change', handleDbChange as EventListener);
    }, []);

    const hiddenEmployeesSet = useMemo(() => new Set(hiddenEmployees), [hiddenEmployees]);
    const { runWorkerTask } = useWorker();

    const [parsedRevenueBase, setParsedRevenueBase] = useState<RevenueRow[]>([]);
    useEffect(() => {
        if (!aggregatedData.danhSach || isActive === false) return;
        let isMounted = true;
        runWorkerTask('PARSE_REVENUE', aggregatedData.danhSach).then((base: RevenueRow[]) => {
            if (isMounted) {
                setParsedRevenueBase(base.filter(r => r.type !== 'employee' || !r.originalName || !hiddenEmployeesSet.has(r.originalName)));
            }
        });
        return () => { isMounted = false; };
    }, [aggregatedData.danhSach, hiddenEmployeesSet, isActive]);

    const employeeDepartmentMap = useMemo(() => {
        if (isActive === false) return {} as Record<string, string>;
        const map: Record<string, string> = {};
        parsedRevenueBase.filter(r => r.type === 'employee' && r.originalName && r.department).forEach(r => {
            map[r.originalName!] = r.department!;
        });

        Object.entries(aggregatedData.manualMapping).forEach(([deptName, employees]) => {
            if (Array.isArray(employees)) {
                employees.forEach(empName => {
                    if (!hiddenEmployeesSet.has(empName)) {
                        map[empName] = deptName;
                    }
                });
            }
        });
        return map;
    }, [parsedRevenueBase, aggregatedData.manualMapping, hiddenEmployeesSet, isActive]);

    const [installmentRows, setInstallmentRows] = useState<any[]>([]);
    useEffect(() => {
        if (!aggregatedData.traGop || isActive === false) return;
        let isMounted = true;
        runWorkerTask('PARSE_INSTALLMENT', { text: aggregatedData.traGop, employeeDepartmentMap }).then(rows => {
            if (isMounted && rows) {
                setInstallmentRows(rows.filter((r: any) => r.type !== 'employee' || !r.originalName || !hiddenEmployeesSet.has(r.originalName)));
            }
        });
        return () => { isMounted = false; };
    }, [aggregatedData.traGop, employeeDepartmentMap, hiddenEmployeesSet, isActive]);

    const [banKemRows, setBanKemRows] = useState<any[]>([]);
    useEffect(() => {
        if (!aggregatedData.banKem || isActive === false) return;
        let isMounted = true;
        runWorkerTask('PARSE_CROSS_SELLING', { text: aggregatedData.banKem, employeeDepartmentMap }).then(rows => {
            if (isMounted && rows) {
                setBanKemRows(rows.filter((r: any) => r.type !== 'employee' || !r.originalName || !hiddenEmployeesSet.has(r.originalName)));
            }
        });
        return () => { isMounted = false; };
    }, [aggregatedData.banKem, employeeDepartmentMap, hiddenEmployeesSet, isActive]);

    const banKemMap = useMemo(() => {
        if (isActive === false) return new Map<string, number>();
        const map = new Map<string, number>();
        banKemRows.forEach(row => { if (row.originalName) map.set(row.originalName, row.pctBillBk); });
        return map;
    }, [banKemRows, isActive]);

    const revenueRows = useMemo(() => {
        if (isActive === false) return [];
        const rows = parsedRevenueBase;
        const mappedRows = rows.map(row => {
            if (row.type === 'employee' && row.originalName) {
                const pctBillBk = banKemMap.get(row.originalName) || 0;
                return { 
                    ...row, 
                    department: employeeDepartmentMap[row.originalName] || 'BP Khác',
                    pctBillBk: pctBillBk
                };
            }
            return row;
        });

        const finalRows: RevenueRow[] = [];
        const currentDeptsInMap = Array.from(new Set(Object.values(employeeDepartmentMap))).sort();
        currentDeptsInMap.forEach((deptName: string) => {
            const deptEmps = mappedRows.filter(r => r.type === 'employee' && r.department === deptName);
            if (deptEmps.length > 0) {
                const deptBkRow = banKemRows.find(r => r.type === 'department' && r.originalName === deptName);
                const origDeptRow = mappedRows.find(r => r.type === 'department' && r.name === deptName);
                finalRows.push({ 
                    type: 'department', name: deptName, 
                    dtlk: deptEmps.reduce((s, e) => s + (e.dtlk || 0), 0), 
                    dtqd: deptEmps.reduce((s, e) => s + (e.dtqd || 0), 0), 
                    hieuQuaQD: origDeptRow ? origDeptRow.hieuQuaQD : 0,
                    pctBillBk: deptBkRow ? deptBkRow.pctBillBk : 0
                });
                finalRows.push(...deptEmps);
            }
        });
        return finalRows;
    }, [parsedRevenueBase, employeeDepartmentMap, banKemMap, banKemRows, isActive]);

    const departmentOptions = useMemo(() => {
        if (isActive === false) return [];
        const uniqueDepartments = Array.from(new Set(Object.values(employeeDepartmentMap as Record<string, string>)));
        const excludedKeywords = ['quản lý', 'trưởng ca', 'kế toán', 'tiếp đón khách hàng'];
        return uniqueDepartments
            .filter(d => typeof d === "string" && !excludedKeywords.some(keyword => d.toLowerCase().includes(keyword)))
            .sort();
    }, [employeeDepartmentMap, isActive]);
    
    const [activeDepartmentsRaw, setActiveDepartments] = useIndexedDBState<string[]>('nhanvien-active-depts-multi', ['all']);
    const activeDepartments = useMemo(() => {
        if (isActive === false) return ['all'];
        return Array.isArray(activeDepartmentsRaw) 
            ? activeDepartmentsRaw.filter(d => d === 'all' || departmentOptions.includes(d)) 
            : ['all'];
    }, [activeDepartmentsRaw, departmentOptions, isActive]);
    const effectiveActiveDepartments = useMemo(() => {
        if (isActive === false) return [];
        return activeDepartments.length === 0 || activeDepartments.includes('all') ? departmentOptions : activeDepartments;
    }, [activeDepartments, departmentOptions, isActive]);

    const toggleSupermarket = useCallback((sm: string) => {
        setActiveSupermarkets(prev => {
            if (sm === 'all') return prev.length === supermarkets.length ? [supermarkets[0]] : [...supermarkets];
            const next = prev.includes(sm) ? prev.filter(s => s !== sm) : [...prev, sm];
            return next.length === 0 ? [supermarkets[0]] : next;
        });
    }, [supermarkets, setActiveSupermarkets]);

    const toggleDepartment = useCallback((dept: string) => {
        setActiveDepartments(prev => {
            if (dept === 'all') return ['all'];
            let next = Array.isArray(prev) ? prev.filter(d => d !== 'all') : [];
            if (next.includes(dept)) {
                next = next.filter(d => d !== dept);
                return next.length === 0 ? ['all'] : next;
            } else return [...next, dept];
        });
    }, [setActiveDepartments]);

    const employeeInstallmentMap = useMemo(() => {
        if (isActive === false) return new Map();
        const map = new Map<string, number>();
        installmentRows.forEach(row => { if (row.originalName) map.set(row.originalName, row.totalPercent); });
        return map;
    }, [installmentRows, isActive]);

    const allEmployees = useMemo(() => {
        if (isActive === false) return [];
        return Array.from(Object.entries(employeeDepartmentMap as Record<string, string>)).map(([originalName, department]) => ({
            name: formatEmployeeName(originalName),
            originalName,
            department
        })).sort((a,b) => a.name.localeCompare(b.name));
    }, [employeeDepartmentMap, isActive]);

    const deptEmployeeCounts = useMemo(() => {
        if (isActive === false) return {};
        const counts: Record<string, number> = {};
        allEmployees.forEach(emp => { counts[emp.department] = (counts[emp.department] || 0) + 1; });
        return counts;
    }, [allEmployees, isActive]);

    const handleSaveBonus = useCallback(async (originalName: string, metrics: BonusMetrics) => {
        let safeName = shortenSupermarketName(activeSupermarkets[0]);
        setAggregatedData(prev => ({
            ...prev,
            bonusData: { ...prev.bonusData, [originalName]: metrics }
        }));
        const currentDbData = await db.get(`bonus-data-${safeName}`) || {};
        await db.set(`bonus-data-${safeName}`, { ...currentDbData, [originalName]: metrics });
    }, [activeSupermarkets]);

    // Ghi hàng loạt cho chế độ Tự động — 1 lần đọc/ghi db thay vì gọi handleSaveBonus lặp
    // N lần (read-modify-write không khóa, gọi lặp nhanh có nguy cơ ghi đè lẫn nhau).
    const handleSaveBonusBatch = useCallback(async (entries: { originalName: string; metrics: BonusMetrics }[]) => {
        if (entries.length === 0) return;
        const safeName = shortenSupermarketName(activeSupermarkets[0]);

        setAggregatedData(prev => {
            const nextBonusData = { ...prev.bonusData };
            entries.forEach(({ originalName, metrics }) => { nextBonusData[originalName] = metrics; });
            return { ...prev, bonusData: nextBonusData };
        });

        const currentDbData = await db.get(`bonus-data-${safeName}`) || {};
        const mergedDbData = { ...currentDbData };
        entries.forEach(({ originalName, metrics }) => { mergedDbData[originalName] = metrics; });
        await db.set(`bonus-data-${safeName}`, mergedDbData);

        // Ghi lịch sử từng nhân viên, đúng key scheme BonusDataModal đang dùng (bonus-history-*),
        // để chế độ Tự động không tạo khoảng trống dữ liệu so với dán tay.
        const historySupermarket = activeSupermarkets[0];
        await Promise.all(entries.map(async ({ originalName, metrics }) => {
            const historyKey = `bonus-history-${historySupermarket}-${originalName}` as const;
            const currentHistory = await db.get(historyKey) || [];
            await db.set(historyKey, [...currentHistory, metrics].slice(-30));
        }));
    }, [activeSupermarkets]);

    const effectiveAggregatedWeights = useMemo(() => {
        if (isActive === false) return {};
        if (Object.keys(aggregatedWeights).length > 0) return aggregatedWeights;
        
        const weights: Record<string, number> = {};
        const hasAllInOne = departmentOptions.some(d => typeof d === "string" && d.toUpperCase().includes("ALL IN ONE"));
        
        if (hasAllInOne) {
            departmentOptions.forEach(d => {
                if (typeof d === "string") weights[d] = d.toUpperCase().includes("ALL IN ONE") ? 100 : 0;
            });
        } else {
            const share = 100 / (departmentOptions.length || 1);
            departmentOptions.forEach(d => { if (typeof d === "string") weights[d] = share; });
        }
        return weights;
    }, [aggregatedWeights, departmentOptions, isActive]);

    return {
        supermarkets,
        activeSupermarkets,
        activeDepartments,
        effectiveActiveDepartments,
        departmentOptions,
        aggregatedData,
        aggregatedWeights: effectiveAggregatedWeights,
        employeeDepartmentMap,
        installmentRows,
        banKemRows,
        banKemMap,
        revenueRows,
        employeeInstallmentMap,
        allEmployees,
        hiddenEmployees,
        deptEmployeeCounts,
        toggleSupermarket,
        toggleDepartment,
        handleSaveBonus,
        handleSaveBonusBatch,
        setAggregatedData,
        dataVersion
    };
}
