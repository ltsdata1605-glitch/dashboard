import { useRef, useCallback, useInsertionEffect } from 'react';

/**
 * Trả về 1 function có identity ổn định vĩnh viễn (không đổi reference giữa các lần render),
 * nhưng khi gọi luôn chạy bản mới nhất của `fn` (không bị stale closure).
 *
 * Dùng để đưa các handler vào object Context (vd. DashboardContext) mà không làm value
 * của Provider đổi reference mỗi render — tránh re-render cascade toàn bộ consumer
 * mỗi khi có state cục bộ không liên quan thay đổi (RULES.md — hiệu năng Dashboard).
 */
export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
    const ref = useRef(fn);
    useInsertionEffect(() => {
        ref.current = fn;
    });
    return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}
