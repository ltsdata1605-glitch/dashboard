import { describe, it, expect } from 'vitest';
import { getEmployeesFromAnalysis, getDepartmentsFromAnalysis } from './employeeParser';
import type { AnalysisEmployeeItem } from './analysisEmployeeSyncService';
import { extractEmployeeId } from '../utils/nhanVienHelpers';

describe('employeeParser - Analysis Employees Priority', () => {
    const mockAnalysisEmployees: AnalysisEmployeeItem[] = [
        { id: '101', name: 'Nguyễn Văn A', originalName: '101 - Nguyễn Văn A', department: 'BP ALL IN ONE - DMX' },
        { id: '102', name: 'Trần Thị B', originalName: '102 - Trần Thị B', department: 'BP ALL IN ONE - DMX' },
        { id: '103', name: 'Lê Văn C', originalName: '103 - Lê Văn C', department: 'BP ALL IN ONE - DMX' },
    ];

    it('getEmployeesFromAnalysis trả về đúng danh sách và lọc bỏ hiddenEmployees', () => {
        const result = getEmployeesFromAnalysis(mockAnalysisEmployees, ['102 - Trần Thị B']);
        expect(result).toHaveLength(2);
        expect(result.map(e => e.originalName)).toEqual(['101 - Nguyễn Văn A', '103 - Lê Văn C']);
    });

    it('getDepartmentsFromAnalysis ưu tiên số lượng nhân viên từ Phân Tích thay vì số lượng trong báo cáo thô', () => {
        // Giả sử báo cáo thô có 5 nhân viên (kể cả 2 nhân viên cũ đã nghỉ)
        const rawReport = [
            'BP ALL IN ONE - DMX\t\t\t',
            '101 - Nguyễn Văn A\t10,000,000\t100',
            '102 - Trần Thị B\t8,000,000\t80',
            '103 - Lê Văn C\t12,000,000\t120',
            '999 - Nhân Viên Cũ 1\t5,000,000\t50',
            '998 - Nhân Viên Cũ 2\t4,000,000\t40',
        ].join('\n');

        const depts = getDepartmentsFromAnalysis(mockAnalysisEmployees, rawReport, []);
        expect(depts).toHaveLength(1);
        expect(depts[0].name).toBe('BP ALL IN ONE - DMX');
        // Chỉ đếm đúng 3 nhân viên trong Phân tích, không lấy 5 nhân viên
        expect(depts[0].employeeCount).toBe(3);
    });

    it('getDepartmentsFromAnalysis phân bổ vào các phòng ban nếu có nhiều phòng ban trong báo cáo thô', () => {
        const multiDeptReport = [
            'BP Bán Hàng\t\t',
            '101 - Nguyễn Văn A\t10,000,000',
            'BP Thu Ngân\t\t',
            '102 - Trần Thị B\t8,000,000',
            '103 - Lê Văn C\t12,000,000',
        ].join('\n');

        const depts = getDepartmentsFromAnalysis(mockAnalysisEmployees, multiDeptReport, []);
        expect(depts).toHaveLength(2);
        expect(depts.find(d => d.name === 'BP Bán Hàng')?.employeeCount).toBe(1);
        expect(depts.find(d => d.name === 'BP Thu Ngân')?.employeeCount).toBe(2);
    });

    it('getDepartmentsFromAnalysis fallback an toàn khi báo cáo thô trống', () => {
        const depts = getDepartmentsFromAnalysis(mockAnalysisEmployees, '', []);
        expect(depts).toHaveLength(1);
        expect(depts[0].employeeCount).toBe(3);
    });
});

describe('extractEmployeeId - Mã số nhân viên', () => {
    it('trích xuất đúng khi chuỗi có dạng "Mã NV - Tên NV" (chuẩn ERP/Phân Tích)', () => {
        expect(extractEmployeeId('195025 - Nguyễn Thị Mỹ Linh')).toBe('195025');
        expect(extractEmployeeId('17952 - Đỗ Thị Mai Hường')).toBe('17952');
        expect(extractEmployeeId('174687 - Huỳnh Thị Mỹ Như')).toBe('174687');
        expect(extractEmployeeId('23522 - Nguyễn Văn Hiệp')).toBe('23522');
    });

    it('trích xuất đúng khi chuỗi có dạng "Tên NV - Mã NV" (chuẩn BI cũ)', () => {
        expect(extractEmployeeId('Nguyễn Thị Mỹ Linh - 195025')).toBe('195025');
        expect(extractEmployeeId('Đỗ Thị Mai Hường - 17952')).toBe('17952');
    });

    it('trích xuất đúng khi chuỗi chứa tiền tố U hoặc nhiều dấu gạch ngang', () => {
        expect(extractEmployeeId('U195025 - Nguyễn Thị Mỹ Linh')).toBe('195025');
        expect(extractEmployeeId('195025 - Nguyễn Thị Mỹ Linh - Kho Siêu Thị')).toBe('195025');
    });

    it('trích xuất đúng khi chuỗi chỉ chứa mã số hoặc chuỗi rỗng', () => {
        expect(extractEmployeeId('195025')).toBe('195025');
        expect(extractEmployeeId('')).toBe('');
        expect(extractEmployeeId('   ')).toBe('');
    });
});

