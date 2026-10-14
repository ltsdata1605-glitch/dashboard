import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, Firestore } from 'firebase/firestore';
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

/**
 * Nghe realtime 1 khoá lịch (2026-10-14): máy khác lưu là máy này nhận ngay, không phải mở lại tab Phân Ca.
 * Bỏ qua lượt vọng của chính máy này (hasPendingWrites). Trả hàm huỷ.
 */
export const subscribeScheduleDoc = (
    db: Firestore, user: User, key: string,
    onCloud: (data: unknown, updatedAt: number) => void,
): (() => void) => {
    const safeKey = key.replace(/::/g, '__');
    return onSnapshot(doc(db, 'users', user.uid, 'schedules', safeKey), snap => {
        if (snap.metadata.hasPendingWrites || !snap.exists()) return;
        const d = snap.data();
        onCloud(d.data, d.updatedAt?.toMillis ? d.updatedAt.toMillis() : (d.savedAt || 0));
    }, err => console.warn(`[Cloud Sync PhanCa] Lỗi nghe realtime ${key}:`, err));
};

/**
 * Quyết định áp bản Cloud vừa đổi vào máy này — hàm thuần (tests/unit/phan-ca-realtime.test.ts).
 * - Cloud trùng bản máy đã đồng bộ lần cuối → không có gì mới (hoặc tiếng vọng).
 * - Máy có sửa CHƯA đẩy cho khoá này → giữ bản máy (mới hơn; sẽ được đẩy trong ~3 giây).
 * - Còn lại → bản Cloud mới hơn (máy khác vừa lưu) → áp.
 */
export const quyetDinhNhanTuCloud = (p: { cloud: string; daDongBo: string | undefined; trenMay: string }): 'ap' | 'bo-qua' | 'giu-may' => {
    if (p.cloud === p.daDongBo || p.cloud === p.trenMay) return 'bo-qua';
    if (p.daDongBo !== undefined && p.trenMay !== p.daDongBo) return 'giu-may';
    return 'ap';
};
