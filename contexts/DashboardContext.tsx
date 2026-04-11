
import React from 'react';
import type { ProcessedData, FilterState, ProductConfig, DataRow, Employee, EmployeeData } from '../types';
import { DepartmentMap } from '../services/dataService';

interface DashboardContextType {
    appState: 'upload' | 'processing' | 'dashboard' | 'loading';
    processedData: ProcessedData | null;
    filterState: FilterState;
    handleFilterChange: (newFilters: Partial<FilterState>) => void;
    productConfig: ProductConfig | null;
    originalData: DataRow[];
    baseFilteredData: DataRow[];
    warehouseFilteredData: DataRow[];
    calendarSourceData: DataRow[];
    departmentMap: DepartmentMap | null;
    updateDepartmentMap: (newMap: DepartmentMap) => void;
    employeeAnalysisData: EmployeeData | null;
    openPerformanceModal: (employeeName: string) => void;
    handleBatchExport: (employees: Employee[]) => void;
    handleBatchKhoExport: (element: HTMLElement | null, filenamePrefix: string, options?: any) => Promise<void>;
    handleExport: (element: HTMLElement | null, filename: string, options?: any) => Promise<void>;
    isProcessing: boolean;
    isExporting: boolean;
    uniqueFilterOptions: { kho: string[]; trangThai: string[]; nguoiTao: string[], department: string[], hangSX: string[] };
    warehouseTargets: Record<string, number>;
    updateWarehouseTarget: (kho: string, target: number) => void;
    warehouseDTThucTargets: Record<string, number>;
    updateWarehouseDTThucTarget: (kho: string, target: number) => void;
    gtdhTargets: Record<string, number>;
    updateGtdhTarget: (nhomHang: string, target: number) => void;
    deleteGtdhTarget: (nhomHang: string) => void;
    kpiTargets: { hieuQua: number, traGop: number, gtdh?: number, doanhThuThuc?: number };
    updateKpiTargets: (targets: { hieuQua: number, traGop: number, gtdh?: number, doanhThuThuc?: number }) => void;
    crossSellingConfig: any;
    updateCrossSellingConfig: (config: any) => void;
    kpiCardsConfig: import('../types').KpiCardConfig[];
    updateKpiCardsConfig: (config: import('../types').KpiCardConfig[]) => void;
    isLuyKe: boolean;
    handleLuyKeChange: (enabled: boolean) => void;
    isDeduplicationEnabled: boolean;
    handleDeduplicationChange: (enabled: boolean) => void;
}

export const DashboardContext = React.createContext<DashboardContextType | undefined>(undefined);

export const useDashboardContext = () => {
    const context = React.useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboardContext must be used within a DashboardProvider');
    }
    return context;
};
