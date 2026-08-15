import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import type { Functions } from 'firebase/functions';
import type { Firestore } from 'firebase/firestore';
import { auth, db, functions, loginWithGoogle as loginProvider, logoutUser as logoutProvider } from '../services/firebase';
import { getSetting, saveSetting, mergeSettings, cleanupGarbageKeys } from '../services/dbService';
import { initSyncListeners } from '../services/syncService';
import { resolveSession, requestAccess as requestAccessApi } from '../services/sessionService';

interface AuthContextType {
    user: User | null;
    userRole: 'admin' | 'manager' | 'employee' | 'pending' | null;
    departmentId?: string;
    employeeName?: string;
    expiresAt?: Date | null;
    status?: 'pending' | 'approved' | 'rejected' | 'new' | 'expired';
    isLoading: boolean;
    // true khi Ultra-Fast Boot tắt spinner sớm dựa trên cache role/status/departmentId hợp lệ,
    // nhưng Firebase `onAuthStateChanged` (nguồn của `user`) chưa kịp xác nhận xong — App.tsx
    // dùng cờ này để KHÔNG hiện màn Login trong khoảng vài chục ms đó (xem giải thích ở effect
    // Ultra-Fast Boot bên dưới). Tự trở về false ngay khi Firebase xác nhận thật sự đã đăng xuất.
    hasCachedSession: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    isDemoMode: boolean;
    setDemoMode: (val: boolean) => void;
    requestAccess: (requestedRole: 'manager' | 'employee', deptId: string, empName?: string) => Promise<void>;
    // Instance Functions/Firestore gắn với app + auth session THẬT (root) —
    // features/* (vd: phan-ca) cần dùng đúng instance này khi gọi Cloud Function
    // callable hoặc đọc/ghi Firestore theo uid, vì app Firebase riêng của feature
    // (named app khác) không có session đăng nhập nên request.auth sẽ là null.
    functions: Functions;
    db: Firestore;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'manager' | 'employee' | 'pending' | null>(null);
    const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
    const [employeeName, setEmployeeName] = useState<string | undefined>(undefined);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'new' | 'expired'>('new');
    const [hasCachedSession, setHasCachedSession] = useState(false);

