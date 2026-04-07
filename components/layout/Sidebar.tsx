import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    LayoutDashboard, 
    BarChart3, 
    Users, 
    Settings, 
    ChevronLeft, 
    ChevronRight, 
    Search, 
    Bell, 
    Moon, 
    Sun, 
    LogOut,
    Package,
    FileText,
    MessageSquare,
    HelpCircle,
    Menu,
    X,
    ChevronDown,
    Wrench,
    Ticket,
    Calculator,
    Sticker,
    ClipboardCheck,
    ExternalLink
} from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
    const { isSidebarCollapsed, setIsSidebarCollapsed, isMobileSidebarOpen, setIsMobileSidebarOpen, activeTab, setActiveTab } = useLayout();
    const { user, userRole, logout, isDemoMode } = useAuth();
    const [isHovered, setIsHovered] = useState(false);
    const [isTempExpanded, setIsTempExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const menuItems = [
        { id: 'analysis', label: 'Phân tích', icon: BarChart3, path: '/analysis' },
        { id: 'check-thuong', label: 'Check thưởng', icon: LayoutDashboard, path: '/' },
        { id: 'employees', label: 'Nhân viên', icon: Users, path: '/employees' },
        { id: 'inventory', label: 'Kho hàng', icon: Package, path: '/inventory' },
        { id: 'reports', label: 'Báo cáo', icon: FileText, path: '/reports' },
        { 
            id: 'tools', 
            label: 'Công cụ', 
            icon: Wrench, 
            path: '/tools',
            subItems: [
                { id: 'tools-coupon', label: 'Chuyển đổi Coupon', icon: Ticket, externalUrl: 'https://chuy-n-i-coupon-487587635482.us-west1.run.app' },
                { id: 'tools-tax', label: 'Hoàn thuế nhận thay', icon: Calculator, externalUrl: 'https://tinhthue-netify-487587635482.us-west1.run.app' },
                { id: 'tools-sticker', label: 'Sticker Event', icon: Sticker, externalUrl: 'https://stickerevent-final-487587635482.us-west1.run.app' },
                { id: 'tools-audit', label: 'Kiểm quỹ', icon: ClipboardCheck, externalUrl: 'https://kiemquy-final-487587635482.us-west1.run.app' },
            ]
        },
    ];

    const secondaryItems = [
        ...((userRole === 'admin' || userRole === 'manager') ? [{ id: 'approval', label: 'Quản trị Truy cập', icon: Users, path: '/approval' }] : []),
        ...(userRole === 'pending' ? [{ id: 'pending-approval', label: 'Hồ sơ Quyền', icon: Users, path: '/pending' }] : []),
        { id: 'help', label: 'Giới thiệu', icon: HelpCircle, path: '/help' },
    ];

    // Desktop-only logic: close mobile sidebar correctly if it was ever opened
    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [setIsMobileSidebarOpen]);

    const sidebarVariants = {
        expanded: { width: 260 },
        collapsed: { width: 80 }
    };

    const sidebarTransition: any = { duration: 0.2, ease: 'easeInOut' };
    // On mobile, never collapse if open. On desktop, follow isSidebarCollapsed state.
    const effectiveCollapsed = isMobile ? false : (isSidebarCollapsed && !isHovered && !isTempExpanded);

    const [expandedMenus, setExpandedMenus] = useState<string[]>(['tools']);

    const NavItem = React.memo(({ item, isCollapsed }: { item: any, isCollapsed: boolean }) => {
        const isActive = activeTab === item.id || (item.subItems?.some((sub: any) => activeTab === sub.id));
        const isExpanded = expandedMenus.includes(item.id);
        const hasSubItems = item.subItems && item.subItems.length > 0;
        
        const toggleExpand = (e: React.MouseEvent) => {
            if (hasSubItems && !isCollapsed) {
                e.stopPropagation();
                setExpandedMenus(prev => 
                    prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                );
            }
        };

        return (
            <div className="w-full">
                <button
                    onClick={(e) => {
                        if (hasSubItems && !isCollapsed) {
                            toggleExpand(e);
                        } else {
                            setActiveTab(item.id);
                            if (window.innerWidth < 1024) setIsMobileSidebarOpen(false);
                        }
                    }}
                    className={`
                        flex items-center w-full px-3 py-3 my-1 rounded-xl transition-all duration-200 group relative
                        ${isActive 
                            ? 'bg-[#0584c7] text-white shadow-lg shadow-[#0584c7]/20 dark:shadow-[#0584c7]/20' 
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0584c7] dark:hover:text-[#0584c7]'
                        }
                    `}
                >
                    <div className={`flex items-center justify-center min-w-[22px] transition-all duration-300 ${isCollapsed ? 'mx-auto' : ''}`}>
                        <item.icon size={22} className={isActive ? 'text-white' : 'group-hover:scale-110 transition-transform duration-300'} />
                    </div>
                    
                    <motion.div 
                        initial={false}
                        animate={{ 
                            opacity: isCollapsed ? 0 : 1,
                            width: isCollapsed ? 0 : 'auto',
                            marginLeft: isCollapsed ? 0 : 12,
                            display: isCollapsed ? 'none' : 'flex'
                        }}
                        transition={{ duration: 0.2 }}
                        className="flex-grow overflow-hidden items-center justify-between"
                    >
                        <span className="font-medium whitespace-nowrap flex items-center gap-2">
                            {item.label}
                            {item.id === 'pending-approval' && (
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                </span>
                            )}
                        </span>
                        
                        {hasSubItems && (
                            <ChevronDown 
                                size={16} 
                                className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} ${isActive ? 'text-white' : 'text-slate-400'}`} 
                            />
                        )}
                    </motion.div>

                    {isCollapsed && (
                        <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[11px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 z-50 whitespace-nowrap shadow-xl">
                            {item.label}
                        </div>
                    )}
                    
                    <motion.div 
                        initial={false}
                        animate={{ 
                            opacity: (isActive && !isCollapsed && !hasSubItems) ? 1 : 0,
                            scale: (isActive && !isCollapsed && !hasSubItems) ? 1 : 0
                        }}
                        className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white"
                    />
                </button>

                {/* Sub Items */}
                {hasSubItems && isExpanded && !isCollapsed && (
                    <div className="overflow-hidden pl-10 pr-2 space-y-1">
                        {item.subItems.map((sub: any) => {
                            const isSubActive = activeTab === sub.id;
                            
                            if (sub.externalUrl) {
                                return (
                                    <a
                                        key={sub.id}
                                        href={sub.externalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`
                                            flex items-center w-full px-3 py-2 rounded-lg text-sm transition-all duration-200
                                            text-slate-500 dark:text-slate-400 hover:text-[#0584c7] dark:hover:text-[#0584c7] hover:bg-slate-50 dark:hover:bg-slate-800/50
                                        `}
                                    >
                                        <sub.icon size={16} className="mr-2" />
                                        <span className="truncate">{sub.label}</span>
                                        <div className="flex-grow"></div>
                                        <ExternalLink size={12} className="opacity-50" />
                                    </a>
                                );
                            }

                            return (
                                <button
                                    key={sub.id}
                                    onClick={() => {
                                        setActiveTab(sub.id);
                                        if (window.innerWidth < 1024) setIsMobileSidebarOpen(false);
                                    }}
                                    className={`
                                        flex items-center w-full px-3 py-2 rounded-lg text-sm transition-all duration-200
                                        ${isSubActive
                                            ? 'bg-[#0584c7]/10 text-[#0584c7] font-bold dark:bg-[#0584c7]/20 dark:text-[#0584c7]'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-[#0584c7] dark:hover:text-[#0584c7] hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }
                                    `}
                                >
                                    <sub.icon size={16} className="mr-2" />
                                    <span className="truncate">{sub.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    });

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobileSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileSidebarOpen(false)}
                        className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110]"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <motion.aside
                initial={false}
                onMouseEnter={() => !isMobile && setIsHovered(true)}
                onClick={() => {
                    if (!isMobile && isSidebarCollapsed && !isTempExpanded) {
                        setIsTempExpanded(true);
                    }
                }}
                onMouseLeave={() => {
                    setIsHovered(false);
                    setIsTempExpanded(false);
                }}
                animate={isMobileSidebarOpen ? { x: 0, width: '85vw' } : (isMobile ? { x: '-100vw', width: '85vw' } : (effectiveCollapsed ? 'collapsed' : 'expanded'))}
                variants={sidebarVariants}
                transition={sidebarTransition}
                className={`
                    fixed top-0 left-0 h-screen z-[120] 
                    bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
                    flex flex-col transition-colors duration-300
                    ${isMobileSidebarOpen || (!isMobile && !effectiveCollapsed) ? 'shadow-2xl' : ''}
                `}
            >
                {/* Logo Section */}
                <div className="h-20 flex items-center px-5 border-b border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-3 overflow-hidden w-full">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
                            <BarChart3 className="text-white" size={24} />
                        </div>
                        <motion.div
                            initial={false}
                            animate={{ 
                                opacity: effectiveCollapsed ? 0 : 1,
                                x: effectiveCollapsed ? -20 : 0,
                                display: effectiveCollapsed ? 'none' : 'flex'
                            }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col whitespace-nowrap"
                        >
                            <span className="font-bold text-slate-800 dark:text-white text-[15px] leading-tight">Phân Tích Yêu Cầu Xuất</span>
                            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Vibe Dashboard</span>
                        </motion.div>
                    </div>
                </div>

                {/* Navigation Items */}
                <div className="flex-grow overflow-y-auto py-6 px-4 custom-scrollbar">
                    <div className="space-y-1">
                        {!effectiveCollapsed && (
                            <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Menu Chính</p>
                        )}
                        {menuItems.map(item => (
                            <NavItem key={item.id} item={item} isCollapsed={effectiveCollapsed} />
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50 space-y-1">
                        {!effectiveCollapsed && (
                            <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hệ Thống</p>
                        )}
                        {secondaryItems.map(item => (
                            <NavItem key={item.id} item={item} isCollapsed={effectiveCollapsed} />
                        ))}
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/50 flex flex-col gap-3">
                    <button 
                        onClick={() => {
                            setActiveTab('settings');
                            if (window.innerWidth < 1024) setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center transition-opacity hover:opacity-80 active:scale-95 ${effectiveCollapsed ? 'justify-center' : 'gap-3 px-2'} mt-1`}
                        title="Thông tin tài khoản"
                    >
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                    {user?.email ? user.email.charAt(0).toUpperCase() : (isDemoMode ? "T" : "U")}
                                </span>
                            )}
                        </div>
                        <motion.div
                            initial={false}
                            animate={{ 
                                opacity: effectiveCollapsed ? 0 : 1,
                                display: effectiveCollapsed ? 'none' : 'flex'
                            }}
                            className="flex flex-col overflow-hidden whitespace-nowrap text-left"
                        >
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{user?.displayName || (isDemoMode ? "Tài khoản Thử nghiệm" : "Guest")}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user?.email || "Chế độ Offline"}</span>
                        </motion.div>
                    </button>
                </div>

                {/* Mobile Close Button */}
                {isMobileSidebarOpen && (
                    <button 
                        onClick={() => setIsMobileSidebarOpen(false)}
                        className="lg:hidden absolute top-6 -right-12 p-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-lg shadow-xl"
                    >
                        <X size={20} />
                    </button>
                )}
            </motion.aside>
        </>
    );
}
