import { useWorker } from "../hooks/useWorker";
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Tab, Employee, Criterion, Version, CompetitionHeader } from '../types/nhanVienTypes';
import RevenueView from './nhanvien/RevenueTab';
import InstallmentTab from './nhanvien/InstallmentTab';
import { BonusView, BonusDataModal } from './nhanvien/BonusTab';
import { CompetitionTab } from './nhanvien/CompetitionTab';
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
import { parseBaseTargetQuyDoi, parseEmployeeCompetitionTargets } from '../services/employeeParser';
import { Tabs } from '../../../components/shared/ui/Tabs';
import { MultiSelectDropdown } from '../../../components/shared/ui/MultiSelectDropdown';
import { useActiveTab } from '../../../contexts/LayoutContext';
import { Button } from '../../../components/shared/ui/Button';
import { standardizeEmployeeName } from '../utils/nhanVienHelpers';
import { MOBILE_GUTTER, TOUCH_TARGET } from '../utils/mobileUi';

const NAV_TABS: { tab: Tab; label: string }[] = [
    { tab: 'revenue', label: 'Doanh thu' },
    { tab: 'installment', label: 'Trả chậm' },
    { tab: 'competition', label: 'Thi đua' },
    { tab: 'bonus', label: 'Thưởng' },
];

interface NhanVienProps {
    isActive?: boolean;
}

