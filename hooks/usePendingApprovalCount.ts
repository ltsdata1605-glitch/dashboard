import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listManagedUsers } from '../services/adminUserService';

// Khoảng polling khi tab đang mở — không còn realtime (onSnapshot) vì dữ liệu giờ
// đọc qua Cloud Function listManagedUsers (functions/src/admin.ts), không phải
// Firestore SDK trực tiếp nữa. Đánh đổi chấp nhận được cho 1 con số badge (không
// cần cập nhật tức thời), đổi lại chặn được manager đọc thẳng collection('users')
// của Kho khác (xem implementation_plan.md mục 29).
const POLL_INTERVAL_MS = 45000;

/**
 * FIX: Pause polling khi tab hidden để tiết kiệm pin/mạng, fetch lại ngay khi resume.
 */
export function usePendingApprovalCount() {
    const { userRole, departmentId, isDemoMode } = useAuth();
    const [count, setCount] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isDemoMode) {
            setCount(0);
            return;
        }

        if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
            setCount(0);
            return;
        }

        let cancelled = false;

        const fetchCount = async () => {
            try {
                const users = await listManagedUsers('pending');
                if (!cancelled) setCount(users.length);
            } catch (error) {
                console.error("Pending approval count error:", error);
            }
        };

        const startPolling = () => {
            if (intervalRef.current) return;
            fetchCount();
            intervalRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);
        };

        const stopPolling = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                startPolling();
            } else {
                stopPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (document.visibilityState === 'visible') {
            startPolling();
        }

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopPolling();
        };
    }, [userRole, departmentId, isDemoMode]);

    return count;
}
