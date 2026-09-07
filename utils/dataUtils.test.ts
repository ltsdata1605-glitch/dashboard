import { describe, it, expect } from 'vitest';
import type { ProductConfig } from '../types';
import { COL } from '../constants';
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

    it('vasNameMultiplierMap khớp theo TÊN sản phẩm được ưu tiên trước NhomCha', () => {
        const config = emptyConfig();
        config.childToParentMap = { 'pk1': 'Phụ kiện' }; // sẽ cho 3.37 nếu không có override
        config.vasNameMultiplierMap = { 'Gói VAS đặc biệt': 7 };
        expect(getHeSoQuyDoi('', 'pk1', config, 'Gói VAS đặc biệt')).toBe(7);
    });

    it('quantityMultiplierMap theo MÃ sản phẩm được ưu tiên cao nhất', () => {
        const config = emptyConfig();
        config.childToParentMap = { 'pk1': 'Phụ kiện' };
        config.quantityMultiplierMap = { 'SP001': 2.5 };
        expect(getHeSoQuyDoi('', 'pk1', config, 'Tên bất kỳ', 'SP001')).toBe(2.5);
    });
});

describe('calculateRowMetrics — nguồn chân lý duy nhất cho DTQĐ (CLAUDE.md mục 1)', () => {
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

    it('weightedQuantity dùng quantityMultiplierMap theo mã sản phẩm khi ngành KHÔNG PHẢI bảo hiểm', () => {
        const config = emptyConfig();
        config.childToParentMap = { pk1: 'Phụ kiện' };
        config.quantityMultiplierMap = { SP001: 4 };
        const { weightedQuantity } = calculateRowMetrics(baseRow({ 'Số Lượng': 2 }), config);
        expect(weightedQuantity).toBe(2 * 4);
    });

    it('BẢO HIỂM bỏ qua quantityMultiplierMap dù có cấu hình (tránh nhân đôi hệ số)', () => {
        const config = emptyConfig();
        config.childToParentMap = { bh1: 'Bảo hiểm' };
        config.quantityMultiplierMap = { SP001: 4 }; // phải bị bỏ qua vì industry === 'Bảo hiểm'
        const row = baseRow({ 'Nhóm Hàng': 'bh1', 'Số Lượng': 3 });
        const { weightedQuantity } = calculateRowMetrics(row, config);
        expect(weightedQuantity).toBe(3); // = quantity thô, không nhân hệ số
    });

    it('VieON dùng weightedQuantity = quantity * hệ số (không phải quantity thô)', () => {
        // Không cấu hình quantityMultiplierMap/vasMultiplierMap cho SP001 — qtyMultiplier sẽ
        // undefined. Với sản phẩm THƯỜNG (không VieON), weightedQuantity khi đó = quantity thô
        // (nhánh `: quantity`). VieON đi nhánh khác: LUÔN nhân với heso NhomCha (Phụ kiện = 3.37),
        // nên 2 kết quả phải khác nhau dù cùng 1 cấu hình — đây là điều cần chứng minh, không phải
        // suy luận từ đọc code.
        const config = emptyConfig();
        config.childToParentMap = { vieon1: 'Phụ kiện' };
        config.childToSubgroupMap = { vieon1: 'Vieon' };

        const vieonRow = baseRow({ 'Nhóm Hàng': 'vieon1', 'Số Lượng': 2 });
        const { weightedQuantity: vieonQty } = calculateRowMetrics(vieonRow, config);
        expect(vieonQty).toBeCloseTo(2 * 3.37, 6);

        const normalConfig = emptyConfig();
        normalConfig.childToParentMap = { pk2: 'Phụ kiện' }; // cùng hệ số, KHÔNG phải VieON
        const normalRow = baseRow({ 'Nhóm Hàng': 'pk2', 'Số Lượng': 2 });
        const { weightedQuantity: normalQty } = calculateRowMetrics(normalRow, normalConfig);
        expect(normalQty).toBe(2); // quantity thô, không nhân hệ số
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
