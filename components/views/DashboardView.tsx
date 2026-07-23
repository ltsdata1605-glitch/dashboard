
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDashboardLogic } from '../../hooks/useDashboardLogic';
import type { VisibilityState } from '../../types';
import { DashboardContext } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemTraffic } from '../../hooks/useSystemTraffic';
import { usePendingApprovalCount } from '../../hooks/usePendingApprovalCount';
import { getSetting, saveSetting } from '../../services/dbService';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';

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

// Modal/overlay hiếm khi mở — lazy để không kéo vào chunk chính của DashboardView
// (đo thực tế: chunk DashboardView ~300kB gzip, phần lớn do các modal này luôn bị
// static-import dù đa số người dùng không bao giờ mở tới).
const UnshippedOrdersModal = React.lazy(() => import('../modals/UnshippedOrdersModal'));
const UncollectedOrdersModal = React.lazy(() => import('../modals/UncollectedOrdersModal'));
const DebtOrdersModal = React.lazy(() => import('../modals/DebtOrdersModal'));
const UnconfiguredGroupsModal = React.lazy(() => import('../modals/UnconfiguredGroupsModal'));
const PerformanceModal = React.lazy(() => import('../modals/PerformanceModal'));
const ChangelogModal = React.lazy(() => import('../modals/ChangelogModal'));
const FileHistoryModal = React.lazy(() => import('../modals/FileHistoryModal'));
const FileNamingModal = React.lazy(() => import('../modals/FileNamingModal'));
const UploadConflictModal = React.lazy(() => import('../modals/UploadConflictModal'));
const UploadTypeSelectionModal = React.lazy(() => import('../modals/UploadTypeSelectionModal'));
const KpiCardConfigModal = React.lazy(() => import('../kpis/modals/KpiCardConfigModal'));
const ExportOptionsModal = React.lazy(() => import('../common/ExportOptionsModal'));

import ProcessingLoader from '../common/ProcessingLoader';
import FilterProcessingOverlay from '../common/FilterProcessingOverlay';
import ExportLoader from '../common/ExportLoader';
import { SectionHeader } from '../shared/ui/SectionHeader';
import { SectionCard } from '../shared/ui/SectionCard';
import { Icon } from '../common/Icon';
import { Button } from '../shared/ui/Button';
import { getExportFilenamePrefix, formatCurrency } from '../../utils/dataUtils';
import { KpiCardsSkeleton, ChartSkeleton, TableSkeleton, TabbedTableSkeleton } from '../common/SkeletonLoader';
import { DebugPanel } from '../common/DebugPanel';
import type { DebugInfo } from '../common/DebugPanel';
import { canShareFiles } from '../../services/uiService';

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

