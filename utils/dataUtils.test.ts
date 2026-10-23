import { describe, it, expect } from 'vitest';
import type { ProductConfig } from '../types';
import { COL, COL_SHORT_KEY, VARIANT_TO_SHORT_KEY } from '../constants';
import {
    getRowValue,
    calculateRowMetrics,
    getHeSoQuyDoi,
    getHinhThucThanhToan,
    getParentGroup,
    getSubgroup,
    parseNumber,
    roundUp,
    isValidSalesRow,
    isUncollectedOrder,
    computeRbacFilteredData,
    computeUniqueFilterOptions,
    formatCleanDisplayName,
    parseExcelDate,
    getRowPrice,
} from './dataUtils';

/**
 * Lưới an toàn cho tầng tính toán (KE_HOACH_TONG_THE.md đợt 0) — mọi sửa đổi sau này chạm vào
 * calculateRowMetrics()/getRowValue() phải giữ các hành vi dưới đây, vì đây là "nguồn chân lý
 * duy nhất" cho doanh thu/DTQĐ theo CLAUDE.md mục 1.
 */

const emptyConfig = (): ProductConfig => ({
    groups: {},
    subgroups: {},
    childToParentMap: {},
    childToSubgroupMap: {},
    quantityMultiplierMap: {},
});

describe('getRowValue', () => {
    it('trả về undefined khi row null/undefined', () => {
        expect(getRowValue(null as unknown as Record<string, unknown>, COL.PRICE)).toBeUndefined();
    });

    it('khớp trực tiếp theo khoá đầu tiên trong danh sách', () => {
        const row = { 'Giá bán_1': 100000 };
        expect(getRowValue(row, COL.PRICE)).toBe(100000);
    });

    it('rơi xuống khoá thứ 2 khi khoá đầu không có trong row', () => {
        const row = { 'Mã đơn hàng': 'SO001' }; // COL.ID = ['Mã Đơn Hàng', 'Mã đơn hàng']
        expect(getRowValue(row, COL.ID)).toBe('SO001');
    });

    it('khớp không phân biệt hoa/thường và chuẩn hoá NFC khi không có khớp trực tiếp', () => {
        const row = { 'MÃ ĐƠN HÀNG': 'SO002' };
        expect(getRowValue(row, COL.ID)).toBe('SO002');
    });

    it('bỏ qua giá trị null/undefined của khoá, thử tiếp khoá sau', () => {
        const row = { 'Mã Đơn Hàng': undefined, 'Mã đơn hàng': 'SO003' };
        expect(getRowValue(row, COL.ID)).toBe('SO003');
    });

    it('trả về undefined khi không có khoá nào khớp', () => {
        const row = { 'Cột khác': 'x' };
        expect(getRowValue(row, COL.PRICE)).toBeUndefined();
    });

    /** Đợt 4 bước 1 (KE_HOACH_TONG_THE.md mục 3.1) — services/worker.ts giờ parse ra row với
     *  khoá NGẮN cố định (vd `gia` thay vì `'Giá bán_1'`) thay vì chuỗi tiếng Việt dài. */
    describe('khoá ngắn (Đợt 4) — rows parse mới từ services/worker.ts', () => {
        it('tra thẳng khoá ngắn khi row đã chuẩn hoá (không dò biến thể)', () => {
            const row = { gia: 100000 };
            expect(getRowValue(row, COL.PRICE)).toBe(100000);
        });

        it('row có CẢ khoá ngắn lẫn khoá tiếng Việt (không xảy ra thực tế, nhưng phải xác định rõ hành vi): ưu tiên khoá ngắn', () => {
            const row = { gia: 999, 'Giá bán_1': 111 };
            expect(getRowValue(row, COL.PRICE)).toBe(999);
        });

        it('khoá ngắn hoạt động với biến thể KHÔNG PHẢI keys[0] (vd danh sách alias cục bộ ở modal xuất Excel)', () => {
            // Mô phỏng đúng cách 3 modal (Uncollected/Unshipped/PerformanceModal) gọi getRowValue
            // với alias riêng — 'NguoiTao' không phải keys[0] của COL.NGUOI_TAO nhưng vẫn phải
            // tra được khoá ngắn 'nguoiTao' vì VARIANT_TO_SHORT_KEY map TỪNG biến thể, không chỉ keys[0].
            const row = { nguoiTao: '107617 - Nguyễn Văn A' };
            expect(getRowValue(row, ['NguoiTao', 'Người tạo', 'NV Tạo'])).toBe('107617 - Nguyễn Văn A');
        });

        it('row CHƯA chuẩn hoá (dữ liệu cũ lưu IndexedDB/Firestore từ trước, hoặc mock thủ công) vẫn đọc đúng qua nhánh dò biến thể cũ — không mất dữ liệu tương thích ngược', () => {
            const row = { 'Giá bán_1': 250000 }; // hình dạng row TRƯỚC Đợt 4, không có khoá ngắn
            expect(getRowValue(row, COL.PRICE)).toBe(250000);
        });
    });
});

