import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export type StickerRole = 'admin' | 'staff';

export interface StickerSessionProfile {
    role: StickerRole;
    storeId: string | null;
    username: string | null;
    storeHasAdmin: boolean;
}

interface RegisterInput {
    username: string;
    storeId: string;
    requestedRole: StickerRole;
}

const stickerRegisterFn = httpsCallable<RegisterInput, StickerSessionProfile>(functions, 'stickerRegister');
const stickerResolveSessionFn = httpsCallable<Record<string, never>, StickerSessionProfile>(
    functions,
    'stickerResolveSession'
);

// Gọi Cloud Function stickerRegister (functions/src/stickerEvent.ts) — thay
// cho việc Login.tsx tự setDoc(role, storeId) do client chọn. Server tự kiểm
// tra điều kiện "kho đã có admin chưa" thay vì tin client đã kiểm tra đúng.
export const stickerRegister = async (input: RegisterInput): Promise<StickerSessionProfile> => {
    const result = await stickerRegisterFn(input);
    return result.data;
};

// Gọi mỗi lần đăng nhập — đồng bộ lại role/storeId + custom claims theo dữ
// liệu Firestore mới nhất (thay vì đọc thẳng doc như Login.tsx bản cũ).
export const stickerResolveSession = async (): Promise<StickerSessionProfile> => {
    const result = await stickerResolveSessionFn({});
    return result.data;
};
