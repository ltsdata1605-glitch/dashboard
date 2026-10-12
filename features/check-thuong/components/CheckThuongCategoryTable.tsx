import React from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { CHECK_THUONG_COLS, parseNumber, formatCurrency, formatPercent, formatNumber } from '../services/checkThuongCalc';
import { getPotentialBonus, CheckThuongPreprocessed } from '../services/checkThuongSearch';
import { CheckThuongGroupDef } from '../types';

interface CheckThuongCategoryTableProps {
    groups: CheckThuongGroupDef[];
    preprocessed: CheckThuongPreprocessed;
    onSelectCategory: (categoryName: string, channel: string) => void;
    onExportGroup?: (groupKey: string) => void;
}

const PASTEL_HEADERS: Record<string, string> = {
    achieved: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    nearly: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    achieved100: 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    notAchieved100: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    noFund: 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    noSale: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
};

export const CheckThuongCategoryTable: React.FC<CheckThuongCategoryTableProps> = ({
    groups,
    preprocessed,
    onSelectCategory,
    onExportGroup
}) => {
    return (
        <div className="space-y-4">
            {groups.map(group => {
                if (!group.data || group.data.length === 0) return null;
                const headerStyle = PASTEL_HEADERS[group.key] || PASTEL_HEADERS.achieved;

                return (
                    <div
                        key={group.key}
                        id={`group-section-${group.key}`}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
                    >
                        {/* Group Header */}
                        <div className={`px-4 py-2.5 border-b flex items-center justify-between ${headerStyle}`}>
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs uppercase tracking-wider">
                                    {group.title} ({group.data.length})
                                </span>
                            </div>

                            {onExportGroup && (
                                <button
                                    type="button"
                                    onClick={() => onExportGroup(group.key)}
                                    title="Xuất ảnh nhóm này"
                                    className="p-1 rounded-md bg-white/60 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 text-slate-700 dark:text-slate-300 transition-all cursor-pointer no-print"
                                >
                                    <AppIcon name="image" size="xs" />
                                </button>
                            )}
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse tabular-nums text-xs">
                                <thead>
                                    <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 select-none">
                                        <th className="px-3 py-2 text-left">Ngành Hàng</th>
                                        <th className="px-2 py-2 text-center w-24">% D.Kiến</th>
                                        <th className="px-2 py-2 text-center w-20">D.K Vượt</th>
                                        <th className="px-2 py-2 text-center w-24">Hạng (VT/%)</th>
                                        <th className="px-3 py-2 text-right w-28">Tổng Thưởng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {group.data.map((row, index) => {
                                        const categoryName = String(row[CHECK_THUONG_COLS.NGANH_HANG] || '');
                                        const channel = String(row[CHECK_THUONG_COLS.KENH] || '');
                                        const actualBonus = parseNumber(row[CHECK_THUONG_COLS.TONG_THUONG]);

                                        const potential = getPotentialBonus(row, preprocessed);
                                        const potentialBonus = potential.total || (potential.vuot + potential.top);
                                        const isAchieved = actualBonus > 0;
                                        const groupKey2 = `${channel || 'N/A'}|${categoryName}`.toUpperCase();
                                        const groupHasFund = !preprocessed.noFundGroups.has(groupKey2);

                                        const percent = parseNumber(row[CHECK_THUONG_COLS.PERCENT_DU_KIEN]);
                                        const pctTextColor = percent >= 1
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : percent >= 0.7
                                            ? 'text-sky-600 dark:text-sky-400'
                                            : 'text-amber-600 dark:text-amber-400';

                                        const pctBarColor = percent >= 1
                                            ? 'bg-emerald-500'
                                            : percent >= 0.7
                                            ? 'bg-sky-500'
                                            : 'bg-amber-500';

                                        const cutoffRank = parseInt(String(row[CHECK_THUONG_COLS.LAY_TOP_10] || ''), 10);
                                        const rankVuot = parseInt(String(row[CHECK_THUONG_COLS.HANG_VUOT_UU] || ''), 10);
                                        const rankTarget = parseInt(String(row[CHECK_THUONG_COLS.HANG_PERCENT_TARGET] || ''), 10);
                                        const isNearly = groupHasFund && !isAchieved && !isNaN(cutoffRank) &&
                                            ((!isNaN(rankVuot) && rankVuot > cutoffRank && rankVuot <= cutoffRank + 20) ||
                                             (!isNaN(rankTarget) && rankTarget > cutoffRank && rankTarget <= cutoffRank + 20));

                                        const hangVuot = row[CHECK_THUONG_COLS.HANG_VUOT_UU] || '-';
                                        const hangPercent = row[CHECK_THUONG_COLS.HANG_PERCENT_TARGET] || '-';

                                        return (
                                            <tr
                                                key={`${categoryName}-${index}`}
                                                onClick={() => onSelectCategory(categoryName, channel)}
                                                className="hover:bg-sky-50/60 dark:hover:bg-sky-950/20 cursor-pointer transition-colors group/row"
                                            >
                                                {/* Ngành hàng & Rank */}
                                                <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 w-5 shrink-0">
                                                            #{index + 1}
                                                        </span>
                                                        <span className="truncate max-w-[140px] sm:max-w-xs group-hover/row:text-sky-600 dark:group-hover/row:text-sky-400 group-hover/row:underline">
                                                            {categoryName}
                                                        </span>
                                                        {isNearly && (
                                                            <span title="Môn này sắp lọt vào Top có thưởng!" className="text-amber-500 animate-pulse shrink-0">
                                                                <AppIcon name="quick" size="xs" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* % Dự kiến */}
                                                <td className="px-2 py-2 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <span className={`font-bold text-[11px] ${pctTextColor}`}>
                                                            {formatPercent(percent)}
                                                        </span>
                                                        <div className="w-8 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                                                            <div
                                                                className={`h-full rounded-full ${pctBarColor}`}
                                                                style={{ width: `${Math.min(100, Math.round(percent * 100))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Dự kiến vượt */}
                                                <td className="px-2 py-2 text-center font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-[11px]">
                                                    {formatNumber(row[CHECK_THUONG_COLS.DU_KIEN_VUOT])}
                                                </td>

                                                {/* Hạng */}
                                                <td className="px-2 py-2 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap text-[11px]">
                                                    {hangVuot} <span className="opacity-40">/</span> {hangPercent}
                                                </td>

                                                {/* Tổng thưởng */}
                                                <td className="px-3 py-2 text-right whitespace-nowrap font-bold text-xs">
                                                    {actualBonus > 0 ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                                            {formatCurrency(actualBonus)}
                                                        </span>
                                                    ) : potentialBonus > 0 && groupHasFund ? (
                                                        <span
                                                            title={`Thưởng dự kiến nếu đạt giải: ${formatCurrency(potentialBonus)}`}
                                                            className="text-amber-600 dark:text-amber-400 font-bold"
                                                        >
                                                            ~{formatCurrency(potentialBonus)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600 font-medium">0</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
