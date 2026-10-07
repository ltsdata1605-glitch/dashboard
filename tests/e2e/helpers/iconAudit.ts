import type { Page } from '@playwright/test';

/**
 * Bài AUDIT ICON dùng chung cho các spec chuẩn hoá icon (icon-audit-man-goc, icon-audit-bi…).
 * Đo trên trình duyệt thật màn đang hiển thị:
 *   - `legacy`: svg icon KHÔNG đi qua AppIcon (không có lớp .ycx-icon) — phải về 0;
 *   - `lech`: icon trong nút lệch tâm dọc > 1px so với nút (bỏ qua nút xếp dọc icon-trên-chữ);
 *   - `nutChuNhoHon`: icon nằm trong nút CÓ CHỮ nhưng nhỏ hơn token md (trừ vai trò phụ: mũi tên, đóng, sắp xếp, tích);
 *   - `vungCham`: nút chỉ có icon, vùng chạm (kể cả `after:-inset-*`) dưới 44px trên điện thoại.
 */
export type IconAuditResult = { legacy: string[]; lech: string[]; nutChuNhoHon: string[]; vungCham: string[] };

export async function auditIcons(page: Page, mobile: boolean, rootSelector?: string): Promise<IconAuditResult> {
    return page.evaluate(({ mobile, rootSelector }) => {
        // `rootSelector`: chỉ đo bên trong vùng này (vd modal đang mở `[role="dialog"]`), mặc định cả trang.
        const roots: ParentNode[] = rootSelector ? Array.from(document.querySelectorAll(rootSelector)) : [document];
        const tim = (sel: string) => roots.flatMap((r) => Array.from(r.querySelectorAll(sel)));
        const nhin = (el: Element) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            const cs = getComputedStyle(el);
            return cs.visibility !== 'hidden' && cs.opacity !== '0';
        };
        const ten = (el: Element) => (el.getAttribute('data-icon') || el.getAttribute('class') || '').slice(0, 40);
        const legacy: string[] = [], lech: string[] = [], nutChuNhoHon: string[] = [], vungCham: string[] = [];
        // svg icon "trần" (lucide hoặc tự vẽ 24x24 viewBox) không qua AppIcon. Bỏ qua svg biểu đồ (recharts) và logo.
        for (const svg of tim('svg')) {
            if (!nhin(svg) || svg.closest('.recharts-wrapper, .recharts-surface')) continue;
            if (svg.classList.contains('ycx-icon')) continue;
            if (svg.getAttribute('viewBox') !== '0 0 24 24') continue;
            const r = svg.getBoundingClientRect();
            if (r.width > 64) continue;
            legacy.push(`${ten(svg)} ${Math.round(r.width)}px`);
        }
        const md = mobile ? 18 : 16;
        for (const btn of tim('button, [role="button"], a')) {
            if (!nhin(btn)) continue;
            const icons = Array.from(btn.querySelectorAll(':scope svg.ycx-icon')).filter(nhin);
            if (icons.length === 0) continue;
            const b = btn.getBoundingClientRect();
            const chu = (btn.textContent || '').replace(/\s+/g, ' ').trim();
            const nhan = (chu || btn.getAttribute('aria-label') || btn.getAttribute('title') || '?').slice(0, 30);
            for (const ic of icons) {
                const r = ic.getBoundingClientRect();
                // chỉ xét icon là "con trực tiếp về bố cục" của nút: cùng hàng với nút (nút 1 hàng, cao < 60px)
                // nút xếp dọc (icon trên, chữ dưới — thanh điều hướng dưới) thì lệch dọc là đúng thiết kế
                const doc = getComputedStyle(btn).flexDirection.startsWith('column');
                if (b.height < 60 && !doc) {
                    const dy = Math.abs((r.top + r.height / 2) - (b.top + b.height / 2));
                    if (dy > 1.01) lech.push(`${nhan} [${ten(ic)}] lệch ${dy.toFixed(1)}px`);
                }
                const vaiTroPhu = /chevron|close|sort|check$/.test(ic.getAttribute('data-icon') || '');
                // Liên kết NẰM TRONG CÂU (<a> trong <p>/<li>) đi theo cỡ chữ của câu — không phải nút thanh công cụ.
                const lienKetTrongCau = btn.tagName === 'A' && !!btn.closest('p, li');
                if (chu && !vaiTroPhu && !lienKetTrongCau && b.height < 60 && r.width < md) nutChuNhoHon.push(`${nhan} [${ten(ic)}] ${r.width}px`);
            }
            // Vùng chạm thật = hộp nút + vùng mở rộng vô hình `after:-inset-*` (mẫu dùng ở dòng dữ liệu dày)
            const af = getComputedStyle(btn, '::after');
            const mo = af.content !== 'none' && af.position === 'absolute';
            const vw = mo ? b.width - (parseFloat(af.left) || 0) - (parseFloat(af.right) || 0) : b.width;
            const vh = mo ? b.height - (parseFloat(af.top) || 0) - (parseFloat(af.bottom) || 0) : b.height;
            if (mobile && !chu && Math.min(vw, vh) < 43.5) vungCham.push(`${nhan} ${Math.round(vw)}x${Math.round(vh)} ${btn.outerHTML.slice(0, 160)}`);
        }
        return { legacy, lech, nutChuNhoHon, vungCham };
    }, { mobile, rootSelector });
}