export const NhanVien: React.FC<NhanVienProps> = ({ isActive }) => {
    const [activeTab, setActiveTab] = useIndexedDBState<Tab>('nhanvien-active-tab', 'revenue');
    const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(() => new Set<Tab>(['revenue']));
    const pendingSwitchTabRef = useRef<Tab | null>(null);

    // Lắng nghe sự kiện chuyển sub-tab từ bên ngoài (ví dụ bấm nút Tự động Đổ Thưởng từ Auto Sync dock)
    useEffect(() => {
        const handleSwitch = (e: any) => {
            const target = e.detail?.tab as Tab;
            if (target && NAV_TABS.some(t => t.tab === target)) {
                pendingSwitchTabRef.current = target;
                setActiveTab(target);
            }
        };
        window.addEventListener('nhanvien-switch-tab', handleSwitch);
        return () => window.removeEventListener('nhanvien-switch-tab', handleSwitch);
    }, [setActiveTab]);

    // Mặc định luôn mở tab Doanh thu khi người dùng chuyển sang màn hình Nhân viên
    // (trừ khi có sự kiện chuyển tab cụ thể như đổ thưởng đang chờ)
    useEffect(() => {
        if (isActive) {
            if (pendingSwitchTabRef.current) {
                setActiveTab(pendingSwitchTabRef.current);
                pendingSwitchTabRef.current = null;
            } else if (!activeTab) {
                setActiveTab('revenue');
            }
        }
    }, [isActive, activeTab, setActiveTab]);

    // Cache IndexedDB của người dùng cũ có thể còn giữ tab đã bị gỡ (vd 'crossSelling' — tab Bán
    // kèm, xoá 2026-09-10). Ép về Doanh thu thay vì để màn hình trống không hiểu vì sao.
    useEffect(() => {
        if (activeTab && !NAV_TABS.some(t => t.tab === activeTab)) {
            setActiveTab('revenue');
        }
    }, [activeTab, setActiveTab]);

    // Đọc URL param ?sub=... CHỈ lúc mở vào màn hình Nhân viên (deep link). SỬA 2026-10-02: bản đầu phụ thuộc activeTab →
    // bấm đổi tab con thì effect đọc URL (còn tab CŨ) kéo ngược về, effect đồng bộ bên dưới ghi lại → vòng lặp, không đổi
    // được tab (xem chú thích cùng ngày ở Dashboard.tsx).
    // Tab lấy từ URL đang CHỜ có hiệu lực (kho IndexedDB nạp bất đồng bộ có thể chưa nhận giá trị ở lần vẽ kế) — trong lúc
    // chờ, effect đồng bộ bên dưới KHÔNG ghi URL, nếu không nó ghi đè `sub=` của deep link bằng tab cũ (đo 2026-10-02).
    const urlSubPendingRef = useRef<Tab | null>(null);
    const setActiveTabRef = useRef(setActiveTab);
    setActiveTabRef.current = setActiveTab;
    useEffect(() => {
        if (!isActive || typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('tab') === 'employees' && params.get('view') === 'employee') {
            const sub = params.get('sub');
            if (sub && NAV_TABS.some(t => t.tab === sub)) {
                urlSubPendingRef.current = sub as Tab;
                setActiveTabRef.current(sub as Tab);
            }
        }
    }, [isActive]);

    // Đồng bộ URL ?sub=... khi tab Nhân viên thay đổi
    useEffect(() => {
        if (!isActive || typeof window === 'undefined') return;
        const pending = urlSubPendingRef.current;
        if (pending) {
            if (activeTab !== pending) { setActiveTabRef.current(pending); return; }
            urlSubPendingRef.current = null;
        }
        const url = new URL(window.location.href);
        if (url.searchParams.get('tab') === 'employees' && url.searchParams.get('view') === 'employee') {
            let changed = false;
            if (url.searchParams.get('sub') !== activeTab) {
                url.searchParams.set('sub', activeTab);
                changed = true;
            }
            if (url.searchParams.has('mode')) {
                url.searchParams.delete('mode');
                changed = true;
            }
            if (changed) {
                window.history.replaceState(null, '', url.toString());
            }
        }
    }, [isActive, activeTab]);

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
        revenueRows,
        realtimeRevenueRows,
        employeeInstallmentMap,
        allEmployees,
        hiddenEmployees,
        deptEmployeeCounts,
        toggleSupermarket,
        toggleDepartment,
        handleSaveBonus,
        handleSaveBonusBatch,
        handleSaveBonusMonthly,
        handleSaveBonusCompare,
        resolveEmployeeSupermarket,
        setBonusPeriodLabel,
        dataVersion,
        hasAnalysisEmployees,
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
    const bonusMultiMonthRun = useMultiMonthBonusRun(allEmployees, handleSaveBonusMonthly, handleSaveBonusCompare);

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
        if (activeTab !== 'competition' && activeTab !== 'revenue') return;
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
                activeSupermarkets.forEach((sm, idx) => {
                    const baseTarget = parseBaseTargetQuyDoi(summaryLuyKeData, sm);
                    const ratio = smTargets[idx] ?? 130;
                    totalT += baseTarget * (ratio / 100);
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

    const allowedEmployeeNames = useMemo(() => {
        if (!hasAnalysisEmployees) return undefined;
        return new Set(allEmployees.map(e => e.originalName));
    }, [hasAnalysisEmployees, allEmployees]);

    return (
        <ExportOptionsProvider value={exportOptionsContextValue}>
        <div className="space-y-4 sm:space-y-6 relative">


            {/* Title + Filter Toolbar */}
            {/* Khung <main> của Report BI cố ý `p-0` trên điện thoại để BẢNG dùng hết bề ngang
                (BiWrapper.tsx), nhưng hàng tiêu đề ăn theo thì chữ "NHÂN VIÊN" dính sát mép máy,
                trên iPhone trông như bị cắt. Hàng này là chữ + nút nên phải có lề riêng. */}
            <div className={`relative z-50 mb-4 flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-2 pb-2 border-b border-slate-200 dark:border-slate-800 w-full ${MOBILE_GUTTER}`}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg lg:text-2xl font-normal text-slate-700 dark:text-slate-200 uppercase tracking-wide leading-normal py-0.5">
                                Nhân Viên
                            </h2>
                        </div>
                    </div>
                </div>
                <div className="flex flex-none justify-end ml-auto">
                    {/* Nhóm 2 bộ lọc trong 1 pill viền chung, phân cách bằng đường kẻ — đúng chuẩn nhóm nút components/layout/Header.tsx.
                        BUG FIX: KHÔNG dùng overflow-hidden ở đây — panel dropdown của MultiSelectDropdown định vị
                        absolute và xổ xuống NGOÀI khung pill (top-[calc(100%+8px)]), nên overflow-hidden của pill
                        (dù chỉ để bo tròn góc 2 nút) sẽ cắt mất panel, làm dropdown "mở" trong state nhưng không
                        hiện gì để bấm chọn được (user báo cáo thật). */}
                    <div className={`flex flex-row items-center w-auto rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm ${TOUCH_TARGET}`}>
                        {/* `w-auto`: mặc định `w-full` trên điện thoại khiến 2 nút chia ĐỀU khung (~95px mỗi nút)
                            → "Tân Hiệp" bị cắt "Tân…" trong khi nút "All" thừa chỗ (iPhone, 2026-09-28). */}
                        <MultiSelectDropdown
                            className="w-auto border-r border-slate-200 dark:border-slate-700"
                            triggerClassName="rounded-l-full"
                            icon={<AppIcon name="store" size="md" className="text-sky-500" />}
                            triggerLabel={activeSupermarkets.length === supermarkets.length ? 'All' : Array.from(new Set(activeSupermarkets.map(s => shortenSupermarketName(s)))).join(', ')}
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
                            className="w-auto"
                            triggerClassName="rounded-r-full"
                            icon={<AppIcon name="restore" size="md" className="text-sky-500" />}
                            triggerLabel={activeDepartments.includes('all') ? 'All' : activeDepartments.join(', ')}
                            count={activeDepartments.includes('all') ? departmentOptions.length : activeDepartments.length}
                            allLabel="All"
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

            {/* Khi chưa có danh sách nhân viên từ Phân Tích: Yêu cầu người dùng cập nhật */}
            {!hasAnalysisEmployees ? (
                <div className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-8 sm:p-12 text-center space-y-5 shadow-xs">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                        <AppIcon name="users" size="state" />
                    </div>
                    <div className="max-w-md mx-auto space-y-2">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                            Chưa có danh sách nhân viên từ chức năng Phân Tích
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            Danh sách nhân viên chuẩn của hệ thống được quản lý tại chức năng <b>Phân Tích</b>. Vui lòng chuyển sang Phân Tích để cập nhật danh sách nhân viên của bạn.
                        </p>
                    </div>
                    <div className="pt-2">
                        <Button
                            variant="primary"
                            onClick={() => setAppActiveTab('analysis')}
                            className="font-bold text-xs sm:text-sm px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm inline-flex items-center gap-2"
                        >
                            <span>Chuyển đến Phân Tích để cập nhật</span>
                            <AppIcon name="next" size="md" />
                        </Button>
                    </div>
                </div>
            ) : (
                /* 3. Tab Switcher — MỘT khung viền duy nhất bọc chung tab switcher + nội dung */
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 overflow-hidden rounded-none lg:rounded-2xl shadow-sm">
                    <div className="px-4 sm:px-5 pt-3">
                        <Tabs
                            items={NAV_TABS.map(({ tab, label }) => ({ id: tab, label }))}
                            activeId={activeTab}
                            onChange={(id) => setActiveTab(id as Tab)}
                            variant="underline"
                        />
                    </div>

                {visitedTabs.has('revenue') && (
                    <div className={activeTab === 'revenue' ? 'block' : 'hidden'}>
                        <RevenueView rows={revenueRows} realtimeRows={realtimeRevenueRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} activeSupermarkets={activeSupermarkets} departmentNames={effectiveActiveDepartments} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} supermarketTarget={totalAggregatedTarget} departmentWeights={aggregatedWeights} deptEmployeeCounts={deptEmployeeCounts} employeeInstallmentMap={employeeInstallmentMap} isActive={isActive && activeTab === 'revenue'} bonusData={aggregatedData.bonusData} competitionData={competitionData} employeeCompetitionTargets={employeeCompetitionTargets} />
                    </div>
                )}
                {visitedTabs.has('installment') && (
                    <div className={activeTab === 'installment' ? 'block' : 'hidden'}>
                        <InstallmentTab rows={installmentRows} supermarketName={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} activeSupermarkets={activeSupermarkets} activeDepartments={effectiveActiveDepartments} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} isActive={isActive && activeTab === 'installment'} />
                    </div>
                )}
                {visitedTabs.has('competition') && (
                    <div className={activeTab === 'competition' ? 'block' : 'hidden'}>
                        <CompetitionTab groupedData={competitionData} allCompetitionsByCriterion={competitionData} selectedCompetitions={selectedCompetitions} setSelectedCompetitions={setSelectedCompetitions} supermarket={activeSupermarkets.length === 1 ? activeSupermarkets[0] : 'Tổng hợp'} versions={versions} activeVersionName={activeVersionName} setActiveVersionName={setActiveVersionName} activeCompetitionTab={activeCompetitionTab} setActiveCompetitionTab={setActiveCompetitionTab} onVersionTabClick={handleVersionTabClick} onStartNewVersion={handleStartNewVersion} onCancelNewVersion={handleCancelNewVersion} onSaveVersion={handleSaveVersion} onDeleteVersion={handleDeleteVersion} employeeCompetitionTargets={employeeCompetitionTargets} allEmployees={allEmployees} individualViewEmployees={individualViewEmployees} selectedIndividual={selectedIndividual} onSelectIndividual={setSelectedIndividual} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} activeDepartments={effectiveActiveDepartments} revenueRows={revenueRows} installmentRows={installmentRows} bonusData={aggregatedData.bonusData} isActive={isActive && activeTab === 'competition'} />
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
            </div>
            )}

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
