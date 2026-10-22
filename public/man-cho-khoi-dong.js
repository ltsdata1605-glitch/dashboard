// Màn khởi động động (index.html #ycx-splash, 2026-10-22). Tệp riêng thay vì <script> viết thẳng vì CSP chặn script inline.
// 1. App ở Màn hình chính iPhone (thanh trạng thái kiểu "default"): trang bắt đầu DƯỚI thanh trạng thái, còn ảnh khởi động tĩnh
//    của iOS phủ cả màn → đẩy cụm logo lên nửa chiều cao thanh trạng thái để khung đầu trùng khít ảnh (không nhảy khi chuyển).
// 2. Tắt khi app đã vẽ NỘI DUNG THẬT: #root có phần tử và không còn vòng quay chờ khởi động ([data-man-cho-khoi-dong]).
(function () {
    var el = document.getElementById('ycx-splash');
    if (!el) return;
    try {
        if (navigator.standalone) {
            var lech = (screen.height - window.innerHeight) / 2;
            if (lech > 0 && lech < 60) el.style.setProperty('--ycx-lech', -lech + 'px');
        }
    } catch (e) { /* bỏ qua */ }
    var root = document.getElementById('root');
    var xong = false;
    var obs = null;
    function tat() {
        if (xong) return;
        xong = true;
        if (obs) obs.disconnect();
        el.classList.add('ycx-splash-tat');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 450);
    }
    function kiem() {
        if (root && root.firstElementChild && !root.querySelector('[data-man-cho-khoi-dong]')) tat();
    }
    if (root && 'MutationObserver' in window) {
        var hen = 0;
        obs = new MutationObserver(function () { if (!hen) hen = requestAnimationFrame(function () { hen = 0; kiem(); }); });
        obs.observe(root, { childList: true, subtree: true });
    }
    window.addEventListener('load', kiem);
    setTimeout(tat, 12000); // an toàn: không bao giờ che app quá 12 giây
})();
