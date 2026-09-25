/**
 * PHẠM VI INDEXEDDB THEO TÀI KHOẢN — chủ dự án yêu cầu 2026-09-23:
 * "Mỗi tài khoản sẽ có localStorage và IndexedDB riêng".
 *
 * Trước đây 3 khu vực (gốc, Report BI, In Sticker — Phân Ca có kho `ScheduleAppDB` riêng) dùng
 * CHUNG đúng một database `BI_HUB_DATABASE_V2`, nên dữ liệu cục bộ thuộc về TRÌNH DUYỆT chứ không
 * thuộc tài khoản: ai đăng nhập sau trên cùng máy cũng thấy dữ liệu của người trước. Cách chữa tạm (commit 9eca99b4) là xoá sạch mọi thứ mỗi lần đổi tài
 * khoản — an toàn nhưng người cũ quay lại phải tải lại từ đầu và mất hết trạng thái cục bộ.
 *
 * Nay tên database là HÀM THUẦN của uid: `BI_HUB_DATABASE_V2__<uid>`. Không còn trạng thái ẩn
 * nào quyết định "database này của ai" — mở đúng DB nào chỉ phụ thuộc vào đang đăng nhập bằng
 * tài khoản nào. Mất localStorage cũng không lẫn dữ liệu được.
 *
 * Vì sao đặt ở `utils/` chứ không phải `services/`: cả 3 khu vực dùng kho này đều phải mở ĐÚNG
 * CÙNG MỘT tên database. Nếu chép logic này thành 3 bản zone-local như `dbService.ts`, chỉ cần
 * một bản lệch là hai khu vực ghi vào 2 database khác nhau và dữ liệu âm thầm tách đôi — nguy
 * hiểm hơn nhiều so với việc nới quy tắc cách ly cho một tiện ích thuần không chứa logic nghiệp
 * vụ (xem CLAUDE.md mục 1).
 */

export const LEGACY_BI_HUB_DB_NAME = 'BI_HUB_DATABASE_V2';
export const BI_HUB_DB_VERSION = 3;
export const SETTINGS_STORE = 'settings';
export const APP_STORE = 'appStorage';

/** Cùng khoá mà services/localDataOwner.ts ghi — dùng để ĐOÁN uid ở lần mở app đầu tiên,
 *  trước khi Firebase Auth kịp trả lời (đọc localStorage là đồng bộ, onAuthStateChanged thì không). */
const OWNER_KEY = 'ycx-local-data-owner-uid';

/** Cờ nằm trong chính database riêng: đã chép xong dữ liệu từ database dùng chung cũ hay chưa */
const MIGRATED_MARKER = '__ycx_scope_migrated_v1';

/**
 * Toàn bộ trạng thái đặt trên `globalThis` chứ không phải biến module.
 *
 * Lý do KHÔNG phải cho đẹp: nếu bundler tách module này thành 2 bản (mỗi chunk một bản — chuyện
 * đã gặp thật trong dự án này, xem chú thích "module duplication" ở contexts/AuthContext.tsx),
 * mỗi bản sẽ giữ một `activeUid` riêng. Lúc đó Report BI có thể ghi vào database của tài khoản
 * này trong khi Phân Tích đọc database của tài khoản khác — hỏng âm thầm, không có lỗi nào hiện
 * ra. Một chỗ duy nhất trên globalThis thì không tách được.
 */
type ScopeState = {
    /** undefined = chưa ai gọi setActiveLocalUid() trong phiên này (còn phải đoán từ localStorage) */
    uid?: string | null;
    /** uid nào được phép thừa kế dữ liệu của database dùng chung cũ (xem ensureBiHubDbReady) */
    inherit: Map<string, boolean>;
    /** lượt chép dữ liệu đang chạy, theo tên database */
    ready: Map<string, Promise<void>>;
};
type ScopeGlobal = typeof globalThis & { __ycxLocalDbScope?: ScopeState };

const state = (): ScopeState => {
    const g = globalThis as ScopeGlobal;
    if (!g.__ycxLocalDbScope) g.__ycxLocalDbScope = { inherit: new Map(), ready: new Map() };
    return g.__ycxLocalDbScope;
};

const readOwnerFromStorage = (): string | null => {
    try {
        return localStorage.getItem(OWNER_KEY);
    } catch {
        return null;
    }
};

/**
 * Báo cho lớp IndexedDB biết đang là tài khoản nào. Gọi NGAY khi biết uid (trước mọi lần đọc/ghi).
 * `inheritLegacyData`: chỉ đặt true khi database dùng chung cũ đúng là của tài khoản này
 * (services/localDataOwner.ts biết điều đó qua dấu chủ sở hữu trước khi nó bị ghi đè).
 */
