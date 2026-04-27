import React from 'react';
import { RevenueRow, Employee } from '../../../types/nhanVienTypes';
import { roundUp } from '../../../utils/nhanVienHelpers';
import { MedalBadge, DeltaBadge } from '../../shared/Badges';
import { AvatarUploader } from '../../shared/AvatarUploader';
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
    getDynamicColor
}: RevenueDesktopRowProps) => {
    const prev = row.prevCompData;

    return (
        <tr className={`transition-all group cursor-pointer text-[13px] border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 ${isHighlighted ? 'bg-sky-50/70 dark:bg-sky-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
            <td className="px-4 py-2 whitespace-nowrap min-w-[180px] border-r border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-3">
                    <MedalBadge rank={row.rank} />
                    <div className="relative">
                        <AvatarUploader employeeName={row.originalName!} supermarketName={supermarketName} />
                        {isHighlighted && <div className="absolute inset-0 rounded-full border-2 border-sky-400"></div>}
                    </div>
                    <div className="flex flex-col min-w-0" onClick={() => onHighlightToggle(row.originalName!)}>
                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); onViewTrend(row as Employee); }} className="text-left font-bold text-slate-800 dark:text-slate-100 text-[14px] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors whitespace-normal break-words">{row.name}</button>
                        </div>
                        <span className="text-[11px] text-slate-400 capitalize font-medium tabular-nums mt-0.5">{row.department}</span>
                    </div>
                </div>
            </td>
            <td className="px-3 py-2 text-[13px] text-center font-medium border-r border-slate-100 dark:border-slate-800/60" style={{ color: getDynamicColor(row.dtlk, colorSettings.dtthuc) }}>
                <div>{f.format(roundUp(row.dtlk))}</div>
                <DeltaBadge current={row.dtlk} previous={prev?.dtlk} isCurrency />
            </td>
            <td className="px-3 py-2 text-[13px] text-center font-black border-r border-slate-100 dark:border-slate-800/60">
                <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-white shadow-sm`} style={{ backgroundColor: getDynamicColor(row.dtqd, colorSettings.dtqd) || getHtColor(row.calculatedCompletion) }}>
                    {f.format(roundUp(row.dtqd))}
                </div>
                <DeltaBadge current={row.dtqd} previous={prev?.dtqd} isCurrency />
            </td>
            <td className="px-3 py-2 text-[12px] text-center italic font-medium text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-800/60">
                <div>{f.format(roundUp(row.calculatedTarget || 0))}</div>
                <DeltaBadge current={row.calculatedTarget} previous={prev?.target} isCurrency />
            </td>
            <td className="px-3 py-2 text-[13px] text-center font-black border-r border-slate-100 dark:border-slate-800/60" style={{ color: getHtColor(row.calculatedCompletion) }}>
                <div>{roundUp(row.calculatedCompletion)}%</div>
                <DeltaBadge current={row.calculatedCompletion} previous={prev?.completion} isPercent />
            </td>
            <td className="px-3 py-2 text-[13px] text-center font-bold border-r border-slate-100 dark:border-slate-800/60">
                <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-white shadow-sm`} style={{ backgroundColor: getDynamicColor(row.hieuQuaQD * 100, colorSettings.hqqd) || getHtColor(row.calculatedCompletion) }}>
                    {isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%
                </div>
                <DeltaBadge current={row.hieuQuaQD * 100} previous={prev?.hqqd * 100} isPercent />
            </td>
            <td className="px-3 py-2 text-[13px] text-center font-bold border-r border-slate-100 dark:border-slate-800/60">
                <div className="inline-block px-2 py-1 rounded text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800" style={{ color: getDynamicColor(row.calculatedInstallment, colorSettings.tragop) }}>{roundUp(row.calculatedInstallment)}%</div>
                <DeltaBadge current={row.calculatedInstallment} previous={prev?.installment} isPercent />
            </td>
            <td className="px-3 py-2 text-[13px] text-center font-black" style={{ color: getDynamicColor(row.pctBillBk, colorSettings.bankem) }}>
                <div>{roundUp(row.pctBillBk)}%</div>
                <DeltaBadge current={row.pctBillBk} previous={prev?.pctBillBk} isPercent />
            </td>
        </tr>
    );
});
