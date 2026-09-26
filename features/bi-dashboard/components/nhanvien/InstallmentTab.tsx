
import React, { useMemo, useRef, useState, useEffect } from 'react';
import Card from '../Card';
import toast from 'react-hot-toast';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { InstallmentRow, InstallmentProvider } from '../../types/nhanVienTypes';
import { getYesterdayDateString, parseInstallmentData, computeColumnTiers, DataTier } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { ViewListIcon, ViewGridIcon, SpinnerIcon, ClockIcon, XIcon, DownloadAllIcon, DocumentReportIcon } from '../Icons';
import { Button } from '../../../../components/shared/ui/Button';
import { EmptyState } from '../../../../components/shared/ui/EmptyState';
import { onActivateKey } from '../../../../components/shared/ui';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../services/uiService';
import { MedalBadge, DeltaBadge } from '../shared/Badges';
import AvatarDisplay from './shared/AvatarDisplay';
import TimeProgressBar from './shared/TimeProgressBar';
import { getMetricColorByTarget } from './revenue/ColorSettingsModal';
import { shortenSupermarketName } from '../../utils/dashboardHelpers';
import * as db from '../../utils/db';

const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

// Dòng nhân viên/phòng ban/tổng đã gộp thêm rank (thứ hạng) và oldRow (dữ liệu tháng trước để so sánh)
type InstallmentDisplayRow = InstallmentRow & { rank?: number; oldRow?: InstallmentRow };

interface InstallmentDesktopRowProps {
    row: InstallmentDisplayRow;
    isTotal: boolean;
    isHighlighted: boolean;
    onHighlightToggle: (name: string) => void;
    supermarketName: string;
    hidePercent: boolean;
    f: Intl.NumberFormat;
    targetTraGop: number;
    providerTiers?: DataTier[];
    totalTier?: DataTier;
}

