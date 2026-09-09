import { describe, it, expect } from 'vitest';
import type { ProductConfig } from '../types';
import { computePivot, computePivotComparison } from './pivotService';
import { computeRbacFilteredData, calculateRowMetrics } from '../utils/dataUtils';

/**
 * Test cho bảng Pivot động. Ngoài phần tính toán, có 2 nhóm test đáng chú ý:
 *  - "KHỚP SỐ": tổng của pivot phải bằng tổng tính tay bằng `calculateRowMetrics` — chứng minh
 *    pivot không tự chế công thức riêng.
 *  - "PHÂN QUYỀN": chứng minh nhân viên chỉ thấy dòng của chính mình khi nguồn dữ liệu đi qua
 *    `computeRbacFilteredData` đúng như luồng thật của app.
 */

const cfg = (): ProductConfig => ({
    groups: {},
    subgroups: {},
    childToParentMap: {},
    childToSubgroupMap: {},
    quantityMultiplierMap: {},
});

/** Dòng bán hàng hợp lệ (đã thu, hình thức xuất tính doanh thu) — khoá ngắn như worker parse ra. */
const row = (o: Partial<Record<string, unknown>> = {}) => ({
    id: 'SO1', sp: 'San pham', sl: 1, gia: 1_000_000,
    kho: 'K01', nguoiTao: '111 - A', nganhHang: 'Điện thoại', nhomHang: 'Smartphone',
    hangSx: 'Samsung', htx: 'Xuất bán hàng tại siêu thị', trangThai: 'Đã duyệt',
    thuTien: 'Đã thu', trangThaiHuy: 'Chưa hủy', nhapTra: 'Chưa trả',
    ...o,
});

