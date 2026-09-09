import React, { useMemo, useState } from 'react';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatQuantity } from '../../utils/dataUtils';
import {
    computePivot,
    computePivotComparison,
    selectPivotCellRows,
    PIVOT_DIMENSIONS,
    PIVOT_METRICS,
    type PivotDimension,
    type PivotMetric,
    type PivotRow,
} from '../../services/pivotService';
import {
    computePeriodRanges,
    clampToDataMaxDate,
    findDataMaxDate,
    filterRowsInRange,
    PERIOD_MODES,
    MODES_SUPPORT_UP_TO_CURRENT_DAY,
    type PeriodMode,
} from '../../services/periodService';
import { SectionCard } from '../shared/ui/SectionCard';
import { SectionHeader } from '../shared/ui/SectionHeader';
import { Select } from '../shared/ui/Select';
import { Input } from '../shared/ui/Input';
import { Button } from '../shared/ui/Button';
import { EmptyState } from '../shared/ui/EmptyState';
import { Icon } from '../common/Icon';
import DrillDownModal from '../shared/DrillDownModal';
import AlertRulesPanel from './AlertRulesPanel';

/**
 * Bảng Pivot động (KE_HOACH_TONG_THE.md mục 6 — Giai đoạn 2).
 * Người dùng tự chọn chiều hàng / chiều cột / chỉ số thay vì bảng cố định.
 *
 * PHÂN QUYỀN: bảng này đọc `baseFilteredData` từ DashboardContext — dữ liệu ĐÃ đi qua
 * `computeRbacFilteredData()` ở `hooks/useDataManagement.ts`. Vì vậy nhân viên chỉ thấy dòng của
 * chính mình và quản lý chỉ thấy Kho của mình một cách TỰ NHIÊN, không cần (và không được) lọc
 * quyền lần thứ hai ở đây — hai nơi cùng quyết định quyền là nguồn gốc kinh điển của lỗi rò rỉ.
 * Xem thêm phần đầu `services/pivotService.ts`.
 */

const NONE = '__none__';

