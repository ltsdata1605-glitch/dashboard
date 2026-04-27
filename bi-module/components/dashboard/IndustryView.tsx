import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { FilterIcon, CogIcon } from '../Icons';
import { parseIndustryRealtimeData, parseIndustryLuyKeData, parseNumber, roundUp } from '../../utils/dashboardHelpers';
import { Switch } from './DashboardWidgets';
import { useIndustryViewLogic } from '../../hooks/useIndustryViewLogic';

interface IndustryViewProps {
    realtimeData: ReturnType<typeof parseIndustryRealtimeData>;
    luykeData: ReturnType<typeof parseIndustryLuyKeData>;
    isRealtime: boolean;
    activeSupermarket: string | null;
    onExport?: () => Promise<void>;
}

// --- COLUMN GROUPS FOR ANALYSIS STYLE ---
const COLUMN_GROUPS: Record<string, { label: string, bg: string, text: string }> = {
    'Nhóm ngành hàng': { label: 'DANH MỤC', bg: 'bg-slate-50', text: 'text-slate-700' },
    'SL Realtime': { label: 'SỐ LƯỢNG', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
    'Số lượng': { label: 'SỐ LƯỢNG', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
    'DT Realtime (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'DTQĐ': { label: 'DOANH THU QĐ', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'Target Ngày (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '% HT Target Ngày (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'Target (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '% HT Target (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '+/- DTCK Tháng (QĐ)': { label: 'DOANH THU QĐ', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'Lãi gộp QĐ': { label: 'LÃI GỘP', bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400' },
    'DT Trả Góp': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'DT Trả Gộp': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'DT TRẢ GÓP': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'DTTRẢGÓP': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'Tỷ Trọng Trả Góp': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'Đơn giá': { label: 'GTĐH', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400' },
    'ĐƠN GIÁ': { label: 'GTĐH', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400' },
};

const IndustryView = React.forwardRef<HTMLDivElement, IndustryViewProps>((props, ref) => {
    const { realtimeData, luykeData, isRealtime, onExport } = props;
    

    const [isIndustryFilterOpen, setIsIndustryFilterOpen] = useState(false);
    const industryFilterRef = useRef<HTMLDivElement>(null);
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const [industryFilterSearch, setIndustryFilterSearch] = useState('');

    const logic = useIndustryViewLogic(realtimeData, luykeData, isRealtime);
    const {
        allIndustries,
        processedTable,
        treeDisplayRows,
        hasTreeData,
        hasAnyExpanded,
        orderedHeaders,
        visibleColumns,
        hiddenIndustries,
        setHiddenIndustries,
        toggleRow,
        expandAll,
        collapseAll,
        toggleColumn
    } = logic;

    const data = isRealtime ? realtimeData : luykeData.table;
    const { headers, rows } = data;

    const headerGroups = useMemo(() => {
        const visH = orderedHeaders.filter(h => visibleColumns.has(h) && h !== 'Nhóm ngành hàng');
        const groups: { label: string, bg: string, text: string, colspan: number, isSticky: boolean, isSingle: boolean, singleHeader: string }[] = [];
        visH.forEach(h => {
            const defaultGroup = { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' };
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

    const headerMapping: Record<string, string> = {
        'Nhóm ngành hàng': 'NGÀNH HÀNG',
        'SL Realtime': 'S.LƯỢNG',
        'DT Realtime (QĐ)': 'T.HIỆN',
        'Target Ngày (QĐ)': 'TARGET',
        '% HT Target Ngày (QĐ)': '%HT',
        'DT Trả Gộp': 'DT',
        'DT TRẢ GÓP': 'DT',
        'DT Trả Góp': 'DT',
        'DTTRẢGÓP': 'DT',
        'Tỷ Trọng Trả Góp': '%TC',
        'Số lượng': 'S.LƯỢNG',
        'DTQĐ': 'L.KẾ',
        'Target (QĐ)': 'TARGET',
        '% HT Target (QĐ)': '%HT',
        '+/- DTCK Tháng (QĐ)': '+/-QĐ CK',
        'Lãi gộp QĐ': 'L.GỘP<br/>QĐ',
        'Đơn giá': 'GTĐH',
        'ĐƠN GIÁ': 'GTĐH',
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
            }
            if (industryFilterRef.current && !industryFilterRef.current.contains(event.target as Node)) {
                setIsIndustryFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const actionButton = (
        <div className="industry-view-controls flex items-center gap-1.5 no-print">
             {onExport && <ExportButton onExportPNG={onExport} />}
             {/* Expand/Collapse buttons for tree mode */}
             {hasTreeData && (
                <div className="flex items-center gap-0.5 mr-1">
                    <button
                        onClick={expandAll}
                        className="p-1 rounded-full text-slate-500 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors"
                        title="Mở rộng tất cả"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                    </button>
                    <button
                        onClick={collapseAll}
                        className={`p-1 rounded-full transition-colors ${hasAnyExpanded ? 'text-slate-500 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-400' : 'text-slate-300 cursor-not-allowed'}`}
                        title="Thu gọn tất cả"
                        disabled={!hasAnyExpanded}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" /></svg>
                    </button>
                </div>
             )}
             <div className="relative" ref={industryFilterRef}>
                <button
                    onClick={() => setIsIndustryFilterOpen(prev => !prev)}
                    className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Lọc ngành hàng"
                >
                    <FilterIcon className="h-4 w-4" />
                </button>
                {isIndustryFilterOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 z-[100] p-2 flex flex-col max-h-96 text-left">
                        <input
                            type="text"
                            value={industryFilterSearch}
                            onChange={(e) => setIndustryFilterSearch(e.target.value)}
                            placeholder="Tìm kiếm ngành hàng..."
                            className="w-full px-3 py-1.5 mb-2 text-xs border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus:border-primary-500 dark:text-slate-200"
                        />
                        <div className="flex-1 overflow-y-auto space-y-1">
                            {allIndustries.filter(n => n.toLowerCase().includes(industryFilterSearch.toLowerCase())).map(industry => (
                                <label key={industry} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!hiddenIndustries.includes(industry)}
                                        onChange={() => setHiddenIndustries(prev => prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry])}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-xs text-slate-700 dark:text-slate-200">{industry.replace('NNH ', '')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
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
                            {orderedHeaders.filter(h => h !== 'Nhóm ngành hàng').map((h) => (
                                <div key={h} className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <label
                                        htmlFor={`col-toggle-ind-${h}`}
                                        className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-grow cursor-pointer select-none"
                                        dangerouslySetInnerHTML={{ __html: headerMapping[h]?.replace(/<br\/>/g, ' ') || h }}
                                    />
                                    <Switch
                                        id={`col-toggle-ind-${h}`}
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
    );

    const title = "CHI TIẾT NGÀNH HÀNG";

    if (!headers || headers.length === 0 || !rows || rows.length === 0) {
        return (
            <Card title={title} rounded={false}>
                <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400 mt-4 font-medium italic">Chưa có dữ liệu cho siêu thị này.</div>
            </Card>
        );
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const htKey = isRealtime ? '% HT Target Ngày (QĐ)' : '% HT Target (QĐ)';
    const dtqdKey = isRealtime ? 'DT Realtime (QĐ)' : 'DTQĐ';

    const getHtColor = (pct: number) => {
        if (pct >= 100) return { bg: 'bg-emerald-500', text: 'text-white', badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' };
        if (pct >= 85) return { bg: 'bg-amber-400', text: 'text-white', badge: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' };
        return { bg: 'bg-red-500', text: 'text-white', badge: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
    };

    // --- Shared cell rendering logic ---
    const renderCell = (cell: any, headerName: string, originalCellIndex: number, isTotalRow: boolean, level: number, rowKey: string, hasChildren: boolean, isExpanded: boolean) => {
        const numericValue = parseNumber(cell);
        const isPercentCol = headerName.includes('%') || headerName === 'Tỷ Trọng Trả Góp' || headerName === 'DT Trả Gộp' || headerName === 'DT TRẢ GÓP' || headerName === 'DT Trả Góp' || headerName === 'DTTRẢGÓP';
        const isNumericCol = !isNaN(numericValue) && !String(cell).includes('%') && originalCellIndex > 0;
        const isQdCkCol = headerName === '+/- DTCK Tháng (QĐ)';
        const isHtCol = headerName.includes('% HT');
        const isDtqdCol = (headerName === 'DT Realtime (QĐ)' || headerName === 'DTQĐ');
        const isGTDHCol = (headerName === 'Đơn giá' || headerName === 'ĐƠN GIÁ');
        const isNNH = level === 0;
        const isNhomHang = level === 1;
        const isHang = level === 2;

        // Formatter cho GTĐH — 1 số lẻ
        const fmtGTDH = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

        const cellContent = () => {
            if (headerName === 'Nhóm ngành hàng') {
                const displayName = isTotalRow ? 'TỔNG CỘNG' 
                    : isNNH ? String(cell).replace('NNH ', '').toUpperCase()
                    : String(cell || '');
                
                const indent = isNhomHang ? 20 : isHang ? 40 : 0;
                
                return (
                    <div className="flex items-center" style={{ paddingLeft: indent }}>
                        {hasChildren && (
                            <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleRow(rowKey); }}
                                onTouchEnd={(e) => { e.preventDefault(); toggleRow(rowKey); }}
                                className="mr-1 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 shrink-0 transition-transform duration-150"
                                style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                            >
                                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                        {!hasChildren && level > 0 && (
                            <span className="mr-1 w-4 h-4 flex items-center justify-center text-slate-300 dark:text-slate-600 shrink-0">
                                <span className="text-[5px]">●</span>
                            </span>
                        )}
                        <span className={
                            isTotalRow ? 'font-extrabold' 
                            : isNNH ? 'font-black' 
                            : isNhomHang ? 'font-semibold' 
                            : 'font-normal'
                        }>
                            {displayName}
                        </span>
                    </div>
                );
            }
            if (isTotalRow && (isPercentCol || isNumericCol)) return isPercentCol ? `${roundUp(numericValue)}%` : isGTDHCol ? fmtGTDH.format(numericValue) : new Intl.NumberFormat('vi-VN').format(roundUp(numericValue));
            if (isHtCol) {
                return (
                    <div className="flex justify-center items-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black inline-block min-w-[45px] text-center ${numericValue >= 100 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : numericValue >= 85 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                            {roundUp(numericValue)}%
                        </span>
                    </div>
                );
            }
            if (isDtqdCol) return <span className="text-indigo-700 dark:text-indigo-400 font-black text-[12px]">{new Intl.NumberFormat('vi-VN').format(roundUp(numericValue))}</span>;
            if (isGTDHCol && isNumericCol) return fmtGTDH.format(numericValue);
            if (isPercentCol && isNumericCol && numericValue === 0) return '-';
            if (isPercentCol) return `${roundUp(numericValue)}%`;
            if (isNumericCol) return new Intl.NumberFormat('vi-VN').format(roundUp(numericValue));
            return cell;
        };

        let cellClasses = `
            px-2 whitespace-nowrap 
            border-r border-b border-slate-200 dark:border-slate-700/80 last:border-r-0 
            tabular-nums align-middle
            ${originalCellIndex > 0 ? 'text-center' : `text-left sticky left-0 z-[5] ${isTotalRow ? 'bg-emerald-50 dark:bg-emerald-900/20' : isNNH ? 'bg-white dark:bg-[#1c1c1e]' : isNhomHang ? 'bg-slate-50/80 dark:bg-slate-800/40' : 'bg-white dark:bg-[#1c1c1e]'}`}
            ${isHang ? 'py-1.5 text-[10px]' : 'py-2.5 text-[11px]'}
        `;
        
        if (isTotalRow) {
            cellClasses += ' text-emerald-800 dark:text-emerald-400 font-black';
        } else if (isHang) {
            cellClasses += originalCellIndex === 0 ? ' text-slate-500 dark:text-slate-400' : ' font-medium text-slate-500 dark:text-slate-400';
            if (isPercentCol && !isNaN(numericValue) && !isHtCol) {
                if (numericValue >= 100) cellClasses += ' !text-emerald-500 dark:!text-emerald-500';
                else if (numericValue >= 85) cellClasses += ' !text-amber-500 dark:!text-amber-500';
                else if (numericValue > 0) cellClasses += ' !text-red-500 dark:!text-red-500';
            }
        } else {
            cellClasses += originalCellIndex === 0 ? ' font-semibold text-slate-700 dark:text-slate-300' : ' font-semibold';

            if (isPercentCol && !isNaN(numericValue) && !isHtCol) {
                if (numericValue >= 100) cellClasses += ' text-emerald-600 dark:text-emerald-400 font-bold';
                else if (numericValue >= 85) cellClasses += ' text-amber-600 dark:text-amber-400 font-bold';
                else if (numericValue > 0) cellClasses += ' text-red-600 dark:text-red-400 font-bold';
                else cellClasses += ' text-slate-700 dark:text-slate-300';
            } else if (isQdCkCol && !isNaN(numericValue)) {
                if (numericValue > 20) cellClasses += ' text-emerald-600 dark:text-emerald-400 font-bold';
                else if (numericValue < 0) cellClasses += ' text-red-600 dark:text-red-400 font-bold';
                else cellClasses += ' text-slate-700 dark:text-slate-300';
            } else if (!isDtqdCol) {
                cellClasses += ' text-slate-700 dark:text-slate-300';
            }
        }

        return <td key={headerName} className={cellClasses}>{cellContent()}</td>;
    };

    return (
        <div className="js-industry-view-container relative z-10">
            <Card ref={ref} title={<div className="flex flex-col items-start w-full"><span className="text-xl font-black uppercase text-primary-700 dark:text-primary-400 leading-none tracking-tight">{title}</span></div>} actionButton={actionButton} rounded={false} noPadding>
                <div className="overflow-hidden">
                    <div className="overflow-x-auto scrollbar-hide -webkit-overflow-scrolling-touch">
                        {isMobile ? (
                            /* ─── MOBILE CARD VIEW ─── */
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {processedTable.rows.map((row, rIdx) => {
                                    const isTotalRow = row[0] === 'Tổng';
                                    const htIdx = processedTable.headers.indexOf(htKey);
                                    const htPct = htIdx !== -1 ? roundUp(parseNumber(row[htIdx])) : 0;
                                    const htColors = getHtColor(htPct);
                                    const dtqdIdx = processedTable.headers.indexOf(dtqdKey);
                                    const dtqdVal = dtqdIdx !== -1 ? roundUp(parseNumber(row[dtqdIdx])) : 0;

                                    if (isTotalRow) {
                                        return (
                                            <div key={rIdx} className="bg-slate-100 dark:bg-slate-800/80 px-4 py-3 flex items-center justify-between border-t-2 border-slate-300 dark:border-slate-600">
                                                <span className="text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider">TỔNG CỘNG</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">DTQĐ</p>
                                                        <p className="text-sm font-black text-primary-600 dark:text-primary-400 tabular-nums">
                                                            {new Intl.NumberFormat('vi-VN').format(dtqdVal)}
                                                        </p>
                                                    </div>
                                                    <span className={`text-xs font-black px-2.5 py-1 rounded-full ${htColors.badge}`}>
                                                        {htPct}%
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={rIdx} className="px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                            {/* Header row: tên + % HT badge */}
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                    {String(row[0]).replace('NNH ', '').toUpperCase()}
                                                </span>
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
                                            
                                            {/* Hero: DTQĐ */}
                                            <div className="flex items-baseline gap-2 mb-2.5">
                                                <span className="text-[1.6rem] font-black text-primary-600 dark:text-primary-400 tabular-nums leading-none">
                                                    {new Intl.NumberFormat('vi-VN').format(dtqdVal)}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400">triệu QĐ</span>
                                            </div>
                                            
                                            {/* Mini grid: các chỉ số khác */}
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {orderedHeaders.filter(h => h !== 'Nhóm ngành hàng' && h !== dtqdKey).slice(0, 6).map(h => {
                                                    if (!visibleColumns.has(h)) return null;
                                                    const oIdx = processedTable.headers.indexOf(h);
                                                    if (oIdx === -1) return null;
                                                    const cell = row[oIdx];
                                                    const val = parseNumber(cell);
                                                    const isPercent = h.includes('%') || h === 'Tỷ Trọng Trả Góp';
                                                    const isHtCol = h === htKey;
                                                    const htC = isHtCol ? getHtColor(val) : null;
                                                    
                                                    return (
                                                        <div key={h} className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-0.5" dangerouslySetInnerHTML={{ __html: headerMapping[h]?.replace(/<br\/>/g, ' ') || h }}></p>
                                                            <p className={`text-[11px] font-black tabular-nums leading-none ${
                                                                htC ? htC.badge.split(' ').filter((c: string) => c.startsWith('text-')).join(' ') : ''
                                                            }`}>
                                                                {val === 0 ? '-' : (isPercent ? roundUp(val) + '%' : new Intl.NumberFormat('vi-VN').format(roundUp(val)))}
                                                            </p>
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
                            <div className="overflow-hidden m-4 mb-6">
                                <table className="w-full border-collapse compact-export-table border border-slate-200 dark:border-slate-700">
                                    <thead>
                                        {/* TIER 1: GROUP HEADERS */}
                                        <tr className="text-[11px] font-bold uppercase tracking-wider">
                                            {/* Sticky 'NGÀNH HÀNG' merged header (rowSpan=2) */}
                                            {visibleColumns.has('Nhóm ngành hàng') && (
                                                <th
                                                    rowSpan={2}
                                                    className={`
                                                        px-4 py-2.5 text-center text-[12px] font-bold
                                                        text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800
                                                        border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600
                                                        border-r border-slate-200 dark:border-slate-700
                                                        sticky left-0 z-20 align-middle
                                                        uppercase tracking-wider min-w-[120px]
                                                    `}
                                                >
                                                    NGÀNH HÀNG
                                                </th>
                                            )}
                                            {headerGroups.map((g, idx) => {
                                                if (g.isSingle) {
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

                                        {/* TIER 2: COLUMN HEADERS */}
                                        <tr>
                                            {orderedHeaders.map(h => {
                                                if (!visibleColumns.has(h)) return null;
                                                if (h === 'Nhóm ngành hàng') return null;
                                                const isSingleGroup = headerGroups.some(g => g.isSingle && g.singleHeader === h);
                                                if (isSingleGroup) return null;
                                                const g = COLUMN_GROUPS[h] || { text: 'text-slate-600 dark:text-slate-300', bg: '' };
                                                return (
                                                    <th
                                                        key={h}
                                                        scope="col"
                                                        className={`
                                                            px-2 py-2.5 text-[10px] font-bold uppercase
                                                            tracking-wider border-r border-slate-200 dark:border-slate-700
                                                            border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600
                                                            text-center align-middle whitespace-nowrap
                                                            hover:opacity-80 transition-opacity select-none
                                                            ${g.bg} ${g.text}
                                                        `}
                                                        dangerouslySetInnerHTML={{ __html: headerMapping[h] || h }}
                                                    />
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {treeDisplayRows ? (
                                            /* ─── TREE TABLE ROWS (luyke mode with hierarchy) ─── */
                                            treeDisplayRows.map((flatRow) => {
                                                const isTotalRow = flatRow.level === -1;
                                                const isNNH = flatRow.level === 0;
                                                const isNhomHang = flatRow.level === 1;
                                                const isHang = flatRow.level === 2;

                                                return (
                                                    <tr 
                                                        key={flatRow.rowKey} 
                                                        className={`
                                                            transition-colors duration-100 group
                                                            ${isTotalRow 
                                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 font-extrabold border-y !border-y-emerald-200 dark:!border-y-emerald-800/50' 
                                                                : isNNH ? 'bg-white dark:bg-[#1c1c1e] hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                                                : isNhomHang ? 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                                                                : 'bg-white dark:bg-[#1c1c1e] hover:bg-slate-50/30 dark:hover:bg-slate-800/10'
                                                            }
                                                        `}
                                                    >
                                                        {orderedHeaders.map((headerName) => {
                                                            if (!visibleColumns.has(headerName)) return null;
                                                            const originalCellIndex = processedTable.headers.indexOf(headerName);
                                                            const cell = flatRow.values[originalCellIndex];
                                                            return renderCell(cell, headerName, originalCellIndex, isTotalRow, flatRow.level, flatRow.rowKey, flatRow.hasChildren, flatRow.isExpanded);
                                                        })}
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            /* ─── FLAT TABLE ROWS (realtime / fallback) ─── */
                                            processedTable.rows.map((row, rIdx) => {
                                                const isTotalRow = row[0] === 'Tổng';
                                                return (
                                                    <tr 
                                                        key={rIdx} 
                                                        className={`
                                                            transition-colors duration-100 group
                                                            ${isTotalRow 
                                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 font-extrabold border-y !border-y-emerald-200 dark:!border-y-emerald-800/50' 
                                                                : 'bg-white dark:bg-[#1c1c1e] hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                                            }
                                                        `}
                                                    >
                                                        {orderedHeaders.map((headerName) => {
                                                            if (!visibleColumns.has(headerName)) return null;
                                                            const originalCellIndex = processedTable.headers.indexOf(headerName);
                                                            const cell = row[originalCellIndex];
                                                            return renderCell(cell, headerName, originalCellIndex, isTotalRow, 0, `flat-${rIdx}`, false, false);
                                                        })}
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
});

export default IndustryView;
