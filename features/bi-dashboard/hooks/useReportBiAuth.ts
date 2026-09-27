/**
 * Cầu nối lấy role/departmentId (Mã Kho) từ contexts/AuthContext.tsx ở root — dùng cho tính
 * năng phân quyền theo siêu thị (implementation_plan.md mục "Đợt 4"). CLAUDE.md mục 1 chỉ cấm
 * cross-import hooks/*|services/* ở root, không cấm contexts/* (BiWrapper.tsx cũng import
 * contexts/LayoutContext gốc). Tiền lệ audit trail từng ghi ở đây đã bị gỡ 2026-09-11 cùng màn
 * "Cài đặt & Quản lý" theo yêu cầu user.
 */

import { useAuth } from '../../../contexts/AuthContext';
import { parseKhoList } from '../../../utils/dataUtils';

export const useReportBiAuth = () => {
    const { user, userRole, departmentId, employeeName } = useAuth();

    const allowedKhos = parseKhoList(departmentId);

    // Manager chỉ được dán dữ liệu cho ĐÚNG (các) Kho của mình — không phải mọi Kho trong hệ
    // thống. Admin cũng vậy. Super Admin mang nhãn "ALL (Super Admin)" (không phải Kho) kèm các
    // Kho thật gắn thêm, vd "ALL (Super Admin),910" → allowedKhos = ["910"]; chỉ có mỗi nhãn thì
    // allowedKhos rỗng như trước (vẫn quản lý được bảng map qua biSupermarketMapService.ts —
    // Firestore Rules check isAdmin() riêng, không phụ thuộc allowedKhos). Sửa 2026-09-27.
    const canManageSharedBiData = (userRole === 'admin' || userRole === 'manager') && allowedKhos.length > 0;
    const isAdmin = userRole === 'admin';

    return { user, userRole, departmentId, employeeName, allowedKhos, canManageSharedBiData, isAdmin };
};
