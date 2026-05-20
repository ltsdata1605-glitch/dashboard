import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncToCloud } from '../services/firestoreService';
import { getAllSettings } from '../services/dbService';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export const useCloudSync = () => {
    const { user, isDemoMode } = useAuth();
    const [syncState, setSyncState] = useState<SyncState>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const hasUnsavedChanges = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Clear timeout helper to prevent memory leaks
    const clearSyncTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const forceSync = useCallback(async () => {
        if (!user || isDemoMode) return;
        setSyncState('syncing');
        setLastError(null);
        clearSyncTimeout();
        
        try {
            const allSettings = await getAllSettings();
            await syncToCloud(user, {
                settingsStoreBackup: allSettings
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

        const handleSettingChanged = () => {
            hasUnsavedChanges.current = true;
        };

        const syncIfChanged = () => {
            if (hasUnsavedChanges.current) forceSync();
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