describe('COL_SHORT_KEY / VARIANT_TO_SHORT_KEY — toàn vẹn bảng ánh xạ (Đợt 4)', () => {
    it('mọi field trong COL đều có khoá ngắn tương ứng, không field nào bị bỏ sót', () => {
        for (const key of Object.keys(COL) as (keyof typeof COL)[]) {
            expect(COL_SHORT_KEY[key], `thiếu COL_SHORT_KEY cho field ${key}`).toBeTruthy();
        }
    });

    it('không có 2 field logic khác nhau dùng trùng 1 khoá ngắn (tránh đè dữ liệu lên nhau khi parse)', () => {
        const shortKeys = Object.values(COL_SHORT_KEY);
        const uniqueShortKeys = new Set(shortKeys);
        expect(uniqueShortKeys.size, 'có khoá ngắn bị trùng giữa 2 field COL khác nhau').toBe(shortKeys.length);
    });

    it('mọi biến thể tiếng Việt trong COL đều tra được khoá ngắn qua VARIANT_TO_SHORT_KEY', () => {
        for (const variants of Object.values(COL)) {
            for (const variant of variants) {
                expect(VARIANT_TO_SHORT_KEY[variant], `thiếu ánh xạ cho biến thể "${variant}"`).toBeTruthy();
            }
        }
    });
});

describe('computeRbacFilteredData — Đợt 4: vẫn lọc đúng dù row dùng khoá ngắn (mới) hay khoá tiếng Việt (cũ)', () => {
    const baseParams = { isDemoMode: false, userRole: 'employee' as const, departmentId: 'K01', employeeName: '107617', userEmail: 'nv@test.com' };

    it('row khoá NGẮN (dữ liệu parse mới): nhân viên chỉ thấy đúng Kho + đúng mã số của mình', () => {
        const data = [
            { kho: 'K01', nguoiTao: '107617 - Nguyễn Văn A' },
            { kho: 'K01', nguoiTao: '999999 - Người khác' }, // khác mã NV — phải bị loại
            { kho: 'K02', nguoiTao: '107617 - Nguyễn Văn A' }, // khác Kho — phải bị loại
        ];
        const result = computeRbacFilteredData(data, baseParams);
        expect(result).toHaveLength(1);
        expect(result[0].nguoiTao).toBe('107617 - Nguyễn Văn A');
    });

    it('row khoá TIẾNG VIỆT (dữ liệu cũ đã lưu từ trước Đợt 4): vẫn lọc đúng y hệt, không bị mất trắng', () => {
        const data = [
            { 'Mã kho tạo': 'K01', 'Người tạo': '107617 - Nguyễn Văn A' },
            { 'Mã kho tạo': 'K01', 'Người tạo': '999999 - Người khác' },
            { 'Mã kho tạo': 'K02', 'Người tạo': '107617 - Nguyễn Văn A' },
        ];
        const result = computeRbacFilteredData(data, baseParams);
        expect(result).toHaveLength(1);
        expect(result[0]['Người tạo']).toBe('107617 - Nguyễn Văn A');
    });

    it('admin/demo mode: không lọc gì cả, giữ nguyên toàn bộ dữ liệu', () => {
        const data = [{ kho: 'K01' }, { kho: 'K99' }];
        const result = computeRbacFilteredData(data, { ...baseParams, userRole: 'admin' });
        expect(result).toHaveLength(2);
    });
});

