import { doc, getDoc, setDoc, serverTimestamp, Timestamp, type DocumentReference } from 'firebase/firestore';
import { db } from './firebase';
import { getSetting, touchLastModified } from './dbService';
import type { User } from 'firebase/auth';
import type { ProductConfig, CrossSellingConfig } from '../types';

// Nhóm ngành hàng "groups" của productConfig có thể ở dạng Set (runtime) hoặc string[] (đã phục hồi từ JSON)
type ProductConfigGroups = Record<string, Set<string> | string[]>;

export const syncToCloud = async (
    user: User,
    payload: Record<string, unknown>
) => {
    if (!user) throw new Error("Chưa đăng nhập, không thể đồng bộ.");

    // Deep clone to safely convert Set objects to Arrays for Firebase compatibility
    const safePayload: Record<string, unknown> = { ...payload };
    const payloadProductConfig = safePayload.productConfig as { groups?: ProductConfigGroups } | undefined;
    if (payloadProductConfig && payloadProductConfig.groups) {
        const clonedGroups: { [key: string]: string[] } = {};
        for (const [key, value] of Object.entries(payloadProductConfig.groups)) {
            clonedGroups[key] = value instanceof Set ? Array.from(value) : (value as string[]);
        }
        safePayload.productConfig = {
            ...payloadProductConfig,
            groups: clonedGroups
        };
    }

    const userRef = doc(db, 'users', user.uid);
    const configRef = doc(db, 'users', user.uid, 'setting', 'configuration');

    // Cập nhật timestamp lần sync cuối
    await setDoc(userRef, {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        lastSync: serverTimestamp()
    }, { merge: true });

    // Lọc bỏ các giá trị undefined vì Firestore không hỗ trợ (chuyển đổi đệ quy thành null)
    const cleanPayload = JSON.parse(JSON.stringify(safePayload, (k, v) => v === undefined ? null : v));

    // Cập nhật configuration
    await setDoc(configRef, {
        ...cleanPayload,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

export const fetchFromCloud = async (user: User) => {
    if (!user) throw new Error("Chưa đăng nhập, không thể tải dữ liệu.");
    
    const configRef = doc(db, 'users', user.uid, 'setting', 'configuration');
    const snap = await getDoc(configRef);
    
    if (snap.exists()) {
        const data = snap.data();
        if (data.productConfig && data.productConfig.groups) {
            // Rehydrate arrays back to Sets
            const restoredGroups: { [key: string]: Set<string> } = {};
            for (const [key, value] of Object.entries(data.productConfig.groups)) {
                restoredGroups[key] = new Set(value as string[]);
            }
            data.productConfig.groups = restoredGroups;
        }
        return data;
    }
    return null;
};

export const clearCloudSettings = async (user: User) => {
    if (!user) return;
    const { deleteDoc } = await import('firebase/firestore');
    const configRef = doc(db, 'users', user.uid, 'setting', 'configuration');
    await deleteDoc(configRef);
};

export interface SharedConfig {
    id: string;
    uid: string;
    authorName: string;
    authorEmail: string;
    role: string;
    departmentId: string;
    description: string;
    createdAt: Timestamp;
    payload: Record<string, unknown>;
}

export const shareCloudConfig = async (
    user: User,
    userRole: string,
    departmentId: string,
    description: string,
    payload: Record<string, unknown>
) => {
    if (!user) throw new Error("Chưa đăng nhập, không thể chia sẻ.");

    const safePayload: Record<string, unknown> = { ...payload };
    const payloadProductConfig = safePayload.productConfig as { groups?: ProductConfigGroups } | undefined;
    if (payloadProductConfig && payloadProductConfig.groups) {
        const clonedGroups: { [key: string]: string[] } = {};
        for (const [key, value] of Object.entries(payloadProductConfig.groups)) {
            clonedGroups[key] = value instanceof Set ? Array.from(value) : (value as string[]);
        }
        safePayload.productConfig = {
            ...payloadProductConfig,
            groups: clonedGroups
        };
    }

    const cleanPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(safePayload)) {
        if (value !== undefined) {
            cleanPayload[key] = value;
        }
    }

    const { collection, addDoc } = await import('firebase/firestore');
    const sharedConfigsRef = collection(db, 'shared_configs');
    
    await addDoc(sharedConfigsRef, {
        uid: user.uid,
        authorName: user.displayName || 'Thành viên YCX',
        authorEmail: user.email,
        role: userRole,
        departmentId: departmentId || 'ALL (Super Admin)',
        description,
        createdAt: serverTimestamp(),
        payload: cleanPayload
    });
};

export const fetchSharedConfigs = async (
    currentUserRole: string | null | undefined,
    currentDepartmentId: string | undefined
): Promise<SharedConfig[]> => {
    const { collection, getDocs } = await import('firebase/firestore');
    const snapshot = await getDocs(collection(db, 'shared_configs'));
    
    let configs: SharedConfig[] = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data() as Omit<SharedConfig, 'id'>;
        let isVisible = false;
        
        if (currentUserRole === 'admin') {
            isVisible = true;
        } else if (data.role === 'admin' || data.departmentId === 'ALL (Super Admin)') {
            isVisible = true;
        } else if (currentDepartmentId) {
            const userDepts = currentDepartmentId.split(',').map(s => s.trim().toLowerCase());
            const configDepts = data.departmentId.split(',').map(s => s.trim().toLowerCase());
            isVisible = userDepts.some(dept => configDepts.includes(dept));
        }

        if (isVisible) {
            configs.push({
                id: docSnap.id,
                ...data
            } as SharedConfig);
        }
    });
    
    configs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
    });
    
    return configs;
};

