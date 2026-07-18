import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { StickerRole } from './sessionService';

interface AdminUpdateInput {
    action: 'setRole' | 'delete' | 'clearStore';
    targetUid?: string;
    role?: StickerRole;
    storeId?: string;
}

const stickerAdminUpdateUserFn = httpsCallable<AdminUpdateInput, { success: boolean; deletedCount?: number }>(
    functions,
    'stickerAdminUpdateUser'
);

// Gọi Cloud Function stickerAdminUpdateUser — thay updateUserRole/deleteUserDoc/
// clearAllUsers (firebaseService.ts) ghi trực tiếp từ client không kiểm tra
// storeId, cho phép admin 1 kho lý thuyết sửa được user kho khác.
export const stickerAdminUpdateUser = async (input: AdminUpdateInput): Promise<void> => {
    await stickerAdminUpdateUserFn(input);
};
