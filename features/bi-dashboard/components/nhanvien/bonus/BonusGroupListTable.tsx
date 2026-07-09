import React from 'react';
import { Employee, BonusMetrics, RevenueRow } from '../../../types/nhanVienTypes';
import { BonusDesktopRow } from './BonusDesktopRow';
import { BonusDisplayRow } from './BonusDisplayRow';
import { getCellColor, isUpdatedToday } from './bonusTableHelpers';

interface BonusGroupListTableProps {
    displayList: BonusDisplayRow[];
    sortField: string;
    sortDir: 'asc' | 'desc';
    setSortField: (field: string) => void;
    setSortDir: (updater: (d: 'asc' | 'desc') => 'asc' | 'desc') => void;
    highlightedEmployees: Set<string>;
    bonusData: Record<string, BonusMetrics | null>;
    revenueMap: Map<string, RevenueRow>;
    onEmployeeClick: (emp: Employee) => void;
    f: Intl.NumberFormat;
    supermarketName: string;
}

export const BonusGroupListTable: React.FC<BonusGroupListTableProps> = ({
    displayList, sortField, sortDir, setSortField, setSortDir,
    highlightedEmployees, bonusData, revenueMap, onEmployeeClick, f, supermarketName,
}) => {
    return (
        <table className="w-full border-collapse compact-export-table">
            <thead className="sticky top-0 z-10">
                {/* Tier 1: Group Headers */}
                <tr>
                    <th rowSpan={2} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 align-middle" onClick={() => { setSortField('name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Nhân viên</th>
                    <th colSpan={2} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-r border-b border-sky-100 dark:border-sky-800/50">Doanh thu</th>
                    <th colSpan={4} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-b border-emerald-100 dark:border-emerald-800/50">Thưởng</th>
                    <th rowSpan={2} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-100 dark:border-amber-800/50 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 align-middle leading-tight" onClick={() => { setSortField('dKien'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Dự<br/>Kiến</th>
                </tr>
                {/* Tier 2: Column Headers */}
                <tr>
                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-r border-b-2 border-sky-100 dark:border-sky-800/50 cursor-pointer hover:bg-sky-100 transition-colors" onClick={() => { setSortField('dtqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>DTQĐ</th>
                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-r border-b-2 border-sky-100 dark:border-sky-800/50 cursor-pointer hover:bg-sky-100 transition-colors" onClick={() => { setSortField('hqqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>HQQĐ</th>
                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-b-2 border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => { setSortField('erp'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>ERP</th>
                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-b-2 border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => { setSortField('tNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>T.Nóng</th>
                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-b-2 border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => { setSortField('pNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>%T.Nóng</th>
                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-b-2 border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => { setSortField('tong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Tổng</th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#1c1c1e] divide-y divide-slate-100 dark:divide-slate-700/60">
                {displayList.map((item, idx) => {
                    if (item.type === 'department' || item.type === 'total') {
                        const isGrandTotal = item.type === 'total';
                        return (
                            <tr key={`${item.type}-${idx}`} className={`${isGrandTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300'} border-t border-slate-200 dark:border-slate-700`}>
                                <td className={`px-2 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} uppercase tracking-wider border-r ${isGrandTotal ? 'border-slate-200 dark:border-slate-700 text-center' : 'border-slate-200 dark:border-slate-700'}`}>{item.name}</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700`}>{f.format(item.sumDtqd)}</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700`}>-</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700`}>{f.format(Math.ceil(item.sumErp / 1000))}</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700`}>{f.format(Math.ceil(item.sumTnong / 1000))}</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700`}>-</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-extrabold border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white`}>{f.format(Math.ceil(item.sumTong / 1000))}</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center tabular-nums font-extrabold ${isGrandTotal ? 'text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/30' : 'text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-900/20'}`}>{f.format(Math.ceil(item.sumDkien / 1000))}</td>
                            </tr>
                        );
                    }

                    const isHighlighted = highlightedEmployees.has(item.originalName);
                    const bonus = bonusData[item.originalName], rev = revenueMap.get(item.originalName);
                    const dtqdVal = rev?.dtqd || 0, hqqdVal = rev ? (rev.hieuQuaQD * 100) : 0, erpVal = bonus?.erp || 0, tnongVal = bonus?.tNong || 0, pnongVal = bonus?.pNong || 0, tongVal = bonus?.tong || 0, dkienVal = bonus?.dKien || 0;
                    const isStale = !isUpdatedToday(bonus?.updatedAt);

                    return (
                        <BonusDesktopRow
                            key={item.originalName}
                            item={item}
                            isHighlighted={isHighlighted}
                            isStale={isStale}
                            dtqdVal={dtqdVal}
                            hqqdVal={hqqdVal}
                            erpVal={erpVal}
                            tnongVal={tnongVal}
                            pnongVal={pnongVal}
                            tongVal={tongVal}
                            dkienVal={dkienVal}
                            onEmployeeClick={onEmployeeClick}
                            getCellColor={getCellColor}
                            f={f}
                            supermarketName={supermarketName}
                        />
                    );
                })}
            </tbody>
        </table>
    );
};
