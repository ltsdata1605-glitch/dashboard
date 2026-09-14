import React from 'react';
import { Employee } from '../../../types/nhanVienTypes';
import { MedalBadge } from '../../shared/Badges';
import AvatarDisplay from '../shared/AvatarDisplay';
import type { BonusDisplayRow } from '../BonusTab';
import { getDkhtColor } from '../revenue/ColorSettingsModal';

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
    getCellColor: (val: number, type: 'dtqd' | 'hqqd' | 'erp' | 'tnong' | 'tong' | 'pnong', targetQuyDoi?: number) => string;
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
            <td className="px-2 py-1 border-r border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                    <MedalBadge rank={item.rank} />
                    <AvatarDisplay employeeName={item.originalName} supermarketName={supermarketName} onClick={() => onEmployeeClick(item as Employee)} />
                    <div className="flex flex-col min-w-0">
                        <span className={`text-[13px] font-bold whitespace-normal break-words tracking-tight ${isStale ? 'text-slate-400 dark:text-slate-500' : 'text-sky-700 dark:text-sky-400 hover:underline'}`}>
                            {item.name}
                        </span>
                    </div>
                </div>
            </td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-l-2 border-l-slate-300 dark:border-l-slate-600 border-r border-slate-100 dark:border-slate-700/50 tabular-nums font-bold ${getCellColor(dtqdVal, 'dtqd')}`}>{rev ? f.format(dtqdVal) : '-'}</td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums font-bold ${getCellColor(hqqdVal, 'hqqd', targetQuyDoi)}`}>{rev ? hqqdVal.toFixed(0) + '%' : '-'}</td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-l-2 border-l-slate-300 dark:border-l-slate-600 border-r border-slate-100 dark:border-slate-700/50 tabular-nums font-black ${getCellColor(erpVal, 'erp')}`}>
                {bonus ? f.format(Math.ceil(erpVal / 1000)) : '-'}
            </td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums font-black ${getCellColor(tnongVal, 'tnong')}`}>
                {bonus ? f.format(Math.ceil(tnongVal / 1000)) : '-'}
            </td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums font-bold ${getCellColor(pnongVal, 'pnong')}`}>{bonus ? pnongVal.toFixed(0) + '%' : '-'}</td>
            <td className={`px-1.5 py-1 text-[13.5px] text-center border-r border-slate-200 dark:border-slate-700/60 tabular-nums font-black shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)] ${isHighlighted ? 'bg-emerald-100/70 dark:bg-emerald-900/50' : 'bg-emerald-50/85 dark:bg-emerald-950/40'} ${getCellColor(tongVal, 'tong')}`}>
                {bonus ? f.format(Math.ceil(tongVal / 1000)) : '-'}
            </td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-l-2 border-l-slate-300 dark:border-l-slate-600 ${isHighlighted ? 'bg-amber-100/50 dark:bg-amber-900/30' : 'bg-amber-50/40 dark:bg-amber-900/10'} tabular-nums font-black text-amber-700 dark:text-amber-400`}>
                {bonus ? f.format(Math.ceil(dkienVal / 1000)) : '-'}
            </td>
        </tr>
    );
});
