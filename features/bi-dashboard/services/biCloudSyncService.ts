/**
 * BI Cloud Sync Service — Đồng bộ & nạp dữ liệu Report BI chủ động từ Firebase Cloud Firestore.
 * 
 * Cho phép người dùng chủ động tải về dữ liệu cấu hình, số liệu Realtime & Luỹ kế,
 * danh sách nhân viên, ngành hàng và mốc thời gian cập nhật mới nhất từ Firebase về thiết bị.
 * 
 * Tuân thủ quy tắc cách ly kiến trúc (RULES.md / CLAUDE.md):
 * - Chỉ import instance db từ services/firebase.ts.
 * - Không import chéo logic nghiệp vụ của các module khác.
 */

import type { User } from 'firebase/auth';
import { collection, getDocs, query, orderBy, type DocumentReference } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { configStore } from '../store/configStore';
import { getDb } from './dbService';
import { fetchAllowedSummaryLuyKeText, fetchAllowedCompetitionLuyKeData } from './biDataService';
import { fetchSupermarketMap } from './biSupermarketMapService';

const SETTINGS_STORE = 'settings';
const BI_PREFIX = 'bi_';
const NESTED_ARRAY_MARKER = '_is_nested_array_';

export interface BiCloudSyncResult {
    count: number;
    latestTimestamp: string | null;
    keys: string[];
}

/**
 * Kiểm tra xem một key trên Firestore có thuộc về dữ liệu hoặc cấu hình của phân hệ Report BI không.
 */
export function isBiConfigKey(key: string): boolean {
    if (key.startsWith('bi_') || key === 'biSupermarketMap' || key.startsWith('supermarket-map-')) {
        return true;
    }
    const unprefixed = key.startsWith('bi_') ? key.substring(3) : key;
    if (
        unprefixed.startsWith('summary-') ||
        unprefixed.startsWith('competition-') ||
        unprefixed.startsWith('config-') ||
        unprefixed.startsWith('comptarget-') ||
        unprefixed.startsWith('targethero-') ||
        unprefixed.startsWith('manual-dept-mapping-') ||
        unprefixed.startsWith('hidden-employees-') ||
        unprefixed.startsWith('hidden-cols-') ||
        unprefixed.startsWith('hidden-supermarkets-') ||
        unprefixed.startsWith('global-hidden-') ||
        unprefixed.startsWith('global-industry-kpi-') ||
        unprefixed.startsWith('global-compare-') ||
        unprefixed.startsWith('custom-') ||
        unprefixed.startsWith('bonus-') ||
        unprefixed.startsWith('snapshot-') ||
        unprefixed.startsWith('avatar-') ||
        unprefixed.startsWith('nhanvien-') ||
        unprefixed.startsWith('prev-month-') ||
        unprefixed === 'last-updates-list' ||
        unprefixed === 'supermarket-list' ||
        unprefixed === 'analysis-employees-list' ||
        unprefixed === 'tile-custom-links' ||
        unprefixed === 'dashboard-main-tab' ||
        unprefixed === 'dashboard-sub-tab' ||
        unprefixed === 'dashboard-active-supermarket'
    ) {
        return true;
    }
    return false;
}

/**
 * Phục hồi các mảng lồng nhau đã được mã hóa an toàn khi lưu vào Firestore.
 */
export function restoreNestedArrays(value: unknown): unknown {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(restoreNestedArrays);
    const obj = value as Record<string, unknown>;
    if (NESTED_ARRAY_MARKER in obj && Array.isArray(obj._data_)) {
        return restoreNestedArrays(obj._data_);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        out[k] = restoreNestedArrays(v);
    }
    return out;
}

/**
 * Ghép nối các chunk dữ liệu nếu payload vượt quá giới hạn dung lượng document Firestore.
 */
export async function assembleChunkedValue(docRef: DocumentReference): Promise<unknown> {
    const chunksRef = collection(docRef, 'chunks');
    const q = query(chunksRef, orderBy('index', 'asc'));
    const chunksSnap = await getDocs(q);
    if (chunksSnap.empty) return undefined;
    const serialized = chunksSnap.docs.map(d => d.data().chunk as string).join('');
    try {
        return restoreNestedArrays(JSON.parse(serialized));
    } catch {
        return undefined;
    }
}

/**
 * Ghi các cấu hình tải từ Cloud vào IndexedDB (store: settings) & cập nhật RAM cache configStore.
 * Dùng mốc thời gian từ Cloud để tránh bị hiểu nhầm là thay đổi mới cục bộ cần đẩy lại Cloud.
 */
