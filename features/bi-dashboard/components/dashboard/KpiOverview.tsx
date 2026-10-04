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
import { getMonthProgress, extractDateFromData } from '../../services/metricService';
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
    const [storedTraGop, setStoredTraGop] = useIndexedDBState<number>(safeName ? (`targethero-${safeName}-tragop` as db.BIKey) : null, 60);
    const [storedQuyDoi, setStoredQuyDoi] = useIndexedDBState<number>(safeName ? (`targethero-${safeName}-quydoi` as db.BIKey) : null, 60);
    const [storedTotalTarget, setStoredTotalTarget] = useIndexedDBState<number>(safeName ? (`targethero-${safeName}-total` as db.BIKey) : null, 130);

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
    // Luỹ kế: (DT THỰC / số ngày đã qua) * số ngày của tháng (hỗ trợ tháng đã qua và ngày mùng 1)
    const dateContext = extractDateFromData(summaryLuyKeData);
    const monthProgress = getMonthProgress(currentTime, dateContext);
    const passedDays = monthProgress.daysPassed;
    const daysInMonth = monthProgress.daysInMonth;

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
        <div className={`kpi-overview-container js-kpi-overview-container px-3 sm:px-5 pt-1.5 pb-3.5 space-y-3 sm:space-y-3.5 ${className || ''}`}>
            {/* ROW 1: DOANH THU & CHỈ SỐ LỚN */}
            <div className="kpi-overview-grid grid grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
                <KpiCard
                    icon="dollar-sign"
                    iconColor="emerald"
                    title="DT THỰC"
                    trendLabel="Dự kiến"
                    trendValue={
                        <span className="cursor-pointer hover:opacity-80 transition-opacity flex flex-col items-center lg:items-end leading-tight gap-0.5">
                            <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{dtThucDuKienStr}</span>
                        </span>
                    }
                    isGood={true}
                    onClick={handleGoToRevenueTarget}
                >
                    <div className="flex items-baseline gap-1">
                        <span className="text-[20px] xs:text-[22px] sm:text-[28px] md:text-[32px] lg:text-[36px] xl:text-[40px] font-black leading-tight tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                            {dtlkFormatted.value}
                        </span>
                        <span className="text-[12px] sm:text-[14px] lg:text-[16px] font-extrabold text-slate-400 dark:text-slate-500">
                            {dtlkFormatted.unit}
                        </span>
                    </div>
                </KpiCard>

                <KpiCard
                    icon="trending-up"
                    iconColor="sky"
                    title="DTQĐ"
                    isGood={dtqdIsGood}
                    trendLabel="Target"
                    progressPercent={secondaryPct}
                    trendValue={
                        <span className="cursor-pointer hover:opacity-80 transition-opacity flex flex-col items-center lg:items-end leading-tight gap-0.5">
                            <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                                {secondaryTargetStr || dtqdTrendValue}
                            </span>
                            {currentDtqdTarget > 0 && (
                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[10.5px] font-bold tabular-nums ${
                                    dtqdRemaining >= 0
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40'
                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40'
                                }`}>
                                    {dtqdRemaining >= 0 ? `+${dtqdRemainingFormatted.full}` : `-${dtqdRemainingFormatted.full}`}
                                </span>
                            )}
                        </span>
                    }
                    onClick={handleGoToRevenueTarget}
                >
                    <div className="flex items-baseline gap-1 flex-nowrap overflow-hidden">
                        <span className={`text-[20px] xs:text-[22px] sm:text-[28px] md:text-[32px] lg:text-[36px] xl:text-[40px] font-black leading-tight tracking-tight tabular-nums shrink-0 ${dtqdIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-sky-700 dark:text-sky-400'}`}>
                            {dtqdFormatted.value}
                        </span>
                        <span className="text-[12px] sm:text-[14px] lg:text-[16px] font-extrabold text-slate-400 dark:text-slate-500 shrink-0">
                            {dtqdFormatted.unit}
                        </span>
                    </div>
                </KpiCard>

                <KpiCard
                    icon="activity"
                    iconColor="indigo"
                    title="HQQĐ"
                    isGood={hqqdIsGood}
                    trendLabel="Mục tiêu"
                    progressPercent={currentQuyDoiTarget > 0 ? (hqqd / currentQuyDoiTarget) * 100 : undefined}
                    trendValue={
                        <span className="cursor-pointer hover:opacity-80 transition-opacity flex flex-col items-center lg:items-end leading-tight gap-0.5">
                            <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{currentQuyDoiTarget}%</span>
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[10.5px] font-bold tabular-nums ${
                                hqqdIsGood
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40'
                            }`}>
                                {Math.ceil(hqqd) - currentQuyDoiTarget >= 0
                                    ? `+${Math.ceil(hqqd) - currentQuyDoiTarget}%`
                                    : `-${Math.abs(Math.ceil(hqqd) - currentQuyDoiTarget)}%`}
                            </span>
                        </span>
                    }
                    onClick={handleGoToRevenueTarget}
                >
                    <div className="flex items-baseline gap-1">
                        <span className={`text-[20px] xs:text-[22px] sm:text-[28px] md:text-[32px] lg:text-[36px] xl:text-[40px] font-black leading-tight tracking-tight tabular-nums ${hqqdIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            {Math.ceil(hqqd)}%
                        </span>
                    </div>
                </KpiCard>

                <KpiCard
                    icon="credit-card"
                    iconColor="amber"
                    title="TRẢ CHẬM"
                    isGood={traGopIsGood}
                    trendLabel="Mục tiêu"
                    progressPercent={currentTraGopTarget > 0 ? (tyTrongTraGop / currentTraGopTarget) * 100 : undefined}
                    trendValue={
                        <span className="cursor-pointer hover:opacity-80 transition-opacity flex flex-col items-center lg:items-end leading-tight gap-0.5">
                            <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{currentTraGopTarget}%</span>
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[10.5px] font-bold tabular-nums ${
                                traGopIsGood
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40'
                            }`}>
                                {Math.round(tyTrongTraGop) - currentTraGopTarget >= 0
                                    ? `+${Math.round(tyTrongTraGop) - currentTraGopTarget}%`
                                    : `-${Math.abs(Math.round(tyTrongTraGop) - currentTraGopTarget)}%`}
                            </span>
                        </span>
                    }
                    onClick={handleGoToRevenueTarget}
                >
                    <div className="flex items-baseline gap-1">
                        <span className={`text-[20px] xs:text-[22px] sm:text-[28px] md:text-[32px] lg:text-[36px] xl:text-[40px] font-black leading-tight tracking-tight tabular-nums ${traGopIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {Math.round(tyTrongTraGop)}%
                        </span>
                    </div>
                </KpiCard>
            </div>

            {/* ROW 2: CHỈ SỐ PHỤ */}
            <div className="kpi-overview-grid grid grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
                <KpiCard icon="users" iconColor="sky" title="L.KHÁCH" trendValue={renderGrowth(kpiData.luotKhachChange)}>
                    <div className="text-[20px] xs:text-[22px] sm:text-[26px] md:text-[30px] lg:text-[34px] xl:text-[38px] font-black leading-tight tracking-tight tabular-nums text-sky-700 dark:text-sky-400">
                        {roundUp(parseNumber(kpiData.lkhach)).toLocaleString('vi-VN')}
                    </div>
                </KpiCard>

                <KpiCard icon="shield-check" iconColor="amber" title="TLPVTC" trendValue={renderGrowth(kpiData.tlpvChange)}>
                    <div className="text-[20px] xs:text-[22px] sm:text-[26px] md:text-[30px] lg:text-[34px] xl:text-[38px] font-black leading-tight tracking-tight tabular-nums text-amber-700 dark:text-amber-400">
                        {(() => {
                            const val = parseNumber(kpiData.tlpv);
                            if (!val) return '0%';
                            return `${Math.round(val)}%`;
                        })()}
                    </div>
                </KpiCard>

                <KpiCard icon="receipt" iconColor="emerald" title="BILL BÁN">
                    <div className="text-[20px] xs:text-[22px] sm:text-[26px] md:text-[30px] lg:text-[34px] xl:text-[38px] font-black leading-tight tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                        {kpiData.lbillBH && kpiData.lbillBH !== 'N/A'
                            ? roundUp(parseNumber(kpiData.lbillBH)).toLocaleString('vi-VN')
                            : (kpiData.lbill && kpiData.lbill !== 'N/A'
                                ? roundUp(parseNumber(kpiData.lbill)).toLocaleString('vi-VN')
                                : '0')}
                    </div>
                </KpiCard>

                <KpiCard icon="wallet" iconColor="rose" title="BILL T.HỘ">
                    <div className="text-[20px] xs:text-[22px] sm:text-[26px] md:text-[30px] lg:text-[34px] xl:text-[38px] font-black leading-tight tracking-tight tabular-nums text-rose-700 dark:text-rose-400">
                        {kpiData.lbillTH ? roundUp(parseNumber(kpiData.lbillTH)).toLocaleString('vi-VN') : '0'}
                    </div>
                </KpiCard>
            </div>
        </div>
    );
};

export default KpiOverview;
