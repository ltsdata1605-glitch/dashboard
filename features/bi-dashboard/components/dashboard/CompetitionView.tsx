
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

import { 
    calculateProgramRemaining, 
    sortProgramsList, 
    toggleCompetitionColumn,
    ALLOWED_REALTIME_COLUMNS,
    ALLOWED_LUYKE_COLUMNS
} from './competition/competitionSortAndCalc';

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
    // Cột bật MẶC ĐỊNH theo đúng chế độ:
    // Realtime: T.HIỆN, M.TIÊU V.TRỘI, %HT V.Trội, C.LẠI
    const defaultVisibleCols = useMemo(
        () => isRealtime
            ? ['Realtime', 'Target V.Trội', '%HT V.Trội', 'Còn Lại']
            : ['L.Kế', '%DKHT', 'Target V.Trội', '%HT V.Trội', 'Còn Lại'],
        [isRealtime]
    );

    const [selectedPrograms, setSelectedPrograms] = useIndexedDBState<string[]>(`competition-selected-programs-${modeKey}`, []);
    // Hậu tố -v9: Mặc định luôn null để áp dụng chuỗi ưu tiên giảm dần
    const [sortConfig, setSortConfig] = useIndexedDBState<{ columnIndex: number | 'conLai' | 'htdkVT' | -1; direction: 'asc' | 'desc' } | null>(`competition-sort-config-${modeKey}-v9`, null);
    // Hậu tố -v9: Bổ sung thêm cột %DKHT cho chế độ Luỹ kế và cập nhật các nhãn mới
    const [visibleColumnOrder, setVisibleColumnOrder] = useIndexedDBState<string[]>(`competition-visible-cols-${modeKey}-v9`, defaultVisibleCols);
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
                if (current.direction === 'desc') {
                    return { columnIndex, direction: 'asc' };
                }
                // Click lần 3: Khôi phục về mặc định (sắp xếp giảm dần theo %HT V.Trội > %DKHT > %HT)
                return null;
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
        const headersToRemove = [
            'Xếp hạng trong miền', 'HẠNG VÙNG', 'TOP/BOTTOM VÙNG', 'Hạng vùng', 'Top/Bottom Vùng', 'Top/Bottom Trong Miền'
        ];
        const headerRenames: Record<string, string> = isRealtime ? { 
            'DOANH THU (RT)': 'Realtime',
            'SỐ LƯỢNG (RT)': 'Realtime',
            'DOANH THU': 'Realtime',
            'SỐ LƯỢNG': 'Realtime',
            'TARGET': 'Target',
            '% HT NGÀY': '%HT',
            '% DỰ BÁO': '%DKHT',
            'DT Realtime': 'Realtime', 
            'DT Realtime (QĐ)': 'Realtime', 
            'SL Realtime': 'Realtime', 
            'Target Ngày': 'Target', 
            '% HT Target Ngày': '%HT', 
            '%HT Target V.Trội': '%HT V.Trội',
            '%HTDK V.Trội': '%HT V.Trội'
        } : { 
            'DOANH THU': 'L.Kế',
            'SỐ LƯỢNG': 'L.Kế',
            'TARGET': 'Target',
            '% HT THÁNG': '%HT',
            '% DỰ BÁO': '%DKHT',
            'DTLK': 'L.Kế', 
            'DTQĐ': 'L.Kế', 
            'SLLK': 'L.Kế', 
            'Target': 'Target', 
            '% HT Target Tháng': '%HT', 
            '% HT Dự Kiến': '%DKHT', 
            'Target V.Trội': 'Target V.Trội', 
            '%HT Target V.Trội': '%HT V.Trội', 
            '%HTDK V.Trội': '%HT V.Trội',
            '%HTDK': '%DKHT'
        };

        const allowedColumns: readonly string[] = isRealtime ? ALLOWED_REALTIME_COLUMNS : ALLOWED_LUYKE_COLUMNS;
        const indicesToRemove: number[] = [];
        processedHeaders = processedHeaders.map((header, index) => {
            if (headersToRemove.includes(header)) {
                indicesToRemove.push(index);
                return header;
            }
            const renamed = headerRenames[header] || header;
            // Tách biệt rõ giữa Realtime và Luỹ kế: chỉ giữ cột thuộc chế độ hiện tại
            if (!allowedColumns.includes(renamed)) {
                indicesToRemove.push(index);
                return header;
            }
            return renamed;
        }).filter((_, index) => !indicesToRemove.includes(index));

        processedPrograms = processedPrograms.map((program) => ({
            ...program,
            data: program.data.filter((_, index) => !indicesToRemove.includes(index))
        }));

        if (processedHeaders.length > 0 && !processedHeaders.includes('Còn Lại')) {
            processedHeaders.push('Còn Lại');
        }
        // Chế độ Luỹ kế: Bổ sung thêm cột %DKHT vào danh sách cột nếu chưa có
        if (!isRealtime && processedHeaders.length > 0 && !processedHeaders.includes('%DKHT')) {
            processedHeaders.push('%DKHT');
        }

        // Sắp xếp lại các cột theo thứ tự chuẩn
        const orderedHeaders = allowedColumns.filter(c => processedHeaders.includes(c));
        const finalHeaders = [...orderedHeaders, ...processedHeaders.filter(c => !orderedHeaders.includes(c))];

        const remappedPrograms = processedPrograms.map((program) => {
            const reorderedData = finalHeaders.map(h => {
                const oldIdx = processedHeaders.indexOf(h);
                return oldIdx !== -1 ? program.data[oldIdx] : '';
            });

            // Tự động bổ sung giá trị %DKHT ở Luỹ kế nếu ô này trống
            const dkhtIndex = finalHeaders.indexOf('%DKHT');
            if (dkhtIndex !== -1 && (reorderedData[dkhtIndex] === '' || reorderedData[dkhtIndex] === undefined || reorderedData[dkhtIndex] === null)) {
                const lkIdx = finalHeaders.indexOf('L.Kế');
                const tarIdx = finalHeaders.indexOf('Target');
                if (lkIdx !== -1 && tarIdx !== -1) {
                    const lk = parseNumber(reorderedData[lkIdx]);
                    const tar = parseNumber(reorderedData[tarIdx]);
                    const now = new Date();
                    const daysPassed = now.getDate();
                    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    if (daysPassed > 0 && tar > 0) {
                        const proj = (lk / daysPassed) * daysInMonth;
                        reorderedData[dkhtIndex] = `${Math.round((proj / tar) * 100)}%`;
                    } else {
                        reorderedData[dkhtIndex] = '-';
                    }
                } else {
                    reorderedData[dkhtIndex] = '-';
                }
            }

            let conLaiValue: number | null = null;
            const actualIndex = isRealtime ? finalHeaders.indexOf('Realtime') : finalHeaders.indexOf('L.Kế');
            let targetIndex = finalHeaders.indexOf('Target V.Trội');
            if (targetIndex === -1) {
                targetIndex = finalHeaders.indexOf('Target');
            }
            if (actualIndex !== -1 && targetIndex !== -1) {
                const actual = parseNumber(reorderedData[actualIndex]);
                const target = parseNumber(reorderedData[targetIndex]);
                conLaiValue = actual - target;
            }
            return { ...program, data: reorderedData, conLai: conLaiValue };
        });

        return { headers: finalHeaders, programs: remappedPrograms };
    }, [supermarketData, isRealtime]);

    const allColumns = useMemo(() => processedSupermarketData?.headers || [], [processedSupermarketData]);
    // THỨ TỰ CÁC CỘT SẼ LUÔN ĐƯỢC SẮP XẾP THEO THỨ TỰ NÀY (Thực hiện -> Target -> %HT -> %DKHT -> Vượt trội -> Còn Lại)
    const visibleColumns = useMemo(
        () => allColumns.filter(col => visibleColumnOrder.includes(col)),
        [allColumns, visibleColumnOrder]
    );
    const hasHiddenColumn = allColumns.length > 0 && visibleColumns.length < allColumns.length;
    /** Bật/tắt cột theo quy tắc nhóm loại trừ tương hỗ giữa Cơ bản và Vượt trội */
    const toggleColumn = (header: string) => {
        setVisibleColumnOrder(prev => toggleCompetitionColumn(header, prev, allColumns, isRealtime));
    };

    const sortedPrograms = useMemo(() => {
        if (!processedSupermarketData?.programs) return [];
        const currentProgramNames = processedSupermarketData.programs.map((p) => p.name);
        const validSelected = selectedPrograms.filter(p => currentProgramNames.includes(p));
        const selectedSet = new Set(validSelected);
        const visible = processedSupermarketData.programs.filter((p) => selectedSet.size === 0 || selectedSet.has(p.name));

        // Cột Còn Lại được tính dựa trên cột được hiển thị: SẼ LẤY THỰC HIỆN - MỤC TIÊU V.TRỘI (nếu có hiển thị)
        const programsWithDynamicRemaining = visible.map(program => {
            const dynamicRemaining = calculateProgramRemaining(program, visibleColumns, allColumns, isRealtime);
            return {
                ...program,
                conLai: dynamicRemaining !== null ? dynamicRemaining : program.conLai
            };
        });

        return sortProgramsList(programsWithDynamicRemaining, sortConfig, allColumns, nameOverrides, visibleColumns, isRealtime);
    }, [processedSupermarketData, selectedPrograms, sortConfig, nameOverrides, visibleColumns, allColumns, isRealtime]);

    // BẢNG LUÔN ĐƯỢC SẮP XẾP GIẢM DẦN THEO CỘT ĐANG HIỂN THỊ TRONG TỪNG TIÊU CHÍ (SLLK, DTLK, DTQĐ):
    // - Realtime: Sắp xếp theo %HT hoặc %HT V.Trội (tuỳ cột nào đang hiển thị)
    // - Luỹ kế: Sắp xếp theo %DKHT, %HT V.Trội (tuỳ cột nào đang hiển thị)
    const groupedAndSortedPrograms = useMemo(() => {
        const groups: Partial<Record<Criterion, ProcessedProgram[]>> = {};
        (['SLLK', 'DTLK', 'DTQĐ'] as Criterion[]).forEach(criterion => {
            const criterionPrograms = sortedPrograms.filter(p => p.metric === criterion);
            if (criterionPrograms.length > 0) {
                // Đảm bảo từng nhóm tiêu chí con luôn được sắp xếp theo đúng sortConfig và chế độ hiện tại
                groups[criterion] = sortProgramsList(criterionPrograms, sortConfig, allColumns, nameOverrides, visibleColumns, isRealtime);
            }
        });
        return groups;
    }, [sortedPrograms, sortConfig, allColumns, nameOverrides, visibleColumns, isRealtime]);

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
                                    <Button
                                        variant="unstyled" size="none"
                                        type="button"
                                        onClick={toggleAllPrograms}
                                        className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                    >
                                        {validSelectedPrograms.length === allProgramNames.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                                    </Button>
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
                                    <Button
                                        variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => setVisibleColumnOrder(defaultVisibleCols)}
                                        className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                                        title="Khôi phục các cột mặc định"
                                    >
                                        Mặc định
                                    </Button>
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
