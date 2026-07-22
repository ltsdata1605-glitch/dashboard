import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../common/Icon';
import { AppNotification, markAsRead, markAllAsRead } from '../../services/notificationService';
import { listManagedUsers } from '../../services/adminUserService';
import { useActiveTab } from '../../contexts/LayoutContext';
import toast from 'react-hot-toast';
import AdminAnnouncementModal from '../modals/AdminAnnouncementModal';
import { Button } from '../shared/ui/Button';

// listManagedUsers (Cloud Function) trả ISO string cho ngày tháng (Timestamp Firestore
// không "sống sót" qua RPC) — bọc lại có .toMillis()/.toDate() để khớp shape AppNotification
// hiện có (dùng ở dòng sort + render bên dưới).
const toTimestampLike = (iso?: string | null) => {
    const ms = iso ? new Date(iso).getTime() : 0;
    return { toMillis: () => ms, toDate: () => new Date(ms) };
};

// Khoảng polling khi tab đang mở — thay cho onSnapshot trực tiếp trên collection('users')
// (trước đây dựa vào firestore.rules isManager() cho manager list toàn bộ collection,
// không giới hạn Kho — lọc allowedKhos chỉ ở client không phải bảo mật thật). Đánh đổi
// chấp nhận được: mất tính tức thời, đổi lại chặn được manager đọc thẳng Kho khác. Xem
// implementation_plan.md mục 29.
const ACCESS_POLL_INTERVAL_MS = 45000;

