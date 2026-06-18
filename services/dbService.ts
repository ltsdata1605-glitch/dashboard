
import type {
    DataRow,
    StoredSalesData,
    UploadedFileRegistryItem,
    ProductConfig,
    ContestTableConfig,
    CustomContestTab,
    WarehouseColumnConfig,
    AnalysisRecord,
    Employee,
    HeadToHeadTableConfig,
    FilterState
} from '../types';
import { DepartmentMap } from './dataService';

const DB_NAME = 'BI_HUB_DATABASE_V2';
const DB_VERSION = 3;
const APP_STORE = 'appStorage';
const SETTINGS_STORE = 'settings';

export const DEDUPLICATION_SETTING_KEY = 'isDeduplicationEnabled';
export const SUMMARY_TABLE_CONFIG_KEY = 'summaryTableConfig';

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

export async function saveSetting(key: string, value: any, source?: string): Promise<void> {
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

export async function saveSettingFromCloud(key: string, value: any, updatedAt: number): Promise<void> {
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


export async function getAllSettings(): Promise<Record<string, any>> {
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
                        const settings: Record<string, any> = {};
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

export async function importAllSettings(settings: Record<string, any>): Promise<void> {
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

export async function mergeSettings(settings: Record<string, any>): Promise<void> {
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

// --- Sales Data ---
export async function saveSalesData(data: DataRow[], filename: string, fileLastModified?: number): Promise<void> {
    const stored: StoredSalesData = { data, filename, savedAt: new Date(), fileLastModified };
    const tryTransaction = async (db: IDBDatabase) => {
        return new Promise<void>((resolve, reject) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] saveSalesData timeout');
                    reject(new Error('Transaction timeout'));
                }
            }, 30000);

            try {
                const tx = db.transaction(APP_STORE, 'readwrite');
                const store = tx.objectStore(APP_STORE).put(stored, 'salesData');
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
                        reject(tx.error || new Error('Save sales data transaction failed'));
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
        console.warn('[IDB] Retry saveSalesData after error:', (error as Error)?.message);
        dbPromise = null;
        try {
            const db = await getDb();
            await tryTransaction(db);
        } catch (retryError) {
            console.error('[IDB] Permanent failure saving sales data:', retryError);
        }
    }
}

export async function getSalesData(): Promise<StoredSalesData | null> {
    try {
        const db = await getDb();
        return new Promise((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] getSalesData timeout');
                    resolve(null);
                }
            }, 30000);

            try {
                const tx = db.transaction(APP_STORE, 'readonly');
                const store = tx.objectStore(APP_STORE);
                const request = store.get('salesData');
                request.onsuccess = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve(request.result || null);
                    }
                };
                request.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        console.error('[IDB] getSalesData request error:', request.error);
                        resolve(null);
                    }
                };
                tx.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        console.error('[IDB] getSalesData transaction error:', tx.error);
                        resolve(null);
                    }
                };
            } catch (err) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    console.error('[IDB] getSalesData synchronous error:', err);
                    resolve(null);
                }
            }
        });
    } catch (error) {
        console.error('[IDB] getSalesData failed to get DB:', error);
        return null;
    }
}

export async function clearSalesData(): Promise<void> {
    try {
        const db = await getDb();
        return new Promise<void>((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] clearSalesData timeout');
                    resolve();
                }
            }, 15000);

            try {
                const tx = db.transaction(APP_STORE, 'readwrite');
                tx.objectStore(APP_STORE).delete('salesData');
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
                        resolve();
                    }
                };
            } catch (e) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve();
                }
            }
        });
    } catch (e) {
        console.error('[IDB] clearSalesData failed:', e);
    }
}

// --- Historical Multi-File Registry & Data management ---

export async function getSalesFilesRegistry(): Promise<UploadedFileRegistryItem[]> {
    const registry = await getSetting<UploadedFileRegistryItem[]>('salesFilesRegistry');
    return registry || [];
}

export async function saveSalesFilesRegistry(registry: UploadedFileRegistryItem[]): Promise<void> {
    await saveSetting('salesFilesRegistry', registry);
}

