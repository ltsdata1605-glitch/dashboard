import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';

// Bản zone-local của syncScheduleToCloud/fetchScheduleFromCloud (services/firestoreService.ts),
// đọc/ghi đúng path 'users/{uid}/schedules/{key}' như bản gốc — cùng project Firestore
// (dashboa-7e20b) nên dữ liệu không đổi, chỉ tách JS module theo RULES.md §2.0.

export const syncScheduleToCloud = async (user: User, key: string, value: unknown) => {
    if (!user) return;
    const safeKey = key.replace(/::/g, '__');
    const docRef = doc(db, 'users', user.uid, 'schedules', safeKey);

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
