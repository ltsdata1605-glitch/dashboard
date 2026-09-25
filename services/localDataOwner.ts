/**
 * Dữ liệu cục bộ (IndexedDB/localStorage) thuộc về TRÌNH DUYỆT, không thuộc về tài khoản.
 * Vì vậy tài khoản mới đăng nhập trên cùng máy sẽ nhìn thấy dữ liệu của người dùng trước đó —
 * chủ dự án gặp thật 2026-09-23: tài khoản mới mở Report BI vẫn thấy cụm siêu thị của người cũ.
 *
 * Cơ chế: ghi lại UID đang "sở hữu" dữ liệu cục bộ. Khi UID đổi (đăng nhập tài khoản khác) hoặc
 * khi đăng xuất -> dọn sạch dữ liệu cục bộ của app. Dữ liệu thật vẫn nằm trên cloud của từng
 * tài khoản nên đăng nhập lại là tự tải về.
 *
 * Bổ sung 2026-09-23 (chủ dự án yêu cầu "mỗi tài khoản có localStorage/IndexedDB riêng"):
 * kho LỚN NHẤT — `BI_HUB_DATABASE_V2`, nơi chứa dữ liệu của gốc + Report BI + In Sticker — nay
 * được tách hẳn theo uid (utils/localDbScope.ts), nên nó KHÔNG còn nằm trong danh sách dọn theo
 * kiểu xoá sạch nữa: dữ liệu của mỗi người nằm ở database riêng, người cũ quay lại vẫn còn
 * nguyên. Các kho còn lại vẫn dùng chung nên vẫn phải dọn khi đổi tài khoản.
 */

import { LEGACY_BI_HUB_DB_NAME, setActiveLocalUid, biHubDbName } from '../utils/localDbScope';

const OWNER_KEY = 'ycx-local-data-owner-uid';

/** Các IndexedDB còn DÙNG CHUNG cho mọi tài khoản — phải dọn khi đổi tài khoản.
 *  (`BI_HUB_DATABASE_V2` ở đây là database dùng chung CŨ: từ nay chỉ còn dùng khi chưa đăng nhập,
 *  và dọn nó chính là cách thu hồi bản sao dữ liệu đã chuyển sang database riêng.) */
export const APP_DATABASES = [
    LEGACY_BI_HUB_DB_NAME, // kho dùng chung cũ + kho tạm lúc chưa đăng nhập
    'ClusterDataDB',       // Dữ liệu cụm / FormDataStore cũ
    'ScheduleAppDB',       // Phân ca
    'YCX_KHAI_THAC_DB',    // Báo cáo khai thác
    'ProductSearchDB',     // In Sticker - tra cứu sản phẩm
    'TaxCalculatorDB',     // Tính thuế
    'keyval-store',        // Check thưởng (iframe)
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
    // Lớp IndexedDB phải biết ngay: mọi lần mở database SAU câu lệnh này đi vào database của uid.
    setActiveLocalUid(uid);
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
        // Không để một DB hỏng làm treo cả quy trình
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
                    stores.forEach(store => {
                        try {
                            tx.objectStore(store).clear();
                        } catch {
                            /* bỏ qua lỗi từng store */
                        }
                    });
                    tx.oncomplete = tx.onerror = tx.onabort = () => {
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
    const userDb = biHubDbName();
    const dbsToClear = Array.from(new Set([...APP_DATABASES, userDb]));

    if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
        try {
            const dbs = await indexedDB.databases();
            dbs.forEach(d => {
                if (d.name && d.name !== 'firebaseLocalStorageDb' && !dbsToClear.includes(d.name)) {
                    dbsToClear.push(d.name);
                }
            });
        } catch {
            /* bỏ qua */
        }
    }

    await Promise.all(dbsToClear.map(clearDatabase));

    try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (LOCAL_STORAGE_PREFIXES.some(p => key.startsWith(p)) || (!key.startsWith('firebase:authUser') && !key.startsWith('firebase:host')))) {
                keys.push(key);
            }
        }
        keys.forEach(k => localStorage.removeItem(k));
    } catch {
        /* bỏ qua */
    }

    try {
        sessionStorage.clear();
    } catch {
        /* bỏ qua */
    }
};

/**
 * Xoá sạch toàn bộ dữ liệu trên thiết bị và cloud để đưa người dùng về trạng thái như mới hoàn toàn.
 * Giữ lại phiên đăng nhập tài khoản.
 */
export const resetAllDataAsNewUser = async (user?: any): Promise<void> => {
    // 0. Chặn toàn bộ tiến trình đồng bộ ngầm hoặc ghi đè từ Cloud Sync / DB hooks
    if (typeof window !== 'undefined') {
        (window as any).__ycx_is_resetting_all_data = true;
    }

    // 1. Xoá sạch toàn bộ dữ liệu người dùng trên Cloud Firestore
    if (user?.uid) {
        try {
            const { purgeAllUserCloudData, purgeUserBiDataReports } = await import('./firestoreService');
            await purgeAllUserCloudData(user.uid);
            if (user.departmentId) {
                await purgeUserBiDataReports(user.departmentId);
            }
        } catch (e) {
            console.warn('[resetAllDataAsNewUser] Lỗi khi xoá dữ liệu cloud Firestore:', e);
        }
    }

    // 2. Dọn sạch toàn bộ cơ sở dữ liệu cục bộ IndexedDB + localStorage + sessionStorage
    await clearAllLocalAppData();

    // 3. Đánh dấu cấm kế thừa dữ liệu cũ (đặt MIGRATED_MARKER rỗng vào DB riêng của user)
    try {
        const { markCleanSlateMigrated, resetLocalScopeInheritance } = await import('../utils/localDbScope');
        if (user?.uid) {
            resetLocalScopeInheritance(user.uid);
            await markCleanSlateMigrated(user.uid);
        }
    } catch (e) {
        console.warn('[resetAllDataAsNewUser] Lỗi thiết lập marker làm sạch:', e);
    }

    // 4. Xoá sạch bộ nhớ RAM cache của BI Module
    try {
        const { configStore } = await import('../features/bi-dashboard/store/configStore');
        configStore.clearCache();
    } catch {
        /* bỏ qua */
    }

    // 5. Phát các sự kiện reset UI toàn hệ thống
    try {
        window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: 'ALL' } }));
        window.dispatchEvent(new CustomEvent('bi-supermarket-map-changed', { detail: { userId: user?.uid || 'guest', map: {} } }));
        window.dispatchEvent(new CustomEvent('ycx-setting-changed', { detail: { key: 'bi_clear_all' } }));
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

    // Tài khoản này có được thừa kế dữ liệu trong database DÙNG CHUNG cũ hay không: chỉ khi kho
    // đó vốn đã là của chính nó, hoặc chưa ai nhận (lần đầu chạy bản này — phiên đăng nhập đang
    // được Firebase nhớ sẵn chính là chủ của đống dữ liệu đó). Phải quyết định TRƯỚC khi
    // setLocalDataOwner() ghi đè dấu chủ sở hữu.
    setActiveLocalUid(uid, { inheritLegacyData: !owner || owner === uid });

    if (owner && owner !== uid) {
        await clearAllLocalAppData();
        setLocalDataOwner(uid);
        return true;
    }
    if (!owner) setLocalDataOwner(uid);
    return false;
};
