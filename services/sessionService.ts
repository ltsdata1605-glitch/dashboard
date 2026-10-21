import { httpsCallable } from 'firebase/functions';
import { functions, layHoSoDaTinhSan } from './firebase';

export type UserRole = 'admin' | 'manager' | 'employee' | 'pending';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'new' | 'expired';

export interface SessionProfile {
    role: UserRole;
    status: UserStatus;
    departmentId: string | null;
    employeeName: string | null;
    expiresAt: string | null;
    /** Claims thật trong token (functions/src/claims.ts — chưa duyệt/hết hạn thì khác role/departmentId).
     *  Không có ở bản Cloud Function cũ → client dùng lại role/departmentId. */
    claimRole?: string;
    claimDepartmentId?: string | null;
}

interface RequestAccessInput {
    requestedRole: 'manager' | 'employee';
    departmentId: string;
    employeeName?: string;
}

export interface RequestAccessResult {
    success: boolean;
    autoApproved?: boolean;
    role?: UserRole;
    status?: UserStatus;
    departmentId?: string;
    employeeName?: string;
}

const resolveSessionFn = httpsCallable<Record<string, never>, SessionProfile>(functions, 'resolveSession');
const requestAccessFn = httpsCallable<RequestAccessInput, RequestAccessResult>(functions, 'requestAccess');

// Gọi Cloud Function resolveSession (functions/src/session.ts) — thay cho việc
// client tự đọc/ghi field role/status/departmentId/expiresAt trực tiếp vào
// Firestore. Phải gọi ngay sau khi Firebase Auth xác nhận đăng nhập.
//
// `uid`: vừa đăng nhập iPhone qua trang auth.dashboard.pro.vn thì máy chủ đã tính sẵn phiên lúc trang đó gửi phiên về
// (functions/src/pwaHandoff.ts) — dùng luôn, khỏi gọi máy chủ thêm 1 lượt (2026-10-21). Chỉ dùng cho ĐÚNG uid đó, 1 lần.
export const resolveSession = async (uid?: string): Promise<SessionProfile> => {
    const san = uid ? layHoSoDaTinhSan(uid) : null;
    if (san && typeof san.role === 'string' && typeof san.status === 'string') return san as unknown as SessionProfile;
    const result = await resolveSessionFn({});
    return result.data;
};

// Gọi Cloud Function requestAccess — hỗ trợ tự động duyệt (autoApproved)
// theo cấu hình Super Admin / Quản lý
export const requestAccess = async (
    requestedRole: 'manager' | 'employee',
    departmentId: string,
    employeeName?: string
): Promise<RequestAccessResult> => {
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), 8000)
    );
    const result = await Promise.race([
        requestAccessFn({ requestedRole, departmentId, employeeName }),
        timeoutPromise
    ]);
    return result.data;
};