interface NotificationDropdownProps {
    buttonClassName?: string;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ buttonClassName }) => {
    const { user, userRole, departmentId } = useAuth();
    const { setActiveTab } = useActiveTab();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const knownNotifIdsRef = useRef<Set<string>>(new Set());
    const isInitialLoadRef = useRef(true);

    useEffect(() => {
        knownNotifIdsRef.current = new Set();
        isInitialLoadRef.current = true;
    }, [user?.uid]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const unsubPersonalRef = { current: null as (() => void) | null };
        const accessPollRef = { current: null as ReturnType<typeof setInterval> | null };

        let personalNotifs: AppNotification[] = [];
        let accessNotifs: AppNotification[] = [];

        const updateCombinedNotifications = () => {
            const combined = [...personalNotifs, ...accessNotifs];
            // Sort by createdAt descending
            combined.sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0) || 0;
                const timeB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0) || 0;
                return timeB - timeA;
            });

            // Trigger Toast notifications for new unread ones
            if (!isInitialLoadRef.current) {
                combined.forEach(notif => {
                    if (!notif.read && !knownNotifIdsRef.current.has(notif.id)) {
                        knownNotifIdsRef.current.add(notif.id);
                        
                        toast(
                            <div className="flex flex-col gap-0.5 text-left">
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{notif.title}</span>
                                <span className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">{notif.message}</span>
                            </div>,
                            {
                                duration: 6000,
                                icon: notif.type === 'success' ? '✅' : notif.type === 'warning' ? '⚠️' : notif.type === 'error' ? '❌' : '🔔'
                            }
                        );
                    }
                });
            } else {
                combined.forEach(notif => {
                    knownNotifIdsRef.current.add(notif.id);
                });
                isInitialLoadRef.current = false;
            }

            setNotifications(combined);
        };

        // 1. Personal notifications
        const personalQuery = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const processPersonalSnapshot = (snapshot: QuerySnapshot<DocumentData>) => {
            personalNotifs = [];
            snapshot.forEach((docSnap) => {
                personalNotifs.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
            });
            updateCombinedNotifications();
        };

        // 2. Access requests (if admin or manager) — đọc qua Cloud Function listManagedUsers
        // (functions/src/admin.ts) thay vì query thẳng collection('users'): trước đây
        // firestore.rules isManager() cho manager list toàn bộ collection (không giới hạn
        // Kho), lọc allowedKhos chỉ ở client không phải bảo mật thật. Server giờ tự lọc
        // theo Kho cho manager — không còn realtime, thay bằng polling (xem hằng số phía trên).
        const isReviewer = userRole === 'admin' || userRole === 'manager';

        const fetchAccessNotifs = async () => {
            if (!isReviewer) { accessNotifs = []; updateCombinedNotifications(); return; }
            try {
                const users = await listManagedUsers('pending');
                accessNotifs = users
                    .filter((u) => u.id !== user.uid)
                    .map((u) => ({
                        id: `pending-${u.id}`,
                        title: 'Yêu cầu cấp quyền mới',
                        message: `${u.displayName || u.email} đăng ký vai trò ${u.requestedRole === 'manager' ? 'Quản Lý Kho' : 'Nhân Viên'} tại kho: ${u.departmentId}`,
                        type: 'info',
                        read: false,
                        createdAt: toTimestampLike(u.requestDate || u.createdAt)
                    } as AppNotification));
                updateCombinedNotifications();
            } catch (error) {
                console.error("Access requests fetch error:", error);
            }
        };

        // FIX: Tắt Firestore WebSocket listener + polling khi tab ẩn, mở lại (kèm fetch bù
        // 1 lần) khi tab visible trở lại — tránh giữ kết nối/polling chạy nền vô thời hạn
        // (khớp pattern đã áp dụng ở usePendingApprovalCount.ts / useSystemTraffic.ts).
        const stopListeners = () => {
            if (unsubPersonalRef.current) { unsubPersonalRef.current(); unsubPersonalRef.current = null; }
            if (accessPollRef.current) { clearInterval(accessPollRef.current); accessPollRef.current = null; }
        };

        const startListeners = () => {
            if (!unsubPersonalRef.current) {
                unsubPersonalRef.current = onSnapshot(personalQuery, processPersonalSnapshot, (error) => {
                    console.error("Personal notifications realtime error: ", error);
                });
            }
            if (isReviewer && !accessPollRef.current) {
                fetchAccessNotifs();
                accessPollRef.current = setInterval(fetchAccessNotifs, ACCESS_POLL_INTERVAL_MS);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                getDocs(personalQuery).then(processPersonalSnapshot).catch(console.error);
                startListeners();
            } else {
                stopListeners();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        if (document.visibilityState === 'visible') startListeners();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopListeners();
        };
    }, [user, userRole, departmentId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside, { passive: true });
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = (id: string) => {
        if (user && !id.startsWith('pending-')) {
            markAsRead(user.uid, id);
        }
    };

    const handleMarkAll = () => {
        if (user) {
            markAllAsRead(user.uid);
        }
    };

    return (
        <div className="relative z-[300]" ref={dropdownRef}>
            <Button
                variant="unstyled" size="none"
                onClick={() => setIsOpen(!isOpen)}
                className={`${buttonClassName || "relative flex items-center justify-center p-2.5 bg-slate-50/50 dark:bg-slate-900/10 text-slate-600 dark:text-slate-400 border border-transparent rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors tooltip"}`}
                title="Thông báo"
            >
                <Icon name="bell" size={5} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white dark:border-slate-800"></span>
                    </span>
                )}
            </Button>

            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-72 sm:w-96 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden z-[400] flex flex-col animate-in fade-in slide-in-from-top-2 duration-150"
                >
                    <div className="p-2.5 sm:p-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/80">
                        <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-1.5 sm:gap-2">
                            Thông báo
                            {unreadCount > 0 && (
                                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] sm:text-xs">{unreadCount} mới</span>
                            )}
                        </h3>
                        <div className="flex items-center gap-2">
                            {(userRole === 'admin' || user?.email === 'lts.truongson@gmail.com' || user?.email === 'nguyendangkhoafit2@gmail.com') && (
                                <Button
                                    variant="unstyled" size="none"
                                    onClick={() => setIsAdminModalOpen(true)}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors rounded-lg flex items-center justify-center shrink-0"
                                    title="Cấu hình thông báo hệ thống"
                                >
                                    <Icon name="megaphone" size={3.5} />
                                </Button>
                            )}
                            {unreadCount > 0 && (
                                <Button variant="unstyled" size="none" onClick={handleMarkAll} className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                                    Đánh dấu đã đọc
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[350px] sm:max-h-[400px]">
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
                                        className={`p-2.5 sm:p-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer transition-colors flex gap-2 sm:gap-3 ${!notif.read ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                                    >
                                        <div className="mt-0.5 flex-shrink-0">
                                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
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
                                                } size={3.5} className="sm:hidden" />
                                                <Icon name={
                                                    notif.type === 'success' ? 'check-circle' :
                                                    notif.type === 'warning' ? 'alert-circle' :
                                                    notif.type === 'error' ? 'alert-octagon' :
                                                    'info'
                                                } size={4} className="hidden sm:block" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-xs sm:text-sm tracking-tight truncate ${!notif.read ? 'font-bold text-slate-800 dark:text-white' : 'font-semibold text-slate-600 dark:text-slate-300'}`}>
                                                {notif.title}
                                            </h4>
                                            <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 line-clamp-2 ${!notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500 dark:text-slate-500'}`}>
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
                </div>
            )}
            <AdminAnnouncementModal 
                isOpen={isAdminModalOpen} 
                onClose={() => setIsAdminModalOpen(false)} 
            />
        </div>
    );
};

export default NotificationDropdown;
