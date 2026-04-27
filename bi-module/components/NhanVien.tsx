import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LineChartIcon, ArchiveBoxIcon, BuildingStorefrontIcon, ChevronDownIcon, FilterIcon, CreditCardIcon, SparklesIcon } from './Icons';
import { Tab, Employee } from '../types/nhanVienTypes';
import RevenueView from './nhanvien/RevenueTab';
import InstallmentTab from './nhanvien/InstallmentTab';
import { BonusView, BonusDataModal } from './nhanvien/BonusTab';
import { CompetitionTab } from './nhanvien/CompetitionTab';
import CrossSellingTab from './nhanvien/CrossSellingTab';
import DetailTab from './nhanvien/DetailTab';
import { shortenSupermarketName, parseNumber } from '../utils/dashboardHelpers';

import { Switch } from './dashboard/DashboardWidgets';
import { Users, CreditCard, Award } from 'lucide-react';

import { useExportOptions } from '../../hooks/useExportOptions';
import ExportOptionsModal from '../../components/common/ExportOptionsModal';
import { ExportOptionsProvider } from '../contexts/ExportOptionsContext';
import { useNhanVienData } from '../hooks/useNhanVienData';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import { parseCompetitionData } from '../utils/nhanVienHelpers';
import * as db from '../utils/db';
const NavTabButton: React.FC<{ tab: Tab; children: React.ReactNode; activeTab: Tab; setActiveTab: (t: Tab) => void; icon?: React.ReactNode; }> = React.memo(({ tab, children, activeTab, setActiveTab }) => (
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
));

// Hằng số ổn định — tránh tạo reference mới mỗi render gây re-render child thừa
const EMPTY_MAP = new Map();
const EMPTY_ARRAY: any[] = [];
const NOOP = () => {};

