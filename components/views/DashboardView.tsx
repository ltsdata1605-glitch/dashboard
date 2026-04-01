
import React, { useState, useEffect, useRef } from 'react';
import { useDashboardLogic } from '../../hooks/useDashboardLogic';
import type { VisibilityState } from '../../types';
import { DashboardContext } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';

import Header from '../layout/Header';
import Footer from '../layout/Footer';
import LandingPageView from './LandingPageView';
import StatusDisplay from '../upload/StatusDisplay';
import FilterSection from '../filters/FilterSection';
import FilterBar from '../filters/FilterBar';
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
    trendChart: true,
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
        handleFilterChange,
        baseFilteredData,
        originalData
    } = logic;
    const { userRole } = useAuth();

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
    const showLanding = appState === 'upload';

    return (
        <div className="w-full">
            <div className="w-[1200px] mx-auto p-8">
                <DashboardContext.Provider value={logic as any}>
                    <input type="file" ref={mainFileInputRef} className="hidden" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" multiple onClick={(e) => (e.currentTarget.value = '')} onChange={(e) => e.target.files?.length && handleFileProcessing(Array.from(e.target.files))} />
                    <input type="file" ref={shiftFileInputRef} className="hidden" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" multiple onClick={(e) => (e.currentTarget.value = '')} onChange={(e) => e.target.files?.length && handleShiftFileProcessing(Array.from(e.target.files))} />

                <Header 
                    onNewFile={handleNewFileClick} 
                    onLoadShiftFile={handleShiftFileClick} 
                    onClearDepartments={handleClearDepartments} 
                    isClearingDepartments={isClearingDepartments} 
                    hasDepartmentData={!!departmentMap} 
                    showNewFileButton={appState === 'dashboard'} 
                    onClearData={handleClearData} 
                    fileInfo={fileInfo}
                    onToggleFilters={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
                    onSelectHistoryFile={handleFileProcessing}
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
                
                {showProcessingOverlay && (
                    <div className="relative w-full">
                        {/* Banner for Pending Users */}
                        {userRole === 'pending' && (
                            <div className="bg-rose-500 text-white px-4 py-3 text-center text-sm font-bold shadow-md shadow-rose-500/20 z-50 sticky top-0 flex items-center justify-center gap-2">
                                <Icon name="alert-triangle" size={5} />
                                Tài khoản của bạn hiện CHƯA ĐƯỢC PHÊ DUYỆT hoặc ĐÃ HẾT HẠN. Bạn đang xem giao diện rút gọn. Vui lòng bật "Dữ liệu Mẫu" ở Menu trái để thử nghiệm tính năng!
                            </div>
                        )}
                        <div className="container mx-auto px-4 py-4 space-y-6 opacity-40 blur-[3px] pointer-events-none select-none transition-all duration-700">
                            {/* Fake Filter Bar */}
                            <div className="h-16 w-full bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-6"></div>
                            <KpiCardsSkeleton />
                            <div className="space-y-8">
                                <ChartSkeleton height="h-[350px]" />
                                <TableSkeleton rows={4} />
                            </div>
                        </div>
                        <ProcessingLoader status={status} processingTime={processingTime} />
                    </div>
                )}
                
                    {showDashboard && (
                        <>
                            <main id="dashboard-container" className="pb-20 md:pb-0" ref={dashboardContainerRef}>
                                <div className="container mx-auto px-4 py-4 space-y-6">
                                    <FilterBar onToggleAdvanced={() => setIsFilterSidebarOpen(true)} />
                                    
                                    {/* Data Coverage Indicator */}
                                    <div className="flex items-center justify-between px-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-1">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                Đã lọc: <span className="text-slate-700 dark:text-slate-300">{baseFilteredData.length.toLocaleString()}</span> / {originalData.length.toLocaleString()} dòng 
                                                <span className="ml-2 py-0.5 px-1.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                                                    {originalData.length > 0 ? Math.round((baseFilteredData.length / originalData.length) * 100) : 0}%
                                                </span>
                                            </span>
                                        </div>
                                        
                                        {processingTime > 0 && (
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                                <Icon name="zap" size={3} className="text-amber-500" />
                                                <span>Xử lý {processingTime}ms</span>
                                            </div>
                                        )}
                                    </div>

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
                                                        {/* Local warehouse filter removed as it is now in the global FilterBar */}
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
                <DebugPanel 
                    isVisible={isDebugPanelVisible} 
                    isInspectorActive={isInspectorActive} 
                    info={debugInfo} 
                    onClose={() => setIsDebugPanelVisible(false)} 
                    onToggleInspector={() => setIsInspectorActive(p => !p)} 
                />
                </DashboardContext.Provider>
            </div>
        </div>
    );
}
