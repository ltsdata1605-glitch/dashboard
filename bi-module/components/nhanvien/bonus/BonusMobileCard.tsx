import React from 'react';
import { Employee } from '../../../types/nhanVienTypes';

interface BonusMobileCardProps {
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
    avatarElement: React.ReactNode;
    medalElement: React.ReactNode;
}

export const BonusMobileCard = React.memo(({
    item, isHighlighted, isStale, dtqdVal, hqqdVal, erpVal, tnongVal, pnongVal, tongVal, dkienVal,
    onEmployeeClick, getCellColor, f, avatarElement, medalElement
}: BonusMobileCardProps) => {

    const bonus = Boolean(erpVal || tnongVal || tongVal || dkienVal);
    const rev = Boolean(dtqdVal || hqqdVal);

    return (
        <div onClick={() => onEmployeeClick(item as Employee)} className={`px-4 py-3 cursor-pointer transition-colors ${isHighlighted ? 'bg-indigo-50/60 dark:bg-indigo-900/10 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800/50' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    {medalElement}
                    {avatarElement}
                    <span className={`font-black uppercase tracking-tight truncate text-xs ${isHighlighted ? 'text-indigo-700 dark:text-indigo-400' : (isStale ? 'text-slate-400 dark:text-slate-500' : 'text-indigo-600 dark:text-indigo-400')}`}>
                        {item.name}
                    </span>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Dự Kiến</span>
                    <div className="flex items-baseline gap-0.5">
                        <span className={`text-lg font-black tabular-nums leading-none tracking-tight ${isHighlighted ? 'text-indigo-700 dark:text-indigo-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            {bonus ? f.format(Math.ceil(dkienVal / 1000)) : '-'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-5 gap-1.5 mt-2">
                <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-0.5">DTQĐ</p>
                    <p className={`text-[11px] font-black tabular-nums leading-none ${getCellColor(dtqdVal, 'dtqd')}`}>{rev ? f.format(dtqdVal) : '-'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-0.5">HQQĐ</p>
                    <p className={`text-[11px] font-black tabular-nums leading-none ${getCellColor(hqqdVal, 'hqqd')}`}>{rev ? hqqdVal.toFixed(0) + '%' : '-'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-0.5">ERP</p>
                    <p className={`text-[11px] font-black tabular-nums leading-none ${getCellColor(erpVal, 'erp')}`}>{bonus ? f.format(Math.ceil(erpVal / 1000)) : '-'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-0.5">T.Nóng</p>
                    <p className={`text-[11px] font-black tabular-nums leading-none ${getCellColor(tnongVal, 'tnong')}`}>{bonus ? f.format(Math.ceil(tnongVal / 1000)) : '-'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-0.5">Tổng</p>
                    <p className={`text-[11px] font-black tabular-nums leading-none ${getCellColor(tongVal, 'tong')}`}>{bonus ? f.format(Math.ceil(tongVal / 1000)) : '-'}</p>
                </div>
            </div>
        </div>
    );
});
