import React, { useState, useMemo } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';
import {
    CHECK_THUONG_COLS,
    parseNumber,
    formatCurrency,
    formatPercent,
    extractStoreCodeAndName
} from '../services/checkThuongCalc';
import { compareTwoStores, getGroupDefinitions, CheckThuongPreprocessed } from '../services/checkThuongSearch';

interface CheckThuongComparisonViewProps {
    store1Data: any[][];
    store2Data: any[][];
    code1: string;
    code2: string;
    preprocessed: CheckThuongPreprocessed;
    onExportComparison?: () => void;
    containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const CheckThuongComparisonView: React.FC<CheckThuongComparisonViewProps> = ({
    store1Data,
    store2Data,
    code1,
    code2,
    preprocessed,
    onExportComparison,
    containerRef
}) => {
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [showAllAwarded, setShowAllAwarded] = useState(false);

    const store1Info = store1Data[0]?.[CHECK_THUONG_COLS.SIEU_THI] || `Kho ${code1}`;
    const store2Info = store2Data[0]?.[CHECK_THUONG_COLS.SIEU_THI] || `Kho ${code2}`;
    const name1 = extractStoreCodeAndName(store1Info).storeName;
    const name2 = extractStoreCodeAndName(store2Info).storeName;

    const calcStats = (data: any[][]) => {
        const groups = getGroupDefinitions(data, preprocessed);
        return {
            totalBonus: data.reduce((sum, r) => sum + parseNumber(r[CHECK_THUONG_COLS.TONG_THUONG]), 0),
            achieved: groups.find(g => g.key === 'achieved')?.data.length || 0,
            nearly: groups.find(g => g.key === 'nearly')?.data.length || 0,
            noSale: groups.find(g => g.key === 'noSale')?.data.length || 0,
        };
    };

    const stats1 = useMemo(() => calcStats(store1Data), [store1Data, preprocessed]);
    const stats2 = useMemo(() => calcStats(store2Data), [store2Data, preprocessed]);

    const comparisonList = useMemo(() => {
        const list = compareTwoStores(store1Data, store2Data);
        list.sort((a, b) => sortDir === 'asc' ? a.bonusDiff - b.bonusDiff : b.bonusDiff - a.bonusDiff);
        return list;
    }, [store1Data, store2Data, sortDir]);

    const store1Awarded = useMemo(() => {
        return store1Data
            .filter(r => parseNumber(r[CHECK_THUONG_COLS.TONG_THUONG]) > 0)
            .sort((a, b) => parseNumber(b[CHECK_THUONG_COLS.TONG_THUONG]) - parseNumber(a[CHECK_THUONG_COLS.TONG_THUONG]));
    }, [store1Data]);

    const store2Awarded = useMemo(() => {
        return store2Data
            .filter(r => parseNumber(r[CHECK_THUONG_COLS.TONG_THUONG]) > 0)
            .sort((a, b) => parseNumber(b[CHECK_THUONG_COLS.TONG_THUONG]) - parseNumber(a[CHECK_THUONG_COLS.TONG_THUONG]));
    }, [store2Data]);

    const formatBonusDiff = (diff: number) => {
        if (!diff) return '-';
        const formatted = formatCurrency(Math.abs(diff));
        return diff > 0 ? `+${formatted}` : `-${formatted}`;
    };

    return (
        <div ref={containerRef} className="space-y-4">
            {/* Header Title & Export Button */}
            <div className="flex items-center justify-between p-3.5 rounded-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-popup bg-gradient-to-tr from-sky-500 to-sky-600 text-white flex items-center justify-center">
                        <AppIcon name="quick" size="xs" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-[17px] font-black text-slate-800 dark:text-slate-100 sm:leading-7">
                            So Sánh Trực Diện Hai Siêu Thị
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Đối đầu {code1} ({name1}) vs {code2} ({name2})
                        </p>
                    </div>
                </div>

                {onExportComparison && (
                    <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={onExportComparison}
                        title="Xuất ảnh so sánh"
                        aria-label="Xuất ảnh so sánh"
                        className="no-print lg:w-9 lg:h-9 text-slate-400 hover:text-slate-700"
                    >
                        <AppIcon name="exportImage" size="md" />
                    </Button>
                )}
            </div>

            {/* Head-to-Head Cards */}
            <div className="grid grid-cols-2 gap-3">
                {/* Store 1 Card */}
                <div className="p-3.5 rounded-card border border-sky-200 dark:border-sky-900/60 bg-gradient-to-br from-sky-50/70 to-white dark:from-sky-950/30 dark:to-slate-900 shadow-xs space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-sky-500 text-white">
                            {code1}
                        </span>
                        <h3 className="text-xs sm:text-sm font-black text-sky-900 dark:text-sky-300 truncate">
                            {name1}
                        </h3>
                    </div>
                    <div className="pt-2 border-t border-sky-100 dark:border-sky-900/40 space-y-1 text-xs">
                        <div className="flex justify-between items-baseline">
                            <span className="text-slate-500 text-[11px]">Tổng Thưởng:</span>
                            <span className="font-black text-sm text-sky-700 dark:text-sky-400">
                                {formatCurrency(stats1.totalBonus)}
                            </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Đạt thưởng:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{stats1.achieved}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Sắp có thưởng:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{stats1.nearly}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">No Sale:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{stats1.noSale}</span>
                        </div>
                    </div>
                </div>

                {/* Store 2 Card */}
                <div className="p-3.5 rounded-card border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/70 to-white dark:from-amber-950/30 dark:to-slate-900 shadow-xs space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-600 text-white">
                            {code2}
                        </span>
                        <h3 className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-300 truncate">
                            {name2}
                        </h3>
                    </div>
                    <div className="pt-2 border-t border-amber-100 dark:border-amber-900/40 space-y-1 text-xs">
                        <div className="flex justify-between items-baseline">
                            <span className="text-slate-500 text-[11px]">Tổng Thưởng:</span>
                            <span className="font-black text-sm text-amber-700 dark:text-amber-400">
                                {formatCurrency(stats2.totalBonus)}
                            </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Đạt thưởng:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{stats2.achieved}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">Sắp có thưởng:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{stats2.nearly}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">No Sale:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{stats2.noSale}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Strengths Top 3 */}
            <div className="p-4 rounded-card border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                        Top 3 Nhóm Thưởng Cao Nhất
                    </h4>
                    <Button
                        variant="inline-link"
                        type="button"
                        aria-expanded={showAllAwarded}
                        onClick={() => setShowAllAwarded(!showAllAwarded)}
                        className="ycx-hit text-[11px] font-bold no-print"
                    >
                        {showAllAwarded ? 'Thu gọn' : 'Xem tất cả'}
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Store 1 Top 3 */}
                    <div className="p-2.5 rounded-popup bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 space-y-1">
                        <p className="font-bold text-sky-800 dark:text-sky-300 text-[11px] truncate mb-1">
                            {name1}
                        </p>
                        {(showAllAwarded ? store1Awarded : store1Awarded.slice(0, 3)).map((r, i) => (
                            <div key={i} className="flex justify-between items-center text-[11px] py-0.5 border-b border-sky-100/50 last:border-0">
                                <span className="truncate pr-1">{r[CHECK_THUONG_COLS.NGANH_HANG]}</span>
                                <span className="font-bold text-sky-700 dark:text-sky-400 shrink-0">
                                    {formatCurrency(r[CHECK_THUONG_COLS.TONG_THUONG])}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Store 2 Top 3 */}
                    <div className="p-2.5 rounded-popup bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 space-y-1">
                        <p className="font-bold text-amber-800 dark:text-amber-300 text-[11px] truncate mb-1">
                            {name2}
                        </p>
                        {(showAllAwarded ? store2Awarded : store2Awarded.slice(0, 3)).map((r, i) => (
                            <div key={i} className="flex justify-between items-center text-[11px] py-0.5 border-b border-amber-100/50 last:border-0">
                                <span className="truncate pr-1">{r[CHECK_THUONG_COLS.NGANH_HANG]}</span>
                                <span className="font-bold text-amber-700 dark:text-amber-400 shrink-0">
                                    {formatCurrency(r[CHECK_THUONG_COLS.TONG_THUONG])}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="rounded-card border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                        Chi Tiết Ngành Hàng
                    </h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse tabular-nums">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                <th rowSpan={2} className="px-3 py-2 text-left">Ngành Hàng</th>
                                <th colSpan={3} className="px-2 py-1 text-center bg-sky-100/80 dark:bg-sky-950/50 text-sky-900 dark:text-sky-300 border-r border-slate-200 dark:border-slate-700">
                                    {name1}
                                </th>
                                <th colSpan={3} className="px-2 py-1 text-center bg-amber-100/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700">
                                    {name2}
                                </th>
                                <th
                                    rowSpan={2}
                                    onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    className="px-2 py-2 text-center bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 cursor-pointer hover:bg-emerald-200 w-20"
                                >
                                    +/- {sortDir === 'asc' ? '▲' : '▼'}
                                </th>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-slate-850 text-[11px] font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-1.5 py-1 text-center">%DK</th>
                                <th className="px-1.5 py-1 text-center">Hạng</th>
                                <th className="px-2 py-1 text-center border-r border-slate-200 dark:border-slate-700">Thưởng</th>
                                <th className="px-1.5 py-1 text-center">%DK</th>
                                <th className="px-1.5 py-1 text-center">Hạng</th>
                                <th className="px-2 py-1 text-center border-r border-slate-200 dark:border-slate-700">Thưởng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                            {comparisonList.map((item, idx) => {
                                const diff = item.bonusDiff;
                                const diffColor = diff > 0 ? 'text-emerald-600 font-black' : diff < 0 ? 'text-rose-500 font-bold' : 'text-slate-400';

                                return (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="px-3 py-1.5 font-medium truncate max-w-[130px]">
                                            {item.category}
                                        </td>
                                        <td className="px-1.5 py-1.5 text-center bg-sky-50/30">
                                            {item.row1 ? formatPercent(item.percent1) : '-'}
                                        </td>
                                        <td className="px-1.5 py-1.5 text-center bg-sky-50/30">
                                            {item.rankV1 !== Infinity ? item.rankV1 : '-'}
                                        </td>
                                        <td className="px-2 py-1.5 text-right font-bold text-sky-700 dark:text-sky-400 bg-sky-50/30 border-r border-slate-100 dark:border-slate-800">
                                            {formatCurrency(item.bonus1)}
                                        </td>
                                        <td className="px-1.5 py-1.5 text-center bg-amber-50/30">
                                            {item.row2 ? formatPercent(item.percent2) : '-'}
                                        </td>
                                        <td className="px-1.5 py-1.5 text-center bg-amber-50/30">
                                            {item.rankV2 !== Infinity ? item.rankV2 : '-'}
                                        </td>
                                        <td className="px-2 py-1.5 text-right font-bold text-amber-700 dark:text-amber-400 bg-amber-50/30 border-r border-slate-100 dark:border-slate-800">
                                            {formatCurrency(item.bonus2)}
                                        </td>
                                        <td className={`px-2 py-1.5 text-right bg-emerald-50/20 ${diffColor}`}>
                                            {formatBonusDiff(diff)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
