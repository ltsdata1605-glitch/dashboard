
import { useState, useEffect, useMemo } from 'react';
import type { DataRow, FilterState, ProductConfig, ProcessedData, Status, AppState } from '../types';
import type { DepartmentMap } from '../services/dataService';
import * as dbService from '../services/dbService';
import { loadConfigFromSheet } from '../services/dataService';
import { applyFiltersAndProcess } from '../services/filterService';

interface DataManagementProps {
    filterState: FilterState;
    configUrl: string;
    setStatus: (status: Status) => void;
    setAppState: (state: AppState) => void;
}

export const useDataManagement = ({ filterState, configUrl, setStatus, setAppState }: DataManagementProps) => {
    const [originalData, setOriginalData] = useState<DataRow[]>([]);
    const [baseFilteredData, setBaseFilteredData] = useState<DataRow[]>([]);
    const [departmentMap, setDepartmentMap] = useState<DepartmentMap | null>(null);
    const [productConfig, setProductConfig] = useState<ProductConfig | null>(null);
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [employeeAnalysisData, setEmployeeAnalysisData] = useState<ProcessedData['employeeData'] | null>(null);
    const [warehouseTargets, setWarehouseTargets] = useState<Record<string, number>>({});
    const [isHardProcessing, setIsHardProcessing] = useState(false);    // initial load / file upload
    const [isFilterProcessing, setIsFilterProcessing] = useState(false); // filter-only fast re-calc
    const [fileInfo, setFileInfo] = useState<{ filename: string; savedAt: string } | null>(null);

    // Initial data loading
    useEffect(() => {
        const loadInitialData = async () => {
            setAppState('loading');
            setIsHardProcessing(true);
            try {
                let config: ProductConfig;
                const cachedConfig = await dbService.getProductConfig();
                if (cachedConfig) {
                    config = cachedConfig.config;
                } else {
                    config = await loadConfigFromSheet(configUrl, () => {});
                    await dbService.saveProductConfig(config, configUrl);
                }
                setProductConfig(config);

                const savedDeptMap = await dbService.getDepartmentMap();
                if (savedDeptMap) setDepartmentMap(savedDeptMap);

                const savedTargets = await dbService.getWarehouseTargets();
                if (savedTargets) setWarehouseTargets(savedTargets);

                const savedSales = await dbService.getSalesData();
                if (savedSales && savedSales.data.length > 0) {
                    setStatus({ message: 'Đang tải dữ liệu đã lưu...', type: 'info', progress: 25 });
                    setFileInfo({ filename: savedSales.filename, savedAt: savedSales.savedAt.toLocaleString('vi-VN') });

                    const rehydratedData = savedSales.data.map(row => ({
                        ...row,
                        parsedDate: row.parsedDate ? new Date(row.parsedDate as string) : null,
                    })).filter(row => row.parsedDate && !isNaN(row.parsedDate.getTime()));
                    
                    setOriginalData(rehydratedData);
                    setAppState('dashboard');

                    try {
                        const latestConfig = await loadConfigFromSheet(configUrl, () => {});
                        if (JSON.stringify(config) !== JSON.stringify(latestConfig)) {
                            console.log("Phát hiện cấu hình mới, đang tự động cập nhật...");
                            await dbService.saveProductConfig(latestConfig, configUrl);
                            setProductConfig(latestConfig);
                        }
                    } catch (updateError) {
                        console.warn("Không thể kiểm tra cập nhật cấu hình tự động:", updateError);
                    }
                } else {
                    setAppState('upload');
                }
            } catch (e) {
                console.error("Lỗi khi tải dữ liệu ban đầu:", e);
                const msg = e instanceof Error ? e.message : 'Lỗi không xác định khi tải dữ liệu.';
                setStatus({ message: msg, type: 'error', progress: 0 });
                setAppState('upload');
                await Promise.all([dbService.clearSalesData(), dbService.clearProductConfig()]);
            } finally {
                setIsHardProcessing(false);
            }
        };
        loadInitialData();
    }, [configUrl, setAppState, setStatus]);

    // Central Data Processing
    useEffect(() => {
        // We use a separate effect for processing to avoid blocking the main thread
        // and to handle dependencies correctly
        if (!originalData.length || !productConfig) return;

        // For filter changes, we DON'T set isHardProcessing to avoid layout shift.
        // isFilterProcessing is a soft signal (optional, kept for future use).
        const timer = setTimeout(() => {
            try {
                if (!productConfig) {
                    throw new Error("Cấu hình sản phẩm chưa được tải. Vui lòng đợi trong giây lát.");
                }

                const { processedData: result, baseFilteredData: newBaseData } = applyFiltersAndProcess(originalData, productConfig, filterState, departmentMap);
                setProcessedData(result);
                setBaseFilteredData(newBaseData);
                
                if (departmentMap) {
                    const employeeFilterState = { ...filterState, department: [] };
                    const { processedData: employeeResult } = applyFiltersAndProcess(originalData, productConfig, employeeFilterState, departmentMap);
                    setEmployeeAnalysisData(employeeResult.employeeData);
                } else {
                    setEmployeeAnalysisData(result.employeeData);
                }
            } catch (error) {
                console.error("Lỗi khi xử lý lại dữ liệu:", error);
                const errorMsg = error instanceof Error ? error.message : "Đã xảy ra lỗi trong quá trình xử lý dữ liệu.";
                setStatus({ message: errorMsg, type: 'error', progress: 0 });
            } finally {
                setIsFilterProcessing(false);
            }
        }, 0); // run as soon as possible without triggering a hard loading state

        return () => clearTimeout(timer);
    }, [originalData, productConfig, filterState, departmentMap, setStatus]);

    // Unique filter options
    const uniqueFilterOptions = useMemo(() => {
        if (originalData.length === 0) return { kho: [], trangThai: [], nguoiTao: [], department: [] };
        
        const khoOptions = [...new Set(originalData.map(r => r['Mã kho tạo']).filter(Boolean).map(String))].sort();
        const trangThaiOptions = [...new Set(originalData.map(r => r['Trạng thái hồ sơ']).filter(Boolean).map(String))].sort();
        const nguoiTaoOptions = [...new Set(originalData.map(r => r['Người tạo']).filter(Boolean).map(String))].sort();
        
        let deptOptions: string[] = [];
        if(departmentMap) {
            const uniqueDepartments = Array.from(new Set(Object.values(departmentMap).map(v => (v as string).split(';;')[0]))).sort();
            const excludedKeywords = ['quản lý', 'trưởng ca', 'kế toán', 'tiếp đón khách hàng'];
            deptOptions = uniqueDepartments.filter(d => !excludedKeywords.some(keyword => d.toLowerCase().includes(keyword)));
        }

        return { kho: khoOptions, trangThai: trangThaiOptions, nguoiTao: nguoiTaoOptions, department: deptOptions };
    }, [originalData, departmentMap]);

    return {
        originalData, setOriginalData,
        baseFilteredData,
        departmentMap, setDepartmentMap,
        productConfig, setProductConfig,
        processedData, setProcessedData,
        employeeAnalysisData,
        warehouseTargets, setWarehouseTargets,
        uniqueFilterOptions,
        isInternalProcessing: isHardProcessing, // only true during file upload / initial load
        fileInfo, setFileInfo
    };
};
