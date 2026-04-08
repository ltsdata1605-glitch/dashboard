import React, { useRef, useState, useMemo } from 'react';
import { ChevronDownIcon, ChevronUpIcon, CameraIcon } from '../Icons';
import { CompetitionHeader, Employee } from '../../types/nhanVienTypes';
import { roundUp, shortenName } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';

interface CompetitionGroupCardProps {
    header: CompetitionHeader;
    sortedEmployees: Employee[];
    employeeDataMap: Map<string, { name: string; department: string; values: Record<string, number | null> }>;
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    colorScheme: { main: string; light: string; text: string; hover: string; zebra: string; footer: string };
    highlightColorMap: Record<string, string>;
    viewMode?: 'group' | 'list';
}

export const CompetitionGroupCard: React.FC<CompetitionGroupCardProps> = ({
    header,
    sortedEmployees,
    employeeDataMap,
    employeeCompetitionTargets,
    colorScheme,
    highlightColorMap,
    viewMode = 'group'
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    type SortKey = 'name' | 'target' | 'actual' | 'completion' | 'remaining';
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'remaining', direction: 'desc' });
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});

    const displayTitle = useMemo(() => shortenName(header.originalTitle, nameOverrides), [header.originalTitle, nameOverrides]);

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
    
    const handleExportPNG = async () => {
        if (!cardRef.current || !(window as any).html2canvas) {
            alert("Thư viện xuất ảnh chưa sẵn sàng. Vui lòng thử lại sau.");
            return;
        }
        
        try {
            const originalCard = cardRef.current;
            const clone = originalCard.cloneNode(true) as HTMLElement;
            
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = 'max-content';
            clone.style.minWidth = 'max-content';
            clone.style.maxWidth = 'none';
            clone.style.height = 'auto'; 
            clone.style.minHeight = 'auto';
            clone.style.boxShadow = 'none';
            clone.style.margin = '0';
            clone.style.borderRadius = '0';
            clone.style.display = 'inline-block';
            
            clone.classList.remove('h-full');
            
            if (document.documentElement.classList.contains('dark')) clone.classList.add('dark');
            clone.classList.add('export-mode');
            
            const exportButton = clone.querySelector('.export-button-component') as HTMLElement | null;
            if (exportButton) exportButton.remove();
            
            const tableContainer = clone.querySelector('.overflow-x-auto') as HTMLElement | null;
            if (tableContainer) {
                tableContainer.style.overflow = 'visible';
                tableContainer.style.height = 'auto';
                tableContainer.style.width = 'max-content';
            }

            const tableInClone = clone.querySelector('table') as HTMLElement | null;
            if (tableInClone) {
                tableInClone.style.width = 'max-content';
                tableInClone.style.minWidth = '100%';
                tableInClone.style.height = 'auto';
                tableInClone.style.tableLayout = 'auto'; // Cho phép bảng tự dãn rộng theo tên nhân viên khi xuất
            }

            document.body.appendChild(clone);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const finalWidth = clone.offsetWidth;
            const finalHeight = clone.offsetHeight;
            
            const headerDiv = clone.querySelector('div:first-child') as HTMLElement;
            if (headerDiv) {
                headerDiv.style.width = '100%';
                const h4 = headerDiv.querySelector('h4');
                if (h4) {
                    h4.style.paddingLeft = '15px';
                    h4.style.paddingRight = '15px';
                    h4.style.width = '100%';
                }
            }

            const canvas = await (window as any).html2canvas(clone, {
                scale: 2,
                useCORS: true,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                width: finalWidth,
                height: finalHeight,
                windowWidth: finalWidth,
                windowHeight: finalHeight,
                logging: false
            });

            canvas.toBlob((blob: Blob | null) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `${displayTitle.replace(/[\s/]/g, '_')}.png`;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);
            }, 'image/png');
            
            document.body.removeChild(clone);
        } catch (err) {
            console.error('Failed to export image', err);
            alert('Đã xảy ra lỗi khi xuất ảnh. Vui lòng thử lại.');
        }
    };
    
    const sortedEmployeesForCard = useMemo(() => {
        const employeesForThisComp = sortedEmployees.filter(emp => {
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
    const grandTotalRemainingColor = 'text-white';

    const renderEmployeeRow = (employee: Employee, index: number, bottom30Threshold: number) => {
        const target = employeeCompetitionTargets.get(header.originalTitle)?.get(employee.originalName) ?? 0;
        const actual = employeeDataMap.get(employee.name)?.values[header.title] ?? 0;
        const completion = target > 0 ? (actual / target) * 100 : 0;
        const remaining = actual - target;
        const remainingColor = remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        const isBottom30 = actual <= bottom30Threshold;
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dayOfMonth = now.getDate();
        const timeProgressPercent = ((dayOfMonth - 1) / daysInMonth) * 100;
        const completionVal = roundUp(completion);
        
        let percentHighlightClass = '';
        if (isBottom30 || completionVal < timeProgressPercent) {
            percentHighlightClass = 'text-red-600 font-bold';
        } else if (completionVal >= timeProgressPercent * 1.3) {
            percentHighlightClass = 'text-green-600 dark:text-green-400 font-bold';
        } else {
            percentHighlightClass = 'text-yellow-600 dark:text-yellow-400 font-bold';
        }
        
        const actualHighlightClass = percentHighlightClass;
        const highlightClass = highlightColorMap[employee.originalName] || '';

        return (
            <tr key={employee.originalName} className={`
                ${highlightClass 
                    ? `${highlightClass} font-bold border-b border-slate-100 dark:border-slate-700` 
                    : `border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer text-[12px]`
                } 
                last:border-b-0`}>
                <td className="px-1.5 py-1.5 whitespace-nowrap text-slate-800 dark:text-slate-100 text-left leading-tight">
                    <span>{employee.name}</span>
                </td>
                <td className="px-1 py-1.5 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">{formatter.format(roundUp(target))}</td>
                <td className={`px-1 py-1.5 text-center font-medium whitespace-nowrap tabular-nums ${actualHighlightClass}`}>
                    {(!actual || actual === 0) ? '-' : formatter.format(roundUp(actual))}
                </td>
                <td className={`px-1 py-1.5 text-center font-bold whitespace-nowrap tabular-nums ${percentHighlightClass}`}>
                    {(!actual || actual === 0) ? '-' : `${roundUp(completion).toFixed(0)}%`}
                </td>
                <td className={`px-1 py-1.5 text-center font-medium whitespace-nowrap tabular-nums ${remainingColor}`}>{formatter.format(roundUp(remaining))}</td>
            </tr>
        );
    };

    return (
        <div 
            ref={cardRef} 
            className="competition-group-card bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col h-full transition-all overflow-hidden"
        >
            <div className="p-3 bg-slate-100 dark:bg-slate-900 shadow-inner flex justify-center items-center relative rounded-t-lg min-h-[44px] border-b border-slate-200 dark:border-slate-700">
                <h4 className="text-[14px] font-black uppercase text-indigo-700 dark:text-indigo-400 text-center whitespace-normal px-8 leading-loose" title={header.originalTitle}>
                    {displayTitle}
                </h4>
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                        type="button"
                        onClick={handleExportPNG}
                        className="export-button-component p-1.5 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 focus:outline-none transition-colors shadow-sm cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                        title="Xuất ảnh báo cáo (PNG)"
                    >
                        <CameraIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div className="mt-1">
                <table className="w-full text-[11px] table-fixed border-collapse compact-export-table">
                    <colgroup>
                        <col className="w-[30%]" />
                        <col className="w-[17%]" />
                        <col className="w-[17%]" />
                        <col className="w-[15%]" />
                        <col className="w-[21%]" />
                    </colgroup>
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-bold text-slate-500 tracking-wider">
                            <th className="text-left px-1.5 py-1.5 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700">
                                <button onClick={() => handleCardSort('name')} className="flex items-center w-full group">NV{getSortIcon('name')}</button>
                            </th>
                            <th className="text-center px-1 py-1.5 whitespace-nowrap border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700">
                                <button onClick={() => handleCardSort('target')} className="flex items-center justify-center w-full group">TGT{getSortIcon('target')}</button>
                            </th>
                            <th className="text-center px-1 py-1.5 whitespace-nowrap border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700">
                                <button onClick={() => handleCardSort('actual')} className="flex items-center justify-center w-full group">TH{getSortIcon('actual')}</button>
                            </th>
                            <th className="text-center px-1 py-1.5 whitespace-nowrap border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700">
                                <button onClick={() => handleCardSort('completion')} className="flex items-center justify-center w-full group">%HT{getSortIcon('completion')}</button>
                            </th>
                            <th className="text-center px-1 py-1.5 whitespace-nowrap border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600">
                                <button onClick={() => handleCardSort('remaining')} className="flex items-center justify-center w-full group">CÒN LẠI{getSortIcon('remaining')}</button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {departmentNames.map(deptName => {
                            const employeesInDept = employeesByDept[deptName];
                            const actualValues = employeesInDept.map(emp => {
                                return employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                            }).filter(val => val > 0);
                            actualValues.sort((a, b) => a - b);
                            const bottom30Index = Math.floor(actualValues.length * 0.3);
                            const bottom30Threshold = actualValues.length > 0 ? actualValues[bottom30Index] : -Infinity;

                            if (viewMode === 'group') {
                                let totalTarget = 0;
                                let totalActual = 0;
                                employeesInDept.forEach(emp => {
                                    totalTarget += employeeCompetitionTargets.get(header.originalTitle)?.get(emp.originalName) ?? 0;
                                    totalActual += employeeDataMap.get(emp.name)?.values[header.title] ?? 0;
                                });
                                const totalRemaining = totalActual - totalTarget;
                                const totalCompletion = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
                                const totalRemainingColor = totalRemaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                
                                return (
                                    <React.Fragment key={deptName}>
                                        <tr className="bg-slate-50 dark:bg-slate-700/50">
                                            <td colSpan={5} className="px-1.5 py-1 font-bold text-slate-500 dark:text-slate-400 text-left uppercase text-[9px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                                                {deptName}
                                            </td>
                                        </tr>
                                        {employeesInDept.map((employee, index) => renderEmployeeRow(employee, index, bottom30Threshold))}
                                        <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-white shadow-inner font-extrabold border-t-[3px] border-t-slate-200">
                                            <td className="px-1.5 py-1.5 text-left uppercase text-[10px] tracking-wider border-r border-slate-200 dark:border-slate-700">Tổng {deptName}</td>
                                            <td className="px-1 py-1.5 text-center whitespace-nowrap tabular-nums border-r border-slate-200 dark:border-slate-700">{formatter.format(roundUp(totalTarget))}</td>
                                            <td className="px-1 py-1.5 text-center whitespace-nowrap tabular-nums border-r border-slate-200 dark:border-slate-700">{formatter.format(roundUp(totalActual))}</td>
                                            <td className="px-1 py-1.5 text-center font-bold whitespace-nowrap tabular-nums border-r border-slate-200 dark:border-slate-700">{roundUp(totalCompletion).toFixed(0)}%</td>
                                            <td className={`px-1 py-1.5 text-center whitespace-nowrap tabular-nums border-r border-slate-200 dark:border-slate-700`}>{formatter.format(roundUp(totalRemaining))}</td>
                                        </tr>
                                    </React.Fragment>
                                );
                            } else {
                                return (
                                    <React.Fragment key={deptName}>
                                        {employeesInDept.map((employee, index) => renderEmployeeRow(employee, index, bottom30Threshold))}
                                    </React.Fragment>
                                );
                            }
                        })}
                        <tr className="bg-indigo-50 dark:bg-indigo-900/40 shadow-inner font-extrabold text-indigo-800 dark:text-indigo-200 border-t-[3px] border-t-indigo-200 dark:border-t-indigo-800">
                             <td className="px-1.5 py-1.5 text-left uppercase text-[11px] tracking-wider border-r border-indigo-200 dark:border-indigo-800/50">TỔNG</td>
                             <td className="px-1 py-1.5 text-center whitespace-nowrap border-r border-indigo-200 dark:border-indigo-800/50 tabular-nums">{formatter.format(roundUp(grandTotalTarget))}</td>
                             <td className="px-1 py-1.5 text-center whitespace-nowrap border-r border-indigo-200 dark:border-indigo-800/50 tabular-nums">{formatter.format(roundUp(grandTotalActual))}</td>
                             <td className="px-1 py-1.5 text-center whitespace-nowrap border-r border-indigo-200 dark:border-indigo-800/50 tabular-nums">{roundUp(grandTotalCompletion).toFixed(0)}%</td>
                             <td className={`px-1 py-1.5 text-center whitespace-nowrap tabular-nums`}>{formatter.format(roundUp(grandTotalRemaining))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};