import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const {
    mockHttpsCallableInstance,
    mockHttpsCallable,
    mockSignInWithCredential,
    mockSignOut,
    MockGoogleAuthProvider,
    authState,
} = vi.hoisted(() => {
    const mockHttpsCallableInstance = vi.fn();
    const mockHttpsCallable = vi.fn((_f?: any, _n?: string): any => mockHttpsCallableInstance);
    
    // Mô phỏng trạng thái Firebase Auth thực tế
    const authState = {
        currentUser: null as any,
        listeners: [] as Array<(user: any) => void>,
    };

    const mockSignInWithCredential = vi.fn((authInstance: any, credential: any): Promise<any> => {
        const uid = credential.idToken ? credential.idToken.replace('token_', 'uid_') : 'default_uid';
        const user = { uid, email: `${uid}@example.com`, displayName: `User ${uid}` };
        authInstance.currentUser = user;
        authState.currentUser = user;
        for (const l of [...authState.listeners]) l(user);
        return Promise.resolve({ user });
    });

    const mockSignOut = vi.fn((authInstance: any): Promise<any> => {
        authInstance.currentUser = null;
        authState.currentUser = null;
        for (const l of [...authState.listeners]) l(null);
        return Promise.resolve();
    });

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
        authState,
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
        initializeAuth: vi.fn(() => authState),
        getAuth: vi.fn(() => authState),
        onAuthStateChanged: (authInstance: any, cb: (user: any) => void) => {
            authState.listeners.push(cb);
            cb(authState.currentUser);
            return () => {
                const idx = authState.listeners.indexOf(cb);
                if (idx >= 0) authState.listeners.splice(idx, 1);
            };
        },
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
    auth,
    claimPwaHandoff,
    readPendingHandoff,
    PwaHandoffSignInError,
    takePwaHandoffError,
    _resetPkcePrewarmForTesting,
    layTaiKhoanGanNhat,
    nhoTaiKhoan,
    isAuthTransitionAuthorized,
    startPwaHandoffLogin,
} from '../../services/firebase';

const PWA_HANDOFF_KEY = 'ycxPwaHandoff';

describe('Session Ownership & signInWithCredential Failure Branch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        _resetPkcePrewarmForTesting();
        localStorage.clear();
        sessionStorage.clear();
        delete (globalThis as any).__ycxHoSoDaTinhSan;
        authState.currentUser = null;
        authState.listeners = [];
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
            authState.currentUser = { uid: 'uid_A' };
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

    it('5. [Auth State Boundary Guard & Interleaved Sign-In] Phiên B đăng nhập thành công trước khi phiên A kết thúc muộn: User A bị chặn, User B KHÔNG bị đăng xuất', async () => {
        // Mô phỏng chính xác observer AuthContext:
        let appActiveUser: any = null;
        let localDataWipedForUid: string | null = null;
        let rememberedEmail: string | null = null;

        const authContextObserver = (user: any) => {
            // BOUNDARY GUARD: Chỉ chấp nhận nếu được xác thực hợp lệ
            if (!isAuthTransitionAuthorized(user)) {
                return;
            }
            appActiveUser = user;
            if (user) {
                localDataWipedForUid = user.uid;
                rememberedEmail = user.email;
            } else {
                appActiveUser = null;
            }
        };
        authState.listeners.push(authContextObserver);

        // 1. Phiên A bắt đầu
        localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: 'verifier_A', at: Date.now() }));

        let resolveSignInA!: () => void;
        const signInAPromise = new Promise<void>(res => { resolveSignInA = res; });

        mockHttpsCallableInstance.mockImplementation(async ({ verifier }: { verifier: string }) => {
            if (verifier === 'verifier_A') {
                return {
                    data: {
                        ready: true,
                        idToken: 'token_A',
                        uid: 'uid_A',
                        profile: { role: 'employee', dept: '123' },
                    },
                };
            }
            if (verifier === 'verifier_B') {
                return {
                    data: {
                        ready: true,
                        idToken: 'token_B',
                        accessToken: 'access_B',
                        uid: 'uid_B',
                        profile: { role: 'admin', dept: 'ALL' },
                    },
                };
            }
            return { data: { ready: false } };
        });

        // signInWithCredential cho Session A: bị trì hoãn (delayed)
        let signInACalled = false;
        let emitUserA!: () => void;
        const waitForEmitUserA = new Promise<void>(res => { emitUserA = res; });

        mockSignInWithCredential.mockImplementation(async (authInst: any, cred: any): Promise<any> => {
            if (cred.idToken === 'token_A') {
                signInACalled = true;
                await waitForEmitUserA;
                // Bắn event auth state User A vào listener Firebase
                const userA = { uid: 'uid_A', email: 'user_a@example.com' };
                authInst.currentUser = userA;
                authState.currentUser = userA;
                for (const l of [...authState.listeners]) l(userA);

                await signInAPromise; // Đợi lượt A giải quyết muộn
                return { user: userA };
            }
            if (cred.idToken === 'token_B') {
                const userB = { uid: 'uid_B', email: 'user_b@example.com' };
                authInst.currentUser = userB;
                authState.currentUser = userB;
                for (const l of [...authState.listeners]) l(userB);
                return { user: userB };
            }
            return { user: null };
        });

        // 1. Phiên A bắt đầu đăng nhập
        const claimAPromise = claimPwaHandoff(1);
        await new Promise(r => setTimeout(r, 20));
        expect(signInACalled).toBe(true);

        // 2. Người dùng tạo phiên B
        startPwaHandoffLogin({ code: 'code_B', verifier: 'verifier_B' });
        expect(readPendingHandoff()).toBe('verifier_B');

        // 3. Firebase cập nhật Auth State cho A
        emitUserA();
        await new Promise(r => setTimeout(r, 20));

        // 4. AuthContext KIỂM CHỨNG: KHÔNG nhận User A vào state vì đã bị Boundary Guard chặn tại ngưỡng!
        expect(appActiveUser).toBeNull();
        expect(localDataWipedForUid).toBeNull();
        expect(rememberedEmail).toBeNull();

        // 5. Phiên B hoàn thành: claimPwaHandoff(B) chạy và hoàn tất thành công
        const claimBSuccess = await claimPwaHandoff(1);
        expect(claimBSuccess).toBe(true);

        // User B đã được nhận hợp lệ vào AuthContext
        expect(appActiveUser?.uid).toBe('uid_B');
        expect(localDataWipedForUid).toBe('uid_B');
        expect(rememberedEmail).toBe('user_b@example.com');
        expect(auth.currentUser?.uid).toBe('uid_B');

        // 6. Bây giờ tác vụ A mới hoàn thành muộn (late resolution)
        resolveSignInA();
        const claimAResult = await claimAPromise;

        // Phiên A bị từ chối
        expect(claimAResult).toBe(false);

        // 7. Kiểm tra user cuối cùng, dữ liệu cục bộ, cache quyền và token
        // ĐIỀU KIỆN TIÊN QUYẾT BẮT BUỘC:
        // Phiên A TUYỆT ĐỐI KHÔNG ĐƯỢC đăng xuất User B! (auth.currentUser vẫn là uid_B)
        expect(auth.currentUser?.uid).toBe('uid_B');
        expect(appActiveUser?.uid).toBe('uid_B');
        // Không dọn nhầm dữ liệu của User B
        expect(localDataWipedForUid).toBe('uid_B');
        // Tài khoản nhớ cuối cùng vẫn là User B
        expect(rememberedEmail).toBe('user_b@example.com');
        // Token của User B được lưu trữ trong sessionStorage
        expect(sessionStorage.getItem('googleOAuthToken')).toBe('access_B');
    });

    it('6. [Early Session A Late Resolution] Phiên A kết thúc muộn trước khi B kịp đăng nhập: thu hồi User A an toàn, bảo toàn verifier B', async () => {
        let appActiveUser: any = null;

        const authContextObserver = (user: any) => {
            if (!isAuthTransitionAuthorized(user)) return;
            appActiveUser = user;
        };
        authState.listeners.push(authContextObserver);

        // Phiên A bắt đầu
        localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: 'verifier_A', at: Date.now() }));

        let resolveSignInA!: () => void;
        const signInAPromise = new Promise<void>(res => { resolveSignInA = res; });
        let emitUserA6!: () => void;
        const waitForEmitUserA6 = new Promise<void>(res => { emitUserA6 = res; });

        mockHttpsCallableInstance.mockResolvedValueOnce({
            data: {
                ready: true,
                idToken: 'token_A',
                uid: 'uid_A',
            },
        });

        mockSignInWithCredential.mockImplementationOnce(async (authInst: any): Promise<any> => {
            await waitForEmitUserA6;
            const userA = { uid: 'uid_A', email: 'user_a@example.com' };
            authInst.currentUser = userA;
            authState.currentUser = userA;
            for (const l of [...authState.listeners]) l(userA);
            await signInAPromise;
            return { user: userA };
        });

        // 1. Phiên A bắt đầu
        const claimAPromise = claimPwaHandoff(1);
        await new Promise(r => setTimeout(r, 20));

        // 2. Người dùng tạo phiên B
        startPwaHandoffLogin({ code: 'code_B', verifier: 'verifier_B' });
        expect(readPendingHandoff()).toBe('verifier_B');

        // 3. Firebase cập nhật Auth State cho A
        emitUserA6();
        await new Promise(r => setTimeout(r, 20));

        // 4. AuthContext không nhận User A
        expect(appActiveUser).toBeNull();

        // 5. Phiên A giải quyết muộn trước khi B hoàn thành đăng nhập
        resolveSignInA();
        const claimAResult = await claimAPromise;

        // Phiên A bị từ chối
        expect(claimAResult).toBe(false);
        // AuthContext vẫn là null
        expect(appActiveUser).toBeNull();
        // User A đã được thu hồi an toàn khỏi Firebase Auth (auth.currentUser = null)
        expect(auth.currentUser).toBeNull();
        // Phiên B trong localStorage VẪN NGUYÊN VẸN 100%
        expect(readPendingHandoff()).toBe('verifier_B');
    });
});
