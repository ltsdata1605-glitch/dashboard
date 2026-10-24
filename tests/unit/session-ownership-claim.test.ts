import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const {
    mockHttpsCallableInstance,
    mockHttpsCallable,
    mockSignInWithCredential,
    mockSignOut,
    MockGoogleAuthProvider,
} = vi.hoisted(() => {
    const mockHttpsCallableInstance = vi.fn();
    const mockHttpsCallable = vi.fn((_f?: any, _n?: string): any => mockHttpsCallableInstance);
    const mockSignInWithCredential = vi.fn((_auth?: any, _cred?: any): Promise<any> => Promise.resolve());
    const mockSignOut = vi.fn((_auth?: any): Promise<any> => Promise.resolve());
    class MockGoogleAuthProvider {
        addScope = vi.fn();
        setCustomParameters = vi.fn();
        static credential = (idToken: string, accessToken?: string) => ({ idToken, accessToken, providerId: 'google.com' });
    }
    return {
        mockHttpsCallableInstance,
        mockHttpsCallable,
        mockSignInWithCredential,
        mockSignOut,
        MockGoogleAuthProvider,
    };
});

vi.mock('firebase/functions', async () => {
    const actual = await vi.importActual<any>('firebase/functions');
    return {
        ...actual,
        getFunctions: vi.fn(() => ({})),
        httpsCallable: (functionsInstance: any, name: string) => mockHttpsCallable(functionsInstance, name),
    };
});

vi.mock('firebase/auth', async () => {
    const actual = await vi.importActual<any>('firebase/auth');
    return {
        ...actual,
        initializeAuth: vi.fn(() => ({ currentUser: null })),
        getAuth: vi.fn(() => ({ currentUser: null })),
        signInWithCredential: (authInstance: any, credential: any) => mockSignInWithCredential(authInstance, credential),
        signOut: (authInstance: any) => mockSignOut(authInstance),
        GoogleAuthProvider: MockGoogleAuthProvider,
    };
});

// Polyfill localStorage & sessionStorage for Node Vitest environment
if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, String(v)),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
    };
}
if (typeof globalThis.sessionStorage === 'undefined') {
    const sStore = new Map<string, string>();
    (globalThis as any).sessionStorage = {
        getItem: (k: string) => sStore.get(k) ?? null,
        setItem: (k: string, v: string) => sStore.set(k, String(v)),
        removeItem: (k: string) => sStore.delete(k),
        clear: () => sStore.clear(),
    };
}

import {
    claimPwaHandoff,
    readPendingHandoff,
    PwaHandoffSignInError,
    takePwaHandoffError,
    _resetPkcePrewarmForTesting,
    layTaiKhoanGanNhat,
    nhoTaiKhoan,
} from '../../services/firebase';

const PWA_HANDOFF_KEY = 'ycxPwaHandoff';

