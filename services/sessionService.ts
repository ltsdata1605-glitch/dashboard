import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export type UserRole = 'admin' | 'manager' | 'employee' | 'pending';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'new' | 'expired';

export interface SessionProfile {
    role: UserRole;
    status: UserStatus;
    departmentId: string | null;
    employeeName: string | null;
    expiresAt: string | null;
}

interface RequestAccessInput {
    requestedRole: 'manager' | 'employee';
    departmentId: string;
    employeeName?: string;
}

const resolveSessionFn = httpsCallable<Record<string, never>, SessionProfile>(functions, 'resolveSession');
const requestAccessFn = httpsCallable<RequestAccessInput, { success: boolean }>(functions, 'requestAccess');

// Gọi Cloud Function resolveSession (functions/src/session.ts) — thay cho việc
// client tự đọc/ghi field role/status/departmentId/expiresAt trực tiếp vào
// Firestore. Phải gọi ngay sau khi Firebase Auth xác nhận đăng nhập.
export const resolveSession = async (): Promise<SessionProfile> => {
    const result = await resolveSessionFn({});
    return result.data;
};

// Gọi Cloud Function requestAccess — chỉ được set role của chính người gọi
// về 'pending', không thể tự nâng quyền (xem firestore.rules: protectedKeys()
// bị chặn ghi trực tiếp qua client SDK).
export const requestAccess = async (
    requestedRole: 'manager' | 'employee',
    departmentId: string,
    employeeName?: string
): Promise<void> => {
    await requestAccessFn({ requestedRole, departmentId, employeeName });
};
