
import React, { useMemo, useRef, useState, useEffect } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { CrossSellingRow } from '../../types/nhanVienTypes';
import { getYesterdayDateString, parseCrossSellingData } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { ClockIcon, XIcon, ViewGridIcon, ViewListIcon, SpinnerIcon, DownloadIcon, DownloadAllIcon } from '../Icons';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../../services/uiService';
import { MedalBadge, DeltaBadge } from '../shared/Badges';
import AvatarDisplay from './shared/AvatarDisplay';
import TimeProgressBar from './shared/TimeProgressBar';

const ImportPrevMonthModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [pastedData, setPastedData] = useState('');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md z-[200] flex items-center justify-center p-4">
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
    const dbKey = `avatar-${employeeName}`;
    const [avatarSrc, setAvatarSrc] = useIndexedDBState<string | null>(dbKey, null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 128;
                    const MAX_HEIGHT = 128;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
                    setAvatarSrc(compressedBase64);
                };
                img.src = reader.result as string;
            };
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
            rows.forEach(r => { if (r.originalName) map.set(r.originalName, r.department || ''); });
            return parseCrossSellingData(prevMonthRaw, map);
        } catch (e) {
            console.error("Error parsing cross selling prev data", e);
            return [];
        }
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
        const isFiltering = !activeDepartments.includes('all');
        const allDepts = Array.from(new Set(rows.filter(r => r.type === 'employee' && r.department).map(r => r.department as string))).sort();
        let deptsToProcess = exportDeptFilter ? [exportDeptFilter] : (isFiltering ? activeDepartments : allDepts);

        const attachPrevMonth = (row: any) => {
            const oldRow = prevMonthRows.find((pr: any) => pr.originalName === row.originalName);
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

                const oldTotal = prevMonthRows.find((pr: any) => pr.type === 'total');

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

            const oldDept = prevMonthRows.find((pr: any) => (pr.type === 'department' && pr.originalName === deptName) || (pr.type === 'department' && pr.name === deptName));

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
            const oldTotal = prevMonthRows.find((pr: any) => pr.type === 'total');
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

    const handleExportPNG = async (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const original = cardRef.current;
        try {
            const safeName = customFilename || `CrossSelling_${supermarketName}.png`;
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
            const action = await handleExportPNG(`BK_BP_${safeDeptName}_${supermarketName}.png`, autoAction);
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
        link.download = `BANKEM_${supermarketName.replace(/ /g, '_')}_${getYesterdayDateString().replace(/\//g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (rows.length === 0) return <Card title="Hiệu quả Bán kèm"><div className="py-20 text-center text-slate-500">Chưa có dữ liệu.</div></Card>;

    const cardTitle = (
        <div className="flex flex-col items-start leading-none py-1 w-full">
            <span className="js-report-title text-2xl font-black uppercase text-slate-800 dark:text-white mt-1">HIỆU QUẢ BÁN KÈM NHÂN VIÊN ĐẾN NGÀY {getYesterdayDateString()}</span>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mt-1 font-bold">Không chỉ là bán hàng, đó là sự quan tâm và mang lại giải pháp toàn diện cho khách hàng.</span>
            <TimeProgressBar className="mt-2.5" />
        </div>
    );

    const isMobile = window.innerWidth < 768;

    return (
        <div className="space-y-0">
            <div className="flex flex-wrap justify-between items-center px-4 py-2.5 bg-white dark:bg-slate-800 no-print border-b border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex gap-3 items-center">
                    <button
                        onClick={() => setIsPrevMonthModalOpen(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border transition-all ${prevMonthRaw ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                    >
                        <ClockIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Cùng kỳ</span>
                        {prevMonthRaw && (
                            <button onClick={(e) => { e.stopPropagation(); setPrevMonthRaw(''); }} className="ml-0.5 p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-800">
                                <XIcon className="h-3 w-3" />
                            </button>
                        )}
                    </button>
                </div>
                <div className="flex gap-1.5 items-center">
                    <button onClick={() => setViewMode('group')} title="Bộ phận" className={`p-1 transition-all ${viewMode === 'group' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}><ViewGridIcon className="h-4 w-4" /></button>
                    <button onClick={() => setViewMode('list')} title="Danh sách" className={`p-1 transition-all ${viewMode === 'list' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}><ViewListIcon className="h-4 w-4" /></button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <button onClick={handleBatchExportByDept} disabled={isExportingByDept} title={isExportingByDept ? `Đang xuất ${exportDeptProgress.current}/${exportDeptProgress.total}` : 'Xuất ảnh theo bộ phận'} className="p-1 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-50">{isExportingByDept ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <DownloadAllIcon className="h-4 w-4" />}</button>
                    <ExportButton onExportPNG={() => handleExportPNG()} />
                </div>
            </div>
            <div ref={cardRef}>
                <Card noPadding title={cardTitle} rounded={false}>
                    <div className="w-full overflow-hidden px-4 pb-4">
                        <div className="overflow-x-auto scrollbar-hide">
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

                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-primary-600 dark:text-primary-400">{row.name}</span>

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
                                <table className="min-w-full text-[13px] border-collapse border border-slate-200 dark:border-slate-700">
                                    <thead className="sticky top-0 z-10">
                                        {/* Tier 1: Group Headers */}
                                        <tr>
                                            <th rowSpan={2} className="px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750" onClick={() => handleSort('name')}>
                                                Nhân viên
                                            </th>
                                            <th rowSpan={2} className="px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-r border-b-2 border-sky-100 dark:border-sky-800/50 cursor-pointer hover:bg-sky-100 transition-colors" onClick={() => handleSort('dtlk')}>
                                                <div>D.THU</div><div>THỰC</div>
                                            </th>
                                            <th colSpan={3} className="px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border-r border-b border-amber-100 dark:border-amber-800/50">
                                                Sản phẩm bán kèm
                                            </th>
                                            <th colSpan={3} className="px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-b border-emerald-100 dark:border-emerald-800/50">
                                                Hiệu quả bill bán kèm
                                            </th>
                                        </tr>
                                        {/* Tier 2: Column Headers */}
                                        <tr>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 border-r border-b-2 border-amber-100 dark:border-amber-800/50 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => handleSort('totalSl')}>LKSP</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 border-r border-b-2 border-amber-100 dark:border-amber-800/50 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => handleSort('slBk')}>B.Kèm</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 border-r border-b-2 border-amber-100 dark:border-amber-800/50 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => handleSort('pctSpBk')}>%SPBK</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 border-r border-b-2 border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => handleSort('totalBill')}>Tổng</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 border-r border-b-2 border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => handleSort('billBk')}>B.Kèm</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 border-b-2 border-emerald-100 dark:border-emerald-800/50 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => handleSort('pctBillBk')}>%B.Kèm</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-[#1c1c1e]">
                                        {displayList.map((row, idx) => {
                                            if (row.type === 'department' || row.type === 'total') {
                                                const isGrandTotal = row.type === 'total';
                                                const oldRow = row.oldRow;
                                                return (
                                                    <tr key={`${row.type}-${idx}`} className={`${isGrandTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300'} border-t border-slate-200 dark:border-slate-700`}>
                                                        <td className={`px-2 ${isGrandTotal ? 'py-2.5 text-[15px]' : 'py-1 text-[13px]'} uppercase tracking-wider border-r ${isGrandTotal ? 'border-slate-200 dark:border-slate-700 text-center font-black' : 'border-slate-200 dark:border-slate-700 font-extrabold'}`}>{row.name}</td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-2.5 text-[15px]' : 'py-1 text-[13px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700`}>{f.format(Math.round(row.dtlk))}</td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-2.5 text-[15px]' : 'py-1 text-[13px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700`}>{f.format(row.totalSl)}</td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-2.5 text-[15px]' : 'py-1 text-[13px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700`}>{f.format(row.slBk)}</td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-2.5 text-[15px]' : 'py-1 text-[13px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700`}>
                                                            <div>{Math.round(row.pctSpBk)}%</div>
                                                            <DeltaBadge current={row.pctSpBk} previous={oldRow?.pctSpBk} />
                                                        </td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-2.5 text-[15px]' : 'py-1 text-[13px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700`}>{f.format(row.totalBill)}</td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-2.5 text-[15px]' : 'py-1 text-[13px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700`}>{f.format(row.billBk)}</td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-2.5 text-[15px]' : 'py-1 text-[13px]'} text-center tabular-nums border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-extrabold`}>
                                                            <div>{Math.round(row.pctBillBk)}%</div>
                                                            <DeltaBadge current={row.pctBillBk} previous={oldRow?.pctBillBk} />
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                            const oldRow = row.oldRow;
                                            return (
                                                <tr key={row.originalName || idx} className={`transition-all group cursor-pointer text-[13px] border-b border-slate-200 dark:border-slate-700 last:border-b-0 ${isHighlighted ? 'bg-sky-50/70 dark:bg-sky-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                                                    <td className="px-2 py-1 whitespace-nowrap border-r border-slate-200 dark:border-slate-700 min-w-[180px]">
                                                        <div className="flex items-center gap-2">
                                                            <MedalBadge rank={row.rank} />
                                                            <AvatarDisplay employeeName={row.originalName!} supermarketName={supermarketName} />
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-sky-600 dark:text-sky-400 text-[13px] whitespace-normal break-words">{row.name}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold text-slate-700 dark:text-slate-300">{f.format(Math.round(row.dtlk))}</td>
                                                    <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold text-slate-700 dark:text-slate-300">{f.format(row.totalSl)}</td>
                                                    <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold text-slate-700 dark:text-slate-300">{f.format(row.slBk)}</td>
                                                    <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold ${row.pctSpBk >= 25 ? 'text-emerald-600' : (row.pctSpBk < 15 ? 'text-rose-500' : 'text-amber-600')}`}>
                                                        <div>{Math.round(row.pctSpBk)}%</div>
                                                        <DeltaBadge current={row.pctSpBk} previous={oldRow?.pctSpBk} />
                                                    </td>
                                                    <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold text-slate-700 dark:text-slate-300">{f.format(row.totalBill)}</td>
                                                    <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold text-sky-700 dark:text-sky-400">{f.format(row.billBk)}</td>
                                                    <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold ${row.pctBillBk >= 20 ? 'text-emerald-600' : (row.pctBillBk < 10 ? 'text-rose-500' : 'text-amber-600')}`}>
                                                        <div>{Math.round(row.pctBillBk)}%</div>
                                                        <DeltaBadge current={row.pctBillBk} previous={oldRow?.pctBillBk} />
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
            <ImportPrevMonthModal isOpen={isPrevMonthModalOpen} onClose={() => setIsPrevMonthModalOpen(false)} onSave={setPrevMonthRaw} />
        </div>
    );
};
export default CrossSellingTab;
