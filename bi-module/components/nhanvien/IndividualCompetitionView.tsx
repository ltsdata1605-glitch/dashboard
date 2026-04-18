
import React, { useRef, useState, useEffect, useMemo } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { FilterIcon, ChevronDownIcon, CameraIcon, SpinnerIcon } from '../Icons';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { Employee, Criterion, CompetitionHeader } from '../../types/nhanVienTypes';
import { roundUp, shortenName, getYesterdayDateString } from '../../utils/nhanVienHelpers';
import { Switch } from '../dashboard/DashboardWidgets';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../../services/uiService';

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.min(Math.max(value, 0), 200);
    const displayPercentage = Math.min(percentage, 100);
    let colorClass = 'bg-indigo-500';
    if (value >= 100) colorClass = 'bg-green-500';
    else if (value < 85) colorClass = 'bg-yellow-500';
    if (value < 50) colorClass = 'bg-red-500';
    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 my-1 relative overflow-hidden">
            <div className={`${colorClass} h-full rounded-full transition-all duration-500 ease-out`} style={{ width: `${displayPercentage}%` }}></div>
             {percentage > 100 && <div className="absolute top-0 left-0 h-full bg-green-300 rounded-full" style={{ width: `${Math.min(percentage - 100, 100)}%` }}></div>}
        </div>
    );
};





interface IndividualCompetitionViewProps {
    allEmployees: Employee[];
    selectedEmployee: Employee | null;
    onSelectIndividual: (emp: Employee | null) => void;
    allCompetitionsByCriterion: Record<Criterion, { headers: CompetitionHeader[] }>;
    employeeDataMap: Map<string, { name: string; department: string; values: Record<string, number | null> }>;
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    selectedCompetitions: Set<string>;
    setSelectedCompetitions: (updater: React.SetStateAction<Set<string>>) => void;
}

const PlaceholderContent: React.FC<{ title: string; message: string }> = ({ title, message }) => (
    <Card title={title}>
        <div className="mt-4 text-center py-12"><p className="mt-4 text-slate-600 max-w-md mx-auto">{message}</p></div>
    </Card>
);

