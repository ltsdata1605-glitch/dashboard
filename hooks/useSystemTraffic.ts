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

        // Listen realtime for total visits
        const statsRef = doc(db, '_system', 'stats');
        const unsubStats = onSnapshot(statsRef, (docSnap) => {
            if (docSnap.exists()) {
                setStats(prev => ({ ...prev, totalVisits: docSnap.data()?.totalVisits || 0 }));
            }
        });

        return () => unsubStats();
    }, []);

    // 2. PRESENCE PING + ONLINE COUNT — chỉ chạy khi tab visible
    useEffect(() => {
        let pingInterval: ReturnType<typeof setInterval> | null = null;
        let onlineInterval: ReturnType<typeof setInterval> | null = null;

        const pingPresence = () => {
            if (!user || !isVisibleRef.current) return;
            updateDoc(doc(db, 'users', user.uid), { lastActive: serverTimestamp() }).catch(console.error);
        };

        const fetchOnlineUsers = async () => {
            if (!isVisibleRef.current) return; // Skip khi tab ẩn
            try {
                const activeTime = new Date(Date.now() - 15 * 60 * 1000);
                const q = query(collection(db, 'users'), where('lastActive', '>=', activeTime));
                const snapshot = await getDocs(q);
                setStats(prev => ({ ...prev, onlineUsers: snapshot.size }));
            } catch (e) {
                console.error("Online Query Error:", e);
            }
        };

        const startIntervals = () => {
            if (user) {
                pingPresence();
                pingInterval = setInterval(pingPresence, 5 * 60 * 1000);
            }
            fetchOnlineUsers();
            onlineInterval = setInterval(fetchOnlineUsers, 10 * 60 * 1000); // 10 phút thay vì 3 phút
        };

        const stopIntervals = () => {
            if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
            if (onlineInterval) { clearInterval(onlineInterval); onlineInterval = null; }
        };

        const handleVisibilityChange = () => {
            isVisibleRef.current = document.visibilityState === 'visible';
            if (isVisibleRef.current) {
                startIntervals(); // Resume khi tab active lại
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
