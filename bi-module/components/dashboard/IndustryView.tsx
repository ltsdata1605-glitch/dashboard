
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../Card';
import { FilterIcon, CogIcon } from '../Icons';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { parseIndustryRealtimeData, parseIndustryLuyKeData, parseNumber, roundUp, shortenSupermarketName } from '../../utils/dashboardHelpers';
import { Switch } from './DashboardWidgets';

interface IndustryViewProps {
    realtimeData: ReturnType<typeof parseIndustryRealtimeData>;
    luykeData: ReturnType<typeof parseIndustryLuyKeData>;
    isRealtime: boolean;
    activeSupermarket: string | null;
}

// --- COLUMN GROUPS FOR ANALYSIS STYLE ---
const COLUMN_GROUPS: Record<string, { label: string, bg: string, text: string }> = {
    'Nhóm ngành hàng': { label: 'DANH MỤC', bg: 'bg-slate-50', text: 'text-slate-700' },
    'SL Realtime': { label: 'SỐ LƯỢNG', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
    'Số lượng': { label: 'SỐ LƯỢNG', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
    'DT Realtime (QĐ)': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'Target Ngày (QĐ)': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '% HT Target Ngày (QĐ)': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'Target (QĐ)': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '% HT Target (QĐ)': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    '+/- DTCK Tháng (QĐ)': { label: 'DOANH THU', bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    'DT Trả Góp': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'DT Trả Gộp': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'DT TRẢ GÓP': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'DTTRẢGÓP': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'Tỷ Trọng Trả Góp': { label: 'TRẢ CHẬM', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    'Đơn giá': { label: 'GIÁ TRỊ ĐH', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400' },
    'ĐƠN GIÁ': { label: 'GIÁ TRỊ ĐH', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400' },
};

const IndustryView = React.forwardRef<HTMLDivElement, IndustryViewProps>((props, ref) => {
    const { realtimeData, luykeData, isRealtime } = props;
    
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const [userHiddenColumns, setUserHiddenColumns] = useIndexedDBState<string[]>(`hidden-cols-industry-${isRealtime ? 'realtime' : 'luyke'}`, []);

    const [isIndustryFilterOpen, setIsIndustryFilterOpen] = useState(false);
    const industryFilterRef = useRef<HTMLDivElement>(null);
    const [hiddenIndustries, setHiddenIndustries] = useIndexedDBState<string[]>(`hidden-industries-${isRealtime ? 'realtime' : 'luyke'}`, []);
    const [industryFilterSearch, setIndustryFilterSearch] = useState('');

    // --- Logic sắp xếp thứ tự cột ---
    const [columnOrder, setColumnOrder] = useIndexedDBState<string[]>(`industry-col-order-${isRealtime ? 'realtime' : 'luyke'}`, []);
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

    const data = isRealtime ? realtimeData : luykeData.table;
    const { headers, rows } = data;

    const allIndustries = useMemo(() => {
        const sourceRows = isRealtime ? realtimeData.rows : luykeData.table.rows;
        return (sourceRows || [])
            .map(row => row[0])
            .filter(name => name && name !== 'Tổng');
    }, [realtimeData.rows, luykeData.table.rows, isRealtime]);

    const processedTable = useMemo(() => {
        if (!headers || headers.length === 0 || !rows || rows.length === 0) {
            return { headers: [], rows: [] };
        }
        
        let totalRow = rows.find(r => r[0] === 'Tổng');
        let otherRows = rows.filter(r => r[0] !== 'Tổng');

        const hiddenIndustriesSet = new Set(hiddenIndustries);
        otherRows = otherRows.filter(row => 
            row[0] && !hiddenIndustriesSet.has(row[0])
        );

        const htTargetIndex = headers.indexOf(isRealtime ? '% HT Target Ngày (QĐ)' : '% HT Target (QĐ)');
        if (htTargetIndex !== -1) {
            otherRows.sort((a, b) => parseNumber(b[htTargetIndex]) - parseNumber(a[htTargetIndex]));
        }
        
        const finalRows = totalRow ? [...otherRows, totalRow] : otherRows;

        return { headers, rows: finalRows };
    }, [rows, headers, isRealtime, hiddenIndustries]);
    
    // --- Cập nhật danh sách sắp xếp khi có cột mới ---
    useEffect(() => {
        if (processedTable.headers.length > 0) {
            const currentHeaders = processedTable.headers;
            const newOrder = [...columnOrder];
            const filteredOrder = newOrder.filter(h => currentHeaders.includes(h));
            const missingHeaders = currentHeaders.filter(h => !filteredOrder.includes(h));
            
            if (missingHeaders.length > 0 || filteredOrder.length !== newOrder.length) {
                setColumnOrder([...filteredOrder, ...missingHeaders]);
            }
        }
    }, [processedTable.headers, columnOrder, setColumnOrder]);

    const orderedHeaders = useMemo(() => {
        if (columnOrder.length === 0) return processedTable.headers;
        return columnOrder.filter(h => processedTable.headers.includes(h));
    }, [columnOrder, processedTable.headers]);

    const visibleColumns = useMemo(() => {
        const hiddenSet = new Set(userHiddenColumns);
        return new Set(orderedHeaders.filter(h => !hiddenSet.has(h)));
    }, [orderedHeaders, userHiddenColumns]);

    const headerGroups = useMemo(() => {
        const groups: { label: string, bg: string, text: string, colspan: number, isSticky: boolean }[] = [];
        orderedHeaders.filter(h => visibleColumns.has(h)).forEach(h => {
            const defaultGroup = { label: 'KHÁC', bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' };
            const g = COLUMN_GROUPS[h] || defaultGroup;
            const isSticky = h === 'Nhóm ngành hàng';
            if (groups.length > 0 && groups[groups.length - 1].label === g.label && !isSticky && !groups[groups.length - 1].isSticky) {
                groups[groups.length - 1].colspan += 1;
            } else {
                groups.push({ ...g, colspan: 1, isSticky });
            }
        });
        return groups;
    }, [orderedHeaders, visibleColumns]);

    const headerMapping: Record<string, string> = {
        'Nhóm ngành hàng': 'NGÀNH HÀNG',
        'SL Realtime': 'SL',
        'DT Realtime (QĐ)': 'T.HIỆN<br/>QĐ',
        'Target Ngày (QĐ)': 'M.TIÊU<br/>QĐ',
        '% HT Target Ngày (QĐ)': '%HTQĐ',
        'DT Trả Gộp': 'DT T.CHẬM',
        'DT TRẢ GÓP': 'DT T.CHẬM',
        'DT Trả Góp': 'DT T.CHẬM',
        'DTTRẢGÓP': 'DT T.CHẬM',
        'Tỷ Trọng Trả Góp': '%T.CHẬM',
        'Số lượng': 'SL',
        'Target (QĐ)': 'M.TIÊU<br/>QĐ',
        '% HT Target (QĐ)': '%HTQĐ',
        '+/- DTCK Tháng (QĐ)': '+/-QĐ CK',
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

    const toggleColumn = (header: string) => {
        setUserHiddenColumns(prev => {
            const newHidden = new Set(prev);
            if (newHidden.has(header)) newHidden.delete(header);
            else newHidden.add(header);
            return Array.from(newHidden);
        });
    };

    // --- Drag & Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, header: string) => {
        setDraggedColumn(header);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, header: string) => {
        e.preventDefault();
        if (draggedColumn === null || draggedColumn === header) return;

        const newOrder = [...columnOrder];
        const oldIdx = newOrder.indexOf(draggedColumn);
        const newIdx = newOrder.indexOf(header);

        if (oldIdx !== -1 && newIdx !== -1) {
            newOrder.splice(oldIdx, 1);
            newOrder.splice(newIdx, 0, draggedColumn);
            setColumnOrder(newOrder);
        }
    };

    const handleDrop = (_e: React.DragEvent) => {
        setDraggedColumn(null);
    };

    const actionButton = (
        <div className="industry-view-controls flex items-center gap-1.5 no-print">
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
                    className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <CogIcon className="h-4 w-4" />
                </button>
                {isColumnSelectorOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 z-[100] p-2 flex flex-col max-h-80 overflow-y-auto">
                        <div className="grid grid-cols-1 gap-1">
                            {orderedHeaders.map(header => (
                                <div key={header} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <label htmlFor={`col-toggle-ind-${header}`} className="text-xs text-slate-700 dark:text-slate-200 flex-grow cursor-pointer select-none" dangerouslySetInnerHTML={{ __html: headerMapping[header]?.replace(/<br\/>/g, ' ') || header }} />
                                    <Switch
                                        id={`col-toggle-ind-${header}`}
                                        checked={visibleColumns.has(header)}
                                        onChange={() => toggleColumn(header)}
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

    return (
        <div className="js-industry-view-container relative z-10">
            <Card ref={ref} title={<div className="flex flex-col items-center justify-center w-full"><span className="text-xl font-black uppercase text-primary-700 dark:text-primary-400 text-center leading-none tracking-tight">{title}</span></div>} actionButton={actionButton} rounded={false} noPadding>
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
                            <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-sm m-4 mb-6">
                                <table className="w-full border-collapse compact-export-table">
                                    <thead>
                                        {/* TIER 1: GROUP HEADERS */}
                                        <tr>
                                            {headerGroups.map((g, idx) => (
                                                <th
                                                    key={`group-${idx}`}
                                                    colSpan={g.colspan}
                                                    className={`
                                                        py-2 px-2 text-[11px] font-black uppercase tracking-widest text-center border-r border-b border-white dark:border-slate-800
                                                        ${g.bg} ${g.text}
                                                        ${g.isSticky ? 'sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.02)]' : ''}
                                                    `}
                                                >
                                                    {g.label}
                                                </th>
                                            ))}
                                        </tr>

                                        {/* TIER 2: COLUMN HEADERS */}
                                        <tr className="bg-white dark:bg-[#1c1c1e] shadow-sm">
                                            {orderedHeaders.map(h => {
                                                if (!visibleColumns.has(h)) return null;
                                                const g = COLUMN_GROUPS[h] || { text: 'text-slate-600 dark:text-slate-300' };
                                                return (
                                                    <th
                                                        key={h}
                                                        scope="col"
                                                        draggable="true"
                                                        onDragStart={(e) => handleDragStart(e, h)}
                                                        onDragOver={(e) => handleDragOver(e, h)}
                                                        onDrop={handleDrop}
                                                        onDragEnd={() => setDraggedColumn(null)}
                                                        className={`
                                                            px-2 py-3 text-[10px] font-bold uppercase
                                                            tracking-wider border-r border-slate-200 dark:border-slate-700/80
                                                            border-b border-b-slate-300 dark:border-b-slate-600
                                                            text-center align-middle whitespace-nowrap cursor-move
                                                            hover:bg-slate-50 dark:hover:bg-slate-800/50 select-none
                                                            ${g.text}
                                                            ${h === 'Nhóm ngành hàng' ? 'min-w-[120px] text-left sticky left-0 z-10 bg-white dark:bg-[#1c1c1e] shadow-[2px_0_4px_rgba(0,0,0,0.02)]' : 'min-w-[65px]'}
                                                            ${draggedColumn === h ? 'opacity-40' : ''}
                                                        `}
                                                        dangerouslySetInnerHTML={{ __html: headerMapping[h] || h }}
                                                    />
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-[#1c1c1e]">
                                        {processedTable.rows.map((row, rIdx) => {
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
                                                        const numericValue = parseNumber(cell);
                                                        const isPercentCol = headerName.includes('%') || headerName === 'Tỷ Trọng Trả Góp' || headerName === 'DT Trả Gộp' || headerName === 'DT TRẢ GÓP' || headerName === 'DT Trả Góp' || headerName === 'DTTRẢGÓP';
                                                        const isNumericCol = !isNaN(numericValue) && !String(cell).includes('%') && originalCellIndex > 0;
                                                        const isQdCkCol = headerName === '+/- DTCK Tháng (QĐ)';
                                                        const isHtCol = headerName.includes('% HT');
                                                        const isDtqdCol = (headerName === 'DT Realtime (QĐ)' || headerName === 'DTQĐ');
    
                                                        const cellContent = () => {
                                                            if (headerName === 'Nhóm ngành hàng') return isTotalRow ? 'TỔNG CỘNG' : String(cell).replace('NNH ', '').toUpperCase();
                                                            if (isTotalRow && (isPercentCol || isNumericCol)) return isPercentCol ? `${roundUp(numericValue)}%` : new Intl.NumberFormat('vi-VN').format(roundUp(numericValue));
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
                                                            if (isPercentCol && isNumericCol && numericValue === 0) return '-';
                                                            if (isPercentCol) return `${roundUp(numericValue)}%`;
                                                            if (isNumericCol) return new Intl.NumberFormat('vi-VN').format(roundUp(numericValue));
                                                            return cell;
                                                        };
    
                                                        let cellClasses = `
                                                            px-2 py-2.5 whitespace-nowrap text-[11px] 
                                                            border-r border-b border-slate-200 dark:border-slate-700/80 last:border-r-0 
                                                            tabular-nums align-middle
                                                            ${originalCellIndex > 0 ? 'text-center' : `text-left font-bold sticky left-0 z-[5] ${isTotalRow ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-white dark:bg-[#1c1c1e]'}`}
                                                        `;
                                                        
                                                        if (isTotalRow) {
                                                            cellClasses += ' text-emerald-800 dark:text-emerald-400 font-black';
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
                                                        return <td key={headerName} className={`${cellClasses} ${draggedColumn === headerName ? 'bg-slate-50 dark:bg-slate-800' : ''}`}>{cellContent()}</td>;
                                                    })}
                                                </tr>
                                            );
                                        })}
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
