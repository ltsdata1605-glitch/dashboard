import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncToCloud, HEAVY_SYNC_KEYS, isHeavySyncKey, syncHeavySettingToCloud } from '../services/firestoreService';
import { getAllSettings, getSetting, saveSettingFromCloud } from '../services/dbService';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import toast from 'react-hot-toast';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export const useCloudSync = () => {
    const { user, isDemoMode } = useAuth();
    const [syncState, setSyncState] = useState<SyncState>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const hasUnsavedChanges = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const debounceSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const heavyTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

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
            const settingsToSync: Record<string, any> = {};
            for (const key of Object.keys(allSettings)) {
                if (
                    !excludedKeys.has(key) && 
                    !isHeavySyncKey(key) &&
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
        } catch (err: any) {
            setSyncState('error');
            const errMsg = (err?.message || '').toLowerCase();
            const errCode = err?.code || '';
            setLastError(err?.message || 'Đồng bộ dữ liệu thất bại. Lỗi mạng hoặc hết phiên.');
            
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

        // 1. Setup real-time Firestore listeners
        const configRef = doc(db, 'users', user.uid, 'setting', 'configuration');
        const unsubscribeConfig = onSnapshot(configRef, async (snapshot) => {
            if (!snapshot.exists()) return;
            
            // Skip updating local DB from cloud if the client currently has pending local writes to prevent reversion
            if (hasUnsavedChanges.current) {
                console.log('[Cloud Sync] Real-time config: Skip syncing light settings because we have pending local changes.');
                return;
            }
            
            const data = snapshot.data();
            if (!data) return;

            const cloudLastMod = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : 0;
            if (!cloudLastMod) return;

            const localLastMod = await getSetting<number>('localSettingsLastModified') || 0;

            if (cloudLastMod > localLastMod) {
                console.log(`[Cloud Sync] Real-time: Cloud has newer configuration document (${cloudLastMod} > ${localLastMod}). Updating light settings...`);
                const backup = data.settingsStoreBackup;
                if (backup) {
                    for (const [k, v] of Object.entries(backup)) {
                        if (!isHeavySyncKey(k) && k !== 'salesFilesRegistry') {
                            await saveSettingFromCloud(k, v, cloudLastMod);
                        }
                    }
                }
            }
        }, (err) => {
            console.error('[Cloud Sync] Error in configuration listener:', err);
        });

        const configsCollRef = collection(db, 'users', user.uid, 'configs');
        const unsubscribeConfigs = onSnapshot(configsCollRef, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added' || change.type === 'modified') {
                    const docSnap = change.doc;
                    const key = docSnap.id;
                    
                    if (!isHeavySyncKey(key)) continue;
                    
                    // Skip updating if a local write for this heavy key is debounced/pending
                    if (heavyTimeoutsRef.current[key]) {
                        console.log(`[Cloud Sync] Real-time configs: Skip heavy key "${key}" update because a local write is pending.`);
                        continue;
                    }
                    
                    const data = docSnap.data();
                    if (!data || data.value === undefined) continue;
                    
                    const cloudTime = data.updatedAt?.toMillis 
                        ? data.updatedAt.toMillis() 
                        : (typeof data.updatedAt === 'number' ? data.updatedAt : (data.savedAt || 0));
                    
                    const localValue = await getSetting<any>(key);
                    const localTime = await getSetting<number>(`lastModified_${key}`) || 0;
                    
                    if (localValue === null || cloudTime > localTime) {
                        console.log(`[Cloud Sync] Real-time: Cloud has newer version for heavy key "${key}" (${cloudTime} > ${localTime}). Writing to local DB...`);
                        
                        let val = data.value;
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

        // 2. Setup local change handlers
        const handleSettingChanged = (e: any) => {
            const key = e.detail?.key;

            // Nếu là khóa nặng, kích hoạt đồng bộ riêng biệt qua subcollection
            if (key && isHeavySyncKey(key)) {
                if (heavyTimeoutsRef.current[key]) {
                    clearTimeout(heavyTimeoutsRef.current[key]);
                }
                heavyTimeoutsRef.current[key] = setTimeout(async () => {
                    try {
                        const value = await getSetting(key);
                        if (value !== null) {
                            await syncHeavySettingToCloud(user, key, value);
                            console.log(`[Cloud Sync] Tự động đồng bộ khóa nặng "${key}" lên Firestore.`);
                        }
                    } catch (err) {
                        console.error(`[Cloud Sync] Đồng bộ khóa nặng "${key}" thất bại:`, err);
                    }
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
                            console.log(`[Cloud Sync] Đồng bộ khẩn cấp khóa nặng "${key}" trước khi đóng trang.`);
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
            unsubscribeConfig();
            unsubscribeConfigs();
            window.removeEventListener('ycx-setting-changed', handleSettingChanged);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.clearInterval(intervalId);
            clearSyncTimeout(); // Prevent memory leak when component unmounts
        };
    }, [user, isDemoMode, forceSync, clearSyncTimeout]);

    return { syncState, lastSyncTime, forceSync, lastError };
};
