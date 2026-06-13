
import React, { useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { FilterIcon, TrashIcon, PencilIcon, XIcon, CheckCircleIcon, PercentIcon, HashIcon } from '../Icons';
import { Employee, CompetitionHeader, Criterion } from '../../types/nhanVienTypes';
import { roundUp, getYesterdayDateString, shortenName } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { Switch } from '../dashboard/DashboardWidgets';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../../../services/uiService';
import { ConfirmDialog } from '../../../../components/shared/ui/ConfirmDialog';

interface CompetitionSummaryViewProps {
    employees: Employee[];
    selectedTitles: string[];
    onUpdateTitles: (titles: string[]) => void;
    onDelete: () => void;
    onRename: (newName: string) => void;
    allCompetitionsByCriterion: Record<Criterion, { headers: CompetitionHeader[] }>;
    employeeDataMap: Map<string, { name: string; department: string; values: Record<string, number | null> }>;
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    supermarketName: string;
    tableName: string;
}

export interface CompetitionSummaryViewHandle {
    handleExportPNG: (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null) => Promise<'download' | 'share' | 'cancel' | null>;
}

const CompetitionSummaryView = forwardRef<CompetitionSummaryViewHandle, CompetitionSummaryViewProps>(({
    employees,
    selectedTitles,
    onUpdateTitles,
    onDelete,
    onRename,
    allCompetitionsByCriterion,
    employeeDataMap,
    employeeCompetitionTargets,
    supermarketName,
    tableName
}, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(tableName);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // States for sorting
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'tongBot', direction: 'asc' });
    const [showPercent, setShowPercent] = useState(false);

    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const formatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
    const avgFormatter = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

    useEffect(() => {
        setTempName(tableName);
    }, [tableName]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const allHeaders = useMemo(() => {
        return (Object.values(allCompetitionsByCriterion) as { headers: CompetitionHeader[] }[])
            .flatMap(c => c.headers);
    }, [allCompetitionsByCriterion]);

    const visibleHeaders = useMemo(() => {
        const headerMap = new Map(allHeaders.map(h => [h.title, h]));
        return selectedTitles
            .map(title => headerMap.get(title))
            .filter((h): h is CompetitionHeader => !!h);
    }, [allHeaders, selectedTitles]);

    // Map header title to originalTitle for target lookup
    const headerOriginalTitleMap = useMemo(() => {
        return new Map(allHeaders.map(h => [h.title, h.originalTitle]));
    }, [allHeaders]);

    // Compute column averages across all employees
    const columnAverages = useMemo(() => {
        const averages: Record<string, { actual: number; percent: number }> = {};
        visibleHeaders.forEach(header => {
            let sumActual = 0;
            let sumPercent = 0;
            employees.forEach(emp => {
                const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                const ht = target > 0 ? (actual / target) * 100 : 0;
                sumActual += actual;
                sumPercent += ht;
            });
            averages[header.title] = {
                actual: employees.length > 0 ? sumActual / employees.length : 0,
                percent: employees.length > 0 ? sumPercent / employees.length : 0
            };
        });
        return averages;
    }, [visibleHeaders, employees, employeeDataMap, employeeCompetitionTargets]);

    // Compute dense ranks for each column (descending order, excluding values <= 0)
    const columnRankings = useMemo(() => {
        const rankings: Record<string, Map<string, number>> = {};
        visibleHeaders.forEach(header => {
            const empValues = employees.map(emp => {
                const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                const ht = target > 0 ? (actual / target) * 100 : 0;
                const value = showPercent ? ht : actual;
                return { empName: emp.name, value };
            });

            // Sort descending
            empValues.sort((a, b) => b.value - a.value);

            // Assign dense ranks
            const rankMap = new Map<string, number>();
            let currentRank = 0;
            let prevValue = -1;
            empValues.forEach((item) => {
                if (item.value <= 0) {
                    rankMap.set(item.empName, 999);
                    return;
                }
                if (item.value !== prevValue) {
                    currentRank++;
                    prevValue = item.value;
                }
                rankMap.set(item.empName, currentRank);
            });
            rankings[header.title] = rankMap;
        });
        return rankings;
    }, [visibleHeaders, employees, employeeDataMap, employeeCompetitionTargets, showPercent]);

    // Helper to calculate "Tổng BOT" for an employee (number of categories below column average)
    const getEmployeeTongBot = (empName: string, empOriginalName: string) => {
        let count = 0;
        visibleHeaders.forEach(header => {
            const actual = employeeDataMap.get(empName)?.values[header.title] ?? 0;
            const target = employeeCompetitionTargets.get(header.originalTitle)?.get(empOriginalName) ?? 0;
            const ht = target > 0 ? (actual / target) * 100 : 0;
            const averages = columnAverages[header.title];
            if (averages) {
                if (showPercent) {
                    if (ht < averages.percent) {
                        count++;
                    }
                } else {
                    if (actual < averages.actual) {
                        count++;
                    }
                }
            }
        });
        return count;
    };

    // Helper to calculate "NoSale" for an employee (number of categories with actual value = 0)
    const getEmployeeNoSale = (empName: string) => {
        let count = 0;
        visibleHeaders.forEach(header => {
            const actual = employeeDataMap.get(empName)?.values[header.title] ?? 0;
            if (actual === 0) {
                count++;
            }
        });
        return count;
    };

    // Calculate the threshold for TOP 30% of TỔNG BOT (excluding 0 values)
    const tongBotRedCutoff = useMemo(() => {
        const botValues = employees.map(emp => getEmployeeTongBot(emp.name, emp.originalName));
        botValues.sort((a, b) => b - a); // descending order
        const thresholdIndex = Math.max(0, Math.ceil(employees.length * 0.3) - 1);
        return botValues[thresholdIndex] ?? 0;
    }, [employees, columnAverages, employeeDataMap, employeeCompetitionTargets, showPercent]);

    // Sort employees list based on current sortConfig
    const sortedEmployees = useMemo(() => {
        if (!sortConfig) return employees;
        const { key, direction } = sortConfig;
        const sorted = [...employees];
        sorted.sort((a, b) => {
            if (key === 'employee') {
                return direction === 'asc' 
                    ? a.name.localeCompare(b.name, 'vi') 
                    : b.name.localeCompare(a.name, 'vi');
            } else if (key === 'tongBot') {
                const botA = getEmployeeTongBot(a.name, a.originalName);
                const botB = getEmployeeTongBot(b.name, b.originalName);
                return direction === 'asc' ? botA - botB : botB - botA;
            } else if (key === 'noSale') {
                const valA = getEmployeeNoSale(a.name);
                const valB = getEmployeeNoSale(b.name);
                return direction === 'asc' ? valA - valB : valB - valA;
            } else {
                const getVal = (emp: Employee) => {
                    const actual = employeeDataMap.get(emp.name)?.values[key] ?? 0;
                    if (showPercent) {
                        const origTitle = headerOriginalTitleMap.get(key) || '';
                        const target = employeeCompetitionTargets.get(origTitle)?.get(emp.originalName) ?? 0;
                        return target > 0 ? (actual / target) * 100 : 0;
                    }
                    return actual;
                };
                const valA = getVal(a);
                const valB = getVal(b);
                return direction === 'asc' ? valA - valB : valB - valA;
            }
        });
        return sorted;
    }, [employees, sortConfig, employeeDataMap, employeeCompetitionTargets, showPercent, headerOriginalTitleMap]);

    // Handle sort toggling
    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (!current || current.key !== key) {
                return { key, direction: key === 'employee' ? 'asc' : 'desc' };
            }
            if (key === 'employee') {
                if (current.direction === 'asc') return { key, direction: 'desc' };
                return null;
            } else {
                if (current.direction === 'desc') return { key, direction: 'asc' };
                return null;
            }
        });
    };

    // Render sort arrow indicators
    const getSortIndicator = (key: string) => {
        if (sortConfig?.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };

    // Calculate conditional cell coloring: Red (< avg), Green (TOP 1-3), Yellow (TOP 4-6)
    const getCellStyle = (actual: number, ht: number, headerTitle: string, empName: string) => {
        const value = showPercent ? ht : actual;
        const avg = showPercent ? (columnAverages[headerTitle]?.percent ?? 0) : (columnAverages[headerTitle]?.actual ?? 0);
        
        if (value <= 0) {
            if (avg > 0) {
                return 'text-rose-600 dark:text-rose-400 font-bold';
            }
            return 'text-slate-300 dark:text-slate-600';
        }

        const rank = columnRankings[headerTitle]?.get(empName) ?? 999;
        if (rank <= 3) {
            return 'text-emerald-600 dark:text-emerald-400 font-extrabold';
        }
        if (rank <= 6) {
            return 'text-amber-500 dark:text-amber-405 font-bold';
        }
        
        if (value < avg) {
            return 'text-rose-600 dark:text-rose-400 font-bold';
        }
        
        return 'text-slate-700 dark:text-slate-300 font-medium';
    };

    useImperativeHandle(ref, () => ({
        handleExportPNG
    }));

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const original = cardRef.current;
        try {
            const nameToUse = customFilename || tableName || 'BaoCao';
            const filename = `ThiDua_${nameToUse.replace(/[\s/]/g, '_')}_${supermarketName}.png`;
            const blob = await exportElementAsImage(original, filename, {
                mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component']
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

    const handleToggleTitle = (title: string) => {
        const next = selectedTitles.includes(title) 
            ? selectedTitles.filter(t => t !== title)
            : [...selectedTitles, title];
        onUpdateTitles(next);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        const updatedTitles = [...selectedTitles];
        const [draggedItem] = updatedTitles.splice(draggedIndex, 1);
        updatedTitles.splice(targetIndex, 0, draggedItem);

        onUpdateTitles(updatedTitles);
        setDraggedIndex(null);
    };

    const confirmDelete = () => {
        onDelete();
        setShowDeleteConfirm(false);
    };

    const cardTitle = (
        <div className="flex flex-col items-start leading-none py-1 w-full relative z-30">
            {isEditingName ? (
                <div className="flex items-center gap-2 no-print">
                    <input 
                        type="text" 
                        value={tempName} 
                        onChange={(e) => setTempName(e.target.value)} 
                        className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded focus:ring-1 focus:ring-indigo-500 w-48 text-slate-800 dark:text-slate-100"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && (onRename(tempName), setIsEditingName(false))}
                    />
                    <button type="button" onClick={() => { onRename(tempName); setIsEditingName(false); }} className="text-green-600"><CheckCircleIcon className="h-6 w-6" /></button>
                    <button type="button" onClick={() => { setTempName(tableName); setIsEditingName(false); }} className="text-slate-400"><XIcon className="h-6 w-6" /></button>
                </div>
            ) : (
                <span className="js-report-title text-2xl font-black uppercase text-slate-800 dark:text-white mt-1">{tableName} - ĐẾN {getYesterdayDateString()}</span>
            )}
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mt-1 font-bold no-print">Dữ liệu thi đua được tổng hợp theo thời gian thực từ BI.</span>
        </div>
    );

    const headerActions = (
        <div className="flex items-center gap-2 relative z-30">
            <div className="relative" ref={filterRef}>
                <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)} 
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                    title="Chọn cột hiển thị"
                >
                    <FilterIcon className="h-5 w-5" />
                    {selectedTitles.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-indigo-600 text-white font-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                            {selectedTitles.length}
                        </span>
                    )}
                </button>
                {isFilterOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 max-h-80 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-1">
                        <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
                            <input 
                                type="text" 
                                value={filterSearch} 
                                onChange={(e) => setFilterSearch(e.target.value)} 
                                placeholder="Tìm tiêu chí..."
                                className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                            />
                        </div>
                        {allHeaders
                            .filter(h => h.originalTitle.toLowerCase().includes(filterSearch.toLowerCase()))
                            .map(header => {
                                const isSelected = selectedTitles.includes(header.title);
                                return (
                                    <label key={header.title} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                                        <Switch 
                                            checked={isSelected} 
                                            onChange={() => handleToggleTitle(header.title)}
                                        />
                                        <span className="truncate">{shortenName(header.originalTitle, nameOverrides)}</span>
                                    </label>
                                );
                            })}
                    </div>
                )}
            </div>

            <button 
                type="button" 
                onClick={() => setIsEditingName(true)} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Đổi tên bảng"
            >
                <PencilIcon className="h-5 w-5" />
            </button>

            <button 
                type="button" 
                onClick={() => setShowDeleteConfirm(true)} 
                className="p-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400"
                title="Xóa bảng"
            >
                <TrashIcon className="h-5 w-5" />
            </button>

            <div className="h-5 w-px bg-slate-200 dark:border-slate-700 mx-1" />

            <button 
                onClick={() => setShowPercent(!showPercent)}
                className={`p-1.5 rounded border transition-all ${showPercent ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'}`}
                title={showPercent ? "Hiển thị giá trị thực tế" : "Hiển thị phần trăm hoàn thành"}
            >
                {showPercent ? <HashIcon className="h-4 w-4" /> : <PercentIcon className="h-4 w-4" />}
            </button>

            <ExportButton onExportPNG={async () => { await handleExportPNG(); }} />
        </div>
    );

    return (
        <div ref={cardRef} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card noPadding title={cardTitle} actionButton={headerActions}>
                {selectedTitles.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-900/30">
                        Bấm biểu tượng lọc <FilterIcon className="inline h-4 w-4" /> để chọn các cột dữ liệu hiển thị cho bảng này.
                    </div>
                ) : (
                    <div className="w-full overflow-hidden px-4 pb-4">
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <table className="min-w-max w-full table-auto border-collapse compact-export-table">
                                <thead>
                                    <tr className="text-[11px] font-black uppercase tracking-wider">
                                        <th 
                                            onClick={() => handleSort('employee')}
                                            className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-left border-r border-b-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 min-w-[120px] align-middle cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span>Nhân viên</span>
                                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{getSortIndicator('employee')}</span>
                                            </div>
                                        </th>
                                        {(() => {
                                            const colors = ['sky', 'emerald', 'amber', 'violet', 'rose', 'teal'];
                                            return visibleHeaders.map((header, index) => {
                                                const color = colors[index % colors.length];
                                                const isDragging = draggedIndex === index;
                                                return (
                                                    <th 
                                                        key={header.title} 
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, index)}
                                                        onDragOver={(e) => handleDragOver(e, index)}
                                                        onDrop={(e) => handleDrop(e, index)}
                                                        onDragEnd={() => setDraggedIndex(null)}
                                                        onClick={() => handleSort(header.title)}
                                                        className={`px-1.5 py-1.5 text-center border-r border-b-2 border-slate-200 dark:border-slate-700 bg-${color}-50 dark:bg-${color}-950/30 text-${color}-700 dark:text-${color}-400 min-w-[65px] leading-tight align-middle cursor-pointer hover:bg-${color}-100 dark:hover:bg-${color}-900/50 transition-all select-none ${isDragging ? 'opacity-30 scale-95 border-dashed border-indigo-500' : ''}`}
                                                        title="Kéo thả để sắp xếp cột — Click để sắp xếp dòng"
                                                    >
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal no-print mr-0.5">⋮⋮</span>
                                                            <span>{shortenName(header.originalTitle, nameOverrides)}</span>
                                                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 ml-0.5">{getSortIndicator(header.title)}</span>
                                                        </div>
                                                    </th>
                                                );
                                            });
                                        })()}
                                        <th 
                                            onClick={() => handleSort('tongBot')}
                                            className="px-1.5 py-1.5 text-center border-r border-b-2 border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 min-w-[55px] leading-tight align-middle cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>BOT</span>
                                                <span className="text-[9px] font-bold text-red-600 dark:text-red-400 ml-0.5">{getSortIndicator('tongBot')}</span>
                                            </div>
                                        </th>
                                        <th 
                                            onClick={() => handleSort('noSale')}
                                            className="px-1.5 py-1.5 text-center border-r border-b-2 border-slate-200 dark:border-slate-700 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 min-w-[60px] leading-tight align-middle cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/60 transition-all"
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <span>NoSale</span>
                                                <span className="text-[9px] font-bold text-red-600 dark:text-red-400 ml-0.5">{getSortIndicator('noSale')}</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {sortedEmployees.map((emp, idx) => {
                                        const isEven = idx % 2 === 0;
                                        const zebraClass = isEven ? 'bg-white dark:bg-[#1c1c1e]' : 'bg-slate-50/70 dark:bg-slate-800/30';
                                        const tongBot = getEmployeeTongBot(emp.name, emp.originalName);
                                        return (
                                            <tr key={emp.originalName} className={`${zebraClass} hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-700`}>
                                                <td 
                                                    className={`sticky left-0 z-10 ${zebraClass} px-2 py-1 font-bold border-r border-slate-100 dark:border-slate-700/50 whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-[13px] text-left leading-tight min-w-[120px]`}
                                                    style={{ color: 'var(--color-sky-600)' }}
                                                >
                                                    {emp.name}
                                                </td>
                                                {visibleHeaders.map(header => {
                                                    const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                                                    const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                                                    const ht = target > 0 ? (actual / target) * 100 : 0;
                                                    const cellColorClass = getCellStyle(actual, ht, header.title, emp.name);
                                                    return (
                                                        <td key={header.title} className="px-1.5 py-1 border-r border-slate-100 dark:border-slate-700/50 text-center text-[13px] whitespace-nowrap tabular-nums">
                                                            {showPercent ? (
                                                                actual > 0 && target > 0 ? (
                                                                    <span className={cellColorClass}>{roundUp(ht)}%</span>
                                                                ) : (
                                                                    <span className="text-slate-300">-</span>
                                                                )
                                                            ) : (
                                                                <span className={cellColorClass}>{actual > 0 ? formatter.format(roundUp(actual)) : '-'}</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                {(() => {
                                                    const isRed = tongBot > 0 && tongBotRedCutoff > 0 && tongBot >= tongBotRedCutoff;
                                                    const tongBotColorClass = isRed 
                                                        ? 'text-rose-600 dark:text-rose-455 font-extrabold bg-rose-50/20 dark:bg-rose-950/10' 
                                                        : 'text-slate-800 dark:text-slate-200 font-bold bg-slate-50/50 dark:bg-slate-900/30';
                                                    return (
                                                        <td className={`px-1.5 py-1 border-r border-slate-100 dark:border-slate-700/50 text-center text-[13px] whitespace-nowrap tabular-nums ${tongBotColorClass}`}>
                                                            {tongBot > 0 ? tongBot : '-'}
                                                        </td>
                                                    );
                                                })()}
                                                {(() => {
                                                    const noSale = getEmployeeNoSale(emp.name);
                                                    return (
                                                        <td className="px-1.5 py-1 border-r border-slate-100 dark:border-slate-700/50 text-center text-[13px] whitespace-nowrap font-bold text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/30 tabular-nums">
                                                            {noSale > 0 ? noSale : '-'}
                                                        </td>
                                                    );
                                                })()}
                                            </tr>
                                        );
                                    })}
                                    {/* TRUNG BÌNH row */}
                                    <tr className="bg-amber-50 dark:bg-amber-950/20 font-bold text-amber-800 dark:text-amber-300 border-t-2 border-slate-300 dark:border-slate-600">
                                        <td className="sticky left-0 z-10 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 text-left uppercase text-[13px] tracking-wider border-r border-slate-200 dark:border-slate-700/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[120px]">
                                            TRUNG BÌNH
                                        </td>
                                        {visibleHeaders.map(header => {
                                            const averages = columnAverages[header.title];
                                            return (
                                                <td key={header.title} className="px-1.5 py-1 text-center text-[13px] border-r border-slate-200 dark:border-slate-700/50 whitespace-nowrap tabular-nums">
                                                    {showPercent ? (
                                                        averages && averages.percent > 0 ? (
                                                            <span>{averages.percent.toFixed(1)}%</span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )
                                                    ) : (
                                                        <span>{averages && averages.actual > 0 ? avgFormatter.format(averages.actual) : '-'}</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-1.5 py-1 text-center text-[13px] border-r border-slate-200 dark:border-slate-700/50 whitespace-nowrap font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                            {(() => {
                                                const totalBotSum = employees.reduce((sum, emp) => sum + getEmployeeTongBot(emp.name, emp.originalName), 0);
                                                const avgBot = employees.length > 0 ? totalBotSum / employees.length : 0;
                                                return avgBot > 0 ? avgFormatter.format(avgBot) : '-';
                                            })()}
                                        </td>
                                        <td className="px-1.5 py-1 text-center text-[13px] border-r border-slate-200 dark:border-slate-700/50 whitespace-nowrap font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                            {(() => {
                                                const totalNoSaleSum = employees.reduce((sum, emp) => sum + getEmployeeNoSale(emp.name), 0);
                                                const avgNoSale = employees.length > 0 ? totalNoSaleSum / employees.length : 0;
                                                return avgNoSale > 0 ? avgFormatter.format(avgNoSale) : '-';
                                            })()}
                                        </td>
                                    </tr>
                                    {/* Grand Total — indigo accent */}
                                    <tr className="bg-indigo-50 dark:bg-indigo-900/30 font-extrabold text-indigo-800 dark:text-indigo-300 border-t-2 border-indigo-200 dark:border-indigo-800">
                                         <td className="sticky left-0 z-10 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-left uppercase text-[13px] tracking-wider border-r border-indigo-200 dark:border-indigo-800/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[120px]">
                                             TỔNG
                                         </td>
                                         {visibleHeaders.map(header => {
                                             const totalActual = employees.reduce((sum, emp) => sum + (employeeDataMap.get(emp.name)?.values[header.title] ?? 0), 0);
                                             const totalTarget = employees.reduce((sum, emp) => sum + (employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0), 0);
                                             const totalHt = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
                                             
                                             return (
                                                 <td key={header.title} className="px-1.5 py-1 text-center text-[13px] border-r border-indigo-200 dark:border-indigo-800/50 whitespace-nowrap tabular-nums">
                                                     {showPercent ? (
                                                         totalActual > 0 && totalTarget > 0 ? (
                                                             <span>{roundUp(totalHt).toFixed(0)}%</span>
                                                         ) : (
                                                             <span className="text-indigo-300 dark:text-indigo-700">-</span>
                                                         )
                                                     ) : (
                                                         <span>{totalActual > 0 ? formatter.format(roundUp(totalActual)) : '-'}</span>
                                                     )}
                                                 </td>
                                             );
                                         })}
                                         <td className="px-1.5 py-1 text-center text-[13px] border-r border-indigo-200 dark:border-indigo-800/50 whitespace-nowrap tabular-nums">
                                             {(() => {
                                                 const totalBotSum = employees.reduce((sum, emp) => sum + getEmployeeTongBot(emp.name, emp.originalName), 0);
                                                 return totalBotSum > 0 ? formatter.format(totalBotSum) : '-';
                                             })()}
                                         </td>
                                         <td className="px-1.5 py-1 text-center text-[13px] border-r border-indigo-200 dark:border-indigo-800/50 whitespace-nowrap tabular-nums">
                                             {(() => {
                                                 const totalNoSaleSum = employees.reduce((sum, emp) => sum + getEmployeeNoSale(emp.name), 0);
                                                 return totalNoSaleSum > 0 ? formatter.format(totalNoSaleSum) : '-';
                                             })()}
                                         </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Card>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDelete}
                title="Xóa bảng thi đua?"
                message={`Bạn có thực sự muốn xoá bảng "${tableName}" không? Thao tác này không thể hoàn tác.`}
                confirmText="Xóa bảng"
                variant="danger"
            />
        </div>
    );
});

export default CompetitionSummaryView;
