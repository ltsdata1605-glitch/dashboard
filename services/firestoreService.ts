import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
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

    await setDoc(docRef, {
        value: firestoreSafeValue,
        updatedAt: serverTimestamp()
    }, { merge: false });
};

export const fetchHeavySettingsFromCloud = async (user: User): Promise<Record<string, { value: unknown, updatedAt: number }>> => {
    if (!user) return {};
    const { collection, getDocs } = await import('firebase/firestore');
    const configsRef = collection(db, 'users', user.uid, 'configs');
    const snap = await getDocs(configsRef);

    const settings: Record<string, { value: unknown, updatedAt: number }> = {};
    snap.forEach(docSnap => {
        const key = docSnap.id;
        const data = docSnap.data();
        if (data && data.value !== undefined) {
            let val = restoreNestedArraysFromFirestore(data.value);
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
    });
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

