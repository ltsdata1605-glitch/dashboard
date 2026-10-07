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
                    const isAvatarOrRounded = c.classList.contains('rounded-full') ||
                        c.classList.contains('preserve-rounded') ||
                        c.getAttribute('class')?.includes('rounded-full') ||
                        (c.style.clipPath && c.style.clipPath.includes('circle')) ||
                        c.querySelector('img.rounded-full, img[class*="rounded-full"], [data-avatar]') !== null;
                    if (!isAvatarOrRounded) {
                        c.style.setProperty('overflow', 'visible', 'important');
                    }
                    c.style.setProperty('word-break', 'normal', 'important');
                } else {
                    c.style.setProperty('word-break', 'keep-all', 'important');
                }
                // Khối w-full / max-w-* trong ô (vd tên NV) không được bó chữ
                if (c.style.maxWidth && c.style.maxWidth !== 'none') c.style.setProperty('max-width', 'none', 'important');
            });
        });

        // ═══════════════════════════════════════════════════════════════════════
        // FIX ĐỘ RỘNG CỘT VỪA KHÍT NỘI DUNG (COLUMN CONTENT FITTING)
        // ═══════════════════════════════════════════════════════════════════════
        const theadRows = Array.from(table.querySelectorAll('thead tr'));
        const tbodyRows = Array.from(table.querySelectorAll('tbody tr'));
        const tfootRows = Array.from(table.querySelectorAll('tfoot tr'));

        // Xây dựng ma trận thead để xác định index của từng cột
        const theadGrid: HTMLTableCellElement[][] = [];
        theadRows.forEach((row, rIdx) => {
            let cIdx = 0;
            Array.from(row.children).forEach((cellNode) => {
                if (!(cellNode instanceof HTMLTableCellElement)) return;
                while (theadGrid[rIdx] && theadGrid[rIdx][cIdx]) cIdx++;
                const rSpan = cellNode.rowSpan || 1;
                const cSpan = cellNode.colSpan || 1;
                for (let r = 0; r < rSpan; r++) {
                    if (!theadGrid[rIdx + r]) theadGrid[rIdx + r] = [];
                    for (let c = 0; c < cSpan; c++) {
                        theadGrid[rIdx + r][cIdx + c] = cellNode;
                    }
                }
                cIdx += cSpan;
            });
        });

        // Hàm đo kích thước nội dung thực tế của ô, tránh bị ảnh hưởng bởi độ rộng table đang dãn
        const measureCellContent = (cellNode: HTMLElement): number => {
            let contentW = 0;
            try {
                const range = document.createRange();
                range.selectNodeContents(cellNode);
                const rect = range.getBoundingClientRect();
                if (rect && rect.width > 0) {
                    contentW = rect.width;
                }
            } catch {
                // fallback
            }

            // Đo các con inline/flex bên trong (icon SVG, badge, sub-div)
            cellNode.querySelectorAll<HTMLElement>('div, span, svg').forEach((child) => {
                const r = child.getBoundingClientRect();
                if (r && r.width > 0) {
                    contentW = Math.max(contentW, r.width);
                }
            });

            if (contentW <= 0) {
                contentW = cellNode.scrollWidth || 0;
            }

            // Đệm viền và chữ: giới hạn padding an toàn tối đa 14px để cột ôm sát gọn gàng
            const cs = window.getComputedStyle(cellNode);
            const padL = parseFloat(cs.paddingLeft || '0');
            const padR = parseFloat(cs.paddingRight || '0');
            const totalPad = padL + padR;
            const safePad = totalPad > 0 ? Math.min(totalPad, 14) : 8;

            return Math.ceil(contentW + safePad);
        };

        const totalCols = theadGrid.length > 0 ? theadGrid[theadGrid.length - 1].length : 0;
        if (totalCols > 0) {
            const colMaxWidths: number[] = new Array(totalCols).fill(0);

            // Đo ở thead (chỉ tính ô đơn colSpan === 1)
            theadRows.forEach((row, rIdx) => {
                Array.from(row.children).forEach((cellNode) => {
                    if (!(cellNode instanceof HTMLTableCellElement)) return;
                    if ((cellNode.colSpan || 1) === 1) {
                        const cIdx = theadGrid[rIdx]?.indexOf(cellNode);
                        if (cIdx !== undefined && cIdx >= 0) {
                            const w = measureCellContent(cellNode);
                            colMaxWidths[cIdx] = Math.max(colMaxWidths[cIdx], w);
                        }
                    }
                });
            });

            // Đo ở tbody (chỉ tính ô đơn colSpan === 1, bỏ qua các dòng phân nhóm colSpan > 1)
            tbodyRows.forEach((row) => {
                let cIdx = 0;
                Array.from(row.children).forEach((cellNode) => {
                    if (!(cellNode instanceof HTMLTableCellElement)) return;
                    const cSpan = cellNode.colSpan || 1;
                    if (cSpan === 1 && cIdx < totalCols) {
                        const w = measureCellContent(cellNode);
                        colMaxWidths[cIdx] = Math.max(colMaxWidths[cIdx], w);
                        cIdx++;
                    } else {
                        cIdx += cSpan;
                    }
                });
            });

            // Đo ở tfoot (chỉ tính ô đơn colSpan === 1)
            tfootRows.forEach((row) => {
                let cIdx = 0;
                Array.from(row.children).forEach((cellNode) => {
                    if (!(cellNode instanceof HTMLTableCellElement)) return;
                    const cSpan = cellNode.colSpan || 1;
                    if (cSpan === 1 && cIdx < totalCols) {
                        const w = measureCellContent(cellNode);
                        colMaxWidths[cIdx] = Math.max(colMaxWidths[cIdx], w);
                        cIdx++;
                    } else {
                        cIdx += cSpan;
                    }
                });
            });

            // Đảm bảo các ô nhóm cha ở thead (colSpan > 1) không bị thiếu chỗ
            theadRows.forEach((row, rIdx) => {
                let cIdx = 0;
                Array.from(row.children).forEach((cellNode) => {
                    if (!(cellNode instanceof HTMLTableCellElement)) return;
                    const cSpan = cellNode.colSpan || 1;
                    if (cSpan > 1) {
                        const parentW = measureCellContent(cellNode);
                        let childrenSum = 0;
                        for (let i = 0; i < cSpan; i++) {
                            if (cIdx + i < totalCols) childrenSum += colMaxWidths[cIdx + i];
                        }
                        if (parentW > childrenSum && cSpan > 0) {
                            const extraPerCol = Math.ceil((parentW - childrenSum) / cSpan);
                            for (let i = 0; i < cSpan; i++) {
                                if (cIdx + i < totalCols) colMaxWidths[cIdx + i] += extraPerCol;
                            }
                        }
                    }
                    cIdx += cSpan;
                });
            });

            // Cố định độ rộng vừa khít nội dung cho từng cột
            for (let c = 0; c < totalCols; c++) {
                if (colMaxWidths[c] <= 0) continue;
                const colW = colMaxWidths[c] + 4; // 4px đệm viền an toàn

                theadRows.forEach((row, rIdx) => {
                    const cell = theadGrid[rIdx]?.[c];
                    if (cell && (cell.colSpan || 1) === 1) {
                        cell.style.setProperty('width', `${colW}px`, 'important');
                        cell.style.setProperty('min-width', `${colW}px`, 'important');
                        cell.style.setProperty('max-width', `${colW}px`, 'important');
                        cell.style.setProperty('box-sizing', 'border-box', 'important');
                    }
                });

                tbodyRows.forEach((row) => {
                    let curC = 0;
                    Array.from(row.children).forEach((cellNode) => {
                        if (!(cellNode instanceof HTMLTableCellElement)) return;
                        const cSpan = cellNode.colSpan || 1;
                        if (cSpan === 1 && curC === c) {
                            cellNode.style.setProperty('width', `${colW}px`, 'important');
                            cellNode.style.setProperty('min-width', `${colW}px`, 'important');
                            cellNode.style.setProperty('max-width', `${colW}px`, 'important');
                            cellNode.style.setProperty('box-sizing', 'border-box', 'important');
                            curC++;
                        } else {
                            curC += cSpan;
                        }
                    });
                });

                tfootRows.forEach((row) => {
                    let curC = 0;
                    Array.from(row.children).forEach((cellNode) => {
                        if (!(cellNode instanceof HTMLTableCellElement)) return;
                        const cSpan = cellNode.colSpan || 1;
                        if (cSpan === 1 && curC === c) {
                            cellNode.style.setProperty('width', `${colW}px`, 'important');
                            cellNode.style.setProperty('min-width', `${colW}px`, 'important');
                            cellNode.style.setProperty('max-width', `${colW}px`, 'important');
                            cellNode.style.setProperty('box-sizing', 'border-box', 'important');
                            curC++;
                        } else {
                            curC += cSpan;
                        }
                    });
                });
            }

            // Đặt bề rộng bảng cố định theo đúng tổng độ rộng các cột đã fix
            const sumColsWidth = colMaxWidths.reduce((sum, w) => sum + (w > 0 ? w + 4 : 0), 0);
            const tableWidth = sumColsWidth > 0 ? sumColsWidth : Math.ceil(table.getBoundingClientRect().width);
            if (tableWidth > 0) {
                table.style.setProperty('table-layout', 'fixed', 'important');
                table.style.setProperty('width', `${tableWidth}px`, 'important');
                table.style.setProperty('min-width', `${tableWidth}px`, 'important');
                table.style.setProperty('max-width', `${tableWidth}px`, 'important');
            }
        }
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

