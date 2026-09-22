import { useEffect, useMemo, useState } from 'react';
import * as db from '../utils/db';
import { shortenSupermarketName } from '../utils/dashboardHelpers';
import { BonusCompareStore, BonusMetrics } from '../types/nhanVienTypes';

export interface BonusComparePeriodView {
    fromDate: string;
    toDate: string;
    data: Record<string, BonusMetrics>;
}

export interface UseBonusCompareDataResult {
    current: BonusComparePeriodView | null;
    previous: BonusComparePeriodView | null;
    updatedAt: string | null;
    loading: boolean;
}

/**
 * Đọc kho "So sánh cùng kỳ tháng" (bonus-compare-${safeName}) cho các siêu thị đang active —
 * chỉ tải khi enabled=true (đang ở chế độ xem So sánh), cùng cách với useMonthlyBonusArchive.
 * Nhiều siêu thị active: gộp data theo tên nhân viên; khoảng ngày lấy theo siêu thị đầu tiên
 * có dữ liệu (mọi siêu thị chạy chung 1 lượt nên cùng kỳ).
 */
export function useBonusCompareData(activeSupermarkets: string[], enabled: boolean): UseBonusCompareDataResult {
    const [stores, setStores] = useState<BonusCompareStore[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshVersion, setRefreshVersion] = useState(0);

    useEffect(() => {
        const handleDbChange = (event: CustomEvent) => {
            const key = event.detail?.key;
            if (typeof key === 'string' && key.startsWith('bonus-compare-')) {
                setRefreshVersion(v => v + 1);
            }
        };
        window.addEventListener('indexeddb-change', handleDbChange as EventListener);
        return () => window.removeEventListener('indexeddb-change', handleDbChange as EventListener);
    }, []);

    useEffect(() => {
        if (!enabled || activeSupermarkets.length === 0) {
            setStores([]);
            return;
        }
        let isMounted = true;
        setLoading(true);
        const safeNames = Array.from(new Set(activeSupermarkets.map(sm => shortenSupermarketName(sm))));
        (async () => {
            const perSm = await Promise.all(safeNames.map(safeName => db.get<BonusCompareStore>(`bonus-compare-${safeName}`)));
            if (isMounted) {
                setStores(perSm.filter((s): s is BonusCompareStore => !!s));
                setLoading(false);
            }
        })();
        return () => { isMounted = false; };
    }, [enabled, activeSupermarkets, refreshVersion]);

    return useMemo(() => {
        const merge = (part: 'current' | 'previous'): BonusComparePeriodView | null => {
            const withPart = stores.filter(s => s[part]);
            if (withPart.length === 0) return null;
            const data: Record<string, BonusMetrics> = {};
            withPart.forEach(s => Object.assign(data, s[part]!.data));
            return { fromDate: withPart[0][part]!.fromDate, toDate: withPart[0][part]!.toDate, data };
        };
        return {
            current: merge('current'),
            previous: merge('previous'),
            updatedAt: stores[0]?.updatedAt ?? null,
            loading,
        };
    }, [stores, loading]);
}
