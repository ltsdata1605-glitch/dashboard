/// <reference lib="webworker" />
import { joinJsonArrayChunks } from './salesJsonChunks';

/**
 * Ghi JSON dữ liệu bán hàng vào IndexedDB NGOÀI luồng chính (Đợt 6, 2026-09-30).
 * Nhận các khúc UTF-8 (chuyển quyền sở hữu, không sao chép), ghép thành đúng chuỗi mà mã cũ tạo bằng
 * `JSON.stringify`, rồi `put` vào đúng database/store/khoá mà luồng chính chỉ định. Không tự tạo
 * database: nếu database/store chưa có thì báo lỗi để luồng chính ghi theo đường cũ.
 */
export interface SalesJsonWriteRequest {
    dbName: string;
    storeName: string;
    key: string;
    chunks: ArrayBuffer[];
    prefix: string;
    suffix: string;
}

const openExisting = (name: string) => new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name);
    // Database chưa có → huỷ lượt nâng cấp để KHÔNG tạo database rỗng; luồng chính sẽ ghi đường cũ.
    req.onupgradeneeded = () => { req.transaction?.abort(); };
    req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => db.close();
        resolve(db);
    };
    req.onerror = () => reject(req.error || new Error('Không mở được IndexedDB'));
    req.onblocked = () => reject(new Error('IndexedDB bị chặn'));
});

self.onmessage = async (e: MessageEvent<SalesJsonWriteRequest>) => {
    const { dbName, storeName, key, chunks, prefix, suffix } = e.data;
    let db: IDBDatabase | null = null;
    try {
        const value = prefix + joinJsonArrayChunks(chunks) + suffix;
        chunks.length = 0;
        db = await openExisting(dbName);
        if (!db.objectStoreNames.contains(storeName)) throw new Error(`Thiếu store ${storeName}`);
        await new Promise<void>((resolve, reject) => {
            const tx = db!.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('Ghi IndexedDB thất bại'));
            tx.onabort = () => reject(tx.error || new Error('Giao dịch IndexedDB bị huỷ'));
        });
        self.postMessage({ ok: true });
    } catch (err) {
        self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
        db?.close();
    }
};
