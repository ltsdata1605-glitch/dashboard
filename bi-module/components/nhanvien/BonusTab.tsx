
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
import { exportElementAsImage } from '../../../services/uiService';
import { BonusMobileCard } from './bonus/BonusMobileCard';
import { BonusDesktopRow } from './bonus/BonusDesktopRow';

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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => onClose('stop')}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-slate-100 dark:border-slate-800 relative focus:outline-none flex flex-col gap-5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                <span className="text-slate-500">Cập nhật:</span>
                                <span className="text-indigo-600 dark:text-indigo-400">{employee.name}</span>
                            </h3>
                            {remainingInBatch && remainingInBatch > 0 ? (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold rounded-lg uppercase whitespace-nowrap">Batch Mode</span>
                            ) : null}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Dán dữ liệu HRM &gt; Quản lý điểm thưởng &gt; Điểm thưởng nhân viên</p>
                    </div>
                    <button 
                        onClick={() => onClose('skip')} 
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                        title="Bỏ qua nhân viên này"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 w-full">
                    <textarea 
                        ref={textareaRef} 
                        value={pastedData} 
                        onChange={e => setPastedData(e.target.value)} 
                        onPaste={async (e) => { 
                            const text = e.clipboardData.getData('text'); 
                            if (await processAndSave(text)) onClose('save'); 
                        }} 
                        placeholder="Click vào đây hoặc nhấn tự động dán (Ctrl + V)..." 
                        className="w-full h-48 py-3 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors resize-none placeholder-slate-400" 
                    />
                    {error && <p className="mt-2 text-xs font-semibold text-rose-500">{error}</p>}
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        {remainingInBatch && remainingInBatch > 0 ? (
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Chờ duyệt</span>
                                <div className="flex items-end gap-1.5">
                                     <span className="text-2xl font-black text-rose-600 tabular-nums leading-none">{remainingInBatch}</span>
                                     <span className="text-[10px] font-semibold text-slate-500">nhân viên</span>
                                </div>
                            </div>
                        ) : <div />}
                    </div>
                    
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                            onClick={() => onClose('stop')} 
                            className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Dừng lại
                        </button>
                        <button 
                            onClick={async () => (await processAndSave(pastedData)) && onClose('save')} 
                            className="flex-1 sm:flex-none px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 shadow-sm transition-colors"
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
            case 'dtqd': return val >= 50 ? 'text-emerald-600' : (val <= 20 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300');
            case 'hqqd': return val > 50 ? 'text-emerald-600' : (val < 40 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300');
            case 'pnong': return val > 60 ? 'text-emerald-600' : (val < 40 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300');
            case 'tong': return val >= 2000000 ? 'text-emerald-600' : (val <= 500000 ? 'text-rose-500' : 'text-slate-900 dark:text-white');
        }
        return 'text-slate-700 dark:text-slate-300';
    };

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async (customFilename?: string) => {
        if (!cardRef.current) return;
        const original = cardRef.current;
        
        try {
            const safeName = customFilename || `Bonus_Report_${supermarketName}.png`;
            const blob = await exportElementAsImage(original, safeName, {
                mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component']
            });
            if (blob) showExportOptions(blob, safeName);
        } catch (err) {
            console.error('Export error', err);
        }
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
                                        <BonusMobileCard
                                            key={item.originalName}
                                            item={item}
                                            isHighlighted={isHighlighted}
                                            isStale={isStale}
                                            dtqdVal={dtqdVal}
                                            hqqdVal={hqqdVal}
                                            erpVal={erpVal}
                                            tnongVal={tnongVal}
                                            pnongVal={pnongVal}
                                            tongVal={tongVal}
                                            dkienVal={dkienVal}
                                            onEmployeeClick={onEmployeeClick}
                                            getCellColor={getCellColor}
                                            f={f}
                                            avatarElement={<AvatarDisplay employeeName={item.originalName} supermarketName={supermarketName} onClick={() => onEmployeeClick(item)} />}
                                            medalElement={<MedalBadge rank={item.rank} />}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                        <table className="w-full border-collapse compact-export-table">
                            <thead className="sticky top-0 z-10">
                                {/* Tier 1: Group Headers */}
                                <tr>
                                    <th rowSpan={2} className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 min-w-[200px] align-middle" onClick={() => { setSortField('name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Nhân viên</th>
                                    <th colSpan={2} className="px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-r border-b border-sky-100 dark:border-sky-800/50">Doanh thu</th>
                                    <th colSpan={4} className="px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-b border-emerald-100 dark:border-emerald-800/50">Thưởng</th>
                                    <th rowSpan={2} className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-100 dark:border-amber-800/50 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 align-middle" onClick={() => { setSortField('dKien'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Thưởng DK</th>
                                </tr>
                                {/* Tier 2: Column Headers */}
                                <tr className="bg-slate-50 dark:bg-slate-800/80">
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 border-r border-b-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-sky-50 transition-colors" onClick={() => { setSortField('dtqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>DTQĐ</th>
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 border-r border-b-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-sky-50 transition-colors" onClick={() => { setSortField('hqqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>HQQĐ</th>
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 border-r border-b-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-emerald-50 transition-colors" onClick={() => { setSortField('erp'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>ERP</th>
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 border-r border-b-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-emerald-50 transition-colors" onClick={() => { setSortField('tNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>T.Nóng</th>
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 border-r border-b-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-emerald-50 transition-colors" onClick={() => { setSortField('pNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>%T.Nóng</th>
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 border-r border-b-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-emerald-50 transition-colors" onClick={() => { setSortField('tong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Tổng</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[#1c1c1e] divide-y divide-slate-100 dark:divide-slate-700/60">
                                {displayList.map((item, idx) => {
                                    if (item.type === 'department' || item.type === 'total') {
                                        const isGrandTotal = item.type === 'total';
                                        return (
                                            <tr key={`${item.type}-${idx}`} className={`${isGrandTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300'} border-y border-slate-200 dark:border-slate-700`}>
                                                <td className={`px-3 py-2 text-[11px] uppercase tracking-wider border-r ${isGrandTotal ? 'border-slate-200 dark:border-slate-700 text-center text-xs' : 'border-slate-200 dark:border-slate-700'}`}>{item.name}</td>
                                                <td className="px-2 py-2 text-[11px] text-center border-r tabular-nums border-slate-200 dark:border-slate-700">{f.format(item.sumDtqd)}</td>
                                                <td className="px-2 py-2 text-[11px] text-center border-r tabular-nums border-slate-200 dark:border-slate-700">-</td>
                                                <td className="px-2 py-2 text-[11px] text-center border-r tabular-nums border-slate-200 dark:border-slate-700">{f.format(Math.ceil(item.sumErp / 1000))}</td>
                                                <td className="px-2 py-2 text-[11px] text-center border-r tabular-nums border-slate-200 dark:border-slate-700">{f.format(Math.ceil(item.sumTnong / 1000))}</td>
                                                <td className="px-2 py-2 text-[11px] text-center border-r tabular-nums border-slate-200 dark:border-slate-700">-</td>
                                                <td className="px-2 py-2 text-[11px] text-center border-r tabular-nums font-extrabold border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">{f.format(Math.ceil(item.sumTong / 1000))}</td>
                                                <td className={`px-2 py-2 text-[11px] text-center tabular-nums font-extrabold ${isGrandTotal ? 'text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/30 text-sm' : 'text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-900/20'}`}>{f.format(Math.ceil(item.sumDkien / 1000))}</td>
                                            </tr>
                                        );
                                    }
                                    
                                    const isHighlighted = highlightedEmployees.has(item.originalName);
                                    const bonus = bonusData[item.originalName], rev = revenueMap.get(item.originalName);
                                    const dtqdVal = rev?.dtqd || 0, hqqdVal = rev ? (rev.hieuQuaQD * 100) : 0, erpVal = bonus?.erp || 0, tnongVal = bonus?.tNong || 0, pnongVal = bonus?.pNong || 0, tongVal = bonus?.tong || 0, dkienVal = bonus?.dKien || 0;
                                    const isStale = !isUpdatedToday(bonus?.updatedAt);

                                    return (
                                        <BonusDesktopRow
                                            key={item.originalName}
                                            item={item}
                                            isHighlighted={isHighlighted}
                                            isStale={isStale}
                                            dtqdVal={dtqdVal}
                                            hqqdVal={hqqdVal}
                                            erpVal={erpVal}
                                            tnongVal={tnongVal}
                                            pnongVal={pnongVal}
                                            tongVal={tongVal}
                                            dkienVal={dkienVal}
                                            onEmployeeClick={onEmployeeClick}
                                            getCellColor={getCellColor}
                                            f={f}
                                            avatarElement={<AvatarDisplay employeeName={item.originalName} supermarketName={supermarketName} onClick={() => onEmployeeClick(item)} />}
                                            medalElement={<MedalBadge rank={item.rank} />}
                                        />
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
