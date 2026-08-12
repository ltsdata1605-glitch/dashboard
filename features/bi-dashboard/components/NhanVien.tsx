import { useWorker } from "../hooks/useWorker";import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChartIcon, ArchiveBoxIcon, BuildingStorefrontIcon, FilterIcon, CreditCardIcon, SparklesIcon } from './Icons';
import { Tab, Employee, Criterion, Version, CompetitionHeader } from '../types/nhanVienTypes';
import RevenueView from './nhanvien/RevenueTab';
import InstallmentTab from './nhanvien/InstallmentTab';
import { BonusView, BonusDataModal } from './nhanvien/BonusTab';
import { CompetitionTab } from './nhanvien/CompetitionTab';
import CrossSellingTab from './nhanvien/CrossSellingTab';
import DetailTab from './nhanvien/DetailTab';
import { shortenSupermarketName, parseNumber } from '../utils/dashboardHelpers';
import { useExportOptions } from '../hooks/useExportOptions';
import ExportOptionsModal from '../../../components/common/ExportOptionsModal';
import { ExportOptionsProvider } from '../contexts/ExportOptionsContext';
import { useNhanVienData } from '../hooks/useNhanVienData';
import { useBonusAutoBridge } from '../hooks/useBonusAutoBridge';
import { useMultiMonthBonusRun } from '../hooks/useMultiMonthBonusRun';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { parseCompetitionData, CompetitionEmployeeRow } from '../utils/nhanVienHelpers';
import * as db from '../utils/db';
import { parseBaseTargetQuyDoi, parseEmployeeCompetitionTargets } from '../services/employeeParser';
import { Tabs } from '../../../components/shared/ui/Tabs';
import { MultiSelectDropdown } from '../../../components/shared/ui/MultiSelectDropdown';

const NAV_TABS: { tab: Tab; label: string }[] = [
    { tab: 'revenue', label: 'Doanh thu' },
    { tab: 'crossSelling', label: 'Bán kèm' },
    { tab: 'installment', label: 'Trả góp' },
    { tab: 'competition', label: 'Thi đua' },
    { tab: 'bonus', label: 'Thưởng' },
    { tab: 'detail', label: 'Chi tiết' },
];

// Hằng số ổn định — tránh tạo reference mới mỗi render gây re-render child thừa
const EMPTY_MAP = new Map();
const EMPTY_ARRAY: never[] = [];
const NOOP = () => {};

interface NhanVienProps {
    isActive?: boolean;
}

