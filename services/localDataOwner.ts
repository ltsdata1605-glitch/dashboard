/**
 * Dữ liệu cục bộ (IndexedDB/localStorage) thuộc về TRÌNH DUYỆT, không thuộc về tài khoản.
 * Vì vậy tài khoản mới đăng nhập trên cùng máy sẽ nhìn thấy dữ liệu của người dùng trước đó —
 * chủ dự án gặp thật 2026-09-23: tài khoản mới mở Report BI vẫn thấy cụm siêu thị của người cũ.
 *
 * Cơ chế: ghi lại UID đang "sở hữu" dữ liệu cục bộ. Khi UID đổi (đăng nhập tài khoản khác) hoặc
 * khi đăng xuất -> dọn sạch dữ liệu cục bộ của app. Dữ liệu thật vẫn nằm trên cloud của từng
 * tài khoản nên đăng nhập lại là tự tải về.
 */

const OWNER_KEY = 'ycx-local-data-owner-uid';

/** Mọi IndexedDB do app tạo ra. Thiếu tên nào là dữ liệu của người cũ còn sót lại ở khu đó. */
export const APP_DATABASES = [
    'BI_HUB_DATABASE_V2', // gốc + Report BI + In Sticker
    'ScheduleAppDB',      // Phân ca
    'YCX_KHAI_THAC_DB',   // Báo cáo khai thác
    'ProductSearchDB',    // In Sticker - tra cứu sản phẩm
    'TaxCalculatorDB',    // Tính thuế
    'keyval-store',       // Check thưởng (iframe)
];

/** Tiền tố khoá localStorage của app — dọn kèm để không còn vết của tài khoản cũ */
const LOCAL_STORAGE_PREFIXES = ['ycx', 'YCX', 'TAX_CALCULATOR', 'bi_', 'BI_', 'checkthuong', 'sticker'];

export const getLocalDataOwner = (): string | null => {
    try {
        return localStorage.getItem(OWNER_KEY);
    } catch {
        return null;
    }
};

export const setLocalDataOwner = (uid: string | null): void => {
    try {
        if (uid) localStorage.setItem(OWNER_KEY, uid);
        else localStorage.removeItem(OWNER_KEY);
    } catch {
        /* trình duyệt chặn localStorage — bỏ qua, chỉ mất cơ chế nhận biết */
    }
};

/** Xoá sạch nội dung mọi object store của 1 database (không xoá cả DB để tránh bị "blocked"
 *  khi app đang mở kết nối — xoá DB sẽ treo cho tới khi mọi tab đóng kết nối). */
const clearDatabase = (name: string): Promise<void> =>
    new Promise(resolve => {
        let settled = false;
        const done = () => {
            if (!settled) {
                settled = true;
                resolve();
            }
        };
        // Không để một DB hỏng làm treo cả quy trình đăng nhập
        const timeout = setTimeout(done, 3000);

        try {
            const req = indexedDB.open(name);
            req.onerror = () => {
                clearTimeout(timeout);
                done();
            };
            req.onsuccess = () => {
                const db = req.result;
                const stores = Array.from(db.objectStoreNames);
                if (stores.length === 0) {
                    db.close();
                    clearTimeout(timeout);
                    done();
                    return;
                }
                try {
                    const tx = db.transaction(stores, 'readwrite');
                    stores.forEach(store => tx.objectStore(store).clear());
                    tx.oncomplete = () => {
                        db.close();
                        clearTimeout(timeout);
                        done();
                    };
                    tx.onerror = () => {
                        db.close();
                        clearTimeout(timeout);
                        done();
                    };
                } catch {
                    db.close();
                    clearTimeout(timeout);
                    done();
                }
            };
        } catch {
            clearTimeout(timeout);
            done();
        }
    });

/** Dọn toàn bộ dữ liệu cục bộ của app (IndexedDB + localStorage của app) */
export const clearAllLocalAppData = async (): Promise<void> => {
    await Promise.all(APP_DATABASES.map(clearDatabase));

    try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && LOCAL_STORAGE_PREFIXES.some(p => key.startsWith(p))) keys.push(key);
        }
        keys.forEach(k => localStorage.removeItem(k));
    } catch {
        /* bỏ qua */
    }
};

/**
 * Gọi ngay khi biết UID đang đăng nhập. Trả về true nếu đã phải dọn dữ liệu của tài khoản khác.
 * Lần đầu (chưa có dấu chủ sở hữu) thì chỉ ghi nhận, KHÔNG dọn — tránh xoá oan dữ liệu của chính
 * người đang dùng khi bản cập nhật này được triển khai.
 */
export const ensureLocalDataBelongsTo = async (uid: string): Promise<boolean> => {
    const owner = getLocalDataOwner();
    if (owner && owner !== uid) {
        await clearAllLocalAppData();
        setLocalDataOwner(uid);
        return true;
    }
    if (!owner) setLocalDataOwner(uid);
    return false;
};
