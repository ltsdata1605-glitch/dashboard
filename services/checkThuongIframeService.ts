/**
 * Helper service to write check-thuong state directly into the iframe's IndexedDB 'keyval-store'
 * from the parent context (since they share the same origin).
 *
 * LỖI CŨ (sửa 2026-09-27): `getCheckThuongDataFromIframeDb` mở `keyval-store` version 1 KHÔNG có
 * `onupgradeneeded`. Trên máy chưa có database này (máy mới, sau khi đổi tài khoản — app xoá
 * `keyval-store`, hoặc Safari iOS tự xoá dữ liệu web sau 7 ngày không mở) lệnh đó TẠO RA database
 * rỗng version 1 → iframe mở cùng version 1 nên không bao giờ được tạo store `keyval` → mọi lần
 * lưu/tải Check Thưởng đều lỗi "object store not found". Nay luôn tạo store, và TỰ VÁ database đã
 * lỡ bị tạo rỗng bằng cách nâng version lên 1 nấc.
 */
const DB_NAME = 'keyval-store';
const STORE = 'keyval';

export function openCheckThuongIframeDb(): Promise<IDBDatabase> {
    const open = (version?: number) => new Promise<IDBDatabase>((resolve, reject) => {
        const request = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
        };
        request.onsuccess = () => {
            const db = request.result;
            // iframe (hoặc tab khác) cần nâng version để tự vá → nhả kết nối, đừng chặn nó.
            db.onversionchange = () => db.close();
            resolve(db);
        };
        request.onerror = () => reject(request.error || new Error('Failed to open DB'));
        request.onblocked = () => reject(new Error('keyval-store đang bị kết nối khác giữ'));
    });
    return open().then(db => {
        if (db.objectStoreNames.contains(STORE)) return db;
        const next = db.version + 1;
        db.close();
        return open(next);
    });
}

export function saveCheckThuongDataToIframeDb(value: unknown): Promise<void> {
    return openCheckThuongIframeDb().then(db => new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, 'checkthuong_data');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error || new Error('Transaction failed')); };
    }));
}

export function getCheckThuongDataFromIframeDb(): Promise<any> { // payload iframe thuần JS, không có kiểu
    return openCheckThuongIframeDb().then(db => new Promise(resolve => {
        const getReq = db.transaction(STORE, 'readonly').objectStore(STORE).get('checkthuong_data');
        getReq.onsuccess = () => { db.close(); resolve(getReq.result || null); };
        getReq.onerror = () => { db.close(); resolve(null); };
    })).catch(() => null);
}

/**
 * Đọc dữ liệu Check Thưởng hợp nhất từ cả 'keyval-store' và 'BI_HUB_DATABASE_V2'.
 * Nếu một trong hai nguồn có dữ liệu mà nguồn kia chưa có, hàm sẽ tự động đồng bộ ngay
 * lập tức, đảm bảo cả iframe và parent app luôn có dữ liệu tức thì ngay từ lần khởi động đầu tiên.
 */
export async function getUnifiedCheckThuongData(): Promise<any> {
    try {
        let iframeData = await getCheckThuongDataFromIframeDb();
        if (iframeData && Array.isArray(iframeData.competitionData) && iframeData.competitionData.length > 0) {
            return iframeData;
        }

        // Nếu iframe DB chưa có (máy mới, sau dọn dẹp cache, hoặc khởi động lần đầu),
        // fallback sang BI_HUB_DATABASE_V2 (nguồn chính của app và Cloud Sync)
        const { getSetting } = await import('./dbService');
        const parentData = await getSetting<any>('checkthuong_data');
        if (parentData && Array.isArray(parentData.competitionData) && parentData.competitionData.length > 0) {
            // Tự động vá sang keyval-store cho iframe
            saveCheckThuongDataToIframeDb(parentData).catch(err => {
                console.warn('[CheckThuongSync] Lỗi tự động vá sang keyval-store:', err);
            });
            return parentData;
        }

        return null;
    } catch (e) {
        console.warn('[CheckThuongSync] Lỗi đọc dữ liệu hợp nhất:', e);
        return null;
    }
}

