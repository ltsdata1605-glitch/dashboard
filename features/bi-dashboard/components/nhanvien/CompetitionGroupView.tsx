import React, { useRef, useState, useMemo } from 'react';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import { ChevronDownIcon, ChevronUpIcon, CameraIcon } from '../Icons';
import { CompetitionHeader, Employee } from '../../types/nhanVienTypes';
import { roundUp, shortenName } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { exportElementAsImage } from '../../../../services/uiService';

interface CompetitionGroupCardProps {
    header: CompetitionHeader;
    sortedEmployees: Employee[];
    employeeDataMap: Map<string, { name: string; department: string; values: Record<string, number | null> }>;
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    colorScheme: { main: string; light: string; text: string; hover: string; zebra: string; footer: string };
    highlightColorMap: Record<string, string>;
    viewMode?: 'group' | 'list';
}

// Exclude store-level summary rows (e.g. "ĐMX - I.One") from employee lists
const isStoreRow = (name: string) => /^ĐMX\s*-/i.test(name) || /^DMX\s*-/i.test(name);

export const CompetitionGroupCard: React.FC<CompetitionGroupCardProps> = ({
    header,
    sortedEmployees,
    employeeDataMap,
    employeeCompetitionTargets,
    colorScheme: _colorScheme,
    highlightColorMap,
    viewMode = 'group'
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    type SortKey = 'name' | 'target' | 'actual' | 'completion' | 'remaining';
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'remaining', direction: 'desc' });
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});

    const displayTitle = useMemo(() => shortenName(header.originalTitle, nameOverrides), [header.originalTitle, nameOverrides]);

    // Time budget calculation
    const timeProgress = useMemo(() => {
        const now = new Date();
        const dayPassed = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const percentage = ((dayPassed - 1) / daysInMonth) * 100;
        return { dayPassed, daysInMonth, percentage };
    }, []);

    const handleCardSort = (key: SortKey) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig?.key !== key) return <ChevronDownIcon className="h-3 w-3 ml-0.5 text-transparent group-hover:text-slate-400" />;
        return sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-3 w-3 ml-0.5" /> : <ChevronDownIcon className="h-3 w-3 ml-0.5" />;
    };
    
    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async () => {
        if (!cardRef.current) {
            alert("Không tìm thấy thành phần cần xuất ảnh.");
            return;
        }
        
        try {
            const originalCard = cardRef.current;
            const filename = `${displayTitle.replace(/[\s/]/g, '_')}.png`;
            const blob = await exportElementAsImage(originalCard, filename, {
                mode: 'blob-only', elementsToHide: ['.export-button-component'],
                fitAllColumns: true,
            });
            if (blob) showExportOptions(blob, filename);
        } catch (err) {
            console.error('Failed to export image', err);
            alert('Đã xảy ra lỗi khi xuất ảnh. Vui lòng thử lại.');
        }
    };
    
    const sortedEmployeesForCard = useMemo(() => {
        const employeesForThisComp = sortedEmployees.filter(emp => {
            // Exclude store summary rows
            if (isStoreRow(emp.name)) return false;
            const actual = employeeDataMap.get(emp.name)?.values[header.title];
            const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName);
            return actual !== undefined || target !== undefined;
        });

        return [...employeesForThisComp].sort((empA, empB) => {
            const targetA = employeeCompetitionTargets.get(header.originalTitle)?.get(empA.originalName) ?? 0;
            const actualA = employeeDataMap.get(empA.name)?.values[header.title] ?? 0;
            const completionA = targetA > 0 ? (actualA / targetA) * 100 : 0;
            const remainingA = actualA - targetA;

            const targetB = employeeCompetitionTargets.get(header.originalTitle)?.get(empB.originalName) ?? 0;
            const actualB = employeeDataMap.get(empB.name)?.values[header.title] ?? 0;
            const completionB = targetB > 0 ? (actualB / targetB) * 100 : 0;
            const remainingB = actualB - targetB;
            
            let valA, valB;
            switch (sortConfig.key) {
                case 'name':
                    const compare = empA.name.localeCompare(empB.name);
                    return sortConfig.direction === 'asc' ? compare : -compare;
                case 'target': valA = targetA; valB = targetB; break;
                case 'actual': valA = actualA; valB = actualB; break;
                case 'completion': valA = completionA; valB = completionB; break;
                case 'remaining': valA = remainingA; valB = remainingB; break;
                default: return 0;
            }
            const diff = valA - valB;
            return sortConfig.direction === 'asc' ? diff : -diff;
        });
    }, [sortedEmployees, sortConfig, employeeCompetitionTargets, employeeDataMap, header]);

    const formatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
    
    const employeesByDept = useMemo(() => {
        if (viewMode === 'list') return { 'Tất cả': sortedEmployeesForCard };
        return sortedEmployeesForCard.reduce((acc, emp) => {
            if (!acc[emp.department]) acc[emp.department] = [];
            acc[emp.department].push(emp);
            return acc;
        }, {} as Record<string, Employee[]>);
    }, [sortedEmployeesForCard, viewMode]);

    const departmentNames = Object.keys(employeesByDept).sort((a,b) => a.localeCompare(b));
    
    let grandTotalTarget = 0;
    let grandTotalActual = 0;
    sortedEmployeesForCard.forEach(emp => {
        grandTotalTarget += employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
        grandTotalActual += employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
    });
    const grandTotalRemaining = grandTotalActual - grandTotalTarget;
    const grandTotalCompletion = grandTotalTarget > 0 ? (grandTotalActual / grandTotalTarget) * 100 : 0;

    // Compute stats for conditional coloring: average, TOP 3 actual, TOP 3 completion
    const { averageActual, rankedByActual, rankedByCompletion } = useMemo(() => {
        const stats: { emp: string; actual: number; completion: number }[] = [];
        sortedEmployeesForCard.forEach(emp => {
            const actual = employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
            const target = employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
            const completion = target > 0 ? (actual / target) * 100 : 0;
            stats.push({ emp: emp.originalName, actual, completion });
        });
        
        const validActuals = stats.filter(s => s.actual > 0);
        const avg = validActuals.length > 0 ? validActuals.reduce((s, a) => s + a.actual, 0) / validActuals.length : 0;
        
        // Ranked maps for O(1) lookup
        const byActual = new Map<string, number>();
        [...validActuals].sort((a, b) => b.actual - a.actual).forEach((s, i) => byActual.set(s.emp, i + 1));
        
        const validCompletions = stats.filter(s => s.completion > 0);
        const byCompletion = new Map<string, number>();
        [...validCompletions].sort((a, b) => b.completion - a.completion).forEach((s, i) => byCompletion.set(s.emp, i + 1));
        
        return { averageActual: avg, rankedByActual: byActual, rankedByCompletion: byCompletion };
    }, [sortedEmployeesForCard, employeeDataMap, employeeCompetitionTargets, header]);

    // Top 3 color: green for T.HIỆN
    const getTopActualStyle = (rank: number) => {
        if (rank >= 1 && rank <= 3) return { color: 'rgb(34, 197, 94)', fontWeight: 900 } as React.CSSProperties;
        return null;
    };

    // Global row counter for zebra striping
    let globalRowIndex = 0;

    const renderEmployeeRow = (employee: Employee, _index: number) => {
        const target = employeeCompetitionTargets.get(header.originalTitle)?.get(employee.originalName) ?? 0;
        const actual = employeeDataMap.get(employee.name)?.values[header.title] ?? 0;
        const completion = target > 0 ? (actual / target) * 100 : 0;
        const remaining = actual - target;
        const remainingColor = remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        
        const completionVal = roundUp(completion);
        
        // %HT coloring: TOP 1-3 green, between budget and top3 yellow, below budget red
        const completionRank = rankedByCompletion.get(employee.originalName) ?? -1;
        let percentClass = 'font-bold';
        let percentInlineStyle: React.CSSProperties = {};
        if (completionRank >= 1 && completionRank <= 3) {
            percentInlineStyle = { color: 'rgb(34, 197, 94)', fontWeight: 900 };
        } else if (completionVal > 0 && completionVal < timeProgress.percentage) {
            percentInlineStyle = { color: 'rgb(239, 68, 68)', fontWeight: 700 };
        } else if (completionVal >= timeProgress.percentage) {
            percentInlineStyle = { color: 'rgb(234, 179, 8)', fontWeight: 700 };
        } else {
            percentClass = 'text-slate-700 dark:text-slate-300 font-bold';
        }
        
        // T.HIỆN coloring: TOP 1-3 green, below average red
        const actualRank = rankedByActual.get(employee.originalName) ?? -1;
        const topActualStyle = getTopActualStyle(actualRank);
        let actualClass = 'font-bold';
        let actualInlineStyle: React.CSSProperties = {};
        if (topActualStyle) {
            actualInlineStyle = topActualStyle;
        } else if (actual > 0 && actual < averageActual) {
            actualClass = 'text-red-600 font-bold';
        } else {
            actualClass = 'text-slate-700 dark:text-slate-300 font-bold';
        }
        
        const highlightClass = highlightColorMap[employee.originalName] || '';
        const isHighlighted = !!highlightClass;
        
        // When highlighted, clear conditional colors so highlight style shines through
        if (isHighlighted) {
            percentClass = 'font-bold';
            percentInlineStyle = {};
            actualClass = 'font-bold';
            actualInlineStyle = {};
        }
        
        // Zebra striping
        const isEven = globalRowIndex % 2 === 0;
        globalRowIndex++;
        const zebraClass = isHighlighted ? '' : (isEven ? 'bg-white dark:bg-[#1c1c1e]' : 'bg-slate-50/70 dark:bg-slate-800/30');

        return (
            <tr key={employee.originalName} className={`
                ${isHighlighted 
                    ? `${highlightClass} font-bold` 
                    : `hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors`
                } 
                ${zebraClass}
                border-b border-gray-100 dark:border-slate-700`}>
                <td className={`px-2 py-1 whitespace-nowrap text-[13px] font-bold text-left leading-tight border-r border-slate-100 dark:border-slate-700/50`} style={isHighlighted ? {} : { color: 'var(--color-sky-600)' }}>
                    <span>{employee.name}</span>
                </td>
                <td className={`px-1.5 py-1 text-center text-[13px] font-bold whitespace-nowrap tabular-nums border-r border-slate-100 dark:border-slate-700/50 ${isHighlighted ? '' : 'text-slate-500 dark:text-slate-400'}`}>{formatter.format(roundUp(target))}</td>
                <td className={`px-1.5 py-1 text-center text-[13px] whitespace-nowrap tabular-nums border-r border-slate-100 dark:border-slate-700/50 ${actualClass}`} style={actualInlineStyle}>
                    {(!actual || actual === 0) ? '-' : formatter.format(roundUp(actual))}
                </td>
                <td className={`px-1.5 py-1 text-center text-[13px] whitespace-nowrap tabular-nums border-r border-slate-100 dark:border-slate-700/50 ${percentClass}`} style={percentInlineStyle}>
                    {(!actual || actual === 0) ? '-' : `${roundUp(completion).toFixed(0)}%`}
                </td>
                <td className={`px-1.5 py-1 text-center text-[13px] font-bold whitespace-nowrap tabular-nums ${isHighlighted ? '' : remainingColor}`}>{formatter.format(roundUp(remaining))}</td>
            </tr>
        );
    };

    return (
        <div 
            ref={cardRef} 
            className="competition-group-card bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-700 flex flex-col h-full overflow-hidden"
        >
            {/* Title bar — flat, professional */}
            <div className="py-2 px-3 flex flex-col gap-1.5 border-b border-slate-200 dark:border-slate-700">
                <div className="flex justify-center items-center relative">
                    <h4 className="text-[14px] font-black uppercase text-indigo-700 dark:text-indigo-400 text-center whitespace-normal px-8 leading-snug tracking-wide" title={header.originalTitle}>
                        {displayTitle}
                    </h4>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        <button
                            type="button"
                            onClick={handleExportPNG}
                            className="export-button-component p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Xuất ảnh báo cáo (PNG)"
                        >
                            <CameraIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                {/* Time budget bar */}
                <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Quỹ thời gian</span>
                            <span className="text-[9px] font-bold text-slate-400 italic">({timeProgress.dayPassed} / {timeProgress.daysInMonth} ngày)</span>
                        </div>
                        <span className="text-[10px] font-black text-sky-600 tabular-nums leading-none">{Math.round(timeProgress.percentage)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 relative overflow-hidden">
                        <div 
                            className="h-full bg-sky-500 rounded-full transition-all duration-500"
                            style={{ width: `${timeProgress.percentage}%` }}
                        />
                    </div>
                </div>
            </div>
            {/* Table — Thưởng design */}
            <div className="flex-1">
                <table className="w-full border-collapse compact-export-table table-fixed">
                    <colgroup>
                        <col className="w-[30%]" />
                        <col className="w-[17%]" />
                        <col className="w-[17%]" />
                        <col className="w-[15%]" />
                        <col className="w-[21%]" />
                    </colgroup>
                    <thead>
                        <tr className="text-[11px] font-black uppercase tracking-wider">
                            <th className="text-center px-2 py-1.5 border-b-2 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <button onClick={() => handleCardSort('name')} className="flex items-center justify-center w-full group">NHÂN VIÊN{getSortIcon('name')}</button>
                            </th>
                            <th className="text-center px-1.5 py-1.5 whitespace-nowrap border-b-2 border-r border-slate-200 dark:border-slate-700 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400">
                                <button onClick={() => handleCardSort('target')} className="flex items-center justify-center w-full group">M.TIÊU{getSortIcon('target')}</button>
                            </th>
                            <th className="text-center px-1.5 py-1.5 whitespace-nowrap border-b-2 border-r border-slate-200 dark:border-slate-700 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400">
                                <button onClick={() => handleCardSort('actual')} className="flex items-center justify-center w-full group">T.HIỆN{getSortIcon('actual')}</button>
                            </th>
                            <th className="text-center px-1.5 py-1.5 whitespace-nowrap border-b-2 border-r border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                <button onClick={() => handleCardSort('completion')} className="flex items-center justify-center w-full group">%HT{getSortIcon('completion')}</button>
                            </th>
                            <th className="text-center px-1.5 py-1.5 whitespace-nowrap border-b-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                <button onClick={() => handleCardSort('remaining')} className="flex items-center justify-center w-full group">C.LẠI{getSortIcon('remaining')}</button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => { globalRowIndex = 0; return null; })()}
                        {departmentNames.map(deptName => {
                            const employeesInDept = employeesByDept[deptName];

                            if (viewMode === 'group') {
                                let totalTarget = 0;
                                let totalActual = 0;
                                employeesInDept.forEach(emp => {
                                    totalTarget += employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                                    totalActual += employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                                });
                                const totalRemaining = totalActual - totalTarget;
                                const totalCompletion = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

                                
                                return (
                                    <React.Fragment key={deptName}>
                                        <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                                            <td colSpan={5} className="px-2 py-1.5 font-black text-slate-500 dark:text-slate-400 text-left uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                                                {deptName}
                                            </td>
                                        </tr>
                                        {employeesInDept.map((employee, index) => renderEmployeeRow(employee, index))}
                                        {/* Dept total — emerald style */}
                                        {departmentNames.length > 1 && (
                                            <tr className="bg-emerald-50 dark:bg-emerald-900/20 font-extrabold text-emerald-800 dark:text-emerald-400 border-t-2 border-emerald-200 dark:border-emerald-800">
                                                <td className="px-2 py-1 text-center uppercase text-[11px] tracking-wider border-r border-emerald-200 dark:border-emerald-800/50">Tổng {deptName}</td>
                                                <td className="px-1.5 py-1 text-center text-[13px] whitespace-nowrap tabular-nums border-r border-emerald-200 dark:border-emerald-800/50">{formatter.format(roundUp(totalTarget))}</td>
                                                <td className="px-1.5 py-1 text-center text-[13px] whitespace-nowrap tabular-nums border-r border-emerald-200 dark:border-emerald-800/50">{formatter.format(roundUp(totalActual))}</td>
                                                <td className="px-1.5 py-1 text-center text-[13px] whitespace-nowrap tabular-nums border-r border-emerald-200 dark:border-emerald-800/50">{roundUp(totalCompletion).toFixed(0)}%</td>
                                                <td className="px-1.5 py-1 text-center text-[13px] whitespace-nowrap tabular-nums">{formatter.format(roundUp(totalRemaining))}</td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            } else {
                                return (
                                    <React.Fragment key={deptName}>
                                        {employeesInDept.map((employee, index) => renderEmployeeRow(employee, index))}
                                    </React.Fragment>
                                );
                            }
                        })}
                        {/* Grand Total — indigo accent */}
                        <tr className="bg-indigo-50 dark:bg-indigo-900/30 font-extrabold text-indigo-800 dark:text-indigo-300 border-t-2 border-indigo-200 dark:border-indigo-800">
                             <td className="px-2 py-1 text-center uppercase text-[13px] tracking-wider border-r border-indigo-200 dark:border-indigo-800/50">TỔNG</td>
                             <td className="px-1.5 py-1 text-center text-[13px] whitespace-nowrap border-r border-indigo-200 dark:border-indigo-800/50 tabular-nums">{formatter.format(roundUp(grandTotalTarget))}</td>
                             <td className="px-1.5 py-1 text-center text-[13px] whitespace-nowrap border-r border-indigo-200 dark:border-indigo-800/50 tabular-nums">{formatter.format(roundUp(grandTotalActual))}</td>
                             <td className="px-1.5 py-1 text-center text-[13px] whitespace-nowrap border-r border-indigo-200 dark:border-indigo-800/50 tabular-nums">{roundUp(grandTotalCompletion).toFixed(0)}%</td>
                             <td className="px-1.5 py-1 text-center text-[13px] whitespace-nowrap tabular-nums">{formatter.format(roundUp(grandTotalRemaining))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};