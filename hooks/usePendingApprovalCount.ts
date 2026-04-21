import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

export function usePendingApprovalCount() {
    const { userRole, departmentId, isDemoMode } = useAuth();
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (isDemoMode) {
            setCount(0);
            return;
        }
        
        if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
            setCount(0);
            return;
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('status', 'in', ['pending', 'new']));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let pendingCount = 0;
            const allowedKhos = departmentId ? departmentId.split(',').map(s => s.trim()).filter(Boolean) : [];

            snapshot.forEach((doc) => {
                const docData = doc.data() as any;
                if (userRole === 'admin') {
                    pendingCount++;
                } else if (userRole === 'manager') {
                    if ((docData.requestedRole === 'employee' || docData.role === 'pending') && allowedKhos.includes(docData.departmentId)) {
                        pendingCount++;
                    }
                }
            });
            setCount(pendingCount);
        }, (error) => {
            console.error("Pending approval count realtime error:", error);
        });

        return () => {
            unsubscribe();
        };
    }, [userRole, departmentId, isDemoMode]);

    return count;
}
