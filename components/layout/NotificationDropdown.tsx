import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../common/Icon';
import { AppNotification, markAsRead, markAllAsRead } from '../../services/notificationService';
import { motion, AnimatePresence } from 'motion/react';
import { useLayout } from '../../contexts/LayoutContext';

const NotificationDropdown = () => {
    const { user } = useAuth();
    const { setActiveTab } = useLayout();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        if (!user) return;
        const { getDocs } = await import('firebase/firestore');
        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
        try {
            const snapshot = await getDocs(q);
            const notifs: AppNotification[] = [];
            snapshot.forEach((doc) => {
                notifs.push({ id: doc.id, ...doc.data() } as AppNotification);
            });
            setNotifications(notifs);
        } catch (e) {
            console.error("Fetch notifications error: ", e);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Cập nhật lại mỗi 10 phút để tiết kiệm quota thay vì giữ WebSocket vĩnh viễn
        const intervalId = setInterval(fetchNotifications, 10 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Fetch anew immediately when opened
            fetchNotifications();
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, user]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = (id: string) => {
        if (user) {
            markAsRead(user.uid, id);
        }
    };

    const handleMarkAll = () => {
        if (user) {
            markAllAsRead(user.uid);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex items-center justify-center p-2.5 bg-slate-50/50 dark:bg-slate-900/10 text-slate-600 dark:text-slate-400 border border-transparent rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors tooltip"
                title="Thông báo"
            >
                <Icon name="bell" size={4} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white dark:border-slate-800"></span>
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden z-[200] flex flex-col"
                    >
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/80">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                Thông báo
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs">{unreadCount} mới</span>
                                )}
                            </h3>
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAll} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                                    Đánh dấu đã đọc
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[400px]">
                            {notifications.length === 0 ? (
                                <div className="p-8 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center mb-3">
                                        <Icon name="bell-off" size={5} className="text-slate-400" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Không có thông báo mới</p>
                                    <p className="text-xs text-slate-500 mt-1">Hệ thống sẽ báo cho bạn khi có biến động về phân quyền</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {notifications.map((notif) => (
                                        <div 
                                            key={notif.id}
                                            onClick={() => {
                                                handleMarkAsRead(notif.id);
                                                if (notif.title.includes('Đăng ký') || notif.title.includes('Yêu cầu') || notif.title.includes('Phân quyền')) {
                                                    setActiveTab('approval');
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={`p-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer transition-colors flex gap-3 ${!notif.read ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                                        >
                                            <div className="mt-0.5 flex-shrink-0">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                    notif.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                                                    notif.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' :
                                                    notif.type === 'error' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' :
                                                    'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30'
                                                }`}>
                                                    <Icon name={
                                                        notif.type === 'success' ? 'check-circle' :
                                                        notif.type === 'warning' ? 'alert-circle' :
                                                        notif.type === 'error' ? 'alert-octagon' :
                                                        'info'
                                                    } size={4} />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm tracking-tight truncate ${!notif.read ? 'font-bold text-slate-800 dark:text-white' : 'font-semibold text-slate-600 dark:text-slate-300'}`}>
                                                    {notif.title}
                                                </h4>
                                                <p className={`text-xs mt-1 line-clamp-2 ${!notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500 dark:text-slate-500'}`}>
                                                    {notif.message}
                                                </p>
                                                {notif.createdAt && (
                                                    <span className="text-[10px] text-slate-400 mt-2 block">
                                                        {notif.createdAt.toDate().toLocaleString('vi-VN')}
                                                    </span>
                                                )}
                                            </div>
                                            {!notif.read && (
                                                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationDropdown;
