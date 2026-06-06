import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from 'firebase/auth';
import type { ProductConfig, CrossSellingConfig } from '../types';

export const syncToCloud = async (
    user: User, 
    payload: any
) => {
    if (!user) throw new Error("Chưa đăng nhập, không thể đồng bộ.");

    // Deep clone to safely convert Set objects to Arrays for Firebase compatibility
    const safePayload = { ...payload };
    if (safePayload.productConfig && safePayload.productConfig.groups) {
        const clonedGroups: { [key: string]: string[] } = {};
        for (const [key, value] of Object.entries(safePayload.productConfig.groups)) {
            clonedGroups[key] = value instanceof Set ? Array.from(value) : (value as any);
        }
        safePayload.productConfig = {
            ...safePayload.productConfig,
            groups: clonedGroups as any // We temporarily cast to any to bypass the Set local type
        };
    }

    const userRef = doc(db, 'users', user.uid);
    const configRef = doc(db, 'users', user.uid, 'setting', 'configuration');

    // Cập nhật timestamp lần sync cuối
    await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        lastSync: serverTimestamp()
    }, { merge: true });

    // Lọc bỏ các giá trị undefined vì Firestore không hỗ trợ
    const cleanPayload: any = {};
    for (const [key, value] of Object.entries(safePayload)) {
        if (value !== undefined) {
            cleanPayload[key] = value;
        }
    }

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
    createdAt: any;
    payload: any;
}

export const shareCloudConfig = async (
    user: User,
    userRole: string,
    departmentId: string,
    description: string,
    payload: any
) => {
    if (!user) throw new Error("Chưa đăng nhập, không thể chia sẻ.");

    const safePayload = { ...payload };
    if (safePayload.productConfig && safePayload.productConfig.groups) {
        const clonedGroups: { [key: string]: string[] } = {};
        for (const [key, value] of Object.entries(safePayload.productConfig.groups)) {
            clonedGroups[key] = value instanceof Set ? Array.from(value) : (value as any);
        }
        safePayload.productConfig = {
            ...safePayload.productConfig,
            groups: clonedGroups as any
        };
    }

    const cleanPayload: any = {};
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

export const syncScheduleToCloud = async (user: User, key: string, value: any) => {
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
        return snap.data().data;
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
    'topSellerAnalysisHistory'
]);

export const syncHeavySettingToCloud = async (user: User, key: string, value: any) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'configs', key);
    
    // Safety check for Set conversion (like in productConfig.groups)
    let safeValue = value;
    if (key === 'productConfig' && value && value.config && value.config.groups) {
        const clonedGroups: { [key: string]: string[] } = {};
        for (const [gKey, gVal] of Object.entries(value.config.groups)) {
            clonedGroups[gKey] = gVal instanceof Set ? Array.from(gVal) : (gVal as any);
        }
        safeValue = {
            ...value,
            config: {
                ...value.config,
                groups: clonedGroups
            }
        };
    }
    
    const cleanValue = JSON.parse(JSON.stringify(safeValue, (k, v) => v === undefined ? null : v));
    
    await setDoc(docRef, {
        value: cleanValue,
        updatedAt: serverTimestamp()
    }, { merge: false });
};

export const fetchHeavySettingsFromCloud = async (user: User): Promise<Record<string, { value: any, updatedAt: number }>> => {
    if (!user) return {};
    const { collection, getDocs } = await import('firebase/firestore');
    const configsRef = collection(db, 'users', user.uid, 'configs');
    const snap = await getDocs(configsRef);
    
    const settings: Record<string, any> = {};
    snap.forEach(docSnap => {
        const key = docSnap.id;
        const data = docSnap.data();
        if (data && data.value !== undefined) {
            let val = data.value;
            if (key === 'productConfig' && val && val.config && val.config.groups) {
                const restoredGroups: { [key: string]: Set<string> } = {};
                for (const [gKey, gVal] of Object.entries(val.config.groups)) {
                    restoredGroups[gKey] = new Set(gVal as string[]);
                }
                val.config.groups = restoredGroups;
            }
            settings[key] = {
                value: val,
                updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.savedAt || 0)
            };
        }
    });
    return settings;
};

