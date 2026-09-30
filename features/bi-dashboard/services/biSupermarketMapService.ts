/**
 * Bảng map "tên siêu thị trong báo cáo Report BI" → "Mã Kho", lưu RIÊNG BIỆT theo từng tài khoản (userId).
 * Mỗi tài khoản có cấu hình Mã Kho độc lập, hoàn toàn không ảnh hưởng lẫn nhau.
 * - Cloud Firestore: lưu tại doc `users/{userId}/configs/biSupermarketMap` (tuân thủ firestore.rules).
 * - Cục bộ IndexedDB: lưu tại key `supermarket-map-${userId}` qua utils/db.ts (truy xuất siêu tốc 0ms).
 */

import { auth, db } from '../../../services/firebase';
import { doc, getDoc, getDocs, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import * as dbUtils from '../utils/db';
import { shortenSupermarketName } from '../../../utils/dataUtils';

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
        cachedMap = (await dbUtils.get<SupermarketToKhoMap>(localKey)) ?? null;
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

/**
 * Trích xuất Mã Kho từ tiền tố số ở đầu tên siêu thị (nếu có).
 * Ví dụ:
 * - "1678 - ĐMM_AGI_TTO - Tri Tôn" => "1678"
 * - "7904 - ĐMS_AGI_TTO - Cô Tô" => "7904"
 * - "8231 - ĐMS_AGI_TTO - Lương An Trà" => "8231"
 * - "910 - ĐML_STR_STR - 99 Hùng Vương" => "910"
 * - "ĐMS_AGI_TTO - Cô Tô" => null
 */
export function extractKhoFromStoreName(name: string): string | null {
    if (!name || typeof name !== 'string') return null;
    const trimmed = name.trim();
    // Bắt đầu bằng 2 đến 6 chữ số, theo sau bởi dấu phân cách (-, _, :, .) hoặc khoảng trắng
    const match = trimmed.match(/^(\d{2,6})(?:\s*[-_:.]|\s+)/);
    if (match && match[1]) {
        return match[1];
    }
    // Hoặc toàn bộ chuỗi chỉ là số
    if (/^\d{2,6}$/.test(trimmed)) {
        return trimmed;
    }
    return null;
}

/**
 * Chuẩn hóa tên siêu thị để so khớp chéo (bỏ tiền tố mã số ở đầu nếu có, chuẩn hóa dấu nối và khoảng trắng).
 * Ví dụ:
 * - "1678 - ĐMM_AGI_TTO - Tri Tôn" => "đmm agi tto tri tôn"
 * - "ĐMM_AGI_TTO - Tri Tôn" => "đmm agi tto tri tôn"
 * (Hai chuỗi này trở nên giống hệt nhau để nhận diện cùng 1 siêu thị)
 */
export function normalizeStoreNameForMatching(name: string): string {
    if (!name || typeof name !== 'string') return '';
    return name
        .trim()
        .replace(/^\s*\d{2,6}\s*[-_:.]*\s*/, '')
        .toLowerCase()
        .replace(/[-_.:]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Tự động phân tích và giải quyết ánh xạ Siêu thị → Mã Kho:
 * 1. Nếu tên bắt đầu bằng số (ví dụ: "1678 - ĐMM_AGI_TTO - Tri Tôn") => Lấy số đầu "1678" làm Mã Kho.
 * 2. Nếu tên không có số nhưng sau khi bỏ mã số trùng với siêu thị đã biết => Gán cùng Mã Kho.
 *    (VD: "ĐMM_AGI_TTO - Tri Tôn" và "1678 - ĐMM_AGI_TTO - Tri Tôn" => cùng là 1678).
 * 3. Nếu tên rút gọn (shortenSupermarketName, vd "Tri Tôn", "Cô Tô", "Lương An Trà") trùng với siêu thị đã biết => Gán cùng Mã Kho.
 */
export function autoResolveSupermarketKhoMap(
    candidateNames: string[],
    existingMap: SupermarketToKhoMap = {}
): { updatedMap: SupermarketToKhoMap; newMappings: SupermarketToKhoMap; count: number } {
    const updatedMap: SupermarketToKhoMap = { ...existingMap };
    const newMappings: SupermarketToKhoMap = {};

    // 1. Tạo từ điển tra cứu từ existingMap và từ các candidate có số ở đầu
    const normNameToKho = new Map<string, string>();
    const shortNameToKho = new Map<string, string>();

    // Đưa existingMap vào từ điển tra cứu
    for (const [name, kho] of Object.entries(existingMap)) {
        if (!kho || typeof kho !== 'string' || !kho.trim()) continue;
        const cleanKho = kho.trim();
        const norm = normalizeStoreNameForMatching(name);
        if (norm && !normNameToKho.has(norm)) {
            normNameToKho.set(norm, cleanKho);
        }
        const short = shortenSupermarketName(name).trim().toLowerCase();
        if (short && !shortNameToKho.has(short)) {
            shortNameToKho.set(short, cleanKho);
        }
    }

    // Quét candidateNames để gom các siêu thị có mã số ở đầu vào từ điển
    for (const rawName of candidateNames) {
        if (!rawName || typeof rawName !== 'string') continue;
        const name = rawName.trim();
        const extractedKho = extractKhoFromStoreName(name);
        if (extractedKho) {
            const norm = normalizeStoreNameForMatching(name);
            if (norm && !normNameToKho.has(norm)) {
                normNameToKho.set(norm, extractedKho);
            }
            const short = shortenSupermarketName(name).trim().toLowerCase();
            if (short && !shortNameToKho.has(short)) {
                shortNameToKho.set(short, extractedKho);
            }
        }
    }

    // 2. Duyệt qua từng candidateName để tự động giải quyết mã kho
    for (const rawName of candidateNames) {
        if (!rawName || typeof rawName !== 'string') continue;
        const name = rawName.trim();
        if (!name || name === 'Tổng' || name === 'TỔNG') continue;

        // Nếu đã có mã kho trong updatedMap rồi thì bỏ qua
        if (updatedMap[name]) continue;

        let resolvedKho: string | null = null;

        // Ưu tiên 1: Tên bắt đầu bằng số (ví dụ: "1678 - ĐMM_AGI_TTO - Tri Tôn")
        const extractedKho = extractKhoFromStoreName(name);
        if (extractedKho) {
            resolvedKho = extractedKho;
        } else {
            // Ưu tiên 2: Trùng tên chuẩn hóa (bỏ mã số ở đầu)
            const norm = normalizeStoreNameForMatching(name);
            if (norm && normNameToKho.has(norm)) {
                resolvedKho = normNameToKho.get(norm)!;
            } else {
                // Ưu tiên 3: Trùng tên rút gọn shortenSupermarketName (ví dụ "Tri Tôn", "Cô Tô", "Lương An Trà")
                const short = shortenSupermarketName(name).trim().toLowerCase();
                if (short && shortNameToKho.has(short)) {
                    resolvedKho = shortNameToKho.get(short)!;
                }
            }
        }

        if (resolvedKho) {
            updatedMap[name] = resolvedKho;
            newMappings[name] = resolvedKho;

            // Đưa ngay vào từ điển để các candidate tiếp theo so khớp
            const norm = normalizeStoreNameForMatching(name);
            if (norm && !normNameToKho.has(norm)) {
                normNameToKho.set(norm, resolvedKho);
            }
            const short = shortenSupermarketName(name).trim().toLowerCase();
            if (short && !shortNameToKho.has(short)) {
                shortNameToKho.set(short, resolvedKho);
            }
        }
    }

    return {
        updatedMap,
        newMappings,
        count: Object.keys(newMappings).length,
    };
}

/**
 * Tự động phân tích và lưu trực tiếp vào cơ sở dữ liệu nếu có mapping mới
 */
export async function autoSyncSupermarketKhoMap(
    candidateNames: string[],
    userId?: string
): Promise<{ resolvedCount: number; updatedMap: SupermarketToKhoMap; newMappings: SupermarketToKhoMap }> {
    const currentMap = await fetchSupermarketMap(userId);
    const { updatedMap, newMappings, count } = autoResolveSupermarketKhoMap(candidateNames, currentMap);

    if (count > 0) {
        await saveSupermarketMap(updatedMap, userId);
        console.log(`[biSupermarketMapService] Đã tự động cập nhật ${count} siêu thị vào bảng map:`, newMappings);
    }

    return { resolvedCount: count, updatedMap, newMappings };
}

/**
 * Tra cứu Mã Kho từ tên siêu thị (với fallback tự động trích xuất và so khớp tên)
 */
export function getKhoFromSupermarketName(name: string, map: SupermarketToKhoMap = {}): string | null {
    if (!name || typeof name !== 'string') return null;
    const cleanName = name.trim();

    // 1. Khớp chính xác trong map
    if (map[cleanName]) return map[cleanName];

    // 2. Tự động lấy số ở đầu tên nếu có
    const extracted = extractKhoFromStoreName(cleanName);
    if (extracted) return extracted;

    // 3. Khớp theo tên chuẩn hoá (bỏ số ở đầu)
    const norm = normalizeStoreNameForMatching(cleanName);
    if (norm) {
        for (const [mapKey, kho] of Object.entries(map)) {
            if (normalizeStoreNameForMatching(mapKey) === norm) {
                return kho;
            }
        }
    }

    // 4. Khớp theo tên rút gọn shortenSupermarketName
    const short = shortenSupermarketName(cleanName).trim().toLowerCase();
    if (short) {
        for (const [mapKey, kho] of Object.entries(map)) {
            if (shortenSupermarketName(mapKey).trim().toLowerCase() === short) {
                return kho;
            }
        }
    }

    return null;
}
