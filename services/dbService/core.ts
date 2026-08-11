const DB_NAME = 'BI_HUB_DATABASE_V2';
const DB_VERSION = 3;
export const APP_STORE = 'appStorage';
const SETTINGS_STORE = 'settings';

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDb(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
        return Promise.reject(new Error('IndexedDB is not supported/enabled in this environment.'));
    }
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        let active = true;

        // Failsafe timeout: if IndexedDB open takes > 10 seconds, reject it to let app fallback
        const timeoutId = setTimeout(() => {
            if (active) {
                active = false;
                console.warn('[IDB] Connection timeout. Falling back to memory storage.');
                dbPromise = null; // Allow retrying later
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
                    // Timeout already triggered, close this late connection
                    try { request.result.close(); } catch (e) {}
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
    return dbPromise;
}

// Lõi dùng chung cho saveSetting/saveSettingOrThrow — chỉ khác nhau ở hành vi khi retry lần 2
// VẪN thất bại: saveSetting() (mặc định, ~80 call site khắp app) nuốt lỗi (chỉ console.error) để
// không làm crash các luồng không kiểm tra promise — giữ nguyên hành vi cũ, KHÔNG đổi cho toàn bộ
// app (đổi contract của hàm dùng chung ~80 nơi là việc rủi ro cao, riêng biệt, ngoài phạm vi rà
// soát Check Thưởng). saveSettingOrThrow() ném lại lỗi để CALLER cụ thể (hiện tại chỉ
// CheckThuongView.tsx ghi checkthuong_data) tự quyết định báo cho người dùng biết việc lưu thất
// bại thay vì im lặng mất đồng bộ — xem implementation_plan.md.
async function saveSettingInternal(key: string, value: unknown, source: string | undefined, throwOnFailure: boolean): Promise<void> {
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
            if (throwOnFailure) throw retryError;
        }
    }
}

export async function saveSetting(key: string, value: unknown, source?: string): Promise<void> {
    return saveSettingInternal(key, value, source, false);
}

/** Như saveSetting(), nhưng ném lại lỗi nếu retry lần 2 vẫn thất bại — dùng khi caller cần biết
 * việc lưu KHÔNG thành công để báo cho người dùng (thay vì mặc định nuốt lỗi của saveSetting()). */
export async function saveSettingOrThrow(key: string, value: unknown, source?: string): Promise<void> {
    return saveSettingInternal(key, value, source, true);
}

export async function saveSettingFromCloud(key: string, value: unknown, updatedAt: number): Promise<void> {
    const tryTransaction = async (db: IDBDatabase) => {
        return new Promise<void>((resolve, reject) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn(`[IDB] saveSettingFromCloud timeout for key: ${key}`);
                    reject(new Error('Transaction timeout'));
                }
            }, 15000);

            try {
                const tx = db.transaction(SETTINGS_STORE, 'readwrite');
                const store = tx.objectStore(SETTINGS_STORE);
                store.put(value, key);
                store.put(updatedAt, 'localSettingsLastModified');
                if (!key.startsWith('lastModified_')) {
                    store.put(updatedAt, `lastModified_${key}`);
                }

                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        if (typeof window !== 'undefined') {
                            if (key.startsWith('bi_')) {
                                const originalKey = key.slice(3);
                                window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: originalKey, source: 'cloud-sync' } }));
                            } else {
                                window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key, source: 'cloud-sync' } }));
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
        console.warn(`[IDB] Retry saveSettingFromCloud '${key}' after error:`, (error as Error)?.message);
        dbPromise = null;
        try {
            const db = await getDb();
            await tryTransaction(db);
        } catch (retryError) {
            console.error(`[IDB] Permanent failure saveSettingFromCloud key '${key}':`, retryError);
        }
    }
}