export const NhanVien: React.FC<NhanVienProps> = ({ isActive }) => {
    const [activeTab, setActiveTab] = useIndexedDBState<Tab>('nhanvien-active-tab', 'revenue');
    const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(() => new Set<Tab>(['revenue']));

    // Mặc định luôn mở tab Doanh thu khi người dùng chuyển sang màn hình Nhân viên
    useEffect(() => {
        if (isActive) {
            setActiveTab('revenue');
        }
    }, [isActive, setActiveTab]);

    useEffect(() => {
        if (activeTab) {
            setVisitedTabs(prev => {
                if (prev.has(activeTab)) return prev;
                const next = new Set(prev);
                next.add(activeTab);
                return next;
            });
        }
    }, [activeTab]);

    const [editingBonusEmployee, setEditingBonusEmployee] = useState<Employee | null>(null);
    const [isBatchBonusMode, setIsBatchBonusMode] = useState(false);
    const [versionToDelete, setVersionToDelete] = useState<string | null>(null);

    const data = useNhanVienData(isActive);
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
        hiddenEmployees,
        deptEmployeeCounts,
        toggleSupermarket,
        toggleDepartment,
        handleSaveBonus,
        handleSaveBonusBatch,
        handleSaveBonusMonthly,
        setBonusPeriodLabel,
        dataVersion
    } = data;

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

    const startBatchBonusUpdate = useCallback(() => {
        if (allEmployees.length > 0) {
            setIsBatchBonusMode(true);
            setEditingBonusEmployee(allEmployees[0]);
        }
    }, [allEmployees]);

    const bonusAutoBridge = useBonusAutoBridge(allEmployees, handleSaveBonusBatch);
    const bonusMultiMonthRun = useMultiMonthBonusRun(allEmployees, handleSaveBonusMonthly);

    const { runWorkerTask } = useWorker();
    const [competitionData, setCompetitionData] = useState<Record<Criterion, { headers: CompetitionHeader[], employees: CompetitionEmployeeRow[] }>>({} as Record<Criterion, { headers: CompetitionHeader[], employees: CompetitionEmployeeRow[] }>);

    useEffect(() => {
        if (!aggregatedData.thiDua || !isActive) return;
        let isMounted = true;
        runWorkerTask('PARSE_COMPETITION', { text: aggregatedData.thiDua, employeeDepartmentMap }).then(parsed => {
            if (!isMounted || !parsed) return;
            const hiddenSet = new Set(hiddenEmployees || []);
            const filteredResult = { ...parsed };
            Object.keys(filteredResult).forEach(key => {
                const criterion = key as Criterion;
                filteredResult[criterion] = {
                    headers: parsed[criterion].headers,
                    employees: parsed[criterion].employees.filter((emp: CompetitionEmployeeRow) => !hiddenSet.has(emp.originalName || ''))
                };
            });
            setCompetitionData(filteredResult);
        });
        return () => { isMounted = false; };
    }, [aggregatedData.thiDua, employeeDepartmentMap, hiddenEmployees, isActive]);

    // Fix: Updated type to include 'tong'
    const [activeCompetitionTab, setActiveCompetitionTab] = useIndexedDBState<Criterion | 'nhom' | 'canhan' | 'tong' | 'tatca' | 'sosanh'>('nhanvien-active-competition-tab', 'nhom');
    const [highlightedEmpArray, setHighlightedEmpArray] = useIndexedDBState<string[]>('highlight-employees-multi', []);
    const highlightedEmployees = useMemo(() => new Set(highlightedEmpArray), [highlightedEmpArray]);
    const setHighlightedEmployees = useCallback((updater: React.SetStateAction<Set<string>>) => { 
        setHighlightedEmpArray(prevArray => {
            const prevSet = new Set(prevArray || []);
            const newSet = typeof updater === 'function' ? updater(prevSet) : updater; 
            return Array.from(newSet);
        });
    }, [setHighlightedEmpArray]);

    const [selectedCompArray, setSelectedCompArray] = useIndexedDBState<string[]>('global-selected-competitions', []);
    const selectedCompetitions = useMemo(() => new Set(selectedCompArray), [selectedCompArray]);
    const setSelectedCompetitions = useCallback((updater: React.SetStateAction<Set<string>>) => {
        setSelectedCompArray(prevArray => {
            const prevSet = new Set(prevArray || []);
            const newSet = typeof updater === 'function' ? updater(prevSet) : updater;
            return Array.from(newSet);
        });
    }, [setSelectedCompArray]);

    const [employeeCompetitionTargets, setEmployeeCompetitionTargets] = useState<Map<string, Map<string, number>>>(new Map());

    useEffect(() => {
        if (activeTab !== 'competition') return;
        const fetchTargets = async () => {
            if (activeSupermarkets.length === 0) return;
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
                    db.get<Record<string, number>>(`comptarget-${safeName}-targets`),
                    db.get<Record<string, number>>(`targethero-${safeName}-departmentweights`),
                    sm // giữ lại tên SM để mapping
                ]);
            }));

            const smDataMap = new Map<string, { competitionTargets: Record<string, number>; departmentWeights: Record<string, number> }>();
            smDataResults.forEach(([compTargets, deptWeights, sm]) => {
                smDataMap.set(sm as string, { competitionTargets: compTargets ?? {}, departmentWeights: deptWeights ?? {} });
            });

            const targets = parseEmployeeCompetitionTargets(lines, activeSupermarkets, smDataMap, allEmployees);
            (window as unknown as { debugEmployeeCompetitionTargets: unknown }).debugEmployeeCompetitionTargets = targets;
            setEmployeeCompetitionTargets(targets);
        };
        fetchTargets();
    }, [activeSupermarkets, allEmployees, dataVersion, activeTab]);

    const [totalAggregatedTarget, setTotalAggregatedTarget] = useState(0);

    useEffect(() => {
        if (activeTab !== 'revenue') return;
        const loadConfigs = async () => {
            if (activeSupermarkets.length === 0) return;
            // Song song đọc tất cả: summary + target cho mỗi SM
            const [summaryLuyKeData, ...smTargets] = await Promise.all([
                db.get<string>('summary-luy-ke'),
                ...activeSupermarkets.map(sm => db.get<number>(`targethero-${shortenSupermarketName(sm)}-total`))
            ]);
            let totalT = 0;
            if (summaryLuyKeData) {
                activeSupermarkets.forEach((sm, i) => {
                    const totalTargetPercent = smTargets[i] ?? 100;
                    const baseTarget = parseBaseTargetQuyDoi(summaryLuyKeData, sm);
                    totalT += baseTarget * (totalTargetPercent / 100);
                });
            }
            setTotalAggregatedTarget(totalT);
        };
        loadConfigs();
    }, [activeSupermarkets, dataVersion, activeTab]);

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

    const handleVersionTabClick = useCallback((version: Version) => {
        setActiveVersionName(version.name);
        setSelectedCompetitions(new Set(version.selectedCompetitions));
        setActiveCompetitionTab('nhom');
    }, [setActiveVersionName, setSelectedCompetitions, setActiveCompetitionTab]);

    // Fix: Implemented missing version control handlers
    const handleStartNewVersion = useCallback(() => {
        setActiveVersionName('new');
        setActiveCompetitionTab('nhom');
    }, [setActiveVersionName, setActiveCompetitionTab]);

    const handleCancelNewVersion = useCallback(() => {
        setActiveVersionName(null);
    }, [setActiveVersionName]);

    const handleSaveVersion = useCallback((name: string) => {
        const newVersion: Version = {
            name,
            selectedCompetitions: Array.from(selectedCompetitions),
        };
        setVersions(prev => [...(prev || []).filter(v => v.name !== name), newVersion]);
        setActiveVersionName(name);
    }, [selectedCompetitions, setVersions, setActiveVersionName]);

    const handleDeleteVersion = useCallback((name: string) => {
        setVersionToDelete(name);
    }, []);

    const confirmDeleteVersion = useCallback(() => {
        if (versionToDelete) {
            setVersions(prev => (prev || []).filter(v => v.name !== versionToDelete));
            if (activeVersionName === versionToDelete) {
                setActiveVersionName(null);
            }
            setVersionToDelete(null);
        }
    }, [versionToDelete, setVersions, activeVersionName, setActiveVersionName]);

    const exportOptions = useExportOptions();
    const exportOptionsContextValue = useMemo(
        () => ({ showExportOptions: exportOptions.showExportOptions }),
        [exportOptions.showExportOptions]
    );

    return (
        <ExportOptionsProvider value={exportOptionsContextValue}>
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
                <div className="flex flex-1 sm:flex-none w-full sm:w-auto justify-end">
                    {/* Nhóm 2 bộ lọc trong 1 pill viền chung, phân cách bằng đường kẻ — đúng chuẩn nhóm nút components/layout/Header.tsx */}
                    <div className="flex flex-col sm:flex-row w-full sm:w-auto rounded-lg sm:rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <MultiSelectDropdown
                            className="border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-700"
                            icon={<BuildingStorefrontIcon className="h-4 w-4 text-sky-500 flex-shrink-0" />}
                            triggerLabel={activeSupermarkets.length === supermarkets.length ? 'Tất cả siêu thị' : Array.from(new Set(activeSupermarkets.map(s => shortenSupermarketName(s)))).join(', ')}
                            count={Array.from(new Set(activeSupermarkets.map(s => shortenSupermarketName(s)))).length}
                            allLabel="Chọn tất cả"
                            allChecked={activeSupermarkets.length === supermarkets.length}
                            onToggleAll={() => toggleSupermarket('all')}
                            options={Array.from(new Map(supermarkets.map(sm => [shortenSupermarketName(sm), sm])).values()).map(sm => ({
                                key: sm,
                                label: shortenSupermarketName(sm),
                                checked: activeSupermarkets.some(a => shortenSupermarketName(a) === shortenSupermarketName(sm)),
                            }))}
                            onToggleOption={toggleSupermarket}
                        />
                        <MultiSelectDropdown
                            icon={<ArchiveBoxIcon className="h-4 w-4 text-sky-500 flex-shrink-0" />}
                            triggerLabel={activeDepartments.includes('all') ? 'Tất cả bộ phận' : activeDepartments.join(', ')}
                            count={activeDepartments.includes('all') ? departmentOptions.length : activeDepartments.length}
                            allLabel="Tất cả bộ phận"
                            allChecked={activeDepartments.includes('all')}
                            onToggleAll={() => toggleDepartment('all')}
                            options={departmentOptions.map(dept => ({
                                key: dept,
                                label: dept,
                                checked: activeDepartments.includes(dept) || activeDepartments.includes('all'),
                            }))}
                            onToggleOption={toggleDepartment}
                        />
                    </div>
                </div>
            </div>



            {/* 3. Tab Switcher — MỘT khung viền duy nhất bọc chung tab switcher + nội dung.
                Card/SectionCard bên trong mỗi tab con (RevenueTab/CrossSellingTab/InstallmentTab/
                CompetitionTab/BonusTab/DetailTab) truyền bordered={false} để không tự vẽ thêm viền
                riêng nữa — tránh viền lồng viền. */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 overflow-hidden rounded-none lg:rounded-2xl shadow-sm">
                <div className="px-4 sm:px-5 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tiêu chí đánh giá hiệu quả</p>
                    <Tabs
                        items={NAV_TABS.map(({ tab, label }) => ({ id: tab, label }))}
                        activeId={activeTab}
                        onChange={(id) => setActiveTab(id as Tab)}
                        variant="underline"
                    />
                </div>

                {visitedTabs.has('revenue') && (
                    <div className={activeTab === 'revenue' ? 'block' : 'hidden'}>
                        <RevenueView rows={revenueRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} departmentNames={effectiveActiveDepartments} performanceChanges={EMPTY_MAP} onViewTrend={NOOP} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} snapshotId={null} setSnapshotId={NOOP} snapshots={EMPTY_ARRAY} handleSaveSnapshot={NOOP} handleDeleteSnapshot={NOOP} supermarketTarget={totalAggregatedTarget} departmentWeights={aggregatedWeights} deptEmployeeCounts={deptEmployeeCounts} employeeInstallmentMap={employeeInstallmentMap} isActive={isActive && activeTab === 'revenue'} bonusData={aggregatedData.bonusData} />
                    </div>
                )}
                {visitedTabs.has('crossSelling') && (
                    <div className={activeTab === 'crossSelling' ? 'block' : 'hidden'}>
                        <CrossSellingTab rows={banKemRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} activeDepartments={effectiveActiveDepartments} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} isActive={isActive && activeTab === 'crossSelling'} />
                    </div>
                )}
                {visitedTabs.has('installment') && (
                    <div className={activeTab === 'installment' ? 'block' : 'hidden'}>
                        <InstallmentTab rows={installmentRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} activeDepartments={effectiveActiveDepartments} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} isActive={isActive && activeTab === 'installment'} />
                    </div>
                )}
                {visitedTabs.has('competition') && (
                    <div className={activeTab === 'competition' ? 'block' : 'hidden'}>
                        <CompetitionTab groupedData={competitionData} allCompetitionsByCriterion={competitionData} selectedCompetitions={selectedCompetitions} setSelectedCompetitions={setSelectedCompetitions} supermarket={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} versions={versions} activeVersionName={activeVersionName} setActiveVersionName={setActiveVersionName} activeCompetitionTab={activeCompetitionTab} setActiveCompetitionTab={setActiveCompetitionTab} onVersionTabClick={handleVersionTabClick} onStartNewVersion={handleStartNewVersion} onCancelNewVersion={handleCancelNewVersion} onSaveVersion={handleSaveVersion} onDeleteVersion={handleDeleteVersion} employeeCompetitionTargets={employeeCompetitionTargets} allEmployees={allEmployees} performanceChanges={EMPTY_MAP} individualViewEmployees={individualViewEmployees} selectedIndividual={selectedIndividual} onSelectIndividual={setSelectedIndividual} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} activeDepartments={effectiveActiveDepartments} revenueRows={revenueRows} installmentRows={installmentRows} banKemRows={banKemRows} bonusData={aggregatedData.bonusData} isActive={isActive && activeTab === 'competition'} />
                    </div>
                )}
                {visitedTabs.has('bonus') && (
                    <div className={activeTab === 'bonus' ? 'block' : 'hidden'}>
                        <BonusView
                            employees={allEmployees}
                            bonusData={aggregatedData.bonusData}
                            revenueRows={revenueRows}
                            supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'}
                            activeSupermarkets={activeSupermarkets}
                            onEmployeeClick={setEditingBonusEmployee}
                            onBatchUpdate={startBatchBonusUpdate}
                            autoBridge={bonusAutoBridge}
                            multiMonthRun={bonusMultiMonthRun}
                            bonusPeriodLabel={aggregatedData.bonusPeriodLabel}
                            onSetBonusPeriodLabel={setBonusPeriodLabel}
                            highlightedEmployees={highlightedEmployees}
                            activeDepartments={effectiveActiveDepartments}
                            isActive={isActive && activeTab === 'bonus'}
                        />
                    </div>
                )}
                {visitedTabs.has('detail') && (
                    <div className={activeTab === 'detail' ? 'block' : 'hidden'}>
                        <DetailTab rawData={aggregatedData.danhSach} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} activeDepartments={effectiveActiveDepartments} hiddenEmployees={hiddenEmployees} isActive={isActive && activeTab === 'detail'} />
                    </div>
                )}
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
