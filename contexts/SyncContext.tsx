import React, { createContext, useContext } from 'react';
import { useCloudSync } from '../hooks/useCloudSync';

interface SyncContextType {
    syncState: 'idle' | 'syncing' | 'synced' | 'error';
    lastSyncTime: Date | null;
    lastError: string | null;
    forceSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const sync = useCloudSync();
    return (
        <SyncContext.Provider value={sync}>
            {children}
        </SyncContext.Provider>
    );
};

const SAFE_SYNC_FALLBACK: SyncContextType = {
    syncState: 'idle',
    lastSyncTime: null,
    lastError: null,
    forceSync: async () => {},
};

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) {
        console.warn('[Sync] useSync called outside SyncProvider — returning safe fallback. This is likely a bundle/caching/HMR issue.');
        return SAFE_SYNC_FALLBACK;
    }
    return context;
};