export async function saveSalesFileData(fileId: string, data: DataRow[]): Promise<void> {
    const tryTransaction = async (db: IDBDatabase) => {
        return new Promise<void>((resolve, reject) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn(`[IDB] saveSalesFileData timeout for ${fileId}`);
                    reject(new Error('Transaction timeout'));
                }
            }, 30000);

            try {
                const tx = db.transaction(APP_STORE, 'readwrite');
                tx.objectStore(APP_STORE).put(data, 'salesData_' + fileId);
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
                        reject(tx.error || new Error('Save file data transaction failed'));
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
        console.warn(`[IDB] Retry saveSalesFileData for ${fileId} after error:`, (error as Error)?.message);
        dbPromise = null;
        try {
            const db = await getDb();
            await tryTransaction(db);
        } catch (retryError) {
            console.error(`[IDB] Permanent failure saving sales file data for ${fileId}:`, retryError);
            throw retryError;
        }
    }
}

export async function getSalesFileData(fileId: string): Promise<DataRow[] | null> {
    try {
        const db = await getDb();
        return new Promise((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn(`[IDB] getSalesFileData timeout for ${fileId}`);
                    resolve(null);
                }
            }, 30000);

            try {
                const tx = db.transaction(APP_STORE, 'readonly');
                const request = tx.objectStore(APP_STORE).get('salesData_' + fileId);
                request.onsuccess = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve(request.result || null);
                    }
                };
                request.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        console.error(`[IDB] getSalesFileData error for ${fileId}:`, request.error);
                        resolve(null);
                    }
                };
            } catch (err) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve(null);
                }
            }
        });
    } catch (error) {
        console.error(`[IDB] getSalesFileData failed to get DB for ${fileId}:`, error);
        return null;
    }
}

export async function checkSalesFileDataExists(fileId: string): Promise<boolean> {
    try {
        const db = await getDb();
        return new Promise((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    resolve(false);
                }
            }, 5000);

            try {
                const tx = db.transaction(APP_STORE, 'readonly');
                const store = tx.objectStore(APP_STORE);
                const request = store.getKey('salesData_' + fileId);
                request.onsuccess = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve(request.result !== undefined);
                    }
                };
                request.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve(false);
                    }
                };
            } catch (err) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve(false);
                }
            }
        });
    } catch (error) {
        return false;
    }
}

export async function deleteSalesFileData(fileId: string): Promise<void> {
    try {
        const db = await getDb();
        return new Promise<void>((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    resolve();
                }
            }, 15000);

            try {
                const tx = db.transaction(APP_STORE, 'readwrite');
                tx.objectStore(APP_STORE).delete('salesData_' + fileId);
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
                        resolve();
                    }
                };
            } catch (e) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve();
                }
            }
        });
    } catch (e) {
        console.error(`[IDB] deleteSalesFileData failed for ${fileId}:`, e);
    }
}

export async function clearAllSalesFiles(): Promise<void> {
    try {
        const registry = await getSalesFilesRegistry();
        for (const file of registry) {
            await deleteSalesFileData(file.id);
        }
        await saveSalesFilesRegistry([]);
        await clearSalesData();
        await clearTempRealtimeData();
    } catch (e) {
        console.error('[IDB] clearAllSalesFiles failed:', e);
    }
}

// --- Temporary Realtime File Data ---

export async function saveTempRealtimeData(data: DataRow[], filename: string, fileLastModified?: number): Promise<void> {
    const stored: StoredSalesData = { data, filename, savedAt: new Date(), fileLastModified };
    const tryTransaction = async (db: IDBDatabase) => {
        return new Promise<void>((resolve, reject) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] saveTempRealtimeData timeout');
                    reject(new Error('Transaction timeout'));
                }
            }, 30000);

            try {
                const tx = db.transaction(APP_STORE, 'readwrite');
                tx.objectStore(APP_STORE).put(stored, 'tempRealtimeData');
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
                        reject(tx.error || new Error('Save temp realtime data transaction failed'));
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
        console.warn('[IDB] Retry saveTempRealtimeData after error:', (error as Error)?.message);
        dbPromise = null;
        try {
            const db = await getDb();
            await tryTransaction(db);
        } catch (retryError) {
            console.error('[IDB] Permanent failure saving temp realtime data:', retryError);
            throw retryError;
        }
    }
}

