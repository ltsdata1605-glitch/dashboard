
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { resolveIconName } from '../shared/ui/icon/legacyIconNames';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useEmployeeAnalysisLogic } from '../../hooks/useEmployeeAnalysisLogic';
import { useEmployeeAnalysisData } from '../../hooks/useEmployeeAnalysisData';
import { useEmployeeAnalysisTabs } from '../../hooks/useEmployeeAnalysisTabs';
import { SectionHeader } from '../shared/ui/SectionHeader';
import { moTaBoLoc } from '../../utils/moTaBoLoc';
import { SectionCard } from '../shared/ui/SectionCard';
import EmployeeAnalysisTabs from './EmployeeAnalysisTabs';
import EmployeeAnalysisModals from './EmployeeAnalysisModals';
import EmployeeAnalysisContent from './EmployeeAnalysisContent';
import EmployeeAnalysisFilters from './EmployeeAnalysisFilters';
import { getExportFilenamePrefix, sanitizeFilename } from '../../utils/dataUtils';
import { Button } from '../shared/ui/Button';
import { Switch } from '../shared/ui/Switch';
import { registerYcxAutoExportRunner } from '../../services/autoReportExportService';
import type { ContestTableConfig } from '../../types';

export const ICON_OPTIONS = ['bar-chart-3', 'trophy', 'target', 'trending-up', 'star'];

