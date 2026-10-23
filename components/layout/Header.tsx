
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from '../shared/ui/icon';
import { Button } from '../shared/ui/Button';
import { Banner } from '../shared/ui/Banner';

import FontSelector from './FontSelector';
import NotificationBell from './NotificationBell';
import HeaderSystemGroup from './HeaderSystemGroup';
import { TopBarActions } from '../shared/ui/TopBarActions';
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
    isSyncingCloud
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
            {/* Portal timestamp into mobile top bar subtitle (Chuẩn Apple HIG) */}
            {mounted && fileInfo && document.getElementById('mobile-topbar-subtitle') && createPortal(
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

            {/* Portal timestamp into desktop header subtitle (Chuẩn Apple HIG) */}
            {mounted && fileInfo && document.getElementById('desktop-header-subtitle') && createPortal(
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
                </div>,
                document.getElementById('desktop-header-subtitle')!
            )}
            {/* Note: Mobile actions are now rendered directly via FilterBar portal, so we bypass mobile-topbar-actions here. */}

        {/* Desktop: Full inline toolbar ported to Global Header via TopBarActions */}
        <TopBarActions
            systemChildren={
                onToggleFilters ? (
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
                ) : undefined
            }
        >
            {/* Data Import Group */}
            <TopBarActions.Group>
                {(userRole === 'admin' || userRole === 'manager') && (
                    <>
                        <TopBarActions.Button
                            onClick={onNewFile}
                            variant="emerald"
                            icon="upload"
                            label="YCX"
                            title="Tải lên báo cáo YCX mới (Realtime hoặc Lũy kế)"
                        />
                        <TopBarActions.Link
                            href="https://report.mwgroup.vn/home/dashboard/77"
                            icon="link"
                            title="Tải dữ liệu báo cáo"
                        />
                        {onOpenHistory && (
                            <TopBarActions.Button
                                onClick={onOpenHistory}
                                id="btn-desktop-history"
                                icon="database"
                                variant="rose"
                                borderLeft
                                title="Quản lý tệp đã lưu (Lũy kế)"
                            />
                        )}
                    </>
                )}

                {hasSalesData && (
                    <TopBarActions.Button
                        onClick={handleSalesClear}
                        disabled={isClearingSalesData}
                        icon={isClearingSalesData ? 'loading' : 'delete'}
                        spin={isClearingSalesData}
                        borderLeft
                        title={salesClearTitle || "Xóa dữ liệu YCX"}
                    />
                )}
            </TopBarActions.Group>
        </TopBarActions>

        </>
    );
};

export default Header;
