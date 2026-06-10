
// Script di chuyển dữ liệu từ ClusterDataDB (cũ) sang BI_HUB_DATABASE_V2 (mới)
// Chạy một lần tự động khi khởi động app. Sau khi migrate xong, ghi cờ để không chạy lại.

const OLD_DB_NAME = 'ClusterDataDB';
const OLD_STORE_NAME = 'FormDataStore';

const NEW_DB_NAME = 'BI_HUB_DATABASE_V2';
const NEW_STORE_NAME = 'settings';
const NEW_DB_VERSION = 3;
const BI_PREFIX = 'bi_';
const MIGRATION_FLAG_KEY = 'bi_migration_completed_v1';

export async function migrateClusterDataToMain(): Promise<void> {
    // 1. Kiểm tra đã migrate chưa
    try {
        const newDb = await openDb(NEW_DB_NAME, NEW_DB_VERSION);
        const checkTx = newDb.transaction([NEW_STORE_NAME], 'readonly');
        const checkStore = checkTx.objectStore(NEW_STORE_NAME);
        const flagReq = checkStore.get(MIGRATION_FLAG_KEY);

        const alreadyDone = await new Promise<boolean>((resolve) => {
            flagReq.onsuccess = () => resolve(!!flagReq.result);
            flagReq.onerror = () => resolve(false);
        });

        if (alreadyDone) {
            console.log('[BI Migration] Đã migrate trước đó, bỏ qua.');
            newDb.close();
            return;
        }
        newDb.close();
    } catch (e) {
        console.warn('[BI Migration] Không thể kiểm tra cờ migration, tiếp tục migrate...', e);
    }

    // 2. Đọc toàn bộ dữ liệu từ ClusterDataDB
    let oldData: { key: string; value: any }[] = [];
    try {
        const oldDb = await openDb(OLD_DB_NAME, 1, (db) => {
            if (!db.objectStoreNames.contains(OLD_STORE_NAME)) {
                db.createObjectStore(OLD_STORE_NAME, { keyPath: 'key' });
            }
        });

        if (!oldDb.objectStoreNames.contains(OLD_STORE_NAME)) {
            console.log('[BI Migration] Database cũ không có store, bỏ qua.');
            oldDb.close();
            return;
        }

        const readTx = oldDb.transaction([OLD_STORE_NAME], 'readonly');
        const readStore = readTx.objectStore(OLD_STORE_NAME);
        const readReq = readStore.getAll();

        oldData = await new Promise((resolve, reject) => {
            readReq.onsuccess = () => resolve(readReq.result || []);
            readReq.onerror = () => reject(readReq.error);
        });

        oldDb.close();
    } catch (e) {
        console.log('[BI Migration] Database cũ không tồn tại hoặc rỗng, bỏ qua.', e);
        // Vẫn đánh cờ để không thử lại
        await setMigrationFlag();
        return;
    }

    if (oldData.length === 0) {
        console.log('[BI Migration] Không có dữ liệu cũ để migrate.');
        await setMigrationFlag();
        return;
    }

    // 3. Ghi vào BI_HUB_DATABASE_V2 với prefix bi_
    try {
        const newDb = await openDb(NEW_DB_NAME, NEW_DB_VERSION);
        
        // Đọc toàn bộ keys hiện tại của store mới để lọc tránh trùng lặp
        const readTx = newDb.transaction([NEW_STORE_NAME], 'readonly');
        const readStore = readTx.objectStore(NEW_STORE_NAME);
        const keysReq = readStore.getAllKeys();
        
        const existingKeys = await new Promise<Set<string>>((resolve) => {
            keysReq.onsuccess = () => resolve(new Set(keysReq.result.map(String)));
            keysReq.onerror = () => resolve(new Set());
        });

        const writesToMake: { key: string; value: any }[] = [];
        for (const item of oldData) {
            const originalKey = item.key;
            const prefixedKey = `${BI_PREFIX}${originalKey}`;
            
            if (!existingKeys.has(prefixedKey)) {
                writesToMake.push({ key: prefixedKey, value: item.value });
            }
        }

        if (writesToMake.length > 0) {
            const writeTx = newDb.transaction([NEW_STORE_NAME], 'readwrite');
            const writeStore = writeTx.objectStore(NEW_STORE_NAME);

            for (const write of writesToMake) {
                writeStore.put(write.value, write.key);
            }

            // Đánh cờ hoàn tất
            writeStore.put(true, MIGRATION_FLAG_KEY);
            writeStore.put(Date.now(), 'localSettingsLastModified');

            await new Promise<void>((resolve, reject) => {
                writeTx.oncomplete = () => resolve();
                writeTx.onerror = () => reject(writeTx.error);
            });

            console.log(`[BI Migration] ✅ Đã migrate thành công ${writesToMake.length}/${oldData.length} mục từ ClusterDataDB sang BI_HUB_DATABASE_V2.`);
            
            // Thông báo cho Cloud Sync biết có dữ liệu mới cần push
            window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key: 'bi_migration_complete' } }));
        } else {
            console.log('[BI Migration] Tất cả dữ liệu cũ đã được migrate trước đó.');
            await setMigrationFlag();
        }

        newDb.close();
    } catch (e) {
        console.error('[BI Migration] ❌ Lỗi khi ghi vào database mới:', e);
    }
}

