import React, { Suspense } from 'react';
import { AppIcon } from '../shared/ui/icon';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

/**
 * Chuông thông báo của khung app (thanh trên iPhone + thanh tiêu đề laptop).
 *
 * Gói tải đầu (GĐ10 2026-10-20, ngân sách 330 KB đang ở 329,9): phần thật — listener thông báo, danh sách, sheet iPhone, hộp
 * "Thông báo admin" — nằm ở mảnh code riêng. Lúc mở app chỉ vẽ một chuông tĩnh ĐÚNG cỡ (không nhảy bố cục); mảnh thật nạp NGAY
 * khi chuông được vẽ (không chờ bấm) nên huy hiệu chưa đọc và toast thông báo mới vẫn chạy như cũ, chỉ trễ một nhịp mạng.
 */
const NotificationDropdown = lazyWithRetry(() => import('./NotificationDropdown'), 'NotificationDropdown');

export const NotificationBell: React.FC<{ buttonClassName: string }> = ({ buttonClassName }) => (
    <Suspense
        fallback={
            <div className="relative z-[300]">
                <span className={buttonClassName} aria-hidden="true">
                    <AppIcon name="notification" size="md" />
                </span>
            </div>
        }
    >
        <NotificationDropdown buttonClassName={buttonClassName} />
    </Suspense>
);

export default NotificationBell;