describe('computeUniqueFilterOptions — Đợt 4: dựng đúng danh sách lọc dù row dùng khoá ngắn hay tiếng Việt', () => {
    it('row khoá NGẮN', () => {
        const data = [
            { kho: 'K01', trangThai: 'Đã duyệt', nguoiTao: '107617 - A', hangSx: 'Samsung' },
            { kho: 'K02', trangThai: 'Chờ duyệt', nguoiTao: '999999 - B', hangSx: 'LG' },
        ];
        const opts = computeUniqueFilterOptions(data, null);
        expect(opts.kho).toEqual(['K01', 'K02']);
        expect(opts.trangThai.sort()).toEqual(['Chờ duyệt', 'Đã duyệt']);
        expect(opts.nguoiTao).toHaveLength(2);
        expect(opts.hangSX.sort()).toEqual(['LG', 'Samsung']);
    });

    it('row khoá TIẾNG VIỆT (dữ liệu cũ)', () => {
        const data = [
            { 'Mã kho tạo': 'K01', 'Trạng thái hồ sơ': 'Đã duyệt', 'Người tạo': '107617 - A', 'Hãng': 'Samsung' },
        ];
        const opts = computeUniqueFilterOptions(data, null);
        expect(opts.kho).toEqual(['K01']);
        expect(opts.trangThai).toEqual(['Đã duyệt']);
        expect(opts.hangSX).toEqual(['Samsung']);
    });
});

describe('parseNumber', () => {
    it('trả 0 cho null/undefined/chuỗi rỗng', () => {
        expect(parseNumber(null)).toBe(0);
        expect(parseNumber(undefined)).toBe(0);
        expect(parseNumber('')).toBe(0);
    });

    it('giữ nguyên khi đầu vào đã là number', () => {
        expect(parseNumber(1234.5)).toBe(1234.5);
    });

    it('bỏ dấu chấm phân cách hàng nghìn kiểu VN (1.234.567 -> 1234567)', () => {
        expect(parseNumber('1.234.567')).toBe(1234567);
    });

    it('bỏ dấu % và khoảng trắng', () => {
        expect(parseNumber('45 %')).toBe(45);
    });

    it('bỏ dấu phẩy và dấu +', () => {
        expect(parseNumber('+1,200')).toBe(1200);
    });

    it('trả 0 khi không parse được', () => {
        expect(parseNumber('abc')).toBe(0);
    });
});

describe('roundUp', () => {
    it('làm tròn lên số dương', () => {
        expect(roundUp(4.01)).toBe(5);
    });

    it('coi số âm rất gần 0 là 0 (tránh -0 do sai số dấu phẩy động)', () => {
        expect(roundUp(-1e-10)).toBe(0);
    });

    it('vẫn làm tròn lên bình thường với số âm rõ ràng', () => {
        expect(roundUp(-4.5)).toBe(-4);
    });
});

describe('getParentGroup / getSubgroup', () => {
    const config = emptyConfig();
    config.childToParentMap = { '7161': 'ICT', 'phukien01': 'Phụ kiện' };
    config.childToSubgroupMap = { '7161': 'Vieon', 'phukien01': 'Camera' };

    it('khớp chính xác theo khoá', () => {
        expect(getParentGroup('phukien01', config)).toBe('Phụ kiện');
        expect(getSubgroup('phukien01', config)).toBe('Camera');
    });

    it('khớp theo tiền tố số khi khoá đầy đủ có dạng "7161 - Dịch vụ VAS"', () => {
        expect(getParentGroup('7161 - Dịch vụ VAS', config)).toBe('ICT');
        expect(getSubgroup('7161 - Dịch vụ VAS', config)).toBe('Vieon');
    });

    it('trả về chuỗi rỗng khi không có productConfig hoặc không khớp', () => {
        expect(getParentGroup('không tồn tại', config)).toBe('');
        expect(getParentGroup('phukien01', null)).toBe('');
    });
});