const EmployeeAnalysis: React.FC = React.memo(() => {
    const { 
        openPerformanceModal, 
        handleBatchExport, 
        baseFilteredData, 
        productConfig, 
        handleExport, 
        isExporting 
    } = useDashboardContext();
    
    const [activeTab, setActiveTab] = useState('topSellers');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);
    
    const [isDeptFilterOpen, setIsDeptFilterOpen] = useState(false);
    const deptFilterRef = useRef<HTMLDivElement>(null);

    const defaultTabs = [
        { id: 'topSellers', label: 'Top', icon: 'award', color: 'indigo' },
        { id: 'performanceTable', label: 'Hiệu Suất', icon: 'bar-chart-horizontal', color: 'emerald' },
        { id: 'industryAnalysis', label: 'Khai Thác', icon: 'gantt-chart-square', color: 'amber' },
        { id: 'headToHead', label: '7 Ngày', icon: 'swords', color: 'rose' },
    ];

    // Use Custom Hooks
    const {
        customTabs,
        industryAnalysisTabs: industryAnalysisTables,
        isInitialTabsLoaded,
        modalState,
        setModalState,
        isClosingModal,
        setIsClosingModal,
        handleSaveTab,
        handleSaveTable,
        handleSaveColumn,
        handleDeleteTab,
        handleDeleteTable,
        handleConfirmDeleteColumn,
        handleDeleteColumnDirect,
        handleSaveCustomExploitationTab,
        handleDeleteCustomExploitationTab,
        customExploitationTabs,
        setCustomExploitationTabs,
        efficiencyExploitationTabs,
        setEfficiencyExploitationTabs
    } = useEmployeeAnalysisLogic(activeTab, setActiveTab, defaultTabs);

    const allAvailableTabs = useMemo(() => [
        ...defaultTabs,
        ...customTabs.map(t => ({ id: t.id, label: t.name, icon: t.icon }))
    ], [customTabs]);

    const { visibleTabs, handleToggleTabVisibility } = useEmployeeAnalysisTabs(
        allAvailableTabs, 
        isInitialTabsLoaded, 
        activeTab, 
        setActiveTab
    );

    const {
        allIndustries,
        allSubgroups,
        allManufacturers,
        allDepartments,
        hideZeroRevenue,
        setHideZeroRevenue,
        filteredEmployeeAnalysisData
    } = useEmployeeAnalysisData();

    // Pull warehouse state from global context
    const { filterState, handleFilterChange, uniqueFilterOptions } = useDashboardContext();
    const allWarehouses = uniqueFilterOptions?.kho || [];

    const exportRef = useRef<HTMLDivElement>(null);
    const industryAnalysisTabRef = useRef<HTMLDivElement>(null);

    // --- SAFETY CLEANUP: Fix sticky export state ---
    useEffect(() => {
        if (!isExporting) {
            document.body.classList.remove('is-capturing');
            const hiddenElements = document.querySelectorAll('.hide-on-export');
            hiddenElements.forEach((el) => {
                (el as HTMLElement).style.visibility = '';
                (el as HTMLElement).style.display = '';
            });
        }
    }, [activeTab, isExporting]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (deptFilterRef.current && !deptFilterRef.current.contains(event.target as Node)) {
                setIsDeptFilterOpen(false);
            }
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const renderedDefaultTabs = defaultTabs.filter(t => visibleTabs.has(t.id));
    const renderedCustomTabs = customTabs.filter(t => visibleTabs.has(t.id));

    useEffect(() => {
        if (isClosingModal) {
            setModalState({ type: null });
            setIsClosingModal(false);
        }
    }, [isClosingModal]);

    // Ramp 14 tab bằng palette semantic: 6 họ (sky/emerald/amber/rose/indigo/slate) × 2 tầng
    // sắc độ (nhạt-50/đậm-100) để mỗi tab 1 tông riêng, không trùng.
    const colorThemes = useMemo(() => [
        { header: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400', activeTab: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-b-[2.5px] border-sky-400', row: '', border: '' },
        { header: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', activeTab: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-b-[2.5px] border-emerald-400', row: '', border: '' },
        { header: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', activeTab: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-b-[2.5px] border-amber-400', row: '', border: '' },
        { header: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400', activeTab: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-b-[2.5px] border-rose-400', row: '', border: '' },
        { header: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400', activeTab: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-b-[2.5px] border-sky-400', row: '', border: '' },
        { header: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300', activeTab: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 border-b-[2.5px] border-slate-400', row: '', border: '' },
        { header: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300', activeTab: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border-b-[2.5px] border-sky-500', row: '', border: '' },
        { header: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300', activeTab: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-b-[2.5px] border-emerald-500', row: '', border: '' },
        { header: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300', activeTab: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-b-[2.5px] border-amber-500', row: '', border: '' },
        { header: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300', activeTab: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-b-[2.5px] border-rose-500', row: '', border: '' },
        { header: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300', activeTab: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border-b-[2.5px] border-sky-500', row: '', border: '' },
        { header: 'bg-slate-200 text-slate-700 dark:bg-slate-600/40 dark:text-slate-200', activeTab: 'bg-slate-200 text-slate-700 dark:bg-slate-600/40 dark:text-slate-200 border-b-[2.5px] border-slate-500', row: '', border: '' },
        { header: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400', activeTab: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-b-[2.5px] border-sky-400', row: '', border: '' },
        { header: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', activeTab: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-b-[2.5px] border-emerald-400', row: '', border: '' },
    ], []);

    const handleMainExport = React.useCallback(async () => {
        if (exportRef.current) {
            const prefix = getExportFilenamePrefix(filterState.kho);
            const tabName = defaultTabs.find(t => t.id === activeTab)?.label || 
                            customTabs.find(t => t.id === activeTab)?.name || 
                            activeTab;
            // Giữ nguyên dấu tiếng Việt cho tên file, chỉ chặn ký tự không hợp lệ trên hệ điều hành
            const safeTabName = sanitizeFilename(tabName).trim();
            const filename = `${prefix} - Phân Tích Nhân Viên - ${safeTabName}.png`;
            const compactTabs = ['performanceTable', 'headToHead', 'summarySynthesis', 'industryAnalysis'];
            const isCustomTab = !defaultTabs.find(t => t.id === activeTab);
            const options = (compactTabs.includes(activeTab) || isCustomTab) ? { isCompactTable: true, fitAllColumns: true } : {};
            await handleExport(exportRef.current, filename, options);
        }
    }, [activeTab, filterState.kho, handleExport, customTabs]);

    const handleIndustryTabExport = React.useCallback(async () => {
         if (industryAnalysisTabRef.current) {
            const prefix = getExportFilenamePrefix(filterState.kho);
            const filename = `${prefix} - Phân Tích Nhân Viên - Khai Thác.png`;
            await handleExport(industryAnalysisTabRef.current, filename, { isCompactTable: true, fitAllColumns: true });
        }
    }, [filterState.kho, handleExport]);

    useEffect(() => {
        return registerYcxAutoExportRunner('Phân Tích Nhân Viên', async () => {
            if (!exportRef.current) return null;
            const prefix = getExportFilenamePrefix(filterState.kho);
            const tabName = defaultTabs.find(t => t.id === activeTab)?.label || 
                            customTabs.find(t => t.id === activeTab)?.name || 
                            activeTab;
            const safeTabName = sanitizeFilename(tabName).trim();
            const filename = `${prefix} - Phân Tích Nhân Viên - ${safeTabName}.png`;
            const compactTabs = ['performanceTable', 'headToHead', 'summarySynthesis', 'industryAnalysis'];
            const isCustomTab = !defaultTabs.find(t => t.id === activeTab);
            const options = (compactTabs.includes(activeTab) || isCustomTab) ? { isCompactTable: true, fitAllColumns: true, mode: 'blob-only' as const } : { mode: 'blob-only' as const };
            const res = await handleExport(exportRef.current, filename, options);
            return (res instanceof Blob) ? res : null;
        });
    }, [activeTab, defaultTabs, customTabs, filterState.kho, handleExport]);

    // Nhánh 'industryAnalysis' tra cứu trong industryAnalysisTables (CustomContestTab[], không phải ContestTableConfig[])
    // — không có setModalState nào thực sự gán tabId này, giữ nguyên hành vi cũ bằng cast an toàn qua unknown.
    const currentTableForColumns: ContestTableConfig | undefined = modalState.type === 'CREATE_COLUMN' || modalState.type === 'EDIT_COLUMN'
        ? (modalState.data?.tabId === 'industryAnalysis'
            ? (industryAnalysisTables.find(t => t.id === modalState.data?.tableId) as unknown as ContestTableConfig | undefined)
            : customTabs.find(t => t.id === modalState.data?.tabId)?.tables.find(t => t.id === modalState.data?.tableId)
          )
        : undefined;

    return (
        <SectionCard className="mb-8 flex flex-col flex-grow lg:rounded-none">
            {/* BEGIN: Header Section */}
            <SectionHeader
                title="PHÂN TÍCH NHÂN VIÊN"
                titleClassName="type-headline font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate leading-tight"
                subtitle={moTaBoLoc(filterState, { boPhan: true })}
            >
                <div className="flex items-center gap-2 lg:gap-1.5 hide-on-export">
                    <EmployeeAnalysisFilters 
                        hideZeroRevenue={hideZeroRevenue}
                        setHideZeroRevenue={setHideZeroRevenue}
                    />
                    <div ref={settingsRef} className="relative">
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => setIsSettingsOpen(prev => !prev)} 
                            title="Tùy chọn hiển thị" 
                            className="ycx-hit flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <AppIcon name="settings" size="md" />
                        </Button>
                        {isSettingsOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 sm:w-72 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl p-2 sm:p-3 border border-slate-100 dark:border-slate-700 z-[200]">
                                <h4 className="font-bold text-xs sm:text-sm mb-2 sm:mb-3 px-1.5 sm:px-2 pt-0.5 sm:pt-1 text-slate-800 dark:text-slate-100">Hiển thị màn hình thi đua</h4>
                                <div className="space-y-1 sm:space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                                    {allAvailableTabs.map(tab => (
                                        <label key={tab.id} htmlFor={`vis-toggle-${tab.id}`} className="flex items-center justify-between cursor-pointer p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                            <span className="text-[11px] sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 sm:gap-2">
                                                <div className="p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md sm:rounded-lg text-slate-500">
                                                    <AppIcon name={resolveIconName(tab.icon) ?? 'help'} size="sm" />
                                                </div>
                                                {tab.label}
                                            </span>
                                            <Switch size="sm" id={`vis-toggle-${tab.id}`} checked={visibleTabs.has(tab.id)} onChange={() => handleToggleTabVisibility(tab.id)} label={tab.label} />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </SectionHeader>
            {/* END: Header Section */}
            
            <div className="hide-on-export">
            <EmployeeAnalysisTabs
                renderedDefaultTabs={renderedDefaultTabs}
                renderedCustomTabs={renderedCustomTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                setModalState={setModalState}
                visibleTabs={visibleTabs}
                handleToggleTabVisibility={handleToggleTabVisibility}
                allAvailableTabs={allAvailableTabs}
            />
            </div>
            
            <div className="flex-grow p-1.5 sm:p-6">
                <EmployeeAnalysisContent
                    activeTab={activeTab}
                    filteredEmployeeAnalysisData={filteredEmployeeAnalysisData}
                    isInitialTabsLoaded={isInitialTabsLoaded}
                    industryAnalysisTables={industryAnalysisTables}
                    customTabs={customTabs}
                    customExploitationTabs={customExploitationTabs}
                    setCustomExploitationTabs={setCustomExploitationTabs}
                    efficiencyExploitationTabs={efficiencyExploitationTabs}
                    setEfficiencyExploitationTabs={setEfficiencyExploitationTabs}
                    baseFilteredData={filteredEmployeeAnalysisData?.filteredBaseData || baseFilteredData}
                    allDatesBaseFilteredData={baseFilteredData}
                    productConfig={productConfig}
                    isExporting={isExporting}
                    handleMainExport={handleMainExport}
                    handleIndustryTabExport={handleIndustryTabExport}
                    handleBatchExport={handleBatchExport}
                    openPerformanceModal={openPerformanceModal}
                    setModalState={setModalState}
                    exportRef={exportRef}
                    industryAnalysisTabRef={industryAnalysisTabRef}
                    colorThemes={colorThemes}
                    defaultTabs={defaultTabs}
                    handleDeleteColumnDirect={handleDeleteColumnDirect}
                />
            </div>
            
            <EmployeeAnalysisModals
                modalState={modalState}
                setModalState={setModalState}
                handleSaveTab={handleSaveTab}
                handleSaveTable={handleSaveTable}
                handleSaveColumn={handleSaveColumn}
                handleDeleteTab={handleDeleteTab}
                handleDeleteTable={handleDeleteTable}
                handleConfirmDeleteColumn={handleConfirmDeleteColumn}
                handleSaveCustomExploitationTab={handleSaveCustomExploitationTab}
                handleDeleteCustomExploitationTab={handleDeleteCustomExploitationTab}
                allIndustries={allIndustries}
                allSubgroups={allSubgroups}
                allManufacturers={allManufacturers}
                currentTableForColumns={currentTableForColumns}
            />
        </SectionCard>
    );
});

EmployeeAnalysis.displayName = 'EmployeeAnalysis';

export default React.memo(EmployeeAnalysis);
