
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { XIcon, UsersIcon, UploadIcon, ClockIcon, ViewListIcon, ViewGridIcon } from '../Icons';
import { Employee, BonusMetrics } from '../../types/nhanVienTypes';
import { parseNumber, getYesterdayDateString } from '../../utils/nhanVienHelpers';
import { Switch } from '../dashboard/DashboardWidgets';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import * as db from '../../utils/db';

const AvatarDisplay: React.FC<{ employeeName: string; supermarketName: string; isHidden?: boolean; onClick?: () => void }> = ({ employeeName, supermarketName, isHidden, onClick }) => {
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
    if (isHidden) return <div className="w-8 h-8 flex-shrink-0" />;
    return (
        <div 
            className="relative group w-8 h-8 flex-shrink-0"
            onClick={(e) => e.stopPropagation()} 
        >
            {avatarSrc ? (
                <img 
                    src={avatarSrc} 
                    alt={employeeName} 
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                    className="w-full h-full rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-700 cursor-pointer hover:scale-110 transition-transform" 
                />
            ) : (
                <div 
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                    className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ring-2 ring-slate-200 dark:ring-slate-600 cursor-pointer hover:bg-slate-200"
                >
                    <UsersIcon className="h-4 w-4 text-slate-400" />
                </div>
            )}
            <button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} 
                className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity no-print border border-slate-100"
            >
                <UploadIcon className="h-2 w-2 text-primary-600" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
    );
};

const MedalBadge: React.FC<{ rank: number }> = ({ rank }) => {
    if (rank === 1) return <span className="flex items-center justify-center w-7 h-7 bg-yellow-400 text-white rounded-full shadow-sm text-sm" title="TOP 1">🥇</span>;
    if (rank === 2) return <span className="flex items-center justify-center w-7 h-7 bg-slate-300 text-white rounded-full shadow-sm text-sm" title="TOP 2">🥈</span>;
    if (rank === 3) return <span className="flex items-center justify-center w-7 h-7 bg-amber-600 text-white rounded-full shadow-sm text-sm" title="TOP 3">🥉</span>;
    return <span className="text-slate-400 font-bold w-7 text-center text-xs tabular-nums">#{rank}</span>;
};



