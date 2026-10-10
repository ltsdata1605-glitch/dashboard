import { useState, useEffect, useMemo, startTransition, useCallback, useRef, createElement } from 'react';
import { AppIcon } from '../components/shared/ui/icon/AppIcon';
import type { DataRow, FilterState, ProductConfig, ProcessedData, Status, AppState, UploadedFileRegistryItem, CrossSellingConfig } from '../types';
import type { DepartmentMap } from '../services/dataService';
import * as dbService from '../services/dbService';
import { loadConfigFromSheet } from '../services/dataService';
import { isProductConfigComplete } from '../services/productConfigSerialization';
import { isLightSyncKey } from '../utils/localDbScope';
import { computeBaseAndPeriodData, deriveWarehouseFilteredData, isXuatMatch } from '../services/filterService';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_KPI_CARDS, COL } from '../constants';
import toast from 'react-hot-toast';
import { normalizeSalesData, wrapProductConfigWithProxies, unwrapProductConfigProxies, getErrorMessage, EMPTY_UNIQUE_FILTER_OPTIONS, computeRbacFilteredData, isValidSalesRow, isUncollectedOrder, getRowValue, parseNumber } from '../utils/dataUtils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { SalesDataMeta } from '../services/cloudDataService';

/** Số dòng mỗi khúc khi gửi originalData sang analytics worker (xem effect SET_DATA). */
const SET_DATA_CHUNK_ROWS = 20_000;

/**
 * CACHE PHÂN LOẠI THEO DÒNG (2026-09-30). `isValidSalesRow`/`isUncollectedOrder` chỉ phụ thuộc
 * (dòng, cấu hình ngành hàng) — KHÔNG phụ thuộc bộ lọc — nhưng trước đây chạy lại trên cả 200.000
 * dòng MỖI LẦN đổi bộ lọc. Nay kết quả gắn lên chính dòng dưới khoá Symbol, kèm "số hiệu" của cấu
 * hình (đổi cấu hình = số hiệu mới = tính lại). Gọi đúng 2 hàm chuẩn nên kết quả y hệt.
 * Symbol: JSON.stringify (lưu IndexedDB/cloud) và structured clone (gửi Worker) đều BỎ QUA khoá
 * Symbol → không lọt vào dữ liệu lưu. Đo 200.000 dòng: lần đầu 162→189ms, mỗi lần đổi bộ lọc sau
 * đó 162→29ms. (Đã thử WeakMap: lần đầu 303ms, lần sau 73ms — không đáng.)
 */
const PL_HOP_LE = 1, PL_CHUA_THU = 2;
const PHAN_LOAI = Symbol('ycxPhanLoai');
const soHieuCauHinh = new WeakMap<object, number>();
let soHieuKeTiep = 1;
const KHONG_CAU_HINH = {};
function taoPhanLoai(cauHinhGoc: ProductConfig | null, unwrapped: ProductConfig | null) {
    const khoa = cauHinhGoc || KHONG_CAU_HINH;
    let soHieu = soHieuCauHinh.get(khoa);
    if (soHieu === undefined) { soHieu = soHieuKeTiep++; soHieuCauHinh.set(khoa, soHieu); }
    const sh = soHieu;
    return (row: DataRow): number => {
        const o = row as unknown as Record<symbol, number | undefined>;
        const v = o[PHAN_LOAI];
        if (v !== undefined && (v >>> 2) === sh) return v & 3;
        const f = (isValidSalesRow(row, unwrapped) ? PL_HOP_LE : 0) | (isUncollectedOrder(row, unwrapped) ? PL_CHUA_THU : 0);
        o[PHAN_LOAI] = (sh << 2) | f;
        return f;
    };
}