export async function getTempRealtimeData(): Promise<StoredSalesData | null> {
    try {
        const db = await getDb();
        return new Promise((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] getTempRealtimeData timeout');
                    resolve(null);
                }
            }, 30000);

            try {
                const tx = db.transaction(APP_STORE, 'readonly');
                const store = tx.objectStore(APP_STORE);
                const request = store.get('tempRealtimeData');
                request.onsuccess = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        resolve(request.result || null);
                    }
                };
                request.onerror = () => {
                    if (active) {
                        active = false;
                        clearTimeout(timeoutId);
                        console.error('[IDB] getTempRealtimeData request error:', request.error);
                        resolve(null);
                    }
                };
            } catch (err) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve(null);
                }
            }
        });
    } catch (error) {
        console.error('[IDB] getTempRealtimeData failed:', error);
        return null;
    }
}

export async function clearTempRealtimeData(): Promise<void> {
    try {
        const db = await getDb();
        return new Promise<void>((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    console.warn('[IDB] clearTempRealtimeData timeout');
                    resolve();
                }
            }, 15000);

            try {
                const tx = db.transaction(APP_STORE, 'readwrite');
                tx.objectStore(APP_STORE).delete('tempRealtimeData');
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
                        resolve();
                    }
                };
            } catch (e) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve();
                }
            }
        });
    } catch (e) {
        console.error('[IDB] clearTempRealtimeData failed:', e);
    }
}

export async function getMergedSalesData(): Promise<{ data: DataRow[]; filename: string; savedAt: Date; fileLastModified?: number } | null> {
    try {
        const registry = await getSalesFilesRegistry();
        let activeFiles = registry.filter(f => f.isActive);
        
        // MIGRATION: Nếu registry trống, kiểm tra xem có dữ liệu đơn lẻ 'salesData' cũ không
        if (registry.length === 0) {
            const legacySales = await getSalesData();
            if (legacySales && legacySales.data.length > 0) {
                console.log('[IDB Migration] Chuyển đổi dữ liệu cũ sang cấu trúc đa tệp lịch sử...');
                const legacyId = 'legacy_file_' + Date.now();
                const legacyItem: UploadedFileRegistryItem = {
                    id: legacyId,
                    filename: legacySales.filename || 'Dữ liệu lịch sử cũ',
                    rowCount: legacySales.data.length,
                    savedAt: legacySales.savedAt ? new Date(legacySales.savedAt).getTime() : Date.now(),
                    fileLastModified: legacySales.fileLastModified || Date.now(),
                    isActive: true
                };
                
                await saveSalesFilesRegistry([legacyItem]);
                await saveSalesFileData(legacyId, legacySales.data);
                await clearSalesData(); // Xóa khóa cũ để tránh nhập nhằng
                activeFiles = [legacyItem];
            }
        }
        
        // Load active historical files data
        const historicalData: DataRow[] = [];
        let latestHistSavedAt = 0;
        let maxHistFileLastModified = 0;
        
        const fileDataArray = await Promise.all(activeFiles.map(file => getSalesFileData(file.id)));
        for (let i = 0; i < activeFiles.length; i++) {
            const file = activeFiles[i];
            const fileData = fileDataArray[i];
            if (fileData && fileData.length > 0) {
                for (let j = 0; j < fileData.length; j++) {
                    historicalData.push(fileData[j]);
                }
            }
            if (file.savedAt > latestHistSavedAt) {
                latestHistSavedAt = file.savedAt;
            }
            if (file.fileLastModified && file.fileLastModified > maxHistFileLastModified) {
                maxHistFileLastModified = file.fileLastModified;
            }
        }

        // If there are active historical files but no local file data (e.g. new browser sync),
        // fallback to legacy salesData store which holds the cloud sync data.
        if (activeFiles.length > 0 && historicalData.length === 0) {
            const legacySales = await getSalesData();
            if (legacySales && legacySales.data.length > 0) {
                for (let j = 0; j < legacySales.data.length; j++) {
                    historicalData.push(legacySales.data[j]);
                }
                latestHistSavedAt = legacySales.savedAt ? new Date(legacySales.savedAt).getTime() : latestHistSavedAt;
                maxHistFileLastModified = legacySales.fileLastModified || maxHistFileLastModified;
            }
        }
        
        // Load temporary realtime data
        const tempRealtime = await getTempRealtimeData();
        
        // Merge datasets
        const combinedData: DataRow[] = [];
        let finalFilename = '';
        let finalSavedAt = new Date();
        let finalFileLastModified = 0;
        
        if (tempRealtime && tempRealtime.data.length > 0) {
            for (let j = 0; j < tempRealtime.data.length; j++) {
                combinedData.push(tempRealtime.data[j]);
            }
            if (historicalData.length > 0) {
                for (let j = 0; j < historicalData.length; j++) {
                    combinedData.push(historicalData[j]);
                }
                
                // Filename gộp
                const baseRealtimeName = tempRealtime.filename.replace(/\.[^/.]+$/, '');
                finalFilename = `${baseRealtimeName} + Gộp ${activeFiles.length} tệp lịch sử`;
                if (finalFilename.length > 85) {
                    finalFilename = `${baseRealtimeName} + Gộp ${activeFiles.length} tệp...`;
                }
                
                // Timestamps
                const realtimeSavedAt = tempRealtime.savedAt ? new Date(tempRealtime.savedAt).getTime() : Date.now();
                finalSavedAt = new Date(Math.max(realtimeSavedAt, latestHistSavedAt));
                finalFileLastModified = Math.max(tempRealtime.fileLastModified || realtimeSavedAt, maxHistFileLastModified);
            } else {
                finalFilename = tempRealtime.filename;
                finalSavedAt = tempRealtime.savedAt ? new Date(tempRealtime.savedAt) : new Date();
                finalFileLastModified = tempRealtime.fileLastModified || finalSavedAt.getTime();
            }
        } else if (historicalData.length > 0) {
            for (let j = 0; j < historicalData.length; j++) {
                combinedData.push(historicalData[j]);
            }
            
            if (activeFiles.length === 1) {
                finalFilename = activeFiles[0].filename;
            } else {
                const fileNames = activeFiles.map(f => f.filename.replace(/\.[^/.]+$/, ''));
                finalFilename = `Gộp ${activeFiles.length} Báo cáo (${fileNames.join(', ')})`;
                if (finalFilename.length > 85) {
                    finalFilename = `Gộp ${activeFiles.length} Báo cáo (${fileNames.slice(0, 2).join(', ')}...)`;
                }
            }
            finalSavedAt = new Date(latestHistSavedAt);
            finalFileLastModified = maxHistFileLastModified || latestHistSavedAt;
        } else {
            return null; // Không có tệp nào hoạt động
        }
        
        return {
            data: combinedData,
            filename: finalFilename,
            savedAt: finalSavedAt,
            fileLastModified: finalFileLastModified
        };
    } catch (error) {
        console.error('[IDB] getMergedSalesData failed:', error);
        return null;
    }
}


