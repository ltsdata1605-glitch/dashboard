/**
 * Firestore Inventory Checking Service — đồng bộ dữ liệu KIỂM KÊ (không phải dữ liệu tồn
 * kho gốc từ Excel) theo Mã Kho, để nhiều nhân viên cùng Kho (đăng nhập trên thiết bị
 * riêng) thấy chung tiến độ quét của nhau — theo đúng mẫu `services/khoDataService.ts`
 * (implementation_plan.md mục 37), xem thiết kế đầy đủ ở mục 20.
 *
 * Firestore structure:
 *   inventoryChecking/{maKho}/sessions/{sessionId}                — metadata 1 phiên kiểm kê
 *   inventoryChecking/{maKho}/sessions/{sessionId}/items/{itemId} — CHỈ tạo khi item đã
 *                                                                    được quét/sửa (thưa,
 *                                                                    không pre-populate)
 *
 * Không cần Cloud Function — mọi kiểm tra quyền nằm trong firestore.rules (maKho in
 * myKhos()), giống hệt khoData.
 */

import { db } from '@/services/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

export interface InventorySessionMeta {
  id: string;
  maKho: string;
  storeName: string;
  createdBy: string;
  createdByName: string;
  startDate: number;
  endDate: number | null;
  status: 'in_progress' | 'completed';
  totalItems: number;
}

export interface RemoteCheckingItem {
  soLuongKiemKe: number;
  ghiChu: string;
  lastScannedAt: number;
  scannedByUid: string;
}

const sessionsCollectionRef = (maKho: string) => collection(db, 'inventoryChecking', maKho, 'sessions');
const itemsCollectionRef = (maKho: string, sessionId: string) =>
  collection(db, 'inventoryChecking', maKho, 'sessions', sessionId, 'items');

/** Tìm phiên đang `in_progress` gần nhất của 1 Kho (thường chỉ có đúng 1 phiên tại 1 thời điểm). */
export async function findActiveSession(maKho: string): Promise<InventorySessionMeta | null> {
  const q = query(sessionsCollectionRef(maKho), where('status', '==', 'in_progress'), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { ...(docSnap.data() as Omit<InventorySessionMeta, 'id'>), id: docSnap.id };
}

/** Tạo phiên kiểm kê mới cho 1 Kho. */
export async function createSession(
  maKho: string,
  storeName: string,
  user: User,
  totalItems: number
): Promise<InventorySessionMeta> {
  const sessionRef = doc(sessionsCollectionRef(maKho));
  const meta: Omit<InventorySessionMeta, 'id'> = {
    maKho,
    storeName,
    createdBy: user.uid,
    createdByName: user.displayName || user.email || user.uid,
    startDate: Date.now(),
    endDate: null,
    status: 'in_progress',
    totalItems,
  };
  await setDoc(sessionRef, meta);
  return { ...meta, id: sessionRef.id };
}

/** Tìm phiên đang mở của Kho, tạo mới nếu chưa có — điểm gọi chính khi upload file. */
export async function findOrCreateSession(
  maKho: string,
  storeName: string,
  user: User,
  totalItems: number
): Promise<InventorySessionMeta> {
  const existing = await findActiveSession(maKho);
  if (existing) return existing;
  return createSession(maKho, storeName, user, totalItems);
}

/**
 * Lắng nghe realtime toàn bộ item đã kiểm kê của 1 phiên — báo lại mỗi khi có thay đổi
 * (kể cả từ đồng đội). Emit ngay lần đầu với dữ liệu hiện có, không cần gọi getDocs() riêng.
 */
export function subscribeSessionItems(
  maKho: string,
  sessionId: string,
  callback: (items: Record<string, RemoteCheckingItem>) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  return onSnapshot(
    itemsCollectionRef(maKho, sessionId),
    (snapshot) => {
      const items: Record<string, RemoteCheckingItem> = {};
      snapshot.forEach((docSnap) => {
        items[docSnap.id] = docSnap.data() as RemoteCheckingItem;
      });
      callback(items);
    },
    (error) => {
      console.warn('[InventoryFirestore] Lỗi lắng nghe realtime:', error);
      onError?.(error);
    }
  );
}

/** Ghi (tạo hoặc cập nhật) tiến độ kiểm kê 1 item — best-effort, gọi sau mỗi lần quét/sửa số lượng/ghi chú. */
export async function upsertCheckingItem(
  maKho: string,
  sessionId: string,
  itemId: string,
  data: { soLuongKiemKe: number; ghiChu: string; scannedByUid: string }
): Promise<void> {
  const itemRef = doc(itemsCollectionRef(maKho, sessionId), itemId);
  const payload: RemoteCheckingItem = { ...data, lastScannedAt: Date.now() };
  await setDoc(itemRef, payload, { merge: true });
}

/** Đánh dấu phiên đã hoàn thành — lần tải file kế tiếp của Kho sẽ tạo phiên mới thay vì nối vào phiên này. */
export async function completeSession(maKho: string, sessionId: string): Promise<void> {
  await updateDoc(doc(sessionsCollectionRef(maKho), sessionId), {
    status: 'completed',
    endDate: Date.now(),
  });
}
