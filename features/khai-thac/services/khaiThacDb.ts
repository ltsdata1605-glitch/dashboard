import type { ReportDraft, SavedReport, Lead, CustomField } from '../types';
import { KHAI_THAC_LEGACY_DB_NAME, getActiveLocalUid, khaiThacDbName, khaiThacDbNameFor, mayInheritLegacyData } from '../../../utils/localDbScope';

/**
 * Lưu trữ cục bộ của "Báo cáo khai thác" — IndexedDB riêng của khu vực này, không đụng
 * IndexedDB của Phân Tích / Report BI. Giữ đúng mô hình app gốc: dữ liệu nằm trên máy đang dùng.
 * Muốn đồng bộ Firestore sau này thì thay đúng file này, các tab không biết gì về nơi lưu.
 */
/**
 * Tên database theo TÀI KHOẢN (2026-09-29, audit A01 — chủ dự án chốt "lưu cục bộ trên máy ở
 * IndexedDB, không cần cloud"): `YCX_KHAI_THAC_DB__<uid>`. Trước đây mọi tài khoản dùng chung
 * `YCX_KHAI_THAC_DB` và đăng xuất là bị xoá sạch — mà kho này KHÔNG có bản trên cloud, nên đăng
 * xuất = mất vĩnh viễn báo cáo + khách hàng. Nay đăng xuất/đổi tài khoản không đụng tới kho riêng
 * (services/localDataOwner.ts), người khác đăng nhập cùng máy mở kho khác nên không thấy dữ liệu.
 */
const DB_VERSION = 1;

const STORE_KV = 'kv';           // draft, custom_fields
const STORE_REPORTS = 'reports'; // keyPath id
const STORE_LEADS = 'leads';     // keyPath id
const ALL_STORES = [STORE_KV, STORE_REPORTS, STORE_LEADS];

const KV_DRAFT = 'draft';
const KV_CUSTOM_FIELDS = 'custom_fields';
/** Cờ trong kho riêng: đã xét việc chép dữ liệu từ kho dùng chung cũ (chỉ làm 1 lần). */
const KV_MIGRATED = '__ycx_scope_migrated_v1';

let dbPromise: Promise<IDBDatabase> | null = null;
let dbPromiseName: string | null = null;

function openNamed(name: string, version?: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = version ? indexedDB.open(name, version) : indexedDB.open(name);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV);
            if (!db.objectStoreNames.contains(STORE_REPORTS)) db.createObjectStore(STORE_REPORTS, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORE_LEADS)) db.createObjectStore(STORE_LEADS, { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('Không mở được IndexedDB'));
        req.onblocked = () => reject(new Error(`IndexedDB "${name}" đang bị tab khác giữ`));
    });
}

const txDone = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Lỗi IndexedDB'));
    tx.onabort = () => reject(tx.error ?? new Error('Giao dịch IndexedDB bị huỷ'));
});

const getAllFrom = (db: IDBDatabase, store: string) => new Promise<{ keys: IDBValidKey[]; values: unknown[] }>((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const os = tx.objectStore(store);
    const keysReq = os.getAllKeys();
    const valuesReq = os.getAll();
    tx.oncomplete = () => resolve({ keys: keysReq.result, values: valuesReq.result });
    tx.onerror = () => reject(tx.error ?? new Error('Lỗi IndexedDB'));
});

/** Kho dùng chung cũ có tồn tại (và có dữ liệu Khai thác) không — KHÔNG tạo kho rỗng khi dò. */
async function legacyExists(): Promise<boolean> {
    if (typeof indexedDB.databases !== 'function') return true; // trình duyệt cũ: cứ mở thử
    try {
        const list = await indexedDB.databases();
        return list.some(d => d.name === KHAI_THAC_LEGACY_DB_NAME);
    } catch {
        return true;
    }
}

