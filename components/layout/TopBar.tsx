
import React, { useState } from 'react';
import { 
    Search, 
    Bell, 
    Moon, 
    Sun, 
    Settings, 
    User, 
    LogOut,
    ChevronDown,
    Command,
    Menu
} from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';
import { motion, AnimatePresence } from 'motion/react';

export default function Topbar() {
    const { isDarkMode, toggleDarkMode, setIsMobileSidebarOpen } = useLayout();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const notifications = [
        { id: 1, title: 'Báo cáo mới', message: 'Báo cáo doanh thu tháng 3 đã sẵn sàng.', time: '5 phút trước', read: false },
        { id: 2, title: 'Cảnh báo tồn kho', message: 'Kho Quận 7 đang thiếu mặt hàng Tủ lạnh.', time: '1 giờ trước', read: true },
        { id: 3, title: 'Nhân viên xuất sắc', message: 'Nguyễn Văn A vừa đạt KPI tháng sớm.', time: '3 giờ trước', read: false },
    ];

    return (
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[100] px-4 md:px-6 flex items-center justify-between transition-colors duration-300">
            {/* Left: Mobile Menu Toggle & Search Bar */}
            <div className="flex items-center gap-4 flex-grow max-w-xl">
                <button 
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <Menu size={24} />
                </button>

                <div className="relative group flex-grow hidden md:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Tìm kiếm báo cáo, nhân viên, kho hàng... (Ctrl + K)"
                        className="block w-full pl-10 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-bold text-slate-400">
                            <Command size={10} />
                            <span>K</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 md:gap-4 ml-auto">
                {/* Dark Mode Toggle */}
                <button
                    onClick={toggleDarkMode}
                    className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-90"
                    title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
                >
                    {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
                </button>

                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all relative active:scale-90"
                    >
                        <Bell size={20} />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    </button>

                    <AnimatePresence>
                        {isNotificationsOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsNotificationsOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-20 overflow-hidden"
                                >
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 dark:text-white">Thông báo</h3>
                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider cursor-pointer hover:underline">Đánh dấu đã đọc</span>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {notifications.map(notif => (
                                            <div key={notif.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-800/50 last:border-0 ${!notif.read ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{notif.title}</h4>
                                                    <span className="text-[10px] text-slate-400">{notif.time}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{notif.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 text-center">
                                        <button className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Xem tất cả thông báo</button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* User Profile */}
                <div className="relative">
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-2 p-1.5 pl-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                    >
                        <div className="hidden sm:flex flex-col items-end mr-1">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Admin User</span>
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Administrator</span>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center overflow-hidden">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isUserMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-20 overflow-hidden"
                                >
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Tài khoản</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">lts.truongson@gmail.com</p>
                                    </div>
                                    <div className="p-2">
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                            <User size={18} />
                                            <span>Hồ sơ cá nhân</span>
                                        </button>
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                            <Settings size={18} />
                                            <span>Cài đặt hệ thống</span>
                                        </button>
                                    </div>
                                    <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-colors">
                                            <LogOut size={18} />
                                            <span className="font-bold">Đăng xuất</span>
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