export const NhanVien: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('revenue');
    const [isSmFilterOpen, setIsSmFilterOpen] = useState(false);
    const smRef = useRef<HTMLDivElement>(null);

    const [editingBonusEmployee, setEditingBonusEmployee] = useState<Employee | null>(null);
    const [isBatchBonusMode, setIsBatchBonusMode] = useState(false);

    const data = useNhanVienData();
    const {
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
        dataVersion
    } = data;

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
            const [competitionLuyKeData, competitionRealtimeData] = await Promise.all([
                db.get('competition-luy-ke'),
                db.get('competition-realtime')
            ]);
            
            const linesLuyKe = competitionLuyKeData ? String(competitionLuyKeData).split('\n') : [];
            const linesRealtime = competitionRealtimeData ? String(competitionRealtimeData).split('\n') : [];
            const lines = [...linesLuyKe, ...linesRealtime];
            
            if (lines.length === 0) return;

            // Song song hóa tất cả IDB reads cho tất cả siêu thị
            const smDataResults = await Promise.all(activeSupermarkets.map(sm => 
                Promise.all([
                    db.get(`comptarget-${sm}-targets`),
                    db.get(`targethero-${sm}-departmentweights`),
                    sm // giữ lại tên SM để mapping
                ])
            ));

            const smDataMap = new Map<string, { competitionTargets: any; departmentWeights: any }>();
            smDataResults.forEach(([compTargets, deptWeights, sm]) => {
                smDataMap.set(sm as string, { competitionTargets: compTargets, departmentWeights: deptWeights });
            });
            
            for (const sm of activeSupermarkets) {
                const smData = smDataMap.get(sm);
                const competitionTargetsData = smData?.competitionTargets;
                const departmentWeightsData = smData?.departmentWeights;
                let currentComp: { name: string, targetIdx: number } | null = null;
                
                for (const line of lines) {
                    const parts = line.split('\t').map(p => p.trim());
                    
                    if (parts.length > 2) {
                        const p1 = parts[1].toUpperCase();
                        const isMetric = ['DTLK', 'DTQĐ', 'SLLK', 'DT REALTIME', 'SL REALTIME', 'DT REALTIME (QĐ)'].some(m => p1.includes(m));
                        if (isMetric) {
                            const targetIdx = parts.findIndex(p => {
                                const up = p.toUpperCase();
                                return up.includes('TARGET') || up.includes('MỤC TIÊU');
                            });
                            if (targetIdx > -1) {
                                currentComp = { name: parts[0], targetIdx };
                                continue;
                            }
                        }
                    }
                    
                    if (currentComp && parts[0] === sm) {
                        const targetValRaw = parts[currentComp.targetIdx];
                        if (targetValRaw) {
                            const baseTarget = parseNumber(targetValRaw);
                            const slider = competitionTargetsData?.[currentComp.name] ?? 100;
                            const adjTarget = baseTarget * (slider / 100);
                            
                            let totalW = 0;
                            const empWeights = new Map<string, number>();
                            allEmployees.forEach(emp => { 
                                const w = departmentWeightsData?.[emp.department] ?? (100 / allEmployees.length); 
                                empWeights.set(emp.originalName, w); 
                                totalW += w; 
                            });
                            
                            if (totalW > 0) {
                                if (!targets.has(currentComp.name)) targets.set(currentComp.name, new Map());
                                const compT = targets.get(currentComp.name)!;
                                allEmployees.forEach(emp => { 
                                    const existing = compT.get(emp.originalName) || 0;
                                    compT.set(emp.originalName, existing + (adjTarget * (empWeights.get(emp.originalName)! / totalW))); 
                                });
                            }
                        }
                    }
                }
            }
            (window as any).debugEmployeeCompetitionTargets = targets;
            setEmployeeCompetitionTargets(targets);
        };
        fetchTargets();
    }, [activeSupermarkets, allEmployees, dataVersion]);

    const [totalAggregatedTarget, setTotalAggregatedTarget] = useState(0);

    useEffect(() => {
        const loadConfigs = async () => {
            if (activeSupermarkets.length === 0) return;
            // Song song đọc tất cả: summary + target cho mỗi SM
            const [summaryLuyKeData, ...smTargets] = await Promise.all([
                db.get('summary-luy-ke'),
                ...activeSupermarkets.map(sm => db.get(`targethero-${sm}-total`))
            ]);
            let totalT = 0;
            if (summaryLuyKeData) {
                const lines = String(summaryLuyKeData).split('\n');
                activeSupermarkets.forEach((sm, i) => {
                    const totalTargetPercent = smTargets[i] ?? 100;
                    const smLine = lines.find(l => l.trim().startsWith(sm));
                    if (smLine) {
                        const cols = smLine.split('\t');
                        const dtDuKienQd = parseNumber(cols[5]);
                        const htTargetPercent = parseNumber(cols[6]);
                        if (!isNaN(dtDuKienQd) && !isNaN(htTargetPercent) && htTargetPercent > 0) {
                            const baseTarget = dtDuKienQd / (htTargetPercent / 100);
                            totalT += baseTarget * (totalTargetPercent / 100);
                        }
                    }
                });
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

            {/* Filter Toolbar Container */}
            <div className="sticky top-[66px] z-50 mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 w-full transition-all flex-wrap">
                <div className="hidden sm:flex items-center gap-2 text-[12px] font-black text-slate-500 uppercase tracking-widest">
                    <FilterIcon className="w-4 h-4" />
                    Bộ Lọc Dữ Liệu
                </div>
                <div className="flex flex-1 sm:flex-none flex-row gap-2 sm:gap-3 z-50 w-full sm:w-auto justify-end">
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
                        <NavTabButton tab="detail" activeTab={activeTab} setActiveTab={setActiveTab}>Chi tiết</NavTabButton>
                    </nav>
                </div>
                
                {/* Embedded Module Content — HIDDEN/BLOCK pattern: mount once, toggle visibility */}
                {/* Tránh destroy/recreate khi chuyển tab → không cần re-fetch IDB, re-parse data */}
                <div className="p-0 sm:p-2 bg-slate-50 dark:bg-slate-900">
                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.02)]">
                        <div className={activeTab === 'revenue' ? 'block' : 'hidden'}>
                            <RevenueView rows={revenueRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} departmentNames={effectiveActiveDepartments} performanceChanges={EMPTY_MAP} onViewTrend={NOOP} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} snapshotId={null} setSnapshotId={NOOP} snapshots={EMPTY_ARRAY} handleSaveSnapshot={NOOP} handleDeleteSnapshot={NOOP} supermarketTarget={totalAggregatedTarget} departmentWeights={aggregatedWeights} deptEmployeeCounts={deptEmployeeCounts} employeeInstallmentMap={employeeInstallmentMap} />
                        </div>
                        <div className={activeTab === 'crossSelling' ? 'block' : 'hidden'}>
                            <CrossSellingTab rows={banKemRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} activeDepartments={effectiveActiveDepartments} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} />
                        </div>
                        <div className={activeTab === 'installment' ? 'block' : 'hidden'}>
                            <InstallmentTab rows={installmentRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} activeDepartments={effectiveActiveDepartments} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} />
                        </div>
                        <div className={activeTab === 'competition' ? 'block' : 'hidden'}>
                            <CompetitionTab groupedData={competitionData} allCompetitionsByCriterion={competitionData} selectedCompetitions={selectedCompetitions} setSelectedCompetitions={setSelectedCompetitions} supermarket={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} versions={versions} activeVersionName={activeVersionName} setActiveVersionName={setActiveVersionName} activeCompetitionTab={activeCompetitionTab} setActiveCompetitionTab={setActiveCompetitionTab} onVersionTabClick={handleVersionTabClick} onStartNewVersion={handleStartNewVersion} onCancelNewVersion={handleCancelNewVersion} onSaveVersion={handleSaveVersion} onDeleteVersion={handleDeleteVersion} employeeCompetitionTargets={employeeCompetitionTargets} allEmployees={allEmployees} performanceChanges={EMPTY_MAP} individualViewEmployees={individualViewEmployees} selectedIndividual={selectedIndividual} onSelectIndividual={setSelectedIndividual} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} activeDepartments={effectiveActiveDepartments} />
                        </div>
                        <div className={activeTab === 'bonus' ? 'block' : 'hidden'}>
                            <BonusView 
                                employees={allEmployees} 
                                bonusData={aggregatedData.bonusData} 
                                revenueRows={revenueRows} 
                                supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} 
                                onEmployeeClick={(emp) => setEditingBonusEmployee(emp)} 
                                onBatchUpdate={startBatchBonusUpdate}
                                highlightedEmployees={highlightedEmployees} 
                                activeDepartments={effectiveActiveDepartments} 
                            />
                        </div>
                        <div className={activeTab === 'detail' ? 'block' : 'hidden'}>
                            <DetailTab rawData={aggregatedData.danhSach} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} activeDepartments={effectiveActiveDepartments} />
                        </div>
                    </div>
                </div>
                {/* BonusDataModal — giữ conditional vì là modal overlay */}
                {editingBonusEmployee && (
                    <BonusDataModal 
                        employee={editingBonusEmployee} 
                        supermarketName={activeSupermarkets[0]} 
                        remainingInBatch={isBatchBonusMode ? allEmployees.length - allEmployees.findIndex(e => e.originalName === editingBonusEmployee.originalName) : 0}
                        onClose={handleBonusModalClose}
                        onSave={handleSaveBonus}
                    />
                )}
            </div>
            
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
export default React.memo(NhanVien);
