
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

type SortKey = keyof Employee | 'name' | 'percentHT' | 'dtVuot' | 'target' | 'dtTraChamPercent_CE_ICT' | 'traChamPercent_CE_ICT';
type SortDirection = 'asc' | 'desc';
type GroupType = 'doanhThu' | 'khaiThac' | 'vuotTroi';

// ── Color helpers ────────────────────────────────────────────────────────────

const getProgressBarColor = (pct: number) => {
    if (pct >= 100) return 'from-emerald-400 to-teal-500';
    if (pct >= 80)  return 'from-blue-400 to-indigo-500';
    if (pct >= 50)  return 'from-amber-400 to-orange-400';
    return 'from-rose-400 to-red-500';
};

const getPercentBadge = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
    if (pct >= 80)  return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
    if (pct >= 50)  return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300';
};

const getTraChamBadge = (pct: number) => {
    if (isNaN(pct)) return 'text-slate-400';
    if (pct >= 45) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 rounded-lg font-bold';
    if (pct >= 35) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-2 py-0.5 rounded-lg font-bold';
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 px-2 py-0.5 rounded-lg font-bold';
};

const getHieuQuaBadge = (pct: number) => {
    if (pct >= 35) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300';
};

// ── Rank badge ───────────────────────────────────────────────────────────────
const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    if (rank === 0) return <span className="text-xl leading-none">🥇</span>;
    if (rank === 1) return <span className="text-xl leading-none">🥈</span>;
    if (rank === 2) return <span className="text-xl leading-none">🥉</span>;
    return (
        <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">
            #{rank + 1}
        </span>
    );
};

// ── Safe sort ────────────────────────────────────────────────────────────────
const safeSort = (a: any, b: any, key: string, dir: SortDirection) => {
    try {
        const vA = a?.[key], vB = b?.[key];
        if (vA === vB) return 0;
        if (vA == null) return 1;
        if (vB == null) return -1;
        if (key !== 'name' && key !== 'department') {
            const nA = Number(vA), nB = Number(vB);
            if (!isNaN(nA) && !isNaN(nB)) {
                if (!isFinite(nA) && !isFinite(nB)) return 0;
                if (!isFinite(nA)) return nA === Infinity ? 1 : -1;
                if (!isFinite(nB)) return nB === Infinity ? -1 : 1;
                return dir === 'asc' ? nA - nB : nB - nA;
            }
        }
        const sA = String(vA).toLowerCase(), sB = String(vB).toLowerCase();
        return sA < sB ? (dir === 'asc' ? -1 : 1) : sA > sB ? (dir === 'asc' ? 1 : -1) : 0;
    } catch { return 0; }
};

// ── Tab theme configs ─────────────────────────────────────────────────────────
const TAB_THEMES = {
    doanhThu: {
        gradient: 'from-emerald-500 to-teal-600',
        headerBg: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
        iconBlockBg: 'bg-emerald-100 dark:bg-emerald-900/30',
        iconBlockText: 'text-emerald-600 dark:text-emerald-400',
        icon: 'wallet',
        title: 'Hiệu Quả Doanh Thu',
        subtitle: 'Phân tích doanh thu & hiệu quả quy đổi',
        accent: 'emerald',
    },
    khaiThac: {
        gradient: 'from-blue-500 to-indigo-600',
        headerBg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
        iconBlockBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconBlockText: 'text-blue-600 dark:text-blue-400',
        icon: 'layers',
        title: 'Hiệu Quả Trả Chậm',
        subtitle: 'Tiếp cận khách hàng & Bán kèm',
        accent: 'blue',
    },
    vuotTroi: {
        gradient: 'from-violet-500 to-purple-600',
        headerBg: 'bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
        iconBlockBg: 'bg-violet-100 dark:bg-violet-900/30',
        iconBlockText: 'text-violet-600 dark:text-violet-400',
        icon: 'trophy',
        title: 'Mục Tiêu Vượt Trội',
        subtitle: `Cập nhật ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`,
        accent: 'violet',
    },
} as const;

