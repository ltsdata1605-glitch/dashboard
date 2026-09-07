import { describe, it, expect } from 'vitest';
import type { ProductConfig, DataRow } from '../types';
import { calculateWarehouseSummary } from './summaryService';

/**
 * Test TÍCH HỢP (KE_HOACH_TONG_THE.md đợt 0) cho calculateWarehouseSummary() — hàm này là nguồn
 * số liệu chung cho bảng "Chi Tiết Theo Kho" (Report BI) VÀ bảng "Phụ Kiện & Điện Gia Dụng" trong
 * modal Phân Tích Hiệu Quả Cá Nhân (components/modals/EmployeeCategoryTable.tsx) — một hàm sai là
 * sai đồng thời ở nhiều nơi hiển thị. Số liệu kỳ vọng dưới đây tính tay, đối chiếu với
 * calculateRowMetrics() (đã test riêng ở utils/dataUtils.test.ts).
 */

const config: ProductConfig = {
    groups: {},
    subgroups: {},
    childToParentMap: { pk1: 'Phụ kiện', gd1: 'Gia dụng', ict1: 'ICT', kh1: 'Không tính doanh thu' },
    childToSubgroupMap: { pk1: 'Camera', gd1: 'Nồi cơm', ict1: 'Smartphone' },
    quantityMultiplierMap: {},
};

const row = (overrides: Partial<Record<string, unknown>>): DataRow => ({
    'Mã kho tạo': '99999',
    'Trạng thái hủy': 'Chưa hủy',
    'Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính': 'Chưa trả',
    'Hình thức xuất': 'Xuất bán hàng tại siêu thị',
    'Nhóm Hàng': 'pk1',
    'Tên Sản Phẩm': 'SP test',
    'Mã sản phẩm': 'SP001',
    'Tên Khách Hàng': 'KH A',
    'Nhà sản xuất': 'Sony',
    'Giá bán_1': 1000,
    'Số Lượng': 1,
    ...overrides,
});

