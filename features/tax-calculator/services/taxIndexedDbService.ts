import { SavedTaxRecord } from '../types/tax.types';

const DB_NAME = 'TaxCalculatorDB';
const DB_VERSION = 1;
const STORE_NAME = 'calculations';

let dbInstance: IDBDatabase | null = null;

const getDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Lỗi khởi tạo IndexedDB TaxCalculatorDB'));
        };

        request.onsuccess = (e) => {
            dbInstance = (e.target as IDBOpenDBRequest).result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
};

export const taxIndexedDbService = {
    async getAll(): Promise<SavedTaxRecord[]> {
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.getAll();

                req.onsuccess = () => {
                    const list: SavedTaxRecord[] = req.result || [];
                    // Sắp xếp mới nhất lên đầu
                    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    resolve(list);
                };

                req.onerror = () => reject(new Error('Lỗi lấy danh sách lịch sử tính thuế'));
            });
        } catch {
            return [];
        }
    },

    async save(record: Omit<SavedTaxRecord, 'id'>): Promise<number> {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.add(record);

            req.onsuccess = () => {
                resolve(Number(req.result));
            };

            req.onerror = () => reject(new Error('Lỗi lưu bản ghi tính thuế'));
        });
    },

    async delete(id: number): Promise<void> {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(id);

            req.onsuccess = () => resolve();
            req.onerror = () => reject(new Error('Lỗi xóa bản ghi tính thuế'));
        });
    },

    async clearAll(): Promise<void> {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.clear();

            req.onsuccess = () => resolve();
            req.onerror = () => reject(new Error('Lỗi xóa tất cả lịch sử tính thuế'));
        });
    }
};
