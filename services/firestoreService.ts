import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from 'firebase/auth';
import type { ProductConfig, CrossSellingConfig } from '../types';

export const syncToCloud = async (
    user: User, 
    payload: {
        productConfig?: ProductConfig;
        departmentMap?: Record<string, string>;
        warehouseTargets?: any[];
        gtdhTargets?: any[];
        crossSellingConfig?: CrossSellingConfig;
    }
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
    const configRef = doc(db, 'users', user.uid, 'settings', 'configuration');

    // Cập nhật timestamp lần sync cuối
    await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        lastSync: serverTimestamp()
    }, { merge: true });

    // Cập nhật configuration
    await setDoc(configRef, {
        ...safePayload,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

export const fetchFromCloud = async (user: User) => {
    if (!user) throw new Error("Chưa đăng nhập, không thể tải dữ liệu.");
    
    const configRef = doc(db, 'users', user.uid, 'settings', 'configuration');
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
