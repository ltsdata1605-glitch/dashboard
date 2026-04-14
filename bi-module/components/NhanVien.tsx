
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChartIcon, ArchiveBoxIcon, BuildingStorefrontIcon, ChevronDownIcon, FilterIcon, CreditCardIcon, SparklesIcon } from './Icons';
import { useIndexedDBState } from '../hooks/useIndexedDBState';

import * as db from '../utils/db';
import { RevenueRow, Employee, BonusMetrics, Tab, Criterion, ManualDeptMapping, Version } from '../types/nhanVienTypes';
import { parseRevenueData, parseCompetitionData, formatEmployeeName, parseInstallmentData, parseNumber, parseCrossSellingData } from '../utils/nhanVienHelpers';
import RevenueView from './nhanvien/RevenueTab';
import InstallmentTab from './nhanvien/InstallmentTab';
import { BonusView, BonusDataModal } from './nhanvien/BonusTab';
import AiAssistant from './nhanvien/AiAssistant';
import { CompetitionTab } from './nhanvien/CompetitionTab';
import CrossSellingTab from './nhanvien/CrossSellingTab';
import { shortenSupermarketName } from '../utils/dashboardHelpers';
import { Switch } from './dashboard/DashboardWidgets';

const NavTabButton: React.FC<{ tab: Tab; children: React.ReactNode; activeTab: Tab; setActiveTab: (t: Tab) => void; icon?: React.ReactNode; }> = ({ tab, children, activeTab, setActiveTab }) => (
    <button 
        onClick={() => setActiveTab(tab)} 
        className={`
            flex-1 sm:flex-none px-5 py-1.5 text-[12px] uppercase tracking-wider transition-all duration-200 whitespace-nowrap rounded-md
            ${activeTab === tab 
                ? 'font-black text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.1)]' 
                : 'font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }
        `} 
    >
        {children}
    </button>
);