    useEffect(() => {
        cleanupGarbageKeys().catch(console.error);
        Promise.all([
            getSetting<'admin' | 'manager' | 'employee' | 'pending'>('cached_user_role'),
            getSetting<string>('cached_dept_id'),
            getSetting<string>('cached_emp_name'),
            getSetting<'pending' | 'approved' | 'rejected' | 'new' | 'expired'>('cached_user_status')
        ]).then(([r, d, e, s]) => {
            if (r) setUserRole(r);
            if (d) setDepartmentId(d);
            if (e) setEmployeeName(e);
            if (s) setStatus(s);
            // Ultra-Fast Boot: Nếu đã có thông tin người dùng được cache ở IndexedDB máy local,
            // tắt spinner loading NGAY LẬP TỨC để mở giao diện tức thì trong 0.05s mà không chờ mạng!
            //
            // QUAN TRỌNG: chỉ được làm vậy khi cache cho biết CHẮC CHẮN sẽ vào thẳng dashboard —
            // trước đây chỉ cần có r+s (bất kể giá trị gì) là tắt spinner ngay, nên nếu cache còn
            // lưu status cũ 'pending'/'new'/'expired' (vd còn sót lại từ trước khi tài khoản này
            // được công nhận admin, hoặc user bị hạ quyền rồi được khôi phục) sẽ render NGAY màn
            // "Đăng ký/Chờ duyệt" bằng dữ liệu cache cũ, rồi mới tự sửa lại vài trăm ms sau khi
            // resolveSession() (gọi mạng, luôn ghi đè đúng — vd tự phục hồi quyền Super Admin,
            // xem functions/src/session.ts) chạy xong — đúng dấu hiệu "nháy màn đăng ký kho rồi
            // mới vào trang" dù đã đăng nhập đúng quyền. App.tsx chỉ vào thẳng dashboard khi
            // status==='approved' VÀ (role==='admin' HOẶC có departmentId hợp lệ) — lặp lại đúng
            // 2 điều kiện đó ở đây để không bao giờ tắt spinner sớm cho 1 state sẽ hiện màn KHÁC.
            //
            // hasCachedSession: cache này (IndexedDB riêng của app) và `onAuthStateChanged` (nguồn
            // của `user`, IndexedDB riêng của Firebase SDK) là 2 round-trip bất đồng bộ ĐỘC LẬP —
            // cache này thường xong TRƯỚC. Nếu chỉ setIsLoading(false) mà không báo cho App.tsx
            // biết, App.tsx sẽ thấy `user === null` (Firebase chưa kịp xác nhận) và hiện nhầm màn
            // Login trong vài chục ms trước khi `user` cập nhật — đúng dấu hiệu "nháy qua màn đăng
            // nhập rồi mới vào trang" dù máy đã đăng nhập sẵn. hasCachedSession báo App.tsx bỏ qua
            // màn Login trong lúc chờ, vào thẳng dashboard bằng dữ liệu cache.
            if (s === 'approved' && (r === 'admin' || (d && d.trim() !== ''))) {
                setIsLoading(false);
                setHasCachedSession(true);
            }
        }).catch(console.error);
    }, []);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isDemoMode, setDemoModeRaw] = useState(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('ycx_demo_mode') === 'true';
        }
        return false;
    });

    const setDemoMode = (val: boolean) => {
        setDemoModeRaw(val);
        if (typeof window !== 'undefined') {
            if (val) {
                sessionStorage.setItem('ycx_demo_mode', 'true');
            } else {
                sessionStorage.removeItem('ycx_demo_mode');
            }
        }
    };


    useEffect(() => {



        // Failsafe timeout: If Firebase Auth takes more than 5 seconds to respond 
        // (usually due to IDB blockage on iOS/Safari in-app browsers), stop loading.
        const fallbackTimer = setTimeout(() => {
            console.warn("Firebase Auth response timeout. Forcing app load.");
            setIsLoading(false);
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            // Mục đích ban đầu của fallbackTimer (Firebase Auth không phản hồi) đã xong ngay
            // khi callback này chạy — huỷ luôn, nếu không nó vẫn tự bắn sau đúng 5s kể từ lúc
            // mount và ép isLoading=false NGAY CẢ KHI resolveSession() bên dưới còn đang chạy
            // (vd: Cloud Function cold-start > 5s ngay sau khi vừa deploy) — tái tạo lại đúng
            // race nháy màn "Cập Nhật Mã Kho" mà finally bên dưới vừa mới chặn.
            clearTimeout(fallbackTimer);
            setUser(currentUser);
            if (currentUser) {
                try {
                    // Toàn bộ logic phân quyền (role/status/departmentId/expiresAt, cấp Super
                    // Admin, tự demote khi hết hạn) giờ chạy ở server — functions/src/session.ts.
                    // Client không còn tự updateDoc() field nhạy cảm (bị firestore.rules chặn).
                    const profile = await resolveSession();
                    // Chỉ force-refresh ID token khi claims HIỆN TẠI (role/departmentId) khác với
                    // profile vừa nhận — getIdTokenResult(false) đọc token đã cache cục bộ (KHÔNG
                    // gọi mạng nếu token còn hạn, thường 1 giờ), rẻ hơn hẳn getIdToken(true) (luôn
                    // là 1 round-trip mạng tới Firebase Auth). Trường hợp phổ biến nhất — mở lại
                    // app trong vòng vài giờ, quyền/Kho không đổi gì so với lần đăng nhập trước —
                    // nhờ vậy bớt được 1 round-trip mạng nữa trong đường găng trước khi thấy
                    // dashboard (implementation_plan.md mục 40). Vẫn phải force-refresh thật khi
                    // claims khác (mới đăng nhập lần đầu, hoặc admin/quản lý vừa đổi quyền/Kho) vì
                    // firestore.rules dùng request.auth.token.role — token cũ sẽ bị permission-denied.
                    const currentTokenResult = await currentUser.getIdTokenResult(false).catch(() => null);
                    const claimsMatchProfile = currentTokenResult
                        && currentTokenResult.claims.role === profile.role
                        && (currentTokenResult.claims.departmentId ?? null) === profile.departmentId;
                    if (!claimsMatchProfile) {
                        await currentUser.getIdToken(true);
                    }

                    setUserRole(profile.role);
                    setStatus(profile.status);
                    setDepartmentId(profile.departmentId ?? undefined);
                    setEmployeeName(profile.employeeName ?? undefined);
                    setExpiresAt(profile.expiresAt ? new Date(profile.expiresAt) : null);

                    // Cache values for next fast-load
                    saveSetting('cached_user_role', profile.role).catch(() => {});
                    saveSetting('cached_user_status', profile.status).catch(() => {});
                    if (profile.departmentId) saveSetting('cached_dept_id', profile.departmentId).catch(() => {});
                    if (profile.employeeName) saveSetting('cached_emp_name', profile.employeeName).catch(() => {});

                    // Tích hợp đồng bộ cài đặt cá nhân từ mây xuống máy — `settings` không nằm
                    // trong protectedKeys() của firestore.rules nên vẫn đọc trực tiếp được.
                    // KHÔNG await ở đây: bước này chỉ ảnh hưởng tuỳ chọn cá nhân (settings),
                    // không ảnh hưởng role/quyền/hiển thị gì — giữ nó trong đường găng trước
                    // đây chỉ cộng thêm 1 round-trip Firestore không cần thiết vào thời gian
                    // tới lúc thấy dashboard (đặc biệt nặng trên mobile mạng yếu). Chạy nền,
                    // tự merge khi xong, không chặn setIsLoading(false) ở finally bên dưới.
                    import('firebase/firestore').then(async ({ doc, getDoc }) => {
                        try {
                            const settingsSnap = await getDoc(doc(db, 'users', currentUser.uid));
                            const settings = settingsSnap.exists() ? settingsSnap.data().settings : undefined;
                            if (settings) {
                                mergeSettings(settings).catch(e => console.warn('Sync merge failed:', e));
                            }
                        } catch (e) {
                            console.warn('Đồng bộ cài đặt cá nhân thất bại (không ảnh hưởng app):', e);
                        }
                    });
                } catch (error) {
                    console.error("Lỗi lấy thông tin người dùng:", error);
                    // Không overwrite role/status đã cache khi lỗi mạng — cho phép dùng offline.
                } finally {
                    // Chỉ tắt spinner SAU KHI resolveSession() xong (không phải ngay khi Firebase
                    // Auth vừa xác nhận có user) — nếu tắt sớm, App.tsx render tạm với userRole
                    // vẫn null/cũ (chưa kịp nhận 'admin'...) và nháy màn "Cập Nhật Mã Kho" trước
                    // khi tự sửa lại, gây hiểu nhầm là bị mất quyền admin (đã xác nhận qua test
                    // thật 2026-07-18 — màn hình tự hết sau vài giây/F5, đúng dấu hiệu race này).
                    setIsLoading(false);
                }
            } else {
                setUserRole(null);
                setDepartmentId(undefined);
                setEmployeeName(undefined);
                setExpiresAt(null);
                setStatus('new');
                // Firebase đã xác nhận THẬT SỰ không có phiên đăng nhập — tắt cờ "tin cache" để
                // App.tsx quay lại hiện đúng màn Login (không còn lý do bỏ qua nữa).
                setHasCachedSession(false);
                saveSetting('cached_user_role', null).catch(() => {});
                saveSetting('cached_user_status', null).catch(() => {});
                saveSetting('cached_dept_id', null).catch(() => {});
                saveSetting('cached_emp_name', null).catch(() => {});
                setIsLoading(false);
            }
        });

        // Kích hoạt đồng bộ ngầm khi auth khởi tạo xong (lưu lại cleanup function)
        const cleanupSyncListeners = initSyncListeners();

        return () => {
            clearTimeout(fallbackTimer);
            unsubscribe();
            cleanupSyncListeners();
        };
    }, []);

    const requestAccess = async (requestedRole: 'manager' | 'employee', deptId: string, empName?: string) => {
        if (!user) return;
        try {
            // Gọi Cloud Function requestAccess (functions/src/session.ts) — hàm này tự
            // gửi notification cho admin/manager của deptId, client không cần gọi lại.
            await requestAccessApi(requestedRole, deptId, empName);
            setUserRole('pending');
            setStatus('pending');
            setDepartmentId(deptId);
            setEmployeeName(empName);
        } catch (error) {
            console.error("Lỗi gửi yêu cầu truy cập:", error);
            throw error;
        }
    };

    const loginWithGoogle = async () => {
        await loginProvider();
    };

    const logout = async () => {
        await logoutProvider();
        setDemoMode(false); // Xóa trạng thái demo khi dăng xuất
    };

    const activeUserRole = isDemoMode ? 'manager' : userRole;
    const activeStatus = isDemoMode ? 'approved' : status;

    return (
        <AuthContext.Provider value={{ user, userRole: activeUserRole, departmentId, employeeName, expiresAt, status: activeStatus, isLoading, hasCachedSession, loginWithGoogle, logout, isDemoMode, setDemoMode, requestAccess, functions, db }}>
            {children}
        </AuthContext.Provider>
    );
};

// Safe fallback when context is unavailable — prevents entire app crash
const SAFE_AUTH_FALLBACK: AuthContextType = {
    user: null,
    userRole: null,
    isLoading: true,
    hasCachedSession: false,
    loginWithGoogle: async () => { console.warn('[Auth] loginWithGoogle called outside AuthProvider'); },
    logout: async () => { console.warn('[Auth] logout called outside AuthProvider'); },
    isDemoMode: false,
    setDemoMode: () => {},
    requestAccess: async () => { console.warn('[Auth] requestAccess called outside AuthProvider'); },
    functions,
    db,
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        // In production, this can happen due to chunk-loading race conditions or
        // module duplication. Return a safe loading state instead of crashing.
        console.error('[Auth] useAuth called outside AuthProvider — returning safe fallback. This is likely a bundle/caching issue.');
        return SAFE_AUTH_FALLBACK;
    }
    return context;
};