describe('Session Ownership & signInWithCredential Failure Branch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        _resetPkcePrewarmForTesting();
        localStorage.clear();
        sessionStorage.clear();
        delete (globalThis as any).__ycxHoSoDaTinhSan;
    });

    afterEach(() => {
        takePwaHandoffError();
    });

    it('1. signInWithCredential từ chối token khi A vẫn là phiên hợp lệ: BÁO LỖI THẬT, không nuốt lỗi', async () => {
        // Thiết lập phiên A hợp lệ
        localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: 'verifier_A', at: Date.now() }));
        expect(readPendingHandoff()).toBe('verifier_A');

        // Cloud Function trả về token của phiên A
        mockHttpsCallableInstance.mockResolvedValueOnce({
            data: {
                ready: true,
                idToken: 'invalid_token_A',
                uid: 'uid_A',
                profile: { role: 'admin', departmentId: 'ALL' },
            },
        });

        // Firebase Auth từ chối token
        const authError = new Error('auth/invalid-credential');
        mockSignInWithCredential.mockRejectedValueOnce(authError);

        // claimPwaHandoff PHẢI NÉM PwaHandoffSignInError (không được return false nuốt lỗi!)
        await expect(claimPwaHandoff(1)).rejects.toThrow(PwaHandoffSignInError);

        // Lỗi gốc được lưu lại để LoginView lấy hiển thị
        const takenErr = takePwaHandoffError();
        expect(takenErr).not.toBeNull();
        expect(takenErr?.cause).toBe(authError);

        // Storage đã được dọn sạch vì phiên A thất bại thật sự
        expect(readPendingHandoff()).toBeNull();
        // Bộ đệm hồ sơ tính sẵn đã được xoá sạch
        expect((globalThis as any).__ycxHoSoDaTinhSan).toBeUndefined();
    });

    it('2. A bị B thay thế trong lúc request Cloud Function đang chạy: không gọi signInWithCredential, không xoá phiên B', async () => {
        // Thiết lập phiên A
        localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: 'verifier_A', at: Date.now() }));

        // Cloud Function trả về kết quả nhưng trong lúc mạng chạy, người dùng đã mở phiên B
        mockHttpsCallableInstance.mockImplementationOnce(async () => {
            // Người dùng bấm Mở lại -> phiên B thay thế A
            localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: 'verifier_B', at: Date.now() }));
            return {
                data: {
                    ready: true,
                    idToken: 'token_A',
                    uid: 'uid_A',
                    profile: { role: 'admin' },
                },
            };
        });

        const success = await claimPwaHandoff(1);

        // Không được thành công cho phiên A
        expect(success).toBe(false);
        // TUYỆT ĐỐI KHÔNG được gọi signInWithCredential của phiên A (tránh đăng nhập nhầm)
        expect(mockSignInWithCredential).not.toHaveBeenCalled();
        // Phiên B trong localStorage KHÔNG BỊ XOÁ
        expect(readPendingHandoff()).toBe('verifier_B');
        // Không lưu token của A
        expect(sessionStorage.getItem('googleOAuthToken')).toBeNull();
        // Cache hồ sơ của A không được lưu lại
        expect((globalThis as any).__ycxHoSoDaTinhSan).toBeUndefined();
    });

    it('3. A bị B thay thế trong lúc signInWithCredential(A) đang chạy: thực thi Session Ownership (thu hồi user A, giữ nguyên B)', async () => {
        // Thiết lập tài khoản nhớ trước đó
        nhoTaiKhoan('user_cu@example.com', 'User Cũ');
        expect(layTaiKhoanGanNhat()?.email).toBe('user_cu@example.com');

        // Thiết lập phiên A
        localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: 'verifier_A', at: Date.now() }));

        mockHttpsCallableInstance.mockResolvedValueOnce({
            data: {
                ready: true,
                idToken: 'token_A',
                accessToken: 'access_token_A',
                uid: 'uid_A',
                profile: { role: 'admin', departmentId: 'ALL' },
            },
        });

        // Giả lập signInWithCredential đang chạy thì người dùng tạo phiên B
        mockSignInWithCredential.mockImplementationOnce(async () => {
            // Trong tích tắc này người dùng bấm Mở lại:
            localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: 'verifier_B', at: Date.now() }));
            return { user: { uid: 'uid_A' } };
        });

        const success = await claimPwaHandoff(1);

        // Phiên A bị từ chối
        expect(success).toBe(false);
        // PHẢI gọi signOut để thu hồi phiên đăng nhập sai của User A
        expect(mockSignOut).toHaveBeenCalledTimes(1);
        // Không được lưu access token của User A vào sessionStorage
        expect(sessionStorage.getItem('googleOAuthToken')).toBeNull();
        // Bộ đệm hồ sơ tính sẵn của User A bị dọn sạch
        expect((globalThis as any).__ycxHoSoDaTinhSan).toBeUndefined();
        // Khôi phục lại tài khoản nhớ trước đó (không bị ghi đè thành User A)
        expect(layTaiKhoanGanNhat()?.email).toBe('user_cu@example.com');
        // Phiên B trong localStorage còn nguyên vẹn 100%
        expect(readPendingHandoff()).toBe('verifier_B');
    });

    it('4. A bị B thay thế trong lúc signInWithCredential(A) THẤT BẠI: không ném lỗi của A lên phiên B', async () => {
        // Thiết lập phiên A
        localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: 'verifier_A', at: Date.now() }));

        mockHttpsCallableInstance.mockResolvedValueOnce({
            data: {
                ready: true,
                idToken: 'token_A',
                uid: 'uid_A',
            },
        });

        // Giả lập signInWithCredential bị từ chối VÀ trong lúc đó phiên B đã tạo
        mockSignInWithCredential.mockImplementationOnce(async () => {
            localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: 'verifier_B', at: Date.now() }));
            throw new Error('auth/user-disabled');
        });

        // TUYỆT ĐỐI KHÔNG ném lỗi lên UI vì người dùng đang ở phiên B
        const result = await claimPwaHandoff(1);
        expect(result).toBe(false);

        // lastHandoffError không được giữ lỗi của phiên A đã bị thay thế
        expect(takePwaHandoffError()).toBeNull();

        // Phiên B vẫn còn nguyên vẹn trong localStorage để tiếp tục quy trình
        expect(readPendingHandoff()).toBe('verifier_B');
        // Cache hồ sơ bị dọn dẹp
        expect((globalThis as any).__ycxHoSoDaTinhSan).toBeUndefined();
    });
});
