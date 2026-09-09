import React, { useMemo, useState } from 'react';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatQuantity } from '../../utils/dataUtils';
import {
    computePivot,
    PIVOT_DIMENSIONS,
    PIVOT_METRICS,
    type PivotDimension,
    type PivotMetric,
    type PivotRow,
} from '../../services/pivotService';
import { SectionCard } from '../shared/ui/SectionCard';
import { SectionHeader } from '../shared/ui/SectionHeader';
import { Select } from '../shared/ui/Select';
import { Button } from '../shared/ui/Button';
import { EmptyState } from '../shared/ui/EmptyState';
import { Icon } from '../common/Icon';

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
                    {r.values[ck] ? fmt(r.values[ck]) : <span className="text-slate-300">-</span>}
                </td>
            ))}
            <td className="px-2 py-1 text-center text-[13px] tabular-nums font-bold text-sky-700">
                {fmt(r.total)}
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

            <div className="px-2 lg:px-4 pb-4">
                {result.rows.length === 0 ? (
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
        </SectionCard>
    );
};

export default React.memo(PivotTable);
