import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, loginWithGoogle as loginProvider, logoutUser as logoutProvider } from '../services/firebase';

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
    
    const [isLoading, setIsLoading] = useState(true);
    const [isDemoMode, setDemoMode] = useState(false);

    useEffect(() => {
        // Failsafe timeout: If Firebase Auth takes more than 5 seconds to respond 
        // (usually due to IDB blockage on iOS/Safari in-app browsers), stop loading.
        const fallbackTimer = setTimeout(() => {
            console.warn("Firebase Auth response timeout. Forcing app load.");
            setIsLoading(false);
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const { doc, getDoc, setDoc, serverTimestamp, updateDoc } = await import('firebase/firestore');
                    const userRef = doc(db, 'users', currentUser.uid);
                    const snap = await getDoc(userRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        
                        let currentRole = data.role || 'pending';
                        let currentStatus = data.status || (currentRole === 'pending' ? 'new' : 'approved');

                        // Bỏ qua đăng ký, cấp quyền Super Admin lập tức
                        if (currentUser.email === 'lts.truongson@gmail.com') {
                            currentRole = 'admin';
                            currentStatus = 'approved';
                            data.departmentId = 'ALL (Super Admin)';
                            if (data.role !== 'admin' || data.status !== 'approved') {
                                // Tự động sửa lại DB nếu ai đó lỡ hạ quyền
                                updateDoc(userRef, { role: 'admin', status: 'approved', departmentId: 'ALL (Super Admin)' }).catch(console.error);
                            }
                        }

                        // Check Expiration
                        if (data.expiresAt && typeof data.expiresAt.toDate === 'function') {
                            const expiryDate = data.expiresAt.toDate();
                            setExpiresAt(expiryDate);
                            if (new Date() > expiryDate && currentRole !== 'pending' && currentRole !== 'admin') {
                                // Demote expired user
                                currentRole = 'pending';
                                currentStatus = 'expired';
                                try {
                                    await updateDoc(userRef, { role: 'pending', status: 'expired' });
                                } catch (e) { console.error("Could not auto-demote:", e); }
                            }
                        } else {
                            setExpiresAt(null);
                        }

                        setUserRole(currentRole);
                        setDepartmentId(data.departmentId);
                        setEmployeeName(data.employeeName);
                        setStatus(currentStatus);
                    } else {
                        let initialRole: 'admin' | 'pending' = 'pending';
                        let initialStatus: 'approved' | 'new' = 'new';
                        let initialDept: string | undefined = undefined;

                        if (currentUser.email === 'lts.truongson@gmail.com') {
                            initialRole = 'admin';
                            initialStatus = 'approved';
                            initialDept = 'ALL (Super Admin)';
                        }

                        await setDoc(userRef, {
                            uid: currentUser.uid,
                            email: currentUser.email,
                            displayName: currentUser.displayName,
                            photoURL: currentUser.photoURL,
                            role: initialRole,
                            status: initialStatus,
                            departmentId: initialDept || '',
                            createdAt: serverTimestamp(),
                            lastLogin: serverTimestamp()
                        });
                        setUserRole(initialRole);
                        setStatus(initialStatus);
                        setDepartmentId(initialDept);
                    }
                } catch (error) {
                    console.error("Lỗi lấy thông tin người dùng:", error);
                    setUserRole('pending');
                    setStatus('new');
                }
            } else {
                setUserRole(null);
                setDepartmentId(undefined);
                setEmployeeName(undefined);
                setExpiresAt(null);
                setStatus('new');
            }
            setIsLoading(false);
            clearTimeout(fallbackTimer);
        });

        return () => {
            clearTimeout(fallbackTimer);
            unsubscribe();
        };
    }, []);

    const requestAccess = async (requestedRole: 'manager' | 'employee', deptId: string, empName?: string) => {
        if (!user) return;
        try {
            const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                role: 'pending',
                requestedRole: requestedRole,
                departmentId: deptId,
                employeeName: empName || '',
                status: 'pending',
                requestDate: serverTimestamp()
            });
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

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
