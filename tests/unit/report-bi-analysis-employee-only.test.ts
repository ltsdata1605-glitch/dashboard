import { describe, expect, it } from 'vitest';
import {
    convertDepartmentMapToEmployees,
    normalizeAnalysisEmployees,
    docAnalysisEmployeesPayload
} from '../../features/bi-dashboard/services/analysisEmployeeSyncService';

describe('Report BI - Danh sách nhân viên đồng bộ từ Phân Tích', () => {
    it('convertDepartmentMapToEmployees chuyển đổi chính xác từ departmentMap 40 nhân viên', () => {
        const mockDeptMap: Record<string, string> = {
            '7587': 'BP All In One - ĐMX;;7587 - Nguyễn Thị Túy',
            '15447': 'BP All In One - ĐMX;;15447 - Đinh Đăng Khoa',
            '15887': 'BP All In One - ĐMX;;15887 - Thạch Ngọc Phụng',
            '17952': 'BP All In One - ĐMX;;17952 - Đinh Thị Mỹ Hương',
        };

        const rawList = convertDepartmentMapToEmployees(mockDeptMap);
        expect(rawList).toHaveLength(4);
        expect(rawList[0].department).toBe('BP All In One - ĐMX');
        expect(rawList[0].name).toBe('7587 - Nguyễn Thị Túy');

        const cleanList = normalizeAnalysisEmployees(rawList);
        expect(cleanList).toHaveLength(4);
        expect(cleanList.map(e => e.id)).toEqual(['7587', '15447', '15887', '17952']);
    });

    it('loại trừ nhân viên không hợp lệ hoặc tài khoản hệ thống từ Phân Tích', () => {
        const mockDeptMap: Record<string, string> = {
            '7587': 'BP All In One - ĐMX;;Nguyễn Thị Túy',
            'MWG01': 'BP All In One - ĐMX;;MWG Quản Trị',
            '999': 'Chưa xác định;;Người lạ',
            '888': 'Kho Siêu Thị;;Lê Văn D',
        };

        const rawList = convertDepartmentMapToEmployees(mockDeptMap);
        const cleanList = normalizeAnalysisEmployees(rawList);
        expect(cleanList).toHaveLength(2);
        expect(cleanList.map(e => e.id).sort()).toEqual(['7587', '888'].sort());
    });

    it('docAnalysisEmployeesPayload chỉ lấy nhân viên có bộ phận được khai báo, loại bỏ Chưa xác định', () => {
        const payloadWithUnassigned = {
            schemaVersion: 1,
            source: 'phan-tich',
            updatedAt: Date.now(),
            totalCount: 3,
            employees: [
                { id: '7587', name: '7587 - Nguyễn Thị Túy', originalName: '7587 - Nguyễn Thị Túy', department: 'BP All In One - ĐMX' },
                { id: '19307', name: '19307 - Lê Thị Hoàng Duyên', originalName: '19307 - Lê Thị Hoàng Duyên', department: 'Chưa xác định' },
                { id: '21453', name: '21453 - Vương Nhựt Trường', originalName: '21453 - Vương Nhựt Trường', department: '' },
            ]
        };

        const result = docAnalysisEmployeesPayload(payloadWithUnassigned);
        expect(result).not.toBeNull();
        expect(result?.employees).toHaveLength(1);
        expect(result?.employees[0].id).toBe('7587');
        expect(result?.totalCount).toBe(1);
    });
});
