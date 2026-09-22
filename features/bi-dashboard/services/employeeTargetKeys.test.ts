import { describe, expect, it } from 'vitest';
import { employeeTargetKeys } from './employeeParser';

describe('employeeTargetKeys — khoá tra target theo mọi biến thể tên NV', () => {
    it('"Mã - Tên" (danh sách Phân Tích) sinh thêm dạng chuẩn hoá "Tên - Mã"', () => {
        expect(employeeTargetKeys('106637 - Nguyễn Vũ Minh')).toEqual(['106637 - Nguyễn Vũ Minh', 'Nguyễn Vũ Minh - 106637']);
    });
    it('"Tên - Mã" (danh sách dán tay) sinh thêm dạng "Mã - Tên"', () => {
        expect(employeeTargetKeys('Chế Thị Út - 95970')).toEqual(['Chế Thị Út - 95970', '95970 - Chế Thị Út']);
    });
    it('tên không có mã -> chỉ chính nó', () => {
        expect(employeeTargetKeys('Nguyễn Văn A')).toEqual(['Nguyễn Văn A']);
    });
});
