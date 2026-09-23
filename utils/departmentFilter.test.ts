import { describe, expect, it } from 'vitest';
import { isAllInOneDepartment, keepOnlyAllInOne } from './departmentFilter';

describe('isAllInOneDepartment', () => {
    it('nhận mọi cách viết của BP All In One', () => {
        expect(isAllInOneDepartment('BP All In One')).toBe(true);
        expect(isAllInOneDepartment('BP ALL IN ONE - DMX')).toBe(true);
        expect(isAllInOneDepartment('BP All In One - ĐMX')).toBe(true);
        expect(isAllInOneDepartment('BP All-In-One (ĐMX)')).toBe(true);
        expect(isAllInOneDepartment('bp allinone')).toBe(true);
    });

    it('loại các bộ phận khác', () => {
        expect(isAllInOneDepartment('BP Bảo Vệ')).toBe(false);
        expect(isAllInOneDepartment('BP Kho')).toBe(false);
        expect(isAllInOneDepartment('BP Quản Lý Siêu Thị')).toBe(false);
        expect(isAllInOneDepartment('BP Tiếp Đón')).toBe(false);
        expect(isAllInOneDepartment('')).toBe(false);
        expect(isAllInOneDepartment(undefined)).toBe(false);
    });
});

describe('keepOnlyAllInOne', () => {
    it('giữ đúng nhân viên All In One, báo rõ số bị bỏ qua', () => {
        const res = keepOnlyAllInOne({
            '101': 'BP All In One - ĐMX;;101 - Nguyễn Văn A',
            '102': 'BP ALL IN ONE - DMX;;102 - Trần Thị B',
            '201': 'BP Bảo Vệ;;201 - Lê Văn C',
            '202': 'BP Kho;;202 - Phạm Thị D',
            '203': 'BP Kho;;203 - Hoàng Văn E',
        });

        expect(Object.keys(res.map).sort()).toEqual(['101', '102']);
        expect(res.keptCount).toBe(2);
        expect(res.skippedCount).toBe(3);
        expect(res.skippedDepartments).toEqual(['BP Bảo Vệ', 'BP Kho']);
    });

    it('map rỗng hoặc null không làm vỡ', () => {
        expect(keepOnlyAllInOne(null).keptCount).toBe(0);
        expect(keepOnlyAllInOne({}).skippedCount).toBe(0);
    });
});