export async function saveBiSettingsFromCloud(
    items: { key: string; value: unknown; updatedAt: number }[],
    uid: string
): Promise<void> {
    if (items.length === 0) return;
    const idb = await getDb();

    return new Promise((resolve, reject) => {
        const tx = idb.transaction([SETTINGS_STORE], 'readwrite');
        const store = tx.objectStore(SETTINGS_STORE);

        let supermarketMapValue: unknown = undefined;

        items.forEach(item => {
            const rawKey = item.key.startsWith(BI_PREFIX) ? item.key.slice(BI_PREFIX.length) : item.key;
            const prefixedKey = `${BI_PREFIX}${rawKey}`;

            store.put(item.value, prefixedKey);
            store.put(item.updatedAt, `lastModified_${prefixedKey}`);

            if (item.key === 'biSupermarketMap' || rawKey === 'biSupermarketMap') {
                const mapData = (item.value as { map?: unknown })?.map || item.value;
                supermarketMapValue = mapData;
                store.put(mapData, `${BI_PREFIX}supermarket-map-${uid}`);
                store.put(item.updatedAt, `lastModified_${BI_PREFIX}supermarket-map-${uid}`);
            }
        });

        tx.oncomplete = () => {
            items.forEach(item => {
                const rawKey = item.key.startsWith(BI_PREFIX) ? item.key.slice(BI_PREFIX.length) : item.key;
                const prefixedKey = `${BI_PREFIX}${rawKey}`;

                configStore.setCache(rawKey, item.value);
                configStore.setLoaded(rawKey, true);

                if (rawKey !== prefixedKey) {
                    configStore.setCache(prefixedKey, item.value);
                    configStore.setLoaded(prefixedKey, true);
                }

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('indexeddb-change', {
                        detail: { key: rawKey, source: 'cloud-sync' }
                    }));
                }
            });

            if (supermarketMapValue && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('bi-supermarket-map-changed', {
                    detail: { userId: uid, map: supermarketMapValue }
                }));
            }

            resolve();
        };

        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
}

/**
 * Tải chủ động toàn bộ dữ liệu Report BI của người dùng từ Firebase Cloud:
 * 1. Đọc collection `users/{uid}/configs` và nạp toàn bộ cấu hình, số liệu, mốc thời gian BI.
 * 2. Cập nhật bảng map siêu thị `biSupermarketMap`.
 * 3. Nếu người dùng có quyền Kho (`allowedKhos`), làm mới dữ liệu Luỹ kế dùng chung `biData/{maKho}`.
 */
export async function pullBiDataFromCloud(
    user: User,
    allowedKhos: string[] = []
): Promise<BiCloudSyncResult> {
    if (!user || user.isAnonymous) {
        throw new Error('Vui lòng đăng nhập tài khoản Google để tải dữ liệu từ Cloud.');
    }

    const configsRef = collection(db, 'users', user.uid, 'configs');
    const snap = await getDocs(configsRef);

    const itemsToSave: { key: string; value: unknown; updatedAt: number }[] = [];
    const keys: string[] = [];
    let latestTimestamp: string | null = null;

    for (const docSnap of snap.docs) {
        const key = docSnap.id;
        if (!isBiConfigKey(key)) continue;

        const data = docSnap.data();
        if (!data) continue;

        let val: unknown;
        if (data.chunked) {
            val = await assembleChunkedValue(docSnap.ref);
            if (val === undefined) continue;
        } else {
            if (data.value === undefined && data.map === undefined) continue;
            val = data.value !== undefined ? restoreNestedArrays(data.value) : data;
        }

        const updatedAt = (data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.savedAt) || Date.now();
        itemsToSave.push({ key, value: val, updatedAt });
        keys.push(key);

        // Trích xuất timestamp hiển thị mới nhất nếu là một trong các key thời gian
        const rawKey = key.startsWith(BI_PREFIX) ? key.slice(BI_PREFIX.length) : key;
        if (
            (rawKey === 'summary-realtime-ts' ||
             rawKey === 'competition-realtime-ts' ||
             rawKey === 'summary-luy-ke-ts' ||
             rawKey === 'competition-luy-ke-ts') &&
            typeof val === 'string' &&
            val.trim()
        ) {
            if (!latestTimestamp) {
                latestTimestamp = val.trim();
            }
        }
    }

    if (itemsToSave.length > 0) {
        await saveBiSettingsFromCloud(itemsToSave, user.uid);
    }

    // Làm mới bảng map siêu thị
    try {
        await fetchSupermarketMap(user.uid);
    } catch (e) {
        console.warn('[BI Cloud Sync] Lỗi làm mới bảng map siêu thị:', e);
    }

    // Làm mới dữ liệu Luỹ kế chia sẻ theo Kho nếu có quyền
    if (allowedKhos.length > 0) {
        try {
            await Promise.all([
                fetchAllowedSummaryLuyKeText(allowedKhos),
                fetchAllowedCompetitionLuyKeData(allowedKhos)
            ]);
        } catch (e) {
            console.warn('[BI Cloud Sync] Lỗi tải dữ liệu kho chia sẻ:', e);
        }
    }

    return {
        count: itemsToSave.length,
        latestTimestamp,
        keys
    };
}
