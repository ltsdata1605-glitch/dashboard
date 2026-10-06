import { test, expect, type Page } from '@playwright/test';

/**
 * CHUẨN HOÁ ICON — Giai đoạn 3: audit icon trên các màn khu vực gốc (Phân tích, Check thưởng, Báo cáo,
 * Phân quyền, Thuế, Coupon, So sánh giá, Giới thiệu) ở điện thoại và laptop.
 *
 * Đo trên trình duyệt thật, mỗi màn:
 *   - `legacy`: svg icon KHÔNG đi qua AppIcon (không có lớp .ycx-icon) — phải về 0;
 *   - `lech`: icon trong nút lệch tâm dọc > 1px so với nút;
 *   - `nutChuNhoHon`: icon nằm trong nút CÓ CHỮ nhưng nhỏ hơn token md (icon chính trên thanh công cụ phải md);
 *   - `vungCham`: nút chỉ có icon, nhỏ hơn 44px trên điện thoại.
 */
const TABS = ['analysis', 'check-thuong', 'reports', 'settings', 'tools-tax', 'tools-coupon', 'tools-price-compare', 'help'];

async function vaoDungThu(page: Page) {
    await page.goto('/?tab=analysis');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2500);
}

async function audit(page: Page, mobile: boolean) {
    return page.evaluate(({ mobile }) => {
        const nhin = (el: Element) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            const cs = getComputedStyle(el);
            return cs.visibility !== 'hidden' && cs.opacity !== '0';
        };
        const ten = (el: Element) => (el.getAttribute('data-icon') || el.getAttribute('class') || '').slice(0, 40);
        const legacy: string[] = [], lech: string[] = [], nutChuNhoHon: string[] = [], vungCham: string[] = [];
        // svg icon "trần" (lucide hoặc tự vẽ 24x24 viewBox) không qua AppIcon. Bỏ qua svg biểu đồ (recharts) và logo.
        for (const svg of Array.from(document.querySelectorAll('svg'))) {
            if (!nhin(svg) || svg.closest('.recharts-wrapper, .recharts-surface')) continue;
            if (svg.classList.contains('ycx-icon')) continue;
            if (svg.getAttribute('viewBox') !== '0 0 24 24') continue;
            const r = svg.getBoundingClientRect();
            if (r.width > 64) continue;
            legacy.push(`${ten(svg)} ${Math.round(r.width)}px`);
        }
        const md = mobile ? 18 : 16;
        for (const btn of Array.from(document.querySelectorAll('button, [role="button"], a'))) {
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
                if (chu && !vaiTroPhu && b.height < 60 && r.width < md) nutChuNhoHon.push(`${nhan} [${ten(ic)}] ${r.width}px`);
            }
            // Vùng chạm thật = hộp nút + vùng mở rộng vô hình `after:-inset-*` (mẫu dùng ở dòng dữ liệu dày)
            const af = getComputedStyle(btn, '::after');
            const mo = af.content !== 'none' && af.position === 'absolute';
            const vw = mo ? b.width - (parseFloat(af.left) || 0) - (parseFloat(af.right) || 0) : b.width;
            const vh = mo ? b.height - (parseFloat(af.top) || 0) - (parseFloat(af.bottom) || 0) : b.height;
            if (mobile && !chu && Math.min(vw, vh) < 43.5) vungCham.push(`${nhan} ${Math.round(vw)}x${Math.round(vh)} ${btn.outerHTML.slice(0, 160)}`);
        }
        return { legacy, lech, nutChuNhoHon, vungCham };
    }, { mobile });
}

for (const [label, width] of [['điện thoại 390', 390], ['laptop 1366', 1366]] as const) {
    test(`audit icon các màn gốc — ${label}`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.setViewportSize({ width, height: 900 });
        await vaoDungThu(page);
        const ketQua: Record<string, Awaited<ReturnType<typeof audit>>> = {};
        for (const tab of TABS) {
            await page.goto(`/?tab=${tab}`);
            await page.waitForTimeout(2500);
            ketQua[tab] = await audit(page, width < 1024);
            await page.screenshot({ path: `test-results/icon-audit-${tab}-${width}.png` });
        }
        console.log(`AUDIT ${label}\n` + JSON.stringify(ketQua, null, 1));
        for (const [tab, r] of Object.entries(ketQua)) {
            expect(r.legacy, `${tab}: icon chưa qua AppIcon`).toEqual([]);
            expect(r.lech, `${tab}: icon lệch dọc trong nút`).toEqual([]);
            expect(r.nutChuNhoHon, `${tab}: icon trong nút có chữ nhỏ hơn md`).toEqual([]);
            expect(r.vungCham, `${tab}: nút chỉ có icon dưới 44px trên điện thoại`).toEqual([]);
        }
    });
}