/**
 * Đảm bảo mọi avatar và phần tử tròn (.rounded-full, .preserve-rounded, ảnh đại diện)
 * được bo tròn tuyệt đối (50%) và có clip-path dạng circle() chuẩn SVG foreignObject.
 * Tránh lỗi SVG foreignObject của trình duyệt bỏ qua border-radius trên thẻ img
 * hoặc lỗi cú pháp calc(infinity * 1px) của Tailwind CSS v4.
 */
export function fixCircularAvatars(root: HTMLElement): void {
    // 1. Xử lý tất cả các thẻ ảnh có ý định bo tròn hoặc là avatar
    root.querySelectorAll<HTMLElement>('img.rounded-full, img[class*="rounded-full"], [data-avatar] img, .preserve-rounded img, img[alt*="avatar"], img[src*="avatar"]').forEach((img) => {
        img.style.setProperty('border-radius', '50%', 'important');
        img.style.setProperty('clip-path', 'circle(50% at 50% 50%)', 'important');
        img.style.setProperty('-webkit-clip-path', 'circle(50% at 50% 50%)', 'important');
        img.style.setProperty('object-fit', 'cover', 'important');
        img.style.setProperty('display', 'block', 'important');

        // Bọc hoặc cha trực tiếp
        const parent = img.parentElement;
        if (parent) {
            parent.style.setProperty('border-radius', '50%', 'important');
            parent.style.setProperty('clip-path', 'circle(50% at 50% 50%)', 'important');
            parent.style.setProperty('-webkit-clip-path', 'circle(50% at 50% 50%)', 'important');
            parent.style.setProperty('overflow', 'hidden', 'important');
        }
    });

    // 2. Xử lý các phần tử container tròn hoặc pill badge
    root.querySelectorAll<HTMLElement>('.rounded-full, [class*="rounded-full"], .preserve-rounded').forEach((el) => {
        // `preserve-rounded` mà KHÔNG phải rounded-full = "giữ nguyên bo góc của nó" (vd thẻ KPI .kpi-overview-card),
        // không phải avatar/viên thuốc. Trước 2026-10-07 nhánh dưới gán bo 9999px → thẻ KPI trong ảnh thành BẦU DỤC.
        if (!/\brounded-full\b/.test(el.getAttribute('class') || '')) return;
        const hasImg = !!el.querySelector('img');
        const w = el.offsetWidth || parseFloat(el.style.width) || 0;
        const h = el.offsetHeight || parseFloat(el.style.height) || 0;
        const isSquare = hasImg || (w > 0 && h > 0 && Math.abs(w - h) <= 6);

        if (isSquare) {
            el.style.setProperty('border-radius', '50%', 'important');
            el.style.setProperty('clip-path', 'circle(50% at 50% 50%)', 'important');
            el.style.setProperty('-webkit-clip-path', 'circle(50% at 50% 50%)', 'important');
            if (hasImg) {
                el.style.setProperty('overflow', 'hidden', 'important');
            }
        } else {
            // Pill badge (vd % đạt, trạng thái) -> thay calc(infinity * 1px) bằng 9999px chuẩn
            el.style.setProperty('border-radius', '9999px', 'important');
        }
    });
}

