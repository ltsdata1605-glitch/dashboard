import React, { useState, useCallback, useTransition } from 'react';
import { useActiveTab } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../shared/ui/Button';
import { AppIcon, type IconName } from '../shared/ui/icon';
import { Modal } from '../shared/ui/Modal';
import { ListGroup, ListRow, type ListIconTone } from '../shared/ui/ListGroup';
import { cn } from '../shared/ui/utils';
import { NAV_TAB_ICONS } from './navIcons';
import { formatCleanDisplayName } from '../../utils/basicHelpers';

interface TabItem { id: string; label: string; icon: IconName; tone?: ListIconTone }

/**
 * THANH TAB DƯỚI iPhone/iPad + bảng "Khác" (GĐ4, KE_HOACH_GIAO_DIEN_APPLE.md mục 3.5).
 *
 * - Thanh tab: vật liệu mờ + đường tóc trên (thay bóng đổ), cao 56px + vùng thanh Home; icon 24px; mục đang chọn tô sky-600 trên
 *   nền viên nhạt sau icon — bỏ vạch chỉ báo trên đỉnh và thư viện motion (CSS thuần, không còn kéo motion vào lúc mở app).
 *   Chưa chọn: slate-500 (đủ tương phản — slate-400 cũ chỉ đạt 3:1).
 * - "Khác": sheet dùng chung (`Modal position="bottom"` — kéo để đóng, Esc, chống tràn khi xoay ngang) với danh sách nhóm kiểu
 *   Cài đặt iOS: thẻ tài khoản (bấm mở Phân quyền, nút Đăng xuất) → nhóm "Công cụ" → nhóm "Hệ thống". Thay lưới ô màu cũ.
 */
