
import React, { useState, useCallback, useTransition, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useActiveTab } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../shared/ui/Button';
import { AppIcon, type IconName } from '../shared/ui/icon';
import { NAV_TAB_ICONS } from './navIcons';
import { Overlay } from '../shared/ui/Overlay';
import { formatCleanDisplayName } from '../../utils/dataUtils';

// Tạm giữ hiệu ứng motion cho lớp nền menu "Khác" tới khi làm lại thanh tab bằng CSS (GĐ4) — Overlay dùng chung đã bỏ motion.
const MotionOverlay = motion.create(Overlay);

const MobileBottomNav: React.FC = React.memo(() => {
    const { activeTab, setActiveTab } = useActiveTab();
    const { user, userRole, employeeName, departmentId, isDemoMode, logout } = useAuth();
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Icon theo TÊN CHỨC NĂNG (chuẩn hoá icon 2026-10-02) — cùng tên với Sidebar nên 2 thanh luôn cùng hình.
    const mainTabs: { id: string; label: string; icon: IconName }[] = [
        { id: 'analysis', label: 'Phân tích YCX', icon: NAV_TAB_ICONS['analysis'] },
        { id: 'employees', label: 'Report BI', icon: NAV_TAB_ICONS['employees'] },
        { id: 'check-thuong', label: 'Check thưởng', icon: NAV_TAB_ICONS['check-thuong'] },

    ];

    const moreTabs: { id: string; label: string; icon: IconName }[] = [
        { id: 'reports', label: 'Báo cáo', icon: NAV_TAB_ICONS['reports'] },
        { id: 'tools-print-sticker', label: 'In Sticker', icon: NAV_TAB_ICONS['tools-print-sticker'] },
        { id: 'tools-phanca', label: 'Phân ca', icon: NAV_TAB_ICONS['tools-phanca'] },
        { id: 'tools-line-bot', label: 'Bot LINE', icon: NAV_TAB_ICONS['tools-line-bot'] },
        { id: 'tools-coupon', label: 'Rút gọn Coupon', icon: NAV_TAB_ICONS['tools-coupon'] },
        { id: 'tools-tax', label: 'Tính thuế', icon: NAV_TAB_ICONS['tools-tax'] },
        { id: 'tools-price-compare', label: 'So sánh giá ĐT', icon: NAV_TAB_ICONS['tools-price-compare'] },
        { id: 'settings', label: 'Phân quyền', icon: NAV_TAB_ICONS['settings'] },
        { id: 'help', label: 'Giới thiệu', icon: NAV_TAB_ICONS['help'] },
    ];

    const handleTabClick = useCallback((id: string) => {
        startTransition(() => {
            setActiveTab(id);
        });
        setIsMoreOpen(false);
    }, [setActiveTab]);

    // Esc đóng menu như modal dùng chung (bàn phím ngoài trên iPad / laptop màn hẹp).
    useEffect(() => {
        if (!isMoreOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMoreOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isMoreOpen]);

    const isMoreActive = moreTabs.some(t => activeTab === t.id) || activeTab.startsWith('tools-');

    return (
        <>
            {/* More Menu Overlay */}
            <AnimatePresence>
                {isMoreOpen && (
                    <>
                        <MotionOverlay
                            kind="scrim"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMoreOpen(false)}
                            className="bg-black/40 backdrop-blur-sm z-[199]"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Thêm"
                            // Audit 2026-10-07 (IOS-04): khung không có trần chiều cao — iPhone xoay ngang (cao ~390px)
                            // đẩy đầu khung + nút đóng ra ngoài màn, không cuộn được tới các mục dưới. Giờ trần theo
                            // `dvh` (co theo thanh địa chỉ Safari), đầu khung cố định, phần mục bên dưới tự cuộn.
                            className="fixed bottom-0 left-0 right-0 z-[200] flex flex-col max-h-[calc(100dvh-env(safe-area-inset-top,0px)-12px)] bg-white dark:bg-slate-900 rounded-t-overlay shadow-2xl pb-[env(safe-area-inset-bottom,8px)]"
                        >
                            {/* Handle bar */}
                            <div className="flex shrink-0 justify-center pt-3 pb-2">
                                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                            </div>

                            {/* Header */}
                            <div className="flex shrink-0 items-center justify-between px-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">Thêm</h3>
                                <Button
                                    variant="unstyled" size="none"
                                    onClick={() => setIsMoreOpen(false)}
                                    className="min-h-11 min-w-11 flex items-center justify-center p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <AppIcon name="close" size="md" />
                                </Button>
                            </div>

                            {/* User Profile Card — Hiển thị ngay thông tin người đăng nhập */}
                            <div className="px-4 pt-3 pb-1 shrink-0">
                                <div className="p-3 bg-gradient-to-r from-sky-50/90 via-slate-50 to-white dark:from-sky-950/40 dark:via-slate-800/50 dark:to-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleTabClick('settings')}
                                        className="flex items-center gap-3 min-w-0 flex-1 text-left active:opacity-80 transition-opacity cursor-pointer"
                                        title="Chạm để mở Phân Quyền & Cài Đặt"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 p-0.5 shadow-sm shrink-0">
                                            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                                {user?.photoURL ? (
                                                    <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <span className="font-black text-sm text-sky-600 dark:text-sky-400">
                                                        {user?.email ? user.email.charAt(0).toUpperCase() : (isDemoMode ? "T" : "U")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                                    {employeeName || formatCleanDisplayName(user?.displayName, isDemoMode ? "Tài khoản Thử nghiệm" : "Khách")}
                                                </span>
                                                {userRole && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                                                        userRole === 'admin' 
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' 
                                                            : userRole === 'manager' 
                                                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' 
                                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                    }`}>
                                                        {userRole === 'admin' ? 'Admin' : userRole === 'manager' ? 'Quản lý' : 'Nhân viên'}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                {user?.email || (departmentId ? `Kho: ${departmentId}` : "Chế độ Offline")}
                                                {departmentId && user?.email ? ` • Kho ${departmentId}` : ''}
                                            </span>
                                        </div>
                                        <AppIcon name="chevronRight" size="sm" className="text-slate-400 shrink-0" />
                                    </button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={logout}
                                        title="Đăng xuất"
                                        aria-label="Đăng xuất"
                                        className="w-9 h-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 shrink-0"
                                    >
                                        <AppIcon name="logout" size="md" />
                                    </Button>
                                </div>
                            </div>

                            <div data-testid="mobile-more-scroll" className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                            {/* Tools section */}
                            <div className="px-4 py-3">
                                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mb-2.5 flex items-center gap-2"><span className="w-4 h-px bg-slate-200 dark:bg-slate-700"></span>Công cụ<span className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></span></p>
                                <div className="grid grid-cols-4 gap-2.5">
                                    {moreTabs.filter(t => t.id.startsWith('tools-')).map(tab => (
                                        <Button
                                            variant="unstyled" size="none"
                                            key={tab.id}
                                            onClick={() => handleTabClick(tab.id)}
                                            className="justify-start flex flex-col items-center gap-1.5 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                                                <AppIcon name={tab.icon} size="lg" className="text-sky-700" />
                                            </div>
                                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 text-center leading-tight">{tab.label}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* System section */}
                            <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 mt-1">
                                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mb-2.5 flex items-center gap-2"><span className="w-4 h-px bg-slate-200 dark:bg-slate-700"></span>Hệ thống<span className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></span></p>
                                <div className="space-y-1">
                                    {moreTabs.filter(t => !t.id.startsWith('tools-')).map(tab => {
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <Button
                                                variant="unstyled" size="none"
                                                key={tab.id}
                                                onClick={() => handleTabClick(tab.id)}
                                                className={`justify-start w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                                    isActive
                                                        ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400'
                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                } ${isPending ? 'opacity-70' : ''}`}
                                            >
                                                <AppIcon name={tab.icon} size="lg" />
                                                <span className="font-medium text-sm">{tab.label}</span>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Bottom Tab Bar */}
            <nav data-app-chrome="tabbar" className="mobile-chrome lg:hidden fixed bottom-0 left-0 right-0 z-[190] bg-white dark:bg-slate-900 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                <div className="flex items-stretch justify-around h-[56px]">
                    {mainTabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <Button
                                variant="unstyled" size="none"
                                key={tab.id}
                                onClick={() => handleTabClick(tab.id)}
                                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                                    isActive ? 'text-sky-700 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'
                                } ${isPending ? 'opacity-70' : ''}`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="mobile-tab-indicator"
                                        className="absolute -top-px left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-full bg-gradient-to-r from-sky-500 to-sky-400 dark:from-sky-400 dark:to-sky-300 shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <AppIcon name={tab.icon} size="lg" />
                                <span className={`text-[11px] leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
                            </Button>
                        );
                    })}

                    {/* More Tab */}
                    <Button
                        variant="unstyled" size="none"
                        onClick={() => setIsMoreOpen(!isMoreOpen)}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                            isMoreActive || isMoreOpen ? 'text-sky-700 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'
                        }`}
                    >
                        {(isMoreActive && !isMoreOpen) && (
                            <motion.div
                                layoutId="mobile-tab-indicator"
                                className="absolute -top-px left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-full bg-gradient-to-r from-sky-500 to-sky-400 dark:from-sky-400 dark:to-sky-300 shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <AppIcon name="navTools" size="lg" />
                        <span className={`text-[11px] leading-tight ${isMoreActive ? 'font-bold' : 'font-medium'}`}>Khác</span>
                    </Button>
                </div>
            </nav>
        </>
    );
});

MobileBottomNav.displayName = 'MobileBottomNav';
export default MobileBottomNav;
