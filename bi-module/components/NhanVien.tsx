import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LineChartIcon, ArchiveBoxIcon, BuildingStorefrontIcon, ChevronDownIcon, FilterIcon, CreditCardIcon, SparklesIcon } from './Icons';
import { Tab, Employee, Criterion, Version } from '../types/nhanVienTypes';
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
import { ConfirmDialog } from '../../components/shared/ui/ConfirmDialog';
import { parseCompetitionData } from '../utils/nhanVienHelpers';
import * as db from '../utils/db';
const NavTabButton: React.FC<{ tab: Tab; children: React.ReactNode; activeTab: Tab; setActiveTab: (t: Tab) => void; icon?: React.ReactNode; }> = React.memo(({ tab, children, activeTab, setActiveTab }) => (
    <button 
        onClick={() => setActiveTab(tab)} 
        className={`
            flex-1 sm:flex-none px-5 py-2.5 text-[12px] uppercase tracking-wider transition-all duration-200 whitespace-nowrap border-b-2
            ${activeTab === tab 
                ? 'font-black text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400' 
                : 'font-bold text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300'
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

interface NhanVienProps {
    isActive?: boolean;
}

export const NhanVien: React.FC<NhanVienProps> = ({ isActive }) => {
    const [activeTab, setActiveTab] = useIndexedDBState<Tab>('nhanvien-active-tab', 'revenue');

    useEffect(() => {
        if (isActive) {
            setActiveTab('revenue');
        }
    }, [isActive, setActiveTab]);
    const [isSmFilterOpen, setIsSmFilterOpen] = useState(false);
    const smRef = useRef<HTMLDivElement>(null);

    const [editingBonusEmployee, setEditingBonusEmployee] = useState<Employee | null>(null);
    const [isBatchBonusMode, setIsBatchBonusMode] = useState(false);
    const [versionToDelete, setVersionToDelete] = useState<string | null>(null);

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
    const [activeCompetitionTab, setActiveCompetitionTab] = useIndexedDBState<Criterion | 'nhom' | 'canhan' | 'tong' | 'sosanh'>('nhanvien-active-competition-tab', 'nhom');
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
            const smDataResults = await Promise.all(activeSupermarkets.map(sm => {
                const safeName = shortenSupermarketName(sm);
                return Promise.all([
                    db.get(`comptarget-${safeName}-targets`),
                    db.get(`targethero-${safeName}-departmentweights`),
                    sm // giữ lại tên SM để mapping
                ]);
            }));

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
                ...activeSupermarkets.map(sm => db.get(`targethero-${shortenSupermarketName(sm)}-total`))
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
    const [activeVersionName, setActiveVersionName] = useIndexedDBState<string | 'new' | null>('nhanvien-active-version', null);

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
        setVersionToDelete(name);
    };

    const confirmDeleteVersion = () => {
        if (versionToDelete) {
            setVersions(prev => (prev || []).filter(v => v.name !== versionToDelete));
            if (activeVersionName === versionToDelete) {
                setActiveVersionName(null);
            }
            setVersionToDelete(null);
        }
    };

    const exportOptions = useExportOptions();

    return (
        <ExportOptionsProvider value={{ showExportOptions: exportOptions.showExportOptions }}>
        <div className="space-y-4 sm:space-y-6 relative">


            {/* Title + Filter Toolbar */}
            <div className="relative z-20 mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-3 pb-1 border-b border-slate-200 dark:border-slate-800 w-full">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white uppercase">
                        Nhân Viên
                    </h1>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 pb-2">
                        Hiệu suất cá nhân
                    </p>
                </div>
                <div className="flex flex-1 sm:flex-none flex-row gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                    {/* Supermarket Filter */}
                    <div className="relative w-full sm:w-auto min-w-0" ref={smRef}>
                        <button onClick={() => setIsSmFilterOpen(!isSmFilterOpen)} className="w-full h-full flex items-center justify-between gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all outline-none whitespace-nowrap">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                <BuildingStorefrontIcon className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                                <span className="truncate text-left max-w-[100px] sm:max-w-[160px]">{activeSupermarkets.length === supermarkets.length ? 'Tất cả siêu thị' : Array.from(new Set(activeSupermarkets.map(s => shortenSupermarketName(s)))).join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5">{Array.from(new Set(activeSupermarkets.map(s => shortenSupermarketName(s)))).length}</span>
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
                                    {Array.from(new Map(supermarkets.map(sm => [shortenSupermarketName(sm), sm])).values()).map(sm => (
                                        <div key={sm} onClick={() => toggleSupermarket(sm)} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{shortenSupermarketName(sm)}</span>
                                            <Switch checked={activeSupermarkets.some(a => shortenSupermarketName(a) === shortenSupermarketName(sm))} onChange={() => {}} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Department Filter (Mới bổ sung) */}
                    <div className="relative w-full sm:w-auto min-w-0" ref={deptRef}>
                        <button onClick={() => setIsDeptFilterOpen(!isDeptFilterOpen)} className="w-full h-full flex items-center justify-between gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-600 transition-all outline-none whitespace-nowrap">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                <ArchiveBoxIcon className="h-4 w-4 text-sky-500 flex-shrink-0" />
                                <span className="truncate text-left max-w-[100px] sm:max-w-[160px]">{activeDepartments.includes('all') ? 'Tất cả bộ phận' : activeDepartments.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-1.5 py-0.5">{activeDepartments.includes('all') ? departmentOptions.length : activeDepartments.length}</span>
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



            {/* 3. Tab Switcher — minimal bottom-border style */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                <div className="border-b border-slate-200 dark:border-slate-700 px-4 sm:px-5 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tiêu chí đánh giá hiệu quả</p>
                    <nav className="flex items-center gap-0 overflow-x-auto hide-scrollbar w-full sm:w-auto -mb-px">
                        <NavTabButton tab="revenue" activeTab={activeTab} setActiveTab={setActiveTab}>Doanh thu</NavTabButton>
                        <NavTabButton tab="crossSelling" activeTab={activeTab} setActiveTab={setActiveTab}>Bán kèm</NavTabButton>
                        <NavTabButton tab="installment" activeTab={activeTab} setActiveTab={setActiveTab}>Trả góp</NavTabButton>
                        <NavTabButton tab="competition" activeTab={activeTab} setActiveTab={setActiveTab}>Thi đua</NavTabButton>
                        <NavTabButton tab="bonus" activeTab={activeTab} setActiveTab={setActiveTab}>Thưởng</NavTabButton>
                        <NavTabButton tab="detail" activeTab={activeTab} setActiveTab={setActiveTab}>Chi tiết</NavTabButton>
                    </nav>
                </div>
                
                {/* Embedded Module Content */}
                <div className="p-0">
                    <div className="bg-white dark:bg-slate-800">
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
                            <CompetitionTab groupedData={competitionData} allCompetitionsByCriterion={competitionData} selectedCompetitions={selectedCompetitions} setSelectedCompetitions={setSelectedCompetitions} supermarket={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} versions={versions} activeVersionName={activeVersionName} setActiveVersionName={setActiveVersionName} activeCompetitionTab={activeCompetitionTab} setActiveCompetitionTab={setActiveCompetitionTab} onVersionTabClick={handleVersionTabClick} onStartNewVersion={handleStartNewVersion} onCancelNewVersion={handleCancelNewVersion} onSaveVersion={handleSaveVersion} onDeleteVersion={handleDeleteVersion} employeeCompetitionTargets={employeeCompetitionTargets} allEmployees={allEmployees} performanceChanges={EMPTY_MAP} individualViewEmployees={individualViewEmployees} selectedIndividual={selectedIndividual} onSelectIndividual={setSelectedIndividual} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} activeDepartments={effectiveActiveDepartments} revenueRows={revenueRows} installmentRows={installmentRows} banKemRows={banKemRows} bonusData={aggregatedData.bonusData} />
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
                        nextEmployee={isBatchBonusMode ? allEmployees[allEmployees.findIndex(e => e.originalName === editingBonusEmployee.originalName) + 1] || null : null}
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

            <ConfirmDialog
                isOpen={!!versionToDelete}
                onClose={() => setVersionToDelete(null)}
                onConfirm={confirmDeleteVersion}
                title="Xóa phiên bản?"
                message={`Bạn có chắc chắn muốn xoá phiên bản "${versionToDelete}"?`}
                confirmText="Xóa"
                variant="danger"
            />
        </div>
        </ExportOptionsProvider>
    );
};
export default React.memo(NhanVien);
