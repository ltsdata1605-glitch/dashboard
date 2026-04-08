
import React, { useMemo, useRef, useState, useEffect } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { FilterIcon, TrashIcon, PencilIcon, XIcon, CheckCircleIcon } from '../Icons';
import { Employee, CompetitionHeader, Criterion } from '../../types/nhanVienTypes';
import { roundUp, getYesterdayDateString, shortenName } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { Switch } from '../dashboard/DashboardWidgets';

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
        const titleSet = new Set(selectedTitles);
        return allHeaders.filter(h => titleSet.has(h.title));
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

    const handleExportPNG = async () => {
        if (!cardRef.current || !(window as any).html2canvas) return;
        const original = cardRef.current;
        const clone = original.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.width = 'max-content';
        clone.style.maxWidth = 'none';
        if (document.documentElement.classList.contains('dark')) clone.classList.add('dark');
        clone.classList.add('export-mode');
        clone.querySelectorAll('.no-print, .export-button-component').forEach(el => (el as HTMLElement).style.display = 'none');
        const table = clone.querySelector('table');
        if (table) {
            table.style.width = 'max-content';
            table.querySelectorAll('th, td').forEach(cell => {
                (cell as HTMLElement).style.whiteSpace = 'nowrap';
                (cell as HTMLElement).style.padding = '12px 10px';
            });
        }
        document.body.appendChild(clone);
        try {
            await new Promise(resolve => setTimeout(resolve, 200));
            const canvas = await (window as any).html2canvas(clone, {
                scale: 2,
                useCORS: true,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff'
            });
            const link = document.createElement('a');
            link.download = `ThiDua_${tableName.replace(/\s+/g, '_')}_${supermarketName}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } finally {
            document.body.removeChild(clone);
        }
    };

    const handleToggleTitle = (title: string) => {
        const next = selectedTitles.includes(title) 
            ? selectedTitles.filter(t => t !== title)
            : [...selectedTitles, title];
        onUpdateTitles(next);
    };

    // Hàm xử lý xoá bảng với các biện pháp bảo vệ sự kiện
    const handleConfirmDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Ngăn chặn sự kiện lan lên Card
        
        const confirmMsg = `Bạn có thực sự muốn xoá bảng "${tableName}" không? Thao tác này không thể hoàn tác.`;
        if (window.confirm(confirmMsg)) {
            onDelete();
        }
    };

    const headerActions = (
        <div className="flex items-center gap-2 no-print relative z-[10]">
            <div className="relative" ref={filterRef}>
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); }}
                    className={`p-2 rounded-full transition-colors ${isFilterOpen || selectedTitles.length > 0 ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}
                    title="Lọc nhóm thi đua cho bảng này"
                >
                    <FilterIcon className="h-5 w-5 pointer-events-none" />
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
                                        <p className="px-2 mb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">{criterion}</p>
                                        {comps.map(comp => (
                                            <div key={comp.title} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => handleToggleTitle(comp.title)}>
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
            <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }} 
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" 
                title="Sửa tên bảng"
            >
                <PencilIcon className="h-5 w-5 pointer-events-none" />
            </button>
            <button 
                type="button" 
                onClick={handleConfirmDelete} 
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" 
                title="Xóa bảng"
            >
                <TrashIcon className="h-5 w-5 pointer-events-none" />
            </button>
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
                    <div className="w-full overflow-x-auto border-t border-slate-200 dark:border-slate-700 lg:border-x lg:border-b lg:rounded-xl lg:m-4 overflow-hidden shadow-sm" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <table className="w-full border-collapse compact-export-table text-[12px]">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-bold text-slate-500 tracking-wider">
                                <tr>
                                    <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-left border-r border-slate-200 dark:border-slate-700 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 min-w-[160px] align-middle">Nhân viên</th>
                                    <th className="px-3 py-3 text-center border-r border-slate-200 dark:border-slate-700 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 align-middle">Bộ phận</th>
                                    {visibleHeaders.map(header => (
                                        <th key={header.title} className="px-3 py-3 text-center border-r border-slate-200 dark:border-slate-700 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 min-w-[100px] leading-tight align-middle">
                                            {shortenName(header.originalTitle, nameOverrides)}
                                            <div className="text-[9px] opacity-60 font-medium mt-1 tracking-normal">({header.metric})</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-[#1c1c1e]">
                                {employees.map((emp) => (
                                    <tr key={emp.originalName} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                                        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400 border-r border-slate-100 dark:border-slate-700/50 whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                            {emp.name}
                                        </td>
                                        <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] whitespace-nowrap">
                                            {emp.department}
                                        </td>
                                        {visibleHeaders.map(header => {
                                            const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                                            const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                                            const ht = target > 0 ? (actual / target) * 100 : 0;
                                            return (
                                                <td key={header.title} className="px-3 py-3 border-r border-slate-100 dark:border-slate-800 text-center tabular-nums">
                                                    <div className="font-semibold text-slate-700 dark:text-slate-200">{actual > 0 ? formatter.format(roundUp(actual)) : '-'}</div>
                                                    {actual > 0 && target > 0 && (
                                                        <div className={`text-[10px] mt-0.5 ${getHtColor(ht)}`}>
                                                            {roundUp(ht)}%
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default CompetitionSummaryView;
