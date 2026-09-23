
import { useState, useEffect, useMemo } from 'react';
import type { Status, AppState, CrossSellingConfig } from '../types';
import type { DepartmentMap } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { keepOnlyAllInOne } from '../utils/departmentFilter';

// Import specialized hooks
import { useExportLogic } from './useExportLogic';
import { useFileUploadLogic } from './useFileUploadLogic';
import { useFilterState, initialFilterState } from './useFilterState';
import { useDataManagement } from './useDataManagement';
import { useWarehouseTargets } from './useWarehouseTargets';
import { useStableCallback } from './useStableCallback';
import * as dbService from '../services/dbService';
import { saveAnalysisEmployees, getAnalysisEmployees } from '../features/bi-dashboard/services/analysisEmployeeSyncService';
import { toLocalISOString, getRowValue } from '../utils/dataUtils';
import { COL } from '../constants';

const getTodayStr = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return toLocalISOString(today);
};

export const useDashboardLogic = () => {
    const { user, userRole, departmentId } = useAuth();
    const [status, setStatus] = useState<Status>({ message: '', type: 'info', progress: 0 });
    const [appState, setAppState] = useState<AppState>('loading');
    const [configUrl, setConfigUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vRhes_lcas8n2_xYHKylsjyD3PIVbdchCiL2XDKJ4OYfgUZlVjAT7ZGWDHrYRzQVrK2w50W86Da3l48/pub?output=xlsx');
    const [isLuyKe, setIsLuyKe] = useState(false);
    const [activeModal, setActiveModal] = useState<'performance' | 'unshipped' | 'unshipped_overdue' | 'uncollected' | 'changelog' | null>(null);
    const [modalData, setModalData] = useState<{ employeeName: string } | null>(null);
    const [editingTargetKho, setEditingTargetKho] = useState<{ id: string, name: string, valueDTQD: string, valueDTThuc: string } | null>(null);

    // 1. Filter State Management
    const { filterState, setFilterState, handleFilterChange, isFilterLoaded } = useFilterState();

    // 2. Data Management (Loading, Processing, Unique Options)
    const {
        originalData, setOriginalData,
        baseFilteredData,
        warehouseFilteredData,
        departmentMap, setDepartmentMap,
        productConfig, setProductConfig,
        processedData, setProcessedData,
        employeeAnalysisData,
        warehouseTargets, setWarehouseTargets,
        warehouseDTThucTargets, setWarehouseDTThucTargets,
        gtdhTargets, setGtdhTargets,
        uniqueFilterOptions,
        availableWeeks,
        availableMonths,
        crossSellingConfig, setCrossSellingConfig,
        kpiCardsConfig, setKpiCardsConfig,
        kpiTargets, updateKpiTargets: updateKpiTargetsRaw,
        isInternalProcessing,
        isFilterProcessing,
        fileInfo, setFileInfo,
        pendingCloudSync, setPendingCloudSync,
        handleAcceptCloudSync: handleAcceptCloudSyncRaw,
        handleViewReport: handleViewReportRaw,
        fileRegistry,
        refreshRegistry,
        handleToggleFileActive,
        handleDeleteFile: handleDeleteFileRaw,
        hasRealtimeData,
        handleClearRealtimeData,
        unconfiguredGroups,
        ignoredUnconfiguredGroups,
        handleIgnoreGroup,
        handleRestoreGroup
    } = useDataManagement({ filterState, configUrl, setStatus, setAppState, appState });

    // 3. Warehouse Targets Management
    const { handleSaveWarehouseTargets } = useWarehouseTargets(setWarehouseTargets);

    // 5. File Upload Logic
    const {
        isProcessing: isFileProcessing,
        isClearingDepartments,
        processingTime,
        handleFileProcessing,
        handleShiftFileProcessing,
        handleClearData,
        handleClearDepartments,
        pendingNaming,
        setPendingNaming,
        pendingConflict,
        setPendingConflict
    } = useFileUploadLogic({
        originalData,
        setOriginalData,
        setDepartmentMap,
        setProcessedData,
        setFileInfo,
        setAppState,
        setStatus,
        setFilterState,
        user,
        userRole,
        departmentId,
        onRegistryChange: refreshRegistry
    });

    // 6. Export Logic
    const {
        isExporting, handleExport, handleBatchExport, handleBatchKhoExport,
        pendingExport, handlePendingDownload, handlePendingShare, handlePendingClose,
        handleExportUncollectedSheet
    } = useExportLogic({
        productConfig,
        processedData,
        uniqueFilterOptions,
        filterState,
        handleFilterChange,
        setStatus,
        isFilterProcessing
    });

    // Removed repopulating filter state effects here because they caused 
    // a bug where empty filters (Select All unselected) would instantly 
    // reset to "Select All" again, blocking the user from selecting just 1 department.
    
    const openPerformanceModal = useStableCallback((employeeName: string) => {
        setModalData({ employeeName });
        setActiveModal('performance');
    });

    const openUnshippedModal = useStableCallback(() => setActiveModal('unshipped'));

    // NOTE: Settings sync to Firebase is handled automatically by useCloudSync hook
    // which listens to 'ycx-setting-changed' events dispatched by dbService.saveSetting().
    // No need for manual triggerCloudSync calls — saving to IndexedDB triggers the event chain.

    const handleLuyKeChange = useStableCallback((enabled: boolean) => {
        setIsLuyKe(enabled);
        dbService.saveSetting('kpi_luyke_mode', enabled).catch(console.error);
    });

    // Load saved settings on mount
    useEffect(() => {
        dbService.getSetting<boolean>('kpi_luyke_mode').then(val => {
            if (val !== null && val !== undefined) setIsLuyKe(val);
        }).catch(console.error);
    }, []);

    const updateWarehouseTarget = useStableCallback((kho: string, target: number) => {
        handleSaveWarehouseTargets({ ...warehouseTargets, [kho]: target });
    });

    const updateWarehouseDTThucTarget = useStableCallback(async (kho: string, target: number) => {
        const newTargets = { ...warehouseDTThucTargets, [kho]: target };
        setWarehouseDTThucTargets(newTargets);
        await dbService.saveSetting('warehouseDTThucTargets', newTargets);
    });

    const isProcessing = isInternalProcessing || isFileProcessing;

    // Handlers từ các hook con chưa tự memoize (hoặc chỉ là wrapper mỏng) —
    // bọc bằng useStableCallback để identity ổn định vĩnh viễn, tránh việc object
    // `logic` trả về cuối hàm bị coi là "đổi" mỗi render và làm toàn bộ consumer
    // của DashboardContext re-render dù dữ liệu không đổi.
    const stableHandleClearDepartments = useStableCallback(handleClearDepartments);
    const stableHandleClearData = useStableCallback(handleClearData);
    const stableHandleShiftFileProcessing = useStableCallback(handleShiftFileProcessing);
    const stableHandleFileProcessing = useStableCallback(handleFileProcessing);
    const stableHandleAcceptCloudSync = useStableCallback(handleAcceptCloudSyncRaw);

    const updateGtdhTarget = useStableCallback(async (nhomHang: string, target: number) => {
        const newTargets = { ...gtdhTargets, [nhomHang]: target };
        setGtdhTargets(newTargets);
        await dbService.saveGtdhTargets(newTargets);
    });

    const deleteGtdhTarget = useStableCallback(async (nhomHang: string) => {
        const newTargets = { ...gtdhTargets };
        delete newTargets[nhomHang];
        setGtdhTargets(newTargets);
        await dbService.saveGtdhTargets(newTargets);
    });

    const updateCrossSellingConfig = useStableCallback(async (config: CrossSellingConfig) => {
        setCrossSellingConfig(config);
        await dbService.saveCrossSellingConfig(config);
    });

    const updateKpiCardsConfig = useStableCallback(async (config: import('../types').KpiCardConfig[]) => {
        setKpiCardsConfig(config);
        await dbService.saveKpiCardConfig(config);
    });

    const updateKpiTargets = useStableCallback(async (targets: { hieuQua: number, traGop: number, gtdh?: number, doanhThuThuc?: number }) => {
        updateKpiTargetsRaw(targets);
        await dbService.saveKpiTargets(targets);
    });

    /**
     * DepartmentMap ("mã NV" -> "Bộ phận;;Tên") -> danh sách nhân viên cho Report BI.
     * Tên ghép lại dạng "mã - Tên" đúng khuôn mà normalizeAnalysisEmployees mong đợi.
     */
    const departmentMapToEmployeeList = (map: DepartmentMap) =>
        // Chỉ đẩy nhân viên BP All In One sang Report BI. Lọc lại ở đây (dù file nạp vào đã lọc)
        // để danh sách cũ lưu từ trước cũng theo đúng quy tắc mà không cần nạp lại file.
        Object.entries(keepOnlyAllInOne(map).map).map(([id, raw]) => {
            const [dept, name] = String(raw || '').split(';;');
            const cleanName = (name || '').trim();
            // File có cột "Mã NV" và "Tên" tách riêng thì phần tên đã kèm sẵn mã ("101 - Nguyễn
            // Văn A") — ghép thêm mã lần nữa sẽ ra "101 - 101 - Nguyễn Văn A".
            const alreadyHasId = cleanName.startsWith(`${id} -`) || cleanName.startsWith(`${id}-`);
            const fullName = !cleanName ? id : alreadyHasId ? cleanName : `${id} - ${cleanName}`;
            return { name: fullName, department: (dept || '').trim() };
        });

    const updateDepartmentMap = useStableCallback(async (map: DepartmentMap) => {
        setDepartmentMap(map);
        await dbService.saveDepartmentMap(map);
        // Đồng bộ sang Report BI NGAY cả khi chưa tải file YCX: trước đây danh sách nhân viên chỉ
        // được đẩy sang BI sau khi xử lý file YCX (hooks/useDataManagement), nên người dùng cập
        // nhật danh sách ở modal "Quản lý danh sách nhân viên" mà Report BI vẫn trống
        // (chủ dự án báo 2026-09-22).
        try {
            const currentSm = filterState.kho && filterState.kho.length === 1 ? filterState.kho[0] : undefined;
            await saveAnalysisEmployees(departmentMapToEmployeeList(map), currentSm);
        } catch (err) {
            console.warn('[useDashboardLogic] Không đồng bộ được danh sách nhân viên sang Report BI:', err);
        }
    });

    // Người dùng đã có sẵn danh sách nhân viên từ trước bản sửa này (departmentMap có dữ liệu)
    // nhưng chưa từng tải file YCX -> Report BI vẫn trống cho tới khi họ sửa gì đó. Đẩy 1 lần
    // lúc khởi động, và CHỈ khi phía BI thực sự chưa có danh sách (không ghi đè dữ liệu tốt hơn).
    useEffect(() => {
        if (!departmentMap || Object.keys(departmentMap).length === 0) return;
        let cancelled = false;
        (async () => {
            try {
                const existing = await getAnalysisEmployees();
                if (cancelled || (existing && existing.employees.length > 0)) return;
                const list = departmentMapToEmployeeList(departmentMap);
                if (list.length === 0) return;
                await saveAnalysisEmployees(list);
                console.info('[useDashboardLogic] Đã đẩy danh sách nhân viên có sẵn sang Report BI (lần đầu).');
            } catch (err) {
                console.warn('[useDashboardLogic] Bỏ qua đồng bộ nhân viên lần đầu:', err);
            }
        })();
        return () => { cancelled = true; };
         
    }, [departmentMap]);

    // Dùng chung sau khi xoá file hoặc xem lại báo cáo — 2 handler trước đây copy-paste giống hệt
    // khối này, chỉ khác action gọi trước đó (handleDeleteFileRaw vs handleViewReportRaw).
    const resetFilterStateAfterFileChange = useStableCallback(async () => {
        const registry = await dbService.getSalesFilesRegistry();
        const activeHistoricalCount = registry.filter(f => f.isActive).length;
        const merged = await dbService.getMergedSalesData();
        if (merged) {
            if (activeHistoricalCount > 0) {
                const allTrangThai = Array.from(new Set(merged.data.map(r => getRowValue(r, COL.TRANG_THAI)).filter(Boolean))) as string[];
                const todayStr = getTodayStr();
                setFilterState(prev => ({
                    ...prev,
                    kho: [],
                    xuat: 'all',
                    trangThai: allTrangThai,
                    nguoiTao: [],
                    department: [],
                    startDate: todayStr,
                    endDate: todayStr,
                    dateRange: 'today',
                    selectedMonths: []
                }));
            } else {
                setFilterState(initialFilterState);
            }
        }
    });

    const handleDeleteFile = useStableCallback(async (id: string) => {
        await handleDeleteFileRaw(id);
        await resetFilterStateAfterFileChange();
    });

    const handleViewReport = useStableCallback(async () => {
        await handleViewReportRaw();
        await resetFilterStateAfterFileChange();
    });

    return useMemo(() => ({
        status, appState, setAppState, isProcessing, isFilterProcessing, isClearingDepartments, isExporting, fileInfo,
        departmentMap, originalData, baseFilteredData, warehouseFilteredData, productConfig, processedData, employeeAnalysisData,
        configUrl, setConfigUrl, uniqueFilterOptions,
        availableWeeks, availableMonths,
        filterState, handleFilterChange,
        pendingCloudSync, setPendingCloudSync, handleAcceptCloudSync: stableHandleAcceptCloudSync,
        activeModal, setActiveModal, modalData,
        handleClearDepartments: stableHandleClearDepartments,
        handleClearData: stableHandleClearData,
        handleShiftFileProcessing: stableHandleShiftFileProcessing,
        handleFileProcessing: stableHandleFileProcessing,
        pendingNaming, setPendingNaming,
        pendingConflict, setPendingConflict,
        openPerformanceModal, openUnshippedModal, handleExport,
        handleBatchExport,
        handleBatchKhoExport,
        handleExportUncollectedSheet,
        pendingExport,
        handlePendingDownload,
        handlePendingShare,
        handlePendingClose,
        isLuyKe,
        handleLuyKeChange,
        processingTime,
        warehouseTargets,
        updateWarehouseTarget,
        warehouseDTThucTargets,
        updateWarehouseDTThucTarget,
        gtdhTargets,
        updateGtdhTarget,
        deleteGtdhTarget,
        crossSellingConfig,
        updateCrossSellingConfig,
        kpiCardsConfig,
        updateKpiCardsConfig,
        kpiTargets,
        updateKpiTargets,
        updateDepartmentMap,
        fileRegistry,
        refreshRegistry,
        handleToggleFileActive,
        handleDeleteFile,
        hasRealtimeData,
        handleClearRealtimeData,
        handleViewReport,
        unconfiguredGroups,
        ignoredUnconfiguredGroups,
        handleIgnoreGroup,
        handleRestoreGroup,
        editingTargetKho,
        setEditingTargetKho
    }), [
        status, appState, isProcessing, isFilterProcessing, isClearingDepartments, isExporting, fileInfo,
        departmentMap, originalData, baseFilteredData, warehouseFilteredData, productConfig, processedData, employeeAnalysisData,
        configUrl, uniqueFilterOptions,
        availableWeeks, availableMonths,
        filterState, handleFilterChange,
        pendingCloudSync, stableHandleAcceptCloudSync,
        activeModal, modalData,
        stableHandleClearDepartments, stableHandleClearData, stableHandleShiftFileProcessing, stableHandleFileProcessing,
        pendingNaming, pendingConflict,
        openPerformanceModal, openUnshippedModal, handleExport, handleBatchExport, handleBatchKhoExport, handleExportUncollectedSheet,
        pendingExport, handlePendingDownload, handlePendingShare, handlePendingClose,
        isLuyKe, handleLuyKeChange,
        processingTime,
        warehouseTargets, updateWarehouseTarget,
        warehouseDTThucTargets, updateWarehouseDTThucTarget,
        gtdhTargets, updateGtdhTarget, deleteGtdhTarget,
        crossSellingConfig, updateCrossSellingConfig,
        kpiCardsConfig, updateKpiCardsConfig,
        kpiTargets, updateKpiTargets,
        updateDepartmentMap,
        fileRegistry, refreshRegistry, handleToggleFileActive, handleDeleteFile,
        hasRealtimeData, handleClearRealtimeData, handleViewReport,
        unconfiguredGroups, ignoredUnconfiguredGroups, handleIgnoreGroup, handleRestoreGroup,
        editingTargetKho
    ]);
};

