import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createCheckingSession,
  syncSessionItemsToFirestore,
} from '../services/firestoreInventoryService';
import { InventoryItem, InventorySession, CheckingItem } from '../types/inventory';

interface UseFirestoreSyncProps {
  items: InventoryItem[];
  checkingData: Record<string, CheckingItem>;
  currentSession: InventorySession | null;
}

export const useFirestoreSync = ({
  items,
  checkingData,
  currentSession,
}: UseFirestoreSyncProps) => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const initializeSession = useCallback(async () => {
    if (!user?.uid || !currentSession) return null;

    setIsSyncing(true);
    setError(null);

    try {
      const session = await createCheckingSession(
        user.uid,
        currentSession.storeName,
        currentSession.maKho,
        items
      );
      setLastSyncTime(new Date());
      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi tạo session';
      setError(message);
      console.error('Session init error:', error);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [user?.uid, currentSession, items]);

  const syncToFirestore = useCallback(async () => {
    if (!user?.uid || !currentSession?.id) {
      setError('Chưa khởi tạo session');
      return false;
    }

    setIsSyncing(true);
    setError(null);

    try {
      await syncSessionItemsToFirestore(
        currentSession.id,
        currentSession.maKho,
        checkingData
      );
      setLastSyncTime(new Date());
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi đồng bộ';
      setError(message);
      console.error('Sync error:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [user?.uid, currentSession?.id, currentSession?.maKho, checkingData]);

  return {
    isSyncing,
    syncError,
    lastSyncTime,
    initializeSession,
    syncToFirestore,
  };
};
