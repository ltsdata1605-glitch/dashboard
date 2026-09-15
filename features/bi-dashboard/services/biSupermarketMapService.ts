/**
 * Bảng map "tên siêu thị trong báo cáo Report BI" → "Mã Kho", lưu RIÊNG BIỆT theo từng tài khoản (userId).
 * Mỗi tài khoản có cấu hình Mã Kho độc lập, hoàn toàn không ảnh hưởng lẫn nhau.
 * - Cloud Firestore: lưu tại doc `users/{userId}/configs/biSupermarketMap` (tuân thủ firestore.rules).
 * - Cục bộ IndexedDB: lưu tại key `supermarket-map-${userId}` qua utils/db.ts (truy xuất siêu tốc 0ms).
 */

import { auth, db } from '../../../services/firebase';
import { doc, getDoc, getDocs, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import * as dbUtils from '../utils/db';

export type SupermarketToKhoMap = Record<string, string>;

/**
 * Xác định UID của tài khoản hiện tại
 */
export function resolveUserId(userId?: string): string {
    if (userId && typeof userId === 'string' && userId.trim()) {
        return userId.trim();
    }
    if (auth.currentUser?.uid) {
        return auth.currentUser.uid;
    }
    return 'guest';
}

/**
 * Đọc bảng map siêu thị riêng của tài khoản hiện tại:
 * 1. Đọc nhanh từ IndexedDB (0ms).
 * 2. Đọc từ Firestore users/{uid}/configs/biSupermarketMap để đồng bộ từ Cloud.
 * 3. Nếu tài khoản chưa có cấu hình và chưa từng di chuyển từ legacy, hỗ trợ khởi tạo dữ liệu một lần.
 */
export async function fetchSupermarketMap(userId?: string): Promise<SupermarketToKhoMap> {
    const uid = resolveUserId(userId);
    const localKey = `supermarket-map-${uid}`;

    // 1. Kiểm tra IndexedDB cục bộ của chính tài khoản này
    let cachedMap: SupermarketToKhoMap | null = null;
    try {
        cachedMap = await dbUtils.get<SupermarketToKhoMap>(localKey);
    } catch (e) {
        console.warn('[biSupermarketMapService] Lỗi đọc IndexedDB:', e);
    }

    if (cachedMap && typeof cachedMap === 'object' && Object.keys(cachedMap).length > 0) {
        // Đồng bộ ngầm từ Firestore nếu đang đăng nhập
        if (uid !== 'guest') {
            syncFromCloudInBackground(uid, localKey).catch(() => {});
        }
        return cachedMap;
    }

    // 2. Nếu local chưa có, tải từ Firestore của tài khoản
    if (uid !== 'guest') {
        try {
            const userConfigRef = doc(db, 'users', uid, 'configs', 'biSupermarketMap');
            const snap = await getDoc(userConfigRef);
            if (snap.exists()) {
                const cloudMap = (snap.data()?.map || {}) as SupermarketToKhoMap;
                await dbUtils.set(localKey, cloudMap);
                return cloudMap;
            }
        } catch (err) {
            console.warn('[biSupermarketMapService] Lỗi đọc Firestore user config:', err);
        }
    }

    // 3. Fallback di chuyển dữ liệu cũ (chỉ chạy 1 lần cho người dùng đầu tiên nếu chưa có cấu hình riêng)
    try {
        const migrationKey = 'bi_migrated_legacy_map';
        if (typeof window !== 'undefined' && !localStorage.getItem(migrationKey) && uid !== 'guest') {
            const legacySnap = await getDocs(collection(db, 'biSupermarketMap'));
            const legacyMap: SupermarketToKhoMap = {};
            legacySnap.forEach(docSnap => {
                const maKho = docSnap.id;
                const names = docSnap.data()?.names;
                if (Array.isArray(names)) {
                    for (const name of names) {
                        if (typeof name === 'string' && name) legacyMap[name] = maKho;
                    }
                }
            });
            if (Object.keys(legacyMap).length > 0) {
                localStorage.setItem(migrationKey, 'true');
                await saveSupermarketMap(legacyMap, uid);
                return legacyMap;
            }
        }
    } catch (e) {
        console.warn('[biSupermarketMapService] Fallback legacy map error:', e);
    }

    return cachedMap || {};
}

/**
 * Đồng bộ ngầm từ Firestore về IndexedDB
 */
async function syncFromCloudInBackground(uid: string, localKey: string): Promise<void> {
    try {
        const userConfigRef = doc(db, 'users', uid, 'configs', 'biSupermarketMap');
        const snap = await getDoc(userConfigRef);
        if (snap.exists()) {
            const cloudMap = (snap.data()?.map || {}) as SupermarketToKhoMap;
            await dbUtils.set(localKey, cloudMap);
        }
    } catch {
        // im lặng trong background
    }
}

/**
 * Lưu toàn bộ bảng map của tài khoản vào cả IndexedDB và Firestore
 */
export async function saveSupermarketMap(map: SupermarketToKhoMap, userId?: string): Promise<void> {
    const uid = resolveUserId(userId);
    const localKey = `supermarket-map-${uid}`;

    // 1. Lưu vào IndexedDB cục bộ
    await dbUtils.set(localKey, map);

    // 2. Lưu lên Firestore của tài khoản hiện tại (users/{uid}/configs/biSupermarketMap)
    if (uid !== 'guest') {
        try {
            const userConfigRef = doc(db, 'users', uid, 'configs', 'biSupermarketMap');
            // QUAN TRỌNG: KHÔNG dùng { merge: true } vì Firestore merge: true sẽ giữ lại
            // các key cũ đã bị xoá trong object map lồng nhau. Phải ghi đè toàn bộ doc
            // để key bị xoá thật sự biến mất khỏi Firestore.
            await setDoc(userConfigRef, {
                map,
                updatedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('[biSupermarketMapService] Lỗi lưu Firestore:', err);
        }
    }

    // 3. Bắn event thông báo cập nhật cho giao diện nội bộ
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bi-supermarket-map-changed', {
            detail: { userId: uid, map }
        }));
    }
}

