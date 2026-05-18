import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
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
        // 1. COUNT TOTAL VISITS (Chống spam F5 bằng SessionStorage)
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

        // 3. PRESENCE PING: Khai báo tôi đang Online
        if (user) {
            const userRef = doc(db, 'users', user.uid);
            const pingPresence = () => {
                updateDoc(userRef, { lastActive: serverTimestamp() }).catch(e => console.error("Presence ping error:", e));
            };
            
            // Ping lần đầu ngay lập tức
            pingPresence();
            
            // Ping lặp lại mỗi 3 phút
            pingInterval = setInterval(pingPresence, 3 * 60 * 1000);
        }

        // 4. COUNT ONLINE USERS (Polling - Đã tắt tự động để tiết kiệm Firestore Reads)
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
        
        // Fetch ngay lần đầu khi đăng nhập (không poll lặp lại để hạn chế spam Read lên DB)
        fetchOnlineUsers();

        return () => {
            if (pingInterval) clearInterval(pingInterval);
        };
    }, [user]);

    return stats;
};