/** Đã tắt thông báo đồng bộ đám mây theo yêu cầu người dùng (cả laptop và mobile) */
export const notifyCloudSyncToast = (_totalRows?: number | string) => {
    // Không hiển thị toast đồng bộ dữ liệu đám mây
};

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
    // Đọc được trong effect bất đồng bộ (đồng bộ Kho) mà không phải thêm originalData vào deps.
    const originalDataLengthRef = useRef(0);
    originalDataLengthRef.current = originalData.length;
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

    const [cloudSyncBanner, setCloudSyncBanner] = useState<string | null>(null);

    const handleDismissCloudSyncBanner = useCallback(() => {
        setCloudSyncBanner(null);
        try {
            localStorage.removeItem('ycx-cloud-sync-banner');
            sessionStorage.removeItem('ycx-cloud-sync-banner');
        } catch {}
    }, []);

    // Dọn dẹp khoá lưu cũ nếu có trong bộ nhớ để không chiếm dòng layout
    useEffect(() => {
        try {
            localStorage.removeItem('ycx-cloud-sync-banner');
            sessionStorage.removeItem('ycx-cloud-sync-banner');
        } catch {}
    }, []);

    const latestActiveSalesMetaRef = useRef<{ savedAt: number; fileLastModified: number } | null>(null);
    const isCloudSyncingRef = useRef(false);

    const applyCloudSalesData = useCallback(async (cloudData: DataRow[], cloudMeta: { filename: string; savedAt: number; fileLastModified: number; totalRows: number; isRealtime?: boolean }) => {
        try {
            console.warn(`[CloudSync] Tự động nạp dữ liệu đám mây (${cloudMeta.totalRows.toLocaleString('vi-VN')} dòng)...`);
            
            // 1. Lưu vào IndexedDB cục bộ
            if (cloudMeta.isRealtime) {
                await dbService.saveSyncCloudRealtimeData(cloudData, cloudMeta.filename, cloudMeta.savedAt, cloudMeta.fileLastModified);
            } else {
                await dbService.saveSyncCloudData(cloudData, cloudMeta.filename, cloudMeta.savedAt, cloudMeta.fileLastModified);
            }

            latestActiveSalesMetaRef.current = {
                savedAt: cloudMeta.savedAt,
                fileLastModified: cloudMeta.fileLastModified
            };

            setFileInfo({ 
                filename: cloudMeta.filename, 
                savedAt: new Date(cloudMeta.savedAt).toLocaleString('vi-VN') 
            });

            setPendingCloudSync(null);

            const srcData = normalizeSalesData(cloudData);

            startTransition(() => {
                setAppState('processing');
                setOriginalData(srcData);
            });

            // Cập nhật registry ngầm để FileHistoryModal nhận thông tin tệp mới
            dbService.getSalesFilesRegistry().then(reg => {
                dbService.hasTempRealtimeData().then(coRealtime => {
                    setHasRealtimeData(coRealtime);
                    setFileRegistry(reg.map(file => ({ ...file, isMissingLocalData: false })));
                });
            }).catch(console.error);

            handleDismissCloudSyncBanner();
        } catch (e: unknown) {
            console.error('Lỗi khi tự động nạp dữ liệu từ đám mây:', e);
            toast.error(`Lỗi tự động nạp dữ liệu đám mây: ${getErrorMessage(e)}`);
        }
    }, [setAppState]);

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
                setFileRegistry(freshRegistry);

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
                setHasRealtimeData(!!savedSalesReq?.isRealtime);

                let config: ProductConfig | null = cachedConfigReq ? cachedConfigReq.config : null;
                const cachedUrl = cachedConfigReq ? cachedConfigReq.url : '';
                let isGlobalCloudConfig = cachedUrl === 'cloud://global_product_config' || configUrl === 'cloud://global_product_config';

                // PERF FIX: Render ngay lập tức từ IndexedDB nếu có (0ms instant display)
                if (config && isProductConfigComplete(config)) {
                    setProductConfig(config);
                }

                let loadedFromFirestore = false;
                // ƯU TIÊN SỐ 1: Luôn kiểm tra & nạp cấu hình toàn hệ thống từ Firestore (shared_configs/global_product_config)
                // Đọc trực tiếp từ Firestore không phụ thuộc vào trạng thái đăng nhập user
                try {
                    const { getGlobalProductConfig } = await import('../features/product-config/services/firebaseProductConfigService');
                    const globalEntry = await getGlobalProductConfig();
                    if (globalEntry?.config && isProductConfigComplete(globalEntry.config)) {
                        config = globalEntry.config;
                        isGlobalCloudConfig = true;
                        await dbService.saveProductConfig(config, 'cloud://global_product_config');
                        setProductConfig(config);
                        loadedFromFirestore = true;
                    } else if (user && !isDemoMode) {
                        // Dự phòng: cấu hình riêng của user trên Firestore nếu có
                        const { fetchProductConfigFromCloud } = await import('../services/firestoreService');
                        const cloudConfigEntry = await fetchProductConfigFromCloud(user);
                        const cloudConfig = cloudConfigEntry?.config;
                        if (cloudConfig && isProductConfigComplete(cloudConfig)) {
                            config = cloudConfig;
                            isGlobalCloudConfig = true;
                            await dbService.saveProductConfig(config, 'cloud://global_product_config');
                            setProductConfig(config);
                            loadedFromFirestore = true;
                        }
                    }
                } catch (e) {
                    console.warn("Không đọc được cấu hình từ Firestore:", e);
                }

                // Chỉ tải từ URL ngoài khi CHƯA có cấu hình Cloud, bộ nhớ cục bộ thiếu, và URL là HTTP hợp lệ
                const isConfigMissing = !config || !config.groups || Object.keys(config.groups).length === 0;
                if (!loadedFromFirestore && !isGlobalCloudConfig && isConfigMissing && configUrl.startsWith('http')) {
                    try {
                        setStatus({ message: 'Tải cấu hình từ URL...', type: 'info', progress: 15 });
                        config = await loadConfigFromSheet(configUrl, () => {});
                        await dbService.saveProductConfig(config, configUrl);
                        setProductConfig(config);
                    } catch (e) {
                        console.error("Không tải được cấu hình từ URL bên ngoài.");
                    }
                }

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
                    latestActiveSalesMetaRef.current = {
                        savedAt: savedSalesReq.savedAt.getTime(),
                        fileLastModified: savedSalesReq.fileLastModified || 0
                    };
                    setStatus({ message: 'Nạp dữ liệu đã lưu lên bảng điều khiển...', type: 'info', progress: 25 });
                    setFileInfo({ filename: savedSalesReq.filename, savedAt: savedSalesReq.savedAt.toLocaleString('vi-VN') });

                    const activeCloudFile = freshRegistry.find(f => f.isActive && f.id.startsWith('cloud_sync_'));

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
                            let loiTaiCauHinhNhe = false;
                            const [cloudData, heavyCloudData] = await Promise.all([
                                fetchFromCloud(user).catch(err => { console.warn("Lỗi tải cấu hình nhẹ:", err); loiTaiCauHinhNhe = true; return null; }),
                                fetchHeavySettingsFromCloud(user).catch(err => { console.warn("Lỗi tải cấu hình nặng:", err); return {} as Awaited<ReturnType<typeof fetchHeavySettingsFromCloud>>; })
                            ]);

                            // 1. Đồng bộ cấu hình nhẹ — quyết định ở services/heavySyncPolicy.ts
                            // (decideLightSync): máy chưa từng kéo cấu hình của tài khoản thì Cloud thắng.
                            let forcePushLight = false;
                            {
                                const { decideLightSync, LIGHT_CLOUD_PULLED_KEY } = await import('../services/heavySyncPolicy');
                                const pulledBefore = !!(await dbService.getSetting<boolean>(LIGHT_CLOUD_PULLED_KEY));
                                const localLastMod = await dbService.getSetting<number>('localSettingsLastModified') || 0;
                                // BUG FIX: `cloudData.lastSync` không bao giờ tồn tại — fetchFromCloud() đọc doc
                                // users/{uid}/setting/configuration (có field `updatedAt`), trong khi `lastSync`
                                // chỉ được ghi vào doc users/{uid} GỐC (khác doc) bởi syncToCloud(). Kể cả đọc
                                // đúng field, `new Date(...)` cũng không parse được Firestore Timestamp object
                                // (cần .toMillis()) — 2 lỗi cộng dồn khiến cloudLastMod LUÔN = 0, mọi thiết bị có
                                // localLastMod > 0 (đã từng đổi setting) đều force-push đè cấu hình cloud mới hơn.
                                const cloudLastMod = cloudData?.updatedAt?.toMillis ? cloudData.updatedAt.toMillis() : 0;
                                const backup = cloudData?.settingsStoreBackup;
                                const hanhDong = decideLightSync({ cloudReadFailed: loiTaiCauHinhNhe, hasCloudDoc: !!cloudData, hasBackup: !!backup, cloudLastMod, localLastMod, pulledBefore });

                                if (hanhDong === 'push') {
                                    console.warn('[Cloud Sync] Cấu hình nhẹ local mới hơn Cloud. Đang chuẩn bị đồng bộ lên...');
                                    forcePushLight = true;
                                } else if (hanhDong === 'pull' && backup) {
                                    if (!pulledBefore) console.warn('[Cloud Sync] Máy mới với tài khoản này — lấy cấu hình nhẹ từ Cloud về.');
                                    await Promise.all(Object.entries(backup).map(([k, v]) =>
                                        isLightSyncKey(k) /* bỏ khoá nặng, bộ đệm Kho, trạng thái riêng máy */
                                            ? dbService.saveSettingFromCloud(k, v, cloudLastMod).catch(console.error)
                                            : undefined));
                                    if (backup.warehouseTargets) setWarehouseTargets(backup.warehouseTargets);
                                    if (backup.gtdhTargets) setGtdhTargets(backup.gtdhTargets);
                                    if (backup.kpiTargets) setKpiTargets(backup.kpiTargets);
                                    if (backup.kpiCardConfig) setKpiCardsConfig(backup.kpiCardConfig);
                                }
                                // Đánh dấu khi ĐÃ đọc được Cloud (có doc hoặc chắc chắn chưa có); lỗi mạng → lần sau
                                // thử lại. Khoá `cached_` nên không kích hoạt đồng bộ và không bị đẩy lên Cloud.
                                if (!loiTaiCauHinhNhe && !pulledBefore) await dbService.saveSetting(LIGHT_CLOUD_PULLED_KEY, true);
                            }

                            // 2. Đồng bộ từng cấu hình nặng độc lập theo dấu thời gian
                            // PERF FIX: Batch tất cả IDB reads song song thay vì loop tuần tự
                            // (trước đó mỗi key gọi 2 IDB reads tuần tự → N×2 transactions chậm)
                            // Chỉ cần TÊN khoá: getAllSettings() nạp cả giá trị khoDataCache_* hàng MB, chiếm kho nhiều giây.
                            const localKeys = await dbService.getAllSettingKeys();
                            const allHeavyKeys = Array.from(new Set([
                                ...Array.from(HEAVY_SYNC_KEYS),
                                ...Object.keys(heavyCloudData),
                                ...localKeys.filter(k => isHeavySyncKey(k))
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

                                // Bản productConfig trên Cloud bị hỏng (lỗi lưu Set cũ) thì không lấy về, để bản đầy
                                // đủ trên máy được đẩy lên sửa lại (nhánh "local mới hơn" bên dưới).
                                const cloudHong = key === 'productConfig' && !!cloudItem
                                    && !isProductConfigComplete((cloudItem.value as { config?: ProductConfig } | undefined)?.config);
                                if (cloudItem && !cloudHong && (localValue === null || cloudTime > localTime)) {
                                    console.warn(`[Cloud Sync] Cloud có bản cập nhật mới cho khóa nặng "${key}" (${cloudTime} > ${localTime}). Đang tải xuống...`);
                                    if (cloudItem && cloudItem.value !== undefined) await dbService.saveSettingFromCloud(key, cloudItem.value, cloudTime || Date.now());
                                    
                                    // Ghi đè vào IndexedDB của iframe check-thuong nếu là checkthuong_data
                                    if (key === 'checkthuong_data') {
                                        try {
                                            const { saveCheckThuongDataToIframeDb } = await import('../services/checkThuongIframeService');
                                            await saveCheckThuongDataToIframeDb(cloudItem.value);
                                            window.dispatchEvent(new CustomEvent('check-thuong-cloud-sync', { detail: { payload: cloudItem.value } }));
                                        } catch (err) {
                                            console.error('[Cloud Sync CheckThuong] Error writing to iframe DB:', err);
                                        }
                                    }
                                    
                                    // Cập nhật state runtime
                                    // strict (2026-09-30): giá trị cloud là `unknown` — ghi rõ kiểu của từng khoá nặng
                                    if (key === 'departmentMap') setDepartmentMap(cloudItem.value as DepartmentMap);
                                    if (key === 'crossSellingConfig') setCrossSellingConfig(cloudItem.value as CrossSellingConfig);
                                    if (key === 'kpiCardConfig') setKpiCardsConfig(cloudItem.value as import('../types').KpiCardConfig[]);
                                    if (key === 'productConfig') {
                                        const pc = (cloudItem.value as { config?: ProductConfig } | undefined)?.config;
                                        if (pc) setProductConfig(pc);
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

                            const currentLocal = latestActiveSalesMetaRef.current;
                            const localSavedAt = currentLocal ? currentLocal.savedAt : (savedSalesReq ? savedSalesReq.savedAt.getTime() : 0);
                            const localFileTs = currentLocal ? currentLocal.fileLastModified : (savedSalesReq ? savedSalesReq.fileLastModified : 0);

                            // Skip if same file
                            if (cloudMeta.fileLastModified && localFileTs && cloudMeta.fileLastModified === localFileTs) {
                                console.warn('[CloudData] Cloud data is same file as local. Skipping.');
                                return;
                            }

                            // Tự động nạp dữ liệu đám mây mới hơn ngay lập tức (không cần bấm xác nhận)
                            if (cloudMeta.savedAt > localSavedAt + 5000) {
                                console.warn(`[CloudData] Cloud data is newer (cloud: ${new Date(cloudMeta.savedAt).toLocaleString()}, local: ${new Date(localSavedAt).toLocaleString()})`);
                                if (isCloudSyncingRef.current) return;
                                isCloudSyncingRef.current = true;
                                try {
                                    const cloudResult = await downloadProcessedData(user, cloudMeta);
                                    if (cloudResult && cloudResult.data.length > 0) {
                                        await applyCloudSalesData(cloudResult.data, cloudResult.meta);
                                    }
                                } finally {
                                    isCloudSyncingRef.current = false;
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

                // 3. Background Config Check:
                // Nếu đang dùng Cloud Config toàn hệ thống của Firebase, KHÔNG bao giờ tải lại Google Sheet
                // để tránh tình trạng ghi đè cấu hình tuỳ chỉnh và gây đơ lag trình duyệt.
                if (config && !isGlobalCloudConfig && configUrl.startsWith('http') && cachedUrl !== 'cloud://global_product_config') {
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
                // Audit D14: trước đây MỌI lỗi (IndexedDB chậm/hết giờ, hết dung lượng, lỗi tạm…) đều xoá
                // sạch dữ liệu bán hàng + cấu hình — mất bản duy nhất chỉ vì 1 lần mở app trục trặc. Nay
                // chỉ dọn khi dữ liệu HỎNG THẬT (JSON không đọc được — mở lại lần nào cũng lỗi y hệt).
                if (e instanceof SyntaxError) {
                    await Promise.all([dbService.clearAllSalesFiles(), dbService.clearProductConfig()]);
                }
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
                // Audit D01: chỉ bỏ qua khi dashboard ĐANG CÓ dữ liệu. Dấu "đã áp dụng" lưu qua phiên, còn dữ
                // liệu Kho đã áp thì KHÔNG lưu cục bộ — nhân viên (không tự tải file) mở lại app thấy
                // originalData rỗng nhưng dấu vẫn khớp → trước đây bỏ qua và màn hình trống.
                if (lastApplied === snapshot && originalDataLengthRef.current > 0) return;

                setStatus({ message: `Nạp dữ liệu Kho (${khoRows.length.toLocaleString('vi-VN')} dòng)...`, type: 'info', progress: 50 });
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

    // Realtime Sales Data Listener — Tự động đồng bộ tức thì khi Firestore có bản ghi mới (không cần bấm thủ công)
    useEffect(() => {
        if (!user || isDemoMode) return;

        let isMounted = true;
        const metaDocRef = doc(db, 'users', user.uid, 'salesData', 'meta');

        // Lắng nghe sự kiện upload cục bộ để tránh re-download chính file vừa tải lên từ tab này
        const handleLocalUpload = (e: Event) => {
            const customEvent = e as CustomEvent<{ savedAt: number; fileLastModified: number }>;
            if (customEvent.detail) {
                latestActiveSalesMetaRef.current = {
                    savedAt: customEvent.detail.savedAt,
                    fileLastModified: customEvent.detail.fileLastModified
                };
            }
        };
        window.addEventListener('ycx-sales-data-uploaded', handleLocalUpload);

        const unsub = onSnapshot(metaDocRef, async (snapshot) => {
            if (!isMounted) return;
            if (snapshot.metadata.hasPendingWrites) return; // Lượt ghi in-flight của tab này
            if (!snapshot.exists()) return;

            const cloudMeta = snapshot.data() as SalesDataMeta;
            if (!cloudMeta || !cloudMeta.savedAt) return;

            const currentLocal = latestActiveSalesMetaRef.current;
            const localSavedAt = currentLocal ? currentLocal.savedAt : 0;
            const localFileTs = currentLocal ? currentLocal.fileLastModified : 0;

            // Bỏ qua nếu trùng file
            if (cloudMeta.fileLastModified && localFileTs && cloudMeta.fileLastModified === localFileTs) {
                return;
            }

            // Chỉ tự động tải khi bản ghi trên mây mới hơn bản hiện tại
            if (cloudMeta.savedAt <= localSavedAt + 5000) {
                return;
            }

            if (isCloudSyncingRef.current) return;
            isCloudSyncingRef.current = true;

            try {
                const { downloadProcessedData } = await import('../services/cloudDataService');
                const cloudResult = await downloadProcessedData(user, cloudMeta);
                if (isMounted && cloudResult && cloudResult.data.length > 0) {
                    await applyCloudSalesData(cloudResult.data, cloudResult.meta);
                }
            } catch (err) {
                console.warn('[CloudData] Tự động đồng bộ realtime thất bại:', err);
            } finally {
                isCloudSyncingRef.current = false;
            }
        }, (err) => {
            console.warn('[CloudData] Lỗi onSnapshot salesData/meta:', err);
        });

        return () => {
            isMounted = false;
            window.removeEventListener('ycx-sales-data-uploaded', handleLocalUpload);
            unsub();
        };
    }, [user, isDemoMode, applyCloudSalesData]);

    // Lắng nghe sự kiện cập nhật cấu hình tức thì từ Phân Quyền & Duyệt Yêu Cầu (áp dụng trực tiếp không cần reload trang)
    useEffect(() => {
        const handleGlobalConfigChanged = (e: Event) => {
            const customEvent = e as CustomEvent<ProductConfig>;
            if (customEvent.detail && isProductConfigComplete(customEvent.detail)) {
                setProductConfig(customEvent.detail);
                dbService.saveProductConfig(customEvent.detail, 'cloud://global_product_config').catch(console.error);
                toast.success('Đã áp dụng cấu hình mới nhất từ Cloud vào báo cáo!', { id: 'cloud-config-applied' });
            }
        };
        window.addEventListener('ycx-product-config-changed', handleGlobalConfigChanged);
        return () => {
            window.removeEventListener('ycx-product-config-changed', handleGlobalConfigChanged);
        };
    }, [setProductConfig]);

    const refreshRegistry = useCallback(async () => {
        try {
            const [reg, coRealtime] = await Promise.all([
                dbService.getSalesFilesRegistry(),
                dbService.hasTempRealtimeData() // chỉ cần có/không — không parse cả bảng
            ]);
            
            const validatedReg = await Promise.all(reg.map(async (file) => {
                const dataExists = await dbService.checkSalesFileDataExists(file.id);
                return {
                    ...file,
                    isMissingLocalData: !dataExists
                };
            }));

            setFileRegistry(validatedReg);
            setHasRealtimeData(coRealtime);
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

    const handleRenameFile = useCallback(async (id: string, newFilename: string) => {
        try {
            const trimmed = newFilename.trim();
            if (!trimmed) return;
            const registry = await dbService.getSalesFilesRegistry();
            const updated = registry.map(f => f.id === id ? { ...f, filename: trimmed } : f);
            await dbService.saveSalesFilesRegistry(updated);
            
            const validatedReg = await Promise.all(updated.map(async (file) => {
                const dataExists = await dbService.checkSalesFileDataExists(file.id);
                return {
                    ...file,
                    isMissingLocalData: !dataExists
                };
            }));

            setFileRegistry(validatedReg);
            toast.success('Đã đổi tên tệp thành công!');

            const merged = await dbService.getMergedSalesData();
            if (merged) {
                setFileInfo({ filename: merged.filename, savedAt: merged.savedAt.toLocaleString('vi-VN') });
                if (user && !isDemoMode) {
                    const { uploadProcessedData } = await import('../services/cloudDataService');
                    uploadProcessedData(user, normalizeSalesData(merged.data), merged.filename, merged.fileLastModified || merged.savedAt.getTime(), merged.savedAt.getTime(), merged.isRealtime).catch(console.error);
                }
            }
        } catch (error) {
            console.error('[Registry] Error renaming file:', error);
            toast.error('Có lỗi xảy ra khi đổi tên tệp!');
        }
    }, [user, isDemoMode]);

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

    const handleClearAllData = useCallback(async () => {
        try {
            setIsHardProcessing(true);
            setStatus({ message: 'Đang xóa toàn bộ dữ liệu phân tích...', type: 'info', progress: 30 });
            await dbService.clearAllSalesFiles();
            latestActiveSalesMetaRef.current = null;
            
            if (user && !isDemoMode) {
                const { deleteCloudSalesData } = await import('../services/cloudDataService');
                await deleteCloudSalesData(user).catch(console.error);
                if (userRole === 'manager' && departmentId) {
                    const { purgeKhoSalesFiles } = await import('../services/khoDataService');
                    const { parseKhoList } = await import('../utils/dataUtils');
                    const khos = parseKhoList(departmentId);
                    for (const k of khos) {
                        await purgeKhoSalesFiles(k).catch(console.error);
                    }
                }
            }
            
            await refreshRegistry();
            setOriginalData([]);
            setProcessedData(null);
            setFileInfo(null);
            setCloudSyncBanner(null);
            try { 
                localStorage.removeItem('ycx-cloud-sync-banner');
                sessionStorage.removeItem('ycx-cloud-sync-banner'); 
            } catch {}
            setAppState('upload');
            toast.success('Đã xóa toàn bộ dữ liệu phân tích!');
        } catch (error) {
            console.error('[ClearAll] Error clearing all data:', error);
            toast.error('Có lỗi xảy ra khi xóa toàn bộ dữ liệu!');
        } finally {
            setIsHardProcessing(false);
        }
    }, [user, userRole, departmentId, isDemoMode, setAppState, setStatus, refreshRegistry]);

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
                // Chỉ cần biết có/không — getMergedSalesData() bên dưới mới đọc dữ liệu thật.
                if (!(await dbService.hasTempRealtimeData())) {
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

    // Audit D17: số lần đã dựng lại Worker sau khi sập (giới hạn để không lặp vô hạn nếu lỗi tái diễn).
    const workerCrashCountRef = useRef(0);

    useEffect(() => {
        let disposed = false;
        const spawnWorker = () => import('../services/analytics.worker?worker').then((WorkerModule) => {
            if (disposed) return;
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
                        setStatus({ message: 'Đang áp dụng bộ lọc và tính toán số liệu...', type: 'info', progress: 68 });
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
                        // filteredValidSalesData/unshippedOrders/uncollectedOrders đã
                        // tính trên main thread TẠI THỜI ĐIỂM gửi PROCESS này (xem comment FIFO
                        // queue ở nơi khai báo pendingMainThreadDataQueueRef) — commit CÙNG LÚC
                        // với processedData để giữ đúng tính atomic (như trước, mọi giá trị luôn
                        // tới từ 1 lần cập nhật).
                        const pending = pendingMainThreadDataQueueRef.current.shift();
                        // Audit D17: kết quả của lượt đã bị thay thế (dữ liệu đổi thế hệ, hoặc đã có lượt
                        // PROCESS mới hơn đang chờ) — BỎ, không áp số cũ lên màn hình. Lượt mới sẽ tới sau.
                        if (pending && (pending.generation !== dataGenerationRef.current || pending.requestId !== processRequestIdRef.current)) break;
                        setAppState('dashboard');
                        setProcessedData(pending ? {
                            ...result,
                            filteredValidSalesData: pending.filteredValidSalesData,
                            unshippedOrders: pending.unshippedOrders,
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
                        const failed = pendingMainThreadDataQueueRef.current.shift();
                        if (failed && (failed.generation !== dataGenerationRef.current || failed.requestId !== processRequestIdRef.current)) break;
                        console.error("Lỗi khi xử lý lại dữ liệu:", payload);
                        setStatus({ message: payload, type: 'error', progress: 0 });
                        setAppState('upload');
                        setIsFilterProcessing(false);
                        break;
                }
            };

            worker.onerror = (err) => {
                console.error("Worker error in analytics worker:", err);
                // Audit D17: trước đây chỉ HIỆN chữ "Đang tải lại..." mà không làm gì — màn hình xử lý quay
                // mãi. Nay: bỏ mọi lượt PROCESS đang chờ (kết quả của chúng sẽ không bao giờ tới), dựng
                // lại Worker (tối đa 2 lần) — setWorkerReady(true) khiến effect SET_DATA gửi lại dữ liệu.
                pendingMainThreadDataQueueRef.current = [];
                worker.terminate();
                if (workerRef.current === worker) workerRef.current = null;
                setWorkerReady(false);
                if (workerCrashCountRef.current < 2 && !disposed) {
                    workerCrashCountRef.current += 1;
                    setStatus({ message: 'Luồng xử lý dữ liệu gặp lỗi — đang khởi động lại...', type: 'info', progress: 50 });
                    spawnWorker();
                } else {
                    setIsFilterProcessing(false);
                    setStatus({ message: 'Luồng xử lý dữ liệu gặp lỗi lặp lại. Vui lòng tải lại trang (F5).', type: 'error', progress: 0 });
                }
            };

            setWorkerReady(true);
        });
        spawnWorker();
        return () => {
            disposed = true;
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
        const worker = workerRef.current;

        // 2026-09-30: gửi 1 message chứa cả originalData = structured clone ĐỒNG BỘ ~0,76s luồng chính
        // ở 200.000 dòng (đo bằng perf-nap-du-lieu-lon, bản build). Nay gửi từng khúc
        // SET_DATA_CHUNK_ROWS dòng, nhường luồng giữa các khúc; Worker ghép lại rồi mới xử lý như cũ
        // khi nhận SET_DATA. Dữ liệu nhỏ vẫn đi 1 message như trước. Dữ liệu đổi giữa chừng
        // (generation mới) → vòng cũ dừng, Worker bỏ khúc dở của generation cũ.
        let huy = false;
        const conHieuLuc = () => !huy && generation === dataGenerationRef.current;
        const chiaKhuc = originalData.length > SET_DATA_CHUNK_ROWS;
        void (async () => {
            if (chiaKhuc) {
                for (let i = 0; i < originalData.length; i += SET_DATA_CHUNK_ROWS) {
                    if (!conHieuLuc()) return;
                    worker.postMessage({ type: 'SET_DATA_CHUNK', payload: { generation, rows: originalData.slice(i, i + SET_DATA_CHUNK_ROWS) } });
                    await new Promise(r => setTimeout(r, 0));
                }
                if (!conHieuLuc()) return;
            }
            worker.postMessage({
            type: 'SET_DATA',
            payload: {
                generation,
                originalData: chiaKhuc ? undefined : originalData,
                chunked: chiaKhuc,
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
        })();
        return () => { huy = true; };
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
    const phanLoai = useMemo(
        () => taoPhanLoai(productConfig, productConfig ? unwrapProductConfigProxies(productConfig) : null),
        [productConfig]
    );
    const computedFilteredValidSalesData = useMemo(
        () => mainPeriodData.filter(row => (phanLoai(row) & PL_HOP_LE) !== 0),
        [mainPeriodData, phanLoai]
    );

    // Mục 65e: cùng lý do computedFilteredValidSalesData ở trên — unshippedOrders là
    // TẬP CON của filteredValidSalesData đã tính sẵn (lọc rẻ, không cần productConfig thêm lần
    // nữa), uncollectedOrders lọc từ mainPeriodData (đã có sẵn) bằng isUncollectedOrder(). Trước
    // đây Worker gửi cả 2 mảng này (thô) về qua postMessage —
    // vẫn là dữ liệu dòng đầy đủ, cùng loại lãng phí đã sửa ở Mục 65d cho baseFilteredData/
    // warehouseFilteredData/filteredValidSalesData.
    const computedUnshippedOrders = useMemo(
        () => computedFilteredValidSalesData.filter(row => getRowValue(row, COL.XUAT) === 'Chưa xuất'),
        [computedFilteredValidSalesData]
    );
    const computedUncollectedOrders = useMemo(
        () => mainPeriodData.filter(row => (phanLoai(row) & PL_CHUA_THU) !== 0),
        [mainPeriodData, phanLoai]
    );

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
        uncollectedOrders: DataRow[];
        /** Thế hệ dữ liệu + số thứ tự lượt gửi — kết quả lệch với hiện tại là kết quả cũ (audit D17). */
        generation: number;
        requestId: number;
    }[]>([]);
    const processRequestIdRef = useRef(0);

    const configRetryRef = useRef<Promise<void> | null>(null);

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
        if (!productConfig) {
            // Chưa có cấu hình ngành hàng: lần đầu dùng trên máy mới, hoặc Safari iOS đã tự xoá dữ
            // liệu web (không mở app 7 ngày) mà lúc khởi động mạng chập chờn. Trước đây effect chỉ
            // `return` → màn hình treo mãi ở 95% "Đang gộp…". Nay tự tải lại 1 lần; vẫn lỗi thì
            // báo rõ và quay về màn tải tệp (dữ liệu đã lưu trên máy, tải lại tệp là chạy).
            if (appState === 'processing' && !configRetryRef.current) {
                configRetryRef.current = (async () => {
                    try {
                        let config: ProductConfig | null = null;
                        try {
                            const { getGlobalProductConfig } = await import('../features/product-config/services/firebaseProductConfigService');
                            const globalEntry = await getGlobalProductConfig();
                            if (globalEntry?.config && isProductConfigComplete(globalEntry.config)) {
                                config = globalEntry.config;
                            }
                        } catch (cloudErr) {
                            console.warn('[useDataManagement] Lỗi đọc global config khi retry:', cloudErr);
                        }
                        if (!config && configUrl.startsWith('http')) {
                            try {
                                config = await loadConfigFromSheet(configUrl, () => {});
                            } catch (sheetErr) {
                                console.warn('[useDataManagement] Lỗi đọc config từ URL ngoài khi retry:', sheetErr);
                            }
                        }
                        if (config) {
                            dbService.saveProductConfig(config, 'cloud://global_product_config').catch(console.error);
                            setProductConfig(config);
                        } else {
                            throw new Error('Không tìm thấy cấu hình ngành hàng trên Cloud.');
                        }
                    } catch (e) {
                        console.error('[useDataManagement] Tải lại cấu hình thất bại:', e);
                        const msg = 'Không tải được cấu hình ngành hàng — kiểm tra kết nối mạng rồi thử lại.';
                        setStatus({ message: msg, type: 'error', progress: 0 });
                        toast.error(msg, { id: 'config-load-failed', duration: 8000 });
                        setAppState('upload');
                    } finally {
                        configRetryRef.current = null;
                    }
                })();
            }
            return;
        }
        // Mục 65b: chờ Worker xác nhận đã cache ĐÚNG rbacData cho generation hiện tại (effect
        // SET_DATA ở trên) trước khi gửi PROCESS — tránh PROCESS chạy trên dữ liệu RBAC cũ/sai
        // nếu originalData vừa đổi lần nữa (vd Kho-sync) trong lúc round-trip SET_DATA còn dở.
        if (workerCachedGeneration !== dataGenerationRef.current) return;

        setIsFilterProcessing(true);
        if (appState === 'processing') {
            setStatus({ message: 'Đang tổng hợp KPI và biểu đồ...', type: 'info', progress: 88 });
        }

        if (workerRef.current) {
            // Mục 65d/65e: snapshot ĐÚNG LÚC gửi PROCESS — xem comment FIFO queue ở trên.
            pendingMainThreadDataQueueRef.current.push({
                baseFilteredData: computedBaseFilteredData,
                warehouseFilteredData: computedWarehouseFilteredData,
                filteredValidSalesData: computedFilteredValidSalesData,
                unshippedOrders: computedUnshippedOrders,
                uncollectedOrders: computedUncollectedOrders,
                generation: dataGenerationRef.current,
                requestId: ++processRequestIdRef.current,
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
    }, [productConfig, filterState, departmentMap, setStatus, appState, setAppState, setProductConfig, configUrl, workerCachedGeneration, computedBaseFilteredData, computedWarehouseFilteredData, computedFilteredValidSalesData, computedUnshippedOrders, computedUncollectedOrders]);

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
                d.setUTCDate(d.getUTCDate() + 4 - dayNum); // d giờ là Thứ Năm của tuần ISO chứa `date`
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                const wStr = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;

                // Nhãn hiển thị PHẢI tính theo cùng mốc `d` (Thứ Năm ISO) đã dùng để suy ra wStr,
                // KHÔNG phải `date` gốc — nếu không, 2 ngày rơi vào CÙNG 1 tuần ISO (VD tuần ISO
                // W01 vắt qua ranh giới năm, gồm cả cuối tháng 12 lẫn đầu tháng 1) sẽ tính ra 2
                // label khác nhau dù chung 1 key wStr, ghi đè nhãn của nhau tuỳ thứ tự xử lý dòng.
                const labelMonth = d.getUTCMonth() + 1;
                const labelYear = d.getUTCFullYear();
                const firstDayOfLabelMonth = new Date(Date.UTC(labelYear, labelMonth - 1, 1));
                const firstDayWeekday = firstDayOfLabelMonth.getUTCDay() || 7;
                const offsetDate = d.getUTCDate() + firstDayWeekday - 1;
                const weekOfMonth = Math.ceil(offsetDate / 7);

                const label = `Tuần ${weekOfMonth} - Tháng ${String(labelMonth).padStart(2, '0')}/${labelYear}`;
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
        await applyCloudSalesData(pendingCloudSync.data, pendingCloudSync.meta);
    };

    useEffect(() => {
        const onClear = () => {
            setCloudSyncBanner(null);
            try { 
                localStorage.removeItem('ycx-cloud-sync-banner');
                sessionStorage.removeItem('ycx-cloud-sync-banner'); 
            } catch {}
        };
        window.addEventListener('ycx-sales-data-cleared', onClear);
        return () => window.removeEventListener('ycx-sales-data-cleared', onClear);
    }, []);

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
        handleRenameFile,
        hasRealtimeData,
        handleClearRealtimeData,
        handleClearAllData,
        unconfiguredGroups,
        ignoredUnconfiguredGroups,
        handleIgnoreGroup,
        handleRestoreGroup,
        cloudSyncBanner,
        handleDismissCloudSyncBanner
    };
};
