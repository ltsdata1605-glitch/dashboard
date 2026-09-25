import React, { useRef, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import { ChevronDownIcon, ChevronUpIcon, CameraIcon } from '../Icons';
import { CompetitionHeader, Employee } from '../../types/nhanVienTypes';
import { roundUp, shortenName, extractEmployeeId, standardizeEmployeeName } from '../../utils/nhanVienHelpers';
import {
    selectAndSortEmployees,
    computeGrandTotals,
    computeHighlightStats,
    groupByDepartment,
    computeTimeProgress,
} from '../../services/competitionGroupCalc';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { Button } from '../../../../components/shared/ui/Button';
import { exportElementAsImage } from '../../services/uiService';
import { MedalBadge } from '../shared/Badges';
import AvatarDisplay from './shared/AvatarDisplay';

interface CompetitionGroupCardProps {
    header: CompetitionHeader;
    sortedEmployees: Employee[];
    employeeDataMap: Map<string, { name: string; department: string; values: Record<string, number | null> }>;
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    highlightColorMap: Record<string, string>;
    viewMode?: 'group' | 'list';
    isRealtime?: boolean;
    supermarketName?: string;
}

// Exclude store-level summary rows (e.g. "ĐMX - I.One") from employee lists

export const CompetitionGroupCard: React.FC<CompetitionGroupCardProps> = ({
    header,
    sortedEmployees,
    employeeDataMap,
    employeeCompetitionTargets,
    highlightColorMap,
    viewMode = 'group',
    isRealtime = false,
    supermarketName = ''
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    type SortKey = 'name' | 'target' | 'actual' | 'completion' | 'remaining';
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'remaining', direction: 'desc' });
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});

    const displayTitle = useMemo(() => shortenName(header.originalTitle, nameOverrides), [header.originalTitle, nameOverrides]);

    // Time budget calculation
    const timeProgress = useMemo(() => computeTimeProgress(isRealtime), [isRealtime]);

    const handleCardSort = (key: SortKey) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    const getSortIcon = (_key: SortKey) => null;
    
    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async () => {
        if (!cardRef.current) {
            toast.error("Không tìm thấy thành phần cần xuất ảnh.");
            return;
        }
        
        try {
            const originalCard = cardRef.current;
            const filename = `${displayTitle.replace(/[\s/]/g, '_')}.png`;
            
            const blob = await exportElementAsImage(originalCard, filename, {
                mode: 'blob-only',
                elementsToHide: ['.export-button-component'],
                onCloneReady: (clone: HTMLElement) => {
                    clone.classList.remove('h-full', 'overflow-hidden');
                    clone.style.width = 'max-content';
                    clone.style.minWidth = '100%';
                    clone.style.maxWidth = 'none';
                    clone.style.overflow = 'visible';
                    clone.style.display = 'inline-flex';
                    clone.style.flexDirection = 'column';

                    // Đảm bảo title bar luôn phủ kín 100% chiều rộng card
                    const titleBar = clone.firstElementChild as HTMLElement;
                    if (titleBar) {
                        titleBar.style.width = '100%';
                        titleBar.style.minWidth = '100%';
                        titleBar.style.boxSizing = 'border-box';
                    }

                    // Xoá colgroup nếu còn và đặt table tự căn theo nội dung
                    clone.querySelectorAll('colgroup').forEach(cg => cg.remove());
                    const table = clone.querySelector('table');
                    if (table) {
                        table.style.width = '100%';
                        table.style.minWidth = '100%';
                        table.style.tableLayout = 'auto';
                    }
                    clone.querySelectorAll('tr').forEach(tr => {
                        tr.style.borderLeft = 'none';
                        tr.classList.remove('border-l-[3px]');
                    });
                }
            });
            if (blob) showExportOptions(blob, filename);
        } catch (err) {
            console.error('Failed to export image', err);
            toast.error('Đã xảy ra lỗi khi xuất ảnh. Vui lòng thử lại.');
        }
    };
    
    const sortedEmployeesForCard = useMemo(
        () => selectAndSortEmployees(sortedEmployees, header, employeeDataMap, employeeCompetitionTargets, sortConfig),
        [sortedEmployees, sortConfig, employeeCompetitionTargets, employeeDataMap, header]
    );

    const globalRankMap = useMemo(() => {
        const map = new Map<string, number>();
        sortedEmployeesForCard.forEach((emp, idx) => {
            map.set(emp.originalName, idx + 1);
        });
        return map;
    }, [sortedEmployeesForCard]);

    const formatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
    
    const employeesByDept = useMemo(
        () => groupByDepartment(sortedEmployeesForCard, viewMode),
        [sortedEmployeesForCard, viewMode]
    );

    const departmentNames = Object.keys(employeesByDept).sort((a,b) => a.localeCompare(b));
    
    const {
        target: grandTotalTarget,
        actual: grandTotalActual,
        remaining: grandTotalRemaining,
        completion: grandTotalCompletion,
    } = computeGrandTotals(sortedEmployeesForCard, header, employeeDataMap, employeeCompetitionTargets);

    // Compute stats for conditional coloring: average, TOP 3 actual, TOP 3 completion
    const { averageActual, rankedByActual, rankedByCompletion } = useMemo(
        () => computeHighlightStats(sortedEmployeesForCard, header, employeeDataMap, employeeCompetitionTargets),
        [sortedEmployeesForCard, employeeDataMap, employeeCompetitionTargets, header]
    );

    // Top 3 color: green for T.HIỆN
    const getTopActualStyle = (rank: number) => {
        if (rank >= 1 && rank <= 3) return { color: 'var(--color-emerald-700)' } as React.CSSProperties;
        return null;
    };

    // Global row counter for zebra striping
    let globalRowIndex = 0;

    const renderEmployeeRow = (employee: Employee, _index: number) => {
        const target = employeeCompetitionTargets.get(header.originalTitle)?.get(employee.originalName) ?? 0;
        const actual = employeeDataMap.get(employee.name)?.values[header.title] ?? 0;
        const completion = target > 0 ? (actual / target) * 100 : 0;
        const remaining = actual - target;
        const remainingColor = remaining >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400';

        const completionVal = roundUp(completion);

        // %HT coloring: TOP 1-3 green, between budget and top3 yellow, below budget red
        const completionRank = rankedByCompletion.get(employee.originalName) ?? -1;
        let percentClass = 'font-bold';
        let percentInlineStyle: React.CSSProperties = {};
        if (completionRank >= 1 && completionRank <= 3) {
            percentInlineStyle = { color: 'var(--color-emerald-700)' };
        } else if (completionVal > 0 && completionVal < timeProgress.percentage) {
            percentInlineStyle = { color: 'var(--color-rose-700)' };
        } else if (completionVal >= timeProgress.percentage) {
            percentInlineStyle = { color: 'var(--color-amber-700)' };
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
            actualClass = 'text-rose-700 font-bold';
        } else {
            actualClass = 'text-slate-700 dark:text-slate-300 font-bold';
        }

        const getHighlightClass = (): string => {
            if (!highlightColorMap) return '';
            const empId = extractEmployeeId(employee.originalName) || extractEmployeeId(employee.name);
            const stdOrig = standardizeEmployeeName(employee.originalName);
            const stdName = standardizeEmployeeName(employee.name);
            return highlightColorMap[employee.originalName]
                || highlightColorMap[employee.name]
                || (stdOrig ? highlightColorMap[stdOrig] : '')
                || (stdName ? highlightColorMap[stdName] : '')
                || (empId ? highlightColorMap[empId] || highlightColorMap[`id_${empId}`] : '')
                || '';
        };

        const highlightClass = getHighlightClass();
        const isHighlighted = !!highlightClass;

        // When highlighted, clear conditional colors so highlight style shines through
        if (isHighlighted) {
            percentClass = 'font-black text-slate-900 dark:text-white';
            percentInlineStyle = {};
            actualClass = 'font-black text-slate-900 dark:text-white';
            actualInlineStyle = {};
        }

        // Zebra striping
        const isEven = globalRowIndex % 2 === 0;
        globalRowIndex++;

        const rank = globalRankMap.get(employee.originalName) || (_index + 1);

        return (
            <tr key={employee.originalName}
                className={`${isHighlighted
                    ? `${highlightClass} font-bold ring-1 ring-inset ring-sky-300/80 dark:ring-sky-600/60 shadow-2xs`
                    : `hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors`
                }
                border-b border-slate-100 dark:border-slate-700`}>
                <td className={`px-2 py-0.5 sm:py-1 whitespace-nowrap text-[11px] font-bold text-left leading-tight border-r border-slate-100 dark:border-slate-700/50 min-w-[170px]`} style={isHighlighted ? { color: '#0369a1', fontWeight: 800 } : { color: 'var(--color-sky-600)' }}>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <MedalBadge rank={rank} className="w-6 text-center text-[11px] font-normal tabular-nums" />
                        <AvatarDisplay employeeName={employee.originalName} supermarketName={supermarketName} />
                        <span className="truncate font-bold">{employee.name}</span>
                    </div>
                </td>
                <td className={`w-[1%] px-2 py-0.5 sm:py-1 text-center text-[11px] font-bold whitespace-nowrap tabular-nums border-r border-slate-100 dark:border-slate-700/50 ${isHighlighted ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>{formatter.format(roundUp(target))}</td>
                <td className={`w-[1%] px-2 py-0.5 sm:py-1 text-center text-[11px] font-bold whitespace-nowrap tabular-nums border-r border-slate-100 dark:border-slate-700/50 ${actualClass}`} style={actualInlineStyle}>
                    {(!actual || actual === 0) ? '-' : formatter.format(roundUp(actual))}
                </td>
                <td className={`w-[1%] px-2 py-0.5 sm:py-1 text-center text-[11px] font-bold whitespace-nowrap tabular-nums border-r border-slate-100 dark:border-slate-700/50 ${percentClass}`} style={percentInlineStyle}>
                    {(!actual || actual === 0) ? '-' : `${roundUp(completion).toFixed(0)}%`}
                </td>
                <td className={`w-[1%] px-2 py-0.5 sm:py-1 text-center text-[11px] font-bold whitespace-nowrap tabular-nums border-r border-slate-100 dark:border-slate-700/50 ${isHighlighted ? 'text-slate-900 dark:text-white' : remainingColor}`}>{formatter.format(roundUp(remaining))}</td>
            </tr>
        );
    };

    return (
        <div 
            ref={cardRef} 
            className="competition-group-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden"
        >
            {/* Title bar — solid blue background with generous padding and subtle separator */}
            <div className="bg-sky-600 dark:bg-sky-700 text-white px-4 py-3 sm:py-3.5 border-b border-sky-500/40 dark:border-sky-600/60">
                <div className="flex justify-center items-center relative">
                    <h4 className="text-[13px] sm:text-[14px] font-black uppercase text-white text-center whitespace-normal px-8 leading-snug tracking-wider drop-shadow-xs" title={header.originalTitle}>
                        {displayTitle}
                    </h4>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        <Button
                            type="button"
                            variant="unstyled" size="none"
                            onClick={handleExportPNG}
                            className="export-button-component p-1.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                            title="Xuất ảnh báo cáo (PNG)"
                        >
                            <CameraIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            {/* Table — Thưởng design */}
            <div className="flex-1">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="text-[11px] font-black uppercase tracking-wider bg-sky-600 dark:bg-sky-700 text-white">
                            <th className="text-left px-2 py-2 border-b border-r border-sky-500/40 text-white min-w-[170px]">
                                <Button variant="unstyled" size="none" onClick={() => handleCardSort('name')} className="font-black uppercase tracking-wider flex items-center justify-start w-full group text-white hover:text-sky-100">NHÂN VIÊN{getSortIcon('name')}</Button>
                            </th>
                            <th className="w-[1%] text-center px-2 py-2 whitespace-nowrap border-b border-r border-sky-500/40 text-white">
                                <Button variant="unstyled" size="none" onClick={() => handleCardSort('target')} className="font-black uppercase tracking-wider flex items-center justify-center w-full group text-white hover:text-sky-100">M.TIÊU{getSortIcon('target')}</Button>
                            </th>
                            <th className="w-[1%] text-center px-2 py-2 whitespace-nowrap border-b border-r border-sky-500/40 text-white">
                                <Button variant="unstyled" size="none" onClick={() => handleCardSort('actual')} className="font-black uppercase tracking-wider flex items-center justify-center w-full group text-white hover:text-sky-100">T.HIỆN{getSortIcon('actual')}</Button>
                            </th>
                            <th className="w-[1%] text-center px-2 py-2 whitespace-nowrap border-b border-r border-sky-500/40 text-white">
                                <Button variant="unstyled" size="none" onClick={() => handleCardSort('completion')} className="font-black uppercase tracking-wider flex items-center justify-center w-full group text-white hover:text-sky-100">%HT{getSortIcon('completion')}</Button>
                            </th>
                            <th className="w-[1%] text-center px-2 py-2 whitespace-nowrap border-b border-r border-sky-500/40 text-white">
                                <Button variant="unstyled" size="none" onClick={() => handleCardSort('remaining')} className="font-black uppercase tracking-wider flex items-center justify-center w-full group text-white hover:text-sky-100">C.LẠI{getSortIcon('remaining')}</Button>
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
                                            <td colSpan={5} className="px-2 py-1.5 font-black text-slate-500 dark:text-slate-400 text-left uppercase text-[11px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                                                {deptName}
                                            </td>
                                        </tr>
                                        {employeesInDept.map((employee, index) => renderEmployeeRow(employee, index))}
                                        {/* Dept total — emerald style */}
                                        {departmentNames.length > 1 && (
                                            <tr className="bg-emerald-50 dark:bg-emerald-900/20 font-extrabold text-emerald-800 dark:text-emerald-400 border-t-2 border-emerald-200 dark:border-emerald-800">
                                                <td className="px-2 py-0.5 sm:py-1 text-center uppercase text-[11px] tracking-wider border-r border-emerald-200 dark:border-emerald-800/50">Tổng {deptName}</td>
                                                <td className="w-[1%] px-2 py-0.5 sm:py-1 text-center text-[11px] whitespace-nowrap tabular-nums border-r border-emerald-200 dark:border-emerald-800/50">{formatter.format(roundUp(totalTarget))}</td>
                                                <td className="w-[1%] px-2 py-0.5 sm:py-1 text-center text-[11px] whitespace-nowrap tabular-nums border-r border-emerald-200 dark:border-emerald-800/50">{formatter.format(roundUp(totalActual))}</td>
                                                <td className="w-[1%] px-2 py-0.5 sm:py-1 text-center text-[11px] whitespace-nowrap tabular-nums border-r border-emerald-200 dark:border-emerald-800/50">{roundUp(totalCompletion).toFixed(0)}%</td>
                                                <td className="w-[1%] px-2 py-0.5 sm:py-1 text-center text-[11px] whitespace-nowrap tabular-nums border-r border-emerald-200 dark:border-emerald-800/50">{formatter.format(roundUp(totalRemaining))}</td>
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
                        {/* Grand Total — solid blue matching Image 3 */}
                        <tr className="bg-sky-600 dark:bg-sky-700 font-black text-white border-t-2 border-sky-700">
                             <td className="px-2 py-1 text-center uppercase text-[11px] tracking-wider border-r border-sky-500/40 text-white">TỔNG</td>
                             <td className="w-[1%] px-2 py-1 text-center text-[11px] whitespace-nowrap border-r border-sky-500/40 tabular-nums text-white">{formatter.format(roundUp(grandTotalTarget))}</td>
                             <td className="w-[1%] px-2 py-1 text-center text-[11px] whitespace-nowrap border-r border-sky-500/40 tabular-nums text-white">{formatter.format(roundUp(grandTotalActual))}</td>
                             <td className="w-[1%] px-2 py-1 text-center text-[11px] whitespace-nowrap border-r border-sky-500/40 tabular-nums text-white">{roundUp(grandTotalCompletion).toFixed(0)}%</td>
                             <td className="w-[1%] px-2 py-1 text-center text-[11px] whitespace-nowrap tabular-nums text-white border-r border-sky-500/40">{formatter.format(roundUp(grandTotalRemaining))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};