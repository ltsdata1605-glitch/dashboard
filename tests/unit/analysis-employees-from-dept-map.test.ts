import { describe, expect, it } from 'vitest';
import { normalizeAnalysisEmployees } from '../../features/bi-dashboard/services/analysisEmployeeSyncService';

/**
 * Danh sách nhân viên nhập tay ở modal "Quản lý danh sách nhân viên" (departmentMap dạng
 * "mã NV" -> "Bộ phận;;Tên") phải dùng được cho Report BI mà KHÔNG cần file YCX
 * (chủ dự án báo 2026-09-22: cập nhật xong danh sách mà Report BI vẫn trống).
 * Hàm chuyển đổi nằm trong hooks/useDashboardLogic.ts — test ở đây khoá phần chuẩn hoá,
 * thứ quyết định nhân viên nào thực sự vào được Report BI.
 */
const departmentMapToEmployeeList = (map: Record<string, string>) =>
    Object.entries(map || {}).map(([id, raw]) => {
        const [dept, name] = String(raw || '').split(';;');
        const cleanName = (name || '').trim();
        return { name: cleanName ? `${id} - ${cleanName}` : id, department: (dept || '').trim() };
    });

describe('departmentMap -> danh sách nhân viên Report BI', () => {
    it('giữ nhân viên bán hàng, ghép đúng "mã - Tên"', () => {
        const list = normalizeAnalysisEmployees(departmentMapToEmployeeList({
            '107617': 'BP ALL IN ONE - ĐMX;;Phạm Anh Nhân',
            '95970': 'BP ALL IN ONE - ĐMX;;Chế Thị Út',
        }));
        // Object.entries duyệt khoá dạng số theo giá trị tăng dần (95970 trước 107617) — thứ tự
        // không quan trọng về nghiệp vụ nên so sánh theo tập hợp.
        expect(list.map(e => e.originalName).sort()).toEqual(['107617 - Phạm Anh Nhân', '95970 - Chế Thị Út'].sort());
        expect(list.map(e => e.id).sort()).toEqual(['107617', '95970'].sort());
        expect(list[0].department).toBe('BP ALL IN ONE - ĐMX');
    });

    it('bỏ nhân viên chưa gán bộ phận / bộ phận bị loại trừ', () => {
        const list = normalizeAnalysisEmployees(departmentMapToEmployeeList({
            '111': 'Chưa xác định;;Nguyễn Văn A',
            '222': ';;Trần Thị B',
            '333': 'BP Quản Lý Siêu Thị - ĐMX;;Lê Văn C',
            '444': 'BP ALL IN ONE - ĐMX;;Võ Thị D',
        }));
        expect(list.map(e => e.id)).toEqual(['444']);
    });

    it('không trùng khi cùng mã nhân viên', () => {
        const list = normalizeAnalysisEmployees([
            { name: '107617 - Phạm Anh Nhân', department: 'BP ALL IN ONE - ĐMX' },
            { name: 'Phạm Anh Nhân - 107617', department: 'BP ALL IN ONE - ĐMX' },
        ]);
        expect(list.length).toBe(1);
    });

    it('map rỗng -> danh sách rỗng', () => {
        expect(normalizeAnalysisEmployees(departmentMapToEmployeeList({}))).toEqual([]);
    });
});
