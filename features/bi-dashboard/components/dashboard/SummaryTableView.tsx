
import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { parseSummaryData, roundUp, shortenSupermarketName, parseNumber } from '../../utils/dashboardHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { CogIcon, FilterIcon } from '../Icons';
import { Switch } from './DashboardWidgets';

// --- COLUMN GROUPS FOR ANALYSIS STYLE ---
const COLUMN_GROUPS: Record<string, { label: string, bg: string, text: string }> = {
    'Tên miền': { label: 'DANH MỤC', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-800 dark:text-indigo-300' },
    
    // H.QUA
    'DT Hôm Qua': { label: 'H.QUA', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },

    // DT THỰC (doanh thu thực tế)
    'DTLK': { label: 'DT THỰC', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
    'DT Dự Kiến': { label: 'DT THỰC', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
    
    // DOANH THU QĐ (quy đổi)
    'DTQĐ': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    'DT Dự Kiến (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    '+/- DTCK Tháng (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-800 dark:text-teal-300' },
    
    // HIỆU QUẢ
    'Target (QĐ)': { label: 'HIỆU QUẢ', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-800 dark:text-violet-300' },
    'Target(QĐ) V.Trội': { label: 'HIỆU QUẢ', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-800 dark:text-violet-300' },
    '%HT V.Trội': { label: 'HIỆU QUẢ', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-800 dark:text-violet-300' },
    '%HT TARGET(QĐ) V.Trội': { label: 'HIỆU QUẢ', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-800 dark:text-violet-300' },
    '% HT Target Dự Kiến (QĐ)': { label: 'HIỆU QUẢ', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-800 dark:text-violet-300' },
    '% HT Target (QĐ)': { label: 'HIỆU QUẢ', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-800 dark:text-violet-300' },
    '% HT Target Ngày (QĐ)': { label: 'HIỆU QUẢ', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-800 dark:text-violet-300' },
    '%HQQĐ': { label: 'HIỆU QUẢ', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-800 dark:text-violet-300' },
    
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
        'Tên miền': 'SIÊU THỊ', 'DTLK': 'L.KẾ', 'DTQĐ': 'L.KẾ', 'Target (QĐ)': 'TAR', 'Target(QĐ) V.Trội': 'TAR<br/>V.TRỘI', '%HT V.Trội': '%HT<br/>V.Trội', '%HT TARGET(QĐ) V.Trội': '%HT<br/>V.Trội', 'Lượt Khách LK': 'LK', 'Lượt Bill Bán Hàng': 'BILL BÁN', 'Lượt bill': 'TỔNG<br/>BILL', 'Lượt Bill Thu Hộ': 'THU HỘ', 'TLPVTC LK': 'TLPV', 'Tỷ Trọng Trả Góp': '%TC', 'Tỷ Trọng Trả Chậm': '%TC', '+/- Tỷ Trọng Trả Góp': '+/-CK', '+/- Tỷ Trọng Trả Chậm': '+/-CK', 'Tỷ lệ duyệt': '%Duyệt', 'DT TRẢ GÓP': 'DT', 'DT Trả Góp': 'DT', 'DT Hôm Qua': 'H.QUA', 'DT Dự Kiến': 'D.Kiến', 'DT Dự Kiến (QĐ)': 'D.Kiến', '+/- DTCK Tháng (QĐ)': '+/-CK', '+/- DTCK Tháng': '+/-CK', '+/- Lượt Khách': '+/-KH', '% HT Target Dự Kiến (QĐ)': '%HTDK', '+/- TLPVTC': '+/-PV', 'Số lượng': 'SL', '% HT Target (QĐ)': '%HT', '% HT Target Ngày (QĐ)': '%HT', '%HQQĐ': '%QĐ',
    };

    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const [userHiddenColumns, setUserHiddenColumns] = useIndexedDBState<string[]>(`hidden-cols-summary-${isCumulative ? 'luyke' : 'realtime'}`, ['Lượt Khách LK', 'Lượt Bill Bán Hàng', 'Lượt bill', 'TLPVTC LK', 'Lượt Bill Thu Hộ', 'Lãi gộp QĐ', '%HT Target Dự kiến (LNTT)', '% HT Target Dự Kiến (QĐ)']);

    // --- Supermarket Filter State ---
    const [isSupermarketFilterOpen, setIsSupermarketFilterOpen] = useState(false);
    const supermarketFilterRef = useRef<HTMLDivElement>(null);
    const [supermarketFilterSearch, setSupermarketFilterSearch] = useState('');
    const [hiddenSupermarkets, setHiddenSupermarkets] = useIndexedDBState<string[]>('hidden-supermarkets-summary', []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
            }
            if (supermarketFilterRef.current && !supermarketFilterRef.current.contains(event.target as Node)) {
                setIsSupermarketFilterOpen(false);
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
            // DT THỰC
            'DTLK', 'DT Dự Kiến',
            // DOANH THU QĐ
            'DTQĐ', 'DT Dự Kiến (QĐ)',
            // HIỆU QUẢ
            'Target (QĐ)', 'Target(QĐ) V.Trội', '% HT Target Dự Kiến (QĐ)', '% HT Target (QĐ)', '%HT TARGET(QĐ) V.Trội', '%HT V.Trội', '%HQQĐ',
            // TRAFFIC
            'Lượt Khách LK', 'TLPVTC LK', 'Lượt Bill Bán Hàng', 'Lượt bill', 'Lượt Bill Thu Hộ',
            // TRẢ CHẬM
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

        // Filter hidden supermarkets
        const hiddenSupermarketsSet = new Set(hiddenSupermarkets);
        tempRows = tempRows.filter(row => {
            const smName = row[nameIndex];
            return smName && !hiddenSupermarketsSet.has(smName);
        });

        let sK = isCumulative ? (finalH.includes('%HT TARGET(QĐ) V.Trội') ? '%HT TARGET(QĐ) V.Trội' : '% HT Target Dự Kiến (QĐ)') : (finalH.includes('%HT V.Trội') ? '%HT V.Trội' : '% HT Target (QĐ)');
        const sIdx = finalH.indexOf(sK);
        if (sIdx !== -1) tempRows.sort((a,b) => parseNumber(b[sIdx]?.isMerged ? b[sIdx].value : b[sIdx]) - parseNumber(a[sIdx]?.isMerged ? a[sIdx].value : a[sIdx]));
        if (tRow) tempRows.push(tRow);
        return { allHeaders: finalH, allRows: tempRows, title };
    }, [data, isCumulative, supermarketMonthlyTargets, activeSupermarket, hiddenSupermarkets]);

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

    // --- All supermarket names from data ---
    const allSupermarketNames = useMemo(() => {
        // Get from original data (before filter) to always show all options
        const { headers, rows } = data;
        const origNameIdx = headers.indexOf('Tên miền');
        if (origNameIdx === -1) return [];
        const seen = new Set<string>();
        return rows
            .map(r => r[origNameIdx])
            .filter((name: string) => {
                if (!name || name === 'Tổng' || seen.has(name)) return false;
                seen.add(name);
                return true;
            });
    }, [data]);

    // Supermarket filter dropdown element
    const supermarketFilterDropdown = (
        <div className="relative" ref={supermarketFilterRef}>
            <button
                onClick={() => setIsSupermarketFilterOpen(prev => !prev)}
                className={`p-1.5 transition-colors ${
                    hiddenSupermarkets.length > 0
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-md'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="Lọc danh sách siêu thị"
            >
                <FilterIcon className="h-4 w-4" />
            </button>
            {isSupermarketFilterOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 z-[100] p-2 flex flex-col max-h-96 text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Lọc siêu thị</p>
                    <input
                        type="text"
                        value={supermarketFilterSearch}
                        onChange={(e) => setSupermarketFilterSearch(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-3 py-1.5 mb-2 text-xs border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus:border-primary-500 dark:text-slate-200"
                    />
                    <div className="flex-1 overflow-y-auto space-y-0.5 max-h-60">
                        {allSupermarketNames
                            .filter(name => shortenSupermarketName(name).toLowerCase().includes(supermarketFilterSearch.toLowerCase()))
                            .map((sm: string) => (
                            <div key={sm} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <label
                                    className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-grow cursor-pointer select-none"
                                    onClick={() => setHiddenSupermarkets(prev => prev.includes(sm) ? prev.filter(i => i !== sm) : [...prev, sm])}
                                >
                                    {shortenSupermarketName(sm)}
                                </label>
                                <Switch
                                    checked={!hiddenSupermarkets.includes(sm)}
                                    onChange={() => setHiddenSupermarkets(prev => prev.includes(sm) ? prev.filter(i => i !== sm) : [...prev, sm])}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // Column settings dropdown element — exposed for parent to place in toolbar
    const columnSettingsDropdown = (
        <div className="relative" ref={selectorRef}>
            <button
                onClick={() => setIsColumnSelectorOpen(prev => !prev)}
                className={`p-1.5 transition-colors ${
                    isColumnSelectorOpen
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
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
                            <div key={h} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
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
    );



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

    // Find the portal target in the DashboardHeader action bar
    const portalTarget = typeof document !== 'undefined' ? document.getElementById('column-settings-portal') : null;
    // Find the inline portal target next to the content title
    const inlinePortalTarget = typeof document !== 'undefined' ? document.getElementById('summary-table-inline-actions') : null;

    return (
        <div className="js-summary-table-container relative z-10" ref={ref}>
            {/* Portal column settings into the DashboardHeader action bar */}
            {portalTarget && ReactDOM.createPortal(columnSettingsDropdown, portalTarget)}
            {/* Portal filter inline next to the title */}
            {inlinePortalTarget && ReactDOM.createPortal(supermarketFilterDropdown, inlinePortalTarget)}

            <div className="w-full overflow-hidden">
                    {/* ─── TABLE VIEW — styled like Chi Tiết Theo Kho ─── */}
                    <div className="overflow-x-auto custom-scrollbar p-1.5 sm:p-2 lg:px-6 lg:pb-6 lg:pt-2">
                        <table className="w-full min-w-max text-[11px] sm:text-sm text-center border-collapse border border-slate-200 dark:border-slate-700 whitespace-nowrap compact-export-table">
                            <thead>
                                {/* TIER 1: GROUP HEADERS — pastel bg + colored text like KHO */}
                                <tr className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider">
                                    {/* Sticky 'SIÊU THỊ' merged header (rowSpan=2) — rose style like MÃ KHO */}
                                    {visibleColumns.has('Tên miền') && (
                                        <th
                                            rowSpan={2}
                                            className="px-1.5 sm:px-4 py-1.5 sm:py-3 text-center text-[10px] sm:text-[12px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 select-none align-middle sticky left-0 z-20 uppercase tracking-wider shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]"
                                        >
                                            SIÊU THỊ
                                        </th>
                                    )}
                                    {headerGroups.map((g, idx) => {
                                        if (g.isSingle) {
                                            /* Single-column group: merge into rowSpan=2 */
                                            return (
                                                <th
                                                    key={`group-${idx}`}
                                                    rowSpan={2}
                                                    className={`px-1 sm:px-2 py-1.5 sm:py-3 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity uppercase tracking-wider text-[9px] sm:text-[11px] font-bold text-center align-middle ${g.bg} ${g.text}`}
                                                    dangerouslySetInnerHTML={{ __html: headerMapping[g.singleHeader] || g.singleHeader }}
                                                />
                                            );
                                        }
                                        /* Multi-column group: normal colSpan header */
                                        return (
                                            <th
                                                key={`group-${idx}`}
                                                colSpan={g.colspan}
                                                className={`px-1 sm:px-2 py-1.5 sm:py-3 ${g.text} ${g.bg} border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[9px] sm:text-[11px] font-bold border-r text-center align-middle`}
                                            >
                                                {g.label}
                                            </th>
                                        );
                                    })}
                                </tr>

                                {/* TIER 2: COLUMN HEADERS — sub-headers with pastel bg + thick bottom border */}
                                <tr>
                                    {orderedHeaders.map(h => {
                                        if (!visibleColumns.has(h)) return null;
                                        if (h === 'Tên miền') return null;
                                        /* Skip if this column is a single-column group (already rendered as rowSpan=2) */
                                        const isSingleGroup = headerGroups.some(g => g.isSingle && g.singleHeader === h);
                                        if (isSingleGroup) return null;
                                        const g = COLUMN_GROUPS[h] || { bg: 'bg-slate-50 dark:bg-slate-900/20', text: 'text-slate-500 dark:text-slate-400' };
                                        return (
                                            <th
                                                key={h}
                                                className={`px-1 sm:px-2 py-1.5 sm:py-3 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity uppercase tracking-wider text-[9px] sm:text-[11px] font-bold text-center align-middle ${g.bg} ${g.text}`}
                                                dangerouslySetInnerHTML={{ __html: (headerMapping[h] || h).replace(/((<br\/?>)?V\.TRỘI)/gi, '').trim() }}
                                            />
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {processedTable.allRows.map((row, rIdx) => {
                                    const nameIdx = processedTable.allHeaders.indexOf('Tên miền');
                                    const rawName = row[nameIdx];
                                    const isTotal = rawName === 'Tổng';
                                    const isSel = !isTotal && rawName === activeSupermarket;

                                    if (isTotal) {
                                        /* ── TOTAL ROW — styled like KHO tfoot ── */
                                        return (
                                            <tr
                                                key={rIdx}
                                                className="font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700"
                                            >
                                                {orderedHeaders.map(h => {
                                                    if (!visibleColumns.has(h)) return null;
                                                    const oIdx = processedTable.allHeaders.indexOf(h);
                                                    const cell = row[oIdx];
                                                    const val = parseNumber(cell?.isMerged ? cell.value : cell);

                                                    return (
                                                        <td
                                                            key={h}
                                                            className={`
                                                                px-1 sm:px-2 py-1.5 sm:py-3 leading-tight
                                                                text-[11px] sm:text-[13px] font-bold
                                                                tabular-nums align-middle
                                                                bg-slate-100 dark:bg-slate-800
                                                                ${h === 'Tên miền'
                                                                    ? 'uppercase tracking-tight sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 text-center shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]'
                                                                    : 'text-center'}
                                                            `}
                                                        >
                                                            {cell?.isMerged ? (
                                                                <div className="flex flex-col items-center leading-tight justify-center">
                                                                    <span>{cell.type === 'percent' ? roundUp(val) + '%' : f.format(roundUp(val))}</span>
                                                                    <span className="text-[8px] font-black opacity-70">
                                                                        {(parseNumber(cell.growth) >= 0 ? '+' : '') + roundUp(parseNumber(cell.growth))}%
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                h === 'Tên miền'
                                                                    ? 'TỔNG CỤM'
                                                                    : h === 'DTQĐ' ? <span className="text-indigo-700 dark:text-indigo-400">{f.format(roundUp(val))}</span>
                                                                    : (String(cell).includes('%') || h.includes('%') || h.includes('Tỷ') || h.includes('tỷ') ? roundUp(val) + '%' : f.format(roundUp(val)))
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    }

                                    /* ── NORMAL DATA ROW — styled like KHO tbody ── */
                                    return (
                                        <tr
                                            key={rIdx}
                                            className={`group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isSel ? '!bg-indigo-50/60 dark:!bg-indigo-900/20' : ''}`}
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
                                                if (isHtCol) colorCls = val >= 100 ? ' text-emerald-600 dark:text-emerald-400 font-bold' : val >= 85 ? ' text-amber-600 dark:text-amber-400 font-bold' : ' text-red-600 dark:text-red-400 font-bold';
                                                if (isHqqd) colorCls = val >= (supermarketTargets[smKey]?.quyDoi ?? 40) ? ' text-orange-400 font-bold' : ' text-red-600 dark:text-red-400 font-bold';
                                                if (h === 'DTQĐ') colorCls = ' text-indigo-700 dark:text-indigo-400 font-semibold';
    
                                                return (
                                                    <td
                                                        key={h}
                                                        className={`
                                                            px-1 sm:px-2 py-1.5 sm:py-3 leading-tight
                                                            tabular-nums align-middle whitespace-nowrap
                                                            ${h === 'Tên miền'
                                                                ? `text-left px-1.5 sm:px-3 font-extrabold text-[11px] sm:text-[13px] text-slate-900 dark:text-slate-100 sticky left-0 z-[5] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-center shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)] ${isSel ? '!bg-indigo-50/60 dark:!bg-indigo-900/20' : ''}`
                                                                : `text-center text-[11px] sm:text-sm ${colorCls || ''}`}
                                                        `}
                                                    >
                                                        {cell?.isMerged ? (
                                                            <div className="flex flex-col items-center leading-tight justify-center">
                                                                <span className={h === 'DT Dự Kiến' || h === 'DT Dự Kiến (QĐ)' ? 'text-indigo-700 dark:text-indigo-400 font-extrabold' : ''}>{cell.type === 'percent' ? roundUp(val) + '%' : f.format(roundUp(val))}</span>
                                                                <span className={`text-[8px] font-black ${
                                                                    parseNumber(cell.growth) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                                                                }`}>
                                                                    {(parseNumber(cell.growth) >= 0 ? '+' : '') + roundUp(parseNumber(cell.growth))}%
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            h === 'Tên miền'
                                                                ? shortenSupermarketName(String(cell)).toUpperCase()
                                                                : (isHtCol || isHqqd)
                                                                    ? (
                                                                        <span className={`font-bold ${colorCls}`}>
                                                                            {roundUp(val)}%
                                                                        </span>
                                                                    )
                                                                : h === 'DTQĐ' ? <span className="font-semibold text-indigo-700 dark:text-indigo-400">{f.format(roundUp(val))}</span>
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
            </div>
        </div>
    );
});

export default SummaryTableView;