describe('computePivot — tính toán', () => {
    it('gộp theo 1 chiều hàng, không tách cột', () => {
        const data = [
            row({ id: 'SO1', kho: 'K01', gia: 1000 }),
            row({ id: 'SO2', kho: 'K01', gia: 2000 }),
            row({ id: 'SO3', kho: 'K02', gia: 500 }),
        ];
        const r = computePivot(data, { rowDims: ['kho'], colDim: null, metric: 'revenue' }, cfg());

        expect(r.matchedRowCount).toBe(3);
        expect(r.rows.map(x => x.label)).toEqual(['K01', 'K02']); // sắp giảm dần theo tổng
        expect(r.rows[0].total).toBe(3000);
        expect(r.rows[1].total).toBe(500);
        expect(r.grandTotal).toBe(3500);
    });

    it('tách cột: giá trị nằm đúng ô giao nhau, có tổng theo cột', () => {
        const data = [
            row({ id: 'SO1', kho: 'K01', hangSx: 'Samsung', gia: 1000 }),
            row({ id: 'SO2', kho: 'K01', hangSx: 'LG', gia: 300 }),
            row({ id: 'SO3', kho: 'K02', hangSx: 'Samsung', gia: 700 }),
        ];
        const r = computePivot(data, { rowDims: ['kho'], colDim: 'hangSx', metric: 'revenue' }, cfg());

        expect(r.colKeys).toEqual(['LG', 'Samsung']);
        const k01 = r.rows.find(x => x.label === 'K01')!;
        expect(k01.values['Samsung']).toBe(1000);
        expect(k01.values['LG']).toBe(300);
        expect(r.colTotals['Samsung']).toBe(1700);
        expect(r.colTotals['LG']).toBe(300);
        expect(r.grandTotal).toBe(2000);
    });

    it('2 chiều hàng: chiều thứ 2 lồng trong chiều thứ 1, tổng con cộng lại bằng tổng cha', () => {
        const data = [
            row({ id: 'SO1', kho: 'K01', nhomHang: 'Smartphone', gia: 1000 }),
            row({ id: 'SO2', kho: 'K01', nhomHang: 'Tablet', gia: 500 }),
            row({ id: 'SO3', kho: 'K02', nhomHang: 'Smartphone', gia: 200 }),
        ];
        const r = computePivot(data, { rowDims: ['kho', 'nhomHang'], colDim: null, metric: 'revenue' }, cfg());

        const k01 = r.rows.find(x => x.label === 'K01')!;
        expect(k01.children.map(c => c.label).sort()).toEqual(['Smartphone', 'Tablet']);
        expect(k01.children.reduce((s, c) => s + c.total, 0)).toBe(k01.total);
    });

    it('ô trống = 0 chứ không phải undefined (bảng không được có lỗ)', () => {
        const data = [
            row({ id: 'SO1', kho: 'K01', hangSx: 'Samsung', gia: 1000 }),
            row({ id: 'SO2', kho: 'K02', hangSx: 'LG', gia: 500 }),
        ];
        const r = computePivot(data, { rowDims: ['kho'], colDim: 'hangSx', metric: 'revenue' }, cfg());
        const k01 = r.rows.find(x => x.label === 'K01')!;
        expect(k01.values['LG']).toBe(0);
    });

    it('giá trị rỗng/thiếu được gom vào nhãn "(Không có)" thay vì làm vỡ bảng', () => {
        const data = [row({ id: 'SO1', hangSx: '' }), row({ id: 'SO2', hangSx: undefined })];
        const r = computePivot(data, { rowDims: ['hangSx'], colDim: null, metric: 'revenue' }, cfg());
        expect(r.rows).toHaveLength(1);
        expect(r.rows[0].label).toBe('(Không có)');
    });

    it('"Số đơn" đếm theo ĐƠN chứ không theo dòng — 1 đơn nhiều sản phẩm chỉ tính 1', () => {
        const data = [
            row({ id: 'SO1', kho: 'K01', sp: 'Máy A' }),
            row({ id: 'SO1', kho: 'K01', sp: 'Ốp lưng' }),   // cùng đơn SO1
            row({ id: 'SO2', kho: 'K01', sp: 'Máy B' }),
        ];
        const r = computePivot(data, { rowDims: ['kho'], colDim: null, metric: 'orderCount' }, cfg());
        expect(r.matchedRowCount, 'vẫn duyệt đủ 3 dòng').toBe(3);
        expect(r.rows[0].total, 'nhưng chỉ có 2 đơn').toBe(2);
        expect(r.grandTotal).toBe(2);
    });

    it('bỏ qua dòng KHÔNG đủ điều kiện doanh thu (chưa thu tiền) — khớp cách các bảng khác lọc', () => {
        const data = [
            row({ id: 'SO1', gia: 1000 }),
            row({ id: 'SO2', gia: 9999, thuTien: 'Chưa thu' }),
        ];
        const r = computePivot(data, { rowDims: ['kho'], colDim: null, metric: 'revenue' }, cfg());
        expect(r.matchedRowCount).toBe(1);
        expect(r.grandTotal).toBe(1000);
    });

    it('không có chiều hàng hoặc không có dữ liệu → kết quả rỗng, không ném lỗi', () => {
        expect(computePivot([], { rowDims: ['kho'], colDim: null, metric: 'revenue' }, cfg()).rows).toEqual([]);
        expect(computePivot([row()], { rowDims: [], colDim: null, metric: 'revenue' }, cfg()).rows).toEqual([]);
    });
});

describe('computePivot — KHỚP SỐ với calculateRowMetrics (không tự chế công thức)', () => {
    it('tổng doanh thu QĐ của pivot bằng tổng tính tay từng dòng', () => {
        const config = cfg();
        const data = [
            row({ id: 'SO1', gia: 1_000_000, sl: 2, htx: 'Xuất bán hàng trả góp tại siêu thị' }),
            row({ id: 'SO2', gia: 3_000_000, sl: 1 }),
            row({ id: 'SO3', gia: 500_000, sl: 3, kho: 'K02' }),
        ];
        const tinhTay = data.reduce((s, r) => s + calculateRowMetrics(r, config).revenueQD, 0);
        const pivot = computePivot(data, { rowDims: ['kho'], colDim: 'hangSx', metric: 'revenueQD' }, config);

        expect(pivot.grandTotal).toBeCloseTo(tinhTay, 6);
        expect(tinhTay, 'dữ liệu mẫu phải có trả góp nên DTQĐ > doanh thu thực').toBeGreaterThan(
            data.reduce((s, r) => s + calculateRowMetrics(r, config).revenue, 0)
        );
    });

    it('tổng các dòng cấp 1 cộng lại bằng tổng chung (không thất thoát dòng nào)', () => {
        const data = Array.from({ length: 50 }, (_, i) =>
            row({ id: `SO${i}`, kho: `K0${i % 4}`, nhomHang: `Nhóm ${i % 7}`, gia: (i + 1) * 1000 })
        );
        const r = computePivot(data, { rowDims: ['kho', 'nhomHang'], colDim: null, metric: 'revenue' }, cfg());
        expect(r.rows.reduce((s, x) => s + x.total, 0)).toBe(r.grandTotal);
    });
});

