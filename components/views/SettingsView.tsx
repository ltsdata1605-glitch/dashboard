import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useActiveTab } from '../../contexts/LayoutContext';
import { Icon } from '../common/Icon';
import { motion, AnimatePresence } from 'motion/react';
import UserManagementView from './UserManagementView';
import { SettingsAccountTab } from './settings/SettingsAccountTab';
import { SettingsDataTab } from './settings/SettingsDataTab';
import { useAuth } from '../../contexts/AuthContext';

type SettingsTab = 'data' | 'account' | 'approval_link';

const SettingsView: React.FC = () => {
    const { userRole } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>('account');
    const { activeTab: globalActiveTab } = useActiveTab();
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => { 
        setMounted(true); 
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const tabs = [
        { id: 'account', label: 'Tài Khoản', icon: 'user' },
        ...(userRole === 'admin' || userRole === 'manager' ? [{ id: 'approval_link', label: 'Phân Quyền', icon: 'shield-check' }] : []),
        { id: 'data', label: 'Lọc Dữ Liệu', icon: 'server' }
    ];

    return (
        <>
            {mounted && globalActiveTab === 'settings' && document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions') && createPortal(
                <div className={`flex items-center gap-1 ${isMobile ? '' : 'bg-white/60 dark:bg-slate-900/60 p-1 sm:p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm'} animate-in fade-in zoom-in duration-300 max-w-full overflow-x-auto no-scrollbar`}>
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as SettingsTab)}
                                className={`flex items-center ${isMobile ? 'gap-1 px-2 py-1' : 'gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5'} rounded-full font-semibold ${isMobile ? 'text-[10px]' : 'text-xs sm:text-[13px]'} transition-all whitespace-nowrap shrink-0 ${
                                    isActive
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-700/60'
                                        : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <Icon name={tab.icon as any} size={isMobile ? 4.5 : 4} />
                                {!isMobile && <span>{tab.label}</span>}
                            </button>
                        );
                    })}
                </div>,
                document.getElementById(isMobile ? 'mobile-topbar-actions' : 'global-header-actions')!
            )}

            <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 min-h-screen p-2 sm:p-6 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700/50 p-3 sm:p-8 rounded-xl">
                        <AnimatePresence mode="wait">
                            {activeTab === 'approval_link' && (
                                <motion.div 
                                    key="approval_link"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="w-full"
                                >
                                    <div className="-m-6 sm:-m-8">
                                        <UserManagementView isEmbedded={true} />
                                    </div>
                                </motion.div>
                            )}



                            {activeTab === 'data' && (
                                <motion.div 
                                    key="data"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    <SettingsDataTab />
                                </motion.div>
                            )}

                            {activeTab === 'account' && (
                                <motion.div 
                                    key="account"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    <SettingsAccountTab />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsView;