export const setActiveLocalUid = (uid: string | null, options?: { inheritLegacyData?: boolean }): void => {
    const s = state();
    s.uid = uid;
    if (uid && options && typeof options.inheritLegacyData === 'boolean') {
        s.inherit.set(uid, options.inheritLegacyData);
    }
};

/** uid đang sở hữu dữ liệu cục bộ: ưu tiên giá trị AuthContext vừa báo, nếu chưa có thì đoán
 *  bằng dấu chủ sở hữu của lần chạy trước (gần như luôn đúng vì Firebase nhớ phiên đăng nhập). */
export const getActiveLocalUid = (): string | null => {
    const uid = state().uid;
    return uid === undefined ? readOwnerFromStorage() : uid;
};

/** Chỉ giữ ký tự an toàn cho tên database (uid Firebase vốn chỉ có chữ và số, nhưng không đoán bừa) */
const slugifyUid = (uid: string): string => uid.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);

/**
 * Tên database của tài khoản đang đăng nhập. Chưa đăng nhập (kể cả Chế độ Dùng Thử) thì vẫn là
 * database dùng chung cũ — lúc đó không có dữ liệu riêng tư của ai để tách.
 */
export const biHubDbName = (): string => {
    const uid = getActiveLocalUid();
    return uid ? `${LEGACY_BI_HUB_DB_NAME}__${slugifyUid(uid)}` : LEGACY_BI_HUB_DB_NAME;
};

// ───────────────────────── Chép dữ liệu cũ sang database riêng (chạy 1 lần cho mỗi tài khoản) ─────────────────────────

/**
 * `version = undefined` -> mở đúng phiên bản đang có trên máy. Dùng cho database CŨ: nếu máy nào
 * đó có version cao hơn 3, mở kèm version 3 sẽ ném VersionError và chặn luôn việc chuyển dữ liệu.
 */
const openRawDb = (name: string, version?: number): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
        let active = true;
        const timeoutId = setTimeout(() => {
            if (active) {
                active = false;
                reject(new Error(`[LocalDbScope] Timeout mở database "${name}"`));
            }
        }, 10000);
        const finish = (fn: () => void) => {
            if (!active) return;
            active = false;
            clearTimeout(timeoutId);
            fn();
        };

        try {
            const request = version ? indexedDB.open(name, version) : indexedDB.open(name);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(APP_STORE)) db.createObjectStore(APP_STORE);
                if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
            };
            request.onsuccess = () => {
                if (!active) {
                    // Nuốt lỗi CÓ CHỦ Ý: kết nối trễ đã bị bỏ, đóng được hay không đều không sao.
                    try { request.result.close(); } catch { /* đã đóng sẵn */ }
                    return;
                }
                finish(() => resolve(request.result));
            };
            request.onerror = () => finish(() => reject(request.error || new Error('open failed')));
            request.onblocked = () => finish(() => reject(new Error(`[LocalDbScope] Database "${name}" bị tab khác giữ`)));
        } catch (error) {
            finish(() => reject(error));
        }
    });

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
    new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('request failed'));
    });

const txDone = (tx: IDBTransaction): Promise<void> =>
    new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('transaction failed'));
        tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
    });

const readKeys = async (db: IDBDatabase, storeName: string): Promise<IDBValidKey[]> => {
    if (!db.objectStoreNames.contains(storeName)) return [];
    const tx = db.transaction(storeName, 'readonly');
    return requestToPromise(tx.objectStore(storeName).getAllKeys());
};

/**
 * Chép từng mẻ nhỏ thay vì đọc hết một lần: kho `appStorage` có thể chứa vài chục MB dữ liệu
 * Excel của Phân Tích, đọc trọn gói vào RAM rồi mới ghi dễ làm tab nặng đột ngột trên laptop cũ.
 */
const copyStore = async (source: IDBDatabase, target: IDBDatabase, storeName: string): Promise<number> => {
    const keys = await readKeys(source, storeName);
    if (keys.length === 0) return 0;

    const CHUNK = 20;
    for (let i = 0; i < keys.length; i += CHUNK) {
        const slice = keys.slice(i, i + CHUNK);
        const readTx = source.transaction(storeName, 'readonly');
        const readStore = readTx.objectStore(storeName);
        const values = await Promise.all(slice.map(key => requestToPromise(readStore.get(key))));

        const writeTx = target.transaction(storeName, 'readwrite');
        const writeStore = writeTx.objectStore(storeName);
        slice.forEach((key, idx) => {
            if (values[idx] !== undefined) writeStore.put(values[idx], key);
        });
        await txDone(writeTx);
    }
    return keys.length;
};