export const BonusDataModal: React.FC<{ 
    employee: Employee; 
    supermarketName: string;
    onClose: (reason: 'save' | 'skip' | 'stop') => void; 
    onSave: (name: string, metrics: BonusMetrics) => void; 
    remainingInBatch?: number;
}> = ({ employee, supermarketName, onClose, onSave, remainingInBatch }) => {
    const [pastedData, setPastedData] = useState('');
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setPastedData('');
        setError(null);
        textareaRef.current?.focus();

        const employeeId = employee.originalName.split(' - ')[1]?.trim();
        if (employeeId) {
            navigator.clipboard.writeText(employeeId).catch(err => console.error('Lỗi copy:', err));
        }
    }, [employee.originalName]);

    const processAndSave = async (data: string) => {
        const lines = data.split('\n').filter(l => l.trim());
        const totalLine = lines.find(l => l.startsWith('Tổng cộng'));
        if (!totalLine) { setError('Không tìm thấy dòng Tổng cộng. Hãy đảm bảo bạn copy đủ bảng từ HRM.'); return false; }
        const parts = totalLine.split('\t');
        const erp = parseNumber(parts[2]) - parseNumber(parts[3]), tNong = parseNumber(parts[4]), tong = parseNumber(parts[8]);
        const dateRows = lines.filter(l => /^\d{2}\/\d{2}\/\d{4}/.test(l));
        if (dateRows.length === 0) { setError('Không xác định được số ngày dữ liệu.'); return false; }
        const dParts = dateRows[dateRows.length - 1].split('\t')[0].split('/');
        const daysInMonth = new Date(Number(dParts[2]), Number(dParts[1]), 0).getDate();
        
        const metrics: BonusMetrics = { 
            erp, tNong, tong, 
            dKien: (tong / dateRows.length) * daysInMonth, 
            pNong: tong > 0 ? (tNong / tong) * 100 : 0, 
            updatedAt: new Date().toLocaleString('vi-VN') 
        };

        const historyKey = `bonus-history-${supermarketName}-${employee.originalName}`;
        const currentHistory = await db.get(historyKey) || [];
        await db.set(historyKey, [...currentHistory, metrics].slice(-30));

        onSave(employee.originalName, metrics);
        return true;
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => onClose('stop')}>
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 w-full max-w-2xl border border-white/10 relative overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                Cập nhật thưởng: <span className="text-rose-600 dark:text-rose-400 drop-shadow-md">{employee.name}</span>
                            </h3>
                            {remainingInBatch && remainingInBatch > 0 ? (
                                <span className="px-3 py-1 bg-rose-600 text-white text-[10px] font-black rounded-full animate-pulse shadow-lg shadow-rose-500/30 uppercase">Batch Mode</span>
                            ) : null}
                        </div>
                        <div className="text-sm text-slate-500 font-medium flex flex-col gap-1">
                            <span>Dán dữ liệu HRM &gt; Quản lý điểm thưởng &gt; Điểm thưởng nhân viên.</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => onClose('skip')} 
                        className="p-2.5 hover:bg-rose-50 dark:hover:rose-900/20 text-slate-400 hover:text-rose-600 rounded-full transition-all group"
                        title="Bỏ qua nhân viên này"
                    >
                        <XIcon className="h-7 w-7 transition-transform group-hover:rotate-90" />
                    </button>
                </div>

                <div className="relative z-10">
                    <textarea 
                        ref={textareaRef} 
                        value={pastedData} 
                        onChange={e => setPastedData(e.target.value)} 
                        onPaste={async (e) => { 
                            const text = e.clipboardData.getData('text'); 
                            if (await processAndSave(text)) onClose('save'); 
                        }} 
                        placeholder="Click vào đây rồi nhấn Ctrl + V để dán bảng dữ liệu HRM..." 
                        className="w-full h-64 p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/30 dark:bg-slate-950/50 font-mono text-xs focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 outline-none transition-all resize-none shadow-inner" 
                    />
                    {error && <p className="mt-2 text-xs font-bold text-red-500 uppercase tracking-tighter">{error}</p>}
                </div>

                <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10">
                    {remainingInBatch && remainingInBatch > 0 ? (
                        <div className="flex flex-col items-center sm:items-start">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Duyệt danh sách</span>
                            <div className="flex items-baseline gap-2">
                                 <span className="text-4xl font-black text-rose-600 tabular-nums leading-none drop-shadow-sm">{remainingInBatch}</span>
                                 <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter italic">Nhân viên chưa duyệt</span>
                            </div>
                        </div>
                    ) : <div></div>}
                    <div className="flex gap-4 w-full sm:w-auto">
                        <button 
                            onClick={() => onClose('stop')} 
                            className="flex-1 sm:flex-none px-10 py-4 text-sm font-black text-slate-600 dark:text-slate-400 border-2 border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-wider active:scale-95"
                        >
                            Dừng lại
                        </button>
                        <button 
                            onClick={async () => (await processAndSave(pastedData)) && onClose('save')} 
                            className="flex-1 sm:flex-none px-12 py-4 text-sm font-black bg-primary-600 text-white rounded-2xl shadow-xl shadow-primary-500/30 hover:bg-primary-700 hover:shadow-primary-500/40 active:scale-95 transition-all uppercase tracking-wider"
                        >
                            Lưu & Tiếp tục
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const BonusView: React.FC<{ 
    employees: Employee[]; 
    bonusData: Record<string, BonusMetrics | null>; 
    revenueRows: any; 
    supermarketName: string; 
    onEmployeeClick: (emp: Employee) => void; 
    onBatchUpdate: () => void;
    highlightedEmployees: Set<string>; 
    activeDepartments: string[];
}> = ({ 
    employees, bonusData, revenueRows, supermarketName, onEmployeeClick, onBatchUpdate,
    highlightedEmployees, activeDepartments
}) => {
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
    const cardRef = useRef<HTMLDivElement>(null);
    const [sortField, setSortField] = useState<string>('dKien');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [showAll, setShowAll] = useState(true);
    const [viewMode, setViewMode] = useIndexedDBState<'group' | 'list'>('bonus-view-mode-multi', 'group');
    
    const revenueMap = useMemo(() => {
        const m = new Map(); revenueRows.forEach((r: any) => r.type === 'employee' && m.set(r.originalName, r)); return m;
    }, [revenueRows]);

    const displayList = useMemo(() => {
        const isFiltering = !activeDepartments.includes('all');
        const allUniqueDepts = Array.from(new Set(employees.map(e => e.department))).sort();
        const depts = isFiltering ? activeDepartments : allUniqueDepts;
        
        if (viewMode === 'list') {
            const list = employees.filter(e => isFiltering ? activeDepartments.includes(e.department) : true);
            list.sort((a, b) => {
                const bA = bonusData[a.originalName], bB = bonusData[b.originalName], rA = revenueMap.get(a.originalName), rB = revenueMap.get(b.originalName);
                let vA = 0, vB = 0;
                if (sortField === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                if (sortField === 'dtqd') { vA = rA?.dtqd || 0; vB = rB?.dtqd || 0; }
                else if (sortField === 'hqqd') { vA = rA?.hieuQuaQD || 0; vB = rB?.hieuQuaQD || 0; }
                else { vA = (bA as any)?.[sortField] || 0; vB = (bB as any)?.[sortField] || 0; }
                return sortDir === 'asc' ? vA - vB : vB - vA;
            });
            const result: any[] = list.map((e, idx) => ({ ...e, rank: idx + 1 }));
            if (result.length > 0) {
                const sumDtqd = result.reduce((s, e) => s + (revenueMap.get(e.originalName)?.dtqd || 0), 0);
                const sumErp = result.reduce((s, e) => s + (bonusData[e.originalName]?.erp || 0), 0);
                const sumTnong = result.reduce((s, e) => s + (bonusData[e.originalName]?.tNong || 0), 0);
                const sumTong = result.reduce((s, e) => s + (bonusData[e.originalName]?.tong || 0), 0);
                const sumDkien = result.reduce((s, e) => s + (bonusData[e.originalName]?.dKien || 0), 0);
                result.push({
                    type: 'total',
                    name: 'TỔNG CỘNG',
                    sumDtqd, sumErp, sumTnong, sumTong, sumDkien
                });
            }
            return result;
        }

        let deptGroups = depts.map(d => {
            let emps = employees.filter(e => e.department === d);
            emps.sort((a, b) => {
                const bA = bonusData[a.originalName], bB = bonusData[b.originalName], rA = revenueMap.get(a.originalName), rB = revenueMap.get(b.originalName);
                let vA = 0, vB = 0;
                if (sortField === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                if (sortField === 'dtqd') { vA = rA?.dtqd || 0; vB = rB?.dtqd || 0; }
                else if (sortField === 'hqqd') { vA = rA?.hieuQuaQD || 0; vB = rB?.hieuQuaQD || 0; }
                else { vA = (bA as any)?.[sortField] || 0; vB = (bB as any)?.[sortField] || 0; }
                return sortDir === 'asc' ? vA - vB : vB - vA;
            });

            const sumDtqd = emps.reduce((s, e) => s + (revenueMap.get(e.originalName)?.dtqd || 0), 0);
            const sumErp = emps.reduce((s, e) => s + (bonusData[e.originalName]?.erp || 0), 0);
            const sumTnong = emps.reduce((s, e) => s + (bonusData[e.originalName]?.tNong || 0), 0);
            const sumTong = emps.reduce((s, e) => s + (bonusData[e.originalName]?.tong || 0), 0);
            const sumDkien = emps.reduce((s, e) => s + (bonusData[e.originalName]?.dKien || 0), 0);
            
            return { name: d, employees: emps, sumDtqd, sumErp, sumTnong, sumTong, sumDkien, sortValue: sortField === 'dKien' ? sumDkien : (sortField === 'tong' ? sumTong : sumDkien) };
        });

        deptGroups.sort((a, b) => {
            if (sortField === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            return sortDir === 'asc' ? a.sortValue - b.sortValue : b.sortValue - a.sortValue;
        });

        let out: any[] = [];
        let grandSumDtqd = 0, grandSumErp = 0, grandSumTnong = 0, grandSumTong = 0, grandSumDkien = 0;

        deptGroups.forEach(group => {
            if (group.employees.length > 0) { 
                out.push({ type: 'department', name: group.name, sumDtqd: group.sumDtqd, sumErp: group.sumErp, sumTnong: group.sumTnong, sumTong: group.sumTong, sumDkien: group.sumDkien }); 
                out.push(...group.employees.map((e, idx) => ({ ...e, rank: idx + 1 }))); 
                
                grandSumDtqd += group.sumDtqd;
                grandSumErp += group.sumErp;
                grandSumTnong += group.sumTnong;
                grandSumTong += group.sumTong;
                grandSumDkien += group.sumDkien;
            }
        });

        if (out.length > 0) {
            out.push({ type: 'total', name: 'TỔNG CỘNG', sumDtqd: grandSumDtqd, sumErp: grandSumErp, sumTnong: grandSumTnong, sumTong: grandSumTong, sumDkien: grandSumDkien });
        }
        return out;
    }, [employees, activeDepartments, bonusData, revenueMap, sortField, sortDir, viewMode]);

    const isUpdatedToday = (updatedAt?: string) => {
        if (!updatedAt) return false;
        const today = new Date().toLocaleDateString('vi-VN');
        return updatedAt.includes(today);
    };

    const getCellColor = (val: number, type: 'dtqd' | 'hqqd' | 'erp' | 'tnong' | 'tong' | 'pnong') => {
        if (val === 0 || isNaN(val)) return 'text-slate-700 dark:text-slate-300';
        switch (type) {
            case 'dtqd': return val >= 50 ? 'text-green-600' : (val <= 20 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300');
            case 'hqqd': return val > 50 ? 'text-green-600' : (val < 40 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300');
            case 'pnong': return val > 60 ? 'text-green-600' : (val < 40 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300');
            case 'tong': return val >= 2000000 ? 'text-green-600' : (val <= 500000 ? 'text-red-600' : 'text-slate-900 dark:text-white');
        }
        return 'text-slate-700 dark:text-slate-300';
    };

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async () => {
        if (!cardRef.current || !(window as any).html2canvas) return;
        const original = cardRef.current;
        const clone = original.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute'; clone.style.left = '-9999px'; clone.style.width = 'max-content';
        clone.style.padding = '4px';
        clone.style.border = `1px solid ${document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'}`;
        clone.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff';
        if (document.documentElement.classList.contains('dark')) clone.classList.add('dark');
        clone.querySelectorAll('.no-print, .export-button-component').forEach(el => (el as HTMLElement).style.display = 'none');
        
        document.body.appendChild(clone);
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            const canvas = await (window as any).html2canvas(clone, { scale: 3, useCORS: true, backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff' });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) showExportOptions(blob, `Bonus_Report_${supermarketName}.png`);
        } finally { document.body.removeChild(clone); }
    };

    const cardTitle = (
        <div className="flex flex-col items-start leading-none py-1">
            <span className="js-report-title text-2xl font-black uppercase text-slate-800 dark:text-white mt-1">HIỆU SUẤT LÀM VIỆC ĐẾN NGÀY {getYesterdayDateString()}</span>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mt-1 font-bold">Quản lý tốt thưởng là quản lý tốt động lực của nhân viên.</span>
        </div>
    );

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-md no-print border border-slate-200 dark:border-slate-700 gap-4">
                <div className="flex gap-4 items-center">
                    <div className="flex gap-2 items-center">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tất cả</span>
                        <Switch checked={showAll} onChange={() => setShowAll(!showAll)} />
                    </div>
                    
                    <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 shadow-inner">
                        <button onClick={() => setViewMode('group')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'group' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><ViewGridIcon className="h-4 w-4"/><span>BỘ PHẬN</span></button>
                        <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><ViewListIcon className="h-4 w-4"/><span>DANH SÁCH</span></button>
                    </div>

                    <button 
                        onClick={onBatchUpdate}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-lg border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-all active:scale-95 shadow-sm"
                    >
                        <UploadIcon className="h-4 w-4" />
                        <span>Cập nhật hàng loạt</span>
                    </button>
                </div>
                <div className="flex gap-2 items-center">
                    <ExportButton onExportPNG={handleExportPNG} />
                </div>
            </div>
            <div ref={cardRef}>
                <Card noPadding title={cardTitle}>
                    <div className="w-full overflow-hidden">
                        <div className="overflow-x-auto scrollbar-hide -webkit-overflow-scrolling-touch lg:border-x lg:border-b lg:border-slate-200 dark:lg:border-slate-700 lg:rounded-xl lg:m-4 shadow-sm border-t border-slate-200 dark:border-slate-700/60">
                        {isMobile ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {displayList.map((item, idx) => {
                                    if (item.type === 'department' || item.type === 'total') {
                                        const isGrandTotal = item.type === 'total';
                                        return (
                                            <div key={`${item.type}-${idx}`} className={`px-4 py-3 ${isGrandTotal ? 'bg-slate-100 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-600' : 'bg-slate-50 dark:bg-slate-900/40'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={`text-xs font-black uppercase tracking-wider ${isGrandTotal ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{item.name}</span>
                                                    <div className="text-right">
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Dự Kiến</span>
                                                        <span className={`text-sm font-black tabular-nums leading-none ${isGrandTotal ? 'text-indigo-700 dark:text-indigo-400' : 'text-indigo-600 dark:text-indigo-500'}`}>{f.format(Math.ceil(item.sumDkien / 1000))}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-1.5 mt-2">
                                                    <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">DTQĐ</p>
                                                        <p className="text-[11px] font-black tabular-nums">{f.format(item.sumDtqd)}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">ERP</p>
                                                        <p className="text-[11px] font-black tabular-nums">{f.format(Math.ceil(item.sumErp / 1000))}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">T.Nóng</p>
                                                        <p className="text-[11px] font-black tabular-nums">{f.format(Math.ceil(item.sumTnong / 1000))}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Tổng</p>
                                                        <p className="text-[11px] font-black tabular-nums">{f.format(Math.ceil(item.sumTong / 1000))}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    
                                    const isHighlighted = highlightedEmployees.has(item.originalName);
                                    const bonus = bonusData[item.originalName], rev = revenueMap.get(item.originalName);
                                    const dtqdVal = rev?.dtqd || 0, hqqdVal = rev ? (rev.hieuQuaQD * 100) : 0, erpVal = bonus?.erp || 0, tnongVal = bonus?.tNong || 0, pnongVal = bonus?.pNong || 0, tongVal = bonus?.tong || 0, dkienVal = bonus?.dKien || 0;
                                    const isStale = !isUpdatedToday(bonus?.updatedAt);

                                    return (
                                        <div key={item.originalName} onClick={() => onEmployeeClick(item)} className={`px-4 py-3 cursor-pointer transition-colors ${isHighlighted ? 'bg-indigo-50/60 dark:bg-indigo-900/10 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800/50' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <MedalBadge rank={item.rank} />
                                                    <AvatarDisplay employeeName={item.originalName} supermarketName={supermarketName} onClick={() => onEmployeeClick(item)} />
                                                    <span className={`font-black uppercase tracking-tight truncate text-xs ${isHighlighted ? 'text-indigo-700 dark:text-indigo-400' : (isStale ? 'text-slate-400 dark:text-slate-500' : 'text-indigo-600 dark:text-indigo-400')}`}>
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 pl-2">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Dự Kiến</span>
                                                    <div className="flex items-baseline gap-0.5">
                                                        <span className={`text-lg font-black tabular-nums leading-none tracking-tight ${isHighlighted ? 'text-indigo-700 dark:text-indigo-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                            {bonus ? f.format(Math.ceil(dkienVal / 1000)) : '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-5 gap-1.5 mt-2">
                                                <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-0.5">DTQĐ</p>
                                                    <p className={`text-[11px] font-black tabular-nums leading-none ${getCellColor(dtqdVal, 'dtqd')}`}>{rev ? f.format(dtqdVal) : '-'}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-0.5">HQQĐ</p>
                                                    <p className={`text-[11px] font-black tabular-nums leading-none ${getCellColor(hqqdVal, 'hqqd')}`}>{rev ? hqqdVal.toFixed(0) + '%' : '-'}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-0.5">ERP</p>
                                                    <p className={`text-[11px] font-black tabular-nums leading-none ${getCellColor(erpVal, 'erp')}`}>{bonus ? f.format(Math.ceil(erpVal / 1000)) : '-'}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-0.5">T.Nóng</p>
                                                    <p className={`text-[11px] font-black tabular-nums leading-none ${getCellColor(tnongVal, 'tnong')}`}>{bonus ? f.format(Math.ceil(tnongVal / 1000)) : '-'}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-0.5">Tổng</p>
                                                    <p className={`text-[11px] font-black tabular-nums leading-none ${getCellColor(tongVal, 'tong')}`}>{bonus ? f.format(Math.ceil(tongVal / 1000)) : '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                        <table className="w-full border-collapse compact-export-table">
                            <thead className="bg-slate-50 dark:bg-slate-800/90 uppercase text-[10px] font-bold text-slate-500 tracking-wider">
                                <tr>
                                    <th className="px-3 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 border-b-2 border-b-slate-300 dark:border-b-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 font-black z-10 sticky left-0 min-w-[200px]" onClick={() => { setSortField('name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Nhân viên</th>
                                    <th className="px-3 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 border-b-2 border-b-slate-300 dark:border-b-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 font-black" onClick={() => { setSortField('dtqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>DTQĐ</th>
                                    <th className="px-3 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 border-b-2 border-b-slate-300 dark:border-b-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 font-black" onClick={() => { setSortField('hqqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>HQQĐ</th>
                                    <th className="px-3 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 border-b-2 border-b-slate-300 dark:border-b-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 font-black" onClick={() => { setSortField('erp'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>ERP</th>
                                    <th className="px-3 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 border-b-2 border-b-slate-300 dark:border-b-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 font-black" onClick={() => { setSortField('tNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>T.NÓNG</th>
                                    <th className="px-3 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 border-b-2 border-b-slate-300 dark:border-b-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 font-black" onClick={() => { setSortField('pNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>%T.NÓNG</th>
                                    <th className="px-3 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 border-b-2 border-b-slate-300 dark:border-b-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 font-black" onClick={() => { setSortField('tong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>TỔNG</th>
                                    <th className="px-3 py-2.5 text-center border-b-2 border-b-slate-300 dark:border-b-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 font-black text-indigo-700 dark:text-indigo-400" onClick={() => { setSortField('dKien'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>THƯỞNG DK</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[#1c1c1e] divide-y divide-slate-100 dark:divide-slate-700/60">
                                {displayList.map((item, idx) => {
                                    if (item.type === 'department' || item.type === 'total') {
                                        const isGrandTotal = item.type === 'total';
                                        return (
                                            <tr key={`${item.type}-${idx}`} className={`${isGrandTotal ? 'bg-slate-100 dark:bg-slate-800/70 text-slate-800 dark:text-white font-extrabold border-t-2 border-t-slate-300 dark:border-t-slate-600' : 'bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300'}`}>
                                                <td className={`px-3 py-2.5 text-[11px] uppercase tracking-wider border-r ${isGrandTotal ? 'border-slate-200 dark:border-slate-700/50 text-center sticky left-0 z-10 bg-inherit' : 'border-slate-200 dark:border-slate-700/50 sticky left-0 z-10 bg-inherit'}`}>{item.name}</td>
                                                <td className={`px-2 py-2.5 text-[11px] text-center border-r tabular-nums border-slate-100 dark:border-slate-700/50`}>{f.format(item.sumDtqd)}</td>
                                                <td className={`px-2 py-2.5 text-[11px] text-center border-r tabular-nums border-slate-100 dark:border-slate-700/50`}>-</td>
                                                <td className={`px-2 py-2.5 text-[11px] text-center border-r tabular-nums border-slate-100 dark:border-slate-700/50`}>{f.format(Math.ceil(item.sumErp / 1000))}</td>
                                                <td className={`px-2 py-2.5 text-[11px] text-center border-r tabular-nums border-slate-100 dark:border-slate-700/50`}>{f.format(Math.ceil(item.sumTnong / 1000))}</td>
                                                <td className={`px-2 py-2.5 text-[11px] text-center border-r tabular-nums border-slate-100 dark:border-slate-700/50`}>-</td>
                                                <td className={`px-2 py-2.5 text-[11px] text-center border-r tabular-nums font-black border-slate-100 dark:border-slate-700/50 text-slate-900 dark:text-white`}>{f.format(Math.ceil(item.sumTong / 1000))}</td>
                                                <td className={`px-2 py-2.5 text-[11px] text-center tabular-nums font-black ${isGrandTotal ? 'bg-indigo-50/50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-sm' : 'bg-indigo-50/30 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[12px]'}`}>{f.format(Math.ceil(item.sumDkien / 1000))}</td>
                                            </tr>
                                        );
                                    }
                                    
                                    const isHighlighted = highlightedEmployees.has(item.originalName);
                                    const bonus = bonusData[item.originalName], rev = revenueMap.get(item.originalName);
                                    const dtqdVal = rev?.dtqd || 0, hqqdVal = rev ? (rev.hieuQuaQD * 100) : 0, erpVal = bonus?.erp || 0, tnongVal = bonus?.tNong || 0, pnongVal = bonus?.pNong || 0, tongVal = bonus?.tong || 0, dkienVal = bonus?.dKien || 0;
                                    const isStale = !isUpdatedToday(bonus?.updatedAt);

                                    return (
                                        <tr key={item.originalName} className={`transition-colors duration-100 cursor-pointer ${isHighlighted ? 'bg-indigo-50/60 dark:bg-indigo-900/20 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800/50 text-[12px]' : 'bg-white dark:bg-[#1c1c1e] hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[12px]'}`} onClick={() => onEmployeeClick(item)}>
                                            <td className="px-3 py-2.5 border-r border-slate-100 dark:border-slate-700/50 flex items-center gap-2 min-w-[200px] sticky left-0 z-10 bg-inherit">
                                                <MedalBadge rank={item.rank} />
                                                <AvatarDisplay employeeName={item.originalName} supermarketName={supermarketName} onClick={() => onEmployeeClick(item)} />
                                                <span className={`font-bold whitespace-normal break-words tracking-tight ${isHighlighted ? 'text-indigo-700 dark:text-indigo-400' : (isStale ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200')}`}>
                                                    {item.name}
                                                </span>
                                            </td>
                                            <td className={`px-2 py-2.5 text-[11px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums ${isHighlighted ? 'font-black text-indigo-700 dark:text-indigo-400' : 'font-semibold ' + getCellColor(dtqdVal, 'dtqd')}`}>{rev ? f.format(dtqdVal) : '-'}</td>
                                            <td className={`px-2 py-2.5 text-[11px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums ${isHighlighted ? 'font-black text-indigo-700 dark:text-indigo-400' : 'font-semibold ' + getCellColor(hqqdVal, 'hqqd')}`}>{rev ? hqqdVal.toFixed(0) + '%' : '-'}</td>
                                            <td className={`px-2 py-2.5 text-[11px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums ${isHighlighted ? 'font-black text-indigo-700 dark:text-indigo-400' : 'font-semibold ' + getCellColor(erpVal, 'erp')}`}>
                                                {bonus ? f.format(Math.ceil(erpVal / 1000)) : '-'}
                                            </td>
                                            <td className={`px-2 py-2.5 text-[11px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums ${isHighlighted ? 'font-black text-indigo-700 dark:text-indigo-400' : 'font-semibold ' + getCellColor(tnongVal, 'tnong')}`}>
                                                {bonus ? f.format(Math.ceil(tnongVal / 1000)) : '-'}
                                            </td>
                                            <td className={`px-2 py-2.5 text-[11px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums ${isHighlighted ? 'font-black text-indigo-700 dark:text-indigo-400' : 'font-semibold ' + getCellColor(pnongVal, 'pnong')}`}>{bonus ? pnongVal.toFixed(0) + '%' : '-'}</td>
                                            <td className={`px-2 py-2.5 text-[11px] text-center border-r border-slate-100 dark:border-slate-700/50 tabular-nums ${isHighlighted ? 'font-black text-indigo-700 dark:text-indigo-400' : 'font-black ' + getCellColor(tongVal, 'tong')}`}>
                                                {bonus ? f.format(Math.ceil(tongVal / 1000)) : '-'}
                                            </td>
                                            <td className={`px-2 py-2.5 text-[12px] text-center ${isHighlighted ? 'bg-indigo-100/50 dark:bg-indigo-900/30' : 'bg-slate-50/50 dark:bg-slate-800/20'} tabular-nums font-black ${isHighlighted ? 'text-indigo-700 dark:text-indigo-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                {bonus ? f.format(Math.ceil(dkienVal / 1000)) : '-'}
                                            </td>
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
