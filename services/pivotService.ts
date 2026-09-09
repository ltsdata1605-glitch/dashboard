import type { DataRow, ProductConfig } from '../types';
import { COL } from '../constants';
import {
    getRowValue,
    getParentGroup,
    calculateRowMetrics,
    isValidSalesRow,
} from '../utils/dataUtils';

/**
 * Engine cho bảng Pivot động (KE_HOACH_TONG_THE.md mục 6, Giai đoạn 2).
 *
 * Người dùng tự chọn chiều hàng / chiều cột / chỉ số, thay vì bảng cố định.
 *
 * BA RÀNG BUỘC BẮT BUỘC, cố ý thiết kế để KHÔNG thể làm sai:
 *
 * 1. **Số liệu**: mọi chỉ số tiền/số lượng đều lấy từ `calculateRowMetrics()` — nguồn chân lý duy
 *    nhất theo CLAUDE.md mục 1. Ở đây KHÔNG có một công thức doanh thu nào được viết lại.
 * 2. **Điều kiện tính doanh thu**: dùng `isValidSalesRow()` — đúng hàm mà SummaryTable /
 *    WarehouseSummary dùng. Nhờ vậy tổng của pivot KHỚP với các bảng có sẵn theo cấu trúc, không
 *    phải nhờ trùng hợp.
 * 3. **Phân quyền**: engine này CỐ Ý không nhận `userRole`/`departmentId` và không tự lọc quyền.
 *    Nó chỉ tính trên đúng mảng được truyền vào. Nơi gọi PHẢI truyền `baseFilteredData` — dữ liệu
 *    đã đi qua `computeRbacFilteredData()` ở `hooks/useDataManagement.ts`. Làm vậy để tránh có
 *    HAI nơi cùng quyết định quyền xem (nguồn gốc kinh điển của lỗi rò rỉ dữ liệu): nhân viên chỉ
 *    thấy dòng của chính mình, quản lý chỉ thấy Kho của mình — do tầng trên đã cắt, không phải do
 *    bảng này tự cắt lại.
 */

export type PivotDimension =
    | 'kho'
    | 'nganhHang'
    | 'nhomHang'
    | 'nguoiTao'
    | 'hangSx'
    | 'htx'
    | 'trangThai';

export type PivotMetric =
    | 'revenue'
    | 'revenueQD'
    | 'quantity'
    | 'weightedQuantity'
    | 'orderCount';

export const PIVOT_DIMENSIONS: { id: PivotDimension; label: string }[] = [
    { id: 'kho', label: 'Kho' },
    { id: 'nganhHang', label: 'Ngành hàng' },
    { id: 'nhomHang', label: 'Nhóm hàng' },
    { id: 'nguoiTao', label: 'Nhân viên' },
    { id: 'hangSx', label: 'Hãng SX' },
    { id: 'htx', label: 'Hình thức xuất' },
    { id: 'trangThai', label: 'Trạng thái' },
];

export const PIVOT_METRICS: { id: PivotMetric; label: string; kind: 'currency' | 'number' }[] = [
    { id: 'revenueQD', label: 'Doanh thu QĐ', kind: 'currency' },
    { id: 'revenue', label: 'Doanh thu thực', kind: 'currency' },
    { id: 'weightedQuantity', label: 'SL quy đổi', kind: 'number' },
    { id: 'quantity', label: 'Số lượng', kind: 'number' },
    { id: 'orderCount', label: 'Số đơn', kind: 'number' },
];

export interface PivotConfig {
    /** 1–2 chiều, chiều thứ 2 lồng trong chiều thứ 1. */
    rowDims: PivotDimension[];
    /** null = không tách cột, chỉ 1 cột tổng. */
    colDim: PivotDimension | null;
    metric: PivotMetric;
}

export interface PivotRow {
    key: string;
    label: string;
    level: number;
    /** Giá trị theo từng cột (khoá = giá trị của chiều cột). */
    values: Record<string, number>;
    total: number;
    children: PivotRow[];
}

export interface PivotResult {
    colKeys: string[];
    rows: PivotRow[];
    colTotals: Record<string, number>;
    grandTotal: number;
    /** Số dòng dữ liệu thật sự được tính (sau khi lọc điều kiện doanh thu). */
    matchedRowCount: number;
}

const EMPTY_LABEL = '(Không có)';

/** Lấy giá trị 1 chiều từ 1 dòng. `nganhHang` phải qua productConfig nên cần tham số này. */
function getDimensionValue(
    row: DataRow,
    dim: PivotDimension,
    productConfig: ProductConfig | null
): string {
    let raw: unknown;
    switch (dim) {
        case 'kho': raw = getRowValue(row, COL.KHO); break;
        // Ngành hàng KHÔNG có sẵn trong dòng — phải suy ra từ Nhóm hàng qua bảng cấu hình sản
        // phẩm, đúng cách SummaryTable/CrossSellingTable đang làm.
        case 'nganhHang': raw = getParentGroup(getRowValue(row, COL.MA_NHOM_HANG), productConfig); break;
        case 'nhomHang': raw = getRowValue(row, COL.MA_NHOM_HANG); break;
        case 'nguoiTao': raw = getRowValue(row, COL.NGUOI_TAO); break;
        case 'hangSx': raw = getRowValue(row, COL.MANUFACTURER); break;
        case 'htx': raw = getRowValue(row, COL.HINH_THUC_XUAT); break;
        case 'trangThai': raw = getRowValue(row, COL.TRANG_THAI); break;
        default: raw = undefined;
    }
    const s = raw === undefined || raw === null ? '' : String(raw).trim();
    return s === '' ? EMPTY_LABEL : s;
}

