import React, { useMemo } from 'react';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { shortenSupermarketName, parseNumber, roundUp } from '../../utils/dashboardHelpers';

interface ReportViewProps {
    data: { headers: string[], rows: string[][] };
    activeSupermarket: string | null;
}

const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

const ReportView = React.forwardRef<HTMLDivElement, ReportViewProps>(({ data, activeSupermarket }, ref) => {
    const [targets, setTargets] = useIndexedDBState<Record<string, string>>(`report-kpi-targets-${activeSupermarket || 'all'}`, {});

    const processedData = useMemo(() => {
        if (!data.headers || !data.headers.length) return [];
        const nameIdx = data.headers.indexOf('Tên miền');
        const dtIdx = data.headers.indexOf('DTLK');
        const dtqdIdx = data.headers.indexOf('DTQĐ');
        let tcIdx = data.headers.indexOf('Tỷ Trọng Trả Góp');
        if (tcIdx === -1) tcIdx = data.headers.indexOf('Tỷ Trọng Trả Chậm');
        
        if (nameIdx === -1 || dtIdx === -1 || dtqdIdx === -1) return [];

        const targetRow = data.rows.find(row => {
            const name = row[nameIdx];
            if (activeSupermarket && activeSupermarket !== 'Tổng') {
                return name === activeSupermarket;
            }
            return name === 'Tổng';
        });
        
        if (!targetRow) return [];

        const dtlk = parseNumber(targetRow[dtIdx]);
        const dtqd = parseNumber(targetRow[dtqdIdx]);
        const tc = tcIdx !== -1 ? parseNumber(targetRow[tcIdx]) : 0;
        const hqqd = dtlk > 0 ? ((dtqd / dtlk) - 1) * 100 : 0;

        const result: { id: string, name: string; actual: number; target: string; isPercent: boolean }[] = [
            { id: 'dtlk', name: 'Doanh Thu Thực', actual: dtlk, target: targets['dtlk'] || '', isPercent: false },
            { id: 'dtqd', name: 'Doanh Thu Quy Đổi', actual: dtqd, target: targets['dtqd'] || '', isPercent: false },
            { id: 'hqqd', name: 'Hiệu Quả Quy Đổi', actual: hqqd, target: targets['hqqd'] || '', isPercent: true },
            { id: 'tc', name: 'Trả Chậm', actual: tc, target: targets['tc'] || '', isPercent: true }
        ];

        return result;
    }, [data, activeSupermarket, targets]);

    const handleTargetChange = (id: string, value: string, isPercent: boolean) => {
        const numericValue = value.replace(isPercent ? /[^0-9.-]/g : /[^0-9]/g, '');
        setTargets(prev => ({ ...prev, [id]: numericValue }));
    };

    return (
        <div className="js-report-view-container relative z-10" ref={ref}>
            <div className="w-full overflow-hidden px-4 pb-4">
                <div className="overflow-x-auto scrollbar-hide border border-slate-200 dark:border-slate-700">
                    <table className="w-full border-collapse min-w-max compact-export-table">
                        <thead>
                            <tr className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                <th className="px-3 py-2 border-b-2 border-r border-slate-200 dark:border-slate-700 text-left sticky left-0 z-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                                    CHỈ TIÊU
                                </th>
                                <th className="px-3 py-2 border-b-2 border-r border-slate-200 dark:border-slate-700 text-right bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    MỤC TIÊU
                                </th>
                                <th className="px-3 py-2 border-b-2 border-r border-slate-200 dark:border-slate-700 text-right bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300">
                                    THỰC HIỆN
                                </th>
                                <th className="px-3 py-2 border-b-2 border-slate-200 dark:border-slate-700 text-center bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-300">
                                    HOÀN THÀNH
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map((row) => {
                                const targetNum = parseNumber(row.target);
                                const ht = targetNum !== 0 ? (row.actual / targetNum) * 100 : 0;
                                return (
                                    <tr key={row.id} className="bg-white dark:bg-[#1c1c1e] hover:bg-gray-50 dark:hover:bg-slate-800 border-b border-gray-100 dark:border-slate-700 transition-colors">
                                        <td className="px-3 py-2 text-[13px] font-extrabold sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 tabular-nums align-middle bg-white dark:bg-[#1c1c1e] text-slate-700 dark:text-slate-300">
                                            {row.name}
                                        </td>
                                        <td className="px-3 py-2 text-right border-r border-slate-200 dark:border-slate-700 align-middle">
                                            <div className="flex justify-end">
                                                <input 
                                                    type="text" 
                                                    className="w-full min-w-[80px] max-w-[100px] text-right bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] font-bold tabular-nums text-slate-800 dark:text-slate-200 no-print"
                                                    value={row.isPercent ? row.target : (row.target ? f.format(parseInt(row.target, 10)) : '')}
                                                    onChange={(e) => handleTargetChange(row.id, e.target.value, row.isPercent)}
                                                    placeholder="Nhập..."
                                                />
                                                <span className="hidden print:inline text-[13px] font-bold tabular-nums">
                                                    {row.target ? (row.isPercent ? `${row.target}%` : f.format(parseInt(row.target, 10))) : '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-[14px] font-black text-right tabular-nums text-indigo-700 dark:text-indigo-400 border-r border-slate-200 dark:border-slate-700 align-middle">
                                            {row.isPercent ? `${f.format(roundUp(row.actual))}%` : f.format(roundUp(row.actual))}
                                        </td>
                                        <td className="px-3 py-2 text-[13px] font-bold text-center tabular-nums align-middle">
                                            {targetNum !== 0 ? (
                                                <div className="flex justify-center items-center">
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-black inline-block min-w-[50px] text-center ${ht >= 100 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : ht >= 85 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                                        {roundUp(ht)}%
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-600">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

export default ReportView;
