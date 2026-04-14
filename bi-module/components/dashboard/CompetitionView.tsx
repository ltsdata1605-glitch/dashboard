
import React, { useMemo, useEffect, useState } from 'react';
import Card from '../Card';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { SupermarketCompetitionData, Criterion, shortenName, shortenSupermarketName, parseNumber } from '../../utils/dashboardHelpers';
import CompetitionControlBar from './competition/CompetitionControlBar';
import CompetitionGridView from './competition/CompetitionGridView';
import CompetitionListView from './competition/CompetitionListView';

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
    const [programFilterSearch, setProgramFilterSearch] = useState('');
    const [selectedPrograms, setSelectedPrograms] = useIndexedDBState<string[]>('global-selected-competitions', []);
    const [sortConfig, setSortConfig] = useIndexedDBState<{ columnIndex: number | 'conLai' | 'htdkVT' | -1; direction: 'asc' | 'desc' } | null>(`competition-sort-config-${isRealtime ? 'rt' : 'lk'}`, null);
    const [hiddenColumns, setHiddenColumns] = useIndexedDBState<string[]>(`competition_view_hidden_columns_${isRealtime ? 'rt' : 'lk'}`, []);
    const [defaultSortSet, setDefaultSortSet] = useState(false);
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    
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

    const filteredProgramNames = useMemo(() => {
        if (!programFilterSearch) return allProgramNames;
        return allProgramNames.filter(name =>
            name.toLowerCase().includes(programFilterSearch.toLowerCase())
        );
    }, [allProgramNames, programFilterSearch]);
    
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

    const cardTitle = (
        <div className="card-title-text flex flex-col items-center justify-center w-full">
            <span className="text-xl font-black uppercase text-primary-700 dark:text-primary-400 text-center leading-none tracking-tight">
                {isRealtime ? 'REALTIME THI ĐUA' : 'LUỸ KẾ THI ĐUA'} - {activeSupermarket === 'Tổng' ? 'TỔNG QUAN' : shortenSupermarketName(activeSupermarket).toUpperCase()}
            </span>
            {updateTimestamp && (
                <div className="flex items-center justify-center gap-1.5 mt-1.5 no-print bg-slate-50 dark:bg-slate-800/50 px-3 py-0.5 rounded-full border border-slate-100 dark:border-slate-700/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Cập nhật lúc: {updateTimestamp}
                    </span>
                </div>
            )}
        </div>
    );
    
    return (
        <Card title={cardTitle} actionButton={<CompetitionControlBar viewMode={viewMode} setViewMode={setViewMode} programFilterSearch={programFilterSearch} setProgramFilterSearch={setProgramFilterSearch} selectedPrograms={selectedPrograms} setSelectedPrograms={setSelectedPrograms} allProgramNames={allProgramNames} filteredProgramNames={filteredProgramNames} hiddenColumns={hiddenColumns} setHiddenColumns={setHiddenColumns} headers={processedSupermarketData?.headers || []} onExport={onExport} />} ref={ref} rounded={false}>
            <div className="mt-4">
                {processedSupermarketData && sortedPrograms.length > 0 ? (
                    viewMode === 'grid' ? <CompetitionGridView groupedAndSortedPrograms={groupedAndSortedPrograms} headers={processedSupermarketData.headers} hiddenColumns={hiddenColumns} isRealtime={isRealtime} /> 
                    : <CompetitionListView groupedAndSortedPrograms={groupedAndSortedPrograms} headers={processedSupermarketData.headers} hiddenColumns={hiddenColumns} isRealtime={isRealtime} handleSort={handleSort} />
                ) : <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800"><p className="text-sm font-medium text-slate-400">Không có chương trình thi đua nào được chọn.</p></div>}
            </div>
        </Card>
    );
});

export default CompetitionView;
