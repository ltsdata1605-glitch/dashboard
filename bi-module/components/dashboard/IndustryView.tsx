
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { FilterIcon, CogIcon } from '../Icons';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { parseIndustryRealtimeData, parseIndustryLuyKeData, parseNumber, roundUp, shortenSupermarketName } from '../../utils/dashboardHelpers';
import { Switch, ProgressBar } from './DashboardWidgets';

interface IndustryViewProps {
    realtimeData: ReturnType<typeof parseIndustryRealtimeData>;
    luykeData: ReturnType<typeof parseIndustryLuyKeData>;
    isRealtime: boolean;
    activeSupermarket: string | null;
}

const IndustryView = React.forwardRef<HTMLDivElement, IndustryViewProps>((props, ref) => {
    const { realtimeData, luykeData, isRealtime, activeSupermarket } = props;
    
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

    const handleDrop = (e: React.DragEvent) => {
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

    const isMobile = window.innerWidth < 768;

    return (
        <div className="js-industry-view-container relative z-10">
            <Card ref={ref} title={<div className="flex flex-col items-center justify-center w-full"><span className="text-xl font-black uppercase text-primary-700 dark:text-primary-400 text-center leading-none tracking-tight">{title}</span></div>} actionButton={actionButton} rounded={false} noPadding>
                <div className="overflow-hidden">
                    <div className="overflow-x-auto scrollbar-hide">
                        {isMobile ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {processedTable.rows.map((row, rIdx) => {
                                    const isTotalRow = row[0] === 'Tổng';
                                    if (isTotalRow) {
                                        return (
                                            <div key={rIdx} className="bg-sky-600 dark:bg-sky-700 text-white px-4 py-3 flex justify-between items-center font-black uppercase tracking-wider text-xs">
                                                <span>TỔNG CỘNG</span>
                                                <div className="flex flex-col items-end">
                                                    <span>{new Intl.NumberFormat('vi-VN').format(roundUp(parseNumber(row[processedTable.headers.indexOf(isRealtime ? 'DT Realtime (QĐ)' : 'DTQĐ')])))} Tr</span>
                                                    <span className="text-[10px] opacity-80">{roundUp(parseNumber(row[processedTable.headers.indexOf(isRealtime ? '% HT Target Ngày (QĐ)' : '% HT Target (QĐ)')]))}% HT</span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={rIdx} className="p-4 flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{String(row[0]).replace('NNH ', '').toUpperCase()}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${parseNumber(row[processedTable.headers.indexOf(isRealtime ? '% HT Target Ngày (QĐ)' : '% HT Target (QĐ)')]) >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        {roundUp(parseNumber(row[processedTable.headers.indexOf(isRealtime ? '% HT Target Ngày (QĐ)' : '% HT Target (QĐ)')]))}% HT
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-2">
                                                {orderedHeaders.slice(1, 7).map(h => {
                                                    if (!visibleColumns.has(h)) return null;
                                                    const oIdx = processedTable.headers.indexOf(h);
                                                    const cell = row[oIdx];
                                                    const val = parseNumber(cell);
                                                    const isPercent = h.includes('%') || h === 'Tỷ Trọng Trả Góp';
                                                    
                                                    return (
                                                        <div key={h} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1" dangerouslySetInnerHTML={{ __html: headerMapping[h]?.replace(/<br\/>/g, ' ') || h }}></p>
                                                            <p className={`text-xs font-black tabular-nums ${h.includes('QĐ') ? 'text-sky-600' : ''}`}>
                                                                {val === 0 ? '-' : (isPercent ? roundUp(val)+'%' : new Intl.NumberFormat('vi-VN').format(roundUp(val)))}
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
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        {orderedHeaders.map((h, i) => visibleColumns.has(h) ? (
                                            <th 
                                                key={h} 
                                                scope="col" 
                                                draggable="true"
                                                onDragStart={(e) => handleDragStart(e, h)}
                                                onDragOver={(e) => handleDragOver(e, h)}
                                                onDrop={handleDrop}
                                                onDragEnd={() => setDraggedColumn(null)}
                                                className={`px-1 py-3 text-[10px] font-bold text-white uppercase bg-sky-600 dark:bg-sky-700 tracking-tighter border-r border-sky-500/50 dark:border-sky-600 last:border-r-0 text-center align-middle whitespace-nowrap cursor-move hover:bg-sky-700 dark:hover:bg-sky-800 ${h === 'Nhóm ngành hàng' ? 'min-w-[100px]' : 'min-w-[55px]'} ${draggedColumn === h ? 'opacity-40' : ''}`} 
                                                dangerouslySetInnerHTML={{ __html: headerMapping[h] || h }}
                                            >
                                            </th>
                                        ) : null)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {processedTable.rows.map((row, rIdx) => {
                                        const isTotalRow = row[0] === 'Tổng';
                                        return (
                                            <tr key={rIdx} className={isTotalRow ? 'bg-sky-600 dark:bg-sky-700 text-white' : 'bg-white dark:bg-slate-800'}>
                                                {orderedHeaders.map((headerName, displayIndex) => {
                                                    if (!visibleColumns.has(headerName)) return null;

                                                    const originalCellIndex = processedTable.headers.indexOf(headerName);
                                                    const cell = row[originalCellIndex];
                                                    const numericValue = parseNumber(cell);
                                                    const isPercentCol = headerName.includes('%') || headerName === 'Tỷ Trọng Trả Góp' || headerName === 'DT Trả Gộp' || headerName === 'DT TRẢ GÓP' || headerName === 'DT Trả Góp' || headerName === 'DTTRẢGÓP';
                                                    const isNumericCol = !isNaN(numericValue) && !String(cell).includes('%') && originalCellIndex > 0;
                                                    const isQdCkCol = headerName === '+/- DTCK Tháng (QĐ)';

                                                    const cellContent = () => {
                                                        if (headerName === 'Nhóm ngành hàng') return String(cell).replace('NNH ', '').toUpperCase();
                                                        if ((isPercentCol || isNumericCol) && numericValue === 0) return '-';
                                                        if (isPercentCol) return `${roundUp(numericValue)}%`;
                                                        if (isNumericCol) return new Intl.NumberFormat('vi-VN').format(roundUp(numericValue));
                                                        return cell;
                                                    };

                                                    let cellClasses = `px-1 py-2.5 whitespace-nowrap text-[10px] border-r border-slate-100 dark:border-slate-700 last:border-r-0 tabular-nums ${originalCellIndex > 0 ? 'text-center' : 'text-left'}`;
                                                    
                                                    if (isTotalRow) {
                                                        cellClasses += ' text-white font-bold border-sky-500/50';
                                                    } else {
                                                        cellClasses += originalCellIndex === 0 ? ' font-medium' : ' font-normal';

                                                        if (isPercentCol && !isNaN(numericValue)) {
                                                            if (numericValue >= 100) cellClasses += ' text-green-600 font-bold';
                                                            else if (numericValue >= 85) cellClasses += ' text-yellow-600';
                                                            else if (numericValue > 0) cellClasses += ' text-red-600';
                                                        } else if (isQdCkCol && !isNaN(numericValue)) {
                                                            if (numericValue > 20) cellClasses += ' text-green-600 font-bold';
                                                            else if (numericValue < 0) cellClasses += ' text-red-600 font-bold';
                                                            else cellClasses += ' text-slate-700 dark:text-slate-200';
                                                        } else if (headerName === 'DT Realtime (QĐ)' || headerName === 'DTQĐ') {
                                                            cellClasses += ' text-primary-600 dark:text-primary-400 font-bold';
                                                        } else {
                                                            cellClasses += ' text-slate-700 dark:text-slate-200';
                                                        }
                                                    }
                                                    return <td key={headerName} className={`${cellClasses} ${draggedColumn === headerName ? 'bg-slate-50 dark:bg-slate-800' : ''}`}>{cellContent()}</td>;
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
});

export default IndustryView;
