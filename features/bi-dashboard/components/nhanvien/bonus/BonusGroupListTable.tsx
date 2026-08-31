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
                {/* Tier 1: Group Headers — nền trắng đồng nhất, chỉ còn viền ngang mỏng */}
                <tr>
                    <th rowSpan={2} className="px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 align-middle" onClick={() => { setSortField('name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Nhân viên {sortField === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th colSpan={2} className="px-3 py-1 text-right text-[9px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900">Doanh thu</th>
                    <th colSpan={4} className="px-3 py-1 text-right text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900">Thưởng</th>
                    <th rowSpan={2} className="px-3 py-2.5 text-right text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 align-middle leading-tight" onClick={() => { setSortField('dKien'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Dự Kiến {sortField === 'dKien' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                </tr>
                {/* Tier 2: Column Headers */}
                <tr>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => { setSortField('dtqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>DTQĐ {sortField === 'dtqd' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => { setSortField('hqqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>HQQĐ {sortField === 'hqqd' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => { setSortField('erp'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>ERP {sortField === 'erp' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => { setSortField('tNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>T.Nóng {sortField === 'tNong' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => { setSortField('pNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>%T.Nóng {sortField === 'pNong' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => { setSortField('tong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Tổng {sortField === 'tong' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900">
                {displayList.map((item, idx) => {
                    if (item.type === 'department' || item.type === 'total') {
                        const isGrandTotal = item.type === 'total';
                        return (
                            <tr key={`${item.type}-${idx}`} className={`${isGrandTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300'} border-t border-b border-slate-300 dark:border-slate-700`}>
                                <td className={`px-3 ${isGrandTotal ? 'py-2.5 text-[13px]' : 'py-2.5 text-[12px]'} text-left uppercase tracking-wider`}>{item.name}</td>
                                <td className={`px-3 ${isGrandTotal ? 'py-2.5 text-[13px]' : 'py-2.5 text-[12px]'} text-right tabular-nums font-bold`}>{f.format(item.sumDtqd)}</td>
                                <td className={`px-3 ${isGrandTotal ? 'py-2.5 text-[13px]' : 'py-2.5 text-[12px]'} text-right tabular-nums font-bold`}>-</td>
                                <td className={`px-3 ${isGrandTotal ? 'py-2.5 text-[13px]' : 'py-2.5 text-[12px]'} text-right tabular-nums font-bold`}>{f.format(Math.ceil(item.sumErp / 1000))}</td>
                                <td className={`px-3 ${isGrandTotal ? 'py-2.5 text-[13px]' : 'py-2.5 text-[12px]'} text-right tabular-nums font-bold`}>{f.format(Math.ceil(item.sumTnong / 1000))}</td>
                                <td className={`px-3 ${isGrandTotal ? 'py-2.5 text-[13px]' : 'py-2.5 text-[12px]'} text-right tabular-nums font-bold`}>-</td>
                                <td className={`px-3 ${isGrandTotal ? 'py-2.5 text-[13px]' : 'py-2.5 text-[12px]'} text-right tabular-nums font-extrabold text-slate-900 dark:text-white`}>{f.format(Math.ceil(item.sumTong / 1000))}</td>
                                <td className={`px-3 ${isGrandTotal ? 'py-2.5 text-[13px]' : 'py-2.5 text-[12px]'} text-right tabular-nums font-extrabold ${isGrandTotal ? 'text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/30' : 'text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-900/20'}`}>{f.format(Math.ceil(item.sumDkien / 1000))}</td>
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
