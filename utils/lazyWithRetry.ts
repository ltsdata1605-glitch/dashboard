import React, { ComponentType, lazy } from 'react';
import { dangRoiTrang, taiLaiKhiLoiChunk } from '../components/shared/ui/taiLaiKhiLoiChunk';

/**
 * Lazy loads a component with automatic retry on chunk load / preload failures.
 * Handles cases where a new version was deployed and chunk hashes changed,
 * or temporary network hiccups caused the chunk import to fail or resolve to undefined.
 *
 * `.preload()` (GĐ9 2026-10-14 — chuyển tab ≤ 0,3 s): tải trước module (vd khi máy rảnh). Khi module đã nạp xong, lần GẮN
 * đầu tiên vẽ component THẬT ngay — không qua React.lazy. React.lazy LUÔN treo (suspend) ở lần render đầu kể cả khi module
 * đã có sẵn → <Suspense> bọc ngoài hiện vòng quay thay cả vùng nội dung, rồi React còn GIỮ màn chờ tới 300 ms
 * (FALLBACK_THROTTLE_MS) mới hiện nội dung: đo trên bản build (4G, CPU x4) chuyển sang Report BI mất ~0,5–0,7 s dù chunk đã
 * tải trước. preload() lỗi (mất mạng) chỉ trả lỗi cho nơi gọi — KHÔNG tự tải lại trang như đường render.
 */
export type LazyWithPreload<T extends ComponentType<any>> = React.FC<React.ComponentProps<T>> & {
    preload: () => Promise<unknown>;
    /** React.lazy bên trong (đường render khi module chưa nạp) — để test. */
    _lazy: React.LazyExoticComponent<T>;
};

export function lazyWithRetry<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T } | any>,
    name?: string
): LazyWithPreload<T> {
    // Component thật, có ngay khi module nạp xong (qua preload() hoặc qua lần render đầu).
    let daNap: T | null = null;

    const LazyComp = lazy<T>(async () => {
        const reloadKey = `lazy_retry_${name || 'module'}`;
        const hasRetried = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(reloadKey) === 'true';

        try {
            const module = await factory();
            // If Vite resolved to undefined (e.g. from network failure or vite:preloadError), or lacks default export
            if (!module || !module.default) {
                // In case the module itself is the component
                if (typeof module === 'function') {
                    daNap = module as T;
                    return { default: module as T };
                }
                throw new Error(`Module "${name || 'unknown'}" failed to load or has no default export.`);
            }
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem(reloadKey);
            }
            daNap = module.default as T;
            return module;
        } catch (err: any) {
            console.warn(`[lazyWithRetry] Error loading lazy module "${name || 'unknown'}":`, err);
            if (!hasRetried && typeof window !== 'undefined') {
                // Trang ĐANG RỜI ĐI: WebKit huỷ import dở dang khi bắt đầu điều hướng — lỗi do bị huỷ, không phải bản mới.
                // Tải lại lúc này sẽ giành mất lượt điều hướng của người dùng → cứ để Suspense chờ tới khi trang rời đi.
                if (dangRoiTrang()) return new Promise<{ default: T }>(() => {});
                // Auto reload page to pick up latest index.html and chunk hashes (chờ một nhịp — taiLaiKhiLoiChunk.ts)
                taiLaiKhiLoiChunk(() => {
                    try {
                        sessionStorage.setItem(reloadKey, 'true');
                    } catch {
                        // Ignore quota or private mode issues
                    }
                });
                // Return an unresolved promise to keep Suspense in loading state while browser reloads
                return new Promise<{ default: T }>(() => {});
            }
            // If already retried once and still failing, throw so ErrorBoundary can show fallback
            throw err;
        }
    });

    const Wrapper = ((props: React.ComponentProps<T>) => {
        // Chọn MỘT LẦN lúc gắn: đổi loại phần tử (lazy → thật) giữa chừng thì React gỡ cả cây con rồi gắn lại — mất trạng thái tab.
        const [Comp] = React.useState<ComponentType<any>>(() => daNap ?? LazyComp);
        return React.createElement(Comp, props);
    }) as LazyWithPreload<T>;
    Wrapper.displayName = `Lazy(${name || 'module'})`;
    Wrapper.preload = () => factory().then((module: any) => {
        const comp = module?.default ?? (typeof module === 'function' ? module : null);
        if (comp) daNap = comp as T;
        return module;
    });
    Wrapper._lazy = LazyComp;
    return Wrapper;
}
