import React, { useRef, useState, useMemo } from 'react';
import { AppIcon } from '../../../../components/shared/ui/icon/AppIcon';
import { toast } from '../../../../components/shared/ui/toast';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import { CompetitionHeader, Employee } from '../../types/nhanVienTypes';
import { roundUp, shortenName, extractEmployeeId, standardizeEmployeeName } from '../../utils/nhanVienHelpers';
import {
    selectAndSortEmployees,
    computeGrandTotals,
    computeHighlightStats,
    groupByDepartment,
    computeTimeProgress,
} from '../../services/competitionGroupCalc';
import { resolveEmployeeTarget } from '../../services/competitionSummaryCalc';
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

// memo: tab Thi đua › Nhóm vẽ hàng chục thẻ × cả danh sách NV — đổi 1 lựa chọn ở cha không được vẽ lại mọi thẻ.
export const CompetitionGroupCard: React.FC<CompetitionGroupCardProps> = React.memo(({
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

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) return null;
        return (
            <span className="ml-1 text-[10px] text-sky-600 dark:text-sky-400 font-bold">
                {sortConfig.direction === 'asc' ? '▲' : '▼'}
            </span>
        );
    };
    
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
                isCompactTable: true,
                onCloneReady: (clone: HTMLElement) => {
                    clone.classList.remove('h-full');
                    clone.style.setProperty('width', 'max-content', 'important');
                    clone.style.setProperty('min-width', '100%', 'important');
                    clone.style.setProperty('max-width', 'none', 'important');
                    clone.style.setProperty('border-radius', '16px', 'important');
                    clone.style.setProperty('overflow', 'hidden', 'important');
                    clone.style.setProperty('display', 'flex', 'important');
                    clone.style.setProperty('flex-direction', 'column', 'important');
                    clone.style.setProperty('align-items', 'stretch', 'important');

                    // Đảm bảo title bar luôn phủ kín 100% chiều rộng card và tiêu đề canh giữa tuyệt đối
                    const titleBar = clone.firstElementChild as HTMLElement;
                    if (titleBar) {
                        titleBar.style.setProperty('width', '100%', 'important');
                        titleBar.style.setProperty('min-width', '100%', 'important');
                        titleBar.style.setProperty('max-width', 'none', 'important');
                        titleBar.style.setProperty('box-sizing', 'border-box', 'important');
                        titleBar.style.setProperty('text-align', 'center', 'important');
                        titleBar.style.setProperty('padding-top', '10px', 'important');
                        titleBar.style.setProperty('padding-bottom', '10px', 'important');
                        titleBar.style.setProperty('padding-left', '16px', 'important');
                        titleBar.style.setProperty('padding-right', '16px', 'important');
                        titleBar.style.setProperty('border-top-left-radius', '15px', 'important');
                        titleBar.style.setProperty('border-top-right-radius', '15px', 'important');
                        titleBar.querySelectorAll('.export-button-component').forEach(b => b.remove());
                        const innerDiv = titleBar.firstElementChild as HTMLElement;
                        if (innerDiv) {
                            innerDiv.style.setProperty('width', '100%', 'important');
                            innerDiv.style.setProperty('min-width', '100%', 'important');
                            innerDiv.style.setProperty('justify-content', 'center', 'important');
                        }
                        const h4 = titleBar.querySelector('h4');
                        if (h4) {
                            h4.style.setProperty('width', '100%', 'important');
                            h4.style.setProperty('text-align', 'center', 'important');
                            h4.style.setProperty('margin', '0 auto', 'important');
                            h4.style.setProperty('padding', '0', 'important');
                            h4.style.setProperty('display', 'block', 'important');
                        }
                    }

                    // Xoá colgroup nếu còn và đặt table tự căn theo nội dung
                    clone.querySelectorAll('colgroup').forEach(cg => cg.remove());
                    const table = clone.querySelector('table');
                    if (table) {
                        table.style.setProperty('width', '100%', 'important');
                        table.style.setProperty('min-width', '100%', 'important');
                        table.style.setProperty('table-layout', 'auto', 'important');
                    }
                    clone.querySelectorAll('tr').forEach(tr => {
                        tr.style.borderLeft = 'none';
                        tr.classList.remove('border-l-[3px]');
                    });

                    // Đồng bộ độ rộng dòng nhỏ gọn như bảng doanh thu nhân viên (py-[3px])
                    clone.querySelectorAll('td').forEach(td => {
                        (td as HTMLElement).style.setProperty('padding-top', '3px', 'important');
                        (td as HTMLElement).style.setProperty('padding-bottom', '3px', 'important');
                        (td as HTMLElement).style.setProperty('line-height', '1.25', 'important');
                    });
                    // Thêm padding cho header như người dùng yêu cầu
                    clone.querySelectorAll('th').forEach(th => {
                        (th as HTMLElement).style.setProperty('padding-top', '7px', 'important');
                        (th as HTMLElement).style.setProperty('padding-bottom', '7px', 'important');
                        (th as HTMLElement).style.setProperty('line-height', '1.3', 'important');
                    });

                    // Giữ nguyên các đường kẻ dọc xám mờ phân tách giữa các cột khi xuất ảnh
                    clone.querySelectorAll('td:not(:last-child)').forEach(td => {
                        (td as HTMLElement).style.setProperty('border-right', '1px solid rgba(226, 232, 240, 0.8)', 'important');
                    });
                    clone.querySelectorAll('th:not(:last-child)').forEach(th => {
                        (th as HTMLElement).style.setProperty('border-right', '1px solid rgba(226, 232, 240, 0.9)', 'important');
                    });
                },
                onBeforeCapture: (clone: HTMLElement) => {
                    // Ngay trước khi capture, đảm bảo titleBar phủ kín 100% bề rộng clone
                    const titleBar = clone.firstElementChild as HTMLElement;
                    if (titleBar) {
                        titleBar.style.setProperty('width', '100%', 'important');
                        titleBar.style.setProperty('min-width', '100%', 'important');
                        titleBar.style.setProperty('box-sizing', 'border-box', 'important');
                        titleBar.style.setProperty('border-top-left-radius', '15px', 'important');
                        titleBar.style.setProperty('border-top-right-radius', '15px', 'important');
                    }
                    clone.style.setProperty('border-radius', '16px', 'important');
                    clone.style.setProperty('overflow', 'hidden', 'important');
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
    const formatTargetDisplay = (val: number, _metric?: string) => {
        if (val <= 0) return '-';
        return formatter.format(roundUp(val));
    };
    
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

    const renderEmployeeName = (name: string) => {
        const match = name.match(/^(\d+)\s*[-–]\s*(.+)$/);
        if (match) {
            return (
                <div className="flex items-center gap-1 min-w-0 leading-none">
                    <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px] shrink-0 font-medium leading-none">{match[1]}</span>
                    <span className="text-slate-300 dark:text-slate-600 text-[10px] leading-none">·</span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold text-[12px] truncate leading-none">{match[2]}</span>
                </div>
            );
        }
        return <span className="truncate font-semibold text-[12px] text-slate-900 dark:text-slate-100 leading-none">{name}</span>;
    };

    const renderEmployeeRow = (employee: Employee, _index: number) => {
        const rawTarget = resolveEmployeeTarget(employeeCompetitionTargets, header.originalTitle, employee.originalName);
        const target = roundUp(rawTarget);
        const actual = employeeDataMap.get(employee.name)?.values[header.title] ?? 0;
        const completion = target > 0 ? (actual / target) * 100 : 0;
        const remaining = actual - target;

        const completionVal = roundUp(completion);

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

        const rank = globalRankMap.get(employee.originalName) || (_index + 1);

        // Actual (T.HIỆN) styling
        const actualRank = rankedByActual.get(employee.originalName) ?? -1;
        let actualElement: React.ReactNode = null;
        if (!actual || actual === 0) {
            actualElement = <span className="text-slate-400 dark:text-slate-500 font-medium">-</span>;
        } else if (actualRank >= 1 && actualRank <= 3) {
            actualElement = <span className="font-bold text-[12px] text-emerald-600 dark:text-emerald-400 tabular-nums">{formatter.format(roundUp(actual))}</span>;
        } else if (actual < averageActual) {
            actualElement = <span className="font-bold text-[12px] text-rose-600 dark:text-rose-400 tabular-nums">{formatter.format(roundUp(actual))}</span>;
        } else {
            actualElement = <span className="font-bold text-[12px] text-slate-800 dark:text-slate-200 tabular-nums">{formatter.format(roundUp(actual))}</span>;
        }

        // %HT styling — chữ số thanh thoát không khung viền
        const completionRank = rankedByCompletion.get(employee.originalName) ?? -1;
        let percentElement: React.ReactNode = null;
        if (!actual || actual === 0) {
            percentElement = <span className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">-</span>;
        } else if (completionRank >= 1 && completionRank <= 3) {
            percentElement = (
                <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {completionVal.toFixed(0)}%
                </span>
            );
        } else if (completionVal >= timeProgress.percentage) {
            percentElement = (
                <span className="font-bold text-[11px] text-amber-600 dark:text-amber-400 tabular-nums">
                    {completionVal.toFixed(0)}%
                </span>
            );
        } else {
            percentElement = (
                <span className="font-bold text-[11px] text-rose-600 dark:text-rose-400 tabular-nums">
                    {completionVal.toFixed(0)}%
                </span>
            );
        }

        // Remaining (C.LẠI) styling
        let remainingElement: React.ReactNode = null;
        if (remaining >= 0) {
            remainingElement = (
                <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {remaining > 0 ? `+${formatter.format(roundUp(remaining))}` : '0'}
                </span>
            );
        } else {
            remainingElement = (
                <span className="font-semibold text-[11px] text-rose-600 dark:text-rose-400 tabular-nums">
                    {formatter.format(roundUp(remaining))}
                </span>
            );
        }

        return (
            <tr key={employee.originalName}
                className={`${isHighlighted
                    ? `${highlightClass} font-bold ring-1 ring-inset ring-sky-400/80 dark:ring-sky-500/80 bg-sky-50/70 dark:bg-sky-950/40 shadow-xs`
                    : `hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors`
                }
                text-[12px] leading-tight border-b border-slate-100 dark:border-slate-800/80 group`}>
                <td className="px-2.5 py-[3px] whitespace-nowrap text-left leading-tight min-w-[170px] border-r border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <MedalBadge rank={rank} />
                        <AvatarDisplay employeeName={employee.originalName} supermarketName={supermarketName} />
                        {renderEmployeeName(employee.name)}
                    </div>
                </td>
                <td className="w-[1%] px-2 py-[3px] text-center whitespace-nowrap tabular-nums text-slate-500 dark:text-slate-400 font-medium text-[11px] border-r border-slate-100 dark:border-slate-800/60">
                    {formatTargetDisplay(target, header.metric)}
                </td>
                <td className="w-[1%] px-2 py-[3px] text-center whitespace-nowrap tabular-nums border-r border-slate-100 dark:border-slate-800/60">
                    {actualElement}
                </td>
                <td className="w-[1%] px-2 py-[3px] text-center whitespace-nowrap tabular-nums border-r border-slate-100 dark:border-slate-800/60">
                    {percentElement}
                </td>
                <td className="w-[1%] px-2 py-[3px] text-center whitespace-nowrap tabular-nums">
                    {remainingElement}
                </td>
            </tr>
        );
    };

    return (
        <div 
            ref={cardRef} 
            className="competition-group-card cv-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col h-full overflow-hidden"
        >
            {/* Title bar — Apple Modern Header */}
            <div className="bg-gradient-to-r from-sky-600 via-sky-600 to-indigo-600 text-white px-4 py-2.5 sm:py-3 border-b border-sky-500/30 relative overflow-hidden shadow-xs before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/20">
                <div className="relative min-w-0 w-full flex items-center justify-center">
                    <h4 className="text-[13px] sm:text-[14px] font-bold uppercase text-white text-center truncate whitespace-nowrap px-10 leading-snug tracking-wider drop-shadow-2xs" title={header.originalTitle}>
                        {displayTitle}
                    </h4>

                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-end">
                        <Button
                            type="button"
                            variant="unstyled" size="none"
                            onClick={handleExportPNG}
                            className="export-button-component w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-all ycx-hit"
                            title="Xuất ảnh báo cáo (PNG)"
                        >
                            <AppIcon name="exportImage" size="md" />
                        </Button>
                    </div>
                </div>
            </div>
            {/* Table — Apple Style Design */}
            <div className="flex-1">
                <table className="table-pin-first w-full border-collapse">
                    <thead>
                        <tr className="text-[11px] font-black uppercase tracking-wider bg-gradient-to-b from-slate-100 to-slate-200/90 dark:from-slate-800 dark:to-slate-850 text-slate-700 dark:text-slate-200 border-b-2 border-slate-300 dark:border-slate-700 shadow-2xs">
                            <th className={`text-left px-3 py-2 sm:py-2.5 min-w-[170px] border-r border-slate-300/80 dark:border-slate-700 ${sortConfig.key === 'name' ? 'bg-sky-100/70 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300' : ''}`}>
                                <Button variant="unstyled" size="none" onClick={() => handleCardSort('name')} className={`font-black uppercase tracking-wider flex items-center justify-start w-full group transition-colors ${sortConfig.key === 'name' ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400'}`}>
                                    NHÂN VIÊN{getSortIcon('name')}
                                </Button>
                            </th>
                            <th className={`w-[1%] text-center px-2.5 py-2 sm:py-2.5 whitespace-nowrap border-r border-slate-300/80 dark:border-slate-700 ${sortConfig.key === 'target' ? 'bg-sky-100/70 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300' : ''}`}>
                                <Button variant="unstyled" size="none" onClick={() => handleCardSort('target')} className={`font-black uppercase tracking-wider flex items-center justify-center w-full group transition-colors ${sortConfig.key === 'target' ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400'}`}>
                                    M.TIÊU{getSortIcon('target')}
                                </Button>
                            </th>
                            <th className={`w-[1%] text-center px-2.5 py-2 sm:py-2.5 whitespace-nowrap border-r border-slate-300/80 dark:border-slate-700 ${sortConfig.key === 'actual' ? 'bg-sky-100/70 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300' : ''}`}>
                                <Button variant="unstyled" size="none" onClick={() => handleCardSort('actual')} className={`font-black uppercase tracking-wider flex items-center justify-center w-full group transition-colors ${sortConfig.key === 'actual' ? 'text-sky-700 dark:text-sky-300' : 'text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400'}`}>
                                    T.HIỆN{getSortIcon('actual')}
                                </Button>
                            </th>
                            <th className={`w-[1%] text-center px-2.5 py-2 sm:py-2.5 whitespace-nowrap border-r border-slate-300/80 dark:border-slate-700 ${sortConfig.key === 'completion' ? 'bg-sky-100/70 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300' : ''}`}>
                                <Button variant="unstyled" size="none" onClick={() => handleCardSort('completion')} className={`font-black uppercase tracking-wider flex items-center justify-center w-full group transition-colors ${sortConfig.key === 'completion' ? 'text-sky-700 dark:text-sky-300' : 'text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400'}`}>
                                    %HT{getSortIcon('completion')}
                                </Button>
                            </th>
                            <th className={`w-[1%] text-center px-2.5 py-2 sm:py-2.5 whitespace-nowrap ${sortConfig.key === 'remaining' ? 'bg-sky-100/70 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300' : ''}`}>
                                <Button variant="unstyled" size="none" onClick={() => handleCardSort('remaining')} className={`font-black uppercase tracking-wider flex items-center justify-center w-full group transition-colors ${sortConfig.key === 'remaining' ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400'}`}>
                                    C.LẠI{getSortIcon('remaining')}
                                </Button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {departmentNames.map(deptName => {
                            const employeesInDept = employeesByDept[deptName];

                            if (viewMode === 'group') {
                                let totalTarget = 0;
                                let totalActual = 0;
                                employeesInDept.forEach(emp => {
                                    totalTarget += roundUp(resolveEmployeeTarget(employeeCompetitionTargets, header.originalTitle, emp.originalName));
                                    totalActual += employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                                });
                                const totalRemaining = totalActual - totalTarget;
                                const totalCompletion = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

                                return (
                                    <React.Fragment key={deptName}>
                                        <tr className="bg-slate-100/70 dark:bg-slate-800/60">
                                            <td colSpan={5} className="px-2.5 py-1 font-bold text-slate-600 dark:text-slate-300 text-left uppercase text-[11px] tracking-wider border-b border-slate-200/60 dark:border-slate-700/60">
                                                {deptName}
                                            </td>
                                        </tr>
                                        {employeesInDept.map((employee, index) => renderEmployeeRow(employee, index))}
                                        {/* Dept total — emerald style */}
                                        {departmentNames.length > 1 && (
                                            <tr className="bg-emerald-50/70 dark:bg-emerald-950/30 font-bold text-emerald-800 dark:text-emerald-300 border-t border-emerald-200 dark:border-emerald-800/60">
                                                <td className="px-2.5 py-1 text-center uppercase text-[11px] tracking-wider border-r border-emerald-200/70 dark:border-emerald-800/60">Tổng {deptName}</td>
                                                <td className="w-[1%] px-2 py-1 text-center text-[11px] whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300 font-semibold border-r border-emerald-200/70 dark:border-emerald-800/60">{formatter.format(roundUp(totalTarget))}</td>
                                                <td className="w-[1%] px-2 py-1 text-center text-[11px] whitespace-nowrap tabular-nums text-slate-900 dark:text-white font-bold border-r border-emerald-200/70 dark:border-emerald-800/60">{formatter.format(roundUp(totalActual))}</td>
                                                <td className="w-[1%] px-2 py-1 text-center text-[11px] whitespace-nowrap tabular-nums font-bold text-emerald-700 dark:text-emerald-300 border-r border-emerald-200/70 dark:border-emerald-800/60">
                                                    {roundUp(totalCompletion).toFixed(0)}%
                                                </td>
                                                <td className={`w-[1%] px-2 py-1 text-center text-[11px] whitespace-nowrap tabular-nums font-bold ${totalRemaining >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                                    {totalRemaining > 0 ? `+${formatter.format(roundUp(totalRemaining))}` : formatter.format(roundUp(totalRemaining))}
                                                </td>
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
                        {/* Grand Total — Apple Executive Bar */}
                        <tr className="bg-gradient-to-r from-sky-50 via-slate-50 to-sky-50 dark:from-sky-950/60 dark:via-slate-850 dark:to-sky-950/60 border-t-2 border-sky-400 dark:border-sky-500 shadow-2xs">
                             <td className="px-2.5 py-1.5 text-center border-r border-sky-200/80 dark:border-sky-800/60">
                                 <span className="font-black uppercase tracking-wider text-[12px] text-slate-900 dark:text-white">
                                     TỔNG
                                 </span>
                             </td>
                             <td className="w-[1%] px-2 py-1.5 text-center text-[12px] whitespace-nowrap tabular-nums font-black text-slate-800 dark:text-slate-100 border-r border-sky-200/80 dark:border-sky-800/60">
                                 {formatter.format(roundUp(grandTotalTarget))}
                             </td>
                             <td className="w-[1%] px-2 py-1.5 text-center text-[13px] whitespace-nowrap tabular-nums font-black text-slate-950 dark:text-white border-r border-sky-200/80 dark:border-sky-800/60">
                                 {formatter.format(roundUp(grandTotalActual))}
                             </td>
                             <td className="w-[1%] px-2 py-1.5 text-center text-[13px] whitespace-nowrap tabular-nums font-black border-r border-sky-200/80 dark:border-sky-800/60">
                                 <span className="inline-block px-1.5 py-0.5 rounded bg-sky-100/90 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-black">
                                     {roundUp(grandTotalCompletion).toFixed(0)}%
                                 </span>
                             </td>
                             <td className={`w-[1%] px-2 py-1.5 text-center text-[12.5px] whitespace-nowrap tabular-nums font-black ${grandTotalRemaining >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                 {grandTotalRemaining > 0 ? `+${formatter.format(roundUp(grandTotalRemaining))}` : formatter.format(roundUp(grandTotalRemaining))}
                             </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
});
