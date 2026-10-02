import { useEffect, type RefObject } from 'react';

/** Vị trí scrollLeft để `item` nằm giữa `strip` (kẹp trong [0, max]). Hàm thuần — test được. */
export function centeredScrollLeft(strip: { clientWidth: number; scrollWidth: number }, itemLeft: number, itemWidth: number): number {
    const target = itemLeft - (strip.clientWidth - itemWidth) / 2;
    return Math.max(0, Math.min(target, strip.scrollWidth - strip.clientWidth));
}

/**
 * Dải nút cuộn ngang (tab, góc nhìn, kho…): khi mục đang chọn đổi, cuộn NGANG trong dải để mục đó nằm
 * giữa (Đợt D, kế hoạch iPhone). Cố ý KHÔNG dùng `scrollIntoView` — trên iPhone nó cuộn luôn cả trang
 * theo chiều dọc. Mục đang chọn đánh dấu bằng `data-active="true"`.
 */
export function useCenterActiveInStrip(stripRef: RefObject<HTMLElement | null>, activeKey: unknown) {
    useEffect(() => {
        const strip = stripRef.current;
        if (!strip || strip.scrollWidth <= strip.clientWidth) return;
        const item = strip.querySelector<HTMLElement>('[data-active="true"]');
        if (!item) return;
        const left = item.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
        const to = centeredScrollLeft(strip, left, item.offsetWidth);
        if (Math.abs(to - strip.scrollLeft) < 2) return;
        const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        strip.scrollTo({ left: to, behavior: reduce ? 'auto' : 'smooth' });
    }, [stripRef, activeKey]);
}
