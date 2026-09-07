
import React, { useMemo, useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Settings, Search } from 'lucide-react';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import * as db from '../../utils/db';
import { SupermarketCompetitionData, Criterion, shortenName, parseNumber, getCompetitionColumnLabel } from '../../utils/dashboardHelpers';
import CompetitionListView from './competition/CompetitionListView';
import { CogIcon, FilterIcon } from '../Icons';
import { Switch } from './DashboardWidgets';
import { Button } from '../../../../components/shared/ui/Button';
import { EmptyState } from '../../../../components/shared/ui/EmptyState';
import { MultiSelectDropdown } from '../../../../components/shared/ui/MultiSelectDropdown';

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
    onNavigateToUpdater?: () => void;
}

const CompetitionView = React.forwardRef<HTMLDivElement, CompetitionViewProps>((props, ref) => {
    const { data, isRealtime, activeSupermarket } = props;

    const modeKey = isRealtime ? 'realtime' : 'luyke';
    // Cột bật MẶC ĐỊNH, theo đúng thứ tự muốn thấy trên bảng. Lưu danh sách cột BẬT (thay cho danh
    // sách cột ẩn trước đây) vì thứ tự trong danh sách này chính là thứ tự cột trên bảng: bật thêm
    // cột nào thì cột đó xuống cuối bảng.
    const defaultVisibleCols = useMemo(
        () => isRealtime
            ? ['Target V.Trội', 'Realtime', '%HT V.Trội', 'Còn Lại']
            : ['Target V.Trội', 'L.Kế', '%HTDK', 'Còn Lại'],
        [isRealtime]
    );

    const [selectedPrograms, setSelectedPrograms] = useIndexedDBState<string[]>(`competition-selected-programs-${modeKey}`, []);
    // Hậu tố -v2 ở 2 khoá dưới: đổi khoá = bỏ cấu hình cũ đang lưu trên máy người dùng, để bộ cột
    // và kiểu sắp xếp mặc định mới thực sự có hiệu lực (cấu hình cũ luôn khác null nên mặc định
    // mới sẽ không bao giờ được áp).
    const [sortConfig, setSortConfig, isSortConfigLoaded] = useIndexedDBState<{ columnIndex: number | 'conLai' | 'htdkVT' | -1; direction: 'asc' | 'desc' } | null>(`competition-sort-config-${modeKey}-v2`, null);
    const [visibleColumnOrder, setVisibleColumnOrder] = useIndexedDBState<string[]>(`competition-visible-cols-${modeKey}-v2`, defaultVisibleCols);
    const [defaultSortSet, setDefaultSortSet] = useState(false);
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [programFilterSearch, setProgramFilterSearch] = useState('');
    const columnSelectorRef = useRef<HTMLDivElement>(null);

    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(() => {
        return typeof document !== 'undefined' ? document.getElementById('column-settings-portal') : null;
    });

    useEffect(() => {
        if (!portalTarget && typeof document !== 'undefined') {
            setPortalTarget(document.getElementById('column-settings-portal'));
        }
    }, [portalTarget]);

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
                const sortHeader = isRealtime ? '%HT' : '%HTDK';
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

    const allColumns = useMemo(() => processedSupermarketData?.headers || [], [processedSupermarketData]);
    // Bỏ những cột đã lưu nhưng không còn trong dữ liệu hiện tại; thứ tự giữ nguyên như lúc bật.
    const visibleColumns = useMemo(
        () => visibleColumnOrder.filter(col => allColumns.includes(col)),
        [visibleColumnOrder, allColumns]
    );
    const hasHiddenColumn = allColumns.length > 0 && visibleColumns.length < allColumns.length;
    /** Bật cột thì đưa xuống CUỐI danh sách — cột mới bật luôn nằm cuối bảng. */
    const toggleColumn = (header: string) => setVisibleColumnOrder(prev => (
        prev.includes(header) ? prev.filter(h => h !== header) : [...prev, header]
    ));

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

    const handleOpenTargetThiDua = async () => {
        await db.set('supermarket-config-active-tab', 'competitionTarget');
        if (activeSupermarket && activeSupermarket !== 'Tổng') {
            await db.set('updater-active-supermarket', activeSupermarket);
        }
        if (props.onNavigateToUpdater) {
            props.onNavigateToUpdater();
        } else {
            const updaterBtn = document.querySelector('button[title="Cập nhật"]') as HTMLButtonElement;
            if (updaterBtn) updaterBtn.click();
        }
        setTimeout(() => {
            const el = document.getElementById('supermarket-config-section');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    };

    const toolbarControls = (
        <div id="competition-view-controls" className="flex items-center gap-1">
            {/* Bộ lọc tích hợp 2 cột: Lọc chương trình & Cột hiển thị */}
            <div className="relative" ref={columnSelectorRef}>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsColumnSelectorOpen(p => !p)}
                    className={`relative h-7 w-7 transition-colors ${
                        isColumnSelectorOpen || isProgramFiltered || hasHiddenColumn
                            ? 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/30'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                    title="Bộ lọc thi đua (Chương trình & Cột hiển thị)"
                >
                    <FilterIcon className="h-4 w-4" />
                    {isProgramFiltered && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sky-500 px-1 text-[9px] font-bold text-white shadow-sm ring-1 ring-white dark:ring-slate-900">
                            {validSelectedPrograms.length}
                        </span>
                    )}
                </Button>

                {isColumnSelectorOpen && (
                    <div className="absolute right-0 mt-2 w-[540px] max-w-[92vw] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[100] overflow-hidden text-left animate-in fade-in-50 zoom-in-95 duration-150">
                        {/* Header của Popup */}
                        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/80">
                            <div className="flex items-center gap-2">
                                <FilterIcon className="h-3.5 w-3.5 text-sky-500" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Bộ lọc bảng thi đua</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">
                                {isRealtime ? 'Chế độ Realtime' : 'Chế độ Luỹ kế'}
                            </span>
                        </div>

                        {/* Layout 2 cột */}
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700/60">
                            {/* CỘT 1: LỌC CHƯƠNG TRÌNH */}
                            <div className="p-3 flex flex-col h-80">
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                        Chương trình ({validSelectedPrograms.length}/{allProgramNames.length})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={toggleAllPrograms}
                                        className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                    >
                                        {validSelectedPrograms.length === allProgramNames.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                                    </button>
                                </div>

                                {/* Ô tìm kiếm chương trình */}
                                <div className="relative mb-2">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={programFilterSearch}
                                        onChange={(e) => setProgramFilterSearch(e.target.value)}
                                        placeholder="Tìm tên chương trình..."
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                                    />
                                </div>

                                {/* Danh sách chương trình có thể cuộn */}
                                <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
                                    {programOptions.length > 0 ? (
                                        programOptions.map(opt => (
                                            <div
                                                key={opt.key}
                                                onClick={() => toggleProgram(opt.key)}
                                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors select-none"
                                            >
                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate pr-2" title={opt.label}>
                                                    {opt.label}
                                                </span>
                                                <Switch
                                                    checked={opt.checked}
                                                    onChange={() => toggleProgram(opt.key)}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-6 text-center text-xs text-slate-400">
                                            Không tìm thấy chương trình phù hợp
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* CỘT 2: CỘT HIỂN THỊ */}
                            <div className="p-3 flex flex-col h-80">
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                        Cột hiển thị ({visibleColumns.length}/{allColumns.length})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setVisibleColumnOrder(allColumns)}
                                        className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                        title="Hiện tất cả các cột"
                                    >
                                        Hiện tất cả
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin mt-1">
                                    {allColumns.map(header => {
                                        const order = visibleColumns.indexOf(header);
                                        return (
                                            <div
                                                key={header}
                                                onClick={() => toggleColumn(header)}
                                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors select-none"
                                            >
                                                <span className="flex items-center gap-1.5 min-w-0 pr-2">
                                                    {/* Số thứ tự = vị trí cột trên bảng, giúp thấy ngay thứ tự đang bật */}
                                                    <span className={`w-4 text-[10px] font-bold tabular-nums ${order === -1 ? 'text-transparent' : 'text-sky-600 dark:text-sky-400'}`}>
                                                        {order === -1 ? '' : order + 1}
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                                                        {getCompetitionColumnLabel(header)}
                                                    </span>
                                                </span>
                                                <Switch
                                                    checked={order !== -1}
                                                    onChange={() => toggleColumn(header)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Nút cấu hình Target Thi đua (Lucide Settings) */}
            <Button
                variant="ghost"
                size="icon"
                onClick={handleOpenTargetThiDua}
                className="h-7 w-7 text-slate-400 hover:text-sky-600 dark:hover:text-slate-300 transition-colors"
                title="Cấu hình Target Thi đua"
            >
                <Settings className="h-4 w-4" />
            </Button>
        </div>
    );

    return (
        <div ref={ref} className="relative z-10">
            {/* Portal controls into DashboardHeader action bar */}
            {portalTarget && ReactDOM.createPortal(toolbarControls, portalTarget)}

            {/* Scrollable table content */}
            <div className="overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="p-1.5 sm:p-2 lg:px-6 lg:pb-6 lg:pt-2 min-w-fit">
                    <div className="p-0">
                        {processedSupermarketData && sortedPrograms.length > 0 ? (
                            <CompetitionListView
                                groupedAndSortedPrograms={groupedAndSortedPrograms}
                                headers={processedSupermarketData.headers}
                                visibleColumns={visibleColumns}
                                isRealtime={isRealtime}
                                handleSort={handleSort}
                            />
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
