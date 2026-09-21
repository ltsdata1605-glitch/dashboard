import type { ReportDraft, SavedReport, Lead, CustomField } from '../types';

/**
 * Lưu trữ cục bộ của "Báo cáo khai thác" — IndexedDB riêng của khu vực này, không đụng
 * IndexedDB của Phân Tích / Report BI. Giữ đúng mô hình app gốc: dữ liệu nằm trên máy đang dùng.
 * Muốn đồng bộ Firestore sau này thì thay đúng file này, các tab không biết gì về nơi lưu.
 */
const DB_NAME = 'YCX_KHAI_THAC_DB';
const DB_VERSION = 1;

const STORE_KV = 'kv';           // draft, custom_fields
const STORE_REPORTS = 'reports'; // keyPath id
const STORE_LEADS = 'leads';     // keyPath id

const KV_DRAFT = 'draft';
const KV_CUSTOM_FIELDS = 'custom_fields';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('Trình duyệt không hỗ trợ IndexedDB'));
            return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV);
            if (!db.objectStoreNames.contains(STORE_REPORTS)) db.createObjectStore(STORE_REPORTS, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORE_LEADS)) db.createObjectStore(STORE_LEADS, { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
            dbPromise = null;
            reject(req.error ?? new Error('Không mở được IndexedDB'));
        };
    });
    return dbPromise;
}

function request<T>(build: (tx: IDBTransaction) => IDBRequest<T>, stores: string | string[], mode: IDBTransactionMode): Promise<T> {
    return openDb().then(db => new Promise<T>((resolve, reject) => {
        const tx = db.transaction(stores, mode);
        const req = build(tx);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('Lỗi IndexedDB'));
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
    })),
};
