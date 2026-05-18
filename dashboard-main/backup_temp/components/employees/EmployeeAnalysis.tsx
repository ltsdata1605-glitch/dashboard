
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
        industryAnalysisTables,
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
        handleDeleteColumnDirect
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
        { header: 'bg-primary-100 dark:bg-primary-900/50 text-primary-900 dark:text-primary-200', row: 'bg-primary-100/50 dark:bg-primary-900/30', border: 'border-primary-500' },
        { header: 'bg-primary-100 dark:bg-primary-900/50 text-primary-900 dark:text-primary-200', row: 'bg-primary-100/50 dark:bg-primary-900/30', border: 'border-primary-500' },
        { header: 'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200', row: 'bg-purple-100/50 dark:bg-purple-900/30', border: 'border-purple-500' },
        { header: 'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200', row: 'bg-amber-100/50 dark:bg-amber-900/30', border: 'border-amber-500' },
        { header: 'bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-200', row: 'bg-rose-100/50 dark:bg-rose-900/30', border: 'border-rose-500' },
        { header: 'bg-violet-100 dark:bg-violet-900/50 text-violet-900 dark:text-violet-200', row: 'bg-violet-100/50 dark:bg-violet-900/30', border: 'border-violet-500' },
        { header: 'bg-primary-100 dark:bg-primary-900/50 text-primary-900 dark:text-primary-200', row: 'bg-primary-100/50 dark:bg-primary-900/30', border: 'border-primary-500' },
        { header: 'bg-primary-100 dark:bg-primary-900/50 text-primary-900 dark:text-primary-200', row: 'bg-primary-100/50 dark:bg-primary-900/30', border: 'border-primary-500' },
        { header: 'bg-pink-100 dark:bg-pink-900/50 text-pink-900 dark:text-pink-200', row: 'bg-pink-100/50 dark:bg-pink-900/30', border: 'border-pink-500' },
        { header: 'bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-900 dark:text-fuchsia-200', row: 'bg-fuchsia-100/50 dark:bg-fuchsia-900/30', border: 'border-fuchsia-500' },
        { header: 'bg-sky-100 dark:bg-sky-900/50 text-sky-900 dark:text-sky-200', row: 'bg-sky-100/50 dark:bg-sky-900/30', border: 'border-sky-500' },
    ], []);

    const handleMainExport = async () => {
        if (exportRef.current) {
            const filename = `phan-tich-nhan-vien-${activeTab}.png`;
            const compactTabs = ['performanceTable', 'headToHead', 'summarySynthesis', 'industryAnalysis'];
            const isCustomTab = !defaultTabs.find(t => t.id === activeTab);
            const options = (compactTabs.includes(activeTab) || isCustomTab) ? { isCompactTable: true } : {};
            await handleExport(exportRef.current, filename, options);
        }
    };

    const handleIndustryTabExport = async () => {
         if (industryAnalysisTabRef.current) {
            const filename = `phan-tich-nhan-vien-industryAnalysis.png`;
            await handleExport(industryAnalysisTabRef.current, filename, { isCompactTable: true });
        }
    };

    const currentTableForColumns = modalState.type === 'CREATE_COLUMN' || modalState.type === 'EDIT_COLUMN'
        ? (modalState.data.tabId === 'industryAnalysis' 
            ? industryAnalysisTables.find(t => t.id === modalState.data.tableId) 
            : customTabs.find(t => t.id === modalState.data.tabId)?.tables.find(t => t.id === modalState.data.tableId)
          )
        : undefined;

    return (
        <div className="bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 rounded-none mb-8 flex flex-col flex-grow transition-all duration-300">
            {/* BEGIN: Header Section */}
            <SectionHeader
                title={(
                    <div className="flex flex-col">
                        <span>Phân tích nhân viên</span>
                        <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                            {(filterState.kho.length > 0 && !filterState.kho.includes('all')) ? `KHO: ${filterState.kho.join(', ')} | ` : ''} 
                            {(filterState.xuat !== 'all') ? `TRẠNG THÁI XUẤT: ${filterState.xuat} | ` : ''}
                            {(filterState.department && filterState.department.length > 0) ? `BỘ PHẬN: ${filterState.department.join(', ')} | ` : ''}
                            {filterState.dateRange !== 'all' ? `TỪ ${filterState.startDate.split('T')[0].split('-').reverse().join('/')} ĐẾN ${filterState.endDate.split('T')[0].split('-').reverse().join('/')}` : 'TẤT CẢ THỜI GIAN'}
                        </span>
                    </div>
                ) as any}
                icon="users"
                subtitle=""
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
                            className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Icon name="settings-2" size={5}/>
                        </button>
                        {isSettingsOpen && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-3 border border-slate-100 dark:border-slate-700 z-[200]">
                                <h4 className="font-bold text-sm mb-3 px-2 pt-1 text-slate-800 dark:text-slate-100">Hiển thị màn hình thi đua</h4>
                                <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                                    {allAvailableTabs.map(tab => (
                                        <label key={tab.id} htmlFor={`vis-toggle-${tab.id}`} className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
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
                                                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-500"></div>
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
            
            <div className="flex-grow p-6">
                <EmployeeAnalysisContent
                    activeTab={activeTab}
                    filteredEmployeeAnalysisData={filteredEmployeeAnalysisData}
                    isInitialTabsLoaded={isInitialTabsLoaded}
                    industryAnalysisTables={industryAnalysisTables}
                    customTabs={customTabs}
                    baseFilteredData={filteredEmployeeAnalysisData?.filteredBaseData || baseFilteredData}
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
