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
export const adminUpdateUser = async (input: AdminUpdateUserInput): Promise<void> => {
    await adminUpdateUserFn(input);
};
