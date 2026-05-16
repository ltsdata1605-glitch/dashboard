
import React, { useMemo, useEffect, useState, useRef } from 'react';
import Card from '../Card';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { SupermarketCompetitionData, Criterion, shortenName, shortenSupermarketName, parseNumber } from '../../utils/dashboardHelpers';
import CompetitionControlBar from './competition/CompetitionControlBar';
import CompetitionGridView from './competition/CompetitionGridView';
import CompetitionListView from './competition/CompetitionListView';
import { exportElementAsImage } from '../../../services/uiService';
import { CogIcon } from '../Icons';
import { Switch } from './DashboardWidgets';

interface CompetitionViewProps {
    data: Record<string, SupermarketCompetitionData>;
    isRealtime: boolean;
    activeSupermarket: string;
    setActiveSupermarket: (sm: string) => void;
    onBatchExport: () => void; 
    isBatchExporting: boolean; 
    updateTimestamp?: string | null;
    onExport?: () => Promise<void>;
}

const CompetitionView = React.forwardRef<HTMLDivElement, CompetitionViewProps>((props, ref) => {
    const { data, isRealtime, activeSupermarket, updateTimestamp, onExport } = props;
    
    const [viewMode, setViewMode] = useIndexedDBState<'grid' | 'list'>('competition_view_mode', 'list');
    const [selectedPrograms, setSelectedPrograms] = useIndexedDBState<string[]>('global-selected-competitions', []);
    const [sortConfig, setSortConfig] = useIndexedDBState<{ columnIndex: number | 'conLai' | 'htdkVT' | -1; direction: 'asc' | 'desc' } | null>(`competition-sort-config-${isRealtime ? 'rt' : 'lk'}`, null);
    const [hiddenColumns, setHiddenColumns] = useIndexedDBState<string[]>(`competition_view_hidden_columns_${isRealtime ? 'rt' : 'lk'}`, []);
    const [defaultSortSet, setDefaultSortSet] = useState(false);
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const [isExporting, setIsExporting] = useState(false);
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);
    const columnSelectorRef = useRef<HTMLDivElement>(null);

    // Click outside handler for column selector
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleSort = (columnIndex: number | 'conLai' | 'htdkVT' | -1) => {
        setSortConfig(current => {
            if (current && current.columnIndex === columnIndex) {
                return { columnIndex, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { columnIndex, direction: 'desc' };
        });
    };

    const allProgramNames = useMemo(() => {
        const names = new Set<string>();
        (Object.values(data) as SupermarketCompetitionData[]).forEach(supermarket => {
            if (supermarket && supermarket.programs) {
                supermarket.programs.forEach(program => names.add(program.name));
            }
        });
        return Array.from(names).sort();
    }, [data]);
    const supermarketData = data[activeSupermarket];

    const processedSupermarketData = useMemo(() => {
        if (!supermarketData || !supermarketData.headers) return undefined;
        let processedHeaders = [...supermarketData.headers];
        let processedPrograms = JSON.parse(JSON.stringify(supermarketData.programs));
        if (!isRealtime) {
            const htdkVTIndex = processedHeaders.indexOf('%HTDK V.Trội');
            if (htdkVTIndex !== -1) {
                processedPrograms = processedPrograms.map((program: any) => ({
                    ...program,
                    htdkVT: parseNumber(program.data[htdkVTIndex])
                }));
            }
        }
        const headersToRemove = isRealtime ? ['Xếp hạng trong miền'] : ['Xếp hạng trong miền', 'Top/Bottom Trong Miền'];
        const headerRenames: Record<string, string> = isRealtime ? { 'DT Realtime': 'Realtime', 'DT Realtime (QĐ)': 'Realtime (QĐ)', 'SL Realtime': 'Realtime', 'Target Ngày': 'Target', '% HT Target Ngày': '%HT', '%HT Target V.Trội': '%HT V.Trội' } : { 'DTLK': 'L.Kế', 'DTQĐ': 'L.Kế (QĐ)', 'SLLK': 'L.Kế', 'Target': 'Target', '% HT Target Tháng': '%HT', '% HT Dự Kiến': '%HTDK', 'Target V.Trội': 'Target V.Trội', '%HT Target V.Trội': '%HT V.Trội', '%HTDK V.Trội': '%HTDK V.Trội' };
        const indicesToRemove: number[] = [];
        processedHeaders = processedHeaders.map((header, index) => { if (headersToRemove.includes(header)) indicesToRemove.push(index); return headerRenames[header] || header; }).filter((_, index) => !indicesToRemove.includes(index));
        processedPrograms = processedPrograms.map((program: { data: any[]; }) => ({ ...program, data: program.data.filter((_, index) => !indicesToRemove.includes(index)) }));
        processedPrograms = processedPrograms.map((program: { data: (string | number)[], name: string }) => {
            let conLaiValue: number | null = null;
            let actualIndex = isRealtime ? processedHeaders.findIndex(h => h.startsWith('Realtime')) : processedHeaders.findIndex(h => h.startsWith('L.Kế'));
            let targetIndex = processedHeaders.indexOf('Target');
            if(actualIndex !== -1 && targetIndex !== -1) {
                const actual = parseNumber(program.data[actualIndex]);
                const target = parseNumber(program.data[targetIndex]);
                conLaiValue = actual - target;
            }
            return { ...program, conLai: conLaiValue };
        });
        if (processedHeaders.length > 0 && !processedHeaders.includes('Còn Lại')) processedHeaders.push('Còn Lại');
        return { headers: processedHeaders, programs: processedPrograms };
    }, [supermarketData, isRealtime]);

    useEffect(() => {
        if (processedSupermarketData && processedSupermarketData.headers && !defaultSortSet) {
            const sortHeader = isRealtime ? '%HT V.Trội' : '%HTDK V.Trội';
            const sortIndex = processedSupermarketData.headers.indexOf(sortHeader);
            if (sortIndex !== -1) {
                setSortConfig({ columnIndex: sortIndex, direction: 'desc' });
                setDefaultSortSet(true);
            }
        }
    }, [processedSupermarketData, defaultSortSet, isRealtime, setSortConfig]);
    
    useEffect(() => { setDefaultSortSet(false); }, [activeSupermarket, isRealtime]);

    const sortedPrograms = useMemo(() => {
        if (!processedSupermarketData?.programs) return [];
        const selectedSet = new Set(selectedPrograms);
        const visible = processedSupermarketData.programs.filter((p: any) => selectedSet.size === 0 || selectedSet.has(p.name));
        if (sortConfig === null) return visible;
        return [...visible].sort((a: any, b: any) => {
            let aValue, bValue;
            if (sortConfig.columnIndex === 'conLai') { aValue = a.conLai ?? -Infinity; bValue = b.conLai ?? -Infinity; }
            else if (sortConfig.columnIndex === 'htdkVT') { aValue = a.htdkVT ?? -Infinity; bValue = b.htdkVT ?? -Infinity; }
            else if (sortConfig.columnIndex === -1) { aValue = shortenName(a.name, nameOverrides); bValue = shortenName(b.name, nameOverrides); }
            else { if (a.data.length <= sortConfig.columnIndex || b.data.length <= sortConfig.columnIndex) return 0; aValue = parseNumber(a.data[sortConfig.columnIndex]); bValue = parseNumber(b.data[sortConfig.columnIndex]); }
            if (typeof aValue === 'string' && typeof bValue === 'string') return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            return sortConfig.direction === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
        });
    }, [processedSupermarketData, selectedPrograms, sortConfig, nameOverrides]);

    const groupedAndSortedPrograms = useMemo(() => {
        return sortedPrograms.reduce((acc: any, program: any) => {
            const metric = program.metric as Criterion;
            if (!acc[metric]) acc[metric] = [];
            acc[metric].push(program);
            return acc;
        }, {} as Partial<Record<Criterion, any[]>>);
    }, [sortedPrograms]);

    const handleExport = async () => {
        if (exportRef.current) {
            setIsExporting(true);
            const title = `${isRealtime ? 'REALTIME THI ĐUA' : 'LUỸ KẾ THI ĐUA'} - ${activeSupermarket === 'Tổng' ? 'TỔNG QUAN' : shortenSupermarketName(activeSupermarket).toUpperCase()}`;
            const safeTabName = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');
            await exportElementAsImage(exportRef.current, `${safeTabName}.png`, {
                elementsToHide: ['.hide-on-export'],
                isCompactTable: true,
                fitAllColumns: true
            });
            setIsExporting(false);
        }
    };

    return (
        <div ref={exportRef} className="rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 mt-4 relative">
            {/* Portal competition controls into DashboardHeader action bar */}
            <CompetitionControlBar 
                viewMode={viewMode} 
                setViewMode={setViewMode} 
                selectedPrograms={selectedPrograms} 
                setSelectedPrograms={setSelectedPrograms} 
                allProgramNames={allProgramNames} 
            />
            <div className="overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className={`p-4 ${viewMode === 'list' ? 'min-w-fit' : ''}`}>
                    <div className="py-3 px-4 flex justify-center items-center bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 shadow-lg relative mb-4">
                    <h3 className="text-lg sm:text-2xl font-black uppercase text-white leading-normal drop-shadow-sm tracking-tight text-center">
                        {activeSupermarket === 'Tổng' ? 'TỔNG QUAN' : activeSupermarket.toUpperCase()} - THI ĐUA {updateTimestamp ? `ĐẾN ${updateTimestamp.split(' ')[0]}` : ''}
                    </h3>
                    {/* Column settings — in title bar */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hide-on-export" ref={columnSelectorRef}>
                        <button
                            onClick={() => setIsColumnSelectorOpen(p => !p)}
                            className={`p-1.5 rounded transition-colors ${isColumnSelectorOpen ? 'bg-white/30 text-white' : 'text-white/60 hover:text-white hover:bg-white/20'}`}
                            title="Cột hiển thị"
                        >
                            <CogIcon className="h-4 w-4" />
                        </button>
                        {isColumnSelectorOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-[100] max-h-[400px] overflow-y-auto text-left">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Cột hiển thị</p>
                                <div className="grid gap-0.5">
                                    {(processedSupermarketData?.headers || []).map(header => (
                                        <div key={header} className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <label
                                                className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-grow cursor-pointer select-none"
                                                onClick={() => setHiddenColumns((prev: string[]) => { const s = new Set(prev); if (s.has(header)) s.delete(header); else s.add(header); return Array.from(s); })}
                                            >
                                                {header}
                                            </label>
                                            <Switch 
                                                checked={!hiddenColumns.includes(header)} 
                                                onChange={() => setHiddenColumns((prev: string[]) => { const s = new Set(prev); if (s.has(header)) s.delete(header); else s.add(header); return Array.from(s); })} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-0">
                    {processedSupermarketData && sortedPrograms.length > 0 ? (
                        viewMode === 'grid' ? <CompetitionGridView groupedAndSortedPrograms={groupedAndSortedPrograms} headers={processedSupermarketData.headers} hiddenColumns={hiddenColumns} isRealtime={isRealtime} /> 
                        : <CompetitionListView groupedAndSortedPrograms={groupedAndSortedPrograms} headers={processedSupermarketData.headers} hiddenColumns={hiddenColumns} isRealtime={isRealtime} handleSort={handleSort} />
                    ) : <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/40 border-2 border-dashed border-slate-200 dark:border-slate-800"><p className="text-sm font-medium text-slate-400">Không có chương trình thi đua nào được chọn.</p></div>}
                </div>
                </div>
            </div>
        </div>
    );
});

export default CompetitionView;
