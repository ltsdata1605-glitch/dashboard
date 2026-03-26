
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useEmployeeAnalysisLogic } from '../../hooks/useEmployeeAnalysisLogic';
import { useEmployeeAnalysisData } from '../../hooks/useEmployeeAnalysisData';
import { useEmployeeAnalysisTabs } from '../../hooks/useEmployeeAnalysisTabs';
import { Icon } from '../common/Icon';
import EmployeeAnalysisTabs from './EmployeeAnalysisTabs';
import EmployeeAnalysisModals from './EmployeeAnalysisModals';
import EmployeeAnalysisContent from './EmployeeAnalysisContent';

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
    const [isWarehouseFilterOpen, setIsWarehouseFilterOpen] = useState(false);
    const warehouseFilterRef = useRef<HTMLDivElement>(null);

    const defaultTabs = [
        { id: 'topSellers', label: 'Top', icon: 'award' },
        { id: 'performanceTable', label: 'Hiệu Suất', icon: 'bar-chart-horizontal' },
        { id: 'industryAnalysis', label: 'Khai Thác', icon: 'gantt-chart-square' },
        { id: 'headToHead', label: '7 Ngày', icon: 'swords' },
        { id: 'summarySynthesis', label: 'Tổng Hợp', icon: 'sigma' },
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
        handleConfirmDeleteColumn
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
        allWarehouses,
        selectedDepartments,
        setSelectedDepartments,
        selectedWarehouses,
        setSelectedWarehouses,
        deptSearchTerm,
        setDeptSearchTerm,
        warehouseSearchTerm,
        setWarehouseSearchTerm,
        filteredEmployeeAnalysisData
    } = useEmployeeAnalysisData();

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
            if (warehouseFilterRef.current && !warehouseFilterRef.current.contains(event.target as Node)) {
                setIsWarehouseFilterOpen(false);
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
            <header className="px-6 py-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 flex items-center justify-center shadow-sm">
                        <Icon name="users" size={6} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white uppercase">Phân tích nhân viên</h1>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Đánh giá hiệu quả khai thác và thi đua</p>
                    </div>
                </div>
            </header>
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
                isSettingsOpen={isSettingsOpen}
                setIsSettingsOpen={setIsSettingsOpen}
                settingsRef={settingsRef}
                // Pass filter props to tabs
                allWarehouses={allWarehouses}
                selectedWarehouses={selectedWarehouses}
                setSelectedWarehouses={setSelectedWarehouses}
                warehouseSearchTerm={warehouseSearchTerm}
                setWarehouseSearchTerm={setWarehouseSearchTerm}
                isWarehouseFilterOpen={isWarehouseFilterOpen}
                setIsWarehouseFilterOpen={setIsWarehouseFilterOpen}
                warehouseFilterRef={warehouseFilterRef}
                allDepartments={allDepartments}
                selectedDepartments={selectedDepartments}
                setSelectedDepartments={setSelectedDepartments}
                deptSearchTerm={deptSearchTerm}
                setDeptSearchTerm={setDeptSearchTerm}
                isDeptFilterOpen={isDeptFilterOpen}
                setIsDeptFilterOpen={setIsDeptFilterOpen}
                deptFilterRef={deptFilterRef}
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
