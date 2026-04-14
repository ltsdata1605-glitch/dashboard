
import React, { useMemo, useRef, useState, useEffect } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { CrossSellingRow } from '../../types/nhanVienTypes';
import { getYesterdayDateString, parseCrossSellingData } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { UsersIcon, UploadIcon, ClockIcon, XIcon, ViewGridIcon, ViewListIcon, CameraIcon, SpinnerIcon, DownloadIcon } from '../Icons';
import { Switch } from '../dashboard/DashboardWidgets';

const MedalBadge: React.FC<{ rank?: number }> = ({ rank }) => {
    if (!rank) return <div className="w-7" />;
    if (rank === 1) return <span className="flex items-center justify-center w-7 h-7 bg-yellow-400 text-white rounded-full shadow-sm text-sm" title="TOP 1">🥇</span>;
    if (rank === 2) return <span className="flex items-center justify-center w-7 h-7 bg-slate-300 text-white rounded-full shadow-sm text-sm" title="TOP 2">🥈</span>;
    if (rank === 3) return <span className="flex items-center justify-center w-7 h-7 bg-amber-600 text-white rounded-full shadow-sm text-sm" title="TOP 3">🥉</span>;
    return <span className="text-slate-400 font-bold w-7 text-center text-xs tabular-nums">#{rank}</span>;
};

const DeltaBadge: React.FC<{ current: number, previous?: number }> = ({ current, previous }) => {
    if (previous === undefined || previous === 0 || isNaN(previous) || isNaN(current)) return null;
    const diff = current - previous;
    if (isNaN(diff) || Math.abs(diff) < 0.1) return null;

    const isPositive = diff > 0;
    const colorClass = isPositive ? 'text-emerald-500' : 'text-rose-500';
    const icon = isPositive ? '▲' : '▼';
    
    return (
        <div className={`text-[8px] font-black leading-none mt-0.5 flex items-center justify-center gap-0.5 ${colorClass}`}>
            <span>{icon}</span>
            <span>{Math.abs(diff).toFixed(1)}%</span>
        </div>
    );
};

const ImportPrevMonthModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [pastedData, setPastedData] = useState('');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase">Nhập dữ liệu Bán kèm cùng kỳ</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><XIcon className="h-5 w-5" /></button>
                </div>
                <p className="text-xs text-slate-500 mb-4">Dán dữ liệu bảng báo cáo "Hiệu quả bán kèm" của tháng trước hoặc cùng kỳ từ HRM vào đây.</p>
                <textarea
                    autoFocus
                    value={pastedData}
                    onChange={e => setPastedData(e.target.value)}
                    placeholder="Click vào đây rồi nhấn Ctrl + V để dán bảng từ HRM..."
                    className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[10px] focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />
                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Huỷ</button>
                    <button onClick={() => { onSave(pastedData); onClose(); }} className="flex-[2] py-3 bg-primary-600 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-primary-700 transition-colors">Lưu dữ liệu</button>
                </div>
            </div>
        </div>
    );
};

const AvatarUploader: React.FC<{ employeeName: string; supermarketName: string }> = ({ employeeName, supermarketName }) => {
    const dbKey = `avatar-${supermarketName}-${employeeName}`;
    const [avatarSrc, setAvatarSrc] = useIndexedDBState<string | null>(dbKey, null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setAvatarSrc(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="relative group w-8 h-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {avatarSrc ? (
                <img src={avatarSrc} alt={employeeName} className="w-full h-full rounded-full object-cover shadow-sm ring-1 ring-white dark:ring-slate-700" />
            ) : (
                <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center ring-1 ring-slate-300 dark:ring-slate-600">
                    <UsersIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
            )}
            <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity no-print"><UploadIcon className="h-3 w-3 text-white" /></button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
    );
};

