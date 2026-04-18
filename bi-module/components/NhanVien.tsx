
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
import { TrendingUp, Users, ShoppingBag, CreditCard, Award, ArrowUpRight, ArrowDownRight, MoreVertical } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from 'recharts';
import { useExportOptions } from '../../hooks/useExportOptions';
import ExportOptionsModal from '../../components/common/ExportOptionsModal';
import { ExportOptionsProvider } from '../contexts/ExportOptionsContext';

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

    const [versions, setVersions] = useState<Version[]>([]);
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

    // Calculate generic stats for the new Dashboard view
    const stats_TotalRevenue = useMemo(() => revenueRows.filter(r => r.type === 'employee' && (activeDepartments.includes('all') || activeDepartments.includes(r.department!))).reduce((sum, r) => sum + r.dtlk, 0), [revenueRows, activeDepartments]);
    const stats_TotalCrossSelling = useMemo(() => banKemRows.filter(r => r.type === 'employee' && (activeDepartments.includes('all') || activeDepartments.includes(r.department!))).reduce((sum, r) => sum + r.dtlk, 0), [banKemRows, activeDepartments]);
    const stats_TotalInstallment = useMemo(() => installmentRows.filter(r => r.type === 'employee' && (activeDepartments.includes('all') || activeDepartments.includes(r.department!))).reduce((sum, r) => sum + r.totalDtSieuThi, 0), [installmentRows, activeDepartments]);
    
    const topEmployees = useMemo(() => {
        return [...revenueRows.filter(r => r.type === 'employee' && (activeDepartments.includes('all') || activeDepartments.includes(r.department!)))]
            .sort((a, b) => b.dtqd - a.dtqd)
            .slice(0, 6);
    }, [revenueRows, activeDepartments]);
    
    const chartData = useMemo(() => {
        return revenueRows.filter(r => r.type === 'department' && (activeDepartments.includes('all') || activeDepartments.includes(r.name))).map(d => ({
            name: d.name,
            DoanhThu: d.dtlk,
            DoanhThuQD: d.dtqd
        })).sort((a, b) => b.DoanhThu - a.DoanhThu);
    }, [revenueRows, activeDepartments]);

    const exportOptions = useExportOptions();

    return (
        <ExportOptionsProvider value={{ showExportOptions: exportOptions.showExportOptions }}>
        <div className="space-y-4 sm:space-y-6 relative">
            {/* Title - Non Sticky */}
            <div className="flex items-center gap-3 min-w-0 pt-2 pb-2">
                <div className="p-2 sm:p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex-shrink-0 border border-indigo-100 dark:border-indigo-800">
                    <SparklesIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none truncate">
                        Report BI Nhân Viên
                    </h1>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-wider leading-none">
                        Hiệu suất & Kinh doanh cá nhân
                    </p>
                </div>
            </div>

            {/* Sticky Filter Bar */}
            <div className="sticky top-[66px] z-50 pb-3 mb-6 bg-slate-50/90 dark:bg-[#0f172a]/90 backdrop-blur-md flex items-center justify-between gap-4 w-full border-b border-slate-200/50 dark:border-slate-700/50 transition-all -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="hidden sm:block text-sm font-bold text-slate-400 uppercase tracking-wider">Bộ Lọc Dữ Liệu</div>
                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-3 z-50 w-full sm:w-auto">
                    {/* Supermarket Filter */}
                    <div className="relative w-full sm:w-auto min-w-0" ref={smRef}>
                        <button onClick={() => setIsSmFilterOpen(!isSmFilterOpen)} className="w-full h-full flex items-center justify-between gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all outline-none shadow-sm whitespace-nowrap">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                <BuildingStorefrontIcon className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                                <span className="truncate text-left max-w-[100px] sm:max-w-[160px]">{activeSupermarkets.length === supermarkets.length ? 'Tất cả siêu thị' : activeSupermarkets.map(s => shortenSupermarketName(s)).join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{activeSupermarkets.length}</span>
                                <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isSmFilterOpen ? 'rotate-180' : ''}`} />
                            </div>
                        </button>
                        {isSmFilterOpen && (
                            <div className="absolute top-[calc(100%+8px)] right-0 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1.5 max-h-72 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="space-y-0.5">
                                    <div onClick={() => toggleSupermarket('all')} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">Chọn tất cả</span>
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

                    {/* Department Filter (Mới bổ sung) */}
                    <div className="relative w-full sm:w-auto min-w-0" ref={deptRef}>
                        <button onClick={() => setIsDeptFilterOpen(!isDeptFilterOpen)} className="w-full h-full flex items-center justify-between gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all outline-none shadow-sm whitespace-nowrap">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                <ArchiveBoxIcon className="h-4 w-4 text-sky-500 flex-shrink-0" />
                                <span className="truncate text-left max-w-[100px] sm:max-w-[160px]">{activeDepartments.includes('all') ? 'Tất cả bộ phận' : activeDepartments.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded-full">{activeDepartments.includes('all') ? departmentOptions.length : activeDepartments.length}</span>
                                <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDeptFilterOpen ? 'rotate-180' : ''}`} />
                            </div>
                        </button>
                        {isDeptFilterOpen && (
                            <div className="absolute top-[calc(100%+8px)] right-0 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1.5 max-h-72 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="space-y-0.5">
                                    <div onClick={() => toggleDepartment('all')} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <span className="text-xs font-black text-sky-600 dark:text-sky-400">Tất cả bộ phận</span>
                                        <Switch checked={activeDepartments.includes('all')} onChange={() => {}} />
                                    </div>
                                    {departmentOptions.map(dept => (
                                        <div key={dept} onClick={() => toggleDepartment(dept)} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{dept}</span>
                                            <Switch checked={activeDepartments.includes(dept) || activeDepartments.includes('all')} onChange={() => {}} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- DASHBOARD WIDGETS --- */}
            
            {/* 1. Statistics Cards Grid (Quy về 3 thẻ với icon tròn pastel) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
                {/* Total Revenue */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-700/60 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Tổng Doanh Thu</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{stats_TotalRevenue.toLocaleString('en-US', {maximumFractionDigits:1})} <span className="text-base font-bold text-slate-400">Tr</span></h3>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/30 border-4 border-white dark:border-slate-800 shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                            <TrendingUp className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl">
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md font-bold">
                            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +12.5%
                        </span>
                        <span className="text-slate-500">so với tháng trước</span>
                    </div>
                </div>

                {/* Total Cross Selling */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-700/60 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Tổng Bán Kèm (Phụ kiện)</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{stats_TotalCrossSelling.toLocaleString('en-US', {maximumFractionDigits:1})} <span className="text-base font-bold text-slate-400">Tr</span></h3>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border-4 border-white dark:border-slate-800 shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                            <ShoppingBag className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl">
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md font-bold">
                            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +5.2%
                        </span>
                        <span className="text-slate-500">tăng trưởng nhẹ</span>
                    </div>
                </div>

                {/* Total Competition Target */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-700/60 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Tổng Target Thi Đua</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{totalAggregatedTarget.toLocaleString('en-US', {maximumFractionDigits:1})} <span className="text-base font-bold text-slate-400">Tr</span></h3>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/30 border-4 border-white dark:border-slate-800 shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                            <Award className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl">
                        <span className="flex items-center text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-md font-bold">
                            <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> -2.1%
                        </span>
                        <span className="text-slate-500">giảm so với mục tiêu</span>
                    </div>
                </div>
            </div>

            {/* 2. Charts & Top Lists Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60 flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700/60 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tổng Doanh Thu Theo Bộ Phận</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Đơn vị: Triệu VNĐ</p>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-5 flex-1 min-h-[300px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${val.toLocaleString('en-US')}Tr`} />
                                    <RechartsTooltip 
                                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '13px' }}
                                        formatter={(val: number, name: string) => [`${val.toLocaleString('en-US', {maximumFractionDigits:1})} Triệu`, name === 'DoanhThu' ? 'Doanh thu' : 'Doanh thu QĐ']}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" />
                                    <Bar dataKey="DoanhThu" name="Doanh thu" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false} />
                                    <Bar dataKey="DoanhThuQD" name="Doanh thu QĐ" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium">Chưa có dữ liệu thống kê</div>
                        )}
                    </div>
                </div>

                {/* Top Employees List */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Top Cá Nhân Xuất Sắc</h3>
                            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Top 6 nhân sự xuất sắc</p>
                        </div>
                        <div className="w-10 h-10 flex items-center justify-center bg-amber-50 dark:bg-amber-900/30 rounded-full border border-amber-100 dark:border-amber-800/30">
                            <Award className="w-5 h-5 text-amber-500" />
                        </div>
                    </div>
                    <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
                        {topEmployees.length > 0 ? (
                            <div className="space-y-1.5">
                                {topEmployees.map((emp, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 shadow-sm hover:shadow-md group">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 shadow-sm ${idx === 0 ? 'bg-amber-100 text-amber-600 border border-amber-200' : idx === 1 ? 'bg-slate-200 text-slate-600 border border-slate-300' : idx === 2 ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="min-w-0 flex-1 ml-1">
                                            <p className="text-[13px] font-bold text-slate-800 dark:text-white truncate">{emp.name}</p>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">{emp.department || 'Nhân viên'}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-black text-sky-600 dark:text-sky-400 tracking-tight">{Math.round(emp.dtqd).toLocaleString('en-US')}M</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu top</div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Detailed Data section with internal Tab Switcher */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-700 p-4 sm:p-5 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Bảng Chỉ Tiêu Chi Tiết</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Dữ liệu phân mảnh cho nhân viên siêu thị</p>
                    </div>
                    
                    {/* The NavTabButton container moved here from header */}
                    <nav className="inline-flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto hide-scrollbar w-full sm:w-auto">
                        <NavTabButton tab="revenue" activeTab={activeTab} setActiveTab={setActiveTab}>Doanh thu</NavTabButton>
                        <NavTabButton tab="crossSelling" activeTab={activeTab} setActiveTab={setActiveTab}>Bán kèm</NavTabButton>
                        <NavTabButton tab="installment" activeTab={activeTab} setActiveTab={setActiveTab}>Trả góp</NavTabButton>
                        <NavTabButton tab="competition" activeTab={activeTab} setActiveTab={setActiveTab}>Thi đua</NavTabButton>
                        <NavTabButton tab="bonus" activeTab={activeTab} setActiveTab={setActiveTab}>Thưởng</NavTabButton>
                    </nav>
                </div>
                
                {/* Embedded Module Content */}
                <div className="p-0 sm:p-2 bg-slate-50 dark:bg-slate-900">
                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.02)]">
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
                </div>
            </div>
            
            <AiAssistant danhSachData={aggregatedData.danhSach} thiDuaData={aggregatedData.thiDua} />
            <ExportOptionsModal
                isOpen={!!exportOptions.pendingExport}
                onClose={exportOptions.handleClose}
                onDownload={exportOptions.handleDownload}
                onShare={exportOptions.handleShare}
                canShare={exportOptions.canShare}
                filename={exportOptions.pendingExport?.filename || ''}
            />
        </div>
        </ExportOptionsProvider>
    );
};
export default NhanVien;
