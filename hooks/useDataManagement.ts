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
    const [pendingCloudSync, setPendingCloudSync] = useState<{ data: DataRow[]; meta: { filename: string; savedAt: number; fileLastModified: number; totalRows: number } } | null>(null);

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
                const cachedUrl = cachedConfigReq ? cachedConfigReq.url : '';
                
                // If core config is missing, URL has changed, or the new product groups (7161/7139) are missing, force load from sheet
                const isConfigOutOfDate = !config || !config.groups || Object.keys(config.groups).length === 0 || 
                                          cachedUrl !== configUrl || 
                                          !config.childToParentMap['7161 - Dịch vụ bảo hành 1 đổi 1 Thợ Điện Máy Xanh'] ||
                                          !config.childToParentMap['7139 - Dịch vụ Bảo hành mở rộng Thợ Điện Máy Xanh'];

                if (isConfigOutOfDate) {
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

                // 2. Background Cloud Sync (Settings + Sales Data)
                if (user && !isDemoMode) {
                    // 2a. Settings sync (existing firestoreService)
                    import('../services/firestoreService').then(async ({ fetchFromCloud, fetchHeavySettingsFromCloud, syncHeavySettingToCloud, HEAVY_SYNC_KEYS, isHeavySyncKey }) => {
                        try {
                            const [cloudData, heavyCloudData] = await Promise.all([
                                fetchFromCloud(user).catch(err => { console.warn("Lỗi tải cấu hình nhẹ:", err); return null; }),
                                fetchHeavySettingsFromCloud(user).catch(err => { console.warn("Lỗi tải cấu hình nặng:", err); return {}; })
                            ]);

                            // 1. Đồng bộ cấu hình nhẹ
                            let forcePushLight = false;
                            if (cloudData) {
                                const localLastMod = await dbService.getSetting<number>('localSettingsLastModified') || 0;
                                const cloudLastMod = cloudData.lastSync ? new Date(cloudData.lastSync).getTime() : 0;

                                if (cloudLastMod < localLastMod) {
                                    console.log('[Cloud Sync] Cấu hình nhẹ local mới hơn Cloud. Đang chuẩn bị đồng bộ lên...');
                                    forcePushLight = true;
                                } else if (cloudData.settingsStoreBackup) {
                                    const backup = cloudData.settingsStoreBackup;
                                    Object.entries(backup).forEach(([k, v]) => {
                                        dbService.saveSettingFromCloud(k, v, cloudLastMod).catch(console.error);
                                    });
                                    if (backup.warehouseTargets) setWarehouseTargets(backup.warehouseTargets);
                                    if (backup.gtdhTargets) setGtdhTargets(backup.gtdhTargets);
                                    if (backup.kpiTargets) setKpiTargets(backup.kpiTargets);
                                    if (backup.kpiCardConfig) setKpiCardsConfig(backup.kpiCardConfig);
                                }
                            } else {
                                forcePushLight = true;
                            }

                            // 2. Đồng bộ từng cấu hình nặng độc lập theo dấu thời gian
                            const allHeavyKeys = new Set([
                                ...Array.from(HEAVY_SYNC_KEYS),
                                ...Object.keys(heavyCloudData)
                            ]);

                            for (const key of Array.from(allHeavyKeys)) {
                                if (!isHeavySyncKey(key)) continue;

                                const localTime = await dbService.getSetting<number>(`lastModified_${key}`) || 0;
                                const cloudItem = heavyCloudData[key];
                                const cloudTime = cloudItem?.updatedAt || 0;

                                if (cloudTime > localTime) {
                                    console.log(`[Cloud Sync] Cloud có bản cập nhật mới cho khóa nặng "${key}" (${cloudTime} > ${localTime}). Đang tải xuống...`);
                                    await dbService.saveSettingFromCloud(key, cloudItem.value, cloudTime);
                                    
                                    // Ghi đè vào IndexedDB của iframe check-thuong nếu là checkthuong_data
                                    if (key === 'checkthuong_data') {
                                        try {
                                            const { saveCheckThuongDataToIframeDb } = await import('../services/checkThuongIframeService');
                                            await saveCheckThuongDataToIframeDb(cloudItem.value);
                                            window.dispatchEvent(new CustomEvent('check-thuong-cloud-sync'));
                                        } catch (err) {
                                            console.error('[Cloud Sync CheckThuong] Error writing to iframe DB:', err);
                                        }
                                    }
                                    
                                    // Cập nhật state runtime
                                    if (key === 'departmentMap') setDepartmentMap(cloudItem.value);
                                    if (key === 'crossSellingConfig') setCrossSellingConfig(cloudItem.value);
                                    if (key === 'kpiCardConfig') setKpiCardsConfig(cloudItem.value);
                                    if (key === 'productConfig') {
                                        if (cloudItem.value?.config) setProductConfig(cloudItem.value.config);
                                    }
                                    
                                    window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key } }));
                                } else if (localTime > cloudTime) {
                                    console.log(`[Cloud Sync] Local mới hơn Cloud cho khóa nặng "${key}" (${localTime} > ${cloudTime}). Đang đồng bộ lên...`);
                                    const localValue = await dbService.getSetting(key);
                                    if (localValue !== null) {
                                        await syncHeavySettingToCloud(user, key, localValue);
                                    }
                                }
                            }

                            if (forcePushLight) {
                                window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key: 'force_push_override' } }));
                            }
                        } catch (e: any) {
                            const errMsg = (e?.message || '').toLowerCase();
                            if (errMsg.includes('failed to fetch') || errMsg.includes('network') || errMsg.includes('offline')) {
                                console.info("☁️ Đồng bộ cài đặt bỏ qua: không có kết nối mạng.");
                            } else {
                                console.warn("⚠️ Đồng bộ cài đặt thất bại (không ảnh hưởng app):", e?.message || e);
                            }
                        }
                    });

                    // 2b. Sales data sync (new cloudDataService — JSON chunks)
                    import('../services/cloudDataService').then(async ({ getCloudDataMeta, downloadProcessedData }) => {
                        try {
                            const cloudMeta = await getCloudDataMeta(user);
                            if (!cloudMeta) return;

                            const localSavedAt = savedSalesReq ? savedSalesReq.savedAt.getTime() : 0;
                            const localFileTs = savedSalesReq ? savedSalesReq.fileLastModified : 0;

                            // Skip if same file
                            if (cloudMeta.fileLastModified && localFileTs && cloudMeta.fileLastModified === localFileTs) {
                                console.log('[CloudData] Cloud data is same file as local. Skipping.');
                                return;
                            }

                            // Only prompt if cloud is newer
                            if (cloudMeta.savedAt > localSavedAt + 15000) {
                                console.log(`[CloudData] Cloud data is newer (cloud: ${new Date(cloudMeta.savedAt).toLocaleString()}, local: ${new Date(localSavedAt).toLocaleString()})`);
                                const cloudResult = await downloadProcessedData(user);
                                if (cloudResult && cloudResult.data.length > 0) {
                                    setPendingCloudSync({ data: cloudResult.data, meta: cloudResult.meta });
                                }
                            }
                        } catch (e: any) {
                            const errMsg = (e?.message || '').toLowerCase();
                            if (errMsg.includes('failed to fetch') || errMsg.includes('network') || errMsg.includes('offline')) {
                                console.info("☁️ Đồng bộ dữ liệu bỏ qua: không có kết nối mạng.");
                            } else {
                                console.warn("⚠️ Đồng bộ dữ liệu thất bại (không ảnh hưởng app):", e?.message || e);
                            }
                        }
                    });
                }

                // 3. Background Sheet Check (Always run to keep config updated)
                if (config) {
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
                    const allowedKhos = (departmentId || '').split(',').map(k => k.trim()).filter(Boolean);
                    rbacData = originalData.filter(row => {
                        const kho = String(row['Mã kho tạo'] || '').trim();
                        // 1. Manager & Employee both need Kho matching
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
        if (departmentMap) {
            const deptsSet = new Set<string>();
            const excludedKeywords = ['quản lý', 'trưởng ca', 'kế toán', 'tiếp đón khách hàng'];
            const mapValues = Object.values(departmentMap);
            for (let i = 0, len = mapValues.length; i < len; i++) {
                const val = mapValues[i] as string;
                if (!val) continue;
                const sepIdx = val.indexOf(';;');
                const deptName = sepIdx !== -1 ? val.substring(0, sepIdx) : val;
                if (deptName) {
                    const deptLower = deptName.toLowerCase();
                    let isExcluded = false;
                    for (let j = 0; j < excludedKeywords.length; j++) {
                        if (deptLower.includes(excludedKeywords[j])) {
                            isExcluded = true;
                            break;
                        }
                    }
                    if (!isExcluded) {
                        deptsSet.add(deptName);
                    }
                }
            }
            deptOptions = Array.from(deptsSet).sort();
            
            // Check for unassigned employees
            let hasUnassigned = false;
            for (let i = 0, len = nguoiTaoOptions.length; i < len; i++) {
                const empStr = nguoiTaoOptions[i];
                const dashIdx = empStr.indexOf(' - ');
                const id = dashIdx !== -1 ? empStr.substring(0, dashIdx).trim() : empStr.trim();
                if (!departmentMap[id]) {
                    hasUnassigned = true;
                    break;
                }
            }
            if (hasUnassigned && !deptOptions.includes('Chưa xác định')) {
                deptOptions.push('Chưa xác định');
            }
        }

        return { kho: khoOptions, trangThai: trangThaiOptions, nguoiTao: nguoiTaoOptions, department: deptOptions, hangSX: hangSXOptions };
    }, [originalData, departmentMap]);

    const handleAcceptCloudSync = async () => {
        if (!pendingCloudSync) return;
        try {
            setStatus({ message: `📊 Đang nạp dữ liệu từ đám mây (${pendingCloudSync.meta.totalRows} dòng)...`, type: 'info', progress: 50 });
            setAppState('loading');
            
            const cloudData = pendingCloudSync.data;
            const cloudMeta = pendingCloudSync.meta;
            
            // Save to local IDB
            await dbService.saveSalesData(cloudData, cloudMeta.filename, cloudMeta.fileLastModified);
            setFileInfo({ filename: cloudMeta.filename, savedAt: new Date(cloudMeta.savedAt).toLocaleString('vi-VN') });
            
            setPendingCloudSync(null);
            
            startTransition(() => {
                setOriginalData(cloudData);
                setAppState('processing');
            });
        } catch (e: any) {
            console.error('Lỗi khi nạp dữ liệu từ đám mây:', e);
            setStatus({ message: `⚠️ Lỗi nạp dữ liệu đám mây: ${e.message}. Dữ liệu trên máy không bị ảnh hưởng.`, type: 'error', progress: 0 });
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
