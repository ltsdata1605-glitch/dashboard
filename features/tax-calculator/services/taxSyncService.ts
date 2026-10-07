import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db, auth } from '../../../services/firebase';
import { SavedTaxRecord } from '../types/tax.types';
import { taxIndexedDbService } from './taxIndexedDbService';

const FIRESTORE_DOC_KEY = 'tax_calculator_history';
/**
 * Chủ dự án (2026-09-30): BỎ trần 100 bản ghi. Còn lại đúng 1 giới hạn KỸ THUẬT: cả lịch sử nằm trong
 * 1 document Firestore, mà document tối đa 1 MiB. Mỗi bản ghi ~0,5–1,5 KB → ~700–2.000 bản (một người
 * lưu mỗi tháng = hàng chục năm). Chỉ khi bản trên cloud chạm ngưỡng dưới đây mới bỏ bớt bản CŨ NHẤT
 * khỏi bản cloud (bản trên máy giữ đủ) và báo người dùng. Muốn không giới hạn tuyệt đối thì phải tách
 * mỗi bản ghi 1 document (di trú dữ liệu) — chưa làm.
 */
const CLOUD_MAX_BYTES = 900_000;
function catTheoDungLuong(records: SavedTaxRecord[]): SavedTaxRecord[] {
    let out = records;
    // Ước lượng theo độ dài JSON (UTF-8 của tiếng Việt ≤ 3 byte/ký tự → nhân 1,5 cho an toàn)
    while (out.length > 1 && JSON.stringify(out).length * 1.5 > CLOUD_MAX_BYTES) {
        out = out.slice(0, Math.floor(out.length * 0.95));
    }
    if (out.length < records.length) {
        toast(`Lịch sử Thuế trên cloud đã gần giới hạn 1 MB — ${records.length - out.length} bản cũ nhất chỉ còn lưu trên máy này.`, { id: 'tax-cloud-full', duration: 8000 });
    }
    return out;
}

/**
 * Audit A31 (2026-09-30): trước đây mọi thao tác là getDoc → sửa mảng → setDoc. Hai thiết bị (hoặc 2
 * lượt lưu liền nhau) chen giữa nhau thì lượt ghi sau GHI ĐÈ mảng mà lượt trước vừa thêm → mất bản
 * ghi. Nay đọc-sửa-ghi trong MỘT transaction: Firestore tự chạy lại `sua` với dữ liệu mới nhất nếu
 * có ai ghi chen vào. Cùng document, cùng định dạng — không đổi rules, không di trú.
 * `sua` trả null = không cần ghi. Trả về false nếu cloud lỗi (bản trên máy vẫn đã lưu).
 */
async function suaMangTrenCloud(uid: string, sua: (records: SavedTaxRecord[], exists: boolean) => SavedTaxRecord[] | null): Promise<boolean> {
    const docRef = doc(db, 'users', uid, 'setting', FIRESTORE_DOC_KEY);
    try {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(docRef);
            const current: SavedTaxRecord[] = snap.exists() ? snap.data()?.records || [] : [];
            const next = sua(current, snap.exists());
            if (next) tx.set(docRef, { records: next, updatedAt: serverTimestamp() }, { merge: true });
        });
        return true;
    } catch (err) {
        console.error('[TaxSync] Lỗi đồng bộ Firestore:', err);
        // Trước đây chỉ log — người dùng tưởng đã lên cloud. Nay báo rõ.
        toast.error('Đã lưu trên máy này nhưng CHƯA đồng bộ lên cloud (mất mạng?). Thiết bị khác sẽ chưa thấy thay đổi này.', { id: 'tax-cloud-sync', duration: 6000 });
        return false;
    }
}

/**
 * Đổi khoá (id cục bộ hoặc createdAt) sang createdAt — CHỈ createdAt mới so được với bản trên cloud
 * (id là khoá tự tăng riêng từng máy, audit D08).
 */
async function toCreatedAts(keys: (number | string)[]): Promise<Set<string>> {
    const out = new Set<string>(keys.filter((k): k is string => typeof k === 'string'));
    const numeric = keys.filter((k): k is number => typeof k === 'number');
    if (numeric.length > 0) {
        const local = await taxIndexedDbService.getAll();
        for (const r of local) if (numeric.includes(r.id as number)) out.add(r.createdAt);
    }
    return out;
}

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

                // Hợp nhất theo `createdAt` — danh tính DUY NHẤT xuyên thiết bị (audit D08). `id` là khoá
                // tự tăng của IndexedDB TỪNG MÁY: máy A và máy B đều có id 1 cho 2 bản ghi khác nhau. Trước
                // đây bản cloud giữ nguyên id của máy khác → danh sách có 2 dòng cùng id, chọn/xoá/sửa
                // tháng theo id chạm nhầm bản ghi. Nay bản chỉ có trên cloud được LƯU VÀO MÁY này (nhận id
                // cục bộ riêng) — vừa hết trùng id, vừa xem lại được khi mất mạng.
                const localByCreatedAt = new Map(localRecords.map(r => [r.createdAt, r]));
                const recordMap = new Map<string, SavedTaxRecord>();
                for (const r of localRecords) {
                    recordMap.set(r.createdAt, { ...r, syncedToCloud: false });
                }
                for (const cr of cloudRecords) {
                    const existing = localByCreatedAt.get(cr.createdAt);
                    if (existing) {
                        recordMap.set(cr.createdAt, { ...cr, id: existing.id, syncedToCloud: true });
                        continue;
                    }
                    const { id: _cloudId, ...rest } = cr;
                    try {
                        const localId = await taxIndexedDbService.save({ ...rest, syncedToCloud: true });
                        recordMap.set(cr.createdAt, { ...rest, id: localId, syncedToCloud: true });
                    } catch (saveErr) {
                        console.warn('[TaxSync] Không lưu được bản cloud vào máy, bỏ qua bản này:', saveErr);
                    }
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
            const newCloudRecord: SavedTaxRecord = { ...record, id: localId, syncedToCloud: true };
            await suaMangTrenCloud(user.uid, current => catTheoDungLuong([
                newCloudRecord,
                ...current.filter(r => r.createdAt !== record.createdAt),
            ]));
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
            await suaMangTrenCloud(user.uid, (current, exists) => exists ? current.filter(r => r.createdAt !== createdAt) : null);
        }
    },

    /**
     * Cập nhật kỳ lương (tháng/năm) cho một bản ghi tính thuế đã lưu
     */
    async updateRecordMonth(idOrCreatedAt: number | string, newMonthYear: string): Promise<void> {
        await taxIndexedDbService.updateMonth(idOrCreatedAt, newMonthYear);

        const user = auth.currentUser;
        if (user) {
            const createdAts = await toCreatedAts([idOrCreatedAt]);
            await suaMangTrenCloud(user.uid, (current, exists) => exists ? current.map(r =>
                createdAts.has(r.createdAt) ? { ...r, monthYear: newMonthYear } : r) : null);
        }
    },

    /**
     * Cập nhật kỳ lương (tháng/năm) cho nhiều bản ghi cùng lúc
     */
    async updateRecordsMonth(idOrCreatedAts: (number | string)[], newMonthYear: string): Promise<void> {
        await taxIndexedDbService.updateMonths(idOrCreatedAts, newMonthYear);

        const user = auth.currentUser;
        if (user) {
            const createdAts = await toCreatedAts(idOrCreatedAts);
            await suaMangTrenCloud(user.uid, (current, exists) => exists ? current.map(r =>
                createdAts.has(r.createdAt) ? { ...r, monthYear: newMonthYear } : r) : null);
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