// --- Department Map ---
export async function saveDepartmentMap(map: DepartmentMap): Promise<void> {
    return saveSetting('departmentMap', map);
}

export async function getDepartmentMap(): Promise<DepartmentMap | null> {
    return getSetting<DepartmentMap>('departmentMap');
}

export async function clearDepartmentMap(): Promise<void> {
    try {
        const db = await getDb();
        return new Promise<void>((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    resolve();
                }
            }, 1000);

            try {
                const tx = db.transaction(SETTINGS_STORE, 'readwrite');
                tx.objectStore(SETTINGS_STORE).delete('departmentMap');
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
                        resolve();
                    }
                };
            } catch (e) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve();
                }
            }
        });
    } catch (e) {
        console.error('[IDB] clearDepartmentMap failed:', e);
    }
}

// --- Product Config ---
export async function saveProductConfig(config: ProductConfig, url: string): Promise<void> {
    // Safari/WebKit embedded webviews (like Zalo/FB) might throw DataCloneError for Sets.
    const safeConfig = { ...config, groups: {} as any };
    if (config.groups) {
        for (const [key, value] of Object.entries(config.groups)) {
            safeConfig.groups[key] = value instanceof Set ? Array.from(value) : value;
        }
    }
    await saveSetting('productConfig', { config: safeConfig, url, fetchedAt: new Date() });
}

export async function getProductConfig(): Promise<{ config: ProductConfig, url: string, fetchedAt: Date } | null> {
    const data = await getSetting<{ config: ProductConfig, url: string, fetchedAt: Date }>('productConfig');
    if (data && data.config) {
        if (data.config.groups) {
            const restoredGroups: { [key: string]: Set<string> } = {};
            for (const [key, value] of Object.entries(data.config.groups)) {
                restoredGroups[key] = new Set(value as any);
            }
            data.config.groups = restoredGroups;
        }
        // Backward compatibility: ensure quantityMultiplierMap exists
        if (!data.config.quantityMultiplierMap) {
            data.config.quantityMultiplierMap = {};
        }
    }
    return data;
}

