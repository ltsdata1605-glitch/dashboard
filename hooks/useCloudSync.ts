import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncToCloud, HEAVY_SYNC_KEYS, isHeavySyncKey, syncHeavySettingToCloud, restoreNestedArraysFromFirestore, assembleChunkedHeavyValue } from '../services/firestoreService';
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
    // Khoá nào đang có 1 lượt syncHeavySettingToCloud thật sự bay lên Firestore (không chỉ đang
    // chờ debounce) — checkthuong_data giờ có thể là payload ~4MB, chia thành hàng chục document
    // chunk trong 1 batch, mất vài giây để truyền xong. Nếu người dùng tiếp tục thao tác (vd gõ
    // tìm kiếm liên tục trong check-thuong) trong lúc đó, KHÔNG bắn thêm 1 lượt ghi lớn chồng lên
    // — chỉ đánh dấu heavyPendingRef rồi đồng bộ lại đúng 1 lần sau khi lượt đang bay xong. Thiếu
    // chặn này từng gây Firestore SDK báo "Write stream exhausted maximum allowed queued writes".
    const heavyInFlightRef = useRef<Record<string, boolean>>({});
    const heavyPendingRef = useRef<Record<string, boolean>>({});
    // Hàng đợi ghi DÙNG CHUNG cho MỌI khóa nặng — khi tải file mới, nhiều khóa khác nhau
    // (customTabs, industryAnalysisCustomTabs, customExploitationTabs...) hay cùng đổi trong
    // một khoảnh khắc, hết debounce 2s gần như cùng lúc, bắn nhiều lượt ghi Firestore song song.
    // Cùng với lượt tải salesData/khoData chunk lớn, tổng số lượt ghi đồng thời có thể vượt giới
    // hạn "queued writes" của Firestore SDK (khác lỗi ở heavyInFlightRef — đó chặn CÙNG 1 khóa
    // ghi chồng lên chính nó, còn đây nối tiếp các khóa KHÁC nhau thành 1 hàng, không cho chạy
    // cùng lúc). Mỗi lượt ghi tự bắt lỗi bên trong nên promise của hàng đợi không bao giờ reject.
    const heavyWriteQueueRef = useRef<Promise<void>>(Promise.resolve());

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
                                    window.dispatchEvent(new CustomEvent('check-thuong-cloud-sync'));
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
                if (heavyInFlightRef.current[key]) {
                    // Đã có 1 lượt ghi khóa này đang bay lên Firestore — không xếp chồng thêm,
                    // chỉ nhớ để đồng bộ lại 1 lần nữa ngay sau khi lượt hiện tại xong.
                    heavyPendingRef.current[key] = true;
                    return;
                }
                if (heavyTimeoutsRef.current[key]) {
                    clearTimeout(heavyTimeoutsRef.current[key]);
                }
                heavyTimeoutsRef.current[key] = setTimeout(() => {
                    delete heavyTimeoutsRef.current[key];
                    heavyInFlightRef.current[key] = true;
                    heavyWriteQueueRef.current = heavyWriteQueueRef.current.then(async () => {
                        try {
                            do {
                                heavyPendingRef.current[key] = false;
                                const value = await getSetting(key);
                                if (value !== null) {
                                    await syncHeavySettingToCloud(user, key, value);
                                    console.warn(`[Cloud Sync] Tự động đồng bộ khóa nặng "${key}" lên Firestore.`);
                                }
                            } while (heavyPendingRef.current[key]);
                        } catch (err) {
                            console.error(`[Cloud Sync] Đồng bộ khóa nặng "${key}" thất bại:`, err);
                        } finally {
                            heavyInFlightRef.current[key] = false;
                        }
                    });
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

        const syncPendingHeavySettings = async () => {
            for (const [key, timeout] of Object.entries(heavyTimeoutsRef.current)) {
                if (timeout) {
                    clearTimeout(timeout);
                    try {
                        const value = await getSetting(key);
                        if (value !== null) {
                            await syncHeavySettingToCloud(user, key, value);
                            console.warn(`[Cloud Sync] Đồng bộ khẩn cấp khóa nặng "${key}" trước khi đóng trang.`);
                        }
                    } catch (err) {
                        console.error(`[Cloud Sync] Đồng bộ khẩn cấp khóa nặng "${key}" thất bại:`, err);
                    }
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
