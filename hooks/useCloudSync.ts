import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncToCloud, HEAVY_SYNC_KEYS, isHeavySyncKey, syncHeavySettingToCloudQueued, isHeavyKeyInFlight, restoreNestedArraysFromFirestore, assembleChunkedHeavyValue } from '../services/firestoreService';
import { getAllSettings, getSetting, saveSettingFromCloud } from '../services/dbService';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import toast from 'react-hot-toast';
import { getErrorMessage, getErrorCode } from '../utils/dataUtils';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

const isLocalOnlyKey = (key: string): boolean => {
    const k = key.startsWith('bi_') ? key.slice(3) : key;
    return (
        k === 'nhanvien-active-tab' ||
        k === 'nhanvien-active-competition-tab' ||
        k === 'dashboard-main-tab' ||
        k === 'dashboard-sub-tab' ||
        k === 'main-active-view' ||
        k === 'dashboard-active-supermarket' ||
        k === 'nhanvien-active-supermarkets' ||
        k === 'nhanvien-active-depts-multi' ||
        k === 'highlight-employees-multi' ||
        k.startsWith('active-')
    );
};

export const useCloudSync = () => {
    const { user, isDemoMode } = useAuth();
    const [syncState, setSyncState] = useState<SyncState>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const hasUnsavedChanges = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const debounceSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const heavyTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
    // BUG FIX: onSnapshot(configsCollRef) luôn bắn 1 lượt 'added' cho TOÀN BỘ doc hiện có ngay khi
    // listener vừa gắn (hành vi chuẩn của Firestore, không phải thay đổi thật) — nếu không phân biệt,
    // lượt đồng bộ khởi động bình thường (mở app 1 tab duy nhất) cũng bị hiểu nhầm thành "tab khác vừa
    // sửa", hiện toast hỏi xác nhận dù không có gì để tải lại (data đã đúng sẵn). Chỉ lượt bắn ĐẦU
    // TIÊN của listener mới coi là đồng bộ khởi động (áp dụng ngay, không hỏi); các lượt SAU mới là
    // thay đổi thật từ tab/thiết bị khác đang mở sống cùng lúc.
    const isInitialConfigsSnapshotRef = useRef(true);
    // Coalesce (in-flight/pending) + hàng đợi ghi tuần tự dùng chung cho MỌI khóa nặng đã chuyển
    // xuống services/firestoreService.ts (syncHeavySettingToCloudQueued/isHeavyKeyInFlight) —
    // module-level singleton, không phải React ref, để hooks/useDataManagement.ts (hook khác,
    // mount riêng) cũng tự động qua ĐÚNG 1 hàng đợi này thay vì gọi thẳng syncHeavySettingToCloud
    // và có thể ghi song song ngoài tầm kiểm soát (từng gây "Write stream exhausted maximum
    // allowed queued writes" — xem comment ở nơi định nghĩa).

    // Clear timeout helper to prevent memory leaks
    const clearSyncTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (debounceSyncTimeoutRef.current) {
            clearTimeout(debounceSyncTimeoutRef.current);
            debounceSyncTimeoutRef.current = null;
        }
        Object.values(heavyTimeoutsRef.current).forEach(clearTimeout);
        heavyTimeoutsRef.current = {};
    }, []);

    const forceSync = useCallback(async () => {
        if (!user || isDemoMode) return;
        setSyncState('syncing');
        setLastError(null);
        clearSyncTimeout();
        
        try {
            const allSettings = await getAllSettings();
            
            // Lọc bỏ các key dữ liệu lớn hoặc cache/tạm thời để tránh vượt quá giới hạn 1MB của Firestore
            const excludedKeys = new Set([
                'productConfig',
                'departmentMap',
                'localSettingsLastModified',
                'topSellerAnalysisHistory',
                'customTabs',
                'headToHeadTables',
                'customCalendars',
                'crossSellingConfig',
                'industryAnalysisCustomTabs',
                'summary-realtime',
                'summary-luy-ke',
                'competition-realtime',
                'competition-luy-ke',
                'last-updates-list',
                'stickerPrinterState',
                'stickerPrintHistory',
                'salesFilesRegistry'
            ]);
            const settingsToSync: Record<string, unknown> = {};
            for (const key of Object.keys(allSettings)) {
                if (
                    !excludedKeys.has(key) && 
                    !isHeavySyncKey(key) &&
                    !isLocalOnlyKey(key) &&
                    !key.startsWith('cached_') && 
                    !key.startsWith('lastModified_') &&
                    !key.startsWith('summary-') && 
                    !key.startsWith('competition-')
                ) {
                    settingsToSync[key] = allSettings[key];
                }
            }

            await syncToCloud(user, {
                settingsStoreBackup: settingsToSync
            });
            hasUnsavedChanges.current = false;
            setSyncState('synced');
            setLastSyncTime(new Date());

            timeoutRef.current = setTimeout(() => {
                setSyncState('idle');
            }, 5000);
        } catch (err: unknown) {
            setSyncState('error');
            const errMsg = getErrorMessage(err).toLowerCase();
            const errCode = getErrorCode(err) || '';
            setLastError(getErrorMessage(err) || 'Đồng bộ dữ liệu thất bại. Lỗi mạng hoặc hết phiên.');
            
            if (errCode === 'resource-exhausted' || errMsg.includes('quota') || errMsg.includes('429')) {
                toast('⏳ Đã lưu cài đặt vào máy. Đồng bộ lên đám mây sẽ tự động thử lại sau.', { 
                    id: 'quota-limit',
                    icon: '☁️',
                    duration: 4000
                });
            } else if (errMsg.includes('unauthenticated') || errMsg.includes('permission-denied')) {
                toast('🔑 Phiên đăng nhập hết hạn. Đăng nhập lại để đồng bộ cài đặt.', { 
                    id: 'auth-expired',
                    duration: 5000
                });
            }
            // All errors: data is safe in IndexedDB, will sync when possible
            timeoutRef.current = setTimeout(() => {
                setSyncState('idle');
                setLastError(null);
            }, 8000);
        }
    }, [user, isDemoMode, clearSyncTimeout]);

    useEffect(() => {
        if (!user || isDemoMode) return;

        let unsubConfig: (() => void) | null = null;
        let unsubConfigs: (() => void) | null = null;

        // PERF FIX: Hoãn khởi tạo Firestore Listeners 2s sau khi mở app
        // Giúp 2s đầu trình duyệt tập trung 100% CPU đọc IndexedDB cục bộ cực nhanh,
        // render giao diện mượt mà tuyệt đối mà không bị giật lag/đơ do network/JSON.parse từ Cloud.
        const bootTimer = setTimeout(() => {
            // 1. Setup real-time Firestore listeners
            const configRef = doc(db, 'users', user.uid, 'setting', 'configuration');
            unsubConfig = onSnapshot(configRef, async (snapshot) => {
                if (!snapshot.exists()) return;
                
                // Skip updating local DB from cloud if the client currently has pending local writes to prevent reversion
                if (hasUnsavedChanges.current) {
                    console.warn('[Cloud Sync] Real-time config: Skip syncing light settings because we have pending local changes.');
                    return;
                }
                
                const data = snapshot.data();
                if (!data) return;

                const cloudLastMod = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : 0;
                if (!cloudLastMod) return;

                const localLastMod = await getSetting<number>('localSettingsLastModified') || 0;

                if (cloudLastMod > localLastMod) {
                    console.warn(`[Cloud Sync] Real-time: Cloud has newer configuration document (${cloudLastMod} > ${localLastMod}). Updating light settings...`);
                    const backup = data.settingsStoreBackup;
                    if (backup) {
                        for (const [k, v] of Object.entries(backup)) {
                            if (!isHeavySyncKey(k) && !isLocalOnlyKey(k) && k !== 'salesFilesRegistry') {
                                await saveSettingFromCloud(k, v, cloudLastMod);
                            }
                        }
                    }
                }
            }, (err) => {
                console.error('[Cloud Sync] Error in configuration listener:', err);
            });

            const configsCollRef = collection(db, 'users', user.uid, 'configs');
            unsubConfigs = onSnapshot(configsCollRef, async (snapshot) => {
                // Chốt ngay đầu lượt gọi: lượt NÀY có phải lượt bắn đầu tiên của listener không (đồng
                // bộ khởi động) — xem giải thích ở khai báo isInitialConfigsSnapshotRef phía trên.
                const isInitialSnapshot = isInitialConfigsSnapshotRef.current;
                isInitialConfigsSnapshotRef.current = false;
                for (const change of snapshot.docChanges()) {
                    if (change.type === 'added' || change.type === 'modified') {
                        const docSnap = change.doc;
                        const key = docSnap.id;
                        
                        if (!isHeavySyncKey(key)) continue;
                        
                        // Skip updating if a local write for this heavy key is debounced/pending
                        if (heavyTimeoutsRef.current[key]) {
                            console.warn(`[Cloud Sync] Real-time configs: Skip heavy key "${key}" update because a local write is pending.`);
                            continue;
                        }
                        
                        const data = docSnap.data();
                        if (!data) continue;
                        if (!data.chunked && data.value === undefined) continue;

                        const cloudTime = data.updatedAt?.toMillis
                            ? data.updatedAt.toMillis()
                            : (typeof data.updatedAt === 'number' ? data.updatedAt : (data.savedAt || 0));

                        const localValue = await getSetting<unknown>(key);
                        const localTime = await getSetting<number>(`lastModified_${key}`) || 0;

                        if (localValue === null || cloudTime > localTime) {
                            console.warn(`[Cloud Sync] Real-time: Cloud has newer version for heavy key "${key}" (${cloudTime} > ${localTime}). Writing to local DB...`);

                            let val: typeof data.value;
                            if (data.chunked) {
                                val = await assembleChunkedHeavyValue(docSnap.ref) as typeof data.value;
                                if (val === undefined) continue;
                            } else {
                                val = restoreNestedArraysFromFirestore(data.value) as typeof data.value;
                            }
                            if (key === 'productConfig' && val && val.config && val.config.groups) {
                                const restoredGroups: { [key: string]: Set<string> } = {};
                                for (const [gKey, gVal] of Object.entries(val.config.groups)) {
                                    restoredGroups[gKey] = new Set(gVal as string[]);
                                }
                                val.config.groups = restoredGroups;
                            }
                            
                            await saveSettingFromCloud(key, val, cloudTime || Date.now());
                            
                            if (key === 'checkthuong_data') {
                                try {
                                    const { saveCheckThuongDataToIframeDb } = await import('../services/checkThuongIframeService');
                                    await saveCheckThuongDataToIframeDb(val);
                                    // BUG FIX: trước đây phát 'check-thuong-cloud-sync' — CheckThuongView.tsx
                                    // áp dụng NGAY, ghi đè UI đang xem mà không cảnh báo khi mở 2
                                    // tab/thiết bị cùng sửa (last-write-wins im lặng). Dữ liệu Cloud đã ghi
                                    // an toàn vào IndexedDB ở dòng trên + saveCheckThuongDataToIframeDb —
                                    // không mất dữ liệu — chỉ đổi tên sự kiện để CheckThuongView HỎI người
                                    // dùng trước khi áp dụng vào UI, thay vì tự động.
                                    //
                                    // BUG FIX #2: lượt bắn ĐẦU TIÊN của listener (đồng bộ khởi động khi mới mở
                                    // app, không phải tab khác vừa sửa) vẫn phải phát tên sự kiện CŨ (áp dụng
                                    // ngay) — nếu không, mở app bình thường cũng hiện toast hỏi "tab khác vừa
                                    // sửa" dù chẳng có tab nào khác, và bấm "Tải lại" không thấy đổi gì vì dữ
                                    // liệu vốn đã đúng sẵn (đây chính là lỗi user báo cáo).
                                    window.dispatchEvent(new CustomEvent(
                                        isInitialSnapshot ? 'check-thuong-cloud-sync' : 'check-thuong-cloud-update-available'
                                    ));
                                } catch (err) {
                                    console.error('[Cloud Sync CheckThuong] Error writing to iframe DB:', err);
                                }
                            }
                        }
                    }
                }
            }, (err) => {
                console.error('[Cloud Sync] Error in configs collection listener:', err);
            });
        }, 2000);

        // 2. Setup local change handlers
        const handleSettingChanged = (e: CustomEvent<{ key: string; source?: string }>) => {
            const key = e.detail?.key;

            // Nếu là khóa nặng, kích hoạt đồng bộ riêng biệt qua subcollection
            if (key && isHeavySyncKey(key)) {
                if (isHeavyKeyInFlight(key)) {
                    // Đã có 1 lượt ghi khóa này đang bay lên Firestore — không xếp chồng thêm,
                    // chỉ nhớ để đồng bộ lại 1 lần nữa ngay sau khi lượt hiện tại xong (xử lý bên
                    // trong syncHeavySettingToCloudQueued).
                    syncHeavySettingToCloudQueued(user, key);
                    return;
                }
                if (heavyTimeoutsRef.current[key]) {
                    clearTimeout(heavyTimeoutsRef.current[key]);
                }
                heavyTimeoutsRef.current[key] = setTimeout(() => {
                    delete heavyTimeoutsRef.current[key];
                    syncHeavySettingToCloudQueued(user, key);
                    console.warn(`[Cloud Sync] Tự động đồng bộ khóa nặng "${key}" lên Firestore.`);
                }, 2000); // Debounce 2 giây
                return;
            }

            // Bỏ qua các key dữ liệu lớn hoặc cache/tạm thời để tránh kích hoạt đồng bộ liên tục
            const excludedKeys = new Set([
                'productConfig',
                'departmentMap',
                'localSettingsLastModified',
                'topSellerAnalysisHistory',
                'customTabs',
                'headToHeadTables',
                'customCalendars',
                'crossSellingConfig',
                'industryAnalysisCustomTabs',
                'summary-realtime',
                'summary-luy-ke',
                'competition-realtime',
                'competition-luy-ke',
                'last-updates-list',
                'stickerPrinterState',
                'stickerPrintHistory',
                'salesFilesRegistry'
            ]);
            if (
                key && (
                    excludedKeys.has(key) || 
                    isHeavySyncKey(key) ||
                    isLocalOnlyKey(key) ||
                    key.startsWith('cached_') || 
                    key.startsWith('summary-') || 
                    key.startsWith('competition-')
                )
            ) {
                return;
            }

            hasUnsavedChanges.current = true;
            if (debounceSyncTimeoutRef.current) {
                clearTimeout(debounceSyncTimeoutRef.current);
            }
            debounceSyncTimeoutRef.current = setTimeout(() => {
                if (hasUnsavedChanges.current) {
                    forceSync();
                }
            }, 2000);
        };

        const syncPendingHeavySettings = () => {
            // Qua đúng hàng đợi dùng chung (syncHeavySettingToCloudQueued) như nhánh debounce
            // chính — trước đây gọi thẳng syncHeavySettingToCloud() ở đây, có thể chạy song song
            // ngoài hàng đợi nếu đúng lúc 1 khóa khác đang được ghi (xem comment ở nơi định nghĩa).
            for (const [key, timeout] of Object.entries(heavyTimeoutsRef.current)) {
                if (timeout) {
                    clearTimeout(timeout);
                    syncHeavySettingToCloudQueued(user, key);
                    console.warn(`[Cloud Sync] Đồng bộ khẩn cấp khóa nặng "${key}" trước khi đóng trang.`);
                }
            }
            heavyTimeoutsRef.current = {};
        };

        const syncIfChanged = () => {
            if (hasUnsavedChanges.current) forceSync();
            syncPendingHeavySettings();
        };

        window.addEventListener('ycx-setting-changed', handleSettingChanged);
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') syncIfChanged();
        };
        const handleBeforeUnload = () => {
            syncIfChanged();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Periodic check every 15 minutes to save if there are unsaved changes
        const intervalId = window.setInterval(syncIfChanged, 15 * 60 * 1000);

        return () => {
            clearTimeout(bootTimer);
            if (unsubConfig) unsubConfig();
            if (unsubConfigs) unsubConfigs();
            window.removeEventListener('ycx-setting-changed', handleSettingChanged);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.clearInterval(intervalId);
            clearSyncTimeout(); // Prevent memory leak when component unmounts
        };
    }, [user, isDemoMode, forceSync, clearSyncTimeout]);

    return { syncState, lastSyncTime, forceSync, lastError };
};
