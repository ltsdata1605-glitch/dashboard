import { useState, useEffect, useRef } from 'react';
import { db, app } from '../services/firebase';
import { doc, getDoc, updateDoc, setDoc, increment, collection, query, where, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export interface TrafficStats {
    totalVisits: number;
    onlineUsers: number;
}

export const useSystemTraffic = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<TrafficStats>({ totalVisits: 0, onlineUsers: 0 });
    const isVisibleRef = useRef(document.visibilityState === 'visible');
    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onlineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 1. COUNT TOTAL VISITS (chỉ 1 lần mỗi session)
    useEffect(() => {
        const incrementVisit = async () => {
            if (!sessionStorage.getItem('hasCountedVisit')) {
                try {
                    const statsRef = doc(db, '_system', 'stats');
                    const snap = await getDoc(statsRef);
                    if (!snap.exists()) {
                        await setDoc(statsRef, { totalVisits: 1 });
                    } else {
                        await updateDoc(statsRef, { totalVisits: increment(1) });
                    }
                    sessionStorage.setItem('hasCountedVisit', 'true');
                } catch (e) {
                    console.error("Traffic Counter Error:", e);
                }
            }
        };
        incrementVisit();

        // FIX: Dùng getDoc 1 lần thay vì onSnapshot listener vĩnh viễn
        // Việc hiển thị tổng lượt truy cập không cần realtime — đọc 1 lần là đủ
        const loadTotalVisits = async () => {
            try {
                const statsRef = doc(db, '_system', 'stats');
                const snap = await getDoc(statsRef);
                if (snap.exists()) {
                    setStats(prev => ({ ...prev, totalVisits: snap.data()?.totalVisits || 0 }));
                }
            } catch (e) {
                console.error("Load total visits error:", e);
            }
        };
        loadTotalVisits();
        
        // Không cần cleanup vì không còn onSnapshot listener
    }, []);

    // 2. PRESENCE PING + ONLINE COUNT — chỉ chạy khi tab visible
    useEffect(() => {
        const pingPresence = () => {
            if (!user || !isVisibleRef.current) return;
            updateDoc(doc(db, 'users', user.uid), { lastActive: serverTimestamp() }).catch(console.error);
        };

        const fetchOnlineUsers = async () => {
            if (!isVisibleRef.current) return;
            try {
                const activeTime = new Date(Date.now() - 15 * 60 * 1000);
                const q = query(collection(db, 'users'), where('lastActive', '>=', activeTime));
                const snapshot = await getDocs(q);
                setStats(prev => ({ ...prev, onlineUsers: snapshot.size }));
            } catch (e) {
                console.error("Online Query Error:", e);
            }
        };

        // FIX: Luôn clear intervals cũ trước khi tạo mới → ngăn interval chồng lớp
        const stopIntervals = () => {
            if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
            if (onlineIntervalRef.current) { clearInterval(onlineIntervalRef.current); onlineIntervalRef.current = null; }
        };

        const startIntervals = () => {
            stopIntervals(); // ← CRITICAL: Clear trước khi start
            if (user) {
                pingPresence();
                pingIntervalRef.current = setInterval(pingPresence, 5 * 60 * 1000);
            }
            fetchOnlineUsers();
            onlineIntervalRef.current = setInterval(fetchOnlineUsers, 10 * 60 * 1000);
        };

        const handleVisibilityChange = () => {
            isVisibleRef.current = document.visibilityState === 'visible';
            if (isVisibleRef.current) {
                startIntervals();
            } else {
                stopIntervals(); // Dừng hẳn khi tab ẩn → tiết kiệm pin
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        if (isVisibleRef.current) startIntervals();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopIntervals();
        };
    }, [user]);

    // 3. GA4 visit — lazy load, chỉ 1 lần
    useEffect(() => {
        if (!sessionStorage.getItem('ga4_visit_counted')) {
            import('firebase/analytics').then(async ({ getAnalytics, logEvent, isSupported }) => {
                const supported = await isSupported();
                if (supported) {
                    const analytics = getAnalytics(app);
                    logEvent(analytics, 'ycx_dashboard_visit', {
                        user_id: user?.uid || 'anonymous',
                        method: 'web_session'
                    });
                    sessionStorage.setItem('ga4_visit_counted', 'true');
                }
            }).catch(console.error);
        }
    }, [user]);

    return stats;
};
