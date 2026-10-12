import { useEffect, useState } from 'react';

/**
 * Hiệu ứng VÀO / RA bằng CSS transition — thay `AnimatePresence` của motion cho lớp nổi dùng chung (GĐ3 2026-10-11:
 * gỡ motion — 42 KB gzip — khỏi đường khởi động).
 *  - `mounted`: còn gắn vào DOM (giữ thêm `exitMs` sau khi đóng để kịp chạy hiệu ứng ra).
 *  - `shown`: trạng thái "đã vào" — gắn class đích (vd `translate-y-0 opacity-100`) khi true, class xuất phát khi false.
 * Mở: gắn ngay với `shown=false`, 2 khung hình sau mới `shown=true` → trình duyệt kịp vẽ trạng thái xuất phát nên
 * transition chạy. Đóng: `shown=false` ngay, `mounted=false` sau `exitMs`.
 */
export function usePresence(open: boolean, exitMs = 220): { mounted: boolean; shown: boolean } {
    const [mounted, setMounted] = useState(open);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        if (open) {
            setMounted(true);
            let r2 = 0;
            const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setShown(true)); });
            return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
        }
        setShown(false);
        const t = setTimeout(() => setMounted(false), exitMs);
        return () => clearTimeout(t);
    }, [open, exitMs]);

    return { mounted: mounted || open, shown: open && shown };
}