export async function getAllSettings(): Promise<Record<string, unknown>> {
    try {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] getAllSettings timeout');
                    resolve({});
                }
            }, 10000);

            try {
                const tx = db.transaction(SETTINGS_STORE, 'readonly');
                const store = tx.objectStore(SETTINGS_STORE);
                const request = store.getAll();
                const keysRequest = store.getAllKeys();

                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        const keys = keysRequest.result;
                        const values = request.result;
                        const settings: Record<string, unknown> = {};
                        for (let i = 0; i < keys.length; i++) {
                            settings[keys[i] as string] = values[i];
                        }
                        resolve(settings);
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        reject(tx.error || new Error('Read transaction failed'));
                    }
                };
            } catch (err) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    reject(err);
                }
            }
        });
    } catch (e) {
        console.error('[IDB] getAllSettings failed:', e);
        return {};
    }
}

export async function clearAllSettings(): Promise<void> {
    try {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] clearAllSettings timeout');
                    resolve();
                }
            }, 10000);

            try {
                const tx = db.transaction(SETTINGS_STORE, 'readwrite');
                const store = tx.objectStore(SETTINGS_STORE);
                store.clear();
                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve();
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        reject(tx.error || new Error('Clear transaction failed'));
                    }
                };
            } catch (err) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    reject(err);
                }
            }
        });
    } catch (e) {
        console.error('[IDB] clearAllSettings failed:', e);
    }
}

export async function importAllSettings(settings: Record<string, unknown>): Promise<void> {
    try {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] importAllSettings timeout');
                    resolve();
                }
            }, 15000);

            try {
                const tx = db.transaction(SETTINGS_STORE, 'readwrite');
                const store = tx.objectStore(SETTINGS_STORE);
                store.clear();
                for (const [key, value] of Object.entries(settings)) {
                    store.put(value, key);
                }
                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        if (typeof window !== 'undefined') {
                            for (const key of Object.keys(settings)) {
                                window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key } }));
                                if (key.startsWith('bi_')) {
                                    const originalKey = key.slice(3);
                                    window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: originalKey } }));
                                }
                            }
                        }
                        resolve();
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        reject(tx.error || new Error('Import transaction failed'));
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
    } catch (e) {
        console.error('[IDB] importAllSettings failed:', e);
    }
}

export async function mergeSettings(settings: Record<string, unknown>): Promise<void> {
    try {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] mergeSettings timeout');
                    resolve();
                }
            }, 15000);

            try {
                const tx = db.transaction(SETTINGS_STORE, 'readwrite');
                const store = tx.objectStore(SETTINGS_STORE);
                for (const [key, value] of Object.entries(settings)) {
                    store.put(value, key);
                }
                tx.oncomplete = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        if (typeof window !== 'undefined') {
                            for (const key of Object.keys(settings)) {
                                window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key } }));
                                if (key.startsWith('bi_')) {
                                    const originalKey = key.slice(3);
                                    window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: originalKey } }));
                                }
                            }
                        }
                        resolve();
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        reject(tx.error || new Error('Merge transaction failed'));
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
    } catch (e) {
        console.error('[IDB] mergeSettings failed:', e);
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

// Alias for compatibility
export const getValue = getSetting;
export const setValue = saveSetting;

// Buộc getDb() mở lại kết nối mới ở lần gọi tiếp theo — dùng khi retry sau lỗi transaction.
export function resetDbConnection(): void {
    dbPromise = null;
}

export async function cleanupGarbageKeys(): Promise<void> {
    try {
        const db = await getDb();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(SETTINGS_STORE, 'readwrite');
            const store = tx.objectStore(SETTINGS_STORE);
            const request = store.openCursor();
            let count = 0;
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    const key = String(cursor.key);
                    if (key.startsWith('lastModified_lastModified_') || (key.match(/lastModified_/g) || []).length > 1) {
                        store.delete(key);
                        count++;
                    }
                    cursor.continue();
                }
            };
            tx.oncomplete = () => {
                if (count > 0) {
                    console.warn(`[IDB Cleanup] Cleaned up ${count} recursive lastModified garbage keys.`);
                }
                resolve();
            };
            tx.onerror = () => {
                reject(tx.error || new Error('Cleanup transaction failed'));
            };
        });
    } catch (e) {
        console.error('[IDB Cleanup] Failed to run garbage cleanup:', e);
    }
}