export const deleteSharedConfig = async (configId: string) => {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'shared_configs', configId));
};

export const syncScheduleToCloud = async (user: User, key: string, value: unknown) => {
    if (!user) return;
    const safeKey = key.replace(/::/g, '__');
    const docRef = doc(db, 'users', user.uid, 'schedules', safeKey);
    
    // Convert undefined to null for Firestore compatibility
    const cleanValue = JSON.parse(JSON.stringify(value, (k, v) => v === undefined ? null : v));
    
    await setDoc(docRef, {
        data: cleanValue,
        updatedAt: serverTimestamp()
    }, { merge: false });
};

export const fetchScheduleFromCloud = async (user: User, key: string) => {
    if (!user) return null;
    const safeKey = key.replace(/::/g, '__');
    const docRef = doc(db, 'users', user.uid, 'schedules', safeKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        return {
            data: data.data,
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.savedAt || 0)
        };
    }
    return null;
};

export const HEAVY_SYNC_KEYS = new Set([
    'productConfig',
    'departmentMap',
    'customTabs',
    'headToHeadTables',
    'customCalendars',
    'crossSellingConfig',
    'industryAnalysisCustomTabs',
    'topSellerAnalysisHistory',
    'checkthuong_data',
    'stickerSavedLists',
    'originalDepartmentMap',
    'customExploitationTabs',
    'efficiencyExploitationTabs'
]);

export const isHeavySyncKey = (key: string): boolean => {
    if (HEAVY_SYNC_KEYS.has(key)) return true;
    if (key === 'checkthuong_data') return true;
    if (key.startsWith('bi_')) {
        const unprefixed = key.substring(3);
        if (
            HEAVY_SYNC_KEYS.has(unprefixed) ||
            unprefixed.startsWith('summary-') ||
            unprefixed.startsWith('competition-') ||
            unprefixed.startsWith('config-') ||
            unprefixed.startsWith('comptarget-') ||
            unprefixed.startsWith('bonus-') ||
            unprefixed.startsWith('snapshot-') ||
            unprefixed.startsWith('avatar-') ||
            unprefixed === 'last-updates-list' ||
            unprefixed === 'nhanvien-summary-tables-v1' ||
            unprefixed === 'ai-assistant-history'
        ) {
            return true;
        }
    }
    return false;
};

// Firestore CẤM mảng lồng mảng trực tiếp (vd competitionData của check-thuong.html — tạo bằng
// XLSX.utils.sheet_to_json(sheet, {header: 1}) nên là row[][], không phải row đối tượng) — setDoc
// sẽ ném "Nested arrays are not supported". Bọc mỗi mảng con thành object {__fsArr: [...]} trước
// khi ghi, và mở lại đúng chỗ khi đọc (fetchHeavySettingsFromCloud + listener realtime ở
// hooks/useCloudSync.ts) để các khoá heavy-sync khác lỡ có cấu trúc tương tự cũng không bị vỡ.
const NESTED_ARRAY_MARKER = '__fsArr';

