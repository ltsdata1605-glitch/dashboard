
import React, { useMemo, useRef, useState } from 'react';
import Card from '../Card';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import ExportButton from '../ExportButton';
import { CrossSellingRow } from '../../types/nhanVienTypes';
import { getYesterdayDateString, parseCrossSellingData } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { ClockIcon, XIcon, ViewGridIcon, ViewListIcon, SpinnerIcon, DownloadAllIcon, DocumentReportIcon } from '../Icons';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../services/uiService';
import { Button } from '../../../../components/shared/ui/Button';
import { EmptyState } from '../../../../components/shared/ui/EmptyState';
import { MedalBadge, DeltaBadge } from '../shared/Badges';
import AvatarDisplay from './shared/AvatarDisplay';
import TimeProgressBar from './shared/TimeProgressBar';
import { ImportPrevMonthModal } from './revenue/ImportPrevMonthModal';

// Dòng nhân viên/phòng ban/tổng đã gộp thêm rank (thứ hạng) và oldRow (dữ liệu tháng trước để so sánh)
type CrossSellingDisplayRow = CrossSellingRow & { rank?: number; oldRow?: CrossSellingRow };

interface CrossSellingDesktopRowProps {
    row: CrossSellingDisplayRow;
    isHighlighted: boolean;
    supermarketName: string;
    f: Intl.NumberFormat;
}

const CrossSellingDesktopRow = React.memo<CrossSellingDesktopRowProps>(({
    row, isHighlighted, supermarketName, f
}) => {
    const oldRow = row.oldRow;
    return (
        <tr className={`transition-all group cursor-pointer text-[13px] border-b border-slate-200 dark:border-slate-700 last:border-b-0 ${isHighlighted ? 'bg-sky-50/70 dark:bg-sky-900/20' : 'odd:bg-slate-50/60 hover:bg-slate-100 dark:odd:bg-slate-800/20 dark:hover:bg-slate-800/40'}`}>
            <td className="px-2 py-1 whitespace-nowrap border-r border-slate-200 dark:border-slate-700 min-w-[180px]">
                <div className="flex items-center gap-2">
                    <MedalBadge rank={row.rank} />
                    <AvatarDisplay employeeName={row.originalName!} supermarketName={supermarketName} />
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sky-600 dark:text-sky-400 text-[13px] whitespace-normal break-words">{row.name}</span>
                    </div>
                </div>
            </td>
            <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-semibold text-slate-700 dark:text-slate-300">{f.format(Math.round(row.dtlk))}</td>
            <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-semibold text-slate-700 dark:text-slate-300">{f.format(row.totalSl)}</td>
            <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-semibold text-slate-700 dark:text-slate-300">{f.format(row.slBk)}</td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-semibold ${row.pctSpBk >= 25 ? 'text-emerald-600' : (row.pctSpBk < 15 ? 'text-rose-500' : 'text-amber-600')}`}>
                <div>{Math.round(row.pctSpBk)}%</div>
                <DeltaBadge current={row.pctSpBk} previous={oldRow?.pctSpBk} />
            </td>
            <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-semibold text-slate-700 dark:text-slate-300">{f.format(row.totalBill)}</td>
            <td className="px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-semibold text-sky-700 dark:text-sky-400">{f.format(row.billBk)}</td>
            <td className={`px-1.5 py-1 text-[13px] text-center border-r border-slate-200 dark:border-slate-700 tabular-nums font-bold ${row.pctBillBk >= 20 ? 'text-emerald-600' : (row.pctBillBk < 10 ? 'text-rose-500' : 'text-amber-600')}`}>
                <div>{Math.round(row.pctBillBk)}%</div>
                <DeltaBadge current={row.pctBillBk} previous={oldRow?.pctBillBk} />
            </td>
        </tr>
    );
});

