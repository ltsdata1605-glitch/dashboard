import { useState, useEffect, useMemo, startTransition, useCallback, useRef } from 'react';
import type { DataRow, FilterState, ProductConfig, ProcessedData, Status, AppState, UploadedFileRegistryItem, CrossSellingConfig } from '../types';
import type { DepartmentMap } from '../services/dataService';
import * as dbService from '../services/dbService';
import { loadConfigFromSheet } from '../services/dataService';
import { applyFiltersAndProcess } from '../services/filterService';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_KPI_CARDS, COL } from '../constants';
import toast from 'react-hot-toast';
import { normalizeSalesData, getParentGroup, getRowValue, wrapProductConfigWithProxies, cleanAndNormalize, unwrapProductConfigProxies, getErrorMessage, normalizedThuHoSet } from '../utils/dataUtils';

interface DataManagementProps {
    filterState: FilterState;
    configUrl: string;
    setStatus: (status: Status) => void;
    setAppState: (state: AppState) => void;
    appState: AppState;
}

export const useDataManagement = ({ filterState, configUrl, setStatus, setAppState, appState }: DataManagementProps) => {
    const { user, userRole, departmentId, employeeName, isDemoMode } = useAuth();
    const [originalData, setOriginalData] = useState<DataRow[]>([]);
    const [fileRegistry, setFileRegistry] = useState<UploadedFileRegistryItem[]>([]);
    const [hasRealtimeData, setHasRealtimeData] = useState(false);
    const [baseFilteredData, setBaseFilteredData] = useState<DataRow[]>([]);
    const [warehouseFilteredData, setWarehouseFilteredData] = useState<DataRow[]>([]);
    const [calendarSourceData, setCalendarSourceData] = useState<DataRow[]>([]);
    const [departmentMap, setDepartmentMap] = useState<DepartmentMap | null>(null);
    const [productConfig, _setProductConfig] = useState<ProductConfig | null>(null);
    const setProductConfig = useCallback((config: ProductConfig | null) => {
        _setProductConfig(config ? wrapProductConfigWithProxies(config) : null);
    }, []);
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [employeeAnalysisData, setEmployeeAnalysisData] = useState<ProcessedData['employeeData'] | null>(null);
    const [warehouseTargets, setWarehouseTargets] = useState<Record<string, number>>({});
    const [warehouseDTThucTargets, setWarehouseDTThucTargets] = useState<Record<string, number>>({});
    const [gtdhTargets, setGtdhTargets] = useState<Record<string, number>>({});
    const [kpiTargets, setKpiTargets] = useState<{ hieuQua: number, traGop: number, gtdh?: number }>({ hieuQua: 40, traGop: 45, gtdh: 1 });
    const [kpiCardsConfig, setKpiCardsConfig] = useState<import('../types').KpiCardConfig[]>([]);
    const [crossSellingConfig, setCrossSellingConfig] = useState<CrossSellingConfig | null>(null);
    const [isHardProcessing, setIsHardProcessing] = useState(false);    // initial load / file upload
    const [isFilterProcessing, setIsFilterProcessing] = useState(false); // filter-only fast re-calc
    const [fileInfo, setFileInfo] = useState<{ filename: string; savedAt: string } | null>(null);
    const [pendingCloudSync, setPendingCloudSync] = useState<{ data: DataRow[]; meta: { filename: string; savedAt: number; fileLastModified: number; totalRows: number; isRealtime?: boolean } } | null>(null);

// Initial data loading
    useEffect(() => {
        const loadInitialData = async () => {
            setAppState('loading');
            setIsHardProcessing(true);
            try {
                setStatus({ message: 'Đang tải cấu hình cục bộ...', type: 'info', progress: 10 });

                // Mỗi lần mở lại dự án: bỏ tick toàn bộ file "lũy kế" (chỉ giữ Realtime mặc
                // định) để giảm khối lượng dữ liệu phải gộp/xử lý — user cần xem lũy kế thì tự
                // tick lại trong phiên qua FileHistoryManager. PHẢI chạy TRƯỚC
                // getMergedSalesData() bên dưới để có hiệu lực ngay từ lần tải đầu tiên.
                // Nhận lại registry đã đọc để truyền thẳng cho getMergedSalesData() bên dưới,
                // tránh đọc trùng cùng 1 key IndexedDB 2 lần (PERF FIX).
                const freshRegistry = await dbService.resetHistoricalFilesToInactive();

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
                    dbService.getMergedSalesData(freshRegistry),
                    dbService.getSetting<Record<string, number>>('warehouseDTThucTargets')
                ]);

                let config: ProductConfig | null = cachedConfigReq ? cachedConfigReq.config : null;
                const cachedUrl = cachedConfigReq ? cachedConfigReq.url : '';

                // PERF FIX: Chỉ kiểm tra điều kiện cơ bản (config tồn tại, có groups, URL khớp).
                // Các kiểm tra chi tiết (7161, 7139, industryBiMap, compound keys) được xử lý
                // bởi Background Sheet Check (setTimeout 5s) ở phía dưới — tránh blocking
                // luồng khởi tạo bằng network fetch nặng mỗi lần mở app.
                const isConfigMissing = !config || !config.groups || Object.keys(config.groups).length === 0;
                const isConfigOutOfDate = isConfigMissing || cachedUrl !== configUrl;

                if (isConfigOutOfDate) {
                    let loadedFromFirestore = false;
                    // Cache IndexedDB trống hoàn toàn (hay gặp trên mobile — Safari/iOS tự dọn
                    // IndexedDB để tiết kiệm dung lượng; cũng gặp trên dev server nếu port đổi
                    // giữa các lần restart — port khác = origin khác = IndexedDB khác) → thử đọc
                    // bản Firestore nhẹ (1 doc JSON) trước khi tải cả workbook Excel từ Google
                    // Sheet. Giá trị lưu trên Firestore theo ĐÚNG format IndexedDB
                    // (dbService/settings.ts:saveProductConfig): { config, url, fetchedAt } — có
                    // mang theo url nên vẫn đối chiếu được với configUrl hiện tại trước khi tin
                    // dùng, không phải đoán mò.
                    if (isConfigMissing && user && !isDemoMode) {
                        try {
                            setStatus({ message: 'Tải cấu hình từ máy chủ...', type: 'info', progress: 12 });
                            const { fetchProductConfigFromCloud } = await import('../services/firestoreService');
                            const cloudConfigEntry = await fetchProductConfigFromCloud(user);
                            const cloudConfig = cloudConfigEntry?.config;
                            if (cloudConfig && cloudConfig.groups && Object.keys(cloudConfig.groups).length > 0 && cloudConfigEntry?.url === configUrl) {
                                config = cloudConfig;
                                dbService.saveProductConfig(config, configUrl).catch(console.error);
                                loadedFromFirestore = true;
                            }
                        } catch (e) {
                            console.warn("Không đọc được cấu hình từ Firestore, sẽ tải trực tiếp từ Sheet.", e);
                        }
                    }
                    if (!loadedFromFirestore) {
                        try {
                            setStatus({ message: 'Tải cấu hình lõi từ Sheet...', type: 'info', progress: 15 });
                            config = await loadConfigFromSheet(configUrl, () => {});
                            dbService.saveProductConfig(config, configUrl).catch(console.error);
                        } catch (e) {
                             console.error("Không tải được cấu hình mạng, sử dụng dữ liệu cũ rỗng.");
                        }
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
                        'kpi-hieuqua': { order: 3, iconColor: 'indigo' },
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
                        const srcData = normalizeSalesData(savedSalesReq.data);
                        setAppState('processing');
                        // PERF FIX: setOriginalData kích hoạt re-render tính lại nhiều useMemo nặng
                        // (rbacData, uniqueFilterOptions, allUnconfiguredGroups — mỗi cái duyệt lại
                        // toàn bộ dữ liệu, có thể hàng chục/trăm nghìn dòng) rồi postMessage sang
                        // Worker — trước đây là 1 state update ưu tiên cao, React không nhường main
                        // thread nên UI (kể cả animation của màn hình loading) bị đứng hình hoàn
                        // toàn trong lúc tính, nhìn như app treo dù thực ra vẫn đang chạy. Bọc trong
                        // startTransition để React coi đây là cập nhật ưu tiên thấp, có thể ngắt
                        // quãng nhường chỗ cho browser paint — UI (spinner, %) vẫn mượt trong lúc
                        // tính toán nặng phía sau chạy ngầm.
                        setStatus({ message: 'Đang xử lý và phân tích dữ liệu...', type: 'info', progress: 32 });
                        startTransition(() => {
                            setOriginalData(srcData);
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
                                    console.warn('[Cloud Sync] Cấu hình nhẹ local mới hơn Cloud. Đang chuẩn bị đồng bộ lên...');
                                    forcePushLight = true;
                                } else if (cloudData.settingsStoreBackup) {
                                    const backup = cloudData.settingsStoreBackup;
                                    Object.entries(backup).forEach(([k, v]) => {
                                        if (!isHeavySyncKey(k) && k !== 'salesFilesRegistry') {
                                            dbService.saveSettingFromCloud(k, v, cloudLastMod).catch(console.error);
                                        }
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
                            // PERF FIX: Batch tất cả IDB reads song song thay vì loop tuần tự
                            // (trước đó mỗi key gọi 2 IDB reads tuần tự → N×2 transactions chậm)
                            const localSettings = await dbService.getAllSettings().catch(() => ({}));
                            const allHeavyKeys = Array.from(new Set([
                                ...Array.from(HEAVY_SYNC_KEYS),
                                ...Object.keys(heavyCloudData),
                                ...Object.keys(localSettings).filter(k => isHeavySyncKey(k))
                            ])).filter(k => isHeavySyncKey(k));

                            // Batch fetch: 1 Promise.all thay vì N×2 await tuần tự
                            const [allLocalValues, allLocalTimes] = await Promise.all([
                                Promise.all(allHeavyKeys.map(k => dbService.getSetting<unknown>(k))),
                                Promise.all(allHeavyKeys.map(k => dbService.getSetting<number>(`lastModified_${k}`)))
                            ]);

                            for (let i = 0; i < allHeavyKeys.length; i++) {
                                const key = allHeavyKeys[i];
                                const localValue = allLocalValues[i];
                                const localTime = allLocalTimes[i] || 0;
                                const cloudItem = heavyCloudData[key];
                                const cloudTime = cloudItem?.updatedAt || 0;

                                if (cloudItem && (localValue === null || cloudTime > localTime)) {
                                    console.warn(`[Cloud Sync] Cloud có bản cập nhật mới cho khóa nặng "${key}" (${cloudTime} > ${localTime}). Đang tải xuống...`);
                                    if (cloudItem && cloudItem.value !== undefined) await dbService.saveSettingFromCloud(key, cloudItem.value, cloudTime || Date.now());
                                    
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
                                    console.warn(`[Cloud Sync] Local mới hơn Cloud cho khóa nặng "${key}" (${localTime} > ${cloudTime}). Đang đồng bộ lên...`);
                                    if (localValue !== null) {
                                        await syncHeavySettingToCloud(user, key, localValue);
                                    }
                                }
                            }

                            if (forcePushLight) {
                                window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key: 'force_push_override' } }));
                            }
                        } catch (e: unknown) {
                            const errMsg = getErrorMessage(e).toLowerCase();
                            if (errMsg.includes('failed to fetch') || errMsg.includes('network') || errMsg.includes('offline')) {
                                console.info("☁️ Đồng bộ cài đặt bỏ qua: không có kết nối mạng.");
                            } else {
                                console.warn("⚠️ Đồng bộ cài đặt thất bại (không ảnh hưởng app):", getErrorMessage(e));
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
                                console.warn('[CloudData] Cloud data is same file as local. Skipping.');
                                return;
                            }

                            // Only prompt if cloud is newer
                            if (cloudMeta.savedAt > localSavedAt + 15000) {
                                console.warn(`[CloudData] Cloud data is newer (cloud: ${new Date(cloudMeta.savedAt).toLocaleString()}, local: ${new Date(localSavedAt).toLocaleString()})`);
                                const cloudResult = await downloadProcessedData(user);
                                if (cloudResult && cloudResult.data.length > 0) {
                                    if (localSavedAt === 0) {
                                        console.warn('[CloudSync] Tự động nạp dữ liệu đám mây vì local trống');
                                        setAppState('loading');
                                        setStatus({ message: `📊 Tự động nạp dữ liệu đám mây (${cloudResult.meta.totalRows.toLocaleString('vi-VN')} dòng)...`, type: 'info', progress: 50 });
                                        
                                        if (cloudResult.meta.isRealtime) {
                                            await dbService.saveSyncCloudRealtimeData(cloudResult.data, cloudResult.meta.filename, cloudResult.meta.savedAt, cloudResult.meta.fileLastModified);
                                        } else {
                                            await dbService.saveSyncCloudData(cloudResult.data, cloudResult.meta.filename, cloudResult.meta.savedAt, cloudResult.meta.fileLastModified);
                                        }
                                        setFileInfo({ filename: cloudResult.meta.filename, savedAt: new Date(cloudResult.meta.savedAt).toLocaleString('vi-VN') });
                                        
                                        const srcData = normalizeSalesData(cloudResult.data);
                                        setAppState('processing');
                                        setOriginalData(srcData);
                                    } else {
                                        setPendingCloudSync({ data: cloudResult.data, meta: cloudResult.meta });
                                    }
                                }
                            }
                        } catch (e: unknown) {
                            const errMsg = getErrorMessage(e).toLowerCase();
                            if (errMsg.includes('failed to fetch') || errMsg.includes('network') || errMsg.includes('offline')) {
                                console.info("☁️ Đồng bộ dữ liệu bỏ qua: không có kết nối mạng.");
                            } else {
                                console.warn("⚠️ Đồng bộ dữ liệu thất bại (không ảnh hưởng app):", getErrorMessage(e));
                            }
                        }
                    });
                }

                // 3. Background Sheet Check (Auto-update config once gracefully)
                if (config) {
                    setTimeout(async () => {
                        try {
                            // FAST CHECK: Use HEAD request to get the published timestamp from the redirect URL
                            const headResponse = await fetch(configUrl, { method: 'HEAD' }).catch(() => null);
                            let shouldDownload = true;
                            
                            if (headResponse && headResponse.url) {
                                const match = headResponse.url.match(/\/(\d{13})\//);
                                if (match && cachedConfigReq && cachedConfigReq.fetchedAt) {
                                    const cloudTimestamp = parseInt(match[1]);
                                    const localTimestamp = new Date(cachedConfigReq.fetchedAt).getTime();
                                    
                                    // If cloud timestamp is older or equal to our fetch time (minus a 60s margin to be safe), we don't need to download
                                    if (cloudTimestamp < localTimestamp + 60000) {
                                        shouldDownload = false;
                                        console.warn("[Background Check] Cấu hình ProductConfig trên Sheet chưa có bản mới. (Bỏ qua tải xuống toàn bộ)");
                                    }
                                }
                            }

                            if (shouldDownload) {
                                console.warn("[Background Check] Có thể có cấu hình mới, bắt đầu tải toàn bộ...");
                                const latestConfig = await loadConfigFromSheet(configUrl, () => {});
                                const serializeConfig = (c: ProductConfig) => JSON.stringify(c, (key, value) => (value instanceof Set ? Array.from(value).sort() : value));
                                if (serializeConfig(config) !== serializeConfig(latestConfig)) {
                                    console.warn("Phát hiện cấu hình ProductConfig mới từ Google Sheet, tự động nạp ngầm & lưu lên mây...");
                                    dbService.saveProductConfig(latestConfig, configUrl).catch(console.error);
                                    setProductConfig(latestConfig);
                                } else {
                                    console.warn("[Background Check] Cấu hình ProductConfig trên Sheet không thay đổi so với hiện tại.");
                                }
                            }
                        } catch (updateError) {
                            console.warn("Không thể kiểm tra Sheet tĩnh ngầm:", updateError);
                        }
                    }, 5000); // Wait 5s to ensure app is fully interactive before doing heavy fetch
                }

                // Load registry
                await refreshRegistry();

            } catch (e) {
                console.error("Lỗi khi khởi chạy hệ thống dữ liệu:", e);
                const msg = e instanceof Error ? e.message : 'Dữ liệu bộ đệm bị hỏng. Bạn hãy F5 để thử lại.';
                setStatus({ message: msg, type: 'error', progress: 0 });
                setAppState('upload');
                await Promise.all([dbService.clearAllSalesFiles(), dbService.clearProductConfig()]);
            } finally {
                setIsHardProcessing(false);
            }
        };
        loadInitialData();
    }, [configUrl, setAppState, setStatus, user, isDemoMode]);

    // Kho-shared sales data sync (mục 37 implementation_plan.md) — TÁCH RIÊNG khỏi effect
    // loadInitialData() ở trên (không gộp chung) vì `userRole`/`departmentId` chỉ có giá trị
    // thật SAU KHI resolveSession() ở AuthContext.tsx chạy xong — effect loadInitialData()
    // chỉ phụ thuộc `user` (đổi giá trị NGAY khi onAuthStateChanged bắn, TRƯỚC khi
    // resolveSession() xong) nên nếu gộp logic Kho vào đó, nó sẽ luôn thấy userRole còn
    // null/cũ ở lần chạy đó và effect cũng không tự chạy lại khi userRole đổi sau này (không
    // nằm trong dependency array của effect kia, cố tình — để tránh loadInitialData() chạy
    // lại 2 lần/mỗi lần đăng nhập gây nháy màn). Effect riêng này CHỜ đúng userRole/departmentId
    // ổn định rồi mới chạy.
    //
    // Nhân viên dùng thiết bị cá nhân riêng, KHÔNG tự tải file (Bước 4) — nguồn dữ liệu DUY
    // NHẤT của họ là dữ liệu quản lý Kho đã cập nhật, nên luôn ưu tiên dữ liệu Kho dùng chung
    // khi có. Quản lý cũng được ưu tiên dữ liệu Kho dùng chung (đã gồm cả dữ liệu chính họ
    // upload — xem Bước 2 — cộng dữ liệu từ quản lý khác cùng Kho nếu có) — chỉ khi Kho CHƯA
    // có dữ liệu nào (vd vừa deploy tính năng, chưa ai từng tải) thì mới giữ nguyên dữ liệu
    // local họ tự tải (không đụng `originalData` trong trường hợp đó).
    useEffect(() => {
        if (isDemoMode || !user) return;
        if (userRole !== 'manager' && userRole !== 'employee') return;
        if (!departmentId) return;

        let cancelled = false;
        // Khoá cache "đã áp dụng lên dashboard" — RIÊNG với cache tải chunk trong
        // khoDataService.ts (cache đó chỉ tránh tải lại mạng, còn khoá này tránh phải
        // setOriginalData + chạy lại worker xử lý toàn bộ dữ liệu MỘT LẦN NỮA mỗi lần mở
        // app khi dữ liệu Kho không hề đổi so với lần trước — trước đây luôn ghi đè vô điều
        // kiện, khiến mọi lần mở app đều xử lý dữ liệu 2 lần (1 lần cho dữ liệu local, 1 lần
        // cho dữ liệu Kho giống hệt) và làm màn hình loading hiện lại/kéo dài không cần thiết.
        const appliedSnapshotKey = `khoDataAppliedSnapshot::${departmentId}`;
        import('../services/khoDataService').then(async ({ fetchAllowedKhoData }) => {
            try {
                const { data: khoRows, snapshot } = await fetchAllowedKhoData(departmentId);
                if (cancelled || khoRows.length === 0) return;

                const lastApplied = await dbService.getSetting<string>(appliedSnapshotKey).catch(() => null);
                if (lastApplied === snapshot) return; // Dữ liệu Kho không đổi — giữ nguyên dashboard hiện tại.

                setStatus({ message: `📊 Nạp dữ liệu Kho (${khoRows.length.toLocaleString('vi-VN')} dòng)...`, type: 'info', progress: 50 });
                const srcData = normalizeSalesData(khoRows);
                // PERF FIX: cùng lý do startTransition ở loadInitialData phía trên — tránh đứng
                // hình UI trong lúc React tính lại các useMemo nặng.
                startTransition(() => {
                    setOriginalData(srcData);
                    setAppState('processing');
                });
                dbService.saveSetting(appliedSnapshotKey, snapshot).catch(console.error);
            } catch (e: unknown) {
                console.warn("⚠️ Đồng bộ dữ liệu Kho dùng chung thất bại (không ảnh hưởng app):", getErrorMessage(e));
            }
        });

        return () => { cancelled = true; };
    }, [user, userRole, departmentId, isDemoMode, setStatus, setAppState]);

    const refreshRegistry = useCallback(async () => {
        try {
            const [reg, tempRealtime] = await Promise.all([
                dbService.getSalesFilesRegistry(),
                dbService.getTempRealtimeData()
            ]);
            
            const validatedReg = await Promise.all(reg.map(async (file) => {
                const dataExists = await dbService.checkSalesFileDataExists(file.id);
                return {
                    ...file,
                    isMissingLocalData: !dataExists
                };
            }));

            setFileRegistry(validatedReg);
            setHasRealtimeData(!!(tempRealtime && tempRealtime.data.length > 0));
        } catch (err) {
            console.error('[Registry] Failed to fetch registry:', err);
        }
    }, []);

    const handleToggleFileActive = useCallback(async (id: string) => {
        try {
            const registry = await dbService.getSalesFilesRegistry();
            const updated = registry.map(f => f.id === id ? { ...f, isActive: !f.isActive } : f);
            await dbService.saveSalesFilesRegistry(updated);
            
            const validatedReg = await Promise.all(updated.map(async (file) => {
                const dataExists = await dbService.checkSalesFileDataExists(file.id);
                return {
                    ...file,
                    isMissingLocalData: !dataExists
                };
            }));

            setFileRegistry(validatedReg);
            toast.success('Đã cập nhật trạng thái thành công!');
        } catch (error) {
            console.error('[Registry] Error toggling active state:', error);
            toast.error('Có lỗi xảy ra khi cập nhật trạng thái!');
        }
    }, []);

    const handleDeleteFile = useCallback(async (id: string) => {
        try {
            setIsHardProcessing(true);
            setStatus({ message: 'Đang xóa tệp khỏi bộ nhớ...', type: 'info', progress: 30 });
            
            await dbService.deleteSalesFileData(id);
            
            const registry = await dbService.getSalesFilesRegistry();
            const updated = registry.filter(f => f.id !== id);
            await dbService.saveSalesFilesRegistry(updated);
            
            const validatedReg = await Promise.all(updated.map(async (file) => {
                const dataExists = await dbService.checkSalesFileDataExists(file.id);
                return {
                    ...file,
                    isMissingLocalData: !dataExists
                };
            }));

            setFileRegistry(validatedReg);
            toast.success('Đã xóa tệp tin thành công!');
            
            setStatus({ message: 'Đang gộp lại dữ liệu...', type: 'info', progress: 60 });
            const merged = await dbService.getMergedSalesData();
            if (merged) {
                setFileInfo({ filename: merged.filename, savedAt: merged.savedAt.toLocaleString('vi-VN') });
                const srcData = normalizeSalesData(merged.data);
                
                setOriginalData(srcData);
                if (srcData.length === 0) {
                    setAppState('upload');
                } else {
                    setAppState(appState === 'upload' ? 'upload' : 'processing');
                }
                
                // Background Cloud Sync
                if (user && !isDemoMode) {
                    const { uploadProcessedData } = await import('../services/cloudDataService');
                    uploadProcessedData(user, srcData, merged.filename, merged.fileLastModified || merged.savedAt.getTime(), merged.savedAt.getTime(), merged.isRealtime).catch(console.error);
                    const { syncDataToKhoIfManager } = await import('../services/khoDataService');
                    syncDataToKhoIfManager(user, userRole, departmentId, srcData, merged.filename, merged.fileLastModified || merged.savedAt.getTime(), !!merged.isRealtime).catch(console.error);
                }
            } else {
                setOriginalData([]);
                setFileInfo(null);
                setAppState('upload');

                // Clear cloud data when local data is completely empty
                if (user && !isDemoMode) {
                    import('../services/cloudDataService').then(({ deleteCloudSalesData }) => {
                        deleteCloudSalesData(user).catch(console.error);
                    });
                }
            }
            toast.success('Đã xóa tệp khỏi cơ sở dữ liệu!');
        } catch (error) {
            console.error('[Registry] Error deleting file:', error);
            toast.error('Có lỗi xảy ra khi xóa tệp!');
        } finally {
            setIsHardProcessing(false);
        }
    }, [user, isDemoMode, setAppState, setStatus, appState]);

    const handleClearRealtimeData = useCallback(async () => {
        try {
            setIsHardProcessing(true);
            setStatus({ message: 'Đang xóa dữ liệu xem hiện tại...', type: 'info', progress: 30 });
            await dbService.clearTempRealtimeData();
            
            await refreshRegistry();
            
            setStatus({ message: 'Đang gộp lại dữ liệu...', type: 'info', progress: 60 });
            const merged = await dbService.getMergedSalesData();
            if (merged) {
                setFileInfo({ filename: merged.filename, savedAt: merged.savedAt.toLocaleString('vi-VN') });
                const srcData = normalizeSalesData(merged.data);
                
                setOriginalData(srcData);
                setAppState('processing');
                
                if (user && !isDemoMode) {
                    const { uploadProcessedData } = await import('../services/cloudDataService');
                    uploadProcessedData(user, srcData, merged.filename, merged.fileLastModified || merged.savedAt.getTime(), merged.savedAt.getTime(), merged.isRealtime).catch(console.error);
                    const { syncDataToKhoIfManager } = await import('../services/khoDataService');
                    syncDataToKhoIfManager(user, userRole, departmentId, srcData, merged.filename, merged.fileLastModified || merged.savedAt.getTime(), !!merged.isRealtime).catch(console.error);
                }
            } else {
                setOriginalData([]);
                setFileInfo(null);
                setAppState('upload');

                // Clear cloud data when local data is completely empty
                if (user && !isDemoMode) {
                    import('../services/cloudDataService').then(({ deleteCloudSalesData }) => {
                        deleteCloudSalesData(user).catch(console.error);
                    });
                }
            }
            toast.success('Đã xóa dữ liệu xem hiện tại!');
        } catch (error) {
            console.error('[Realtime] Error clearing realtime data:', error);
            toast.error('Có lỗi xảy ra khi xóa dữ liệu!');
        } finally {
            setIsHardProcessing(false);
        }
    }, [user, isDemoMode, setAppState, setStatus, refreshRegistry]);

    const handleViewReport = useCallback(async () => {
        try {
            setIsHardProcessing(true);
            setStatus({ message: 'Đang nạp và gộp dữ liệu...', type: 'info', progress: 50 });
            
            const registry = await dbService.getSalesFilesRegistry();
            const activeFiles = registry.filter(f => f.isActive);
            
            if (activeFiles.length > 0) {
                const missingFiles = [];
                for (const file of activeFiles) {
                    const exists = await dbService.checkSalesFileDataExists(file.id);
                    if (!exists) {
                        missingFiles.push(file.filename);
                    }
                }
                
                if (missingFiles.length > 0) {
                    toast.error(
                        `Thiếu dữ liệu chi tiết của tệp trên thiết bị này: \n- ${missingFiles.join('\n- ')}\n\nVui lòng xóa tệp bị thiếu này và nạp lại!`,
                        { duration: 6000 }
                    );
                    setAppState('upload');
                    return;
                }
            } else {
                const tempRealtime = await dbService.getTempRealtimeData();
                if (!tempRealtime || tempRealtime.data.length === 0) {
                    toast.error('Vui lòng chọn ít nhất một tệp hoặc nạp dữ liệu trước!');
                    setAppState('upload');
                    return;
                }
            }

            const merged = await dbService.getMergedSalesData();
            if (merged && merged.data.length > 0) {
                setFileInfo({ filename: merged.filename, savedAt: merged.savedAt.toLocaleString('vi-VN') });
                const srcData = normalizeSalesData(merged.data);
                setOriginalData(srcData);
                setAppState('processing');
                
                // Background Cloud Sync
                if (user && !isDemoMode) {
                    const { uploadProcessedData } = await import('../services/cloudDataService');
                    uploadProcessedData(user, srcData, merged.filename, merged.fileLastModified || merged.savedAt.getTime(), merged.savedAt.getTime(), merged.isRealtime).catch(console.error);
                    const { syncDataToKhoIfManager } = await import('../services/khoDataService');
                    syncDataToKhoIfManager(user, userRole, departmentId, srcData, merged.filename, merged.fileLastModified || merged.savedAt.getTime(), !!merged.isRealtime).catch(console.error);
                }
            } else {
                toast.error('Không có dữ liệu để xem báo cáo!');
                setAppState('upload');
            }
        } catch (error) {
            console.error('[DataManagement] Error viewing report:', error);
            toast.error('Có lỗi xảy ra khi nạp dữ liệu!');
            setAppState('upload');
        } finally {
            setIsHardProcessing(false);
        }
    }, [setAppState, setStatus, user, isDemoMode]);



    const rbacData = useMemo(() => {
        let data = originalData;
        if (!isDemoMode && (userRole === 'employee' || userRole === 'manager') && user?.email !== 'nguyendangkhoafit2@gmail.com') {
            const allowedKhos = (departmentId || '').split(',').map(k => k.trim()).filter(Boolean);
            data = originalData.filter(row => {
                const kho = String(row['Mã kho tạo'] || '').trim();
                if (!allowedKhos.includes(kho)) return false;

                if (userRole === 'employee') {
                    // "Người tạo" trong Excel có dạng "Mã số - Tên" (vd "107617 - Nguyễn Văn A"),
                    // trong khi employeeName (nhập lúc đăng ký, PendingApprovalView.tsx) CHỈ là mã
                    // số thuần (validate /^\d+$/). So khớp toàn bộ chuỗi trước đây sẽ KHÔNG BAO GIỜ
                    // khớp — nhân viên đăng nhập xong thấy Dashboard trống dù đã được duyệt quyền
                    // đúng. Trích mã số đứng đầu "Người tạo" rồi so với employeeName thay vì so cả chuỗi.
                    const nguoiTaoRaw = String(row['Người tạo'] || '').trim();
                    const empIdMatch = nguoiTaoRaw.match(/^(\d+)/);
                    const empId = empIdMatch ? empIdMatch[1] : nguoiTaoRaw;
                    if (empId !== employeeName?.trim()) return false;
                }

                return true;
            });
        }
        return data;
    }, [originalData, userRole, departmentId, employeeName, user?.email, isDemoMode]);

    
    // Analytics Worker setup
    const workerRef = useRef<Worker | null>(null);
    const [workerReady, setWorkerReady] = useState(false);

    useEffect(() => {
        // @ts-ignore
        import('../services/analytics.worker?worker').then((WorkerModule) => {
            workerRef.current = new WorkerModule.default();
            setWorkerReady(true);
        });
        return () => {
            if (workerRef.current) workerRef.current.terminate();
        };
    }, []);

    useEffect(() => {
        if (workerRef.current && rbacData.length > 0 && workerReady) {
            workerRef.current.postMessage({ type: 'SET_DATA', payload: rbacData });
        }
    }, [rbacData, workerReady]);
    
    // Central Data Processing
    useEffect(() => {
        if (appState === 'loading') return;
        // We use a separate effect for processing to avoid blocking the main thread
        // and to handle dependencies correctly
        if (!originalData.length) {
            if (appState === 'processing') {
                setAppState('upload');
                toast.error('Không tìm thấy dữ liệu hợp lệ trong tệp đã chọn!');
            }
            return;
        }
        if (!productConfig) return;

        // For filter changes, we DON'T set isHardProcessing to avoid layout shift.
        // isFilterProcessing is a soft signal (optional, kept for future use).
        setIsFilterProcessing(true);

        const handleWorkerMessage = (e: MessageEvent) => {
            const { type, payload } = e.data;
            if (type === 'PROCESS_SUCCESS') {
                const { result, newBaseData, newWarehouseData, newCalendarSourceData } = payload;
                setAppState('dashboard');
                setProcessedData(result);
                setBaseFilteredData(newBaseData);
                setWarehouseFilteredData(newWarehouseData);
                setCalendarSourceData(newCalendarSourceData);
                setEmployeeAnalysisData(result.employeeData);
                setIsFilterProcessing(false);
            } else if (type === 'PROCESS_ERROR') {
                console.error("Lỗi khi xử lý lại dữ liệu:", payload);
                setStatus({ message: payload, type: 'error', progress: 0 });
                setAppState('upload');
                setIsFilterProcessing(false);
            }
        };

        if (workerRef.current) {
            workerRef.current.onmessage = handleWorkerMessage;
            workerRef.current.postMessage({ 
                type: 'PROCESS', 
                payload: {
                    productConfig: productConfig ? unwrapProductConfigProxies(productConfig) : null,
                    filterState,
                    departmentMap
                }
            });
        }
    }, [productConfig, filterState, departmentMap, setStatus, appState, setAppState]);

    // Unique filter options — dùng rbacData (đã lọc theo Kho/Người tạo cho employee/manager),
    // KHÔNG dùng originalData (dữ liệu thô toàn bộ file, chưa qua RBAC) — nếu không, dropdown
    // "Kho"/"Người tạo" sẽ lộ ra mã Kho và tên nhân viên khác mà user không có quyền xem, dù
    // dữ liệu chi tiết (KPI/bảng/biểu đồ) đã được lọc đúng qua rbacData ở nơi khác.
    const uniqueFilterOptions = useMemo(() => {
        if (rbacData.length === 0) return { kho: [], trangThai: [], nguoiTao: [], department: [], hangSX: [] };

        const khos = new Set<string>();
        const trangThais = new Set<string>();
        const nguoiTaos = new Set<string>();
        const hangSxs = new Set<string>();

        const len = rbacData.length;
        for (let i = 0; i < len; i++) {
            const r = rbacData[i];

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
            // Chỉ xét phòng ban của các nhân viên THỰC SỰ xuất hiện trong nguoiTaoOptions (đã
            // scope theo rbacData ở trên) — tránh lộ tên phòng ban của nhân viên Kho khác qua
            // toàn bộ departmentMap (vốn là bản đồ toàn công ty, không theo Kho).
            const deptsSet = new Set<string>();
            const excludedKeywords = ['quản lý', 'trưởng ca', 'kế toán', 'tiếp đón khách hàng'];
            for (let i = 0, len = nguoiTaoOptions.length; i < len; i++) {
                const empStr = nguoiTaoOptions[i];
                const dashIdx = empStr.indexOf(' - ');
                const id = dashIdx !== -1 ? empStr.substring(0, dashIdx).trim() : empStr.trim();
                const val = departmentMap[id] as string;
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
    }, [rbacData, departmentMap]);

    const [ignoredGroups, setIgnoredGroups] = useState<string[]>([]);

    useEffect(() => {
        dbService.getSetting<string[]>('ignoredGroups').then(list => {
            if (list) setIgnoredGroups(list);
        }).catch(console.error);
    }, []);

    const handleIgnoreGroup = useCallback(async (nhomHang: string) => {
        const updated = Array.from(new Set([...ignoredGroups, nhomHang]));
        setIgnoredGroups(updated);
        await dbService.saveSetting('ignoredGroups', updated);
    }, [ignoredGroups]);

    const handleRestoreGroup = useCallback(async (nhomHang: string) => {
        const updated = ignoredGroups.filter(g => g !== nhomHang);
        setIgnoredGroups(updated);
        await dbService.saveSetting('ignoredGroups', updated);
    }, [ignoredGroups]);

    const allUnconfiguredGroups = useMemo(() => {
        if (!originalData || originalData.length === 0 || !productConfig) return [];
        
        const missing = new Map<string, string>(); // map: nhomHang -> nganhHang
        
        for (let i = 0; i < originalData.length; i++) {
            const row = originalData[i];
            
            // Bỏ qua các dòng không tính doanh thu theo hình thức xuất
            const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
            const isRevenue = productConfig.revenueEligibleHTX && productConfig.revenueEligibleHTX.size > 0
                ? productConfig.revenueEligibleHTX.has(cleanAndNormalize(hinhThucXuat))
                : (!normalizedThuHoSet.has(cleanAndNormalize(hinhThucXuat)) &&
                   !hinhThucXuat.toLowerCase().normalize('NFC').includes('thu hộ') &&
                   !hinhThucXuat.toLowerCase().normalize('NFC').includes('khuyến mãi'));
            
            if (!isRevenue) continue;
            
            // Bỏ qua các dòng không tính doanh thu (giá bán <= 0)
            const price = Number(getRowValue(row, COL.PRICE)) || 0;
            if (price <= 0) continue;
            
            // Bỏ qua các ngành hàng/nhóm hàng khuyến mãi hoặc thu hộ (không tính doanh thu)
            const nganhHangRaw = String(getRowValue(row, COL.MA_NGANH_HANG) || '').toLowerCase().normalize('NFC');
            const nhomHangRaw = String(getRowValue(row, COL.MA_NHOM_HANG) || '').toLowerCase().normalize('NFC');
            if (
                nganhHangRaw.includes('khuyến mãi') || 
                nganhHangRaw.includes('khuyen mai') ||
                nhomHangRaw.includes('khuyến mãi') || 
                nhomHangRaw.includes('khuyen mai') ||
                nganhHangRaw.includes('thu hộ') ||
                nhomHangRaw.includes('thu hộ')
            ) {
                continue;
            }
            
            const nhomHang = getRowValue(row, COL.MA_NHOM_HANG);
            if (!nhomHang) continue;
            
            const parent = getParentGroup(nhomHang, productConfig);
            if (!parent) {
                const nganhHang = getRowValue(row, COL.MA_NGANH_HANG) || 'Không xác định';
                missing.set(String(nhomHang).trim(), String(nganhHang).trim());
            }
        }
        
        return Array.from(missing.entries()).map(([nhomHang, nganhHang]) => ({
            nhomHang,
            nganhHang
        })).sort((a, b) => a.nganhHang.localeCompare(b.nganhHang) || a.nhomHang.localeCompare(b.nhomHang));
    }, [originalData, productConfig]);

    const unconfiguredGroups = useMemo(() => {
        const ignoredSet = new Set(ignoredGroups);
        return allUnconfiguredGroups.filter(g => !ignoredSet.has(g.nhomHang));
    }, [allUnconfiguredGroups, ignoredGroups]);

    const ignoredUnconfiguredGroups = useMemo(() => {
        const ignoredSet = new Set(ignoredGroups);
        return allUnconfiguredGroups.filter(g => ignoredSet.has(g.nhomHang));
    }, [allUnconfiguredGroups, ignoredGroups]);

    const handleAcceptCloudSync = async () => {
        if (!pendingCloudSync) return;
        try {
            setStatus({ message: `📊 Đang nạp dữ liệu từ đám mây (${pendingCloudSync.meta.totalRows} dòng)...`, type: 'info', progress: 50 });
            setAppState('loading');
            
            const cloudData = pendingCloudSync.data;
            const cloudMeta = pendingCloudSync.meta;
            
            // Save to local IDB
            if (cloudMeta.isRealtime) {
                await dbService.saveSyncCloudRealtimeData(cloudData, cloudMeta.filename, cloudMeta.savedAt, cloudMeta.fileLastModified);
            } else {
                await dbService.saveSyncCloudData(cloudData, cloudMeta.filename, cloudMeta.savedAt, cloudMeta.fileLastModified);
            }
            setFileInfo({ filename: cloudMeta.filename, savedAt: new Date(cloudMeta.savedAt).toLocaleString('vi-VN') });
            
            setPendingCloudSync(null);
            
            const srcData = normalizeSalesData(cloudData);
            
            setAppState('processing');
            setOriginalData(srcData);
            await refreshRegistry();
        } catch (e: unknown) {
            console.error('Lỗi khi nạp dữ liệu từ đám mây:', e);
            setStatus({ message: `⚠️ Lỗi nạp dữ liệu đám mây: ${getErrorMessage(e)}. Dữ liệu trên máy không bị ảnh hưởng.`, type: 'error', progress: 0 });
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
        isFilterProcessing,
        fileInfo, setFileInfo,
        pendingCloudSync, setPendingCloudSync,
        handleAcceptCloudSync,
        handleViewReport,
        fileRegistry,
        refreshRegistry,
        handleToggleFileActive,
        handleDeleteFile,
        hasRealtimeData,
        handleClearRealtimeData,
        unconfiguredGroups,
        ignoredUnconfiguredGroups,
        handleIgnoreGroup,
        handleRestoreGroup
    };
};