export async function clearProductConfig(): Promise<void> {
    try {
        const db = await getDb();
        return new Promise<void>((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    resolve();
                }
            }, 1000);

            try {
                const tx = db.transaction(SETTINGS_STORE, 'readwrite');
                tx.objectStore(SETTINGS_STORE).delete('productConfig');
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
                        resolve();
                    }
                };
            } catch (e) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve();
                }
            }
        });
    } catch (e) {
        console.error('[IDB] clearProductConfig failed:', e);
    }
}

// --- KPI Targets ---
export async function saveKpiTargets(targets: { hieuQua: number, traGop: number, doanhThu?: number, gtdh?: number, doanhThuThuc?: number }): Promise<void> {
    return saveSetting('kpiTargets', targets);
}

export async function getKpiTargets(): Promise<{ hieuQua: number, traGop: number, doanhThu?: number, gtdh?: number, doanhThuThuc?: number } | null> {
    return getSetting('kpiTargets');
}

// --- KPI Cards Config ---
export async function saveKpiCardConfig(config: import('../types').KpiCardConfig[]): Promise<void> {
    return saveSetting('kpiCardConfig', config);
}

export async function getKpiCardConfig(): Promise<import('../types').KpiCardConfig[] | null> {
    return getSetting('kpiCardConfig');
}

// --- Warehouse Targets ---
export async function saveWarehouseTargets(targets: Record<string, number>): Promise<void> {
    return saveSetting('warehouseTargets', targets);
}

export async function getWarehouseTargets(): Promise<Record<string, number> | null> {
    return getSetting('warehouseTargets');
}

// --- Top Seller Analysis ---
export async function saveTopSellerAnalysis(analysis: string, dataUsed: Employee[]): Promise<void> {
    const record: AnalysisRecord = { timestamp: Date.now(), type: 'topSeller', analysis, dataUsed };
    const history = (await getSetting<AnalysisRecord[]>('topSellerAnalysisHistory')) || [];
    history.unshift(record);
    if (history.length > 20) history.pop();
    await saveSetting('topSellerAnalysisHistory', history);
}

export async function getTopSellerAnalysisHistory(): Promise<AnalysisRecord[]> {
    return (await getSetting<AnalysisRecord[]>('topSellerAnalysisHistory')) || [];
}

// --- Theme Map ---
export async function saveThemeMap(type: string, map: Record<string, number>): Promise<void> {
    return saveSetting(`themeMap_${type}`, map);
}

export async function getThemeMap(type: string): Promise<Record<string, number> | null> {
    return getSetting(`themeMap_${type}`);
}

// --- Daily Target ---
export async function saveDailyTarget(target: number): Promise<void> {
    return saveSetting('dailyTarget', target);
}

export async function getDailyTarget(): Promise<number | null> {
    return getSetting('dailyTarget');
}

// --- GTĐH Targets ---
export async function saveGtdhTargets(targets: Record<string, number>): Promise<void> {
    return saveSetting('gtdhTargets', targets);
}

export async function getGtdhTargets(): Promise<Record<string, number> | null> {
    return getSetting('gtdhTargets');
}

// --- Cross Selling Table Config ---
export async function saveCrossSellingConfig(config: any): Promise<void> {
    return saveSetting('crossSellingConfig', config);
}

export async function getCrossSellingConfig(): Promise<any | null> {
    return getSetting('crossSellingConfig');
}

// --- Industry Visible Groups ---
export async function saveIndustryVisibleGroups(groups: string[]): Promise<void> {
    return saveSetting('industryVisibleGroups', groups);
}

export async function getIndustryVisibleGroups(): Promise<string[] | null> {
    return getSetting('industryVisibleGroups');
}

// --- Head to Head Custom Tables ---
export async function saveHeadToHeadCustomTables(tables: HeadToHeadTableConfig[]): Promise<void> {
    return saveSetting('headToHeadTables', tables);
}

export async function getHeadToHeadCustomTables(): Promise<HeadToHeadTableConfig[] | null> {
    return getSetting('headToHeadTables');
}

