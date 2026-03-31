import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, loginWithGoogle as loginProvider, logoutUser as logoutProvider } from '../services/firebase';

interface AuthContextType {
    user: User | null;
    userRole: 'admin' | 'manager' | 'employee' | 'pending' | null;
    isLoading: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    isDemoMode: boolean;
    setDemoMode: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'manager' | 'employee' | 'pending' | null>(null);
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
                        setUserRole(snap.data().role || 'pending');
                    } else {
                        await setDoc(userRef, {
                            uid: currentUser.uid,
                            email: currentUser.email,
                            displayName: currentUser.displayName,
                            photoURL: currentUser.photoURL,
                            role: 'pending',
                            createdAt: serverTimestamp(),
                            lastLogin: serverTimestamp()
                        });
                        setUserRole('pending');
                    }
                } catch (error) {
                    console.error("Lỗi lấy vai trò người dùng:", error);
                    setUserRole('pending');
                }
            } else {
                setUserRole(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        await loginProvider();
    };

    const logout = async () => {
        await logoutProvider();
        setDemoMode(false); // Xóa trạng thái demo khi dăng xuất
    };

    return (
        <AuthContext.Provider value={{ user, userRole, isLoading, loginWithGoogle, logout, isDemoMode, setDemoMode }}>
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
