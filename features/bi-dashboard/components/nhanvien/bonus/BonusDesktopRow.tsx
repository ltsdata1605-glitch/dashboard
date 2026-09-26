import React from 'react';
import { Employee } from '../../../types/nhanVienTypes';
import { MedalBadge } from '../../shared/Badges';
import AvatarDisplay from '../shared/AvatarDisplay';
import type { BonusDisplayRow } from '../BonusTab';
import { getDkhtColor } from '../revenue/ColorSettingsModal';
import { BonusColumnType } from './bonusTableHelpers';

interface BonusDesktopRowProps {
    item: BonusDisplayRow;
    isHighlighted: boolean;
    isStale: boolean;
    dtqdVal: number;
    hqqdVal: number;
    erpVal: number;
    tnongVal: number;
    pnongVal: number;
    tongVal: number;
    dkienVal: number;
    pctDkht?: number;
    hasTarget?: boolean;
    onEmployeeClick: (emp: Employee) => void;
    getCellColor: (val: number, type: BonusColumnType, hasData?: boolean) => string;
    f: Intl.NumberFormat;
    supermarketName: string;
    targetQuyDoi?: number;
}

export const BonusDesktopRow = React.memo(({
    item, isHighlighted, isStale, dtqdVal, hqqdVal, erpVal, tnongVal, pnongVal, tongVal, dkienVal,
    pctDkht, hasTarget = true,
    onEmployeeClick, getCellColor, f, supermarketName, targetQuyDoi = 40
}: BonusDesktopRowProps) => {

    const bonus = Boolean(erpVal || tnongVal || tongVal || dkienVal);
    const rev = Boolean(dtqdVal || hqqdVal);

    // Vạch trạng thái mép trái dòng: đồng bộ chuẩn xác với phân khúc KPI / %DKHT (giống tab Doanh thu).
    // <80%: Đỏ đậm (#dc2626) | 80-100%: Cam đậm (#ea580c) | 100-120%: Xanh lá đậm (#059669) | >120%: Xanh dương (#2563eb).
    // Tuyệt đối không fallback về xám slate-200 làm mất màu vạch nhận diện nhân viên.
    const stripeColor = (pctDkht != null && pctDkht > 0)
        ? getDkhtColor(pctDkht, hasTarget)
        : (hqqdVal >= targetQuyDoi ? '#059669' : (hqqdVal > 0 ? '#dc2626' : (item.rank != null && item.rank <= 3 ? '#ea580c' : '#0284c7')));

    return (
        <tr
            style={{ borderLeft: `4px solid ${stripeColor}` }}
            className={`border-l-[4px] transition-all cursor-pointer text-[13px] ${isHighlighted ? 'bg-sky-50/50 dark:bg-sky-900/10 ring-1 ring-inset ring-sky-200 dark:ring-sky-800/50' : 'hover:bg-slate-50/80 dark:hover:bg-slate-750'}`}
            onClick={() => onEmployeeClick(item as Employee)}
        >
            <td className="px-2 py-1 border-r border-slate-100 dark:border-slate-700/50 whitespace-nowrap">
                <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                    <MedalBadge rank={item.rank} />
                    <AvatarDisplay employeeName={item.originalName} supermarketName={supermarketName} onClick={() => onEmployeeClick(item as Employee)} />
                    <div className="flex flex-col min-w-0">
                        <span className={`text-[12px] sm:text-[13px] font-bold whitespace-nowrap tracking-tight ${isStale ? 'text-slate-400 dark:text-slate-500' : 'text-sky-700 dark:text-sky-400 hover:underline'}`}>
                            {item.name}
                        </span>
                    </div>
                </div>
            </td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-l-2 border-l-slate-300 dark:border-l-slate-600 border-r border-slate-100 dark:border-slate-700/50 tabular-nums ${getCellColor(dtqdVal, 'dtqd', rev)}`}>{rev ? f.format(dtqdVal) : '-'}</td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums ${getCellColor(hqqdVal, 'hqqd', rev)}`}>{rev ? hqqdVal.toFixed(0) + '%' : '-'}</td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-l-2 border-l-slate-300 dark:border-l-slate-600 border-r border-slate-100 dark:border-slate-700/50 tabular-nums ${getCellColor(erpVal, 'erp', bonus)}`}>
                {bonus ? f.format(Math.ceil(erpVal / 1000)) : '-'}
            </td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums ${getCellColor(tnongVal, 'tnong', bonus)}`}>
                {bonus ? f.format(Math.ceil(tnongVal / 1000)) : '-'}
            </td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums ${getCellColor(pnongVal, 'pnong', bonus)}`}>{bonus ? pnongVal.toFixed(0) + '%' : '-'}</td>
            <td className={`px-1.5 py-1 text-[13.5px] text-center border-r border-slate-200 dark:border-slate-700/60 tabular-nums ${getCellColor(tongVal, 'tong', bonus)}`}>
                {bonus ? f.format(Math.ceil(tongVal / 1000)) : '-'}
            </td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-l-2 border-l-slate-300 dark:border-l-slate-600 tabular-nums ${getCellColor(dkienVal, 'dkien', bonus)}`}>
                {bonus ? f.format(Math.ceil(dkienVal / 1000)) : '-'}
            </td>
        </tr>
    );
});
