import React from 'react';
import { Employee } from '../../../types/nhanVienTypes';
import { MedalBadge } from '../../shared/Badges';
import AvatarDisplay from '../shared/AvatarDisplay';
import type { BonusDisplayRow } from '../BonusTab';

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
    onEmployeeClick: (emp: Employee) => void;
    getCellColor: (val: number, type: 'dtqd' | 'hqqd' | 'erp' | 'tnong' | 'tong' | 'pnong') => string;
    f: Intl.NumberFormat;
    supermarketName: string;
}

// getCellColor trả về class Tailwind (text-{màu}-600), khác RevenueTab/InstallmentTab (trả hex)
// nên không dùng chung component Pill (nhận màu hex) — map sang cặp class nền/chữ tương ứng
// cho 2 cột phần trăm (HQQĐ, %Nóng), giữ nguyên 100% ngưỡng màu của getCellColor.
const pillClassFor = (colorClass: string): string => {
    if (colorClass.includes('emerald')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (colorClass.includes('rose')) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
};

export const BonusDesktopRow = React.memo(({
    item, isHighlighted, isStale, dtqdVal, hqqdVal, erpVal, tnongVal, pnongVal, tongVal, dkienVal,
    onEmployeeClick, getCellColor, f, supermarketName
}: BonusDesktopRowProps) => {

    const bonus = Boolean(erpVal || tnongVal || tongVal || dkienVal);
    const rev = Boolean(dtqdVal || hqqdVal);

    return (
        <tr className={`transition-colors cursor-pointer text-[13px] border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 ${isHighlighted ? 'bg-sky-50/50 dark:bg-sky-900/10 ring-1 ring-inset ring-sky-200 dark:ring-sky-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`} onClick={() => onEmployeeClick(item as Employee)}>
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                    <MedalBadge rank={item.rank} />
                    <AvatarDisplay employeeName={item.originalName} supermarketName={supermarketName} onClick={() => onEmployeeClick(item as Employee)} />
                    <div className="flex flex-col min-w-0">
                        <span className={`text-[13px] font-bold whitespace-normal break-words tracking-tight ${isStale ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100 hover:underline'}`}>
                            {item.name}
                        </span>
                    </div>
                </div>
            </td>
            <td className={`px-3 py-2.5 text-[13px] text-right tabular-nums font-bold ${getCellColor(dtqdVal, 'dtqd')}`}>{rev ? f.format(dtqdVal) : '-'}</td>
            <td className="px-3 py-2.5 text-right tabular-nums">
                <span className={`inline-flex min-w-[42px] items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-bold ${pillClassFor(getCellColor(hqqdVal, 'hqqd'))}`}>{rev ? hqqdVal.toFixed(0) + '%' : '-'}</span>
            </td>
            <td className={`px-3 py-2.5 text-[13px] text-right tabular-nums font-bold ${getCellColor(erpVal, 'erp')}`}>
                {bonus ? f.format(Math.ceil(erpVal / 1000)) : '-'}
            </td>
            <td className={`px-3 py-2.5 text-[13px] text-right tabular-nums font-bold ${getCellColor(tnongVal, 'tnong')}`}>
                {bonus ? f.format(Math.ceil(tnongVal / 1000)) : '-'}
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">
                <span className={`inline-flex min-w-[42px] items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-bold ${pillClassFor(getCellColor(pnongVal, 'pnong'))}`}>{bonus ? pnongVal.toFixed(0) + '%' : '-'}</span>
            </td>
            <td className={`px-3 py-2.5 text-[13px] text-right tabular-nums font-extrabold ${getCellColor(tongVal, 'tong')}`}>
                {bonus ? f.format(Math.ceil(tongVal / 1000)) : '-'}
            </td>
            <td className={`px-3 py-2.5 text-[13px] text-right ${isHighlighted ? 'bg-amber-100/50 dark:bg-amber-900/30' : 'bg-amber-50/40 dark:bg-amber-900/10'} tabular-nums font-black text-amber-700 dark:text-amber-400`}>
                {bonus ? f.format(Math.ceil(dkienVal / 1000)) : '-'}
            </td>
        </tr>
    );
});
