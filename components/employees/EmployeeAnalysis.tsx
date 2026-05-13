
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useEmployeeAnalysisLogic } from '../../hooks/useEmployeeAnalysisLogic';
import { useEmployeeAnalysisData } from '../../hooks/useEmployeeAnalysisData';
import { useEmployeeAnalysisTabs } from '../../hooks/useEmployeeAnalysisTabs';
import { Icon } from '../common/Icon';
import { SectionHeader } from '../common/SectionHeader';
import EmployeeAnalysisTabs from './EmployeeAnalysisTabs';
import EmployeeAnalysisModals from './EmployeeAnalysisModals';
import EmployeeAnalysisContent from './EmployeeAnalysisContent';
import EmployeeAnalysisFilters from './EmployeeAnalysisFilters';
import { getExportFilenamePrefix } from '../../utils/dataUtils';

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

    const colorThemes = useMemo(() => [
        { header: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', activeTab: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-b-[2.5px] border-emerald-400', row: '', border: '' },
        { header: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400', activeTab: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-b-[2.5px] border-sky-400', row: '', border: '' },
        { header: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', activeTab: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-b-[2.5px] border-amber-400', row: '', border: '' },
        { header: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400', activeTab: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border-b-[2.5px] border-violet-400', row: '', border: '' },
        { header: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400', activeTab: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-b-[2.5px] border-rose-400', row: '', border: '' },
        { header: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400', activeTab: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 border-b-[2.5px] border-teal-400', row: '', border: '' },
        { header: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400', activeTab: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-b-[2.5px] border-indigo-400', row: '', border: '' },
        { header: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-400', activeTab: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 border-b-[2.5px] border-fuchsia-400', row: '', border: '' },
        { header: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400', activeTab: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-b-[2.5px] border-orange-400', row: '', border: '' },
        { header: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400', activeTab: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border-b-[2.5px] border-cyan-400', row: '', border: '' },
        { header: 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400', activeTab: 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400 border-b-[2.5px] border-pink-400', row: '', border: '' },
        { header: 'bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400', activeTab: 'bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400 border-b-[2.5px] border-lime-400', row: '', border: '' },
        { header: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400', activeTab: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-b-[2.5px] border-purple-400', row: '', border: '' },
        { header: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400', activeTab: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-b-[2.5px] border-blue-400', row: '', border: '' },
    ], []);

    const handleMainExport = async () => {
        if (exportRef.current) {
            const prefix = getExportFilenamePrefix(filterState.kho);
            const tabName = defaultTabs.find(t => t.id === activeTab)?.label || 
                            customTabs.find(t => t.id === activeTab)?.name || 
                            activeTab;
            // Xóa dấu tiếng Việt và thay khoảng trắng thành gạch ngang cho tên file
            const safeTabName = tabName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');
            const filename = `${prefix}-Phan-tich-nhan-vien-${safeTabName}.png`;
            const compactTabs = ['performanceTable', 'headToHead', 'summarySynthesis', 'industryAnalysis'];
            const isCustomTab = !defaultTabs.find(t => t.id === activeTab);
            const options = (compactTabs.includes(activeTab) || isCustomTab) ? { isCompactTable: true, fitAllColumns: true } : {};
            await handleExport(exportRef.current, filename, options);
        }
    };

    const handleIndustryTabExport = async () => {
         if (industryAnalysisTabRef.current) {
            const prefix = getExportFilenamePrefix(filterState.kho);
            const filename = `${prefix}-Phan-tich-nhan-vien-Khai-thac.png`;
            await handleExport(industryAnalysisTabRef.current, filename, { isCompactTable: true, fitAllColumns: true });
        }
    };

    const currentTableForColumns = modalState.type === 'CREATE_COLUMN' || modalState.type === 'EDIT_COLUMN'
        ? (modalState.data.tabId === 'industryAnalysis' 
            ? industryAnalysisTables.find(t => t.id === modalState.data.tableId) 
            : customTabs.find(t => t.id === modalState.data.tabId)?.tables.find(t => t.id === modalState.data.tableId)
          )
        : undefined;

    return (
        <div className="bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-y sm:border border-slate-100 dark:border-slate-800 rounded-none mb-8 flex flex-col flex-grow transition-all duration-300">
            {/* BEGIN: Header Section */}
            <SectionHeader
                title={(
                    <div className="flex flex-col">
                        <span>Phân tích nhân viên</span>
                        <span className="text-[10px] lg:text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                            {(filterState.kho.length > 0 && !filterState.kho.includes('all')) ? `KHO: ${filterState.kho.join(', ')} | ` : ''} 
                            {(filterState.xuat !== 'all') ? `TRẠNG THÁI XUẤT: ${filterState.xuat} | ` : ''}
                            {(filterState.department && filterState.department.length > 0) ? `BỘ PHẬN: ${filterState.department.join(', ')} | ` : ''}
                            {filterState.dateRange !== 'all' ? `TỪ ${filterState.startDate.split('T')[0].split('-').reverse().join('/')} ĐẾN ${filterState.endDate.split('T')[0].split('-').reverse().join('/')}` : 'TẤT CẢ THỜI GIAN'}
                        </span>
                    </div>
                ) as any}
                icon="users"

            >
                <div className="flex items-center gap-2 hide-on-export">
                    <EmployeeAnalysisFilters 
                        hideZeroRevenue={hideZeroRevenue}
                        setHideZeroRevenue={setHideZeroRevenue}
                    />
                    <div ref={settingsRef} className="relative">
                        <button 
                            onClick={() => setIsSettingsOpen(prev => !prev)} 
                            title="Tùy chọn hiển thị" 
                            className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Icon name="settings-2" size={4} className="sm:hidden"/>
                            <Icon name="settings-2" size={5} className="hidden sm:block"/>
                        </button>
                        {isSettingsOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 sm:w-72 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl p-2 sm:p-3 border border-slate-100 dark:border-slate-700 z-[200]">
                                <h4 className="font-bold text-xs sm:text-sm mb-2 sm:mb-3 px-1.5 sm:px-2 pt-0.5 sm:pt-1 text-slate-800 dark:text-slate-100">Hiển thị màn hình thi đua</h4>
                                <div className="space-y-1 sm:space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                                    {allAvailableTabs.map(tab => (
                                        <label key={tab.id} htmlFor={`vis-toggle-${tab.id}`} className="flex items-center justify-between cursor-pointer p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                            <span className="text-[11px] sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 sm:gap-2">
                                                <div className="p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md sm:rounded-lg text-slate-500">
                                                    <Icon name={tab.icon} size={3.5}/>
                                                </div>
                                                {tab.label || (tab as any).name}
                                            </span>
                                            <div className="relative inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={visibleTabs.has(tab.id)}
                                                    onChange={() => handleToggleTabVisibility(tab.id)}
                                                    className="sr-only peer"
                                                    id={`vis-toggle-${tab.id}`}
                                                />
                                                <div className="w-8 h-[18px] sm:w-9 sm:h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-[14px] sm:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 sm:after:h-4 sm:after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-500"></div>
                                            </div>
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
        </div>
    );
});

EmployeeAnalysis.displayName = 'EmployeeAnalysis';

export default EmployeeAnalysis;
