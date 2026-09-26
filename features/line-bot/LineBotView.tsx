import React, { useState, useRef, useEffect } from 'react';
import {
    Bot,
    Ticket,
    MessageSquare,
    Clock,
    Sparkles,
    ShieldCheck,
    Settings,
    HelpCircle,
    ShieldAlert,
    CheckCircle2,
    XCircle,
    ListFilter,
    Building2,
    User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/shared/ui/Button';
import { useBotScope } from './hooks/useBotScope';
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
import { GroupFeaturesTab } from './components/GroupFeaturesTab';
import { LineBotOnboardingModal } from './components/LineBotOnboardingModal';

type LineBotTab = 'coupons' | 'filtered' | 'schedules' | 'keywords' | 'admins' | 'group-features' | 'syntax' | 'settings';

export default function LineBotView() {
    const { userRole, isDemoMode } = useAuth();
    const isManagerOrAdmin = isDemoMode || userRole === 'admin' || userRole === 'manager';

    const [activeSubTab, setActiveSubTab] = useState<LineBotTab>('coupons');
    const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
    const tabBarRef = useRef<HTMLDivElement>(null);

    // Quản lý phạm vi Bot: Kế thừa Bot Kho hoặc Dùng Bot cá nhân riêng biệt
    const botScopeHook = useBotScope();
    const {
        effectiveBotId,
        scopeMode,
        warehouseBot,
        hasWarehouseBot,
        isInheriting,
        departmentId: currentDept,
        switchScope
    } = botScopeHook;

    // Mobile: 9 tab không vừa 1 màn — cuộn tab đang chọn vào tầm nhìn để người dùng luôn thấy mình đang ở đâu.
    useEffect(() => {
        const el = tabBarRef.current?.querySelector<HTMLElement>(`[data-tab-id="${activeSubTab}"]`);
        el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }, [activeSubTab]);

    // Hooks - được truyền effectiveBotId (tự động chuyển sang Bot kho hoặc Bot riêng)
    const botConfigHook = useLineBotConfig(effectiveBotId);
    const couponHook = useCouponManager(effectiveBotId);
    const scheduleHook = useScheduleManager(botConfigHook.config?.channelAccessToken, effectiveBotId);
    const keywordHook = useKeywordLibrary(effectiveBotId);
    const adminHook = useAdminDeclaration(effectiveBotId);

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
        { id: 'coupons', label: 'Coupon Event', icon: Ticket },
        { id: 'filtered', label: 'Coupon Lọc', icon: ListFilter },
        { id: 'schedules', label: 'Gửi Notify', icon: Clock },
        { id: 'keywords', label: 'Chat BOT', icon: Sparkles },
        { id: 'admins', label: 'Admin', icon: ShieldCheck },
        { id: 'group-features', label: 'Cấu hình Nhóm', icon: Settings },
        { id: 'syntax', label: 'Cú pháp & Lọc', icon: MessageSquare },
        { id: 'settings', label: 'Cấu Hình Bot', icon: Settings }
    ];

    return (
        <div className="w-full flex justify-center bg-slate-50/50 dark:bg-slate-900/60 min-h-full">
            <div className="w-full max-w-[960px] mx-auto p-2 sm:p-4 lg:p-6 space-y-2 sm:space-y-3.5 animate-in fade-in duration-150 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
                {/* Mini Status Bar — Tinh gọn chuẩn Report BI, không chiếm diện tích màn hình iPhone */}
                <div className="flex flex-row items-center justify-between gap-2.5 bg-white dark:bg-slate-800/90 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {botConfigHook.botInfo?.pictureUrl ? (
                            <img
                                src={botConfigHook.botInfo.pictureUrl}
                                alt="Bot avatar"
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl shadow-xs object-cover shrink-0 ring-1 ring-slate-200/80 dark:ring-slate-700"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="p-1.5 sm:p-2 bg-sky-600 text-white rounded-lg sm:rounded-xl shadow-xs shrink-0">
                                <Bot size={16} />
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {botConfigHook.botInfo?.displayName || 'BOT LINE Quản Lý PMH'}
                                </span>
                                {botConfigHook.botInfo ? (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-1 shrink-0 whitespace-nowrap">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Online
                                    </span>
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center gap-1 shrink-0 whitespace-nowrap">
                                        <XCircle size={10} /> Chưa kết nối
                                    </span>
                                )}

                                {/* Badge phạm vi Bot */}
                                {isInheriting ? (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/60 flex items-center gap-1 shrink-0 whitespace-nowrap" title="Bạn đang dùng chung Bot và kho mã do quản lý khác trong cùng kho tạo">
                                        <Building2 size={10} /> Kho {currentDept} (Kế thừa)
                                    </span>
                                ) : scopeMode === 'warehouse' && currentDept ? (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/60 flex items-center gap-1 shrink-0 whitespace-nowrap" title="Bot đại diện chính của kho này">
                                        <Building2 size={10} /> Kho {currentDept} (Bot kho)
                                    </span>
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
                                        <User size={10} /> Bot Cá Nhân
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {botConfigHook.botInfo?.basicId
                                    ? `ID: ${botConfigHook.botInfo.basicId} • Cấp phát mã & Tự động hoá`
                                    : 'Hệ thống cấp phát mã PMH tự động và trợ lý thông báo qua LINE'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                            variant="ghost"
                            size="none"
                            onClick={() => setIsOnboardingOpen(true)}
                            aria-label="Hướng dẫn tạo Bot"
                            title="Hướng dẫn tạo Bot"
                            className="flex items-center gap-1.5 h-7.5 px-2.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded-lg border border-sky-200/80 dark:border-sky-800/80 shadow-2xs transition-all active:scale-95"
                        >
                            <HelpCircle size={13} className="text-sky-600 dark:text-sky-400" />
                            <span className="hidden sm:inline">Hướng dẫn tạo Bot</span>
                        </Button>
                    </div>
                </div>

                {/* Warehouse Inheritance Banner / Scope Switcher */}
                {currentDept && (
                    <div className={`px-3 py-2 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all ${
                        isInheriting
                            ? 'bg-purple-50/90 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 shadow-2xs'
                            : scopeMode === 'warehouse' && hasWarehouseBot
                            ? 'bg-sky-50/80 dark:bg-sky-950/30 border-sky-200/80 dark:border-sky-800/60 text-sky-900 dark:text-sky-200'
                            : hasWarehouseBot
                            ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                    }`}>
                        <div className="flex items-center gap-2 min-w-0">
                            {isInheriting ? (
                                <Building2 size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
                            ) : hasWarehouseBot && scopeMode === 'personal' ? (
                                <Sparkles size={16} className="text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
                            ) : (
                                <Building2 size={16} className="text-sky-600 dark:text-sky-400 shrink-0" />
                            )}
                            <div className="min-w-0 leading-snug">
                                {isInheriting ? (
                                    <p className="font-semibold truncate">
                                        🏢 Đang <strong>kế thừa Bot Kho {currentDept}</strong> (do {warehouseBot?.ownerName || warehouseBot?.ownerEmail || 'Quản lý khác'} tạo). Đang dùng chung kho mã & cấu hình Bot.
                                    </p>
                                ) : scopeMode === 'warehouse' ? (
                                    <p className="font-semibold truncate">
                                        🏢 Bot LINE của <strong>Kho {currentDept}</strong> (Bạn là người khởi tạo). Các tài khoản cùng mã kho này sẽ tự động kế thừa và dùng chung.
                                    </p>
                                ) : hasWarehouseBot ? (
                                    <p className="font-semibold truncate">
                                        💡 Kho <strong>{currentDept}</strong> đã có sẵn Bot LINE "{warehouseBot?.botName}". Bạn có muốn dùng chung cùng các Quản lý khác không?
                                    </p>
                                ) : (
                                    <p className="font-medium text-slate-500 dark:text-slate-400 truncate">
                                        🏢 Mã kho tài khoản Google: <strong>Kho {currentDept}</strong>. Bot bạn cấu hình tại đây sẽ được chia sẻ cho các quản lý cùng kho.
                                    </p>
                                )}
                            </div>
                        </div>

                        {hasWarehouseBot && (
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                {isInheriting ? (
                                    <button
                                        type="button"
                                        onClick={() => switchScope('personal')}
                                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-[11px] font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                                        title="Chuyển sang cấu hình Bot riêng biệt cho tài khoản này"
                                    >
                                        Tạo / Dùng Bot riêng
                                    </button>
                                ) : scopeMode === 'personal' ? (
                                    <button
                                        type="button"
                                        onClick={() => switchScope('warehouse')}
                                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-colors cursor-pointer shadow-xs"
                                        title="Kế thừa và dùng chung Bot của kho"
                                    >
                                        Kế thừa Bot Kho {currentDept}
                                    </button>
                                ) : null}
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation Tabs — Phong cách Report BI, Sky palette, siêu mượt cho iPhone */}
                <div className="relative">
                    <div
                        ref={tabBarRef}
                        className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100/90 dark:bg-slate-800/70 rounded-xl border border-slate-200/70 dark:border-slate-700/60 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]"
                    >
                    {tabs.map(tab => {
                        const IconComp = tab.icon;
                        const isActive = activeSubTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                data-tab-id={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all shrink-0 snap-start active:scale-95 cursor-pointer ${
                                    isActive
                                        ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-2xs font-bold ring-1 ring-slate-200/60 dark:ring-slate-600'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/40'
                                }`}
                            >
                                <IconComp size={13} className={isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                    </div>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-xl bg-gradient-to-l from-slate-100 dark:from-slate-800 to-transparent sm:hidden" aria-hidden="true" />
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
