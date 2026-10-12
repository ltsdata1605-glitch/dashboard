import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { AppIcon, type IconName } from '../shared/ui/icon';
import { NAV_TAB_ICONS } from './navIcons';
import { formatCleanDisplayName } from '../../utils/dataUtils';

interface NavSubItem {
    id: string;
    label: string;
    icon: IconName;
    externalUrl?: string;
}

interface NavMenuItem {
    id: string;
    label: string;
    icon: IconName;
    path?: string;
    externalUrl?: string;
    subItems?: NavSubItem[];
}

const NavItem = React.memo(({
    item,
    activeTab,
    setActiveTab,
}: {
    item: NavMenuItem;
    activeTab: string;
    setActiveTab: (id: string) => void;
}) => {
    const isActive = activeTab === item.id || (item.subItems?.some((sub) => activeTab === sub.id));
    const [isHovered, setIsHovered] = useState(false);
    const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);

    const handleClick = () => {
        if (item.externalUrl) {
            window.open(item.externalUrl, '_blank');
        } else {
            if (item.path === '/analysis') setActiveTab('analysis');
            else if (item.path === '/') setActiveTab('check-thuong');
            else if (item.path === '/employees') setActiveTab('employees');
            else if (item.path === '/reports') setActiveTab('reports');
            else if (item.path === '/line-bot') setActiveTab('tools-line-bot');
            else if (item.path === '/tools') setActiveTab('tools');
            else if (item.id) setActiveTab(item.id);
        }
    };

    return (
        <div 
            className="relative w-full flex items-center justify-center my-0.5"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                type="button"
                onClick={handleClick}
                title={item.label}
                aria-label={item.label}
                className={`
                    relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 group cursor-pointer
                    ${isActive
                        ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 font-semibold shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400'
                    }
                `}
            >
                {/* Active left indicator bar matching Sky blue chữ TÍCH */}
                {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sky-600 dark:bg-sky-400 rounded-r-full shadow-[0_0_8px_rgba(2,132,199,0.4)]" />
                )}

                <AppIcon 
                    name={item.icon} 
                    size="xl" 
                    className={`transition-transform duration-200 ${isActive ? 'scale-105 text-sky-600 dark:text-sky-400' : 'group-hover:scale-110'}`} 
                />

                {item.id === 'pending-approval' && (
                    <span className="absolute top-2 right-2 flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                    </span>
                )}
            </button>

            {/* Flyout Submenu for tools */}
            {hasSubItems && isHovered && (
                <div className="absolute left-full ml-2.5 top-0 py-1.5 px-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl min-w-[160px] z-[220] flex flex-col space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-0.5">
                        {item.label}
                    </div>
                    {item.subItems?.map((sub) => (
                        <button
                            key={sub.id}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (sub.externalUrl) {
                                    window.open(sub.externalUrl, '_blank');
                                } else {
                                    setActiveTab(sub.id);
                                }
                            }}
                            className={`
                                flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer
                                ${activeTab === sub.id 
                                    ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400' 
                                    : 'text-slate-600 dark:text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }
                            `}
                        >
                            <AppIcon name={sub.icon} size="sm" className="shrink-0" />
                            <span className="truncate">{sub.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Tooltip for items without subItems */}
            {!hasSubItems && isHovered && (
                <div className="absolute left-full ml-2.5 px-2.5 py-1 bg-slate-900/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap pointer-events-none transition-all duration-150 z-[220] animate-in fade-in zoom-in-95">
                    {item.label}
                </div>
            )}
        </div>
    );
});

export default function Sidebar() {
    const { isDesktopMenuOpen, activeTab, setActiveTab } = useLayout();
    const { user, userRole, employeeName, departmentId, isDemoMode, logout } = useAuth();

    // Icon theo TÊN CHỨC NĂNG (chuẩn hoá icon 2026-10-02)
    const menuItems: NavMenuItem[] = [
        { id: 'analysis', label: 'Phân tích YCX', icon: NAV_TAB_ICONS['analysis'], path: '/analysis' },
        { id: 'employees', label: 'Report BI', icon: NAV_TAB_ICONS['employees'], path: '/employees' },
        { id: 'check-thuong', label: 'Check thưởng', icon: NAV_TAB_ICONS['check-thuong'], path: '/' },
        { id: 'reports', label: 'Báo cáo', icon: NAV_TAB_ICONS['reports'], path: '/reports' },
        ...(isDemoMode || userRole === 'admin' || userRole === 'manager' ? [
            { id: 'tools-line-bot', label: 'Bot LINE', icon: NAV_TAB_ICONS['tools-line-bot'], path: '/line-bot' }
        ] : []),
        { 
            id: 'tools', 
            label: 'Công cụ', 
            icon: NAV_TAB_ICONS['tools'], 
            path: '/tools',
            subItems: [
                { id: 'tools-print-sticker', label: 'In Sticker', icon: NAV_TAB_ICONS['tools-print-sticker'] },
                { id: 'tools-phanca', label: 'Phân ca', icon: NAV_TAB_ICONS['tools-phanca'] },
                { id: 'tools-coupon', label: 'Rút gọn Coupon', icon: NAV_TAB_ICONS['tools-coupon'] },
                { id: 'tools-tax', label: 'Tính thuế', icon: NAV_TAB_ICONS['tools-tax'] },
                { id: 'tools-price-compare', label: 'So sánh giá ĐT', icon: NAV_TAB_ICONS['tools-price-compare'] }
            ]
        },
    ];

    const secondaryItems: NavMenuItem[] = [
        ...(userRole === 'pending' ? [{ id: 'pending-approval', label: 'Hồ sơ Quyền', icon: NAV_TAB_ICONS['pending-approval'], path: '/pending' }] : []),
    ];

    return (
        <AnimatePresence>
            {isDesktopMenuOpen && (
                <motion.aside
                    data-testid="desktop-nav-menu"
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="hidden lg:flex fixed top-[72px] left-8 z-[130] flex-col items-center py-2 px-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 w-[56px]"
                >
                    {/* Function Items */}
                    <div className="flex flex-col items-center w-full space-y-0.5">
                        {menuItems.map(item => (
                            <NavItem 
                                key={item.id} 
                                item={item} 
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                            />
                        ))}
                    </div>

                    {secondaryItems.length > 0 && (
                        <div className="w-full pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800/60 flex flex-col items-center">
                            {secondaryItems.map(item => (
                                <NavItem
                                    key={item.id}
                                    item={item}
                                    activeTab={activeTab}
                                    setActiveTab={setActiveTab}
                                />
                            ))}
                        </div>
                    )}

                    {/* Thin divider */}
                    <div className="w-8 h-[1px] bg-slate-100 dark:bg-slate-800 my-1.5" />

                    {/* User Profile / Settings */}
                    <div className="relative group flex items-center justify-center my-0.5">
                        <button
                            type="button"
                            onClick={() => setActiveTab('settings')}
                            title="Cài đặt & Phân quyền"
                            aria-label="Cài đặt & Phân quyền"
                            className="relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                            <div className="w-[34px] h-[34px] rounded-full bg-sky-100 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 flex items-center justify-center overflow-hidden shadow-xs">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <span className="font-bold text-xs text-sky-700 dark:text-sky-400">
                                        {user?.email ? user.email.charAt(0).toUpperCase() : (isDemoMode ? "T" : "U")}
                                    </span>
                                )}
                            </div>
                        </button>

                        {/* Flyout Card hiển thị thông tin người dùng ngay khi hover */}
                        <div className="absolute left-full ml-3 bottom-0 p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl min-w-[210px] z-[230] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-150 scale-95 group-hover:scale-100 origin-bottom-left flex flex-col gap-2.5">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 flex items-center justify-center overflow-hidden shrink-0">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        <span className="font-bold text-xs text-sky-700 dark:text-sky-400">
                                            {user?.email ? user.email.charAt(0).toUpperCase() : (isDemoMode ? "T" : "U")}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                            {employeeName || formatCleanDisplayName(user?.displayName, isDemoMode ? "Tài khoản Thử nghiệm" : "Khách")}
                                        </span>
                                        {userRole && (
                                            <span className={`text-[11px] font-bold px-1 py-0.2 rounded uppercase tracking-wider shrink-0 ${
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
                                    <span className="text-[11px] text-slate-400 truncate mt-0.5">
                                        {user?.email || (departmentId ? `Kho: ${departmentId}` : "Chế độ Offline")}
                                        {departmentId && user?.email ? ` • Kho ${departmentId}` : ''}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('settings')}
                                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 text-xs font-bold hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors text-center cursor-pointer"
                                >
                                    Phân quyền
                                </button>
                                <button
                                    type="button"
                                    onClick={() => logout()}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                    title="Đăng xuất"
                                    aria-label="Đăng xuất"
                                >
                                    <AppIcon name="logout" size="sm" />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}
