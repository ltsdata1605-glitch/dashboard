import React from 'react';
import { RevenueRow, Employee } from '../../../types/nhanVienTypes';
import { roundUp } from '../../../utils/nhanVienHelpers';
import { MedalBadge, DeltaBadge } from '../../shared/Badges';
import AvatarDisplay from '../shared/AvatarDisplay';

import { ColorSettings, CriterionConfig } from './ColorSettingsModal';

interface RevenueDesktopRowProps {
    row: RevenueRow;
    isHighlighted: boolean;
    onHighlightToggle: (name: string) => void;
    onViewTrend: (employee: Employee) => void;
    supermarketName: string;
    colorSettings: ColorSettings;
    getHtColor: (val: number) => string;
    getDynamicColor: (val: number, config: CriterionConfig) => string | undefined;
    isShowRemaining?: boolean;
}

const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

export const RevenueDesktopRow = React.memo(({
    row,
    isHighlighted,
    onHighlightToggle,
    onViewTrend,
    supermarketName,
    colorSettings,
    getHtColor,
    getDynamicColor,
    isShowRemaining = false
}: RevenueDesktopRowProps) => {
    const prev = row.prevCompData;

    return (
        <tr className={`transition-all group cursor-pointer text-[13px] border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 ${isHighlighted ? 'bg-sky-50/70 dark:bg-sky-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
            <td className="px-2 py-1 whitespace-nowrap min-w-[180px] border-r border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                    <MedalBadge rank={row.rank} />
                    <AvatarDisplay employeeName={row.originalName!} supermarketName={supermarketName} onClick={() => onViewTrend(row as Employee)} />
                    <div className="flex flex-col min-w-0" onClick={() => onHighlightToggle(row.originalName!)}>
                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); onViewTrend(row as Employee); }} className="text-left font-bold text-sky-600 dark:text-sky-400 text-[13px] hover:text-sky-700 dark:hover:text-sky-300 transition-colors whitespace-normal break-words">{row.name}</button>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-3 py-1 text-[13px] text-center font-black border-r border-slate-100 dark:border-slate-800/60" style={{ color: getDynamicColor(row.dtlk, colorSettings.dtthuc) }}>
                <div>{f.format(roundUp(row.dtlk))}</div>
                <DeltaBadge current={row.dtlk} previous={prev?.dtlk} isCurrency />
            </td>
            <td className="px-3 py-1 text-[13px] text-center font-black border-r border-slate-100 dark:border-slate-800/60" style={{ color: getDynamicColor(row.dtqd, colorSettings.dtqd) || getHtColor(row.calculatedCompletion) }}>
                <div>{f.format(roundUp(row.dtqd))}</div>
                <DeltaBadge current={row.dtqd} previous={prev?.dtqd} isCurrency />
            </td>
            <td className="px-3 py-1 text-[13px] text-center font-black text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-800/60">
                <div>{f.format(roundUp(row.calculatedTarget || 0))}</div>
                <DeltaBadge current={row.calculatedTarget} previous={prev?.target} isCurrency />
            </td>
            {isShowRemaining && (
                <>
                    <td className="px-3 py-1 text-[13px] text-center font-black border-r border-slate-100 dark:border-slate-800/60 bg-orange-50/10 dark:bg-orange-950/5 text-orange-700 dark:text-orange-400">
                        <div>{f.format(roundUp(row.remaining_total || 0))}</div>
                    </td>
                    <td className={`px-3 py-1 text-[13px] text-center font-black border-r border-slate-100 dark:border-slate-800/60 bg-orange-50/10 dark:bg-orange-950/5 ${
                        row.type === 'employee' && row.remaining_daily_status === 'warning' ? 'text-rose-600 dark:text-rose-400' :
                        row.type === 'employee' && row.remaining_daily_status === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                        'text-orange-700 dark:text-orange-400'
                    }`}>
                        <div>{f.format(roundUp(row.remaining_daily || 0))}</div>
                    </td>
                </>
            )}
            <td className="px-3 py-1 text-[13px] text-center font-black border-r border-slate-100 dark:border-slate-800/60" style={{ color: getHtColor(row.calculatedCompletion) }}>
                <div>{roundUp(row.calculatedCompletion)}%</div>
                <DeltaBadge current={row.calculatedCompletion} previous={prev?.completion} isPercent />
            </td>
            <td className="px-3 py-1 text-[13px] text-center font-black border-r border-slate-100 dark:border-slate-800/60" style={{ color: getDynamicColor(row.hieuQuaQD * 100, colorSettings.hqqd) || getHtColor(row.calculatedCompletion) }}>
                <div>{isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%</div>
                <DeltaBadge current={row.hieuQuaQD * 100} previous={prev?.hqqd * 100} isPercent />
            </td>
            <td className="px-3 py-1 text-[13px] text-center font-black border-r border-slate-100 dark:border-slate-800/60">
                <div style={{ color: getDynamicColor(row.calculatedInstallment, colorSettings.tragop) }}>{roundUp(row.calculatedInstallment)}%</div>
                <DeltaBadge current={row.calculatedInstallment} previous={prev?.installment} isPercent />
            </td>
            <td className="px-3 py-1 text-[13px] text-center font-black border-r border-slate-100 dark:border-slate-800/60" style={{ color: getDynamicColor(row.pctBillBk, colorSettings.bankem) }}>
                <div>{roundUp(row.pctBillBk)}%</div>
                <DeltaBadge current={row.pctBillBk} previous={prev?.pctBillBk} isPercent />
            </td>
            <td className={`px-3 py-1 text-center ${
                !row.bonus_tong ? 'text-slate-400 dark:text-slate-500 font-medium text-[13px]' :
                row.bonus_tier === 'top' ? 'text-emerald-600 dark:text-emerald-400 text-[14px] font-black' :
                row.bonus_tier === 'bot' ? 'text-rose-500 dark:text-rose-400 text-[13px] font-bold' :
                'text-slate-900 dark:text-white text-[13px] font-black'
            }`}>
                <div>{row.bonus_tong ? f.format(Math.ceil(row.bonus_tong / 1000)) : '-'}</div>
            </td>
        </tr>
    );
});
