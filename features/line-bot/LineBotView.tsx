import React, { useState } from 'react';
import {
    Bot,
    Ticket,
    MessageSquare,
    Clock,
    Sparkles,
    ShieldCheck,
    Settings,
    History,
    HelpCircle,
    ShieldAlert,
    CheckCircle2,
    XCircle,
    ListFilter
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/shared/ui/Button';
import { useLineBotConfig } from './hooks/useLineBotConfig';
import { useCouponManager } from './hooks/useCouponManager';
import { useScheduleManager } from './hooks/useScheduleManager';
import { useKeywordLibrary } from './hooks/useKeywordLibrary';
import { useAdminDeclaration } from './hooks/useAdminDeclaration';

import { LineBotSettingsTab } from './components/LineBotSettingsTab';
import { CouponManagerTab } from './components/CouponManagerTab';
import { FilteredCouponsTab } from './components/FilteredCouponsTab';
import { SyntaxConfigTab } from './components/SyntaxConfigTab';
import { ScheduleManagerTab } from './components/ScheduleManagerTab';
import { KeywordLibraryTab } from './components/KeywordLibraryTab';
import { AdminDeclarationTab } from './components/AdminDeclarationTab';
import { AuditLogTab } from './components/AuditLogTab';
import { GroupFeaturesTab } from './components/GroupFeaturesTab';
import { LineBotOnboardingModal } from './components/LineBotOnboardingModal';

type LineBotTab = 'coupons' | 'filtered' | 'syntax' | 'schedules' | 'keywords' | 'admins' | 'settings' | 'group-features' | 'audit';

export default function LineBotView() {
    const { userRole, isDemoMode } = useAuth();
    const isManagerOrAdmin = isDemoMode || userRole === 'admin' || userRole === 'manager';

    const [activeSubTab, setActiveSubTab] = useState<LineBotTab>('coupons');
    const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

    // Hooks
    const botConfigHook = useLineBotConfig();
    const couponHook = useCouponManager();
    const scheduleHook = useScheduleManager(botConfigHook.config?.channelAccessToken);
    const keywordHook = useKeywordLibrary();
    const adminHook = useAdminDeclaration();

    // 1. Chặn quyền nếu không phải Quản lý trở lên
    if (!isManagerOrAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center animate-in fade-in">
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-3xl mb-4 border border-rose-200 dark:border-rose-900/60 shadow-sm">
                    <ShieldAlert size={42} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                    Tính Năng Giới Hạn Quyền Quản Lý
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-5 leading-relaxed">
                    Phân hệ <strong>BOT LINE Quản lý PMH & Tự động hoá</strong> chỉ áp dụng cho tài khoản từ cấp Quản lý trở lên.
                    Vui lòng liên hệ Admin hệ thống để được nâng cấp quyền truy cập.
                </p>
                <div className="text-xs text-slate-400 font-mono">
                    Vai trò hiện tại: <span className="font-bold text-slate-600 dark:text-slate-300">{userRole || 'Chưa đăng nhập'}</span>
                </div>
            </div>
        );
    }

    const tabs: Array<{ id: LineBotTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
        { id: 'coupons', label: 'Kho PMH', icon: Ticket },
        { id: 'filtered', label: 'Coupon Đã Lọc', icon: ListFilter },
        { id: 'syntax', label: 'Cú pháp & Lọc', icon: MessageSquare },
        { id: 'schedules', label: 'Hẹn Giờ Báo', icon: Clock },
        { id: 'keywords', label: 'Từ Khoá', icon: Sparkles },
        { id: 'admins', label: 'Khai Báo Admin', icon: ShieldCheck },
        { id: 'group-features', label: 'Giới Hạn Tính Năng', icon: Settings },
        { id: 'settings', label: 'Cấu Hình Bot', icon: Settings },
        { id: 'audit', label: 'Nhật Ký', icon: History }
    ];

    return (
        <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-full">
            <div className="w-full max-w-[960px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/80 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                    <div className="flex items-center gap-3.5">
                        <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-md shadow-emerald-500/20">
                            <Bot size={26} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                                    BOT LINE Quản Lý PMH
                                </h1>
                                {botConfigHook.botInfo ? (
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Online
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center gap-1">
                                        <XCircle size={12} /> Chưa kết nối
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {botConfigHook.botInfo?.displayName
                                    ? `Đang kết nối Bot: "${botConfigHook.botInfo.displayName}" (${botConfigHook.botInfo.basicId})`
                                    : 'Hệ thống cấp phát mã PMH tự động và trợ lý thông báo qua LINE'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setIsOnboardingOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-xs"
                        >
                            <HelpCircle size={16} />
                            <span>Hướng dẫn tạo Bot</span>
                        </Button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                    {tabs.map(tab => {
                        const IconComp = tab.icon;
                        const isActive = activeSubTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveSubTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                    isActive
                                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                <IconComp size={15} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Tab Contents */}
                <div className="min-h-[400px]">
                    {activeSubTab === 'coupons' && (
                        <CouponManagerTab
                            coupons={couponHook.coupons}
                            filteredCoupons={couponHook.filteredCoupons}
                            isLoading={couponHook.isLoading}
                            searchQuery={couponHook.searchQuery}
                            setSearchQuery={couponHook.setSearchQuery}
                            statusFilter={couponHook.statusFilter}
                            setStatusFilter={couponHook.setStatusFilter}
                            typeFilter={couponHook.typeFilter}
                            setTypeFilter={couponHook.setTypeFilter}
                            availableTypes={couponHook.availableTypes}
                            stockSummary={couponHook.stockSummary}
                            onImportCoupons={couponHook.importCoupons}
                            onRevokeCoupon={couponHook.revokeCoupon}
                            onDeleteCoupon={couponHook.deleteCoupon}
                            onDeleteCouponsBatch={couponHook.deleteCouponsBatch}
                            onDeleteAllCoupons={couponHook.deleteAllCoupons}
                            onExportExcel={couponHook.exportToExcel}
                            onRefresh={couponHook.loadCoupons}
                            onCopyCoupon={couponHook.recordCouponCopied}
                        />
                    )}

                {activeSubTab === 'filtered' && (
                    <FilteredCouponsTab
                        userId={botConfigHook.config?.userId || ''}
                    />
                )}

                {activeSubTab === 'syntax' && (
                    <SyntaxConfigTab
                        config={botConfigHook.config}
                        isSaving={botConfigHook.isSaving}
                        onSaveConfig={botConfigHook.saveConfig}
                        interactedUsers={adminHook.interactedUsers}
                        isInteractedLoading={adminHook.isInteractedLoading}
                        onRefreshInteracted={adminHook.loadInteractedUsers}
                    />
                )}

                {activeSubTab === 'schedules' && (
                    <ScheduleManagerTab
                        schedules={scheduleHook.schedules}
                        groups={scheduleHook.groups}
                        isLoading={scheduleHook.isLoading}
                        isTriggering={scheduleHook.isTriggering}
                        onSaveSchedule={scheduleHook.saveSchedule}
                        onDeleteSchedule={scheduleHook.deleteSchedule}
                        onToggleActive={scheduleHook.toggleActive}
                        onTriggerNow={scheduleHook.triggerNow}
                        onRefresh={() => {
                            scheduleHook.loadSchedules();
                            scheduleHook.loadGroups();
                        }}
                        onAddManualGroup={scheduleHook.addManualGroup}
                    />
                )}

                {activeSubTab === 'keywords' && (
                    <KeywordLibraryTab
                        keywords={keywordHook.keywords}
                        isLoading={keywordHook.isLoading}
                        onSaveKeyword={keywordHook.saveKeyword}
                        onDeleteKeyword={keywordHook.deleteKeyword}
                        onToggleActive={keywordHook.toggleActive}
                        onRefresh={keywordHook.loadKeywords}
                    />
                )}

                {activeSubTab === 'admins' && (
                    <AdminDeclarationTab
                        admins={adminHook.admins}
                        isLoading={adminHook.isLoading}
                        botToken={botConfigHook.config?.channelAccessToken}
                        onSaveAdmin={adminHook.saveAdmin}
                        onDeleteAdmin={adminHook.deleteAdmin}
                        onToggleActive={adminHook.toggleActive}
                        onRefresh={adminHook.loadAdmins}
                        interactedUsers={adminHook.interactedUsers}
                        isInteractedLoading={adminHook.isInteractedLoading}
                        onRefreshInteracted={adminHook.loadInteractedUsers}
                        onAddAdminFromInteracted={adminHook.addAdminFromInteracted}
                    />
                )}

                {activeSubTab === 'group-features' && (
                    <GroupFeaturesTab
                        userId={botConfigHook.config?.userId || ''}
                        groups={scheduleHook.groups}
                    />
                )}

                {activeSubTab === 'settings' && (
                    <LineBotSettingsTab
                        config={botConfigHook.config}
                        botInfo={botConfigHook.botInfo}
                        groups={scheduleHook.groups}
                        isSaving={botConfigHook.isSaving}
                        isVerifying={botConfigHook.isVerifying}
                        personalWebhookUrl={botConfigHook.personalWebhookUrl}
                        onVerifyToken={botConfigHook.verifyToken}
                        onSaveConfig={botConfigHook.saveConfig}
                        onOpenGuide={() => setIsOnboardingOpen(true)}
                    />
                )}

                {activeSubTab === 'audit' && (
                    <AuditLogTab />
                )}
            </div>

            {/* Onboarding Guide Modal */}
            <LineBotOnboardingModal
                isOpen={isOnboardingOpen}
                onClose={() => setIsOnboardingOpen(false)}
                webhookUrl={botConfigHook.personalWebhookUrl}
            />
            </div>
        </div>
    );
}