const InstallmentDesktopRow = React.memo<InstallmentDesktopRowProps>(({
    row, isTotal, isHighlighted, onHighlightToggle, supermarketName, hidePercent, f, targetTraGop, providerTiers, totalTier
}) => {
    const oldRow = row.oldRow;
    // Vạch trạng thái 3px mép trái và màu số %T.Chậm — tính theo Target Trả chậm
    // (Đạt >=100% lục, Tiệm cận >=85% cam, Kém <85% đỏ)
    const metricColor = getMetricColorByTarget(row.totalPercent, targetTraGop);
    const stripeColor = isTotal ? undefined : metricColor;

    const totalDtColorClass = isTotal ? '' : (
        row.totalDtSieuThi <= 0 ? 'text-slate-400 dark:text-slate-500 font-normal' :
        totalTier === 'top' ? 'text-emerald-600 dark:text-emerald-400 font-bold' :
        totalTier === 'trung' ? 'text-amber-600 dark:text-amber-400 font-semibold' :
        totalTier === 'bot' ? 'text-rose-500 dark:text-rose-400 font-medium' :
        'text-slate-700 dark:text-slate-300 font-semibold'
    );

    return (
        <tr style={{ borderLeftColor: stripeColor }} className={`border-l-[3px] transition-all cursor-pointer text-[13px] border-b border-slate-200 dark:border-slate-700 ${isTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 font-extrabold text-emerald-800 dark:text-emerald-200 border-t-2 border-emerald-200 dark:border-emerald-800' : (isHighlighted ? 'bg-sky-50/50 dark:bg-sky-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800')}`}>
            <td className={`px-2 py-1 whitespace-nowrap min-w-[200px] border-r border-slate-200 dark:border-slate-700 ${isTotal ? 'text-center uppercase tracking-wider text-[13px]' : ''}`}>
                <div className={`flex items-center ${isTotal ? 'justify-center' : 'gap-2'}`}>
                    {!isTotal && <MedalBadge rank={row.rank} />}
                    {!isTotal && <AvatarDisplay employeeName={row.originalName!} supermarketName={supermarketName} />}
                    <div
                        role={isTotal ? undefined : 'button'}
                        tabIndex={isTotal ? undefined : 0}
                        className="flex flex-col min-w-0 cursor-pointer"
                        onClick={isTotal ? undefined : () => onHighlightToggle(row.originalName!)}
                        onKeyDown={isTotal ? undefined : onActivateKey(() => onHighlightToggle(row.originalName!))}
                    >
                        <span className={`font-bold ${isTotal ? '' : 'text-sky-700 dark:text-sky-400 text-[13px] whitespace-nowrap'}`}>{row.name}</span>
                    </div>
                </div>
            </td>
            {row.providers.map((p: InstallmentProvider, pIdx: number) => {
                const oldP = oldRow?.providers[pIdx];
                const tier = isTotal ? 'none' : (providerTiers?.[pIdx] || 'none');
                const dtColorClass = isTotal ? '' : (
                    p.dt <= 0 ? 'text-slate-400 dark:text-slate-500 font-normal' :
                    tier === 'top' ? 'text-emerald-600 dark:text-emerald-400 font-bold' :
                    tier === 'trung' ? 'text-amber-600 dark:text-amber-400 font-semibold' :
                    tier === 'bot' ? 'text-rose-500 dark:text-rose-400 font-medium' :
                    'text-slate-700 dark:text-slate-300 font-semibold'
                );

                return (
                    <React.Fragment key={pIdx}>
                        <td className={`px-1 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums ${dtColorClass || 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                            <div>{p.dt > 0 ? f.format(Math.ceil(p.dt)) : '-'}</div>
                        </td>
                        {!hidePercent && (
                            <td className={`px-1 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 font-semibold tabular-nums ${p.percent >= 40 ? 'text-emerald-700' : 'text-slate-400'}`}>
                                <div>{p.percent > 0 ? `${p.percent.toFixed(2)}%` : '-'}</div>
                                <DeltaBadge current={p.percent} previous={oldP?.percent} />
                            </td>
                        )}
                    </React.Fragment>
                );
            })}
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums ${isTotal ? 'font-semibold text-slate-700 dark:text-slate-300' : totalDtColorClass}`}>
                {f.format(Math.ceil(row.totalDtSieuThi))}
            </td>
            <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 font-bold tabular-nums" style={{ color: metricColor }}>
                <div>{Math.round(row.totalPercent)}%</div>
                <DeltaBadge current={row.totalPercent} previous={oldRow?.totalPercent} />
            </td>
        </tr>
    );
});

interface InstallmentTabProps {
    rows: InstallmentRow[];
    supermarketName: string;
    activeSupermarkets?: string[];
    activeDepartments: string[];
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
    isActive?: boolean;
    targetTraGop?: number;
}

const InstallmentTab: React.FC<InstallmentTabProps> = ({ 
    rows, supermarketName, activeSupermarkets, activeDepartments, highlightedEmployees, setHighlightedEmployees, isActive, targetTraGop 
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    // Target động từ tab Cập nhật (Target Trả chậm)
    const safeName = shortenSupermarketName(supermarketName);
    const [storedTraGopTarget] = useIndexedDBState<number>(`targethero-${safeName}-tragop`, 45);
    const [multiTraGopTarget, setMultiTraGopTarget] = useState<number | null>(null);

    useEffect(() => {
        if (!activeSupermarkets || activeSupermarkets.length <= 1) {
            setMultiTraGopTarget(null);
            return;
        }
        let isMounted = true;
        const loadMultiTargets = async () => {
            const results = await Promise.all(activeSupermarkets.map(async (sm) => {
                const sName = shortenSupermarketName(sm);
                const tg = await db.get<number>(`targethero-${sName}-tragop`);
                return tg ?? 45;
            }));
            if (isMounted && results.length > 0) {
                const avgTg = results.reduce((sum, r) => sum + r, 0) / results.length;
                setMultiTraGopTarget(avgTg);
            }
        };
        loadMultiTargets();
        return () => { isMounted = false; };
    }, [activeSupermarkets]);

    const effectiveTargetTraCham = targetTraGop ?? multiTraGopTarget ?? storedTraGopTarget ?? 45;

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'totalPercent', direction: 'desc' });
    const [viewMode, setViewMode] = useIndexedDBState<'group' | 'list'>('installment-view-mode', 'group');
    const [hidePercent, setHidePercent] = useIndexedDBState<boolean>('installment-hide-percent', true);
    
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

    const handleSort = (key: string) => { setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' })); };

    const handleHighlightToggle = React.useCallback((originalName: string) => {
        setHighlightedEmployees((prev: Set<string>) => {
            const n = new Set(prev);
            if (n.has(originalName)) n.delete(originalName);
            else n.add(originalName);
            return n;
        });
    }, [setHighlightedEmployees]);

    const displayList = useMemo(() => {
        if (isActive === false) return [];
        if (rows.length === 0) return [];
        const allDepts = Array.from(new Set(rows.filter(r => r.type === 'employee' && r.department).map(r => r.department as string))).sort();
        // activeDepartments đến từ effectiveActiveDepartments (NhanVien.tsx) — đã quy đổi 'all' thành
        // danh sách phòng ban cụ thể trước khi truyền xuống, nên .includes('all') không bao giờ đúng.
        // Phải so thêm với allDepts để biết người dùng có thật sự đang lọc hay không (ảnh hưởng dòng TỔNG CỘNG bên dưới).
        const isFiltering = !activeDepartments.includes('all') && !(allDepts.length > 0 && allDepts.every(d => activeDepartments.includes(d)));

        let deptsToProcess = exportDeptFilter ? [exportDeptFilter] : (isFiltering ? activeDepartments : allDepts);

        const prevMonthRowsMap = new Map(prevMonthRows.map(pr => [pr.originalName, pr]));
        const calculateRowWithComparison = (row: InstallmentRow): InstallmentDisplayRow => {
            const oldRow = prevMonthRowsMap.get(row.originalName);
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

        if (totalRow && !exportDeptFilter) {
            finalOutput.push({ ...calculateRowWithComparison(totalRow), rank: 0 });
        }

        return finalOutput;
    }, [rows, activeDepartments, sortConfig, viewMode, exportDeptFilter, prevMonthRows, isActive]);

    const employeeTiersMap = useMemo(() => {
        const map = new Map<string, { providerTiers: DataTier[]; totalTier: DataTier }>();
        const employeeRows = displayList.filter(r => r.type === 'employee');
        if (employeeRows.length === 0) return map;

        const numProviders = employeeRows[0]?.providers?.length || 0;
        const providerTierCols: DataTier[][] = [];

        for (let pIdx = 0; pIdx < numProviders; pIdx++) {
            const vals = employeeRows.map(e => e.providers[pIdx]?.dt || 0);
            providerTierCols.push(computeColumnTiers(vals));
        }

        const totalVals = employeeRows.map(e => e.totalDtSieuThi || 0);
        const totalTiers = computeColumnTiers(totalVals);

        employeeRows.forEach((e, idx) => {
            const pTiers = providerTierCols.map(col => col[idx]);
            const tTier = totalTiers[idx];
            const key = e.originalName || e.name;
            map.set(key, { providerTiers: pTiers, totalTier: tTier });
        });

        return map;
    }, [displayList]);

    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const original = cardRef.current;
        try {
            const safeName = customFilename || `Báo Cáo Trả Chậm - ${supermarketName}.png`;
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
            const safeDeptName = dept.replace(/[\\/:*?"<>|]/g, '');
            const action = await handleExportPNG(`Trả Chậm - ${safeDeptName} - ${supermarketName}.png`, autoAction);
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
                toast.success('Đã nạp dữ liệu trả chậm cùng kỳ thành công!');
            } catch (err) { toast.error('File không hợp lệ.'); }
            if (importFileRef.current) importFileRef.current.value = '';
        };
        reader.readAsText(file);
    };

    if (isActive === false) {
        return <div className="hidden" />;
    }

    if (rows.length === 0) return <Card bordered={false} title="Phân tích Trả chậm"><EmptyState icon={<DocumentReportIcon className="h-6 w-6" />} title="Chưa có dữ liệu" /></Card>;
    
    const providers = rows.find(r => r.providers.length > 0)?.providers || [];

    const cardTitle = <span className="js-report-title">Trả chậm nhân viên đến ngày {getYesterdayDateString()}</span>;
    const cardSubtitle = <span className="js-report-title">Khi lợi ích được đặt đúng chỗ, quyết định mua trở nên tự nhiên.</span>;


    return (
        <div ref={cardRef} className="space-y-0 bg-white dark:bg-slate-900">
            {/* 1. Tiêu đề lên TRÊN CÙNG */}
            <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm lg:text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide leading-tight">
                    {cardTitle}
                </h2>
                <div className="text-[11px] lg:text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none mt-1">
                    {cardSubtitle}
                </div>
            </div>

            {/* 2. Thanh nút gôm gọn lại ngay dưới tiêu đề */}
            <div className="flex flex-wrap justify-between items-center px-4 py-1.5 bg-slate-50/70 dark:bg-slate-800/40 no-print border-b border-slate-200 dark:border-slate-700 gap-2">
                <div className="flex gap-1.5 items-center">
                    <input type="file" ref={importFileRef} onChange={handleFileImport} accept=".json" className="hidden" />
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => importFileRef.current?.click()}
                        className={`h-8 gap-1.5 px-2.5 text-xs ${prevMonthRaw ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'text-slate-500'}`}
                    >
                        <ClockIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Cùng kỳ</span>
                        {prevMonthRaw && (
                            <Button variant="ghost" size="none" onClick={(e) => { e.stopPropagation(); setPrevMonthRaw(''); }} className="ml-0.5 p-0.5 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800">
                                <XIcon className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </Button>
                </div>
                <div className="flex gap-1.5 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setHidePercent(v => !v)}
                        title={hidePercent ? 'Hiện cột %' : 'Ẩn cột %'}
                        className={`h-8 w-8 text-[11px] font-black leading-none ${hidePercent ? 'text-rose-500' : 'text-slate-400'}`}
                    >
                        <span className={hidePercent ? 'line-through' : ''}>%</span>
                    </Button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode(viewMode === 'group' ? 'list' : 'group')}
                        title={viewMode === 'group' ? 'Đang xem theo Bộ phận (Bấm để xem Danh sách)' : 'Đang xem Danh sách (Bấm để xem theo Bộ phận)'}
                        className="h-8 w-8 text-sky-700 dark:text-sky-400"
                    >
                        {viewMode === 'group' ? <ViewGridIcon className="h-4 w-4" /> : <ViewListIcon className="h-4 w-4" />}
                    </Button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBatchExportByDept}
                        disabled={isExportingByDept}
                        title={isExportingByDept ? `Đang xuất ${exportDeptProgress.current}/${exportDeptProgress.total}` : 'Xuất ảnh theo bộ phận'}
                        className="h-8 w-8 text-slate-400"
                    >
                        {isExportingByDept ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <DownloadAllIcon className="h-4 w-4" />}
                    </Button>
                    <ExportButton onExportPNG={async () => { await handleExportPNG(); }} />
                </div>
            </div>

            {/* 3. Tiến độ thời gian */}
            <div className="px-4 pt-3 pb-1">
                <TimeProgressBar />
            </div>

            {/* 4. Bảng dữ liệu */}
            <div className="w-full overflow-hidden px-4 pb-4">
                <div className="overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <table className="w-full border-collapse border border-slate-200 dark:border-slate-700">
                        <thead className="sticky top-0 z-10">
                            {/* Tier 1: Group Headers */}
                            <tr>
                                <th rowSpan={hidePercent ? 1 : 2} onClick={() => handleSort('name')} className="px-3 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-l-[3px] border-l-slate-200 dark:border-l-slate-700 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-750 min-w-[200px] align-middle">Nhân viên</th>
                                {providers.map(p => <th key={p.name} rowSpan={hidePercent ? 1 : undefined} colSpan={hidePercent ? 1 : 2} className="px-1 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 leading-tight align-middle">{p.shortName}</th>)}
                                <th rowSpan={hidePercent ? 1 : 2} onClick={() => handleSort('totalDtSieuThi')} className="px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-emerald-900/40 leading-tight align-middle"><div>D.THU</div><div>THỰC</div></th>
                                <th rowSpan={hidePercent ? 1 : 2} onClick={() => handleSort('totalPercent')} className="px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-amber-900/40 leading-tight align-middle">%T.Chậm</th>
                            </tr>
                            {/* Tier 2: Column Headers - only shown when % columns visible */}
                            {!hidePercent && <tr>
                                {providers.map(p => <React.Fragment key={p.name}><th className="px-1 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-sky-900/50 transition-colors">DT</th><th className="px-1 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-sky-900/50 transition-colors">%</th></React.Fragment>)}
                            </tr>}
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900">
                            {displayList.map((row, idx) => {
                                if (row.type === 'department') {
                                    return (
                                        <tr key={`dept-${idx}`} className="bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300 border-t border-b border-slate-200 dark:border-slate-700">
                                            <td className="px-2 py-1 text-[13px] uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 font-extrabold whitespace-nowrap min-w-[200px]">{row.name}</td>
                                            {row.providers.map((p, pIdx: number) => (
                                                <React.Fragment key={pIdx}>
                                                    <td className="px-1 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold"><div>{p.dt > 0 ? f.format(Math.ceil(p.dt)) : '-'}</div></td>
                                                     {!hidePercent && <td className={`px-1 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold ${p.percent >= effectiveTargetTraCham ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}><div>{p.percent > 0 ? `${p.percent.toFixed(2)}%` : '-'}</div></td>}
                                                </React.Fragment>
                                            ))}
                                            <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold">{f.format(Math.ceil(row.totalDtSieuThi))}</td>
                                            <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-extrabold" style={{ color: getMetricColorByTarget(row.totalPercent, effectiveTargetTraCham) }}>{Math.round(row.totalPercent)}%</td>
                                        </tr>
                                    );
                                }
                                const isTotal = row.type === 'total';
                                const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                const tiers = employeeTiersMap.get(row.originalName || row.name);
                                return (
                                    <InstallmentDesktopRow
                                        key={row.originalName || idx}
                                        row={row}
                                        isTotal={isTotal}
                                        isHighlighted={isHighlighted}
                                        onHighlightToggle={handleHighlightToggle}
                                        supermarketName={supermarketName}
                                        hidePercent={hidePercent}
                                        f={f}
                                        targetTraGop={effectiveTargetTraCham}
                                        providerTiers={tiers?.providerTiers}
                                        totalTier={tiers?.totalTier}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
export default React.memo(InstallmentTab);
