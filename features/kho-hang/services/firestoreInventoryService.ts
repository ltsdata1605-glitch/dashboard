import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { InventoryItem, InventorySession, CheckingItem } from '../types/inventory';

/**
 * Create new inventory checking session
 * Path: /inventoryChecking/{maKho}/sessions/{sessionId}
 */
export const createCheckingSession = async (
  userId: string,
  storeName: string,
  maKho: number,
  items: InventoryItem[]
): Promise<InventorySession> => {
  const sessionId = `session_${Date.now()}_${maKho}`;

  const session: InventorySession = {
    id: sessionId,
    userId,
    storeName,
    maKho,
    startDate: new Date(),
    status: 'in_progress',
    items: {},
  };

  try {
    // Save session document: /inventoryChecking/{maKho}/sessions/{sessionId}
    const sessionPath = `inventoryChecking/${maKho}/sessions/${sessionId}`;
    await setDoc(doc(db, sessionPath), {
      id: sessionId,
      userId,
      createdBy: userId,
      storeName,
      maKho,
      startDate: serverTimestamp(),
      endDate: null,
      status: 'in_progress',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return session;
  } catch (error) {
    console.error('Error creating checking session:', error);
    throw error;
  }
};

/**
 * Update checking item (scan QR)
 * Path: /inventoryChecking/{maKho}/sessions/{sessionId}/items/{itemId}
 */
export const updateCheckingItem = async (
  sessionId: string,
  maKho: number,
  itemId: string,
  quantity: number,
  note?: string
): Promise<void> => {
  try {
    const itemPath = `inventoryChecking/${maKho}/sessions/${sessionId}/items/${itemId}`;

    const updateData: any = {
      soLuongKiemKe: quantity,
      lastScannedAt: serverTimestamp(),
    };

    if (note !== undefined) {
      updateData.ghiChu = note;
    }

    await setDoc(doc(db, itemPath), updateData, { merge: true });
  } catch (error) {
    console.error('Error updating checking item:', error);
    throw error;
  }
};

/**
 * Get checking session by ID
 */
export const getCheckingSession = async (
  sessionId: string,
  maKho: number
): Promise<InventorySession | null> => {
  try {
    const sessionPath = `inventoryChecking/${maKho}/sessions/${sessionId}`;
    const docSnap = await getDoc(doc(db, sessionPath));

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: data.id,
      userId: data.userId,
      storeName: data.storeName,
      maKho: data.maKho,
      startDate: data.startDate?.toDate?.() || new Date(data.startDate),
      endDate: data.endDate?.toDate?.() || undefined,
      status: data.status,
      items: data.items || {},
    };
  } catch (error) {
    console.error('Error getting checking session:', error);
    throw error;
  }
};

/**
 * Complete checking session
 */
export const completeCheckingSession = async (
  sessionId: string,
  maKho: number
): Promise<void> => {
  try {
    const sessionPath = `inventoryChecking/${maKho}/sessions/${sessionId}`;
    await updateDoc(doc(db, sessionPath), {
      status: 'completed',
      endDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error completing checking session:', error);
    throw error;
  }
};

/**
 * Sync entire session to Firestore (items)
 */
export const syncSessionItemsToFirestore = async (
  sessionId: string,
  maKho: number,
  items: Record<string, CheckingItem>
): Promise<void> => {
  try {
    for (const [itemId, checkingItem] of Object.entries(items)) {
      const itemPath = `inventoryChecking/${maKho}/sessions/${sessionId}/items/${itemId}`;
      await setDoc(doc(db, itemPath), checkingItem, { merge: true });
    }
  } catch (error) {
    console.error('Error syncing session items to Firestore:', error);
    throw error;
  }
};
