import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncToCloud } from '../services/firestoreService';
import { getAllSettings } from '../services/dbService';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export const useCloudSync = () => {
    const { user, isDemoMode } = useAuth();
    const [syncState, setSyncState] = useState<SyncState>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const hasUnsavedChanges = useRef(false);

    const forceSync = useCallback(async () => {
        if (!user || isDemoMode) return;
        setSyncState('syncing');
        try {
            const allSettings = await getAllSettings();
            await syncToCloud(user, {
                settingsStoreBackup: allSettings
            });
            hasUnsavedChanges.current = false;
            setSyncState('synced');
            setLastSyncTime(new Date());

            setTimeout(() => setSyncState('idle'), 5000);
        } catch (err) {
            console.error("Lỗi Auto-Sync full state:", err);
            setSyncState('error');
        }
    }, [user, isDemoMode]);

    useEffect(() => {
        if (!user || isDemoMode) return;

        const handleSettingChanged = () => {
            hasUnsavedChanges.current = true;
        };

        const syncIfChanged = () => {
            if (hasUnsavedChanges.current) {
                forceSync();
            }
        };

        window.addEventListener('ycx-setting-changed', handleSettingChanged);
        
        // Auto-save when user leaves the page or hides the tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                syncIfChanged();
            }
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
        };
    }, [user, isDemoMode, forceSync]);

    return { syncState, lastSyncTime, forceSync };
};