function sanitizeNestedArraysForFirestore(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(item => Array.isArray(item)
            ? { [NESTED_ARRAY_MARKER]: sanitizeNestedArraysForFirestore(item) }
            : sanitizeNestedArraysForFirestore(item));
    }
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            out[k] = sanitizeNestedArraysForFirestore(v);
        }
        return out;
    }
    return value;
}

export function restoreNestedArraysFromFirestore(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(restoreNestedArraysFromFirestore);
    }
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (NESTED_ARRAY_MARKER in obj && Array.isArray(obj[NESTED_ARRAY_MARKER])) {
            return restoreNestedArraysFromFirestore(obj[NESTED_ARRAY_MARKER]);
        }
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k] = restoreNestedArraysFromFirestore(v);
        }
        return out;
    }
    return value;
}

// Firestore giới hạn cứng 1_048_576 byte/document — checkthuong_data (bảng so sánh nhiều Kho,
// nhiều tháng, tạo từ XLSX.utils.sheet_to_json) có thể vượt xa mốc này (đã gặp thực tế ~4MB,
// setDoc() ném "exceeds the maximum allowed size"). Khi chuỗi JSON vượt ngưỡng an toàn, cắt
// thành nhiều phần lưu ở subcollection configs/{key}/chunks/{n} thay vì ghi thẳng 1 document.
// Ngưỡng tính theo KÝ TỰ (không phải byte) và chọn thấp hơn hẳn giới hạn byte thật vì tiếng Việt
// có dấu chiếm tới 3 byte/ký tự khi encode UTF-8.
const CHUNK_CHAR_SIZE = 300_000;

function splitIntoChunks(serialized: string): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < serialized.length; i += CHUNK_CHAR_SIZE) {
        chunks.push(serialized.slice(i, i + CHUNK_CHAR_SIZE));
    }
    return chunks;
}

/** Ghép + parse lại dữ liệu từ subcollection chunks — dùng chung cho fetchHeavySettingsFromCloud
 * (tải hàng loạt lúc đăng nhập) lẫn listener realtime ở hooks/useCloudSync.ts. */
export async function assembleChunkedHeavyValue(docRef: DocumentReference): Promise<unknown> {
    const { collection, getDocs } = await import('firebase/firestore');
    const chunksSnap = await getDocs(collection(docRef, 'chunks'));
    if (chunksSnap.empty) return undefined;

    const serialized = chunksSnap.docs
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
        .map(d => (d.data() as { data?: string }).data || '')
        .join('');

    try {
        return restoreNestedArraysFromFirestore(JSON.parse(serialized));
    } catch (e) {
        console.warn('[Heavy Sync] Không parse được dữ liệu ghép từ chunk:', e);
        return undefined;
    }
}