/**
 * Thêm hoặc gán 1 siêu thị vào Mã Kho trong cấu hình của tài khoản
 */
export async function addSupermarketNameToKho(maKho: string, name: string, userId?: string): Promise<void> {
    const currentMap = await fetchSupermarketMap(userId);
    const updated: SupermarketToKhoMap = { ...currentMap, [name]: maKho };
    await saveSupermarketMap(updated, userId);
}

/**
 * Xoá sạch toàn bộ bảng map siêu thị của tài khoản (dùng cho Làm mới tất cả)
 */
export async function clearSupermarketMap(userId?: string): Promise<void> {
    await saveSupermarketMap({}, userId);
}

/**
 * Xoá 1 siêu thị khỏi bảng map của tài khoản
 * Hỗ trợ các kiểu gọi:
 * - removeSupermarketNameFromKho(maKho, name, userId)
 * - removeSupermarketNameFromKho(name, userId)
 */
export async function removeSupermarketNameFromKho(
    maKhoOrName: string,
    nameOrUserId?: string,
    optionalUserId?: string
): Promise<void> {
    let nameToRemove: string;
    let targetUserId: string | undefined;

    if (optionalUserId !== undefined) {
        // Gọi kiểu 3 đối số: (maKho, name, userId)
        nameToRemove = nameOrUserId || maKhoOrName;
        targetUserId = optionalUserId;
    } else if (nameOrUserId !== undefined) {
        // Gọi kiểu 2 đối số: có thể là (maKho, name) hoặc (name, userId)
        if (
            nameOrUserId.includes(' - ') || 
            nameOrUserId.startsWith('ĐM') || 
            nameOrUserId.startsWith('TGD') || 
            nameOrUserId.startsWith('DML') || 
            nameOrUserId.startsWith('DMM')
        ) {
            nameToRemove = nameOrUserId;
            targetUserId = undefined;
        } else {
            nameToRemove = maKhoOrName;
            targetUserId = nameOrUserId;
        }
    } else {
        nameToRemove = maKhoOrName;
        targetUserId = undefined;
    }

    const currentMap = await fetchSupermarketMap(targetUserId);
    const updated: SupermarketToKhoMap = { ...currentMap };
    delete updated[nameToRemove];
    await saveSupermarketMap(updated, targetUserId);
}

/**
 * Đổi Mã Kho cho 1 siêu thị trong cấu hình của tài khoản
 */
export async function moveSupermarketNameToKho(
    _fromMaKho: string,
    toMaKho: string,
    name: string,
    userId?: string
): Promise<void> {
    const currentMap = await fetchSupermarketMap(userId);
    const updated: SupermarketToKhoMap = { ...currentMap, [name]: toMaKho };
    await saveSupermarketMap(updated, userId);
}
