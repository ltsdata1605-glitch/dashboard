import { useWorker } from "../hooks/useWorker";import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArchiveBoxIcon, BuildingStorefrontIcon, UsersIcon } from './Icons';
import { Tab, Employee, Criterion, Version, CompetitionHeader } from '../types/nhanVienTypes';
import RevenueView from './nhanvien/RevenueTab';
import InstallmentTab from './nhanvien/InstallmentTab';
import { BonusView, BonusDataModal } from './nhanvien/BonusTab';
import { CompetitionTab } from './nhanvien/CompetitionTab';
import DetailTab from './nhanvien/DetailTab';
import { shortenSupermarketName } from '../utils/dashboardHelpers';
import { useExportOptions } from '../hooks/useExportOptions';
import ExportOptionsModal from '../../../components/common/ExportOptionsModal';
import { ExportOptionsProvider } from '../contexts/ExportOptionsContext';
import { useNhanVienData } from '../hooks/useNhanVienData';
import { useBonusAutoBridge } from '../hooks/useBonusAutoBridge';
import { useMultiMonthBonusRun } from '../hooks/useMultiMonthBonusRun';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { CompetitionEmployeeRow } from '../utils/nhanVienHelpers';
import * as db from '../utils/db';
import { logAuditEvent } from '../utils/auditTrail';
import { parseBaseTargetQuyDoi, parseEmployeeCompetitionTargets } from '../services/employeeParser';
import { Tabs } from '../../../components/shared/ui/Tabs';
import { MultiSelectDropdown } from '../../../components/shared/ui/MultiSelectDropdown';
import { useActiveTab } from '../../../contexts/LayoutContext';
import { Icon } from '../../../components/common/Icon';
import { Button } from '../../../components/shared/ui/Button';
import { standardizeEmployeeName } from '../utils/nhanVienHelpers';