describe('getHinhThucThanhToan', () => {
    it('ưu tiên htxClassification của productConfig khi có', () => {
        const config = emptyConfig();
        config.htxClassification = { 'xuất bán hàng tại siêu thị': 'thu_ho' }; // ép khác fallback tĩnh
        const row = { 'Hình thức xuất': 'Xuất bán hàng tại siêu thị' };
        expect(getHinhThucThanhToan(row, config)).toBe('thu_ho');
    });

    it('rơi xuống danh sách tĩnh (HINH_THUC_XUAT_TRA_GOP) khi config không phủ giá trị này', () => {
        const config = emptyConfig();
        config.htxClassification = {}; // có config nhưng rỗng — vẫn phải fallback đúng
        const row = { 'Hình thức xuất': 'Xuất bán hàng trả góp tại siêu thị' };
        expect(getHinhThucThanhToan(row, config)).toBe('tra_gop');
    });

    it('trả "khac" khi không có Hình thức xuất', () => {
        expect(getHinhThucThanhToan({}, emptyConfig())).toBe('khac');
    });
});

describe('getHeSoQuyDoi', () => {
    it('hệ số theo NhomCha lấy từ productConfig (Phụ kiện = 3.37)', () => {
        const config = emptyConfig();
        config.childToParentMap = { 'pk1': 'Phụ kiện' };
        expect(getHeSoQuyDoi('', 'pk1', config)).toBe(3.37);
    });

    it('ICT/CE mặc định hệ số 1.0', () => {
        const config = emptyConfig();
        config.childToParentMap = { 'ict1': 'ICT' };
        expect(getHeSoQuyDoi('', 'ict1', config)).toBe(1.0);
    });

    it('hệ số doanh thu DTQĐ theo nhóm hàng lấy từ originalCategoryItems khi có', () => {
        const config = emptyConfig();
        config.originalCategoryItems = [{ nhomHang: 'pk1', nhomCha: 'Phụ kiện', nhomCon: 'Cáp sạc', heSoQuyDoi: 2.5 }];
        expect(getHeSoQuyDoi('', 'pk1', config)).toBe(2.5);
    });

    it('hệ số doanh thu DTQĐ theo nhóm hàng lấy từ quantityMultiplierMap khi key là nhóm hàng', () => {
        const config = emptyConfig();
        config.childToParentMap = { 'pk1': 'Phụ kiện' };
        config.quantityMultiplierMap = { 'pk1': 2.8 };
        expect(getHeSoQuyDoi('', 'pk1', config)).toBe(2.8);
    });
});

