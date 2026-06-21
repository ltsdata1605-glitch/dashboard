
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { SpinnerIcon, UsersIcon, CogIcon, XIcon, ViewListIcon, ViewGridIcon, CameraIcon, ClockIcon, DownloadAllIcon } from '../Icons';
import { RevenueRow, Employee, PerformanceChange, SnapshotData, SnapshotMetadata } from '../../types/nhanVienTypes';
import { roundUp, getYesterdayDateString } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import * as db from '../../utils/db';
import { parseRevenueData } from '../../utils/nhanVienHelpers';


import { MedalBadge, DeltaBadge } from '../shared/Badges';
import TimeProgressBar from './shared/TimeProgressBar';

import { ColorSettingsModal, ColorSettings, DEFAULT_COLOR_SETTINGS, CriterionConfig } from './revenue/ColorSettingsModal';
import { ImportPrevMonthModal } from './revenue/ImportPrevMonthModal';
import { RevenueMobileCard } from './revenue/RevenueMobileCard';
import { RevenueDesktopRow } from './revenue/RevenueDesktopRow';
import { useRevenueData } from '../../hooks/useRevenueData';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../../../services/uiService';



const RevenueView: React.FC<{
    rows: RevenueRow[];
    supermarketName: string;
    departmentNames: string[];
    performanceChanges: Map<string, PerformanceChange>;
    onViewTrend: (employee: Employee) => void;
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
    snapshotId?: string | null;
    setSnapshotId: (id: string | null) => void;
    snapshots: SnapshotMetadata[];
    handleSaveSnapshot: () => void;
    handleDeleteSnapshot: (id: string, name: string) => void;
    supermarketTarget: number;
    departmentWeights: Record<string, number>;
    deptEmployeeCounts: Record<string, number>;
    employeeInstallmentMap: Map<string, number>;
    isActive?: boolean;
}> = ({ 
    rows, supermarketName, departmentNames, onViewTrend, 
    highlightedEmployees, setHighlightedEmployees, snapshotId, setSnapshotId,
    snapshots,
    supermarketTarget, departmentWeights, deptEmployeeCounts, employeeInstallmentMap,
    isActive
}) => {
    const [isLoading, setIsLoading] = useState(supermarketName && rows.length === 0);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dtqd', direction: 'desc' });
    const [snapshotRows, setSnapshotRows] = useState<RevenueRow[]>([]);
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [isPrevMonthModalOpen, setIsPrevMonthModalOpen] = useState(false);
    
    // Lấy config từ DB
    const [storedColorSettings, setStoredColorSettings] = useIndexedDBState<ColorSettings>('rev-colors-v4', DEFAULT_COLOR_SETTINGS);
    
    // Merge với mặc định để tránh lỗi khi DB có phiên bản cũ thiếu keys
    const colorSettings = useMemo(() => ({
        ...DEFAULT_COLOR_SETTINGS,
        ...storedColorSettings
    }), [storedColorSettings]);

    const [viewMode, setViewMode] = useIndexedDBState<'group' | 'list'>('revenue-view-mode', 'group');
    const [isShowRemaining, setIsShowRemaining] = useIndexedDBState<boolean>('rev-show-remaining', false);
    
    const [prevMonthRaw, setPrevMonthRaw] = useIndexedDBState<string>(`prev-month-revenue-${supermarketName}`, '');
    const prevMonthRows = useMemo(() => {
        if (isActive === false) return [];
        return parseRevenueData(prevMonthRaw);
    }, [prevMonthRaw, isActive]);

    const [exportDeptFilter, setExportDeptFilter] = useState<string | null>(null);
    const [isExportingByDept, setIsExportingByDept] = useState(false);
    const [exportDeptProgress, setExportDeptProgress] = useState({ current: 0, total: 0 });

    const cardRef = useRef<HTMLDivElement>(null);
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

    useEffect(() => {
        const loadSnapshotData = async () => {
            if (isActive === false) return;
            if (snapshotId && supermarketName) {
                const data: SnapshotData | undefined = await db.get(`snapshot-data-${supermarketName}-${snapshotId}`);
                if (data?.danhSachData) setSnapshotRows(parseRevenueData(data.danhSachData));
            } else setSnapshotRows([]);
        };
        loadSnapshotData();
    }, [snapshotId, supermarketName, isActive]);

    useEffect(() => { setIsLoading(!!(supermarketName && rows.length === 0)); }, [rows, supermarketName]);

    const timeProgressData = useMemo(() => {
        const now = new Date();
        const dayPassed = now.getDate() - 1;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const percentage = (dayPassed / daysInMonth) * 100;
        return { dayPassed, daysInMonth, percentage };
    }, []);

    const getHtColor = React.useCallback((htValue: number) => {
        const progress = timeProgressData.percentage;
        if (htValue < progress) return '#ef4444'; 
        if (htValue >= progress + 20) return '#22c55e'; 
        return '#f97316'; 
    }, [timeProgressData.percentage]);

    const getDynamicColor = React.useCallback((val: number, config: CriterionConfig) => {
        if (!config) return undefined;
        if (val >= config.good.threshold) return config.good.color;
        if (val >= config.average.threshold) return config.average.color;
        return config.bad.color;
    }, []);

    const { displayList } = useRevenueData({
        rows,
        departmentNames,
        sortConfig,
        snapshotId,
        snapshotRows,
        prevMonthRows,
        departmentWeights,
        deptEmployeeCounts,
        supermarketTarget,
        employeeInstallmentMap,
        viewMode,
        exportDeptFilter,
        isActive
    });

    const handleSort = (key: string) => setSortConfig(p => ({ key, direction: p.key === key && p.direction === 'desc' ? 'asc' : 'desc' }));

    const handleHighlightToggle = React.useCallback((originalName: string) => {
        setHighlightedEmployees((prev: Set<string>) => { 
            const n = new Set(prev); 
            if (n.has(originalName)) n.delete(originalName); 
            else n.add(originalName); 
            return n; 
        });
    }, [setHighlightedEmployees]);

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const original = cardRef.current;
        
        try {
            const safeName = customFilename || `DT_NhanVien_${supermarketName}.png`;
            const blob = await exportElementAsImage(original, safeName, {
                mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component']
            });
            if (blob) {
                if (autoAction === 'download') {
                    downloadBlob(blob, safeName);
                    return 'download';
                } else if (autoAction === 'share') {
                    await shareBlob(blob, safeName);
                    return 'share';
                } else {
                    return await showExportOptions(blob, safeName);
                }
            }
            return null;
        } catch (err) {
            console.error('Export error', err);
            return null;
        }
    };

    const handleBatchExportByDept = async () => {
        const allDepts = Array.from(new Set(rows.filter(r => r.type === 'employee' && r.department).map(r => r.department as string))).sort();
        if (allDepts.length === 0) return;

        setIsExportingByDept(true);
        setExportDeptProgress({ current: 0, total: allDepts.length });

        let autoAction: 'download' | 'share' | 'cancel' | null = null;

        for (let i = 0; i < allDepts.length; i++) {
            const dept = allDepts[i] as string;
            setExportDeptFilter(dept);
            setExportDeptProgress({ current: i + 1, total: allDepts.length });
            await new Promise(r => setTimeout(r, 400));
            const safeDeptName = dept.replace(/\//g, '_').replace(/\s+/g, '_');
            const action = await handleExportPNG(`DT_BP_${safeDeptName}_${supermarketName}.png`, autoAction);
            if (action === 'cancel') break;
            autoAction = action;
        }
        setExportDeptFilter(null);
        setIsExportingByDept(false);
    };

    
    const cardTitle = (
        <div className="flex flex-col items-start leading-none py-1 w-full">
            <span className="js-report-title text-2xl font-black uppercase text-slate-800 dark:text-white mt-1">DOANH THU ĐẾN NGÀY {getYesterdayDateString()}</span>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mt-1 font-bold">Tôi không chạy theo doanh thu — doanh thu phản ánh đẳng cấp mà Tôi tạo ra.</span>
            <TimeProgressBar className="mt-2.5" />
        </div>
    );

    if (isActive === false) {
        return <div className="hidden" />;
    }

    if (!supermarketName) return <Card title="Phân tích Nhân viên"><div className="py-12 text-center text-slate-500">Vui lòng chọn siêu thị.</div></Card>;
    if (isLoading) return <Card title={cardTitle}><div className="flex items-center justify-center py-20"><SpinnerIcon className="h-12 w-12 text-primary-500 animate-spin" /></div></Card>;

    const isMobile = false; // Always show table view, even on mobile

    return (
        <div className="space-y-0">
            <div className="flex flex-wrap justify-between items-center px-4 py-2.5 bg-white dark:bg-slate-800 no-print border-b border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex gap-3 items-center">
                    <button 
                        onClick={() => setIsPrevMonthModalOpen(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border transition-all ${prevMonthRaw ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
                    >
                        <ClockIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Cùng kỳ</span>
                        {prevMonthRaw && (
                            <button onClick={(e) => { e.stopPropagation(); setPrevMonthRaw(''); }} className="ml-0.5 p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-800">
                                <XIcon className="h-3 w-3" />
                            </button>
                        )}
                    </button>
                    <button 
                        onClick={() => setIsShowRemaining(p => !p)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border transition-all ${isShowRemaining ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-750'}`}
                    >
                        <input 
                            type="checkbox" 
                            checked={isShowRemaining} 
                            onChange={() => {}} // handled by button click
                            className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer pointer-events-none" 
                        />
                        <span>Còn lại</span>
                    </button>
                </div>
                <div className="flex gap-1.5 items-center">
                    <button onClick={() => setViewMode('group')} title="Bộ phận" className={`p-1 transition-all ${viewMode === 'group' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}><ViewGridIcon className="h-4 w-4"/></button>
                    <button onClick={() => setViewMode('list')} title="Danh sách" className={`p-1 transition-all ${viewMode === 'list' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}><ViewListIcon className="h-4 w-4"/></button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <button 
                        onClick={handleBatchExportByDept}
                        disabled={isExportingByDept}
                        title={isExportingByDept ? `Đang xuất ${exportDeptProgress.current}/${exportDeptProgress.total}` : 'Xuất ảnh theo bộ phận'}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-50"
                    >
                        {isExportingByDept ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <DownloadAllIcon className="h-4 w-4" />}
                    </button>
                    <ExportButton onExportPNG={async () => { await handleExportPNG(); }} />
                </div>
            </div>
            <div ref={cardRef}>
                <Card noPadding title={cardTitle} rounded={false}>
                    <div className="w-full overflow-hidden px-4 pb-4">
                        <div className="overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                        {isMobile ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {displayList.map((row, idx) => {
                                    if (row.type === 'department' || row.type === 'total') {
                                        const isGrandTotal = row.type === 'total';
                                        return (
                                            <div key={`${row.type}-${idx}`} className={`px-4 py-3 ${isGrandTotal ? 'bg-emerald-50 dark:bg-emerald-900/30 font-black text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-900/90 font-bold'} flex justify-between items-center`}>
                                                <span className="uppercase tracking-wider text-xs">{row.name}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sky-600 dark:text-sky-400">{f.format(roundUp(row.dtqd))} Tr</span>
                                                    <span className="text-[10px] opacity-60">{roundUp(row.calculatedCompletion)}% HT</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                    return (
                                        <RevenueMobileCard
                                            key={row.originalName}
                                            row={row}
                                            isHighlighted={isHighlighted}
                                            onHighlightToggle={handleHighlightToggle}
                                            onViewTrend={onViewTrend}
                                            supermarketName={supermarketName}
                                            colorSettings={colorSettings}
                                            getHtColor={getHtColor}
                                            getDynamicColor={getDynamicColor}
                                            timeProgressPercentage={timeProgressData.percentage}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full border-collapse compact-export-table">
                                    <thead className="sticky top-0 z-10">
                                        {/* Tier 1: Group Headers */}
                                        <tr>
                                            <th rowSpan={2} className="px-2 py-1 text-center align-middle text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors" onClick={() => handleSort('name')}>
                                                Nhân viên
                                            </th>
                                            <th colSpan={3} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/50 border-b border-r border-sky-100 dark:border-sky-800/50">
                                                Doanh thu
                                            </th>
                                            {isShowRemaining && (
                                                <th colSpan={2} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/50 border-b border-r border-orange-100 dark:border-orange-800/50">
                                                    Còn lại
                                                </th>
                                            )}
                                            <th colSpan={4} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/50 border-b border-emerald-100 dark:border-emerald-800/50">
                                                Hiệu suất
                                            </th>
                                        </tr>
                                        {/* Tier 2: Column Headers */}
                                        <tr>
                                            <th className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-sky-50 dark:bg-sky-900/40 border-b border-r border-sky-100 dark:border-sky-800/50 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors" onClick={() => handleSort('dtlk')}>Thực</th>
                                            <th className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-sky-50 dark:bg-sky-900/40 border-b border-r border-sky-100 dark:border-sky-800/50 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors" onClick={() => handleSort('dtqd')}>DTQĐ</th>
                                            <th className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-sky-50 dark:bg-sky-900/40 border-b border-r border-sky-100 dark:border-sky-800/50 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors" onClick={() => handleSort('target')}>M.Tiêu</th>
                                            {isShowRemaining && (
                                                <>
                                                    <th className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-orange-50 dark:bg-orange-900/40 border-b border-r border-orange-100 dark:border-orange-800/50 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/60 transition-colors" onClick={() => handleSort('remaining_total')}>Tổng</th>
                                                    <th className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-orange-50 dark:bg-orange-900/40 border-b border-r border-orange-100 dark:border-orange-800/50 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/60 transition-colors" onClick={() => handleSort('remaining_daily')}>Ngày</th>
                                                </>
                                            )}
                                            <th className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-emerald-50 dark:bg-emerald-900/40 border-b border-r border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors" onClick={() => handleSort('completion')}>%HT</th>
                                            <th className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-emerald-50 dark:bg-emerald-900/40 border-b border-r border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors" onClick={() => handleSort('hqqd')}>HQQĐ</th>
                                            <th className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-emerald-50 dark:bg-emerald-900/40 border-b border-r border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors" onClick={() => handleSort('installment')}>%T.Góp</th>
                                            <th className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-emerald-50 dark:bg-emerald-900/40 border-b border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors" onClick={() => handleSort('bankem')}>%B.Kèm</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-[#1c1c1e] font-black">
                                    {displayList.map((row, idx) => {
                                        if (row.type === 'department' || row.type === 'total') {
                                            const isGrandTotal = row.type === 'total';
                                            const prev = row.prevCompData;
                                            return (
                                                <tr key={`${row.type}-${idx}`} className={`${isGrandTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300'} border-t border-slate-200 dark:border-slate-700`}>
                                                    <td className={`px-2 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} uppercase tracking-wider border-r ${isGrandTotal ? 'border-slate-200 dark:border-slate-700 text-center font-black' : 'border-slate-200 dark:border-slate-700 font-extrabold'}`}>{row.name}</td>
                                                    <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold`}>
                                                        <div>{f.format(roundUp(row.dtlk))}</div>
                                                        <DeltaBadge current={row.dtlk} previous={prev?.dtlk} isCurrency />
                                                    </td>
                                                    <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-extrabold`}>
                                                        <div style={{ color: getDynamicColor(row.dtqd, colorSettings.dtqd) || getHtColor(row.calculatedCompletion) }}>{f.format(roundUp(row.dtqd))}</div>
                                                        <DeltaBadge current={row.dtqd} previous={prev?.dtqd} isCurrency />
                                                    </td>
                                                    <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 text-slate-500 font-bold`}>
                                                        <div>{f.format(roundUp(row.calculatedTarget))}</div>
                                                        <DeltaBadge current={row.calculatedTarget} previous={prev?.target} isCurrency />
                                                    </td>
                                                    {isShowRemaining && (
                                                        <>
                                                            <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 bg-orange-50/10 dark:bg-orange-950/5 text-orange-700 dark:text-orange-400 font-bold`}>
                                                                <div>{f.format(roundUp(row.remaining_total || 0))}</div>
                                                            </td>
                                                            <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 bg-orange-50/10 dark:bg-orange-950/5 text-orange-700 dark:text-orange-400 font-bold`}>
                                                                <div>{f.format(roundUp(row.remaining_daily || 0))}</div>
                                                            </td>
                                                        </>
                                                    )}
                                                    <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold`} style={{ color: isGrandTotal ? undefined : getHtColor(row.calculatedCompletion) }}>
                                                        <div>{roundUp(row.calculatedCompletion)}%</div>
                                                        <DeltaBadge current={row.calculatedCompletion} previous={prev?.completion} isPercent />
                                                    </td>
                                                    <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold`}>
                                                        <div style={{ color: getDynamicColor(row.hieuQuaQD * 100, colorSettings.hqqd) || getHtColor(row.calculatedCompletion) }}>{isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%</div>
                                                        <DeltaBadge current={row.hieuQuaQD * 100} previous={prev?.hqqd * 100} isPercent />
                                                    </td>
                                                    <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold`} style={{ color: isGrandTotal ? undefined : getDynamicColor(row.calculatedInstallment, colorSettings.tragop) }}>
                                                        <div>{roundUp(row.calculatedInstallment)}%</div>
                                                        <DeltaBadge current={row.calculatedInstallment} previous={prev?.installment} isPercent />
                                                    </td>
                                                    <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center tabular-nums border-slate-200 dark:border-slate-700 font-bold`} style={{ color: isGrandTotal ? undefined : getDynamicColor(row.pctBillBk, colorSettings.bankem) }}>
                                                        <div>{roundUp(row.pctBillBk)}%</div>
                                                        <DeltaBadge current={row.pctBillBk} previous={prev?.pctBillBk} isPercent />
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        const isHighlighted = highlightedEmployees.has(row.originalName || '');

                                        return (
                                            <RevenueDesktopRow
                                                key={row.originalName}
                                                row={row}
                                                isHighlighted={isHighlighted}
                                                onHighlightToggle={handleHighlightToggle}
                                                onViewTrend={onViewTrend}
                                                supermarketName={supermarketName}
                                                colorSettings={colorSettings}
                                                getHtColor={getHtColor}
                                                getDynamicColor={getDynamicColor}
                                                isShowRemaining={isShowRemaining}
                                            />
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>
                    </div>
                </Card>
            </div>
            <ColorSettingsModal isOpen={isColorModalOpen} onClose={() => setIsColorModalOpen(false)} settings={colorSettings} onSave={setStoredColorSettings} />
            <ImportPrevMonthModal isOpen={isPrevMonthModalOpen} onClose={() => setIsPrevMonthModalOpen(false)} onSave={setPrevMonthRaw} />
        </div>
    );
};

export default React.memo(RevenueView);