// --- Warehouse Config ---
export async function saveWarehouseColumnConfig(config: WarehouseColumnConfig[]): Promise<void> {
    return saveSetting('warehouseColumnConfig', config);
}

export async function getWarehouseColumnConfig(): Promise<WarehouseColumnConfig[] | null> {
    return getSetting('warehouseColumnConfig');
}

// --- Employee Analysis Custom Columns ---
export async function saveEmployeeColumnConfig(config: WarehouseColumnConfig[]): Promise<void> {
    return saveSetting('employeeColumnConfig', config);
}

export async function getEmployeeColumnConfig(): Promise<WarehouseColumnConfig[] | null> {
    return getSetting('employeeColumnConfig');
}

// --- Summary Table Config ---
export async function saveSummaryTableConfig(config: FilterState['summaryTable']): Promise<void> {
    return saveSetting(SUMMARY_TABLE_CONFIG_KEY, config);
}

export async function getSummaryTableConfig(): Promise<FilterState['summaryTable'] | null> {
    return getSetting(SUMMARY_TABLE_CONFIG_KEY);
}

// --- Custom Tabs ---
export async function saveCustomTabs(tabs: CustomContestTab[], source?: string): Promise<void> {
    return saveSetting('customTabs', tabs, source);
}

export async function getCustomTabs(): Promise<CustomContestTab[] | null> {
    return getSetting('customTabs');
}

export async function clearCustomTabs(): Promise<void> {
    try {
        const db = await getDb();
        return new Promise<void>((resolve) => {
            let active = true;
            const timeoutId = setTimeout(() => {
                if (active) {
                    active = false;
                    resolve();
                }
            }, 10000);

            try {
                const tx = db.transaction(SETTINGS_STORE, 'readwrite');
                tx.objectStore(SETTINGS_STORE).delete('customTabs');
                tx.objectStore(SETTINGS_STORE).delete('industryAnalysisCustomTabs');
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
                        resolve();
                    }
                };
            } catch (e) {
                if (active) {
                    active = false;
                    clearTimeout(timeoutId);
                    resolve();
                }
            }
        });
    } catch (e) {
        console.error('[IDB] clearCustomTabs failed:', e);
    }
}

// --- Industry Analysis Custom Tabs ---
export async function saveIndustryAnalysisCustomTabs(tabs: CustomContestTab[], source?: string): Promise<void> {
    return saveSetting('industryAnalysisCustomTabs', tabs, source);
}

export async function getIndustryAnalysisCustomTabs(): Promise<CustomContestTab[] | null> {
    return getSetting('industryAnalysisCustomTabs');
}

// --- Industry Grid Filters ---
export async function saveIndustryGridFilters(filters: FilterState['industryGrid']): Promise<void> {
    return saveSetting('industryGridFilters', filters);
}

export async function getIndustryGridFilters(): Promise<FilterState['industryGrid'] | null> {
    return getSetting('industryGridFilters');
}

// --- Employee Analysis Filters ---
export async function saveEmployeeAnalysisFilters(filters: { warehouses: string[], departments: string[] }): Promise<void> {
    return saveSetting('employeeAnalysisFilters', filters);
}

export async function getEmployeeAnalysisFilters(): Promise<{ warehouses: string[], departments: string[] } | null> {
    return getSetting('employeeAnalysisFilters');
}

// --- Deduplication Setting ---
export async function getDeduplicationSetting(): Promise<boolean> {
    const value = await getSetting<boolean>(DEDUPLICATION_SETTING_KEY);
    return value !== null ? value : false;
}

export async function saveDeduplicationSetting(enabled: boolean): Promise<void> {
    return saveSetting(DEDUPLICATION_SETTING_KEY, enabled);
}

// --- Custom Calendars ---
export async function saveCustomCalendars(calendars: any[]): Promise<void> {
    return saveSetting('customCalendars', calendars);
}

export async function getCustomCalendars(): Promise<any[] | null> {
    return getSetting('customCalendars');
}

// --- Global Font ---
export async function saveGlobalFont(font: string): Promise<void> {
    return saveSetting('globalFont', font);
}

export async function getGlobalFont(): Promise<string | null> {
    return getSetting('globalFont');
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
                    console.log(`[IDB Cleanup] Cleaned up ${count} recursive lastModified garbage keys.`);
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

