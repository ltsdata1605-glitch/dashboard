
import React, { useState, useEffect, useRef } from 'react';
import { useDashboardLogic } from '../../hooks/useDashboardLogic';
import type { VisibilityState } from '../../types';
import { DashboardContext } from '../../contexts/DashboardContext';

import Header from '../layout/Header';
import Footer from '../layout/Footer';
import LandingPageView from './LandingPageView';
import StatusDisplay from '../upload/StatusDisplay';
import FilterSection from '../filters/FilterSection';
import KpiCards from '../kpis/KpiCards';
import TrendChart from '../charts/TrendChart';
import IndustryGrid from '../charts/IndustryGrid';
import EmployeeAnalysis from '../employees/EmployeeAnalysis';
import SummaryTable from '../tables/SummaryTable';
import WarehouseSummary from '../summary/WarehouseSummary';
import PerformanceModal from '../modals/PerformanceModal';
import UnshippedOrdersModal from '../modals/UnshippedOrdersModal';
import ProcessingLoader from '../common/ProcessingLoader';
import ExportLoader from '../common/ExportLoader';
import ChangelogModal from '../modals/ChangelogModal';
import { SectionHeader } from '../common/SectionHeader';
import { Icon } from '../common/Icon';
import { KpiCardsSkeleton, ChartSkeleton, TableSkeleton, TabbedTableSkeleton } from '../common/SkeletonLoader';
import { DebugPanel } from '../common/DebugPanel';

const defaultVisibilityState: VisibilityState = {
    trendChart: false,
    industryGrid: true,
    employeeAnalysis: true,
    summaryTable: true,
};

const debugInitialData = {
    Header: { name: "Khu vực Header (Header.tsx)", description: "...", design: "..." },
    FilterSection: { name: "Slide Menu Bộ lọc (FilterSection.tsx)", description: "...", design: "..." },
    WarehouseSummary: { name: "Bảng tóm tắt theo kho (WarehouseSummary.tsx)", description: "...", design: "..." },
    KpiCards: { name: "Các thẻ chỉ số KPI (KpiCards.tsx)", description: "...", design: "..." },
    TrendChart: { name: "Biểu đồ Xu hướng Doanh thu (TrendChart.tsx)", description: "...", design: "..." },
    IndustryGrid: { name: "Lưới/Biểu đồ Tỷ trọng Ngành hàng (IndustryGrid.tsx)", description: "...", design: "..." },
    EmployeeAnalysis: { name: "Phân tích Hiệu suất Nhân viên (EmployeeAnalysis.tsx)", description: "...", design: "..." },
    SummaryTable: { name: "Bảng Chi tiết Ngành hàng (SummaryTable.tsx)", description: "...", design: "..." },
};

