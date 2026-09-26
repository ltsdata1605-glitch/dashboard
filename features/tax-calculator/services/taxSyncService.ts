import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../services/firebase';
import { SavedTaxRecord } from '../types/tax.types';
import { taxIndexedDbService } from './taxIndexedDbService';

const FIRESTORE_DOC_KEY = 'tax_calculator_history';

/**
 * Service đồng bộ dữ liệu tính thuế 3 lớp:
 * 1. IndexedDB (Lưu trữ cục bộ nhanh, hoạt động offline)
 * 2. LocalStorage (Lưu state form nhập gần nhất)
 * 3. Firebase Firestore (Lưu trữ cloud theo tài khoản người dùng)
 */
export const taxSyncService = {
    /**
     * Kiểm tra trạng thái kết nối Cloud
     */
    isCloudReady(): boolean {
        return !!auth.currentUser;
    },

    /**
     * Lấy toàn bộ lịch sử: ưu tiên IndexedDB kết hợp đồng bộ Firestore
     */
    async getAllRecords(): Promise<SavedTaxRecord[]> {
        const localRecords = await taxIndexedDbService.getAll();

        const user = auth.currentUser;
        if (!user) {
            return localRecords;
        }

        try {
            const docRef = doc(db, 'users', user.uid, 'setting', FIRESTORE_DOC_KEY);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const cloudData = snap.data();
                const cloudRecords: SavedTaxRecord[] = cloudData?.records || [];

                // Hợp nhất dữ liệu Cloud và Local theo thời gian tạo
                const recordMap = new Map<string, SavedTaxRecord>();

                // Đưa local vào map
                for (const r of localRecords) {
                    recordMap.set(r.createdAt, { ...r, syncedToCloud: false });
                }

                // Đưa cloud vào map (ghi đè hoặc bổ sung)
                for (const cr of cloudRecords) {
                    const existing = recordMap.get(cr.createdAt);
                    recordMap.set(cr.createdAt, {
                        ...cr,
                        id: existing?.id || cr.id,
                        syncedToCloud: true
                    });
                }

                const mergedList = Array.from(recordMap.values()).sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                return mergedList;
            }
        } catch (err) {
            console.warn('[TaxSync] Không thể tải từ Firestore, sử dụng IndexedDB:', err);
        }

        return localRecords;
    },

    /**
     * Lưu một bản ghi tính thuế mới: lưu vào IndexedDB và đẩy lên Firestore
     */
    async saveRecord(record: Omit<SavedTaxRecord, 'id'>): Promise<number> {
        // 1. Lưu vào IndexedDB
        const localId = await taxIndexedDbService.save(record);

        // 2. Lưu vào Firestore nếu đã đăng nhập
        const user = auth.currentUser;
        if (user) {
            try {
                const docRef = doc(db, 'users', user.uid, 'setting', FIRESTORE_DOC_KEY);
                const snap = await getDoc(docRef);
                const currentRecords: SavedTaxRecord[] = snap.exists() ? snap.data()?.records || [] : [];

                const newCloudRecord: SavedTaxRecord = {
                    ...record,
                    id: localId,
                    syncedToCloud: true
                };

                const updatedRecords = [
                    newCloudRecord,
                    ...currentRecords.filter(r => r.createdAt !== record.createdAt)
                ].slice(0, 100); // Giới hạn 100 bản ghi gần nhất

                await setDoc(docRef, {
                    records: updatedRecords,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } catch (err) {
                console.error('[TaxSync] Lỗi lưu lên Firestore:', err);
            }
        }

        return localId;
    },

    /**
     * Xóa một bản ghi tính thuế
     */
    async deleteRecord(id: number, createdAt?: string): Promise<void> {
        await taxIndexedDbService.delete(id);

        const user = auth.currentUser;
        if (user && createdAt) {
            try {
                const docRef = doc(db, 'users', user.uid, 'setting', FIRESTORE_DOC_KEY);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const currentRecords: SavedTaxRecord[] = snap.data()?.records || [];
                    const filtered = currentRecords.filter(r => r.createdAt !== createdAt);
                    await setDoc(docRef, {
                        records: filtered,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }
            } catch (err) {
                console.error('[TaxSync] Lỗi xóa trên Firestore:', err);
            }
        }
    },

    /**
     * Cập nhật kỳ lương (tháng/năm) cho một bản ghi tính thuế đã lưu
     */
    async updateRecordMonth(idOrCreatedAt: number | string, newMonthYear: string): Promise<void> {
        await taxIndexedDbService.updateMonth(idOrCreatedAt, newMonthYear);

        const user = auth.currentUser;
        if (user) {
            try {
                const docRef = doc(db, 'users', user.uid, 'setting', FIRESTORE_DOC_KEY);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const currentRecords: SavedTaxRecord[] = snap.data()?.records || [];
                    const updated = currentRecords.map(r => {
                        if (r.id === idOrCreatedAt || r.createdAt === idOrCreatedAt) {
                            return { ...r, monthYear: newMonthYear };
                        }
                        return r;
                    });
                    await setDoc(docRef, {
                        records: updated,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }
            } catch (err) {
                console.error('[TaxSync] Lỗi cập nhật tháng trên Firestore:', err);
            }
        }
    },

    /**
     * Cập nhật kỳ lương (tháng/năm) cho nhiều bản ghi cùng lúc
     */
    async updateRecordsMonth(idOrCreatedAts: (number | string)[], newMonthYear: string): Promise<void> {
        await taxIndexedDbService.updateMonths(idOrCreatedAts, newMonthYear);

        const user = auth.currentUser;
        if (user) {
            try {
                const docRef = doc(db, 'users', user.uid, 'setting', FIRESTORE_DOC_KEY);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const currentRecords: SavedTaxRecord[] = snap.data()?.records || [];
                    const keySet = new Set(idOrCreatedAts);
                    const updated = currentRecords.map(r => {
                        if (keySet.has(r.id as number) || keySet.has(r.createdAt)) {
                            return { ...r, monthYear: newMonthYear };
                        }
                        return r;
                    });
                    await setDoc(docRef, {
                        records: updated,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }
            } catch (err) {
                console.error('[TaxSync] Lỗi cập nhật tháng hàng loạt trên Firestore:', err);
            }
        }
    },

    /**
     * Xóa toàn bộ lịch sử
     */
    async clearAll(): Promise<void> {
        await taxIndexedDbService.clearAll();

        const user = auth.currentUser;
        if (user) {
            try {
                const docRef = doc(db, 'users', user.uid, 'setting', FIRESTORE_DOC_KEY);
                await setDoc(docRef, {
                    records: [],
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } catch (err) {
                console.error('[TaxSync] Lỗi xóa Firestore:', err);
            }
        }
    }
};