const markMigrated = async (db: IDBDatabase, copied: { settings: number; app: number }): Promise<void> => {
    const tx = db.transaction(APP_STORE, 'readwrite');
    tx.objectStore(APP_STORE).put({ at: Date.now(), ...copied }, MIGRATED_MARKER);
    await txDone(tx);
};

const migrateLegacyInto = async (name: string, uid: string): Promise<void> => {
    const target = await openRawDb(name, BI_HUB_DB_VERSION);
    try {
        const marker = await (async () => {
            const tx = target.transaction(APP_STORE, 'readonly');
            return requestToPromise(tx.objectStore(APP_STORE).get(MIGRATED_MARKER));
        })();
        if (marker) return; // đã chép xong ở lần trước

        // Chỉ thừa kế khi database dùng chung cũ ĐÚNG là của tài khoản này. Nếu người khác vừa
        // đăng nhập trên máy có sẵn dữ liệu của người trước, tài khoản mới phải bắt đầu từ trống
        // — đây chính là lỗi "tài khoản mới dính dữ liệu cũ" mà chủ dự án báo 2026-09-23.
        if (state().inherit.get(uid) === false) {
            await markMigrated(target, { settings: 0, app: 0 });
            return;
        }

        const legacy = await openRawDb(LEGACY_BI_HUB_DB_NAME);
        try {
            const settings = await copyStore(legacy, target, SETTINGS_STORE);
            const app = await copyStore(legacy, target, APP_STORE);
            await markMigrated(target, { settings, app });
            if (settings + app > 0) {
                console.info(`[LocalDbScope] Đã chuyển ${settings + app} mục sang database riêng của tài khoản.`);
            }
        } finally {
            try { legacy.close(); } catch { /* đã đóng sẵn */ }
        }
        // CỐ Ý không xoá database cũ ở đây: một tab khác đang mở bản app cũ vẫn có thể đang dùng
        // nó. Nó được dọn ở services/localDataOwner.ts khi đăng xuất hoặc khi đổi tài khoản.
    } finally {
        try { target.close(); } catch { /* đã đóng sẵn */ }
    }
};

export const ensureBiHubDbReady = (name: string = biHubDbName()): Promise<void> => {
    if (name === LEGACY_BI_HUB_DB_NAME) return Promise.resolve();
    const uid = getActiveLocalUid();
    if (!uid) return Promise.resolve();

    const pending = state().ready;
    let task = pending.get(name);
    if (!task) {
        task = migrateLegacyInto(name, uid).catch(error => {
            // Chép hụt KHÔNG được chặn app: tệ nhất là tài khoản này bắt đầu với dữ liệu rỗng và
            // tự tải lại từ cloud. Xoá khỏi map để lần mở database sau thử lại.
            console.warn('[LocalDbScope] Không chuyển được dữ liệu sang database riêng:', error);
            pending.delete(name);
        });
        pending.set(name, task);
    }
    return task;
};

/** Chỉ dùng cho test: quên hết trạng thái trong RAM để chạy lại từ đầu */
export const resetLocalDbScopeForTests = (): void => {
    delete (globalThis as ScopeGlobal).__ycxLocalDbScope;
};

/**
 * Ngăn tài khoản thừa kế dữ liệu từ database dùng chung cũ khi xoá mới hoặc làm sạch dữ liệu.
 */
export const resetLocalScopeInheritance = (uid: string): void => {
    state().inherit.set(uid, false);
};

/**
 * Ghi marker rỗng { settings: 0, app: 0 } vào database riêng của user để ensureBiHubDbReady
 * biết là đã hoàn tất và không bao giờ copy dữ liệu cũ từ legacy DB sang nữa.
 */
export const markCleanSlateMigrated = async (uid?: string | null): Promise<void> => {
    const targetDbName = uid ? `${LEGACY_BI_HUB_DB_NAME}__${slugifyUid(uid)}` : biHubDbName();
    try {
        const target = await openRawDb(targetDbName, BI_HUB_DB_VERSION);
        try {
            await markMigrated(target, { settings: 0, app: 0 });
        } finally {
            try { target.close(); } catch { /* đã đóng sẵn */ }
        }
    } catch (e) {
        console.warn('[LocalDbScope] markCleanSlateMigrated error:', e);
    }
};