describe('PHÂN QUYỀN — pivot chỉ thấy đúng phạm vi được phép', () => {
    // Luồng thật của app: useDataManagement chạy computeRbacFilteredData TRƯỚC, rồi mới đưa
    // baseFilteredData xuống các bảng. Test này mô phỏng đúng thứ tự đó.
    const duLieuToanCongTy = [
        row({ id: 'SO1', kho: 'K01', nguoiTao: '111 - Nhân viên A', gia: 1000 }),
        row({ id: 'SO2', kho: 'K01', nguoiTao: '222 - Nhân viên B', gia: 2000 }),
        row({ id: 'SO3', kho: 'K02', nguoiTao: '333 - Nhân viên C', gia: 4000 }),
    ];

    it('NHÂN VIÊN: pivot chỉ chứa dòng của chính mình, không thấy đồng nghiệp cùng Kho', () => {
        const nguon = computeRbacFilteredData(duLieuToanCongTy, {
            isDemoMode: false, userRole: 'employee', departmentId: 'K01',
            employeeName: '111', userEmail: 'a@test.com',
        });
        const r = computePivot(nguon, { rowDims: ['nguoiTao'], colDim: null, metric: 'revenue' }, cfg());

        expect(r.rows.map(x => x.label)).toEqual(['111 - Nhân viên A']);
        expect(r.grandTotal, 'chỉ được thấy 1000 của mình, không thấy 2000 của đồng nghiệp').toBe(1000);
    });

    it('QUẢN LÝ: thấy mọi nhân viên trong Kho mình, KHÔNG thấy Kho khác', () => {
        const nguon = computeRbacFilteredData(duLieuToanCongTy, {
            isDemoMode: false, userRole: 'manager', departmentId: 'K01',
            employeeName: null, userEmail: 'm@test.com',
        });
        const r = computePivot(nguon, { rowDims: ['kho'], colDim: 'nguoiTao', metric: 'revenue' }, cfg());

        expect(r.rows.map(x => x.label)).toEqual(['K01']);
        expect(r.colKeys.sort()).toEqual(['111 - Nhân viên A', '222 - Nhân viên B']);
        expect(r.grandTotal, 'không được cộng 4000 của K02').toBe(3000);
    });

    it('ADMIN: thấy toàn bộ', () => {
        const nguon = computeRbacFilteredData(duLieuToanCongTy, {
            isDemoMode: false, userRole: 'admin', departmentId: 'ALL',
            employeeName: null, userEmail: 'admin@test.com',
        });
        const r = computePivot(nguon, { rowDims: ['kho'], colDim: null, metric: 'revenue' }, cfg());
        expect(r.rows.map(x => x.label).sort()).toEqual(['K01', 'K02']);
        expect(r.grandTotal).toBe(7000);
    });

    it('engine KHÔNG tự lọc quyền: đưa thẳng dữ liệu chưa lọc thì nó tính hết — đúng như thiết kế', () => {
        // Ghi lại chủ đích: quyền được cắt DUY NHẤT ở computeRbacFilteredData. Nếu ai đó sau này
        // gọi computePivot với originalData thô, test này nhắc rằng engine sẽ KHÔNG cứu được.
        const r = computePivot(duLieuToanCongTy, { rowDims: ['kho'], colDim: null, metric: 'revenue' }, cfg());
        expect(r.grandTotal).toBe(7000);
    });
});