describe('calculateRowMetrics — nguồn chân lý duy nhất cho DTQĐ và WeightedQuantity (CLAUDE.md mục 1)', () => {
    const baseRow = (overrides: Record<string, unknown> = {}) => ({
        'Giá bán_1': 1000,
        'Số Lượng': 1,
        'Ngành Hàng': '',
        'Nhóm Hàng': 'pk1',
        'Tên Sản Phẩm': 'Sản phẩm test',
        'Mã sản phẩm': 'SP001',
        'Hình thức xuất': 'Xuất bán hàng tại siêu thị',
        ...overrides,
    });

    it('revenue luôn bằng đúng Giá bán_1, không phụ thuộc hệ số', () => {
        const config = emptyConfig();
        const { revenue } = calculateRowMetrics(baseRow({ 'Giá bán_1': 12345 }), config);
        expect(revenue).toBe(12345);
    });

    it('revenueQD = revenue * hệ số khi không phải trả góp', () => {
        const config = emptyConfig();
        config.childToParentMap = { pk1: 'Phụ kiện' }; // hệ số 3.37
        const { revenueQD, isTraCham } = calculateRowMetrics(baseRow(), config);
        expect(isTraCham).toBe(false);
        expect(revenueQD).toBeCloseTo(1000 * 3.37, 6);
    });

    it('đơn trả góp được CỘNG THÊM 30% doanh thu thực vào DTQĐ', () => {
        const config = emptyConfig();
        config.childToParentMap = { pk1: 'Phụ kiện' };
        const row = baseRow({ 'Hình thức xuất': 'Xuất bán hàng trả góp tại siêu thị' });
        const { revenue, revenueQD, isTraCham } = calculateRowMetrics(row, config);
        expect(isTraCham).toBe(true);
        expect(revenueQD).toBeCloseTo(revenue * 3.37 + revenue * 0.3, 6);
    });

    it('Hệ số theo Mã sản phẩm là hệ số của SỐ LƯỢNG (Weighted Quantity), KHÔNG PHẢI doanh thu', () => {
        const config = emptyConfig();
        config.childToParentMap = { vas1: 'ICT' }; // Hệ số ngành ICT = 1.0
        config.quantityMultiplierMap = {
            '1640571000003': 1, // VieON VIP 1T: hệ số 1
            '1640571000004': 2, // VieON VIP 3T: hệ số 2
        };

        // Bán gói 1T SL 1 => tính số lượng là 1
        const row1 = baseRow({
            'Nhóm Hàng': 'vas1',
            'Mã sản phẩm': '1640571000003',
            'Tên Sản Phẩm': 'VieON VIP_01 tháng',
            'Số Lượng': 1,
            'Giá bán_1': 69000,
        });
        const m1 = calculateRowMetrics(row1, config);
        expect(m1.weightedQuantity).toBe(1);
        expect(m1.revenueQD).toBe(69000); // Không nhân hệ số số lượng vào doanh thu

        // Bán gói 3T SL 1 => tính số lượng là 2
        const row2 = baseRow({
            'Nhóm Hàng': 'vas1',
            'Mã sản phẩm': '1640571000004',
            'Tên Sản Phẩm': 'VieON VIP_03 tháng',
            'Số Lượng': 1,
            'Giá bán_1': 199000,
        });
        const m2 = calculateRowMetrics(row2, config);
        expect(m2.weightedQuantity).toBe(2);
        expect(m2.revenueQD).toBe(199000); // Doanh thu quy đổi không bị nhân x2
    });

    it('VieON fallback theo tên: 01 tháng (hs 1), 03 tháng (hs 2), 06 tháng (hs 4), 12 tháng (hs 8)', () => {
        const config = emptyConfig();
        const row12M = baseRow({
            'Tên Sản Phẩm': 'VieON VIP_12 tháng',
            'Số Lượng': 2,
        });
        const { weightedQuantity } = calculateRowMetrics(row12M, config);
        expect(weightedQuantity).toBe(2 * 8); // 2 gói * hệ số 8 = 16
    });

    it('Hệ số doanh thu theo Mã sản phẩm được áp dụng vào revenueQD khi có cấu hình trong revenueMultiplierMap', () => {
        const config = emptyConfig();
        config.childToParentMap = { pk1: 'Phụ kiện' }; // Hệ số nhóm cha mặc định là 3.37
        config.revenueMultiplierMap = {
            'SP_VIP_001': 2.5, // Mã sản phẩm này được gán riêng hệ số DT = 2.5
        };

        const row = baseRow({
            'Nhóm Hàng': 'pk1',
            'Mã sản phẩm': 'SP_VIP_001',
            'Giá bán_1': 100000,
            'Số Lượng': 1,
        });

        const metrics = calculateRowMetrics(row, config);
        // Ưu tiên hệ số doanh thu theo mã sản phẩm (2.5 thay vì 3.37)
        expect(metrics.revenueQD).toBe(100000 * 2.5);
    });

    it('không có productConfig vẫn tính được (fallback về logic cũ, không throw)', () => {
        expect(() => calculateRowMetrics(baseRow(), null)).not.toThrow();
    });
});

