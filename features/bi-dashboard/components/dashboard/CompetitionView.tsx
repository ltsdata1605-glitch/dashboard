
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { SupermarketCompetitionData, Criterion, shortenName, parseNumber } from '../../utils/dashboardHelpers';
import CompetitionControlBar from './competition/CompetitionControlBar';
import CompetitionGridView from './competition/CompetitionGridView';
import CompetitionListView from './competition/CompetitionListView';
import { CogIcon, FilterIcon, ClockIcon, ChartBarIcon } from '../Icons';
import { Switch } from './DashboardWidgets';
import { Button } from '../../../../components/shared/ui/Button';
import { EmptyState } from '../../../../components/shared/ui/EmptyState';
import { MultiSelectDropdown } from '../../../../components/shared/ui/MultiSelectDropdown';
import { getCompetitionHistory, getLocalDateKey, CompetitionHistorySnapshot } from '../../utils/competitionHistory';
import { CompetitionTrendChart } from './competition/CompetitionTrendChart';

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
    const { data, isRealtime, activeSupermarket } = props;

    const [viewMode, setViewMode] = useIndexedDBState<'grid' | 'list'>('competition_view_mode', 'list');
    const [selectedPrograms, setSelectedPrograms] = useIndexedDBState<string[]>('global-selected-competitions', []);
    const [sortConfig, setSortConfig, isSortConfigLoaded] = useIndexedDBState<{ columnIndex: number | 'conLai' | 'htdkVT' | -1; direction: 'asc' | 'desc' } | null>('global-competition-sort-config', null);
    const [hiddenColumns, setHiddenColumns] = useIndexedDBState<string[]>('global-competition_view_hidden_columns', []);
    const [defaultSortSet, setDefaultSortSet] = useState(false);
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [programFilterSearch, setProgramFilterSearch] = useState('');
    const columnSelectorRef = useRef<HTMLDivElement>(null);

    // Lịch sử Thi đua Luỹ kế theo ngày (features/bi-dashboard/utils/competitionHistory.ts) —
    // chỉ áp dụng cho tab Luỹ kế, không có khái niệm "lịch sử Realtime".
    const [historySnapshots, setHistorySnapshots] = useState<CompetitionHistorySnapshot[]>([]);
    const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isTrendOpen, setIsTrendOpen] = useState(false);
    const historyRef = useRef<HTMLDivElement>(null);
    const todayKey = getLocalDateKey();

    useEffect(() => {
        setSelectedHistoryDate(null);
        if (isRealtime) { setHistorySnapshots([]); return; }
        let cancelled = false;
        getCompetitionHistory(activeSupermarket).then(list => {
            if (!cancelled) setHistorySnapshots(list);
        });
        return () => { cancelled = true; };
    }, [activeSupermarket, isRealtime]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
                setIsHistoryOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedSnapshot = selectedHistoryDate ? historySnapshots.find(s => s.date === selectedHistoryDate) : null;

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
    const supermarketData = useMemo(() => {
        // Đang xem lịch sử ngày cũ — ưu tiên snapshot đã lưu thay vì dữ liệu sống.
        if (selectedSnapshot) return selectedSnapshot;
        if (data[activeSupermarket]) return data[activeSupermarket];
        // Fuzzy fallback: trim-based matching for edge cases
        const trimmedActive = activeSupermarket.trim();
        const matchKey = Object.keys(data).find(k => k.trim() === trimmedActive);
        return matchKey ? data[matchKey] : undefined;
    }, [data, activeSupermarket, selectedSnapshot]);

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
        const headersToRemove = isRealtime 
            ? ['Xếp hạng trong miền', 'HẠNG VÙNG', 'TOP/BOTTOM VÙNG', 'Hạng vùng', 'Top/Bottom Vùng'] 
            : ['Xếp hạng trong miền', 'Top/Bottom Trong Miền', 'HẠNG VÙNG', 'TOP/BOTTOM VÙNG', 'Hạng vùng', 'Top/Bottom Vùng'];
        const headerRenames: Record<string, string> = isRealtime ? { 
            'DOANH THU (RT)': 'Realtime',
            'SỐ LƯỢNG (RT)': 'Realtime',
            'DOANH THU': 'Realtime',
            'SỐ LƯỢNG': 'Realtime',
            'TARGET': 'Target',
            '% HT NGÀY': '%HT',
            '% DỰ BÁO': '%HTDK',
            'DT Realtime': 'Realtime', 
            'DT Realtime (QĐ)': 'Realtime (QĐ)', 
            'SL Realtime': 'Realtime', 
            'Target Ngày': 'Target', 
            '% HT Target Ngày': '%HT', 
            '%HT Target V.Trội': '%HT V.Trội' 
        } : { 
            'DOANH THU': 'L.Kế',
            'SỐ LƯỢNG': 'L.Kế',
            'TARGET': 'Target',
            '% HT THÁNG': '%HT',
            '% DỰ BÁO': '%HTDK',
            'DTLK': 'L.Kế', 
            'DTQĐ': 'L.Kế (QĐ)', 
            'SLLK': 'L.Kế', 
            'Target': 'Target', 
            '% HT Target Tháng': '%HT', 
            '% HT Dự Kiến': '%HTDK', 
            'Target V.Trội': 'Target V.Trội', 
            '%HT Target V.Trội': '%HT V.Trội', 
            '%HTDK V.Trội': '%HTDK V.Trội' 
        };
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

    const currentProgramNames = processedSupermarketData?.programs?.map((p) => p.name) || [];
    const validSelectedPrograms = selectedPrograms.filter(p => currentProgramNames.includes(p));
    const isProgramFiltered = validSelectedPrograms.length > 0 && validSelectedPrograms.length < allProgramNames.length;
    const toggleProgram = (name: string) => setSelectedPrograms(prev => {
        const s = new Set(prev);
        if (s.has(name)) s.delete(name); else s.add(name);
        return Array.from(s);
    });
    const toggleAllPrograms = () => setSelectedPrograms(validSelectedPrograms.length === allProgramNames.length ? [] : allProgramNames);
    // Lọc theo tên HIỂN THỊ (đã áp dụng nameOverrides), khớp cách Nhân viên > Thi đua đang làm —
    // trước đây chỗ này bỏ qua nameOverrides dù nameOverrides đã dùng ở nơi khác trong cùng file.
    const programOptions = allProgramNames
        .filter(name => shortenName(name, nameOverrides).toLowerCase().includes(programFilterSearch.toLowerCase()))
        .map(name => ({ key: name, label: shortenName(name, nameOverrides), checked: selectedPrograms.includes(name) }));

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
                    {/* Lịch sử theo ngày — chỉ có ở tab Luỹ kế (features/bi-dashboard/utils/competitionHistory.ts) */}
                    {!isRealtime && (
                        <div className="relative" ref={historyRef}>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsHistoryOpen(p => !p)}
                                className={`h-7 w-7 ${selectedHistoryDate ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                title="Xem lịch sử theo ngày"
                            >
                                <ClockIcon className="h-4 w-4" />
                            </Button>
                            {isHistoryOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-[100] max-h-[360px] overflow-y-auto text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Lịch sử theo ngày</p>
                                    <Button
                                        variant="unstyled" size="none"
                                        onClick={() => { setSelectedHistoryDate(null); setIsHistoryOpen(false); }}
                                        className={`justify-start w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${!selectedHistoryDate ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        Hôm nay (trực tiếp)
                                    </Button>
                                    {historySnapshots.filter(s => s.date !== todayKey).length === 0 && (
                                        <p className="text-[11px] text-slate-400 px-2 py-2">Chưa có ngày trước để xem lại — quay lại vào ngày mai.</p>
                                    )}
                                    {historySnapshots.filter(s => s.date !== todayKey).map(s => {
                                        const [y, m, d] = s.date.split('-');
                                        return (
                                            <Button
                                                key={s.date}
                                                variant="unstyled" size="none"
                                                onClick={() => { setSelectedHistoryDate(s.date); setIsHistoryOpen(false); }}
                                                className={`justify-start w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedHistoryDate === s.date ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                            >
                                                {`${d}/${m}/${y}`}
                                            </Button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Xu hướng theo thời gian — tái dùng chính dữ liệu historySnapshots ở trên,
                        chỉ áp dụng cho tab Luỹ kế (giống nút Lịch sử) */}
                    {!isRealtime && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsTrendOpen(p => !p)}
                            className={`h-7 w-7 ${isTrendOpen ? 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            title="Xem xu hướng theo thời gian"
                        >
                            <ChartBarIcon className="h-4 w-4" />
                        </Button>
                    )}
                    {/* Program filter — dùng chung MultiSelectDropdown (components/shared/ui) để đồng nhất
                        style với các bộ lọc khác trong dự án (VD "Lọc nhóm" ở Tab Nhân viên > Thi đua) */}
                    <MultiSelectDropdown
                        icon={<FilterIcon className="h-4 w-4 text-slate-400" />}
                        triggerLabel="Lọc chương trình"
                        count={isProgramFiltered ? validSelectedPrograms.length : undefined}
                        allLabel="Chọn tất cả"
                        allChecked={validSelectedPrograms.length === allProgramNames.length}
                        onToggleAll={toggleAllPrograms}
                        options={programOptions}
                        onToggleOption={toggleProgram}
                        searchValue={programFilterSearch}
                        onSearchChange={setProgramFilterSearch}
                        searchPlaceholder="Tìm kiếm chương trình..."
                        panelWidthClass="w-80"
                        maxHeightClass="max-h-96"
                    />
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
            {selectedHistoryDate && (() => {
                const [y, m, d] = selectedHistoryDate.split('-');
                return (
                    <div className="mx-4 mt-3 px-4 py-2 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-bold">
                        <ClockIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Đang xem lịch sử ngày {d}/{m}/{y} — không phải dữ liệu trực tiếp.</span>
                        <Button variant="unstyled" size="none" onClick={() => setSelectedHistoryDate(null)} className="ml-auto underline hover:no-underline">Về trực tiếp</Button>
                    </div>
                );
            })()}
            {isTrendOpen && !isRealtime && (
                <div className="mx-4 mt-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <CompetitionTrendChart
                        historySnapshots={historySnapshots}
                        todayData={data[activeSupermarket]}
                        todayKey={todayKey}
                        programNames={validSelectedPrograms.length > 0 ? validSelectedPrograms : allProgramNames.slice(0, 3)}
                    />
                </div>
            )}
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
