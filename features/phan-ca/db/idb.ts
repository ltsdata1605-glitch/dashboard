const DB_NAME = 'ScheduleAppDB';
const STORE_NAME = 'ScheduleData';
const DB_VERSION = 1;

let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    // Tránh mở lại nếu đã có kết nối
    if (db) {
        return resolve(true);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Lỗi khi mở IndexedDB:", request.error);
      reject(false);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
};

export const saveData = <T,>(key: string, value: T, timestamp?: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
        initDB().then(() => saveData(key, value, timestamp).then(resolve).catch(reject));
        return;
    }
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({ key, value });

    if (!key.startsWith('lastModified_')) {
      store.put({ key: `lastModified_${key}`, value: timestamp || Date.now() });
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => {
        console.error(`Lỗi khi lưu dữ liệu cho key ${key}:`, transaction.error);
        reject(transaction.error);
    };
  });
};

export const loadData = <T,>(key: string): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    if (!db) {
        initDB().then(() => loadData<T>(key).then(resolve).catch(reject));
        return;
    }
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result ? request.result.value : undefined);
    };
    request.onerror = () => {
      console.error(`Lỗi khi tải dữ liệu cho key ${key}:`, request.error);
      reject(request.error);
    };
  });
};
