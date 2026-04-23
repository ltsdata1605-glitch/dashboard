
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    BarChart3, 
    LayoutDashboard, 
    Users, 
    Wrench,
    X,
    Ticket,
    Calculator,
    Sticker,
    ClipboardCheck,
    ExternalLink,
    Settings,
    HelpCircle,
    Shield
} from 'lucide-react';
import { useActiveTab } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';

const MobileBottomNav: React.FC = React.memo(() => {
    const { activeTab, setActiveTab } = useActiveTab();
    const { userRole } = useAuth();
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const mainTabs = [
        { id: 'analysis', label: 'Phân tích', icon: BarChart3 },
        { id: 'check-thuong', label: 'Check thưởng', icon: LayoutDashboard },
        { id: 'employees', label: 'Report BI', icon: Users },
    ];

    const moreTabs = [
        { id: 'tools-coupon', label: 'Chuyển đổi Coupon', icon: Ticket, externalUrl: 'https://chuy-n-i-coupon-487587635482.us-west1.run.app' },
        { id: 'tools-tax', label: 'Hoàn thuế nhận thay', icon: Calculator, externalUrl: 'https://tinhthue-netify-487587635482.us-west1.run.app' },
        { id: 'tools-sticker', label: 'Sticker Event', icon: Sticker, externalUrl: 'https://stickerevent-final-487587635482.us-west1.run.app' },
        { id: 'tools-audit', label: 'Kiểm quỹ', icon: ClipboardCheck, externalUrl: 'https://kiemquy-final-487587635482.us-west1.run.app' },
        { id: 'settings', label: 'Cài đặt', icon: Settings },
        { id: 'help', label: 'Giới thiệu', icon: HelpCircle },
    ];

    const handleTabClick = useCallback((id: string) => {
        setActiveTab(id);
        setIsMoreOpen(false);
    }, [setActiveTab]);

    const isMoreActive = moreTabs.some(t => activeTab === t.id) || activeTab.startsWith('tools-');

    return (
        <>
            {/* More Menu Overlay */}
            <AnimatePresence>
                {isMoreOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMoreOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[199]"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-[200] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl pb-[env(safe-area-inset-bottom,8px)]"
                        >
                            {/* Handle bar */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">Thêm</h3>
                                <button 
                                    onClick={() => setIsMoreOpen(false)}
                                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Tools section */}
                            <div className="px-4 py-3">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mb-2.5 flex items-center gap-2"><span className="w-4 h-px bg-slate-200 dark:bg-slate-700"></span>Công cụ<span className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></span></p>
                                <div className="grid grid-cols-4 gap-2.5">
                                    {moreTabs.filter(t => t.id.startsWith('tools-')).map(tab => (
                                        <a
                                            key={tab.id}
                                            href={'externalUrl' in tab ? (tab as any).externalUrl : undefined}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                                <tab.icon size={20} className="text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 text-center leading-tight">{tab.label}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>

                            {/* System section */}
                            <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 mt-1">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mb-2.5 flex items-center gap-2"><span className="w-4 h-px bg-slate-200 dark:bg-slate-700"></span>Hệ thống<span className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></span></p>
                                <div className="space-y-1">
                                    {moreTabs.filter(t => !t.id.startsWith('tools-')).map(tab => {
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => handleTabClick(tab.id)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                                    isActive 
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                <tab.icon size={20} />
                                                <span className="font-medium text-sm">{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Bottom Tab Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[190] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                <div className="flex items-stretch justify-around h-[56px]">
                    {mainTabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(tab.id)}
                                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                                }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="mobile-tab-indicator"
                                        className="absolute -top-px left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                                <span className={`text-[11px] leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
                            </button>
                        );
                    })}
                    
                    {/* More Tab */}
                    <button
                        onClick={() => setIsMoreOpen(!isMoreOpen)}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                            isMoreActive || isMoreOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                        }`}
                    >
                        {(isMoreActive && !isMoreOpen) && (
                            <motion.div
                                layoutId="mobile-tab-indicator"
                                className="absolute -top-px left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <Wrench size={22} strokeWidth={isMoreActive ? 2.5 : 1.8} />
                        <span className={`text-[11px] leading-tight ${isMoreActive ? 'font-bold' : 'font-medium'}`}>Khác</span>
                    </button>
                </div>
            </nav>
        </>
    );
});

MobileBottomNav.displayName = 'MobileBottomNav';
export default MobileBottomNav;
