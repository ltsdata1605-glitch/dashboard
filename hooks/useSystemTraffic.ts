import { useState, useEffect, useRef } from 'react';
import { db, app } from '../services/firebase';
import { doc, getDoc, updateDoc, setDoc, increment, collection, query, where, getCountFromServer, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
// Nhịp presence + hàm quyết định, tách ra module thuần để test được (xem services/presencePolicy.ts
// và tests/unit/presence-policy.test.ts).
import {
    PRESENCE_PING_INTERVAL_MS,
    ONLINE_WINDOW_MS,
    ONLINE_COUNT_INTERVAL_MS,
    shouldRunAgain,
} from '../services/presencePolicy';

export interface TrafficStats {
    totalVisits: number;
    onlineUsers: number;
}



export const useSystemTraffic = () => {
    const { user, userRole } = useAuth();
    const [stats, setStats] = useState<TrafficStats>({ totalVisits: 0, onlineUsers: 0 });
    const isVisibleRef = useRef(document.visibilityState === 'visible');
    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onlineIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // QUOTA FIX (2026-09-17): mốc thời gian lượt ping/đếm gần nhất.
    //
    // `startIntervals()` gọi NGAY `pingPresence()` + `fetchOnlineUsers()` rồi mới đặt interval, và
    // nó chạy lại mỗi lần tab visible trở lại — nên chỉ cần chuyển qua lại giữa các tab vài chục
    // lần là tốn đúng số đó lượt ghi/đọc Firestore, dù chưa hết chu kỳ nào. Cùng lớp lỗi với
    // handler flush ở features/sticker-event (đã sửa cùng đợt).
    const lastPingAtRef = useRef(0);
    const lastOnlineFetchAtRef = useRef(0);

    // 1. COUNT TOTAL VISITS (chỉ 1 lần mỗi session)
    useEffect(() => {
        // FIX cũ (giữ nguyên): dùng getDoc 1 lần thay vì onSnapshot listener vĩnh viễn — hiển thị
        // tổng lượt truy cập không cần realtime.
        //
        // QUOTA FIX (2026-09-17): gộp 2 hàm `incrementVisit()` + `loadTotalVisits()` làm một. Trước
        // đây cả hai cùng `getDoc` ĐÚNG 1 document `_system/stats` → 2 lượt đọc mỗi lần mở app cho
        // cùng một dữ liệu. Gộp lại cũng bỏ được chỗ đua: `loadTotalVisits()` chạy song song với
        // lượt tăng nên con số hiển thị lúc được lúc không tính lượt truy cập của chính phiên này.
        const initTrafficStats = async () => {
            const statsRef = doc(db, '_system', 'stats');
            let snap;
            try {
                snap = await getDoc(statsRef);
            } catch (e) {
                console.error("Load total visits error:", e);
                return;
            }

            const current = snap.exists() ? (snap.data()?.totalVisits || 0) : 0;
            const shouldCount = !sessionStorage.getItem('hasCountedVisit');
            // Hiển thị TRƯỚC khi ghi: lượt ghi có thất bại (vd permission) thì vẫn còn con số để
            // hiện, đúng như hành vi cũ khi 2 hàm chạy độc lập nhau.
            setStats(prev => ({ ...prev, totalVisits: current + (shouldCount ? 1 : 0) }));
            if (!shouldCount) return;

            try {
                if (!snap.exists()) {
                    await setDoc(statsRef, { totalVisits: 1 });
                } else {
                    await updateDoc(statsRef, { totalVisits: increment(1) });
                }
                sessionStorage.setItem('hasCountedVisit', 'true');
            } catch (e) {
                console.error("Traffic Counter Error:", e);
            }
        };
        initTrafficStats();

        // Không cần cleanup vì không còn onSnapshot listener
    }, []);

    // 2. PRESENCE PING + ONLINE COUNT — chỉ chạy khi tab visible
    useEffect(() => {
        const pingPresence = () => {
            if (!user || !isVisibleRef.current) return;
            // Chưa hết 1 chu kỳ kể từ lượt ping trước → bỏ qua. Chặn việc chuyển tab qua lại sinh
            // ra 1 lượt ghi Firestore mỗi lần (xem lastPingAtRef).
            if (!shouldRunAgain(lastPingAtRef.current, PRESENCE_PING_INTERVAL_MS, Date.now())) return;
            lastPingAtRef.current = Date.now();
            updateDoc(doc(db, 'users', user.uid), { lastActive: serverTimestamp() }).catch((e) => {
                // Ghi lỗi → trả mốc về để lượt sau thử lại ngay, không "mất im lặng" tới chu kỳ sau.
                lastPingAtRef.current = 0;
                console.error(e);
            });
        };

        // Chỉ admin mới có quyền list toàn bộ collection users (firestore.rules —
        // xem implementation_plan.md mục 29). Manager/employee bỏ qua hẳn, tránh gọi
        // 1 query chắc chắn permission-denied mỗi 10 phút.
        const fetchOnlineUsers = async () => {
            if (!isVisibleRef.current || userRole !== 'admin') return;
            if (!shouldRunAgain(lastOnlineFetchAtRef.current, ONLINE_COUNT_INTERVAL_MS, Date.now())) return;
            lastOnlineFetchAtRef.current = Date.now();
            try {
                const activeTime = new Date(Date.now() - ONLINE_WINDOW_MS);
                const q = query(collection(db, 'users'), where('lastActive', '>=', activeTime));
                // QUOTA FIX (2026-09-17): `getCountFromServer` thay cho `getDocs`. Trước đây tải
                // TOÀN BỘ document của mọi người đang hoạt động về client chỉ để lấy `snapshot.size`
                // — N lượt đọc cho 1 con số. Aggregation query đếm ở server: Firestore tính 1 lượt
                // đọc cho mỗi 1.000 mục index khớp, nên thực tế là 1 lượt đọc.
                const snapshot = await getCountFromServer(q);
                setStats(prev => ({ ...prev, onlineUsers: snapshot.data().count }));
            } catch (e) {
                lastOnlineFetchAtRef.current = 0;
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
                pingIntervalRef.current = setInterval(pingPresence, PRESENCE_PING_INTERVAL_MS);
            }
            fetchOnlineUsers();
            onlineIntervalRef.current = setInterval(fetchOnlineUsers, ONLINE_COUNT_INTERVAL_MS);
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
    }, [user, userRole]);

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