const CrossSellingTab: React.FC<{
    rows: CrossSellingRow[];
    supermarketName: string;
    activeDepartments: string[];
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
}> = ({ rows, supermarketName, activeDepartments, highlightedEmployees, setHighlightedEmployees }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);


    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'pctBillBk', direction: 'desc' });
    const [isHighlightFilterOpen, setIsHighlightFilterOpen] = useState(false);
    const [isPrevMonthModalOpen, setIsPrevMonthModalOpen] = useState(false);
    const [viewMode, setViewMode] = useIndexedDBState<'group' | 'list'>('bankem-view-mode', 'group');
    
    const [prevMonthRaw, setPrevMonthRaw] = useIndexedDBState<string>(`prev-month-bankem-${supermarketName}`, '');
    const prevMonthRows = useMemo(() => {
        try {
            if (!prevMonthRaw) return [];
            // Kiểm tra xem là chuỗi JSON hay văn bản dán
            if (prevMonthRaw.trim().startsWith('[') || prevMonthRaw.trim().startsWith('{')) {
                const parsed = JSON.parse(prevMonthRaw);
                return Array.isArray(parsed) ? parsed : [];
            }
            // Fallback cho dữ liệu dán văn bản từ HRM
            const map = new Map<string, string>();
            rows.forEach(r => { if(r.originalName) map.set(r.originalName, r.department || ''); });
            return parseCrossSellingData(prevMonthRaw, map);
        } catch (e) { 
            console.error("Error parsing cross selling prev data", e);
            return []; 
        }
    }, [prevMonthRaw, rows]);

    const [exportDeptFilter, setExportDeptFilter] = useState<string | null>(null);
    const [isExportingByDept, setIsExportingByDept] = useState(false);
    const [exportDeptProgress, setExportDeptProgress] = useState({ current: 0, total: 0 });

    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (highlightRef.current && !highlightRef.current.contains(event.target as Node)) setIsHighlightFilterOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSort = (key: string) => { setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' })); };

    const displayList = useMemo(() => {
        const isFiltering = !activeDepartments.includes('all');
        const allDepts = Array.from(new Set(rows.filter(r => r.type === 'employee' && r.department).map(r => r.department as string))).sort();
        let deptsToProcess = exportDeptFilter ? [exportDeptFilter] : (isFiltering ? activeDepartments : allDepts);

        const attachPrevMonth = (row: any) => {
            const oldRow = prevMonthRows.find((pr:any) => pr.originalName === row.originalName);
            return { ...row, oldRow };
        };

        if (viewMode === 'list' && !exportDeptFilter) {
            const list = rows.filter(r => r.type === 'employee' && (isFiltering ? activeDepartments.includes(r.department!) : true))
                             .map(attachPrevMonth);
            list.sort((a, b) => {
                let valA: any = (a as any)[sortConfig.key], valB: any = (b as any)[sortConfig.key];
                const compare = typeof valA === 'string' ? valA.localeCompare(valB) : (valA - valB);
                return sortConfig.direction === 'asc' ? compare : -compare;
            });
            const result = list.map((emp, idx) => ({ ...emp, rank: idx + 1 }));
            if (result.length > 0) {
                const sDtlk = result.reduce((s, e) => s + e.dtlk, 0);
                const sTotalBill = result.reduce((s, e) => s + e.totalBill, 0);
                const sBillBk = result.reduce((s, e) => s + e.billBk, 0);
                const sTotalSl = result.reduce((s, e) => s + e.totalSl, 0);
                const sSlBk = result.reduce((s, e) => s + e.slBk, 0);
                
                const oldTotal = prevMonthRows.find((pr:any) => pr.type === 'total');

                result.push({
                    type: 'total',
                    name: 'TỔNG CỘNG',
                    dtlk: sDtlk,
                    totalBill: sTotalBill,
                    billBk: sBillBk,
                    pctBillBk: sTotalBill > 0 ? (sBillBk / sTotalBill) * 100 : 0,
                    totalSl: sTotalSl,
                    slBk: sSlBk,
                    pctSpBk: sTotalSl > 0 ? (sSlBk / sTotalSl) * 100 : 0,
                    oldRow: oldTotal
                });
            }
            return result;
        }

        let deptGroups = deptsToProcess.map(deptName => {
            const deptEmployees = rows.filter(r => r.type === 'employee' && r.department === deptName)
                                      .map(attachPrevMonth);
            deptEmployees.sort((a, b) => {
                let valA: any = (a as any)[sortConfig.key], valB: any = (b as any)[sortConfig.key];
                const compare = typeof valA === 'string' ? valA.localeCompare(valB) : (valA - valB);
                return sortConfig.direction === 'asc' ? compare : -compare;
            });

            const sumDtlk = deptEmployees.reduce((s, e) => s + e.dtlk, 0);
            const sumBillBk = deptEmployees.reduce((s, e) => s + e.billBk, 0);
            const sumTotalBill = deptEmployees.reduce((s, e) => s + e.totalBill, 0);
            const sumSlBk = deptEmployees.reduce((s, e) => s + e.slBk, 0);
            const sumTotalSl = deptEmployees.reduce((s, e) => s + e.totalSl, 0);
            
            const oldDept = prevMonthRows.find((pr:any) => (pr.type === 'department' && pr.originalName === deptName) || (pr.type === 'department' && pr.name === deptName));

            return {
                name: deptName,
                employees: deptEmployees,
                sumDtlk,
                sumBillBk,
                pctBillBk: sumTotalBill > 0 ? (sumBillBk / sumTotalBill) * 100 : 0,
                sumTotalBill,
                sumSlBk,
                pctSpBk: sumTotalSl > 0 ? (sumSlBk / sumTotalSl) * 100 : 0,
                sumTotalSl,
                oldRow: oldDept,
                sortValue: (sortConfig.key === 'pctBillBk') ? (sumTotalBill > 0 ? sumBillBk / sumTotalBill : 0) : sumDtlk
            };
        });

        deptGroups.sort((a, b) => {
             if (sortConfig.key === 'name') return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
             return sortConfig.direction === 'asc' ? a.sortValue - b.sortValue : b.sortValue - a.sortValue;
        });

        const finalOutput: any[] = [];
        let grandDtlk = 0, grandBillBk = 0, grandTotalBill = 0, grandSlBk = 0, grandTotalSl = 0;

        deptGroups.forEach(group => {
            if (group.employees.length > 0) {
                finalOutput.push({ 
                    type: 'department', name: group.name, 
                    dtlk: group.sumDtlk, billBk: group.sumBillBk, 
                    pctBillBk: group.pctBillBk, totalBill: group.sumTotalBill, 
                    slBk: group.sumSlBk, pctSpBk: group.pctSpBk, 
                    totalSl: group.sumTotalSl,
                    oldRow: group.oldRow
                });
                finalOutput.push(...group.employees.map((emp, idx) => ({ ...emp, rank: idx + 1 })));
                
                grandDtlk += group.sumDtlk;
                grandBillBk += group.sumBillBk;
                grandTotalBill += group.sumTotalBill;
                grandSlBk += group.sumSlBk;
                grandTotalSl += group.sumTotalSl;
            }
        });

        if (finalOutput.length > 0 && !exportDeptFilter) {
            const oldTotal = prevMonthRows.find((pr:any) => pr.type === 'total');
            finalOutput.push({
                type: 'total',
                name: 'TỔNG CỘNG',
                dtlk: grandDtlk,
                totalBill: grandTotalBill,
                billBk: grandBillBk,
                pctBillBk: grandTotalBill > 0 ? (grandBillBk / grandTotalBill) * 100 : 0,
                totalSl: grandTotalSl,
                slBk: grandSlBk,
                pctSpBk: grandTotalSl > 0 ? (grandSlBk / grandTotalSl) * 100 : 0,
                oldRow: oldTotal
            });
        }
        return finalOutput;
    }, [rows, activeDepartments, sortConfig, viewMode, exportDeptFilter, prevMonthRows]);

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async (customFilename?: string) => {
        if (!cardRef.current || !(window as any).html2canvas) return;
        const original = cardRef.current;
        const clone = original.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute'; clone.style.left = '-9999px'; clone.style.width = 'max-content'; clone.style.maxWidth = 'none';
        clone.style.padding = '4px';
        clone.style.border = `1px solid ${document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'}`;
        clone.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff';
        if (document.documentElement.classList.contains('dark')) clone.classList.add('dark');
        clone.querySelectorAll('.no-print, .export-button-component').forEach(el => (el as HTMLElement).style.display = 'none');
        const table = clone.querySelector('table');
        if (table) {
            table.style.width = 'max-content'; table.style.fontSize = '12px';
            table.querySelectorAll('th, td').forEach(el => { (el as HTMLElement).style.padding = '10px 8px'; (el as HTMLElement).style.whiteSpace = 'nowrap'; });
        }
        document.body.appendChild(clone);
        try {
            await new Promise(resolve => setTimeout(resolve, 200));
            const canvas = await (window as any).html2canvas(clone, { scale: 2.5, useCORS: true, backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff', width: clone.scrollWidth, height: clone.scrollHeight });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) showExportOptions(blob, customFilename || `CrossSelling_${supermarketName}.png`);
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
            await handleExportPNG(`BK_BP_${safeDeptName}_${supermarketName}.png`);
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
        link.download = `BANKEM_${supermarketName.replace(/ /g, '_')}_${getYesterdayDateString().replace(/\//g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (rows.length === 0) return <Card title="Hiệu quả Bán kèm"><div className="py-20 text-center text-slate-500">Chưa có dữ liệu.</div></Card>;

    const cardTitle = (
        <div className="flex flex-col items-start leading-none py-1">
            <span className="js-report-title text-3xl font-extrabold uppercase text-primary-700">HIỆU QUẢ BÁN KÈM NHÂN VIÊN ĐẾN NGÀY {getYesterdayDateString()}</span>
            <span className="text-sm italic text-slate-500 mt-2 font-medium">"Không chỉ là bán hàng, đó là sự quan tâm và mang lại giải pháp toàn diện cho khách hàng."</span>
        </div>
    );

    const isMobile = window.innerWidth < 768;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 no-print">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative" ref={highlightRef}>
                        <button onClick={() => setIsHighlightFilterOpen(!isHighlightFilterOpen)} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg border transition-all ${highlightedEmployees.size > 0 ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-300 text-slate-700'}`}>
                            <UsersIcon className="h-4 w-4" /><span>Highlight ({highlightedEmployees.size})</span>
                        </button>
                        {isHighlightFilterOpen && (
                            <div className="absolute left-0 top-full mt-2 w-72 max-h-96 bg-white dark:bg-slate-800 rounded-xl shadow-xl border z-50 p-2 overflow-y-auto animate-in fade-in slide-in-top-2 duration-200">
                                {rows.filter(r => r.type === 'employee').map(emp => (
                                    <div key={emp.originalName} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer" onClick={() => setHighlightedEmployees(prev => { const n = new Set(prev); if (n.has(emp.originalName!)) n.delete(emp.originalName!); else n.add(emp.originalName!); return n; })}>
                                        <span className={`text-sm ${highlightedEmployees.has(emp.originalName!) ? 'font-bold' : ''}`}>{emp.name}</span>
                                        <Switch checked={highlightedEmployees.has(emp.originalName!)} onChange={() => {}} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-950 rounded-xl p-1 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <button onClick={() => setViewMode('group')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'group' ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-md ring-1 ring-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}><ViewGridIcon className="h-4 w-4"/><span>BỘ PHẬN</span></button>
                        <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-md ring-1 ring-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}><ViewListIcon className="h-4 w-4"/><span>DANH SÁCH</span></button>
                    </div>

                    <button 
                        onClick={() => setIsPrevMonthModalOpen(true)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase rounded-lg border transition-all ${prevMonthRaw ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                        <ClockIcon className="h-4 w-4" />
                        <span>Cùng kỳ</span>
                        {prevMonthRaw && (
                            <button onClick={(e) => { e.stopPropagation(); setPrevMonthRaw(''); }} className="ml-1 p-0.5 hover:bg-emerald-200 rounded">
                                <XIcon className="h-3 w-3" />
                            </button>
                        )}
                    </button>
                    
                    <button onClick={handleExportDataFile} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors shadow-sm" title="Lưu file so sánh JSON"><DownloadIcon className="h-5 w-5" /></button>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleBatchExportByDept} disabled={isExportingByDept} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50">{isExportingByDept ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4" />}<span>{isExportingByDept ? `Đang xuất ${exportDeptProgress.current}/${exportDeptProgress.total}...` : 'Xuất theo BP'}</span></button>
                    <ExportButton onExportPNG={() => handleExportPNG()} />
                </div>
            </div>
            <div ref={cardRef}>
                <Card noPadding title={cardTitle} rounded={false}>
                    <div className="w-full overflow-x-auto border-t border-slate-100 dark:border-slate-800 shadow-sm">
                        {isMobile ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {displayList.map((row, idx) => {
                                    if (row.type === 'department' || row.type === 'total') {
                                        const isGrandTotal = row.type === 'total';
                                        const oldRow = row.oldRow;
                                        return (
                                            <div key={`${row.type}-${idx}`} className={`${isGrandTotal ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100'} px-4 py-3 flex justify-between items-center font-black uppercase tracking-wider text-xs`}>
                                                <span>{row.name}</span>
                                                <div className="flex flex-col items-end">
                                                    <span>{f.format(row.pctBillBk)}% BILL BK</span>
                                                    <DeltaBadge current={row.pctBillBk} previous={oldRow?.pctBillBk} />
                                                </div>
                                            </div>
                                        );
                                    }
                                    const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                    const oldRow = row.oldRow;
                                    return (
                                        <div key={row.originalName || idx} className={`p-4 flex flex-col gap-3 ${isHighlighted ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <MedalBadge rank={row.rank} />
                                                    <AvatarUploader employeeName={row.originalName!} supermarketName={supermarketName} />
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-primary-600 dark:text-primary-400">{row.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{row.department}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${row.pctBillBk >= 20 ? 'bg-emerald-50 text-emerald-600' : (row.pctBillBk < 10 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')}`}>
                                                        {f.format(row.pctBillBk)}% BILL BK
                                                    </span>
                                                    <DeltaBadge current={row.pctBillBk} previous={oldRow?.pctBillBk} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">DT THỰC</p>
                                                    <p className="text-xs font-black tabular-nums">{f.format(row.dtlk)}</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">BILL BK/TỔNG</p>
                                                    <p className="text-xs font-black tabular-nums">{f.format(row.billBk)}/{f.format(row.totalBill)}</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">%SP BK</p>
                                                    <p className={`text-xs font-black tabular-nums ${row.pctSpBk >= 25 ? 'text-emerald-600' : (row.pctSpBk < 15 ? 'text-rose-600' : 'text-amber-600')}`}>
                                                        {f.format(row.pctSpBk)}%
                                                    </p>
                                                    <DeltaBadge current={row.pctSpBk} previous={oldRow?.pctSpBk} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <table className="min-w-full text-[13px] border-collapse">
                                <thead>
                                    <tr className="bg-sky-600 text-white font-bold uppercase">
                                        <th className="px-4 py-4 text-center border-r border-white/20 cursor-pointer" onClick={() => handleSort('name')}>Nhân viên</th>
                                        <th className="px-3 py-4 text-center border-r border-white/20 cursor-pointer bg-sky-700/40" onClick={() => handleSort('dtlk')}>DT THỰC</th>
                                        <th className="px-3 py-4 text-center border-r border-white/20 cursor-pointer bg-sky-700/40" onClick={() => handleSort('totalBill')}>TỔNG BILL</th>
                                        <th className="px-3 py-4 text-center border-r border-white/20 cursor-pointer bg-sky-700/40" onClick={() => handleSort('billBk')}>BILL BK</th>
                                        <th className="px-3 py-4 text-center border-r border-white/20 cursor-pointer bg-sky-700/60" onClick={() => handleSort('pctBillBk')}>%BILL BK</th>
                                        <th className="px-3 py-4 text-center border-r border-white/20 cursor-pointer bg-sky-700/40" onClick={() => handleSort('totalSl')}>TỔNG SL</th>
                                        <th className="px-3 py-4 text-center border-r border-white/20 cursor-pointer bg-sky-700/40" onClick={() => handleSort('slBk')}>SL BK</th>
                                        <th className="px-3 py-4 text-center bg-sky-700/60 cursor-pointer" onClick={() => handleSort('pctSpBk')}>%SP BK</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                    {displayList.map((row, idx) => {
                                        if (row.type === 'department' || row.type === 'total') {
                                            const isGrandTotal = row.type === 'total';
                                            const oldRow = row.oldRow;
                                            return (
                                                <tr key={`${row.type}-${idx}`} className={`${isGrandTotal ? 'bg-sky-50 dark:bg-sky-900/50 text-slate-900 dark:text-sky-100 shadow-inner font-black' : 'bg-slate-100 dark:bg-slate-900/90 font-black text-slate-800 dark:text-slate-100'} border-y border-slate-200 dark:border-slate-700`}>
                                                    <td className={`px-4 py-3 uppercase tracking-widest border-r ${isGrandTotal ? 'border-sky-200 dark:border-sky-800 text-center' : 'border-slate-200 dark:border-slate-700'}`}>{row.name}</td>
                                                    <td className={`px-3 py-2 text-center border-r tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-sky-800' : 'border-slate-200 dark:border-slate-700'}`}>{f.format(row.dtlk)}</td>
                                                    <td className={`px-3 py-2 text-center border-r tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-sky-800' : 'border-slate-200 dark:border-slate-700'}`}>{f.format(row.totalBill)}</td>
                                                    <td className={`px-3 py-2 text-center border-r tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-sky-800' : 'border-slate-200 dark:border-slate-700'}`}>{f.format(row.billBk)}</td>
                                                    <td className={`px-3 py-2 text-center border-r tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-sky-800 text-green-600 dark:text-green-400' : 'border-slate-200 dark:border-slate-700 text-green-600 dark:text-green-400'}`}>
                                                        <div>{f.format(row.pctBillBk)}%</div>
                                                        <DeltaBadge current={row.pctBillBk} previous={oldRow?.pctBillBk} />
                                                    </td>
                                                    <td className={`px-3 py-2 text-center border-r tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-sky-800' : 'border-slate-200 dark:border-slate-700'}`}>{f.format(row.totalSl)}</td>
                                                    <td className={`px-3 py-2 text-center border-r tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-slate-800' : 'border-slate-200 dark:border-slate-700'}`}>{f.format(row.slBk)}</td>
                                                    <td className={`px-3 py-2 text-center border-r tabular-nums ${isGrandTotal ? 'border-sky-200 dark:border-sky-800 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400'}`}>
                                                        <div>{f.format(row.pctSpBk)}%</div>
                                                        <DeltaBadge current={row.pctSpBk} previous={oldRow?.pctSpBk} />
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                        const oldRow = row.oldRow;
                                        return (
                                            <tr key={row.originalName || idx} className={`transition-all group ${isHighlighted ? 'bg-amber-100 dark:bg-amber-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}>
                                                <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 dark:border-slate-700">
                                                    <div className="flex items-center gap-3">
                                                        <MedalBadge rank={row.rank} />
                                                        <AvatarUploader employeeName={row.originalName!} supermarketName={supermarketName} />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-bold text-primary-600 dark:text-primary-400">{row.name}</span>
                                                            <span className="text-[8px] text-slate-400 font-bold tabular-nums uppercase">{row.department}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 tabular-nums text-slate-500">{f.format(row.dtlk)}</td>
                                                <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 tabular-nums text-slate-400">{f.format(row.totalBill)}</td>
                                                <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 tabular-nums text-slate-700">{f.format(row.billBk)}</td>
                                                <td className={`px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 tabular-nums font-bold ${row.pctBillBk >= 20 ? 'text-green-600' : (row.pctBillBk < 10 ? 'text-red-600' : 'text-amber-600')}`}>
                                                    <div>{f.format(row.pctBillBk)}%</div>
                                                    <DeltaBadge current={row.pctBillBk} previous={oldRow?.pctBillBk} />
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 tabular-nums text-slate-400">{f.format(row.totalSl)}</td>
                                                <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 tabular-nums text-slate-700">{f.format(row.slBk)}</td>
                                                <td className={`px-3 py-3 text-center tabular-nums font-bold ${row.pctSpBk >= 25 ? 'text-emerald-600' : (row.pctSpBk < 15 ? 'text-red-600' : 'text-amber-600')}`}>
                                                    <div>{f.format(row.pctSpBk)}%</div>
                                                    <DeltaBadge current={row.pctSpBk} previous={oldRow?.pctSpBk} />
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
            <ImportPrevMonthModal isOpen={isPrevMonthModalOpen} onClose={() => setIsPrevMonthModalOpen(false)} onSave={setPrevMonthRaw} />
        </div>
    );
};
export default CrossSellingTab;
