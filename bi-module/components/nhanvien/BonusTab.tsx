
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { XIcon, UsersIcon, UploadIcon, ClockIcon, ViewListIcon, ViewGridIcon } from '../Icons';
import { Employee, BonusMetrics } from '../../types/nhanVienTypes';
import { parseNumber, getYesterdayDateString } from '../../utils/nhanVienHelpers';

import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import * as db from '../../utils/db';
import { exportElementAsImage } from '../../../services/uiService';
import { BonusMobileCard } from './bonus/BonusMobileCard';
import { BonusDesktopRow } from './bonus/BonusDesktopRow';
import AvatarDisplay from './shared/AvatarDisplay';
import TimeProgressBar from './shared/TimeProgressBar';
import toast from 'react-hot-toast';

let hrmWindowRef: Window | null = null;

const MedalBadge: React.FC<{ rank: number }> = ({ rank }) => {
    const base = "w-7 text-center text-[13px] font-black tabular-nums";
    if (rank === 1) return <span className={`${base} text-amber-500`} title="TOP 1">#1</span>;
    if (rank === 2) return <span className={`${base} text-slate-400`} title="TOP 2">#2</span>;
    if (rank === 3) return <span className={`${base} text-amber-700`} title="TOP 3">#3</span>;
    return <span className={`${base} text-slate-400`}>#{rank}</span>;
};



