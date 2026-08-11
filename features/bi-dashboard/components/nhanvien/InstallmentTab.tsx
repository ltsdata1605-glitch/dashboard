
import React, { useMemo, useRef, useState } from 'react';
import Card from '../Card';
import toast from 'react-hot-toast';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { InstallmentRow, InstallmentProvider } from '../../types/nhanVienTypes';
import { getYesterdayDateString, parseInstallmentData } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { ChevronDownIcon, ViewListIcon, ViewGridIcon, SpinnerIcon, ClockIcon, XIcon, CheckCircleIcon, DownloadAllIcon, DocumentReportIcon } from '../Icons';
import { Switch } from '../dashboard/DashboardWidgets';
import { Button } from '../../../../components/shared/ui/Button';
import { EmptyState } from '../../../../components/shared/ui/EmptyState';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../services/uiService';
import { MedalBadge, DeltaBadge } from '../shared/Badges';
import AvatarDisplay from './shared/AvatarDisplay';
import TimeProgressBar from './shared/TimeProgressBar';

// Dòng nhân viên/phòng ban/tổng đã gộp thêm rank (thứ hạng) và oldRow (dữ liệu tháng trước để so sánh)
type InstallmentDisplayRow = InstallmentRow & { rank?: number; oldRow?: InstallmentRow };

interface InstallmentDesktopRowProps {
    row: InstallmentDisplayRow;
    isTotal: boolean;
    isHighlighted: boolean;
    supermarketName: string;
    hidePercent: boolean;
    f: Intl.NumberFormat;
}

