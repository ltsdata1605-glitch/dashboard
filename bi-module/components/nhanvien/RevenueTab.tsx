
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { SpinnerIcon, UsersIcon, CogIcon, XIcon, ViewListIcon, ViewGridIcon, CameraIcon, ClockIcon } from '../Icons';
import { RevenueRow, Employee, PerformanceChange, SnapshotData, SnapshotMetadata } from '../../types/nhanVienTypes';
import { roundUp, getYesterdayDateString } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import * as db from '../../utils/db';
import { parseRevenueData } from '../../utils/nhanVienHelpers';


import { MedalBadge, DeltaBadge } from '../shared/Badges';
import { AvatarUploader } from '../shared/AvatarUploader';
import { ColorSettingsModal, ColorSettings, DEFAULT_COLOR_SETTINGS, CriterionConfig } from './revenue/ColorSettingsModal';
import { ImportPrevMonthModal } from './revenue/ImportPrevMonthModal';
import { RevenueMobileCard } from './revenue/RevenueMobileCard';
import { RevenueDesktopRow } from './revenue/RevenueDesktopRow';
import { useRevenueData } from '../../hooks/useRevenueData';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../../services/uiService';



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
}> = ({ 
    rows, supermarketName, departmentNames, onViewTrend, 
    highlightedEmployees, setHighlightedEmployees, snapshotId, setSnapshotId,
    snapshots,
    supermarketTarget, departmentWeights, deptEmployeeCounts, employeeInstallmentMap
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
    
    const [prevMonthRaw, setPrevMonthRaw] = useIndexedDBState<string>(`prev-month-revenue-${supermarketName}`, '');
    const prevMonthRows = useMemo(() => parseRevenueData(prevMonthRaw), [prevMonthRaw]);

    const [exportDeptFilter, setExportDeptFilter] = useState<string | null>(null);
    const [isExportingByDept, setIsExportingByDept] = useState(false);
    const [exportDeptProgress, setExportDeptProgress] = useState({ current: 0, total: 0 });

    const cardRef = useRef<HTMLDivElement>(null);
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

    useEffect(() => {
        const loadSnapshotData = async () => {
            if (snapshotId && supermarketName) {
                const data: SnapshotData | undefined = await db.get(`snapshot-data-${supermarketName}-${snapshotId}`);
                if (data?.danhSachData) setSnapshotRows(parseRevenueData(data.danhSachData));
            } else setSnapshotRows([]);
        };
        loadSnapshotData();
    }, [snapshotId, supermarketName]);

    useEffect(() => { setIsLoading(!!(supermarketName && rows.length === 0)); }, [rows, supermarketName]);

    const timeProgressData = useMemo(() => {
        const now = new Date();
        const dayPassed = now.getDate() - 1;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const percentage = (dayPassed / daysInMonth) * 100;
        return { dayPassed, daysInMonth, percentage };
    }, []);

    const getHtColor = (htValue: number) => {
        const progress = timeProgressData.percentage;
        if (htValue < progress) return '#ef4444'; 
        if (htValue >= progress + 20) return '#22c55e'; 
        return '#eab308'; 
    };

    const getDynamicColor = (val: number, config: CriterionConfig) => {
        if (!config) return undefined;
        if (val >= config.good.threshold) return config.good.color;
        if (val >= config.average.threshold) return config.average.color;
        return config.bad.color;
    };

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
        exportDeptFilter
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

    const timeProgressWidget = useMemo(() => {
        return (
            <div className="js-time-progress-widget flex flex-col w-full max-w-md gap-1 px-1 mt-2 mb-1 transition-all">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Quỹ thời gian</span>
                        <span className="text-[10px] font-bold text-slate-400 italic">({timeProgressData.dayPassed} / {timeProgressData.daysInMonth} ngày)</span>
                    </div>
                    <span className="text-xs font-black text-sky-600 tabular-nums leading-none">{Math.round(timeProgressData.percentage)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 relative overflow-hidden">
                    <div 
                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${timeProgressData.percentage}%` }}
                    />
                </div>
            </div>
        );
    }, [timeProgressData]);
    
    const cardTitle = (
        <div className="flex flex-col w-full">
            <div className="flex flex-col items-start leading-none">
                <span className="js-report-title text-2xl font-black uppercase text-slate-800 dark:text-white mt-2">DOANH THU NHÂN VIÊN ĐẾN NGÀY {getYesterdayDateString()}</span>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 mt-1 font-bold">Tôi không chạy theo doanh thu — doanh thu phản ánh đẳng cấp mà Tôi tạo ra.</span>
            </div>
            {timeProgressWidget}
        </div>
    );

    if (!supermarketName) return <Card title="Phân tích Nhân viên"><div className="py-12 text-center text-slate-500">Vui lòng chọn siêu thị.</div></Card>;
    if (isLoading) return <Card title={cardTitle}><div className="flex items-center justify-center py-20"><SpinnerIcon className="h-12 w-12 text-primary-500 animate-spin" /></div></Card>;

    const isMobile = window.innerWidth < 768;

    return (
        <div className="space-y-0">
            <div ref={cardRef}>
                <Card noPadding title={cardTitle} rounded={false} actionButton={
                    <div className="flex flex-wrap items-center gap-1.5 no-print">
                        <div className="flex items-center gap-1.5">
                            <select value={snapshotId || ''} onChange={(e) => setSnapshotId(e.target.value || null)} className="pl-2 pr-6 py-1.5 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md outline-none min-w-[120px] appearance-none cursor-pointer text-slate-600 dark:text-slate-300">
                                <option value="">Hiện tại</option>
                                {snapshots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
                            <button 
                                onClick={() => setViewMode('group')} 
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${viewMode === 'group' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <ViewGridIcon className="h-3.5 w-3.5"/>
                            </button>
                            <button 
                                onClick={() => setViewMode('list')} 
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <ViewListIcon className="h-3.5 w-3.5"/>
                            </button>
                        </div>
                        <button 
                            onClick={() => setIsPrevMonthModalOpen(true)}
                            className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-md border transition-all ${prevMonthRaw ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                        >
                            <ClockIcon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">T.trước</span>
                            {prevMonthRaw && (
                                <button onClick={(e) => { e.stopPropagation(); setPrevMonthRaw(''); }} className="ml-0.5 p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded">
                                    <XIcon className="h-2.5 w-2.5" />
                                </button>
                            )}
                        </button>
                        <button 
                            onClick={handleBatchExportByDept}
                            disabled={isExportingByDept}
                            className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all disabled:opacity-50"
                        >
                            {isExportingByDept ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> : <CameraIcon className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{isExportingByDept ? `${exportDeptProgress.current}/${exportDeptProgress.total}` : 'BP'}</span>
                        </button>
                        <button onClick={() => setIsColorModalOpen(true)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors" title="Cấu hình màu"><CogIcon className="h-3.5 w-3.5" /></button>
                        <ExportButton onExportPNG={() => handleExportPNG()} />
                    </div>
                }>
                    <div className="w-full overflow-x-auto shadow-sm rounded-none" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                            <div className="border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                <table className="w-full border-collapse compact-export-table">
                                    <thead className="sticky top-0 z-10">
                                        {/* Tier 1: Group Headers */}
                                        <tr>
                                            <th rowSpan={2} className="px-4 py-3 text-center align-middle text-[12px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors" onClick={() => handleSort('name')}>
                                                Nhân viên
                                            </th>
                                            <th colSpan={3} className="px-3 py-2 text-center text-[12px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/50 border-b border-r border-sky-100 dark:border-sky-800/50">
                                                Doanh thu
                                            </th>
                                            <th colSpan={4} className="px-3 py-2 text-center text-[12px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/50 border-b border-emerald-100 dark:border-emerald-800/50">
                                                Hiệu suất
                                            </th>
                                        </tr>
                                        {/* Tier 2: Column Headers */}
                                        <tr>
                                            <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-sky-50 dark:bg-sky-900/40 border-b border-r border-sky-100 dark:border-sky-800/50 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors" onClick={() => handleSort('dtlk')}>DT Thực</th>
                                            <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-sky-50 dark:bg-sky-900/40 border-b border-r border-sky-100 dark:border-sky-800/50 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors" onClick={() => handleSort('dtqd')}>DTQĐ</th>
                                            <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-sky-50 dark:bg-sky-900/40 border-b border-r border-sky-100 dark:border-sky-800/50 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors" onClick={() => handleSort('target')}>M.Tiêu</th>
                                            <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-emerald-50 dark:bg-emerald-900/40 border-b border-r border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors" onClick={() => handleSort('completion')}>%HT</th>
                                            <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-emerald-50 dark:bg-emerald-900/40 border-b border-r border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors" onClick={() => handleSort('hqqd')}>HQQĐ</th>
                                            <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-emerald-50 dark:bg-emerald-900/40 border-b border-r border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors" onClick={() => handleSort('installment')}>%T.Góp</th>
                                            <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-emerald-50 dark:bg-emerald-900/40 border-b border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors" onClick={() => handleSort('bankem')}>%B.Kèm</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-[#1c1c1e]">
                                    {displayList.map((row, idx) => {
                                        if (row.type === 'department' || row.type === 'total') {
                                            const isGrandTotal = row.type === 'total';
                                            const prev = row.prevCompData;
                                            return (
                                                <tr key={`${row.type}-${idx}`} className={`${isGrandTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 font-extrabold text-rose-800 dark:text-rose-200'} border-y border-slate-200 dark:border-slate-700`}>
                                                    <td className={`px-4 py-2 uppercase text-[13px] tracking-wider border-r ${isGrandTotal ? 'border-slate-200 dark:border-slate-700 text-center text-[14px] font-black' : 'border-slate-200 dark:border-slate-700 font-extrabold'}`}>{row.name}</td>
                                                    <td className="px-3 py-2 text-[13px] text-center border-r tabular-nums border-slate-200 dark:border-slate-700">
                                                        <div>{f.format(roundUp(row.dtlk))}</div>
                                                        <DeltaBadge current={row.dtlk} previous={prev?.dtlk} isCurrency />
                                                    </td>
                                                    <td className="px-3 py-2 text-[13px] text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-extrabold">
                                                        {isGrandTotal ? (
                                                            <div className="text-sky-700 dark:text-sky-400">{f.format(roundUp(row.dtqd))}</div>
                                                        ) : (
                                                            <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-white shadow-sm`} style={{ backgroundColor: getHtColor(row.calculatedCompletion) }}>
                                                                {f.format(roundUp(row.dtqd))}
                                                            </div>
                                                        )}
                                                        <DeltaBadge current={row.dtqd} previous={prev?.dtqd} isCurrency />
                                                    </td>
                                                    <td className="px-3 py-2 text-[13px] text-center border-r tabular-nums border-slate-200 dark:border-slate-700 text-slate-500">
                                                        <div>{f.format(roundUp(row.calculatedTarget))}</div>
                                                        <DeltaBadge current={row.calculatedTarget} previous={prev?.target} isCurrency />
                                                    </td>
                                                    <td className="px-3 py-2 text-[13px] text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold" style={{ color: isGrandTotal ? undefined : getHtColor(row.calculatedCompletion) }}>
                                                        <div>{roundUp(row.calculatedCompletion)}%</div>
                                                        <DeltaBadge current={row.calculatedCompletion} previous={prev?.completion} isPercent />
                                                    </td>
                                                    <td className="px-3 py-2 text-[13px] text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold">
                                                        {isGrandTotal ? (
                                                            <div style={{ color: getDynamicColor(row.hieuQuaQD * 100, colorSettings.hqqd) }}>{isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%</div>
                                                        ) : (
                                                            <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-white shadow-sm`} style={{ backgroundColor: getHtColor(row.calculatedCompletion) }}>
                                                                {isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%
                                                            </div>
                                                        )}
                                                        <DeltaBadge current={row.hieuQuaQD * 100} previous={prev?.hqqd * 100} isPercent />
                                                    </td>
                                                    <td className="px-3 py-2 text-[13px] text-center border-r tabular-nums border-slate-200 dark:border-slate-700 font-bold" style={{ color: isGrandTotal ? undefined : getDynamicColor(row.calculatedInstallment, colorSettings.tragop) }}>
                                                        <div>{roundUp(row.calculatedInstallment)}%</div>
                                                        <DeltaBadge current={row.calculatedInstallment} previous={prev?.installment} isPercent />
                                                    </td>
                                                    <td className="px-3 py-2 text-[13px] text-center tabular-nums border-slate-200 dark:border-slate-700 font-bold" style={{ color: isGrandTotal ? undefined : getDynamicColor(row.pctBillBk, colorSettings.bankem) }}>
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
                                            />
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
            <ColorSettingsModal isOpen={isColorModalOpen} onClose={() => setIsColorModalOpen(false)} settings={colorSettings} onSave={setStoredColorSettings} />
            <ColorSettingsModal isOpen={isColorModalOpen} onClose={() => setIsColorModalOpen(false)} settings={colorSettings} onSave={setStoredColorSettings} />
            <ImportPrevMonthModal isOpen={isPrevMonthModalOpen} onClose={() => setIsPrevMonthModalOpen(false)} onSave={setPrevMonthRaw} />
        </div>
    );
};

export default RevenueView;
