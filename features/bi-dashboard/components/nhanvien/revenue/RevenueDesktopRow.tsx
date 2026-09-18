import React from 'react';
import { RevenueRow } from '../../../types/nhanVienTypes';
import { roundUp } from '../../../utils/nhanVienHelpers';
import { MedalBadge, DeltaBadge } from '../../shared/Badges';
import { Pill } from '../../shared/Pill';
import AvatarDisplay from '../shared/AvatarDisplay';
import { onActivateKey } from '../../../../../components/shared/ui';

import { ColorSettings, CriterionConfig, getDkhtColor as defaultGetDkhtColor, getMetricColorByTarget } from './ColorSettingsModal';

interface RevenueDesktopRowProps {
    row: RevenueRow;
    isHighlighted: boolean;
    onHighlightToggle: (name: string) => void;
    supermarketName: string;
    colorSettings: ColorSettings;
    getHtColor: (val: number, hasTarget?: boolean) => string;
    getDynamicColor: (val: number, config: CriterionConfig) => string | undefined;
    getDkhtColor?: (val: number, hasTarget?: boolean) => string;
    isShowRemaining?: boolean;
    targetTraGop?: number;
    targetQuyDoi?: number;
    isRealtimeMode?: boolean;
}

const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

export const RevenueDesktopRow = React.memo(({
    row,
    isHighlighted,
    onHighlightToggle,
    supermarketName,
    colorSettings,
    getHtColor,
    getDynamicColor,
    getDkhtColor = defaultGetDkhtColor,
    isShowRemaining = false,
    targetTraGop = 45,
    targetQuyDoi = 40,
    isRealtimeMode = false
}: RevenueDesktopRowProps) => {
    const prev = row.prevCompData;
    const hasTarget = (row.calculatedTarget || 0) > 0;

    // Vạch trạng thái mép trái dòng — đồng bộ chuẩn xác với màu phân khúc của %DKHT:
    // <80%: Đỏ đậm (#dc2626) | 80-100%: Cam đậm (#ea580c) | 100-120%: Xanh lá đậm (#059669) | >120%: Xanh dương đậm (#2563eb)
    const stripeColor = getDkhtColor(row.pctDkht, hasTarget);

    return (
        <tr
            style={{ borderLeft: `4px solid ${stripeColor}` }}
            className={`border-l-[4px] transition-colors text-[13px] border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 ${isHighlighted ? 'bg-sky-50/70 dark:bg-sky-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
        >
            <td className="px-2 py-[3px] whitespace-nowrap min-w-[190px] border-r border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                    <MedalBadge rank={row.rank} />
                    <AvatarDisplay employeeName={row.originalName!} supermarketName={supermarketName} />
                    <div role="button" tabIndex={0} className="flex flex-col cursor-pointer" onClick={() => onHighlightToggle(row.originalName!)} onKeyDown={onActivateKey(() => onHighlightToggle(row.originalName!))}>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-[13px] whitespace-nowrap">{row.name}</span>
                    </div>
                </div>
            </td>
            <td className="px-2 py-[3px] text-[13px] text-center font-bold text-slate-800 dark:text-slate-200 tabular-nums border-r border-slate-100 dark:border-slate-700/50">
                <div>{f.format(roundUp(row.calculatedTarget || 0))}</div>
                <DeltaBadge current={row.calculatedTarget} previous={prev?.target} isCurrency />
            </td>
            <td className="px-2 py-[3px] text-[13px] text-center font-semibold tabular-nums border-r border-slate-100 dark:border-slate-700/50" style={{ color: getDynamicColor(row.dtlk, colorSettings.dtthuc) }}>
                <div>{f.format(roundUp(row.dtlk))}</div>
                <DeltaBadge current={row.dtlk} previous={prev?.dtlk} isCurrency />
            </td>
            <td 
                className="px-2 py-[3px] text-center !font-normal tabular-nums border-r border-slate-100 dark:border-slate-700/50 bg-sky-50/70 dark:bg-sky-950/25" 
                style={{ color: getDynamicColor(row.dtqd, colorSettings.dtqd) || getHtColor(row.calculatedCompletion, hasTarget) }}
            >
                <div className="!font-normal text-[13.5px] tracking-tight">{f.format(roundUp(row.dtqd))}</div>
                <DeltaBadge current={row.dtqd} previous={prev?.dtqd} isCurrency />
            </td>
            {!isRealtimeMode && (
                <td className="px-2 py-[3px] text-[13px] text-center font-bold tabular-nums border-r border-slate-100 dark:border-slate-700/50 text-slate-800 dark:text-slate-100">
                    <div>{f.format(roundUp(row.duKien || 0))}</div>
                    <DeltaBadge current={row.duKien} previous={prev?.duKien} isCurrency />
                </td>
            )}
            <td className="px-2 py-[3px] text-center tabular-nums border-r border-slate-100 dark:border-slate-700/50">
                <Pill className="!font-normal" color={getDkhtColor(row.pctDkht || 0, hasTarget)}>{hasTarget ? `${roundUp(row.pctDkht || 0)}%` : '—'}</Pill>
                <DeltaBadge current={row.pctDkht} previous={prev?.dkht} isPercent />
            </td>
            {isShowRemaining && (
                <>
                    <td className="px-2 py-[3px] text-[13px] text-center font-semibold tabular-nums border-r border-slate-100 dark:border-slate-700/50 bg-amber-50/10 dark:bg-amber-950/5 text-slate-500 dark:text-slate-400">
                        <div>{f.format(roundUp(row.remaining_total || 0))}</div>
                    </td>
                    <td className={`px-2 py-[3px] text-[13px] text-center font-semibold tabular-nums border-r border-slate-100 dark:border-slate-700/50 bg-amber-50/10 dark:bg-amber-950/5 ${
                        row.type === 'employee' && row.remaining_daily_status === 'warning' ? 'text-rose-600 dark:text-rose-400' :
                        row.type === 'employee' && row.remaining_daily_status === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                        'text-amber-700 dark:text-amber-400'
                    }`}>
                        <div>{f.format(roundUp(row.remaining_daily || 0))}</div>
                    </td>
                </>
            )}
            <td className="px-2 py-[3px] text-center tabular-nums border-r border-slate-100 dark:border-slate-700/50">
                <Pill className="!font-normal" color={getMetricColorByTarget(isNaN(row.hieuQuaQD) ? 0 : row.hieuQuaQD * 100, targetQuyDoi)}>{isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%</Pill>
                <DeltaBadge current={row.hieuQuaQD * 100} previous={prev?.hqqd * 100} isPercent />
            </td>
            <td className={`px-2 py-[3px] text-center tabular-nums ${!isRealtimeMode ? 'border-r border-slate-100 dark:border-slate-700/50' : ''}`}>
                <Pill className="!font-normal" color={getMetricColorByTarget(row.calculatedInstallment, targetTraGop)}>{roundUp(row.calculatedInstallment)}%</Pill>
                <DeltaBadge current={row.calculatedInstallment} previous={prev?.installment} isPercent />
            </td>
            {!isRealtimeMode && (
                <td className={`px-2 py-[3px] text-center tabular-nums ${
                    !row.bonus_tong ? 'text-slate-400 dark:text-slate-500 font-medium text-[13px]' :
                    row.bonus_tier === 'top' ? 'text-emerald-600 dark:text-emerald-400 text-[14px] font-black' :
                    row.bonus_tier === 'bot' ? 'text-rose-500 dark:text-rose-400 text-[13px] font-bold' :
                    'text-slate-900 dark:text-white text-[13px] font-black'
                }`}>
                    <div>{row.bonus_tong ? f.format(Math.ceil(row.bonus_tong / 1000)) : '-'}</div>
                </td>
            )}
        </tr>
    );
});
