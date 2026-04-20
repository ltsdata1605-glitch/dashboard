import { useState, useEffect, useMemo } from 'react';
import { useIndexedDBState } from './useIndexedDBState';
import * as db from '../utils/db';
import { RevenueRow, BonusMetrics, ManualDeptMapping } from '../types/nhanVienTypes';
import { parseRevenueData, parseInstallmentData, parseCrossSellingData, formatEmployeeName } from '../utils/nhanVienHelpers';

export function useNhanVienData() {
    const [supermarkets] = useIndexedDBState<string[]>('supermarket-list', []);
    const [activeSupermarkets, setActiveSupermarkets] = useIndexedDBState<string[]>('nhanvien-active-supermarkets', []);

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
        if (activeSupermarkets.length === 0 && supermarkets.length > 0) {
            setActiveSupermarkets([supermarkets[0]]);
        }
    }, [supermarkets, activeSupermarkets, setActiveSupermarkets]);

    useEffect(() => {
        let isMounted = true;
        const fetchAllData = async () => {
            if (activeSupermarkets.length === 0) return;
            
            const results = await Promise.all(activeSupermarkets.map(sm => 
                Promise.all([
                    db.get(`config-${sm}-danhsach`),
                    db.get(`config-${sm}-thidua`),
                    db.get(`config-${sm}-tragop`),
                    db.get(`config-${sm}-bankem`),
                    db.get(`manual-dept-mapping-${sm}`),
                    db.get(`bonus-data-${sm}`),
                    db.get(`targethero-${sm}-departmentweights`)
                ])
            ));

            if (!isMounted) return;

            let combinedDS = '', combinedTD = '', combinedTG = '', combinedBK = '';
            let combinedMM: ManualDeptMapping = {};
            let combinedBonus: Record<string, BonusMetrics | null> = {};
            const allWeights: Record<string, number[]> = {};

            results.forEach(([ds, td, tg, bk, mm, bonus, weights]) => {
                if (ds) combinedDS += (combinedDS ? '\n' : '') + ds;
                if (td) combinedTD += (combinedTD ? '\n' : '') + td;
                if (tg) combinedTG += (combinedTG ? '\n' : '') + tg;
                if (bk) combinedBK += (combinedBK ? '\n' : '') + bk;
                if (mm) Object.assign(combinedMM, mm);
                if (bonus) Object.assign(combinedBonus, bonus);
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
    }, [activeSupermarkets, dataVersion]);

    useEffect(() => {
        const handleDbChange = (event: CustomEvent) => {
            const key = event.detail.key;
            if (key.startsWith('config-') || key.startsWith('manual-dept-mapping') || key.startsWith('bonus-data-') || key.includes('departmentweights')) {
                setDataVersion(v => v + 1);
            }
        };
        window.addEventListener('indexeddb-change', handleDbChange as EventListener);
        return () => window.removeEventListener('indexeddb-change', handleDbChange as EventListener);
    }, []);

    const employeeDepartmentMap = useMemo(() => {
        const map = new Map<string, string>();
        const baseRows = parseRevenueData(aggregatedData.danhSach);
        baseRows.filter(r => r.type === 'employee' && r.originalName && r.department).forEach(r => {
            map.set(r.originalName!, r.department!);
        });

        Object.entries(aggregatedData.manualMapping).forEach(([deptName, employees]) => {
            if (Array.isArray(employees)) {
                employees.forEach(empName => map.set(empName, deptName));
            }
        });
        return map;
    }, [aggregatedData.danhSach, aggregatedData.manualMapping]);

    const installmentRows = useMemo(() => parseInstallmentData(aggregatedData.traGop, employeeDepartmentMap), [aggregatedData.traGop, employeeDepartmentMap]);
    const banKemRows = useMemo(() => parseCrossSellingData(aggregatedData.banKem, employeeDepartmentMap), [aggregatedData.banKem, employeeDepartmentMap]);
    const banKemMap = useMemo(() => {
        const map = new Map<string, number>();
        banKemRows.forEach(row => { if (row.originalName) map.set(row.originalName, row.pctBillBk); });
        return map;
    }, [banKemRows]);

    const revenueRows = useMemo(() => {
        const rows = parseRevenueData(aggregatedData.danhSach);
        const mappedRows = rows.map(row => {
            if (row.type === 'employee' && row.originalName) {
                const pctBillBk = banKemMap.get(row.originalName) || 0;
                return { 
                    ...row, 
                    department: employeeDepartmentMap.get(row.originalName) || 'BP Khác',
                    pctBillBk: pctBillBk
                };
            }
            return row;
        });

        const finalRows: RevenueRow[] = [];
        const currentDeptsInMap = Array.from(new Set(employeeDepartmentMap.values())).sort();
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
    }, [aggregatedData.danhSach, employeeDepartmentMap, banKemMap, banKemRows]);

    const departmentOptions = useMemo(() => {
        const uniqueDepartments = Array.from(new Set(employeeDepartmentMap.values()));
        const excludedKeywords = ['quản lý', 'trưởng ca', 'kế toán', 'tiếp đón khách hàng'];
        return uniqueDepartments
            .filter(d => !excludedKeywords.some(keyword => d.toLowerCase().includes(keyword)))
            .sort();
    }, [employeeDepartmentMap]);
    
    const [activeDepartments, setActiveDepartments] = useIndexedDBState<string[]>('nhanvien-active-depts-multi', ['all']);
    const effectiveActiveDepartments = useMemo(() => activeDepartments.includes('all') ? departmentOptions : activeDepartments, [activeDepartments, departmentOptions]);

    const toggleSupermarket = (sm: string) => {
        setActiveSupermarkets(prev => {
            if (sm === 'all') return prev.length === supermarkets.length ? [supermarkets[0]] : [...supermarkets];
            const next = prev.includes(sm) ? prev.filter(s => s !== sm) : [...prev, sm];
            return next.length === 0 ? [supermarkets[0]] : next;
        });
    };

    const toggleDepartment = (dept: string) => {
        setActiveDepartments(prev => {
            if (dept === 'all') return ['all'];
            let next = Array.isArray(prev) ? prev.filter(d => d !== 'all') : [];
            if (next.includes(dept)) {
                next = next.filter(d => d !== dept);
                return next.length === 0 ? ['all'] : next;
            } else return [...next, dept];
        });
    };

    const employeeInstallmentMap = useMemo(() => {
        const map = new Map<string, number>();
        installmentRows.forEach(row => { if (row.originalName) map.set(row.originalName, row.totalPercent); });
        return map;
    }, [installmentRows]);

    const allEmployees = useMemo(() => {
        return Array.from(employeeDepartmentMap.entries()).map(([originalName, department]) => ({
            name: formatEmployeeName(originalName),
            originalName,
            department
        })).sort((a,b) => a.name.localeCompare(b.name));
    }, [employeeDepartmentMap]);

    const deptEmployeeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        allEmployees.forEach(emp => { counts[emp.department] = (counts[emp.department] || 0) + 1; });
        return counts;
    }, [allEmployees]);

    const handleSaveBonus = async (originalName: string, metrics: BonusMetrics) => {
        let currentSm = activeSupermarkets[0];
        setAggregatedData(prev => ({
            ...prev,
            bonusData: { ...prev.bonusData, [originalName]: metrics }
        }));
        await db.set(`bonus-data-${currentSm}`, { ...aggregatedData.bonusData, [originalName]: metrics });
        window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: `bonus-data-${currentSm}` } }));
    };

    return {
        supermarkets,
        activeSupermarkets,
        activeDepartments,
        effectiveActiveDepartments,
        departmentOptions,
        aggregatedData,
        aggregatedWeights,
        employeeDepartmentMap,
        installmentRows,
        banKemRows,
        banKemMap,
        revenueRows,
        employeeInstallmentMap,
        allEmployees,
        deptEmployeeCounts,
        toggleSupermarket,
        toggleDepartment,
        handleSaveBonus,
        setAggregatedData
    };
}
