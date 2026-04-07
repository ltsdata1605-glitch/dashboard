import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info' | 'error';
    read: boolean;
    createdAt: any;
}

// Bắn thông báo cá nhân
export const notifyUser = async (userId: string, payload: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    try {
        const notifRef = collection(db, 'users', userId, 'notifications');
        await addDoc(notifRef, {
            ...payload,
            read: false,
            createdAt: Timestamp.now()
        });
    } catch (e) {
        console.error("Lỗi gửi thông báo:", e);
    }
}

// Bắn thông báo về các Admin và Quản lý theo mã Kho
export const notifyAdminsAndManagers = async (departmentId: string, payload: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    try {
        const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'manager']));
        const snap = await getDocs(q);
        
        let targetUserIds: string[] = [];
        snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.role === 'admin') {
                targetUserIds.push(docSnap.id);
            } else if (data.role === 'manager' && data.departmentId && departmentId) {
                // If the manager manages the requested department, notify them
                const managerKhos = data.departmentId.split(',').map((x: string) => x.trim()).filter(Boolean);
                const reqKhos = departmentId.split(',').map(x => x.trim()).filter(Boolean);
                if (managerKhos.some((k: string) => reqKhos.includes(k))) {
                     targetUserIds.push(docSnap.id);
                }
            }
        });

        targetUserIds = Array.from(new Set(targetUserIds)); // Khử trùng lặp
        
        // Bắn Push Notifications cho từng người
        await Promise.all(targetUserIds.map(uid => notifyUser(uid, payload)));
    } catch (e) {
         console.error("Lỗi gửi thông báo nhóm quản trị:", e);
    }
}

export const markAsRead = async (userId: string, notificationId: string) => {
    try {
        const ref = doc(db, 'users', userId, 'notifications', notificationId);
        await updateDoc(ref, { read: true });
    } catch (e) {}
}

export const markAllAsRead = async (userId: string) => {
    try {
        const q = query(collection(db, 'users', userId, 'notifications'), where('read', '==', false));
        const snap = await getDocs(q);
        
        const batchUpdates = snap.docs.map(d => 
            updateDoc(doc(db, 'users', userId, 'notifications', d.id), { read: true })
        );
        await Promise.all(batchUpdates);
    } catch (e) {}
}
