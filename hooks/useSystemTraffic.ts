import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { app } from '../services/firebase';

export interface TrafficStats {
    totalVisits: number;
    onlineUsers: number;
}

export const useSystemTraffic = () => {
    const { user } = useAuth();

    useEffect(() => {
        // 1. COUNT TOTAL VISITS THROUGH GA4 (Zero Firestore Quota)
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

    // Return dummy data since we removed live counting capability from client-side DB.
    return { totalVisits: 0, onlineUsers: 0 };
};
