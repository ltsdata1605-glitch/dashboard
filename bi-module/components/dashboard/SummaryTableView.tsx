
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { parseSummaryData, roundUp, shortenSupermarketName, parseNumber } from '../../utils/dashboardHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { CogIcon } from '../Icons';
import { Switch } from './DashboardWidgets';

// --- COLUMN GROUPS FOR ANALYSIS STYLE ---
const COLUMN_GROUPS: Record<string, { label: string, bg: string, text: string }> = {
    'Tên miền': { label: 'DANH MỤC', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-800 dark:text-indigo-300' },
    
    // H.QUA
    'DT Hôm Qua': { label: 'H.QUA', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },

    // DT THỰC
    'DTLK': { label: 'DT THỰC', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
    'DT Dự Kiến': { label: 'DT THỰC', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
    
    // DOANH THU QĐ
    'DTQĐ': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    'Target (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    'Target(QĐ) V.Trội': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    '%HT V.Trội': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    '%HT TARGET(QĐ) V.Trội': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    'DT Dự Kiến (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    '% HT Target Dự Kiến (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    '+/- DTCK Tháng (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    '% HT Target (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    '% HT Target Ngày (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    '%HQQĐ': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    
    // TRAFFIC
    'Lượt Khách LK': { label: 'TRAFFIC', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
    'Lượt Bill Bán Hàng': { label: 'TRAFFIC', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
    'Lượt bill': { label: 'TRAFFIC', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
    'TLPVTC LK': { label: 'TRAFFIC', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
    'Lượt Bill Thu Hộ': { label: 'TRAFFIC', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
    
    // TRẢ CHẬM
    'Tỷ Trọng Trả Góp': { label: 'TRẢ CHẬM', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
    'Tỷ Trọng Trả Chậm': { label: 'TRẢ CHẬM', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
    '+/- Tỷ Trọng Trả Góp': { label: 'TRẢ CHẬM', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
    '+/- Tỷ Trọng Trả Chậm': { label: 'TRẢ CHẬM', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
    'Tỷ lệ duyệt': { label: 'TRẢ CHẬM', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
    'DT TRẢ GÓP': { label: 'TRẢ CHẬM', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
    'DT Trả Góp': { label: 'TRẢ CHẬM', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
    
    // KHÁC
    'Số lượng': { label: 'SỐ LƯỢNG', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', text: 'text-fuchsia-800 dark:text-fuchsia-300' },
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
    const headerMapping: Record<string, string> = {
        'Tên miền': 'SIÊU THỊ', 'DTLK': 'L.Kế', 'DTQĐ': 'L.Kế', 'Target (QĐ)': 'TARGET<br/>QĐ', 'Target(QĐ) V.Trội': 'TARGET<br/>V.TRỘI', '%HT V.Trội': '%HTDK<br/>V.TRỘI', '%HT TARGET(QĐ) V.Trội': '%HTDK<br/>V.TRỘI', 'Lượt Khách LK': 'L.KHÁCH', 'Lượt Bill Bán Hàng': 'BILL BÁN', 'Lượt bill': 'TỔNG<br/>BILL', 'Lượt Bill Thu Hộ': 'THU HỘ', 'TLPVTC LK': 'TLPV', 'Tỷ Trọng Trả Góp': '%TC', 'Tỷ Trọng Trả Chậm': '%TC', '+/- Tỷ Trọng Trả Góp': '+/-CK', '+/- Tỷ Trọng Trả Chậm': '+/-CK', 'Tỷ lệ duyệt': '%Duyệt', 'DT TRẢ GÓP': 'DT', 'DT Trả Góp': 'DT', 'DT Hôm Qua': 'H.QUA', 'DT Dự Kiến': 'D.Kiến', 'DT Dự Kiến (QĐ)': 'D.Kiến', '+/- DTCK Tháng (QĐ)': '+/-QĐ<br/>CK', '+/- DTCK Tháng': '+/-CK', '+/- Lượt Khách': '+/-KH', '% HT Target Dự Kiến (QĐ)': '%HTDK', '+/- TLPVTC': '+/-PV', 'Số lượng': 'S.LƯỢNG', '% HT Target (QĐ)': '%HTQĐ', '% HT Target Ngày (QĐ)': '%HTQĐ', '%HQQĐ': '%QĐ',
    };

    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const [userHiddenColumns, setUserHiddenColumns] = useIndexedDBState<string[]>(`hidden-cols-summary-${isCumulative ? 'luyke' : 'realtime'}`, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

        const pairs = [{ base: 'Lượt Khách LK', growth: '+/- Lượt Khách' }, { base: 'DT Dự Kiến', growth: '+/- DTCK Tháng' }, { base: 'DT Dự Kiến (QĐ)', growth: '+/- DTCK Tháng (QĐ)' }, { base: 'TLPVTC LK', growth: '+/- TLPVTC' }];
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

        let cleanedHeaders: string[] = [];
        let cleanedRows: any[][] = tempRows.map(() => []);
        tempHeaders.forEach((h, i) => {
            if (h !== '__TO_REMOVE__') {
                cleanedHeaders.push(h);
                tempRows.forEach((r, ri) => cleanedRows[ri].push(r[i]));
            }
        });

        const desiredOrder = [
            'Tên miền', 'DT Hôm Qua',
            'DTLK', 'DT Dự Kiến',
            'DTQĐ', 'DT Dự Kiến (QĐ)', 'Target (QĐ)', '%HQQĐ', '% HT Target Dự Kiến (QĐ)', '% HT Target (QĐ)', 'Target(QĐ) V.Trội', '%HT TARGET(QĐ) V.Trội', '%HT V.Trội',
            'Lượt Khách LK', 'TLPVTC LK', 'Lượt Bill Bán Hàng', 'Lượt bill', 'Lượt Bill Thu Hộ',
            'Tỷ Trọng Trả Góp', 'Tỷ Trọng Trả Chậm', '+/- Tỷ Trọng Trả Góp', '+/- Tỷ Trọng Trả Chậm', 'Tỷ lệ duyệt'
        ];
        
        const finalH: string[] = [];
        const colIndices: number[] = [];
        
        desiredOrder.forEach(dh => {
            const idx = cleanedHeaders.indexOf(dh);
            if (idx !== -1) {
                finalH.push(dh);
                colIndices.push(idx);
            }
        });

        cleanedHeaders.forEach((h, idx) => {
            if (!desiredOrder.includes(h)) {
                finalH.push(h);
                colIndices.push(idx);
            }
        });

        tempRows = cleanedRows.map(row => colIndices.map(idx => row[idx]));
        
        let tRowIdx = tempRows.findIndex(r => r[nameIndex] === 'Tổng');
        let tRow = tRowIdx > -1 ? tempRows.splice(tRowIdx, 1)[0] : null;
        let sK = isCumulative ? (finalH.includes('%HT TARGET(QĐ) V.Trội') ? '%HT TARGET(QĐ) V.Trội' : '% HT Target Dự Kiến (QĐ)') : (finalH.includes('%HT V.Trội') ? '%HT V.Trội' : '% HT Target (QĐ)');
        const sIdx = finalH.indexOf(sK);
        if (sIdx !== -1) tempRows.sort((a,b) => parseNumber(b[sIdx]?.isMerged ? b[sIdx].value : b[sIdx]) - parseNumber(a[sIdx]?.isMerged ? a[sIdx].value : a[sIdx]));
        if (tRow) tempRows.push(tRow);
        return { allHeaders: finalH, allRows: tempRows, title };
    }, [data, isCumulative, supermarketMonthlyTargets, activeSupermarket]);

    const orderedHeaders = useMemo(() => {
        const rest = processedTable.allHeaders.filter(h => h !== 'Tên miền');
        return ['Tên miền', ...rest];
    }, [processedTable.allHeaders]);

    const visibleColumns = useMemo(() => {
        const hiddenSet = new Set(userHiddenColumns);
        return new Set(orderedHeaders.filter(h => !hiddenSet.has(h)));
    }, [orderedHeaders, userHiddenColumns]);

    const toggleColumn = (header: string) => {
        setUserHiddenColumns(prev => {
            const newHidden = new Set(prev);
            if (newHidden.has(header)) newHidden.delete(header);
            else newHidden.add(header);
            return Array.from(newHidden);
        });
    };

    // Build header groups, marking single-column groups for rowSpan=2 rendering
    const headerGroups = useMemo(() => {
        const visH = orderedHeaders.filter(h => visibleColumns.has(h) && h !== 'Tên miền');
        const groups: { label: string, bg: string, text: string, colspan: number, isSticky: boolean, isSingle: boolean, singleHeader: string }[] = [];
        visH.forEach(h => {
            const defaultGroup = { label: 'TRẢ CHẬM', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' };
            const g = COLUMN_GROUPS[h] || defaultGroup;
            if (groups.length > 0 && groups[groups.length - 1].label === g.label) {
                groups[groups.length - 1].colspan += 1;
                groups[groups.length - 1].isSingle = false;
            } else {
                groups.push({ ...g, colspan: 1, isSticky: false, isSingle: true, singleHeader: h });
            }
        });
        return groups;
    }, [orderedHeaders, visibleColumns]);

    const cardTitle = (
        <div className="card-title-text flex flex-col items-start w-full">
            <span className="text-xl font-black uppercase text-primary-700 dark:text-primary-400 leading-none tracking-tight">
                {processedTable.title}
            </span>
            {updateTimestamp && !isCumulative && (
                <div className="flex items-center gap-1 mt-1.5 opacity-60 no-print">
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
                                onClick={() => setIsColumnSelectorOpen(prev => !prev)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    isColumnSelectorOpen
                                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                                title="Tuỳ chỉnh hiển thị cột"
                            >
                                <CogIcon className="h-4 w-4" />
                            </button>
                            {isColumnSelectorOpen && (
                                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-[100] max-h-[400px] overflow-y-auto">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tuỳ chỉnh hiển thị cột</p>
                                    <div className="grid gap-0.5">
                                        {orderedHeaders.filter(h => h !== 'Tên miền').map((h) => (
                                            <div key={h} className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                <label
                                                    htmlFor={`col-toggle-sum-${h}`}
                                                    className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-grow cursor-pointer select-none"
                                                    dangerouslySetInnerHTML={{ __html: headerMapping[h]?.replace(/<br\/>/g, ' ') || h }}
                                                />
                                                <Switch
                                                    id={`col-toggle-sum-${h}`}
                                                    checked={visibleColumns.has(h)}
                                                    onChange={() => toggleColumn(h)}
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
                <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
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
                                                                : (String(cell).includes('%') || h.includes('%') || h.includes('Tỷ') || h.includes('tỷ') ? roundUp(val) + '%' : f.format(roundUp(val)))}
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
                        <div className="overflow-x-auto m-4 mb-6 pb-4 custom-scrollbar">
                            <table className="w-full border-collapse compact-export-table border border-slate-200 dark:border-slate-700 min-w-max">
                                <thead>
                                    {/* TIER 1: GROUP HEADERS */}
                                    <tr className="text-[11px] font-bold uppercase tracking-wider">
                                        {/* Sticky 'SIÊU THỊ' merged header (rowSpan=2) */}
                                        {visibleColumns.has('Tên miền') && (
                                            <th
                                                rowSpan={2}
                                                className={`
                                                    px-4 py-2.5 text-center text-[12px] font-bold
                                                    text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30
                                                    border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600
                                                    border-r border-slate-200 dark:border-slate-700
                                                    sticky left-0 z-20 align-middle
                                                    uppercase tracking-wider
                                                `}
                                            >
                                                SIÊU THỊ
                                            </th>
                                        )}
                                        {headerGroups.map((g, idx) => {
                                            if (g.isSingle) {
                                                /* Single-column group: merge into rowSpan=2 like SIÊU THỊ */
                                                return (
                                                    <th
                                                        key={`group-${idx}`}
                                                        rowSpan={2}
                                                        className={`
                                                            py-2.5 px-2 text-[11px] font-bold uppercase tracking-wider text-center
                                                            align-middle whitespace-nowrap
                                                            border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600
                                                            border-r border-slate-200 dark:border-slate-700
                                                            ${g.bg} ${g.text}
                                                        `}
                                                        dangerouslySetInnerHTML={{ __html: headerMapping[g.singleHeader] || g.singleHeader }}
                                                    />
                                                );
                                            }
                                            /* Multi-column group: normal colSpan header */
                                            return (
                                                <th
                                                    key={`group-${idx}`}
                                                    colSpan={g.colspan}
                                                    className={`
                                                        py-2.5 px-2 text-[11px] font-bold uppercase tracking-wider text-center 
                                                        border-b border-r border-slate-200 dark:border-slate-700
                                                        ${g.bg} ${g.text}
                                                    `}
                                                >
                                                    {g.label}
                                                </th>
                                            );
                                        })}
                                    </tr>

                                    {/* TIER 2: COLUMN HEADERS — skip 'Tên miền' and single-col groups (already rowSpan=2) */}
                                    <tr>
                                        {orderedHeaders.map(h => {
                                            if (!visibleColumns.has(h)) return null;
                                            if (h === 'Tên miền') return null;
                                            /* Skip if this column is a single-column group (already rendered as rowSpan=2) */
                                            const isSingleGroup = headerGroups.some(g => g.isSingle && g.singleHeader === h);
                                            if (isSingleGroup) return null;
                                            const g = COLUMN_GROUPS[h] || { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300' };
                                            return (
                                                <th
                                                    key={h}
                                                    className={`
                                                        px-2 py-2.5 text-[11px] font-bold uppercase
                                                        tracking-wider border-r border-slate-200 dark:border-slate-700
                                                        border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600
                                                        text-center align-middle whitespace-nowrap
                                                        cursor-pointer hover:opacity-80 transition-opacity select-none
                                                        ${g.bg} ${g.text}
                                                    `}
                                                    dangerouslySetInnerHTML={{ __html: headerMapping[h] || h }}
                                                />
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {processedTable.allRows.map((row, rIdx) => {
                                        const nameIdx = processedTable.allHeaders.indexOf('Tên miền');
                                        const isTotal = row[nameIdx] === 'Tổng';
                                        const isSel = !isTotal && row[nameIdx] === activeSupermarket;
                                        return (
                                            <tr
                                                key={rIdx}
                                                className={`
                                                    transition-colors group
                                                    ${isTotal
                                                        ? 'bg-slate-100 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700'
                                                        : 'bg-white dark:bg-slate-900'}
                                                    ${!isTotal ? 'hover:bg-slate-50 dark:hover:bg-slate-800' : ''}
                                                    ${isSel ? '!bg-indigo-50/60 dark:!bg-indigo-900/20' : ''}
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
                                                                px-2 py-2.5 whitespace-nowrap text-[12px]
                                                                leading-tight h-px
                                                                tabular-nums align-middle
                                                                ${isTotal ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-600 dark:text-slate-300'}
                                                                ${h === 'Tên miền' ? `text-center font-bold sticky left-0 z-[5] border-r border-slate-200 dark:border-slate-700 ${isTotal ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-900'}` : 'text-center'}
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
                                                                    : (String(cell).includes('%') || h.includes('%') || h.includes('Tỷ') || h.includes('tỷ') ? roundUp(val) + '%' : f.format(roundUp(val)))
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
