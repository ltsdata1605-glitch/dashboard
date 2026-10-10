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

    it('getDepartmentsFromAnalysis phân bổ vào các phòng ban theo khai báo từ Phân Tích', () => {
        const multiDeptAnalysis: AnalysisEmployeeItem[] = [
            { id: '101', name: 'Nguyễn Văn A', originalName: '101 - Nguyễn Văn A', department: 'BP Bán Hàng' },
            { id: '102', name: 'Trần Thị B', originalName: '102 - Trần Thị B', department: 'BP Thu Ngân' },
            { id: '103', name: 'Lê Văn C', originalName: '103 - Lê Văn C', department: 'BP Thu Ngân' },
        ];

        const depts = getDepartmentsFromAnalysis(multiDeptAnalysis, '', []);
        expect(depts).toHaveLength(2);
        expect(depts.find(d => d.name === 'BP Bán Hàng')?.employeeCount).toBe(1);
        expect(depts.find(d => d.name === 'BP Thu Ngân')?.employeeCount).toBe(2);
    });

    it('getDepartmentsFromAnalysis fallback an toàn khi báo cáo thô trống', () => {
        const depts = getDepartmentsFromAnalysis(mockAnalysisEmployees, '', []);
        expect(depts).toHaveLength(1);
        expect(depts[0].employeeCount).toBe(3);
    });

    it('loại trừ nhân viên có phòng ban Chưa xác định hoặc không phân ca', () => {
        const withUnassigned: AnalysisEmployeeItem[] = [
            ...mockAnalysisEmployees,
            { id: '17950', name: 'Lâm Thị Thảo Sương', originalName: '17950 - Lâm Thị Thảo Sương', department: 'Chưa xác định' },
            { id: '21453', name: 'Vương Nhựt Trường', originalName: '21453 - Vương Nhựt Trường', department: 'Không Phân Ca' }
        ];

        const emps = getEmployeesFromAnalysis(withUnassigned);
        expect(emps).toHaveLength(3);
        expect(emps.map(e => e.originalName)).not.toContain('17950 - Lâm Thị Thảo Sương');
        expect(emps.map(e => e.originalName)).not.toContain('21453 - Vương Nhựt Trường');

        const depts = getDepartmentsFromAnalysis(withUnassigned, '', []);
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

/**
 * DANH SÁCH NHÂN VIÊN CHỈ LẤY TỪ BÁO CÁO PHÂN TÍCH (FILE YCX).
 * Không lấy hoặc lọc theo "Dữ liệu Luỹ Kế Doanh Thu".
 */
describe('Danh sách nhân viên chỉ lấy từ Báo cáo Phân Tích (file YCX)', () => {
    const analysis: AnalysisEmployeeItem[] = [
        { id: '101', name: 'Nguyễn Văn A', originalName: '101 - Nguyễn Văn A', department: 'BP ALL IN ONE - DMX' },
        { id: '102', name: 'Trần Thị B', originalName: '102 - Trần Thị B', department: 'BP ALL IN ONE - DMX' },
        { id: '103', name: 'Lê Văn C', originalName: '103 - Lê Văn C', department: 'BP ALL IN ONE - DMX' },
        { id: '104', name: 'Phạm Thị D', originalName: '104 - Phạm Thị D', department: 'BP ALL IN ONE - DMX' },
    ];

    const luyKeTanHiep = [
        'BP ALL IN ONE - DMX\t\t',
        '101 - Nguyễn Văn A\t10,000,000\t100',
        '102 - Trần Thị B\t8,000,000\t80',
        '900 - Người Siêu Thị Khác\t5,000,000\t50',
    ].join('\n');

    it('không bị lọc theo dữ liệu luỹ kế doanh thu dán thô, lấy toàn bộ danh sách Phân Tích', () => {
        const emps = getEmployeesFromAnalysis(analysis, [], luyKeTanHiep);
        expect(emps).toHaveLength(4);
        expect(emps.map(e => e.originalName)).toEqual([
            '101 - Nguyễn Văn A',
            '102 - Trần Thị B',
            '103 - Lê Văn C',
            '104 - Phạm Thị D'
        ]);
    });

    it('người lạ trong báo cáo luỹ kế không bao giờ được thêm vào', () => {
        const names = getEmployeesFromAnalysis(analysis, [], luyKeTanHiep).map(e => e.originalName);
        expect(names.some(n => n.includes('Người Siêu Thị Khác'))).toBe(false);
    });

    it('số NV theo bộ phận cũng lấy từ Phân Tích, không phụ thuộc báo cáo luỹ kế', () => {
        expect(getDepartmentsFromAnalysis(analysis, luyKeTanHiep, [])[0].employeeCount).toBe(4);
    });

    it('nhân viên bị ẩn vẫn bị loại khỏi danh sách', () => {
        const names = getEmployeesFromAnalysis(analysis, ['101 - Nguyễn Văn A'], luyKeTanHiep).map(e => e.originalName);
        expect(names).toEqual(['102 - Trần Thị B', '103 - Lê Văn C', '104 - Phạm Thị D']);
    });

    it('khi không truyền báo cáo luỹ kế hoặc truyền chuỗi rỗng: vẫn lấy đủ danh sách Phân Tích', () => {
        expect(getEmployeesFromAnalysis(analysis, [], '')).toHaveLength(4);
    });
});
