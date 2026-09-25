import { useEffect, useMemo, useState } from 'react';
import * as db from '../utils/db';
import { shortenSupermarketName } from '../utils/dashboardHelpers';
import { BonusMetrics } from '../types/nhanVienTypes';
import { getYearMonthPlan } from '../utils/bonusDateRange';

export interface UseMonthlyBonusArchiveResult {
    months: { yyyymm: string; label: string }[];
    dataByMonth: Record<string, Record<string, BonusMetrics>>;
    loading: boolean;
    selectedYear: number;
    setSelectedYear: (year: number) => void;
    availableYears: number[];
}

/**
 * Đọc kho lưu trữ thưởng theo THÁNG (bonus-monthly-${safeName}-${yyyymm}) cho năm đã chọn.
 * - Năm hiện tại (2026): T1 -> T9 (hoặc tháng hiện tại).
 * - Năm quá khứ (2025): đủ 12 tháng T1 -> T12.
 * Chỉ tải khi enabled=true (bật "Xem theo tháng").
 */
export function useMonthlyBonusArchive(
    activeSupermarkets: string[],
    enabled: boolean,
    defaultYear: number = new Date().getFullYear(),
): UseMonthlyBonusArchiveResult {
    const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
    const [dataByMonth, setDataByMonth] = useState<Record<string, Record<string, BonusMetrics>>>({});
    const [loading, setLoading] = useState(false);
    const [refreshVersion, setRefreshVersion] = useState(0);

    const now = new Date();
    const currentYear = now.getFullYear();
    const availableYears = useMemo(() => [currentYear, currentYear - 1], [currentYear]);

    // Kế hoạch tháng theo năm được chọn:
    // Trả về reverse để khi component gọi [...months].reverse() sẽ hiển thị T1 -> T_cuối từ trái sang phải
    const months = useMemo(() => {
        const plan = getYearMonthPlan(selectedYear);
        return plan.map(p => ({ yyyymm: p.yyyymm, label: p.label })).reverse();
    }, [selectedYear]);

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

    return { months, dataByMonth, loading, selectedYear, setSelectedYear, availableYears };
}
