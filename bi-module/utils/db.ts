
// BI Module Database Layer
// Đã được chuyển sang sử dụng chung database BI_HUB_DATABASE_V2 (store: settings)
// với hệ thống chính để đồng bộ lên Firebase qua useCloudSync.
// 
// Trước đây: ClusterDataDB / FormDataStore (chỉ lưu cục bộ, KHÔNG đồng bộ)
// Bây giờ:   BI_HUB_DATABASE_V2 / settings (đồng bộ lên Firebase qua event ycx-setting-changed)

const DB_NAME = 'BI_HUB_DATABASE_V2';
const SETTINGS_STORE = 'settings';
const DB_VERSION = 3;

// Prefix cho tất cả key của BI module để tránh xung đột với hệ thống chính
const BI_PREFIX = 'bi_';

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database error:', request.error);
      reject('Error opening database');
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('appStorage')) {
        db.createObjectStore('appStorage');
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE);
      }
    };
  });
  return dbPromise;
};

// Thêm prefix để key BI module không xung đột với key của Dashboard chính
const prefixKey = (key: string): string => `${BI_PREFIX}${key}`;

export const set = async (key: string, value: any): Promise<void> => {
  const db = await initDB();
  const prefixed = prefixKey(key);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    store.put(value, prefixed);
    // Cập nhật timestamp chung để hệ thống Cloud Sync nhận biết thay đổi
    store.put(Date.now(), 'localSettingsLastModified');

    transaction.oncomplete = () => {
      // Bắn event cho hệ thống BI nội bộ (dùng tên key GỐC, không prefix)
      window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key } }));
      // Bắn event cho hệ thống Cloud Sync chính
      window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key: prefixed } }));
      resolve();
    };
    transaction.onerror = () => {
      console.error('Error setting data:', transaction.error);
      reject(transaction.error);
    };
  });
};

// Hàm ghi nhiều mục trong 1 transaction duy nhất (Hiệu suất cao)
export const setMany = async (items: { key: string; value: any }[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);

    items.forEach(item => {
      store.put(item.value, prefixKey(item.key));
    });
    store.put(Date.now(), 'localSettingsLastModified');

    transaction.oncomplete = () => {
      // Bắn event tổng hợp
      items.forEach(item => {
        window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: item.key } }));
      });
      window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key: 'bi_bulk_update' } }));
      resolve();
    };
    transaction.onerror = (_event) => {
      console.error('Transaction error:', transaction.error);
      reject(transaction.error);
    };
  });
};

export const get = async (key: string): Promise<any> => {
  const db = await initDB();
  const prefixed = prefixKey(key);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETTINGS_STORE], 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.get(prefixed);

    request.onsuccess = () => {
      resolve(request.result === undefined ? undefined : request.result);
    };

    request.onerror = () => {
      console.error('Error getting data:', request.error);
      reject(request.error);
    };
  });
};

export const getAll = async (): Promise<{ key: string; value: any }[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETTINGS_STORE], 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.getAll();
    const keysRequest = store.getAllKeys();

    transaction.oncomplete = () => {
      const keys = keysRequest.result;
      const values = request.result;
      const result: { key: string; value: any }[] = [];
      for (let i = 0; i < keys.length; i++) {
        const k = String(keys[i]);
        // Chỉ trả về các key thuộc BI module (có prefix bi_)
        if (k.startsWith(BI_PREFIX)) {
          result.push({ key: k.slice(BI_PREFIX.length), value: values[i] });
        }
      }
      resolve(result);
    };

    transaction.onerror = () => {
      console.error('Error getting all data:', transaction.error);
      reject(transaction.error);
    };
  });
};

export const clearStore = async (): Promise<void> => {
  const db = await initDB();
  // CHỈ xoá các key có prefix bi_, KHÔNG xoá dữ liệu của hệ thống chính
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    const cursorRequest = store.openCursor();
    
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor) {
        const k = String(cursor.key);
        if (k.startsWith(BI_PREFIX)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    transaction.oncomplete = () => {
      window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key: 'bi_clear_all' } }));
      resolve();
    };
    transaction.onerror = () => {
      console.error('Error clearing store:', transaction.error);
      reject(transaction.error);
    };
  });
};

export const deleteEntry = async (key: string): Promise<void> => {
  const db = await initDB();
  const prefixed = prefixKey(key);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.delete(prefixed);

    transaction.oncomplete = () => {
      window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key: prefixed } }));
      resolve();
    };
    request.onerror = () => {
      console.error('Error deleting data:', request.error);
      reject(request.error);
    };
  });
};
