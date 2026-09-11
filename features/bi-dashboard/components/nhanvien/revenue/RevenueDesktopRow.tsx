import React from 'react';
import { RevenueRow } from '../../../types/nhanVienTypes';
import { roundUp } from '../../../utils/nhanVienHelpers';
import { MedalBadge, DeltaBadge } from '../../shared/Badges';
import { Pill } from '../../shared/Pill';
import AvatarDisplay from '../shared/AvatarDisplay';
import { onActivateKey } from '../../../../../components/shared/ui';

import { ColorSettings, CriterionConfig } from './ColorSettingsModal';

interface RevenueDesktopRowProps {
    row: RevenueRow;
    isHighlighted: boolean;
    onHighlightToggle: (name: string) => void;
    supermarketName: string;
    colorSettings: ColorSettings;
    getHtColor: (val: number, hasTarget?: boolean) => string;
    getDynamicColor: (val: number, config: CriterionConfig) => string | undefined;
    isShowRemaining?: boolean;
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
    isShowRemaining = false
}: RevenueDesktopRowProps) => {
    const prev = row.prevCompData;
    const hasTarget = (row.calculatedTarget || 0) > 0;

    // Vạch trạng thái 3px ở mép trái dòng — dấu hiệu đặc trưng của chuẩn "Bảng điều khiển ca
    // trực", thay cho viên pill: vạch không chiếm chiều ngang, mà chiều ngang là thứ khan hiếm
    // nhất ở bảng nhiều cột.
    //
    // ⚠️ Màu lấy bằng cách GỌI CHÍNH `getHtColor` mà ô %DKHT đang dùng, không viết lại ngưỡng.
    // Bản đầu tôi chép ngưỡng 100/85 từ SummaryTableView — SAI: `getHtColor` của tab Doanh thu so
    // với TIẾN ĐỘ THỜI GIAN trong tháng (`< progress` → hồng, `>= progress + 20` → lục), nên vạch
    // và con số ngay cạnh nó sẽ nói hai điều khác nhau. Gọi lại đúng hàm thì ngưỡng có đổi về sau
    // vạch cũng tự đi theo.
    const stripeColor = getHtColor(row.pctDkht || 0, hasTarget);

    return (
        <tr style={{ borderLeftColor: stripeColor }} className={`border-l-[3px] transition-colors text-[13px] border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 ${isHighlighted ? 'bg-sky-50/70 dark:bg-sky-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
            <td className="px-2 py-[3px] whitespace-nowrap min-w-[190px] border-r border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                    <MedalBadge rank={row.rank} />
                    <AvatarDisplay employeeName={row.originalName!} supermarketName={supermarketName} />
                    <div role="button" tabIndex={0} className="flex flex-col cursor-pointer" onClick={() => onHighlightToggle(row.originalName!)} onKeyDown={onActivateKey(() => onHighlightToggle(row.originalName!))}>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-[13px] whitespace-nowrap">{row.name}</span>
                    </div>
                </div>
            </td>
            <td className="px-2 py-[3px] text-[13px] text-center font-medium text-slate-400 dark:text-slate-500 tabular-nums border-r border-slate-100 dark:border-slate-700/50">
                <div>{f.format(roundUp(row.calculatedTarget || 0))}</div>
                <DeltaBadge current={row.calculatedTarget} previous={prev?.target} isCurrency />
            </td>
            <td className="px-2 py-[3px] text-[13px] text-center font-semibold tabular-nums border-r border-slate-100 dark:border-slate-700/50" style={{ color: getDynamicColor(row.dtlk, colorSettings.dtthuc) }}>
                <div>{f.format(roundUp(row.dtlk))}</div>
                <DeltaBadge current={row.dtlk} previous={prev?.dtlk} isCurrency />
            </td>
            <td className="px-2 py-[3px] text-[13px] text-center font-bold tabular-nums border-r border-slate-100 dark:border-slate-700/50" style={{ color: getDynamicColor(row.dtqd, colorSettings.dtqd) || getHtColor(row.calculatedCompletion, hasTarget) }}>
                <div>{f.format(roundUp(row.dtqd))}</div>
                <DeltaBadge current={row.dtqd} previous={prev?.dtqd} isCurrency />
            </td>
            <td className="px-2 py-[3px] text-[13px] text-center font-bold tabular-nums border-r border-slate-100 dark:border-slate-700/50 text-slate-800 dark:text-slate-100">
                <div>{f.format(roundUp(row.duKien || 0))}</div>
                <DeltaBadge current={row.duKien} previous={prev?.duKien} isCurrency />
            </td>
            <td className="px-2 py-[3px] text-center tabular-nums border-r border-slate-100 dark:border-slate-700/50">
                <Pill color={getHtColor(row.pctDkht || 0, hasTarget)}>{hasTarget ? `${roundUp(row.pctDkht || 0)}%` : '—'}</Pill>
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
                <Pill color={getDynamicColor(row.hieuQuaQD * 100, colorSettings.hqqd) || getHtColor(row.calculatedCompletion, hasTarget)}>{isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%</Pill>
                <DeltaBadge current={row.hieuQuaQD * 100} previous={prev?.hqqd * 100} isPercent />
            </td>
            <td className="px-2 py-[3px] text-center tabular-nums border-r border-slate-100 dark:border-slate-700/50">
                <Pill color={getDynamicColor(row.calculatedInstallment, colorSettings.tragop)}>{roundUp(row.calculatedInstallment)}%</Pill>
                <DeltaBadge current={row.calculatedInstallment} previous={prev?.installment} isPercent />
            </td>
            <td className={`px-2 py-[3px] text-center tabular-nums ${
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
