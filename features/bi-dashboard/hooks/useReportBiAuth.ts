/**
 * Cầu nối lấy role/departmentId (Mã Kho) từ contexts/AuthContext.tsx ở root — dùng cho tính
 * năng phân quyền theo siêu thị (implementation_plan.md mục "Đợt 4"). Có tiền lệ hợp lệ:
 * BiWrapper.tsx đã import contexts/AuthContext trước đó cho audit trail (utils/auditTrail.ts);
 * CLAUDE.md mục 1 chỉ cấm cross-import hooks/*|services/* ở root, không cấm contexts/*.
 */

import { useAuth } from '../../../contexts/AuthContext';

export const useReportBiAuth = () => {
    const { user, userRole, departmentId } = useAuth();

    const allowedKhos = (departmentId || '')
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

    // Manager chỉ được dán dữ liệu cho ĐÚNG (các) Kho của mình — không phải mọi Kho trong hệ
    // thống. Admin cũng vậy (kể cả Super Admin có departmentId = "ALL (Super Admin)" thì
    // allowedKhos rỗng — Super Admin chưa cần dán dữ liệu Report BI dùng chung, chỉ cần quản
    // lý bảng map qua biSupermarketMapService.ts, việc đó check isAdmin() riêng ở Firestore
    // Rules, không phụ thuộc allowedKhos).
    const canManageSharedBiData = (userRole === 'admin' || userRole === 'manager') && allowedKhos.length > 0;
    const isAdmin = userRole === 'admin';

    return { user, userRole, departmentId, allowedKhos, canManageSharedBiData, isAdmin };
};
