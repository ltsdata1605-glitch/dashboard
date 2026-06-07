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

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
};