export const NhanVien: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('revenue');
    const [supermarkets] = useIndexedDBState<string[]>('supermarket-list', []);
    const [activeSupermarkets, setActiveSupermarkets] = useIndexedDBState<string[]>('nhanvien-active-supermarkets', []);
    const [isSmFilterOpen, setIsSmFilterOpen] = useState(false);
    const smRef = useRef<HTMLDivElement>(null);

    const [editingBonusEmployee, setEditingBonusEmployee] = useState<Employee | null>(null);
    const [isBatchBonusMode, setIsBatchBonusMode] = useState(false);

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

    // Tối ưu hóa: Chỉ fetch lại dữ liệu khi thật sự cần thiết (dataVersion)
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
            // Chỉ update version khi các key liên quan thay đổi
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
                finalRows.push({ 
                    type: 'department', name: deptName, 
                    dtlk: 0, dtqd: 0, hieuQuaQD: 0,
                    pctBillBk: deptBkRow ? deptBkRow.pctBillBk : 0
                });
                finalRows.push(...deptEmps);
            }
        });
        return finalRows;
    }, [aggregatedData.danhSach, employeeDepartmentMap, banKemMap, banKemRows]);

    const departmentOptions = useMemo(() => Array.from(new Set(employeeDepartmentMap.values())).sort(), [employeeDepartmentMap]);
    const [activeDepartments, setActiveDepartments] = useIndexedDBState<string[]>('nhanvien-active-depts-multi', ['all']);
    const [isDeptFilterOpen, setIsDeptFilterOpen] = useState(false);
    const deptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (deptRef.current && !deptRef.current.contains(event.target as Node)) setIsDeptFilterOpen(false);
            if (smRef.current && !smRef.current.contains(event.target as Node)) setIsSmFilterOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const handleBonusModalClose = (reason: 'save' | 'skip' | 'stop') => {
        if (!isBatchBonusMode || reason === 'stop') {
            setEditingBonusEmployee(null);
            setIsBatchBonusMode(false);
            return;
        }
        const currentIdx = allEmployees.findIndex(e => e.originalName === editingBonusEmployee?.originalName);
        if (currentIdx < allEmployees.length - 1) {
            setEditingBonusEmployee(allEmployees[currentIdx + 1]);
        } else {
            setEditingBonusEmployee(null);
            setIsBatchBonusMode(false);
        }
    };

    const startBatchBonusUpdate = () => {
        if (allEmployees.length > 0) {
            setIsBatchBonusMode(true);
            setEditingBonusEmployee(allEmployees[0]);
        }
    };

    const competitionData = useMemo(() => parseCompetitionData(aggregatedData.thiDua, employeeDepartmentMap), [aggregatedData.thiDua, employeeDepartmentMap]);
    // Fix: Updated type to include 'tong'
    const [activeCompetitionTab, setActiveCompetitionTab] = useState<Criterion | 'nhom' | 'canhan' | 'tong'>('canhan');
    const [highlightedEmpArray, setHighlightedEmpArray] = useIndexedDBState<string[]>('highlight-employees-multi', []);
    const highlightedEmployees = useMemo(() => new Set(highlightedEmpArray), [highlightedEmpArray]);
    const setHighlightedEmployees = (updater: React.SetStateAction<Set<string>>) => { 
        const newSet = typeof updater === 'function' ? updater(highlightedEmployees) : updater; 
        setHighlightedEmpArray(Array.from(newSet)); 
    };

    const [selectedCompArray, setSelectedCompArray] = useIndexedDBState<string[]>('global-selected-competitions', []);
    const selectedCompetitions = useMemo(() => new Set(selectedCompArray), [selectedCompArray]);
    const setSelectedCompetitions = (updater: React.SetStateAction<Set<string>>) => {
        const newSet = typeof updater === 'function' ? updater(selectedCompetitions) : updater;
        setSelectedCompArray(Array.from(newSet));
    };

    const [employeeCompetitionTargets, setEmployeeCompetitionTargets] = useState<Map<string, Map<string, number>>>(new Map());

    useEffect(() => {
        const fetchTargets = async () => {
            if (activeSupermarkets.length === 0) return;
            const targets = new Map<string, Map<string, number>>();
            const competitionLuyKeData = await db.get('competition-luy-ke');
            if (!competitionLuyKeData) return;
            
            const lines = String(competitionLuyKeData).split('\n');
            for (const sm of activeSupermarkets) {
                const competitionTargetsData = await db.get(`comptarget-${sm}-targets`);
                const departmentWeightsData = await db.get(`targethero-${sm}-departmentweights`);
                let currentComp: string | null = null;
                for (const line of lines) {
                    const parts = line.split('\t').map(p => p.trim());
                    if (parts.length > 2 && ['DTLK', 'DTQĐ', 'SLLK'].includes(parts[1]) && parts[2] === 'Target') { currentComp = parts[0]; continue; }
                    if (currentComp && parts[0] === sm) {
                        const baseTarget = parseFloat(parts[2].replace(/,/g, '')) || 0;
                        const slider = competitionTargetsData?.[currentComp] ?? 100;
                        const adjTarget = baseTarget * (slider / 100);
                        let totalW = 0;
                        const empWeights = new Map<string, number>();
                        allEmployees.forEach(emp => { 
                            const w = departmentWeightsData?.[emp.department] ?? (100 / allEmployees.length); 
                            empWeights.set(emp.originalName, w); 
                            totalW += w; 
                        });
                        if (totalW > 0) {
                            if (!targets.has(currentComp)) targets.set(currentComp, new Map());
                            const compT = targets.get(currentComp)!;
                            allEmployees.forEach(emp => { 
                                const existing = compT.get(emp.originalName) || 0;
                                compT.set(emp.originalName, existing + (adjTarget * (empWeights.get(emp.originalName)! / totalW))); 
                            });
                        }
                    }
                }
            }
            setEmployeeCompetitionTargets(targets);
        };
        fetchTargets();
    }, [activeSupermarkets, allEmployees, dataVersion]);

    const [totalAggregatedTarget, setTotalAggregatedTarget] = useState(0);

    useEffect(() => {
        const loadConfigs = async () => {
            if (activeSupermarkets.length === 0) return;
            const summaryLuyKeData = await db.get('summary-luy-ke');
            let totalT = 0;
            if (summaryLuyKeData) {
                const lines = String(summaryLuyKeData).split('\n');
                for (const sm of activeSupermarkets) {
                    const totalTargetPercent = await db.get(`targethero-${sm}-total`) ?? 100;
                    const smLine = lines.find(l => l.trim().startsWith(sm));
                    if (smLine) {
                        const cols = smLine.split('\t');
                        const biTarget = parseNumber(cols[5]);
                        if (biTarget > 0) totalT += biTarget * (totalTargetPercent / 100);
                    }
                }
            }
            setTotalAggregatedTarget(totalT);
        };
        loadConfigs();
    }, [activeSupermarkets, dataVersion]);

    const individualViewEmployees = useMemo(() => {
        const depts = activeDepartments || ['all'];
        if (depts.includes('all')) return allEmployees;
        return allEmployees.filter(emp => depts.includes(emp.department));
    }, [allEmployees, activeDepartments]);

    const [selectedIndividual, setSelectedIndividual] = useState<Employee | null>(null);
    useEffect(() => {
        if (individualViewEmployees.length > 0) { 
            setSelectedIndividual(prev => (prev && individualViewEmployees.some(e => e.originalName === prev.originalName)) ? prev : individualViewEmployees[0]); 
        } else setSelectedIndividual(null);
    }, [individualViewEmployees]);

    const [versions, setVersions] = useIndexedDBState<Version[]>('nhanvien-competition-versions', []);
    const [activeVersionName, setActiveVersionName] = useState<string | 'new' | null>(null);

    const handleVersionTabClick = (version: Version) => {
        setActiveVersionName(version.name);
        setSelectedCompetitions(new Set(version.selectedCompetitions));
        setActiveCompetitionTab('nhom');
    };

    // Fix: Implemented missing version control handlers
    const handleStartNewVersion = () => {
        setActiveVersionName('new');
        setActiveCompetitionTab('nhom');
    };

    const handleCancelNewVersion = () => {
        setActiveVersionName(null);
    };

    const handleSaveVersion = (name: string) => {
        const newVersion: Version = {
            name,
            selectedCompetitions: Array.from(selectedCompetitions),
        };
        setVersions(prev => [...(prev || []).filter(v => v.name !== name), newVersion]);
        setActiveVersionName(name);
    };

    const handleDeleteVersion = (name: string) => {
        if (window.confirm(`Bạn có chắc chắn muốn xoá phiên bản "${name}"?`)) {
            setVersions(prev => (prev || []).filter(v => v.name !== name));
            if (activeVersionName === name) {
                setActiveVersionName(null);
            }
        }
    };

    return (
        <div className="space-y-6 relative">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10 pb-2 w-full">
                {/* Title + Icon */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 sm:p-2.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-2xl flex-shrink-0 border border-violet-100 dark:border-violet-800">
                        <SparklesIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none truncate">
                            Phân tích Nhân viên
                        </h1>
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-wider leading-none">
                            Hiệu suất & Kinh doanh cá nhân
                        </p>
                    </div>
                </div>

                {/* Nav Tabs */}
                <nav className="inline-flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm no-print overflow-x-auto hide-scrollbar w-full sm:w-auto flex-shrink-0">
                    <NavTabButton tab="revenue" activeTab={activeTab} setActiveTab={setActiveTab}>Doanh thu</NavTabButton>
                    <NavTabButton tab="crossSelling" activeTab={activeTab} setActiveTab={setActiveTab}>Bán kèm</NavTabButton>
                    <NavTabButton tab="installment" activeTab={activeTab} setActiveTab={setActiveTab}>Trả góp</NavTabButton>
                    <NavTabButton tab="competition" activeTab={activeTab} setActiveTab={setActiveTab}>Thi đua</NavTabButton>
                    <NavTabButton tab="bonus" activeTab={activeTab} setActiveTab={setActiveTab}>Thưởng</NavTabButton>
                </nav>
            </header>

            {/* Compact Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 z-20 relative">
                {/* Supermarket Filter */}
                <div className="relative flex-1 min-w-0" ref={smRef}>
                    <button onClick={() => setIsSmFilterOpen(!isSmFilterOpen)} className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-sky-300 dark:hover:border-sky-700 transition-all outline-none shadow-sm">
                        <div className="flex items-center gap-2 min-w-0">
                            <BuildingStorefrontIcon className="h-4 w-4 text-sky-500 flex-shrink-0" />
                            <span className="truncate">{activeSupermarkets.length === supermarkets.length ? 'Tất cả siêu thị' : activeSupermarkets.map(s => shortenSupermarketName(s)).join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded-full">{activeSupermarkets.length}</span>
                            <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isSmFilterOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </button>
                    {isSmFilterOpen && (
                        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[60] p-1.5 max-h-72 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="space-y-0.5">
                                <div onClick={() => toggleSupermarket('all')} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <span className="text-xs font-black text-sky-600 dark:text-sky-400">Chọn tất cả</span>
                                    <Switch checked={activeSupermarkets.length === supermarkets.length} onChange={() => {}} />
                                </div>
                                {supermarkets.map(sm => (
                                    <div key={sm} onClick={() => toggleSupermarket(sm)} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{shortenSupermarketName(sm)}</span>
                                        <Switch checked={activeSupermarkets.includes(sm)} onChange={() => {}} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Department Filter */}
                <div className="relative flex-1 min-w-0" ref={deptRef}>
                    <button onClick={() => setIsDeptFilterOpen(!isDeptFilterOpen)} className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-violet-300 dark:hover:border-violet-700 transition-all outline-none shadow-sm">
                        <div className="flex items-center gap-2 min-w-0">
                            <FilterIcon className="h-4 w-4 text-violet-500 flex-shrink-0" />
                            <span className="truncate">{activeDepartments.includes('all') ? 'Tất cả bộ phận' : activeDepartments.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">{activeDepartments.includes('all') ? 'All' : activeDepartments.length}</span>
                            <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDeptFilterOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </button>
                    {isDeptFilterOpen && (
                        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[60] p-1.5 max-h-72 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="space-y-0.5">
                                <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors" onClick={() => toggleDepartment('all')}>
                                    <span className="text-xs font-black text-violet-600 dark:text-violet-400">Tất cả</span>
                                    <Switch checked={activeDepartments.includes('all')} onChange={() => {}} />
                                </div>
                                {departmentOptions.map(dept => (
                                    <div key={dept} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors" onClick={() => toggleDepartment(dept)}>
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{dept}</span>
                                        <Switch checked={activeDepartments.includes(dept) && !activeDepartments.includes('all')} onChange={() => {}} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-2">
                 {activeTab === 'revenue' && <RevenueView rows={revenueRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} departmentNames={activeDepartments} performanceChanges={new Map()} onViewTrend={() => {}} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} snapshotId={null} setSnapshotId={() => {}} snapshots={[]} handleSaveSnapshot={() => {}} handleDeleteSnapshot={() => {}} supermarketTarget={totalAggregatedTarget} departmentWeights={aggregatedWeights} deptEmployeeCounts={deptEmployeeCounts} employeeInstallmentMap={employeeInstallmentMap} />}
                 {activeTab === 'crossSelling' && <CrossSellingTab rows={banKemRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} activeDepartments={activeDepartments} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} />}
                 {activeTab === 'installment' && <InstallmentTab rows={installmentRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} activeDepartments={activeDepartments} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} />}
                 {activeTab === 'competition' && <CompetitionTab groupedData={competitionData} allCompetitionsByCriterion={competitionData} selectedCompetitions={selectedCompetitions} setSelectedCompetitions={setSelectedCompetitions} supermarket={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} versions={versions} activeVersionName={activeVersionName} setActiveVersionName={setActiveVersionName} activeCompetitionTab={activeCompetitionTab} setActiveCompetitionTab={setActiveCompetitionTab} onVersionTabClick={handleVersionTabClick} onStartNewVersion={handleStartNewVersion} onCancelNewVersion={handleCancelNewVersion} onSaveVersion={handleSaveVersion} onDeleteVersion={handleDeleteVersion} employeeCompetitionTargets={employeeCompetitionTargets} allEmployees={allEmployees} performanceChanges={new Map()} individualViewEmployees={individualViewEmployees} selectedIndividual={selectedIndividual} onSelectIndividual={setSelectedIndividual} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} activeDepartments={activeDepartments} />}
                 {activeTab === 'bonus' && (
                     <>
                        <BonusView 
                            employees={allEmployees} 
                            bonusData={aggregatedData.bonusData} 
                            revenueRows={revenueRows} 
                            supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} 
                            onEmployeeClick={(emp) => setEditingBonusEmployee(emp)} 
                            onBatchUpdate={startBatchBonusUpdate}
                            highlightedEmployees={highlightedEmployees} 
                            activeDepartments={activeDepartments} 
                        />
                        {editingBonusEmployee && (
                            <BonusDataModal 
                                employee={editingBonusEmployee} 
                                supermarketName={activeSupermarkets[0]} 
                                remainingInBatch={isBatchBonusMode ? allEmployees.length - allEmployees.findIndex(e => e.originalName === editingBonusEmployee.originalName) : 0}
                                onClose={handleBonusModalClose}
                                onSave={handleSaveBonus}
                            />
                        )}
                     </>
                 )}
            </div>
            
            <AiAssistant danhSachData={aggregatedData.danhSach} thiDuaData={aggregatedData.thiDua} />
        </div>
    );
};
export default NhanVien;
