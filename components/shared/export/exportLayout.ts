/**
 * BỐ CỤC ẢNH XUẤT dùng chung: co cột vừa nội dung + chân ảnh.
 *
 * Co cột (chủ dự án 2026-10-01: "ảnh trước khi xuất đối với bảng cột sẽ được fix lại độ rộng vừa với
 * nội dung"): trước đây chỉ ~8/30 nơi bật co cột, mỗi bản sao co một kiểu; nơi không bật thì ảnh mang
 * nguyên bề rộng màn hình — cột thừa khoảng trắng, hoặc bị ép `max-width:80px` + `break-all` khiến số /
 * chữ gãy giữa chừng.
 *
 * Cách co (chạy trên BẢN SAO đã nằm trong DOM, ngay trước khi chụp):
 *  - ô dữ liệu KHÔNG xuống dòng (số, tên NV đọc liền một hàng);
 *  - ô tiêu đề được xuống dòng ở khoảng trắng — chỉ khi tiêu đề dài hơn dữ liệu của cột;
 *  - bảng `width: min-content` → mỗi cột = max(dữ liệu dài nhất, chữ dài nhất của tiêu đề) — đúng "vừa
 *    nội dung", không thừa không thiếu;
 *  - gỡ khung cuộn / `sticky` / bề rộng cố định (w-*, min-w-*) để không mất cột.
 * Ô cần xuống dòng có chủ đích: gắn class `export-wrap`.
 */

const NOWRAP_DATA = 'nowrap';

function stripWidthClasses(el: Element) {
    Array.from(el.classList).forEach((cls) => {
        if (/^(?:[a-z0-9]+:)?(?:w|min-w|max-w)-/.test(cls)) el.classList.remove(cls);
    });
}

/**
 * Co mọi bảng trong `root` vừa nội dung. Trả về bề rộng (px) của bảng rộng nhất, đã cộng đệm/viền của
 * các khối bọc giữa bảng và `root` — để ép cả khối ảnh về đúng bề rộng đó. 0 = không có bảng.
 */
export function fitTablesToContent(root: HTMLElement): number {
    const tables = Array.from(root.querySelectorAll('table'));
    if (tables.length === 0) return 0;

    // Khung cuộn quanh bảng: mở hết, bỏ bề rộng cố định
    tables.forEach((table) => {
        let node: HTMLElement | null = table.parentElement;
        while (node && node !== root) {
            node.style.setProperty('overflow', 'visible', 'important');
            node.style.setProperty('max-width', 'none', 'important');
            if (node.classList.contains('overflow-x-auto') || node.classList.contains('overflow-auto')) {
                node.style.setProperty('width', 'auto', 'important');
            }
            node = node.parentElement;
        }
    });

    tables.forEach((table) => {
        stripWidthClasses(table);
        table.style.setProperty('table-layout', 'auto', 'important');
        table.style.setProperty('width', 'min-content', 'important');
        table.style.setProperty('min-width', '0', 'important');
        table.style.setProperty('max-width', 'none', 'important');

        table.querySelectorAll<HTMLElement>('th, td').forEach((cell) => {
            stripWidthClasses(cell);
            cell.style.setProperty('width', 'auto', 'important');
            // GIỮ min-width mà bộ quy tắc trình bày đã đặt (cột thanh tiến độ 105px, cột tên…): xoá đi thì
            // thanh tiến độ kiểu `w-full` co về 0 trong bảng min-content. Chỉ gỡ min-width từ class Tailwind.
            cell.style.setProperty('max-width', 'none', 'important');
            // Cột ghim chỉ có nghĩa khi cuộn — trong ảnh thì gỡ, tránh lệch nền/viền
            // (đọc class/inline thay vì getComputedStyle — bảng 48 cột × 100 dòng thì getComputedStyle từng ô rất chậm)
            if (cell.classList.contains('sticky') || cell.style.position === 'sticky') {
                cell.style.setProperty('position', 'static', 'important');
            }
            if (cell.closest('.export-wrap') || cell.classList.contains('export-wrap')) return;

            const isHeader = cell.tagName === 'TH' && !!cell.closest('thead') && (cell as HTMLTableCellElement).colSpan <= 1;
            const ws = isHeader ? 'normal' : NOWRAP_DATA;
            cell.style.setProperty('white-space', ws, 'important');
            if (isHeader) cell.style.setProperty('word-break', 'keep-all', 'important');
            cell.querySelectorAll<HTMLElement>('*').forEach((c) => {
                if (c.classList.contains('export-wrap')) return;
                if (c.classList.contains('truncate')) c.classList.remove('truncate');
                c.style.setProperty('white-space', ws, 'important');
                c.style.setProperty('text-overflow', 'clip', 'important');
                if (!isHeader) {
                    c.style.setProperty('overflow', 'visible', 'important');
                    c.style.setProperty('word-break', 'normal', 'important');
                } else {
                    c.style.setProperty('word-break', 'keep-all', 'important');
                }
                // Khối w-full / max-w-* trong ô (vd tên NV) không được bó chữ
                if (c.style.maxWidth && c.style.maxWidth !== 'none') c.style.setProperty('max-width', 'none', 'important');
            });
        });
    });

    // Đo bảng rộng nhất + đệm/viền các khối bọc nó
    let widest = 0;
    tables.forEach((table) => {
        const w = Math.ceil(table.getBoundingClientRect().width);
        if (w <= 0) return;
        let extra = 0;
        let node: HTMLElement | null = table.parentElement;
        while (node && node !== root) {
            const cs = getComputedStyle(node);
            extra += parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0')
                + parseFloat(cs.borderLeftWidth || '0') + parseFloat(cs.borderRightWidth || '0');
            node = node.parentElement;
        }
        const csRoot = getComputedStyle(root);
        extra += parseFloat(csRoot.paddingLeft || '0') + parseFloat(csRoot.paddingRight || '0');
        // +2px: bảng `border-collapse` có nửa viền ngoài nằm NGOÀI hộp đo được — thiếu là mất viền phải trong ảnh
        widest = Math.max(widest, Math.ceil(w + extra + 2));
    });
    return widest;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "Dashboard YCX · xuất 14:32 01/10" */
export function exportFooterText(now: Date = new Date()): string {
    return `Dashboard YCX · xuất ${pad2(now.getHours())}:${pad2(now.getMinutes())} ${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}`;
}

/** Gắn chân ảnh (chữ xám nhỏ, căn phải) vào cuối bản sao. */
export function appendExportFooter(root: HTMLElement, text: string = exportFooterText()): HTMLElement {
    const f = document.createElement('div');
    f.className = 'ycx-export-footer';
    f.textContent = text;
    f.style.cssText = [
        'display:block', 'text-align:right', 'font-size:11px', 'line-height:14px', 'color:#94a3b8',
        'padding:6px 6px 2px', 'margin:0', 'white-space:nowrap', 'font-weight:500', 'letter-spacing:0.01em',
        'background:transparent', 'border:0',
    ].map((d) => `${d} !important`).join(';');
    root.appendChild(f);
    return f;
}
