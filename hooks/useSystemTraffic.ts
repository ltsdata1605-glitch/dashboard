import { useState, useEffect } from 'react';
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

    useEffect(() => {
        // 1. COUNT TOTAL VISITS (Chống spam bằng SessionStorage)
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

        // 2. LISTEN TO TOTAL VISITS REAL-TIME
        const statsRef = doc(db, '_system', 'stats');
        const unsubStats = onSnapshot(statsRef, (docSnap) => {
            if (docSnap.exists()) {
                setStats(prev => ({ ...prev, totalVisits: docSnap.data()?.totalVisits || 0 }));
            }
        });

        return () => unsubStats();
    }, []);

    useEffect(() => {
        let pingInterval: ReturnType<typeof setInterval>;
        let onlineInterval: ReturnType<typeof setInterval>;

        // 3. PRESENCE PING: Khai báo tôi đang Online
        if (user) {
            const userRef = doc(db, 'users', user.uid);
            const pingPresence = () => {
                updateDoc(userRef, { lastActive: serverTimestamp() }).catch(e => console.error("Presence ping error:", e));
            };
            
            // Ping lần đầu ngay lập tức
            pingPresence();
            
            // Ping lặp lại mỗi 5 phút
            pingInterval = setInterval(pingPresence, 5 * 60 * 1000);
        }

        // 4. COUNT ONLINE USERS
        const fetchOnlineUsers = async () => {
            try {
                // Những user có tương tác trong vòng 15 phút đổ lại được xem là Online
                const activeTime = new Date(Date.now() - 15 * 60 * 1000);
                const q = query(collection(db, 'users'), where('lastActive', '>=', activeTime));
                const snapshot = await getDocs(q);
                setStats(prev => ({ ...prev, onlineUsers: snapshot.size }));
            } catch (e) {
                console.error("Online Query Error:", e);
            }
        };
        
        // Fetch ngay lần đầu
        fetchOnlineUsers();
        // Cập nhật lại mỗi 3 phút
        onlineInterval = setInterval(fetchOnlineUsers, 3 * 60 * 1000);

        return () => {
            if (pingInterval) clearInterval(pingInterval);
            if (onlineInterval) clearInterval(onlineInterval);
        };
    }, [user]);

    useEffect(() => {
        // 5. COUNT TOTAL VISITS THROUGH GA4 
        const logVisit = async () => {
            if (!sessionStorage.getItem('ga4_visit_counted')) {
                try {
                    const { getAnalytics, logEvent, isSupported } = await import('firebase/analytics');
                    const supported = await isSupported();
                    if (supported) {
                        const analytics = getAnalytics(app);
                        logEvent(analytics, 'ycx_dashboard_visit', {
                            user_id: user?.uid || 'anonymous',
                            method: 'web_session'
                        });
                        sessionStorage.setItem('ga4_visit_counted', 'true');
                    }
                } catch (e) {
                    console.error("Lỗi đếm truy cập bằng GA4:", e);
                }
            }
        };
        logVisit();
    }, [user]);

    return stats;
};
