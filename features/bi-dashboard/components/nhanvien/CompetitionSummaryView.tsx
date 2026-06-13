
import React, { useMemo, useRef, useState, useEffect } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { FilterIcon, TrashIcon, PencilIcon, XIcon, CheckCircleIcon, PercentIcon, HashIcon } from '../Icons';
import { Employee, CompetitionHeader, Criterion } from '../../types/nhanVienTypes';
import { roundUp, getYesterdayDateString, shortenName } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { Switch } from '../dashboard/DashboardWidgets';
import { exportElementAsImage } from '../../../../services/uiService';
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

const CompetitionSummaryView: React.FC<CompetitionSummaryViewProps> = ({
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
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(tableName);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const formatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

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

    const getHtColor = (val: number) => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dayOfMonth = now.getDate();
        const progress = ((dayOfMonth - 1) / daysInMonth) * 100;
        if (val >= progress + 20) return 'text-green-600 dark:text-green-400 font-bold';
        if (val < progress) return 'text-red-600 dark:text-red-400 font-bold';
        return 'text-amber-600 dark:text-amber-400 font-bold';
    };

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async () => {
        if (!cardRef.current) return;
        const original = cardRef.current;
        try {
            const filename = `ThiDua_${tableName.replace(/\s+/g, '_')}_${supermarketName}.png`;
            const blob = await exportElementAsImage(original, filename, {
                mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component']
            });
            if (blob) showExportOptions(blob, filename);
        } catch (err) {
            console.error('Failed to export image', err);
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

    // Hàm xử lý xoá bảng với các biện pháp bảo vệ sự kiện
    const handleConfirmDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Ngăn chặn sự kiện lan lên Card
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        onDelete();
        setShowDeleteConfirm(false);
    };

    const [showPercent, setShowPercent] = useState(false);

    const headerActions = (
        <div className="flex items-center gap-1.5 no-print relative z-[30]">
            {/* Toggle % / Luỹ kế */}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowPercent(!showPercent); }}
                className={`h-6 w-6 p-1 rounded transition-colors ${showPercent ? 'text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                title={showPercent ? 'Đang hiển thị %HT — Bấm để xem Luỹ kế (SL)' : 'Đang hiển thị Luỹ kế (SL) — Bấm để xem %HT'}
            >
                {showPercent ? (
                    <PercentIcon className="h-4 w-4 pointer-events-none mx-auto" />
                ) : (
                    <HashIcon className="h-4 w-4 pointer-events-none mx-auto" />
                )}
            </button>
            
            <div className="relative" ref={filterRef}>
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); }}
                    className={`relative h-6 w-6 p-1 rounded transition-colors ${isFilterOpen || selectedTitles.length > 0 ? 'text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    title="Lọc nhóm thi đua cho bảng này"
                >
                    <FilterIcon className="h-4 w-4 pointer-events-none mx-auto" />
                    {selectedTitles.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[8px] font-black px-1 rounded-full">{selectedTitles.length}</span>
                    )}
                </button>
                {isFilterOpen && (
                    <div className="absolute right-0 mt-2 w-72 max-h-[80vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[100] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700">
                            <input 
                                type="text" 
                                value={filterSearch} 
                                onChange={e => setFilterSearch(e.target.value)}
                                placeholder="Tìm nhóm thi đua..."
                                className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 dark:text-slate-100"
                                autoFocus
                            />
                        </div>
                        <div className="overflow-y-auto p-2 space-y-4">
                            {(Object.entries(allCompetitionsByCriterion) as [Criterion, { headers: CompetitionHeader[] }][]).map(([criterion, data]) => {
                                const comps = data.headers.filter(h => h.title.toLowerCase().includes(filterSearch.toLowerCase()));
                                if (comps.length === 0) return null;
                                return (
                                    <div key={criterion}>
                                        <p className="px-2 mb-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">{criterion}</p>
                                        {comps.map(comp => (
                                            <div key={comp.title} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750/50 cursor-pointer" onClick={() => handleToggleTitle(comp.title)}>
                                                <span className={`text-xs ${selectedTitles.includes(comp.title) ? 'font-bold text-indigo-600' : 'text-slate-600 dark:text-slate-400'}`}>{shortenName(comp.originalTitle, nameOverrides)}</span>
                                                <Switch checked={selectedTitles.includes(comp.title)} onChange={() => {}} />
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }} 
                className="h-6 w-6 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" 
                title="Sửa tên bảng"
            >
                <PencilIcon className="h-4 w-4 pointer-events-none mx-auto" />
            </button>
            <button 
                type="button" 
                onClick={handleConfirmDelete} 
                className="h-6 w-6 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                title="Xóa bảng"
            >
                <TrashIcon className="h-4 w-4 pointer-events-none mx-auto" />
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            <ExportButton onExportPNG={handleExportPNG} />
        </div>
    );

    const cardTitle = (
        <div className="flex flex-col items-start leading-none py-1">
            {isEditingName ? (
                <div className="flex items-center gap-2 no-print">
                    <input 
                        value={tempName} 
                        onChange={e => setTempName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (onRename(tempName), setIsEditingName(false))}
                        className="bg-slate-50 dark:bg-slate-800 border-b-2 border-indigo-500 outline-none px-2 py-1 text-lg font-black uppercase text-indigo-700 dark:text-indigo-400"
                        autoFocus
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
                            <table className="w-full border-collapse compact-export-table">
                                <thead>
                                    <tr className="text-[11px] font-black uppercase tracking-wider">
                                        <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-left border-r border-b-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 min-w-[160px] align-middle">
                                            Nhân viên
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
                                                        className={`px-1.5 py-1.5 text-center border-r border-b-2 border-slate-200 dark:border-slate-700 bg-${color}-50 dark:bg-${color}-950/30 text-${color}-700 dark:text-${color}-400 min-w-[100px] leading-tight align-middle cursor-grab active:cursor-grabbing select-none hover:bg-${color}-100 dark:hover:bg-${color}-900/50 transition-all ${isDragging ? 'opacity-30 scale-95 border-dashed border-indigo-500' : ''}`}
                                                        title="Kéo thả để sắp xếp lại cột"
                                                    >
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal no-print">⋮⋮</span>
                                                            <span>{shortenName(header.originalTitle, nameOverrides)}</span>
                                                        </div>
                                                    </th>
                                                );
                                            });
                                        })()}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {employees.map((emp, idx) => {
                                        const isEven = idx % 2 === 0;
                                        const zebraClass = isEven ? 'bg-white dark:bg-[#1c1c1e]' : 'bg-slate-50/70 dark:bg-slate-800/30';
                                        return (
                                            <tr key={emp.originalName} className={`${zebraClass} hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-700`}>
                                                <td 
                                                    className={`sticky left-0 z-10 ${zebraClass} px-2 py-1 font-bold border-r border-slate-100 dark:border-slate-700/50 whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-[13px] text-left leading-tight`}
                                                    style={{ color: 'var(--color-sky-600)' }}
                                                >
                                                    {emp.name}
                                                </td>
                                                {visibleHeaders.map(header => {
                                                    const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                                                    const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                                                    const ht = target > 0 ? (actual / target) * 100 : 0;
                                                    return (
                                                        <td key={header.title} className="px-1.5 py-1 border-r border-slate-100 dark:border-slate-700/50 text-center text-[13px] whitespace-nowrap tabular-nums">
                                                            {showPercent ? (
                                                                actual > 0 && target > 0 ? (
                                                                    <span className={getHtColor(ht)}>{roundUp(ht)}%</span>
                                                                ) : (
                                                                    <span className="text-slate-300">-</span>
                                                                )
                                                            ) : (
                                                                <span className="font-bold text-slate-700 dark:text-slate-300">{actual > 0 ? formatter.format(roundUp(actual)) : '-'}</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                    {/* Grand Total — indigo accent */}
                                    <tr className="bg-indigo-50 dark:bg-indigo-900/30 font-extrabold text-indigo-800 dark:text-indigo-300 border-t-2 border-indigo-200 dark:border-indigo-800">
                                         <td className="sticky left-0 z-10 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-left uppercase text-[13px] tracking-wider border-r border-indigo-200 dark:border-indigo-800/50 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
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
};

export default CompetitionSummaryView;