async function setMigrationFlag(): Promise<void> {
    try {
        const db = await openDb(NEW_DB_NAME, NEW_DB_VERSION);
        const tx = db.transaction([NEW_STORE_NAME], 'readwrite');
        tx.objectStore(NEW_STORE_NAME).put(true, MIGRATION_FLAG_KEY);
        await new Promise<void>((resolve) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
        db.close();
    } catch (e) {
        // Không quan trọng
    }
}

function openDb(name: string, version: number, onUpgrade?: (db: IDBDatabase) => void): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, version);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (onUpgrade) {
                onUpgrade(db);
            } else {
                // Tạo stores cần thiết cho BI_HUB_DATABASE_V2
                if (!db.objectStoreNames.contains('appStorage')) db.createObjectStore('appStorage');
                if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function migrateOldAvatars(): Promise<void> {
    try {
        const db = await openDb(NEW_DB_NAME, NEW_DB_VERSION);
        
        // 1. Đọc tất cả key và value trong settings store ở một read transaction duy nhất
        const readTx = db.transaction([NEW_STORE_NAME], 'readonly');
        const store = readTx.objectStore(NEW_STORE_NAME);
        const keysReq = store.getAllKeys();
        const valuesReq = store.getAll();
        
        const [keys, values] = await Promise.all([
            new Promise<IDBValidKey[]>((resolve, reject) => {
                keysReq.onsuccess = () => resolve(keysReq.result);
                keysReq.onerror = () => reject(keysReq.error);
            }),
            new Promise<any[]>((resolve, reject) => {
                valuesReq.onsuccess = () => resolve(valuesReq.result);
                valuesReq.onerror = () => reject(valuesReq.error);
            })
        ]);
        
        // Map các key đến value tương ứng để tra cứu nhanh trong bộ nhớ
        const dataMap = new Map<string, any>();
        for (let i = 0; i < keys.length; i++) {
            dataMap.set(String(keys[i]), values[i]);
        }

        const avatarRegex = /^bi_avatar-(.+?)-([^-]+ - \d+)$/;
        const writesToMake: { key: string; value: any }[] = [];

        for (const keyStr of dataMap.keys()) {
            const match = keyStr.match(avatarRegex);
            if (match) {
                const employeePart = match[2];
                const newKey = `bi_avatar-${employeePart}`;
                
                // Nếu newKey chưa có giá trị, copy giá trị cũ sang
                if (!dataMap.has(newKey)) {
                    const oldVal = dataMap.get(keyStr);
                    if (oldVal !== undefined && oldVal !== null) {
                        writesToMake.push({ key: newKey, value: oldVal });
                    }
                }
            }
        }

        if (writesToMake.length > 0) {
            console.log(`[BI Avatar Migration] Phát hiện ${writesToMake.length} ảnh đại diện cũ cần di chuyển.`);
            const writeTx = db.transaction([NEW_STORE_NAME], 'readwrite');
            const writeStore = writeTx.objectStore(NEW_STORE_NAME);
            
            const now = Date.now();
            for (const write of writesToMake) {
                writeStore.put(write.value, write.key);
                writeStore.put(now, `lastModified_${write.key}`);
                console.log(`[BI Avatar Migration] Đang ghi key mới: ${write.key}`);
            }
            writeStore.put(now, 'localSettingsLastModified');
            
            await new Promise<void>((resolve, reject) => {
                writeTx.oncomplete = () => resolve();
                writeTx.onerror = () => reject(writeTx.error);
            });
            console.log(`[BI Avatar Migration] ✅ Di chuyển thành công ${writesToMake.length} ảnh đại diện cũ.`);
            window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key: 'bi_avatar_migration_complete' } }));
        } else {
            console.log('[BI Avatar Migration] Không có ảnh đại diện cũ nào cần di chuyển.');
        }
        db.close();
    } catch (e) {
        console.warn('[BI Avatar Migration] Lỗi khi di chuyển ảnh đại diện cũ:', e);
    }
}
