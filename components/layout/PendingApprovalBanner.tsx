import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import { AppNotification } from '../../services/notificationService';
import { Icon } from '../common/Icon';

const PendingApprovalBanner: React.FC = () => {
    const { user, userRole } = useAuth();
    const { setActiveTab } = useLayout();
    const [pendingNotifications, setPendingNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        if (!user || (userRole !== 'admin' && userRole !== 'manager')) {
            setPendingNotifications([]);
            return;
        }

        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs: AppNotification[] = [];
            snapshot.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() } as AppNotification;
                // Lọc các thông báo CHƯA ĐỌC liên quan đến Đơn chờ duyệt
                if (!data.read && (data.title.includes('Đăng ký') || data.title.includes('Yêu cầu') || data.title.includes('Phân quyền'))) {
                    notifs.push(data);
                }
            });
            setPendingNotifications(notifs);
        });

        return () => unsubscribe();
    }, [user, userRole]);

    if (pendingNotifications.length === 0) return null;

    const notifCount = pendingNotifications.length;

    return (
        <div 
            onClick={() => setActiveTab('approval')}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white overflow-hidden flex items-center cursor-pointer shadow-md z-[100] relative py-2 px-4 group"
        >
            <div className="flex-shrink-0 mr-3 animate-pulse bg-white/20 p-1.5 rounded-full">
                <Icon name="alert-circle" size={5} />
            </div>
            
            <div className="flex-1 overflow-hidden whitespace-nowrap relative">
                <div className="inline-block animate-marquee hover:pause pl-[100%] font-medium">
                    Bạn có <span className="font-black text-xl px-1">{notifCount}</span> yêu cầu chờ duyệt mới! Nhấn vào đây để xem chi tiết và cấp quyền truy cập ngay.
                </div>
            </div>

            <div className="flex-shrink-0 ml-3 bg-white/20 px-3 py-1 rounded-full text-xs font-bold font-mono group-hover:bg-white text-white group-hover:text-orange-600 transition-colors">
                XEM NGAY
            </div>
        </div>
    );
};

export default PendingApprovalBanner;
