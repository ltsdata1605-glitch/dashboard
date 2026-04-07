
import React, { useState, useEffect, useRef } from 'react';
import { useDashboardLogic } from '../../hooks/useDashboardLogic';
import type { VisibilityState } from '../../types';
import { DashboardContext } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemTraffic } from '../../hooks/useSystemTraffic';

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
import { getExportFilenamePrefix } from '../../utils/dataUtils';
import { KpiCardsSkeleton, ChartSkeleton, TableSkeleton, TabbedTableSkeleton } from '../common/SkeletonLoader';
import { DebugPanel } from '../common/DebugPanel';
import KpiCardConfigModal from '../kpis/modals/KpiCardConfigModal';

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
        originalData,
        pendingCloudSync, setPendingCloudSync, handleAcceptCloudSync
    } = logic;
    const { userRole } = useAuth();
    const { totalVisits, onlineUsers } = useSystemTraffic();

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
    const [isKpiConfigModalOpen, setIsKpiConfigModalOpen] = useState(false);
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
            const prefix = getExportFilenamePrefix(filterState.kho);
            await handleExport(businessOverviewRef.current, `${prefix}-Tong-quan-kinh-doanh.png`, {
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
            {pendingCloudSync && (
                <div className="fixed bottom-6 right-6 z-[250] bg-white dark:bg-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-indigo-100 dark:border-indigo-500/30 rounded-2xl p-5 flex flex-col gap-3 max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <Icon name="cloud-download" size={5} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Phát hiện dữ liệu mới!</h4>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">File <strong>{pendingCloudSync.name}</strong> đã được cập nhật từ thiết bị khác.</p>
                            </div>
                        </div>
                        <button onClick={() => setPendingCloudSync(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 -mr-2 -mt-2">
                            <Icon name="x" size={4} />
                        </button>
                    </div>
                    <button
                        onClick={() => handleAcceptCloudSync(handleFileProcessing)}
                        className="w-full mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <Icon name="refresh-cw" size={4} />
                        Đồng bộ về máy này ngay
                    </button>
                </div>
            )}
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
                    fileInfo={fileInfo}
                    onToggleFilters={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
                    onSelectHistoryFile={handleFileProcessing}
                />
                
                {status.message && status.type === 'error' && <StatusDisplay status={status} />}
                
                {logic.kpiCardsConfig && (
                    <KpiCardConfigModal 
                        isOpen={isKpiConfigModalOpen} 
                        onClose={() => setIsKpiConfigModalOpen(false)} 
                        configs={logic.kpiCardsConfig} 
                        onSave={logic.updateKpiCardsConfig} 
                    />
                )}

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
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 line-clamp-1">
                                                Lượt Truy Cập: <span className="font-black text-slate-700 dark:text-slate-300">{totalVisits.toLocaleString('vi-VN')}</span>
                                            </span>
                                            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-1.5"></div>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 line-clamp-1">
                                                <span className="animate-pulse text-emerald-500 font-bold whitespace-nowrap">Online:</span> <span className="font-black text-emerald-600 dark:text-emerald-400">{onlineUsers}</span>
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
                                        <div className="bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 overflow-hidden relative">
                                            {/* Overdue Export Warning Banner */}
                                            {(() => {
                                                const now = new Date();
                                                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                                                const overdueOrders = processedData.unshippedOrders?.filter(row => {
                                                    let scheduledDateRaw = row['TG Hẹn Giao'] || row.parsedDate;
                                                    if (!scheduledDateRaw) return false;
                                                    let scheduledDate = scheduledDateRaw instanceof Date ? scheduledDateRaw : new Date(scheduledDateRaw);
                                                    if (!isNaN(scheduledDate.getTime())) {
                                                        const schedTime = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate()).getTime();
                                                        return todayStart > schedTime;
                                                    }
                                                    return false;
                                                }) || [];
                                                
                                                if (overdueOrders.length > 0) {
                                                    return (
                                                        <div 
                                                            onClick={() => setActiveModal('unshipped_overdue')}
                                                            className="absolute top-0 right-0 left-0 bg-rose-50 dark:bg-rose-900/30 border-b border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors z-[20] pointer-events-auto"
                                                        >
                                                            <div className="flex items-center gap-2 font-bold text-sm">
                                                                <span className="relative flex h-3 w-3 mr-1">
                                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                                                </span>
                                                                ĐƠN HÀNG QUÁ HẠN XUẤT ({overdueOrders.length})
                                                            </div>
                                                            <div className="text-xs font-semibold underline underline-offset-2">
                                                                Xem chi tiết & Cập nhật nhanh
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            
                                            <div className="relative z-10 pt-8">
                                                <SectionHeader 
                                                    title="TỔNG QUAN DOANH THU" 
                                                    icon="bar-chart-3" 
                                                    subtitle={processedData.reportSubTitle}
                                                >
                                                        <div className="flex items-center gap-2 hide-on-export">
                                                            <button onClick={() => setIsKpiConfigModalOpen(true)} title="Tùy chỉnh KPI" className="p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                                <Icon name="settings-2" size={5} />
                                                            </button>
                                                            <button onClick={handleBusinessOverviewExport} disabled={isExporting} title="Xuất Ảnh Tổng Quan" className="p-2 text-slate-400 dark:text-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                                <Icon name="camera" size={5} />
                                                            </button>
                                                        </div>
                                                </SectionHeader>
                                            </div>

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
                    {activeModal === 'unshipped_overdue' && processedData && <UnshippedOrdersModal isOpen={true} onClose={() => setActiveModal(null)} onExport={handleExport} onlyOverdue={true} />}
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