export const BonusDataModal: React.FC<{ 
    employee: Employee; 
    nextEmployee?: Employee | null;
    supermarketName: string;
    onClose: (reason: 'save' | 'skip' | 'stop') => void; 
    onSave: (name: string, metrics: BonusMetrics) => void; 
    remainingInBatch?: number;
}> = ({ employee, nextEmployee, supermarketName, onClose, onSave, remainingInBatch }) => {
    const [pastedData, setPastedData] = useState('');
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setPastedData('');
        setError(null);
        textareaRef.current?.focus();

        const employeeId = employee.originalName.split(' - ')[1]?.trim();
        if (employeeId) {
            navigator.clipboard.writeText(employeeId)
                .then(() => toast.success(`Đã copy: ${employeeId}`, { duration: 1500, position: 'top-center' }))
                .catch(err => console.error('Lỗi copy:', err));
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
                </div>

                {/* Body Content */}
                <div className="flex-1 w-full">
                    <textarea 
                        ref={textareaRef} 
                        value={pastedData} 
                        onChange={e => setPastedData(e.target.value)} 
                        onPaste={async (e) => { 
                            e.preventDefault();
                            const text = e.clipboardData.getData('text'); 
                            if (await processAndSave(text)) {
                                toast.success(`Lưu thành công: ${employee.name}`, { duration: 1500 });
                                
                                if (nextEmployee) {
                                    const nextId = nextEmployee.originalName.split(' - ')[1]?.trim();
                                    if (nextId) {
                                        try {
                                            await navigator.clipboard.writeText(nextId);
                                            toast.success(`Đã copy: ${nextId}`, { duration: 1500, position: 'top-center' });
                                        } catch (err) {}
                                    }
                                }

                                onClose('save');
                                if (hrmWindowRef && !hrmWindowRef.closed) {
                                    hrmWindowRef.focus();
                                }
                            } else {
                                setPastedData(text);
                            }
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
                            className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
                        >
                            Kết thúc
                        </button>
                        <button 
                            onClick={() => onClose('skip')} 
                            className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Bỏ qua
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

export const BonusView: React.FC<{ 
    employees: Employee[]; 
    bonusData: Record<string, BonusMetrics | null>; 
    revenueRows: any; 
    supermarketName: string; 
    onEmployeeClick: (emp: Employee) => void; 
    onBatchUpdate: () => void;
    highlightedEmployees: Set<string>; 
    activeDepartments: string[];
}> = React.memo(({ 
    employees, bonusData, revenueRows, supermarketName, onEmployeeClick, onBatchUpdate,
    highlightedEmployees, activeDepartments
}) => {
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
    const cardRef = useRef<HTMLDivElement>(null);
    const [sortField, setSortField] = useState<string>('dKien');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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
        <div className="flex flex-col items-start leading-none py-1 w-full">
            <span className="js-report-title text-2xl font-black uppercase text-slate-800 dark:text-white mt-1">HIỆU SUẤT LÀM VIỆC ĐẾN NGÀY {getYesterdayDateString()}</span>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mt-1 font-bold">Quản lý tốt thưởng là quản lý tốt động lực của nhân viên.</span>
            <TimeProgressBar className="mt-2.5" />
        </div>
    );

    const isMobile = false; // Always show table view, even on mobile

    return (
        <div className="space-y-0">
            <div className="flex flex-wrap justify-between items-center px-4 py-2.5 bg-white dark:bg-slate-800 no-print border-b border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex gap-3 items-center">
                    <button 
                        onClick={() => { hrmWindowRef = window.open('https://newinsite.thegioididong.com/office/thuong-nhan-vien', '_blank'); onBatchUpdate(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-all active:scale-95"
                    >
                        <UploadIcon className="h-3.5 w-3.5" />
                        <span>Cập nhật thưởng</span>
                    </button>
                </div>
                <div className="flex gap-1.5 items-center">
                    <button onClick={() => setViewMode('group')} title="Bộ phận" className={`p-1 transition-all ${viewMode === 'group' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}><ViewGridIcon className="h-4 w-4"/></button>
                    <button onClick={() => setViewMode('list')} title="Danh sách" className={`p-1 transition-all ${viewMode === 'list' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}><ViewListIcon className="h-4 w-4"/></button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <ExportButton onExportPNG={handleExportPNG} />
                </div>
            </div>
            <div ref={cardRef}>
                <Card noPadding rounded={false} title={cardTitle}>
                    <div className="w-full overflow-hidden px-4 pb-4">
                        <div className="overflow-x-auto scrollbar-hide -webkit-overflow-scrolling-touch border border-slate-200 dark:border-slate-700">
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
                                            supermarketName={supermarketName}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                        <table className="w-full border-collapse compact-export-table">
                            <thead className="sticky top-0 z-10">
                                {/* Tier 1: Group Headers */}
                                <tr>
                                    <th rowSpan={2} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 align-middle" onClick={() => { setSortField('name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Nhân viên</th>
                                    <th colSpan={2} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-r border-b border-sky-100 dark:border-sky-800/50">Doanh thu</th>
                                    <th colSpan={4} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-b border-emerald-100 dark:border-emerald-800/50">Thưởng</th>
                                    <th rowSpan={2} className="px-2 py-1 text-center text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-100 dark:border-amber-800/50 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 align-middle leading-tight" onClick={() => { setSortField('dKien'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Dự<br/>Kiến</th>
                                </tr>
                                {/* Tier 2: Column Headers */}
                                <tr>
                                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-r border-b-2 border-sky-100 dark:border-sky-800/50 cursor-pointer hover:bg-sky-100 transition-colors" onClick={() => { setSortField('dtqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>DTQĐ</th>
                                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-r border-b-2 border-sky-100 dark:border-sky-800/50 cursor-pointer hover:bg-sky-100 transition-colors" onClick={() => { setSortField('hqqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>HQQĐ</th>
                                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-b-2 border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => { setSortField('erp'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>ERP</th>
                                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-b-2 border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => { setSortField('tNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>T.Nóng</th>
                                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-b-2 border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => { setSortField('pNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>%T.Nóng</th>
                                    <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-b-2 border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => { setSortField('tong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Tổng</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[#1c1c1e] divide-y divide-slate-100 dark:divide-slate-700/60">
                                {displayList.map((item, idx) => {
                                    if (item.type === 'department' || item.type === 'total') {
                                        const isGrandTotal = item.type === 'total';
                                        return (
                                            <tr key={`${item.type}-${idx}`} className={`${isGrandTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300'} border-t border-slate-200 dark:border-slate-700`}>
                                                <td className={`px-2 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} uppercase tracking-wider border-r ${isGrandTotal ? 'border-slate-200 dark:border-slate-700 text-center' : 'border-slate-200 dark:border-slate-700'}`}>{item.name}</td>
                                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700`}>{f.format(item.sumDtqd)}</td>
                                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700`}>-</td>
                                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700`}>{f.format(Math.ceil(item.sumErp / 1000))}</td>
                                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700`}>{f.format(Math.ceil(item.sumTnong / 1000))}</td>
                                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-bold border-slate-200 dark:border-slate-700`}>-</td>
                                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums font-extrabold border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white`}>{f.format(Math.ceil(item.sumTong / 1000))}</td>
                                                <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center tabular-nums font-extrabold ${isGrandTotal ? 'text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/30' : 'text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-900/20'}`}>{f.format(Math.ceil(item.sumDkien / 1000))}</td>
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
                                            supermarketName={supermarketName}
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
});
