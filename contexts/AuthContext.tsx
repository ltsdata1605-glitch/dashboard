import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, loginWithGoogle as loginProvider, logoutUser as logoutProvider } from '../services/firebase';
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
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    isDemoMode: boolean;
    setDemoMode: (val: boolean) => void;
    requestAccess: (requestedRole: 'manager' | 'employee', deptId: string, empName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'manager' | 'employee' | 'pending' | null>(null);
    const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
    const [employeeName, setEmployeeName] = useState<string | undefined>(undefined);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'new' | 'expired'>('new');
    
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
            setUser(currentUser);
            setIsLoading(false); // Stop spinner immediately!
            if (currentUser) {
                try {
                    // Toàn bộ logic phân quyền (role/status/departmentId/expiresAt, cấp Super
                    // Admin, tự demote khi hết hạn) giờ chạy ở server — functions/src/session.ts.
                    // Client không còn tự updateDoc() field nhạy cảm (bị firestore.rules chặn).
                    const profile = await resolveSession();
                    // Force-refresh ID token để nhận custom claims (role/departmentId) mới nhất
                    // mà resolveSession vừa set — cần cho firestore.rules dùng request.auth.token.role.
                    await currentUser.getIdToken(true);

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
                    const { doc, getDoc } = await import('firebase/firestore');
                    const settingsSnap = await getDoc(doc(db, 'users', currentUser.uid));
                    const settings = settingsSnap.exists() ? settingsSnap.data().settings : undefined;
                    if (settings) {
                        mergeSettings(settings).catch(e => console.warn('Sync merge failed:', e));
                    }
                } catch (error) {
                    console.error("Lỗi lấy thông tin người dùng:", error);
                    // Không overwrite role/status đã cache khi lỗi mạng — cho phép dùng offline.
                }
            } else {
                setUserRole(null);
                setDepartmentId(undefined);
                setEmployeeName(undefined);
                setExpiresAt(null);
                setStatus('new');
                saveSetting('cached_user_role', null).catch(() => {});
                saveSetting('cached_user_status', null).catch(() => {});
                saveSetting('cached_dept_id', null).catch(() => {});
                saveSetting('cached_emp_name', null).catch(() => {});
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
        <AuthContext.Provider value={{ user, userRole: activeUserRole, departmentId, employeeName, expiresAt, status: activeStatus, isLoading, loginWithGoogle, logout, isDemoMode, setDemoMode, requestAccess }}>
            {children}
        </AuthContext.Provider>
    );
};

// Safe fallback when context is unavailable — prevents entire app crash
const SAFE_AUTH_FALLBACK: AuthContextType = {
    user: null,
    userRole: null,
    isLoading: true,
    loginWithGoogle: async () => { console.warn('[Auth] loginWithGoogle called outside AuthProvider'); },
    logout: async () => { console.warn('[Auth] logout called outside AuthProvider'); },
    isDemoMode: false,
    setDemoMode: () => {},
    requestAccess: async () => { console.warn('[Auth] requestAccess called outside AuthProvider'); },
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
