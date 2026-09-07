import { describe, it, expect } from 'vitest';
import type { DataRow } from '../types';
import type { DepartmentMap } from './dataService';
import {
    isXuatMatch,
    isTrangThaiMatch,
    isNguoiTaoMatch,
    isKhoMatch,
    isDepartmentMatch,
    isDateMatch,
    getCreatorDepartment,
} from './filterService';

/** Lưới an toàn (KE_HOACH_TONG_THE.md đợt 0) cho các predicate lọc dùng chung toàn bộ pipeline
 *  Phân Tích — sai một trong số này là sai TOÀN BỘ báo cáo, không chỉ 1 bảng. */

describe('isXuatMatch', () => {
    it("'all' luôn khớp bất kể giá trị", () => {
        expect(isXuatMatch({ 'Trạng thái xuất': 'Đã xuất' }, 'all')).toBe(true);
    });

    it("giá trị rỗng được coi là 'Chưa'", () => {
        expect(isXuatMatch({}, 'Chưa')).toBe(true);
        expect(isXuatMatch({}, 'Đã')).toBe(false);
    });

    it("phân loại theo có chứa 'đã' hay không (không phân biệt hoa/thường)", () => {
        expect(isXuatMatch({ 'Trạng thái xuất': 'Đã xuất' }, 'Đã')).toBe(true);
        expect(isXuatMatch({ 'Trạng thái xuất': 'Chưa xuất' }, 'Chưa')).toBe(true);
        expect(isXuatMatch({ 'Trạng thái xuất': 'Chưa xuất' }, 'Đã')).toBe(false);
    });
});

describe('isTrangThaiMatch / isNguoiTaoMatch / isKhoMatch — dùng chung 1 khuôn null/rỗng/Set/mảng', () => {
    const row: DataRow = { 'Trạng thái hồ sơ': '1 - Mới', 'Người tạo': '195025 - A', 'Mã kho tạo': '99999' };

    it('null hoặc mảng rỗng = không lọc (khớp tất cả)', () => {
        expect(isTrangThaiMatch(row, null)).toBe(true);
        expect(isTrangThaiMatch(row, [])).toBe(true);
        expect(isNguoiTaoMatch(row, null)).toBe(true);
        expect(isKhoMatch(row, null)).toBe(true);
    });

    it('mảng: khớp đúng giá trị, không khớp giá trị khác', () => {
        expect(isTrangThaiMatch(row, ['1 - Mới'])).toBe(true);
        expect(isTrangThaiMatch(row, ['2 - Khác'])).toBe(false);
        expect(isNguoiTaoMatch(row, ['195025 - A'])).toBe(true);
        expect(isNguoiTaoMatch(row, ['khác'])).toBe(false);
    });

    it('Set hoạt động tương đương mảng (đường nhanh khi filter lớn)', () => {
        expect(isTrangThaiMatch(row, new Set(['1 - Mới']))).toBe(true);
        expect(isTrangThaiMatch(row, new Set(['khác']))).toBe(false);
    });

    it("isKhoMatch: 'all' trong mảng luôn khớp (khác 2 hàm kia — không có case tương đương)", () => {
        expect(isKhoMatch(row, ['all'])).toBe(true);
        expect(isKhoMatch(row, ['88888'])).toBe(false);
        expect(isKhoMatch(row, ['99999'])).toBe(true);
    });
});

describe('isDepartmentMatch', () => {
    const deptMap: DepartmentMap = { '195025': 'Kho A;;metadata khác' };
    const row: DataRow = { 'Người tạo': '195025 - Nguyễn Thị Mỹ Linh' };

    it('null/rỗng = khớp tất cả', () => {
        expect(isDepartmentMatch(row, null, deptMap)).toBe(true);
        expect(isDepartmentMatch(row, [], deptMap)).toBe(true);
    });

    it('tách mã nhân viên trước dấu " - " để tra bộ phận, cắt phần metadata sau ";;"', () => {
        expect(isDepartmentMatch(row, ['Kho A'], deptMap)).toBe(true);
        expect(isDepartmentMatch(row, ['Kho A;;metadata khác'], deptMap)).toBe(false);
    });

    it("không tra được bộ phận thì rơi vào 'Chưa xác định'", () => {
        const unknownRow: DataRow = { 'Người tạo': '000000 - Không rõ' };
        expect(isDepartmentMatch(unknownRow, ['Chưa xác định'], deptMap)).toBe(true);
    });

    it('không có Người tạo thì không khớp bất kỳ filter nào (kể cả rỗng đã xử lý ở trên)', () => {
        expect(isDepartmentMatch({}, ['Kho A'], deptMap)).toBe(false);
    });
});

describe('getCreatorDepartment', () => {
    it('tách mã trước " - " rồi tra departmentMap', () => {
        const map: DepartmentMap = { '195025': 'Kho A' };
        expect(getCreatorDepartment('195025 - Nguyễn Thị Mỹ Linh', map)).toBe('Kho A');
    });

    it('không có dấu " - " thì dùng nguyên chuỗi làm mã', () => {
        const map: DepartmentMap = { 'admin': 'Ban Giám Đốc' };
        expect(getCreatorDepartment('admin', map)).toBe('Ban Giám Đốc');
    });

    it("không tra được thì trả 'Chưa xác định'", () => {
        expect(getCreatorDepartment('999999 - X', {})).toBe('Chưa xác định');
    });
});

describe('isDateMatch', () => {
    const rowInRange = (): DataRow => ({ parsedDate: new Date(2026, 8, 15) }); // 15/09/2026

    it('không có parsedDate hợp lệ thì không khớp', () => {
        expect(isDateMatch({}, null, null)).toBe(false);
        expect(isDateMatch({ parsedDate: new Date('invalid') }, null, null)).toBe(false);
    });

    it('trong khoảng startDate–endDate thì khớp, ngoài khoảng thì không', () => {
        const start = new Date(2026, 8, 1);
        const end = new Date(2026, 8, 30);
        expect(isDateMatch(rowInRange(), start, end)).toBe(true);
        expect(isDateMatch(rowInRange(), new Date(2026, 9, 1), null)).toBe(false);
    });

    it('selectedMonths override khoảng ngày, so theo định dạng "Tháng MM/YYYY"', () => {
        expect(isDateMatch(rowInRange(), null, null, ['Tháng 09/2026'])).toBe(true);
        expect(isDateMatch(rowInRange(), null, null, ['Tháng 08/2026'])).toBe(false);
        // Có selectedMonths thì startDate/endDate bị bỏ qua hoàn toàn, kể cả khi trong khoảng
        expect(isDateMatch(rowInRange(), new Date(2026, 0, 1), new Date(2026, 0, 31), ['Tháng 09/2026'])).toBe(true);
    });
});
