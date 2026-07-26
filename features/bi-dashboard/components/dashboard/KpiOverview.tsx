
import React from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '../Icons';
import { parseNumber, roundUp } from '../../utils/dashboardHelpers';
import { KpiCard } from '../../../../components/shared/ui/KpiCard';

interface KpiOverviewProps {
    isRealtime: boolean;
    kpiData: Record<string, string>;
    targets: { quyDoi: number; traGop: number };
    supermarketDailyTargets: Record<string, number>;
    supermarketMonthlyTargets?: Record<string, number>;
    activeSupermarket: string;
}

const KpiOverview: React.FC<KpiOverviewProps> = ({ isRealtime, kpiData, targets, supermarketDailyTargets, supermarketMonthlyTargets, activeSupermarket }) => {

    const dtlk = parseNumber(kpiData.dtlk);
    const dtqd = parseNumber(kpiData.dtqd);
    const dtDuKien = parseNumber(kpiData.dtDuKien);
    const dtDuKienQD = parseNumber(kpiData.dtDuKienQD);
    const hqqd = dtlk > 0 ? ((dtqd / dtlk) - 1) * 100 : 0;
    const tyTrongTraGop = parseNumber(kpiData.tyTrongTraGop);

    let totalVuotTroi = 0;
    let htTargetVuotTroi = 0;

    if (isRealtime) {
        totalVuotTroi = supermarketDailyTargets[activeSupermarket];
        if (activeSupermarket === 'Tổng') {
            totalVuotTroi = Object.values(supermarketDailyTargets).reduce<number>((sum, value) => sum + Number(value), 0);
        }
        htTargetVuotTroi = totalVuotTroi > 0 ? (dtqd / totalVuotTroi) * 100 : 0;
    }

    const renderGrowth = (val: string | undefined) => {
        if (!val || val === 'N/A' || val === '0%') return null;
        const num = parseNumber(val);
        const isPositive = num >= 0;
        return (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none ${
                isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
            }`}>
                {isPositive ? <ChevronUpIcon className="h-2 w-2" /> : <ChevronDownIcon className="h-2 w-2" />}
                {Math.abs(Math.ceil(num))}%
            </span>
        );
    };

    let totalVuotTroiMonthly = 0;
    if (!isRealtime && supermarketMonthlyTargets) {
        totalVuotTroiMonthly = supermarketMonthlyTargets[activeSupermarket] || 0;
        if (activeSupermarket === 'Tổng') {
            totalVuotTroiMonthly = Object.values(supermarketMonthlyTargets).reduce<number>((sum, value) => sum + Number(value), 0);
        }
    }

    const htTargetVuotTroiMonthly = totalVuotTroiMonthly > 0 ? (dtDuKienQD / totalVuotTroiMonthly) * 100 : parseNumber(kpiData.htTargetDuKienQD);

    const secondaryPct = isRealtime ? htTargetVuotTroi : htTargetVuotTroiMonthly;
    const secondaryLabel = isRealtime ? 'Mục tiêu ngày' : 'Mục tiêu tháng';
    const secondaryTargetStr = isRealtime
        ? (totalVuotTroi > 0 ? `${roundUp(totalVuotTroi).toLocaleString('vi-VN')} Tr` : undefined)
        : (totalVuotTroiMonthly > 0 ? `${roundUp(totalVuotTroiMonthly).toLocaleString('vi-VN')} Tr` : undefined);

    // --- Trạng thái đạt/chưa đạt mục tiêu — quyết định màu số liệu, đồng bộ đúng cách
    // KpiCards.tsx (module Phân Tích, chuẩn vàng) đang làm: đạt mục tiêu -> emerald,
    // chưa đạt -> giữ màu định danh riêng của từng thẻ (không dùng chung 1 màu "cảnh báo").
    const dtThucProgress = (!isRealtime && dtDuKien > 0) ? Math.ceil((dtlk / dtDuKien) * 100) : undefined;
    const dtqdIsGood = secondaryPct >= 100;
    const hqqdIsGood = hqqd >= targets.quyDoi;
    const traGopIsGood = tyTrongTraGop >= targets.traGop;

    return (
        <div className="js-kpi-overview-container space-y-1.5 sm:space-y-2.5 lg:space-y-4">
            {/* ROW 1: DOANH THU & CHỈ SỐ LỚN — cùng bộ icon/màu với module Phân Tích (constants.ts DEFAULT_KPI_CARDS) */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 lg:gap-4">
                <KpiCard
                    icon="dollar-sign"
                    iconColor="emerald"
                    title="DT Thực"
                    progressPercent={dtThucProgress}
                    isGood={dtThucProgress === undefined || dtThucProgress >= 100}
                    trendLabel={!isRealtime ? 'Dự kiến tháng' : undefined}
                    trendValue={!isRealtime ? (
                        <span className="flex flex-col items-center lg:items-end leading-tight gap-0.5">
                            <span>{dtDuKien > 0 ? `${roundUp(dtDuKien).toLocaleString('vi-VN')} Tr` : '-'}</span>
                            {renderGrowth(kpiData.dtckThang)}
                        </span>
                    ) : undefined}
                >
                    <div className="text-[15px] lg:text-2xl xl:text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                        {roundUp(dtlk).toLocaleString('vi-VN')} Tr
                    </div>
                </KpiCard>

                <KpiCard
                    icon="trending-up"
                    iconColor="sky"
                    title="DTQĐ"
                    progressPercent={Math.ceil(secondaryPct)}
                    isGood={dtqdIsGood}
                    trendLabel={secondaryLabel}
                    trendValue={secondaryTargetStr || '-'}
                >
                    <div className={`text-[15px] lg:text-2xl xl:text-[28px] font-extrabold leading-none tracking-tight tabular-nums ${dtqdIsGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`}>
                        {roundUp(dtqd).toLocaleString('vi-VN')} Tr
                    </div>
                </KpiCard>

                <KpiCard
                    icon="activity"
                    iconColor="indigo"
                    title="HQQĐ"
                    progressPercent={hqqd > 0 ? Math.ceil((hqqd / targets.quyDoi) * 100) : 0}
                    isGood={hqqdIsGood}
                    trendLabel="Mục tiêu"
                    trendValue={`${targets.quyDoi}%`}
                >
                    <div className={`text-[15px] lg:text-2xl xl:text-[28px] font-extrabold leading-none tracking-tight tabular-nums ${hqqdIsGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
                        {Math.ceil(hqqd)}%
                    </div>
                </KpiCard>

                <KpiCard
                    icon="credit-card"
                    iconColor="amber"
                    title="Trả Chậm"
                    progressPercent={tyTrongTraGop > 0 ? Math.ceil((tyTrongTraGop / targets.traGop) * 100) : 0}
                    isGood={traGopIsGood}
                    trendLabel="Mục tiêu"
                    trendValue={`${targets.traGop}%`}
                >
                    <div className={`text-[15px] lg:text-2xl xl:text-[28px] font-extrabold leading-none tracking-tight tabular-nums ${traGopIsGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {Math.ceil(tyTrongTraGop)}%
                    </div>
                </KpiCard>
            </div>

            {/* ROW 2: CHỈ SỐ PHỤ — không có mục tiêu/tiến độ, chỉ badge tăng/giảm so với kỳ trước */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 lg:gap-4">
                <KpiCard icon="users" iconColor="sky" title="L.Khách" trendValue={renderGrowth(kpiData.luotKhachChange)}>
                    <div className="text-[15px] lg:text-2xl xl:text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-sky-600 dark:text-sky-400">
                        {roundUp(parseNumber(kpiData.lkhach)).toLocaleString('vi-VN')}
                    </div>
                </KpiCard>

                <KpiCard icon="shield-check" iconColor="amber" title="TLPVTC" trendValue={renderGrowth(kpiData.tlpvChange)}>
                    <div className="text-[15px] lg:text-2xl xl:text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-amber-600 dark:text-amber-400">
                        {Math.ceil(parseNumber(kpiData.tlpv))}%
                    </div>
                </KpiCard>

                <KpiCard icon="receipt" iconColor="emerald" title="Bill Bán" trendValue={!isRealtime ? renderGrowth(kpiData.traGopChange) : undefined}>
                    <div className="text-[15px] lg:text-2xl xl:text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                        {isRealtime ? roundUp(parseNumber(kpiData.lbillBH)).toLocaleString('vi-VN') : `${Math.ceil(tyTrongTraGop)}%`}
                    </div>
                </KpiCard>

                <KpiCard icon="wallet" iconColor="rose" title="Bill T.Hộ">
                    <div className="text-[15px] lg:text-2xl xl:text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-rose-600 dark:text-rose-400">
                        {kpiData.lbillTH ? roundUp(parseNumber(kpiData.lbillTH)).toLocaleString('vi-VN') : '0'}
                    </div>
                </KpiCard>
            </div>
        </div>
    );
};

export default KpiOverview;
