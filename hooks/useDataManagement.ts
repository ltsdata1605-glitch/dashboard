import { useState, useEffect, useMemo, startTransition } from 'react';
import type { DataRow, FilterState, ProductConfig, ProcessedData, Status, AppState } from '../types';
import type { DepartmentMap } from '../services/dataService';
import * as dbService from '../services/dbService';
import { loadConfigFromSheet } from '../services/dataService';
import { applyFiltersAndProcess } from '../services/filterService';
import { useAuth } from '../contexts/AuthContext';

interface DataManagementProps {
    filterState: FilterState;
    configUrl: string;
    setStatus: (status: Status) => void;
    setAppState: (state: AppState) => void;
}

export const useDataManagement = ({ filterState, configUrl, setStatus, setAppState }: DataManagementProps) => {
    const { user, userRole, departmentId, employeeName, isDemoMode } = useAuth();
    const [originalData, setOriginalData] = useState<DataRow[]>([]);
    const [baseFilteredData, setBaseFilteredData] = useState<DataRow[]>([]);
    const [calendarSourceData, setCalendarSourceData] = useState<DataRow[]>([]);
    const [departmentMap, setDepartmentMap] = useState<DepartmentMap | null>(null);
    const [productConfig, setProductConfig] = useState<ProductConfig | null>(null);
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [employeeAnalysisData, setEmployeeAnalysisData] = useState<ProcessedData['employeeData'] | null>(null);
    const [warehouseTargets, setWarehouseTargets] = useState<Record<string, number>>({});
    const [gtdhTargets, setGtdhTargets] = useState<Record<string, number>>({});
    const [kpiTargets, setKpiTargets] = useState<{ hieuQua: number, traGop: number, gtdh?: number }>({ hieuQua: 40, traGop: 45, gtdh: 1 });
    const [crossSellingConfig, setCrossSellingConfig] = useState<any>(null);
    const [isHardProcessing, setIsHardProcessing] = useState(false);    // initial load / file upload
    const [isFilterProcessing, setIsFilterProcessing] = useState(false); // filter-only fast re-calc
    const [fileInfo, setFileInfo] = useState<{ filename: string; savedAt: string } | null>(null);

    // Initial data loading
    useEffect(() => {
        const loadInitialData = async () => {
            setAppState('loading');
            setIsHardProcessing(true);
            try {
                // Auto-Pull from Cloud First
                let cloudData: any = null;
                if (user && !isDemoMode) {
                    try {
                        setStatus({ message: 'Đang tải cấu hình Đám Mây...', type: 'info', progress: 5 });
                        const { fetchFromCloud } = await import('../services/firestoreService');
                        cloudData = await fetchFromCloud(user);
                    } catch (e) {
                        console.error("Lỗi PULL Firestore:", e);
                    }
                }

                setStatus({ message: 'Khởi tạo cấu hình hệ thống...', type: 'info', progress: 10 });
                let config: ProductConfig;
                if (cloudData && cloudData.productConfig) {
                    config = cloudData.productConfig;
                    await dbService.saveProductConfig(config, configUrl);
                } else {
                    const cachedConfig = await dbService.getProductConfig();
                    if (cachedConfig) {
                        config = cachedConfig.config;
                    } else {
                        config = await loadConfigFromSheet(configUrl, () => {});
                        await dbService.saveProductConfig(config, configUrl);
                    }
                }
                setProductConfig(config);

                if (cloudData && cloudData.departmentMap) {
                    setDepartmentMap(cloudData.departmentMap);
                    await dbService.saveDepartmentMap(cloudData.departmentMap);
                } else {
                    const savedDeptMap = await dbService.getDepartmentMap();
                    if (savedDeptMap) setDepartmentMap(savedDeptMap);
                }

                if (cloudData && cloudData.warehouseTargets) {
                    const targetArr = cloudData.warehouseTargets as any[];
                    const map: Record<string, number> = {};
                    targetArr.forEach(t => map[t.kho] = t.dsMucTieu);
                    setWarehouseTargets(map);
                    await dbService.saveWarehouseTargets(map);
                } else {
                    const savedTargets = await dbService.getWarehouseTargets();
                    if (savedTargets) setWarehouseTargets(savedTargets);
                }

                if (cloudData && cloudData.gtdhTargets) {
                    const targetArr = cloudData.gtdhTargets as any[];
                    const map: Record<string, number> = {};
                    targetArr.forEach(t => map[t.nhomHang] = t.gtdh);
                    setGtdhTargets(map);
                    await dbService.saveGtdhTargets(map);
                } else {
                    const savedGtdhTargets = await dbService.getGtdhTargets();
                    if (savedGtdhTargets) setGtdhTargets(savedGtdhTargets);
                }

                if (cloudData && cloudData.kpiTargets) {
                    setKpiTargets(cloudData.kpiTargets);
                    await dbService.saveKpiTargets(cloudData.kpiTargets);
                } else {
                    const savedKpiTargets = await dbService.getKpiTargets();
                    if (savedKpiTargets) setKpiTargets(savedKpiTargets);
                }

                if (cloudData && cloudData.crossSellingConfig) {
                    setCrossSellingConfig(cloudData.crossSellingConfig);
                    await dbService.saveCrossSellingConfig(cloudData.crossSellingConfig);
                } else {
                    const savedCrossSelling = await dbService.getCrossSellingConfig();
                    if (savedCrossSelling) setCrossSellingConfig(savedCrossSelling);
                }

                const savedSales = await dbService.getSalesData();
                if (savedSales && savedSales.data.length > 0) {
                    setStatus({ message: 'Đang tải dữ liệu đã lưu...', type: 'info', progress: 25 });
                    setFileInfo({ filename: savedSales.filename, savedAt: savedSales.savedAt.toLocaleString('vi-VN') });

                    const parseDataAndSet = () => {
                        let validCount = 0;
                        const srcData = savedSales.data;
                        const len = srcData.length;
                        for (let i = 0; i < len; i++) {
                            const row = srcData[i];
                            if (row.parsedDate) {
                                row.parsedDate = new Date(row.parsedDate as string);
                                if (!isNaN((row.parsedDate as Date).getTime())) {
                                    srcData[validCount++] = row;
                                }
                            }
                        }
                        srcData.length = validCount; // Cắt bỏ rác không hợp lệ
                        
                        startTransition(() => {
                            setOriginalData(srcData);
                            setAppState('processing');
                        });
                    };

                    // Yield Main Thread before parsing dates
                    setTimeout(parseDataAndSet, 10);

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

                let rbacData = originalData;
                if ((userRole === 'employee' || userRole === 'manager') && user?.email !== 'nguyendangkhoafit2@gmail.com') {
                    rbacData = originalData.filter(row => {
                        const kho = String(row['Mã kho tạo'] || '').trim();
                        // 1. Manager & Employee both need Kho matching
                        const allowedKhos = (departmentId || '').split(',').map(k => k.trim()).filter(Boolean);
                        if (!allowedKhos.includes(kho)) return false;
                        
                        // 2. Employee additional check for exact name match
                        if (userRole === 'employee') {
                            const emp = String(row['Người tạo'] || '').trim().toLowerCase();
                            if (emp !== employeeName?.trim().toLowerCase()) return false;
                        }
                        
                        return true;
                    });
                }

                const { processedData: result, baseFilteredData: newBaseData, calendarSourceData: newCalendarSourceData } = applyFiltersAndProcess(rbacData, productConfig, filterState, departmentMap);
                
                let employeeResultData = result.employeeData;
                if (departmentMap) {
                    const employeeFilterState = { ...filterState, department: [] };
                    const { processedData: employeeResult } = applyFiltersAndProcess(rbacData, productConfig, employeeFilterState, departmentMap);
                    employeeResultData = employeeResult.employeeData;
                }
                startTransition(() => {
                    setProcessedData(result);
                    setBaseFilteredData(newBaseData);
                    setCalendarSourceData(newCalendarSourceData);
                    setEmployeeAnalysisData(employeeResultData);
                    setAppState('dashboard');
                });
            } catch (error) {
                console.error("Lỗi khi xử lý lại dữ liệu:", error);
                const errorMsg = error instanceof Error ? error.message : "Đã xảy ra lỗi trong quá trình xử lý dữ liệu.";
                setStatus({ message: errorMsg, type: 'error', progress: 0 });
            } finally {
                setIsFilterProcessing(false);
            }
        }, 50); // Yield UI Thread to ensure loading spinner paints before heavy calculation

        return () => clearTimeout(timer);
    }, [originalData, productConfig, filterState, departmentMap, setStatus, userRole, departmentId, employeeName, user?.email]);

    // Unique filter options
    const uniqueFilterOptions = useMemo(() => {
        if (originalData.length === 0) return { kho: [], trangThai: [], nguoiTao: [], department: [], hangSX: [] };
        
        const khos = new Set<string>();
        const trangThais = new Set<string>();
        const nguoiTaos = new Set<string>();
        const hangSxs = new Set<string>();

        const len = originalData.length;
        for (let i = 0; i < len; i++) {
            const r = originalData[i];
            
            const kho = r['Mã kho tạo'];
            if (kho) khos.add(String(kho));
            
            const tt = r['Trạng thái hồ sơ'];
            if (tt) trangThais.add(String(tt));
            
            const tao = r['Người tạo'];
            if (tao) nguoiTaos.add(String(tao));
            
            const hsx = r['Hãng'] || r['Hãng SX'];
            if (hsx) hangSxs.add(String(hsx));
        }
        
        const khoOptions = Array.from(khos).sort();
        const trangThaiOptions = Array.from(trangThais).sort();
        const nguoiTaoOptions = Array.from(nguoiTaos).sort();
        const hangSXOptions = Array.from(hangSxs).sort();
        
        let deptOptions: string[] = [];
        if(departmentMap) {
            const uniqueDepartments = Array.from(new Set(Object.values(departmentMap).map(v => (v as string).split(';;')[0]))).sort();
            const excludedKeywords = ['quản lý', 'trưởng ca', 'kế toán', 'tiếp đón khách hàng'];
            deptOptions = uniqueDepartments.filter(d => !excludedKeywords.some(keyword => d.toLowerCase().includes(keyword)));
            
            // Check for unassigned employees
            const hasUnassigned = nguoiTaoOptions.some(empStr => {
                const id = empStr.split(' - ')[0].trim();
                return !departmentMap[id];
            });
            if (hasUnassigned && !deptOptions.includes('Chưa xác định')) {
                deptOptions.push('Chưa xác định');
            }
        }

        return { kho: khoOptions, trangThai: trangThaiOptions, nguoiTao: nguoiTaoOptions, department: deptOptions, hangSX: hangSXOptions };
    }, [originalData, departmentMap]);

    return {
        originalData, setOriginalData,
        baseFilteredData,
        calendarSourceData,
        departmentMap, setDepartmentMap,
        productConfig, setProductConfig,
        processedData, setProcessedData,
        employeeAnalysisData,
        warehouseTargets, setWarehouseTargets,
        gtdhTargets, setGtdhTargets,
        kpiTargets,
        updateKpiTargets: setKpiTargets,
        crossSellingConfig, setCrossSellingConfig,
        uniqueFilterOptions,
        isInternalProcessing: isHardProcessing, // only true during file upload / initial load
        fileInfo, setFileInfo
    };
};
