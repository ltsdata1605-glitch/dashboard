import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, loginWithGoogle as loginProvider, logoutUser as logoutProvider } from '../services/firebase';

interface AuthContextType {
    user: User | null;
    userRole: 'admin' | 'manager' | 'employee' | 'pending' | null;
    departmentId?: string;
    employeeName?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'new';
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
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'new'>('new');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isDemoMode, setDemoMode] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
                    const userRef = doc(db, 'users', currentUser.uid);
                    const snap = await getDoc(userRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        setUserRole(data.role || 'pending');
                        setDepartmentId(data.departmentId);
                        setEmployeeName(data.employeeName);
                        setStatus(data.status || (data.role === 'pending' ? 'new' : 'approved'));
                    } else {
                        await setDoc(userRef, {
                            uid: currentUser.uid,
                            email: currentUser.email,
                            displayName: currentUser.displayName,
                            photoURL: currentUser.photoURL,
                            role: 'pending',
                            status: 'new',
                            createdAt: serverTimestamp(),
                            lastLogin: serverTimestamp()
                        });
                        setUserRole('pending');
                        setStatus('new');
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
                setStatus('new');
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
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

    return (
        <AuthContext.Provider value={{ user, userRole, departmentId, employeeName, status, isLoading, loginWithGoogle, logout, isDemoMode, setDemoMode, requestAccess }}>
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
