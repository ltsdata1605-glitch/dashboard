import React from 'react';
import { Employee } from '../../../types/nhanVienTypes';
import { MedalBadge } from '../../shared/Badges';
import AvatarDisplay from '../shared/AvatarDisplay';

interface BonusDesktopRowProps {
    item: any;
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

export const BonusDesktopRow = React.memo(({
    item, isHighlighted, isStale, dtqdVal, hqqdVal, erpVal, tnongVal, pnongVal, tongVal, dkienVal,
    onEmployeeClick, getCellColor, f, supermarketName
}: BonusDesktopRowProps) => {

    const bonus = Boolean(erpVal || tnongVal || tongVal || dkienVal);
    const rev = Boolean(dtqdVal || hqqdVal);

    return (
        <tr className={`transition-all cursor-pointer text-[13px] ${isHighlighted ? 'bg-sky-50/50 dark:bg-sky-900/10 ring-1 ring-inset ring-sky-200 dark:ring-sky-800/50' : 'hover:bg-slate-50/80 dark:hover:bg-slate-750'}`} onClick={() => onEmployeeClick(item as Employee)}>
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
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums font-bold ${getCellColor(dtqdVal, 'dtqd')}`}>{rev ? f.format(dtqdVal) : '-'}</td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums font-bold ${getCellColor(hqqdVal, 'hqqd')}`}>{rev ? hqqdVal.toFixed(0) + '%' : '-'}</td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums font-bold ${getCellColor(erpVal, 'erp')}`}>
                {bonus ? f.format(Math.ceil(erpVal / 1000)) : '-'}
            </td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums font-bold ${getCellColor(tnongVal, 'tnong')}`}>
                {bonus ? f.format(Math.ceil(tnongVal / 1000)) : '-'}
            </td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums font-bold ${getCellColor(pnongVal, 'pnong')}`}>{bonus ? pnongVal.toFixed(0) + '%' : '-'}</td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums font-extrabold ${getCellColor(tongVal, 'tong')}`}>
                {bonus ? f.format(Math.ceil(tongVal / 1000)) : '-'}
            </td>
            <td className={`px-1.5 py-1 text-[13px] text-center ${isHighlighted ? 'bg-amber-100/50 dark:bg-amber-900/30' : 'bg-amber-50/40 dark:bg-amber-900/10'} tabular-nums font-black text-amber-700 dark:text-amber-400`}>
                {bonus ? f.format(Math.ceil(dkienVal / 1000)) : '-'}
            </td>
        </tr>
    );
});