export const IndividualCompetitionView: React.FC<IndividualCompetitionViewProps> = ({
    allEmployees,
    selectedEmployee,
    onSelectIndividual,
    allCompetitionsByCriterion,
    employeeDataMap,
    employeeCompetitionTargets,
    selectedCompetitions,
    setSelectedCompetitions
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const sortConfig = { key: 'completion', direction: 'desc' };
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<{current: number; total: number} | null>(null);
    const [isEmployeeSelectorOpen, setIsEmployeeSelectorOpen] = useState(false);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const employeeSelectorRef = useRef<HTMLDivElement>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');
    const filterRef = useRef<HTMLDivElement>(null);
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
            if (employeeSelectorRef.current && !employeeSelectorRef.current.contains(event.target as Node)) {
                setIsEmployeeSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);



    const groupedPerformanceData = useMemo(() => {
        if (!selectedEmployee) return {};
        const result: Partial<Record<Criterion, { name: string; originalTitle: string; target: number; actual: number; completion: number; remaining: number }[]>> = {};
        
        (['DTLK', 'DTQĐ', 'SLLK'] as Criterion[]).forEach(criterion => {
            const headers = allCompetitionsByCriterion[criterion]?.headers || [];
            const filteredHeaders = headers.filter(h => selectedCompetitions.has(h.title));
            if (filteredHeaders.length === 0) return;

            let rows = filteredHeaders.map(comp => {
                const target = employeeCompetitionTargets.get(comp.originalTitle)?.get(selectedEmployee.originalName) ?? 0;
                const actual = employeeDataMap.get(selectedEmployee.name)?.values[comp.title] ?? 0;
                const completion = target > 0 ? (actual / target) * 100 : 0;
                const remaining = actual - target;
                return { name: shortenName(comp.originalTitle, nameOverrides), originalTitle: comp.originalTitle, target, actual, completion, remaining };
            }).filter(d => d.target > 0 || d.actual > 0);
            
            rows.sort((a, b) => {
                if (sortConfig.key === 'completion') return b.completion - a.completion;
                return 0;
            });

            if (rows.length > 0) result[criterion] = rows;
        });
        return result;
    }, [selectedEmployee, allCompetitionsByCriterion, employeeDataMap, employeeCompetitionTargets, selectedCompetitions, nameOverrides]);
    
    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const originalCard = cardRef.current;
        try {
            const nameToUse = customFilename || selectedEmployee?.name || 'NhanVien';
            const filename = `ThiDua_${nameToUse.replace(/[\s/]/g, '_')}.png`;
            const blob = await exportElementAsImage(originalCard, filename, {
                mode: 'blob-only', elementsToHide: ['.js-individual-view-toolbar', '.export-button-component', '.no-print']
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
            console.error('Failed to export image', err);
            return null;
        }
    };
    
    const performBatchExport = async () => {
        if (isBatchExporting) return;
        setIsBatchExporting(true);
        const employeesToExport = allEmployees;
        setExportProgress({ current: 0, total: employeesToExport.length });
        const originalSelection = selectedEmployee;
        
        let autoAction: 'download' | 'share' | 'cancel' | null = null;
        
        try {
            for (const [index, emp] of employeesToExport.entries()) {
                onSelectIndividual(emp);
                await new Promise(resolve => setTimeout(resolve, 300));
                const action = await handleExportPNG(emp.name, autoAction);
                if (action === 'cancel') break;
                autoAction = action;
                setExportProgress({ current: index + 1, total: employeesToExport.length });
            }
        } finally {
            onSelectIndividual(originalSelection);
            setIsBatchExporting(false);
            setExportProgress(null);
        }
    };

    const handleSelectAllCompetitions = () => {
         const allRelevantTitles = (Object.values(allCompetitionsByCriterion) as { headers: CompetitionHeader[] }[]).flatMap(c => c.headers).map(h => h.title);
         setSelectedCompetitions(prev => {
             const newSet = new Set(prev);
             allRelevantTitles.forEach(t => newSet.add(t));
             return newSet;
         });
    };
    const handleDeselectAllCompetitions = () => {
        const allRelevantTitles = (Object.values(allCompetitionsByCriterion) as { headers: CompetitionHeader[] }[]).flatMap(c => c.headers).map(h => h.title);
        setSelectedCompetitions(prev => {
             const newSet = new Set(prev);
             allRelevantTitles.forEach(t => newSet.delete(t));
             return newSet;
         });
    };
    const handleToggleCompetition = (competitionTitle: string) => {
        setSelectedCompetitions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(competitionTitle)) newSet.delete(competitionTitle);
            else newSet.add(competitionTitle);
            return newSet;
        });
    };

    const filteredEmployees = useMemo(() => {
        if (!employeeSearchTerm) return allEmployees;
        return allEmployees.filter(emp => emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
    }, [allEmployees, employeeSearchTerm]);

    if (allEmployees.length === 0) return <PlaceholderContent title="Báo cáo Cá nhân" message="Không có nhân viên nào trong bộ phận đã chọn." />;
    if (!selectedEmployee) return <PlaceholderContent title="Báo cáo Cá nhân" message="Vui lòng chọn một nhân viên để xem báo cáo chi tiết." />;

    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
    const allRelevantHeaders = (Object.values(allCompetitionsByCriterion) as { headers: CompetitionHeader[] }[]).flatMap(c => c.headers);
    const activeFilterCount = allRelevantHeaders.filter(c => selectedCompetitions.has(c.title)).length;
    const totalFilterCount = allRelevantHeaders.length;
    const isFiltered = activeFilterCount < totalFilterCount;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div ref={cardRef}>
            <Card title="CHI TIẾT THI ĐUA CÁ NHÂN">
                <div className="js-individual-view-toolbar mb-4 flex flex-col md:flex-row justify-between items-center gap-4 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 w-full md:w-auto relative" ref={employeeSelectorRef}>
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Chọn nhân viên:</span>
                        <div className="relative">
                            <button onClick={() => setIsEmployeeSelectorOpen(!isEmployeeSelectorOpen)} className="flex items-center justify-between w-full md:w-64 px-3 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                <span className="truncate">{selectedEmployee ? selectedEmployee.name : "Chọn nhân viên..."}</span>
                                <ChevronDownIcon className="h-4 w-4 ml-2 text-slate-500" />
                            </button>
                            {isEmployeeSelectorOpen && (
                                <div className="absolute top-full left-0 mt-1 w-full md:w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-80">
                                    <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:border-slate-800/50 sticky top-0">
                                        <input type="text" value={employeeSearchTerm} onChange={(e) => setEmployeeSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 dark:text-slate-100" autoFocus />
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        {filteredEmployees.length > 0 ? (
                                            filteredEmployees.map(emp => (
                                                <button key={emp.originalName} onClick={() => { onSelectIndividual(emp); setIsEmployeeSelectorOpen(false); setEmployeeSearchTerm(''); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${selectedEmployee.originalName === emp.originalName ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {emp.name}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">Không tìm thấy nhân viên</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <ExportButton onExportPNG={() => handleExportPNG()} />
                    </div>
                    <div className="flex items-center justify-end gap-2 w-full md:w-auto">
                        <div className="relative" ref={filterRef}>
                            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-3 py-2 text-[11px] uppercase font-bold rounded-lg border transition-colors ${isFilterOpen || isFiltered ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                <FilterIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Lọc nhóm thi đua</span>
                                {isFiltered && <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded-full">{activeFilterCount}</span>}
                            </button>
                            {isFilterOpen && (
                                <div className="absolute right-0 top-full mt-2 w-80 max-h-[80vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                        <input type="text" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder="Tìm kiếm nhóm thi đua..." className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-800 dark:text-slate-100 placeholder-slate-400" autoFocus />
                                        <div className="flex items-center justify-between mt-2">
                                            <button onClick={handleSelectAllCompetitions} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Chọn tất cả</button>
                                            <button onClick={handleDeselectAllCompetitions} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline">Bỏ chọn tất cả</button>
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto flex-1 p-2 space-y-4">
                                        {(Object.entries(allCompetitionsByCriterion) as [string, { headers: CompetitionHeader[] }][]).map(([criterion, competitionsData]) => {
                                            const competitions = competitionsData.headers || [];
                                            if (competitions.length === 0) return null;
                                            const filteredComps = competitions.filter(c => c.title.toLowerCase().includes(filterSearch.toLowerCase()));
                                            if (filteredComps.length === 0) return null;
                                            return (
                                                <div key={criterion}>
                                                    <h5 className="px-2 mb-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tiêu chí {criterion}</h5>
                                                    <div className="space-y-1">
                                                        {filteredComps.map(comp => {
                                                            const displayCompTitle = shortenName(comp.originalTitle, nameOverrides);
                                                            return (
                                                                <div key={comp.title} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                                                    <span onClick={() => handleToggleCompetition(comp.title)} className={`text-sm select-none cursor-pointer flex-1 pr-2 ${selectedCompetitions.has(comp.title) ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                        {displayCompTitle}
                                                                    </span>
                                                                    <Switch checked={selectedCompetitions.has(comp.title)} onChange={() => handleToggleCompetition(comp.title)} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={performBatchExport} disabled={isBatchExporting} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-wait whitespace-nowrap justify-center" title="Xuất ảnh cho tất cả nhân viên">
                            {isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
                            <span>{isBatchExporting && exportProgress ? `Đang xuất ${exportProgress.current}/${exportProgress.total}...` : 'Xuất tất cả'}</span>
                        </button>
                    </div>
                </div>
                <div className="w-full overflow-hidden">
                    <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700 lg:border-x lg:border-b lg:rounded-xl lg:m-4 shadow-sm" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <h3 className="text-center text-xl font-black mb-1 mt-4 uppercase leading-normal text-indigo-700 dark:text-indigo-400 tracking-wider p-2 bg-slate-50 dark:bg-slate-900 shadow-inner export-show-border">{selectedEmployee.name} - THI ĐUA ĐẾN NGÀY {getYesterdayDateString()}</h3>
                        
                        {isMobile ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {(['DTLK', 'DTQĐ', 'SLLK'] as Criterion[]).map((criterion) => {
                                    const items = groupedPerformanceData[criterion];
                                    if (!items || items.length === 0) return null;
                                    return (
                                        <div key={criterion}>
                                            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700">
                                                <h4 className="text-[11px] font-black uppercase text-slate-800 dark:text-white tracking-widest">Tiêu chí: {criterion}</h4>
                                            </div>
                                            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                                {items.map((item, index) => {
                                                    const remainingColor = item.remaining >= 0 ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 shadow-inner' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 shadow-inner border border-rose-100 dark:border-rose-900/30';
                                                    return (
                                                        <div key={`${criterion}-${item.originalTitle}`} className="px-4 py-3 bg-white dark:bg-slate-900">
                                                            <div className="flex justify-between items-start mb-2 gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 w-5 h-5 flex items-center justify-center rounded-full shrink-0">{index + 1}</span>
                                                                    <span className="font-bold text-[13px] text-indigo-700 dark:text-indigo-400 leading-tight">{item.name}</span>
                                                                </div>
                                                                <div className={`px-2 py-1.5 rounded-lg shrink-0 text-right min-w-[70px] ${remainingColor}`}>
                                                                    <span className="block text-[8px] font-bold uppercase mb-0.5 opacity-80">Còn Lại</span>
                                                                    <span className="block text-[12px] font-black tabular-nums leading-none tracking-tight">{f.format(roundUp(item.remaining))}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50 mt-1">
                                                                <div className="flex justify-between items-center text-[10px]">
                                                                    <span className="text-slate-500 font-bold uppercase">Mục Tiêu / Thực Hiện</span>
                                                                    <span className="font-black tabular-nums tracking-wide flex items-baseline gap-1">
                                                                        <span className="text-slate-400">{f.format(roundUp(item.target))}</span>
                                                                        <span className="text-slate-300 dark:text-slate-600 text-[9px] mx-0.5">/</span>
                                                                        <span className="text-indigo-600 dark:text-indigo-400 text-[11px]">{f.format(roundUp(item.actual))}</span>
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-3 mt-1">
                                                                    <div className="flex-1"><ProgressBar value={item.completion} /></div>
                                                                    <span className={`text-[13px] font-black w-14 text-right tabular-nums ${item.completion >= 100 ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>{roundUp(item.completion).toFixed(0)}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                                {Object.keys(groupedPerformanceData).length === 0 && (
                                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Chưa có chương trình thi đua nào được chọn từ bộ lọc hoặc không có dữ liệu cho nhân viên này.</div>
                                )}
                            </div>
                        ) : (
                        <table className="w-full border-collapse compact-export-table">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-bold text-slate-500 tracking-wider">
                                <tr>
                                    <th className="text-center px-3 py-2 border-r border-slate-200 dark:border-slate-700 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 w-12 align-middle">#</th>
                                    <th className="text-left px-3 py-2 border-r border-slate-200 dark:border-slate-700 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 min-w-[200px] align-middle">NHÓM THI ĐUA</th>
                                    <th className="text-center px-3 py-2 border-r border-slate-200 dark:border-slate-700 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 align-middle">MỤC TIÊU</th>
                                    <th className="text-center px-3 py-2 border-r border-slate-200 dark:border-slate-700 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 align-middle">THỰC HIỆN</th>
                                    <th className="text-center px-3 py-2 border-r border-slate-200 dark:border-slate-700 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 w-40 align-middle">% HOÀN THÀNH</th>
                                    <th className="text-center px-3 py-2 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 align-middle">CÒN LẠI</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[#1c1c1e] divide-y divide-slate-100 dark:divide-slate-700 text-[12px]">
                               {(['DTLK', 'DTQĐ', 'SLLK'] as Criterion[]).map((criterion, _criterionIndex) => {
                                   const items = groupedPerformanceData[criterion];
                                   if (!items || items.length === 0) return null;
                                   return (
                                       <React.Fragment key={criterion}>
                                           <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-white shadow-inner font-extrabold border-t-[3px] border-t-slate-200"><td colSpan={6} className="px-3 py-2 text-[11px] uppercase tracking-wider">Tiêu chí: {criterion}</td></tr>
                                           {items.map((item, index) => {
                                               const remainingColor = item.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400';
                                               return (
                                                   <tr key={`${criterion}-${item.originalTitle}`} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer">
                                                       <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-700/50">{index + 1}</td>
                                                       <td className="px-3 py-2 font-bold text-indigo-600 dark:text-indigo-400 border-r border-slate-100 dark:border-slate-700/50 whitespace-nowrap">
                                                           {item.name}
                                                       </td>
                                                       <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-700/50 tabular-nums">{f.format(roundUp(item.target))}</td>
                                                       <td className="px-3 py-2 text-center font-semibold text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-700/50 tabular-nums">{f.format(roundUp(item.actual))}</td>
                                                       <td className="px-3 py-2 text-center w-40 border-r border-slate-100 dark:border-slate-700/50 tabular-nums"><div className="flex items-center gap-2 justify-center"><span className="font-bold text-center w-10">{roundUp(item.completion).toFixed(0)}%</span><div className="w-16 hidden sm:block"><ProgressBar value={item.completion} /></div></div></td>
                                                       <td className={`px-3 py-2 text-center font-semibold ${remainingColor} tabular-nums`}>{f.format(roundUp(item.remaining))}</td>
                                                   </tr>
                                               );
                                           })}
                                       </React.Fragment>
                                   )
                               })}
                               {Object.keys(groupedPerformanceData).length === 0 && (<tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">Chưa có chương trình thi đua nào được chọn từ bộ lọc hoặc không có dữ liệu cho nhân viên này.</td></tr>)}
                            </tbody>
                        </table>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};
