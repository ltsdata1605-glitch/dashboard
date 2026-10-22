import React from 'react';
import { Button } from '../shared/ui/Button';
import { AppIcon, type IconName } from '../shared/ui/icon';
import { cn } from '../shared/ui/utils';
import NotificationBell from './NotificationBell';
import { PageActionsBar } from './PageActionsBar';

interface MobileNavBarProps {
    /** Tiêu đề màn, viết như câu ("Phân tích", "Check thưởng") — 17px đậm vừa như thanh điều hướng iOS. */
    title: string;
    /** Icon của tab (navIcons) trong ô nhận diện bên trái. */
    tabIcon: IconName;
    /** Mini-app toàn màn (In Sticker, Phân ca — không có thanh tab dưới): hiện nút ‹ quay về Phân tích. */
    onBack?: () => void;
}

/**
 * THANH TRÊN iPhone / iPad (GĐ4, KE_HOACH_GIAO_DIEN_APPLE.md mục 3.2) — thay khối dựng thẳng trong App.tsx.
 *
 * [‹] [ô icon] [Tiêu đề 17px / dòng phụ 12px] ……… [nút của màn] [⋯] [chuông] — vật liệu mờ + đường tóc dưới, mọi nút 44×44.
 * Hai khe cũ GIỮ NGUYÊN id để màn chưa chuyển vẫn chạy: `#mobile-topbar-subtitle` (giờ cập nhật — Phân tích, Report BI, Check
 * thưởng gửi nút "Cập nhật: …" vào đây) và `#mobile-topbar-actions` (portal nút riêng của màn). Màn mới khai báo nút bằng
 * `usePageActions()` → `PageActionsBar` tự xếp (tối đa 1 nút chính + 1 nút nhanh + "⋯"), hết cảnh 7 nút đè nhau (lỗi #1).
 * Vùng chạm 44px cho nút nhỏ trong 2 khe cũ: CSS `.ycx-navbar` trong styles.css (giữ kích cỡ nhìn thấy chủ dự án đã chọn).
 * Màn đưa CẢ thanh công cụ lên khe cũ (Check thưởng có dữ liệu — chủ dự án chốt "1 thanh bar duy nhất") đánh dấu gốc thanh bằng
 * `data-thay-tieu-de`: dưới 540px chữ tiêu đề nhường chỗ (CSS `:has` trong styles.css) — trước đó tiêu đề bị cắt còn chữ "C".
 */
export const MobileNavBar: React.FC<MobileNavBarProps> = ({ title, tabIcon, onBack }) => (
    <div
        data-app-chrome="topbar"
        className="ycx-navbar mobile-chrome ycx-material lg:hidden sticky top-0 z-[100] border-b border-[color:var(--hairline)] pt-[env(safe-area-inset-top,0px)]"
    >
        <div className="flex items-center gap-1 min-h-[52px] pl-1.5 pr-1">
            {onBack && (
                <Button
                    variant="unstyled" size="none"
                    onClick={onBack}
                    title="Về Dashboard" aria-label="Về Dashboard"
                    className="min-h-11 min-w-11 -mr-1 shrink-0 flex items-center justify-center rounded-full text-sky-600 active:bg-slate-200/70"
                >
                    <AppIcon name="chevronLeft" size="lg" />
                </Button>
            )}
            <span
                aria-hidden="true"
                className={cn('w-8 h-8 shrink-0 rounded-control bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700 flex items-center justify-center shadow-sm shadow-sky-300/30', !onBack && 'ml-1')}
            >
                <AppIcon name={tabIcon} size="md" className="text-white" />
            </span>
            {/* truncate + leading-[22px]: tiêu đề dài ("Phân quyền & duyệt yêu cầu") không chèn sang nút bên phải; dòng cao đủ
                cho dấu tiếng Việt (khung quá thấp + overflow hidden từng xén dấu ở iPhone SE). */}
            <div data-navbar-title="" className="min-w-0 flex-1 flex flex-col justify-center pl-1.5 pr-1">
                <h1 className="text-[17px] leading-[22px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100 truncate">{title}</h1>
                <div id="mobile-topbar-subtitle" className="type-footnote text-slate-500 truncate max-w-full empty:hidden" />
            </div>
            {/* min-w-0 + shrink (không shrink-0): khe portal rộng phải co lại và tự cuộn ngang bên trong, không đẩy trang tràn
                ngang; nút khung app + chuông thì giữ nguyên cỡ. ml-auto: dồn sát mép phải như Report BI. */}
            <div data-navbar-actions="" className="flex items-center min-w-0 shrink ml-auto">
                <div id="mobile-topbar-actions" className="flex items-center justify-end min-w-0" />
                <div data-action-capsule="" className="flex items-center min-w-0">
                    <PageActionsBar variant="mobile" />
                    <NotificationBell buttonClassName="relative flex items-center justify-center w-11 h-11 rounded-full text-slate-600 hover:bg-slate-100 active:bg-slate-200/70 transition-colors shrink-0 ycx-hit" />
                </div>
            </div>
        </div>
    </div>
);

export default MobileNavBar;
