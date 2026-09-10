
import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { parseSummaryData, roundUp, shortenSupermarketName, parseNumber } from '../../utils/dashboardHelpers';
import { buildSummaryTable } from '../../services/summaryTableCalc';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { CogIcon, FilterIcon } from '../Icons';
import { Switch } from './DashboardWidgets';
import { renderHeaderText } from './SafeHeaderText';
import { Button } from '../../../../components/shared/ui/Button';
import { Input } from '../../../../components/shared/ui/Input';
import { getBorderAccentFromColorClass } from '../../../../utils/dataUtils';

// --- COLUMN GROUPS FOR ANALYSIS STYLE ---
const COLUMN_GROUPS: Record<string, { label: string, bg: string, text: string }> = {
    'Tên miền': { label: 'DANH MỤC', bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-800 dark:text-sky-300' },
    
    // H.QUA
    'DT Hôm Qua': { label: 'H.QUA', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },

    // DT THỰC (doanh thu thực tế)
    'DTLK': { label: 'DT THỰC', bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-800 dark:text-sky-300' },
    'DT Dự Kiến': { label: 'DT THỰC', bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-800 dark:text-sky-300' },

    // DOANH THU QĐ (quy đổi)
    'DTQĐ': { label: 'DOANH THU QĐ', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300' },
    'DT Dự Kiến (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300' },
    '+/- DTCK Tháng (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300' },
    
    // HIỆU QUẢ (đổi indigo → emerald cho khớp quy ước %HT/hiệu quả toàn dự án, implementation_plan.md mục 61)
    'Target (QĐ)': { label: 'HIỆU QUẢ', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    'Target(QĐ) V.Trội': { label: 'HIỆU QUẢ', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    '%HT V.Trội': { label: 'HIỆU QUẢ', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    '%HT TARGET(QĐ) V.Trội': { label: 'HIỆU QUẢ', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    '% HT Target Dự Kiến (QĐ)': { label: 'HIỆU QUẢ', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    '% HT Target (QĐ)': { label: 'HIỆU QUẢ', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    '% HT Target Ngày (QĐ)': { label: 'HIỆU QUẢ', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    '%HQQĐ': { label: 'HIỆU QUẢ', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    
    // TRAFFIC
    'Lượt Khách LK': { label: 'TRAFFIC', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    'Lượt Bill Bán Hàng': { label: 'TRAFFIC', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    'Lượt bill': { label: 'TRAFFIC', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    'TLPVTC LK': { label: 'TRAFFIC', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    'Lượt Bill Thu Hộ': { label: 'TRAFFIC', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300' },
    
    // TRẢ CHẬM
    'Tỷ Trọng Trả Góp': { label: 'TRẢ CHẬM', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300' },
    'Tỷ Trọng Trả Chậm': { label: 'TRẢ CHẬM', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300' },
    '+/- Tỷ Trọng Trả Góp': { label: 'TRẢ CHẬM', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300' },
    '+/- Tỷ Trọng Trả Chậm': { label: 'TRẢ CHẬM', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300' },
    'Tỷ lệ duyệt': { label: 'TRẢ CHẬM', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300' },
    'DT TRẢ GÓP': { label: 'TRẢ CHẬM', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300' },
    'DT Trả Góp': { label: 'TRẢ CHẬM', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300' },
    
    // KHÁC
    'Số lượng': { label: 'SỐ LƯỢNG', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300' },
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
    const { data, isCumulative = false, supermarketMonthlyTargets, activeSupermarket, supermarketTargets } = props;
    const headerMapping: Record<string, string> = {
        'Tên miền': 'SIÊU THỊ', 'DTLK': 'L.KẾ', 'DTQĐ': 'L.KẾ<br/>QĐ', 'Target (QĐ)': 'TAR', 'Target(QĐ) V.Trội': 'TAR<br/>V.TRỘI', '%HT V.Trội': '%HT<br/>V.Trội', '%HT TARGET(QĐ) V.Trội': '%HT<br/>V.Trội', 'Lượt Khách LK': 'LK', 'Lượt Bill Bán Hàng': 'BILL BÁN', 'Lượt bill': 'TỔNG<br/>BILL', 'Lượt Bill Thu Hộ': 'THU HỘ', 'TLPVTC LK': 'TLPV', 'Tỷ Trọng Trả Góp': '%TC', 'Tỷ Trọng Trả Chậm': '%TC', '+/- Tỷ Trọng Trả Góp': '+/-CK', '+/- Tỷ Trọng Trả Chậm': '+/-CK', 'Tỷ lệ duyệt': '%Duyệt', 'DT TRẢ GÓP': 'DT', 'DT Trả Góp': 'DT', 'DT Hôm Qua': 'H.QUA', 'DT Dự Kiến': 'D.Kiến', 'DT Dự Kiến (QĐ)': 'D.Kiến', '+/- DTCK Tháng (QĐ)': '+/-CK', '+/- DTCK Tháng': '+/-CK', '+/- Lượt Khách': '+/-KH', '% HT Target Dự Kiến (QĐ)': '%HTDK', '+/- TLPVTC': '+/-PV', 'Số lượng': 'SL', '% HT Target (QĐ)': '%HT', '% HT Target Ngày (QĐ)': '%HT', '%HQQĐ': '%QĐ',
    };

    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const [userHiddenColumns, setUserHiddenColumns] = useIndexedDBState<string[]>(`hidden-cols-summary-${isCumulative ? 'luyke' : 'realtime'}`, ['Lượt Khách LK', 'Lượt Bill Bán Hàng', 'Lượt bill', 'TLPVTC LK', 'Lượt Bill Thu Hộ', 'Lãi gộp QĐ', '%HT Target Dự kiến (LNTT)', '% HT Target Dự Kiến (QĐ)']);

    // --- Supermarket Filter State ---
    const [isSupermarketFilterOpen, setIsSupermarketFilterOpen] = useState(false);
    const supermarketFilterRef = useRef<HTMLDivElement>(null);
    const [supermarketFilterSearch, setSupermarketFilterSearch] = useState('');
    const [hiddenSupermarkets, setHiddenSupermarkets] = useIndexedDBState<string[]>(`hidden-supermarkets-summary-${isCumulative ? 'luyke' : 'realtime'}`, []);

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

    const processedTable = useMemo(
        () => buildSummaryTable(data, { isCumulative, activeSupermarket, supermarketMonthlyTargets, hiddenSupermarkets }),
        [data, isCumulative, supermarketMonthlyTargets, activeSupermarket, hiddenSupermarkets]
    );

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
            const defaultGroup = { label: 'TRẢ CHẬM', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300' };
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
            <Button
                variant="unstyled" size="none"
                onClick={() => setIsSupermarketFilterOpen(prev => !prev)}
                className={`p-1.5 transition-colors ${
                    hiddenSupermarkets.length > 0
                        ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 rounded-md'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="Lọc danh sách siêu thị"
            >
                <FilterIcon className="h-4 w-4" />
            </Button>
            {isSupermarketFilterOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-700 z-[100] p-2 flex flex-col max-h-96 text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Lọc siêu thị</p>
                    <Input
                        type="text"
                        value={supermarketFilterSearch}
                        onChange={(e) => setSupermarketFilterSearch(e.target.value)}
                        placeholder="Tìm kiếm..."
                        leftIcon="search"
                        className="mb-2 text-xs"
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
            <Button
                variant="unstyled" size="none"
                onClick={() => setIsColumnSelectorOpen(prev => !prev)}
                className={`p-1.5 transition-colors ${
                    isColumnSelectorOpen
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="Tuỳ chỉnh hiển thị cột"
            >
                <CogIcon className="h-4 w-4" />
            </Button>
            {isColumnSelectorOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-[100] max-h-[400px] overflow-y-auto">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tuỳ chỉnh hiển thị cột</p>
                    <div className="grid gap-0.5">
                        {orderedHeaders.filter(h => h !== 'Tên miền').map((h) => (
                            <div key={h} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <label
                                    htmlFor={`col-toggle-sum-${h}`}
                                    className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-grow cursor-pointer select-none"
                                >
                                    {headerMapping[h]?.replace(/<br\/>/g, ' ') || h}
                                </label>
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
                        <table className="w-full min-w-max text-[11px] sm:text-[13px] text-center border-collapse border border-slate-200 dark:border-slate-700 whitespace-nowrap compact-export-table">
                            <thead>
                                {/* TIER 1: GROUP HEADERS — pastel bg + colored text like KHO */}
                                <tr className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wider">
                                    {/* Sticky 'SIÊU THỊ' merged header (rowSpan=2) — rose style like MÃ KHO */}
                                    {visibleColumns.has('Tên miền') && (
                                        <th
                                            rowSpan={2}
                                            className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-center text-[10px] sm:text-[12px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border-b-[3px] !border-b-rose-400 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 select-none align-middle sticky left-0 z-20 uppercase tracking-wider shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]"
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
                                                    className={`px-1.5 sm:px-2.5 py-1.5 sm:py-2 border-b-[3px] !${getBorderAccentFromColorClass(g.bg)} dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity uppercase tracking-wider text-[10px] sm:text-[12px] font-bold text-center align-middle ${g.bg} ${g.text}`}
                                                >
                                                    {renderHeaderText(headerMapping[g.singleHeader] || g.singleHeader)}
                                                </th>
                                            );
                                        }
                                        /* Multi-column group: normal colSpan header */
                                        return (
                                            <th
                                                key={`group-${idx}`}
                                                colSpan={g.colspan}
                                                className={`px-1.5 sm:px-2.5 py-1.5 sm:py-2 ${g.text} ${g.bg} border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px] sm:text-[12px] font-bold border-r text-center align-middle`}
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
                                                className={`px-1.5 sm:px-2.5 py-1.5 sm:py-2 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity uppercase tracking-wider text-[10px] sm:text-[12px] font-bold text-center align-middle ${g.bg} ${g.text}`}
                                            >
                                                {renderHeaderText(headerMapping[h] || h)}
                                            </th>
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
                                                                px-1.5 sm:px-2.5 py-1 sm:py-1.5 leading-tight
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
                                                                    : h === 'DTQĐ' ? <span className="text-sky-700 dark:text-sky-400">{f.format(roundUp(val))}</span>
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
                                            className={`group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isSel ? '!bg-sky-50/60 dark:!bg-sky-900/20' : ''}`}
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
                                                if (isHtCol) colorCls = val >= 100 ? ' text-emerald-600 dark:text-emerald-400 font-bold' : val >= 85 ? ' text-amber-600 dark:text-amber-400 font-bold' : ' text-rose-600 dark:text-rose-400 font-bold';
                                                if (isHqqd) colorCls = val >= (supermarketTargets[smKey]?.quyDoi ?? 40) ? ' text-emerald-400 font-bold' : ' text-rose-600 dark:text-rose-400 font-bold';
                                                if (h === 'DTQĐ') colorCls = ' text-sky-700 dark:text-sky-400 font-semibold';

                                                return (
                                                    <td
                                                        key={h}
                                                        className={`
                                                            px-1.5 sm:px-2.5 py-1 sm:py-1.5 leading-tight
                                                            tabular-nums align-middle whitespace-nowrap
                                                            ${h === 'Tên miền'
                                                                ? `text-left px-1.5 sm:px-3 font-extrabold text-[11px] sm:text-[13px] text-slate-900 dark:text-slate-100 sticky left-0 z-[5] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-center shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)] ${isSel ? '!bg-sky-50/60 dark:!bg-sky-900/20' : ''}`
                                                                : `text-center text-[11px] sm:text-[13px] ${colorCls || ''}`}
                                                        `}
                                                    >
                                                        {cell?.isMerged ? (
                                                            <div className="flex flex-col items-center leading-tight justify-center">
                                                                <span className={h === 'DT Dự Kiến' || h === 'DT Dự Kiến (QĐ)' ? 'text-sky-700 dark:text-sky-400 font-extrabold' : ''}>{cell.type === 'percent' ? roundUp(val) + '%' : f.format(roundUp(val))}</span>
                                                                <span className={`text-[8px] font-black ${
                                                                    parseNumber(cell.growth) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
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
                                                                : h === 'DTQĐ' ? <span className="font-semibold text-sky-700 dark:text-sky-400">{f.format(roundUp(val))}</span>
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