const MobileBottomNav: React.FC = React.memo(() => {
    const { activeTab, setActiveTab } = useActiveTab();
    const { user, userRole, employeeName, departmentId, isDemoMode, logout } = useAuth();
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Icon theo TÊN CHỨC NĂNG (chuẩn hoá icon 2026-10-02) — cùng tên với Sidebar nên 2 thanh luôn cùng hình.
    const mainTabs: TabItem[] = [
        { id: 'analysis', label: 'Phân tích', icon: NAV_TAB_ICONS['analysis'] },
        { id: 'employees', label: 'Report BI', icon: NAV_TAB_ICONS['employees'] },
        { id: 'check-thuong', label: 'Check thưởng', icon: NAV_TAB_ICONS['check-thuong'] },
    ];

    const toolTabs: TabItem[] = [
        { id: 'tools-print-sticker', label: 'In Sticker', icon: NAV_TAB_ICONS['tools-print-sticker'], tone: 'sky' },
        { id: 'tools-phanca', label: 'Phân ca', icon: NAV_TAB_ICONS['tools-phanca'], tone: 'emerald' },
        { id: 'tools-line-bot', label: 'Bot LINE', icon: NAV_TAB_ICONS['tools-line-bot'], tone: 'emerald' },
        { id: 'tools-coupon', label: 'Rút gọn Coupon', icon: NAV_TAB_ICONS['tools-coupon'], tone: 'amber' },
        { id: 'tools-tax', label: 'Tính thuế', icon: NAV_TAB_ICONS['tools-tax'], tone: 'rose' },
        { id: 'tools-price-compare', label: 'So sánh giá ĐT', icon: NAV_TAB_ICONS['tools-price-compare'], tone: 'slate' },
    ];
    const systemTabs: TabItem[] = [
        { id: 'reports', label: 'Báo cáo', icon: NAV_TAB_ICONS['reports'], tone: 'sky' },
        { id: 'settings', label: 'Phân quyền', icon: NAV_TAB_ICONS['settings'], tone: 'slate' },
        { id: 'help', label: 'Giới thiệu', icon: NAV_TAB_ICONS['help'], tone: 'slate' },
    ];

    const handleTabClick = useCallback((id: string) => {
        startTransition(() => {
            setActiveTab(id);
        });
        setIsMoreOpen(false);
    }, [setActiveTab]);

    const isMoreActive = [...toolTabs, ...systemTabs].some(t => activeTab === t.id) || activeTab.startsWith('tools-');
    const tenHienThi = employeeName || formatCleanDisplayName(user?.displayName, isDemoMode ? 'Tài khoản Thử nghiệm' : 'Khách');
    const vaiTro = userRole === 'admin' ? 'Admin' : userRole === 'manager' ? 'Quản lý' : userRole ? 'Nhân viên' : null;

    const oTab = (opts: { key: string; label: string; icon: IconName; active: boolean; onClick: () => void }) => (
        <Button
            variant="unstyled" size="none"
            key={opts.key}
            onClick={opts.onClick}
            aria-current={opts.active ? 'page' : undefined}
            className={cn(
                'flex-1 min-w-0 flex flex-col items-center justify-center h-[44px] py-0.5 px-0.5 rounded-full transition-all duration-200 select-none active:scale-95',
                opts.active 
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200/70 dark:border-slate-600/70' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/40 dark:hover:bg-slate-800/40',
                isPending && 'opacity-70'
            )}
        >
            <span className="flex items-center justify-center">
                <AppIcon 
                    name={opts.icon} 
                    size="sm" 
                    className={cn(
                        'transition-transform duration-200',
                        opts.active ? 'text-sky-600 dark:text-sky-400 scale-105' : 'text-slate-500 dark:text-slate-400'
                    )} 
                />
            </span>
            <span className={cn(
                'max-w-full truncate px-0.5 text-[11px] leading-[13px] tracking-tight mt-0.5',
                opts.active ? 'font-bold text-sky-600 dark:text-sky-400' : 'font-medium text-slate-500 dark:text-slate-400'
            )}>
                {opts.label}
            </span>
        </Button>
    );

    return (
        <>
            <Modal
                isOpen={isMoreOpen}
                onClose={() => setIsMoreOpen(false)}
                position="bottom"
                maxWidth="sm"
                title="Thêm"
                panelClassName="bg-slate-100"
            >
                <div className="space-y-5 pb-1" data-testid="mobile-more-scroll">
                    {/* Thẻ tài khoản — bấm mở Phân quyền & cài đặt; nút Đăng xuất bên phải (không lồng nút trong nút). */}
                    <ListGroup>
                        <div className="flex items-center pr-1.5">
                            <Button
                                variant="unstyled" size="none"
                                onClick={() => handleTabClick('settings')}
                                title="Chạm để mở Phân Quyền & Cài Đặt"
                                className="flex-1 min-w-0 flex items-center gap-3 pl-4 pr-2 py-2.5 text-left active:bg-slate-100 transition-colors"
                            >
                                <span className="w-11 h-11 shrink-0 rounded-full bg-sky-100 flex items-center justify-center overflow-hidden">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        <span className="font-semibold text-[17px] text-sky-700">
                                            {user?.email ? user.email.charAt(0).toUpperCase() : (isDemoMode ? 'T' : 'U')}
                                        </span>
                                    )}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[17px] leading-[22px] font-semibold text-slate-900 truncate">{tenHienThi}</span>
                                        {vaiTro && (
                                            <span className={cn('shrink-0 rounded-full px-1.5 text-[11px] leading-4 font-semibold',
                                                userRole === 'admin' ? 'bg-amber-100 text-amber-800' : userRole === 'manager' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700')}>
                                                {vaiTro}
                                            </span>
                                        )}
                                    </span>
                                    <span className="block text-[13px] leading-[18px] text-slate-500 truncate">
                                        {user?.email || (departmentId ? `Kho: ${departmentId}` : 'Chế độ Offline')}
                                        {departmentId && user?.email ? ` · Kho ${departmentId}` : ''}
                                    </span>
                                </span>
                                <AppIcon name="chevronRight" size="md" className="shrink-0 text-slate-300" />
                            </Button>
                            <Button
                                variant="unstyled" size="none"
                                onClick={logout}
                                title="Đăng xuất"
                                aria-label="Đăng xuất"
                                className="min-h-11 min-w-11 shrink-0 flex items-center justify-center rounded-full text-rose-600 active:bg-rose-50"
                            >
                                <AppIcon name="logout" size="md" />
                            </Button>
                        </div>
                    </ListGroup>

                    <ListGroup title="Công cụ">
                        {toolTabs.map(t => (
                            <ListRow key={t.id} label={t.label} icon={t.icon} iconTone={t.tone}
                                selected={activeTab === t.id} chevron={activeTab !== t.id}
                                onClick={() => handleTabClick(t.id)} />
                        ))}
                    </ListGroup>

                    <ListGroup title="Hệ thống">
                        {systemTabs.map(t => (
                            <ListRow key={t.id} label={t.label} icon={t.icon} iconTone={t.tone}
                                selected={activeTab === t.id} chevron={activeTab !== t.id}
                                onClick={() => handleTabClick(t.id)} />
                        ))}
                    </ListGroup>
                </div>
            </Modal>

            {/* Thanh tab dưới nổi kiểu Apple Floating Dock — thiết kế tinh tế, nhỏ gọn, hiện đại */}
            <nav
                data-app-chrome="tabbar"
                aria-label="Điều hướng chính"
                className="mobile-chrome ycx-floating-dock lg:hidden fixed bottom-[max(0.6rem,env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[342px] z-[190] rounded-full p-1 border border-slate-200/80 dark:border-slate-700/80 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_4px_10px_-2px_rgba(0,0,0,0.03)]"
            >
                <div className="flex items-center justify-between gap-0.5 w-full">
                    {mainTabs.map(tab => oTab({
                        key: tab.id, label: tab.label, icon: tab.icon,
                        active: activeTab === tab.id && !isMoreOpen,
                        onClick: () => handleTabClick(tab.id),
                    }))}
                    {oTab({
                        key: 'more', label: 'Khác', icon: 'navTools',
                        active: isMoreActive || isMoreOpen,
                        onClick: () => setIsMoreOpen(o => !o),
                    })}
                </div>
            </nav>
        </>
    );
});

MobileBottomNav.displayName = 'MobileBottomNav';
export default MobileBottomNav;
