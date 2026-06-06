import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncToCloud, HEAVY_SYNC_KEYS } from '../services/firestoreService';
import { getAllSettings, getSetting } from '../services/dbService';

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
                'last-updates-list'
            ]);
            const settingsToSync: Record<string, any> = {};
            for (const key of Object.keys(allSettings)) {
                if (
                    !excludedKeys.has(key) && 
                    !key.startsWith('cached_') && 
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
                import('react-hot-toast').then(({ default: toast }) => {
                    toast('⏳ Đã lưu cài đặt vào máy. Đồng bộ lên đám mây sẽ tự động thử lại sau.', { 
                        id: 'quota-limit',
                        icon: '☁️',
                        duration: 4000
                    });
                });
            } else if (errMsg.includes('unauthenticated') || errMsg.includes('permission-denied')) {
                import('react-hot-toast').then(({ default: toast }) => {
                    toast('🔑 Phiên đăng nhập hết hạn. Đăng nhập lại để đồng bộ cài đặt.', { 
                        id: 'auth-expired',
                        duration: 5000
                    });
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

        const handleSettingChanged = (e: any) => {
            const key = e.detail?.key;

            // Nếu là khóa nặng, kích hoạt đồng bộ riêng biệt qua subcollection
            if (key && HEAVY_SYNC_KEYS.has(key)) {
                if (heavyTimeoutsRef.current[key]) {
                    clearTimeout(heavyTimeoutsRef.current[key]);
                }
                heavyTimeoutsRef.current[key] = setTimeout(async () => {
                    try {
                        const value = await getSetting(key);
                        if (value !== null) {
                            const { syncHeavySettingToCloud } = await import('../services/firestoreService');
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
                'last-updates-list'
            ]);
            if (
                key && (
                    excludedKeys.has(key) || 
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
                            const { syncHeavySettingToCloud } = await import('../services/firestoreService');
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
            window.removeEventListener('ycx-setting-changed', handleSettingChanged);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.clearInterval(intervalId);
            clearSyncTimeout(); // Prevent memory leak when component unmounts
        };
    }, [user, isDemoMode, forceSync, clearSyncTimeout]);

    return { syncState, lastSyncTime, forceSync, lastError };
};