const NAV_TABS: { tab: Tab; label: string }[] = [
    { tab: 'revenue', label: 'Doanh thu' },
    { tab: 'installment', label: 'Trả góp' },
    { tab: 'competition', label: 'Thi đua' },
    { tab: 'bonus', label: 'Thưởng' },
    { tab: 'detail', label: 'Chi tiết' },
];

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

    // Cache IndexedDB của người dùng cũ có thể còn giữ tab đã bị gỡ (vd 'crossSelling' — tab Bán
    // kèm, xoá 2026-09-10). Ép về Doanh thu thay vì để màn hình trống không hiểu vì sao.
    useEffect(() => {
        if (activeTab && !NAV_TABS.some(t => t.tab === activeTab)) {
            setActiveTab('revenue');
        }
    }, [activeTab, setActiveTab]);

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

    const { setActiveTab: setAppActiveTab } = useActiveTab();
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
        resolveEmployeeSupermarket,
        setBonusPeriodLabel,
        dataVersion,
        hasAnalysisEmployees,
        analysisEmployeesCount,
        loadAnalysisEmployees
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
                    employees: parsed[criterion].employees.filter((emp: CompetitionEmployeeRow) => {
                        if (hiddenSet.has(emp.originalName || '')) return false;
                        if (hasAnalysisEmployees) {
                            const empOrig = emp.originalName || '';
                            const canonical = standardizeEmployeeName(empOrig);
                            return allEmployees.some(e => e.originalName === empOrig || standardizeEmployeeName(e.originalName) === canonical);
                        }
                        return true;
                    })
                };
            });
            setCompetitionData(filteredResult);
        }).catch(err => console.error('[NhanVien] Lỗi parse dữ liệu thi đua:', err));
        return () => { isMounted = false; };
    }, [aggregatedData.thiDua, employeeDepartmentMap, hiddenEmployees, isActive, hasAnalysisEmployees, allEmployees]);

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

    // Version KHÔNG scope theo siêu thị (key lưu trữ dùng chung toàn app) — nếu giữ nguyên
    // activeVersionName khi đổi siêu thị, tab đang "active" có thể tham chiếu tới bộ lọc
    // nhóm thi đua không còn khớp ngữ cảnh siêu thị mới, dễ gây hiểu nhầm "trôi" dữ liệu.
    // Reset về Tổng khi danh sách siêu thị active THỰC SỰ đổi — bỏ qua lần chạy đầu (mount)
    // để không xoá mất lựa chọn đã lưu từ phiên trước khi user chỉ đơn thuần tải lại trang.
    const prevActiveSupermarketsRef = React.useRef(activeSupermarkets);
    useEffect(() => {
        if (prevActiveSupermarketsRef.current !== activeSupermarkets) {
            setActiveVersionName(null);
        }
        prevActiveSupermarketsRef.current = activeSupermarkets;
    }, [activeSupermarkets, setActiveVersionName]);

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
        logAuditEvent({ action: 'competition-version:save', label: `Lưu phiên bản thi đua "${name}"` });
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
            logAuditEvent({ action: 'competition-version:delete', label: `Xoá phiên bản thi đua "${versionToDelete}"` });
            setVersionToDelete(null);
        }
    }, [versionToDelete, setVersions, activeVersionName, setActiveVersionName]);

    const exportOptions = useExportOptions();
    const exportOptionsContextValue = useMemo(
        () => ({ showExportOptions: exportOptions.showExportOptions }),
        [exportOptions.showExportOptions]
    );

    const allowedEmployeeNames = useMemo(() => {
        if (!hasAnalysisEmployees) return undefined;
        return new Set(allEmployees.map(e => e.originalName));
    }, [hasAnalysisEmployees, allEmployees]);

    return (
        <ExportOptionsProvider value={exportOptionsContextValue}>
        <div className="space-y-4 sm:space-y-6 relative">


            {/* Title + Filter Toolbar */}
            <div className="relative z-50 mb-4 flex flex-row items-center justify-between gap-3 pt-2 pb-2 border-b border-slate-200 dark:border-slate-800 w-full">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-sky-600/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <UsersIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight truncate leading-tight">
                                Nhân Viên
                            </h2>
                            {hasAnalysisEmployees && (
                                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    {analysisEmployeesCount} NV từ Phân Tích
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-none justify-end">
                    {/* Nhóm 2 bộ lọc trong 1 pill viền chung, phân cách bằng đường kẻ — đúng chuẩn nhóm nút components/layout/Header.tsx.
                        BUG FIX: KHÔNG dùng overflow-hidden ở đây — panel dropdown của MultiSelectDropdown định vị
                        absolute và xổ xuống NGOÀI khung pill (top-[calc(100%+8px)]), nên overflow-hidden của pill
                        (dù chỉ để bo tròn góc 2 nút) sẽ cắt mất panel, làm dropdown "mở" trong state nhưng không
                        hiện gì để bấm chọn được (user báo cáo thật). */}
                    <div className="flex flex-row items-center w-auto rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <MultiSelectDropdown
                            className="border-r border-slate-200 dark:border-slate-700"
                            icon={<BuildingStorefrontIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-500 flex-shrink-0" />}
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

            {/* Banner hướng dẫn nếu chưa có danh sách nhân viên từ Phân Tích */}
            {!hasAnalysisEmployees && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-200 shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                            <Icon name="alert-triangle" size={5} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold">Chưa có danh sách nhân viên từ chức năng Phân Tích</h4>
                            <p className="text-xs text-amber-700/90 dark:text-amber-300/90 mt-0.5">
                                Để toàn bộ các tab Report BI hiển thị và phân bổ target chính xác trên mọi thiết bị, vui lòng tải dữ liệu tại chức năng <b>Phân Tích</b>.
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setAppActiveTab('analysis')}
                        className="shrink-0 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5 py-1.5 px-3 rounded-lg"
                    >
                        <span>Chuyển đến Phân Tích</span>
                        <Icon name="arrow-right" size={3.5} />
                    </Button>
                </div>
            )}



            {/* 3. Tab Switcher — MỘT khung viền duy nhất bọc chung tab switcher + nội dung.
                Card/SectionCard bên trong mỗi tab con (RevenueTab/InstallmentTab/
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
                        <RevenueView rows={revenueRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} departmentNames={effectiveActiveDepartments} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} supermarketTarget={totalAggregatedTarget} departmentWeights={aggregatedWeights} deptEmployeeCounts={deptEmployeeCounts} employeeInstallmentMap={employeeInstallmentMap} isActive={isActive && activeTab === 'revenue'} bonusData={aggregatedData.bonusData} />
                    </div>
                )}
                {visitedTabs.has('installment') && (
                    <div className={activeTab === 'installment' ? 'block' : 'hidden'}>
                        <InstallmentTab rows={installmentRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} activeDepartments={effectiveActiveDepartments} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} isActive={isActive && activeTab === 'installment'} />
                    </div>
                )}
                {visitedTabs.has('competition') && (
                    <div className={activeTab === 'competition' ? 'block' : 'hidden'}>
                        <CompetitionTab groupedData={competitionData} allCompetitionsByCriterion={competitionData} selectedCompetitions={selectedCompetitions} setSelectedCompetitions={setSelectedCompetitions} supermarket={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} versions={versions} activeVersionName={activeVersionName} setActiveVersionName={setActiveVersionName} activeCompetitionTab={activeCompetitionTab} setActiveCompetitionTab={setActiveCompetitionTab} onVersionTabClick={handleVersionTabClick} onStartNewVersion={handleStartNewVersion} onCancelNewVersion={handleCancelNewVersion} onSaveVersion={handleSaveVersion} onDeleteVersion={handleDeleteVersion} employeeCompetitionTargets={employeeCompetitionTargets} allEmployees={allEmployees} individualViewEmployees={individualViewEmployees} selectedIndividual={selectedIndividual} onSelectIndividual={setSelectedIndividual} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} activeDepartments={effectiveActiveDepartments} revenueRows={revenueRows} installmentRows={installmentRows} banKemRows={banKemRows} bonusData={aggregatedData.bonusData} isActive={isActive && activeTab === 'competition'} />
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
                        <DetailTab rawData={aggregatedData.danhSach} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} activeDepartments={effectiveActiveDepartments} hiddenEmployees={hiddenEmployees} allowedEmployeeNames={allowedEmployeeNames} isActive={isActive && activeTab === 'detail'} />
                    </div>
                )}
            </div>

            {/* BonusDataModal — giữ conditional vì là modal overlay */}
            {editingBonusEmployee && (
                <BonusDataModal
                    employee={editingBonusEmployee}
                    nextEmployee={isBatchBonusMode ? allEmployees[allEmployees.findIndex(e => e.originalName === editingBonusEmployee.originalName) + 1] || null : null}
                    supermarketName={resolveEmployeeSupermarket(editingBonusEmployee.originalName)}
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
