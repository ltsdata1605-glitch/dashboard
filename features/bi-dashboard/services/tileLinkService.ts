/**
 * Service quản lý và đồng bộ liên kết mặc định và liên kết tuỳ chỉnh
 * cho các ô (StatusTile) trong BI Dashboard.
 * Lưu trữ đồng thời vào IndexedDB và Firebase Firestore.
 */

import { db as dbFirestore, auth } from '../../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as db from '../utils/db';

export const TILE_CUSTOM_LINKS_KEY = 'tile-custom-links';

/**
 * Trích xuất mã kho/siêu thị từ tên siêu thị (VD: "910 - ĐML_STR_STR..." -> "910", "3717 - ĐM..." -> "3717")
 */
export function extractStoreCode(supermarketName?: string | null): string | null {
    if (!supermarketName) return null;
    const trimmed = supermarketName.trim();
    if (/^\d{3,5}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^(\d{3,5})\s*-\s*/);
    if (match) return match[1];
    return null;
}

/**
 * Danh sách link mặc định sạch (hoàn toàn không hardcode mã kho hay siêu thị cố định nào)
 */
export const DEFAULT_TILE_LINKS: Record<string, string> = {
    // Báo cáo Tổng hợp (Doanh thu hợp nhất)
    'summary-realtime': 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated',
    'summary-luyke': 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated',

    // Thi đua Cụm (Thi đua)
    'competition-realtime': 'https://baocao.dienmayxanh.com/dashboard/thi-dua',
    'competition-luyke': 'https://baocao.dienmayxanh.com/dashboard/thi-dua',

    // Siêu thị ngành hàng
    'industry-realtime': 'https://baocao.dienmayxanh.com/dashboard/thi-dua?timetype=1',
    'industry-luyke': 'https://baocao.dienmayxanh.com/dashboard/thi-dua',

    // DOANH THU NHÂN VIÊN
    'nhanvien-realtime': 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated?timetype=1',
    'nhanvien-doanhthu': 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated',

    // THI ĐUA & TRẢ CHẬM
    'nhanvien-thidua': 'https://baocao.dienmayxanh.com/dashboard/thi-dua',
    'nhanvien-tragop': 'https://baocao.dienmayxanh.com/dashboard/tra-cham',
};

/**
 * Nhãn tên ô mô tả thân thiện hiển thị trên modal
 */
export const TILE_LABELS: Record<string, { group: string; name: string }> = {
    'summary-realtime': { group: 'Báo cáo Tổng hợp', name: 'Realtime' },
    'summary-luyke': { group: 'Báo cáo Tổng hợp', name: 'Luỹ kế' },
    'competition-realtime': { group: 'Thi đua', name: 'Realtime' },
    'competition-luyke': { group: 'Thi đua', name: 'Luỹ kế' },
    'industry-realtime': { group: 'Siêu thị ngành hàng', name: 'Realtime' },
    'industry-luyke': { group: 'Siêu thị ngành hàng', name: 'Luỹ kế' },
    'nhanvien-realtime': { group: 'DOANH THU NHÂN VIÊN', name: 'Realtime' },
    'nhanvien-doanhthu': { group: 'DOANH THU NHÂN VIÊN', name: 'Luỹ kế' },
    'nhanvien-thidua': { group: 'THI ĐUA & TRẢ CHẬM', name: 'Thi đua' },
    'nhanvien-tragop': { group: 'THI ĐUA & TRẢ CHẬM', name: 'Trả chậm' },
};

/**
 * Lấy link hiện tại (custom nếu có, ngược lại fallback về default kèm tự động gắn mã kho tương ứng)
 */
export function getTileLink(
    tileId: string, 
    customLinks?: Record<string, string> | null,
    supermarketNameOrKho?: string | null
): string {
    if (customLinks && customLinks[tileId]?.trim()) {
        return customLinks[tileId].trim();
    }
    const defaultUrl = DEFAULT_TILE_LINKS[tileId] || 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated';

    // Tự động gắn tham số sieuthi=${storeCode} linh hoạt cho bất kỳ siêu thị nào
    const storeCode = extractStoreCode(supermarketNameOrKho);
    if (storeCode && (tileId === 'industry-realtime' || tileId === 'industry-luyke' || tileId === 'nhanvien-thidua')) {
        try {
            const url = new URL(defaultUrl);
            url.searchParams.set('sieuthi', storeCode);
            return url.toString();
        } catch {
            const separator = defaultUrl.includes('?') ? '&' : '?';
            return `${defaultUrl}${separator}sieuthi=${storeCode}`;
        }
    }

    return defaultUrl;
}

/**
 * Lưu liên kết tuỳ chỉnh cho 1 ô vào IndexedDB và Firebase Firestore
 */
export async function saveTileLink(tileId: string, url: string): Promise<Record<string, string>> {
    const existing = (await db.get(TILE_CUSTOM_LINKS_KEY as any)) as Record<string, string> | null || {};
    const cleanUrl = url.trim();
    const updated = {
        ...existing,
        [tileId]: cleanUrl,
    };

    // 1. Lưu vào IndexedDB (phát event indexeddb-change và ycx-setting-changed)
    await db.set(TILE_CUSTOM_LINKS_KEY as any, updated);

    // 2. Lưu trực tiếp lên Firebase Firestore nếu đã đăng nhập
    const user = auth.currentUser;
    if (user) {
        try {
            const configRef = doc(dbFirestore, 'users', user.uid, 'configs', TILE_CUSTOM_LINKS_KEY);
            await setDoc(configRef, {
                value: updated,
                updatedAt: serverTimestamp(),
                savedAt: Date.now(),
            }, { merge: true });

            const settingRef = doc(dbFirestore, 'users', user.uid, 'setting', `bi_${TILE_CUSTOM_LINKS_KEY}`);
            await setDoc(settingRef, {
                value: updated,
                updatedAt: serverTimestamp(),
                savedAt: Date.now(),
            }, { merge: true });
        } catch (err) {
            console.warn('[tileLinkService] Lưu Firestore trực tiếp lỗi (sẽ được sync bởi useCloudSync):', err);
        }
    }

    return updated;
}

/**
 * Khôi phục lại liên kết mặc định cho ô
 */
export async function resetTileLink(tileId: string): Promise<Record<string, string>> {
    const existing = (await db.get(TILE_CUSTOM_LINKS_KEY as any)) as Record<string, string> | null || {};
    const updated = { ...existing };
    delete updated[tileId];

    // 1. Lưu vào IndexedDB
    await db.set(TILE_CUSTOM_LINKS_KEY as any, updated);

    // 2. Lưu trực tiếp lên Firebase Firestore
    const user = auth.currentUser;
    if (user) {
        try {
            const configRef = doc(dbFirestore, 'users', user.uid, 'configs', TILE_CUSTOM_LINKS_KEY);
            await setDoc(configRef, {
                value: updated,
                updatedAt: serverTimestamp(),
                savedAt: Date.now(),
            }, { merge: true });

            const settingRef = doc(dbFirestore, 'users', user.uid, 'setting', `bi_${TILE_CUSTOM_LINKS_KEY}`);
            await setDoc(settingRef, {
                value: updated,
                updatedAt: serverTimestamp(),
                savedAt: Date.now(),
            }, { merge: true });
        } catch (err) {
            console.warn('[tileLinkService] Reset Firestore trực tiếp lỗi:', err);
        }
    }

    return updated;
}