const PivotTable: React.FC = () => {
    const { baseFilteredData, productConfig } = useDashboardContext();
    const { userRole } = useAuth();

    const [rowDim1, setRowDim1] = useState<PivotDimension>('nganhHang');
    const [rowDim2, setRowDim2] = useState<PivotDimension | typeof NONE>(NONE);
    const [colDim, setColDim] = useState<PivotDimension | typeof NONE>(NONE);
    const [metric, setMetric] = useState<PivotMetric>('revenueQD');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // --- So sánh kỳ (dùng chung services/periodService.ts) ---
    const [compareOn, setCompareOn] = useState(false);
    const [periodMode, setPeriodMode] = useState<PeriodMode>('month_adjacent');
    const today = new Date();
    const [anchorDate, setAnchorDate] = useState(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    );
    const [anchorMonth, setAnchorMonth] = useState(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    );
    const [upToCurrentDay, setUpToCurrentDay] = useState(true);

    // --- Drill-down: bấm 1 ô để xem các dòng cấu thành ---
    const [drill, setDrill] = useState<{ title: string; rows: typeof baseFilteredData; total: number } | null>(null);

    /** Mở drill-down cho 1 ô. `rowKeys` = giá trị chiều hàng (1 hoặc 2 cấp), `colKey` = chiều cột. */
    const openDrill = (rowKeys: string[], colKey: string | null, total: number, labelParts: string[]) => {
        // Nguồn phải khớp đúng phạm vi đang xem: khi so sánh kỳ thì chỉ lấy dòng của KỲ NÀY,
        // nếu không người dùng bấm vào ô "Kỳ này" lại thấy cả dòng của kỳ trước.
        const source = compareOn && ranges
            ? filterRowsInRange(baseFilteredData, ranges.currentStart, ranges.currentEnd)
            : baseFilteredData;
        const rows = selectPivotCellRows(
            source,
            { rowDims: rowDim2 === NONE ? [rowDim1] : [rowDim1, rowDim2], colDim: compareOn ? null : (colDim === NONE ? null : colDim), metric },
            productConfig,
            rowKeys,
            colKey
        );
        setDrill({ title: `${labelParts.join(' › ')} — ${metricInfo.label}`, rows, total });
    };

    const metricInfo = PIVOT_METRICS.find(m => m.id === metric)!;
    const fmt = (v: number) => (metricInfo.kind === 'currency' ? formatCurrency(v) : formatQuantity(v));

    const result = useMemo(
        () => computePivot(
            baseFilteredData,
            {
                rowDims: rowDim2 === NONE ? [rowDim1] : [rowDim1, rowDim2],
                colDim: colDim === NONE ? null : colDim,
                metric,
            },
            productConfig
        ),
        [baseFilteredData, rowDim1, rowDim2, colDim, metric, productConfig]
    );

    const ranges = useMemo(() => {
        if (!compareOn) return null;
        const base = computePeriodRanges(periodMode, { selectedDate: anchorDate, selectedMonth: anchorMonth, selectedWeekId: 1 });
        if (!base) return null;
        // "Chỉ tính tới ngày có dữ liệu": tránh so tháng mới chạy 8 ngày với cả tháng trước 30 ngày.
        return upToCurrentDay && MODES_SUPPORT_UP_TO_CURRENT_DAY.includes(periodMode)
            ? clampToDataMaxDate(base, findDataMaxDate(baseFilteredData))
            : base;
    }, [compareOn, periodMode, anchorDate, anchorMonth, upToCurrentDay, baseFilteredData]);

    const comparison = useMemo(() => {
        if (!ranges) return null;
        return computePivotComparison(
            filterRowsInRange(baseFilteredData, ranges.currentStart, ranges.currentEnd),
            filterRowsInRange(baseFilteredData, ranges.prevStart, ranges.prevEnd),
            { rowDims: rowDim2 === NONE ? [rowDim1] : [rowDim1, rowDim2], colDim: null, metric },
            productConfig
        );
    }, [ranges, baseFilteredData, rowDim1, rowDim2, metric, productConfig]);

    const toggle = (key: string) => setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    });

    // Chỉ hiện thông báo phạm vi khi nó THỰC SỰ giới hạn — admin xem tất cả thì không cần nhắc.
    const scopeNote =
        userRole === 'employee' ? 'Chỉ hiển thị dữ liệu do chính bạn tạo'
        : userRole === 'manager' ? 'Chỉ hiển thị dữ liệu thuộc Kho của bạn'
        : null;

    const dimOptions = PIVOT_DIMENSIONS.map(d => ({ value: d.id, label: d.label }));
    const dimOptionsWithNone = [{ value: NONE, label: '— Không —' }, ...dimOptions];

    const hasCols = result.colKeys.length > 0 && colDim !== NONE;
    const colSpanTotal = (hasCols ? result.colKeys.length : 0) + 2;

    const renderRow = (r: PivotRow, isChild: boolean) => (
        <tr
            key={r.key}
            className={`border-b border-slate-100 transition-colors ${isChild ? 'bg-slate-50/50 hover:bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
        >
            <td className={`px-2 py-1 text-left text-[13px] border-r border-slate-200 ${isChild ? 'pl-7 text-slate-600' : 'font-semibold text-slate-800'}`}>
                {!isChild && r.children.length > 0 ? (
                    <Button
                        variant="unstyled" size="none"
                        onClick={() => toggle(r.key)}
                        className="inline-flex items-center gap-1 text-left hover:text-sky-700"
                    >
                        <Icon name={expanded.has(r.key) ? 'chevron-down' : 'chevron-right'} size={3.5} className="text-slate-400 shrink-0" />
                        <span>{r.label}</span>
                        <span className="ml-1 text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                            {r.children.length}
                        </span>
                    </Button>
                ) : (
                    <span>{r.label}</span>
                )}
            </td>
            {hasCols && result.colKeys.map(ck => (
                <td key={ck} className="px-2 py-1 text-center text-[13px] tabular-nums border-r border-slate-200 text-slate-600">
                    {r.values[ck] ? (
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => openDrill(isChild ? [r.key.split('||')[0], r.label] : [r.label], ck, r.values[ck], [r.label, ck])}
                            className="underline decoration-dotted underline-offset-2 hover:text-sky-700"
                            title="Xem các dòng cấu thành"
                        >
                            {fmt(r.values[ck])}
                        </Button>
                    ) : <span className="text-slate-300">-</span>}
                </td>
            ))}
            <td className="px-2 py-1 text-center text-[13px] tabular-nums font-bold text-sky-700">
                <Button
                    variant="unstyled" size="none"
                    onClick={() => openDrill(isChild ? [r.key.split('||')[0], r.label] : [r.label], null, r.total, [r.label])}
                    className="underline decoration-dotted underline-offset-2 hover:text-sky-800 font-bold text-sky-700"
                    title="Xem các dòng cấu thành"
                >
                    {fmt(r.total)}
                </Button>
            </td>
        </tr>
    );

    const fmtDelta = (v: number) => (v > 0 ? `+${fmt(v)}` : fmt(v));
    const deltaClass = (v: number) => (v > 0 ? 'text-emerald-600' : v < 0 ? 'text-rose-600' : 'text-slate-400');

    const renderCompRow = (r: import('../../services/pivotService').PivotComparisonRow, isChild: boolean) => (
        <tr
            key={r.key}
            className={`border-b border-slate-100 transition-colors ${isChild ? 'bg-slate-50/50 hover:bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
        >
            <td className={`px-2 py-1 text-left text-[13px] border-r border-slate-200 ${isChild ? 'pl-7 text-slate-600' : 'font-semibold text-slate-800'}`}>
                {!isChild && r.children.length > 0 ? (
                    <Button
                        variant="unstyled" size="none"
                        onClick={() => toggle(r.key)}
                        className="inline-flex items-center gap-1 text-left hover:text-sky-700"
                    >
                        <Icon name={expanded.has(r.key) ? 'chevron-down' : 'chevron-right'} size={3.5} className="text-slate-400 shrink-0" />
                        <span>{r.label}</span>
                        <span className="ml-1 text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{r.children.length}</span>
                    </Button>
                ) : <span>{r.label}</span>}
            </td>
            <td className="px-2 py-1 text-center text-[13px] tabular-nums border-r border-slate-200 font-bold text-sky-700">
                {r.current ? (
                    <Button
                        variant="unstyled" size="none"
                        onClick={() => openDrill(isChild ? [r.key.split('||')[0], r.label] : [r.label], null, r.current, [r.label])}
                        className="underline decoration-dotted underline-offset-2 font-bold text-sky-700 hover:text-sky-800"
                        title="Xem các dòng cấu thành (kỳ này)"
                    >
                        {fmt(r.current)}
                    </Button>
                ) : fmt(r.current)}
            </td>
            <td className="px-2 py-1 text-center text-[13px] tabular-nums border-r border-slate-200 text-slate-500">{fmt(r.previous)}</td>
            <td className={`px-2 py-1 text-center text-[13px] tabular-nums border-r border-slate-200 font-semibold ${deltaClass(r.delta)}`}>{fmtDelta(r.delta)}</td>
            <td className={`px-2 py-1 text-center text-[13px] tabular-nums font-bold ${deltaClass(r.delta)}`}>
                {r.deltaPercent === null
                    ? <span className="text-slate-300" title="Kỳ trước bằng 0 nên không tính được %">—</span>
                    : `${r.deltaPercent > 0 ? '+' : ''}${r.deltaPercent.toFixed(1)}%`}
            </td>
        </tr>
    );

    return (
        <SectionCard className="relative lg:rounded-none">
            <div className="relative z-10 pt-1 lg:pt-3">
                <SectionHeader
                    title="BẢNG PHÂN TÍCH ĐỘNG"
                    subtitle={
                        <span className="inline-flex items-center gap-2 flex-wrap">
                            <span>Tự chọn chiều phân tích và chỉ số</span>
                            {scopeNote && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Icon name="lock" size={3} />
                                    {scopeNote}
                                </span>
                            )}
                        </span>
                    }
                />
            </div>

            <AlertRulesPanel sourceData={baseFilteredData} productConfig={productConfig} />

            {/* Bộ chọn chiều & chỉ số */}
            <div className="px-2 lg:px-4 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-2 hide-on-export">
                <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hàng</span>
                    <Select value={rowDim1} onChange={e => setRowDim1(e.target.value as PivotDimension)} options={dimOptions} />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hàng (cấp 2)</span>
                    <Select value={rowDim2} onChange={e => setRowDim2(e.target.value as PivotDimension)} options={dimOptionsWithNone} />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cột</span>
                    <Select value={colDim} onChange={e => setColDim(e.target.value as PivotDimension)} options={dimOptionsWithNone} />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Chỉ số</span>
                    <Select
                        value={metric}
                        onChange={e => setMetric(e.target.value as PivotMetric)}
                        options={PIVOT_METRICS.map(m => ({ value: m.id, label: m.label }))}
                    />
                </label>
            </div>

            {/* Bật/tắt so sánh kỳ + chọn chế độ */}
            <div className="px-2 lg:px-4 pb-2 flex flex-wrap items-end gap-2 hide-on-export">
                <Button
                    variant="unstyled" size="none"
                    onClick={() => setCompareOn(v => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-bold transition-colors ${
                        compareOn
                            ? 'bg-sky-50 border-sky-300 text-sky-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                >
                    <Icon name={compareOn ? 'check' : 'plus'} size={3.5} />
                    So sánh kỳ
                </Button>

                {compareOn && (
                    <>
                        <label className="flex flex-col gap-1 min-w-[200px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Kiểu so sánh</span>
                            <Select
                                value={periodMode}
                                onChange={e => setPeriodMode(e.target.value as PeriodMode)}
                                options={PERIOD_MODES.map(m => ({ value: m.id, label: m.label }))}
                            />
                        </label>

                        {/* Mốc thời gian: chế độ theo ngày/YTD dùng ngày, còn lại dùng tháng */}
                        {(periodMode === 'day_adjacent' || periodMode === 'day_same_period' || periodMode === 'ytd_same_period_year') ? (
                            <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ngày</span>
                                <Input
                                    type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)}
                                    fullWidth={false} className="h-9 text-xs"
                                />
                            </label>
                        ) : periodMode !== 'custom_range' ? (
                            <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tháng</span>
                                <Input
                                    type="month" value={anchorMonth} onChange={e => setAnchorMonth(e.target.value)}
                                    fullWidth={false} className="h-9 text-xs"
                                />
                            </label>
                        ) : null}

                        {MODES_SUPPORT_UP_TO_CURRENT_DAY.includes(periodMode) && (
                            <label className="flex items-center gap-1.5 h-9 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                                {/* Giữ <input type="checkbox"> thô: components/shared/ui KHÔNG có
                                    component checkbox (chỉ có Input/Select/Button/Switch-của-BI),
                                    nên đây không phải trường hợp bỏ qua quy tắc dùng chung. */}
                                <input
                                    type="checkbox" checked={upToCurrentDay}
                                    onChange={e => setUpToCurrentDay(e.target.checked)}
                                    className="h-3.5 w-3.5 accent-sky-600"
                                />
                                Chỉ tính tới ngày có dữ liệu
                            </label>
                        )}
                    </>
                )}
            </div>

            {compareOn && ranges && (
                <div className="px-2 lg:px-4 pb-2 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">{ranges.label}</span> — {ranges.description}
                </div>
            )}
            {compareOn && !ranges && (
                <div className="px-2 lg:px-4 pb-2 text-[11px] text-rose-600">
                    Không xác định được khoảng thời gian cho lựa chọn này — thử đổi mốc hoặc kiểu so sánh.
                </div>
            )}

            <div className="px-2 lg:px-4 pb-4">
                {compareOn ? (
                    !comparison || comparison.rows.length === 0 ? (
                        <EmptyState
                            icon="table"
                            title="Không có dữ liệu trong 2 kỳ đã chọn"
                            description="Thử đổi mốc thời gian hoặc kiểu so sánh."
                        />
                    ) : (
                        <div className="overflow-x-auto border border-slate-200">
                            <table className="w-full border-collapse compact-export-table">
                                <thead>
                                    <tr>
                                        <th className="px-2 py-1 text-left text-[11px] font-bold tracking-tight uppercase text-slate-700 bg-slate-50 border-b-2 border-b-slate-100 border-r border-slate-200 min-w-[160px]">
                                            {PIVOT_DIMENSIONS.find(d => d.id === rowDim1)?.label}
                                        </th>
                                        <th className="px-2 py-1 text-center text-[11px] font-bold tracking-tight uppercase text-sky-700 bg-sky-50 border-b-2 border-b-slate-100 border-r border-slate-200">Kỳ này</th>
                                        <th className="px-2 py-1 text-center text-[11px] font-bold tracking-tight uppercase text-slate-600 bg-slate-50 border-b-2 border-b-slate-100 border-r border-slate-200">Kỳ trước</th>
                                        <th className="px-2 py-1 text-center text-[11px] font-bold tracking-tight uppercase text-emerald-700 bg-emerald-50 border-b-2 border-b-slate-100 border-r border-slate-200">Chênh lệch</th>
                                        <th className="px-2 py-1 text-center text-[11px] font-bold tracking-tight uppercase text-emerald-700 bg-emerald-50 border-b-2 border-b-slate-100">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparison.rows.map(r => (
                                        <React.Fragment key={r.key}>
                                            {renderCompRow(r, false)}
                                            {expanded.has(r.key) && r.children.map(c => renderCompRow(c, true))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-emerald-50 border-t-2 border-emerald-200 font-extrabold">
                                        <td className="px-2 py-1 text-left text-[13px] text-slate-800 border-r border-slate-200">TỔNG CỘNG</td>
                                        <td className="px-2 py-1 text-center text-[13px] tabular-nums border-r border-slate-200 text-sky-700">{fmt(comparison.totalCurrent)}</td>
                                        <td className="px-2 py-1 text-center text-[13px] tabular-nums border-r border-slate-200 text-slate-600">{fmt(comparison.totalPrevious)}</td>
                                        <td className={`px-2 py-1 text-center text-[13px] tabular-nums border-r border-slate-200 ${deltaClass(comparison.totalDelta)}`}>{fmtDelta(comparison.totalDelta)}</td>
                                        <td className={`px-2 py-1 text-center text-[13px] tabular-nums ${deltaClass(comparison.totalDelta)}`}>
                                            {comparison.totalDeltaPercent === null ? '—' : `${comparison.totalDeltaPercent > 0 ? '+' : ''}${comparison.totalDeltaPercent.toFixed(1)}%`}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )
                ) : result.rows.length === 0 ? (
                    <EmptyState
                        icon="table"
                        title="Chưa có dữ liệu để phân tích"
                        description="Không có dòng nào đủ điều kiện tính doanh thu trong phạm vi đang lọc."
                    />
                ) : (
                    <div className="overflow-x-auto border border-slate-200">
                        <table className="w-full border-collapse compact-export-table">
                            <thead>
                                <tr>
                                    <th className="px-2 py-1 text-left text-[11px] font-bold tracking-tight uppercase text-slate-700 bg-slate-50 border-b-2 border-b-slate-100 border-r border-slate-200 min-w-[160px]">
                                        {PIVOT_DIMENSIONS.find(d => d.id === rowDim1)?.label}
                                    </th>
                                    {hasCols && result.colKeys.map(ck => (
                                        <th key={ck} className="px-2 py-1 text-center text-[11px] font-bold tracking-tight uppercase text-sky-700 bg-sky-50 border-b-2 border-b-slate-100 border-r border-slate-200 whitespace-nowrap">
                                            {ck}
                                        </th>
                                    ))}
                                    <th className="px-2 py-1 text-center text-[11px] font-bold tracking-tight uppercase text-emerald-700 bg-emerald-50 border-b-2 border-b-slate-100 whitespace-nowrap">
                                        Tổng
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.rows.map(r => (
                                    <React.Fragment key={r.key}>
                                        {renderRow(r, false)}
                                        {expanded.has(r.key) && r.children.map(c => renderRow(c, true))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-emerald-50 border-t-2 border-emerald-200 font-extrabold">
                                    <td className="px-2 py-1 text-left text-[13px] text-slate-800 border-r border-slate-200">
                                        TỔNG CỘNG
                                    </td>
                                    {hasCols && result.colKeys.map(ck => (
                                        <td key={ck} className="px-2 py-1 text-center text-[13px] tabular-nums border-r border-slate-200 text-slate-700">
                                            {fmt(result.colTotals[ck])}
                                        </td>
                                    ))}
                                    <td className="px-2 py-1 text-center text-[13px] tabular-nums text-emerald-700">
                                        {fmt(result.grandTotal)}
                                    </td>
                                </tr>
                                {metric === 'orderCount' && (
                                    <tr>
                                        <td colSpan={colSpanTotal} className="px-2 py-1 text-left text-[10px] text-slate-400 italic">
                                            Lưu ý: “Số đơn” đếm số đơn KHÔNG TRÙNG, nên các phần cộng lại có thể lớn hơn tổng —
                                            một đơn nhiều sản phẩm sẽ được tính ở nhiều nhóm hàng/cột nhưng chỉ tính 1 lần ở tổng.
                                        </td>
                                    </tr>
                                )}
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
            {drill && (
                <DrillDownModal
                    isOpen
                    onClose={() => setDrill(null)}
                    title={drill.title}
                    rows={drill.rows}
                    productConfig={productConfig}
                    expectedTotal={drill.total}
                    expectedTotalLabel={metricInfo.label}
                />
            )}
        </SectionCard>
    );
};

export default React.memo(PivotTable);
