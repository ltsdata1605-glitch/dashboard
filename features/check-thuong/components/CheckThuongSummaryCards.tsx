import React from 'react';
import { CheckThuongSystemStats } from '../types';
import { KpiCard } from '../../../components/shared/ui/KpiCard';

interface CheckThuongSummaryCardsProps {
    stats: CheckThuongSystemStats;
    onSelectTopStore?: (code: string) => void;
}

export const CheckThuongSummaryCards: React.FC<CheckThuongSummaryCardsProps> = ({
    stats,
    onSelectTopStore
}) => {
    const formatMillion = (val: number): string => {
        if (!val || isNaN(val)) return '0 Tr';
        const inMillion = Math.round(val / 1000000);
        return `${inMillion.toLocaleString('vi-VN')} Tr`;
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4 mb-3">
            {/* THẺ 1: TỔNG SIÊU THỊ */}
            <KpiCard
                icon="store"
                iconColor="sky"
                title="Tổng Siêu Thị"
                trendLabel="Toàn hệ thống"
                trendValue={<span className="text-[11px] font-bold text-slate-500">Hoạt động</span>}
            >
                <div className="flex items-baseline justify-center gap-1 w-full">
                    <span className="text-[20px] xs:text-[22px] sm:text-[28px] md:text-[32px] lg:text-[36px] font-black leading-tight tracking-tight tabular-nums text-slate-800 dark:text-slate-100">
                        {stats.totalStores.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-[12px] sm:text-[14px] lg:text-[16px] font-extrabold text-slate-400 dark:text-slate-500">kho</span>
                </div>
            </KpiCard>

            {/* THẺ 2: TỔNG TIỀN THƯỞNG */}
            <KpiCard
                icon="wallet"
                iconColor="indigo"
                title="Tổng Tiền Thưởng"
                trendLabel="Quỹ thưởng"
                trendValue={<span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">Đã chốt</span>}
            >
                <div className="flex items-baseline justify-center gap-1 w-full">
                    <span className="text-[20px] xs:text-[22px] sm:text-[28px] md:text-[32px] lg:text-[36px] font-black leading-tight tracking-tight tabular-nums text-indigo-600 dark:text-indigo-400">
                        {formatMillion(stats.totalBonus)}
                    </span>
                </div>
            </KpiCard>

            {/* THẺ 3: TOP 1 THƯỞNG CAO NHẤT */}
            <KpiCard
                icon="award"
                iconColor="amber"
                title="Quán Quân #1"
                badge={
                    <span className="px-1.5 py-0.5 text-[10px] font-black uppercase rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50">
                        TOP 1
                    </span>
                }
                onClick={stats.topStore ? () => onSelectTopStore?.(stats.topStore!.storeCode) : undefined}
                trendLabel="Kênh bán"
                trendValue={<span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{stats.topStore?.channel || '---'}</span>}
            >
                <div className="flex flex-col items-center justify-center w-full min-w-0">
                    <span className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 dark:text-slate-100 truncate w-full text-center">
                        {stats.topStore ? stats.topStore.storeName : '---'}
                    </span>
                    <span className="text-[12px] sm:text-[14px] font-black text-amber-600 dark:text-amber-400 tabular-nums">
                        {stats.topStore ? formatMillion(stats.topStore.totalBonus) : '---'}
                    </span>
                </div>
            </KpiCard>

            {/* THẺ 4: TỈ LỆ ĐẠT 100% TRUNG BÌNH */}
            <KpiCard
                icon="trending-up"
                iconColor="emerald"
                title="Đạt 100% Bình Quân"
                isGood={stats.avgAchievedPercent >= 80}
                trendLabel="Tỉ lệ đạt"
                trendValue={
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums shrink-0 ${
                        stats.avgAchievedPercent >= 80
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50'
                    }`}>
                        {stats.avgAchievedPercent >= 80 ? 'Đạt' : 'Cần nỗ lực'}
                    </span>
                }
            >
                <div className="flex items-baseline justify-center gap-1 w-full">
                    <span className="text-[20px] xs:text-[22px] sm:text-[28px] md:text-[32px] lg:text-[36px] font-black leading-tight tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                        {stats.avgAchievedPercent}%
                    </span>
                </div>
            </KpiCard>
        </div>
    );
};
