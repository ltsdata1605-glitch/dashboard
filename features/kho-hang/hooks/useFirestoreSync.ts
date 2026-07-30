import { useState, useCallback } from 'react';
import {
  createCheckingSession,
  syncSessionItemsToFirestore,
} from '../services/firestoreInventoryService';
import type { InventoryItem, CheckingItem } from '../types/inventory';

export const useFirestoreSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const initializeSession = useCallback(
    async (
      userId: string,
      storeName: string,
      maKho: number,
      items: InventoryItem[]
    ) => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        const session = await createCheckingSession(userId, storeName, maKho, items);
        setLastSyncTime(new Date());
        return session;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Lỗi tạo session';
        setSyncError(message);
        console.error('Session init error:', error);
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  const syncToFirestore = useCallback(
    async (
      sessionId: string,
      maKho: number,
      items: InventoryItem[],
      checkingData: Record<string, CheckingItem>
    ) => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        await syncSessionItemsToFirestore(sessionId, maKho, checkingData);
        setLastSyncTime(new Date());
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Lỗi đồng bộ';
        setSyncError(message);
        console.error('Sync error:', error);
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  return {
    isSyncing,
    syncError,
    lastSyncTime,
    initializeSession,
    syncToFirestore,
  };
};