describe('isValidSalesRow — điều kiện "dòng tính doanh thu hợp lệ" dùng cho MỌI KPI', () => {
    const validRow = (overrides: Record<string, unknown> = {}) => ({
        'Trạng thái thu tiền': 'Đã thu',
        'Nhóm Hàng': 'pk1',
        'Hình thức xuất': 'Xuất bán hàng tại siêu thị',
        ...overrides,
    });

    it('chỉ true khi Trạng thái thu tiền = "Đã thu"', () => {
        const config = emptyConfig();
        config.childToParentMap = { pk1: 'Phụ kiện' };
        expect(isValidSalesRow(validRow(), config)).toBe(true);
        expect(isValidSalesRow(validRow({ 'Trạng thái thu tiền': 'Chưa thu' }), config)).toBe(false);
    });

    it('loại trừ nhóm hàng "Không tính doanh thu"', () => {
        const config = emptyConfig();
        config.childToParentMap = { khac1: 'Không tính doanh thu' };
        expect(isValidSalesRow(validRow({ 'Nhóm Hàng': 'khac1' }), config)).toBe(false);
    });

    it('có revenueEligibleHTX thì CHỈ những HTX trong danh sách đó mới hợp lệ', () => {
        const config = emptyConfig();
        config.childToParentMap = { pk1: 'Phụ kiện' };
        config.revenueEligibleHTX = new Set(['xuất bán hàng tại siêu thị']);
        expect(isValidSalesRow(validRow(), config)).toBe(true);
        expect(isValidSalesRow(validRow({ 'Hình thức xuất': 'Xuất dịch vụ thu hộ cước Payoo' }), config)).toBe(false);
    });

    it('không có revenueEligibleHTX thì fallback: hợp lệ trừ khi nằm trong danh sách "thu hộ"', () => {
        const config = emptyConfig();
        config.childToParentMap = { pk1: 'Phụ kiện' };
        expect(isValidSalesRow(validRow(), config)).toBe(true);
        expect(isValidSalesRow(validRow({ 'Hình thức xuất': 'Xuất dịch vụ thu hộ cước Payoo' }), config)).toBe(false);
    });
});