/**
 * Lần đầu một tài khoản mở kho riêng: chép báo cáo/khách hàng/mục tuỳ chỉnh từ kho dùng chung cũ
 * sang — CHỈ khi kho cũ đúng là của tài khoản này (cùng quy tắc thừa kế với BI_HUB_DATABASE_V2,
 * utils/localDbScope.ts). Chép xong thì dọn kho cũ: nó không còn là nơi lưu của ai, để lại thì Chế
 * độ Dùng Thử trên cùng máy nhìn thấy SĐT khách của người này.
 */
async function migrateLegacyOnce(target: IDBDatabase, allowInherit: boolean): Promise<void> {
    const marker = await new Promise<unknown>((resolve, reject) => {
        const req = target.transaction(STORE_KV, 'readonly').objectStore(STORE_KV).get(KV_MIGRATED);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    if (marker) return;

    let copied = 0;
    if (allowInherit && await legacyExists()) {
        const legacy = await openNamed(KHAI_THAC_LEGACY_DB_NAME);
        try {
            const stores = ALL_STORES.filter(st => legacy.objectStoreNames.contains(st));
            for (const st of stores) {
                const { keys, values } = await getAllFrom(legacy, st);
                if (keys.length === 0) continue;
                const tx = target.transaction(st, 'readwrite');
                const os = tx.objectStore(st);
                keys.forEach((k, i) => {
                    if (st === STORE_KV) os.put(values[i], k);
                    else os.put(values[i]); // store có keyPath 'id'
                });
                await txDone(tx);
                copied += keys.length;
            }
            if (copied > 0 && stores.length > 0) {
                const clearTx = legacy.transaction(stores, 'readwrite');
                stores.forEach(st => clearTx.objectStore(st).clear());
                await txDone(clearTx);
            }
        } finally {
            legacy.close();
        }
    }
    const tx = target.transaction(STORE_KV, 'readwrite');
    tx.objectStore(STORE_KV).put({ at: Date.now(), copied }, KV_MIGRATED);
    await txDone(tx);
    if (copied > 0) console.info(`[KhaiThacDb] Đã chuyển ${copied} mục sang kho riêng của tài khoản.`);
}

function openDb(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Trình duyệt không hỗ trợ IndexedDB'));
    const name = khaiThacDbName();
    // Đổi tài khoản trong cùng phiên → tên kho đổi → đóng kết nối cũ, mở kho của tài khoản mới.
    if (dbPromise && dbPromiseName === name) return dbPromise;
    if (dbPromise) {
        const old = dbPromise;
        old.then(db => db.close()).catch(() => { /* kết nối cũ lỗi sẵn */ });
    }
    const uid = getActiveLocalUid();
    dbPromiseName = name;
    dbPromise = openNamed(name, DB_VERSION)
        .then(async db => {
            if (uid && name !== KHAI_THAC_LEGACY_DB_NAME) {
                try {
                    await migrateLegacyOnce(db, mayInheritLegacyData(uid));
                } catch (e) {
                    // Chép hụt không được chặn việc dùng kho riêng; lần mở sau (chưa có cờ) sẽ thử lại.
                    console.warn('[KhaiThacDb] Không chuyển được dữ liệu cũ sang kho riêng:', e);
                }
            }
            db.onversionchange = () => { db.close(); if (dbPromiseName === name) { dbPromise = null; dbPromiseName = null; } };
            return db;
        })
        .catch(err => {
            if (dbPromiseName === name) { dbPromise = null; dbPromiseName = null; }
            throw err;
        });
    return dbPromise;
}

/**
 * Cho services/localDataOwner.ts: chuyển kho dùng chung cũ vào kho riêng của `ownerUid` NGAY — gọi
 * TRƯỚC khi đăng xuất / đổi tài khoản dọn kho cũ, để dữ liệu của người chưa từng mở tab Báo cáo
 * kể từ bản cập nhật này không bị xoá mất. `ownerUid` là chủ đã biết của kho cũ (dấu chủ sở hữu).
 */
export async function migrateKhaiThacLegacyInto(ownerUid: string): Promise<void> {
    if (typeof indexedDB === 'undefined' || !(await legacyExists())) return;
    const name = khaiThacDbNameFor(ownerUid);
    // Kho riêng của tài khoản đang mở trong phiên → dùng chung kết nối đang có.
    const db = dbPromiseName === name && dbPromise ? await dbPromise : await openNamed(name, DB_VERSION);
    try {
        await migrateLegacyOnce(db, true);
    } finally {
        if (!(dbPromiseName === name && dbPromise)) db.close();
    }
}

function request<T>(build: (tx: IDBTransaction) => IDBRequest<T>, stores: string | string[], mode: IDBTransactionMode): Promise<T> {
    return openDb().then(db => new Promise<T>((resolve, reject) => {
        const tx = db.transaction(stores, mode);
        const req = build(tx);
        let result: T;
        req.onsuccess = () => { result = req.result; };
        req.onerror = () => reject(req.error ?? new Error('Lỗi IndexedDB'));
        // Audit A30 (2026-09-29): chỉ báo xong khi transaction đã COMMIT. Request thành công chưa có
        // nghĩa là đã lưu — transaction vẫn có thể bị huỷ sau đó (hết dung lượng, trình duyệt đóng
        // kết nối…) và UI sẽ báo "đã lưu" cho dữ liệu không hề nằm trên máy.
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(tx.error ?? req.error ?? new Error('Giao dịch IndexedDB bị huỷ — dữ liệu chưa được lưu'));
    }));
}

const kvGet = <T,>(key: string) => request<T | undefined>(tx => tx.objectStore(STORE_KV).get(key), STORE_KV, 'readonly');
const kvSet = (key: string, value: unknown) => request(tx => tx.objectStore(STORE_KV).put(value, key), STORE_KV, 'readwrite').then(() => undefined);

export function newId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const khaiThacDb = {
    // ── Bản nháp ──
    loadDraft: () => kvGet<ReportDraft>(KV_DRAFT).then(v => v ?? null),
    saveDraft: (draft: ReportDraft) => kvSet(KV_DRAFT, draft),

    // ── Mục tuỳ chỉnh ──
    loadCustomFields: () => kvGet<CustomField[]>(KV_CUSTOM_FIELDS).then(v => (Array.isArray(v) ? v : [])),
    saveCustomFields: (fields: CustomField[]) => kvSet(KV_CUSTOM_FIELDS, fields),

    // ── Lịch sử đơn hàng ──
    listReports: () => request<SavedReport[]>(tx => tx.objectStore(STORE_REPORTS).getAll(), STORE_REPORTS, 'readonly')
        .then(rows => (Array.isArray(rows) ? rows : [])),
    saveReport: (report: SavedReport) => request(tx => tx.objectStore(STORE_REPORTS).put(report), STORE_REPORTS, 'readwrite').then(() => undefined),
    deleteReport: (id: string) => request(tx => tx.objectStore(STORE_REPORTS).delete(id), STORE_REPORTS, 'readwrite').then(() => undefined),

    // ── Khách hàng ──
    listLeads: () => request<Lead[]>(tx => tx.objectStore(STORE_LEADS).getAll(), STORE_LEADS, 'readonly')
        .then(rows => (Array.isArray(rows) ? rows : [])),
    saveLead: (lead: Lead) => request(tx => tx.objectStore(STORE_LEADS).put(lead), STORE_LEADS, 'readwrite').then(() => undefined),
    deleteLead: (id: string) => request(tx => tx.objectStore(STORE_LEADS).delete(id), STORE_LEADS, 'readwrite').then(() => undefined),

    /** Xoá sạch mọi thứ (nút "Xoá toàn bộ dữ liệu" ở tab Nhật ký). */
    clearAll: () => openDb().then(db => new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_KV, STORE_REPORTS, STORE_LEADS], 'readwrite');
        tx.objectStore(STORE_KV).clear();
        tx.objectStore(STORE_REPORTS).clear();
        tx.objectStore(STORE_LEADS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Không xoá được dữ liệu'));
        tx.onabort = () => reject(tx.error ?? new Error('Không xoá được dữ liệu'));
    })),
};