export const syncHeavySettingToCloud = async (user: User, key: string, value: unknown) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'configs', key);

    // Safety check for Set conversion (like in productConfig.groups)
    let safeValue = value;
    const valueWithConfig = value as { config?: { groups?: ProductConfigGroups } } | undefined;
    if (key === 'productConfig' && valueWithConfig && valueWithConfig.config && valueWithConfig.config.groups) {
        const clonedGroups: { [key: string]: string[] } = {};
        for (const [gKey, gVal] of Object.entries(valueWithConfig.config.groups)) {
            clonedGroups[gKey] = gVal instanceof Set ? Array.from(gVal) : (gVal as string[]);
        }
        safeValue = {
            ...valueWithConfig,
            config: {
                ...valueWithConfig.config,
                groups: clonedGroups
            }
        };
    }

    const cleanValue = JSON.parse(JSON.stringify(safeValue, (k, v) => v === undefined ? null : v));
    const firestoreSafeValue = sanitizeNestedArraysForFirestore(cleanValue);
    const serialized = JSON.stringify(firestoreSafeValue);

    const { collection, getDocs, deleteDoc, writeBatch } = await import('firebase/firestore');
    const chunksRef = collection(docRef, 'chunks');

    if (serialized.length <= CHUNK_CHAR_SIZE) {
        await setDoc(docRef, {
            value: firestoreSafeValue,
            chunked: false,
            updatedAt: serverTimestamp()
        }, { merge: false });

        // Dọn chunk cũ nếu khoá này từng bị chunk ở lần ghi trước — chạy nền, không chặn ghi chính.
        getDocs(chunksRef)
            .then(snap => snap.empty ? undefined : Promise.all(snap.docs.map(d => deleteDoc(d.ref))))
            .catch(err => console.warn(`[Heavy Sync] Không dọn được chunk cũ của "${key}":`, err));
        return;
    }

    const parts = splitIntoChunks(serialized);
    const batch = writeBatch(db);
    parts.forEach((part, i) => batch.set(doc(chunksRef, `chunk_${i}`), { data: part }));
    batch.set(docRef, { chunked: true, chunkCount: parts.length, updatedAt: serverTimestamp() });
    await batch.commit();

    // Dọn chunk dư ra nếu lần ghi này ít chunk hơn lần trước — chạy nền, không chặn ghi chính.
    getDocs(chunksRef)
        .then(snap => {
            const stale = snap.docs.filter(d => {
                const idx = parseInt(d.id.replace('chunk_', ''), 10);
                return Number.isNaN(idx) || idx >= parts.length;
            });
            return stale.length > 0 ? Promise.all(stale.map(d => deleteDoc(d.ref))) : undefined;
        })
        .catch(err => console.warn(`[Heavy Sync] Không dọn được chunk dư của "${key}":`, err));
};

// BUG FIX (rà soát Check Thưởng, tiếp nối Mục 60 implementation_plan.md): cơ chế coalesce +
// hàng đợi tuần tự cho khóa nặng trước đây chỉ tồn tại dưới dạng React ref BÊN TRONG hook
// useCloudSync() (1 instance/tab qua SyncContext). Nhưng hooks/useDataManagement.ts (hook KHÁC,
// mount riêng ở useDashboardLogic.ts) có 1 nhánh đối chiếu lúc boot app gọi thẳng
// syncHeavySettingToCloud() KHÔNG qua ref đó — nếu đúng lúc app khởi động, nhánh đối chiếu phát
// hiện 1 khóa nặng cần đẩy lên (vd còn nợ đồng bộ từ phiên trước) TRÙNG thời điểm 1 khóa KHÁC vừa
// đổi và hết debounce 2s trong useCloudSync, 2 lượt ghi Firestore (mỗi lượt có thể là batch nhiều
// chunk) chạy THỰC SỰ song song, ngoài tầm kiểm soát của hàng đợi — tái hiện đúng lớp lỗi "Write
// stream exhausted maximum allowed queued writes" mà Mục 60 đã fix (khi đó chỉ fix trong phạm vi
// useCloudSync.ts). Chuyển toàn bộ cơ chế xuống đây (module-level singleton, sống hết vòng đời
// tab, không phải React ref) để MỌI nơi gọi — dù từ hook nào — đều tự động qua ĐÚNG 1 hàng đợi
// duy nhất. `heavyWriteQueueRef` cũ trong useCloudSync.ts nối tiếp CẢ CÁC KHÓA KHÁC NHAU thành 1
// hàng (không cho 2 khóa bất kỳ ghi song song) — giữ nguyên đúng ngữ nghĩa đó ở đây.
const heavyInFlight: Record<string, boolean> = {};
const heavyPending: Record<string, boolean> = {};
let heavyWriteQueue: Promise<void> = Promise.resolve();

/** Có đang có 1 lượt ghi thật sự bay lên Firestore cho khóa này không (không tính đang chờ debounce). */
export const isHeavyKeyInFlight = (key: string): boolean => !!heavyInFlight[key];

/**
 * Đọc giá trị mới nhất từ IndexedDB rồi đồng bộ lên Firestore qua hàng đợi tuần tự dùng chung cho
 * MỌI khóa nặng (không cho 2 lượt ghi bất kỳ chạy song song, coalesce nhiều lần đổi liên tiếp của
 * CÙNG 1 khóa thành đúng 1 lượt ghi cuối). Không throw — lỗi tự bắt + log, giống hệt hành vi cũ.
 * Fire-and-forget theo đúng cách các call site hiện tại đang dùng (không ai await kết quả).
 */
