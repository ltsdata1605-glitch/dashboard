import React, { useState, useRef, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '../Icons';
import { parseNumber, roundUp, shortenSupermarketName } from '../../utils/dashboardHelpers';
import {
    resolveDailyTarget,
    resolveRateTarget,
    computeHqqd,
    computeMonthlyTarget,
    computeMonthlyQdPercent,
    computeDayTimeRatio,
    computeRealtimeProjected,
    formatRevenueTy,
    percentOf,
    DEFAULT_HQQD_TARGET,
    DEFAULT_TRA_CHAM_TARGET,
    ALL_STORES_KEY,
} from '../../services/kpiOverviewCalc';
import { KpiCard } from '../../../../components/shared/ui/KpiCard';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import * as db from '../../utils/db';
import { parseBaseTargetQuyDoi } from '../../services/employeeParser';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

interface KpiOverviewProps {
    isRealtime: boolean;
    kpiData: Record<string, string>;
    targets: { quyDoi: number; traGop: number };
    supermarketDailyTargets: Record<string, number>;
    supermarketMonthlyTargets?: Record<string, number>;
    activeSupermarket: string;
    summaryLuyKeData?: string;
    className?: string;
    onNavigateToUpdater?: (options?: { configTab?: 'data' | 'revenueTarget' | 'competitionTarget'; supermarketName?: string; scrollToConfig?: boolean }) => void;
}

type TargetType = 'dtQd' | 'hqqd' | 'traCham';

const KpiOverview: React.FC<KpiOverviewProps> = ({ 
    isRealtime, 
    kpiData, 
    targets, 
    supermarketDailyTargets, 
    supermarketMonthlyTargets, 
    activeSupermarket, 
    summaryLuyKeData, 
    className,
    onNavigateToUpdater
}) => {

    const dtlk = parseNumber(kpiData.dtlk);
    const dtqd = parseNumber(kpiData.dtqd);
    const dtDuKien = parseNumber(kpiData.dtDuKien);
    const dtDuKienQD = parseNumber(kpiData.dtDuKienQD);
    const hqqd = computeHqqd(dtlk, dtqd);
    const tyTrongTraGop = parseNumber(kpiData.tyTrongTraGop);

    const safeName = shortenSupermarketName(activeSupermarket);

    // Đồng bộ trực tiếp 2 chiều với TargetHero (Cập nhật > Cấu hình siêu thị chi tiết > Target Doanh thu)
    const [storedTraGop, setStoredTraGop] = useIndexedDBState<number>(safeName ? (`targethero-${safeName}-tragop` as db.BIKey) : null, 45);
    const [storedQuyDoi, setStoredQuyDoi] = useIndexedDBState<number>(safeName ? (`targethero-${safeName}-quydoi` as db.BIKey) : null, 40);
    const [storedTotalTarget, setStoredTotalTarget] = useIndexedDBState<number>(safeName ? (`targethero-${safeName}-total` as db.BIKey) : null, 100);

    // Custom Targets lưu IndexedDB (fallback / manual override)
    const [customDTQDTargets, setCustomDTQDTargets] = useIndexedDBState<Record<string, number>>('custom-dtqd-targets', {});
    const [customHQQDTargets, setCustomHQQDTargets] = useIndexedDBState<Record<string, number>>('custom-hqqd-targets', {});
    const [customTraChamTargets, setCustomTraChamTargets] = useIndexedDBState<Record<string, number>>('custom-tracham-targets', {});

    // Inline Editing State — Chỉnh sửa trực tiếp không cần popup
    const [editingTargetType, setEditingTargetType] = useState<TargetType | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingTargetType && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingTargetType]);

    const [currentTime, setCurrentTime] = useState(() => new Date());
    useEffect(() => {
        if (!isRealtime) return;
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, [isRealtime]);

    // --- 1. Target DTQĐ ---
    const totalVuotTroi = resolveDailyTarget(
        activeSupermarket, customDTQDTargets, supermarketDailyTargets,
        () => Object.values(supermarketDailyTargets).reduce<number>((sum, value) => sum + Number(value), 0)
    );

    const renderGrowth = (val: string | undefined) => {
        if (!val || val === 'N/A' || val === '0%') return null;
        const num = parseNumber(val);
        const isPositive = num >= 0;
        return (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold leading-none ${
                isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
            }`}>
                {isPositive ? <ChevronUpIcon className="h-2 w-2" /> : <ChevronDownIcon className="h-2 w-2" />}
                {Math.abs(Math.ceil(num))}%
            </span>
        );
    };

    // Quỹ thời gian trong ngày (từ 8h00 đến 21h30) cho Realtime
    const dayTimeRatio = computeDayTimeRatio(currentTime);

    // --- 2. DT THỰC (Hiển thị Doanh thu Dự kiến) ---
    // Realtime: Dự kiến dựa trên quỹ thời gian ngày (8h00 - 21h30)
    // Luỹ kế: (DT THỰC / (số ngày đã qua - 1)) * số ngày của tháng
    let passedDays = Math.max(1, currentTime.getDate() - 1);
    if (summaryLuyKeData) {
        const matchDay = summaryLuyKeData.match(/(?:đến ngày|hết ngày|quỹ thời gian:\s*|nhịp\s*)(\d{1,2})/i);
        if (matchDay && matchDay[1]) {
            const parsedDay = parseInt(matchDay[1], 10);
            if (!isNaN(parsedDay) && parsedDay > 0 && parsedDay <= 31) {
                passedDays = parsedDay;
            }
        }
    }
    const daysInMonth = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();

    const dtThucDuKien = isRealtime
        ? computeRealtimeProjected(dtlk, dayTimeRatio)
        : (passedDays > 0 ? Math.round((dtlk / passedDays) * daysInMonth) : dtlk);

    const dtThucDuKienFormatted = formatRevenueTy(dtThucDuKien, isRealtime);
    const dtThucDuKienStr = dtThucDuKien > 0
        ? dtThucDuKienFormatted.full
        : '—';

    // --- 3. Dự kiến DTQĐ ---
    // Realtime: Dự kiến DTQĐ dựa theo quỹ thời gian ngày
    // Luỹ kế: ưu tiên kpiData.dtDuKienQD hoặc ước tính theo số ngày trong tháng
    const resolvedDtDuKienQD = isRealtime
        ? computeRealtimeProjected(dtqd, dayTimeRatio)
        : (dtDuKienQD > 0 ? dtDuKienQD : (passedDays > 0 && dtqd > 0 ? Math.round((dtqd / passedDays) * daysInMonth) : 0));
    const resolvedDtDuKienQDFormatted = formatRevenueTy(resolvedDtDuKienQD, isRealtime);

    const totalVuotTroiMonthly = computeMonthlyTarget(isRealtime, activeSupermarket, supermarketMonthlyTargets);
    const htTargetVuotTroiMonthly = computeMonthlyQdPercent(dtDuKienQD, totalVuotTroiMonthly, kpiData.htTargetDuKienQD, dtqd);

    const htTargetVuotTroi = totalVuotTroi > 0
        ? (resolvedDtDuKienQD / totalVuotTroi) * 100
        : percentOf(dtqd, totalVuotTroi);

    const secondaryPct = isRealtime ? htTargetVuotTroi : htTargetVuotTroiMonthly;
    const secondaryLabel = isRealtime ? 'Target' : 'Mục tiêu tháng';
    const secondaryTargetStr = isRealtime
        ? (totalVuotTroi > 0 ? formatRevenueTy(totalVuotTroi, true).full : 'Nhấp đặt MT')
        : (totalVuotTroiMonthly > 0 ? formatRevenueTy(totalVuotTroiMonthly, false).full : undefined);

    const isTotalView = !activeSupermarket || activeSupermarket === 'Tổng' || activeSupermarket === 'TỔNG CỤM' || activeSupermarket === 'CỤM' || activeSupermarket.startsWith('CỤM');

    const currentQuyDoiTarget = isTotalView
        ? (targets?.quyDoi ?? DEFAULT_HQQD_TARGET)
        : (targets?.quyDoi ?? (storedQuyDoi !== undefined && storedQuyDoi !== null ? storedQuyDoi : DEFAULT_HQQD_TARGET));

    const currentTraGopTarget = isTotalView
        ? (targets?.traGop ?? DEFAULT_TRA_CHAM_TARGET)
        : (targets?.traGop ?? (storedTraGop !== undefined && storedTraGop !== null ? storedTraGop : DEFAULT_TRA_CHAM_TARGET));

    const hasDkAndTarget = resolvedDtDuKienQD > 0 && !!secondaryTargetStr;
    const dtqdTrendLabel = hasDkAndTarget
        ? 'Dự kiến / Target'
        : (resolvedDtDuKienQD > 0 ? 'Dự kiến DTQĐ' : secondaryLabel);

    const dtqdTrendValue = hasDkAndTarget ? (
        <span className="tabular-nums" title={`Dự kiến DTQĐ: ${resolvedDtDuKienQDFormatted.full} | Target: ${secondaryTargetStr}`}>
            <span className="text-sky-600 dark:text-sky-400 font-bold">
                {resolvedDtDuKienQDFormatted.value}
            </span>
            <span className="text-slate-400 dark:text-slate-500 font-normal mx-0.5">/</span>
            <span>{secondaryTargetStr}</span>
        </span>
    ) : (
        resolvedDtDuKienQD > 0
            ? resolvedDtDuKienQDFormatted.full
            : (secondaryTargetStr || '-')
    );

    const dtqdIsGood = secondaryPct >= 100;
    const hqqdIsGood = hqqd >= currentQuyDoiTarget;
    const traGopIsGood = tyTrongTraGop >= currentTraGopTarget;

    const currentDtqdTarget = isRealtime ? totalVuotTroi : totalVuotTroiMonthly;
    const dtqdRemaining = currentDtqdTarget > 0 ? dtqd - currentDtqdTarget : 0;
    const dtqdRemainingFormatted = formatRevenueTy(Math.abs(dtqdRemaining), isRealtime);
    const dtlkFormatted = formatRevenueTy(dtlk, isRealtime);
    const dtqdFormatted = formatRevenueTy(dtqd, isRealtime);

    const handleGoToRevenueTarget = () => {
        if (onNavigateToUpdater) {
            onNavigateToUpdater({
                configTab: 'revenueTarget',
                supermarketName: activeSupermarket,
                scrollToConfig: true
            });
        }
    };

    return (
        <div className={`kpi-overview-container js-kpi-overview-container px-2 sm:px-4 pt-1 pb-2 space-y-1 sm:space-y-2 lg:space-y-2.5 ${className || ''}`}>
            {/* ROW 1: DOANH THU & CHỈ SỐ LỚN */}
            <div className="kpi-overview-grid grid grid-cols-4 gap-1 sm:gap-2 lg:gap-2.5">
                <KpiCard
                    icon="dollar-sign"
                    iconColor="emerald"
                    title="DT Thực"
                    trendLabel="Dự kiến"
                    trendValue={dtThucDuKienStr}
                    isGood={true}
                    onClick={handleGoToRevenueTarget}
                >
                    <div className="flex items-baseline gap-0.5 sm:gap-1">
                        <span className="text-[20px] xs:text-[22px] sm:text-[30px] md:text-[34px] lg:text-[42px] xl:text-[48px] font-black leading-tight tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                            {dtlkFormatted.value}
                        </span>
                        <span className="text-[12px] sm:text-[16px] lg:text-[18px] xl:text-[20px] font-black text-slate-400 dark:text-slate-500">
                            {dtlkFormatted.unit}
                        </span>
                    </div>
                </KpiCard>

                <KpiCard
                    icon="trending-up"
                    iconColor="sky"
                    title="DTQĐ"
                    isGood={dtqdIsGood}
                    trendLabel={dtqdTrendLabel}
                    trendValue={dtqdTrendValue}
                    onClick={handleGoToRevenueTarget}
                >
                    <div className="flex items-baseline gap-0.5 sm:gap-1.5 flex-nowrap overflow-hidden">
                        <span className={`text-[19px] xs:text-[21px] sm:text-[28px] md:text-[32px] lg:text-[38px] xl:text-[44px] font-black leading-tight tracking-tight tabular-nums shrink-0 ${dtqdIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-sky-700 dark:text-sky-400'}`}>
                            {dtqdFormatted.value}
                        </span>
                        <span className="text-[12px] sm:text-[15px] lg:text-[17px] xl:text-[19px] font-black text-slate-400 dark:text-slate-500 shrink-0">
                            {dtqdFormatted.unit}
                        </span>
                        {currentDtqdTarget > 0 && (
                            <span
                                title={`Doanh thu còn lại (Thực hiện - Target): ${dtqdRemaining >= 0 ? '+' : '-'}${dtqdRemainingFormatted.full}`}
                                className={`text-[9.5px] xs:text-[10.5px] sm:text-[12px] lg:text-[13px] xl:text-[14px] font-bold tabular-nums shrink-0 ${
                                    dtqdRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                                }`}
                            >
                                ({dtqdRemaining >= 0 ? '+' : '-'}{dtqdRemainingFormatted.full})
                            </span>
                        )}
                    </div>
                </KpiCard>

                <KpiCard
                    icon="activity"
                    iconColor={hqqdIsGood ? "indigo" : "rose"}
                    title="HQQĐ"
                    isGood={hqqdIsGood}
                    trendLabel="Mục tiêu"
                    trendValue={`${currentQuyDoiTarget}%`}
                    onClick={handleGoToRevenueTarget}
                >
                    <div className="flex items-baseline gap-0.5 sm:gap-1.5">
                        <span className={`text-[20px] xs:text-[22px] sm:text-[30px] md:text-[34px] lg:text-[42px] xl:text-[48px] font-black leading-tight tracking-tight tabular-nums ${hqqdIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {Math.ceil(hqqd)}%
                        </span>
                        {!hqqdIsGood && currentQuyDoiTarget > 0 && (
                            <span className="text-[10px] xs:text-[11px] sm:text-[13px] lg:text-[14px] xl:text-[16px] font-bold text-rose-500 dark:text-rose-400 tabular-nums">
                                (-{Math.max(0, currentQuyDoiTarget - Math.ceil(hqqd))}%)
                            </span>
                        )}
                    </div>
                </KpiCard>

                <KpiCard
                    icon="credit-card"
                    iconColor={traGopIsGood ? "amber" : "rose"}
                    title="Trả Chậm"
                    isGood={traGopIsGood}
                    trendLabel="Mục tiêu"
                    trendValue={`${currentTraGopTarget}%`}
                    onClick={handleGoToRevenueTarget}
                >
                    <div className="flex items-baseline gap-0.5 sm:gap-1.5">
                        <span className={`text-[20px] xs:text-[22px] sm:text-[30px] md:text-[34px] lg:text-[42px] xl:text-[48px] font-black leading-tight tracking-tight tabular-nums ${traGopIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {Math.round(tyTrongTraGop)}%
                        </span>
                        {!traGopIsGood && currentTraGopTarget > 0 && (
                            <span className="text-[10px] xs:text-[11px] sm:text-[13px] lg:text-[14px] xl:text-[16px] font-bold text-rose-500 dark:text-rose-400 tabular-nums">
                                (-{Math.max(0, currentTraGopTarget - Math.round(tyTrongTraGop))}%)
                            </span>
                        )}
                    </div>
                </KpiCard>
            </div>

            {/* ROW 2: CHỈ SỐ PHỤ */}
            <div className="kpi-overview-grid grid grid-cols-4 gap-1 sm:gap-2 lg:gap-2.5">
                <KpiCard icon="users" iconColor="sky" title="L.Khách" trendValue={renderGrowth(kpiData.luotKhachChange)}>
                    <div className="text-[19px] xs:text-[21px] sm:text-[28px] md:text-[32px] lg:text-[38px] xl:text-[44px] font-black leading-tight tracking-tight tabular-nums text-sky-700 dark:text-sky-400">
                        {roundUp(parseNumber(kpiData.lkhach)).toLocaleString('vi-VN')}
                    </div>
                </KpiCard>

                <KpiCard icon="shield-check" iconColor="amber" title="TLPVTC" trendValue={renderGrowth(kpiData.tlpvChange)}>
                    <div className="text-[19px] xs:text-[21px] sm:text-[28px] md:text-[32px] lg:text-[38px] xl:text-[44px] font-black leading-tight tracking-tight tabular-nums text-amber-700 dark:text-amber-400">
                        {(() => {
                            const val = parseNumber(kpiData.tlpv);
                            if (!val) return '0%';
                            return `${Math.round(val)}%`;
                        })()}
                    </div>
                </KpiCard>

                <KpiCard icon="receipt" iconColor="emerald" title="Bill Bán">
                    <div className="text-[19px] xs:text-[21px] sm:text-[28px] md:text-[32px] lg:text-[38px] xl:text-[44px] font-black leading-tight tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                        {kpiData.lbillBH && kpiData.lbillBH !== 'N/A'
                            ? roundUp(parseNumber(kpiData.lbillBH)).toLocaleString('vi-VN')
                            : (kpiData.lbill && kpiData.lbill !== 'N/A'
                                ? roundUp(parseNumber(kpiData.lbill)).toLocaleString('vi-VN')
                                : '0')}
                    </div>
                </KpiCard>

                <KpiCard icon="wallet" iconColor="rose" title="Bill T.Hộ">
                    <div className="text-[19px] xs:text-[21px] sm:text-[28px] md:text-[32px] lg:text-[38px] xl:text-[44px] font-black leading-tight tracking-tight tabular-nums text-rose-700 dark:text-rose-400">
                        {kpiData.lbillTH ? roundUp(parseNumber(kpiData.lbillTH)).toLocaleString('vi-VN') : '0'}
                    </div>
                </KpiCard>
            </div>
        </div>
    );
};

export default KpiOverview;
