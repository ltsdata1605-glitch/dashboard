import React from 'react';
import { CheckThuongSystemStats } from '../types';
import { KpiCard } from '../../../components/shared/ui/KpiCard';
import { formatBonusMoney } from '../services/checkThuongCalc';

interface CheckThuongSummaryCardsProps {
    stats: CheckThuongSystemStats;
    onSelectTopStore?: (code: string) => void;
}

export const CheckThuongSummaryCards: React.FC<CheckThuongSummaryCardsProps> = ({
    stats,
    onSelectTopStore
}) => {
    const totalBonus = formatBonusMoney(stats.totalBonus);
    const topStoreBonus = formatBonusMoney(stats.topStore?.totalBonus ?? 0);

    return (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 lg:gap-4 mb-3">
            {/* THẺ 1: TỔNG SIÊU THỊ */}
            <KpiCard
                icon="store"
                iconColor="sky"
                title={
                    <>
                        <span className="hidden sm:inline">Tổng Siêu Thị</span>
                        <span className="sm:hidden">Tổng kho</span>
                    </>
                }
                cardTitle="Tổng Siêu Thị"
                trendLabel="Toàn hệ thống"
                trendValue={<span className="text-[11px] font-bold text-slate-500">Hoạt động</span>}
            >
                <div className="flex items-baseline justify-center gap-0.5 sm:gap-1 flex-nowrap overflow-hidden w-full">
                    <span className="text-[16px] sm:text-[20px] lg:text-[25px] xl:text-[28px] font-black leading-none tracking-tight tabular-nums text-slate-800 dark:text-slate-100 shrink-0">
                        {stats.totalStores.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-[11px] sm:text-[13px] lg:text-[14px] font-extrabold text-slate-400 dark:text-slate-500 shrink-0">kho</span>
                </div>
            </KpiCard>

            {/* THẺ 2: TỔNG TIỀN THƯỞNG */}
            <KpiCard
                icon="wallet"
                iconColor="indigo"
                title={
                    <>
                        <span className="hidden sm:inline">Tổng Tiền Thưởng</span>
                        <span className="sm:hidden">Tổng tiền</span>
                    </>
                }
                cardTitle="Tổng Tiền Thưởng"
                trendLabel="Quỹ thưởng"
                trendValue={<span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">Đã chốt</span>}
            >
                <div className="flex items-baseline justify-center gap-0.5 sm:gap-1 flex-nowrap overflow-hidden w-full">
                    <span className="text-[16px] sm:text-[20px] lg:text-[25px] xl:text-[28px] font-black leading-none tracking-tight tabular-nums text-indigo-600 dark:text-indigo-400 shrink-0">
                        {totalBonus.value}
                    </span>
                    <span className="text-[11px] sm:text-[13px] lg:text-[14px] font-extrabold text-slate-400 dark:text-slate-500 shrink-0">
                        {totalBonus.unit}
                    </span>
                </div>
            </KpiCard>

            {/* THẺ 3: TOP 1 THƯỞNG CAO NHẤT */}
            <KpiCard
                icon="award"
                iconColor="amber"
                title={
                    <>
                        <span className="hidden sm:inline">Quán Quân #1</span>
                        <span className="sm:hidden">Top 1</span>
                    </>
                }
                cardTitle="Quán Quân #1"
                badge={
                    <span className="px-1.5 py-0.5 text-[11px] font-black uppercase rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50">
                        TOP 1
                    </span>
                }
                onClick={stats.topStore ? () => onSelectTopStore?.(stats.topStore!.storeCode) : undefined}
                trendLabel="Kênh bán"
                trendValue={<span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-full block">{stats.topStore?.channel || '---'}</span>}
            >
                <div className="flex flex-col items-center justify-center w-full min-w-0">
                    <div className="flex items-baseline justify-center gap-0.5 sm:gap-1 flex-nowrap overflow-hidden w-full">
                        <span className="text-[16px] sm:text-[20px] lg:text-[25px] xl:text-[28px] font-black leading-none tracking-tight tabular-nums text-amber-600 dark:text-amber-400 shrink-0">
                            {topStoreBonus.value}
                        </span>
                        <span className="text-[11px] sm:text-[13px] lg:text-[14px] font-extrabold text-amber-500 dark:text-amber-400 shrink-0">
                            {topStoreBonus.unit}
                        </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate w-full text-center mt-0.5 leading-tight" title={stats.topStore?.storeName}>
                        {stats.topStore ? stats.topStore.storeName.replace(/^ĐML_|^TGD_|^DMX_|^TGDD_/, '') : '---'}
                    </span>
                </div>
            </KpiCard>

            {/* THẺ 4: TỈ LỆ ĐẠT 100% TRUNG BÌNH */}
            <KpiCard
                icon="trending-up"
                iconColor="emerald"
                title={
                    <>
                        <span className="hidden sm:inline">Đạt 100% Bình Quân</span>
                        <span className="sm:hidden">Đạt 100%</span>
                    </>
                }
                cardTitle="Đạt 100% Bình Quân"
                isGood={stats.avgAchievedPercent >= 80}
                trendLabel="Tỉ lệ đạt"
                trendValue={
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums shrink-0 ${
                        stats.avgAchievedPercent >= 80
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50'
                    }`}>
                        {stats.avgAchievedPercent >= 80 ? 'Đạt' : 'Cần nỗ lực'}
                    </span>
                }
            >
                <div className="flex items-baseline justify-center gap-0.5 sm:gap-1 flex-nowrap overflow-hidden w-full">
                    <span className="text-[16px] sm:text-[20px] lg:text-[25px] xl:text-[28px] font-black leading-none tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0">
                        {stats.avgAchievedPercent}
                    </span>
                    <span className="text-[11px] sm:text-[13px] lg:text-[14px] font-extrabold text-emerald-400 dark:text-emerald-500 shrink-0">
                        %
                    </span>
                </div>
            </KpiCard>
        </div>
    );
};