describe('computePivotComparison — so sánh 2 kỳ', () => {
    const kyNay = [
        row({ id: 'A1', kho: 'K01', gia: 1000 }),
        row({ id: 'A2', kho: 'K02', gia: 500 }),
        row({ id: 'A3', kho: 'K03', gia: 300 }),   // CHỈ có ở kỳ này (hạng mục mới)
    ];
    const kyTruoc = [
        row({ id: 'B1', kho: 'K01', gia: 800 }),
        row({ id: 'B2', kho: 'K02', gia: 900 }),
        row({ id: 'B3', kho: 'K09', gia: 200 }),   // CHỈ có ở kỳ trước (đã biến mất)
    ];
    const conf = { rowDims: ['kho'] as const, colDim: null, metric: 'revenue' as const };

    it('tính đúng chênh lệch và % cho hạng mục có ở cả 2 kỳ', () => {
        const r = computePivotComparison(kyNay, kyTruoc, { ...conf, rowDims: ['kho'] }, cfg());
        const k01 = r.rows.find(x => x.label === 'K01')!;
        expect(k01.current).toBe(1000);
        expect(k01.previous).toBe(800);
        expect(k01.delta).toBe(200);
        expect(k01.deltaPercent).toBeCloseTo(25, 6);

        const k02 = r.rows.find(x => x.label === 'K02')!;
        expect(k02.delta, 'giảm thì delta phải âm').toBe(-400);
        expect(k02.deltaPercent).toBeCloseTo(-400 / 900 * 100, 6);
    });

    it('hạng mục MỚI (chỉ có kỳ này) vẫn hiện, kỳ trước = 0', () => {
        const r = computePivotComparison(kyNay, kyTruoc, { ...conf, rowDims: ['kho'] }, cfg());
        const k03 = r.rows.find(x => x.label === 'K03')!;
        expect(k03.previous).toBe(0);
        expect(k03.current).toBe(300);
        expect(k03.deltaPercent, 'chia cho 0 phải trả null chứ không phải Infinity').toBeNull();
    });

    it('hạng mục ĐÃ BIẾN MẤT (chỉ có kỳ trước) vẫn hiện — đây là thông tin đáng giá nhất', () => {
        const r = computePivotComparison(kyNay, kyTruoc, { ...conf, rowDims: ['kho'] }, cfg());
        const k09 = r.rows.find(x => x.label === 'K09');
        expect(k09, 'mất hạng mục chỉ có ở kỳ trước = người dùng không biết mình vừa mất Kho đó').toBeTruthy();
        expect(k09!.current).toBe(0);
        expect(k09!.previous).toBe(200);
        expect(k09!.delta).toBe(-200);
    });

    it('tổng 2 kỳ và chênh lệch tổng đúng', () => {
        const r = computePivotComparison(kyNay, kyTruoc, { ...conf, rowDims: ['kho'] }, cfg());
        expect(r.totalCurrent).toBe(1800);
        expect(r.totalPrevious).toBe(1900);
        expect(r.totalDelta).toBe(-100);
    });

    it('kỳ trước rỗng: không chia cho 0, không ném lỗi', () => {
        const r = computePivotComparison(kyNay, [], { ...conf, rowDims: ['kho'] }, cfg());
        expect(r.totalPrevious).toBe(0);
        expect(r.totalDeltaPercent).toBeNull();
        expect(r.rows.every(x => x.previous === 0)).toBe(true);
    });

    it('2 cấp hàng: nhóm con cũng được ghép và giữ hạng mục chỉ có ở 1 kỳ', () => {
        const a = [row({ id: 'A1', kho: 'K01', nhomHang: 'Smartphone', gia: 1000 })];
        const b = [row({ id: 'B1', kho: 'K01', nhomHang: 'Tablet', gia: 700 })];
        const r = computePivotComparison(a, b, { rowDims: ['kho', 'nhomHang'], colDim: null, metric: 'revenue' }, cfg());
        const k01 = r.rows.find(x => x.label === 'K01')!;
        expect(k01.children.map(c => c.label).sort()).toEqual(['Smartphone', 'Tablet']);
        expect(k01.children.find(c => c.label === 'Tablet')!.current).toBe(0);
    });

    it('PHÂN QUYỀN vẫn giữ: nguồn 2 kỳ đã lọc thì so sánh cũng chỉ trong phạm vi đó', () => {
        const loc = (rows: ReturnType<typeof row>[]) => computeRbacFilteredData(rows, {
            isDemoMode: false, userRole: 'employee', departmentId: 'K01',
            employeeName: '111', userEmail: 'a@test.com',
        });
        const a = [row({ id: 'A1', kho: 'K01', nguoiTao: '111 - A', gia: 1000 }), row({ id: 'A2', kho: 'K01', nguoiTao: '222 - B', gia: 5000 })];
        const b = [row({ id: 'B1', kho: 'K01', nguoiTao: '111 - A', gia: 800 }), row({ id: 'B2', kho: 'K01', nguoiTao: '222 - B', gia: 4000 })];
        const r = computePivotComparison(loc(a), loc(b), { rowDims: ['nguoiTao'], colDim: null, metric: 'revenue' }, cfg());
        expect(r.rows.map(x => x.label)).toEqual(['111 - A']);
        expect(r.totalCurrent).toBe(1000);
        expect(r.totalPrevious).toBe(800);
    });
});
