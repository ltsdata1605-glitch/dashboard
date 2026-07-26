
import React, { useMemo, useEffect, useState, useRef } from 'react';
import Card from '../Card';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { SupermarketCompetitionData, Criterion, shortenName, shortenSupermarketName, parseNumber } from '../../utils/dashboardHelpers';
import CompetitionControlBar from './competition/CompetitionControlBar';
import CompetitionGridView from './competition/CompetitionGridView';
import CompetitionListView from './competition/CompetitionListView';
import { exportElementAsImage } from '../../services/uiService';
import { CogIcon, FilterIcon } from '../Icons';
import { Switch } from './DashboardWidgets';
import { Button } from '../../../../components/shared/ui/Button';
import { onActivateKey } from '../../../../components/shared/ui';
import { EmptyState } from '../../../../components/shared/ui/EmptyState';

// Program đã qua xử lý: thêm htdkVT (chỉ khi !isRealtime) và conLai (luôn có, tính từ actual - target)
export interface ProcessedProgram {
    name: string;
    data: (string | number)[];
    metric: string;
    htdkVT?: number;
    conLai: number | null;
}

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
    const [sortConfig, setSortConfig, isSortConfigLoaded] = useIndexedDBState<{ columnIndex: number | 'conLai' | 'htdkVT' | -1; direction: 'asc' | 'desc' } | null>('global-competition-sort-config', null);
    const [hiddenColumns, setHiddenColumns] = useIndexedDBState<string[]>('global-competition_view_hidden_columns', []);
    const [defaultSortSet, setDefaultSortSet] = useState(false);
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const [isExporting, setIsExporting] = useState(false);
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [isProgramFilterOpen, setIsProgramFilterOpen] = useState(false);
    const [programFilterSearch, setProgramFilterSearch] = useState('');
    const columnSelectorRef = useRef<HTMLDivElement>(null);
    const programFilterRef = useRef<HTMLDivElement>(null);

    // Click outside handler for column selector & program filter
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
            }
            if (programFilterRef.current && !programFilterRef.current.contains(event.target as Node)) {
                setIsProgramFilterOpen(false);
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
    const supermarketData = useMemo(() => {
        if (data[activeSupermarket]) return data[activeSupermarket];
        // Fuzzy fallback: trim-based matching for edge cases
        const trimmedActive = activeSupermarket.trim();
        const matchKey = Object.keys(data).find(k => k.trim() === trimmedActive);
        return matchKey ? data[matchKey] : undefined;
    }, [data, activeSupermarket]);

    const processedSupermarketData = useMemo((): { headers: string[]; programs: ProcessedProgram[] } | undefined => {
        if (!supermarketData || !supermarketData.headers) return undefined;
        let processedHeaders = [...supermarketData.headers];
        let processedPrograms: ProcessedProgram[] = JSON.parse(JSON.stringify(supermarketData.programs)).map((p: SupermarketCompetitionData['programs'][number]) => ({ ...p, conLai: null }));
        if (!isRealtime) {
            const htdkVTIndex = processedHeaders.indexOf('%HTDK V.Trội');
            if (htdkVTIndex !== -1) {
                processedPrograms = processedPrograms.map((program) => ({
                    ...program,
                    htdkVT: parseNumber(program.data[htdkVTIndex])
                }));
            }
        }
        const headersToRemove = isRealtime ? ['Xếp hạng trong miền'] : ['Xếp hạng trong miền', 'Top/Bottom Trong Miền'];
        const headerRenames: Record<string, string> = isRealtime ? { 'DT Realtime': 'Realtime', 'DT Realtime (QĐ)': 'Realtime (QĐ)', 'SL Realtime': 'Realtime', 'Target Ngày': 'Target', '% HT Target Ngày': '%HT', '%HT Target V.Trội': '%HT V.Trội' } : { 'DTLK': 'L.Kế', 'DTQĐ': 'L.Kế (QĐ)', 'SLLK': 'L.Kế', 'Target': 'Target', '% HT Target Tháng': '%HT', '% HT Dự Kiến': '%HTDK', 'Target V.Trội': 'Target V.Trội', '%HT Target V.Trội': '%HT V.Trội', '%HTDK V.Trội': '%HTDK V.Trội' };
        const indicesToRemove: number[] = [];
        processedHeaders = processedHeaders.map((header, index) => { if (headersToRemove.includes(header)) indicesToRemove.push(index); return headerRenames[header] || header; }).filter((_, index) => !indicesToRemove.includes(index));
        processedPrograms = processedPrograms.map((program) => ({ ...program, data: program.data.filter((_, index) => !indicesToRemove.includes(index)) }));
        processedPrograms = processedPrograms.map((program) => {
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
        if (isSortConfigLoaded && processedSupermarketData && processedSupermarketData.headers && !defaultSortSet) {
            if (sortConfig === null) {
                const sortHeader = isRealtime ? 'Realtime' : 'L.Kế';
                const sortIndex = processedSupermarketData.headers.indexOf(sortHeader);
                if (sortIndex !== -1) {
                    setSortConfig({ columnIndex: sortIndex, direction: 'desc' });
                }
            }
            setDefaultSortSet(true);
        }
    }, [processedSupermarketData, defaultSortSet, isRealtime, setSortConfig, sortConfig, isSortConfigLoaded]);
    
    useEffect(() => { setDefaultSortSet(false); }, [activeSupermarket, isRealtime]);

    const sortedPrograms = useMemo(() => {
        if (!processedSupermarketData?.programs) return [];
        const currentProgramNames = processedSupermarketData.programs.map((p) => p.name);
        const validSelected = selectedPrograms.filter(p => currentProgramNames.includes(p));
        const selectedSet = new Set(validSelected);
        const visible = processedSupermarketData.programs.filter((p) => selectedSet.size === 0 || selectedSet.has(p.name));
        if (sortConfig === null) return visible;
        return [...visible].sort((a, b) => {
            let aValue: string | number, bValue: string | number;
            if (sortConfig.columnIndex === 'conLai') { aValue = a.conLai ?? -Infinity; bValue = b.conLai ?? -Infinity; }
            else if (sortConfig.columnIndex === 'htdkVT') { aValue = a.htdkVT ?? -Infinity; bValue = b.htdkVT ?? -Infinity; }
            else if (sortConfig.columnIndex === -1) { aValue = shortenName(a.name, nameOverrides); bValue = shortenName(b.name, nameOverrides); }
            else { if (a.data.length <= sortConfig.columnIndex || b.data.length <= sortConfig.columnIndex) return 0; aValue = parseNumber(a.data[sortConfig.columnIndex]); bValue = parseNumber(b.data[sortConfig.columnIndex]); }
            if (typeof aValue === 'string' && typeof bValue === 'string') return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            return sortConfig.direction === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
        });
    }, [processedSupermarketData, selectedPrograms, sortConfig, nameOverrides]);

    const groupedAndSortedPrograms = useMemo(() => {
        return sortedPrograms.reduce((acc, program) => {
            const metric = program.metric as Criterion;
            if (!acc[metric]) acc[metric] = [];
            acc[metric]!.push(program);
            return acc;
        }, {} as Partial<Record<Criterion, ProcessedProgram[]>>);
    }, [sortedPrograms]);

    return (
        <div ref={ref} className="rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 mt-4 relative">
            {/* Portal view mode controls into DashboardHeader action bar */}
            <CompetitionControlBar 
                viewMode={viewMode} 
                setViewMode={setViewMode} 
            />
            {/* Title bar — phẳng, không lặp tên siêu thị (đã hiển thị ở ô chọn trong DashboardHeader) */}
            <div className="py-2.5 px-4 mx-4 mt-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 relative z-50">
                <h3 className="text-[11px] sm:text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Chương trình thi đua
                </h3>
                {/* Filter + Column settings — in title bar */}
                <div className="hide-on-export flex items-center gap-1">
                    {/* Program filter */}
                    <div className="relative" ref={programFilterRef}>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsProgramFilterOpen(p => !p)}
                            className={`h-7 w-7 relative ${isProgramFilterOpen ? 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            title="Lọc chương trình thi đua"
                        >
                            <FilterIcon className="h-4 w-4" />
                            {(() => {
                                const currentProgramNames = processedSupermarketData?.programs?.map((p) => p.name) || [];
                                const validSelected = selectedPrograms.filter(p => currentProgramNames.includes(p));
                                const isFiltered = validSelected.length > 0 && validSelected.length < allProgramNames.length;
                                return isFiltered ? <span className="absolute -top-0.5 -right-0.5 bg-amber-400 text-slate-900 text-[7px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">{validSelected.length}</span> : null;
                            })()}
                        </Button>
                        {isProgramFilterOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[100] p-3 flex flex-col max-h-96 text-left">
                                <div className="mb-2">
                                    <input
                                        type="text"
                                        value={programFilterSearch}
                                        onChange={(e) => setProgramFilterSearch(e.target.value)}
                                        placeholder="Tìm kiếm chương trình..."
                                        className="w-full px-3 py-1.5 text-xs border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500 dark:text-slate-200"
                                    />
                                </div>
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <Button variant="ghost" onClick={() => setSelectedPrograms(allProgramNames)} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit text-[10px] font-bold text-sky-600 hover:underline uppercase tracking-wider">Chọn tất cả</Button>
                                    <Button variant="ghost" onClick={() => setSelectedPrograms([])} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit text-[10px] font-bold text-slate-400 hover:underline uppercase tracking-wider">Bỏ chọn</Button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-0.5 max-h-60">
                                    {allProgramNames.filter(name => !programFilterSearch || name.toLowerCase().includes(programFilterSearch.toLowerCase())).map(name => (
                                        <div key={name} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <span role="button" tabIndex={0} className={`text-xs flex-1 mr-3 cursor-pointer select-none ${selectedPrograms.includes(name) ? 'font-bold text-sky-600 dark:text-sky-400' : 'text-slate-700 dark:text-slate-200'}`} onClick={() => setSelectedPrograms(prev => { const s = new Set(prev); if (s.has(name)) s.delete(name); else s.add(name); return Array.from(s); })} onKeyDown={onActivateKey(() => setSelectedPrograms(prev => { const s = new Set(prev); if (s.has(name)) s.delete(name); else s.add(name); return Array.from(s); }))}>
                                                {shortenName(name)}
                                            </span>
                                            <Switch 
                                                checked={selectedPrograms.includes(name)} 
                                                onChange={() => setSelectedPrograms(prev => { const s = new Set(prev); if (s.has(name)) s.delete(name); else s.add(name); return Array.from(s); })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Column selector */}
                    <div className="relative" ref={columnSelectorRef}>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsColumnSelectorOpen(p => !p)}
                            className={`h-7 w-7 ${isColumnSelectorOpen ? 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            title="Cột hiển thị"
                        >
                            <CogIcon className="h-4 w-4" />
                        </Button>
                        {isColumnSelectorOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-[100] max-h-[400px] overflow-y-auto text-left">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Cột hiển thị</p>
                                <div className="grid gap-0.5">
                                    {(processedSupermarketData?.headers || []).map(header => (
                                        <div key={header} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
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
            </div>
            {/* Scrollable table content */}
            <div className="overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className={`px-4 pb-4 pt-4 ${viewMode === 'list' ? 'min-w-fit' : ''}`}>
                <div className="p-0">
                    {processedSupermarketData && sortedPrograms.length > 0 ? (
                        viewMode === 'grid' ? <CompetitionGridView groupedAndSortedPrograms={groupedAndSortedPrograms} headers={processedSupermarketData.headers} hiddenColumns={hiddenColumns} isRealtime={isRealtime} /> 
                        : <CompetitionListView groupedAndSortedPrograms={groupedAndSortedPrograms} headers={processedSupermarketData.headers} hiddenColumns={hiddenColumns} isRealtime={isRealtime} handleSort={handleSort} />
                    ) : (
                        <EmptyState
                            title={!supermarketData ? `Chưa có dữ liệu thi đua cho "${activeSupermarket}"` : 'Không có chương trình thi đua nào được chọn'}
                            description={!supermarketData ? 'Vui lòng cập nhật dữ liệu.' : undefined}
                        />
                    )}
                </div>
                </div>
            </div>
        </div>
    );
});

export default CompetitionView;
