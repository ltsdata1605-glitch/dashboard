
import { useState, useEffect, useCallback } from 'react';
import type { Status, AppState } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Import specialized hooks
import { useExportLogic } from './useExportLogic';
import { useFileUploadLogic } from './useFileUploadLogic';
import { useFilterState } from './useFilterState';
import { useDataManagement } from './useDataManagement';
import { useWarehouseTargets } from './useWarehouseTargets';
import * as dbService from '../services/dbService';

export const useDashboardLogic = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState<Status>({ message: '', type: 'info', progress: 0 });
    const [appState, setAppState] = useState<AppState>('loading');
    const [configUrl, setConfigUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vRhes_lcas8n2_xYHKylsjyD3PIVbdchCiL2XDKJ4OYfgUZlVjAT7ZGWDHrYRzQVrK2w50W86Da3l48/pub?output=csv');
    const [isDeduplicationEnabled, setIsDeduplicationEnabled] = useState(true);
    const [activeModal, setActiveModal] = useState<'performance' | 'unshipped' | 'unshipped_overdue' | 'changelog' | null>(null);
    const [modalData, setModalData] = useState<any>(null);

    // 1. Filter State Management
    const { filterState, setFilterState, handleFilterChange, isFilterLoaded } = useFilterState();

    // 2. Data Management (Loading, Processing, Unique Options)
    const {
        originalData, setOriginalData,
        baseFilteredData,
        warehouseFilteredData,
        calendarSourceData,
        departmentMap, setDepartmentMap,
        productConfig, setProductConfig,
        processedData, setProcessedData,
        employeeAnalysisData,
        warehouseTargets, setWarehouseTargets,
        gtdhTargets, setGtdhTargets,
        uniqueFilterOptions,
        crossSellingConfig, setCrossSellingConfig,
        kpiCardsConfig, setKpiCardsConfig,
        kpiTargets, updateKpiTargets,
        isInternalProcessing,
        fileInfo, setFileInfo,
        pendingCloudSync, setPendingCloudSync,
        handleAcceptCloudSync
    } = useDataManagement({ filterState, configUrl, setStatus, setAppState });

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
        handleClearDepartments
    } = useFileUploadLogic({
        isDeduplicationEnabled,
        originalData,
        setOriginalData,
        setDepartmentMap,
        setProcessedData,
        setFileInfo,
        setAppState,
        setStatus,
        setFilterState,
        user
    });

    // 6. Export Logic
    const {
        isExporting, handleExport, handleBatchExport, handleBatchKhoExport
    } = useExportLogic({
        productConfig,
        processedData,
        uniqueFilterOptions,
        filterState,
        handleFilterChange,
        setStatus
    });

    // Removed repopulating filter state effects here because they caused 
    // a bug where empty filters (Select All unselected) would instantly 
    // reset to "Select All" again, blocking the user from selecting just 1 department.
    
    const openPerformanceModal = (employeeName: string) => {
        setModalData({ employeeName });
        setActiveModal('performance');
    };

    const openUnshippedModal = () => setActiveModal('unshipped');

    // NOTE: Settings sync to Firebase is handled automatically by useCloudSync hook
    // which listens to 'ycx-setting-changed' events dispatched by dbService.saveSetting().
    // No need for manual triggerCloudSync calls — saving to IndexedDB triggers the event chain.

    const handleDeduplicationChange = (enabled: boolean) => {
        setIsDeduplicationEnabled(enabled);
        dbService.saveDeduplicationSetting(enabled).catch(console.error);
    };

    const updateWarehouseTarget = (kho: string, target: number) => {
        handleSaveWarehouseTargets({ ...warehouseTargets, [kho]: target });
    };
    
    const isProcessing = isInternalProcessing || isFileProcessing;

    return {
        status, appState, isProcessing, isClearingDepartments, isExporting, fileInfo,
        departmentMap, originalData, baseFilteredData, warehouseFilteredData, calendarSourceData, productConfig, processedData, employeeAnalysisData,
        configUrl, setConfigUrl, uniqueFilterOptions,
        filterState, handleFilterChange,
        pendingCloudSync, setPendingCloudSync, handleAcceptCloudSync,
        activeModal, setActiveModal, modalData,
        handleClearDepartments, handleClearData, handleShiftFileProcessing, handleFileProcessing,
        openPerformanceModal, openUnshippedModal, handleExport,
        handleBatchExport,
        handleBatchKhoExport,
        isDeduplicationEnabled,
        handleDeduplicationChange,
        processingTime,
        warehouseTargets,
        updateWarehouseTarget,
        gtdhTargets,
        updateGtdhTarget: async (nhomHang: string, target: number) => {
            const newTargets = { ...gtdhTargets, [nhomHang]: target };
            setGtdhTargets(newTargets);
            await dbService.saveGtdhTargets(newTargets);
        },
        deleteGtdhTarget: async (nhomHang: string) => {
            const newTargets = { ...gtdhTargets };
            delete newTargets[nhomHang];
            setGtdhTargets(newTargets);
            await dbService.saveGtdhTargets(newTargets);
        },
        crossSellingConfig,
        updateCrossSellingConfig: async (config: any) => {
            setCrossSellingConfig(config);
            await dbService.saveCrossSellingConfig(config);
        },
        kpiCardsConfig,
        updateKpiCardsConfig: async (config: import('../types').KpiCardConfig[]) => {
            setKpiCardsConfig(config);
            await dbService.saveKpiCardConfig(config);
        },
        kpiTargets,
        updateKpiTargets: async (targets: { hieuQua: number, traGop: number, gtdh?: number, doanhThuThuc?: number }) => {
            updateKpiTargets(targets);
            await dbService.saveKpiTargets(targets);
        },
        updateDepartmentMap: async (map: any) => {
            setDepartmentMap(map);
            await dbService.saveDepartmentMap(map);
        }
    };
};

