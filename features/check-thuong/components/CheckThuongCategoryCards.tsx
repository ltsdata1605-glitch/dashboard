import React from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';
import { CHECK_THUONG_COLS, parseNumber, formatCurrency, formatPercent, formatNumber } from '../services/checkThuongCalc';
import { getPotentialBonus, CheckThuongPreprocessed } from '../services/checkThuongSearch';
import { CheckThuongGroupDef } from '../types';

interface CheckThuongCategoryCardsProps {
    groups: CheckThuongGroupDef[];
    preprocessed: CheckThuongPreprocessed;
    onSelectCategory: (categoryName: string, channel: string) => void;
    onExportGroup?: (groupKey: string) => void;
}

const CARD_PASTELS = [
    'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
    'bg-sky-200 text-sky-900 dark:bg-sky-900/60 dark:text-sky-200',
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200',
    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200',
    'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
    'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
    'bg-slate-200 text-slate-900 dark:bg-slate-800/80 dark:text-slate-200',
    'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-200',
];

const getCardPastel = (name: string): string => {
    if (!name) return CARD_PASTELS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash % CARD_PASTELS.length);
    return CARD_PASTELS[idx];
};

export const CheckThuongCategoryCards: React.FC<CheckThuongCategoryCardsProps> = ({
    groups,
    preprocessed,
    onSelectCategory,
    onExportGroup
}) => {
    return (
        <div className="space-y-4">
            {groups.map(group => {
                if (!group.data || group.data.length === 0) return null;

                return (
                    <div
                        key={group.key}
                        id={`group-section-${group.key}`}
                        className="rounded-popup border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
                    >
                        {/* Group Header */}
                        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between">
                            <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                {group.title} ({group.data.length})
                            </span>
                            {onExportGroup && (
                                <Button
                                    variant="unstyled"
                                    size="none"
                                    type="button"
                                    onClick={() => onExportGroup(group.key)}
                                    title="Xuất ảnh nhóm này"
                                    aria-label="Xuất ảnh nhóm này"
                                    className="ycx-hit p-1 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 shadow-xs cursor-pointer no-print hide-on-export"
                                >
                                    <AppIcon name="image" size="xs" />
                                </Button>
                            )}
                        </div>

                        {/* Card Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 p-3">
                            {group.data.map((row, index) => {
                                const categoryName = String(row[CHECK_THUONG_COLS.NGANH_HANG] || '');
                                const channel = String(row[CHECK_THUONG_COLS.KENH] || '');
                                const groupKey2 = `${channel || 'N/A'}|${categoryName}`.toUpperCase();
                                const groupHasFund = !preprocessed.noFundGroups.has(groupKey2);

                                const actualBonus = parseNumber(row[CHECK_THUONG_COLS.TONG_THUONG]);
                                const isAchieved = group.key === 'achieved';
                                const isNearly = group.key === 'nearly';
                                const showDuKien = !isAchieved && groupHasFund && actualBonus === 0;

                                let thuongVuot = 0;
                                let thuongTop = 0;
                                let totalBonus = 0;

                                if (showDuKien || isNearly) {
                                    const potential = getPotentialBonus(row, preprocessed);
                                    thuongVuot = potential.vuot;
                                    thuongTop = potential.top;
                                    totalBonus = thuongVuot + thuongTop;
                                } else {
                                    thuongVuot = parseNumber(row[CHECK_THUONG_COLS.THUONG_VUOT_UU]);
                                    thuongTop = parseNumber(row[CHECK_THUONG_COLS.THUONG_TOP_PERCENT]);
                                    totalBonus = actualBonus;
                                }

                                const isDuKien = showDuKien || isNearly;
                                const pastelStyle = getCardPastel(categoryName);

                                return (
                                    <div
                                        key={`${categoryName}-${index}`}
                                        onClick={() => onSelectCategory(categoryName, channel)}
                                        className="rounded-popup border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group/card"
                                    >
                                        {/* Card Title */}
                                        <div className={`px-3 py-1.5 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between ${pastelStyle}`}>
                                            <h4 className="text-[11px] font-black uppercase truncate group-hover/card:underline">
                                                {categoryName}
                                            </h4>
                                            <span className="text-[11px] font-bold opacity-60">
                                                #{index + 1}
                                            </span>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-2.5 text-[11px] space-y-1.5 flex-1 flex flex-col justify-center">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-slate-400 font-medium">% D.Kiến</span>
                                                <span className="font-black text-sm text-sky-600 dark:text-sky-400">
                                                    {formatPercent(row[CHECK_THUONG_COLS.PERCENT_DU_KIEN])}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-slate-400 font-medium">D.Kiến Vượt</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                    {formatNumber(row[CHECK_THUONG_COLS.DU_KIEN_VUOT])}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-slate-400 font-medium">Hạng (VT / %)</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                    {row[CHECK_THUONG_COLS.HANG_VUOT_UU] || '-'} / {row[CHECK_THUONG_COLS.HANG_PERCENT_TARGET] || '-'}
                                                </span>
                                            </div>

                                            {/* Sub bonuses if both exist */}
                                            {thuongVuot > 0 && thuongTop > 0 && (
                                                <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-0.5">
                                                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                                                        <span>Vượt trội:</span>
                                                        <span>{formatCurrency(thuongVuot)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sky-600 dark:text-sky-400 font-semibold">
                                                        <span>Top % Target:</span>
                                                        <span>{formatCurrency(thuongTop)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Footer */}
                                        <div className={`px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center ${
                                            isDuKien ? 'bg-amber-50/70 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                                        }`}>
                                            <span className="text-[11px] font-bold uppercase tracking-wider">
                                                {isDuKien ? 'D.Kiến Thưởng' : 'Tổng Thưởng'}
                                            </span>
                                            <span className="text-xs font-black">
                                                {formatCurrency(totalBonus)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