const InstallmentDesktopRow = React.memo<InstallmentDesktopRowProps>(({
    row, isTotal, isHighlighted, supermarketName, hidePercent, f
}) => {
    const oldRow = row.oldRow;
    return (
        <tr className={`transition-all cursor-pointer text-[13px] border-b border-slate-200 dark:border-slate-700 ${isTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 font-extrabold text-emerald-800 dark:text-emerald-200 border-t-2 border-emerald-200 dark:border-emerald-800' : (isHighlighted ? 'bg-sky-50/50 dark:bg-sky-900/10' : 'odd:bg-slate-50/60 hover:bg-slate-100 dark:odd:bg-slate-800/20 dark:hover:bg-slate-750')}`}>
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
                        <td className="px-1 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 font-semibold tabular-nums text-slate-700 dark:text-slate-300"><div>{p.dt > 0 ? f.format(Math.ceil(p.dt)) : '-'}</div></td>
                        {!hidePercent && <td className={`px-1 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 font-semibold tabular-nums ${p.percent >= 40 ? 'text-emerald-600' : 'text-slate-400'}`}><div>{p.percent > 0 ? `${p.percent.toFixed(2)}%` : '-'}</div><DeltaBadge current={p.percent} previous={oldP?.percent} /></td>}
                    </React.Fragment>
                )
            })}
            <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{f.format(Math.ceil(row.totalDtSieuThi))}</td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 font-bold tabular-nums ${row.totalPercent >= 45 ? 'text-emerald-600' : (row.totalPercent < 40 ? 'text-rose-500' : 'text-amber-600')}`}><div>{Math.round(row.totalPercent)}%</div><DeltaBadge current={row.totalPercent} previous={oldRow?.totalPercent} /></td>
        </tr>
    );
});

const InstallmentTab: React.FC<{
    rows: InstallmentRow[];
    supermarketName: string;
    activeDepartments: string[];
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
    isActive?: boolean;
}> = ({ rows, supermarketName, activeDepartments, highlightedEmployees, setHighlightedEmployees, isActive }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'totalPercent', direction: 'desc' });
    const [viewMode, setViewMode] = useIndexedDBState<'group' | 'list'>('installment-view-mode', 'group');
    const [hidePercent, setHidePercent] = useState(false);
    
    const [prevMonthRaw, setPrevMonthRaw] = useIndexedDBState<string>(`prev-month-installment-${supermarketName}`, '');
    const prevMonthRows = useMemo((): InstallmentRow[] => {
        try {
            if (isActive === false) return [];
            if (!prevMonthRaw) return [];
            if (prevMonthRaw.startsWith('[')) return JSON.parse(prevMonthRaw) as InstallmentRow[];
            const map: Record<string, string> = {};
            rows.forEach(r => { if(r.originalName) map[r.originalName] = r.department || ''; });
            return parseInstallmentData(prevMonthRaw, map);
        } catch { return []; }
    }, [prevMonthRaw, rows, isActive]);

    const [exportDeptFilter, setExportDeptFilter] = useState<string | null>(null);
    const [isExportingByDept, setIsExportingByDept] = useState(false);
    const [exportDeptProgress, setExportDeptProgress] = useState({ current: 0, total: 0 });
    
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

    const handleSort = (key: string) => { setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' })); };

    const displayList = useMemo(() => {
        if (isActive === false) return [];
        if (rows.length === 0) return [];
        const allDepts = Array.from(new Set(rows.filter(r => r.type === 'employee' && r.department).map(r => r.department as string))).sort();
        // activeDepartments đến từ effectiveActiveDepartments (NhanVien.tsx) — đã quy đổi 'all' thành
        // danh sách phòng ban cụ thể trước khi truyền xuống, nên .includes('all') không bao giờ đúng.
        // Phải so thêm với allDepts để biết người dùng có thật sự đang lọc hay không (ảnh hưởng dòng TỔNG CỘNG bên dưới).
        const isFiltering = !activeDepartments.includes('all') && !(allDepts.length > 0 && allDepts.every(d => activeDepartments.includes(d)));

        let deptsToProcess = exportDeptFilter ? [exportDeptFilter] : (isFiltering ? activeDepartments : allDepts);
        
        const calculateRowWithComparison = (row: InstallmentRow): InstallmentDisplayRow => {
            const oldRow = prevMonthRows.find((pr) => pr.originalName === row.originalName);
            return { ...row, oldRow };
        };

        const totalRow = rows.find(r => r.type === 'total');

        if (viewMode === 'list' && !exportDeptFilter) {
            const list = rows.filter(r => r.type === 'employee' && (isFiltering ? activeDepartments.includes(r.department!) : true))
                             .map(calculateRowWithComparison);
            list.sort((a, b) => {
                let valA: string | number = 0, valB: string | number = 0;
                if (sortConfig.key === 'name') { valA = a.originalName || a.name; valB = b.originalName || b.name; }
                else if (sortConfig.key === 'totalDtSieuThi') { valA = a.totalDtSieuThi; valB = b.totalDtSieuThi; }
                else if (sortConfig.key === 'totalPercent') { valA = a.totalPercent; valB = b.totalPercent; }
                const compare = typeof valA === 'string' ? valA.localeCompare(valB as string) : (valA - (valB as number));
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
                let valA: string | number = 0, valB: string | number = 0;
                if (sortConfig.key === 'name') { valA = a.originalName || a.name; valB = b.originalName || b.name; }
                else if (sortConfig.key === 'totalDtSieuThi') { valA = a.totalDtSieuThi; valB = b.totalDtSieuThi; }
                else if (sortConfig.key === 'totalPercent') { valA = a.totalPercent; valB = b.totalPercent; }
                const compare = typeof valA === 'string' ? valA.localeCompare(valB as string) : (valA - (valB as number));
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

        const finalOutput: InstallmentDisplayRow[] = [];
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
    }, [rows, activeDepartments, sortConfig, viewMode, exportDeptFilter, prevMonthRows, isActive]);

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const original = cardRef.current;
        try {
            const safeName = customFilename || `Installment_${supermarketName}.png`;
            const blob = await exportElementAsImage(original, safeName, {
                mode: 'blob-only', elementsToHide: ['.no-print', '.export-button-component'], isCompactTable: true
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

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                JSON.parse(content); 
                setPrevMonthRaw(content);
                toast.success('Đã nạp dữ liệu trả góp cùng kỳ thành công!');
            } catch (err) { toast.error('File không hợp lệ.'); }
            if (importFileRef.current) importFileRef.current.value = '';
        };
        reader.readAsText(file);
    };

    if (isActive === false) {
        return <div className="hidden" />;
    }

    if (rows.length === 0) return <Card bordered={false} title="Phân tích Trả góp" icon="credit-card"><EmptyState icon={<DocumentReportIcon className="h-6 w-6" />} title="Chưa có dữ liệu" /></Card>;
    
    const providers = rows.find(r => r.providers.length > 0)?.providers || [];

    const cardTitle = <span className="js-report-title">Trả góp nhân viên đến ngày {getYesterdayDateString()}</span>;
    const cardSubtitle = <span className="js-report-title">Khi lợi ích được đặt đúng chỗ, quyết định mua trở nên tự nhiên.</span>;


    return (
        <div className="space-y-0">
            <div className="flex flex-wrap justify-between items-center px-4 py-2.5 bg-white dark:bg-slate-800 no-print border-b border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex gap-2 items-center">
                    <input type="file" ref={importFileRef} onChange={handleFileImport} accept=".json" className="hidden" />
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => importFileRef.current?.click()}
                        className={`gap-1.5 ${prevMonthRaw ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'text-slate-500'}`}
                    >
                        <ClockIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Cùng kỳ</span>
                        {prevMonthRaw && (
                            <Button variant="ghost" size="none" onClick={(e) => { e.stopPropagation(); setPrevMonthRaw(''); }} className="ml-0.5 p-0.5 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800">
                                <XIcon className="h-3 w-3" />
                            </Button>
                        )}
                    </Button>
                </div>
                <div className="flex gap-1.5 items-center">
                    <Button variant="ghost" size="icon" onClick={() => setHidePercent(v => !v)} title={hidePercent ? 'Hiện cột %' : 'Ẩn cột %'} className={`text-[11px] font-black leading-none ${hidePercent ? 'text-rose-500' : 'text-slate-400'}`}><span className={hidePercent ? 'line-through' : ''}>%</span></Button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <Button variant="ghost" size="icon" onClick={() => setViewMode('group')} title="Bộ phận" className={viewMode === 'group' ? 'text-sky-600' : 'text-slate-400'}><ViewGridIcon className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => setViewMode('list')} title="Danh sách" className={viewMode === 'list' ? 'text-sky-600' : 'text-slate-400'}><ViewListIcon className="h-4 w-4"/></Button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <Button variant="ghost" size="icon" onClick={handleBatchExportByDept} disabled={isExportingByDept} title={isExportingByDept ? `Đang xuất ${exportDeptProgress.current}/${exportDeptProgress.total}` : 'Xuất ảnh theo bộ phận'} className="text-slate-400">{isExportingByDept ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <DownloadAllIcon className="h-4 w-4" />}</Button>
                    <ExportButton onExportPNG={async () => { await handleExportPNG(); }} />
                </div>
            </div>
            <div ref={cardRef}>
                <Card noPadding bordered={false} title={cardTitle} subtitle={cardSubtitle} rounded={false} icon="credit-card">
                    <div className="px-4 pt-3 pb-1">
                        <TimeProgressBar />
                    </div>
                    <div className="w-full overflow-hidden px-4 pb-4">
                        <div className="overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <table className="w-full border-collapse border border-slate-200 dark:border-slate-700">
                                <thead className="sticky top-0 z-10">
                                    {/* Tier 1: Group Headers */}
                                    <tr>
                                        <th rowSpan={hidePercent ? 1 : 2} onClick={() => handleSort('name')} className="px-3 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-b-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 min-w-[200px] align-middle">Nhân viên</th>
                                        {providers.map(p => <th key={p.name} rowSpan={hidePercent ? 1 : undefined} colSpan={hidePercent ? 1 : 2} className={`px-1 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-r border-slate-200 dark:border-slate-700 leading-tight align-middle ${hidePercent ? 'border-b-[3px] border-b-sky-400' : 'border-b'}`}>{p.shortName}</th>)}
                                        <th rowSpan={hidePercent ? 1 : 2} onClick={() => handleSort('totalDtSieuThi')} className="px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-emerald-400 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40 leading-tight align-middle"><div>D.THU</div><div>THỰC</div></th>
                                        <th rowSpan={hidePercent ? 1 : 2} onClick={() => handleSort('totalPercent')} className="px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border-b-[3px] border-b-amber-400 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 leading-tight align-middle">%T.Chậm</th>
                                    </tr>
                                    {/* Tier 2: Column Headers - only shown when % columns visible — nền trung tính, viền dưới màu theo nhóm (implementation_plan.md mục 61) */}
                                    {!hidePercent && <tr className="bg-slate-50 dark:bg-slate-800/80">
                                        {providers.map(p => <React.Fragment key={p.name}><th className="px-1 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-sky-400 cursor-pointer hover:bg-slate-100 transition-colors">DT</th><th className="px-1 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-sky-400 cursor-pointer hover:bg-slate-100 transition-colors">%</th></React.Fragment>)}
                                    </tr>}
                                </thead>
                                <tbody className="bg-white dark:bg-slate-900">
                                    {displayList.map((row, idx) => {
                                        if (row.type === 'department') {
                                            return (
                                                <tr key={`dept-${idx}`} className="bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300 border-t border-b border-slate-200 dark:border-slate-700">
                                                    <td className="px-2 py-1 text-[13px] uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 font-extrabold">{row.name}</td>
                                                    {row.providers.map((p, pIdx: number) => (
                                                        <React.Fragment key={pIdx}>
                                                            <td className="px-1 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold"><div>{p.dt > 0 ? f.format(Math.ceil(p.dt)) : '-'}</div></td>
                                                            {!hidePercent && <td className={`px-1 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold ${p.percent >= 40 ? 'text-emerald-600' : 'text-slate-500'}`}><div>{p.percent > 0 ? `${p.percent.toFixed(2)}%` : '-'}</div></td>}
                                                        </React.Fragment>
                                                    ))}
                                                    <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold">{f.format(Math.ceil(row.totalDtSieuThi))}</td>
                                                    <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-extrabold ${row.totalPercent >= 45 ? 'text-emerald-600' : 'text-amber-600'}`}>{Math.round(row.totalPercent)}%</td>
                                                </tr>
                                            );
                                        }
                                        const isTotal = row.type === 'total';
                                        const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                        return (
                                            <InstallmentDesktopRow
                                                key={row.originalName || idx}
                                                row={row}
                                                isTotal={isTotal}
                                                isHighlighted={isHighlighted}
                                                supermarketName={supermarketName}
                                                hidePercent={hidePercent}
                                                f={f}
                                            />
                                        );
                                    })}
                                </tbody>
                            </table>
                    </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
export default React.memo(InstallmentTab);
