import { doc, getDoc, setDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';

// Bản zone-local của syncScheduleToCloud/fetchScheduleFromCloud (services/firestoreService.ts),
// đọc/ghi đúng path 'users/{uid}/schedules/{key}' như bản gốc — cùng project Firestore
// (dashboa-7e20b) nên dữ liệu không đổi, chỉ tách JS module theo RULES.md §2.0.
//
// `db` bắt buộc lấy từ useAuth() (root AuthContext), KHÔNG dùng db của app Firebase
// riêng phan-ca (./firebase.ts) — app riêng đó có auth session KHÁC session người
// dùng thật đăng nhập, nên request sẽ có request.auth == null và bị firestore.rules
// (isSelf(uid)) từ chối. Cùng nguyên nhân đã gặp với generateWithGemini.

export const syncScheduleToCloud = async (db: Firestore, user: User, key: string, value: unknown) => {
    if (!user) return;
    const safeKey = key.replace(/::/g, '__');
    const docRef = doc(db, 'users', user.uid, 'schedules', safeKey);

    const cleanValue = JSON.parse(JSON.stringify(value, (k, v) => v === undefined ? null : v));

    await setDoc(docRef, {
        data: cleanValue,
        updatedAt: serverTimestamp()
    }, { merge: false });
};

export const fetchScheduleFromCloud = async (db: Firestore, user: User, key: string) => {
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
