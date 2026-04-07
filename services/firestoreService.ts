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
    const configRef = doc(db, 'users', user.uid, 'settings', 'configuration');

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

export const clearCloudSettings = async (user: User) => {
    if (!user) return;
    const { deleteDoc } = await import('firebase/firestore');
    const configRef = doc(db, 'users', user.uid, 'settings', 'configuration');
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

export const subscribeSharedConfigs = (
    currentUserRole: string | null | undefined,
    currentDepartmentId: string | undefined,
    onData: (configs: SharedConfig[]) => void
) => {
    let activeUnsubscribe: (() => void) | null = null;
    
    import('firebase/firestore').then(({ collection, onSnapshot }) => {
        const unsubscribe = onSnapshot(collection(db, 'shared_configs'), (snapshot) => {
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
            
            onData(configs);
        });
        activeUnsubscribe = unsubscribe;
    });

    return () => {
        if (activeUnsubscribe) activeUnsubscribe();
    };
};

export const deleteSharedConfig = async (configId: string) => {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'shared_configs', configId));
};
