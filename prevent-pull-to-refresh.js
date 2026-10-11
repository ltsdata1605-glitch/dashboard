// Chống Refresh khi kéo xuống ngoài ý muốn trên Mobile (Pull-to-refresh).
// Tách ra file riêng — xem lý do trong reload-on-chunk-error.js.
//
// SỬA 2026-09-29 (audit A23): bản cũ chặn MỌI cú kéo xuống khi trang đang ở đầu (scrollY === 0),
// không xét ngón tay đang nằm ở đâu → trong modal / bảng / bottom sheet có vùng cuộn riêng đã cuộn
// xuống dở, kéo xuống để cuộn NGƯỢC LÊN bị chặn luôn; thao tác 2 ngón (thu phóng) cũng bị chặn.
// Nay chỉ chặn khi: 1 ngón, kéo xuống, trang ở đầu, và KHÔNG có vùng cuộn nào giữa ngón tay và
// trang còn cuộn lên được (tức là cú kéo này thật sự sẽ kích hoạt tải lại trang).
let lastTouchY = 0;

function canScrollUp(el) {
    while (el && el !== document.body && el !== document.documentElement) {
        if (el.nodeType === 1 && el.scrollTop > 0) {
            const overflowY = getComputedStyle(el).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return true;
        }
        el = el.parentElement;
    }
    return false;
}

function onTouchMove(e) {
    if (e.touches.length !== 1) return; // thu phóng / thao tác nhiều ngón — không can thiệp
    const touchY = e.touches[0].clientY;
    const pullingDown = touchY > lastTouchY;
    lastTouchY = touchY;
    if (!pullingDown || window.scrollY > 0 || !e.cancelable) return;
    if (canScrollUp(e.target)) return;
    e.preventDefault();
}

// SỬA 2026-10-11 (GĐ2 tăng tốc, KE_HOACH_GIAO_DIEN_APPLE.md mục 4.3 #8): bộ nghe `touchmove` KHÔNG thụ động bắt trình duyệt
// chờ JS ở MỌI cú cuộn trên toàn trang. CSS `overscroll-behavior` chưa thay được vì Safari iOS vẫn kéo-tải-lại dù đặt `none`
// (WebKit bug 275947) → giữ JS nhưng:
//  - app cài lên Màn hình chính (standalone) không có kéo-tải-lại → không gắn gì cả;
//  - chỉ gắn khi trang đang ở ĐỈNH (cú kéo duy nhất có thể tải lại trang), cuộn xuống thì gỡ → cuộn mượt, không chờ JS.
const isStandalone = window.navigator.standalone === true
    || (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);

if (!isStandalone) {
    document.addEventListener('touchstart', function (e) {
        if (e.touches.length === 1) lastTouchY = e.touches[0].clientY;
    }, { passive: true });

    let attached = false;
    const syncListener = function () {
        const atTop = window.scrollY <= 0;
        if (atTop && !attached) { document.addEventListener('touchmove', onTouchMove, { passive: false }); attached = true; }
        else if (!atTop && attached) { document.removeEventListener('touchmove', onTouchMove, { passive: false }); attached = false; }
    };
    window.addEventListener('scroll', syncListener, { passive: true });
    syncListener();
}
