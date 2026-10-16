import { describe, expect, it } from 'vitest';
import {
    filterAnalysisEmployeesForSupermarket,
    getEmployeesFromAnalysis,
    getDepartmentsFromAnalysis
} from '../../features/bi-dashboard/services/employeeParser';
import {
    convertDepartmentMapToEmployees,
    normalizeAnalysisEmployees,
    AnalysisEmployeeItem
} from '../../features/bi-dashboard/services/analysisEmployeeSyncService';

describe('Target chia theo nhân viên từng siêu thị (không chia gộp cả cụm)', () => {
    // 30 nhân viên từ 3 file của chức năng Phân tích (mỗi file 10 nhân viên)
    const analysis30Employees: AnalysisEmployeeItem[] = Array.from({ length: 30 }, (_, i) => {
        const id = (1000 + i).toString();
        const storeNum = Math.floor(i / 10) + 1; // 1, 2, 3
        const maKho = storeNum === 1 ? '8831' : storeNum === 2 ? '8832' : '8833';
        return {
            id,
            name: `Nhân viên ${id}`,
            originalName: `${id} - Nhân viên ${id}`,
            department: 'BP ALL IN ONE - ĐMX',
            maKho
        };
    });

    // Dữ liệu "Nhân viên Luỹ kế" được cập nhật ở Report BI > Cập nhật > CẤU HÌNH SIÊU THỊ & NHÂN VIÊN > [Siêu Thị] > Nhân viên Luỹ kế
    // Siêu thị Trường Xuân chỉ có 5 nhân viên (từ id 1020 đến 1024)
    const truongXuanStoreLuyKe = `
1020 - Nhân viên 1020	150.0	BP ALL IN ONE - ĐMX
1021 - Nhân viên 1021	180.0	BP ALL IN ONE - ĐMX
1022 - Nhân viên 1022	210.0	BP ALL IN ONE - ĐMX
1023 - Nhân viên 1023	190.0	BP ALL IN ONE - ĐMX
1024 - Nhân viên 1024	220.0	BP ALL IN ONE - ĐMX
`;

    it('1. Lọc đúng 5 nhân viên của siêu thị Trường Xuân từ tổng 30 nhân viên theo dữ liệu Luỹ kế', () => {
        const filtered = filterAnalysisEmployeesForSupermarket(
            analysis30Employees,
            truongXuanStoreLuyKe,
            [],
            'Trường Xuân'
        );

        expect(filtered.length).toBe(5);
        expect(filtered.map(e => e.id)).toEqual(['1020', '1021', '1022', '1023', '1024']);
    });

    it('2. Tính Target chia theo đầu người đúng cho 5 nhân viên của siêu thị (không chia cho 15 hay 30)', () => {
        const depts = getDepartmentsFromAnalysis(
            analysis30Employees,
            truongXuanStoreLuyKe,
            [],
            'Trường Xuân'
        );

        expect(depts.length).toBe(1);
        expect(depts[0].employeeCount).toBe(5);

        // Với Target DTQĐ là 9.279,4Tr:
        // Nếu chia sai cho 15 người: 9.279,4 / 15 = 618,6Tr/người (như ảnh lỗi của người dùng)
        // Khi chia đúng cho 5 người của siêu thị: 9.279,4 / 5 = 1.855,88Tr/người
        const targetDTQD = 9279.4;
        const totalEmployees = depts.reduce((s, d) => s + d.employeeCount, 0);
        expect(totalEmployees).toBe(5);

        const perPerson = targetDTQD / totalEmployees;
        expect(Number(perPerson.toFixed(2))).toBe(1855.88);
        expect(Number((targetDTQD / 15).toFixed(1))).toBe(618.6); // Khẳng định 618.6 là do chia cho 15 người
    });

    it('3. Nhận diện nhân viên theo Mã kho (chỉ cho phép số)', () => {
        // Siêu thị Thới Lai có mã kho 8831 (10 nhân viên đầu)
        const filteredKho = filterAnalysisEmployeesForSupermarket(
            analysis30Employees,
            '', // Chưa dán dữ liệu Luỹ kế
            [],
            'Thới Lai',
            { 'Thới Lai': '8831' }
        );

        expect(filteredKho.length).toBe(10);
        expect(filteredKho.every(e => e.maKho === '8831')).toBe(true);
    });

    it('4. convertDepartmentMapToEmployees đọc và lưu mã kho chuẩn (chỉ số, loại bỏ chữ/khoảng cách)', () => {
        const map = {
            '1001': 'BP ALL IN ONE - ĐMX;;Nguyễn Văn A;;8833',
            '1002': 'BP ALL IN ONE - ĐMX;;Trần Thị B;;kho 8833 ', // Có chữ và khoảng trắng
            '1003': 'BP ALL IN ONE - ĐMX;;Lê Văn C', // Không có mã kho (tương thích ngược)
        };

        const converted = convertDepartmentMapToEmployees(map);
        expect(converted.find(e => e.id === '1001')?.maKho).toBe('8833');
        expect(converted.find(e => e.id === '1002')?.maKho).toBe('8833');
        expect(converted.find(e => e.id === '1003')?.maKho).toBeUndefined();
    });

    it('5. Khi xem Tổng/Tổng hợp thì giữ lại toàn bộ nhân viên hợp lệ', () => {
        const all = filterAnalysisEmployeesForSupermarket(
            analysis30Employees,
            truongXuanStoreLuyKe,
            [],
            'Tổng'
        );
        expect(all.length).toBe(30);
    });

    it('6. Lấy danh sách nhân viên từ Phân tích theo Mã kho để cấu hình target', () => {
        // Kho 8831 có 10 nhân viên (id 1000..1009)
        // Kể cả khi có danh sách luỹ kế lẫn lộn, hệ thống lấy đúng 10 nhân viên thuộc mã kho 8831
        const mixedLuyKe = `
1000 - Nhân viên 1000	150.0	BP ALL IN ONE - ĐMX
1015 - Nhân viên 1015	180.0	BP ALL IN ONE - ĐMX
`;
        const filtered = filterAnalysisEmployeesForSupermarket(
            analysis30Employees,
            mixedLuyKe,
            [],
            'Siêu thị 8831',
            { 'Siêu thị 8831': '8831' }
        );
        expect(filtered.length).toBe(10);
        expect(filtered.every(e => e.maKho === '8831')).toBe(true);
        expect(filtered.some(e => e.id === '1015')).toBe(false); // 1015 thuộc kho 8832 nên không lọt vào
    });
});

