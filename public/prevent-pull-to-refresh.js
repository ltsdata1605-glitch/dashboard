// Chống Refresh khi kéo xuống ngoài ý muốn trên Mobile (Pull-to-refresh).
// Tách ra file riêng — xem lý do trong reload-on-chunk-error.js.
let lastTouchY = 0;
document.addEventListener('touchstart', function (e) {
    lastTouchY = e.touches[0].clientY;
}, { passive: false });

document.addEventListener('touchmove', function (e) {
    const touchY = e.touches[0].clientY;
    if (window.scrollY === 0 && touchY > lastTouchY) {
        e.preventDefault();
    }
    lastTouchY = touchY;
}, { passive: false });
