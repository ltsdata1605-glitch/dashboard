import React, { Suspense, useCallback, useEffect, useState, useTransition } from 'react';
import { useActiveTab } from '../../contexts/LayoutContext';
import { Button } from '../shared/ui/Button';
import { AppIcon, type IconName } from '../shared/ui/icon';
import { cn } from '../shared/ui/utils';
import { NAV_TAB_ICONS } from './navIcons';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import type { NavTabItem as TabItem } from './MobileMoreSheet';

const MobileMoreSheet = lazyWithRetry(() => import('./MobileMoreSheet'), 'MobileMoreSheet');

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
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [daMoKhac, setDaMoKhac] = useState(false);

    // Tải trước sheet "Khác" khi máy rảnh — chỉ màn có thanh tab dưới (< lg) — để lần bấm đầu mở ngay như khi còn chung gói.
    useEffect(() => {
        if (!window.matchMedia?.('(max-width: 1023.98px)').matches) return;
        const taiTruoc = () => { void MobileMoreSheet.preload(); };
        if ('requestIdleCallback' in window) {
            const h = window.requestIdleCallback(taiTruoc, { timeout: 4000 });
            return () => window.cancelIdleCallback(h);
        }
        const t = setTimeout(taiTruoc, 2000);
        return () => clearTimeout(t);
    }, []);
    const [isPending, startTransition] = useTransition();

    // Icon theo TÊN CHỨC NĂNG (chuẩn hoá icon 2026-10-02) — cùng tên với Sidebar nên 2 thanh luôn cùng hình.
    const mainTabs: TabItem[] = [
        { id: 'analysis', label: 'Phân tích', icon: NAV_TAB_ICONS['analysis'] },
        { id: 'employees', label: 'Report BI', icon: NAV_TAB_ICONS['employees'] },
        { id: 'check-thuong', label: 'Check thưởng', icon: NAV_TAB_ICONS['check-thuong'] },
    ];

    const toolTabs: TabItem[] = [
        { id: 'reports', label: 'Báo cáo', icon: NAV_TAB_ICONS['reports'], tone: 'sky' },
        { id: 'tools-print-sticker', label: 'In Sticker', icon: NAV_TAB_ICONS['tools-print-sticker'], tone: 'sky' },
        { id: 'tools-phanca', label: 'Phân ca', icon: NAV_TAB_ICONS['tools-phanca'], tone: 'emerald' },
        { id: 'tools-line-bot', label: 'Bot LINE', icon: NAV_TAB_ICONS['tools-line-bot'], tone: 'emerald' },
        { id: 'tools-coupon', label: 'Rút gọn Coupon', icon: NAV_TAB_ICONS['tools-coupon'], tone: 'amber' },
        { id: 'tools-tax', label: 'Tính thuế', icon: NAV_TAB_ICONS['tools-tax'], tone: 'rose' },
        { id: 'tools-price-compare', label: 'So sánh giá ĐT', icon: NAV_TAB_ICONS['tools-price-compare'], tone: 'slate' },
    ];
    const systemTabs: TabItem[] = [
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

    const oTab = (opts: { key: string; label: string; icon: IconName; active: boolean; onClick: () => void }) => (
        <Button
            variant="unstyled" size="none"
            key={opts.key}
            onClick={opts.onClick}
            title={opts.label}
            aria-label={opts.label}
            aria-current={opts.active ? 'page' : undefined}
            className={cn(
                'flex-1 min-w-0 flex items-center justify-center h-[38px] rounded-full transition-all duration-200 select-none ycx-hit',
                isPending && 'opacity-70'
            )}
        >
            <span
                className={cn(
                    'flex items-center justify-center w-[52px] h-[30px] rounded-full transition-all duration-200',
                    opts.active
                        ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 active:scale-95'
                )}
            >
                <AppIcon
                    name={opts.icon}
                    size="lg"
                    className={cn(
                        'transition-colors duration-200',
                        opts.active ? 'text-sky-600 dark:text-sky-400' : 'text-slate-600 dark:text-slate-400'
                    )}
                />
            </span>
            <span className="sr-only">{opts.label}</span>
        </Button>
    );

    return (
        <>
            {/* Sheet "Khác": mảnh code riêng (MobileMoreSheet) — gắn từ lần mở đầu và GIỮ gắn để hiệu ứng đóng vẫn chạy. */}
            {(isMoreOpen || daMoKhac) && (
                <Suspense fallback={null}>
                    <MobileMoreSheet
                        isOpen={isMoreOpen}
                        onClose={() => setIsMoreOpen(false)}
                        onTabClick={handleTabClick}
                        toolTabs={toolTabs}
                        systemTabs={systemTabs}
                    />
                </Suspense>
            )}

            {/* Thanh tab dưới nổi kiểu Apple Floating Dock — thiết kế tinh tế, nhỏ gọn, hiện đại */}
            <nav
                data-app-chrome="tabbar"
                aria-label="Điều hướng chính"
                className="mobile-chrome ycx-floating-dock lg:hidden fixed bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[310px] z-[190] rounded-full p-1 border border-white/85 dark:border-white/10 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1),0_2px_8px_-1px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.95)]"
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
                        onClick: () => { setDaMoKhac(true); setIsMoreOpen(o => !o); },
                    })}
                </div>
            </nav>
        </>
    );
});

MobileBottomNav.displayName = 'MobileBottomNav';
export default MobileBottomNav;
