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
}

type TargetType = 'dtQd' | 'hqqd' | 'traCham';

const KpiOverview: React.FC<KpiOverviewProps> = ({ isRealtime, kpiData, targets, supermarketDailyTargets, supermarketMonthlyTargets, activeSupermarket, summaryLuyKeData }) => {

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
        const matchDay = summaryLuyKeData.match(/đến ngày\s*(\d{1,2})/i);
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

    const dtThucDuKienStr = dtThucDuKien > 0
        ? `${roundUp(dtThucDuKien).toLocaleString('vi-VN')} Tr`
        : '—';

    // --- 3. Dự kiến DTQĐ ---
    // Realtime: Dự kiến DTQĐ dựa theo quỹ thời gian ngày
    // Luỹ kế: ưu tiên kpiData.dtDuKienQD hoặc ước tính theo số ngày trong tháng
    const resolvedDtDuKienQD = isRealtime
        ? computeRealtimeProjected(dtqd, dayTimeRatio)
        : (dtDuKienQD > 0 ? dtDuKienQD : (passedDays > 0 && dtqd > 0 ? Math.round((dtqd / passedDays) * daysInMonth) : 0));

    const totalVuotTroiMonthly = computeMonthlyTarget(isRealtime, activeSupermarket, supermarketMonthlyTargets);
    const htTargetVuotTroiMonthly = computeMonthlyQdPercent(dtDuKienQD, totalVuotTroiMonthly, kpiData.htTargetDuKienQD, dtqd);

    const htTargetVuotTroi = totalVuotTroi > 0
        ? (resolvedDtDuKienQD / totalVuotTroi) * 100
        : percentOf(dtqd, totalVuotTroi);

    const secondaryPct = isRealtime ? htTargetVuotTroi : htTargetVuotTroiMonthly;
    const secondaryLabel = isRealtime ? 'Target' : 'Mục tiêu tháng';
    const secondaryTargetStr = isRealtime
        ? (totalVuotTroi > 0 ? `${roundUp(totalVuotTroi).toLocaleString('vi-VN')} Tr` : 'Nhấp đặt MT')
        : (totalVuotTroiMonthly > 0 ? `${roundUp(totalVuotTroiMonthly).toLocaleString('vi-VN')} Tr` : undefined);

    // --- 4. Target HQQĐ & TRẢ CHẬM (Đồng bộ tuyệt đối với TargetHero) ---
    const currentQuyDoiTarget = (safeName && storedQuyDoi !== undefined && storedQuyDoi !== null)
        ? storedQuyDoi
        : resolveRateTarget(activeSupermarket, customHQQDTargets, targets.quyDoi, DEFAULT_HQQD_TARGET);

    const currentTraGopTarget = (safeName && storedTraGop !== undefined && storedTraGop !== null)
        ? storedTraGop
        : resolveRateTarget(activeSupermarket, customTraChamTargets, targets.traGop, DEFAULT_TRA_CHAM_TARGET);

    const hasDkAndTarget = resolvedDtDuKienQD > 0 && !!secondaryTargetStr;
    const dtqdTrendLabel = hasDkAndTarget
        ? 'Dự kiến / Target'
        : (resolvedDtDuKienQD > 0 ? 'Dự kiến DTQĐ' : secondaryLabel);

    const dtqdTrendValue = hasDkAndTarget ? (
        <span className="tabular-nums" title={`Dự kiến DTQĐ: ${roundUp(resolvedDtDuKienQD).toLocaleString('vi-VN')} Tr | Target: ${secondaryTargetStr}`}>
            <span className="text-sky-600 dark:text-sky-400 font-bold">
                {roundUp(resolvedDtDuKienQD).toLocaleString('vi-VN')}
            </span>
            <span className="text-slate-400 dark:text-slate-500 font-normal mx-0.5">/</span>
            <span>{secondaryTargetStr}</span>
        </span>
    ) : (
        resolvedDtDuKienQD > 0
            ? `${roundUp(resolvedDtDuKienQD).toLocaleString('vi-VN')} Tr`
            : (secondaryTargetStr || '-')
    );

    const dtqdIsGood = secondaryPct >= 100;
    const hqqdIsGood = hqqd >= currentQuyDoiTarget;
    const traGopIsGood = tyTrongTraGop >= currentTraGopTarget;

    return (
        <div className="js-kpi-overview-container bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 p-2.5 sm:p-3 lg:p-3.5 rounded-none shadow-sm space-y-1.5 sm:space-y-2 lg:space-y-2.5">
            {/* ROW 1: DOANH THU & CHỈ SỐ LỚN */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 lg:gap-2.5">
                <KpiCard
                    icon="dollar-sign"
                    iconColor="emerald"
                    title="DT Thực"
                    trendLabel="Dự kiến"
                    trendValue={dtThucDuKienStr}
                    isGood={true}
                >
                    <div className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                        {roundUp(dtlk).toLocaleString('vi-VN')} Tr
                    </div>
                </KpiCard>

                <KpiCard
                    icon="trending-up"
                    iconColor="sky"
                    title="DTQĐ"
                    progressPercent={Math.ceil(secondaryPct)}
                    isGood={dtqdIsGood}
                    trendLabel={dtqdTrendLabel}
                    trendValue={dtqdTrendValue}
                >
                    <div className={`text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums ${dtqdIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-sky-700 dark:text-sky-400'}`}>
                        {roundUp(dtqd).toLocaleString('vi-VN')} Tr
                    </div>
                </KpiCard>

                <KpiCard
                    icon="activity"
                    iconColor={hqqdIsGood ? "indigo" : "rose"}
                    title="HQQĐ"
                    progressPercent={hqqd > 0 ? Math.ceil((hqqd / currentQuyDoiTarget) * 100) : 0}
                    isGood={hqqdIsGood}
                    trendLabel="Mục tiêu"
                    trendValue={`${currentQuyDoiTarget}%`}
                >
                    <div className="flex items-baseline gap-1">
                        <span className={`text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums ${hqqdIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {Math.ceil(hqqd)}%
                        </span>
                        {!hqqdIsGood && currentQuyDoiTarget > 0 && (
                            <span className="text-[10px] sm:text-[11px] font-bold text-rose-500 dark:text-rose-400 tabular-nums">
                                (-{Math.max(0, currentQuyDoiTarget - Math.ceil(hqqd))}%)
                            </span>
                        )}
                    </div>
                </KpiCard>

                <KpiCard
                    icon="credit-card"
                    iconColor={traGopIsGood ? "amber" : "rose"}
                    title="Trả Chậm"
                    progressPercent={tyTrongTraGop > 0 ? Math.ceil((tyTrongTraGop / currentTraGopTarget) * 100) : 0}
                    isGood={traGopIsGood}
                    trendLabel="Mục tiêu"
                    trendValue={`${currentTraGopTarget}%`}
                >
                    <div className="flex items-baseline gap-1">
                        <span className={`text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums ${traGopIsGood ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {Math.round(tyTrongTraGop)}%
                        </span>
                        {!traGopIsGood && currentTraGopTarget > 0 && (
                            <span className="text-[10px] sm:text-[11px] font-bold text-rose-500 dark:text-rose-400 tabular-nums">
                                (-{Math.max(0, currentTraGopTarget - Math.round(tyTrongTraGop))}%)
                            </span>
                        )}
                    </div>
                </KpiCard>
            </div>

            {/* ROW 2: CHỈ SỐ PHỤ */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 lg:gap-2.5">
                <KpiCard icon="users" iconColor="sky" title="L.Khách" trendValue={renderGrowth(kpiData.luotKhachChange)}>
                    <div className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums text-sky-700 dark:text-sky-400">
                        {roundUp(parseNumber(kpiData.lkhach)).toLocaleString('vi-VN')}
                    </div>
                </KpiCard>

                <KpiCard icon="shield-check" iconColor="amber" title="TLPVTC" trendValue={renderGrowth(kpiData.tlpvChange)}>
                    <div className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums text-amber-700 dark:text-amber-400">
                        {(() => {
                            const val = parseNumber(kpiData.tlpv);
                            if (!val) return '0%';
                            return `${Math.round(val)}%`;
                        })()}
                    </div>
                </KpiCard>

                <KpiCard icon="receipt" iconColor="emerald" title="Bill Bán">
                    <div className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
                        {kpiData.lbillBH && kpiData.lbillBH !== 'N/A'
                            ? roundUp(parseNumber(kpiData.lbillBH)).toLocaleString('vi-VN')
                            : (kpiData.lbill && kpiData.lbill !== 'N/A'
                                ? roundUp(parseNumber(kpiData.lbill)).toLocaleString('vi-VN')
                                : '0')}
                    </div>
                </KpiCard>

                <KpiCard icon="wallet" iconColor="rose" title="Bill T.Hộ">
                    <div className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black leading-none tracking-tight tabular-nums text-rose-700 dark:text-rose-400">
                        {kpiData.lbillTH ? roundUp(parseNumber(kpiData.lbillTH)).toLocaleString('vi-VN') : '0'}
                    </div>
                </KpiCard>
            </div>
        </div>
    );
};

export default KpiOverview;
