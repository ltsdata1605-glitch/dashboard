import { useEffect } from 'react';

/**
 * NHẤN GIỮ ĐỂ XEM CHÚ THÍCH trên màn cảm ứng (audit A14, 2026-09-30).
 *
 * App dùng ~514 thuộc tính `title=` để giải thích nút chỉ có icon ("Xuất hàng loạt", "Chụp ảnh"…).
 * Trình duyệt chỉ hiện `title` khi rê chuột — trên iPhone/iPad người dùng KHÔNG có cách nào đọc được.
 * Sửa tay 514 chỗ vừa rủi ro vừa tốn; thay vào đó MỘT bộ lắng nghe toàn trang, chỉ chạy trên thiết
 * bị cảm ứng: nhấn giữ ~0,5s một phần tử có `title` → hiện đúng chữ đó trong bong bóng. Chạm thường
 * không đổi gì; sau khi đã hiện bong bóng thì cú "click" kèm theo lúc nhấc tay bị chặn để không kích
 * hoạt nhầm chức năng.
 *
 * Gắn MỘT lần ở App (không render gì). Không đụng máy tính có chuột.
 */
const HOLD_MS = 500;
const MOVE_TOLERANCE = 10;

export function TouchTitleHint(): null {
    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        if (!window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

        let timer: ReturnType<typeof setTimeout> | null = null;
        let hideTimer: ReturnType<typeof setTimeout> | null = null;
        let start: { x: number; y: number } | null = null;
        let bubble: HTMLDivElement | null = null;
        let suppressClick = false;

        const hide = () => {
            if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
            bubble?.remove();
            bubble = null;
        };
        const cancelHold = () => {
            if (timer) { clearTimeout(timer); timer = null; }
            start = null;
        };

        const show = (el: HTMLElement, text: string) => {
            hide();
            const b = document.createElement('div');
            b.setAttribute('role', 'tooltip');
            b.setAttribute('data-touch-title-hint', '');
            b.textContent = text;
            b.style.cssText = [
                'position:fixed', 'z-index:2147483000', 'max-width:min(280px,calc(100vw - 16px))',
                'padding:6px 10px', 'border-radius:6px', 'background:#0f172a', 'color:#fff',
                'font-size:13px', 'line-height:1.35', 'box-shadow:0 4px 12px rgba(0,0,0,.2)',
                'pointer-events:none', 'white-space:normal', 'overflow-wrap:anywhere',
            ].join(';');
            document.body.appendChild(b);
            const r = el.getBoundingClientRect();
            const bw = b.offsetWidth;
            const bh = b.offsetHeight;
            let left = r.left + r.width / 2 - bw / 2;
            left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
            let top = r.top - bh - 8;
            if (top < 8) top = r.bottom + 8; // không đủ chỗ phía trên → hiện phía dưới
            b.style.left = `${left}px`;
            b.style.top = `${top}px`;
            bubble = b;
        };

        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType !== 'touch') return;
            hide();
            const el = (e.target as Element | null)?.closest?.('[title]') as HTMLElement | null;
            const text = el?.getAttribute('title')?.trim();
            if (!el || !text) return;
            start = { x: e.clientX, y: e.clientY };
            timer = setTimeout(() => {
                timer = null;
                show(el, text);
                suppressClick = true;
            }, HOLD_MS);
        };
        const onPointerMove = (e: PointerEvent) => {
            if (!start) return;
            if (Math.abs(e.clientX - start.x) > MOVE_TOLERANCE || Math.abs(e.clientY - start.y) > MOVE_TOLERANCE) cancelHold();
        };
        const onPointerUp = () => {
            cancelHold();
            if (bubble && !hideTimer) hideTimer = setTimeout(hide, 1500);
        };
        const onClickCapture = (e: MouseEvent) => {
            if (!suppressClick) return;
            suppressClick = false;
            e.preventDefault();
            e.stopPropagation();
        };
        const onContextMenu = (e: Event) => {
            if (bubble || suppressClick) e.preventDefault(); // Android: nhấn giữ mở menu ngữ cảnh
        };
        const onScroll = () => { cancelHold(); hide(); };

        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('pointermove', onPointerMove, true);
        document.addEventListener('pointerup', onPointerUp, true);
        document.addEventListener('pointercancel', onPointerUp, true);
        document.addEventListener('click', onClickCapture, true);
        document.addEventListener('contextmenu', onContextMenu, true);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            cancelHold();
            hide();
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('pointermove', onPointerMove, true);
            document.removeEventListener('pointerup', onPointerUp, true);
            document.removeEventListener('pointercancel', onPointerUp, true);
            document.removeEventListener('click', onClickCapture, true);
            document.removeEventListener('contextmenu', onContextMenu, true);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, []);
    return null;
}
