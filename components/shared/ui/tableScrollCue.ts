// VIỀN MỜ "CÒN CỘT BÊN PHẢI" cho MỌI bảng cuộn ngang (Đợt C, kế hoạch iPhone).
// Trên iPhone bảng 20–48 cột chỉ hiện 3–4 cột đầu; người dùng không biết còn cột để vuốt sang.
// Thay vì sửa từng bảng (23 bảng, mỗi bảng một kiểu khung cuộn), gắn MỘT lần ở App: tự tìm khung
// cuộn ngang chứa <table>, bật thuộc tính `data-xcue-right` khi còn nội dung bên phải. CSS ở
// styles.css làm mờ mép phải; cuộn hết sang phải thì tắt. Bảng vẫn là bảng — chỉ thêm gợi ý.
// Ảnh xuất KHÔNG bị mờ: bản sao dùng để chụp mang class `clone-no-scrollbar` → CSS loại trừ.

const ATTR = 'data-xcue-right';
const STATE_KEY = '__ycxTableScrollCue__';

/** Hàm thuần: còn nội dung bên phải không (chừa 2px sai số làm tròn của trình duyệt). */
export function hasMoreRight(scrollWidth: number, clientWidth: number, scrollLeft: number): boolean {
    return scrollWidth - clientWidth - scrollLeft > 2;
}

function isHorizontalScroller(el: HTMLElement): boolean {
    const ox = getComputedStyle(el).overflowX;
    return ox === 'auto' || ox === 'scroll';
}

/** Khung cuộn ngang gần nhất bao quanh bảng (đi lên tối đa 6 cấp). */
function findScroller(table: HTMLElement): HTMLElement | null {
    let el = table.parentElement;
    for (let i = 0; el && i < 6; i++, el = el.parentElement) {
        if (el === document.body) return null;
        if (isHorizontalScroller(el)) return el;
    }
    return null;
}

function update(el: HTMLElement) {
    const more = hasMoreRight(el.scrollWidth, el.clientWidth, el.scrollLeft);
    if (more !== el.hasAttribute(ATTR)) el.toggleAttribute(ATTR, more);
}

/** Gắn một lần (gọi lại không sao). Trả về hàm gỡ. */
export function installTableScrollCue(): () => void {
    const g = globalThis as unknown as Record<string, (() => void) | undefined>;
    if (g[STATE_KEY]) return g[STATE_KEY]!;

    const tracked = new Set<HTMLElement>();
    // Phần tử được theo dõi cỡ → khung cuộn cần cập nhật (khung tự nó, hoặc <table> bên trong:
    // bảng đổi bề rộng khi thêm cột/đổi dữ liệu mà khung không đổi cỡ).
    const sizeTargets = new Map<Element, HTMLElement>();
    const onScroll = (e: Event) => update(e.currentTarget as HTMLElement);
    const ro = typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => entries.forEach((en) => {
            const sc = sizeTargets.get(en.target);
            if (sc) update(sc);
        }))
        : null;
    const observeSize = (el: Element, sc: HTMLElement) => { sizeTargets.set(el, sc); ro?.observe(el); };

    // Bảng đã xét → khung cuộn của nó (null = không cuộn ngang). Trước đây MỖI lần DOM đổi lại quét lại mọi bảng, mỗi
    // bảng gọi getComputedStyle lên tới 6 cấp cha — ép trình duyệt tính lại style. Report BI › Thi đua có hàng chục
    // bảng × 70 dòng: đo 2026-10-09 mất ~1,5 giây MỖI lần đổi tab. Nay chỉ xét bảng MỚI; đổi cỡ màn hình thì xét lại
    // hết (lớp overflow có thể đổi theo breakpoint). Đổi cỡ khung/bảng đã có ResizeObserver lo, cuộn có sự kiện scroll.
    let scrollerOf = new WeakMap<HTMLElement, HTMLElement | null>();

    const scan = () => {
        // Bỏ khung đã rời khỏi trang (đổi tab, đóng modal)
        tracked.forEach((el) => {
            if (!el.isConnected) {
                el.removeEventListener('scroll', onScroll);
                tracked.delete(el);
            }
        });
        sizeTargets.forEach((_, el) => {
            if (!el.isConnected) { ro?.unobserve(el); sizeTargets.delete(el); }
        });
        document.querySelectorAll<HTMLElement>('table').forEach((table) => {
            if (scrollerOf.has(table)) return;
            if (table.closest('.clone-no-scrollbar')) return; // bản sao đang chụp ảnh
            const sc = findScroller(table);
            scrollerOf.set(table, sc);
            if (!sc) return;
            if (!tracked.has(sc)) {
                tracked.add(sc);
                sc.addEventListener('scroll', onScroll, { passive: true });
                observeSize(sc, sc);
            }
            if (!sizeTargets.has(table)) observeSize(table, sc);
            update(sc);
        });
    };

    // Gộp các lần DOM đổi liên tiếp (React render bảng lớn) thành 1 lần quét mỗi 300ms
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
        if (timer) return;
        timer = setTimeout(() => { timer = null; scan(); }, 300);
    };
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    const onResize = () => { scrollerOf = new WeakMap(); schedule(); };
    window.addEventListener('resize', onResize);
    scan();

    const cleanup = () => {
        mo.disconnect();
        ro?.disconnect();
        sizeTargets.clear();
        window.removeEventListener('resize', onResize);
        if (timer) clearTimeout(timer);
        tracked.forEach((el) => { el.removeEventListener('scroll', onScroll); el.removeAttribute(ATTR); });
        tracked.clear();
        g[STATE_KEY] = undefined;
    };
    g[STATE_KEY] = cleanup;
    return cleanup;
}
