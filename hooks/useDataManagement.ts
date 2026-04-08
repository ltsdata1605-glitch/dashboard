import { useState, useEffect, useMemo, startTransition } from 'react';
import type { DataRow, FilterState, ProductConfig, ProcessedData, Status, AppState } from '../types';
import type { DepartmentMap } from '../services/dataService';
import * as dbService from '../services/dbService';
import { loadConfigFromSheet } from '../services/dataService';
import { applyFiltersAndProcess } from '../services/filterService';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_KPI_CARDS } from '../constants';

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
    const [warehouseFilteredData, setWarehouseFilteredData] = useState<DataRow[]>([]);
    const [calendarSourceData, setCalendarSourceData] = useState<DataRow[]>([]);
    const [departmentMap, setDepartmentMap] = useState<DepartmentMap | null>(null);
    const [productConfig, setProductConfig] = useState<ProductConfig | null>(null);
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [employeeAnalysisData, setEmployeeAnalysisData] = useState<ProcessedData['employeeData'] | null>(null);
    const [warehouseTargets, setWarehouseTargets] = useState<Record<string, number>>({});
    const [gtdhTargets, setGtdhTargets] = useState<Record<string, number>>({});
    const [kpiTargets, setKpiTargets] = useState<{ hieuQua: number, traGop: number, gtdh?: number }>({ hieuQua: 40, traGop: 45, gtdh: 1 });
    const [kpiCardsConfig, setKpiCardsConfig] = useState<import('../types').KpiCardConfig[]>([]);
    const [crossSellingConfig, setCrossSellingConfig] = useState<any>(null);
    const [isHardProcessing, setIsHardProcessing] = useState(false);    // initial load / file upload
    const [isFilterProcessing, setIsFilterProcessing] = useState(false); // filter-only fast re-calc
    const [fileInfo, setFileInfo] = useState<{ filename: string; savedAt: string } | null>(null);
    const [pendingCloudSync, setPendingCloudSync] = useState<{ fileId: string; name: string; timestamp: number } | null>(null);