const DashboardView = React.memo(function DashboardView({ isActive }: { isActive?: boolean }) {
    const logic = useDashboardLogic();
    const {
        status, appState, isProcessing, isFilterProcessing, isClearingDepartments, isExporting, fileInfo,
        departmentMap, processedData,
        configUrl, setConfigUrl, uniqueFilterOptions,
        activeModal, setActiveModal, modalData,
        handleClearDepartments, handleClearData, handleShiftFileProcessing, handleFileProcessing,
        openUnshippedModal, handleExport, handleBatchKhoExport, handleExportUncollectedSheet,
        filterState,
        processingTime,
        handleFilterChange,
        baseFilteredData,
        originalData,
        pendingCloudSync, setPendingCloudSync, handleAcceptCloudSync,
        hasRealtimeData, handleClearRealtimeData,
        pendingNaming, setPendingNaming,
        pendingConflict, setPendingConflict,
        unconfiguredGroups,
        ignoredUnconfiguredGroups,
        handleIgnoreGroup,
        handleRestoreGroup
    } = logic;
    const { userRole } = useAuth();
    const { totalVisits, onlineUsers } = useSystemTraffic();
    const pendingRequestsCount = usePendingApprovalCount();

    const [visibleComponents, setVisibleComponents] = useState<VisibilityState>(defaultVisibilityState);
    const [isVisibleComponentsLoaded, setIsVisibleComponentsLoaded] = useState(false);
    const [isFileHistoryModalOpen, setIsFileHistoryModalOpen] = useState(false);
    const [pendingUploadFiles, setPendingUploadFiles] = useState<File[] | null>(null);
    const [isUnconfiguredModalOpen, setIsUnconfiguredModalOpen] = useState(false);
    const [announcement, setAnnouncement] = useState<{ content: string; active: boolean } | null>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'shared_configs'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );
        const unsub = onSnapshot(q, (snapshot) => {
            let found: { id?: string; content?: string; active?: boolean; isSystemAnnouncement?: boolean } | null = null;
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.isSystemAnnouncement && !found) {
                    found = { id: docSnap.id, ...data };
                }
            });
            setAnnouncement(found as { content: string; active: boolean } | null);
        }, (error) => {
            console.error("Lỗi khi lắng nghe thông báo hệ thống:", error);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        getSetting<VisibilityState>('dashboard_visibleComponents').then(saved => {
            if (saved) setVisibleComponents(saved);
            setIsVisibleComponentsLoaded(true);
        }).catch(() => setIsVisibleComponentsLoaded(true));
    }, []);

    const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
    const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(false);
    const [isInspectorActive, setIsInspectorActive] = useState(false);
    const [isKpiConfigModalOpen, setIsKpiConfigModalOpen] = useState(false);
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

    const dashboardContainerRef = useRef<HTMLDivElement>(null);
    const businessOverviewRef = useRef<HTMLDivElement>(null);
    const kpiCardsOnlyRef = useRef<HTMLDivElement>(null);
    const mainFileInputRef = useRef<HTMLInputElement>(null);
    const shiftFileInputRef = useRef<HTMLInputElement>(null);

    const handleNewFileClick = () => mainFileInputRef.current?.click();
    const handleShiftFileClick = () => shiftFileInputRef.current?.click();

    const overdueUnshippedOrders = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return processedData?.unshippedOrders?.filter(row => {
            let scheduledDateRaw = row['Thời gian hẹn giao'] || row['TG Hẹn Giao'] || row['Thời Gian Hẹn Giao'];
            if (!scheduledDateRaw) return false;
            let scheduledDate: Date | null = null;
            if (scheduledDateRaw instanceof Date) {
                scheduledDate = scheduledDateRaw;
            } else {
                const str = String(scheduledDateRaw).trim();
                // Fallback check for DD/MM/YYYY
                if (str.includes('/')) {
                    const parts = str.split(/[ /:-]/);
                    if (parts.length >= 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const year = parseInt(parts[2], 10);
                        if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                            scheduledDate = new Date(year, month, day);
                        }
                    }
                }
                if (!scheduledDate || isNaN(scheduledDate.getTime())) {
                    scheduledDate = new Date(str);
                }
            }

            if (scheduledDate && !isNaN(scheduledDate.getTime())) {
                const schedTime = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate()).getTime();
                return todayStart > schedTime;
            }
            return false;
        }) || [];
    }, [processedData?.unshippedOrders]);

    const overdueDebtOrders = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return processedData?.debtOrders?.filter(row => {
            let scheduledDateRaw = row['Thời gian hẹn giao'] || row['TG Hẹn Giao'] || row['Thời Gian Hẹn Giao'];
            if (!scheduledDateRaw) return false;
            let scheduledDate: Date | null = null;
            if (scheduledDateRaw instanceof Date) {
                scheduledDate = scheduledDateRaw;
            } else {
                const str = String(scheduledDateRaw).trim();
                // Fallback check for DD/MM/YYYY
                if (str.includes('/')) {
                    const parts = str.split(/[ /:-]/);
                    if (parts.length >= 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const year = parseInt(parts[2], 10);
                        if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                            scheduledDate = new Date(year, month, day);
                        }
                    }
                }
                if (!scheduledDate || isNaN(scheduledDate.getTime())) {
                    scheduledDate = new Date(str);
                }
            }

            if (scheduledDate && !isNaN(scheduledDate.getTime())) {
                const schedTime = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate()).getTime();
                return todayStart > schedTime;
            }
            return false;
        }) || [];
    }, [processedData?.debtOrders]);

    const handleVisibilityChange = (component: keyof VisibilityState, isVisible: boolean) => {
        setVisibleComponents(prev => {
            const newState = { ...prev, [component]: isVisible };
            saveSetting('dashboard_visibleComponents', newState);
            return newState;
        });
    };

    const handleBusinessOverviewExport = async () => {
        if (businessOverviewRef.current) {
            const prefix = getExportFilenamePrefix(filterState.kho);
            await handleExport(businessOverviewRef.current, `${prefix}-Toan-bo-ban-tin.png`, {
                captureAsDisplayed: true,
            });
        }
    };

    const handleKpiCardsOnlyExport = async () => {
        if (kpiCardsOnlyRef.current) {
            const prefix = getExportFilenamePrefix(filterState.kho);
            await handleExport(kpiCardsOnlyRef.current, `${prefix}-Tong-quan-doanh-thu.png`, {
                captureAsDisplayed: true,
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
            while (target && !target.hasAttribute('data-debug-id')) {
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

    if (isActive === false) {
        return <div className="hidden" />;
    }

    const showDashboard = (appState === 'dashboard' || (appState === 'processing' && processedData)) && processedData;
    const showProcessingOverlay = appState === 'loading' || (appState === 'processing' && !processedData);
    const showLanding = appState === 'upload';

    return (
        <div className="w-full">
            {pendingCloudSync && (
                <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px] sm:max-w-sm z-[250] bg-white dark:bg-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-indigo-50/50 dark:border-indigo-500/20 rounded-2xl p-4 flex flex-col gap-2.5 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="flex items-start justify-between gap-3 w-full min-w-0">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 mt-0.5">
                                <Icon name="cloud-download" size={4} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
                                    <h4 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm truncate">
                                        Dữ liệu đám mây mới
                                    </h4>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300 shrink-0">
                                        📊 {pendingCloudSync.meta.totalRows.toLocaleString('vi-VN')} dòng
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                                    File: <strong className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[130px] sm:max-w-[170px] inline-block align-bottom" title={pendingCloudSync.meta.filename}>{pendingCloudSync.meta.filename}</strong>
                                </p>
                                {pendingCloudSync.meta.savedAt && (
                                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                        <Icon name="clock" size={3} />
                                        {new Date(pendingCloudSync.meta.savedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button variant="unstyled" size="none" onClick={() => setPendingCloudSync(null)} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 -mr-1 -mt-1 shrink-0">
                            <Icon name="x" size={3.5} />
                        </Button>
                    </div>
                    <div className="flex gap-2 mt-0.5">
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => setPendingCloudSync(null)}
                            className="flex-1 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium rounded-xl text-[11px] transition-colors"
                        >
                            Bỏ qua
                        </Button>
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => handleAcceptCloudSync()}
                            className="flex-[2] py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 rounded-xl text-[11px] transition-colors shadow-sm active:scale-[0.98]"
                        >
                            <Icon name="refresh-cw" size={3.5} />
                            Nạp dữ liệu đám mây
                        </Button>
                    </div>
                </div>
            )}

            <div className="w-full mx-auto p-0 sm:p-2.5 lg:p-4 xl:p-8">
                <DashboardContext.Provider value={logic}>
                    <input type="file" ref={mainFileInputRef} className="hidden" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" multiple onClick={(e) => (e.currentTarget.value = '')} onChange={(e) => e.target.files?.length && setPendingUploadFiles(Array.from(e.target.files))} />
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
                        <React.Suspense fallback={null}>
                            <KpiCardConfigModal
                                isOpen={isKpiConfigModalOpen}
                                onClose={() => setIsKpiConfigModalOpen(false)}
                                configs={logic.kpiCardsConfig}
                                onSave={logic.updateKpiCardsConfig}
                            />
                        </React.Suspense>
                    )}

                    {showLanding && (
                        <LandingPageView
                            onProcessFile={handleFileProcessing}
                            configUrl={configUrl}
                            onConfigUrlChange={setConfigUrl}
                            registry={logic.fileRegistry}
                            onToggleActive={logic.handleToggleFileActive}
                            onDelete={logic.handleDeleteFile}
                            onViewReport={logic.handleViewReport}
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
                        </div>
                    )}

                    {(appState === 'loading' || appState === 'processing') && (
                        <ProcessingLoader status={status} processingTime={processingTime} />
                    )}

                    {showDashboard && (
                        <>
                            <FilterProcessingOverlay isVisible={isFilterProcessing} />
                            <main id="dashboard-container" className="pb-[56px] lg:pb-0" ref={dashboardContainerRef}>
                                <div className="max-w-[960px] mx-auto px-0 sm:px-2 lg:px-4 py-1.5 lg:py-4 space-y-3 lg:space-y-6">
                                    {/* Super Admin Announcement Marquee */}
                                    {announcement && announcement.active && announcement.content && (
                                        <div className="w-full bg-rose-600 dark:bg-rose-750 text-white text-[10px] sm:text-xs font-bold py-2 px-4 flex items-center overflow-hidden relative rounded-xl shadow-md border border-rose-500/25 mb-2 no-print">
                                            <div className="flex-shrink-0 flex items-center gap-1.5 bg-rose-700 dark:bg-rose-850 px-2 py-0.5 rounded-lg z-10 mr-3 shadow-[2px_0_6px_rgba(0,0,0,0.1)] select-none">
                                                <Icon name="megaphone" size={4} className="animate-bounce shrink-0" />
                                                <span className="uppercase tracking-wider text-[10px] font-black">Thông báo</span>
                                            </div>
                                            <div className="flex-1 overflow-hidden whitespace-nowrap">
                                                <div className="inline-block animate-marquee pl-[100%]">
                                                    {announcement.content}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <FilterBar onToggleAdvanced={() => setIsFilterSidebarOpen(true)} onNewFile={handleNewFileClick} onOpenHistory={() => setIsFileHistoryModalOpen(true)} />

                                    {/* Data Coverage Indicator */}
                                    <div className="hidden lg:flex items-center justify-between px-1 lg:px-2 mb-1 lg:mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-1">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 line-clamp-1">
                                                <Icon name="users" size={3} className="text-indigo-400" /> Tổng: <span className="text-slate-600 dark:text-slate-300">{totalVisits.toLocaleString()}</span> lượt • <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span> {onlineUsers} đang online</span>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {(logic.hasRealtimeData || (logic.fileRegistry && logic.fileRegistry.some(f => f.isActive))) && (
                                                <Button
                                                    variant="unstyled" size="none"
                                                    onClick={() => logic.hasRealtimeData ? logic.handleClearRealtimeData() : logic.handleClearData()}
                                                    title={logic.hasRealtimeData ? "Xóa dữ liệu xem hiện tại (Realtime)" : "Xóa tất cả dữ liệu báo cáo tích lũy"}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold rounded-md border border-rose-200/50 dark:border-rose-800/40 text-[10px] transition-all hover:scale-105 active:scale-95 shadow-sm"
                                                >
                                                    <Icon name="trash-2" size={3.5} className="text-rose-500 animate-pulse" />
                                                    <span>{logic.hasRealtimeData ? "XÓA YCX REALTIME" : "XÓA YCX LŨY KẾ"}</span>
                                                </Button>
                                            )}
                                            {logic.fileInfo && (
                                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 px-2 py-1 rounded-md border border-slate-200/50 dark:border-slate-700/50">
                                                    <Icon name="calendar-days" size={3.5} className="opacity-70" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">
                                                        Cập nhật: <span className="text-slate-800 dark:text-slate-200 font-black">{logic.fileInfo.savedAt}</span>
                                                    </span>
                                                </div>
                                            )}
                                            {processingTime > 0 && (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                                    <Icon name="zap" size={3} className="text-amber-500" />
                                                    <span>Xử lý {processingTime}ms</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {processedData.warehouseSummary && processedData.warehouseSummary.length > 0 && (
                                        <div data-debug-id="WarehouseSummary" data-debug-info={JSON.stringify(debugInitialData.WarehouseSummary)}>
                                            <WarehouseSummary onBatchExport={handleBatchKhoExport} />
                                        </div>
                                    )}

                                    <div ref={businessOverviewRef} id="business-overview" className="space-y-3 lg:space-y-6">
                                        <SectionCard ref={kpiCardsOnlyRef} className="relative">
                                            {/* Unconfigured Groups Warning Banner */}
                                            {(userRole === 'admin' || userRole === 'manager') && unconfiguredGroups && unconfiguredGroups.length > 0 && (
                                                <div
                                                    onClick={() => setIsUnconfiguredModalOpen(true)}
                                                    className="relative bg-amber-50 dark:bg-amber-955/20 border-b border-amber-200/60 dark:border-amber-900/60 text-amber-800 dark:text-amber-400 px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-amber-100/80 dark:hover:bg-amber-900/50 transition-colors z-[20] animate-pulse"
                                                >
                                                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                                                        <span className="relative flex h-2.5 w-2.5 mr-1">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                                        </span>
                                                        ⚠️ PHÁT HIỆN {unconfiguredGroups.length} NHÓM HÀNG MỚI CHƯA CẤU HÌNH (DỮ LIỆU ĐANG BỊ BỎ QUA)
                                                    </div>
                                                    <div className="text-[11px] font-bold underline underline-offset-2 flex items-center gap-0.5">
                                                        <span>Xem & Cập nhật</span>
                                                        <Icon name="chevron-right" size={3} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Overdue Export Warning Banner */}
                                            {overdueUnshippedOrders.length > 0 && (
                                                <div
                                                    onClick={() => setActiveModal('unshipped_overdue')}
                                                    className="relative bg-rose-50 dark:bg-rose-900/30 border-b border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors z-[20]"
                                                >
                                                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                                                        <span className="relative flex h-2.5 w-2.5 mr-1">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                                        </span>
                                                        ĐƠN HÀNG QUÁ HẠN XUẤT ({overdueUnshippedOrders.length})
                                                    </div>
                                                    <div className="text-[10px] sm:text-xs font-semibold underline underline-offset-2">
                                                        Xem chi tiết & Cập nhật nhanh
                                                    </div>
                                                </div>
                                            )}

                                            {/* Uncollected Warning Banner */}
                                            {processedData.uncollectedOrders && processedData.uncollectedOrders.length > 0 && (
                                                <div
                                                    onClick={() => setActiveModal('uncollected')}
                                                    className="relative bg-amber-50 dark:bg-amber-955/30 border-b border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-400 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors z-[20]"
                                                >
                                                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                                                        <span className="relative flex h-2.5 w-2.5 mr-1">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                                        </span>
                                                        ĐƠN HÀNG CHƯA THU | CHƯA HỦY ({processedData.uncollectedOrders.length})
                                                    </div>
                                                    <div className="text-[10px] sm:text-xs font-semibold underline underline-offset-2">
                                                        Xem danh sách
                                                    </div>
                                                </div>
                                            )}

                                            {/* Unfinished Debt Warning Banner */}
                                            {overdueDebtOrders.length > 0 && (
                                                <div
                                                    onClick={() => setActiveModal('debt')}
                                                    className="relative bg-rose-50 dark:bg-rose-900/30 border-b border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors z-[20]"
                                                >
                                                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                                                        <span className="relative flex h-2.5 w-2.5 mr-1">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                                        </span>
                                                        ĐƠN HÀNG CHƯA HOÀN TẤT CÔNG NỢ ({overdueDebtOrders.length})
                                                    </div>
                                                    <div className="text-[10px] sm:text-xs font-semibold underline underline-offset-2">
                                                        Xem danh sách
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`relative z-10 pt-1 ${
                                                ((userRole === 'admin' || userRole === 'manager') && unconfiguredGroups && unconfiguredGroups.length > 0)
                                                || overdueUnshippedOrders.length > 0
                                                || (processedData.uncollectedOrders && processedData.uncollectedOrders.length > 0)
                                                || overdueDebtOrders.length > 0
                                                    ? 'lg:pt-3' : 'lg:pt-8'
                                            }`}>
                                                <SectionHeader
                                                    title="TỔNG QUAN DOANH THU"
                                                    icon="bar-chart-3"
                                                    subtitle={<>
                                                        <span className="hidden md:inline">{processedData.reportSubTitle}</span>
                                                        {/* Mobile: truncated subtitle + inline Chờ Xuất */}
                                                        <span className="md:hidden inline-flex items-center gap-1.5 max-w-full">
                                                            <span className="truncate shrink min-w-0">{processedData.reportSubTitle}</span>
                                                            {processedData.kpis && processedData.kpis.doanhThuThucChoXuat > 0 && (
                                                                <Button
                                                                    variant="unstyled" size="none"
                                                                    onClick={(e) => { e.stopPropagation(); openUnshippedModal(); }}
                                                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 inline-flex items-center gap-0.5 shrink-0 text-rose-600 dark:text-rose-400 font-extrabold whitespace-nowrap active:scale-95 transition-transform uppercase tracking-wider leading-none text-[10px]"
                                                                >
                                                                    <Icon name="archive-restore" size={3.5} />
                                                                    Chờ xuất: {formatCurrency(processedData.kpis.doanhThuThucChoXuat)}
                                                                </Button>
                                                            )}
                                                        </span>
                                                    </>}
                                                >
                                                    <div className="flex items-center gap-0.5 lg:gap-1 hide-on-export">
                                                        <Button variant="ghost" size="icon" onClick={() => setIsKpiConfigModalOpen(true)} title="Tùy chỉnh KPI" className="h-8 w-8 lg:h-9 lg:w-9 text-slate-400 dark:text-slate-500">
                                                            <Icon name="settings-2" size={4} className="lg:hidden" />
                                                            <Icon name="settings-2" size={5} className="hidden lg:block" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={handleKpiCardsOnlyExport} disabled={isExporting} title="Chỉ Xuất Ảnh Tổng Quan" className="h-8 w-8 lg:h-9 lg:w-9 text-slate-400 dark:text-slate-500">
                                                            <Icon name="download" size={4} className="lg:hidden" />
                                                            <Icon name="download" size={5} className="hidden lg:block" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={handleBusinessOverviewExport} disabled={isExporting} title="Xuất Ảnh Chụp Toàn Báo Cáo" className="h-8 w-8 lg:h-9 lg:w-9 text-slate-400 dark:text-slate-500">
                                                            <Icon name="camera" size={4} className="lg:hidden" />
                                                            <Icon name="camera" size={5} className="hidden lg:block" />
                                                        </Button>
                                                    </div>
                                                </SectionHeader>
                                            </div>

                                            <div className={`p-2 lg:px-4 lg:py-6 transition-opacity duration-200 ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                                <div data-debug-id="KpiCards" data-debug-info={JSON.stringify(debugInitialData.KpiCards)}>
                                                    <KpiCards onUnshippedClick={openUnshippedModal} />
                                                </div>
                                            </div>
                                        </SectionCard>

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
                                            onLoadShiftFile={handleShiftFileClick}
                                            hasDepartmentData={!!departmentMap}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {activeModal === 'performance' && processedData && (
                        <React.Suspense fallback={null}>
                            <PerformanceModal isOpen={true} onClose={() => setActiveModal(null)} employeeName={modalData.employeeName} onExport={handleExport} />
                        </React.Suspense>
                    )}
                    <React.Suspense fallback={null}>
                        {activeModal === 'unshipped' && processedData && <UnshippedOrdersModal isOpen={true} onClose={() => setActiveModal(null)} onExport={handleExport} />}
                        {activeModal === 'unshipped_overdue' && processedData && <UnshippedOrdersModal isOpen={true} onClose={() => setActiveModal(null)} onExport={handleExport} onlyOverdue={true} />}
                        {activeModal === 'uncollected' && processedData && <UncollectedOrdersModal isOpen={true} onClose={() => setActiveModal(null)} onExport={handleExport} onExportSheet={handleExportUncollectedSheet} />}
                        {activeModal === 'debt' && processedData && <DebtOrdersModal isOpen={true} onClose={() => setActiveModal(null)} onExport={handleExport} />}
                        <ChangelogModal isOpen={activeModal === 'changelog'} onClose={() => setActiveModal(null)} />
                        <UnconfiguredGroupsModal
                            isOpen={isUnconfiguredModalOpen}
                            onClose={() => setIsUnconfiguredModalOpen(false)}
                            unconfiguredGroups={unconfiguredGroups}
                            ignoredUnconfiguredGroups={ignoredUnconfiguredGroups}
                            onIgnoreGroup={handleIgnoreGroup}
                            onRestoreGroup={handleRestoreGroup}
                        />
                        <FileHistoryModal
                            isOpen={isFileHistoryModalOpen}
                            onClose={() => setIsFileHistoryModalOpen(false)}
                            registry={logic.fileRegistry}
                            onToggleActive={logic.handleToggleFileActive}
                            onDelete={logic.handleDeleteFile}
                            onProcessFile={(files, isCloudSync, isHistorical) => {
                                setIsFileHistoryModalOpen(false);
                                handleFileProcessing(files, isCloudSync, isHistorical);
                            }}
                            onViewReport={logic.handleViewReport}
                        />
                        <FileNamingModal
                            isOpen={!!pendingNaming}
                            onConfirm={(name) => {
                                if (pendingNaming) {
                                    pendingNaming.resolve(name);
                                    setPendingNaming(null);
                                }
                            }}
                        />
                        <UploadConflictModal
                            isOpen={!!pendingConflict}
                            conflicts={pendingConflict?.conflicts || []}
                            newFilename={pendingConflict?.newFilename || ''}
                            newDateRangeStr={pendingConflict?.newDateRangeStr || ''}
                            onResolve={(action) => {
                                if (pendingConflict) {
                                    pendingConflict.resolve(action);
                                    setPendingConflict(null);
                                }
                            }}
                        />
                        <UploadTypeSelectionModal
                            isOpen={!!pendingUploadFiles}
                            onClose={() => setPendingUploadFiles(null)}
                            onSelect={(isHistorical) => {
                                if (pendingUploadFiles) {
                                    handleFileProcessing(pendingUploadFiles, false, isHistorical);
                                    setPendingUploadFiles(null);
                                }
                            }}
                            fileCount={pendingUploadFiles?.length || 0}
                        />
                        {/* Export Options Modal - Download or Share */}
                        <ExportOptionsModal
                            isOpen={!!logic.pendingExport}
                            onClose={logic.handlePendingClose}
                            onDownload={logic.handlePendingDownload}
                            onShare={logic.handlePendingShare}
                            canShare={canShareFiles()}
                            filename={logic.pendingExport?.filename || ''}
                        />
                    </React.Suspense>
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
});

export default DashboardView;
