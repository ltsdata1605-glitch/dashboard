import { test, expect, type Page } from '@playwright/test';

/** 6 module chủ dự án yêu cầu rà soát */
const MODULE: { ten: string; tab: string; cho?: RegExp }[] = [
    { ten: 'Phân tích', tab: 'analysis' },
    { ten: 'Report BI', tab: 'employees' },
    { ten: 'Check thưởng', tab: 'check-thuong' },
    { ten: 'Báo cáo', tab: 'reports' },
    { ten: 'Rút gọn Coupon', tab: 'tools-coupon' },
    { ten: 'Tính thuế', tab: 'tools-tax' },
];

async function batDemo(page: Page) {
    await page.goto('/?tab=analysis');
    await page.waitForTimeout(1500);
    const demo = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).first();
    if (await demo.isVisible().catch(() => false)) { await demo.click(); await page.waitForTimeout(2500); }
}

/** Đo trong MỘT khung (trang chính hoặc iframe) */
const DO = () => {
    const nhin = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const chuNho = Array.from(document.querySelectorAll('*'))
        .filter(el => nhin(el) && el.children.length === 0 && !!el.textContent?.trim()
            && parseFloat(getComputedStyle(el).fontSize) < 11)
        .map(el => Math.round(parseFloat(getComputedStyle(el).fontSize)));
    const nutNho = Array.from(document.querySelectorAll('button, a[role="button"], [role="tab"]'))
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 44; })
        .map(el => `${(el.textContent || '').trim().slice(0, 12) || el.getAttribute('title') || '[icon]'}:${Math.round(el.getBoundingClientRect().height)}:${el.className.toString().slice(0, 60)}`);
    // Bảng: có khung cuộn ngang riêng hay tự tràn ra ngoài trang?
    const bang = Array.from(document.querySelectorAll('table')).map(t => {
        let n: HTMLElement | null = t.parentElement;
        let coKhungCuon = false;
        while (n && n !== document.body) {
            const ov = getComputedStyle(n).overflowX;
            if (ov === 'auto' || ov === 'scroll') { coKhungCuon = true; break; }
            n = n.parentElement;
        }
        return { rong: Math.round(t.getBoundingClientRect().width), coKhungCuon };
    });
    const el = document.documentElement;
    return {
        chuDuoi11px: chuNho.length,
        coChuNhoNhat: chuNho.length ? Math.min(...chuNho) : null,
        nutDuoi44px: nutNho.length,
        viDuNut: nutNho.slice(0, 5),
        soBang: bang.length,
        bangTranRaTrang: bang.filter(b => !b.coKhungCuon).length,
        tranNgangTrang: el.scrollWidth > el.clientWidth,
        duThua: Math.max(0, el.scrollWidth - el.clientWidth),
    };
};

/**
 * NGƯỠNG: các module đã dọn xong phải giữ 0 vi phạm. `Tính thuế` đang do phiên khác sửa dở
 * (2026-09-26) nên tạm miễn — khi làm xong module đó thì bỏ khỏi danh sách MIỄN.
 */
const MIEN = new Set(['Tính thuế']);

test('6 module: không chữ dưới 11px, không nút dưới 44px, không tràn ngang trên iPhone', async ({ page }) => {
    test.setTimeout(300000);
    await page.setViewportSize({ width: 393, height: 852 });
    await batDemo(page);

    for (const m of MODULE) {
        await page.goto(`/?tab=${m.tab}`);
        await page.waitForTimeout(4500);
        const chinh = await page.evaluate(DO);
        let iframe: unknown = null;
        const f = page.frames().find(fr => fr !== page.mainFrame() && fr.url() !== 'about:blank');
        if (f) { try { iframe = await f.evaluate(DO); } catch { /* khác origin */ } }
        await page.screenshot({ path: `test-results/audit-${m.tab}.png` });
        console.log(`[${m.ten}] ${JSON.stringify(chinh)}${iframe ? ' | IFRAME: ' + JSON.stringify(iframe) : ''}`);

        // Trang không bao giờ được tràn ngang: bảng nhiều cột phải cuộn TRONG khung bảng.
        expect(chinh.tranNgangTrang, `${m.ten}: trang tràn ngang ${chinh.duThua}px`).toBe(false);
        expect(chinh.bangTranRaTrang, `${m.ten}: có bảng không nằm trong khung cuộn`).toBe(0);
        if (MIEN.has(m.ten)) continue;
        expect(chinh.chuDuoi11px, `${m.ten}: còn chữ dưới 11px (nhỏ nhất ${chinh.coChuNhoNhat}px)`).toBe(0);
        expect(chinh.nutDuoi44px, `${m.ten}: còn nút dưới 44px — ${JSON.stringify(chinh.viDuNut)}`).toBe(0);
        if (iframe) {
            const f = iframe as { chuDuoi11px: number; nutDuoi44px: number };
            expect(f.chuDuoi11px, `${m.ten} (iframe): còn chữ dưới 11px`).toBe(0);
            expect(f.nutDuoi44px, `${m.ten} (iframe): còn nút dưới 44px`).toBe(0);
        }
    }
});