export const syncHeavySettingToCloudQueued = (user: User, key: string): void => {
    if (heavyInFlight[key]) {
        // Đã có 1 lượt ghi khóa này đang bay lên Firestore — không xếp chồng thêm, chỉ nhớ để
        // đồng bộ lại 1 lần nữa (đọc giá trị MỚI NHẤT) ngay sau khi lượt hiện tại xong.
        heavyPending[key] = true;
        return;
    }
    heavyInFlight[key] = true;
    heavyWriteQueue = heavyWriteQueue.then(async () => {
        try {
            do {
                heavyPending[key] = false;
                const value = await getSetting(key);
                if (value !== null) {
                    await syncHeavySettingToCloud(user, key, value);
                    // Xem giải thích ở touchLastModified() trong services/dbService/core.ts —
                    // chốt lastModified_ cục bộ về thời điểm ghi Firestore vừa xong, phòng khi
                    // guard isHeavyKeyInFlight ở useCloudSync.ts vẫn lọt self-echo (payload lớn).
                    await touchLastModified(key, Date.now());
                }
            } while (heavyPending[key]);
        } catch (err) {
            console.error(`[Heavy Sync] Đồng bộ khóa nặng "${key}" thất bại:`, err);
        } finally {
            heavyInFlight[key] = false;
        }
    });
};

export const fetchHeavySettingsFromCloud = async (user: User): Promise<Record<string, { value: unknown, updatedAt: number }>> => {
    if (!user) return {};
    const { collection, getDocs } = await import('firebase/firestore');
    const configsRef = collection(db, 'users', user.uid, 'configs');
    const snap = await getDocs(configsRef);

    const settings: Record<string, { value: unknown, updatedAt: number }> = {};
    for (const docSnap of snap.docs) {
        const key = docSnap.id;
        const data = docSnap.data();
        if (!data) continue;

        let val: unknown;
        if (data.chunked) {
            val = await assembleChunkedHeavyValue(docSnap.ref);
            if (val === undefined) continue;
        } else {
            if (data.value === undefined) continue;
            val = restoreNestedArraysFromFirestore(data.value);
        }

        const valWithConfig = val as { config?: { groups?: ProductConfigGroups } } | undefined;
        if (key === 'productConfig' && valWithConfig && valWithConfig.config && valWithConfig.config.groups) {
            const restoredGroups: { [key: string]: Set<string> } = {};
            for (const [gKey, gVal] of Object.entries(valWithConfig.config.groups)) {
                restoredGroups[gKey] = new Set(gVal as string[]);
            }
            valWithConfig.config.groups = restoredGroups;
            val = valWithConfig;
        }
        settings[key] = {
            value: val,
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.savedAt || 0)
        };
    }
    return settings;
};

// Đọc RIÊNG 1 document users/{uid}/configs/productConfig — nhanh hơn hẳn
// fetchHeavySettingsFromCloud() (tải cả collection configs, có thể kéo theo
// checkthuong_data/customCalendars... rất nặng) khi chỉ cần mỗi productConfig
// (dùng cho luồng khởi động ở hooks/useDataManagement.ts, khi IndexedDB cache trống).
export const fetchProductConfigFromCloud = async (user: User): Promise<{ config: ProductConfig; url?: string } | null> => {
    if (!user) return null;
    const docRef = doc(db, 'users', user.uid, 'configs', 'productConfig');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    if (!data || data.value === undefined) return null;

    const wrapper = data.value as { config?: { groups?: ProductConfigGroups }; url?: string };
    if (!wrapper.config || !wrapper.config.groups) return null;

    const restoredGroups: { [key: string]: Set<string> } = {};
    for (const [gKey, gVal] of Object.entries(wrapper.config.groups)) {
        restoredGroups[gKey] = new Set(gVal as unknown as string[]);
    }

    return {
        config: { ...wrapper.config, groups: restoredGroups } as ProductConfig,
        url: wrapper.url
    };
};

