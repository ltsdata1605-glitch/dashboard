import { useState, useEffect, useMemo, startTransition, useCallback, useRef } from 'react';
import type { DataRow, FilterState, ProductConfig, ProcessedData, Status, AppState, UploadedFileRegistryItem, CrossSellingConfig } from '../types';
import type { DepartmentMap } from '../services/dataService';
import * as dbService from '../services/dbService';
import { loadConfigFromSheet } from '../services/dataService';
import { computeBaseAndPeriodData, deriveWarehouseFilteredData, isXuatMatch } from '../services/filterService';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_KPI_CARDS, COL } from '../constants';
import toast from 'react-hot-toast';
import { normalizeSalesData, wrapProductConfigWithProxies, unwrapProductConfigProxies, getErrorMessage, EMPTY_UNIQUE_FILTER_OPTIONS, computeRbacFilteredData, isValidSalesRow, isUncollectedOrder, getRowValue, parseNumber } from '../utils/dataUtils';

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
                        // PERF FIX: setOriginalData kích hoạt re-render tính lại nhiều useMemo nặng
                        // (rbacData, uniqueFilterOptions, allUnconfiguredGroups — mỗi cái duyệt lại
                        // toàn bộ dữ liệu, có thể hàng chục/trăm nghìn dòng) rồi postMessage sang
                        // Worker — trước đây là 1 state update ưu tiên cao, React không nhường main
                        // thread nên UI (kể cả animation của màn hình loading) bị đứng hình hoàn
                        // toàn trong lúc tính, nhìn như app treo dù thực ra vẫn đang chạy. Bọc trong
                        // startTransition để React coi đây là cập nhật ưu tiên thấp, có thể ngắt
                        // quãng nhường chỗ cho browser paint — UI (spinner, %) vẫn mượt trong lúc
                        // tính toán nặng phía sau chạy ngầm.
                        // QUAN TRỌNG: setAppState('processing') PHẢI nằm CHUNG transition với
                        // setOriginalData (giống hệt effect đồng bộ dữ liệu Kho bên dưới) — tách
                        // riêng ra ngoài (ưu tiên cao) khiến appState chuyển sang 'processing'
                        // TRƯỚC khi originalData thực sự cập nhật, khiến effect "Central Data
                        // Processing" đọc phải originalData rỗng (cũ), báo lỗi "Không tìm thấy dữ
                        // liệu hợp lệ" rồi chuyển appState về 'upload' — và vì originalData không
                        // nằm trong dependency array của effect đó, khi dữ liệu thật sự tới sau,
                        // effect không chạy lại nữa, app kẹt vĩnh viễn ở màn hình upload dù dữ
                        // liệu vẫn còn nguyên trong IndexedDB (bug đã xảy ra thật, phát hiện qua
                        // test Playwright mô phỏng mở lại app với dữ liệu đã lưu).
                        setStatus({ message: 'Đang xử lý và phân tích dữ liệu...', type: 'info', progress: 32 });
                        startTransition(() => {
                            setAppState('processing');
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
                    import('../services/firestoreService').then(async ({ fetchFromCloud, fetchHeavySettingsFromCloud, syncHeavySettingToCloudQueued, HEAVY_SYNC_KEYS, isHeavySyncKey }) => {
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
                                    // BUG FIX: trước đây gọi thẳng syncHeavySettingToCloud() ở đây, bỏ
                                    // qua hàng đợi tuần tự dùng chung của hooks/useCloudSync.ts (hook
                                    // khác, mount riêng) — nếu đúng lúc app khởi động, nhánh đối chiếu
                                    // này VÀ nhánh debounce của useCloudSync cùng ghi 2 khóa nặng khác
                                    // nhau, có thể chạy Firestore write thật sự song song, tái hiện lỗi
                                    // "Write stream exhausted" (xem comment ở services/firestoreService.ts
                                    // nơi định nghĩa syncHeavySettingToCloudQueued). Đổi sang gọi qua
                                    // đúng hàng đợi dùng chung — tự đọc lại giá trị mới nhất từ IndexedDB
                                    // nên không cần truyền localValue nữa.
                                    if (localValue !== null) {
                                        syncHeavySettingToCloudQueued(user, key);
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
                                const cloudResult = await downloadProcessedData(user, cloudMeta);
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

                // PERF FIX: refreshRegistry() chỉ phục vụ FileHistoryModal (ẩn mặc định, xem
                // components/views/DashboardView.tsx) — KHÔNG cần cho việc hiển thị dashboard
                // chính. Trước đây `await` ở đây khiến dashboard (dù processedData đã sẵn sàng
                // render) vẫn bị giữ mờ/khoá tương tác (isHardProcessing → opacity-50
                // pointer-events-none) thêm 1 khoảng không cần thiết trong lúc chờ N transaction
                // IndexedDB (registry + tempRealtime, phần lớn đã đọc rồi trong hàm này — xem
                // checkSalesFileDataExists cho MỌI file từng đăng ký, tới RETENTION_MONTHS).
                // Không `await` nữa — chạy nền, tự cập nhật fileRegistry/hasRealtimeData khi xong
                // (refreshRegistry() đã có try/catch nội bộ, không cần .catch() thêm ở đây).
                refreshRegistry();

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



    // Analytics Worker setup
    const workerRef = useRef<Worker | null>(null);
    const [workerReady, setWorkerReady] = useState(false);

    // Mục 65b: rbacData/uniqueFilterOptions/allUnconfiguredGroups không còn là useMemo chạy trên
    // main thread — cả 3 được tính TRONG Worker (services/analytics.worker.ts, message SET_DATA
    // mở rộng, xem PERF FIX comment ở utils/dataUtils.ts) để không chặn UI khi dữ liệu lớn (đã đo
    // được 1-3s đứng hình thật với startTransition đơn thuần, không đủ vì không ngắt được vòng lặp
    // for đồng bộ giữa chừng). Không giữ state riêng cho rbacData vì nó không được dùng ở đâu khác
    // ngoài Worker (đã grep xác nhận toàn repo) — chỉ 2 kết quả tổng hợp cần state ở main thread.
    const [uniqueFilterOptions, setUniqueFilterOptions] = useState(EMPTY_UNIQUE_FILTER_OPTIONS);
    const [allUnconfiguredGroups, setAllUnconfiguredGroups] = useState<{ nhomHang: string; nganhHang: string }[]>([]);

    // Generation counter chống race-condition: đảm bảo effect "Central Data Processing" bên dưới
    // KHÔNG BAO GIỜ gửi PROCESS trước khi Worker xác nhận đã cache đúng rbacData cho ĐÚNG lần
    // originalData/rbac params/productConfig/departmentMap hiện tại — tường minh bằng số đếm,
    // không dựa vào thứ tự effect chạy ngầm định (chính kiểu giả định ngầm này đã gây ra
    // regression kẹt màn hình upload ở commit 4fc3f93e trước đó).
    const dataGenerationRef = useRef(0);
    const [workerCachedGeneration, setWorkerCachedGeneration] = useState(0);

    useEffect(() => {
        // @ts-ignore
        import('../services/analytics.worker?worker').then((WorkerModule) => {
            const worker = new WorkerModule.default();
            workerRef.current = worker;

            // Gán onmessage DUY NHẤT 1 lần ở đây (không gán lại trong effect Central Data
            // Processing bên dưới như trước) — 2 effect cùng gán onmessage sẽ đè lên nhau. Mọi
            // setter tham chiếu bên trong đều ổn định vĩnh viễn (setState/useRef), nên closure
            // mount-once này không bao giờ bị "stale".
            worker.onmessage = (e: MessageEvent) => {
                const { type, payload } = e.data;
                switch (type) {
                    case 'SET_DATA_SUCCESS':
                        if (payload.generation !== dataGenerationRef.current) return; // response cũ/lệch — bỏ qua
                        setUniqueFilterOptions(payload.uniqueFilterOptions);
                        setAllUnconfiguredGroups(payload.allUnconfiguredGroups);
                        setWorkerCachedGeneration(payload.generation);
                        break;
                    case 'SET_DATA_ERROR':
                        if (payload.generation !== dataGenerationRef.current) return; // lỗi của lần đã bị thay thế — bỏ qua
                        console.error("Lỗi khi lọc RBAC/phân tích dữ liệu trong Worker:", payload.message);
                        setStatus({ message: payload.message, type: 'error', progress: 0 });
                        setAppState('upload');
                        break;
                    case 'PROCESS_SUCCESS': {
                        const { result } = payload;
                        // Mục 65d/65e: lấy đúng snapshot baseFilteredData/warehouseFilteredData/
                        // filteredValidSalesData/unshippedOrders/debtOrders/uncollectedOrders đã
                        // tính trên main thread TẠI THỜI ĐIỂM gửi PROCESS này (xem comment FIFO
                        // queue ở nơi khai báo pendingMainThreadDataQueueRef) — commit CÙNG LÚC
                        // với processedData để giữ đúng tính atomic (như trước, mọi giá trị luôn
                        // tới từ 1 lần cập nhật).
                        const pending = pendingMainThreadDataQueueRef.current.shift();
                        setAppState('dashboard');
                        setProcessedData(pending ? {
                            ...result,
                            filteredValidSalesData: pending.filteredValidSalesData,
                            unshippedOrders: pending.unshippedOrders,
                            debtOrders: pending.debtOrders,
                            uncollectedOrders: pending.uncollectedOrders,
                        } : result);
                        if (pending) {
                            setBaseFilteredData(pending.baseFilteredData);
                            setWarehouseFilteredData(pending.warehouseFilteredData);
                        }
                        setEmployeeAnalysisData(result.employeeData);
                        setIsFilterProcessing(false);
                        break;
                    }
                    case 'PROCESS_ERROR':
                        // Giữ hàng đợi FIFO đồng bộ với số message PROCESS thực đã gửi — nếu
                        // không shift() ở đây, lần PROCESS_SUCCESS kế tiếp sẽ nhận nhầm snapshot
                        // của lần gửi trước đó (lệch cặp).
                        pendingMainThreadDataQueueRef.current.shift();
                        console.error("Lỗi khi xử lý lại dữ liệu:", payload);
                        setStatus({ message: payload, type: 'error', progress: 0 });
                        setAppState('upload');
                        setIsFilterProcessing(false);
                        break;
                }
            };

            setWorkerReady(true);
        });
        return () => {
            if (workerRef.current) workerRef.current.terminate();
        };
    }, []);

    useEffect(() => {
        // Tăng generation TRƯỚC khi kiểm tra workerReady — nếu Worker chưa sẵn sàng, effect này
        // return sớm mà KHÔNG gửi SET_DATA, nhưng generation đã tăng nên workerCachedGeneration
        // (cũ) vẫn lệch với dataGenerationRef.current (mới) → gate ở effect Central Data
        // Processing bên dưới vẫn đúng đắn chặn lại, không bị "pass hờ" do generation chưa kịp đổi.
        dataGenerationRef.current += 1;
        const generation = dataGenerationRef.current;

        if (originalData.length === 0) {
            setUniqueFilterOptions(EMPTY_UNIQUE_FILTER_OPTIONS);
            setAllUnconfiguredGroups([]);
            setWorkerCachedGeneration(generation);
            return;
        }

        if (!workerRef.current || !workerReady) return; // tự gửi lại khi workerReady đổi (có trong deps)

        workerRef.current.postMessage({
            type: 'SET_DATA',
            payload: {
                generation,
                originalData,
                rbacParams: {
                    isDemoMode,
                    userRole,
                    departmentId,
                    employeeName,
                    userEmail: user?.email,
                },
                productConfig: productConfig ? unwrapProductConfigProxies(productConfig) : null,
                departmentMap,
            }
        });
    }, [originalData, userRole, departmentId, employeeName, user?.email, isDemoMode, productConfig, departmentMap, workerReady]);

    // Mục 65d: baseFilteredData/warehouseFilteredData/filteredValidSalesData trước đây được WORKER
    // tính rồi gửi cả bản sao ĐẦY ĐỦ (tới 50k dòng/mảng) về qua postMessage — đo được payload tổng
    // ~197MB ở tập 50k dòng, riêng chi phí structured-clone chiếm ~3s/4-5s tổng thời gian xử lý MỘT
    // MÌNH (KHÔNG phải do thuật toán applyFiltersAndProcess chậm). originalData đã có sẵn TRÊN main
    // thread từ trước (chính nơi gửi nó cho Worker) — tính lại 3 tập con này bằng ĐÚNG các hàm
    // predicate thuần Worker cũng dùng (computeBaseAndPeriodData/deriveWarehouseFilteredData từ
    // services/filterService.ts, isValidSalesRow từ utils/dataUtils.ts — export riêng để 2 nơi
    // không lệch logic) rẻ hơn nhiều so với chi phí gửi qua lại.
    //
    // QUAN TRỌNG — RBAC: sourceData bên trong Worker luôn là computeRbacFilteredData(originalData,
    // rbacParams), KHÔNG PHẢI originalData thô — main thread PHẢI áp dụng lại đúng hàm này trước,
    // nếu không nhân viên/quản lý sẽ thấy dữ liệu ngoài phạm vi Kho/nhân viên được phép (rò rỉ dữ
    // liệu, không phải chi tiết nhỏ).
    const rbacSourceData = useMemo(() => computeRbacFilteredData(originalData, {
        isDemoMode, userRole, departmentId, employeeName, userEmail: user?.email,
    }), [originalData, isDemoMode, userRole, departmentId, employeeName, user?.email]);

    const { baseFilteredData: computedBaseFilteredData, mainPeriodData } = useMemo(
        () => computeBaseAndPeriodData(rbacSourceData, filterState, departmentMap),
        [rbacSourceData, filterState, departmentMap]
    );

    const computedWarehouseFilteredData = useMemo(
        () => deriveWarehouseFilteredData(mainPeriodData),
        [mainPeriodData]
    );

    // isValidSalesRow cần productConfig ĐÃ UNWRAP (giống hệt Worker) để khớp đúng hành vi
    // getParentGroup hiện có — productConfig context luôn là bản Proxy-wrap.
    const computedFilteredValidSalesData = useMemo(() => {
        const unwrapped = productConfig ? unwrapProductConfigProxies(productConfig) : null;
        return mainPeriodData.filter(row => isValidSalesRow(row, unwrapped));
    }, [mainPeriodData, productConfig]);

    // Mục 65e: cùng lý do computedFilteredValidSalesData ở trên — unshippedOrders/debtOrders là
    // TẬP CON của filteredValidSalesData đã tính sẵn (lọc rẻ, không cần productConfig thêm lần
    // nữa), uncollectedOrders lọc từ mainPeriodData (đã có sẵn) bằng isUncollectedOrder(). Trước
    // đây Worker gửi cả 3 mảng này (thô, ~5-6k dòng trong tập test 50k dòng) về qua postMessage —
    // vẫn là dữ liệu dòng đầy đủ, cùng loại lãng phí đã sửa ở Mục 65d cho baseFilteredData/
    // warehouseFilteredData/filteredValidSalesData.
    const computedUnshippedOrders = useMemo(
        () => computedFilteredValidSalesData.filter(row => getRowValue(row, COL.XUAT) === 'Chưa xuất'),
        [computedFilteredValidSalesData]
    );
    const computedDebtOrders = useMemo(
        () => computedFilteredValidSalesData.filter(row => isXuatMatch(row, 'Đã') && parseNumber(getRowValue(row, COL.CON_NO)) > 0),
        [computedFilteredValidSalesData]
    );
    const computedUncollectedOrders = useMemo(() => {
        const unwrapped = productConfig ? unwrapProductConfigProxies(productConfig) : null;
        return mainPeriodData.filter(row => isUncollectedOrder(row, unwrapped));
    }, [mainPeriodData, productConfig]);

    // Giữ tính ATOMIC với processedData: nhiều nơi (IndustryGrid, KpiCards,
    // useEmployeeAnalysisData, useHeadToHeadLogic...) kết hợp dữ liệu Worker-sourced
    // (processedData.*) với các giá trị trên TRONG CÙNG 1 phép tính (vd IndustryGrid yêu cầu
    // filteredValidSalesData luôn cùng "epoch" với industryData — xem comment ở
    // hooks/useIndustryGridLogic.ts). Nếu các giá trị này cập nhật NGAY khi memo đổi (nhanh hơn
    // processedData phải chờ Worker round-trip) sẽ có 1 cửa sổ hiển thị SAI SỐ (không chỉ nhấp
    // nháy). Dùng hàng đợi FIFO: snapshot đúng lúc gửi PROCESS, shift() ra đúng lúc nhận
    // PROCESS_SUCCESS/PROCESS_ERROR (Worker giữ đúng thứ tự message nên khớp cặp chính xác, không
    // cần thêm generation number) — chỉ commit setState cùng lúc với processedData.
    const pendingMainThreadDataQueueRef = useRef<{
        baseFilteredData: DataRow[];
        warehouseFilteredData: DataRow[];
        filteredValidSalesData: DataRow[];
        unshippedOrders: DataRow[];
        debtOrders: DataRow[];
        uncollectedOrders: DataRow[];
    }[]>([]);

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
        // Mục 65b: chờ Worker xác nhận đã cache ĐÚNG rbacData cho generation hiện tại (effect
        // SET_DATA ở trên) trước khi gửi PROCESS — tránh PROCESS chạy trên dữ liệu RBAC cũ/sai
        // nếu originalData vừa đổi lần nữa (vd Kho-sync) trong lúc round-trip SET_DATA còn dở.
        if (workerCachedGeneration !== dataGenerationRef.current) return;

        // For filter changes, we DON'T set isHardProcessing to avoid layout shift.
        // isFilterProcessing is a soft signal (optional, kept for future use).
        setIsFilterProcessing(true);

        if (workerRef.current) {
            // Mục 65d/65e: snapshot ĐÚNG LÚC gửi PROCESS — xem comment FIFO queue ở trên.
            pendingMainThreadDataQueueRef.current.push({
                baseFilteredData: computedBaseFilteredData,
                warehouseFilteredData: computedWarehouseFilteredData,
                filteredValidSalesData: computedFilteredValidSalesData,
                unshippedOrders: computedUnshippedOrders,
                debtOrders: computedDebtOrders,
                uncollectedOrders: computedUncollectedOrders,
            });
            workerRef.current.postMessage({
                type: 'PROCESS',
                payload: {
                    productConfig: productConfig ? unwrapProductConfigProxies(productConfig) : null,
                    filterState,
                    departmentMap
                }
            });
        }
    }, [productConfig, filterState, departmentMap, setStatus, appState, setAppState, workerCachedGeneration, computedBaseFilteredData, computedWarehouseFilteredData, computedFilteredValidSalesData, computedUnshippedOrders, computedDebtOrders, computedUncollectedOrders]);

    // Mục 65c: availableWeeks/availableMonths trước đây là 2 useMemo ĐỘC LẬP, TRÙNG LẶP ở
    // FilterBar.tsx (tuần+tháng) và FilterSection.tsx (chỉ tháng) — mỗi cái tự quét lại TOÀN BỘ
    // originalData (tới hàng chục nghìn dòng), tạo 2-3 object Date/dòng cho phần tính tuần, KHÔNG
    // trì hoãn — chặn main thread ngay khi dashboard vừa render xong. Gộp về 1 chỗ tính DUY NHẤT
    // ở đây, trì hoãn bằng đúng pattern đã dùng ở hooks/useWarehouseLogic.ts (setTimeout + version
    // ref chống stale + startTransition) — không đổi công thức tính tuần/tháng, chỉ dời chỗ tính +
    // gộp trùng lặp + không chặn paint đầu tiên của dashboard.
    const [availableWeeksMonths, setAvailableWeeksMonths] = useState<{
        availableWeeks: { value: string; label: string }[];
        availableMonths: string[];
    }>({ availableWeeks: [], availableMonths: [] });
    const weeksMonthsVersionRef = useRef(0);

    useEffect(() => {
        const thisVersion = ++weeksMonthsVersionRef.current;

        if (!originalData || originalData.length === 0) {
            setAvailableWeeksMonths({ availableWeeks: [], availableMonths: [] });
            return;
        }

        const timer = setTimeout(() => {
            if (weeksMonthsVersionRef.current !== thisVersion) return; // stale — originalData mới hơn đã tới

            const weeksMap = new Map<string, string>();
            const months = new Set<string>();

            for (let i = 0, len = originalData.length; i < len; i++) {
                const row = originalData[i];
                const date = row.parsedDate;
                if (!date || isNaN(date.getTime())) continue;

                const monthNum = date.getMonth() + 1;
                const yearNum = date.getFullYear();

                const mStr = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
                months.add(mStr);

                const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                const dayNum = d.getUTCDay() || 7;
                d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                const wStr = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;

                const firstDayOfMonth = new Date(yearNum, monthNum - 1, 1);
                const firstDayWeekday = firstDayOfMonth.getDay() || 7;
                const offsetDate = date.getDate() + firstDayWeekday - 1;
                const weekOfMonth = Math.ceil(offsetDate / 7);

                const label = `Tuần ${weekOfMonth} - Tháng ${String(monthNum).padStart(2, '0')}/${yearNum}`;
                weeksMap.set(wStr, label);
            }

            const availableWeeks = Array.from(weeksMap.entries())
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([value, label]) => ({ value, label }));
            const availableMonths = Array.from(months)
                .sort((a, b) => b.localeCompare(a))
                .map(mStr => {
                    const [year, month] = mStr.split('-');
                    return `Tháng ${month}/${year}`;
                });

            if (weeksMonthsVersionRef.current === thisVersion) {
                startTransition(() => setAvailableWeeksMonths({ availableWeeks, availableMonths }));
            }
        }, 16);

        return () => clearTimeout(timer);
    }, [originalData]);

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
        availableWeeks: availableWeeksMonths.availableWeeks,
        availableMonths: availableWeeksMonths.availableMonths,
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
