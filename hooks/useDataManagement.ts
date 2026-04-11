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
    isDeduplicationEnabled: boolean;
    setStatus: (status: Status) => void;
    setAppState: (state: AppState) => void;
}

export const useDataManagement = ({ filterState, configUrl, isDeduplicationEnabled, setStatus, setAppState }: DataManagementProps) => {
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
    const [warehouseDTThucTargets, setWarehouseDTThucTargets] = useState<Record<string, number>>({});
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
                    savedSalesReq,
                    savedDTThucTargetsReq
                ] = await Promise.all([
                    dbService.getProductConfig(),
                    dbService.getDepartmentMap(),
                    dbService.getWarehouseTargets(),
                    dbService.getGtdhTargets(),
                    dbService.getKpiTargets(),
                    dbService.getCrossSellingConfig(),
                    dbService.getKpiCardConfig(),
                    dbService.getSalesData(),
                    dbService.getSetting<Record<string, number>>('warehouseDTThucTargets')
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
                if (savedDTThucTargetsReq) setWarehouseDTThucTargets(savedDTThucTargetsReq);
                
                if (savedKpiCardConfigReq && savedKpiCardConfigReq.length > 0) {
                    // Migration: update order & colors for core KPI cards to match new design
                    const coreCardUpdates: Record<string, { order: number, iconColor: string }> = {
                        'kpi-dtthuc': { order: 1, iconColor: 'emerald' },
                        'kpi-dtqd': { order: 2, iconColor: 'blue' },
                        'kpi-hieuqua': { order: 3, iconColor: 'purple' },
                        'kpi-tragop': { order: 4, iconColor: 'amber' },
                        'kpi-dtchuaxuat': { order: 5, iconColor: 'rose' },
                    };
                    let migratedConfig = savedKpiCardConfigReq.map(card => {
                        const update = coreCardUpdates[card.id];
                        if (update) {
                            return { ...card, order: update.order, iconColor: update.iconColor };
                        }
                        return card;
                    });
                    // Migration: inject "DT Chưa Xuất" card if not present
                    if (!migratedConfig.find(c => c.id === 'kpi-dtchuaxuat')) {
                        const dtChuaXuatCard = DEFAULT_KPI_CARDS.find(c => c.id === 'kpi-dtchuaxuat');
                        if (dtChuaXuatCard) {
                            migratedConfig.push(dtChuaXuatCard);
                        }
                    }
                    setKpiCardsConfig(migratedConfig);
                    dbService.saveKpiCardConfig(migratedConfig).catch(console.error);
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

                            const localLastMod = await dbService.getSetting<number>('localSettingsLastModified') || 0;
                            const cloudLastMod = cloudData.lastSync ? new Date(cloudData.lastSync).getTime() : 0;

                            // Chống ghi đè từ Cloud CŨ xuống Local MỚI (xảy ra khi F5 trước khi sync 15 phút)
                            if (cloudLastMod < localLastMod) {
                                console.log('[Cloud Sync] Local data is newer than Firebase. Skipping overwrite and pushing local to cloud...');
                                window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key: 'force_push_override' } }));
                                return;
                            }
                            
                            // Ngầm ghi đè và Re-render (Không freeze UI)
                            if (cloudData.settingsStoreBackup) {
                                const backup = cloudData.settingsStoreBackup;
                                // 1. Bulk save to IDB first
                                Object.entries(backup).forEach(([k, v]) => {
                                    dbService.saveSetting(k, v).catch(console.error);
                                });
                                
                                // 2. Hydrate React states safely without breaking app structure
                                if (backup.departmentMap) setDepartmentMap(backup.departmentMap);
                                if (backup.warehouseTargets) setWarehouseTargets(backup.warehouseTargets);
                                if (backup.gtdhTargets) setGtdhTargets(backup.gtdhTargets);
                                if (backup.kpiTargets) setKpiTargets(backup.kpiTargets);
                                if (backup.crossSellingConfig) setCrossSellingConfig(backup.crossSellingConfig);
                                if (backup.kpiCardConfig) setKpiCardsConfig(backup.kpiCardConfig);
                                
                                // 3. Re-hydrate product config after saving to IDB to ensure Sets are restored
                                if (backup.productConfig) {
                                    dbService.getProductConfig().then(res => {
                                        if (res && res.config) setProductConfig(res.config);
                                    }).catch(console.error);
                                }
                            } else {
                                // Legacy fallback for very old accounts
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
                            }

                            // Always process latestDriveUpload because it is explicitly synced outside settingsStoreBackup
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
                        } catch (e: any) {
                            // Background cloud pull is non-critical — app works fully offline
                            const errMsg = (e?.message || '').toLowerCase();
                            if (errMsg.includes('failed to fetch') || errMsg.includes('network') || errMsg.includes('offline')) {
                                console.info("☁️ Đồng bộ đám mây bỏ qua: không có kết nối mạng. Đang sử dụng dữ liệu cục bộ.");
                            } else {
                                console.warn("⚠️ Đồng bộ đám mây thất bại (không ảnh hưởng app):", e?.message || e);
                            }
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

                const { processedData: result, baseFilteredData: newBaseData, warehouseFilteredData: newWarehouseData, calendarSourceData: newCalendarSourceData } = applyFiltersAndProcess(rbacData, productConfig, filterState, departmentMap, isDeduplicationEnabled);
                
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
    }, [originalData, productConfig, filterState, departmentMap, isDeduplicationEnabled, setStatus, userRole, departmentId, employeeName, user?.email, isDemoMode]);

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
            setStatus({ message: `📊 Đang kết nối Google Drive để tải file "${pendingCloudSync.name}"...`, type: 'info', progress: 10 });
            setAppState('loading');
            
            const token = sessionStorage.getItem('googleOAuthToken');
            if (!token) {
                setStatus({ message: `🔑 Đang yêu cầu quyền truy cập Google Drive...`, type: 'info', progress: 20 });
                const { loginWithGoogle } = await import('../services/firebase');
                await loginWithGoogle();
            }
            
            const activeToken = sessionStorage.getItem('googleOAuthToken');
            if (!activeToken) throw new Error('AUTH_EXPIRED');

            const { downloadFileFromDrive } = await import('../services/googleDriveService');
            setStatus({ message: `⬇️ Đang tải file Excel "${pendingCloudSync.name}" từ Google Drive...`, type: 'info', progress: 30 });
            const blob = await downloadFileFromDrive(pendingCloudSync.fileId, activeToken);
            
            const newFile = new File([blob], pendingCloudSync.name, { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                lastModified: pendingCloudSync.timestamp
            });
            
            setPendingCloudSync(null);
            await handleFileProcessing([newFile], true);
        } catch (e: any) {
            console.error("Lỗi khi tải đồng bộ:", e);
            
            // User-friendly error messages based on error type
            let userMessage = '';
            const errMsg = (e?.message || '').toLowerCase();
            
            if (errMsg.includes('failed to fetch') || errMsg.includes('networkerror') || errMsg.includes('network')) {
                userMessage = '🌐 Không thể kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại. Dữ liệu hiện tại trên máy vẫn hoạt động bình thường.';
            } else if (errMsg === 'auth_expired' || errMsg.includes('unauthenticated') || errMsg.includes('401')) {
                userMessage = '🔑 Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại Google để đồng bộ file.';
            } else if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('429')) {
                userMessage = '⏳ Máy chủ tạm thời quá tải. Dữ liệu đã lưu an toàn trên máy, hệ thống sẽ tự đồng bộ lại sau.';
            } else if (errMsg.includes('not found') || errMsg.includes('404')) {
                userMessage = '📁 File trên Google Drive không còn tồn tại hoặc đã bị xoá. Vui lòng tải lên file mới.';
            } else if (errMsg.includes('permission') || errMsg.includes('403')) {
                userMessage = '🔒 Không có quyền truy cập file. Vui lòng kiểm tra quyền chia sẻ trên Google Drive.';
            } else {
                userMessage = `⚠️ Lỗi đồng bộ file dữ liệu: ${e.message}. Dữ liệu hiện tại trên máy không bị ảnh hưởng.`;
            }
            
            setStatus({ message: userMessage, type: 'error', progress: 0 });
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
        warehouseDTThucTargets, setWarehouseDTThucTargets,
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