/** Ô tích luỹ. `orderIds` chỉ được cấp phát khi thật sự đếm số đơn (tiết kiệm bộ nhớ). */
interface Cell {
    sum: number;
    orderIds: Set<string> | null;
}

const newCell = (needOrderIds: boolean): Cell => ({ sum: 0, orderIds: needOrderIds ? new Set() : null });

const cellValue = (c: Cell): number => (c.orderIds ? c.orderIds.size : c.sum);

function addToCell(cell: Cell, row: DataRow, metric: PivotMetric, productConfig: ProductConfig | null) {
    if (metric === 'orderCount') {
        // Đếm số ĐƠN chứ không phải số DÒNG: 1 đơn nhiều sản phẩm = nhiều dòng nhưng chỉ tính 1.
        const id = String(getRowValue(row, COL.ID) ?? '').trim();
        // Dòng không có mã đơn thì không thể khử trùng lặp — dùng khoá riêng để nó vẫn được đếm 1
        // lần thay vì bị gộp chung thành 1 với mọi dòng thiếu mã khác.
        cell.orderIds!.add(id || `__no_id_${cell.orderIds!.size}`);
        return;
    }
    const m = calculateRowMetrics(row, productConfig);
    cell.sum += m[metric];
}

/**
 * Tính bảng pivot.
 *
 * @param sourceData PHẢI là dữ liệu đã lọc quyền (xem ràng buộc 3 ở đầu file).
 */
