import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../common/Icon';
import { AppNotification, markAsRead, markAllAsRead } from '../../services/notificationService';
import { usePendingApprovals } from '../../hooks/usePendingApprovalCount';
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

// QUOTA FIX (2026-09-17): đã BỎ vòng polling riêng (ACCESS_POLL_INTERVAL_MS = 45s) ở đây.
// Component này và `hooks/usePendingApprovalCount.ts` (mount ở 2 nơi khác) cùng gọi đúng 1 Cloud
// Function `listManagedUsers('pending')` bằng 3 vòng poll độc lập — 240 lượt gọi/giờ cho mỗi
// admin/manager. Giờ tất cả dùng chung `services/pendingApprovalsStore.ts` (1 vòng poll 120s,
// 1 cache, 1 request đang bay, tự tạm dừng khi tab ẩn). Lý do đọc qua Cloud Function thay vì query
// thẳng collection('users') vẫn như cũ: firestore.rules isManager() cho manager list toàn bộ
// collection không giới hạn Kho, lọc ở client không phải bảo mật thật (implementation_plan.md
// mục 29) — server tự lọc theo Kho.

interface NotificationDropdownProps {
    buttonClassName?: string;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ buttonClassName }) => {
    const { user, userRole, departmentId } = useAuth();
    const { setActiveTab } = useActiveTab();
    // Nguồn dùng chung — hook tự lo phân quyền (chỉ admin/manager) và vòng poll.
    const { users: pendingUsers, loaded: pendingLoaded } = usePendingApprovals();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const knownNotifIdsRef = useRef<Set<string>>(new Set());
    const isInitialLoadRef = useRef(true);

    // QUOTA FIX (2026-09-17): 2 nguồn notification phải sống NGOÀI effect.
    //
    // Trước đây cả hai là biến `let` cục bộ trong MỘT effect vì cả hai đều do effect đó tự lấy về.
    // Nay phần "yêu cầu cấp quyền" đến từ `usePendingApprovals()` (nguồn dùng chung), nên nếu vẫn
    // để chung 1 effect thì effect buộc phải có `pendingUsers` trong dependency array — và mỗi lần
    // dữ liệu duyệt thay đổi sẽ HỦY RỒI DỰNG LẠI listener onSnapshot của thông báo cá nhân, vừa
    // tốn lượt đọc Firestore (đúng thứ đang đi giảm) vừa dễ sinh toast trùng. Tách làm 2 effect
    // độc lập, dùng ref làm nơi gặp nhau.
    const personalNotifsRef = useRef<AppNotification[]>([]);
    const accessNotifsRef = useRef<AppNotification[]>([]);
    const personalLoadedRef = useRef(false);
    const pendingLoadedRef = useRef(false);

    useEffect(() => {
        knownNotifIdsRef.current = new Set();
        isInitialLoadRef.current = true;
        personalNotifsRef.current = [];
        accessNotifsRef.current = [];
        personalLoadedRef.current = false;
    }, [user?.uid]);

    const updateCombinedNotifications = useCallback((bothSourcesReady: boolean) => {
            const combined = [...personalNotifsRef.current, ...accessNotifsRef.current];
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
                // CHỈ hạ cờ khi cả 2 nguồn đã báo cáo xong. Nếu hạ sớm (vd effect "yêu cầu cấp
                // quyền" chạy trước lúc chưa có dữ liệu), mọi thông báo cá nhân chưa đọc về sau sẽ
                // bị coi là MỚI và bắn toast hàng loạt mỗi lần mở app.
                if (bothSourcesReady) isInitialLoadRef.current = false;
            }

            setNotifications(combined);
    }, []);

    // EFFECT 1 — thông báo cá nhân (listener Firestore realtime).
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const unsubPersonalRef = { current: null as (() => void) | null };

        // 1. Personal notifications
        const personalQuery = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const processPersonalSnapshot = (snapshot: QuerySnapshot<DocumentData>) => {
            const next: AppNotification[] = [];
            snapshot.forEach((docSnap) => {
                next.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
            });
            personalNotifsRef.current = next;
            personalLoadedRef.current = true;
            updateCombinedNotifications(pendingLoadedRef.current);
        };

        // FIX: Tắt Firestore WebSocket listener khi tab ẩn, mở lại (kèm fetch bù 1 lần) khi tab
        // visible trở lại — tránh giữ kết nối chạy nền vô thời hạn. Phần yêu cầu cấp quyền không
        // còn ở đây nữa: store dùng chung (services/pendingApprovalsStore.ts) đã tự tạm dừng và
        // chạy lại theo trạng thái tab.
        const stopListeners = () => {
            if (unsubPersonalRef.current) { unsubPersonalRef.current(); unsubPersonalRef.current = null; }
        };

        const startListeners = () => {
            if (!unsubPersonalRef.current) {
                unsubPersonalRef.current = onSnapshot(personalQuery, processPersonalSnapshot, (error) => {
                    console.error("Personal notifications realtime error: ", error);
                });
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
        // `updateCombinedNotifications` ổn định (useCallback deps rỗng) nên KHÔNG đưa vào đây —
        // để nó vào cũng không sao, nhưng giữ đúng danh sách cũ cho rõ ý: effect này chỉ dựng lại
        // khi đổi người dùng.
    }, [user, updateCombinedNotifications]);

    // EFFECT 2 — yêu cầu cấp quyền, lấy từ nguồn dùng chung. Tách riêng để dữ liệu này thay đổi
    // KHÔNG làm dựng lại listener onSnapshot ở EFFECT 1.
    useEffect(() => {
        if (!user) return;
        pendingLoadedRef.current = pendingLoaded;
        accessNotifsRef.current = pendingUsers
            .filter((u) => u.id !== user.uid)
            .map((u) => ({
                id: `pending-${u.id}`,
                title: 'Yêu cầu cấp quyền mới',
                message: `${u.displayName || u.email} đăng ký vai trò ${u.requestedRole === 'manager' ? 'Quản Lý Kho' : 'Nhân Viên'} tại kho: ${u.departmentId}`,
                type: 'info',
                read: false,
                createdAt: toTimestampLike(u.requestDate || u.createdAt)
            } as AppNotification));
        updateCombinedNotifications(pendingLoaded && personalLoadedRef.current);
    }, [user, pendingUsers, pendingLoaded, updateCombinedNotifications]);

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
                                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 text-[11px] sm:text-xs">{unreadCount} mới</span>
                            )}
                        </h3>
                        <div className="flex items-center gap-2">
                            {(userRole === 'admin' || user?.email === 'lts.truongson@gmail.com' || user?.email === 'nguyendangkhoafit2@gmail.com') && (
                                <Button
                                    variant="unstyled" size="none"
                                    onClick={() => setIsAdminModalOpen(true)}
                                    className="p-1.5 text-slate-500 hover:text-rose-700 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors rounded-lg flex items-center justify-center shrink-0"
                                    title="Cấu hình thông báo hệ thống"
                                >
                                    <Icon name="megaphone" size={3.5} />
                                </Button>
                            )}
                            {unreadCount > 0 && (
                                <Button variant="unstyled" size="none" onClick={handleMarkAll} className="text-[11px] sm:text-xs font-bold text-sky-700 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300">
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
                                        className={`p-2.5 sm:p-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer transition-colors flex gap-2 sm:gap-3 ${!notif.read ? 'bg-sky-50/30 dark:bg-sky-900/10' : ''}`}
                                    >
                                        <div className="mt-0.5 flex-shrink-0">
                                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                                                notif.type === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                                                notif.type === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                                                notif.type === 'error' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' :
                                                'bg-sky-100 text-sky-700 dark:bg-sky-900/30'
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
                                            <p className={`text-[11px] sm:text-xs mt-0.5 sm:mt-1 line-clamp-2 ${!notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500 dark:text-slate-500'}`}>
                                                {notif.message}
                                            </p>
                                            {notif.createdAt && (
                                                <span className="text-[11px] text-slate-400 mt-2 block">
                                                    {notif.createdAt.toDate().toLocaleString('vi-VN')}
                                                </span>
                                            )}
                                        </div>
                                        {!notif.read && (
                                            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-sky-500 mt-1.5 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
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
