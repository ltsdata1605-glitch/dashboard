// Tự động tải lại trang khi gặp lỗi preload chunk/module dynamic import do build mới.
// Tách ra file riêng (thay vì <script> inline trong index.html) để Content-Security-Policy
// không cần "script-src 'unsafe-inline'" — inline script là 1 trong những đường XSS phổ biến
// nhất mà CSP được thiết kế để chặn.
window.addEventListener('vite:preloadError', function (event) {
    console.warn('Vite preload error detected, reloading page...', event);
    event.preventDefault();
    const now = Date.now();
    const lastReload = sessionStorage.getItem('last_module_import_reload');
    if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem('last_module_import_reload', String(now));
        window.location.reload();
    }
});

// Bắt thêm lỗi loading script/css chunk toàn cục
window.addEventListener('error', function (event) {
    var target = event.target || event.srcElement;
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        var url = target.src || target.href;
        if (url && (url.indexOf('/assets/') !== -1 || url.indexOf('DashboardView') !== -1 || url.indexOf('index') !== -1)) {
            console.warn('Asset load error detected, reloading page...', url);
            const now = Date.now();
            const lastReload = sessionStorage.getItem('last_module_import_reload');
            if (!lastReload || now - Number(lastReload) > 10000) {
                sessionStorage.setItem('last_module_import_reload', String(now));
                window.location.reload();
            }
        }
    }
}, true); // Bắt ở phase capture để nhận các lỗi resource load
