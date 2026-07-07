import { useEffect, useMemo, useState } from 'react';
import * as db from '../utils/db';
import { shortenSupermarketName } from '../utils/dashboardHelpers';
import { BonusMetrics } from '../types/nhanVienTypes';
import { listRecentMonths } from '../utils/bonusDateRange';

export interface UseMonthlyBonusArchiveResult {
    months: { yyyymm: string; label: string }[];
    dataByMonth: Record<string, Record<string, BonusMetrics>>;
    loading: boolean;
}

/**
 * Đọc kho lưu trữ thưởng theo THÁNG (bonus-monthly-${safeName}-${yyyymm}) cho N tháng
 * gần nhất — chỉ tải khi enabled=true (bật "Xem theo tháng"), không tải kèm lúc mount
 * tab THƯỞNG như bonus-data-* hiện tại vì đây là dữ liệu ít dùng hơn.
 */
export function useMonthlyBonusArchive(
    activeSupermarkets: string[],
    enabled: boolean,
    monthsWindow = 6,
): UseMonthlyBonusArchiveResult {
    const months = useMemo(() => listRecentMonths(monthsWindow), [monthsWindow]);
    const [dataByMonth, setDataByMonth] = useState<Record<string, Record<string, BonusMetrics>>>({});
    const [loading, setLoading] = useState(false);
    const [refreshVersion, setRefreshVersion] = useState(0);

    useEffect(() => {
        const handleDbChange = (event: CustomEvent) => {
            const key = event.detail?.key;
            if (typeof key === 'string' && key.startsWith('bonus-monthly-')) {
                setRefreshVersion(v => v + 1);
            }
        };
        window.addEventListener('indexeddb-change', handleDbChange as EventListener);
        return () => window.removeEventListener('indexeddb-change', handleDbChange as EventListener);
    }, []);

    useEffect(() => {
        if (!enabled || activeSupermarkets.length === 0) {
            setDataByMonth({});
            return;
        }
        let isMounted = true;
        setLoading(true);

        const safeNames = Array.from(new Set(activeSupermarkets.map(sm => shortenSupermarketName(sm))));

        (async () => {
            const result: Record<string, Record<string, BonusMetrics>> = {};
            await Promise.all(months.map(async ({ yyyymm }) => {
                const perSm = await Promise.all(safeNames.map(safeName => db.get(`bonus-monthly-${safeName}-${yyyymm}`)));
                const merged: Record<string, BonusMetrics> = {};
                perSm.forEach(smData => { if (smData) Object.assign(merged, smData); });
                result[yyyymm] = merged;
            }));
            if (isMounted) {
                setDataByMonth(result);
                setLoading(false);
            }
        })();

        return () => { isMounted = false; };
    }, [enabled, activeSupermarkets, months, refreshVersion]);

    return { months, dataByMonth, loading };
}
