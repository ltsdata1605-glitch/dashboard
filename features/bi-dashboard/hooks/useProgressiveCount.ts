import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Vẽ DẦN một danh sách dài: lần đầu chỉ `initial` phần tử, sau đó thêm `step` phần tử mỗi lượt (nhường luồng chính
 * giữa các lượt bằng setTimeout 0 → bấm tab/cuộn vẫn phản hồi trong lúc vẽ).
 *
 * Vì sao (đo 2026-10-09): tab Thi đua › Nhóm vẽ 1 thẻ/chương trình × cả danh sách NV (35 × 70 ≈ 2.500 dòng) trong
 * MỘT lượt — trình duyệt đứng ~8 giây trước khi hiện được gì. Vẽ dần thì thẻ đầu hiện ngay, phần còn lại nối tiếp.
 *
 * `ensureAll()` vẽ nốt toàn bộ và chờ tới khi xong — gọi trước khi xuất ảnh để ảnh không thiếu thẻ.
 * Đổi `resetKey` (vd danh sách thẻ khác) → bắt đầu vẽ dần lại từ đầu.
 */
export function useProgressiveCount(total: number, enabled: boolean, resetKey: unknown, initial = 4, step = 2) {
    const [count, setCount] = useState(() => Math.min(total, initial));
    const waitersRef = useRef<(() => void)[]>([]);

    useEffect(() => {
        setCount(Math.min(total, initial));
    }, [resetKey]);

    useEffect(() => {
        if (count >= total) {
            const waiters = waitersRef.current;
            waitersRef.current = [];
            waiters.forEach(w => w());
            return;
        }
        if (!enabled) return;
        const t = setTimeout(() => setCount(c => Math.min(total, c + step)), 0);
        return () => clearTimeout(t);
    }, [count, total, enabled, step]);

    const ensureAll = useCallback((): Promise<void> => {
        if (count >= total) return Promise.resolve();
        return new Promise<void>(resolve => {
            waitersRef.current.push(() => requestAnimationFrame(() => resolve()));
            setCount(total);
        });
    }, [count, total]);

    return { count: Math.min(count, total), ensureAll };
}
