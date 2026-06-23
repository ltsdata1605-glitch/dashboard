import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * FIX: Pause Firestore listener when tab is hidden to save battery.
 * Uses getDoc on resume instead of keeping WebSocket alive 24/7.
 */
export function usePendingApprovalCount() {
    const { userRole, departmentId, isDemoMode } = useAuth();
    const [count, setCount] = useState(0);
    const unsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (isDemoMode) {
            setCount(0);
            return;
        }
        
        if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
            setCount(0);
            return;
        }

        const allowedKhos = departmentId ? departmentId.split(',').map(s => s.trim()).filter(Boolean) : [];
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('status', 'in', ['pending', 'new']));

        const processSnapshot = (snapshot: any) => {
            let pendingCount = 0;
            snapshot.forEach((doc: any) => {
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
        };

        const startListener = () => {
            // Chỉ mở 1 listener tại 1 thời điểm
            if (unsubRef.current) return;
            unsubRef.current = onSnapshot(q, processSnapshot, (error) => {
                console.error("Pending approval count realtime error:", error);
            });
        };

        const stopListener = () => {
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };

        // FIX: Khi tab hidden → tắt Firestore listener → radio chip được nghỉ
        // Khi tab visible lại → fetch 1 lần bằng getDocs rồi mở lại listener
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Fetch ngay 1 lần khi resume, rồi mở realtime listener
                getDocs(q).then(processSnapshot).catch(console.error);
                startListener();
            } else {
                stopListener(); // ← Tắt WebSocket khi không nhìn → tiết kiệm pin
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Khởi động
        if (document.visibilityState === 'visible') {
            startListener();
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopListener();
        };
    }, [userRole, departmentId, isDemoMode]);

    return count;
}