export default function DashboardView() {
    const logic = useDashboardLogic();
    const {
        status, appState, isProcessing, isClearingDepartments, isExporting, fileInfo,
        departmentMap, processedData,
        configUrl, setConfigUrl, uniqueFilterOptions,
        activeModal, setActiveModal, modalData,
        handleClearDepartments, handleClearData, handleShiftFileProcessing, handleFileProcessing,
        openUnshippedModal, handleExport, handleBatchKhoExport,
        filterState,
        isDeduplicationEnabled,
        handleDeduplicationChange,
        processingTime,
        handleFilterChange
    } = logic;

    const [visibleComponents, setVisibleComponents] = useState<VisibilityState>(() => {
        try {
            const saved = localStorage.getItem('dashboard_visibleComponents');
            return saved ? JSON.parse(saved) : defaultVisibilityState;
        } catch (e) {
            return defaultVisibilityState;
        }
    });

    const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
    const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(false);
    const [isInspectorActive, setIsInspectorActive] = useState(false);
    const [debugInfo, setDebugInfo] = useState<any | null>(null);

    const dashboardContainerRef = useRef<HTMLDivElement>(null);
    const businessOverviewRef = useRef<HTMLDivElement>(null);
    const mainFileInputRef = useRef<HTMLInputElement>(null);
    const shiftFileInputRef = useRef<HTMLInputElement>(null);

    const handleNewFileClick = () => mainFileInputRef.current?.click();
    const handleShiftFileClick = () => shiftFileInputRef.current?.click();
    
    const handleVisibilityChange = (component: keyof VisibilityState, isVisible: boolean) => {
        setVisibleComponents(prev => {
            const newState = { ...prev, [component]: isVisible };
            localStorage.setItem('dashboard_visibleComponents', JSON.stringify(newState));
            return newState;
        });
    };

    const handleBusinessOverviewExport = async () => {
        if (businessOverviewRef.current) {
            await handleExport(businessOverviewRef.current, 'tong-quan-kinh-doanh.png', {
                captureAsDisplayed: false,
                isCompactTable: true,
                forcedWidth: 700, 
            });
        }
    };

    useEffect(() => {
        document.body.classList.remove('is-capturing');
        document.querySelectorAll('.hide-on-export').forEach((el) => {
            (el as HTMLElement).style.visibility = '';
            (el as HTMLElement).style.display = '';
        });
    }, [appState]);

    useEffect(() => {
        const handleInspectClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            let target = e.target as HTMLElement | null;
            while(target && !target.hasAttribute('data-debug-id')) {
                target = target.parentElement;
            }

            if (target) {
                const infoString = target.getAttribute('data-debug-info');
                if (infoString) {
                    try {
                        const info = JSON.parse(infoString);
                        setDebugInfo(info);
                    } catch (err) {
                        console.error("Failed to parse debug info JSON:", err);
                        setDebugInfo({ name: "Lỗi", description: "Không thể đọc thông tin gỡ lỗi.", design: "Kiểm tra console để biết chi tiết." });
                    }
                }
            } else {
                 setDebugInfo(null);
            }
        };

        if (isInspectorActive) {
            document.body.classList.add('inspector-active');
            document.addEventListener('click', handleInspectClick, { capture: true });
        } else {
            document.body.classList.remove('inspector-active');
        }

        return () => {
            document.body.classList.remove('inspector-active');
            document.removeEventListener('click', handleInspectClick, { capture: true });
        };
    }, [isInspectorActive]);


    useEffect(() => {
        // Lucide icon initialization is now handled by the Icon component using lucide-react
    }, [appState, processedData, activeModal, isExporting, isDebugPanelVisible, uniqueFilterOptions, isProcessing, filterState, isFilterSidebarOpen]);
    
    const showDashboard = appState === 'dashboard' && processedData;
    const showProcessingOverlay = appState === 'loading' || (appState === 'processing' && !processedData);
    const showLanding = appState === 'upload' || showProcessingOverlay;

    return (
        <div className="w-full">
            <div className="max-w-[1200px] mx-auto p-4 md:p-6 lg:p-8 w-full">
                <input type="file" ref={mainFileInputRef} className="hidden" accept=".xlsx, .xls" onChange={(e) => e.target.files?.[0] && handleFileProcessing(e.target.files[0])} />
                <input type="file" ref={shiftFileInputRef} className="hidden" accept=".xlsx, .xls" multiple onChange={(e) => e.target.files?.length && handleShiftFileProcessing(Array.from(e.target.files))} />

                <Header 
                    onNewFile={handleNewFileClick} 
                    onLoadShiftFile={handleShiftFileClick} 
                    onClearDepartments={handleClearDepartments} 
                    isClearingDepartments={isClearingDepartments} 
                    hasDepartmentData={!!departmentMap} 
                    showNewFileButton={appState === 'dashboard'} 
                    onClearData={handleClearData} 
                    fileInfo={fileInfo}
                    onToggleFilters={() => setIsFilterSidebarOpen(true)}
                />
                
                {status.message && status.type === 'error' && <StatusDisplay status={status} />}
                
                {showLanding && (
                    <LandingPageView 
                        onProcessFile={handleFileProcessing} 
                        configUrl={configUrl} 
                        onConfigUrlChange={setConfigUrl}
                        isDeduplicationEnabled={isDeduplicationEnabled}
                        onDeduplicationChange={handleDeduplicationChange}
                    />
                )}
                
                {showProcessingOverlay && <ProcessingLoader status={status} processingTime={processingTime} />}
                
                <DashboardContext.Provider value={logic as any}>
                    {showDashboard && (
                        <>
                            <main id="dashboard-container" className="pb-20 md:pb-0" ref={dashboardContainerRef}>
                                <div className="container mx-auto px-4 py-4 space-y-6">
                                    {processedData.warehouseSummary && processedData.warehouseSummary.length > 0 && (
                                        <div data-debug-id="WarehouseSummary" data-debug-info={JSON.stringify(debugInitialData.WarehouseSummary)}>
                                            <WarehouseSummary onBatchExport={handleBatchKhoExport} />
                                        </div>
                                    )}
                                    
                                    <div ref={businessOverviewRef} id="business-overview" className="space-y-8">
                                        <div className="bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 overflow-hidden">
                                            <SectionHeader 
                                                title="TỔNG QUAN DOANH THU" 
                                                icon="bar-chart-3" 
                                                subtitle={processedData.reportSubTitle}
                                            >
                                                <div className="flex items-center gap-2 hide-on-export">
                                                    {/* Apple-style Toolbar for Kho Tạo */}
                                                    <div className="hidden md:flex max-w-[300px] lg:max-w-[400px] overflow-x-auto hide-scrollbar mr-2">
                                                        <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                                            {['all', ...(uniqueFilterOptions?.kho || [])].map(val => (
                                                                <button 
                                                                    key={val}
                                                                    onClick={() => handleFilterChange({ kho: val })}
                                                                    className={`py-1 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filterState.kho === val ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'text-slate-500 hover:text-indigo-600'}`}
                                                                >
                                                                    {val === 'all' ? 'Tất cả kho' : val}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <button onClick={handleBusinessOverviewExport} disabled={isExporting} title="Xuất Ảnh Tổng Quan" className="p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                        <Icon name="camera" size={5} />
                                                    </button>
                                                </div>
                                            </SectionHeader>

                                            <div className={`p-6 transition-opacity duration-200 ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                                <div data-debug-id="KpiCards" data-debug-info={JSON.stringify(debugInitialData.KpiCards)}>
                                                    <KpiCards onUnshippedClick={openUnshippedModal} />
                                                </div>
                                            </div>
                                        </div>

                                        {visibleComponents.trendChart && (
                                            <div data-debug-id="TrendChart" data-debug-info={JSON.stringify(debugInitialData.TrendChart)} id="trend-chart-section" className={`transition-opacity duration-200 ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                                <TrendChart />
                                            </div>
                                        )}
                                        
                                        {visibleComponents.industryGrid && (
                                            <div data-debug-id="IndustryGrid" data-debug-info={JSON.stringify(debugInitialData.IndustryGrid)} id="industry-grid-section" className={`transition-opacity duration-200 ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                                <IndustryGrid />
                                            </div>
                                        )}
                                        
                                        {visibleComponents.employeeAnalysis && (
                                            <div data-debug-id="EmployeeAnalysis" data-debug-info={JSON.stringify(debugInitialData.EmployeeAnalysis)} id="employee-analysis-section" className={`transition-opacity duration-200 ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                                <EmployeeAnalysis />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {visibleComponents.summaryTable && (
                                        <div data-debug-id="SummaryTable" data-debug-info={JSON.stringify(debugInitialData.SummaryTable)} id="summary-table-section" className={`transition-opacity duration-200 ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                            <SummaryTable />
                                        </div>
                                    )}
                                </div>
                            </main>
                            <Footer lastUpdated={processedData.lastUpdated} onToggleDebug={() => setIsDebugPanelVisible(p => !p)} onOpenChangelog={() => setActiveModal('changelog')} />

                            {/* Right Slide Menu Filters */}
                            <div className={`fixed inset-0 z-[150] transition-opacity duration-300 ${isFilterSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFilterSidebarOpen(false)}></div>
                                <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-500 ease-in-out transform ${isFilterSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                                    <div className="h-full flex flex-col" data-debug-id="FilterSection" data-debug-info={JSON.stringify(debugInitialData.FilterSection)}>
                                        <FilterSection 
                                            options={uniqueFilterOptions} 
                                            visibility={visibleComponents} 
                                            onVisibilityChange={handleVisibilityChange} 
                                            onClose={() => setIsFilterSidebarOpen(false)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {activeModal === 'performance' && processedData && <PerformanceModal isOpen={true} onClose={() => setActiveModal(null)} employeeName={modalData.employeeName} onExport={handleExport}/>}
                    {activeModal === 'unshipped' && processedData && <UnshippedOrdersModal isOpen={true} onClose={() => setActiveModal(null)} onExport={handleExport} />}
                    <ChangelogModal isOpen={activeModal === 'changelog'} onClose={() => setActiveModal(null)} />
                </DashboardContext.Provider>
                
                <DebugPanel 
                    isVisible={isDebugPanelVisible} 
                    isInspectorActive={isInspectorActive} 
                    info={debugInfo} 
                    onClose={() => setIsDebugPanelVisible(false)} 
                    onToggleInspector={() => setIsInspectorActive(p => !p)} 
                />
            </div>
        </div>
    );
}