const DEPT_COLORS = [
    { row: 'bg-blue-50 dark:bg-blue-900', badge: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', strip: 'bg-blue-100 dark:bg-blue-800' },
    { row: 'bg-emerald-50 dark:bg-emerald-900', badge: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', strip: 'bg-emerald-100 dark:bg-emerald-800' },
    { row: 'bg-violet-50 dark:bg-violet-900', badge: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-400', strip: 'bg-violet-100 dark:bg-violet-800' },
    { row: 'bg-amber-50 dark:bg-amber-900', badge: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', strip: 'bg-amber-100 dark:bg-amber-800' },
    { row: 'bg-rose-50 dark:bg-rose-900', badge: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', strip: 'bg-rose-100 dark:bg-rose-800' },
    { row: 'bg-sky-50 dark:bg-sky-900', badge: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-400', strip: 'bg-sky-100 dark:bg-sky-800' },
    { row: 'bg-teal-50 dark:bg-teal-900', badge: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-400', strip: 'bg-teal-100 dark:bg-teal-800' },
    { row: 'bg-fuchsia-50 dark:bg-fuchsia-900', badge: 'bg-fuchsia-500', text: 'text-fuchsia-700 dark:text-fuchsia-400', strip: 'bg-fuchsia-100 dark:bg-fuchsia-800' },
];

// ── RenderSingleTable ─────────────────────────────────────────────────────────
const RenderSingleTable = ({
    groupType, handleTabChange, sortConfig, onSort, tableRef, onSingleExport,
    isExporting, groupedData, outstandingData, grandTotal, targetPerEmployee,
    onEmployeeClick, isEditingTarget, targetInputRef, setTargetPerEmployee,
    handleSaveTarget, setIsEditingTarget, tempTarget, setTempTarget, fullSellerArrayLength,
    showSortArrow, onBatchExport
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
    setTargetPerEmployee: (v: number) => void;
    handleSaveTarget: () => void;
    setIsEditingTarget: (v: boolean) => void;
    tempTarget: string;
    setTempTarget: (v: string) => void;
    fullSellerArrayLength: number;
    showSortArrow: boolean;
    onBatchExport: () => void;
}) => {
    const [copyKey, setCopyKey] = useState<string | null>(null);

    const theme = TAB_THEMES[groupType];
    const dataToRender = groupType === 'vuotTroi' ? outstandingData : groupedData;

    const headers: { label: string; key: string; colorClass: string; textColor: string; align?: 'left' | 'center' | 'right'; sos?: boolean; groupName: string; groupColorClass: string; groupTextColor: string; noSubHeader?: boolean }[] =
        groupType === 'doanhThu' ? [
            { label: 'Thực', key: 'doanhThuThuc', colorClass: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-700 dark:text-emerald-400', align: 'center', groupName: 'DOANH THU', groupColorClass: 'bg-emerald-50 dark:bg-emerald-900/20', groupTextColor: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'DTQĐ', key: 'doanhThuQD', colorClass: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-700 dark:text-emerald-400', align: 'center', groupName: 'DOANH THU', groupColorClass: 'bg-emerald-50 dark:bg-emerald-900/20', groupTextColor: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'HQQĐ', key: 'hieuQuaValue', colorClass: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-700 dark:text-emerald-400', align: 'center', groupName: 'DOANH THU', groupColorClass: 'bg-emerald-50 dark:bg-emerald-900/20', groupTextColor: 'text-emerald-700 dark:text-emerald-300' },
            { label: '%DT T.CHẬM', key: 'dtTraChamPercent_CE_ICT', colorClass: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-700 dark:text-amber-400', align: 'center', groupName: 'TRẢ CHẬM', groupColorClass: 'bg-amber-50 dark:bg-amber-900/20', groupTextColor: 'text-amber-700 dark:text-amber-300', noSubHeader: true },
            { label: 'SOS', key: 'weakPointsRevenue', colorClass: 'bg-rose-50 dark:bg-rose-900/20', textColor: 'text-rose-700 dark:text-rose-400', align: 'center', sos: true, groupName: 'CẢNH BÁO', groupColorClass: 'bg-rose-50 dark:bg-rose-900/20', groupTextColor: 'text-rose-700 dark:text-rose-300', noSubHeader: true },
        ] : groupType === 'khaiThac' ? [
            { label: 'ICT', key: 'slICT', colorClass: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-700 dark:text-emerald-400', align: 'center', groupName: 'SẢN PHẨM CHÍNH', groupColorClass: 'bg-emerald-50 dark:bg-emerald-900/20', groupTextColor: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'CE', key: 'slCE_main', colorClass: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-700 dark:text-emerald-400', align: 'center', groupName: 'SẢN PHẨM CHÍNH', groupColorClass: 'bg-emerald-50 dark:bg-emerald-900/20', groupTextColor: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'TỔNG', key: 'slCE_ICT', colorClass: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-700 dark:text-emerald-400', align: 'center', groupName: 'SẢN PHẨM CHÍNH', groupColorClass: 'bg-emerald-50 dark:bg-emerald-900/20', groupTextColor: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'SL', key: 'slTraCham_CE_ICT', colorClass: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-700 dark:text-amber-400', align: 'center', groupName: 'TRẢ CHẬM', groupColorClass: 'bg-amber-50 dark:bg-amber-900/20', groupTextColor: 'text-amber-700 dark:text-amber-300' },
            { label: '%SL/SPC', key: 'traChamPercent_CE_ICT', colorClass: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-700 dark:text-amber-400', align: 'center', groupName: 'TRẢ CHẬM', groupColorClass: 'bg-amber-50 dark:bg-amber-900/20', groupTextColor: 'text-amber-700 dark:text-amber-300' },
            { label: '%DT', key: 'dtTraChamPercent_CE_ICT', colorClass: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-700 dark:text-amber-400', align: 'center', groupName: 'TRẢ CHẬM', groupColorClass: 'bg-amber-50 dark:bg-amber-900/20', groupTextColor: 'text-amber-700 dark:text-amber-300' },
            { label: 'SOS', key: 'weakPointsExploitation', colorClass: 'bg-rose-50 dark:bg-rose-900/20', textColor: 'text-rose-700 dark:text-rose-400', align: 'center', sos: true, groupName: 'CẢNH BÁO', groupColorClass: 'bg-rose-50 dark:bg-rose-900/20', groupTextColor: 'text-rose-700 dark:text-rose-300', noSubHeader: true },
        ] : [
            { label: 'Thực', key: 'doanhThuThuc', colorClass: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-700 dark:text-emerald-400', align: 'center', groupName: 'DOANH THU', groupColorClass: 'bg-emerald-50 dark:bg-emerald-900/20', groupTextColor: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'DTQĐ', key: 'doanhThuQD', colorClass: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-700 dark:text-emerald-400', align: 'center', groupName: 'DOANH THU', groupColorClass: 'bg-emerald-50 dark:bg-emerald-900/20', groupTextColor: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'Target', key: 'target', colorClass: 'bg-violet-50 dark:bg-violet-900/20', textColor: 'text-violet-700 dark:text-violet-400', align: 'center', groupName: 'MỤC TIÊU', groupColorClass: 'bg-violet-50 dark:bg-violet-900/20', groupTextColor: 'text-violet-700 dark:text-violet-300' },
            { label: '%HT', key: 'percentHT', colorClass: 'bg-violet-50 dark:bg-violet-900/20', textColor: 'text-violet-700 dark:text-violet-400', align: 'center', groupName: 'MỤC TIÊU', groupColorClass: 'bg-violet-50 dark:bg-violet-900/20', groupTextColor: 'text-violet-700 dark:text-violet-300' },
            { label: 'HQQĐ', key: 'hieuQuaValue', colorClass: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-700 dark:text-amber-400', align: 'center', groupName: 'HIỆU QUẢ', groupColorClass: 'bg-amber-50 dark:bg-amber-900/20', groupTextColor: 'text-amber-700 dark:text-amber-300' },
            { label: 'Vượt', key: 'dtVuot', colorClass: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-700 dark:text-amber-400', align: 'center', groupName: 'HIỆU QUẢ', groupColorClass: 'bg-amber-50 dark:bg-amber-900/20', groupTextColor: 'text-amber-700 dark:text-amber-300' },
        ];

    const groupedHeaders = useMemo(() => {
        const groups: { name: string; colSpan: number; bg: string; text: string; noSubHeader?: boolean }[] = [];
        if (headers.length === 0) return groups;
        
        let currentGroup = { name: headers[0].groupName, colSpan: 1, bg: headers[0].groupColorClass, text: headers[0].groupTextColor, noSubHeader: headers[0].noSubHeader };
        for (let i = 1; i < headers.length; i++) {
            if (headers[i].groupName === currentGroup.name) {
                currentGroup.colSpan++;
            } else {
                groups.push(currentGroup);
                currentGroup = { name: headers[i].groupName, colSpan: 1, bg: headers[i].groupColorClass, text: headers[i].groupTextColor, noSubHeader: headers[i].noSubHeader };
            }
        }
        groups.push(currentGroup);
        return groups;
    }, [headers]);

    const handleCopyList = (e: React.MouseEvent, key: string, label: string) => {
        e.stopPropagation();
        
        const getId = (n: string) => {
            if (!n) return '00000';
            const match = n.match(/^(\d+)/);
            return match ? match[1] : n.split(/[-–]/)[0].trim();
        };

        const result: string[] = [];
        
        Object.entries(dataToRender).forEach(([dept, employees]: [string, any]) => {
            if (!Array.isArray(employees) || employees.length === 0) return;
            
            const sorted = [...employees].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
            const count = sorted.length;
            
            // TOP 20%
            const topCount = Math.max(1, Math.round(count * 0.2));
            const topList = sorted.slice(0, topCount);
            
            // BOTTOM 30%
            const bottomCount = Math.max(1, Math.round(count * 0.3));
            const bottomList = sorted.slice(-bottomCount).reverse(); // Reverse so worst is first? Or keep it? User said BOTTOM 30%.
            
            if (topList.length > 0 || bottomList.length > 0) {
                result.push(`🏢 [${dept || 'Không Phân Ca'}] - ${label}`);
                if (topList.length > 0) {
                    result.push(`✅ TOP 20%: ${topList.map(e => `@${getId(e.name)}`).join(' ')}`);
                }
                if (bottomList.length > 0) {
                    result.push(`⚠️ BOTTOM 30%: ${bottomList.map(e => `@${getId(e.name)}`).join(' ')}`);
                }
                result.push('');
            }
        });

        if (result.length === 0) return;

        navigator.clipboard.writeText(result.join('\n')).then(() => {
            setCopyKey(key);
            setTimeout(() => setCopyKey(null), 2000);
        });
    };

    const showDeptHeaders = dataToRender && (Object.keys(dataToRender).length > 1 ||
        (Object.keys(dataToRender).length === 1 && Object.keys(dataToRender)[0] !== 'Không Phân Ca'));

    if (!dataToRender || Object.keys(dataToRender).length === 0) {
        return (
            <div ref={tableRef} className="flex flex-col items-center justify-center py-20 text-center">
                <Icon name="inbox" size={10} className="text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Không có dữ liệu hiển thị</p>
            </div>
        );
    }

    const canCopyKeys = new Set(['doanhThuThuc', 'doanhThuQD', 'percentHT', 'dtVuot', 'hieuQuaValue', 'dtTraChamPercent_CE_ICT']);

    return (
        <div ref={tableRef} className="flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme.iconBlockBg} ${theme.iconBlockText}`}>
                        <Icon name={theme.icon} size={6} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{theme.title}</h3>
                        <p className="text-xs font-medium text-slate-400">{theme.subtitle}</p>
                    </div>
                </div>

                {/* Tab switcher + export */}
                <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 hide-on-export overflow-x-auto rounded-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            {(['doanhThu', 'khaiThac', 'vuotTroi'] as GroupType[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => handleTabChange(tab)}
                                    className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${groupType === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                                >
                                    {tab === 'doanhThu' ? 'Doanh Thu' : tab === 'khaiThac' ? 'Trả Chậm' : 'Vượt Trội'}
                                </button>
                            ))}
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <button
                            onClick={e => { e.stopPropagation(); onSingleExport(); }}
                            disabled={isExporting}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Xuất Ảnh Tab Hiện Tại"
                        >
                            {isExporting ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name="camera" size={5} />}
                        </button>
                        <button
                            onClick={async (e) => { 
                                e.stopPropagation(); 
                                onBatchExport();
                            }}
                            disabled={isExporting}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Xuất Ảnh Tất Cả Tab (3 Tab)"
                        >
                            <Icon name="images" size={5} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="overflow-x-auto custom-scrollbar flex-grow border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse">

                    {/* Thead */}
                    <thead className="sticky top-0 z-20">
                        {/* Group Headers */}
                        <tr className="text-[11px] font-bold uppercase tracking-wider">
                            <th 
                                colSpan={2} 
                                rowSpan={2} 
                                onClick={() => onSort('name')}
                                className="px-4 py-3 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-40 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 select-none cursor-pointer h-px hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors group/nhanvien"
                            >
                                <div className="flex items-center justify-center gap-1">
                                    NHÂN VIÊN
                                    {(sortConfig.key === 'name' && showSortArrow) && (
                                        <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />
                                    )}
                                </div>
                            </th>
                            {groupedHeaders.map((group, i) => (
                                <th key={i} colSpan={group.colSpan} rowSpan={group.noSubHeader ? 2 : 1} className={`px-2 py-3 ${group.bg} ${group.text} border-r border-slate-200 dark:border-slate-700 text-center h-px relative group/th ${group.noSubHeader ? 'border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600' : 'border-b'}`}
                                    onClick={() => {
                                        if (group.noSubHeader) {
                                            const targetCol = headers.find(h => h.groupName === group.name);
                                            if (targetCol) onSort(targetCol.key as SortKey);
                                        }
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        {group.name}
                                        {group.noSubHeader && sortConfig.key === headers.find(h => h.groupName === group.name)?.key && showSortArrow && (
                                            <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={2.5} />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                        {/* Sub Headers */}
                        <tr className="bg-white dark:bg-slate-900 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {/* Data cols */}
                            {headers.map(h => {
                                if (h.noSubHeader) return null;
                                const isTarget = h.key === 'target' && groupType === 'vuotTroi';
                                const canCopy = groupType === 'vuotTroi' && canCopyKeys.has(h.key);
                                return (
                                    <th
                                        key={h.key}
                                        onClick={() => isTarget
                                            ? (setTempTarget(String(targetPerEmployee)), setIsEditingTarget(true))
                                            : onSort(h.key as SortKey)
                                        }
                                        className={`relative px-4 py-2 border-b-[3px] !border-b-slate-300 dark:!border-b-slate-600 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity group/th
                                            ${h.colorClass} ${h.textColor} ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'} h-px`}
                                    >
                                        {isTarget && isEditingTarget ? (
                                            <input
                                                ref={targetInputRef}
                                                type="number"
                                                value={tempTarget}
                                                onChange={e => setTempTarget(e.target.value)}
                                                onBlur={handleSaveTarget}
                                                className="w-full px-2 py-0.5 text-xs text-center border rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-indigo-400 dark:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveTarget();
                                                    if (e.key === 'Escape') setIsEditingTarget(false);
                                                }}
                                            />
                                        ) : (
                                            <div className={`flex items-center gap-1 ${h.align === 'center' ? 'justify-center' : h.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                                                {h.sos ? <Icon name="alert-triangle" size={3} /> : null}
                                                {h.label}
                                                {isTarget && <Icon name="edit-3" size={2.5} className="opacity-60 group-hover/th:opacity-100 ml-0.5 text-indigo-500" />}
                                                {canCopyKeys.has(h.key) && (
                                                    <button onClick={e => handleCopyList(e, h.key, h.label)} className="opacity-0 group-hover/th:opacity-100 ml-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity shrink-0">
                                                        <Icon name="copy" size={3} />
                                                    </button>
                                                )}
                                                {(sortConfig.key === h.key && showSortArrow) && (
                                                    <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={2.5} />
                                                )}
                                                {copyKey === h.key && (
                                                    <span className="ml-1 text-emerald-600 text-[10px] font-bold animate-pulse absolute -top-1 right-1">✓</span>
                                                )}
                                            </div>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {Object.entries(dataToRender).map(([dept, employees]: [string, any], deptIdx) => {
                            if (!Array.isArray(employees)) return null;
                            const dc = DEPT_COLORS[deptIdx % DEPT_COLORS.length];

                            return (
                                <React.Fragment key={dept || 'unknown'}>
                                    {/* Department row */}
                                    {showDeptHeaders && (
                                        <tr>
                                            <td colSpan={2 + headers.length} className={`px-4 py-1.5 ${dc.strip} border-y border-slate-200 dark:border-slate-700`}>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-4 rounded-full ${dc.badge} flex-shrink-0`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${dc.text}`}>
                                                        {dept || 'Không Phân Ca'} — {employees.length} người
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {/* Employee rows */}
                                    {employees.map((emp: any, idx: number) => {
                                        if (!emp) return null;
                                        const isTopThree = idx < 3;

                                        return (
                                            <tr
                                                key={`${dept}-${emp.name}-${idx}`}
                                                className={`group border-b border-slate-200 dark:border-slate-700 transition-colors duration-100 hover:bg-slate-100 dark:hover:bg-slate-800 ${isTopThree ? dc.row : idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}
                                            >
                                                {/* Rank */}
                                                <td className="px-2 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-inherit z-10 outline outline-1 outline-transparent">
                                                    <RankBadge rank={idx} />
                                                </td>

                                                {/* Name */}
                                                <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-700 sticky left-8 bg-inherit z-10 outline outline-1 outline-transparent">
                                                    <button
                                                        onClick={() => onEmployeeClick(emp.name)}
                                                        className="flex items-center gap-2 min-w-0 group/name"
                                                    >
                                                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 group-hover/name:text-primary-600 dark:group-hover/name:text-primary-400 transition-colors truncate max-w-[140px]">
                                                            {abbreviateName(emp.name)}
                                                        </span>
                                                    </button>
                                                </td>

                                                {/* Data cells */}
                                                {headers.map(h => (
                                                    <td key={h.key} className={`px-2 py-1.5 text-[13px] border-r border-slate-200 dark:border-slate-700 ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'}`}>

                                                        {h.key === 'doanhThuThuc' && (
                                                            <span className="text-slate-500 dark:text-slate-400 font-medium">{formatCurrency(emp.doanhThuThuc)}</span>
                                                        )}
                                                        {h.key === 'doanhThuQD' && (
                                                            <span className="font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(emp.doanhThuQD)}</span>
                                                        )}
                                                        {h.key === 'hieuQuaValue' && (
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${getHieuQuaBadge(Number(emp.hieuQuaValue || 0))}`}>
                                                                {Number(emp.hieuQuaValue || 0).toFixed(0)}%
                                                            </span>
                                                        )}
                                                        {h.key === 'dtTraChamPercent_CE_ICT' && (
                                                            <span className={`text-[10px] ${getTraChamBadge(Number(emp.dtTraChamPercent_CE_ICT || 0))}`}>
                                                                {Number(emp.dtTraChamPercent_CE_ICT || 0).toFixed(0)}%
                                                            </span>
                                                        )}
                                                        {(h.key === 'weakPointsRevenue' || h.key === 'weakPointsExploitation') && (
                                                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${Number(emp[h.key] || 0) > 0
                                                                ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                                                                : 'text-slate-300 dark:text-slate-700'}`}>
                                                                {emp[h.key] || '—'}
                                                            </span>
                                                        )}
                                                        {h.key === 'slICT' && (
                                                            <span className="font-semibold text-slate-600 dark:text-slate-400">{formatQuantity(emp.slICT)}</span>
                                                        )}
                                                        {h.key === 'slCE_main' && (
                                                            <span className="font-semibold text-slate-600 dark:text-slate-400">{formatQuantity(emp.slCE_main)}</span>
                                                        )}
                                                        {h.key === 'slCE_ICT' && (
                                                            <span className="font-bold text-slate-700 dark:text-slate-300">{formatQuantity(emp.slCE_ICT)}</span>
                                                        )}
                                                        {h.key === 'slTraCham_CE_ICT' && (
                                                            <span className="font-bold text-slate-600 dark:text-slate-400">{formatQuantity(emp.slTraCham_CE_ICT)}</span>
                                                        )}
                                                        {h.key === 'traChamPercent_CE_ICT' && (
                                                            <span className={`text-[10px] ${getTraChamBadge(Number(emp.traChamPercent_CE_ICT || 0))}`}>
                                                                {Number(emp.traChamPercent_CE_ICT || 0).toFixed(0)}%
                                                            </span>
                                                        )}
                                                        {h.key === 'target' && (
                                                            <span className="font-bold text-rose-500 dark:text-rose-400">{formatCurrency(emp.target, 0)}</span>
                                                        )}
                                                        {h.key === 'percentHT' && (
                                                            <div className="flex flex-col items-center gap-1 min-w-[64px]">
                                                                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${getPercentBadge(Number(emp.percentHT || 0))}`}>
                                                                    {Number(emp.percentHT || 0).toFixed(0)}%
                                                                </span>
                                                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full bg-gradient-to-r ${getProgressBarColor(Number(emp.percentHT || 0))} transition-all duration-500`}
                                                                        style={{ width: `${Math.min(Number(emp.percentHT || 0), 100)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {h.key === 'dtVuot' && (
                                                            <span className={`font-extrabold text-[11px] ${Number(emp.dtVuot || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-700'}`}>
                                                                {Number(emp.dtVuot || 0) > 0 ? `+${formatCurrency(emp.dtVuot)}` : '—'}
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>

                    {/* ── Footer ── */}
                    <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold text-[13px] border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                        <tr>
                            <td colSpan={2} className="px-4 py-1.5 text-center sticky left-0 z-10 bg-inherit font-extrabold text-[12px] uppercase tracking-widest text-teal-700 dark:text-teal-300 border-r border-slate-200 dark:border-slate-700">
                                ∑ Tổng cộng
                            </td>
                            {headers.map(h => (
                                <td key={h.key} className={`px-2 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'}`}>
                                    <span style={{ color: h.textColor.includes('text') ? undefined : h.textColor }} className={h.textColor}>
                                        {h.key === 'doanhThuThuc' && formatCurrency(grandTotal?.doanhThuThuc ?? 0)}
                                        {h.key === 'doanhThuQD' && formatCurrency(grandTotal?.doanhThuQD ?? 0)}
                                        {h.key === 'hieuQuaValue' && `${Number(grandTotal?.hieuQuaValue ?? 0).toFixed(0)}%`}
                                        {h.key === 'slICT' && formatQuantity(grandTotal?.slICT ?? 0)}
                                        {h.key === 'slCE_main' && formatQuantity(grandTotal?.slCE_main ?? 0)}
                                        {h.key === 'slCE_ICT' && formatQuantity(grandTotal?.slCE_ICT ?? 0)}
                                        {h.key === 'slTraCham_CE_ICT' && formatQuantity(grandTotal?.slTraCham_CE_ICT ?? 0)}
                                        {h.key === 'traChamPercent_CE_ICT' && `${Number(grandTotal?.traChamPercent_CE_ICT ?? 0).toFixed(0)}%`}
                                        {h.key === 'dtTraChamPercent_CE_ICT' && `${Number(grandTotal?.dtTraChamPercent_CE_ICT ?? 0).toFixed(0)}%`}
                                        {h.key === 'target' && formatCurrency(grandTotal?.target ?? 0, 0)}
                                        {h.key === 'percentHT' && (
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-[10px] font-bold">{Number(grandTotal?.percentHT ?? 0).toFixed(0)}%</span>
                                                <div className="w-12 h-1 bg-teal-200/50 dark:bg-teal-800/50 rounded-full overflow-hidden">
                                                    <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${Math.min(Number(grandTotal?.percentHT ?? 0), 100)}%` }} />
                                                </div>
                                            </div>
                                        )}
                                        {h.key === 'dtVuot' && (
                                            <span>{formatCurrency(grandTotal?.dtVuot ?? 0)}</span>
                                        )}
                                        {h.key === 'weakPointsRevenue' && '—'}
                                        {h.key === 'weakPointsExploitation' && '—'}
                                    </span>
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

// ── Main PerformanceTable ─────────────────────────────────────────────────────
const PerformanceTable = React.memo(forwardRef<HTMLDivElement, PerformanceTableProps>(({
    employeeData, onEmployeeClick, onExport, isExporting,
}, ref) => {
    const [activeTab, setActiveTab] = useState<GroupType>('doanhThu');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({ key: 'doanhThuQD', direction: 'desc' });
    const [targetPerEmployee, setTargetPerEmployee] = useState(150_000_000);
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [tempTarget, setTempTarget] = useState('150000000');
    const [showSortArrow, setShowSortArrow] = useState(true);
    const targetInputRef = useRef<HTMLInputElement>(null);
    const sortTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        getDailyTarget().then(t => {
            if (t) { setTargetPerEmployee(t); setTempTarget(String(t)); }
        });
        return () => {
            if (sortTimerRef.current) clearTimeout(sortTimerRef.current);
        };
    }, []);

    const handleBatchPerformanceExport = async () => {
        const tabs: GroupType[] = ['doanhThu', 'khaiThac', 'vuotTroi'];
        for (const tab of tabs) {
            setActiveTab(tab);
            // Wait for tab switch and render
            await new Promise(resolve => setTimeout(resolve, 800));
            if (onExport) onExport();
            // Wait between exports
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        // Return to original tab or stay on last? Let's stay on last or return to first.
        setActiveTab('doanhThu');
    };

    const handleSaveTarget = () => {
        const val = parseInt(tempTarget.replace(/\D/g, ''), 10);
        if (!isNaN(val) && val > 0) { setTargetPerEmployee(val); saveDailyTarget(val); }
        else setTempTarget(String(targetPerEmployee));
        setIsEditingTarget(false);
    };

    const handleTabChange = (tab: GroupType) => {
        setActiveTab(tab);
        let newKey: SortKey = 'doanhThuQD';
        if (tab === 'doanhThu') newKey = 'doanhThuQD';
        else if (tab === 'khaiThac') newKey = 'dtTraChamPercent_CE_ICT';
        else newKey = 'percentHT';
        
        setSortConfig({ key: newKey, direction: 'desc' });
        setShowSortArrow(true);
        if (sortTimerRef.current) clearTimeout(sortTimerRef.current);
        sortTimerRef.current = setTimeout(() => setShowSortArrow(false), 3000);
    };

    const { groupedData, outstandingData, sellerCount } = useMemo(() => {
        const sellers = [...(employeeData?.fullSellerArray || [])].filter(Boolean);

        const sorted = sellers.sort((a, b) =>
            safeSort(a, b, sortConfig.key, sortConfig.direction)
        );

        const grouped: { [dept: string]: Employee[] } = {};
        sorted.forEach(emp => {
            if (!emp) return;
            if (!grouped[emp.department]) grouped[emp.department] = [];
            grouped[emp.department].push(emp);
        });

        const outstanding: { [dept: string]: any[] } = {};
        const fullOutstanding = sorted.map(emp => {
            if (!emp) return null;
            const percentHT = targetPerEmployee > 0 ? (emp.doanhThuQD / targetPerEmployee) * 100 : 0;
            const dtVuot = Math.max(0, emp.doanhThuQD - targetPerEmployee);
            return { ...emp, target: targetPerEmployee, percentHT, dtVuot };
        }).filter(Boolean) as any[];

        if (['target', 'percentHT', 'dtVuot'].includes(sortConfig.key)) {
            fullOutstanding.sort((a, b) => safeSort(a, b, sortConfig.key, sortConfig.direction));
        }

        fullOutstanding.forEach(emp => {
            if (!emp) return;
            if (!outstanding[emp.department]) outstanding[emp.department] = [];
            outstanding[emp.department].push(emp);
        });

        return { groupedData: grouped, outstandingData: outstanding, sellerCount: sellers.length };
    }, [employeeData, sortConfig, targetPerEmployee]);

    const trueGrandTotal = useMemo(() => {
        const all = employeeData?.fullSellerArray || [];
        const totalDTThuc = all.reduce((s, e) => s + Number(e.doanhThuThuc || 0), 0);
        const totalDTQD   = all.reduce((s, e) => s + Number(e.doanhThuQD || 0), 0);
        const totalSlTC   = all.reduce((s, e) => s + Number(e.slTiepCan || 0), 0);
        const totalSlICT = all.reduce((s, e) => s + Number(e.slICT || 0), 0);
        const totalSlCE_main = all.reduce((s, e) => s + Number(e.slCE_main || 0), 0);
        const totalSlCE_ICT = all.reduce((s, e) => s + Number(e.slCE_ICT || 0), 0);
        const totalSlTraCham_CE_ICT = all.reduce((s, e) => s + Number(e.slTraCham_CE_ICT || 0), 0);
        const totalRevCE_ICT = all.reduce((s, e) => s + Number(e.doanhThu_CE_ICT || 0), 0);
        const totalRevTraCham_CE_ICT = all.reduce((s, e) => s + Number(e.doanhThuTraCham_CE_ICT || 0), 0);
        
        const totalTarget = targetPerEmployee * all.length;
        
        return {
            doanhThuThuc: totalDTThuc,
            doanhThuQD: totalDTQD,
            slTiepCan: totalSlTC,
            slICT: totalSlICT,
            slCE_main: totalSlCE_main,
            slCE_ICT: totalSlCE_ICT,
            slTraCham_CE_ICT: totalSlTraCham_CE_ICT,
            hieuQuaValue: totalDTThuc > 0 ? ((totalDTQD - totalDTThuc) / totalDTThuc) * 100 : 0,
            traChamPercent_CE_ICT: totalSlCE_ICT > 0 ? (totalSlTraCham_CE_ICT / totalSlCE_ICT) * 100 : 0,
            dtTraChamPercent_CE_ICT: totalRevCE_ICT > 0 ? (totalRevTraCham_CE_ICT / totalRevCE_ICT) * 100 : 0,
            target: totalTarget,
            percentHT: totalTarget > 0 ? (totalDTQD / totalTarget) * 100 : 0,
            dtVuot: Math.max(0, totalDTQD - totalTarget)
        };
    }, [employeeData, targetPerEmployee]);

    const handleSort = (key: SortKey) => {
        setSortConfig(cur => ({ key, direction: cur.key === key && cur.direction === 'desc' ? 'asc' : 'desc' }));
        setShowSortArrow(true);
        if (sortTimerRef.current) clearTimeout(sortTimerRef.current);
        sortTimerRef.current = setTimeout(() => setShowSortArrow(false), 3000);
    };

    if (!employeeData) {
        return (
            <div className="flex items-center justify-center p-8 h-64">
                <Icon name="loader-2" className="animate-spin text-indigo-500" size={8} />
                <span className="ml-3 text-slate-500 font-medium">Đang tải dữ liệu...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-transparent">
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
                fullSellerArrayLength={sellerCount}
                showSortArrow={showSortArrow}
                onBatchExport={handleBatchPerformanceExport}
            />
        </div>
    );
}));

PerformanceTable.displayName = 'PerformanceTable';
export default PerformanceTable;
