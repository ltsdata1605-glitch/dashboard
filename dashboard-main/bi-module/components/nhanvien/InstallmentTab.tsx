
import React, { useMemo, useRef, useState, useEffect } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { InstallmentRow, InstallmentProvider } from '../../types/nhanVienTypes';
import { getYesterdayDateString, parseInstallmentData } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { ChevronDownIcon, ViewListIcon, ViewGridIcon, SpinnerIcon, ClockIcon, XIcon, CheckCircleIcon, DownloadAllIcon } from '../Icons';
import { Switch } from '../dashboard/DashboardWidgets';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../../services/uiService';
import { MedalBadge, DeltaBadge } from '../shared/Badges';
import AvatarDisplay from './shared/AvatarDisplay';
import TimeProgressBar from './shared/TimeProgressBar';



const InstallmentTab: React.FC<{
    rows: InstallmentRow[];
    supermarketName: string;
    activeDepartments: string[];
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
}> = ({ rows, supermarketName, activeDepartments, highlightedEmployees, setHighlightedEmployees }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'totalPercent', direction: 'desc' });
    const [isHighlightFilterOpen, setIsHighlightFilterOpen] = useState(false);
    const [viewMode, setViewMode] = useIndexedDBState<'group' | 'list'>('installment-view-mode', 'group');
    const [hidePercent, setHidePercent] = useState(true);
    
    const [prevMonthRaw, setPrevMonthRaw] = useIndexedDBState<string>(`prev-month-installment-${supermarketName}`, '');
    const prevMonthRows = useMemo(() => {
        try {
            if (!prevMonthRaw) return [];
            if (prevMonthRaw.startsWith('[')) return JSON.parse(prevMonthRaw);
            const map = new Map<string, string>();
            rows.forEach(r => { if(r.originalName) map.set(r.originalName, r.department || ''); });
            return parseInstallmentData(prevMonthRaw, map);
        } catch { return []; }
    }, [prevMonthRaw, rows]);

    const [exportDeptFilter, setExportDeptFilter] = useState<string | null>(null);
    const [isExportingByDept, setIsExportingByDept] = useState(false);
    const [exportDeptProgress, setExportDeptProgress] = useState({ current: 0, total: 0 });
    
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }); 

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (highlightRef.current && !highlightRef.current.contains(event.target as Node)) setIsHighlightFilterOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSort = (key: string) => { setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' })); };

    const displayList = useMemo(() => {
        if (rows.length === 0) return [];
        const isFiltering = !activeDepartments.includes('all');
        const allDepts = Array.from(new Set(rows.filter(r => r.type === 'employee' && r.department).map(r => r.department as string))).sort();
        
        let deptsToProcess = exportDeptFilter ? [exportDeptFilter] : (isFiltering ? activeDepartments : allDepts);
        
        const calculateRowWithComparison = (row: any) => {
            const oldRow = prevMonthRows.find((pr:any) => pr.originalName === row.originalName);
            return { ...row, oldRow };
        };

        const totalRow = rows.find(r => r.type === 'total');

        if (viewMode === 'list' && !exportDeptFilter) {
            const list = rows.filter(r => r.type === 'employee' && (isFiltering ? activeDepartments.includes(r.department!) : true))
                             .map(calculateRowWithComparison);
            list.sort((a, b) => {
                let valA: any = 0, valB: any = 0;
                if (sortConfig.key === 'name') { valA = a.originalName || a.name; valB = b.originalName || b.name; }
                else if (sortConfig.key === 'totalDtSieuThi') { valA = a.totalDtSieuThi; valB = b.totalDtSieuThi; }
                else if (sortConfig.key === 'totalPercent') { valA = a.totalPercent; valB = b.totalPercent; }
                else if (sortConfig.key.startsWith('p-dt-')) {
                    const idx = parseInt(sortConfig.key.replace('p-dt-', ''));
                    valA = a.providers[idx]?.dt || 0; valB = b.providers[idx]?.dt || 0;
                }
                const compare = typeof valA === 'string' ? valA.localeCompare(valB) : (valA - valB);
                return sortConfig.direction === 'asc' ? compare : -compare;
            });
            
            const result = list.map((emp, idx) => ({ ...emp, rank: idx + 1 }));
            if (totalRow && !exportDeptFilter) {
                result.push({ ...calculateRowWithComparison(totalRow), rank: 0 });
            }
            return result;
        }

        let deptGroups = deptsToProcess.map(deptName => {
            const deptEmployees = rows.filter(r => r.type === 'employee' && r.department === deptName)
                                      .map(calculateRowWithComparison);
            
            deptEmployees.sort((a, b) => {
                let valA: any = 0, valB: any = 0;
                if (sortConfig.key === 'name') { valA = a.originalName || a.name; valB = b.originalName || b.name; }
                else if (sortConfig.key === 'totalDtSieuThi') { valA = a.totalDtSieuThi; valB = b.totalDtSieuThi; }
                else if (sortConfig.key === 'totalPercent') { valA = a.totalPercent; valB = b.totalPercent; }
                else if (sortConfig.key.startsWith('p-dt-')) {
                    const idx = parseInt(sortConfig.key.replace('p-dt-', ''));
                    valA = a.providers[idx]?.dt || 0; valB = b.providers[idx]?.dt || 0;
                }
                const compare = typeof valA === 'string' ? valA.localeCompare(valB) : (valA - valB);
                return sortConfig.direction === 'asc' ? compare : -compare;
            });

            const sumDtSieuThi = deptEmployees.reduce((s, e) => s + e.totalDtSieuThi, 0);
            
            const sampleProviders = rows.find(r => r.providers.length > 0)?.providers || [];
            
            const sumProviders = sampleProviders.map((sp, i) => {
                const totalDt = deptEmployees.reduce((s, e) => s + (e.providers[i]?.dt || 0), 0);
                return {
                    name: sp.name,
                    shortName: sp.shortName,
                    dt: totalDt,
                    percent: sumDtSieuThi > 0 ? (totalDt / sumDtSieuThi) * 100 : 0
                };
            });
            const totalPercent = sumDtSieuThi > 0 ? (sumProviders.reduce((s, p) => s + p.dt, 0) / sumDtSieuThi) * 100 : 0;

            return {
                name: deptName,
                employees: deptEmployees,
                sumDtSieuThi,
                sumProviders,
                totalPercent,
                sortValue: sortConfig.key === 'totalPercent' ? totalPercent : (sortConfig.key === 'totalDtSieuThi' ? sumDtSieuThi : totalPercent)
            };
        });

        deptGroups.sort((a, b) => {
             if (sortConfig.key === 'name') return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
             return sortConfig.direction === 'asc' ? a.sortValue - b.sortValue : b.sortValue - a.sortValue;
        });

        const finalOutput: any[] = [];
        deptGroups.forEach(group => {
            if (group.employees.length > 0) {
                finalOutput.push({ 
                    type: 'department', 
                    name: group.name, 
                    providers: group.sumProviders,
                    totalDtSieuThi: group.sumDtSieuThi,
                    totalPercent: group.totalPercent
                });
                finalOutput.push(...group.employees.map((emp, idx) => ({ ...emp, rank: idx + 1 })));
            }
        });

        if (totalRow && !exportDeptFilter && !isFiltering) {
            finalOutput.push({ ...calculateRowWithComparison(totalRow), rank: 0 });
        }

        return finalOutput;
    }, [rows, activeDepartments, sortConfig, viewMode, exportDeptFilter, prevMonthRows]);

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const original = cardRef.current;
        try {
            const safeName = customFilename || `Installment_${supermarketName}.png`;
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
            console.error('Failed to export image', err);
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
            const action = await handleExportPNG(`TG_BP_${safeDeptName}_${supermarketName}.png`, autoAction);
            if (action === 'cancel') break;
            autoAction = action;
        }
        setExportDeptFilter(null);
        setIsExportingByDept(false);
    };

    const handleExportDataFile = () => {
        if (rows.length === 0) return;
        const dataStr = JSON.stringify(rows, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `TRAGOP_${supermarketName.replace(/ /g, '_')}_${getYesterdayDateString().replace(/\//g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                JSON.parse(content); 
                setPrevMonthRaw(content);
                alert('✅ Đã nạp dữ liệu trả góp cùng kỳ thành công!');
            } catch (err) { alert('❌ File không hợp lệ.'); }
            if (importFileRef.current) importFileRef.current.value = '';
        };
        reader.readAsText(file);
    };

    if (rows.length === 0) return <Card title="Phân tích Trả góp"><div className="py-20 text-center text-slate-500">Chưa có dữ liệu.</div></Card>;
    
    const providers = rows.find(r => r.providers.length > 0)?.providers || [];

    const cardTitle = (
        <div className="flex flex-col items-start leading-none py-1 w-full">
            <span className="js-report-title text-2xl font-black uppercase text-slate-800 dark:text-white mt-1">TRẢ GÓP NHÂN VIÊN ĐẾN NGÀY {getYesterdayDateString()}</span>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mt-1 font-bold">Khi lợi ích được đặt đúng chỗ, quyết định mua trở nên tự nhiên.</span>
            <TimeProgressBar className="mt-2.5" />
        </div>
    );

    const isMobile = window.innerWidth < 768;

    return (
        <div className="space-y-0">
            <div className="flex flex-wrap justify-between items-center px-4 py-2.5 bg-white dark:bg-slate-800 no-print border-b border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex gap-3 items-center">
                    <input type="file" ref={importFileRef} onChange={handleFileImport} accept=".json" className="hidden" />
                    <button onClick={() => importFileRef.current?.click()} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border transition-all ${prevMonthRaw ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}><ClockIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cùng kỳ</span>{prevMonthRaw && <button onClick={(e) => { e.stopPropagation(); setPrevMonthRaw(''); }} className="ml-0.5 p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-800"><XIcon className="h-3 w-3" /></button>}</button>
                </div>
                <div className="flex gap-1.5 items-center">
                    <button onClick={() => setHidePercent(v => !v)} title={hidePercent ? 'Hiện cột %' : 'Ẩn cột %'} className={`p-1 transition-all text-[11px] font-black leading-none ${hidePercent ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600'}`}><span className={hidePercent ? 'line-through' : ''}>%</span></button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <button onClick={() => setViewMode('group')} title="Bộ phận" className={`p-1 transition-all ${viewMode === 'group' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}><ViewGridIcon className="h-4 w-4"/></button>
                    <button onClick={() => setViewMode('list')} title="Danh sách" className={`p-1 transition-all ${viewMode === 'list' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}><ViewListIcon className="h-4 w-4"/></button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <button onClick={handleBatchExportByDept} disabled={isExportingByDept} title={isExportingByDept ? `Đang xuất ${exportDeptProgress.current}/${exportDeptProgress.total}` : 'Xuất ảnh theo bộ phận'} className="p-1 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-50">{isExportingByDept ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <DownloadAllIcon className="h-4 w-4" />}</button>
                    <ExportButton onExportPNG={() => handleExportPNG()} />
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
                                            <div key={`${row.type}-${idx}`} className={`px-4 py-3 ${isGrandTotal ? 'bg-sky-50 dark:bg-sky-900/50 font-black' : 'bg-slate-50 dark:bg-slate-900/90 font-bold'} flex justify-between items-center`}>
                                                <span className="uppercase tracking-wider text-xs">{row.name}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-primary-600 dark:text-primary-400">{f.format(Math.ceil(row.totalPercent))}% TG</span>
                                                    <span className="text-[10px] opacity-60">{f.format(Math.ceil(row.totalDtSieuThi))} Tr</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                    const oldRow = row.oldRow;
                                    return (
                                        <div 
                                            key={row.originalName || idx} 
                                            className={`p-4 flex flex-col gap-3 transition-all ${isHighlighted ? 'bg-amber-50 dark:bg-amber-900/20' : 'active:bg-slate-50'}`}
                                            onClick={() => setHighlightedEmployees((prev: Set<string>) => { const n = new Set(prev); if (n.has(row.originalName!)) n.delete(row.originalName!); else n.add(row.originalName!); return n; })}
                                        >
                                            <div className="flex items-center gap-3">
                                                <MedalBadge rank={row.rank} />

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-slate-900 dark:text-white truncate">{row.name}</span>
                                                        <div className="flex flex-col items-end">
                                                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${row.totalPercent >= 45 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30'}`}>{f.format(Math.ceil(row.totalPercent))}% TG</span>
                                                            <DeltaBadge current={row.totalPercent} previous={oldRow?.totalPercent} />
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2">
                                                {row.providers.map((p: InstallmentProvider, pIdx: number) => {
                                                    const oldP = oldRow?.providers[pIdx];
                                                    if (p.dt === 0) return null;
                                                    return (
                                                        <div key={pIdx} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                                            <div>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{p.shortName}</p>
                                                                <p className="text-xs font-black tabular-nums">{f.format(Math.ceil(p.dt))} Tr</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`text-xs font-bold tabular-nums ${p.percent >= 40 ? 'text-emerald-600' : 'text-slate-500'}`}>{f.format(Math.ceil(p.percent))}%</p>
                                                                <DeltaBadge current={p.percent} previous={oldP?.percent} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                                <span>Doanh thu siêu thị:</span>
                                                <span className="text-slate-900 dark:text-slate-200 tabular-nums">{f.format(Math.ceil(row.totalDtSieuThi))} Triệu</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <table className="w-full border-collapse compact-export-table border border-slate-200 dark:border-slate-700">
                                <thead className="sticky top-0 z-10">
                                    {/* Tier 1: Group Headers */}
                                    <tr>
                                        <th rowSpan={hidePercent ? 1 : 2} onClick={() => handleSort('name')} className="px-3 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-b-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 min-w-[200px] align-middle">Nhân viên</th>
                                        {providers.map(p => <th key={p.name} rowSpan={hidePercent ? 1 : undefined} colSpan={hidePercent ? 1 : 2} className={`px-1 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-r ${hidePercent ? 'border-b-2' : 'border-b'} border-sky-100 dark:border-sky-800/50 leading-tight align-middle`}>{p.shortName}</th>)}
                                        <th rowSpan={hidePercent ? 1 : 2} onClick={() => handleSort('totalDtSieuThi')} className="px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-b-2 border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40 leading-tight align-middle"><div>D.THU</div><div>THỰC</div></th>
                                        <th rowSpan={hidePercent ? 1 : 2} onClick={() => handleSort('totalPercent')} className="px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border-b-2 border-amber-100 dark:border-amber-800/50 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 leading-tight align-middle">%T.Chậm</th>
                                    </tr>
                                    {/* Tier 2: Column Headers - only shown when % columns visible */}
                                    {!hidePercent && <tr className="bg-slate-50 dark:bg-slate-800/80">
                                        {providers.map(p => <React.Fragment key={p.name}><th className="px-1 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 border-r border-b-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-sky-50 transition-colors">DT</th><th className="px-1 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 border-r border-b-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-sky-50 transition-colors">%</th></React.Fragment>)}
                                    </tr>}
                                </thead>
                                <tbody className="bg-white dark:bg-[#1c1c1e]">
                                    {displayList.map((row, idx) => {
                                        if (row.type === 'department') {
                                            return (
                                                <tr key={`dept-${idx}`} className="bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300 border-t border-b border-slate-200 dark:border-slate-700">
                                                    <td className="px-2 py-1 text-[13px] uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 font-extrabold">{row.name}</td>
                                                    {row.providers.map((p: any, pIdx: number) => (
                                                        <React.Fragment key={pIdx}>
                                                            <td className="px-1 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold"><div>{p.dt > 0 ? f.format(Math.ceil(p.dt)) : '-'}</div></td>
                                                            {!hidePercent && <td className={`px-1 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold ${p.percent >= 40 ? 'text-emerald-600' : 'text-slate-500'}`}><div>{p.percent > 0 ? `${Math.round(p.percent)}%` : '-'}</div></td>}
                                                        </React.Fragment>
                                                    ))}
                                                    <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold">{f.format(Math.ceil(row.totalDtSieuThi))}</td>
                                                    <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-extrabold ${row.totalPercent >= 45 ? 'text-emerald-600' : 'text-amber-600'}`}>{Math.round(row.totalPercent)}%</td>
                                                </tr>
                                            );
                                        }
                                        const isTotal = row.type === 'total';
                                        const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                        const oldRow = row.oldRow;

                                        return (
                                            <tr key={row.originalName || idx} className={`transition-all cursor-pointer text-[13px] border-b border-slate-200 dark:border-slate-700 ${isTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 font-extrabold text-emerald-800 dark:text-emerald-200 border-t-2 border-emerald-200 dark:border-emerald-800' : (isHighlighted ? 'bg-sky-50/50 dark:bg-sky-900/10' : 'hover:bg-slate-50/80 dark:hover:bg-slate-750')}`}>
                                                <td className={`px-2 py-1 whitespace-nowrap border-r border-slate-200 dark:border-slate-700 ${isTotal ? 'text-center uppercase tracking-wider text-[13px]' : ''}`}>
                                                    <div className={`flex items-center ${isTotal ? 'justify-center' : 'gap-2'}`}>
                                                        {!isTotal && <MedalBadge rank={row.rank} />}
                                                        {!isTotal && <AvatarDisplay employeeName={row.originalName!} supermarketName={supermarketName} />}
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={`font-bold ${isTotal ? '' : 'text-sky-600 dark:text-sky-400 text-[13px] whitespace-normal break-words'}`}>{row.name}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                {row.providers.map((p: InstallmentProvider, pIdx: number) => {
                                                    const oldP = oldRow?.providers[pIdx];
                                                    return (
                                                        <React.Fragment key={pIdx}>
                                                            <td className="px-1 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 font-bold tabular-nums text-slate-700 dark:text-slate-300"><div>{p.dt > 0 ? f.format(Math.ceil(p.dt)) : '-'}</div></td>
                                                            {!hidePercent && <td className={`px-1 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 font-bold tabular-nums ${p.percent >= 40 ? 'text-emerald-600' : 'text-slate-400'}`}><div>{p.percent > 0 ? `${Math.round(p.percent)}%` : '-'}</div><DeltaBadge current={p.percent} previous={oldP?.percent} /></td>}
                                                        </React.Fragment>
                                                    )
                                                })}
                                                <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 tabular-nums">{f.format(Math.ceil(row.totalDtSieuThi))}</td>
                                                <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 font-bold tabular-nums ${row.totalPercent >= 45 ? 'text-emerald-600' : (row.totalPercent < 40 ? 'text-rose-500' : 'text-amber-600')}`}><div>{Math.round(row.totalPercent)}%</div><DeltaBadge current={row.totalPercent} previous={oldRow?.totalPercent} /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
export default InstallmentTab;
