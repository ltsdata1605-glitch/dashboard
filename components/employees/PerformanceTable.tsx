
import React, { useMemo, useState, forwardRef, useEffect, useRef } from 'react';
import type { Employee, EmployeeData } from '../../types';
import { abbreviateName, formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { getDailyTarget, saveDailyTarget } from '../../services/dbService';

interface PerformanceTableProps {
    employeeData: EmployeeData | null | undefined;
    onEmployeeClick: (employeeName: string) => void;
    onExport?: () => void;
    isExporting?: boolean;
}

type SortKey = keyof Employee | 'name' | 'percentHT' | 'dtVuot' | 'target';
type SortDirection = 'asc' | 'desc';
type GroupType = 'doanhThu' | 'khaiThac' | 'vuotTroi';

const getTraChamPercentClass = (percentage: number) => {
    if (isNaN(percentage)) return 'text-slate-400 font-medium';
    if (percentage >= 45) return 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg font-bold';
    if (percentage >= 35) return 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg font-bold';
    return 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg font-bold';
};

const getProgressBarColor = (percent: number) => {
    if (percent >= 100) return 'bg-gradient-to-r from-emerald-400 to-teal-500';
    if (percent >= 80) return 'bg-gradient-to-r from-blue-400 to-indigo-500';
    if (percent >= 50) return 'bg-gradient-to-r from-amber-400 to-orange-500';
    return 'bg-gradient-to-r from-red-400 to-rose-500';
};

const getPercentTextColor = (percent: number) => {
    if (percent >= 100) return 'text-emerald-600 dark:text-emerald-400';
    if (percent >= 80) return 'text-blue-600 dark:text-blue-400';
    if (percent >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
};

// Safe sort function to prevent crashes
const safeSort = (a: any, b: any, key: string, direction: SortDirection) => {
    try {
        const valA = a?.[key];
        const valB = b?.[key];

        // Handle null/undefined values safely
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1; // Push undefined to bottom
        if (valB === undefined || valB === null) return -1;

        // Try numeric sort for numeric keys (exclude known string keys)
        if (key !== 'name' && key !== 'department') {
            const numA = Number(valA);
            const numB = Number(valB);
            if (!isNaN(numA) && !isNaN(numB)) {
                 // Handle Infinity
                if (!isFinite(numA) && !isFinite(numB)) return 0;
                if (!isFinite(numA)) return numA === Infinity ? 1 : -1;
                if (!isFinite(numB)) return numB === Infinity ? -1 : 1;

                return direction === 'asc' ? numA - numB : numB - numA;
            }
        }
        
        // Fallback to string comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        
        return 0;
    } catch (error) {
        console.error("Sort error:", error);
        return 0;
    }
};

const themes = {
    vuotTroi: { iconBg: 'bg-indigo-100 text-indigo-600', accent: 'indigo' },
    doanhThu: { iconBg: 'bg-emerald-100 text-emerald-600', accent: 'emerald' },
    khaiThac: { iconBg: 'bg-blue-100 text-blue-600', accent: 'blue' }
};

const RenderSingleTable = ({
    groupType,
    handleTabChange,
    sortConfig,
    onSort,
    tableRef,
    onSingleExport,
    isExporting,
    groupedData,
    outstandingData,
    grandTotal,
    targetPerEmployee,
    onEmployeeClick,
    isEditingTarget,
    targetInputRef,
    setTargetPerEmployee,
    handleSaveTarget,
    setIsEditingTarget,
    tempTarget,
    setTempTarget,
    fullSellerArrayLength,
}: {
    groupType: GroupType;
    handleTabChange: (tab: GroupType) => void;
    sortConfig: { key: string; direction: SortDirection };
    onSort: (key: SortKey) => void;
    tableRef: React.RefObject<HTMLDivElement>;
    onSingleExport: () => void;
    isExporting?: boolean;
    groupedData: { [key: string]: Employee[] };
    outstandingData: { [key: string]: Employee[] };
    grandTotal: any;
    targetPerEmployee: number;
    onEmployeeClick: (name: string) => void;
    isEditingTarget: boolean;
    targetInputRef: React.RefObject<HTMLInputElement>;
    setTargetPerEmployee: (val: number) => void;
    handleSaveTarget: () => void;
    setIsEditingTarget: (val: boolean) => void;
    tempTarget: string;
    setTempTarget: (val: string) => void;
    fullSellerArrayLength: number;
}) => {
    const [columnCopySuccess, setColumnCopySuccess] = useState<string | null>(null);

    let title = "";
    let subTitle = "";
    let icon = "";
    let headers: { label: string, key: string, align?: 'left'|'center'|'right', width?: string }[] = [];
    let dataToRender: any = groupedData;
    const theme = themes[groupType];

    if (groupType === 'doanhThu') {
        title = 'Hiệu Quả Doanh Thu';
        subTitle = 'Phân tích doanh thu & hiệu quả quy đổi';
        icon = 'wallet';
        headers = [
            { label: 'Thực', key: 'doanhThuThuc', align: 'center' }, 
            { label: 'DTQĐ', key: 'doanhThuQD', align: 'center' },
            { label: 'HQQĐ', key: 'hieuQuaValue', align: 'center' }, 
            { label: '%DT T.CHẬM', key: 'dtTraChamPercent_CE_ICT', align: 'center' },
            { label: 'Weak', key: 'weakPointsRevenue', align: 'center', width: 'w-12' }
        ];
    } else if (groupType === 'khaiThac') {
        title = 'Hiệu Quả Trả Chậm';
        subTitle = 'Tiếp cận khách hàng & Bán kèm';
        icon = 'layers';
        headers = [
            { label: 'T.Cận', key: 'slTiepCan', align: 'center' }, 
            { label: 'CE/ICT', key: 'slCE_ICT', align: 'center' },
            { label: 'T.Chậm', key: 'slTraCham_CE_ICT', align: 'center' }, 
            { label: '%SL T.CHẬM', key: 'traChamPercent_CE_ICT', align: 'center' },
            { label: '%DT T.CHẬM', key: 'dtTraChamPercent_CE_ICT', align: 'center' },
            { label: 'Weak', key: 'weakPointsExploitation', align: 'center', width: 'w-12' }
        ];
    } else { // vuotTroi
        const todayDate = new Date().toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'});
        title = `Mục Tiêu Vượt Trội`;
        subTitle = `Cập nhật ngày ${todayDate}`;
        icon = 'trophy';
        headers = [
            { label: 'Thực', key: 'doanhThuThuc', align: 'center' },
            { label: 'DTQĐ', key: 'doanhThuQD', align: 'center' },
            { label: 'Target', key: 'target', align: 'center' },
            { label: '%HT', key: 'percentHT', align: 'center', width: 'w-24' },
            { label: 'HQQĐ', key: 'hieuQuaValue', align: 'center' },
            { label: 'Vượt', key: 'dtVuot', align: 'center' }
        ];
        dataToRender = outstandingData;
    }

    const handleCopyBottom40 = (e: React.MouseEvent, key: string, label: string) => {
        e.stopPropagation();
        if (!dataToRender) return;
        const allEmployees = Object.values(dataToRender).flat() as any[];
        if (allEmployees.length === 0) return;

        const sorted = [...allEmployees].sort((a, b) => (a[key] ?? 0) - (b[key] ?? 0));
        const initialCutoff = Math.ceil(sorted.length * 0.4);
        const valueAtCutoff = sorted[initialCutoff - 1]?.[key] ?? 0;
        
        let finalSelection = valueAtCutoff <= 0 ? sorted.filter(emp => (emp[key] ?? 0) <= 0) : sorted.slice(0, initialCutoff);
        const getId = (n: string) => n.split(/[-–]/)[0].trim();
        
        let content = `⚠️ CẢNH BÁO: DANH SÁCH ${label.toUpperCase()} THẤP (BOTTOM 40%)\nCác bạn sau cần tập trung cải thiện chỉ số này ngay:\n`;
        finalSelection.forEach(e => content += `@${getId(e.name)}\n`);

        navigator.clipboard.writeText(content).then(() => {
            setColumnCopySuccess(String(key));
            setTimeout(() => setColumnCopySuccess(null), 2000);
        });
    };

    const renderHeader = (h: { label: string, key: string, align?: string, width?: string }) => {
        const isTargetHeader = h.label === 'Target' && groupType === 'vuotTroi';
        const canCopy = groupType === 'vuotTroi' && ['doanhThuThuc', 'doanhThuQD', 'percentHT', 'dtVuot', 'hieuQuaValue', 'dtTraChamPercent_CE_ICT'].includes(String(h.key));
        const alignClass = h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left';

        if (isTargetHeader && isEditingTarget) {
            return (
                <th key={String(h.key)} className="px-2 py-3 align-middle uppercase">
                    <input 
                        ref={targetInputRef}
                        type="number" 
                        value={tempTarget} 
                        onChange={(e) => setTempTarget(e.target.value)}
                        onBlur={handleSaveTarget}
                        className="w-full px-2 py-1 text-xs text-center border-2 border-indigo-500 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTarget();
                            if (e.key === 'Escape') setIsEditingTarget(false);
                        }}
                    />
                </th>
            );
        }

        return (
            <th 
                key={String(h.key)}
                onClick={() => isTargetHeader ? (setTempTarget(String(targetPerEmployee)), setIsEditingTarget(true)) : onSort(h.key as SortKey)}
                className={`px-3 py-2 text-sm font-bold text-[#46505e] cursor-pointer group/header select-none ${alignClass} ${h.width || ''} border-b border-slate-200 dark:border-slate-800 uppercase`}
            >
                <div className={`flex items-center gap-1 ${h.align === 'right' ? 'justify-end' : h.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    {h.label}
                    {isTargetHeader && <Icon name="edit-3" size={3} className="opacity-50 group-hover/header:opacity-100" />}
                    {canCopy && (
                        <button onClick={(e) => handleCopyBottom40(e, h.key, h.label)} className="opacity-0 group-hover/header:opacity-100 p-1 hover:text-red-500 transition-opacity">
                            <Icon name="copy" size={3} />
                        </button>
                    )}
                    {sortConfig.key === h.key && (
                        <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} className="text-indigo-500" />
                    )}
                </div>
                {columnCopySuccess === String(h.key) && (
                    <div className="absolute inset-0 bg-emerald-500 text-white text-[9px] flex items-center justify-center rounded-lg animate-fade-in">Copied!</div>
                )}
            </th>
        );
    };

    const showDeptHeaders = dataToRender && (Object.keys(dataToRender).length > 1 || (Object.keys(dataToRender).length === 1 && Object.keys(dataToRender)[0] !== 'Không Phân Ca'));
    const showGroupTotals = dataToRender && Object.keys(dataToRender).length > 1;
    const medals = ['🥇', '🥈', '🥉'];

    if (!dataToRender || Object.keys(dataToRender).length === 0) {
        return (
            <div ref={tableRef} className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center justify-center h-full">
                <Icon name="inbox" size={8} className="text-slate-300 mb-2" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Không có dữ liệu hiển thị</p>
            </div>
        );
    }

    return (
        <div ref={tableRef} className="overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme.iconBg} shadow-sm`}>
                        <Icon name={icon} size={6} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{title}</h3>
                        <p className="text-xs font-medium text-slate-400">{subTitle}</p>
                    </div>
                </div>
                <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 hide-on-export overflow-x-auto rounded-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <button onClick={() => handleTabChange('doanhThu')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${groupType === 'doanhThu' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Doanh Thu</button>
                            <button onClick={() => handleTabChange('khaiThac')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${groupType === 'khaiThac' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Trả Chậm</button>
                            <button onClick={() => handleTabChange('vuotTroi')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${groupType === 'vuotTroi' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Vượt Trội</button>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onSingleExport(); }} 
                            disabled={isExporting} 
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Xuất Ảnh Tab"
                        >
                            {isExporting ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name="camera" size={5} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar flex-grow">
                <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-800">
                    <thead className="sticky top-0 z-10 bg-[#dee6ed] dark:bg-slate-800 backdrop-blur-sm">
                        <tr>
                            <th colSpan={2} onClick={() => onSort('name')} className="px-4 py-2 text-center text-sm font-bold text-[#46505e] cursor-pointer uppercase border-b border-slate-300 dark:border-slate-700"># - Nhân Viên</th>
                            {headers.map(h => {
                                if (h.key === 'weakPointsRevenue' || h.key === 'weakPointsExploitation') {
                                    return (
                                        <th key={h.key} title="SOS: Danh sách các điểm yếu cần cải thiện ngay" onClick={() => onSort(h.key as SortKey)} className="px-3 py-2 text-sm font-bold text-[#46505e] text-center border-b border-slate-300 dark:border-slate-700 uppercase cursor-help">
                                            SOS
                                        </th>
                                    );
                                }
                                return renderHeader({ ...h, label: h.label.toUpperCase() });
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {dataToRender && typeof dataToRender === 'object' && Object.entries(dataToRender).map(([dept, employees]: [string, any], deptIdx) => {
                            if (!employees || !Array.isArray(employees)) return null;
                            
                            const pastelColors = [
                                'bg-blue-50/50 dark:bg-blue-900/20',
                                'bg-emerald-50/50 dark:bg-emerald-900/20',
                                'bg-purple-50/50 dark:bg-purple-900/20',
                                'bg-amber-50/50 dark:bg-amber-900/20',
                                'bg-rose-50/50 dark:bg-rose-900/20',
                                'bg-sky-50/50 dark:bg-sky-900/20',
                                'bg-indigo-50/50 dark:bg-indigo-900/20',
                                'bg-teal-50/50 dark:bg-teal-900/20'
                            ];
                            const deptColor = pastelColors[deptIdx % pastelColors.length];

                            return (
                            <React.Fragment key={dept || 'unknown-dept'}>
                                {showDeptHeaders && (
                                    <tr className={deptColor}>
                                        <td colSpan={2 + headers.length} className="px-4 py-2 text-xs font-black text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-800">
                                            <div className="flex items-center gap-2"><Icon name="users" size={3} /> {dept || 'Không Phân Ca'}</div>
                                        </td>
                                    </tr>
                                )}
                                {employees.map((employee, index) => {
                                    if (!employee) return null;
                                    const rankIndex = index;
                                    const medal = rankIndex < 3 ? medals[rankIndex] : null;
                                    const rankDisplay = medal ? <span className="text-lg">{medal}</span> : <span className="text-xs font-bold text-slate-400">#{rankIndex + 1}</span>;

                                    return (
                                    <tr key={`${dept || 'no-dept'}-${employee.name || 'no-name'}-${index}`} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td colSpan={2} className="px-4 py-1 text-left border-b border-slate-200 dark:border-slate-800">
                                            <div onClick={() => onEmployeeClick(employee.name)} className="flex items-center gap-3 cursor-pointer">
                                                <div className="w-8 flex justify-center">{rankDisplay}</div>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors truncate">
                                                    {abbreviateName(employee.name)}
                                                </span>
                                            </div>
                                        </td>
                                        {headers.map(h => (
                                            <td key={h.key} className={`px-3 py-1 text-sm ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'} border-b border-slate-200 dark:border-slate-800`}>
                                                <div className="flex flex-col justify-center h-full">
                                                    { h.key === 'doanhThuThuc' && <span className="text-slate-500 font-normal">{formatCurrency(employee.doanhThuThuc)}</span> }
                                                    { h.key === 'doanhThuQD' && <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(employee.doanhThuQD)}</span> }
                                                    { h.key === 'hieuQuaValue' && <span className={`font-bold ${Number(employee.hieuQuaValue || 0) < 35 ? 'text-rose-500' : 'text-emerald-600'}`}>{Number(employee.hieuQuaValue || 0).toFixed(0)}%</span> }
                                                    
                                                    { h.key === 'dtTraChamPercent_CE_ICT' && <span className={`${getTraChamPercentClass(Number(employee.dtTraChamPercent_CE_ICT || 0))} font-bold`}>{Number(employee.dtTraChamPercent_CE_ICT || 0).toFixed(0)}%</span> }
                                                    { h.key === 'weakPointsRevenue' && <span className={`font-bold ${Number(employee.weakPointsRevenue || 0) > 0 ? 'text-rose-500 bg-rose-50 px-2 rounded' : 'text-slate-300'}`}>{employee.weakPointsRevenue || '-'}</span> }
                                                    
                                                    { h.key === 'slTiepCan' && <span className="font-normal text-slate-600">{formatQuantity(employee.slTiepCan)}</span> }
                                                    { h.key === 'slCE_ICT' && <span className="text-[#46505e] font-bold">{formatQuantity(employee.slCE_ICT)}</span> }
                                                    { h.key === 'slTraCham_CE_ICT' && <span className="text-slate-500 font-bold">{formatQuantity(employee.slTraCham_CE_ICT)}</span> }
                                                    { h.key === 'traChamPercent_CE_ICT' && <span className={`${getTraChamPercentClass(Number(employee.traChamPercent_CE_ICT || 0))} font-bold text-[#46505e]`}>{Number(employee.traChamPercent_CE_ICT || 0).toFixed(0)}%</span> }
                                                    { h.key === 'weakPointsExploitation' && <span className={`font-bold ${Number(employee.weakPointsExploitation || 0) > 0 ? 'text-rose-500 bg-rose-50 px-2 rounded' : 'text-slate-300'}`}>{employee.weakPointsExploitation || '-'}</span> }

                                                    { h.key === 'target' && <span className="text-[#FF2157] font-bold text-sm">{formatCurrency(employee.target, 0).replace('Tr', '')}</span> }
                                                    { h.key === 'percentHT' && (
                                                        <div className="w-full flex flex-col gap-1">
                                                            <div className="flex justify-center">
                                                                 <span className={`text-[10px] font-bold ${getPercentTextColor(Number(employee.percentHT || 0))}`}>{Number(employee.percentHT || 0).toFixed(0)}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full ${getProgressBarColor(Number(employee.percentHT || 0))}`} style={{ width: `${Math.min(Number(employee.percentHT || 0), 100)}%` }}></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    { h.key === 'dtVuot' && <span className={`font-bold ${Number(employee.dtVuot || 0) > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{Number(employee.dtVuot || 0) > 0 ? `+${formatCurrency(employee.dtVuot)}` : '-'}</span> }
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                )})}
                            </React.Fragment>
                        )})}
                    </tbody>
                    <tfoot className="bg-[#c4cbd3] dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700">
                        <tr>
                            <td colSpan={2} className="px-6 py-2 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest border-b border-slate-300 dark:border-slate-700 text-center">Tổng cộng</td>
                            {headers.map(h => (
                                <td key={h.key} className={`px-3 py-2 ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'} font-bold text-slate-700 dark:text-slate-200 text-sm border-b border-slate-300 dark:border-slate-700`}>
                                    { h.key === 'doanhThuThuc' && formatCurrency(grandTotal?.doanhThuThuc ?? 0) }
                                    { h.key === 'doanhThuQD' && <span className="text-indigo-600">{formatCurrency(grandTotal?.doanhThuQD ?? 0)}</span> }
                                    { h.key === 'hieuQuaValue' && <span className={(grandTotal?.hieuQuaValue ?? 0) < 35 ? 'text-rose-500' : 'text-emerald-600'}>{Number(grandTotal?.hieuQuaValue ?? 0).toFixed(0)}%</span> }
                                    { h.key === 'slTiepCan' && formatQuantity(grandTotal?.slTiepCan ?? 0) }
                                    { h.key === 'slCE_ICT' && formatQuantity(grandTotal?.slCE_ICT ?? 0) }
                                    { h.key === 'slTraCham_CE_ICT' && formatQuantity(grandTotal?.slTraCham_CE_ICT ?? 0) }
                                    { h.key === 'dtVuot' && <span className="text-emerald-600">{formatCurrency((grandTotal?.doanhThuQD ?? 0) - (targetPerEmployee * fullSellerArrayLength))}</span> }
                                    { !['doanhThuThuc', 'doanhThuQD', 'hieuQuaValue', 'slTiepCan', 'slCE_ICT', 'slTraCham_CE_ICT', 'dtVuot'].includes(h.key) && '-' }
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const PerformanceTable = React.memo(forwardRef<HTMLDivElement, PerformanceTableProps>(({ employeeData, onEmployeeClick, onExport, isExporting }, ref) => {
    const [activeTab, setActiveTab] = useState<GroupType>('doanhThu');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({ key: 'doanhThuQD', direction: 'desc' });
    const [targetPerEmployee, setTargetPerEmployee] = useState(150000000); 
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [tempTarget, setTempTarget] = useState(String(targetPerEmployee));
    const targetInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getDailyTarget().then(target => {
            if (target) {
                setTargetPerEmployee(target);
                setTempTarget(String(target));
            }
        });
    }, []);

    const handleSaveTarget = () => {
        const val = parseInt(tempTarget.replace(/\D/g, ''), 10);
        if (!isNaN(val) && val > 0) {
            setTargetPerEmployee(val);
            saveDailyTarget(val);
        } else {
            setTempTarget(String(targetPerEmployee));
        }
        setIsEditingTarget(false);
    };

    const handleTabChange = (newTab: GroupType) => {
        setActiveTab(newTab);
        // Reset sort config when switching tabs to avoid sorting by non-existent keys
        if (newTab === 'doanhThu') setSortConfig({ key: 'doanhThuQD', direction: 'desc' });
        else if (newTab === 'khaiThac') setSortConfig({ key: 'slTiepCan', direction: 'desc' });
        else if (newTab === 'vuotTroi') setSortConfig({ key: 'dtVuot', direction: 'desc' });
    };

    const { groupedData, outstandingData, grandTotal } = useMemo(() => {
        // Robust sort at array level
        const sortedArray = [...(employeeData?.fullSellerArray || [])].filter(Boolean).sort((a, b) => {
            return safeSort(a, b, sortConfig.key, sortConfig.direction);
        });

        const grouped: { [key: string]: Employee[] } = {};
        sortedArray.forEach(emp => {
            if (!emp) return;
            if (!grouped[emp.department]) grouped[emp.department] = [];
            grouped[emp.department].push(emp);
        });

        const outstanding: { [key: string]: Employee[] } = {};
        
        // Calculate outstanding metrics
        const fullOutstandingArray = sortedArray.map(emp => {
            if (!emp) return null;
            const percentHT = targetPerEmployee > 0 ? (emp.doanhThuQD / targetPerEmployee) * 100 : 0;
            const dtVuot = Math.max(0, emp.doanhThuQD - targetPerEmployee);
            return { ...emp, target: targetPerEmployee, percentHT, dtVuot };
        }).filter(item => item !== null) as any[];
        
        // If sorting by calculated fields (keys not in standard Employee)
        if (['target', 'percentHT', 'dtVuot'].includes(sortConfig.key)) {
             fullOutstandingArray.sort((a, b) => {
                return safeSort(a, b, sortConfig.key, sortConfig.direction);
            });
        }

        fullOutstandingArray.forEach(emp => {
            if (!emp) return;
            if (!outstanding[emp.department]) outstanding[emp.department] = [];
            outstanding[emp.department].push(emp);
        });

        return { groupedData: grouped, outstandingData: outstanding, grandTotal: employeeData?.averages }; 
        
    }, [employeeData, sortConfig, targetPerEmployee]);
    
    // Recalculate true Grand Total for footer
    const trueGrandTotal = useMemo(() => {
        const all: Employee[] = employeeData?.fullSellerArray || [];
        if (all.length === 0) return { doanhThuThuc: 0, doanhThuQD: 0, slTiepCan: 0, hieuQuaValue: 0 };
        
        const totalDTThuc = all.reduce((sum, e) => sum + Number(e.doanhThuThuc || 0), 0);
        const totalDTQD = all.reduce((sum, e) => sum + Number(e.doanhThuQD || 0), 0);
        const totalSlTiepCan = all.reduce((sum, e) => sum + Number(e.slTiepCan || 0), 0);
        
        return {
            doanhThuThuc: totalDTThuc,
            doanhThuQD: totalDTQD,
            slTiepCan: totalSlTiepCan,
            hieuQuaValue: totalDTThuc > 0 ? ((totalDTQD - totalDTThuc) / totalDTThuc) * 100 : 0
        };
    }, [employeeData]);

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    if (!employeeData) {
        return (
            <div className="flex items-center justify-center p-8 h-64">
                <Icon name="loader-2" className="animate-spin text-indigo-600" size={8} />
                <span className="ml-3 text-slate-500 font-medium">Đang tải dữ liệu...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">
            <RenderSingleTable 
                groupType={activeTab}
                handleTabChange={handleTabChange}
                sortConfig={sortConfig}
                onSort={handleSort}
                tableRef={ref as any}
                onSingleExport={onExport || (() => {})} 
                isExporting={isExporting}
                groupedData={groupedData}
                outstandingData={outstandingData}
                grandTotal={trueGrandTotal}
                targetPerEmployee={targetPerEmployee}
                onEmployeeClick={onEmployeeClick}
                isEditingTarget={isEditingTarget}
                targetInputRef={targetInputRef}
                setTargetPerEmployee={setTargetPerEmployee}
                handleSaveTarget={handleSaveTarget}
                setIsEditingTarget={setIsEditingTarget}
                tempTarget={tempTarget}
                setTempTarget={setTempTarget}
                fullSellerArrayLength={employeeData?.fullSellerArray?.length || 0}
            />
        </div>
    );
}));

export default PerformanceTable;
