// Tự động tải lại trang khi gặp lỗi preload chunk/module dynamic import do build mới.
// GIỚI HẠN (2026-10-21): tối đa 2 lần tự tải lại trong 5 phút. Trước chỉ chặn "cách nhau 10 giây" → tệp hỏng mãi (vd máy
// mạng chậm nhận app shell cũ từ service worker) là tải lại mỗi 10 giây không dừng (log 21/10: resolveSession bị gọi dồn
// 4 phút). Quá giới hạn thì thôi tải lại — màn lỗi của ErrorBoundary có nút "Tải lại" cho người dùng tự bấm.
function ycxDuocTaiLai() {
    try {
        var now = Date.now();
        var raw = sessionStorage.getItem('ycx_chunk_reloads');
        var ds = raw ? JSON.parse(raw).filter(function (t) { return now - t < 300000; }) : [];
        var last = Number(sessionStorage.getItem('last_module_import_reload') || 0);
        if (ds.length >= 2 || now - last < 10000) return false;
        ds.push(now);
        sessionStorage.setItem('ycx_chunk_reloads', JSON.stringify(ds));
        sessionStorage.setItem('last_module_import_reload', String(now));
        return true;
    } catch (e) {
        return false; // không đọc/ghi được sessionStorage thì không tự tải lại (tránh lặp vô hạn)
    }
}
// Tách ra file riêng (thay vì <script> inline trong index.html) để Content-Security-Policy
// không cần "script-src 'unsafe-inline'" — inline script là 1 trong những đường XSS phổ biến
// nhất mà CSP được thiết kế để chặn.
window.addEventListener('vite:preloadError', function (event) {
    console.warn('Vite preload error detected, reloading page...', event);
    // KHÔNG gọi event.preventDefault(): nếu gọi, Vite sẽ triệt tiêu lỗi và resolve promise về undefined,
    // khiến React.lazy văng lỗi "Cannot read properties of undefined (reading 'default')".
    if (ycxDuocTaiLai()) window.location.reload();
});

// Bắt thêm lỗi loading script/css chunk toàn cục
window.addEventListener('error', function (event) {
    var target = event.target || event.srcElement;
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        var url = target.src || target.href;
        if (url && (url.indexOf('/assets/') !== -1 || url.indexOf('DashboardView') !== -1 || url.indexOf('index') !== -1)) {
            console.warn('Asset load error detected, reloading page...', url);
            if (ycxDuocTaiLai()) window.location.reload();
        }
    }
}, true); // Bắt ở phase capture để nhận các lỗi resource load
