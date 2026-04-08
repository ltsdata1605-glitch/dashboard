
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { SpinnerIcon, ChevronDownIcon, UsersIcon, UploadIcon, SaveIcon, CogIcon, XIcon, ViewListIcon, ViewGridIcon, CameraIcon, ClockIcon } from '../Icons';
import { RevenueRow, Employee, PerformanceChange, SnapshotData, SnapshotMetadata } from '../../types/nhanVienTypes';
import { roundUp, getYesterdayDateString, parseNumber } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import * as db from '../../utils/db';
import { parseRevenueData } from '../../utils/nhanVienHelpers';
import { Switch } from '../dashboard/DashboardWidgets';

import { MedalBadge, DeltaBadge } from '../shared/Badges';
import { AvatarUploader } from '../shared/AvatarUploader';
import { ColorSettingsModal, ColorSettings, DEFAULT_COLOR_SETTINGS, CriterionConfig } from './revenue/ColorSettingsModal';
import { ImportPrevMonthModal } from './revenue/ImportPrevMonthModal';
import { useRevenueData } from '../../hooks/useRevenueData';



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
    rows, supermarketName, departmentNames, performanceChanges, onViewTrend, 
    highlightedEmployees, setHighlightedEmployees, snapshotId, setSnapshotId,
    snapshots, handleSaveSnapshot, handleDeleteSnapshot,
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

    const handleExportPNG = async (customFilename?: string) => {
        if (!cardRef.current || !(window as any).html2canvas) return;
        const original = cardRef.current;
        const clone = original.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute'; clone.style.left = '-9999px'; clone.style.width = 'max-content'; clone.style.maxWidth = 'none';
        clone.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff';
        if (document.documentElement.classList.contains('dark')) clone.classList.add('dark');
        
        clone.querySelectorAll('.no-print, .export-button-component').forEach(el => (el as HTMLElement).style.display = 'none');
        
        const table = clone.querySelector('table');
        if (table) {
            table.style.width = 'max-content'; table.style.borderRadius = '0';
            table.querySelectorAll('th, td').forEach(el => { (el as HTMLElement).style.padding = '12px 10px'; (el as HTMLElement).style.whiteSpace = 'nowrap'; });
        }
        document.body.appendChild(clone);
        try {
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const headerFlex = clone.querySelector('.card-header-container') as HTMLElement;
            if (headerFlex) {
                headerFlex.style.flexDirection = 'column';
                headerFlex.style.alignItems = 'flex-start';
                headerFlex.style.gap = '8px';
            }

            const titleElement = clone.querySelector('.js-report-title') as HTMLElement;
            if (titleElement) {
                titleElement.style.fontSize = '32px'; 
                titleElement.style.fontWeight = '900'; 
                titleElement.style.display = 'block'; 
                titleElement.style.textAlign = 'left';
            }

            const widget = clone.querySelector('.js-time-progress-widget') as HTMLElement;
            if (widget) {
                widget.style.width = '100%';
                widget.style.marginTop = '4px';
            }

            const canvas = await (window as any).html2canvas(clone, { scale: 3, useCORS: true, backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff', width: clone.scrollWidth, height: clone.scrollHeight });
            const link = document.createElement('a'); 
            link.download = customFilename || `DT_NhanVien_${supermarketName}.png`; 
            link.href = canvas.toDataURL('image/png'); 
            link.click();
        } finally { document.body.removeChild(clone); }
    };

    const handleBatchExportByDept = async () => {
        const allDepts = Array.from(new Set(rows.filter(r => r.type === 'employee' && r.department).map(r => r.department as string))).sort();
        if (allDepts.length === 0) return;

        setIsExportingByDept(true);
        setExportDeptProgress({ current: 0, total: allDepts.length });

        for (let i = 0; i < allDepts.length; i++) {
            const dept = allDepts[i] as string;
            setExportDeptFilter(dept);
            setExportDeptProgress({ current: i + 1, total: allDepts.length });
            await new Promise(r => setTimeout(r, 400));
            const safeDeptName = dept.replace(/\//g, '_').replace(/\s+/g, '_');
            await handleExportPNG(`DT_BP_${safeDeptName}_${supermarketName}.png`);
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
                    <span className="text-xs font-black text-primary-600 tabular-nums leading-none">{Math.round(timeProgressData.percentage)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 relative overflow-hidden">
                    <div 
                        className="h-full bg-primary-500 rounded-full transition-all duration-500"
                        style={{ width: `${timeProgressData.percentage}%` }}
                    />
                </div>
            </div>
        );
    }, [timeProgressData]);
    
    const cardTitle = (
        <div className="flex flex-col w-full">
            <div className="flex flex-col items-start leading-none">
                <span className="js-report-title text-3xl font-extrabold uppercase text-primary-700">DOANH THU NHÂN VIÊN ĐẾN NGÀY {getYesterdayDateString()}</span>
                <span className="text-[11px] italic text-slate-500 mt-1 font-medium">"Tôi không chạy theo doanh thu — doanh thu phản ánh đẳng cấp mà Tôi tạo ra."</span>
            </div>
            {timeProgressWidget}
        </div>
    );

    if (!supermarketName) return <Card title="Phân tích Nhân viên"><div className="py-12 text-center text-slate-500">Vui lòng chọn siêu thị.</div></Card>;
    if (isLoading) return <Card title={cardTitle}><div className="flex items-center justify-center py-20"><SpinnerIcon className="h-12 w-12 text-primary-500 animate-spin" /></div></Card>;

    const isMobile = window.innerWidth < 768;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 no-print">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2 flex-1 sm:flex-none">
                        <UsersIcon className="h-4 w-4 text-slate-400" />
                        <select value={snapshotId || ''} onChange={(e) => setSnapshotId(e.target.value || null)} className="flex-1 sm:flex-none pl-3 pr-8 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg outline-none min-w-[140px] appearance-none cursor-pointer">
                            <option value="">Snapshot: Hiện tại</option>
                            {snapshots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center bg-slate-100 dark:bg-slate-950 rounded-xl p-1 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <button 
                            onClick={() => setViewMode('group')} 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'group' ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-md ring-1 ring-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <ViewGridIcon className="h-4 w-4"/>
                            <span className="hidden xs:inline">BỘ PHẬN</span>
                        </button>
                        <button 
                            onClick={() => setViewMode('list')} 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-md ring-1 ring-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <ViewListIcon className="h-4 w-4"/>
                            <span className="hidden xs:inline">DANH SÁCH</span>
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button 
                        onClick={() => setIsPrevMonthModalOpen(true)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase rounded-lg border transition-all ${prevMonthRaw ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                        <ClockIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Tháng trước</span>
                        {prevMonthRaw && (
                            <button onClick={(e) => { e.stopPropagation(); setPrevMonthRaw(''); }} className="ml-1 p-0.5 hover:bg-emerald-200 rounded">
                                <XIcon className="h-3 w-3" />
                            </button>
                        )}
                    </button>
                    <button 
                        onClick={handleBatchExportByDept}
                        disabled={isExportingByDept}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isExportingByDept ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4" />}
                        <span className="hidden sm:inline">{isExportingByDept ? `Đang xuất ${exportDeptProgress.current}/${exportDeptProgress.total}...` : 'Xuất theo BP'}</span>
                    </button>
                    <button onClick={() => setIsColorModalOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors" title="Cấu hình màu"><CogIcon className="h-4 w-4" /></button>
                    <ExportButton onExportPNG={() => handleExportPNG()} />
                </div>
            </div>

            <div ref={cardRef}>
                <Card noPadding title={cardTitle} rounded={false}>
                    <div className="w-full overflow-x-auto border-t border-slate-100 dark:border-slate-800 shadow-sm rounded-none" style={{ WebkitOverflowScrolling: 'touch' }}>
                        {isMobile ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {displayList.map((row, idx) => {
                                    if (row.type === 'department' || row.type === 'total') {
                                        const isGrandTotal = row.type === 'total';
                                        return (
                                            <div key={`${row.type}-${idx}`} className={`px-4 py-3 ${isGrandTotal ? 'bg-sky-50 dark:bg-sky-900/50 font-black' : 'bg-slate-50 dark:bg-slate-900/90 font-bold'} flex justify-between items-center`}>
                                                <span className="uppercase tracking-wider text-xs">{row.name}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-primary-600 dark:text-primary-400">{f.format(roundUp(row.dtqd))} Tr</span>
                                                    <span className="text-[10px] opacity-60">{roundUp(row.calculatedCompletion)}% HT</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                    const prev = row.prevCompData;
                                    return (
                                        <div 
                                            key={row.originalName} 
                                            className={`p-4 flex flex-col gap-3 transition-all ${isHighlighted ? 'bg-amber-50 dark:bg-amber-900/20' : 'active:bg-slate-50'}`}
                                            onClick={() => setHighlightedEmployees((prev: Set<string>) => { const n = new Set(prev); if (n.has(row.originalName!)) n.delete(row.originalName!); else n.add(row.originalName!); return n; })}
                                        >
                                            <div className="flex items-center gap-3">
                                                <MedalBadge rank={row.rank} />
                                                <AvatarUploader employeeName={row.originalName!} supermarketName={supermarketName} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-slate-900 dark:text-white truncate">{row.name}</span>
                                                        <span className="text-[10px] font-black text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full">{roundUp(row.calculatedCompletion)}% HT</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold">{row.department}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">DTQĐ</p>
                                                    <p className="text-sm font-black text-primary-600 tabular-nums">{f.format(roundUp(row.dtqd))}</p>
                                                    <DeltaBadge current={row.dtqd} previous={prev?.dtqd} isCurrency />
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">HQQĐ</p>
                                                    <p className="text-sm font-black tabular-nums" style={{ color: getDynamicColor(row.hieuQuaQD * 100, colorSettings.hqqd) }}>{isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%</p>
                                                    <DeltaBadge current={row.hieuQuaQD * 100} previous={prev?.hqqd * 100} isPercent />
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Trả góp</p>
                                                    <p className="text-sm font-black tabular-nums" style={{ color: getDynamicColor(row.calculatedInstallment, colorSettings.tragop) }}>{roundUp(row.calculatedInstallment)}%</p>
                                                    <DeltaBadge current={row.calculatedInstallment} previous={prev?.installment} isPercent />
                                                </div>
                                            </div>
                                            
                                            <div className="flex justify-between items-center no-print">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onViewTrend(row as Employee); }}
                                                    className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-1"
                                                >
                                                    <UsersIcon className="h-3 w-3" />
                                                    Xem chi tiết xu hướng
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Bán kèm:</span>
                                                    <span className="text-[10px] font-black" style={{ color: getDynamicColor(row.pctBillBk, colorSettings.bankem) }}>{roundUp(row.pctBillBk)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <table className="min-w-full text-[13px]">
                                <thead className="bg-sky-600 dark:bg-sky-800 text-white font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-4 text-center cursor-pointer select-none border-r border-sky-500/30" onClick={() => handleSort('name')}>Nhân viên</th>
                                        <th className="px-3 py-4 text-center cursor-pointer select-none border-r border-sky-500/30 bg-sky-700/40" onClick={() => handleSort('dtlk')}>DT THỰC</th>
                                        <th className="px-3 py-4 text-center cursor-pointer select-none border-r border-sky-500/30 bg-sky-700/40" onClick={() => handleSort('dtqd')}>DTQĐ</th>
                                        <th className="px-3 py-4 text-center cursor-pointer select-none border-r border-sky-500/30 bg-sky-700/50" onClick={() => handleSort('target')}>M.TIÊU</th>
                                        <th className="px-3 py-4 text-center cursor-pointer select-none border-r border-sky-500/30 bg-sky-700/50" onClick={() => handleSort('completion')}>%HT</th>
                                        <th className="px-3 py-4 text-center cursor-pointer select-none border-r border-sky-500/30" onClick={() => handleSort('hqqd')}>HQQĐ</th>
                                        <th className="px-3 py-4 text-center border-r border-sky-500/30" onClick={() => handleSort('installment')}>%T.GÓP</th>
                                        <th className="px-3 py-4 text-center cursor-pointer select-none" onClick={() => handleSort('bankem')}>%B.KÈM</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                    {displayList.map((row, idx) => {
                                        if (row.type === 'department' || row.type === 'total') {
                                            const isGrandTotal = row.type === 'total';
                                            const prev = row.prevCompData;
                                            return (
                                                <tr key={`${row.type}-${idx}`} className={`${isGrandTotal ? 'bg-sky-50 dark:bg-sky-900/50 text-slate-900 dark:text-sky-100 shadow-inner font-black' : 'bg-slate-100 dark:bg-slate-900/90 font-black text-slate-800 dark:text-slate-100'} border-y border-slate-200 dark:border-slate-700`}>
                                                    <td className={`px-4 py-3 uppercase tracking-widest border-r ${isGrandTotal ? 'border-sky-200 dark:border-sky-800 text-center' : 'border-slate-200 dark:border-slate-700'}`}>{row.name}</td>
                                                    <td className={`px-3 py-3 text-center border-r tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-sky-800' : 'border-slate-200 dark:border-slate-700'}`}>
                                                        <div>{f.format(roundUp(row.dtlk))}</div>
                                                        <DeltaBadge current={row.dtlk} previous={prev?.dtlk} isCurrency />
                                                    </td>
                                                    <td className={`px-3 py-3 text-center border-r tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-sky-800' : 'border-slate-200 dark:border-slate-700 text-primary-600 dark:text-primary-400'}`}>
                                                        <div>{f.format(roundUp(row.dtqd))}</div>
                                                        <DeltaBadge current={row.dtqd} previous={prev?.dtqd} isCurrency />
                                                    </td>
                                                    <td className={`px-3 py-3 text-center border-r tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-sky-800 opacity-70' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                                        <div>{f.format(roundUp(row.calculatedTarget))}</div>
                                                        <DeltaBadge current={row.calculatedTarget} previous={prev?.target} isCurrency />
                                                    </td>
                                                    <td className={`px-3 py-3 text-center border-r tabular-nums font-black ${isGrandTotal ? 'border-sky-200 dark:border-sky-800' : 'border-slate-200 dark:border-slate-700'}`} style={{ color: isGrandTotal ? undefined : getHtColor(row.calculatedCompletion) }}>
                                                        <div>{roundUp(row.calculatedCompletion)}%</div>
                                                        <DeltaBadge current={row.calculatedCompletion} previous={prev?.completion} isPercent />
                                                    </td>
                                                    <td className={`px-3 py-3 text-center border-r tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-sky-800' : 'border-slate-200 dark:border-slate-700'}`} style={{ color: isGrandTotal ? undefined : getDynamicColor(row.hieuQuaQD * 100, colorSettings.hqqd) }}>
                                                        <div>{isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%</div>
                                                        <DeltaBadge current={row.hieuQuaQD * 100} previous={prev?.hqqd * 100} isPercent />
                                                    </td>
                                                    <td className={`px-3 py-3 text-center border-r tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-sky-800' : 'border-slate-200 dark:border-slate-700'}`} style={{ color: isGrandTotal ? undefined : getDynamicColor(row.calculatedInstallment, colorSettings.tragop) }}>
                                                        <div>{roundUp(row.calculatedInstallment)}%</div>
                                                        <DeltaBadge current={row.calculatedInstallment} previous={prev?.installment} isPercent />
                                                    </td>
                                                    <td className={`px-3 py-3 text-center tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-sky-800' : ''}`} style={{ color: isGrandTotal ? undefined : getDynamicColor(row.pctBillBk, colorSettings.bankem) }}>
                                                        <div>{roundUp(row.pctBillBk)}%</div>
                                                        <DeltaBadge current={row.pctBillBk} previous={prev?.pctBillBk} isPercent />
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                        const prev = row.prevCompData;

                                        return (
                                            <tr key={row.originalName} className={`transition-all group cursor-pointer ${isHighlighted ? 'bg-amber-100 dark:bg-amber-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                                <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 dark:border-slate-700 min-w-[150px]">
                                                    <div className="flex items-center gap-3">
                                                        <MedalBadge rank={row.rank} />
                                                        <AvatarUploader employeeName={row.originalName!} supermarketName={supermarketName} />
                                                        <div className="flex flex-col min-w-0" onClick={() => setHighlightedEmployees((prev: Set<string>) => { const n = new Set(prev); if (n.has(row.originalName!)) n.delete(row.originalName!); else n.add(row.originalName!); return n; })}>
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={(e) => { e.stopPropagation(); onViewTrend(row as Employee); }} className="text-left font-bold text-primary-600 dark:text-primary-400 hover:underline whitespace-normal break-words">{row.name}</button>
                                                            </div>
                                                            <span className="text-[9px] text-slate-400 uppercase font-bold tabular-nums">{row.department}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 font-semibold" style={{ color: getDynamicColor(row.dtlk, colorSettings.dtthuc) }}>
                                                    <div>{f.format(roundUp(row.dtlk))}</div>
                                                    <DeltaBadge current={row.dtlk} previous={prev?.dtlk} isCurrency />
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 font-bold" style={{ color: getDynamicColor(row.dtqd, colorSettings.dtqd) }}>
                                                    <div>{f.format(roundUp(row.dtqd))}</div>
                                                    <DeltaBadge current={row.dtqd} previous={prev?.dtqd} isCurrency />
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 bg-sky-50/20 italic font-bold text-slate-500 dark:text-slate-400">
                                                    <div>{f.format(roundUp(row.calculatedTarget || 0))}</div>
                                                    <DeltaBadge current={row.calculatedTarget} previous={prev?.target} isCurrency />
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 bg-sky-50/20 font-black" style={{ color: getHtColor(row.calculatedCompletion) }}>
                                                    <div>{roundUp(row.calculatedCompletion)}%</div>
                                                    <DeltaBadge current={row.calculatedCompletion} previous={prev?.completion} isPercent />
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 font-bold" style={{ color: getDynamicColor(row.hieuQuaQD * 100, colorSettings.hqqd) }}>
                                                    <div>{isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%</div>
                                                    <DeltaBadge current={row.hieuQuaQD * 100} previous={prev?.hqqd * 100} isPercent />
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 font-black" style={{ color: getDynamicColor(row.calculatedInstallment, colorSettings.tragop) }}>
                                                    <div>{roundUp(row.calculatedInstallment)}%</div>
                                                    <DeltaBadge current={row.calculatedInstallment} previous={prev?.installment} isPercent />
                                                </td>
                                                <td className="px-3 py-3 text-center font-black" style={{ color: getDynamicColor(row.pctBillBk, colorSettings.bankem) }}>
                                                    <div>{roundUp(row.pctBillBk)}%</div>
                                                    <DeltaBadge current={row.pctBillBk} previous={prev?.pctBillBk} isPercent />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
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
