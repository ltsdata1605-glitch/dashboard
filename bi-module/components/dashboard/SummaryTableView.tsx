
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { CogIcon } from '../Icons';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { parseSummaryData, roundUp, shortenSupermarketName, parseNumber } from '../../utils/dashboardHelpers';
import { Switch } from './DashboardWidgets';

// --- Helpers ---
const getYesterdayDateString = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return `${yesterday.getDate()}/${yesterday.getMonth() + 1}`;
};

const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

interface SummaryTableViewProps {
    data: ReturnType<typeof parseSummaryData>['table'];
    isCumulative?: boolean;
    supermarketDailyTargets: Record<string, number>;
    supermarketMonthlyTargets: Record<string, number>;
    activeSupermarket: string | null;
    onExport: () => Promise<void>;
    updateTimestamp?: string | null;
    supermarketTargets: Record<string, { quyDoi: number; traGop: number }>;
}

const SummaryTableView = React.forwardRef<HTMLDivElement, SummaryTableViewProps>((props, ref) => {
    const { data, isCumulative = false, supermarketDailyTargets, supermarketMonthlyTargets, activeSupermarket, onExport, updateTimestamp, supermarketTargets } = props;
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const [userHiddenColumns, setUserHiddenColumns] = useIndexedDBState<string[]>(`hidden-cols-summary-${isCumulative ? 'luyke' : 'realtime'}`, []);
    const [columnOrder, setColumnOrder] = useIndexedDBState<string[]>(`summary-col-order-${isCumulative ? 'luyke' : 'realtime'}`, []);
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

    const headerMapping: Record<string, string> = {
        'Tên miền': 'SIÊU THỊ', 'DTLK': 'DT<br/>THỰC', 'DTQĐ': 'DTQĐ', 'Target (QĐ)': 'M.TIÊU<br/>QĐ', 'Target(QĐ) V.Trội': 'M.TIÊU<br/>V.TRỘI', '%HT V.Trội': '%HT<br/>VT', '%HT TARGET(QĐ) V.Trội': '%HT<br/>VT', 'Lượt Khách LK': 'KHÁCH', 'Lượt Bill Bán Hàng': 'BILL', 'Lượt bill': 'TỔNG<br/>BILL', 'Lượt Bill Thu Hộ': 'THU HỘ', 'TLPVTC LK': 'TLPV', 'Tỷ Trọng Trả Góp': '%T.CHẬM', 'DT TRẢ GÓP': 'DT T.CHẬM', 'DT Trả Góp': 'DT T.CHẬM', 'DT Hôm Qua': 'H.QUA', 'DT Dự Kiến': 'DTDK', 'DT Dự Kiến (QĐ)': 'DTQĐ<br/>DK', '+/- DTCK Tháng (QĐ)': '+/-QĐ<br/>CK', '+/- DTCK Tháng': '+/-CK', '+/- Lượt Khách': '+/-KH', '% HT Target Dự Kiến (QĐ)': '%HTDK', '+/- Tỷ Trọng Trả Góp': '+/-T.C', '+/- TLPVTC': '+/-PV', 'Số lượng': 'SL', '% HT Target (QĐ)': '%HTQĐ', '% HT Target Ngày (QĐ)': '%HTQĐ', '%HQQĐ': '%HQQĐ',
    };

    const processedTable = useMemo(() => {
        const { headers, rows } = data;
        let displayName = (activeSupermarket && activeSupermarket !== 'Tổng') ? shortenSupermarketName(activeSupermarket).toUpperCase() : 'TỔNG QUAN';
        let title = isCumulative ? `LUỸ KẾ DOANH THU - ${displayName} ĐẾN NGÀY ${getYesterdayDateString()}` : `REALTIME DOANH THU - ${displayName}`;

        if (!headers || headers.length === 0) return { allHeaders: [], allRows: [], title };

        const nameIndexOrigin = headers.indexOf('Tên miền');
        let uniqueRows: string[][] = [];
        if (nameIndexOrigin !== -1) {
            const seenNames = new Set<string>();
            rows.forEach(row => { if (!seenNames.has(row[nameIndexOrigin])) { seenNames.add(row[nameIndexOrigin]); uniqueRows.push(row); } });
        } else uniqueRows = rows;

        let tempHeaders = [...headers], tempRows: any[][] = JSON.parse(JSON.stringify(uniqueRows));
        const nameIndex = tempHeaders.indexOf('Tên miền');

        if (isCumulative) {
            const dtlkIndex = tempHeaders.indexOf('DTLK'), dtqdIndex = tempHeaders.indexOf('DTQĐ');
            if (dtlkIndex !== -1 && dtqdIndex !== -1) {
                tempHeaders.splice(dtqdIndex + 1, 0, '%HQQĐ');
                tempRows = tempRows.map(row => {
                    const newRow = [...row], dVal = parseNumber(newRow[dtlkIndex]), qVal = parseNumber(newRow[dtqdIndex]);
                    newRow.splice(dtqdIndex + 1, 0, (dVal > 0 ? roundUp(((qVal / dVal) - 1) * 100) : 0) + '%');
                    return newRow;
                });
            }
            const hIndex = tempHeaders.indexOf('% HT Target Dự Kiến (QĐ)'), dDIndex = tempHeaders.indexOf('DT Dự Kiến (QĐ)');
            if (hIndex !== -1 && nameIndex !== -1 && dDIndex !== -1) {
                tempHeaders.splice(hIndex + 1, 0, "Target(QĐ) V.Trội", "%HT TARGET(QĐ) V.Trội");
                tempRows = tempRows.map(row => {
                    const newRow = [...row], sm = row[nameIndex];
                    let mT = supermarketMonthlyTargets[sm] ?? 0;
                    if (sm === 'Tổng') mT = Object.values(supermarketMonthlyTargets).reduce<number>((s, v) => s + Number(v), 0);
                    const dkQ = parseNumber(row[dDIndex]), ht = mT > 0 ? (dkQ / mT) * 100 : 0;
                    newRow.splice(hIndex + 1, 0, mT, `${roundUp(ht)}%`);
                    return newRow;
                });
            }
        } else {
            const indicesToRemove = ['Lãi gộp QĐ', '%HT Target Dự kiến (LNTT)'].map(h => tempHeaders.indexOf(h)).filter(i => i !== -1).sort((a, b) => b - a);
            indicesToRemove.forEach(i => tempHeaders.splice(i, 1));
            tempRows = tempRows.map(row => { const nr = [...row]; indicesToRemove.forEach(i => nr.splice(i, 1)); return nr; });
            const dIndex = tempHeaders.indexOf('DTLK'), qIndex = tempHeaders.indexOf('DTQĐ');
            if (dIndex !== -1 && qIndex !== -1 && nameIndex !== -1) {
                const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                tempHeaders.splice(qIndex + 1, 0, '%HQQĐ');
                const tIndex = tempHeaders.indexOf('Target (QĐ)');
                if (tIndex !== -1) tempHeaders.splice(tIndex + 1, 0, "Target(QĐ) V.Trội");
                const htIndex = tempHeaders.indexOf('% HT Target (QĐ)');
                if (htIndex !== -1) tempHeaders.splice(htIndex + 1, 0, "%HT V.Trội");
                tempRows = tempRows.map(row => {
                    const nr = [...row], dV = parseNumber(nr[dIndex]), qV = parseNumber(nr[qIndex]), sm = nr[nameIndex];
                    let mT = supermarketMonthlyTargets[sm] ?? 0;
                    if (sm === 'Tổng') mT = Object.values(supermarketMonthlyTargets).reduce<number>((s, v) => s + Number(v), 0);
                    const dT = mT / daysInMonth, ht = dT > 0 ? (qV / dT) * 100 : 0;
                    nr.splice(qIndex + 1, 0, (dV > 0 ? roundUp(((qV / dV) - 1) * 100) : 0) + '%');
                    const oT = data.headers.indexOf('Target (QĐ)');
                    if(oT !== -1) nr.splice(oT + 2, 0, dT);
                    const oHt = data.headers.indexOf('% HT Target (QĐ)');
                    if(oHt !== -1) nr.splice(nr.indexOf(row[oHt]) + 1, 0, `${roundUp(ht)}%`);
                    return nr;
                });
            }
        }

        const pairs = [{ base: 'Lượt Khách LK', growth: '+/- Lượt Khách' }, { base: 'Tỷ Trọng Trả Góp', growth: '+/- Tỷ Trọng Trả Góp' }, { base: 'DT Dự Kiến', growth: '+/- DTCK Tháng' }, { base: 'DT Dự Kiến (QĐ)', growth: '+/- DTCK Tháng (QĐ)' }, { base: 'TLPVTC LK', growth: '+/- TLPVTC' }];
        pairs.forEach(p => {
            const bIdx = tempHeaders.indexOf(p.base), gIdx = tempHeaders.indexOf(p.growth);
            if (bIdx !== -1 && gIdx !== -1) {
                tempRows = tempRows.map(row => {
                    row[bIdx] = { value: row[bIdx], growth: row[gIdx], isMerged: true, type: (p.base.includes('Tỷ Trọng') || p.base.includes('TLPVTC')) ? 'percent' : 'number' };
                    return row;
                });
                tempHeaders[gIdx] = '__TO_REMOVE__';
            }
        });

        const finalH: string[] = [], rIdxs: number[] = [];
        tempHeaders.forEach((h, i) => { if (h === '__TO_REMOVE__') rIdxs.push(i); else finalH.push(h); });
        tempRows = tempRows.map(row => row.filter((_, i) => !rIdxs.includes(i)));
        
        let tRowIdx = tempRows.findIndex(r => r[nameIndex] === 'Tổng');
        let tRow = tRowIdx > -1 ? tempRows.splice(tRowIdx, 1)[0] : null;
        let sK = isCumulative ? (finalH.includes('%HT TARGET(QĐ) V.Trội') ? '%HT TARGET(QĐ) V.Trội' : '% HT Target Dự Kiến (QĐ)') : (finalH.includes('%HT V.Trội') ? '%HT V.Trội' : '% HT Target (QĐ)');
        const sIdx = finalH.indexOf(sK);
        if (sIdx !== -1) tempRows.sort((a,b) => parseNumber(b[sIdx]?.isMerged ? b[sIdx].value : b[sIdx]) - parseNumber(a[sIdx]?.isMerged ? a[sIdx].value : a[sIdx]));
        if (tRow) tempRows.push(tRow);
        return { allHeaders: finalH, allRows: tempRows, title };
    }, [data, isCumulative, supermarketMonthlyTargets, activeSupermarket]);

    useEffect(() => {
        if (processedTable.allHeaders.length > 0) {
            const curH = processedTable.allHeaders, nO = [...columnOrder], fO = nO.filter(h => curH.includes(h)), mH = curH.filter(h => !fO.includes(h));
            if (mH.length > 0 || fO.length !== nO.length) setColumnOrder([...fO, ...mH]);
        }
    }, [processedTable.allHeaders, columnOrder, setColumnOrder]);

    const orderedHeaders = useMemo(() => columnOrder.filter(h => processedTable.allHeaders.includes(h)), [columnOrder, processedTable.allHeaders]);
    const visibleColumns = useMemo(() => new Set(orderedHeaders.filter(h => !new Set(userHiddenColumns).has(h))), [orderedHeaders, userHiddenColumns]);

    const cardTitle = (
        <div className="card-title-text flex flex-col items-center justify-center w-full">
            <span className="text-xl font-black uppercase text-primary-700 dark:text-primary-400 text-center leading-none tracking-tight">
                {processedTable.title}
            </span>
            {updateTimestamp && !isCumulative && (
                <div className="flex items-center justify-center gap-1 mt-1.5 opacity-60 no-print">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{updateTimestamp}</span>
                </div>
            )}
        </div>
    );

    const isMobile = window.innerWidth < 768;

    return (
        <div className="js-summary-table-container relative z-10">
            <Card ref={ref} title={cardTitle} actionButton={<div className="flex items-center gap-1.5 no-print"><ExportButton onExportPNG={onExport} /><div className="relative" ref={selectorRef}><button onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)} className="p-1 rounded-full text-slate-500 hover:bg-slate-200"><CogIcon className="h-4 w-4" /></button>{isColumnSelectorOpen && <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-lg border p-2 z-[100] max-h-80 overflow-y-auto"><div className="grid gap-1">{orderedHeaders.map(h => <div key={h} className="flex items-center justify-between p-2 rounded hover:bg-slate-50"><label className="text-xs text-slate-700 flex-grow" dangerouslySetInnerHTML={{ __html: headerMapping[h]?.replace(/<br\/>/g, ' ') || h }} /><Switch checked={visibleColumns.has(h)} onChange={() => setUserHiddenColumns(prev => { const nH = new Set(prev); if (nH.has(h)) nH.delete(h); else nH.add(h); return Array.from(nH); })} /></div>)}</div></div>}</div></div>} rounded={false} noPadding>
                <div className="overflow-x-auto scrollbar-hide">
                    {isMobile ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {processedTable.allRows.map((row, rIdx) => {
                                const nameIdx = processedTable.allHeaders.indexOf('Tên miền');
                                const isTotal = row[nameIdx] === 'Tổng';
                                const isSel = !isTotal && row[nameIdx] === activeSupermarket;
                                
                                if (isTotal) {
                                    return (
                                        <div key={rIdx} className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-white px-4 py-3 flex justify-between items-center font-extrabold uppercase tracking-wider text-xs border-t-[3px] border-t-slate-200">
                                            <span>TỔNG CỘNG</span>
                                            <div className="flex flex-col items-end">
                                                <span>{f.format(roundUp(parseNumber(row[processedTable.allHeaders.indexOf('DTQĐ')])))} Tr</span>
                                                <span className="text-[10px] opacity-80">{roundUp(parseNumber(row[processedTable.allHeaders.indexOf('% HT Target (QĐ)')]))}% HT</span>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={rIdx} className={`p-4 flex flex-col gap-3 ${isSel ? 'bg-indigo-50/50 dark:bg-indigo-900/10 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors'}`}>
                                        <div className="flex justify-between items-start">
                                            <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{shortenSupermarketName(String(row[nameIdx])).toUpperCase()}</span>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${parseNumber(row[processedTable.allHeaders.indexOf('% HT Target (QĐ)')]) >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {roundUp(parseNumber(row[processedTable.allHeaders.indexOf('% HT Target (QĐ)')]))}% HT
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-2">
                                            {orderedHeaders.slice(1, 7).map(h => {
                                                if (!visibleColumns.has(h)) return null;
                                                const oIdx = processedTable.allHeaders.indexOf(h);
                                                const cell = row[oIdx];
                                                const val = parseNumber(cell?.isMerged ? cell.value : cell);
                                                return (
                                                    <div key={h} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1" dangerouslySetInnerHTML={{ __html: headerMapping[h]?.replace(/<br\/>/g, ' ') || h }}></p>
                                                        <p className={`text-xs font-black tabular-nums ${h === 'DTQĐ' ? 'text-indigo-700 dark:text-indigo-400' : ''}`}>
                                                            {cell?.isMerged ? (cell.type === 'percent' ? roundUp(val)+'%' : f.format(roundUp(val))) : (String(cell).includes('%') || h.includes('%') ? roundUp(val) + '%' : f.format(roundUp(val)))}
                                                        </p>
                                                        {cell?.isMerged && (
                                                            <p className={`text-[8px] font-bold ${parseNumber(cell.growth) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                ({(parseNumber(cell.growth) >= 0 ? '+' : '') + roundUp(parseNumber(cell.growth)) + '%'})
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    {orderedHeaders.map(h => visibleColumns.has(h) ? <th key={h} className={`px-1 py-3 text-[10px] font-bold text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/80 tracking-wider border-r border-slate-200 dark:border-slate-700 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 hover:bg-slate-100 dark:hover:bg-slate-750 text-center whitespace-nowrap`} dangerouslySetInnerHTML={{ __html: headerMapping[h] || h }}></th> : null)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-[#1c1c1e]">
                                {processedTable.allRows.map((row, rIdx) => { 
                                    const nameIdx = processedTable.allHeaders.indexOf('Tên miền'), isTotal = row[nameIdx] === 'Tổng', isSel = !isTotal && row[nameIdx] === activeSupermarket; 
                                    return (
                                        <tr key={rIdx} className={`${isTotal ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-white font-extrabold border-t-[3px] border-t-slate-200' : 'bg-white dark:bg-[#1c1c1e] hover:bg-slate-50 dark:hover:bg-slate-750'} ${isSel ? '!bg-indigo-50/50 dark:!bg-indigo-900/10 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800/50' : ''}`}>
                                            {orderedHeaders.map(h => { 
                                                if (!visibleColumns.has(h)) return null; 
                                                const oIdx = processedTable.allHeaders.indexOf(h), cell = row[oIdx], val = parseNumber(cell?.isMerged ? cell.value : cell); 
                                                let classes = `px-1 py-2.5 whitespace-nowrap text-[10px] border-r border-slate-100 dark:border-slate-700 last:border-r-0 tabular-nums ${isTotal ? 'font-bold' : 'font-normal'} ${h === 'Tên miền' ? 'text-left font-medium' : 'text-center'}`; 
                                                if (!isTotal) { 
                                                    if ((h.includes('%HT') || h === '%HT V.Trội') && !isNaN(val)) classes += val >= 100 ? ' text-green-600' : (val >= 85 ? ' text-yellow-600' : ' text-red-600'); 
                                                    if (h === '%HQQĐ' && !isNaN(val)) classes += val >= (supermarketTargets[row[nameIdx]]?.quyDoi ?? 40) ? ' text-green-600 font-bold' : ' text-red-600'; 
                                                    if (h === 'DTLK') classes += ' text-[#980000]'; 
                                                    if (h === 'DTQĐ') classes += ' text-indigo-700 dark:text-indigo-400 font-extrabold'; 
                                                } 
                                                return (
                                                    <td key={h} className={classes}>
                                                        {cell?.isMerged ? (
                                                            <div className="flex flex-col items-center leading-none">
                                                                <span className="font-normal">{cell.type === 'percent' ? roundUp(val)+'%' : f.format(roundUp(val))}</span>
                                                                <span className={`text-[7px] font-medium ${isTotal ? 'text-white' : (parseNumber(cell.growth) >= 0 ? 'text-green-600' : 'text-red-600')}`}>({(parseNumber(cell.growth) >= 0 ? '+' : '') + roundUp(parseNumber(cell.growth)) + '%'})</span>
                                                            </div>
                                                        ) : (
                                                            h === 'Tên miền' ? (isTotal ? 'TỔNG' : shortenSupermarketName(String(cell)).toUpperCase()) : (String(cell).includes('%') || h.includes('%') ? roundUp(val) + '%' : f.format(roundUp(val)))
                                                        )}
                                                    </td>
                                                ); 
                                            })}
                                        </tr>
                                    ); 
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
});

export default SummaryTableView;
