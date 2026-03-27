
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
    ClipboardCheck
} from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';

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
            { id: 'tools-coupon', label: 'Chuyển đổi Coupon', icon: Ticket },
            { id: 'tools-tax', label: 'Tính thuế nhận thưởng', icon: Calculator },
            { id: 'tools-sticker', label: 'Sticker Event', icon: Sticker },
            { id: 'tools-audit', label: 'Kiểm quỹ', icon: ClipboardCheck },
        ]
    },
];

const secondaryItems = [
    { id: 'settings', label: 'Cài đặt', icon: Settings, path: '/settings' },
    { id: 'help', label: 'Hỗ trợ', icon: HelpCircle, path: '/help' },
];

export default function Sidebar() {
    const { isSidebarCollapsed, setIsSidebarCollapsed, isMobileSidebarOpen, setIsMobileSidebarOpen, activeTab, setActiveTab } = useLayout();
    const [isHovered, setIsHovered] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

    // Update isMobile on resize and close mobile sidebar on resize to desktop
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setIsMobile(width < 1024);
            if (width >= 1024) {
                setIsMobileSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [setIsMobileSidebarOpen]);

    const sidebarVariants = {
        expanded: { width: 260 },
        collapsed: { width: 80 }
    };

    const sidebarTransition: any = { duration: 0.2, ease: 'easeInOut' };
    // On mobile, never collapse if open. On desktop, follow isSidebarCollapsed state.
    const effectiveCollapsed = isMobile ? false : (isSidebarCollapsed && !isHovered);

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
                    <div className={`flex items-center justify-center ${isCollapsed ? 'w-full' : 'mr-3'}`}>
                        <item.icon size={22} className={isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
                    </div>
                    
                    {!isCollapsed && (
                        <div className="flex-grow overflow-hidden flex items-center justify-between">
                            <span className="font-medium whitespace-nowrap">
                                {item.label}
                            </span>
                            
                            {hasSubItems && (
                                <ChevronDown 
                                    size={16} 
                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isActive ? 'text-white' : 'text-slate-400'}`} 
                                />
                            )}
                        </div>
                    )}

                    {isCollapsed && (
                        <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                            {item.label}
                        </div>
                    )}
                    
                    {isActive && !isCollapsed && !hasSubItems && (
                        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                </button>

                {/* Sub Items */}
                {hasSubItems && isExpanded && !isCollapsed && (
                    <div className="overflow-hidden pl-10 pr-2 space-y-1">
                        {item.subItems.map((sub: any) => {
                            const isSubActive = activeTab === sub.id;
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
                onMouseEnter={() => !isMobile && isSidebarCollapsed && setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                animate={isMobileSidebarOpen ? { x: 0, width: '85vw' } : (isMobile ? { x: '-100vw', width: '85vw' } : (effectiveCollapsed ? 'collapsed' : 'expanded'))}
                variants={sidebarVariants}
                transition={sidebarTransition}
                className={`
                    fixed lg:sticky top-0 left-0 h-screen z-[120] 
                    bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
                    flex flex-col transition-colors duration-300
                    ${isMobileSidebarOpen ? 'shadow-2xl' : ''}
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
                            <span className="font-bold text-slate-800 dark:text-white text-lg leading-tight">DMX Analytics</span>
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
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/50">
                    <div className={`flex items-center ${effectiveCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover" />
                        </div>
                        <motion.div
                            initial={false}
                            animate={{ 
                                opacity: effectiveCollapsed ? 0 : 1,
                                display: effectiveCollapsed ? 'none' : 'flex'
                            }}
                            className="flex flex-col overflow-hidden whitespace-nowrap"
                        >
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">Admin User</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">lts.truongson@gmail.com</span>
                        </motion.div>
                    </div>
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