const CrossSellingTab: React.FC<{
    rows: CrossSellingRow[];
    supermarketName: string;
    activeDepartments: string[];
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
    isActive?: boolean;
}> = ({ rows, supermarketName, activeDepartments, highlightedEmployees, setHighlightedEmployees, isActive }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'pctBillBk', direction: 'desc' });
    const [isPrevMonthModalOpen, setIsPrevMonthModalOpen] = useState(false);
    const [viewMode, setViewMode] = useIndexedDBState<'group' | 'list'>('bankem-view-mode', 'group');

    const [prevMonthRaw, setPrevMonthRaw] = useIndexedDBState<string>(`prev-month-bankem-${supermarketName}`, '');
    const prevMonthRows = useMemo((): CrossSellingRow[] => {
        try {
            if (isActive === false) return [];
            if (!prevMonthRaw) return [];
            // Kiểm tra xem là chuỗi JSON hay văn bản dán
            if (prevMonthRaw.trim().startsWith('[') || prevMonthRaw.trim().startsWith('{')) {
                const parsed = JSON.parse(prevMonthRaw);
                return Array.isArray(parsed) ? parsed as CrossSellingRow[] : [];
            }
            // Fallback cho dữ liệu dán văn bản từ HRM
            const map: Record<string, string> = {};
            rows.forEach(r => { if (r.originalName) map[r.originalName] = r.department || ''; });
            return parseCrossSellingData(prevMonthRaw, map);
        } catch (e) {
            console.error("Error parsing cross selling prev data", e);
            return [];
        }
    }, [prevMonthRaw, rows, isActive]);

    const [exportDeptFilter, setExportDeptFilter] = useState<string | null>(null);
    const [isExportingByDept, setIsExportingByDept] = useState(false);
    const [exportDeptProgress, setExportDeptProgress] = useState({ current: 0, total: 0 });

    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

    const handleSort = (key: string) => { setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' })); };

    const displayList = useMemo(() => {
        if (isActive === false) return [];
        const isFiltering = !activeDepartments.includes('all');
        const allDepts = Array.from(new Set(rows.filter(r => r.type === 'employee' && r.department).map(r => r.department as string))).sort();
        let deptsToProcess = exportDeptFilter ? [exportDeptFilter] : (isFiltering ? activeDepartments : allDepts);

        const attachPrevMonth = (row: CrossSellingRow): CrossSellingDisplayRow => {
            const oldRow = prevMonthRows.find((pr) => pr.originalName === row.originalName);
            return { ...row, oldRow };
        };

        if (viewMode === 'list' && !exportDeptFilter) {
            const list = rows.filter(r => r.type === 'employee' && (isFiltering ? activeDepartments.includes(r.department!) : true))
                .map(attachPrevMonth);
            list.sort((a, b) => {
                let valA: unknown = (a as unknown as Record<string, unknown>)[sortConfig.key], valB: unknown = (b as unknown as Record<string, unknown>)[sortConfig.key];
                const compare = typeof valA === 'string' ? valA.localeCompare(valB as string) : ((valA as number) - (valB as number));
                return sortConfig.direction === 'asc' ? compare : -compare;
            });
            const result: CrossSellingDisplayRow[] = list.map((emp, idx) => ({ ...emp, rank: idx + 1 }));
            if (result.length > 0) {
                const sDtlk = result.reduce((s, e) => s + e.dtlk, 0);
                const sTotalBill = result.reduce((s, e) => s + e.totalBill, 0);
                const sBillBk = result.reduce((s, e) => s + e.billBk, 0);
                const sTotalSl = result.reduce((s, e) => s + e.totalSl, 0);
                const sSlBk = result.reduce((s, e) => s + e.slBk, 0);

                const oldTotal = prevMonthRows.find((pr) => pr.type === 'total');

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
                let valA: unknown = (a as unknown as Record<string, unknown>)[sortConfig.key], valB: unknown = (b as unknown as Record<string, unknown>)[sortConfig.key];
                const compare = typeof valA === 'string' ? valA.localeCompare(valB as string) : ((valA as number) - (valB as number));
                return sortConfig.direction === 'asc' ? compare : -compare;
            });

            const sumDtlk = deptEmployees.reduce((s, e) => s + e.dtlk, 0);
            const sumBillBk = deptEmployees.reduce((s, e) => s + e.billBk, 0);
            const sumTotalBill = deptEmployees.reduce((s, e) => s + e.totalBill, 0);
            const sumSlBk = deptEmployees.reduce((s, e) => s + e.slBk, 0);
            const sumTotalSl = deptEmployees.reduce((s, e) => s + e.totalSl, 0);

            const oldDept = prevMonthRows.find((pr) => (pr.type === 'department' && pr.originalName === deptName) || (pr.type === 'department' && pr.name === deptName));

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

        const finalOutput: CrossSellingDisplayRow[] = [];
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
            const oldTotal = prevMonthRows.find((pr) => pr.type === 'total');
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
    }, [rows, activeDepartments, sortConfig, viewMode, exportDeptFilter, prevMonthRows, isActive]);

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

    if (isActive === false) {
        return <div className="hidden" />;
    }

    if (rows.length === 0) return <Card bordered={false} title="Hiệu quả Bán kèm" icon="refresh-cw"><EmptyState icon={<DocumentReportIcon className="h-6 w-6" />} title="Chưa có dữ liệu" /></Card>;

    const cardTitle = <span className="js-report-title">Hiệu quả bán kèm nhân viên đến ngày {getYesterdayDateString()}</span>;
    const cardSubtitle = <span className="js-report-title">Không chỉ là bán hàng, đó là sự quan tâm và mang lại giải pháp toàn diện cho khách hàng.</span>;


    return (
        <div className="space-y-0">
            <div className="flex flex-wrap justify-between items-center px-4 py-2.5 bg-white dark:bg-slate-800 no-print border-b border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex gap-2 items-center">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsPrevMonthModalOpen(true)}
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
                    <Button variant="ghost" size="icon" onClick={() => setViewMode('group')} title="Bộ phận" className={viewMode === 'group' ? 'text-sky-600' : 'text-slate-400'}><ViewGridIcon className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setViewMode('list')} title="Danh sách" className={viewMode === 'list' ? 'text-sky-600' : 'text-slate-400'}><ViewListIcon className="h-4 w-4" /></Button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <Button variant="ghost" size="icon" onClick={handleBatchExportByDept} disabled={isExportingByDept} title={isExportingByDept ? `Đang xuất ${exportDeptProgress.current}/${exportDeptProgress.total}` : 'Xuất ảnh theo bộ phận'} className="text-slate-400">{isExportingByDept ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <DownloadAllIcon className="h-4 w-4" />}</Button>
                    <ExportButton onExportPNG={async () => { await handleExportPNG(); }} />
                </div>
            </div>
            <div ref={cardRef}>
                <Card noPadding bordered={false} title={cardTitle} subtitle={cardSubtitle} rounded={false} icon="refresh-cw">
                    <div className="px-4 pt-3 pb-1">
                        <TimeProgressBar />
                    </div>
                    <div className="w-full overflow-hidden px-4 pb-4">
                        <div className="overflow-x-auto scrollbar-hide">
                                <table className="min-w-full text-[13px] border-collapse border border-slate-200 dark:border-slate-700">
                                    <thead className="sticky top-0 z-10">
                                        {/* Tier 1: Group Headers */}
                                        <tr>
                                            <th rowSpan={2} className="px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750" onClick={() => handleSort('name')}>
                                                Nhân viên
                                            </th>
                                            <th rowSpan={2} className="px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30 border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-sky-400 cursor-pointer hover:bg-sky-100 transition-colors" onClick={() => handleSort('dtlk')}>
                                                <div>D.THU</div><div>THỰC</div>
                                            </th>
                                            <th colSpan={3} className="px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border-r border-b border-slate-200 dark:border-slate-700">
                                                Sản phẩm bán kèm
                                            </th>
                                            <th colSpan={3} className="px-2 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border-b border-slate-200 dark:border-slate-700">
                                                Hiệu quả bill bán kèm
                                            </th>
                                        </tr>
                                        {/* Tier 2: Column Headers — nền trung tính, viền dưới màu theo nhóm (implementation_plan.md mục 61) */}
                                        <tr>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-amber-400 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('totalSl')}>LKSP</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-amber-400 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('slBk')}>B.Kèm</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-amber-400 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('pctSpBk')}>%SPBK</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-emerald-400 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('totalBill')}>Tổng</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 border-b-[3px] border-b-emerald-400 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('billBk')}>B.Kèm</th>
                                            <th className="px-1.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-800 border-b-[3px] border-b-emerald-400 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('pctBillBk')}>%B.Kèm</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-900">
                                        {displayList.map((row, idx) => {
                                            if (row.type === 'department' || row.type === 'total') {
                                                const isGrandTotal = row.type === 'total';
                                                const oldRow = row.oldRow;
                                                return (
                                                    <tr key={`${row.type}-${idx}`} className={`${isGrandTotal ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 font-extrabold border-t-2 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-700 dark:text-slate-300'} border-t border-slate-200 dark:border-slate-700`}>
                                                        <td className={`px-2 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} uppercase tracking-wider border-r ${isGrandTotal ? 'border-slate-200 dark:border-slate-700 text-center font-black' : 'border-slate-200 dark:border-slate-700 font-extrabold'}`}>{row.name}</td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700`}>{f.format(Math.round(row.dtlk))}</td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700`}>{f.format(row.totalSl)}</td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700`}>{f.format(row.slBk)}</td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700`}>
                                                            <div>{Math.round(row.pctSpBk)}%</div>
                                                            <DeltaBadge current={row.pctSpBk} previous={oldRow?.pctSpBk} />
                                                        </td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700`}>{f.format(row.totalBill)}</td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center border-r tabular-nums border-slate-200 dark:border-slate-700`}>{f.format(row.billBk)}</td>
                                                        <td className={`px-1.5 ${isGrandTotal ? 'py-1 text-[13px]' : 'py-1 text-[12px]'} text-center tabular-nums border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-extrabold`}>
                                                            <div>{Math.round(row.pctBillBk)}%</div>
                                                            <DeltaBadge current={row.pctBillBk} previous={oldRow?.pctBillBk} />
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                            return (
                                                <CrossSellingDesktopRow
                                                    key={row.originalName || idx}
                                                    row={row}
                                                    isHighlighted={isHighlighted}
                                                    supermarketName={supermarketName}
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
            <ImportPrevMonthModal
                isOpen={isPrevMonthModalOpen}
                onClose={() => setIsPrevMonthModalOpen(false)}
                onSave={setPrevMonthRaw}
                title="Nhập dữ liệu Bán kèm cùng kỳ"
                description={'Dán dữ liệu bảng báo cáo "Hiệu quả bán kèm" của tháng trước hoặc cùng kỳ từ HRM vào đây.'}
            />
        </div>
    );
};
export default React.memo(CrossSellingTab);