export function computePivot(
    sourceData: DataRow[],
    config: PivotConfig,
    productConfig: ProductConfig | null
): PivotResult {
    const rowDims = config.rowDims.slice(0, 2).filter(Boolean);
    const needOrderIds = config.metric === 'orderCount';

    if (rowDims.length === 0 || sourceData.length === 0) {
        return { colKeys: [], rows: [], colTotals: {}, grandTotal: 0, matchedRowCount: 0 };
    }

    const colKeySet = new Set<string>();
    // level1Key -> { cells theo cột, children: level2Key -> cells theo cột }
    const tree = new Map<string, { cells: Map<string, Cell>; children: Map<string, Map<string, Cell>> }>();
    const colTotalCells = new Map<string, Cell>();
    const grandCell = newCell(needOrderIds);
    let matchedRowCount = 0;

    const bump = (map: Map<string, Cell>, key: string, row: DataRow) => {
        let c = map.get(key);
        if (!c) { c = newCell(needOrderIds); map.set(key, c); }
        addToCell(c, row, config.metric, productConfig);
    };

    for (const row of sourceData) {
        // Cùng điều kiện "đơn đủ điều kiện doanh thu" mà SummaryTable/WarehouseSummary dùng →
        // tổng của pivot khớp với các bảng đó.
        if (!isValidSalesRow(row, productConfig)) continue;
        matchedRowCount++;

        const colKey = config.colDim ? getDimensionValue(row, config.colDim, productConfig) : '__all__';
        colKeySet.add(colKey);

        const k1 = getDimensionValue(row, rowDims[0], productConfig);
        let node = tree.get(k1);
        if (!node) { node = { cells: new Map(), children: new Map() }; tree.set(k1, node); }
        bump(node.cells, colKey, row);

        if (rowDims.length > 1) {
            const k2 = getDimensionValue(row, rowDims[1], productConfig);
            let childCells = node.children.get(k2);
            if (!childCells) { childCells = new Map(); node.children.set(k2, childCells); }
            bump(childCells, colKey, row);
        }

        bump(colTotalCells, colKey, row);
        addToCell(grandCell, row, config.metric, productConfig);
    }

    const colKeys = Array.from(colKeySet).sort((a, b) => a.localeCompare(b, 'vi'));

    const toValues = (cells: Map<string, Cell>) => {
        const values: Record<string, number> = {};
        let total = 0;
        for (const k of colKeys) {
            const c = cells.get(k);
            const v = c ? cellValue(c) : 0;
            values[k] = v;
            total += v;
        }
        return { values, total };
    };

    const rows: PivotRow[] = [];
    for (const [k1, node] of tree) {
        const { values, total } = toValues(node.cells);
        const children: PivotRow[] = [];
        for (const [k2, childCells] of node.children) {
            const c = toValues(childCells);
            children.push({ key: `${k1}||${k2}`, label: k2, level: 1, values: c.values, total: c.total, children: [] });
        }
        children.sort((a, b) => b.total - a.total);
        rows.push({ key: k1, label: k1, level: 0, values, total, children });
    }
    // Sắp xếp giảm dần theo tổng — thứ tự hữu ích nhất khi mới mở bảng.
    rows.sort((a, b) => b.total - a.total);

    const colTotals: Record<string, number> = {};
    for (const k of colKeys) {
        const c = colTotalCells.get(k);
        colTotals[k] = c ? cellValue(c) : 0;
    }

    return {
        colKeys,
        rows,
        colTotals,
        // Với "số đơn", tổng chung KHÔNG bằng tổng các cột cộng lại (1 đơn có thể nằm ở nhiều cột)
        // — nên luôn lấy từ ô tổng riêng, không cộng dồn colTotals.
        grandTotal: cellValue(grandCell),
        matchedRowCount,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// SO SÁNH KỲ (Đợt 8 — dùng chung cơ chế ở services/periodService.ts)
// ─────────────────────────────────────────────────────────────────────────────

export interface PivotComparisonRow {
    key: string;
    label: string;
    current: number;
    previous: number;
    /** current - previous. */
    delta: number;
    /** % thay đổi so với kỳ trước. `null` khi kỳ trước = 0 (không chia được cho 0). */
    deltaPercent: number | null;
    children: PivotComparisonRow[];
}

export interface PivotComparisonResult {
    rows: PivotComparisonRow[];
    totalCurrent: number;
    totalPrevious: number;
    totalDelta: number;
    totalDeltaPercent: number | null;
}

const pct = (current: number, previous: number): number | null =>
    previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;

/**
 * Ghép 2 kỳ thành 1 bảng so sánh.
 *
 * Cố ý KHÔNG tự cắt dữ liệu theo ngày ở đây: nơi gọi truyền vào 2 mảng đã lọc sẵn bằng
 * `filterRowsInRange()` của periodService. Nhờ vậy phần "kỳ là gì" và phần "gộp số thế nào" tách
 * bạch, mỗi phần test riêng được, và cả 2 kỳ chắc chắn đi qua CÙNG một đường tính toán.
 *
 * Dòng chỉ xuất hiện ở 1 trong 2 kỳ vẫn được liệt kê (kỳ kia = 0) — nếu bỏ đi thì người dùng
 * không thấy được hạng mục MỚI phát sinh hoặc đã BIẾN MẤT, vốn là thông tin đáng giá nhất.
 */
export function computePivotComparison(
    currentRows: DataRow[],
    previousRows: DataRow[],
    config: PivotConfig,
    productConfig: ProductConfig | null
): PivotComparisonResult {
    const cur = computePivot(currentRows, { ...config, colDim: null }, productConfig);
    const prev = computePivot(previousRows, { ...config, colDim: null }, productConfig);

    const prevByKey = new Map(prev.rows.map(r => [r.key, r]));
    const seen = new Set<string>();
    const rows: PivotComparisonRow[] = [];

    const mergeChildren = (
        curChildren: PivotRow[],
        prevChildren: PivotRow[]
    ): PivotComparisonRow[] => {
        const prevMap = new Map(prevChildren.map(c => [c.key, c]));
        const seenChild = new Set<string>();
        const out: PivotComparisonRow[] = [];
        for (const c of curChildren) {
            const p = prevMap.get(c.key);
            seenChild.add(c.key);
            out.push({
                key: c.key, label: c.label,
                current: c.total, previous: p?.total ?? 0,
                delta: c.total - (p?.total ?? 0), deltaPercent: pct(c.total, p?.total ?? 0),
                children: [],
            });
        }
        for (const p of prevChildren) {
            if (seenChild.has(p.key)) continue;
            out.push({
                key: p.key, label: p.label,
                current: 0, previous: p.total,
                delta: -p.total, deltaPercent: pct(0, p.total),
                children: [],
            });
        }
        return out.sort((a, b) => b.current - a.current);
    };

    for (const c of cur.rows) {
        const p = prevByKey.get(c.key);
        seen.add(c.key);
        rows.push({
            key: c.key, label: c.label,
            current: c.total, previous: p?.total ?? 0,
            delta: c.total - (p?.total ?? 0), deltaPercent: pct(c.total, p?.total ?? 0),
            children: mergeChildren(c.children, p?.children ?? []),
        });
    }
    // Hạng mục CHỈ có ở kỳ trước = đã biến mất trong kỳ này — vẫn phải hiện.
    for (const p of prev.rows) {
        if (seen.has(p.key)) continue;
        rows.push({
            key: p.key, label: p.label,
            current: 0, previous: p.total,
            delta: -p.total, deltaPercent: pct(0, p.total),
            children: mergeChildren([], p.children),
        });
    }

    rows.sort((a, b) => b.current - a.current);

    return {
        rows,
        totalCurrent: cur.grandTotal,
        totalPrevious: prev.grandTotal,
        totalDelta: cur.grandTotal - prev.grandTotal,
        totalDeltaPercent: pct(cur.grandTotal, prev.grandTotal),
    };
}