describe('isUncollectedOrder — điều kiện "đơn chưa thu tiền cần theo dõi"', () => {
    const uncollectedRow = (overrides: Record<string, unknown> = {}) => ({
        'Trạng thái thu tiền': 'Chưa thu',
        'Trạng thái xuất': 'Chưa xuất',
        'Trạng thái giao hàng': 'Chưa giao',
        'Trạng thái hủy': 'Chưa hủy',
        'Nhóm Hàng': 'pk1',
        'Hình thức xuất': 'Xuất bán hàng tại siêu thị',
        ...overrides,
    });

    it('đủ cả 3 điều kiện trạng thái (chưa xuất/chưa giao/chưa hủy) mới true', () => {
        const config = emptyConfig();
        config.childToParentMap = { pk1: 'Phụ kiện' };
        expect(isUncollectedOrder(uncollectedRow(), config)).toBe(true);
        expect(isUncollectedOrder(uncollectedRow({ 'Trạng thái xuất': 'Đã xuất' }), config)).toBe(false);
        expect(isUncollectedOrder(uncollectedRow({ 'Trạng thái giao hàng': 'Đã giao' }), config)).toBe(false);
        expect(isUncollectedOrder(uncollectedRow({ 'Trạng thái hủy': 'Đã hủy' }), config)).toBe(false);
    });

    it('chấp nhận cả 2 cách viết "chưa hủy"/"chưa huỷ"', () => {
        const config = emptyConfig();
        config.childToParentMap = { pk1: 'Phụ kiện' };
        expect(isUncollectedOrder(uncollectedRow({ 'Trạng thái hủy': 'Chưa huỷ' }), config)).toBe(true);
    });

    it('KHÔNG chuẩn hoá hoa/thường khi so khớp fallback tĩnh — khác isValidSalesRow (phát hiện khi viết test, chưa xác nhận có phải chủ ý)', () => {
        // isValidSalesRow (ở trên) so khớp qua cleanAndNormalize() nên không nhạy hoa/thường.
        // isUncollectedOrder khi KHÔNG có productConfig.revenueEligibleHTX lại so trực tiếp với
        // hằng số HINH_THUC_XUAT_TIEN_MAT/HINH_THUC_XUAT_TRA_GOP (case-sensitive) trên giá trị
        // CHƯA cleanAndNormalize — một biến thể hoa/thường thật trong dữ liệu Excel (phổ biến)
        // sẽ rơi vào 'false' ở đây dù isValidSalesRow coi là hợp lệ. Ghi lại đúng hành vi HIỆN TẠI,
        // không tự sửa (ngoài phạm vi Đợt 0) — xem KE_HOACH_TONG_THE.md, cần hỏi lại người dùng.
        const config = emptyConfig();
        config.childToParentMap = { pk1: 'Phụ kiện' };
        const lowerCaseRow = uncollectedRow({ 'Hình thức xuất': 'xuất bán hàng tại siêu thị' });
        expect(isUncollectedOrder(lowerCaseRow, config)).toBe(false);
    });

    it('có revenueEligibleHTX thì so khớp CÓ chuẩn hoá (nhất quán với isValidSalesRow)', () => {
        const config = emptyConfig();
        config.childToParentMap = { pk1: 'Phụ kiện' };
        config.revenueEligibleHTX = new Set(['xuất bán hàng tại siêu thị']);
        const lowerCaseRow = uncollectedRow({ 'Hình thức xuất': 'XUẤT BÁN HÀNG TẠI SIÊU THỊ' });
        expect(isUncollectedOrder(lowerCaseRow, config)).toBe(true);
    });
});

describe('formatCleanDisplayName', () => {
    it('trả về fallback mặc định khi tên rỗng hoặc null', () => {
        expect(formatCleanDisplayName(null)).toBe('Thành viên YCX');
        expect(formatCleanDisplayName('')).toBe('Thành viên YCX');
        expect(formatCleanDisplayName('   ')).toBe('Thành viên YCX');
    });

    it('loại bỏ phần ngoặc đơn lặp lại tên người dùng (MT2 - AM - SƠN (MT2 - AM - SƠN 21707))', () => {
        expect(formatCleanDisplayName('MT2 - AM - SƠN (MT2 - AM - SƠN 21707)')).toBe('MT2 - AM - SƠN');
    });

    it('loại bỏ phần ngoặc đơn khi nội dung bên trong trùng khớp hoàn toàn', () => {
        expect(formatCleanDisplayName('Nguyễn Văn A (Nguyễn Văn A)')).toBe('Nguyễn Văn A');
    });

    it('giữ nguyên mã số khi phần trong ngoặc không lặp lại tên', () => {
        expect(formatCleanDisplayName('Trần Văn B (12345)')).toBe('Trần Văn B (12345)');
    });

    it('xử lý chuỗi lặp qua dấu gạch ngang (Sơn Lê - Sơn Lê)', () => {
        expect(formatCleanDisplayName('Sơn Lê - Sơn Lê')).toBe('Sơn Lê');
    });
});


