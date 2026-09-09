import { describe, it } from 'vitest';
import { computeBaseAndPeriodData } from '../../services/filterService';
import { computeRbacFilteredData, calculateRowMetrics } from '../../utils/dataUtils';
import type { ProductConfig } from '../../types';

const N = 100_000;
const KHOS = ['K01','K02','K03','K04','K05'];
const NVS = Array.from({length: 60}, (_, i) => `${100000+i} - NV ${i}`);
const NGANH = ['Điện thoại','Điện máy','Phụ kiện','Gia dụng'];

function makeRows(n: number) {
    const rows: Record<string, unknown>[] = [];
    const base = new Date(2026, 8, 1).getTime();
    for (let i = 0; i < n; i++) {
        const d = new Date(base + (i % 30) * 86400000);
        rows.push({
            id: `SO${i}`, sp: `San pham ${i % 500}`, kh: `KH ${i % 9000}`,
            sl: (i % 3) + 1, gia: 1000000 + (i % 50) * 10000,
            kho: KHOS[i % KHOS.length], nguoiTao: NVS[i % NVS.length],
            trangThai: 'Đã duyệt', xuat: 'Đã xuất', htx: 'Xuất bán hàng tại siêu thị',
            nganhHang: NGANH[i % NGANH.length], nhomHang: `Nhom ${i % 40}`,
            thuTien: 'Đã thu', trangThaiHuy: 'Chưa hủy',
            nhapTra: 'Chưa trả', maSp: `SP${i % 500}`,
            parsedDate: d,
        });
    }
    return rows;
}

const cfg: ProductConfig = { groups: {}, subgroups: {}, childToParentMap: {}, childToSubgroupMap: {}, quantityMultiplierMap: {} };

/**
 * PHÉP ĐO, không phải test pass/fail — chỉ chạy khi có BENCH=1:
 *   BENCH=1 npx vitest run tests/bench
 *
 * Mục đích: kiểm chứng tiêu chí hoàn thành Đợt 7 trong KE_HOACH_TONG_THE.md ("lọc 100k dòng
 * < 200 ms") TRƯỚC khi bỏ công viết lại mô hình dữ liệu dạng cột — hoá ra mô hình object hiện
 * tại ĐÃ ĐẠT sẵn, nên khoản đầu tư lớn và rủi ro đó chưa được biện minh bằng số liệu.
 * Chạy trong Node/V8 trên dữ liệu tổng hợp; thực tế còn chạy trong Web Worker nên không chặn UI.
 */
describe.skipIf(!process.env.BENCH)(`Benchmark ${N.toLocaleString()} dòng`, () => {
    it('đo thời gian lọc + tính chỉ số', () => {
        const rows = makeRows(N);
        const filters = {
            kho: [], xuat: 'all', trangThai: [], nguoiTao: [], department: [],
            startDate: '2026-09-01', endDate: '2026-09-30', dateRange: 'all', selectedMonths: [],
        };

        // 1. RBAC (nhân viên — nhánh lọc nặng nhất)
        let t = performance.now();
        const rbac = computeRbacFilteredData(rows, { isDemoMode: false, userRole: 'manager', departmentId: 'K01,K02', employeeName: null, userEmail: 'x@y.z' });
        const tRbac = performance.now() - t;

        // 2. Lọc chính
        t = performance.now();
        const { baseFilteredData } = computeBaseAndPeriodData(rows as never, filters as never, null);
        const tFilter = performance.now() - t;

        // 3. Tính chỉ số toàn bộ (doanh thu/DTQĐ)
        t = performance.now();
        let sum = 0;
        for (const r of rows) sum += calculateRowMetrics(r as never, cfg).revenue;
        const tMetrics = performance.now() - t;

        console.log('════════ BENCHMARK ' + N.toLocaleString('vi-VN') + ' DÒNG ════════');
        console.log('RBAC (lọc theo Kho/NV)      :', tRbac.toFixed(0), 'ms →', rbac.length.toLocaleString('vi-VN'), 'dòng');
        console.log('Lọc chính (ngày/kho/xuất...):', tFilter.toFixed(0), 'ms →', baseFilteredData.length.toLocaleString('vi-VN'), 'dòng');
        console.log('Tính doanh thu toàn bộ      :', tMetrics.toFixed(0), 'ms  (tổng', (sum/1e9).toFixed(1), 'tỷ)');
        console.log('TỔNG 1 lượt lọc+tính        :', (tRbac + tFilter + tMetrics).toFixed(0), 'ms');
        console.log('Mục tiêu kế hoạch Đợt 7     : < 200 ms');
        console.log('══════════════════════════════════════');
    });
});
