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
 * Danh sách link mặc định cho tất cả các ô theo yêu cầu
 */
export const DEFAULT_TILE_LINKS: Record<string, string> = {
    // Báo cáo Tổng hợp (Doanh thu hợp nhất)
    'summary-realtime': 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated',
    'summary-luyke': 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated',

    // Thi đua Cụm (Thi đua)
    'competition-realtime': 'https://baocao.dienmayxanh.com/dashboard/thi-dua',
    'competition-luyke': 'https://baocao.dienmayxanh.com/dashboard/thi-dua',

    // Siêu thị ngành hàng
    'industry-realtime': 'https://baocao.dienmayxanh.com/dashboard/thi-dua?sieuthi=910&timetype=1',
    'industry-luyke': 'https://baocao.dienmayxanh.com/dashboard/thi-dua?sieuthi=910',

    // NHÂN VIÊN
    'nhanvien-doanhthu': 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated',
    'nhanvien-thidua': 'https://baocao.dienmayxanh.com/dashboard/thi-dua?sieuthi=910&st=9567',

    // Trả góp nhân viên
    'nhanvien-tragop': 'https://baocao.dienmayxanh.com/dashboard/tra-cham',
};

/**
 * Nhãn tên ô mô tả thân thiện hiển thị trên modal
 */
export const TILE_LABELS: Record<string, { group: string; name: string }> = {
    'summary-realtime': { group: 'Báo cáo Tổng hợp', name: 'Realtime' },
    'summary-luyke': { group: 'Báo cáo Tổng hợp', name: 'Luỹ kế' },
    'competition-realtime': { group: 'Thi đua Cụm', name: 'Realtime' },
    'competition-luyke': { group: 'Thi đua Cụm', name: 'Luỹ kế' },
    'industry-realtime': { group: 'Siêu thị ngành hàng', name: 'Realtime' },
    'industry-luyke': { group: 'Siêu thị ngành hàng', name: 'Luỹ kế' },
    'nhanvien-doanhthu': { group: 'NHÂN VIÊN', name: 'Doanh thu' },
    'nhanvien-thidua': { group: 'NHÂN VIÊN', name: 'Thi đua NV' },
    'nhanvien-tragop': { group: 'Trả chậm nhân viên', name: 'Trả chậm NV' },
};

/**
 * Lấy link hiện tại (custom nếu có, ngược lại fallback về default)
 */
export function getTileLink(tileId: string, customLinks?: Record<string, string> | null): string {
    if (customLinks && customLinks[tileId]?.trim()) {
        return customLinks[tileId].trim();
    }
    return DEFAULT_TILE_LINKS[tileId] || 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated';
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