describe('Audit D15 — đọc số/ngày kiểu Việt Nam', () => {
    it('dấu phẩy thập phân', () => {
        expect(parseNumber('45,5%')).toBe(45.5);
        expect(parseNumber('12,5')).toBe(12.5);
        expect(parseNumber('12,50')).toBe(12.5);
        expect(parseNumber('1.234,56')).toBe(1234.56);
    });
    it('dạng ngàn quen thuộc giữ nguyên', () => {
        expect(parseNumber('1,234,567')).toBe(1234567);
        expect(parseNumber('1,234')).toBe(1234);
        expect(parseNumber('1,234.5')).toBe(1234.5);
        expect(parseNumber('1.234.567')).toBe(1234567);
        expect(parseNumber('+1,200')).toBe(1200);
        expect(parseNumber('0.5')).toBe(0.5);
    });
    it('ngày không tồn tại trả null, ngày hợp lệ giữ nguyên', () => {
        expect(parseExcelDate('31/02/2026')).toBeNull();
        expect(parseExcelDate('29/02/2024')?.getDate()).toBe(29);
        expect(parseExcelDate('28/02/2026 10:30')?.getMonth()).toBe(1);
    });
});

describe('getRowPrice & Fallback giá bán — Khắc phục file import chỉ có 1 cột giá', () => {
    it('đọc giá từ khoá ngắn gia khi có sẵn', () => {
        const row = { gia: 15000000 };
        expect(getRowPrice(row)).toBe(15000000);
    });

    it('fallback tự động sang giaGoc khi row chỉ có giaGoc (file Excel chỉ có cột Giá bán)', () => {
        const row = { giaGoc: 12500000 };
        expect(getRowPrice(row)).toBe(12500000);
        // getRowValue(row, COL.PRICE) cũng phải fallback sang giaGoc
        expect(getRowValue(row, COL.PRICE)).toBe(12500000);
    });

    it('fallback tự động sang gia khi hỏi original price mà row chỉ có gia', () => {
        const row = { gia: 8000000 };
        expect(getRowPrice(row, 'original')).toBe(8000000);
        expect(getRowValue(row, COL.ORIGINAL_PRICE)).toBe(8000000);
    });

    it('ưu tiên đúng gia và giaGoc khi row có cả 2', () => {
        const row = { gia: 9000000, giaGoc: 10000000 };
        expect(getRowPrice(row, 'discounted')).toBe(9000000);
        expect(getRowPrice(row, 'original')).toBe(10000000);
        expect(getRowValue(row, COL.PRICE)).toBe(9000000);
        expect(getRowValue(row, COL.ORIGINAL_PRICE)).toBe(10000000);
    });

    it('hỗ trợ row tiếng Việt cũ chỉ có "Giá bán" (không có "Giá bán_1")', () => {
        const row = { 'Giá bán': 5500000 };
        expect(getRowPrice(row)).toBe(5500000);
        expect(getRowValue(row, COL.PRICE)).toBe(5500000);
    });

    it('hỗ trợ biến thể "Thành tiền", "Doanh thu", "Giá bán 1" cho COL.PRICE', () => {
        expect(getRowValue({ 'Thành tiền': 3000000 }, COL.PRICE)).toBe(3000000);
        expect(getRowValue({ 'Doanh thu': 4000000 }, COL.PRICE)).toBe(4000000);
        expect(getRowValue({ 'Giá bán 1': 5000000 }, COL.PRICE)).toBe(5000000);
    });

    it('parse chuỗi số định dạng tiền tệ Việt Nam thành number hợp lệ', () => {
        expect(getRowPrice({ gia: '1.250.000' })).toBe(1250000);
        expect(getRowPrice({ 'Giá bán': ' 15.000.000 ₫ ' })).toBe(15000000);
    });

    it('calculateRowMetrics tính đúng doanh thu và DTQĐ khi row chỉ có giaGoc (fix lỗi DTQĐ hiển thị "-")', () => {
        const row = {
            giaGoc: 10000000,
            sl: 1,
            nhomHang: 'pk1',
        };
        const config = emptyConfig();
        config.childToParentMap = { pk1: 'Phụ kiện' };
        const metrics = calculateRowMetrics(row, config);
        expect(metrics.revenue).toBe(10000000);
        expect(metrics.revenueQD).toBeCloseTo(33700000, 2);
    });
});

