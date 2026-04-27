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

const NavItem = React.memo(({ 
    item, 
    isCollapsed, 
    activeTab, 
    expandedMenus, 
    setExpandedMenus, 
    setActiveTab, 
    setIsMobileSidebarOpen 
}: { 
    item: any, 
    isCollapsed: boolean,
    activeTab: string,
    expandedMenus: string[],
    setExpandedMenus: React.Dispatch<React.SetStateAction<string[]>>,
    setActiveTab: (id: string) => void,
    setIsMobileSidebarOpen: (val: boolean) => void
}) => {
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
                        if (item.path === '/analysis') setActiveTab('analysis');
                        else if (item.path === '/') setActiveTab('check-thuong');
                        else if (item.path === '/employees') setActiveTab('employees');
                        else if (item.path === '/inventory') setActiveTab('inventory');
                        else if (item.path === '/reports') setActiveTab('reports');
                        else if (item.path === '/tools') setActiveTab('tools');
                        else if (item.id) setActiveTab(item.id);
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
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                    )}
                </motion.div>

                {isCollapsed && (
                    <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] shadow-xl flex items-center gap-2">
                        {item.label}
                        {item.id === 'pending-approval' && (
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                        )}
                    </div>
                )}
            </button>

            {!isCollapsed && hasSubItems && (
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="ml-5 pl-4 border-l-2 border-slate-200 dark:border-slate-700/50 mt-1 space-y-1">
                                {item.subItems.map((sub: any) => (
                                    <button
                                        key={sub.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (sub.externalUrl) {
                                                window.open(sub.externalUrl, '_blank');
                                            } else {
                                                setActiveTab(sub.id);
                                                if (window.innerWidth < 1024) setIsMobileSidebarOpen(false);
                                            }
                                        }}
                                        className={`
                                            flex items-center w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative
                                            ${activeTab === sub.id 
                                                ? 'bg-sky-50 dark:bg-sky-900/30 text-[#0584c7] font-semibold' 
                                                : 'text-slate-500 dark:text-slate-400 hover:text-[#0584c7] hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }
                                        `}
                                    >
                                        <span className="flex-grow text-left">{sub.label}</span>
                                        {sub.externalUrl && (
                                            <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
});

export default function Sidebar() {
    const { isSidebarCollapsed, setIsSidebarCollapsed, isMobileSidebarOpen, setIsMobileSidebarOpen, activeTab, setActiveTab } = useLayout();
    const { user, userRole, logout, isDemoMode } = useAuth();
    const [isHovered, setIsHovered] = useState(false);
    const [isTempExpanded, setIsTempExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<string[]>(['tools']);

    const menuItems = [
        { id: 'analysis', label: 'Phân tích', icon: BarChart3, path: '/analysis' },
        { id: 'check-thuong', label: 'Check thưởng', icon: LayoutDashboard, path: '/' },
        { id: 'employees', label: 'Report BI', icon: Users, path: '/employees' },
        { id: 'inventory', label: 'Kho hàng', icon: Package, path: '/inventory' },
        { id: 'reports', label: 'Báo cáo', icon: FileText, path: '/reports' },
        { 
            id: 'tools', 
            label: 'Công cụ', 
            icon: Wrench, 
            path: '/tools',
            subItems: [
                { id: 'tools-print-sticker', label: 'In Sticker', icon: Sticker },
                { id: 'tools-coupon', label: 'Chuyển đổi Coupon', icon: Ticket, externalUrl: 'https://chuy-n-i-coupon-487587635482.us-west1.run.app' },
                { id: 'tools-tax', label: 'Hoàn thuế nhận thay', icon: Calculator, externalUrl: 'https://tinhthue-netify-487587635482.us-west1.run.app' },
                { id: 'tools-sticker', label: 'Sticker Event', icon: Sticker, externalUrl: 'https://stickerevent-final-487587635482.us-west1.run.app' },
                { id: 'tools-audit', label: 'Kiểm quỹ', icon: ClipboardCheck, externalUrl: 'https://kiemquy-final-487587635482.us-west1.run.app' },
            ]
        },
    ];

    const secondaryItems = [
        ...(userRole === 'pending' ? [{ id: 'pending-approval', label: 'Hồ sơ Quyền', icon: Users, path: '/pending' }] : []),
        { id: 'settings', label: 'Cài đặt', icon: Settings, path: '/settings' },
        { id: 'help', label: 'Giới thiệu', icon: HelpCircle, path: '/help' },
    ];

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth >= 1024) {
                setIsMobileSidebarOpen(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [setIsMobileSidebarOpen]);

    const sidebarVariants = {
        expanded: { width: 260 },
        collapsed: { width: 80 }
    };

    const sidebarTransition: any = { duration: 0.2, ease: 'easeInOut' };
    const effectiveCollapsed = isMobile ? false : (isSidebarCollapsed && !isHovered && !isTempExpanded);

    return (
        <>
            {/* Sidebar Container — Desktop Only, mobile uses MobileBottomNav */}
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
                animate={effectiveCollapsed ? 'collapsed' : 'expanded'}
                variants={sidebarVariants}
                transition={sidebarTransition}
                className={`
                    hidden lg:flex fixed top-0 left-0 h-screen z-[120] 
                    bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
                    flex-col transition-colors duration-300
                    ${!effectiveCollapsed ? 'shadow-2xl' : ''}
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
                            <NavItem 
                                key={item.id} 
                                item={item} 
                                isCollapsed={effectiveCollapsed}
                                activeTab={activeTab}
                                expandedMenus={expandedMenus}
                                setExpandedMenus={setExpandedMenus}
                                setActiveTab={setActiveTab}
                                setIsMobileSidebarOpen={setIsMobileSidebarOpen}
                            />
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50 space-y-1">
                        {!effectiveCollapsed && (
                            <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hệ Thống</p>
                        )}
                        {secondaryItems.map(item => (
                            <NavItem 
                                key={item.id} 
                                item={item} 
                                isCollapsed={effectiveCollapsed}
                                activeTab={activeTab}
                                expandedMenus={expandedMenus}
                                setExpandedMenus={setExpandedMenus}
                                setActiveTab={setActiveTab}
                                setIsMobileSidebarOpen={setIsMobileSidebarOpen}
                            />
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
            </motion.aside>
        </>
    );
}
