
import React, { useRef, useState, useEffect, useMemo } from 'react';
import Card from '../Card';
import toast from 'react-hot-toast';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import { UsersIcon, XIcon, SpinnerIcon, CameraIcon, ImagesIcon, ChevronDownIcon, FilterIcon, ViewGridIcon, ViewListIcon, PlusIcon } from '../Icons';
import { Criterion, CompetitionHeader, Employee, Version, SummaryTableConfig } from '../../types/nhanVienTypes';
import { CompetitionGroupCard } from './CompetitionGroupView';
import { IndividualCompetitionView, IndividualCompetitionViewHandle } from './IndividualCompetitionView';
import CompetitionCompareView from './CompetitionCompareView';
import CompetitionSummaryView from './CompetitionSummaryView';
import { getYesterdayDateString, shortenName } from '../../utils/nhanVienHelpers';
import { Switch } from '../dashboard/DashboardWidgets';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../../../services/uiService';
import TimeProgressBar from './shared/TimeProgressBar';

const PALETTE = [
  { main: 'bg-sky-600', light: 'bg-sky-100', text: 'text-sky-800', hover: 'hover:bg-sky-50', zebra: 'bg-sky-50/50', footer: 'bg-sky-800' },
  { main: 'bg-teal-600', light: 'bg-teal-100', text: 'text-teal-800', hover: 'hover:bg-teal-50', zebra: 'bg-teal-50/50', footer: 'bg-teal-800' },
  { main: 'bg-rose-600', light: 'bg-rose-100', text: 'text-rose-800', hover: 'hover:bg-rose-50', zebra: 'bg-sky-50/50', footer: 'bg-rose-800' },
  { main: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-800', hover: 'hover:bg-amber-50', zebra: 'bg-sky-50/50', footer: 'bg-amber-800' },
  { main: 'bg-indigo-600', light: 'bg-indigo-100', text: 'text-indigo-800', hover: 'hover:bg-indigo-50', zebra: 'bg-sky-50/50', footer: 'bg-indigo-800' },
  { main: 'bg-fuchsia-600', light: 'bg-fuchsia-100', text: 'text-fuchsia-800', hover: 'hover:bg-fuchsia-50', zebra: 'bg-sky-50/50', footer: 'bg-fuchsia-800' },
];

import { useCompetitionData } from '../../hooks/useCompetitionData';

interface CompetitionTabProps {
    groupedData: Record<Criterion, { headers: CompetitionHeader[]; employees: { name: string; originalName: string; department: string; values: (number | null)[] }[] }>;
    allCompetitionsByCriterion: Record<Criterion, { headers: CompetitionHeader[] }>;
    selectedCompetitions: Set<string>;
    setSelectedCompetitions: (updater: React.SetStateAction<Set<string>>) => void;
    supermarket: string | null;
    versions: Version[];
    activeVersionName: string | 'new' | null;
    setActiveVersionName: React.Dispatch<React.SetStateAction<string | 'new' | null>>;
    activeCompetitionTab: Criterion | 'nhom' | 'canhan' | 'tong' | 'sosanh';
    setActiveCompetitionTab: (c: Criterion | 'nhom' | 'canhan' | 'tong' | 'sosanh') => void;
    onVersionTabClick: (version: Version) => void;
    onStartNewVersion: () => void;
    onCancelNewVersion: () => void;
    onSaveVersion: (name: string) => void;
    onDeleteVersion: (name: string) => void;
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    allEmployees: Employee[];
    performanceChanges: Map<string, { change: number; direction: 'up' | 'down' }>;
    individualViewEmployees: Employee[];
    selectedIndividual: Employee | null;
    onSelectIndividual: (emp: Employee | null) => void;
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
    activeDepartments: string[];
    revenueRows?: any[];
    installmentRows?: any[];
    banKemRows?: any[];
    bonusData?: Record<string, any>;
    isActive?: boolean;
}

export const CompetitionTab: React.FC<CompetitionTabProps> = React.memo(({
    groupedData,
    allCompetitionsByCriterion,
    selectedCompetitions,
    setSelectedCompetitions,
    supermarket,
    versions,
    activeVersionName,
    setActiveVersionName,
    activeCompetitionTab,
    setActiveCompetitionTab,
    onVersionTabClick,
    onStartNewVersion,
    onCancelNewVersion,
    onSaveVersion,
    onDeleteVersion,
    employeeCompetitionTargets,
    allEmployees,

    individualViewEmployees,
    selectedIndividual,
    onSelectIndividual,
    highlightedEmployees,
    setHighlightedEmployees,
    activeDepartments,
    revenueRows,
    installmentRows,
    banKemRows,
    bonusData,
    isActive
}) => {

    const [newVersionName, setNewVersionName] = useState('');
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
    const [isEmployeeFilterOpen, setIsEmployeeFilterOpen] = useState(false);
    const [employeeFilterSearch, setEmployeeFilterSearch] = useState('');
    const employeeFilterRef = useRef<HTMLDivElement>(null);
    const [isExportingHighlights, setIsExportingHighlights] = useState(false);
    const [exportTitleOverride, setExportTitleOverride] = useState<string | null>(null);
    const [isolatedHighlightEmployee, setIsolatedHighlightEmployee] = useState<string | null>(null);
    const groupViewRef = useRef<HTMLDivElement>(null);
    const individualViewRef = useRef<IndividualCompetitionViewHandle>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const [viewMode, setViewMode] = useIndexedDBState<'group' | 'list'>('competition-view-mode', 'list');

    // --- Logic cho Tab TỔNG đa bảng ---
    const [summaryTables, setSummaryTables] = useIndexedDBState<SummaryTableConfig[]>('nhanvien-summary-tables-v1', [
        { id: 'default', name: 'Bảng tổng hợp thi đua', selectedTitles: [] }
    ]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (employeeFilterRef.current && !employeeFilterRef.current.contains(event.target as Node)) setIsEmployeeFilterOpen(false);
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) setIsFilterOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const {
        hasAnyData,
        relevantCompetitions,
        filteredEmployees,
        employeeDataMap,
        selectedHeadersForNhom,
        sortedSelectedHeaders,
        effectiveHighlightColorMap,
        getEmployeeDotColor
    } = useCompetitionData({
        groupedData,
        allCompetitionsByCriterion,
        selectedCompetitions,
        activeCompetitionTab,
        activeDepartments,
        employeeCompetitionTargets,
        allEmployees,
        highlightedEmployees,
        isolatedHighlightEmployee,
        isActive
    });

    const handleSaveVersionAction = () => {
        onSaveVersion(newVersionName);
        setNewVersionName('');
    };

    const handleSelectAllEmployees = () => setHighlightedEmployees(new Set(allEmployees.map(e => e.originalName)));
    const handleDeselectAllEmployees = () => setHighlightedEmployees(new Set());

    const { showExportOptions } = useExportOptionsContext();

    const exportGroupViewToPNG = async (filename: string, refToExport = groupViewRef, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!refToExport.current) return null;
        const original = refToExport.current;
        // Count how many group cards exist to decide layout
        const cardCount = original.querySelectorAll('.competition-group-card').length;
        const useTwoColGrid = cardCount === 2;

        try {
            const blob = await exportElementAsImage(original, filename, {
                mode: 'blob-only', elementsToHide: ['.export-button-component'],
                forcedWidth: useTwoColGrid ? 1000 : 500,
                fitAllColumns: useTwoColGrid,
                onCloneReady: (clone: HTMLElement) => {
                    // Remove overflow constraints
                    const containers = clone.querySelectorAll('.overflow-x-auto, .grid, .competition-group-card');
                    containers.forEach(el => {
                        const htmlEl = el as HTMLElement;
                        htmlEl.style.overflow = 'visible';
                        htmlEl.style.height = 'auto';
                        htmlEl.style.minHeight = 'auto';
                        if (htmlEl.classList.contains('competition-group-card')) {
                            htmlEl.classList.remove('h-full');
                        }
                    });

                    const gridContainer = clone.querySelector('.grid');
                    if (gridContainer) {
                        if (useTwoColGrid) {
                            // Keep 2-column grid — match displayed layout
                            (gridContainer as HTMLElement).style.display = 'grid';
                            (gridContainer as HTMLElement).style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
                            (gridContainer as HTMLElement).style.gap = '24px';
                            (gridContainer as HTMLElement).style.width = '100%';
                            (gridContainer as HTMLElement).style.alignItems = 'start';
                        } else {
                            // Stack vertically for 3+ cards
                            (gridContainer as HTMLElement).style.display = 'flex';
                            (gridContainer as HTMLElement).style.flexDirection = 'column';
                            (gridContainer as HTMLElement).style.alignItems = 'stretch';
                            (gridContainer as HTMLElement).style.gap = '24px';
                            (gridContainer as HTMLElement).style.width = '100%';
                        }
                    }
                }
            });
            if (blob) {
                if (autoAction === 'download') {
                    downloadBlob(blob, filename);
                    return 'download';
                } else if (autoAction === 'share') {
                    await shareBlob(blob, filename);
                    return 'share';
                } else {
                    return await showExportOptions(blob, filename);
                }
            }
            return null;
        } catch (err) {
             console.error("Export failed", err);
             toast.error("Xuất ảnh thất bại.");
             return null;
        }
    };

    const handleSmartBatchExport = async () => {
        if (highlightedEmployees.size === 0) {
            toast.error("Vui lòng chọn ít nhất một nhân viên để xuất báo cáo.");
            return;
        }
        setIsExportingHighlights(true);
        const targets = Array.from(highlightedEmployees);
        setExportProgress({ current: 0, total: targets.length });

        let autoAction: 'download' | 'share' | 'cancel' | null = null;

        try {
            for (let i = 0; i < targets.length; i++) {
                const empId = targets[i];
                const emp = allEmployees.find(e => e.originalName === empId);
                const empName = emp ? emp.name : empId;
                setIsolatedHighlightEmployee(empId);
                setExportTitleOverride(`${empName} - NHÓM HÀNG THI ĐUA ĐẾN NGÀY ${getYesterdayDateString()}`);
                await new Promise(resolve => setTimeout(resolve, 800));
                const safeName = `${empName.replace(/[\s/]/g, '_')}_Highlight.png`;
                const action = await exportGroupViewToPNG(safeName, groupViewRef, autoAction);
                if (action === 'cancel') break;
                autoAction = action;
                setExportProgress(prev => ({ ...prev, current: i + 1 }));
            }
        } catch (err) {
            console.error("Batch highlight export failed", err);
            toast.error("Có lỗi xảy ra khi xuất hàng loạt.");
        } finally {
            setIsolatedHighlightEmployee(null);
            setExportTitleOverride(null);
            setIsExportingHighlights(false);
            setExportProgress({ current: 0, total: 0 });
        }
    };

    const handleGroupBatchExport = async () => {
        if (!groupViewRef.current) return;
        setIsBatchExporting(true);
        const cards = groupViewRef.current.querySelectorAll('.competition-group-card');
        setExportProgress({ current: 0, total: cards.length + 1 });

        let autoAction: 'download' | 'share' | 'cancel' | null = null;

        try {
            const action1 = await exportGroupViewToPNG(`TongHop_NhomThiDua_${supermarket || 'SieuThi'}.png`, groupViewRef, autoAction);
            if (action1 === 'cancel') throw new Error('cancelled');
            autoAction = action1;
            setExportProgress(prev => ({ ...prev, current: prev.current + 1 }));
            await new Promise(resolve => setTimeout(resolve, 600)); 
            
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i] as HTMLElement;
                const titleElement = card.querySelector('h4');
                const title = titleElement ? titleElement.innerText : `Nhom_${i}`;
                
                const safeName = `${title.replace(/[\s/]/g, '_')}.png`;
                const blob = await exportElementAsImage(card, safeName, {
                    mode: 'blob-only', elementsToHide: ['.export-button-component'],
                    fitAllColumns: true,
                    onCloneReady: (clone: HTMLElement) => {
                        clone.classList.remove('h-full');
                    }
                });
                
                if (blob) {
                    if (autoAction === 'download') {
                        downloadBlob(blob, safeName);
                    } else if (autoAction === 'share') {
                        await shareBlob(blob, safeName);
                    } else {
                        const action = await showExportOptions(blob, safeName);
                        if (action === 'cancel') break;
                        autoAction = action;
                    }
                }
                
                setExportProgress(prev => ({ ...prev, current: prev.current + 1 }));
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } catch (error: any) {
            if (error.message !== 'cancelled') {
                console.error("Batch export failed", error);
                toast.error("Xuất hàng loạt thất bại.");
            }
        } finally {
            setIsBatchExporting(false);
            setExportProgress({ current: 0, total: 0 });
        }
    };

    const handleSelectAllCompetitions = () => {
        const allRelevantTitles = (Object.values(relevantCompetitions) as { headers?: CompetitionHeader[] }[]).flat().map(c => c?.headers || []).flat().map(h => h.title);
        setSelectedCompetitions(prev => { const newSet = new Set(prev); allRelevantTitles.forEach(t => newSet.add(t)); return newSet; });
    };
    const handleDeselectAllCompetitions = () => {
        const allRelevantTitles = (Object.values(relevantCompetitions) as { headers?: CompetitionHeader[] }[]).flat().map(c => c?.headers || []).flat().map(h => h.title);
        setSelectedCompetitions(prev => { const newSet = new Set(prev); allRelevantTitles.forEach(t => newSet.delete(t)); return newSet; });
    };
    const handleToggleCompetition = (competitionTitle: string) => {
        setSelectedCompetitions(prev => { const newSet = new Set(prev); if (newSet.has(competitionTitle)) newSet.delete(competitionTitle); else newSet.add(competitionTitle); return newSet; });
    };

    const activeFilterCount = (Object.values(relevantCompetitions) as { headers?: CompetitionHeader[] }[]).map(c => c?.headers || []).flat().filter(h => selectedCompetitions.has(h.title)).length;
    const totalFilterCount = (Object.values(relevantCompetitions) as { headers?: CompetitionHeader[] }[]).map(c => c?.headers || []).flat().length;
    const isFiltered = activeFilterCount < totalFilterCount;

    // --- Logic cho tab Tổng ---
    const handleAddSummaryTable = () => {
        setSummaryTables(prev => {
            const currentList = Array.isArray(prev) ? prev : [];
            const nextIdx = currentList.length + 1;
            const newTable: SummaryTableConfig = {
                id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: `Bảng tổng hợp ${nextIdx}`,
                selectedTitles: []
            };
            return [...currentList, newTable];
        });
    };

    const handleDeleteSummaryTable = (id: string) => {
        setSummaryTables(prev => {
            const currentList = Array.isArray(prev) ? prev : [];
            // Lọc bỏ bảng có ID trùng khớp và trả về một tham chiếu mảng hoàn toàn mới
            const newList = currentList.filter(t => t.id !== id);
            return [...newList];
        });
    };

    const handleRenameSummaryTable = (id: string, newName: string) => {
        setSummaryTables(prev => {
            const currentList = Array.isArray(prev) ? prev : [];
            return currentList.map(t => t.id === id ? { ...t, name: newName } : t);
        });
    };

    const handleUpdateTableTitles = (id: string, titles: string[]) => {
        setSummaryTables(prev => {
            const currentList = Array.isArray(prev) ? prev : [];
            return currentList.map(t => t.id === id ? { ...t, selectedTitles: titles } : t);
        });
    };


    if (isActive === false) {
        return <div className="hidden" />;
    }

    if (!hasAnyData) {
        return (
            <Card title="HIỆU QUẢ THI ĐUA THEO NHÂN VIÊN">
                <div className="mt-4 text-center py-12">
                     <UsersIcon className="h-16 w-16 text-slate-400 mx-auto" />
                    <p className="mt-4 text-slate-600 max-w-md mx-auto">Không có dữ liệu thi đua. Vui lòng chọn siêu thị và dán dữ liệu "Chương trình thi đua" tại trang Cập nhật.</p>
                </div>
            </Card>
        );
    }

    const cardTitle = (
        <div className="flex flex-col items-start leading-none py-1 w-full">
            <span className="js-report-title text-2xl font-black uppercase text-slate-800 dark:text-white mt-1">HIỆU QUẢ THI ĐUA NHÂN VIÊN ĐẾN NGÀY {getYesterdayDateString()}</span>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mt-1 font-bold">Thi đua là động lực, hiệu quả là mục tiêu - Vượt qua giới hạn, khẳng định bản thân.</span>
            <TimeProgressBar className="mt-2.5" />
        </div>
    );

    return (
        <div className="space-y-0">
            {/* Toolbar bar - giống Trả Góp */}
            <div className="flex flex-wrap justify-between items-center px-4 py-2.5 bg-white dark:bg-slate-800 no-print border-b border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex gap-2 items-center">
                    {([['canhan', 'Cá nhân'], ['nhom', 'Nhóm'], ['tong', 'Tổng'], ['sosanh', 'So sánh']] as const).map(([key, label]) => (
                        <button key={key} onClick={() => { setActiveCompetitionTab(key as any); setActiveVersionName(null); }} className={`px-3 py-1.5 text-[11px] font-bold border transition-all ${activeVersionName === null && activeCompetitionTab === key ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'}`}>{label}</button>
                    ))}
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                    {versions.filter(v => v && typeof v === 'object' && v.name).map(version => (
                        <div key={version.name} role="button" tabIndex={0} onClick={() => onVersionTabClick(version)} className={`group relative flex items-center gap-1 pl-2.5 pr-6 py-1.5 text-[11px] font-bold cursor-pointer transition-all border ${activeVersionName === version.name ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'}`}>
                            <span>{version.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteVersion(version.name); }} className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-600 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all"><XIcon className="h-3 w-3" /></button>
                        </div>
                    ))}
                    {activeVersionName === 'new' ? (
                        <div className="flex items-center gap-1.5">
                            <input type="text" value={newVersionName} onChange={(e) => setNewVersionName(e.target.value)} placeholder={selectedCompetitions.size === 0 ? "Chọn nhóm trước" : "Tên..."} className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-[11px] focus:ring-1 focus:ring-indigo-500 w-28 bg-white dark:bg-slate-800" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveVersionAction()} disabled={selectedCompetitions.size === 0} />
                            <button onClick={handleSaveVersionAction} className="px-2 py-1 bg-indigo-600 text-white rounded text-[11px] font-bold hover:bg-indigo-700 disabled:bg-slate-400" disabled={!newVersionName.trim() || selectedCompetitions.size === 0}>Lưu</button>
                            <button onClick={onCancelNewVersion} className="p-0.5 text-slate-500 hover:bg-slate-200 rounded-full"><XIcon className="h-3 w-3" /></button>
                        </div>
                    ) : (
                        <button onClick={onStartNewVersion} disabled={!supermarket} title="Tạo mới" className="p-1 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"><PlusIcon className="h-4 w-4" /></button>
                    )}
                </div>
                {/* Bên phải thanh bar — chế độ xem + export */}
                <div className="flex items-center gap-1">
                    {activeCompetitionTab === 'nhom' && activeVersionName === null && (
                        <>
                            <button onClick={() => setViewMode('group')} title="Bộ phận" className={`p-1 transition-all ${viewMode === 'group' ? 'text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}><ViewGridIcon className="h-4 w-4"/></button>
                            <button onClick={() => setViewMode('list')} title="Danh sách" className={`p-1 transition-all ${viewMode === 'list' ? 'text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}><ViewListIcon className="h-4 w-4"/></button>
                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                            <button onClick={handleGroupBatchExport} disabled={isBatchExporting || selectedHeadersForNhom.length === 0} title="Xuất tất cả nhóm" className="p-1 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-40">{isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <ImagesIcon className="h-4 w-4" />}</button>
                            <button onClick={handleSmartBatchExport} disabled={isExportingHighlights || highlightedEmployees.size === 0} title="Xuất Highlight" className="p-1 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-40">{isExportingHighlights ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4" />}</button>
                        </>
                    )}
                    {activeCompetitionTab === 'canhan' && activeVersionName === null && (
                        <>
                            <button onClick={() => individualViewRef.current?.performBatchExport()} disabled={individualViewRef.current?.isBatchExporting} title="Xuất tất cả nhân viên" className="p-1 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-40">
                                {individualViewRef.current?.isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <ImagesIcon className="h-4 w-4" />}
                            </button>
                            <button onClick={() => individualViewRef.current?.handleExportPNG()} title="Xuất ảnh" className="p-1 text-slate-400 hover:text-slate-600 transition-all"><CameraIcon className="h-4 w-4" /></button>
                        </>
                    )}
                </div>
            </div>
            <Card noPadding title={cardTitle} rounded={false}>
                <div className="w-full overflow-visible px-4 pb-4">
                    <div className="pt-2">
                        {activeCompetitionTab === 'nhom' && (
                            <>
                            {/* Toolbar: Lọc nhóm + Highlight — canh phải */}
                            <div className="mb-4 flex flex-wrap items-center justify-end gap-2 px-1 no-print">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Lọc nhóm */}
                                    <div className="relative" ref={filterRef}>
                                        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border transition-all ${isFilterOpen || isFiltered ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'}`}><FilterIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline">Lọc nhóm</span>{isFiltered && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-full">{activeFilterCount}</span>}</button>
                                        {isFilterOpen && (
                                            <div className="absolute right-0 top-full mt-1 w-80 max-h-[80vh] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden">
                                                <div className="p-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50">
                                                    <input type="text" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder="Tìm nhóm thi đua..." className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 bg-white placeholder-slate-400" autoFocus />
                                                    <div className="flex items-center justify-between mt-1.5"><button onClick={handleSelectAllCompetitions} className="text-[10px] font-bold text-indigo-600 hover:underline">Chọn tất cả</button><button onClick={handleDeselectAllCompetitions} className="text-[10px] font-bold text-slate-500 hover:underline">Bỏ chọn</button></div>
                                                </div>
                                                <div className="overflow-y-auto flex-1 p-1.5 space-y-3">
                                                    {(Object.entries(relevantCompetitions) as [Criterion, { headers: CompetitionHeader[] }][]).map(([criterion, data]) => {
                                                        const filteredComps = (data.headers || []).filter(c => c.title.toLowerCase().includes(filterSearch.toLowerCase()));
                                                        if (filteredComps.length === 0) return null;
                                                        return (
                                                            <div key={criterion}>
                                                                <h5 className="px-2 mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tiêu chí {criterion}</h5>
                                                                <div className="space-y-0.5">
                                                                    {filteredComps.map(comp => {
                                                                        const displayCompName = shortenName(comp.originalTitle, nameOverrides);
                                                                        return (
                                                                            <div key={comp.title} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 transition-colors">
                                                                                <span onClick={() => handleToggleCompetition(comp.title)} className={`text-sm select-none cursor-pointer flex-1 pr-2 ${selectedCompetitions.has(comp.title) ? 'font-medium text-slate-900' : 'text-slate-600'}`}>{displayCompName}</span>
                                                                                <Switch checked={selectedCompetitions.has(comp.title)} onChange={() => handleToggleCompetition(comp.title)} />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Highlight */}
                                    <div className="relative" ref={employeeFilterRef}>
                                        <button onClick={() => setIsEmployeeFilterOpen(!isEmployeeFilterOpen)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border transition-all ${isEmployeeFilterOpen || highlightedEmployees.size > 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-700'}`}>
                                            <UsersIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline">Highlight</span>{highlightedEmployees.size > 0 && <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded-full">{highlightedEmployees.size}</span>}<ChevronDownIcon className={`h-3 w-3 transition-transform ${isEmployeeFilterOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isEmployeeFilterOpen && (
                                            <div className="absolute right-0 top-full mt-1 w-72 sm:w-80 max-h-[70vh] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden">
                                                <div className="p-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                    <input type="text" value={employeeFilterSearch} onChange={(e) => setEmployeeFilterSearch(e.target.value)} placeholder="Tìm nhân viên..." className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100 placeholder-slate-400" autoFocus />
                                                    <div className="flex items-center justify-between mt-1.5 px-0.5"><button onClick={handleSelectAllEmployees} className="text-[10px] font-bold text-indigo-600 hover:underline">Chọn tất cả</button><button onClick={handleDeselectAllEmployees} className="text-[10px] font-bold text-slate-500 hover:underline">Bỏ chọn</button></div>
                                                </div>
                                                <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5">
                                                    {allEmployees.filter(emp => emp.name.toLowerCase().includes(employeeFilterSearch.toLowerCase())).map(emp => {
                                                        const isSelected = highlightedEmployees.has(emp.originalName);
                                                        return (
                                                            <div key={emp.originalName} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-default">
                                                                <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => setHighlightedEmployees(prev => { const newSet = new Set(prev); if (newSet.has(emp.originalName)) newSet.delete(emp.originalName); else newSet.add(emp.originalName); return newSet; })}>
                                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getEmployeeDotColor(emp.originalName)}`}></span>
                                                                    <span className={`text-sm truncate ${isSelected ? 'font-medium text-slate-900' : 'text-slate-600'}`}>{emp.name}</span>
                                                                </div>
                                                                <Switch checked={isSelected} onChange={() => setHighlightedEmployees(prev => { const newSet = new Set(prev); if (newSet.has(emp.originalName)) newSet.delete(emp.originalName); else newSet.add(emp.originalName); return newSet; })} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {selectedHeadersForNhom.length === 0 ? (
                                <div className="mt-2 text-center py-12"><UsersIcon className="h-16 w-16 text-slate-400 mx-auto" /><p className="mt-4 text-slate-600 max-w-md mx-auto">Hãy chọn nhóm hàng thi đua cần hiển thị từ bộ lọc nhóm thi đua.</p></div>
                            ) : (
                                <div className="space-y-8" ref={groupViewRef}>
                                    <div className="mb-6 text-center py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 shadow-lg">
                                        <h3 className="text-2xl font-black uppercase text-white leading-normal drop-shadow-sm">
                                            {exportTitleOverride || `NHÓM HÀNG THI ĐUA ĐẾN NGÀY ${getYesterdayDateString()}`}
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                        {sortedSelectedHeaders.map((header, index) => (
                                            <CompetitionGroupCard key={header.title} header={header as CompetitionHeader} colorScheme={PALETTE[index % PALETTE.length]} sortedEmployees={filteredEmployees as Employee[]} employeeDataMap={employeeDataMap} employeeCompetitionTargets={employeeCompetitionTargets} highlightColorMap={effectiveHighlightColorMap} viewMode={viewMode} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            </>
                        )}
                        {activeCompetitionTab === 'canhan' && (
                            <IndividualCompetitionView
                                ref={individualViewRef}
                                allEmployees={individualViewEmployees}
                                selectedEmployee={selectedIndividual}
                                onSelectIndividual={onSelectIndividual}
                                allCompetitionsByCriterion={allCompetitionsByCriterion}
                                employeeDataMap={employeeDataMap}
                                employeeCompetitionTargets={employeeCompetitionTargets}
                                selectedCompetitions={selectedCompetitions}
                                setSelectedCompetitions={setSelectedCompetitions}
                                supermarketName={supermarket || undefined}
                                revenueRows={revenueRows}
                                installmentRows={installmentRows}
                                banKemRows={banKemRows}
                                bonusData={bonusData}
                            />
                        )}
                        {activeCompetitionTab === 'tong' && (
                            <div className="space-y-10">
                                <div className="flex justify-end gap-3 no-print">
                                    <button 
                                        type="button"
                                        onClick={handleAddSummaryTable}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[11px] font-bold uppercase rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                        <span>Thêm bảng tổng hợp</span>
                                    </button>
                                </div>

                                {(Array.isArray(summaryTables) ? summaryTables : []).map((tableConfig) => (
                                    <CompetitionSummaryView 
                                        key={tableConfig.id}
                                        employees={filteredEmployees as Employee[]}
                                        selectedTitles={tableConfig.selectedTitles}
                                        onUpdateTitles={(titles) => handleUpdateTableTitles(tableConfig.id, titles)}
                                        onDelete={() => handleDeleteSummaryTable(tableConfig.id)}
                                        onRename={(newName) => handleRenameSummaryTable(tableConfig.id, newName)}
                                        allCompetitionsByCriterion={allCompetitionsByCriterion}
                                        employeeDataMap={employeeDataMap}
                                        employeeCompetitionTargets={employeeCompetitionTargets}
                                        supermarketName={supermarket || 'TongHop'}
                                        tableName={tableConfig.name}
                                    />
                                ))}

                                {(!Array.isArray(summaryTables) || summaryTables.length === 0) && (
                                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                        <p className="text-slate-500 font-bold">Chưa có bảng tổng hợp nào. Hãy bấm "Thêm bảng tổng hợp" để bắt đầu.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeCompetitionTab === 'sosanh' && (
                            <CompetitionCompareView
                                allEmployees={individualViewEmployees}
                                allCompetitionsByCriterion={allCompetitionsByCriterion}
                                employeeDataMap={employeeDataMap}
                                employeeCompetitionTargets={employeeCompetitionTargets}
                                selectedCompetitions={selectedCompetitions}
                                setSelectedCompetitions={setSelectedCompetitions}
                                supermarketName={supermarket || undefined}
                                revenueRows={revenueRows}
                                installmentRows={installmentRows}
                                banKemRows={banKemRows}
                                bonusData={bonusData}
                            />
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
});
