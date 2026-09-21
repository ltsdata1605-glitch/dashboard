import React, { useMemo, useCallback } from 'react';
import { Employee, BonusMetrics, RevenueRow } from '../../../types/nhanVienTypes';
import { BonusDesktopRow } from './BonusDesktopRow';
import { BonusDisplayRow } from './BonusDisplayRow';
import { getCellColor, computeTierThresholds, isUpdatedToday, getRevenueForEmployee, BonusColumnType, TierThresholds } from './bonusTableHelpers';
import { getBonusForEmployee } from '../../../utils/bonusParser';
import { shortenSupermarketName } from '../../../utils/dashboardHelpers';
import { useIndexedDBState } from '../../../hooks/useIndexedDBState';

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
    const safeName = shortenSupermarketName(supermarketName);
    const [storedQuyDoi] = useIndexedDBState<number>(safeName ? (`targethero-${safeName}-quydoi` as any) : null, 40);
    const targetQuyDoi = storedQuyDoi ?? 40;

    const columnThresholds = useMemo<Record<BonusColumnType, TierThresholds>>(() => {
        const employeeRows = displayList.filter(item => item.type !== 'department' && item.type !== 'total');

        const dtqdVals: number[] = [];
        const hqqdVals: number[] = [];
        const erpVals: number[] = [];
        const tnongVals: number[] = [];
        const pnongVals: number[] = [];
        const tongVals: number[] = [];
        const dkienVals: number[] = [];

        employeeRows.forEach(item => {
            const bonus = getBonusForEmployee(bonusData, item.originalName, item.name);
            const rev = getRevenueForEmployee(revenueMap, item.originalName, item.name);

            if (rev && (rev.dtqd > 0 || rev.dtlk > 0)) {
                dtqdVals.push(rev.dtqd);
                hqqdVals.push(rev.hieuQuaQD * 100);
            }
            if (bonus && (bonus.tong > 0 || bonus.dKien > 0 || bonus.erp > 0 || bonus.tNong > 0)) {
                if (bonus.erp) erpVals.push(bonus.erp);
                if (bonus.tNong) tnongVals.push(bonus.tNong);
                if (bonus.pNong) pnongVals.push(bonus.pNong);
                if (bonus.tong) tongVals.push(bonus.tong);
                if (bonus.dKien) dkienVals.push(bonus.dKien);
            }
        });

        return {
            dtqd: computeTierThresholds(dtqdVals),
            hqqd: computeTierThresholds(hqqdVals),
            erp: computeTierThresholds(erpVals),
            tnong: computeTierThresholds(tnongVals),
            pnong: computeTierThresholds(pnongVals),
            tong: computeTierThresholds(tongVals),
            dkien: computeTierThresholds(dkienVals),
        };
    }, [displayList, bonusData, revenueMap]);

    const getRowCellColor = useCallback((val: number, type: BonusColumnType, hasData: boolean = true) => {
        return getCellColor(val, columnThresholds[type], hasData);
    }, [columnThresholds]);
    return (
        <table className="w-full border-collapse compact-export-table">
            <thead className="sticky top-0 z-10">
                {/* Tier 1: Group Headers */}
                <tr>
                    <th rowSpan={2} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-l-[4px] border-l-slate-300 dark:border-l-slate-600 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 align-middle" onClick={() => { setSortField('name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Nhân viên</th>
                    <th colSpan={2} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-l-2 border-l-slate-300 dark:border-l-slate-600 border-r border-b border-slate-200 dark:border-slate-700">Doanh thu</th>
                    <th colSpan={4} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-l-2 border-l-slate-300 dark:border-l-slate-600 border-r border-b border-slate-200 dark:border-slate-700">Thưởng</th>
                    <th rowSpan={2} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-l-2 border-l-slate-300 dark:border-l-slate-600 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 align-middle leading-tight" onClick={() => { setSortField('dKien'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Dự Kiến</th>
                </tr>
                {/* Tier 2: Column Headers */}
                <tr>
                    <th className="border-l-2 border-l-slate-300 dark:border-l-slate-600 px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => { setSortField('dtqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>DTQĐ</th>
                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => { setSortField('hqqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>HQQĐ</th>
                    <th className="border-l-2 border-l-slate-300 dark:border-l-slate-600 px-1.5 py-1 text-center text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 bg-sky-50/60 dark:bg-sky-950/40 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-sky-100/70 transition-colors" onClick={() => { setSortField('erp'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>ERP</th>
                    <th className="px-1.5 py-1 text-center text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/40 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-amber-100/70 transition-colors" onClick={() => { setSortField('tNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>T.Nóng</th>
                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => { setSortField('pNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>%T.Nóng</th>
                    <th className="px-1.5 py-1 text-center text-[11px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-100 bg-emerald-100/90 dark:bg-emerald-950/70 border-r border-b border-emerald-300 dark:border-emerald-800 cursor-pointer hover:bg-emerald-200/90 transition-colors shadow-sm" onClick={() => { setSortField('tong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Tổng</th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-700/60">
                {displayList.map((item, idx) => {
                    if (item.type === 'department' || item.type === 'total') {
                        const isGrandTotal = item.type === 'total';
                        return (
                            <tr
                                key={`${item.type}-${idx}`}
                                style={{ borderLeft: isGrandTotal ? '4px solid #059669' : '4px solid #0284c7' }}
                                className={`${isGrandTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300'} border-l-[4px] border-t border-slate-200 dark:border-slate-700`}
                            >
                                <td className={`px-2 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} uppercase tracking-wider border-r ${isGrandTotal ? 'border-slate-200 dark:border-slate-700 text-center' : 'border-slate-200 dark:border-slate-700'}`}>{item.name}</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700 border-l-2 border-l-slate-300 dark:border-l-slate-600`}>{item.sumDtqd ? f.format(item.sumDtqd) : '-'}</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700 ${item.sumHqqd ? (item.sumHqqd >= targetQuyDoi ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400') : ''}`} title={`Target Quy đổi: ${targetQuyDoi}%`}>{item.sumHqqd ? item.sumHqqd.toFixed(0) + '%' : '-'}</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-black border-slate-200 dark:border-slate-700 border-l-2 border-l-slate-300 dark:border-l-slate-600 text-sky-700 dark:text-sky-400`}>{f.format(Math.ceil((item.sumErp || 0) / 1000))}</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-black border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400`}>{f.format(Math.ceil((item.sumTnong || 0) / 1000))}</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700`}>-</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13.5px]' : 'py-1 text-[12.5px]'} text-center border-r tabular-nums font-black border-slate-200 dark:border-slate-700 bg-emerald-100/90 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-100`}>{f.format(Math.ceil((item.sumTong || 0) / 1000))}</td>
                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center tabular-nums font-extrabold border-l-2 border-l-slate-300 dark:border-l-slate-600 ${isGrandTotal ? 'text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/30' : 'text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-900/20'}`}>{f.format(Math.ceil((item.sumDkien || 0) / 1000))}</td>
                            </tr>
                        );
                    }

                    const keyName = item.originalName || item.name;
                    const isHighlighted = highlightedEmployees.has(keyName);
                    const bonus = getBonusForEmployee(bonusData, item.originalName, item.name);
                    const rev = getRevenueForEmployee(revenueMap, item.originalName, item.name);
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
                            pctDkht={rev?.pctDkht}
                            hasTarget={(rev?.calculatedTarget || 0) > 0}
                            onEmployeeClick={onEmployeeClick}
                            getCellColor={getRowCellColor}
                            f={f}
                            supermarketName={supermarketName}
                            targetQuyDoi={targetQuyDoi}
                        />
                    );
                })}
            </tbody>
        </table>
    );
};
