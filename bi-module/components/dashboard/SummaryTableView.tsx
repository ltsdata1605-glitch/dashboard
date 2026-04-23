
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { CogIcon } from '../Icons';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { parseSummaryData, roundUp, shortenSupermarketName, parseNumber } from '../../utils/dashboardHelpers';
import { Switch } from './DashboardWidgets';

// --- COLUMN GROUPS FOR ANALYSIS STYLE ---
const COLUMN_GROUPS: Record<string, { label: string, bg: string, text: string }> = {
    'Tên miền': { label: 'DANH MỤC', bg: 'bg-slate-50', text: 'text-slate-700' },
    'DTLK': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'DTQĐ': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'Target (QĐ)': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'Target(QĐ) V.Trội': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '%HT V.Trội': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '%HT TARGET(QĐ) V.Trội': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'DT Dự Kiến': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'DT Dự Kiến (QĐ)': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '% HT Target Dự Kiến (QĐ)': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '+/- DTCK Tháng (QĐ)': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '% HT Target (QĐ)': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '% HT Target Ngày (QĐ)': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '%HQQĐ': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'Lượt Khách LK': { label: 'TRAFFIC & TỶ LỆ', bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    'Lượt Bill Bán Hàng': { label: 'TRAFFIC & TỶ LỆ', bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    'Lượt bill': { label: 'TRAFFIC & TỶ LỆ', bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    'TLPVTC LK': { label: 'TRAFFIC & TỶ LỆ', bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    'Lượt Bill Thu Hộ': { label: 'TRAFFIC & TỶ LỆ', bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    'Tỷ Trọng Trả Góp': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'DT TRẢ GÓP': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'DT Trả Góp': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'Số lượng': { label: 'SỐ LƯỢNG', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
};

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
    const { data, isCumulative = false, supermarketMonthlyTargets, activeSupermarket, onExport, updateTimestamp, supermarketTargets } = props;
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const [userHiddenColumns, setUserHiddenColumns] = useIndexedDBState<string[]>(`hidden-cols-summary-${isCumulative ? 'luyke' : 'realtime'}`, []);
    const [columnOrder, setColumnOrder] = useIndexedDBState<string[]>(`summary-col-order-${isCumulative ? 'luyke' : 'realtime'}`, []);


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

    const headerGroups = useMemo(() => {
        const groups: { label: string, bg: string, text: string, colspan: number, isSticky: boolean }[] = [];
        orderedHeaders.filter(h => visibleColumns.has(h)).forEach(h => {
            const defaultGroup = { label: 'KHÁC', bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' };
            const g = COLUMN_GROUPS[h] || defaultGroup;
            const isSticky = h === 'Tên miền';
            if (groups.length > 0 && groups[groups.length - 1].label === g.label && !isSticky && !groups[groups.length - 1].isSticky) {
                groups[groups.length - 1].colspan += 1;
            } else {
                groups.push({ ...g, colspan: 1, isSticky });
            }
        });
        return groups;
    }, [orderedHeaders, visibleColumns]);

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

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Helper: lấy % HT key tuỳ loại báo cáo
    const getHtKey = () => isCumulative
        ? (processedTable.allHeaders.includes('%HT TARGET(QĐ) V.Trội') ? '%HT TARGET(QĐ) V.Trội' : '% HT Target Dự Kiến (QĐ)')
        : (processedTable.allHeaders.includes('%HT V.Trội') ? '%HT V.Trội' : '% HT Target (QĐ)');

    const htKey = getHtKey();

    const getHtColor = (pct: number) => {
        if (pct >= 100) return { bg: 'bg-emerald-500', text: 'text-white', badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' };
        if (pct >= 85) return { bg: 'bg-amber-400', text: 'text-white', badge: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' };
        return { bg: 'bg-red-500', text: 'text-white', badge: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
    };

    return (
        <div className="js-summary-table-container relative z-10">
            <Card ref={ref} title={cardTitle}
                actionButton={
                    <div className="flex items-center gap-1.5 no-print">
                        <ExportButton onExportPNG={onExport} />
                        <div className="relative" ref={selectorRef}>
                            <button
                                onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    isColumnSelectorOpen
                                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                                title="Tuỳ chỉnh cột"
                            >
                                <CogIcon className="h-4 w-4" />
                            </button>
                            {isColumnSelectorOpen && (
                                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-[100] max-h-80 overflow-y-auto">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Hiển thị cột</p>
                                    <div className="grid gap-0.5">
                                        {orderedHeaders.map(h => (
                                            <div key={h} className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <label
                                                    className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-grow cursor-pointer"
                                                    dangerouslySetInnerHTML={{ __html: headerMapping[h]?.replace(/<br\/>/g, ' ') || h }}
                                                />
                                                <Switch
                                                    checked={visibleColumns.has(h)}
                                                    onChange={() => setUserHiddenColumns(prev => {
                                                        const nH = new Set(prev);
                                                        if (nH.has(h)) nH.delete(h); else nH.add(h);
                                                        return Array.from(nH);
                                                    })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                }
                rounded={false} noPadding
            >
                <div className="overflow-x-auto scrollbar-hide -webkit-overflow-scrolling-touch">
                    {isMobile ? (
                        /* ─── MOBILE CARD VIEW ─── */
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {processedTable.allRows.map((row, rIdx) => {
                                const nameIdx = processedTable.allHeaders.indexOf('Tên miền');
                                const isTotal = row[nameIdx] === 'Tổng';
                                const isSel = !isTotal && row[nameIdx] === activeSupermarket;
                                const htIdx = processedTable.allHeaders.indexOf(htKey);
                                const htPct = htIdx !== -1 ? roundUp(parseNumber(row[htIdx])) : 0;
                                const htColors = getHtColor(htPct);
                                const dtqdIdx = processedTable.allHeaders.indexOf('DTQĐ');
                                const dtqdVal = dtqdIdx !== -1 ? roundUp(parseNumber(row[dtqdIdx])) : 0;

                                /* Hàng TỔNG */
                                if (isTotal) {
                                    return (
                                        <div key={rIdx} className="bg-slate-100 dark:bg-slate-800/80 px-4 py-3 flex items-center justify-between border-t-2 border-slate-300 dark:border-slate-600">
                                            <span className="text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider">Tổng cụm</span>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">DTQĐ</p>
                                                    <p className="text-sm font-black text-primary-600 dark:text-primary-400 tabular-nums">{f.format(dtqdVal)}</p>
                                                </div>
                                                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${htColors.badge}`}>
                                                    {htPct}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }

                                /* Hàng siêu thị */
                                return (
                                    <div key={rIdx} className={`px-4 py-3 ${
                                        isSel ? 'bg-primary-50/60 dark:bg-primary-900/10' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                                    } transition-colors`}>
                                        {/* Header row: tên + % HT badge */}
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                {shortenSupermarketName(String(row[nameIdx])).toUpperCase()}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {/* Progress pill */}
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${htColors.bg} transition-all duration-500`}
                                                            style={{ width: `${Math.min(htPct, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${htColors.badge}`}>
                                                        {htPct}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hero: DTQĐ */}
                                        <div className="flex items-baseline gap-2 mb-2.5">
                                            <span className="text-[1.6rem] font-black text-primary-600 dark:text-primary-400 tabular-nums leading-none">
                                                {f.format(dtqdVal)}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">triệu QĐ</span>
                                            {/* DT Thực */}
                                            {processedTable.allHeaders.indexOf('DTLK') !== -1 && (
                                                <span className="ml-auto text-xs font-bold text-[#b91c1c] dark:text-red-400 tabular-nums">
                                                    {f.format(roundUp(parseNumber(row[processedTable.allHeaders.indexOf('DTLK')])))}
                                                    <span className="text-[9px] font-medium text-slate-400 ml-0.5">thực</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Mini grid: các chỉ số khác */}
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {orderedHeaders.filter(h => !['Tên miền', 'DTLK', 'DTQĐ'].includes(h)).slice(0, 6).map(h => {
                                                if (!visibleColumns.has(h)) return null;
                                                const oIdx = processedTable.allHeaders.indexOf(h);
                                                if (oIdx === -1) return null;
                                                const cell = row[oIdx];
                                                const val = parseNumber(cell?.isMerged ? cell.value : cell);
                                                const isHtCol = h.includes('%HT') || h === '%HT V.Trội';
                                                const htC = isHtCol ? getHtColor(val) : null;
                                                return (
                                                    <div key={h} className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-0.5"
                                                            dangerouslySetInnerHTML={{ __html: headerMapping[h]?.replace(/<br\/>/g, ' ') || h }}
                                                        />
                                                        <p className={`text-[11px] font-black tabular-nums leading-none ${
                                                            htC ? htC.badge.split(' ').filter(c => c.startsWith('text-')).join(' ') : ''
                                                        }`}>
                                                            {cell?.isMerged
                                                                ? (cell.type === 'percent' ? roundUp(val) + '%' : f.format(roundUp(val)))
                                                                : (String(cell).includes('%') || h.includes('%') ? roundUp(val) + '%' : f.format(roundUp(val)))}
                                                        </p>
                                                        {cell?.isMerged && (
                                                            <p className={`text-[7px] font-bold mt-0.5 ${parseNumber(cell.growth) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {(parseNumber(cell.growth) >= 0 ? '+' : '') + roundUp(parseNumber(cell.growth))}%
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
                        /* ─── DESKTOP TABLE VIEW ─── */
                        <div className="border border-slate-200/80 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] m-4 mb-6">
                            <table className="w-full border-collapse compact-export-table">
                                <thead>
                                    {/* TIER 1: GROUP HEADERS */}
                                    <tr>
                                        {headerGroups.map((g, idx) => (
                                            <th
                                                key={`group-${idx}`}
                                                colSpan={g.colspan}
                                                className={`
                                                    py-2.5 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-center 
                                                    border-r border-b border-white/60 dark:border-slate-800/60
                                                    ${g.bg} ${g.text}
                                                    ${g.isSticky ? 'sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.02)]' : ''}
                                                `}
                                            >
                                                {g.label}
                                            </th>
                                        ))}
                                    </tr>

                                    {/* TIER 2: COLUMN HEADERS */}
                                    <tr className="bg-slate-50/70 dark:bg-slate-800/60">
                                        {orderedHeaders.map(h => {
                                            if (!visibleColumns.has(h)) return null;
                                            const g = COLUMN_GROUPS[h] || { text: 'text-slate-600 dark:text-slate-300' };
                                            return (
                                                <th
                                                    key={h}
                                                    className={`
                                                        px-3 py-3 text-[10px] font-bold uppercase
                                                        tracking-wider border-r border-slate-100 dark:border-slate-700/50
                                                        border-b-2 border-b-slate-200/80 dark:border-b-slate-600/60
                                                        text-center align-middle whitespace-nowrap
                                                        hover:bg-slate-50 dark:hover:bg-slate-800/50 select-none
                                                        ${g.text}
                                                        ${h === 'Tên miền' ? 'text-left sticky left-0 z-10 min-w-[150px] bg-slate-50/70 dark:bg-slate-800/60 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.04)]' : ''}
                                                    `}
                                                    dangerouslySetInnerHTML={{ __html: headerMapping[h] || h }}
                                                />
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedTable.allRows.map((row, rIdx) => {
                                        const nameIdx = processedTable.allHeaders.indexOf('Tên miền');
                                        const isTotal = row[nameIdx] === 'Tổng';
                                        const isSel = !isTotal && row[nameIdx] === activeSupermarket;
                                        return (
                                            <tr
                                                key={rIdx}
                                                className={`
                                                    transition-colors duration-100 group
                                                    ${isTotal
                                                        ? 'bg-slate-50 dark:bg-slate-800/80 font-extrabold border-t-2 border-t-slate-300 dark:border-t-slate-600'
                                                        : rIdx % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50/40 dark:bg-slate-800/20'}
                                                    ${!isTotal ? 'hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10' : ''}
                                                    ${isSel ? '!bg-indigo-50/60 dark:!bg-indigo-900/20 ring-1 ring-inset ring-indigo-200/70 dark:ring-indigo-800/50' : ''}
                                                `}
                                            >
                                                {orderedHeaders.map(h => {
                                                    if (!visibleColumns.has(h)) return null;
                                                    const oIdx = processedTable.allHeaders.indexOf(h);
                                                    const cell = row[oIdx];
                                                    const val = parseNumber(cell?.isMerged ? cell.value : cell);
                                                    const isHtCol = (h.includes('%HT') || h === '%HT V.Trội') && !isNaN(val);
                                                    const isHqqd = h === '%HQQĐ' && !isNaN(val);
                                                    const smKey = row[nameIdx];
    
                                                    let colorCls = '';
                                                    if (!isTotal) {
                                                        if (isHtCol) colorCls = val >= 100 ? ' text-emerald-600 dark:text-emerald-400 font-bold' : val >= 85 ? ' text-amber-600 dark:text-amber-400 font-bold' : ' text-red-600 dark:text-red-400 font-bold';
                                                        if (isHqqd) colorCls = val >= (supermarketTargets[smKey]?.quyDoi ?? 40) ? ' text-emerald-600 dark:text-emerald-400 font-bold' : ' text-red-600 dark:text-red-400 font-bold';
                                                        if (h === 'DTLK') colorCls = ' text-[#b91c1c] dark:text-red-400 font-bold';
                                                    }
    
                                                    return (
                                                        <td
                                                            key={h}
                                                            className={`
                                                                px-3 py-3 whitespace-nowrap text-[11px]
                                                                border-r border-b border-slate-100/80 dark:border-slate-700/40 last:border-r-0
                                                                tabular-nums align-middle
                                                                ${isTotal ? 'font-black text-slate-800 dark:text-slate-200' : 'font-semibold text-slate-600 dark:text-slate-300'}
                                                                ${h === 'Tên miền' ? `text-left font-bold sticky left-0 z-[5] shadow-[2px_0_8px_-2px_rgba(0,0,0,0.04)] ${isTotal ? 'bg-slate-50 dark:bg-slate-800/80' : rIdx % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50/40 dark:bg-slate-800/20'}` : 'text-center'}
                                                                ${colorCls}
                                                            `}
                                                        >
                                                            {cell?.isMerged ? (
                                                                <div className="flex flex-col items-center leading-tight justify-center">
                                                                    <span className={h === 'DT Dự Kiến' || h === 'DT Dự Kiến (QĐ)' ? 'text-indigo-700 dark:text-indigo-400 font-extrabold text-[12px]' : ''}>{cell.type === 'percent' ? roundUp(val) + '%' : f.format(roundUp(val))}</span>
                                                                    <span className={`text-[8px] font-black ${
                                                                        isTotal ? 'opacity-70' : parseNumber(cell.growth) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                                                                    }`}>
                                                                        {(parseNumber(cell.growth) >= 0 ? '+' : '') + roundUp(parseNumber(cell.growth))}%
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                h === 'Tên miền'
                                                                    ? (isTotal ? 'TỔNG CỤM' : shortenSupermarketName(String(cell)).toUpperCase())
                                                                    : (isHtCol || isHqqd) && !isTotal
                                                                        ? (
                                                                            <div className="flex justify-center items-center">
                                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black inline-block min-w-[45px] text-center ${val >= 100 ? (isHqqd && val < (supermarketTargets[smKey]?.quyDoi ?? 40) ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400') : val >= 85 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                                                                    {roundUp(val)}%
                                                                                </span>
                                                                            </div>
                                                                        )
                                                                    : h === 'DTQĐ' && !isTotal ? <span className="text-indigo-700 dark:text-indigo-400 font-black text-[12px]">{f.format(roundUp(val))}</span>
                                                                    : (String(cell).includes('%') || h.includes('%') ? roundUp(val) + '%' : f.format(roundUp(val)))
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
});

export default SummaryTableView;