// Initial data loading
    useEffect(() => {
        const loadInitialData = async () => {
            setAppState('loading');
            setIsHardProcessing(true);
            try {
                setStatus({ message: 'Đang tải cấu hình cục bộ...', type: 'info', progress: 10 });
                
                // 1. Parallel Local IDB Fetch (Fast Offline First)
                const [
                    cachedConfigReq,
                    savedDeptMapReq,
                    savedTargetsReq,
                    savedGtdhTargetsReq,
                    savedKpiTargetsReq,
                    savedCrossSellingReq,
                    savedKpiCardConfigReq,
                    savedSalesReq
                ] = await Promise.all([
                    dbService.getProductConfig(),
                    dbService.getDepartmentMap(),
                    dbService.getWarehouseTargets(),
                    dbService.getGtdhTargets(),
                    dbService.getKpiTargets(),
                    dbService.getCrossSellingConfig(),
                    dbService.getKpiCardConfig(),
                    dbService.getSalesData()
                ]);

                let config: ProductConfig | null = cachedConfigReq ? cachedConfigReq.config : null;
                
                // If core config is essentially missing locally, fetch it from Sheet as ultimate fallback
                if (!config || !config.groups || Object.keys(config.groups).length === 0) {
                    try {
                        setStatus({ message: 'Tải cấu hình lõi từ Sheet...', type: 'info', progress: 15 });
                        config = await loadConfigFromSheet(configUrl, () => {});
                        dbService.saveProductConfig(config, configUrl).catch(console.error);
                    } catch (e) {
                         console.error("Không tải được cấu hình mạng, sử dụng dữ liệu cũ rỗng.");
                    }
                }
                if (config) setProductConfig(config);

                if (savedDeptMapReq) setDepartmentMap(savedDeptMapReq);
                if (savedTargetsReq) setWarehouseTargets(savedTargetsReq);
                if (savedGtdhTargetsReq) setGtdhTargets(savedGtdhTargetsReq);
                if (savedKpiTargetsReq) setKpiTargets(savedKpiTargetsReq);
                if (savedCrossSellingReq) setCrossSellingConfig(savedCrossSellingReq);
                
                if (savedKpiCardConfigReq && savedKpiCardConfigReq.length > 0) {
                    setKpiCardsConfig(savedKpiCardConfigReq);
                } else {
                    setKpiCardsConfig(DEFAULT_KPI_CARDS);
                    dbService.saveKpiCardConfig(DEFAULT_KPI_CARDS).catch(console.error);
                }

                let isLocalDataPushed = false;
                
                // Mount Local Data right away
                if (savedSalesReq && savedSalesReq.data.length > 0) {
                    setStatus({ message: 'Nạp dữ liệu đã lưu lên bảng điều khiển...', type: 'info', progress: 25 });
                    setFileInfo({ filename: savedSalesReq.filename, savedAt: savedSalesReq.savedAt.toLocaleString('vi-VN') });

                    const parseDataAndSet = () => {
                        let validCount = 0;
                        const srcData = savedSalesReq.data;
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

                    // Yield Main Thread before array iteration
                    setTimeout(parseDataAndSet, 5);
                    isLocalDataPushed = true;
                } else {
                    setAppState('upload');
                }

                // 2. Background Cloud Sync
                if (user && !isDemoMode) {
                    import('../services/firestoreService').then(async ({ fetchFromCloud }) => {
                        try {
                            const cloudData = await fetchFromCloud(user);
                            if (!cloudData) return;
                            
                            // Ngầm ghi đè và Re-render (Không freeze UI)
                            if (cloudData.productConfig) {
                                setProductConfig(cloudData.productConfig);
                                dbService.saveProductConfig(cloudData.productConfig, configUrl).catch(console.error);
                            }
                            if (cloudData.departmentMap) {
                                setDepartmentMap(cloudData.departmentMap);
                                dbService.saveDepartmentMap(cloudData.departmentMap).catch(console.error);
                            }
                            if (cloudData.warehouseTargets) {
                                const map: Record<string, number> = {};
                                (cloudData.warehouseTargets as any[]).forEach(t => map[t.kho] = t.dsMucTieu);
                                setWarehouseTargets(map);
                                dbService.saveWarehouseTargets(map).catch(console.error);
                            }
                            if (cloudData.gtdhTargets) {
                                const map: Record<string, number> = {};
                                (cloudData.gtdhTargets as any[]).forEach(t => map[t.nhomHang] = t.gtdh);
                                setGtdhTargets(map);
                                dbService.saveGtdhTargets(map).catch(console.error);
                            }
                            if (cloudData.kpiTargets) {
                                setKpiTargets(cloudData.kpiTargets);
                                dbService.saveKpiTargets(cloudData.kpiTargets).catch(console.error);
                            }
                            if (cloudData.crossSellingConfig) {
                                setCrossSellingConfig(cloudData.crossSellingConfig);
                                dbService.saveCrossSellingConfig(cloudData.crossSellingConfig).catch(console.error);
                            }
                            if (cloudData.kpiCardConfig) {
                                setKpiCardsConfig(cloudData.kpiCardConfig);
                                dbService.saveKpiCardConfig(cloudData.kpiCardConfig).catch(console.error);
                            }
                            if (cloudData.settingsStoreBackup) {
                                Object.entries(cloudData.settingsStoreBackup).forEach(([k, v]) => {
                                    dbService.saveSetting(k, v).catch(console.error);
                                });
                            }
                            if (cloudData.latestDriveUpload) {
                                const localSavedAt = savedSalesReq ? savedSalesReq.savedAt.getTime() : 0;
                                const localFileTs = savedSalesReq ? savedSalesReq.fileLastModified : 0;
                                
                                let isExactlySameExcel = false;
                                if (cloudData.latestDriveUpload.fileLastModified && localFileTs) {
                                    if (cloudData.latestDriveUpload.fileLastModified === localFileTs) {
                                        isExactlySameExcel = true;
                                    }
                                }
                                
                                if (!isExactlySameExcel && cloudData.latestDriveUpload.timestamp > localSavedAt + 15000) {
                                    setPendingCloudSync(cloudData.latestDriveUpload);
                                }
                            }
                        } catch (e) {
                            console.error("Lỗi PULL Firestore ngầm:", e);
                        }
                    });
                }

                // 3. Background Sheet Check
                if (isLocalDataPushed && config) {
                    setTimeout(async () => {
                        try {
                            const latestConfig = await loadConfigFromSheet(configUrl, () => {});
                            if (JSON.stringify(config) !== JSON.stringify(latestConfig)) {
                                console.log("Phát hiện cấu hình ProductConfig mới tĩnh, đang tự động nạp ngầm...");
                                dbService.saveProductConfig(latestConfig, configUrl).catch(console.error);
                                setProductConfig(latestConfig);
                            }
                        } catch (updateError) {
                            console.warn("Không thể kiểm tra Sheet tĩnh:", updateError);
                        }
                    }, 2000);
                }

            } catch (e) {
                console.error("Lỗi khi khởi chạy hệ thống dữ liệu:", e);
                const msg = e instanceof Error ? e.message : 'Dữ liệu bộ đệm bị hỏng. Bạn hãy F5 để thử lại.';
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
                if (!isDemoMode && (userRole === 'employee' || userRole === 'manager') && user?.email !== 'nguyendangkhoafit2@gmail.com') {
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

                const { processedData: result, baseFilteredData: newBaseData, warehouseFilteredData: newWarehouseData, calendarSourceData: newCalendarSourceData } = applyFiltersAndProcess(rbacData, productConfig, filterState, departmentMap);
                
                startTransition(() => {
                    setProcessedData(result);
                    setBaseFilteredData(newBaseData);
                    setWarehouseFilteredData(newWarehouseData);
                    setCalendarSourceData(newCalendarSourceData);
                    setEmployeeAnalysisData(result.employeeData);
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
    }, [originalData, productConfig, filterState, departmentMap, setStatus, userRole, departmentId, employeeName, user?.email, isDemoMode]);

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

    const handleAcceptCloudSync = async (handleFileProcessing: (files: File[], isCloudSync?: boolean) => Promise<void>) => {
        if (!pendingCloudSync) return;
        try {
            setStatus({ message: `Đang kết nối Google Drive để tải ${pendingCloudSync.name}...`, type: 'info', progress: 10 });
            setAppState('loading');
            
            const token = sessionStorage.getItem('googleOAuthToken');
            if (!token) {
                setStatus({ message: `Bắt đầu yêu cầu kết nối Google...`, type: 'info', progress: 20 });
                const { loginWithGoogle } = await import('../services/firebase');
                const user = await loginWithGoogle(); // Requires explicit popup action, probably should wrap in user interaction before calling this handleAcceptCloudSync
            }
            
            const activeToken = sessionStorage.getItem('googleOAuthToken');
            if (!activeToken) throw new Error('Không thể lấy phiên làm việc Google');

            const { downloadFileFromDrive } = await import('../services/googleDriveService');
            setStatus({ message: `Đang tải file ${pendingCloudSync.name}...`, type: 'info', progress: 30 });
            const blob = await downloadFileFromDrive(pendingCloudSync.fileId, activeToken);
            
            const newFile = new File([blob], pendingCloudSync.name, { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                lastModified: pendingCloudSync.timestamp
            });
            
            setPendingCloudSync(null); // Clear pending state
            await handleFileProcessing([newFile], true); // Pass true to bypass redundant Drive upload loop
        } catch (e: any) {
            console.error("Lỗi khi tải đồng bộ:", e);
            setStatus({ message: "Lỗi đồng bộ: " + e.message, type: 'error', progress: 0 });
            setAppState('dashboard');
        }
    };

    return {
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
        kpiTargets,
        updateKpiTargets: setKpiTargets,
        kpiCardsConfig, 
        setKpiCardsConfig,
        crossSellingConfig, setCrossSellingConfig,
        uniqueFilterOptions,
        isInternalProcessing: isHardProcessing, // only true during file upload / initial load
        fileInfo, setFileInfo,
        pendingCloudSync, setPendingCloudSync,
        handleAcceptCloudSync
    };
};
