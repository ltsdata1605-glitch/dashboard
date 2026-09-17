import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export type AdminRole = 'admin' | 'manager' | 'employee' | 'pending' | 'blocked';
export type AdminStatus = 'pending' | 'approved' | 'rejected' | 'new' | 'expired' | 'blocked';

export interface AdminUpdateUserInput {
    targetUid: string;
    role?: AdminRole;
    status?: AdminStatus;
    departmentId?: string;
    employeeName?: string;
    expiresAt?: string | null;
    notify?: { title: string; message: string; type: 'success' | 'warning' | 'info' | 'error' };
}

const adminUpdateUserFn = httpsCallable<AdminUpdateUserInput, { success: boolean }>(functions, 'adminUpdateUser');

// Gọi Cloud Function adminUpdateUser (functions/src/admin.ts) — thay cho việc
// admin/manager tự updateDoc() thẳng vào doc users/{uid} của NGƯỜI KHÁC.
// firestore.rules chỉ cho phép isSelf(uid) ghi, nên phải đi qua đây.
export const MANAGED_USERS_CHANGED_EVENT = 'ycx-managed-users-changed';

export const adminUpdateUser = async (input: AdminUpdateUserInput): Promise<void> => {
    await adminUpdateUserFn(input);
    // Báo cho nguồn dùng chung `services/pendingApprovalsStore.ts` làm mới NGAY, thay vì chờ hết
    // chu kỳ poll (đã nâng 45s → 120s ở bản sửa hạn mức 2026-09-17): admin vừa duyệt 1 yêu cầu thì
    // badge/banner/thông báo phải đổi liền. Dùng event thay vì import trực tiếp để tránh vòng
    // import (store đã import `listManagedUsers` từ file này).
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(MANAGED_USERS_CHANGED_EVENT));
    }
};

// Field Timestamp Firestore đã được server serialize sẵn về chuỗi ISO (xem
// functions/src/admin.ts — serializeUserDoc) vì Timestamp không "sống sót" qua callable RPC.
export interface ManagedUserDoc {
    id: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    requestedRole?: 'manager' | 'employee';
    role?: AdminRole;
    departmentId?: string;
    employeeName?: string;
    status?: AdminStatus;
    createdAt?: string | null;
    requestDate?: string | null;
    loginCount?: number;
    expiresAt?: string | null;
}

export type ListManagedUsersMode = 'pending' | 'active' | 'expired';

const listManagedUsersFn = httpsCallable<{ mode: ListManagedUsersMode }, { users: ManagedUserDoc[] }>(functions, 'listManagedUsers');

// Gọi Cloud Function listManagedUsers (functions/src/admin.ts) — thay cho việc
// UserManagementView.tsx/usePendingApprovalCount.ts/NotificationDropdown.tsx tự
// query thẳng collection('users') rồi lọc theo Kho ở CLIENT (không phải bảo mật
// thật — firestore.rules isManager() cho manager list/get toàn bộ collection).
// Việc lọc theo Kho của manager giờ làm ở SERVER (Admin SDK, không thể bỏ qua).
export const listManagedUsers = async (mode: ListManagedUsersMode): Promise<ManagedUserDoc[]> => {
    const result = await listManagedUsersFn({ mode });
    return result.data.users;
};
