
import React, { useMemo, useEffect, useState, useRef } from 'react';
import Card from '../Card';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { SupermarketCompetitionData, Criterion, shortenName, shortenSupermarketName, parseNumber } from '../../utils/dashboardHelpers';
import CompetitionControlBar from './competition/CompetitionControlBar';
import CompetitionGridView from './competition/CompetitionGridView';
import CompetitionListView from './competition/CompetitionListView';
import { exportElementAsImage } from '../../../services/uiService';
import { Icon } from '../../../components/common/Icon';

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
    const exportRef = useRef<HTMLDivElement>(null);
    
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
        <div ref={exportRef} className="rounded-none border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 mt-4">
            <div className="overflow-hidden">
                <div className="px-2 py-1 flex justify-between items-center bg-[#34495e] dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 gap-2">
                    <h3 className="text-[11px] sm:text-[13px] font-extrabold uppercase flex items-center gap-1.5 sm:gap-2 text-white tracking-widest truncate w-full justify-center">
                        {activeSupermarket === 'Tổng' ? 'TỔNG QUAN' : activeSupermarket.toUpperCase()} - THI ĐUA {updateTimestamp ? `ĐẾN ${updateTimestamp.split(' ')[0]}` : ''}
                    </h3>
                    <div className="flex items-center gap-0.5 sm:gap-1 hide-on-export shrink-0 absolute right-2">
                        <CompetitionControlBar 
                            viewMode={viewMode} 
                            setViewMode={setViewMode} 
                            selectedPrograms={selectedPrograms} 
                            setSelectedPrograms={setSelectedPrograms} 
                            allProgramNames={allProgramNames} 
                            hiddenColumns={hiddenColumns} 
                            setHiddenColumns={setHiddenColumns} 
                            headers={processedSupermarketData?.headers || []} 
                        />
                        <button onClick={(e) => { e.stopPropagation(); handleExport(); }} disabled={isExporting} title="Xuất Ảnh" className="p-1.5 sm:p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/20 transition-colors ml-1">
                            {isExporting ? <Icon name="loader-2" size={3.5} className="animate-spin sm:hidden" /> : <Icon name="camera" size={3.5} className="sm:hidden" />}
                            {isExporting ? <Icon name="loader-2" size={5} className="animate-spin hidden sm:block" /> : <Icon name="camera" size={5} className="hidden sm:block" />}
                        </button>
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
    );
});

export default CompetitionView;
