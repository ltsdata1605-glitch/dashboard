import React from 'react';
import { Store, Trophy, TrendingUp, Coins } from 'lucide-react';
import { CheckThuongSystemStats } from '../types';

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-3">
            {/* THẺ 1: TỔNG SIÊU THỊ */}
            <div className="relative overflow-hidden rounded-none bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Tổng Siêu Thị
                    </span>
                    <div className="w-5 h-5 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <Store className="w-3 h-3" />
                    </div>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                        {stats.totalStores.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">kho</span>
                </div>
            </div>

            {/* THẺ 2: TỔNG TIỀN THƯỞNG */}
            <div
                className="relative overflow-hidden rounded-none bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                title={`${stats.totalBonus.toLocaleString('vi-VN')} đ`}
            >
                <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Tổng Tiền Thưởng
                    </span>
                    <div className="w-5 h-5 rounded-none bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Coins className="w-3 h-3" />
                    </div>
                </div>
                <div className="mt-1 truncate">
                    <span className="text-base sm:text-lg font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                        {formatMillion(stats.totalBonus)}
                    </span>
                </div>
            </div>

            {/* THẺ 3: TOP 1 THƯỞNG CAO NHẤT */}
            <div
                onClick={() => stats.topStore && onSelectTopStore?.(stats.topStore.storeCode)}
                className={`relative overflow-hidden rounded-none bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
                    stats.topStore ? 'cursor-pointer hover:border-sky-400' : ''
                }`}
                title={stats.topStore ? `Kho ${stats.topStore.storeCode}: ${stats.topStore.totalBonus.toLocaleString('vi-VN')} đ` : undefined}
            >
                <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-500" />
                        Quán Quân #1
                    </span>
                    <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded-none bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        TOP 1
                    </span>
                </div>
                <div className="mt-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {stats.topStore ? stats.topStore.storeName : '---'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">
                            {stats.topStore ? formatMillion(stats.topStore.totalBonus) : '---'}
                        </span>
                        {stats.topStore && (
                            <span className="text-[10px] text-slate-400">
                                ({stats.topStore.channel})
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* THẺ 4: TỈ LỆ ĐẠT 100% TRUNG BÌNH */}
            <div className="relative overflow-hidden rounded-none bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Đạt 100% Bình Quân
                    </span>
                    <div className="w-5 h-5 rounded-none bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-3 h-3" />
                    </div>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {stats.avgAchievedPercent}%
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">ngành</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-none mt-1.5 overflow-hidden">
                    <div
                        className="bg-emerald-500 h-full rounded-none transition-all duration-500"
                        style={{ width: `${Math.min(100, stats.avgAchievedPercent)}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
