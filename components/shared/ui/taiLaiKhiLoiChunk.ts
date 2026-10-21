/**
 * Tự TẢI LẠI TRANG khi mảnh code (chunk) tải lỗi — thường do vừa deploy bản mới, tên tệp băm đã đổi — NHƯNG KHÔNG khi trang
 * ĐANG RỜI ĐI (người dùng tải lại / chuyển trang). WebKit (Safari, iPhone) huỷ mọi `import()` dở dang ngay khi bắt đầu điều
 * hướng và báo "Importing a module script failed": tải lại lúc đó GIÀNH MẤT lượt điều hướng của người dùng (vd đang sang trang
 * đăng nhập) — CI WebKit đỏ "page.reload: Frame load interrupted" đúng vì chuyện này (2026-10-20; lượt tự xuất Bot LINE chạy
 * ngầm sau khi tải tệp làm có thêm import dở dang).
 *
 * Nhận biết rời trang: `beforeunload`/`pagehide` đánh dấu. iOS không chắc bắn `beforeunload` → còn CHỜ một nhịp trước khi tải
 * lại: trang đã rời đi thì hẹn giờ không bao giờ chạy. Dấu để trên globalThis (bundler từng tách module thành 2 bản —
 * contexts/AuthContext.tsx) để ErrorBoundary và lazyWithRetry thấy chung.
 */
const G = globalThis as unknown as { __ycxDangRoiTrang?: boolean; __ycxNgheRoiTrang?: boolean };

export const dangRoiTrang = (): boolean => Boolean(G.__ycxDangRoiTrang);

/**
 * Còn được TỰ tải lại không: tối đa 2 lần / 5 phút và cách nhau ≥ 10 giây — dùng CHUNG khoá sessionStorage với
 * public/reload-on-chunk-error.js (2026-10-21). Trước chỉ chặn "cách nhau 10 giây": tệp hỏng mãi là tải lại mỗi 10 giây vô
 * hạn (log 21/10: resolveSession bị gọi dồn 4 phút, tràn bộ nhớ). Gọi hàm này = ghi nhận một lượt (trả true) hoặc từ chối.
 */
export function duocTuTaiLai(now = Date.now()): boolean {
    try {
        const raw = sessionStorage.getItem('ycx_chunk_reloads');
        const ds = (raw ? (JSON.parse(raw) as number[]) : []).filter(t => now - t < 300_000);
        const last = Number(sessionStorage.getItem('last_module_import_reload') || 0);
        if (ds.length >= 2 || now - last < 10_000) return false;
        ds.push(now);
        sessionStorage.setItem('ycx_chunk_reloads', JSON.stringify(ds));
        sessionStorage.setItem('last_module_import_reload', String(now));
        return true;
    } catch {
        return false;
    }
}

/** Gắn bộ nghe rời trang (một lần). Tự chạy khi module được nạp trên trình duyệt. */
export function ngheRoiTrang(): void {
    if (G.__ycxNgheRoiTrang || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    G.__ycxNgheRoiTrang = true;
    let henBo: ReturnType<typeof setTimeout> | undefined;
    const danhDau = () => {
        G.__ycxDangRoiTrang = true;
        // Hộp "rời trang?" bị huỷ → trang vẫn sống: bỏ dấu sau vài giây
        if (henBo) clearTimeout(henBo);
        henBo = setTimeout(() => { G.__ycxDangRoiTrang = false; }, 3000);
    };
    window.addEventListener('beforeunload', danhDau);
    window.addEventListener('pagehide', danhDau);
    // Quay lại từ bộ nhớ đệm trang (bfcache): trang sống lại
    window.addEventListener('pageshow', () => { G.__ycxDangRoiTrang = false; });
}
ngheRoiTrang();

/** Chờ `choMs` rồi tải lại trang — trừ khi trang đang rời đi. `truocKhi` chạy ngay trước khi tải lại (vd ghi mốc chống lặp). */
export function taiLaiKhiLoiChunk(truocKhi?: () => void, choMs = 800): void {
    if (typeof window === 'undefined' || dangRoiTrang()) return;
    setTimeout(() => {
        if (dangRoiTrang()) return;
        truocKhi?.();
        window.location.reload();
    }, choMs);
}
