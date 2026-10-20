
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from '../shared/ui/icon';
import { Button } from '../shared/ui/Button';
import { Banner } from '../shared/ui/Banner';

import FontSelector from './FontSelector';
import NotificationBell from './NotificationBell';
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
    isSyncingCloud?: boolean;
    totalVisits?: number;
    onlineUsers?: number;
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
    isClearingSalesData,
    isSyncingCloud,
    totalVisits,
    onlineUsers
}) => {
    const { user, isDemoMode, userRole } = useAuth();
    const context = useDashboardContext();
    const [syncFeedback, setSyncFeedback] = useState<{
        message: string;
        mobileMessage: string;
        status: 'success' | 'updated' | 'error';
    } | null>(null);
    const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
    const { syncState, lastError } = useSync();
    const { activeTab } = useActiveTab();

    // Prevent hydration warnings
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // GĐ10 (2026-10-15): nút chỉ MỞ hộp xác nhận (DashboardView) — bỏ dấu ✓ "đã xoá" từng hiện NGAY lúc bấm, kể cả khi người dùng
    // huỷ. Xoá xong thì toast "Đã xoá…" báo.
    const handleSalesClear = () => onClearSalesData?.();

    useEffect(() => {
        const handleSyncResult = (e: Event) => {
            const detail = (e as CustomEvent<{ status: 'up-to-date' | 'updated' | 'error'; message: string; mobileMessage?: string }>).detail;
            if (!detail) return;
            if (feedbackTimerRef.current) {
                clearTimeout(feedbackTimerRef.current);
            }
            setSyncFeedback({
                message: detail.message,
                mobileMessage: detail.mobileMessage || detail.message,
                status: detail.status === 'error' ? 'error' : detail.status === 'updated' ? 'updated' : 'success'
            });
            feedbackTimerRef.current = setTimeout(() => {
                setSyncFeedback(null);
                feedbackTimerRef.current = null;
            }, 3500);
        };

        window.addEventListener('ycx-cloud-sync-result', handleSyncResult);
        return () => {
            window.removeEventListener('ycx-cloud-sync-result', handleSyncResult);
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        };
    }, []);

    const handleTriggerSync = () => {
        if (feedbackTimerRef.current) {
            clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = null;
        }
        setSyncFeedback(null);
        window.dispatchEvent(new CustomEvent('ycx-trigger-cloud-sync', { detail: { interactive: true } }));
    };

    if (activeTab !== 'analysis') return null;
    
    return (
        <>
            {/* Lỗi đồng bộ: thông báo ĐỨNG YÊN (Banner dùng chung) thay dải chữ chạy đỏ — chữ chạy khó đọc, Apple không dùng (GĐ4). */}
            {syncState === 'error' && (
                <Banner tone="danger" title="Đồng bộ dữ liệu thất bại" className="mb-2">
                    {lastError || 'Lỗi lưu trữ đám mây. Dữ liệu tạm thời được lưu trên máy.'}
                </Banner>
            )}
            {/* Portal timestamp & traffic stats into mobile top bar subtitle (Chuẩn Apple HIG) */}
            {mounted && (fileInfo || totalVisits !== undefined) && document.getElementById('mobile-topbar-subtitle') && createPortal(
                <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-full">
                    {fileInfo && (
                        <Button
                            variant="unstyled" size="none"
                            onClick={handleTriggerSync}
                            title="Chạm để kiểm tra & đồng bộ dữ liệu mới nhất từ đám mây"
                            className={`inline-flex items-center gap-1 text-left shrink-0 cursor-pointer transition-all duration-200 active:scale-95 ${
                                syncFeedback
                                    ? (syncFeedback.status === 'error'
                                        ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                        : 'text-emerald-600 dark:text-emerald-400 font-semibold')
                                    : isSyncingCloud
                                        ? 'text-sky-600 dark:text-sky-400 font-semibold'
                                        : 'hover:text-sky-600 dark:hover:text-sky-400 text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            {syncFeedback ? (
                                <AppIcon
                                    name={syncFeedback.status === 'error' ? 'error' : 'success'}
                                    size="xs"
                                    className={syncFeedback.status === 'error' ? 'text-rose-500' : 'text-emerald-500'}
                                />
                            ) : (
                                <AppIcon
                                    name="refresh"
                                    size="xs"
                                    spin={isSyncingCloud}
                                    className="text-sky-500 group-hover:rotate-180 transition-transform duration-300"
                                />
                            )}
                            <span className={isSyncingCloud ? 'animate-pulse' : ''}>
                                {syncFeedback
                                    ? syncFeedback.mobileMessage
                                    : isSyncingCloud
                                        ? 'Đang kiểm tra...'
                                        : (fileInfo.savedAt.length > 8 ? fileInfo.savedAt.slice(0, 8) : fileInfo.savedAt)}
                            </span>
                        </Button>
                    )}
                </div>,
                document.getElementById('mobile-topbar-subtitle')!
            )}

            {/* Portal timestamp & traffic stats into desktop header subtitle (Chuẩn Apple HIG) */}
            {mounted && (fileInfo || totalVisits !== undefined) && document.getElementById('desktop-header-subtitle') && createPortal(
                <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {fileInfo && (
                        <Button
                            variant="unstyled" size="none"
                            onClick={handleTriggerSync}
                            title="Bấm để kiểm tra & đồng bộ dữ liệu mới nhất từ đám mây"
                            className={`inline-flex items-center gap-1.5 text-left group cursor-pointer transition-all duration-200 active:scale-95 ${
                                syncFeedback
                                    ? (syncFeedback.status === 'error'
                                        ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                        : 'text-emerald-600 dark:text-emerald-400 font-semibold')
                                    : isSyncingCloud
                                        ? 'text-sky-600 dark:text-sky-400 font-semibold'
                                        : 'hover:text-sky-600 dark:hover:text-sky-400 text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            {syncFeedback ? (
                                <AppIcon
                                    name={syncFeedback.status === 'error' ? 'error' : 'success'}
                                    size="xs"
                                    className={syncFeedback.status === 'error' ? 'text-rose-500' : 'text-emerald-500'}
                                />
                            ) : (
                                <AppIcon
                                    name="refresh"
                                    size="xs"
                                    spin={isSyncingCloud}
                                    className="text-sky-500 group-hover:rotate-180 transition-transform duration-300"
                                />
                            )}
                            <span className={isSyncingCloud ? 'animate-pulse' : ''}>
                                {syncFeedback
                                    ? syncFeedback.message
                                    : isSyncingCloud
                                        ? 'Đang kiểm tra...'
                                        : `Cập nhật: ${fileInfo.savedAt}`}
                            </span>
                        </Button>
                    )}
                    {totalVisits !== undefined && (
                        <>
                            {fileInfo && <span className="text-slate-300 dark:text-slate-700">•</span>}
                            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <AppIcon name="users" size="xs" className="text-sky-500/80" />
                                <span>Tổng: <strong className="font-semibold text-slate-700 dark:text-slate-300">{totalVisits.toLocaleString()}</strong> lượt</span>
                            </span>
                        </>
                    )}
                    {onlineUsers !== undefined && (
                        <>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span>{onlineUsers} đang online</span>
                            </span>
                        </>
                    )}
                </div>,
                document.getElementById('desktop-header-subtitle')!
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

                    {hasSalesData && (
                        <Button
                            variant="unstyled" size="none"
                            onClick={handleSalesClear}
                            disabled={isClearingSalesData}
                            className={`p-2 transition-colors border-l border-slate-100 dark:border-slate-700 animate-in fade-in duration-200 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-900/20 cursor-pointer`}
                            title={salesClearTitle || "Xóa dữ liệu YCX"}
                        >
                            <AppIcon name={isClearingSalesData ? 'loading' : 'delete'} size="md" spin={isClearingSalesData} />
                        </Button>
                    )}

                </div>
                
                {/* View, Font & Notification Group (3 chức năng cùng 1 nhóm) */}
                <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative z-[150]">
                    <FontSelector 
                        containerClassName="relative flex items-center"
                        buttonClassName="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    />

                    {onToggleFilters && (
                        <div className="border-l border-slate-100 dark:border-slate-700">
                            <Button
                                variant="unstyled" size="none"
                                onClick={onToggleFilters}
                                title="Bộ lọc nâng cao / Tuỳ chỉnh"
                                className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                            >
                                <AppIcon name="viewOptions" size="md" />
                            </Button>
                        </div>
                    )}

                    <div className="border-l border-slate-100 dark:border-slate-700">
                        <NotificationBell buttonClassName="relative w-9 h-9 flex items-center justify-center text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" />
                    </div>
                </div>
            </div>,
            document.getElementById('global-header-actions')!
        )}

        </>
    );
};

export default Header;
