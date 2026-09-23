// Bản zone-local của services/dbService.ts (chỉ getDb/getSetting/saveSetting mà sticker-event cần).
// Dùng chung database với hệ thống chính để không mất dữ liệu IndexedDB đã lưu trước đó
// (layout, print settings, saved lists, print history). Xem RULES.md §2.0.
import {
    APP_STORE as SCOPED_APP_STORE,
    BI_HUB_DB_VERSION,
    SETTINGS_STORE as SCOPED_SETTINGS_STORE,
    biHubDbName,
    ensureBiHubDbReady,
} from '../../../utils/localDbScope';

// Tên database KHÔNG còn cố định: mỗi tài khoản một database riêng, xem utils/localDbScope.ts.
// Cả 4 khu vực bắt buộc phải lấy tên từ đúng một nguồn này, nếu không hai khu vực sẽ ghi vào hai
// database khác nhau và dữ liệu âm thầm tách đôi.
const DB_VERSION = BI_HUB_DB_VERSION;
const APP_STORE = SCOPED_APP_STORE;
const SETTINGS_STORE = SCOPED_SETTINGS_STORE;

let dbPromise: Promise<IDBDatabase> | null = null;
let openedDbName: string | null = null;

export function getDb(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
        return Promise.reject(new Error('IndexedDB is not supported/enabled in this environment.'));
    }

    const dbName = biHubDbName();
    if (dbPromise && openedDbName === dbName) return dbPromise;
    if (dbPromise) {
        // Đổi tài khoản giữa phiên: đóng kết nối của tài khoản trước.
        const stale = dbPromise;
        dbPromise = null;
        stale.then(db => { try { db.close(); } catch { /* đã đóng sẵn */ } }).catch(() => { /* mở hụt từ đầu */ });
    }
    openedDbName = dbName;

    dbPromise = ensureBiHubDbReady(dbName).then(() => openDatabase(dbName));
    return dbPromise;
}

function openDatabase(DB_NAME: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        let active = true;

        const timeoutId = setTimeout(() => {
            if (active) {
                active = false;
                console.warn('[IDB] Connection timeout. Falling back to memory storage.');
                dbPromise = null;
                reject(new Error('IndexedDB connection timeout'));
            }
        }, 10000);

        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                try {
                    const db = (event.target as IDBOpenDBRequest).result;
                    if (!db.objectStoreNames.contains(APP_STORE)) db.createObjectStore(APP_STORE);
                    if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
                } catch (e) {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        reject(e);
                    }
                }
            };
            request.onsuccess = () => {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    const db = request.result;
                    db.onclose = () => { dbPromise = null; };
                    resolve(db);
                } else {
                    // Nuốt lỗi CÓ CHỦ Ý: kết nối trễ đã bị bỏ, đóng lỗi cũng không ảnh hưởng gì.
                    try { request.result.close(); } catch { /* đã đóng sẵn — bỏ qua */ }
                }
            };
            request.onerror = () => {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    dbPromise = null;
                    reject(request.error || new Error('Failed to open database'));
                }
            };
            request.onblocked = () => {
                console.warn('[IDB] Database open blocked.');
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    dbPromise = null;
                    reject(new Error('IndexedDB blocked'));
                }
            };
        } catch (error) {
            if (active) {
                active = false;
                clearTimeout(timeoutId);
                dbPromise = null;
                reject(error);
            }
        }
    });
}

export async function saveSetting(key: string, value: unknown, source?: string): Promise<void> {
    const tryTransaction = async (db: IDBDatabase) => {
        return new Promise<void>((resolve, reject) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn(`[IDB] saveSetting timeout for key: ${key}`);
                    reject(new Error('Transaction timeout'));
                }
            }, 15000);

            try {
                const tx = db.transaction(SETTINGS_STORE, 'readwrite');
                const store = tx.objectStore(SETTINGS_STORE);
                store.put(value, key);
                if (key !== 'localSettingsLastModified' && !key.startsWith('lastModified_')) {
                    const now = Date.now();
                    store.put(now, 'localSettingsLastModified');
                    store.put(now, `lastModified_${key}`);
                }
                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key, source } }));
                            if (key.startsWith('bi_')) {
                                const originalKey = key.slice(3);
                                window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: originalKey, source } }));
                            }
                        }
                        resolve();
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        reject(tx.error || new Error('Transaction failed'));
                    }
                };
                tx.onabort = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        reject(new Error('Transaction aborted'));
                    }
                };
            } catch (error) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    reject(error);
                }
            }
        });
    };

    try {
        const db = await getDb();
        await tryTransaction(db);
    } catch (error) {
        console.warn(`[IDB] Retry save '${key}' after error:`, (error as Error)?.message);
        dbPromise = null;
        try {
            const db = await getDb();
            await tryTransaction(db);
        } catch (retryError) {
            console.error(`[IDB] Permanent failure saving key '${key}':`, retryError);
        }
    }
}

export async function getSetting<T>(key: string): Promise<T | null> {
    try {
        const db = await getDb();
        return new Promise((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn(`[IDB] getSetting timeout for key: ${key}`);
                    resolve(null);
                }
            }, 10000);

            try {
                const tx = db.transaction(SETTINGS_STORE, 'readonly');
                const store = tx.objectStore(SETTINGS_STORE);
                const request = store.get(key);
                request.onsuccess = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve(request.result === undefined ? null : request.result);
                    }
                };
                request.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        console.error(`[IDB] Error reading key "${key}":`, request.error);
                        resolve(null);
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        console.error(`[IDB] Transaction error reading key "${key}":`, tx.error);
                        resolve(null);
                    }
                };
            } catch (err) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    console.error(`[IDB] Synchronous error reading key "${key}":`, err);
                    resolve(null);
                }
            }
        });
    } catch (error) {
        console.error(`[IDB] Failed to get database for key "${key}":`, error);
        return null;
    }
}