describe('calculateWarehouseSummary', () => {
    it('mảng rỗng trả về mảng rỗng, không throw', () => {
        expect(calculateWarehouseSummary([], config)).toEqual([]);
    });

    it('DT Thực = tổng Giá bán_1 các dòng hợp lệ; DTQĐ cộng dồn theo hệ số từng ngành', () => {
        const rows = [
            row({ 'Nhóm Hàng': 'pk1', 'Giá bán_1': 1000, 'Số Lượng': 1, 'Mã sản phẩm': 'SP001' }), // heso 3.37
            row({ 'Nhóm Hàng': 'gd1', 'Giá bán_1': 2000, 'Số Lượng': 2, 'Mã sản phẩm': 'SP002', 'Nhà sản xuất': 'Panasonic' }), // heso 1.85
        ];
        const [summary] = calculateWarehouseSummary(rows, config)!;

        expect(summary.khoName).toBe('99999');
        expect(summary.doanhThuThuc).toBe(3000);
        expect(summary.doanhThuQD).toBeCloseTo(1000 * 3.37 + 2000 * 1.85, 6); // 3370 + 3700 = 7070
        // Hiệu quả QĐ = (DTQĐ - DT Thực) / DT Thực * 100
        expect(summary.hieuQuaQD).toBeCloseTo(((7070 - 3000) / 3000) * 100, 6);
    });

    it('đơn TRẢ GÓP: cộng thêm 30% vào DTQĐ và được tính vào doanhThuTraCham/traChamPercent', () => {
        const rows = [
            row({ 'Nhóm Hàng': 'gd1', 'Giá bán_1': 2000, 'Số Lượng': 2, 'Hình thức xuất': 'Xuất bán hàng trả góp tại siêu thị' }),
        ];
        const [summary] = calculateWarehouseSummary(rows, config)!;
        expect(summary.doanhThuQD).toBeCloseTo(2000 * 1.85 + 2000 * 0.3, 6); // 3700 + 600
        expect(summary.doanhThuTraCham).toBe(2000);
        expect(summary.traChamPercent).toBe(100); // 100% doanh thu kho này là trả góp
    });

    it('dòng "Đã hủy" hoặc "Đã trả" bị loại HOÀN TOÀN, không cộng vào bất kỳ số liệu nào', () => {
        const rows = [
            row({ 'Giá bán_1': 1000 }),
            row({ 'Giá bán_1': 999999, 'Trạng thái hủy': 'Đã hủy' }),
            row({ 'Giá bán_1': 999999, 'Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính': 'Đã trả' }),
        ];
        const [summary] = calculateWarehouseSummary(rows, config)!;
        expect(summary.doanhThuThuc).toBe(1000);
    });

    it('nhóm hàng "Không tính doanh thu" bị loại khỏi doanh thu (không phải lỗi thiếu cấu hình)', () => {
        const rows = [
            row({ 'Giá bán_1': 1000 }),
            row({ 'Nhóm Hàng': 'kh1', 'Giá bán_1': 500 }),
        ];
        const [summary] = calculateWarehouseSummary(rows, config)!;
        expect(summary.doanhThuThuc).toBe(1000);
    });

    it('hình thức xuất "thu hộ" KHÔNG tính vào doanh thu nhưng CÓ đếm vào slThuHo', () => {
        const rows = [
            row({ 'Giá bán_1': 1000 }),
            row({ 'Giá bán_1': 800, 'Hình thức xuất': 'Xuất dịch vụ thu hộ cước Payoo' }),
        ];
        const [summary] = calculateWarehouseSummary(rows, config)!;
        expect(summary.doanhThuThuc).toBe(1000); // KHÔNG cộng 800
        expect(summary.slThuHo).toBe(1);
    });

    it('slTiepCan đếm KHÁCH HÀNG DUY NHẤT trong các dòng có doanh thu (Set, không trùng lặp)', () => {
        const rows = [
            row({ 'Tên Khách Hàng': 'KH A', 'Mã sản phẩm': 'SP001' }),
            row({ 'Tên Khách Hàng': 'KH A', 'Mã sản phẩm': 'SP002' }), // cùng khách, 2 đơn khác nhau
            row({ 'Tên Khách Hàng': 'KH B', 'Mã sản phẩm': 'SP003' }),
        ];
        const [summary] = calculateWarehouseSummary(rows, config)!;
        expect(summary.slTiepCan).toBe(2);
    });

    it('gom đúng theo Ngành hàng (byIndustry) và Nhóm hàng con (byGroup) — nguồn cho bảng "Chi Tiết Ngành Hàng"', () => {
        const rows = [
            row({ 'Nhóm Hàng': 'pk1', 'Giá bán_1': 1000, 'Số Lượng': 1 }),
            row({ 'Nhóm Hàng': 'pk1', 'Giá bán_1': 500, 'Số Lượng': 2, 'Mã sản phẩm': 'SP002' }),
        ];
        const [summary] = calculateWarehouseSummary(rows, config)!;
        expect(summary.metrics.byIndustry['Phụ kiện'].revenue).toBe(1500);
        expect(summary.metrics.byIndustry['Phụ kiện'].quantity).toBe(3); // 1 + 2, không có hệ số SL riêng
        expect(summary.metrics.byGroup['Camera'].revenue).toBe(1500);
    });

    it('nhiều Kho: mỗi Kho 1 dòng kết quả riêng, sắp xếp giảm dần theo DTQĐ', () => {
        const rows = [
            row({ 'Mã kho tạo': '99999', 'Nhóm Hàng': 'pk1', 'Giá bán_1': 1000 }), // DTQĐ = 3370
            row({ 'Mã kho tạo': '88888', 'Nhóm Hàng': 'ict1', 'Giá bán_1': 5000, 'Mã sản phẩm': 'SP003' }), // DTQĐ = 5000
        ];
        const summary = calculateWarehouseSummary(rows, config)!;
        expect(summary.map(s => s.khoName)).toEqual(['88888', '99999']); // 5000 > 3370
    });

    it('dòng thiếu Mã kho tạo bị bỏ qua hoàn toàn (không tạo Kho "undefined")', () => {
        const rows = [row({ 'Mã kho tạo': '' })];
        expect(calculateWarehouseSummary(rows, config)).toEqual([]);
    });
});
