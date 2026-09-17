import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ManagedUserDoc } from '../services/adminUserService';
import { subscribeToPendingApprovals, getPendingApprovalsSnapshot } from '../services/pendingApprovalsStore';

export interface PendingApprovalsState {
    users: ManagedUserDoc[];
    /** `false` = chưa có lượt tải nào thành công. Phân biệt với "đã tải, không có yêu cầu nào" —
     *  cả hai đều là mảng rỗng. */
    loaded: boolean;
}

/**
 * Danh sách yêu cầu cấp quyền đang chờ.
 *
 * QUOTA FIX (2026-09-17): hook này TỪNG tự chạy vòng `setInterval` 45s gọi
 * `listManagedUsers('pending')` riêng. Nó được mount ở 2 nơi cùng lúc
 * (`components/layout/PendingApprovalBanner.tsx` và `components/views/DashboardView.tsx`), và
 * `components/layout/NotificationDropdown.tsx` còn có vòng poll thứ 3 cho ĐÚNG dữ liệu đó — tổng
 * 240 lượt gọi/giờ cho mỗi admin/manager. Toàn bộ logic poll/cache/tạm dừng theo tab đã chuyển
 * vào nguồn dùng chung `services/pendingApprovalsStore.ts`; hook giờ chỉ là lớp đăng ký mỏng.
 */
export function usePendingApprovals(): PendingApprovalsState {
    const { user, userRole, departmentId, isDemoMode } = useAuth();
    const isReviewer = userRole === 'admin' || userRole === 'manager';
    const enabled = !isDemoMode && isReviewer;

    const [state, setState] = useState<PendingApprovalsState>(() =>
        enabled
            ? { users: getPendingApprovalsSnapshot(), loaded: false }
            // Người không có quyền duyệt sẽ KHÔNG BAO GIỜ có yêu cầu nào để xem → coi như đã tải
            // xong, nếu không nơi gọi sẽ chờ `loaded` vĩnh viễn.
            : { users: [], loaded: true }
    );

    useEffect(() => {
        if (!enabled) {
            setState({ users: [], loaded: true });
            return;
        }
        // Khoá phạm vi: đổi người dùng/vai trò/Kho thì store tự xoá cache cũ.
        const scopeKey = `${user?.uid ?? ''}|${userRole ?? ''}|${departmentId ?? ''}`;
        return subscribeToPendingApprovals(scopeKey, (users, loaded) => setState({ users, loaded }));
    }, [enabled, user?.uid, userRole, departmentId]);

    return state;
}

/** Giữ nguyên chữ ký cũ cho 2 nơi đang dùng (PendingApprovalBanner, DashboardView). */
export function usePendingApprovalCount(): number {
    return usePendingApprovals().users.length;
}
