import { useEffect, useMemo, useState } from 'react';
import { getRootSetting } from '../utils/db';
import { auth } from '../../../services/firebase';
import { fetchSupermarketMap } from '../services/biSupermarketMapService';
import { shortenSupermarketName } from '../utils/dashboardHelpers';
import { computeBonusByGroup, docCheckThuongPayload, type BonusCell, type CtRow, type CheckThuongPayloadV1 } from '../services/checkThuongBonus';
import { LEGACY_BI_HUB_DB_NAME } from '../../../utils/localDbScope';

export interface UseCheckThuongBonusResult {
    /** Map<tên ngành hàng chuẩn hoá, BonusCell> của siêu thị đang chọn; null khi chưa có dữ liệu Check Thưởng. */
    bonusByGroup: Map<string, BonusCell> | null;
    /** Tên file + thời điểm tải trong Check Thưởng — để ghi chú nguồn dưới bảng. */
    source: { fileName: string; uploadTime: string | null } | null;
}

interface CheckThuongPayload {
    competitionData?: unknown;
    fileName?: string;
    uploadTime?: string | null;
    code1?: string;
    code2?: string;
    lastModified?: number;
}

function getCheckThuongFromIframeDb(): Promise<CheckThuongPayload | null> {
    return new Promise((resolve) => {
        try {
            if (typeof window === 'undefined' || !window.indexedDB) return resolve(null);
            const request = indexedDB.open('keyval-store', 1);
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('keyval')) {
                    db.close();
                    resolve(null);
                    return;
                }
                const tx = db.transaction('keyval', 'readonly');
                const store = tx.objectStore('keyval');
                const getReq = store.get('checkthuong_data');
                getReq.onsuccess = () => {
                    db.close();
                    resolve(getReq.result || null);
                };
                getReq.onerror = () => {
                    db.close();
                    resolve(null);
                };
            };
            request.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

function getCheckThuongFromLegacyDb(): Promise<CheckThuongPayload | null> {
    return new Promise((resolve) => {
        try {
            if (typeof window === 'undefined' || !window.indexedDB) return resolve(null);
            const request = indexedDB.open(LEGACY_BI_HUB_DB_NAME);
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('settings')) {
                    db.close();
                    resolve(null);
                }
                const tx = db.transaction('settings', 'readonly');
                const getReq = tx.objectStore('settings').get('checkthuong_data');
                getReq.onsuccess = () => {
                    db.close();
                    resolve(getReq.result || null);
                };
                getReq.onerror = () => {
                    db.close();
                    resolve(null);
                };
            };
            request.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

async function fetchCheckThuongPayload(): Promise<CheckThuongPayloadV1 | null> {
    // Mọi nguồn đi qua adapter docCheckThuongPayload (A29): bản cũ nâng lên v1, bản hỏng bỏ qua.
    // 1. Thử từ database scoped của user hiện tại
    try {
        const root = docCheckThuongPayload(await getRootSetting<unknown>('checkthuong_data'));
        if (root) return root;
    } catch {}

    // 2. Thử từ database 'keyval-store' của iframe Check Thưởng (nơi public/check-thuong.html ghi)
    try {
        const fromIframe = docCheckThuongPayload(await getCheckThuongFromIframeDb());
        if (fromIframe) return fromIframe;
    } catch {}

    // 3. Thử từ database dùng chung cũ BI_HUB_DATABASE_V2
    try {
        const fromLegacy = docCheckThuongPayload(await getCheckThuongFromLegacyDb());
        if (fromLegacy) return fromLegacy;
    } catch {}

    return null;
}

/**
 * Cột THƯỞNG cho bảng Thi đua siêu thị: đọc `checkthuong_data` (Check Thưởng lưu cùng
 * IndexedDB), tải lại khi Check Thưởng ghi mới (root saveSetting bắn `ycx-setting-changed`).
 * Chỉ tải khi `enabled` (đang ở Luỹ kế) — file ~26k dòng, không parse khi không cần.
 */
export function useCheckThuongBonus(activeSupermarket: string, enabled: boolean): UseCheckThuongBonusResult {
    const [payload, setPayload] = useState<CheckThuongPayloadV1 | null>(null);
    const [supermarketMap, setSupermarketMap] = useState<Record<string, string>>({});
    const [version, setVersion] = useState(0);

    useEffect(() => {
        const onChange = (e: Event) => {
            const key = (e as CustomEvent<{ key?: string }>).detail?.key;
            if (key === 'checkthuong_data') setVersion(v => v + 1);
        };
        const onCloudSync = () => setVersion(v => v + 1);
        const onMsg = (e: MessageEvent) => {
            // Chỉ nhận từ trang CÙNG NGUỒN (iframe Check thưởng của app) — trước đây nhận từ BẤT KỲ cửa sổ
            // nào: trang lạ mở app trong khung/cửa sổ con có thể bơm số thưởng giả vào bảng Thi đua (A29).
            if (e.origin !== window.location.origin) return;
            if (e.data?.type === 'CHECK_THUONG_STATE_CHANGED' && e.data.payload) {
                const p = docCheckThuongPayload(e.data.payload);
                if (p) setPayload(p);
            }
        };
        window.addEventListener('ycx-setting-changed', onChange);
        window.addEventListener('check-thuong-cloud-sync', onCloudSync);
        window.addEventListener('message', onMsg);
        return () => {
            window.removeEventListener('ycx-setting-changed', onChange);
            window.removeEventListener('check-thuong-cloud-sync', onCloudSync);
            window.removeEventListener('message', onMsg);
        };
    }, []);

    useEffect(() => {
        if (!enabled) return;
        let alive = true;
        fetchCheckThuongPayload()
            .then(p => { if (alive && p) setPayload(p); })
            .catch(() => {});
        fetchSupermarketMap(auth.currentUser?.uid).then(m => { if (alive) setSupermarketMap(m || {}); }).catch(() => {});
        return () => { alive = false; };
    }, [enabled, version]);

    const rows = useMemo<CtRow[]>(() => (payload ? payload.competitionData : []), [payload]);

    const bonusByGroup = useMemo(() => {
        if (!enabled || rows.length === 0 || !activeSupermarket) return null;
        const storeCode = supermarketMap[activeSupermarket]
            || supermarketMap[shortenSupermarketName(activeSupermarket)]
            || payload?.code1
            || null;
        const map = computeBonusByGroup(rows, activeSupermarket, storeCode);
        return map.size > 0 ? map : null;
    }, [enabled, rows, activeSupermarket, supermarketMap, payload]);

    const source = payload && rows.length > 0
        ? { fileName: String(payload.fileName || 'Check Thưởng'), uploadTime: payload.uploadTime || null }
        : null;

    return { bonusByGroup, source };
}

