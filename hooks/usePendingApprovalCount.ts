import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

export function usePendingApprovalCount() {
    const { userRole, departmentId, isDemoMode } = useAuth();
    const [count, setCount] = useState(0);
    const isVisibleRef = useRef(document.visibilityState === 'visible');

    const fetchCount = useCallback(async () => {
        if (isDemoMode || !userRole || (userRole !== 'admin' && userRole !== 'manager')) {
            setCount(0);
            return;
        }
        if (!isVisibleRef.current) return; // Skip khi tab ẩn

        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('status', 'in', ['pending', 'new']));
            const snapshot = await getDocs(q);
            
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
        } catch (e) {
            console.error("Pending approval count error:", e);
        }
    }, [userRole, departmentId, isDemoMode]);

    useEffect(() => {
        // Trong chế độ Demo Mode sẽ không hiển thị các thông báo duyệt của hệ thống thật
        if (isDemoMode) {
            setCount(0);
            return;
        }
        
        if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
            setCount(0);
            return;
        }

        let intervalId: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            fetchCount();
            intervalId = setInterval(fetchCount, 5 * 60 * 1000); // Poll mỗi 5 phút thay vì realtime
        };

        const stopPolling = () => {
            if (intervalId) { clearInterval(intervalId); intervalId = null; }
        };

        const handleVisibilityChange = () => {
            isVisibleRef.current = document.visibilityState === 'visible';
            if (isVisibleRef.current) {
                startPolling();
            } else {
                stopPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        if (isVisibleRef.current) startPolling();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopPolling();
        };
    }, [userRole, departmentId, isDemoMode, fetchCount]);

    return count;
}
