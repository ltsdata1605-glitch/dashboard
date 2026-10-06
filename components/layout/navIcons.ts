import type { IconName } from '../shared/ui/icon';

/**
 * Icon của từng TAB điều hướng — nguồn DUY NHẤT cho Sidebar, MobileBottomNav và ô icon trang
 * trên thanh tiêu đề mobile (App.tsx). Trước chuẩn hoá icon (2026-10-02), 3 nơi khai riêng nên
 * lệch nhau: In Sticker là `Sticker` ở thanh trái nhưng `Printer` ở thanh dưới.
 */
export const NAV_TAB_ICONS: Record<string, IconName> = {
    'analysis': 'navAnalysis',
    'employees': 'navReportBi',
    'check-thuong': 'navRewardCheck',
    'reports': 'navReports',
    'tools': 'navTools',
    'tools-print-sticker': 'navStickerPrint',
    'tools-phanca': 'navShiftSchedule',
    'tools-line-bot': 'navLineBot',
    'tools-coupon': 'navCoupon',
    'tools-tax': 'navTax',
    'tools-price-compare': 'navPriceCompare',
    'settings': 'navPermissions',
    'help': 'navHelp',
    'pending-approval': 'security',
};

/** Icon của tab bất kỳ — tab công cụ chưa khai thì dùng icon nhóm Công cụ, còn lại dùng Phân tích. */
export function navTabIcon(tabId: string): IconName {
    return NAV_TAB_ICONS[tabId] ?? (tabId.startsWith('tools') ? 'navTools' : 'navAnalysis');
}
