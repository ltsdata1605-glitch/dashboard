import { useEffect, useMemo, useState } from 'react';
import { getRootSetting } from '../utils/db';
import { auth } from '../../../services/firebase';
import { fetchSupermarketMap } from '../services/biSupermarketMapService';
import { shortenSupermarketName } from '../utils/dashboardHelpers';
import { computeBonusByGroup, unwrapCheckThuongRows, type BonusCell, type CtRow } from '../services/checkThuongBonus';

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
    lastModified?: number;
}

/**
 * Cột THƯỞNG cho bảng Thi đua siêu thị: đọc `checkthuong_data` (Check Thưởng lưu cùng
 * IndexedDB), tải lại khi Check Thưởng ghi mới (root saveSetting bắn `ycx-setting-changed`).
 * Chỉ tải khi `enabled` (đang ở Luỹ kế) — file ~26k dòng, không parse khi không cần.
 */
export function useCheckThuongBonus(activeSupermarket: string, enabled: boolean): UseCheckThuongBonusResult {
    const [payload, setPayload] = useState<CheckThuongPayload | null>(null);
    const [supermarketMap, setSupermarketMap] = useState<Record<string, string>>({});
    const [version, setVersion] = useState(0);

    useEffect(() => {
        const onChange = (e: Event) => {
            const key = (e as CustomEvent<{ key?: string }>).detail?.key;
            if (key === 'checkthuong_data') setVersion(v => v + 1);
        };
        window.addEventListener('ycx-setting-changed', onChange);
        return () => window.removeEventListener('ycx-setting-changed', onChange);
    }, []);

    useEffect(() => {
        if (!enabled) return;
        let alive = true;
        getRootSetting<CheckThuongPayload>('checkthuong_data')
            .then(p => { if (alive) setPayload(p && typeof p === 'object' ? p : null); })
            .catch(() => { if (alive) setPayload(null); });
        fetchSupermarketMap(auth.currentUser?.uid).then(m => { if (alive) setSupermarketMap(m || {}); }).catch(() => {});
        return () => { alive = false; };
    }, [enabled, version]);

    const rows = useMemo<CtRow[]>(() => (payload ? unwrapCheckThuongRows(payload) : []), [payload]);

    const bonusByGroup = useMemo(() => {
        if (!enabled || rows.length === 0 || !activeSupermarket) return null;
        const storeCode = supermarketMap[activeSupermarket] || supermarketMap[shortenSupermarketName(activeSupermarket)] || null;
        const map = computeBonusByGroup(rows, activeSupermarket, storeCode);
        return map.size > 0 ? map : null;
    }, [enabled, rows, activeSupermarket, supermarketMap]);

    const source = payload && rows.length > 0
        ? { fileName: String(payload.fileName || 'Check Thưởng'), uploadTime: payload.uploadTime || null }
        : null;

    return { bonusByGroup, source };
}
