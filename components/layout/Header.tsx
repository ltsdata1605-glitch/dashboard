
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from '../shared/ui/icon';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../shared/ui/Button';

import FontSelector from './FontSelector';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useSync } from '../../contexts/SyncContext';
import { useActiveTab } from '../../contexts/LayoutContext';

interface HeaderProps {
    onNewFile: () => void;
    onLoadShiftFile?: () => void;
    onClearDepartments?: () => void;
    isClearingDepartments?: boolean;
    hasDepartmentData?: boolean;
    showNewFileButton: boolean;
    fileInfo: { filename: string; savedAt: string } | null;
    onToggleFilters?: () => void;
    onSelectHistoryFile?: (files: File[]) => void;
    onOpenHistory?: () => void;
    onClearSalesData?: () => void;
    hasSalesData?: boolean;
    salesClearTitle?: string;
    isClearingSalesData?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
    onNewFile, 
    showNewFileButton, 
    fileInfo, 
    onToggleFilters,
    onSelectHistoryFile,
    onOpenHistory,
    onClearSalesData,
    hasSalesData,
    salesClearTitle,
    isClearingSalesData
}) => {
    const { user, isDemoMode, userRole } = useAuth();
    const context = useDashboardContext();
    const [salesClearSuccess, setSalesClearSuccess] = useState(false);
    const { syncState, lastError } = useSync();
    const { activeTab } = useActiveTab();

    // Prevent hydration warnings
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSalesClear = () => {
        if (onClearSalesData) {
            onClearSalesData();
            setSalesClearSuccess(true);
            setTimeout(() => setSalesClearSuccess(false), 3000);
        }
    };

    if (activeTab !== 'analysis') return null;
    
    return (
        <>
            {syncState === 'error' && (
                <div 
                    className="w-full bg-rose-500 text-white text-xs font-bold py-1.5 px-4 flex items-center justify-between overflow-hidden relative mb-2 rounded-lg shadow-sm"
                >
                    <div className="flex-1 overflow-hidden relative h-5 flex items-center">
                        <div className="absolute whitespace-nowrap animate-marquee will-change-transform flex items-center gap-1">
                            <AppIcon name="warning" size="xs" className="shrink-0" />
                            <span>Đồng bộ dữ liệu thất bại: {lastError || "Lỗi lưu trữ đám mây. Dữ liệu tạm thời được lưu trên máy."}</span>
                        </div>
                    </div>
                </div>
            )}
            {/* Portal timestamp into mobile top bar subtitle */}
            {mounted && fileInfo && document.getElementById('mobile-topbar-subtitle') && createPortal(
                <span className="inline-flex items-center gap-1"><AppIcon name="calendar" size="xs" />Cập nhật: {fileInfo.savedAt}</span>,
                document.getElementById('mobile-topbar-subtitle')!
            )}
            {/* Note: Mobile actions are now rendered directly via FilterBar portal, so we bypass mobile-topbar-actions here. */}

        {/* Desktop: Full inline toolbar ported to Global Header */}
        {mounted && document.getElementById('global-header-actions') && createPortal(
            <div className="hidden lg:flex flex-wrap items-center gap-4 w-auto bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm">
                {/* Data Import Group */}
                <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    {(userRole === 'admin' || userRole === 'manager') && (
                        <>
                            <Button
                                variant="unstyled" size="none"
                                onClick={onNewFile}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-semibold text-sm transition-colors"
                                title="Tải lên báo cáo YCX mới (Realtime hoặc Lũy kế)"
                            >
                                <AppIcon name="upload" size="md" />
                                <span>YCX</span>
                            </Button>
                            <a 
                                href="https://report.mwgroup.vn/home/dashboard/77"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center p-2 text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 border-l border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                title="Tải dữ liệu báo cáo"
                            >
                                <AppIcon name="link" size="md" />
                            </a>
                            {onOpenHistory && (
                                <Button
                                    variant="unstyled" size="none"
                                    onClick={onOpenHistory}
                                    id="btn-desktop-history"
                                    title="Quản lý tệp đã lưu (Lũy kế)"
                                    className="flex items-center justify-center p-2 text-rose-700 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-l border-slate-100 dark:border-slate-700 transition-colors"
                                >
                                    <AppIcon name="database" size="md" />
                                </Button>
                            )}
                        </>
                    )}

                    <AnimatePresence mode="wait">
                        {hasSalesData && (
                            <motion.button
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 'auto', opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                onClick={handleSalesClear}
                                disabled={isClearingSalesData}
                                className={`p-2 transition-colors border-l border-slate-100 dark:border-slate-700 ${salesClearSuccess ? 'text-emerald-500' : 'text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-900/20 cursor-pointer'}`}
                                title={salesClearTitle || "Xóa dữ liệu YCX"}
                            >
                                <AppIcon name={salesClearSuccess ? 'check' : (isClearingSalesData ? 'loading' : 'delete')} size="md" spin={isClearingSalesData} />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <div className="border-l border-slate-100 dark:border-slate-700">
                        <FontSelector />
                    </div>
                </div>
                
                {/* Settings Group - Standalone pill like Notification */}
                {onToggleFilters && (
                    <div className="flex items-center rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-sm transition-all active:scale-95">
                        <Button
                            variant="unstyled" size="none"
                            onClick={onToggleFilters}
                            title="Bộ lọc nâng cao / Tuỳ chỉnh"
                            className="flex items-center justify-center p-2 text-white rounded-full"
                        >
                            <AppIcon name="viewOptions" size="md" />
                        </Button>
                    </div>
                )}

                {/* Notification Group */}
                <div className="flex items-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative z-[150]">
                    <NotificationDropdown buttonClassName="relative flex items-center justify-center p-2 text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors rounded-full" />
                </div>
            </div>,
            document.getElementById('global-header-actions')!
        )}

        </>
    );
};

export default Header;
